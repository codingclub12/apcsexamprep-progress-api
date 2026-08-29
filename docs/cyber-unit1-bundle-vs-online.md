# Do the Unit 1 online instruments copy the teacher bundle?

Asked 2026-08-29. Answered by comparing every AP Cybersecurity Unit 1 instrument
that exists in both places, item by item.

**No. All six are distinct instruments.** Zero shared items anywhere.

This closes the gap `docs/cyber-quiz-audit.md` left open under "Not verified",
which said question-level correctness against the teacher bundle had not been
checked and that mapping the bundle keys to lessons was its own pass.

## Why the question matters

`scripts/seed-cyber-denominators.js` records the rule: an online quiz that copies
the paper one destroys the paper one's security for every teacher using it. A
student who can sit the online instrument has seen the graded one.

It has been violated once. Ledger #131, "Re-author cyber 1.1 and 1.2 online
quizzes as short web quizzes - they currently publish the teacher bundle
instrument", closed via PR #365. Before that fix the online 1.1 served 9 items
and 1.2 served 12, which are exactly the bundle counts. So this is a real failure
mode with a real precedent, not a hypothetical.

## Result

```
instrument      bundle                online     highest    exact
                                                 similarity  matches
Unit 1 Test     22 MCQ + 3 FRQ        20 MCQ       0.24        0
1.1 quiz         9 items               5 items     0.15        0
1.2 quiz        12 items               5 items     0.19        0
1.3 quiz         9 items               5 items     0.11        0
1.4 quiz        24 items               5 items     0.12        0
1.5 quiz        10 items               5 items     0.10        0
```

Bundle sources are the `Quiz_KEY.docx` and `_Unit_1_Test_KEY.docx` files in
Drive. Online sources are the live API for 1.1 and 1.2 (`GET /api/quiz/...`,
which is where those two now serve from) and the live page bodies for 1.3, 1.4,
1.5 and the unit exam.

The single highest score in the whole comparison is 0.24, between bundle test
Q11 and online exam Q11. Both describe someone connecting to a wireless network
whose name matches a legitimate one. That is an evil twin scenario, and there is
no way to assess EK 1.3.B.1 without describing an evil twin. The wording,
setting, options and distractors are all different: the bundle uses a coffee shop
and asks which attack is occurring, the online exam uses "CafeWifi" and a stronger
signal. Topic overlap is not item overlap.

## Method, and what it does not prove

Stems were normalised to lowercase word bags, stop words and topic words removed,
and compared pairwise by Jaccard similarity. For each bundle item the best match
anywhere in the online instrument was taken, so a copied item could not hide
behind reordering.

**This measures lexical overlap, not paraphrase.** An item rewritten from scratch
to test the same thing in different words scores low here and would not be
caught. Three things together are what make the conclusion safe rather than the
similarity number alone:

- the item counts differ on every single instrument, in every case by a lot
- the scenarios are different situations, not the same situation reworded
- zero exact stem matches

Only stems were compared, not options or rationales.

## The size gap is a content decision, already on the record

Bundle instruments run 9, 12, 9, 24 and 10 items; every online quiz is 5. The
quiz audit flagged the same asymmetry as its Finding 7 and called it a content
decision rather than a defect. Nothing here changes that. It is worth restating
only because the size gap is itself part of why the instruments cannot be
confused: a 5 item web quiz cannot be a 24 item paper quiz.

## What is still not checked

Units 2 through 5. This pass covered Unit 1 only, because Unit 1 is the free
preview unit and the one in front of live classes. The same comparison for the
other units is the same work with different files, and the bundle side is the
slow half: every key is named `Quiz_KEY.docx` and they distinguish only by
folder, so each has to be opened to find out which lesson it belongs to.
