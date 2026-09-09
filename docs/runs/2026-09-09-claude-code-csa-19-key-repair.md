# The one CSA Unit 1 key nobody could ever match

2026-09-09, board 296. Found by the Unit 1 leak sweep, board 295, and it is the
more urgent of the two.

## What is wrong

`ap-csa-lesson-1-9-method-signatures`, item `1.9-cfu-1`, stores its key as a
newline followed by `C`. The page grades with no trim and a strict `===` against
option letters that are exactly `A` `B` `C` `D`:

    var correct = ex.getAttribute('data-answer');
    ...
    feedback.classList.add(chosen === correct ? 'fb-correct' : 'fb-incorrect');

So no option can ever equal the key. Three things follow, and the third is the
one that costs a student something: the answer is never marked right, the correct
option is never highlighted afterwards, and `apcs-reporter.js` posts 0 out of 1
into the gradebook. `1.9-cfu-1` is a manifest row at one point, so that zero is a
real column.

The other five items on the page are clean. It is one attribute.

## How it was found, which is the part worth keeping

Not by looking for it. The leak sweep's first classifier read the untrimmed
attribute value, and `"\nC"` is not a lone letter, so it filed a multiple choice
key as cloze prose. That made the module's count disagree with an earlier
throwaway probe by exactly one.

An off-by-one against your own earlier number is the cheapest thing in the world
to round off. Chasing it is the only reason this is on the board.

## What shipped

- `scripts/csa-19-cfu1-key-repair-csv.js`, the generator. Seven refusals, all of
  them about the 91,573 bytes that are NOT changing.
- `smoke/csa-19-key-repair.js`, `npm run smoke:csa19key`. 21 cases. Three
  refusals are proven with real bad input rather than by patching the source,
  and five are mutation tested, each expecting its own message.
- `scripts/verify-csa-19-key-live.js`, the post-import check.
- `imports/2026-09-09/`: the sheet, the pre-import body, and the runbook.

## Evidence

`matrixify-preflight --expect-command MERGE --carrying` says clear to import,
with the one emoji and the 68 non-ASCII characters proven carried through from
the live body rather than introduced.

The verifier run BEFORE the import reads 4 passed, 2 failed, and the two failures
are assertions 1 and 2, which are the two the import makes true. That is the
evidence that they are worth asserting at all. Assertions 3 to 6 pass either way
because they are watching for the MERGE taking something with it, which is the
failure that would be worse than the bug.

The two mutations worth naming: the repair writing `D` instead of `C`, which is
one keystroke away and would mark a wrong answer correct, and an edit that lands
correctly but takes an `<h3>` with it. The first is caught by comparing the whole
key set before and after, the second by the byte count. Neither is caught by
looking at the attribute that was meant to change.

## Still open

- **The import itself.** This environment has no `SHOPIFY_ADMIN_TOKEN`, so the
  sheet is handed over rather than applied. Run the verifier BEFORE importing as
  well as after: a sheet carries a body captured on one day, and if it comes back
  6 of 6 the key is already fixed and the sheet is stale enough to revert whatever
  did it. The generator refuses on the same condition. That check is step 1 of the
  runbook rather than a footnote, because the 2026-09-08 Command Center sheet
  proved a day is long enough.
- **The grader still does not trim.** Fixing the data was the right first move
  because the script is inline in the page body, so patching it is the same MERGE
  with a larger diff, and a malformed key would still be sitting there for the
  next tool that reads it. But every other CSA lesson page carries the same
  untrimmed comparison, so a second padded key anywhere has the same effect.
  `lib/answer-leak.js` reports `padded` on every finding now, and
  `measure:csau1leak` prints them, so Unit 1 is covered. Units 2 to 4 are not
  measured.
- Nothing here touches board 295. The key is still readable on all fifteen pages.
