"""
Walk the bundle, decide what each in-scope paragraph should say, and refuse to
guess.

THE THREE OUTCOMES for a paragraph carrying framework voice:
  rule     rules.py rewrote it and the result is clean
  repair   repairs.json carries a hand-written replacement for it
  RESIDUE  neither, so it is reported and NOTHING is written for it

The third is the important one. A tool that silently half-fixes a stem is how
"and cite the exact." reached a paid bundle in the first place.
"""
import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import difflib  # noqa: E402
import voice, rules, scope, pairing  # noqa: E402

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
HERE = os.path.dirname(os.path.abspath(__file__))
REPAIRS_PATH = os.path.join(HERE, 'repairs.json')


def paragraphs(path):
    """Paragraph text in document order, matching what the patcher will edit."""
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        buf = []
        for node in p.iter():
            if node.tag == W + 't':
                buf.append(node.text or '')
            elif node.tag == W + 'tab':
                buf.append('\t')
            elif node.tag == W + 'br':
                buf.append('\n')
        out.append(''.join(buf))
    return out


def load_repairs():
    if os.path.exists(REPAIRS_PATH):
        with open(REPAIRS_PATH) as f:
            return json.load(f)
    return {}


def plan(base, repairs=None):
    """
    Returns (edits, residue).
      edits   list of {rel, kind, index, old, new, via}
      residue list of {rel, kind, index, text, still} for anything unresolved
    """
    repairs = load_repairs() if repairs is None else repairs
    edits, residue = [], []
    for path, rel, kind in scope.in_scope(base):
        paras = paragraphs(path)
        if kind == 'key':
            twin = pairing.student_twin(rel)
            tp = os.path.join(base, twin)
            if not os.path.exists(tp):
                residue.append({'rel': rel, 'kind': kind, 'index': -1,
                                'text': '', 'still': ['missing_student_twin']})
                continue
            visible = set(pairing.pair_paragraphs(paras, paragraphs(tp)).keys())
        else:
            visible = set(range(len(paras)))

        ann_ok = (kind == 'key')
        for i, raw in enumerate(paras):
            t = pairing.norm(raw)
            if not t or i not in visible:
                continue
            if voice.is_clean(t, annotations_ok=ann_ok):
                continue
            # The correct-answer checkmark is stripped for comparison and has to
            # go back on, or the teacher's key silently loses which answer is right.
            mark = pairing.trailing_mark(raw)
            key = pairing.norm(t)
            if key in repairs:
                edits.append({'rel': rel, 'kind': kind, 'index': i,
                              'old': raw, 'new': repairs[key] + mark, 'via': 'repair'})
                continue
            new, applied = rules.rewrite(t, kind)
            if voice.is_clean(new, annotations_ok=ann_ok):
                edits.append({'rel': rel, 'kind': kind, 'index': i,
                              'old': raw, 'new': new + mark,
                              'via': 'rule:' + ','.join(applied)})
            else:
                residue.append({'rel': rel, 'kind': kind, 'index': i, 'text': t,
                                'after_rules': new,
                                'still': sorted({d['kind'] for d in
                                                 voice.find(new, annotations_ok=ann_ok)})})
    # A sync edit REPLACES whatever was planned for that paragraph: it is the
    # later, better answer for the same line, not a second edit to apply on top.
    sync = _sync_pass(base, edits, repairs)
    replaced = {(e['rel'], e['index']) for e in sync}
    edits = [e for e in edits if (e['rel'], e['index']) not in replaced] + sync
    return edits, residue


def _strip_annotations(t):
    """The teacher's scoring tags, removed, for text on its way to a student copy."""
    out = voice.ANNOTATION.sub('', t)
    return re.sub(r'[ \t]{2,}', ' ', out).strip()


def _sync_pass(base, edits, repairs):
    """
    Make the STUDENT copy say what the repaired KEY says, wherever repairing the
    KEY has pulled the two apart.

    This exists because the earlier citation strip damaged the STUDENT copies and
    not the KEYs. "Which EK explains why disrupting power causes this outcome?"
    became "What explains why ...?" in the student file only. The student line
    carries no framework voice, so nothing above flags it, and repairing the KEY
    to "Which statement explains ...?" leaves a teacher marking one instrument
    while the class answered another.

    tools/bundle-quiz-relabel/plan.py solved the same problem with SHARED_REPAIRS,
    "applied to BOTH copies, so KEY and STUDENT never diverge". This derives that
    set from the pairing instead of listing it by hand.
    """
    planned = {(e['rel'], e['index']): e['new'] for e in edits}
    extra = []
    for path, rel, kind in scope.in_scope(base):
        if kind != 'key':
            continue
        twin = pairing.student_twin(rel)
        tp = os.path.join(base, twin)
        if not os.path.exists(tp):
            continue
        kp, sp = paragraphs(path), paragraphs(tp)
        for ki, si in pairing.pair_paragraphs(kp, sp).items():
            bk, bs = pairing.norm(kp[ki]), pairing.norm(sp[si])
            ak = pairing.norm(planned.get((rel, ki), kp[ki]))
            as_ = pairing.norm(planned.get((twin, si), sp[si]))
            before = 1.0 if bk == bs else difflib.SequenceMatcher(None, bk, bs).ratio()
            after = 1.0 if ak == as_ else difflib.SequenceMatcher(None, ak, as_).ratio()
            if after >= before - 0.05:
                continue
            target = _strip_annotations(ak) + pairing.trailing_mark(sp[si])
            if pairing.norm(target) == as_:
                continue
            extra.append({'rel': twin, 'kind': 'student', 'index': si,
                          'old': sp[si], 'new': target, 'via': 'sync'})
    return extra


if __name__ == '__main__':
    base = sys.argv[1]
    edits, residue = plan(base)
    print(f"edits planned : {len(edits)}")
    print(f"  by rule     : {sum(1 for e in edits if e['via'].startswith('rule'))}")
    print(f"  by repair   : {sum(1 for e in edits if e['via'] == 'repair')}")
    print(f"residue       : {len(residue)}")
    uniq = {}
    for r in residue:
        k = pairing.norm(r['text'])
        e = uniq.setdefault(k, {'after_rules': r['after_rules'],
                                'still': r['still'], 'files': []})
        e['files'].append(r['rel'])
    for e in uniq.values():
        e['files'] = sorted(set(e['files']))
    print(f"  distinct    : {len(uniq)}")
    with open(os.path.join(HERE, 'worklist.json'), 'w') as f:
        json.dump(uniq, f, indent=1)
    print(f"wrote worklist.json")
