# One page, one card: give the array practice page a way in

> **IMPORTED 2026-09-18. THE SHEET IS DELETED AND THIS IS THE RECORD.**
>
> Tanner imported it; the live hub updated at 2026-09-18T09:17:00-05:00 and the
> post-import check passed 8 of 8. The CSV and its carrying file are gone from
> this directory ON PURPOSE.
>
> A sheet carries a WHOLE BODY SNAPSHOT, not a patch. Re-importing this one
> tomorrow would MERGE yesterday's body over the page and silently revert
> whatever landed in between, which is the 2026-09-08 near-miss. The fenced card
> is idempotent; the body around it is not. A spent sheet is a footgun, so it is
> deleted rather than kept for reference.
>
> `scripts/verify-u4-array-mastery-live.js` stays. A page being right today is no
> reason to stop noticing if it stops being right.
>
> To do this again, regenerate against the live body:
> `node scripts/csa-unit-hub-resource-card.js <out>.csv`

One file, one row, MERGE. Import it once. Run one command before, and the same
command again after.

## What it changes and why

`ap-csa-array-mastery-interactive-practice` is a real 7-problem autograded array
practice page. Forward and backward traversal, max and count and linear search,
filter and build, then two-pointer and two-sum, each graded against 8 to 12
hidden test cases. It has been live since 2026-02-28 and **nothing links to it.**

Measured, not assumed: 14 plausible parents were fetched, including all three
Unit 4 array lessons, the Unit 4 hub, the exam prep hub and every array-topic
page. Zero of 14 carry an inbound link.

This sheet adds one resource card to the `u4-resources` deck on
`ap-csa-unit-4-course`, second in the deck, right after the Study Guide:

> **Array Drills** / Array Mastery Practice
> Seven array problems with hidden test cases, ungraded self-check

## Two decisions worth reading before you click

**It does NOT go in the hub's "Coding Practice" section.** That section's own
copy promises "your score reports to your teacher automatically". This page
carries no `data-lesson-id` and runs its Java against `emkc.org/api/v2/piston`
rather than this repo's Judge0 proxy, so it reports nothing to anybody. Putting
it there would publish a promise the page cannot keep. The resource deck is
where the ungraded self-study material already lives, so that is the honest
home, and "ungraded self-check" in the card says so out loud.

**The hub links no other standalone array page, despite appearances.** A note
written on 2026-09-10 said the deck already held six sibling array pages and
this one was simply missing from the group. That was wrong, and the way it was
wrong is the useful part: those six handles were read off the RENDERED page,
where they appear in the mega-menu chrome. The hub's own stored body links the
17 lesson families, four resource cards, and no standalone array page at all.
So this card is a new category on that hub rather than a gap in an existing row.

## Import it

Matrixify, **MERGE**, one row. The file name carries the sheet type because a
CSV has no tab name, so do not rename it. Do not re-save it as a spreadsheet:
the body is over 32,767 characters and Excel would truncate it.

```
node scripts/verify-u4-array-mastery-live.js          # BEFORE. Expect 8 of 8.
  ... import "Pages csa-u4-array-mastery.csv" ...
node scripts/verify-u4-array-mastery-live.js --post   # AFTER.  Expect 8 of 8.
```

**Run the BEFORE command even though it was run when the sheet was built.** A
generated sheet goes stale. On 2026-09-08 a sheet sat unimported for a day while
somebody improved the same page, and importing it would have MERGED the older
body over the better one with nothing saying so. The hub body this sheet was
built from was fetched at `updated_at 2026-09-17T11:41:20-05:00`, which was that
morning. If the BEFORE run says the hub already links the target, the sheet is
stale: **delete it and rebuild**, do not import it anyway.

## Expected end state

| | |
|---|---|
| Rows imported | 1 |
| `ap-csa-unit-4-course` inbound links to the target | exactly 1 |
| Resource deck anchors | 4 before, **5** after |
| The four incumbent cards | all still present |
| Every other byte of the hub body | unchanged |

The card is wrapped in `<!-- apcse:resource-card:u4-array-mastery -->` fences, so
a second import is a no-op rather than a second card, and the edit can be undone
from the page itself.

## What this does not fix

The page still reports no score, and it still depends on a free third-party
execution API. Making it graded means a reporter, a `data-lesson-id`, a
`course_manifest` row and a move onto the Judge0 proxy. That is a separate piece
of work and it is not what this sheet is for; this sheet only makes the page
reachable.

## Evidence

- Generator `scripts/csa-unit-hub-resource-card.js`, 24-assertion mutation suite
  `npm run smoke:hubcard`, including 6 source mutations that each prove one
  guard is load-bearing rather than decorative.
- Parse-back diff: the CSV was read back and the Body HTML column matched the
  intended body byte for byte, md5 `ec091aba4866`, 64,581 code points.
- `node scripts/matrixify-preflight.js` returns **clear to import** with the
  carrying file. It refused the first draft three times: no BOM, a file name
  Matrixify would have rejected whole, and an emoji it could not prove was
  pre-existing.


## What the import actually proved

Measured after the import, all of it re-derivable:

| | |
|---|---|
| Post-import check | **8 of 8** |
| Live stored body vs the Body HTML the sheet carried | **byte-exact**, 64,592 UTF-16 units |
| Rendered page | 200, `looksReal` true, card text present, **5** resource-card anchors |
| Inbound content links to the target | **0 before, 1 after** (chrome excluded, stored bodies read) |

The last row is the one that matters: it is the same measurement that established
the defect, re-run against the same parent set, so the fix is proven the way it
was found rather than by a different and friendlier check.

This session did the work, so it did not mark the board task verified. Board 352
sits in `needs_verification` with `verified` still false.

## One thing this exposed

`scripts/matrixify-preflight.js` answered **clear to import** on this sheet AFTER
it had already been imported and gone a day stale. The staleness rule that fired
on its first real case on 2026-09-17 lives inside one generator,
`scripts/csa-cyber-quiz-mount-unpin-csv.js`, not in the shared preflight every
sheet passes through. So every other sheet under `imports/` is a re-import that
nothing would refuse. Filed as its own board item.
