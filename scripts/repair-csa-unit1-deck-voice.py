#!/usr/bin/env python3
"""
Take the classroom choreography out of the AP CSA Unit 1 decks.

    python3 scripts/repair-csa-unit1-deck-voice.py <dir-of-Lesson_*-folders> [--dry-run]

WHY
The bundle tells a teacher what is in the lesson. It does not tell them how to
run their room. The Unit 1 decks were built before that was a criterion, so 38
distinct paragraphs across the 56 decks still say things like "On the board:",
"You have 4 minutes", "then the Tier 2 practice set in pairs" and "Students run
the Java editor exercise".

Two of those are worse than a voice problem. The warm-up slide of nearly every
Day 1 deck opens with the literal words "On the board:", and it is printed ON
THE BOARD: the student edition is what is projected, so the slide is announcing
itself. And the online block repeats the spec text that PR #111 already fixed
everywhere else, so the decks are the last place in the bundle still carrying
"Move the class to the live lesson page".

HOW IT DECIDES
Nothing is matched by pattern. Every replacement is an exact paragraph string in
the table below, and a paragraph that is not in the table is not touched. The
table is keyed on the full paragraph, so a near-miss silently does nothing
rather than guessing, and --dry-run reports any key that matched no deck.

WHAT IT DELIBERATELY LEAVES ALONE
Topic 1.3's escape-sequence exercise asks for a println that produces the exact
line: He wrote "C:\\temp" on the board. That "on the board" is the required
OUTPUT of the exercise. Rewriting it would break the item, so it is excluded by
name rather than by luck.

Grouping that IS the activity also stays. "Trade with a neighbor and find one
step that breaks" is the bell ringer, not a pacing instruction wrapped around
one, and removing it would remove the exercise. What goes is grouping used as a
modifier on an otherwise complete instruction: "Complete the six checks in
pairs" becomes "Complete the six checks".

No em-dashes, per repo convention.
"""

import argparse
import os
import shutil
import sys

from pptx import Presentation

DROP = object()

