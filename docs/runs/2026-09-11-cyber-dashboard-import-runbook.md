# Import runbook: one sheet, /pages/cyber-dashboard, 2026-09-11

One Matrixify Pages sheet, one row, one page.

    matrixify/cyber-dashboard-gradebook-rollup-pages.csv

It is `UPDATE`, which REPLACES the whole Body HTML of that page with no undo.
Shopify keeps no page history, so read the section below before you click.

## Run this BEFORE you import

    node scripts/verify-dashboard-rollup-live.js

Expected right now:

    LIVE /pages/cyber-dashboard  104858 bytes  updated_at 2026-09-07T07:00:28-05:00
      [FAIL] this body has no classAvg/colAvg. The sheet is NOT imported.
    FAILED - /pages/cyber-dashboard still rolls up a mean of percentages

**If that comes back OK instead, STOP and delete the sheet.** It means somebody
has already fixed the page and this file is a five-day-old body that would
revert them. That is not hypothetical: it nearly happened on 2026-09-08, when a
day-old sheet would have merged a stale Command Center body over a better fix
and nothing in the sheet would have said so.

## What this sheet changes, and it is THREE things, not one

The repo mirror `shopify/cyber-dashboard.html` is two changes ahead of the live
page, and an import ships whatever the mirror holds. Named here rather than
discovered afterwards:

| # | change | whose | verified here |
|---|---|---|---|
| 1 | the gradebook rollup: class average and column footers are marks, not a mean of percentages | this session | YES |
| 2 | the retry panel, three modes that actually save, replacing four dead SAVING SOON switches | 2026-09-09 | no, passed along |
| 3 | board 260's unenforceable-lock disclosure, a warning glyph beside the padlock | 2026-09-07 | no, passed along |

2 and 3 were built, validated and handed over by earlier sessions whose own run
notes say the sheet needed a human and nobody imported it. They ride along
because stripping them back out by hand to keep this change pure would be the
worse choice, and because the live page is the older body either way.

The four `rt-` element ids the generator's loss guard names as deleted
(`rt-lesson`, `rt-ex`, `rt-quiz`, `rt-exam`) are the dead switches change 2
removes on purpose. `--accept-loss` is the right answer and the guard is asking
the right question.

`matrixify/cyber-dashboard-retry-panel-pages.csv` is DELETED in this commit
rather than left beside it. It carried changes 2 and 3 only, and importing it
after this one would put the mean of percentages back. Two live sheets for one
page is how a fix gets reverted by somebody being helpful.

## The import

One row, MERGE-style UPDATE, Pages. Nothing else in the file.

## Run this AFTER

    node scripts/verify-dashboard-rollup-live.js

Expected:

    LIVE /pages/cyber-dashboard  112304 bytes  updated_at <today>
      [PASS] the live class average is 31 of 62, which is 50
      [PASS]   and NOT the 61 a mean of 90 and 31 gives
      [PASS]   it carries the marks behind it
      [PASS] the live column footer is 19 of 22, which is 86
      [PASS]   and NOT the 70 that averaging 90 and 50 gives
      [PASS] an unpriced column still reports its mean, 70, and says so
    OK - the live dashboard rolls up marks (6 checks)

That check is not a string search. It pulls the script out of the live body,
runs the page's own `classAvg` and `colAvg` in a vm on a fixture where a mean
and a points average give different answers, and asserts the numbers. A sheet
that added the function and left the old call site would pass a text search and
fail this.

Then open the page as a teacher on a real class and look at two things:

- the Class average card now reads "B average, 137 / 168 marks" rather than a
  bare percent
- the footer under a column shows its marks on hover, and an unpriced column
  carries a `*`

## What this sheet does not fix

The teacher dashboard is one of two gradebook surfaces. The operator side,
`/admin/teachers` and `GET /api/admin/class/:id/gradebook`, had the same defect
at five levels and is fixed in the API, in PR #660. The two are independent
deploys: merging that PR does nothing to this page, and importing this sheet
does nothing to that API.
