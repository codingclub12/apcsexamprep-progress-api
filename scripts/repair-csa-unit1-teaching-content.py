#!/usr/bin/env python3
"""
Repair the authored teaching content in the AP CSA Unit 1 bundle.

    python3 scripts/repair-csa-unit1-teaching-content.py <dir-of-Lesson_*-folders> [--dry-run]

This is the SECOND repair pass. The first, repair-csa-unit1-decks.py, fixed the
claims a machine can check: a caption promising a runnable program over code
that does not compile. Everything here is a claim only a reader can check, which
is why it took reading all fifteen topics to find, and why every replacement
below is authored rather than derived.

WHAT IS WRONG

1. THE BREAK-IT RATIONALE IS ONE STRING, USED THIRTY TIMES.
   Every NOW BREAK IT slide in Unit 1 ends with "Exam questions are built from
   exactly these one-character differences." It is true of about three of the
   fifteen. The others are not one-character differences at all:

       1.4   "Move the total line above the boxes line."
       1.7   "Store Math.sqrt(144) in an int."
       1.8   "Open the /* block comment and never close it."
       1.13  "Write Rectangle small = Rectangle(3, 4), dropping new."

   A rationale that is false under two thirds of the slides it sits on teaches a
   teacher to distrust the strip. Each one below says what its own change
   actually demonstrates.

2. TWO BREAK-ITS NAME A LINE THEIR PROGRAM DOES NOT CONTAIN.
   1.6 says "Write steps =+ 3 instead of steps += 3." The program's statements
   are steps *= 3 and steps += 10. There is no steps += 3 to change.
   1.15 says "Compare two Strings with == instead of .equals()." Its program
   calls substring and toUpperCase and compares nothing at all, so there is no
   comparison to change. A teacher who tries either one in front of a class is
   left improvising.

3. 1.10 SAYS SWAPPING THE ARGUMENTS CHANGES THE PERIMETER BUT NOT THE AREA.
   area is width * height and perimeter is 2 * (width + height). Both are
   commutative, so swapping changes NEITHER. The bullet is false in both halves
   while making a point worth keeping, so it is rewritten rather than removed.

4. THE MISCONCEPTION PANELS, AND THIS ONE IS NOT UNIFORM.
   WHAT STUDENTS THINK is meant to hold the belief a student arrives with. Of
   the thirteen panels:

       1 is right          1.1, "If it compiles, it works", is a real belief
       5 are INVERTED      1.3, 1.5, 1.11, 1.12, 1.13 hold the TRUE RULE,
                           copied verbatim from the slide heading above it, so
                           the correct rule is displayed as the error
       6 are topic labels  1.2, 1.4, 1.9, 1.10, 1.14, 1.15 name the subject
                           rather than stating anything a student believes

   The five inverted ones are the reason this is worth a pass of its own. Each
   belief below is written as the direct inverse of the correction already
   printed beside it, so the two halves of the panel finally disagree.

HOW IT EDITS
python-pptx, run level, same as the first pass: the first run keeps its
formatting and the rest are blanked. Every file is copied to <name>.orig.pptx
before it is touched, and --dry-run reports without writing. Both the teacher
and the student deck carry these panels, so both are repaired.

No em-dashes, per repo convention.
"""

import argparse
import os
import re
import shutil
import sys

try:
    from pptx import Presentation
except ImportError:
    sys.exit('needs python-pptx')

OLD_WHY = 'Exam questions are built from exactly these one-character differences.'
PREFIX = 'WHY THIS MATTERS:'

#  What each break actually demonstrates. Written against that topic's own
#  program and its own stated outcome, not against a template.
WHY = {
 '1.1':  'Nothing warns you about this one. Order errors get past the compiler and surface as a wrong number, which is why a trace on paper beats reading the code again.',
 '1.2':  'The compiler stops you here and its message names the problem exactly. Reading the error is faster than guessing at it.',
 '1.3':  'One operand decides the arithmetic for the whole expression. That single .0 is the difference between 85 and 85.0.',
 '1.4':  'A variable has to be initialized before anything reads it, and moving one line is enough to break that.',
 '1.5':  'Where the parentheses go decides what the cast applies to, and a cast cannot recover a fraction that integer division has already discarded.',
 '1.6':  'Two characters in the other order turn an update into a plain assignment, and it still compiles. Exam questions are built from exactly this.',
 '1.7':  'A return type has to fit where you store it. sqrt hands back a double whatever you pass in.',
 '1.8':  'An unclosed block comment swallows everything after it, so the error appears a long way from the line that caused it.',
 '1.9':  'Overloading needs the parameter lists to differ. Two methods with identical signatures collide no matter what they return.',
 '1.10': 'This one compiles here and fails from anywhere else, which makes it the hardest kind to find.',
 '1.11': 'A cast binds tighter than multiplication, so the parentheses decide what gets truncated. Always printing 1 looks like bad luck rather than a bug.',
 '1.12': 'Assigning one reference to another does not copy the object. Both names refer to one account until new builds a second.',
 '1.13': 'new is what builds the object. Without it there is nothing to assign, and the compiler says so.',
 '1.14': 'void means there is no value to hand back, so there is nothing for println to print.',
 '1.15': 'An index is not a count, and being one off is silent: the program still runs and still prints something plausible.',
}

#  The two break-its whose change names a statement the program does not have.
BREAK_IT = {
 '1.6': ('Write steps =+ 10 instead of steps += 10.',
         'It still compiles, and it prints 3 instead of 0. =+ is an assignment '
         'followed by a positive sign, so steps is simply set to 10, and the two '
         'statements after it leave 8 and then 3.'),
 '1.15': ('Change full.substring(9) to full.substring(10).',
          'It still compiles and prints cience. substring takes an index, not a '
          'count, and index 10 is the c of Science.'),
}