#  Exact paragraph text -> replacement, or DROP to delete the paragraph.
REPAIRS = {
    # ---- bell ringers. "On the board" framing and pacing come off; the prompt stays.
    "On the board:": DROP,
    "On the board: 'Write instructions for making a peanut butter sandwich for a robot that does EXACTLY what you say and nothing more. You have 4 minutes. Trade with a neighbor and find one step that breaks.'":
        "Write instructions for making a peanut butter sandwich for a robot that does EXACTLY what you say and nothing more. Trade with a neighbor and find one step that breaks.",
    "On the board: 'A school app tracks (1) how many students are in the room, (2) the average score on the last quiz, (3) whether the fire alarm is armed. For each one, write down what kind of value it is and give a sample value. '":
        "A school app tracks (1) how many students are in the room, (2) the average score on the last quiz, (3) whether the fire alarm is armed. For each one, write down what kind of value it is and give a sample value.",
    "On the board, no running allowed: 'Write down exactly what each line prints.":
        "No running allowed. Write down exactly what each line prints.",
    "On the board: 'This code is supposed to swap the two values so it prints 9 5. Trace it line by line and write down what it actually prints.":
        "This code is supposed to swap the two values so it prints 9 5. Trace it line by line and write down what it actually prints.",
    "On the board: 'One of these two lines does not compile. Which one, and why? Write your answer before you say it.' int root = Math.sqrt(64.0);":
        "One of these two lines does not compile. Which one, and why? Write your answer before you say it.  int root = Math.sqrt(64.0);",
    "On the board, a class somebody else wrote:": "A class somebody else wrote:",
    "On the board, predict each exact printed line before we run anything:":
        "Predict each exact printed line before anything runs:",
    "On the board, with the instruction 'Write down the exact number that prints. Do not talk yet.' int score = 10;":
        "Write down the exact number that prints.  int score = 10;",
    "On the board, with the instruction 'Write the number that prints. ' public static void addTen(int n) { n += 10;":
        "Write the number that prints.  public static void addTen(int n) { n += 10;",
    "Both lines call a method. In 3 minutes, list every difference you can see between the two calls. Do not look anything up.":
        "Both lines call a method. List every difference you can see between the two calls. Do not look anything up.",

    # ---- the online block. Same wording PR #111 fixed in the specs.
    "Move the class to the live lesson page (Unit 1 Link Sheet, row 1.1). Students run the Hello, AP CSA editor exercise, then intentionally break it twice: delete a semicolon (watch the compiler refuse) and misspell println (same). Then work the Tier 2 practice set as pairs.":
        "The live lesson page (Unit 1 Link Sheet, row 1.1) has the Hello, AP CSA editor exercise and a six-item Tier 2 practice set. The editor exercise is built to be broken: a deleted semicolon and a misspelled println both stop the compiler, with different messages.",
    "Move to the live lesson page (Unit 1 Link Sheet, row 1.2). Students run the Java editor exercise for declarations, then work the Tier 2 practice set of six items covering type categories, the three primitives in scope, declaration syntax, and the exclusions.":
        "The live lesson page (Unit 1 Link Sheet, row 1.2) has the Java editor exercise for declarations and a six-item Tier 2 practice set covering type categories, the three primitives in scope, declaration syntax and the exclusions.",
    "Move to the live lesson page (Unit 1 Link Sheet, row 1.3).":
        "The live lesson page (Unit 1 Link Sheet, row 1.3).",
    "Move to the live lesson page (Unit 1 Link Sheet, row 1.4).":
        "The live lesson page (Unit 1 Link Sheet, row 1.4).",
    "Work the live lesson page as a class (Unit 1 Link Sheet, row 1.5).":
        "The live lesson page (Unit 1 Link Sheet, row 1.5).",
    "Work the live lesson page together (Unit 1 Link Sheet, row 1.6). Students use the Java Code Editor to verify traces they already wrote on paper, then complete the Tier 2 AP Practice set in pairs, then close with the Tier 3 Mastery Challenge on the shelf-count sequence.":
        "The live lesson page (Unit 1 Link Sheet, row 1.6) has the Java Code Editor, which verifies traces already written on paper, the Tier 2 AP Practice set, and the Tier 3 Mastery Challenge on the shelf-count sequence.",
    "Work the live lesson page as a class (Unit 1 Link Sheet, row 1.7). Students complete the Tier 2 AP Practice set, which walks through class descriptions for Student and Car and asks them to classify members, then close with the Tier 3 Mastery Challenge, The Library Card System.":
        "The live lesson page (Unit 1 Link Sheet, row 1.7) has the Tier 2 AP Practice set, which walks through class descriptions for Student and Car and asks for each member to be classified, and the Tier 3 Mastery Challenge, The Library Card System.",
    "Work the live lesson page as a class (Unit 1 Link Sheet, row 1.8). This lesson has no Java editor exercise, so the whole block is reading and reasoning: the Tier 2 practice questions first as a full-class vote, then the Tier 3 Mastery Challenge, The Grade Calculator, in pairs.":
        "The live lesson page (Unit 1 Link Sheet, row 1.8) has the Tier 2 practice questions and the Tier 3 Mastery Challenge, The Grade Calculator. This is the one Unit 1 lesson with no Java editor exercise, so all of it is reading and reasoning.",
    "Move to the live lesson page (Unit 1 Link Sheet, row 1.9). Run the Java editor exercises first so students see call-by-value fail in front of them on a real compiler, then the Tier 2 practice set in pairs, then the Tier 3 Mastery Challenge, The Temperature Converter.":
        "The live lesson page (Unit 1 Link Sheet, row 1.9) has the Java editor exercises, where call-by-value fails on a real compiler rather than on paper, the Tier 2 practice set, and the Tier 3 Mastery Challenge, The Temperature Converter.",
    "Move to the live lesson page (Unit 1 Link Sheet, row 1.10). Run the Java editor exercises first, then the Tier 2 practice set in pairs, then let each pair choose one of the two games, then the Tier 3 Mastery Challenge, The Game Randomizer.":
        "The live lesson page (Unit 1 Link Sheet, row 1.10) has the Java editor exercises, the Tier 2 practice set, two games, and the Tier 3 Mastery Challenge, The Game Randomizer.",
    "Move the class to the live lesson page (Unit 1 Link Sheet, row 1.11). Students run the Java editor exercise, then work the Tier 2 AP Practice set of eight questions in pairs with the four-method return-type table visible.":
        "The live lesson page (Unit 1 Link Sheet, row 1.11) has the Java editor exercise and an eight-question Tier 2 AP Practice set that leans on the four-method return-type table.",
    "Move the class to the live lesson page (Unit 1 Link Sheet, row 1.12). Students run the Java editor exercise, then work the Tier 2 AP Practice set of six questions in pairs with their memory diagram from the notes open beside them. Close with one game and the Tier 3 Mastery Challenge, The Library System.":
        "The live lesson page (Unit 1 Link Sheet, row 1.12) has the Java editor exercise, a six-question Tier 2 AP Practice set that leans on the memory diagram from the notes, one game, and the Tier 3 Mastery Challenge, The Library System.",
    "Move the class to the live lesson page (Unit 1 Link Sheet, row 1.13). Students run the Java editor exercise, then work the Tier 2 AP Practice set of eight questions in pairs with the four-part creation pattern visible. Close with one game and the Tier 3 Mastery Challenge, The Bank Account.":
        "The live lesson page (Unit 1 Link Sheet, row 1.13) has the Java editor exercise, an eight-question Tier 2 AP Practice set built on the four-part creation pattern, one game, and the Tier 3 Mastery Challenge, The Bank Account.",
    "Work the live lesson page together (Unit 1 Link Sheet, row 1.14). Start in the Java Code Editor exercise, then the Tier 2 practice set in pairs, then one of the two games, then the Tier 3 Mastery Challenge (The Temperature Sensor) as a whole class.":
        "The live lesson page (Unit 1 Link Sheet, row 1.14) has the Java Code Editor exercise, the Tier 2 practice set, two games, and the Tier 3 Mastery Challenge, The Temperature Sensor.",
    "Work the live lesson page together (Unit 1 Link Sheet, row 1.15). Java Code Editor first, then the eight Tier 2 practice questions in pairs, then a game, then the Tier 3 Mastery Challenge (The Username Generator) as the unit capstone.":
        "The live lesson page (Unit 1 Link Sheet, row 1.15) has the Java Code Editor exercise, eight Tier 2 practice questions, a game, and the Tier 3 Mastery Challenge, The Username Generator, which closes the unit.",

    # ---- task bullets. The grouping clause is a modifier, so it comes off.
    "Complete the six Tier 2 practice questions in pairs; for every wrong choice that contains long, float, short, byte, or char, write the words 'out of scope' next to it.":
        "Complete the six Tier 2 practice questions. For every wrong choice containing long, float, short, byte or char, write 'out of scope' next to it.",
    "In the same editor, set an int to Integer.MAX_VALUE, add 1, print it, and read the wrapped value out loud as a class.":
        "In the same editor, set an int to Integer.MAX_VALUE, add 1, and print it. The wrapped value is the point.",
    "As a class, read one Math documentation line off the board and answer the three questions out loud: what it needs, what it gives back, what it promises.":
        "Read one Math documentation line and answer the three questions it raises: what it needs, what it gives back, what it promises.",
    "Complete the Tier 2 practice questions in pairs. For each classification item, partners must state the word in the description that decided it, such as stores, tracks, can, or returns.":
        "Complete the Tier 2 practice questions. Each classification item turns on one word in the description, such as stores, tracks, can or returns; name that word.",
    "Work the eight Tier 2 practice questions with a partner. For each random-range item, write the minimum and maximum substitutions in the margin before choosing.":
        "Work the eight Tier 2 practice questions. For each random-range item, write the minimum and maximum substitutions in the margin before choosing.",
    "Work the six Tier 2 practice questions with a partner. For every question involving two variables, draw the boxes and the addresses before choosing an answer.":
        "Work the six Tier 2 practice questions. For every question involving two variables, draw the boxes and the addresses before choosing an answer.",
    "Complete the eight Tier 2 practice questions with a partner, saying out loud for each call whether it is void or value-returning before choosing.":
        "Complete the eight Tier 2 practice questions, naming for each call whether it is void or value-returning before choosing.",
    "Complete the Tier 2 practice set with a partner. House rule: write the numbered index line under every String before choosing an answer.":
        "Complete the Tier 2 practice set, writing the numbered index line under every String before choosing an answer.",

    # ---- one-offs
    "Offline trace-and-predict work using the Counter class from the board. No internet needed; the class definition is printed at the top of the handout.":
        "Offline trace-and-predict work using the Counter class from the worked example. No internet needed; the class definition is printed at the top of the handout.",
    "WORTH DRAWING OUT:  The two lines are Box b = new Box(12); and Box c = new Box(); Circle the four parts of the first one on the board: the type Box, the variable name b, the keyword new, and the constructor call Box(12). Then ask how Java knew which of the two constructors to run. It was the argument list and nothing else.":
        "WORTH DRAWING OUT:  The two lines are Box b = new Box(12); and Box c = new Box(); The first has four parts: the type Box, the variable name b, the keyword new, and the constructor call Box(12). What told Java which of the two constructors to run was the argument list and nothing else.",
    "Worth drawing out: The two lines are Box b = new Box(12); and Box c = new Box(); Circle the four parts of the first one on the board: the type Box, the variable name b, the keyword new, and the constructor call Box(12). Then ask how Java knew which of the two constructors to run. It was the argument list and nothing else. Last, point at both constructor headers and ask what is missing compared with every other method they have seen. There is no return type, not even void.":
        "Worth drawing out: The two lines are Box b = new Box(12); and Box c = new Box(); The first has four parts: the type Box, the variable name b, the keyword new, and the constructor call Box(12). What told Java which of the two constructors to run was the argument list and nothing else. Both constructor headers are also missing something every other method has: a return type, not even void.",
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


def frames(slide):
    out = [sh.text_frame for sh in slide.shapes if sh.has_text_frame]
    if slide.has_notes_slide:
        out.append(slide.notes_slide.notes_text_frame)
    return out


def repair(path, apply):
    prs = Presentation(path)
    edits = []
    for n, slide in enumerate(prs.slides, 1):
        for tf in frames(slide):
            for p in list(tf.paragraphs):
                key = para_text(p).strip()
                if key not in REPAIRS:
                    continue
                new = REPAIRS[key]
                if new is DROP:
                    edits.append((n, 'drop', key[:60]))
                    if apply:
                        p._p.getparent().remove(p._p)
                elif set_para(p, new) or not apply:
                    edits.append((n, 'set', key[:60]))
    if apply and edits:
        prs.save(path)
    return edits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    apply = not a.dry_run

    decks = []
    for dirpath, _, names in os.walk(a.root):
        for f in sorted(names):
            if f.endswith('.pptx') and '.orig.' not in f:
                decks.append(os.path.join(dirpath, f))
    if not decks:
        sys.stderr.write(f'no decks under {a.root}\n')
        return 2

    total = 0
    used = set()
    for d in sorted(decks):
        if apply and not os.path.exists(d + '.orig'):
            shutil.copy2(d, d + '.orig')
        edits = repair(d, apply)
        if edits:
            print(os.path.relpath(d, a.root))
            for n, kind, key in edits:
                print(f'    s{n:<3} {kind}  {key}')
                used.add(key)
            total += len(edits)

    print(f'\n{total} paragraphs {"repaired" if apply else "would be repaired"} '
          f'across {len(decks)} decks')
    unused = [k for k in REPAIRS if not any(k.startswith(u) or u.startswith(k[:60]) for u in used)]
    if unused:
        print(f'{len(unused)} table entries matched nothing:')
        for k in unused:
            print(f'    {k[:80]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
