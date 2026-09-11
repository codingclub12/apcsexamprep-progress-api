"""
Rewrite paragraph text inside a .docx without disturbing anything else.

WHY NOT python-docx, AND WHY NOT REBUILD THE PARAGRAPH
  A bundle option line is not one run. It is "B. ", the answer text, sometimes a
  bold fragment, and a separate run holding the green check that marks the
  correct answer. Rebuilding the paragraph from a string would flatten all of
  that, and the checkmark and its colour are the only thing on the line that says
  which answer is right. tools/bundle-quiz-relabel/README.md is explicit that
  moving the purple and the checkmark is the hard part of editing these files.

THE METHOD
  Treat the paragraph as a flat character stream over its runs, diff old against
  new to find the ONE span that changed, and rewrite only the runs that span
  touches. The unchanged head and tail keep their runs, their formatting and
  their checkmark untouched, because they are never written.

  Everything else in the package is copied through byte for byte: styles, fonts,
  numbering, images, headers.
"""
import re
import shutil
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
DOC = 'word/document.xml'
ET.register_namespace('w', W[1:-1])


def _pieces(p):
    """The paragraph's character stream as [(node, kind, text)] in document order.

    Mirrors analyze.paragraphs() exactly, tabs and breaks included, so an offset
    computed there addresses the same character here.
    """
    out = []
    for node in p.iter():
        if node.tag == W + 't':
            out.append((node, 't', node.text or ''))
        elif node.tag == W + 'tab':
            out.append((node, 'tab', '\t'))
        elif node.tag == W + 'br':
            out.append((node, 'br', '\n'))
    return out


def _common_span(old, new):
    """(start, end_from_left_in_old, end_from_left_in_new) of the changed middle."""
    n = min(len(old), len(new))
    i = 0
    while i < n and old[i] == new[i]:
        i += 1
    j = 0
    while j < n - i and old[len(old) - 1 - j] == new[len(new) - 1 - j]:
        j += 1
    return i, len(old) - j, len(new) - j


class Refused(Exception):
    pass


def apply_edits(src, dst, edits):
    """
    edits: [{index, old, new}] against paragraph order in src.
    Writes dst. Raises Refused rather than guessing if a paragraph does not read
    the way the plan says it does.
    """
    with zipfile.ZipFile(src) as z:
        names = z.namelist()
        blobs = {n: z.read(n) for n in names}
    root = ET.fromstring(blobs[DOC])
    paras = list(root.iter(W + 'p'))
    applied = 0

    for e in sorted(edits, key=lambda x: -x['index']):
        if e['index'] >= len(paras):
            raise Refused(f"paragraph {e['index']} does not exist ({len(paras)} in file)")
        pieces = _pieces(paras[e['index']])
        text = ''.join(t for _, _, t in pieces)
        if text != e['old']:
            raise Refused(f"paragraph {e['index']} is not what was planned:\n"
                          f"  on disk: {text[:120]!r}\n  planned: {e['old'][:120]!r}")
        new = e['new']
        if text == new:
            continue
        a, b_old, b_new = _common_span(text, new)
        repl = new[a:b_new]

        # Locate the runs the changed span covers.
        pos = 0
        touched = []
        for node, kind, t in pieces:
            start, end = pos, pos + len(t)
            if end > a and start < b_old:
                touched.append((node, kind, t, start, end))
            pos = end
        if not touched:
            raise Refused(f"paragraph {e['index']}: changed span matched no run")
        if any(k != 't' for _, k, _, _, _ in touched):
            raise Refused(f"paragraph {e['index']}: change crosses a tab or line break")

        # The replacement goes into the first touched run, keeping that run's own
        # formatting; the rest of the span is cut from the runs that held it.
        first = True
        for node, _, t, start, end in touched:
            head = t[:max(0, a - start)] if start < a else ''
            tail = t[max(0, b_old - start):] if end > b_old else ''
            node.text = head + (repl if first else '') + tail
            if first and (node.text or '').strip() != (node.text or ''):
                node.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            first = False
        applied += 1

    blobs[DOC] = ET.tostring(root, encoding='UTF-8', xml_declaration=True)
    shutil.copyfile(src, dst)
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, blobs[n])
    return applied