#  1.10's second annotation, false in both halves as written.
NOTICE_FIX = [
 ('arguments in order - 8 goes to width and 3 to height, by position. Swapping '
  'them changes perimeter but not area.',
  'arguments in order - 8 goes to width and 3 to height, by position. Both of '
  'these methods happen to give the same answer either way, so a swap here is '
  'silent. In a method like divide it would not be.'),
]

#  WHAT STUDENTS THINK. Each is the direct inverse of the correction already on
#  the slide. 1.1 is absent on purpose: its panel is already correct.
THINK = {
 '1.2':  'long and float are real Java types, so an answer choice using one could still be right.',
 '1.3':  '7 / 2 gives 3.5, and Java rounds it to 4 when it stores it in an int.',
 '1.4':  'pts = pts + 5 cannot be right, because nothing equals itself plus five.',
 '1.5':  '(int) 2.9 + 1.6 casts the whole expression, so it gives 4.',
 '1.9':  'If the method does n += 10 to its parameter, my variable is 10 bigger after the call.',
 '1.10': 'Math is a class, so I need new Math() before I can call sqrt on it.',
 '1.11': 'Math.pow(2, 10) gives an int, because I passed it two ints.',
 '1.12': 'Two accounts holding the same balance are ==, because their contents match.',
 '1.13': 'A constructor needs void in front of it, like every other method that returns nothing.',
 '1.14': 'Counter.getCount() should work, the same way Math.sqrt(9.0) does.',
 '1.15': 'full.toUpperCase() changes full, so printing full afterwards shows the capitals.',
}


def para_text(p):
    return ''.join(r.text for r in p.runs)


def set_para(p, text):
    if not p.runs:
        return False
    p.runs[0].text = text
    for r in p.runs[1:]:
        r.text = ''
    return True


def topic_of(folder):
    m = re.match(r'Lesson_(\d+\.\d+)_', folder)
    return m.group(1) if m else None


def repair(path, topic, dry):
    prs = Presentation(path)
    edits = []
    for idx, sl in enumerate(prs.slides, start=1):
        shapes = [sh for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
        texts = [sh.text_frame.text for sh in shapes]
        is_break = any('NOW BREAK IT' in t for t in texts)
        is_misc = any('WHAT STUDENTS THINK' in t for t in texts)
        for sh in shapes:
            for p in sh.text_frame.paragraphs:
                t = para_text(p)
                s = t.strip()

                # 1. the shared rationale
                if is_break and OLD_WHY in t and topic in WHY:
                    new = ('%s  %s' % (PREFIX, WHY[topic])) if t.strip().startswith(PREFIX) else WHY[topic]
                    edits.append((idx, 'why', WHY[topic]))
                    if not dry:
                        set_para(p, new)
                    continue

                # 2. a break-it that names a line the program does not contain
                if is_break and topic in BREAK_IT:
                    chg, hap = BREAK_IT[topic]
                    if s.startswith('Write steps =+ 3') or s.startswith('Compare two Strings with =='):
                        edits.append((idx, 'change', chg))
                        if not dry:
                            set_para(p, chg)
                        continue
                    if s.startswith('It compiles. =+') or s.startswith('== asks whether they are the same object'):
                        edits.append((idx, 'happens', hap))
                        if not dry:
                            set_para(p, hap)
                        continue

                # 3. the 1.10 annotation that is false in both halves
                if topic == '1.10':
                    for old, new in NOTICE_FIX:
                        if old in t:
                            edits.append((idx, 'notice', new[:60] + '...'))
                            if not dry:
                                set_para(p, t.replace(old, new))
                            break

        # 4. WHAT STUDENTS THINK holding the rule instead of the belief.
        #    The belief is the shape that FOLLOWS the panel label, in shape
        #    order. Matching on the text instead would also match the slide
        #    heading it was copied from, and overwrite it.
        if is_misc and topic in THINK:
            label = next((k for k, sh in enumerate(shapes)
                          if sh.text_frame.text.strip() == 'WHAT STUDENTS THINK'), None)
            if label is not None and label + 1 < len(shapes):
                target = shapes[label + 1].text_frame
                for p in target.paragraphs:
                    if para_text(p).strip():
                        edits.append((idx, 'think', THINK[topic]))
                        if not dry:
                            set_para(p, THINK[topic])
                        break

    if edits and not dry:
        backup = path.replace('.pptx', '.orig.pptx')
        if not os.path.exists(backup):
            shutil.copy2(path, backup)
        prs.save(path)
    return edits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    total = 0
    kinds = {}
    for d in sorted(os.listdir(a.root)):
        dp = os.path.join(a.root, d)
        if not os.path.isdir(dp):
            continue
        topic = topic_of(d)
        if topic is None:
            continue
        for fn in sorted(os.listdir(dp)):
            if not fn.endswith('.pptx') or fn.endswith('.orig.pptx'):
                continue
            edits = repair(os.path.join(dp, fn), topic, a.dry_run)
            if not edits:
                continue
            print('%s / %s' % (d.replace('Lesson_', ''), fn.replace('_Deck', '').replace('.pptx', '')))
            for slide, kind, new in edits:
                print('   s%-3d %-8s %s' % (slide, kind, new[:96]))
                kinds[kind] = kinds.get(kind, 0) + 1
                total += 1
    print()
    print('%d edits%s' % (total, ' (dry run, nothing written)' if a.dry_run else ''))
    print('  ' + ', '.join('%s %d' % (k, v) for k, v in sorted(kinds.items())))


if __name__ == '__main__':
    main()
