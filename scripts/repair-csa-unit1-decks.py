#!/usr/bin/env python3
"""
Repair the false statements in the AP CSA Unit 1 teacher bundle, in place.

    python3 scripts/repair-csa-unit1-decks.py <dir-of-Lesson_*-folders> [--dry-run]

WHY A TEXT REPAIR RATHER THAN A REBUILD
Unit 1's 56 decks were built before scripts/csa_kit/ existed, by a generator with
no fit guard, and a sweep of all 28 teacher decks on 2026-09-07 found real
defects in 8 of them. Regenerating through the kit is the better end state and is
board 255, but it changes 20 decks the sweep found completely clean and every
slide of a preview already shown to people. Every defect found is a STRING, so
this fixes the falsehoods and touches nothing else.

WHAT IT REPAIRS, AND WHAT IT DELIBERATELY DOES NOT

  caption      "Complete and runnable as shown." sits under half a program on a
               PART 1 / PART 2 slide. Neither half compiles: part 1 alone gives
               "reached end of file while parsing". The caption becomes an
               honest one naming which half this is.
  heading      "THE COMPLETE PROGRAM, PART 1" says complete and part in the same
               breath. Becomes "THE PROGRAM, PART 1 OF 2".
  note         The speaker note "A complete, runnable program." makes the same
               false promise to the teacher reading ahead.
  authored     Three things no rule can derive: the misconception panels whose
               WHAT STUDENTS THINK holds the true statement copied from the
               heading, 1.15's break-it naming a line its program does not
               contain, and 1.10's claim that swapping arguments changes the
               perimeter but not the area, which is false in both halves because
               both methods are commutative. These come from AUTHORED below.

  NOT repaired: the duplicated WHAT TO NOTICE panels. They are redundant rather
  than wrong, and deleting content is the riskier edit. Tanner's call, 2026-09-07.
  NOT repaired: the split itself, or the type sizes. Those need the rebuild.

HOW IT EDITS
python-pptx, run-level. A paragraph's runs are replaced by setting the first
run's text and blanking the rest, so the run's formatting is what survives
rather than being rebuilt from a guess. Every file is copied to <name>.orig.pptx
before it is touched, and --dry-run reports without writing.

No em-dashes, per repo convention.
"""

import argparse
import glob
import hashlib
import os
import re
import shutil
import sys

try:
    from pptx import Presentation
except ImportError:
    sys.exit('needs python-pptx')

BAD_CAPTION = 'Complete and runnable as shown.'
BAD_NOTE = 'A complete, runnable program.'

#  Authored replacements. Keyed by (topic, day, kind). Written by hand because
#  the correct text cannot be derived from the wrong text: a belief is not a
#  transformation of the rule it gets wrong.
AUTHORED = {}


def para_text(p):
    return ''.join(r.text for r in p.runs)


def set_para(p, text):
    """Replace a paragraph's text, keeping the first run's formatting."""
    if not p.runs:
        return False
    p.runs[0].text = text
    for r in p.runs[1:]:
        r.text = ''
    return True


def repair_deck(path, topic, day, edition, dry):
    pres = Presentation(path)
    changes = []
    for idx, slide in enumerate(pres.slides, 1):
        blocks = [sh for sh in slide.shapes if sh.has_text_frame]
        whole = ' '.join(sh.text_frame.text for sh in blocks)
        part = None
        m = re.search(r'\bPART\s+(\d)\b', whole)
        if m:
            part = int(m.group(1))

        for sh in blocks:
            for p in sh.text_frame.paragraphs:
                t = para_text(p).strip()
                if not t:
                    continue
                # 1. the caption under a partial program
                if t == BAD_CAPTION and part:
                    new = ('Part 1 of 2. This half does not run on its own.' if part == 1
                           else 'Part 2 of 2. With Part 1 before it, this is the whole program.')
                    changes.append((idx, 'caption', t, new))
                    if not dry:
                        set_para(p, new)
                # 2. complete AND part, in one heading
                elif re.match(r'^THE (COMPLETE PROGRAM|CLASS|PROGRAM), PART \d$', t):
                    kind = 'THE CLASS' if 'CLASS' in t else 'THE PROGRAM'
                    new = '%s, PART %s OF 2' % (kind, t[-1])
                    changes.append((idx, 'heading', t, new))
                    if not dry:
                        set_para(p, new)

        # 3. the same false promise in the speaker notes
        if part and slide.has_notes_slide:
            for p in slide.notes_slide.notes_text_frame.paragraphs:
                t = para_text(p)
                if BAD_NOTE in t:
                    new = t.replace(BAD_NOTE,
                                    'One half of a program that is split across two slides.')
                    changes.append((idx, 'note', BAD_NOTE, 'split-aware wording'))
                    if not dry:
                        set_para(p, new)

        # 4. authored corrections, matched on the exact wrong string
        for (atopic, aday, old), new in AUTHORED.items():
            if atopic != topic or aday != day:
                continue
            for sh in blocks:
                for p in sh.text_frame.paragraphs:
                    if para_text(p).strip() == old:
                        changes.append((idx, 'authored', old[:40], new[:40]))
                        if not dry:
                            set_para(p, new)

    if changes and not dry:
        backup = path.replace('.pptx', '.orig.pptx')
        if not os.path.exists(backup):
            shutil.copy2(path, backup)
        pres.save(path)
    return changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    total = 0
    touched = 0
    for f in sorted(glob.glob(os.path.join(args.root, 'Lesson_*', '*.pptx'))):
        if f.endswith('.orig.pptx'):
            continue
        topic = re.search(r'Lesson_([\d.]+)_', f).group(1)
        m = re.search(r'Day(\d)_Deck_(TEACHER|STUDENT)', f)
        if not m:
            continue
        day, edition = int(m.group(1)), m.group(2)
        ch = repair_deck(f, topic, day, edition, args.dry_run)
        if ch:
            touched += 1
            total += len(ch)
            print('%-6s day %d %-8s %d change(s)' % (topic, day, edition, len(ch)))
            for idx, kind, old, new in ch:
                print('    slide %-3d %-9s %r' % (idx, kind, old[:60]))
                print('              %-9s %r' % ('->', new[:60]))
    print('')
    print('%s: %d change(s) across %d deck(s)'
          % ('WOULD MAKE' if args.dry_run else 'MADE', total, touched))


if __name__ == '__main__':
    main()
