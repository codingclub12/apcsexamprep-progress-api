# Two pages, five sentences: the last quizzes that can be locked

One file, two rows, MERGE. Import it once. Then run one command.

## What it changes and why

23 of 25 cyber quizzes are server-scored, so a lock on them is real. Two of the
three still holding their own answer key are stuck behind the same thing: the
extractor refuses any question that puts a CED citation in front of a student,
and the refusal is all-or-nothing per quiz. Seeding the rest would leave a
student taking a four-question instrument where the page shows five.

**Five sentences hold back eleven questions.** Four are deletions where the
citation carries no meaning. The fifth is a real rewrite and is the one worth
reading before you click:

> **4.1 Q6** asked *"which CIA principle does **the CED** most directly associate
> with it?"* Dropping "the CED" leaves a broken sentence, so a verb had to be
> chosen: *"which CIA principle **is most directly affected**?"*
>
> The key does not move. C, "Worm, most directly tied to Availability", is right
> under either wording. D also says Availability but names a logic bomb, which
> does not self-replicate, so the malware-type half still discriminates.

Nothing here touches an option or an answer. Every explanation block and every
feedback block is byte-identical afterwards, and the generator refuses if one
moves.

## Checked just now, not when it was built

```
regenerated from the live pages at 15:24Z
committed sheet vs fresh regeneration:  IDENTICAL
```

So nothing has changed underneath it since it was written. A stale sheet nearly
reverted somebody else's better fix on 2026-09-08, which is why this check runs
before the import and not only after.

## Import

One file, `Pages cyber-quiz-stem-reword.csv`. Two rows:

```
ap-cyber-unit-2-lesson-3-quiz    40539 -> 40520 bytes    1 stem
ap-cyber-unit-4-lesson-1-quiz    42408 -> 42357 bytes    4 stems
```

Two rows of the same change is the natural unit, so this one does not split.

**Expect afterwards:** both pages read the same, minus five citations. They are
still serving their own answer keys at this point, and that is correct. Mounting
them is a second sheet, generated after the extractor has seeded the banks.

## Then check it landed

```
node scripts/deploy-gate.js deploy-gates/2026-09-09-cyber-last-three-quizzes.json
```

The live check asks the extractor to read both live pages and accept them:

```
want   accepted=2/2 problems=0 questions=11
today  accepted=0/2 problems=7 questions=0
```

It cannot pass before the import, and it cannot pass if only one row landed.

## Then the mount pass, which is not in this directory

Once that is green the extractor seeds both banks and a mount sheet can be built
for 2.3 and 4.1 the same way the other 23 were. Build it after the import, not
before, so it reads the edited pages.

**That takes it to 25 of 25 server-scored**, because 3.5 is confirmed a web quiz
and gets mounted in the same pass. No page is left where a lock is decorative.

## If the check refuses when you re-run it

```
node scripts/cyber-quiz-stem-reword.js --live /tmp/fresh.csv
```

If that output differs from the committed sheet, somebody has edited one of those
pages since. Delete the sheet and regenerate rather than importing the old one.
