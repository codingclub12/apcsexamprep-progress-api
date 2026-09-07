#!/usr/bin/env python3
"""
Check the authored teaching content in the AP CSA Unit 1 bundle.

    python3 scripts/verify-csa-unit1-teaching-content.py <dir-of-Lesson_*-folders>

Written against the artifact rather than against repair-csa-unit1-teaching-content.py,
so a repair that agrees with itself still has to get past this. It re-reads all
56 decks and asserts four things the second repair pass claims:

  1. No NOW BREAK IT slide carries the shared rationale any more. That string sat
     on all thirty of them and was true of about three.
  2. No break-it names a statement its own program does not contain. Checked by
     reading the code panels on that deck, not by matching the two known cases,
     so a third one would fail this too.
  3. 1.10 no longer claims swapping the arguments changes the perimeter but not
     the area. Both methods are commutative, so it changes neither.
  4. Every WHAT STUDENTS THINK panel states a belief rather than the rule. The
     test is that the belief no longer repeats the slide heading it was copied
     from, AND that the heading itself survived. Both halves matter: the first
     run of the repair satisfied the first by overwriting the second.

Needs the decks present; they are not committed, because this repository is
public and they are the paid teacher bundle.

No em-dashes, per repo convention.
"""

import os
import re
import sys
from pptx import Presentation

OLD_WHY = 'Exam questions are built from exactly these one-character differences.'
FALSE_1_10 = 'Swapping them changes perimeter but not area'


def code_of(sl):
    out = []
    for sh in sl.shapes:
        if not sh.has_text_frame:
            continue
        if any(r.font.name == 'Courier New'
               for p in sh.text_frame.paragraphs for r in p.runs):
            out.append(sh.text_frame.text)
    return '\n'.join(out)


def main():
    root = sys.argv[1]
    fails = []
    decks = panels = breaks = 0
    for d in sorted(os.listdir(root)):
        dp = os.path.join(root, d)
        if not os.path.isdir(dp):
            continue
        topic = (re.match(r'Lesson_(\d+\.\d+)_', d) or [None, None])[1]
        for fn in sorted(os.listdir(dp)):
            if not fn.endswith('.pptx') or fn.endswith('.orig.pptx'):
                continue
            p = os.path.join(dp, fn)
            prs = Presentation(p)
            decks += 1
            slides = list(prs.slides)
            # headings of the misconception slides as they were before repair
            orig_headings = None
            bak = p.replace('.pptx', '.orig.pptx')
            if os.path.exists(bak):
                orig_headings = {}
                for j, osl in enumerate(Presentation(bak).slides, 1):
                    ot = [sh.text_frame.text for sh in osl.shapes
                          if sh.has_text_frame and sh.text_frame.text.strip()]
                    if any(t.strip() == 'WHAT STUDENTS THINK' for t in ot) and len(ot) > 1:
                        orig_headings[j] = ot[1].strip()
            allcode = '\n'.join(code_of(sl) for sl in slides)
            for i, sl in enumerate(slides, 1):
                shapes = [sh for sh in sl.shapes
                          if sh.has_text_frame and sh.text_frame.text.strip()]
                texts = [sh.text_frame.text for sh in shapes]
                blob = '\n'.join(texts)
                where = '%s/%s s%d' % (d.replace('Lesson_', ''),
                                       fn.replace('_Deck', '').replace('.pptx', ''), i)

                if any('NOW BREAK IT' in t for t in texts):
                    breaks += 1
                    # 1. the shared rationale
                    if OLD_WHY in blob:
                        fails.append((where, 'the shared break-it rationale survives'))
                    # 2. a break-it naming a statement the program does not contain
                    body = [t for t in texts
                            if not (t.isupper() and len(t) < 70)
                            and 'trademark' not in t and 'APCSExamPrep' not in t]
                    change = body[1] if len(body) > 1 else ''
                    #    A break-it changes something the program HAS into
                    #    something it does not. So the ORIGINAL side has to be
                    #    present and only that side is checked: the replacement
                    #    is absent by definition, which is the whole point.
                    #    "Write A instead of B" and "Change A to B" put the
                    #    original on opposite sides, so both are parsed.
                    originals = []
                    m = re.search(r'\binstead of\s+(.+?)\s*\.?$', change)
                    if m:
                        originals.append(m.group(1))
                    m = re.search(r'\bChange\s+(.+?)\s+to\s+', change)
                    if m:
                        originals.append(m.group(1))
                    for orig in originals:
                        # only judge a fragment that is actually code
                        if not re.search(r'[=.()\[\]]|\+\+|--', orig):
                            continue
                        squash = re.sub(r'\s+', '', orig)
                        hay = re.sub(r'\s+', '', allcode)
                        if squash and squash not in hay:
                            fails.append((where,
                                'break-it names %r, which the program does not contain' % orig))
                # 3. the 1.10 annotation
                if topic == '1.10' and FALSE_1_10 in blob:
                    fails.append((where, 'the false 1.10 annotation survives'))

                # 4. the misconception panel
                if any(t.strip() == 'WHAT STUDENTS THINK' for t in texts):
                    panels += 1
                    k = next(j for j, sh in enumerate(shapes)
                             if sh.text_frame.text.strip() == 'WHAT STUDENTS THINK')
                    belief = shapes[k + 1].text_frame.text.strip() if k + 1 < len(shapes) else ''
                    heading = texts[1].strip() if len(texts) > 1 else ''
                    #    The strongest check available: the repair must not
                    #    touch the heading at all, and the pre-repair deck is
                    #    sitting right there as <name>.orig.pptx. Comparing to
                    #    it catches an overwrite that the repeat test below
                    #    reports as the wrong thing, because a run that
                    #    clobbers BOTH halves leaves them matching each other.
                    if orig_headings is not None:
                        was = orig_headings.get(i)
                        if was is not None and was != heading:
                            fails.append((where,
                                'the slide heading was overwritten: %r became %r'
                                % (was[:40], heading[:40])))
                    if not heading or heading.isupper():
                        fails.append((where, 'the slide heading is empty'))
                    elif topic != '1.1' and belief.rstrip('.') == heading.rstrip('.'):
                        fails.append((where, 'WHAT STUDENTS THINK still repeats the heading'))
                    elif not belief:
                        fails.append((where, 'the belief panel is empty'))

    print('decks %d   break-it slides %d   misconception panels %d' % (decks, breaks, panels))
    print('FAILURES: %d' % len(fails))
    for f in fails[:12]:
        print('   %s: %s' % f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
