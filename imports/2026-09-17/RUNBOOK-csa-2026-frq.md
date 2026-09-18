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

Expected: **404 on four of them, and a 301 on `ap-csa-frq-2026`.**

A 200 on any of them means somebody built that page by hand and this import
would replace its body.

### The 301 on ap-csa-frq-2026, and what to do about it

Checked 2026-09-17: `/pages/ap-csa-frq-2026` answers **301 to
`/pages/ap-csa-frq-archive`**. That is a deliberate Shopify URL redirect,
recorded at line 252 of `APCSExamPrep-theme/fixes/redirect-link-map.csv`. It was
created because pages linked a 2026 index that did not exist yet, which was the
right fix then and is in the way now.

**I do not know for certain which wins once the page exists.** Shopify may treat
the redirect as inert the moment a real page occupies the handle, or the
redirect may keep shadowing it. So this is a check, not an assumption, and it is
the first thing to run after the import:

```
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "https://www.apcsexamprep.com/pages/ap-csa-frq-2026"
```

- **200** and the redirect is inert. Nothing to do, though deleting it in
  Online Store > Navigation > URL Redirects is tidy.
- **301** and the new index page exists but nobody can reach it. **Delete that
  redirect** in Shopify Admin, then re-run the curl and expect 200.

**ANSWERED 2026-09-18: it is the first case.** The import created the page and
the handle now serves 200. Shopify treats a URL redirect as inert once a real
page occupies the path, so the redirect did not need deleting. Recorded here so
the next person does not re-derive it.

**AND A SECOND THING WORTH KNOWING: the pages do not appear instantly.** Checked
minutes after an import that reported OK on all five rows, every handle still
answered 404, on the rendered route and on `.json` alike. They were all 200 a
short while later. So a 404 straight after a clean import is propagation, not
failure. Read the import result first and believe it over one impatient curl:
`Import Result: OK` with `Import Comment: NEW` means the page exists.

Either way the four question pages are unaffected: none of them has a redirect.

This matters more than it looks, because the archive hub already links
`/pages/ap-csa-frq-2026`. Until that URL serves the index, a reader clicking the
2026 card on the hub lands back on the hub they came from.

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
