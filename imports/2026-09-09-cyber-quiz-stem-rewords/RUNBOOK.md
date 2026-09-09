# Two sheets, five stems, and the last two quizzes that can be locked

Import order below. Each step says what you should see afterwards, including the
one place where a correct import looks like a partial one.

**These two sheets are independent of the open design question on PR #644.**
That PR is about what a signed-out reader gets from a locked quiz. This is about
five sentences on two pages. Import these whenever; nothing here waits on that.

## What this is for

22 of 25 cyber quiz pages are server-scored now, so a teacher lock on them is
real. Three still ship their own answer key in the page, which means a lock on
those three is theatre: the browser has the key before any code runs.

Two of the three are held back by the same thing. The extractor refuses to seed a
question that puts a CED citation in front of a student, and the refusal is
all-or-nothing per quiz, because seeding the rest would leave a student taking a
four-question instrument where the page shows five. Five stems hold back eleven
questions.

Four of the five are deletions that change nothing the question asks. The fifth
is a real edit, and it is the one worth reading:

> 4.1 q6 asked "which CIA principle does **the CED** most directly associate with
> it?" Deleting those three words turns a question about what the framework says
> into a question about what the student should reason, which is a different
> question. So it is replaced with "which CIA principle does it most directly
> **threaten**?", and the key was checked rather than assumed: C, "Worm, most
> directly tied to Availability", still stands. D also says Availability but
> names a logic bomb, which does not self-replicate, so the item keeps its
> distractor.

Nothing in these sheets can move an answer. Every `checkMCQ()` call and every
feedback block is byte-identical afterwards, and the generator refuses if one
moves.

## Step 1: `Pages cyber-unit2-quiz-stem-rewords.csv`

One page, `ap-cyber-unit-2-lesson-3-quiz`. MERGE.

One stem changes. The EK code comes out of w4, whose sentence already states the
rule it was citing.

**Expect afterwards:** the page reads the same, one code shorter. It is still
serving its own answer key at this point, and that is correct. Mounting it is a
second sheet, generated after the extractor has seeded the bank.

## Step 2: `Pages cyber-unit4-quiz-stem-rewords.csv`

One page, `ap-cyber-unit-4-lesson-1-quiz`. MERGE.

Four stems change: q2, q3, q5 and q6. q6 is the reworded one above.

**Expect afterwards:** same as step 1. Same page, four codes lighter, still
serving its own key until the mount sheet lands.

## Step 3: check both landed

```
node scripts/deploy-gate.js deploy-gates/2026-09-09-cyber-quiz-stem-rewords.json
```

Without `--pre`, so the live check runs. It asks the extractor to read both live
pages and requires it to accept them:

```
accepted=2/2 problems=0 questions=11
```

Today that reads `accepted=0/2 problems=7 questions=0`, so it cannot pass by
accident and it cannot pass if only one sheet landed.

## Step 4: seed and mount, which is a separate pass

Once step 3 is green the extractor can seed both banks and a mount sheet can be
generated for 2.3 and 4.1 the same way the other 22 were. That sheet is not in
this directory and should be built after the import, not before, so it reads the
edited pages.

**Expect afterwards: 24 of 25, not 25 of 25.** The last one is deliberate.

## The one that is NOT in here

`ap-cyber-unit-3-lesson-6-quiz`, CED topic 3.5, IDS/IPS/SIEM. It carries **ten**
questions. Every web quiz on this site is five or six; the teacher bundle
instruments are 9 to 24. Size is the only cheap discriminator available, because
the .docx bundles are not in this repo and no diff against them is possible, so
the extractor refuses over six and asks rather than guessing.

Two questions, in order, and both are yours:

1. Is that page a web quiz that grew, or a bundle instrument that got published?
   If the second, seeding it makes a gated assessment permanently public, and the
   right move is to re-author rather than migrate.
2. If it is a web quiz, is ten the intended length? The other twenty are five.

Until that is answered it stays as it is, serving its own key. One page out of 25
where a lock is decorative, and everybody knows which one.

## Files

```
Pages cyber-unit2-quiz-stem-rewords.csv   1 row, 40539 -> 40520 bytes
Pages cyber-unit4-quiz-stem-rewords.csv   1 row, 42408 -> 42362 bytes
carrying.json                             the originals, for the preflight
```

`carrying.json` is provenance, not an import. It lets
`scripts/matrixify-preflight.js --carrying` tell an emoji that was already on the
page from one a sheet introduced; with no original the safe reading is
"introduced" and the preflight refuses, which is the right default.

## If a sheet refuses when you re-check it

Re-run the generator before importing, not only after:

```
node scripts/cyber-quiz-stem-reword-csv.js imports/2026-09-09-cyber-quiz-stem-rewords
```

If it says **the replacement is ALREADY in the live body**, somebody has fixed
that stem since this was built and the sheet is stale. Delete it rather than
importing it. A stale sheet nearly reverted a better fix on 2026-09-08, and
nothing in the sheet itself would have said so.
