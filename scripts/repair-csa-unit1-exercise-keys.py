#!/usr/bin/env python3
"""
Collapse the doubled labels in the AP CSA Unit 1 exercise keys.

    python3 scripts/repair-csa-unit1-exercise-keys.py <dir-of-Lesson_*-folders> [--dry-run]

WHAT IS WRONG
Every item in the exercise keys' "What to look for" section prints its label
twice, because the generator prepended a heading to a body that already opened
with it:

    If it compiles, it works: If it compiles, it works. Successful compilation
    means the code follows Java's rules, nothing more.

    Import confusion: Import confusion. Math and String are in java.lang, which
    is available by default, so they never need an import.

Seen in 1.1 and 1.7, all four items in each, so it is the generator rather than
one bad entry. The teacher guide's equivalent section is clean, which is how you
can tell the content is fine and only this rendering is wrong.

Nothing here is false, which is why it went unnoticed. It is in scope because a
doubled phrase reads as machine-written, and this repo treats that as an
acceptance criterion rather than a nicety.

HOW IT DECIDES
Only a paragraph of the exact shape "X: X<punctuation>" is touched, comparing
the two halves after normalising case and trailing punctuation. A label that
merely resembles the sentence after it is left alone, and no text is ever
inserted: the repair deletes the duplicated prefix and nothing else.

No em-dashes, per repo convention.
"""

import argparse
import os
import re
import shutil
import sys

from docx import Document

#  "Label: Label. rest" with the two halves equal. The label is short and has no
#  sentence-ending punctuation inside it, which is what keeps an ordinary
#  colon-bearing sentence out of scope.
DOUBLED = re.compile(r'^([^:.!?]{3,70}):\s+(.+)$', re.S)


def norm(s):
    return re.sub(r'\s+', ' ', s).strip().rstrip('.!?').lower()


def collapse(text):
    """Return the de-duplicated paragraph, or None to leave it alone."""
    m = DOUBLED.match(text.strip())
    if not m:
        return None
    label, rest = m.group(1), m.group(2).strip()
    if not norm(rest).startswith(norm(label)):
        return None
    #  the body must genuinely repeat the label, not merely start with the
    #  same word or two
    if len(norm(label)) < 8:
        return None
    return rest


def repair(path, dry):
    doc = Document(path)
    edits = []
    for para in doc.paragraphs:
        t = para.text
        if not t.strip():
            continue
        new = collapse(t)
        if new is None or new == t.strip():
            continue
        edits.append((t.strip()[:46], new[:46]))
        if not dry:
            if not para.runs:
                continue
            para.runs[0].text = new
            for r in para.runs[1:]:
                r.text = ''
    if edits and not dry:
        backup = path.replace('.docx', '.orig.docx')
        if not os.path.exists(backup):
            shutil.copy2(path, backup)
        doc.save(path)
    return edits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    total = files = 0
    for root, _, names in os.walk(a.root):
        for fn in sorted(names):
            if not fn.endswith('.docx') or fn.endswith('.orig.docx'):
                continue
            if 'KEY' not in fn:
                continue
            edits = repair(os.path.join(root, fn), a.dry_run)
            if not edits:
                continue
            files += 1
            print(os.path.join(root, fn).replace(a.root, '').lstrip('/'))
            for old, new in edits:
                print('    %-48s -> %s' % (old, new))
            total += len(edits)
    print()
    print('%d labels collapsed across %d files%s'
          % (total, files, ' (dry run, nothing written)' if a.dry_run else ''))


if __name__ == '__main__':
    main()
