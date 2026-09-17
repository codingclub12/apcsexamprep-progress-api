# Import runbook: repairing the AP CSA FRQ archive

Seven sheets, seven imports, in this order. They are split because MERGE
overwrites a live body with no undo, so the blast radius of one click is however
many rows you chose to put in the file.

Generated 2026-09-17 by `npm run csa:frqrepairsheets` from the bodies the
storefront was serving at that moment. Everything it fixes is in
`docs/reports/2026-09-17-csa-frq-audit.md`.

| # | file | rows | what it changes | risk |
|---|---|---|---|---|
| 0 | `../2026-09-17/csa-2026-frq-pages.csv` | 5 | creates the 2026 question set | new pages only |
| 1 | `01-csa-frq-titles-pages.csv` | 43 | titles only, **no Body HTML column** | none to bodies |
| 2 | `02-csa-frq-2004-2007-pages.csv` | 16 | scoring note, unit fixes | body MERGE |
| 3 | `03-csa-frq-2008-2013-pages.csv` | 24 | scoring note | body MERGE |
| 4 | `04-csa-frq-2014-2017-pages.csv` | 16 | scoring note, one JSON-LD repair | body MERGE |
| 5 | `05-csa-frq-2018-2022-pages.csv` | 18 | scoring note | body MERGE |
| 6 | `06-csa-frq-2023-2025-pages.csv` | 12 | stale exam dates only | body MERGE |
| 7 | `07-csa-frq-archive-hub-pages.csv` | 1 | the hub's stats, countdown and links | body MERGE |

**Sheet 0 is not in this folder and it goes first.** Sheet 7 states "90 FRQs
Total" and links `/pages/ap-csa-frq-2026`, and both are only true once the 2026
set exists. Import `imports/2026-09-17/csa-2026-frq-pages.csv` first, following
its own runbook.

## Before you start

**Regenerate.** A sheet goes stale, and on 2026-09-08 one nearly reverted a
better fix that landed while it sat unimported. These are built from live bodies,
so regenerating is also how you find out somebody edited a page since.

```
npm run csa:frqrepairsheets
```

It refuses to write if anything is wrong, and it refuses loudly rather than
skipping a page: every transform states the text it expects and throws when the
text is not there.

**Confirm the repair is not already live**, which also tells you the checks work:

```
npm run csa:frqrepairlive
```

Expected **before** any import: **red, 13 of 13 on the hub** and a failure line
for most pages. Every assertion is written to be false before and true after, so
a green run here means somebody already imported these.

## The imports

One sheet at a time, Matrixify, MERGE mode, and **stop between each one**.

Expected result per sheet: the row count in the table above, 0 failed.

Keep the file names. A CSV has no tab name, so Matrixify reads the sheet name
from the file name, and a name it cannot place is rejected in one second with no
per-row detail.

### After sheet 1, the titles

```
node scripts/verify-csa-frq-archive-live.js --titles
```

Expected: **43 ok, 0 failed.** This is the cheapest confirmation that MERGE is
behaving, on the one sheet that cannot damage a body.

### After each body sheet

Spot-check one page in a browser and look at the thing that matters, not the
thing that is easy to see. The easy check is "the amber box is there". The check
that matters is:

1. **The box is CLOSED on arrival.** It is a `<details>` and it should be a
   single strip until tapped. A page that renders it open has lost the summary
   element and now shouts at every visitor.
2. **The page below it is unchanged.** The note is prepended and touches nothing
   else. If the layout below shifted, a div went unbalanced.
3. **On 2004-2007: no "Primitive Types".** Six pages linked a study guide
   labelled with the retired 10-unit curriculum. That name should be gone.

### After all seven

```
node scripts/deploy-gate.js deploy-gates/2026-09-17-csa-frq-archive-repair.json
```

Expected: **4 independent kinds agree: suite, rederive, mutation, live.** The
deploy is not finished until this passes without `--pre`.

## What is deliberately NOT in here

- **`ap-csa-frq-bootcamp-2026`**, which is live and still selling tiers for a
  Zoom event on 16 April 2026. Pricing is on the `NEVER_AUTO` list, so what
  happens to it is Tanner's call and not a sheet.
- **Em-dashes and other non-ASCII on pages these sheets touch.** 67 pages carry
  an em-dash and all 117 carry some non-ASCII. The validator here checks that
  the repair does not ADD any; clearing what is already there means rewriting
  prose on 86 pages, which is a different job with a different risk profile.
- **A generator for the 86 archive pages.** They stay hand-authored for now.
  Retro-fitting one means regenerating 86 indexed bodies at once, and that
  deserves its own plan rather than riding along with a repair.

## If a sheet goes wrong

Every sheet is MERGE, so re-importing the same file is safe and idempotent: the
bodies are absolute, not patches. What is not safe is importing an OLD copy,
because it carries the pre-repair body. Regenerate rather than reuse.

The one irreversible thing in this runbook is importing a sheet built from a
stale read, which would revert whatever landed in between. That is what the
regenerate step at the top is for.
