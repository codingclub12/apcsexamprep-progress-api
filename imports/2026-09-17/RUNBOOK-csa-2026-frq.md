# Import runbook: the 2026 AP CSA FRQ pages

One sheet, five pages, one import. `csa-2026-frq-pages.csv`.

Generated 2026-09-17 by `node scripts/csa-past-frq-pages-csv.js`. Regenerate
rather than hand-edit; the generator refuses several things a hand edit would
not notice.

## Before you import

**Re-run the generator first.** A sheet goes stale: on 2026-09-08 one sat
unimported for a day while somebody fixed the same defect better, and importing
it would have reverted the fix. This sheet creates five pages that do not exist
yet, so the stale risk here is low, but the check costs one command:

```
node scripts/csa-past-frq-pages-csv.js imports/2026-09-17/csa-2026-frq-pages.csv
```

If it refuses to write, read the refusals. It will not write a sheet whose
titles, point totals, links, structured data or ASCII cleanliness are wrong.

**Confirm none of the five handles is already live.** All five are new. If a
handle has appeared since this sheet was generated, MERGE will overwrite that
page's body with no undo.

```
for h in ap-csa-2026-frq-1-account ap-csa-2026-frq-2-bottle \
         ap-csa-2026-frq-3-attendance ap-csa-2026-frq-4-gameboard ap-csa-frq-2026; do
  curl -s -o /dev/null -w "%{http_code} $h\n" "https://www.apcsexamprep.com/pages/$h"
done
```

Expected: **404 on all five.** A 200 means somebody built one by hand and this
import would replace it.

## The import

One step. Matrixify, MERGE mode, this file as-is.

The file name must keep the word `pages` in it. Matrixify reads a CSV's sheet
name from the file name, and a name it cannot place is rejected in one second
with no per-row detail.

Expected result: **5 pages, 0 failed.**

## After you import

```
for h in ap-csa-2026-frq-1-account ap-csa-2026-frq-2-bottle \
         ap-csa-2026-frq-3-attendance ap-csa-2026-frq-4-gameboard ap-csa-frq-2026; do
  curl -s -o /dev/null -w "%{http_code} $h\n" "https://www.apcsexamprep.com/pages/$h"
done
```

Expected: **200 on all five.**

Then check the thing that matters rather than the thing that is easy to see. The
easy check is "did the page appear". The check that matters is:

1. **The reveal panel is CLOSED on arrival.** Load a question page and confirm
   the solution is not visible until the green button is pressed. A body that
   imported but lost the collapse would publish four answer keys and still look
   like a success.
2. **The point total is the question's own.** FRQ 1 and 2 say 7, FRQ 3 says 5,
   FRQ 4 says 6. The only place the number 9 may appear is inside the amber
   callout explaining what the archive years used.
3. **The PDF loads at the right page.** FRQ 1 opens the College Board PDF at
   page 3, FRQ 2 at page 6, FRQ 3 at page 8, FRQ 4 at page 11.

## What is deliberately NOT in this sheet

- **No change to any 2004 to 2025 page.** 74 of them still print "Points: 9"
  with no 2026 note, and the fix for that is a separate MERGE carrying an added
  block, split by year the way the cyber quiz sheets were. It is item 4 in the
  audit's recommended order and it is not this import.
- **No link from `ap-csa-frq-archive` to the 2026 set.** The archive hub needs
  its own edit, and it needs three other corrections at the same time: it says
  "88 FRQs Total" (there are 86), "Every released exam" (2026 exists) and "36
  points" (now 25), and it counts down to May 15, 2026. Doing all four in one
  pass is one import instead of two.
- **Nothing about `ap-csa-frq-bootcamp-2026`**, which is live and still selling
  tiers for an event on April 16, 2026. Pricing is on the `NEVER_AUTO` list.

So after this import the five pages exist and are correct, and the archive does
not link to them yet. That is the expected end state of this step, not a missed
row.
