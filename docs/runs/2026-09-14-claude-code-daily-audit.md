# 2026-09-14, claude-code: daily site audit

Board state read first, per rule 1. Nothing here duplicates an open task.

## Coverage

No `site-audit.yml` run existed yet for today when this started (the last run
was yesterday, 2026-09-13T13:35Z). Downloaded that run's artifact as the
baseline and ran the crawl myself: shard 6/7, 400 of 2107 sitemap URLs, 675
requests, complete (`aborted: null`, `truncated: null`). Storefront driven once
this morning, as required.

## Is anything on fire

No new P0. The one standing P0 is worse than its "3 nights" label suggests,
below.

## New tonight

**The 2026-09-03 fix for the invisible Check buttons on the 1.1 lab regressed,
and nothing is tracking it.** Board #202 (status: done, verified: NO) shipped a
CSS custom-property declaration block on `#cyber-lab-11` on 2026-09-03, verified
live 16/16 green that night. I fetched the live page just now and it is gone:
`--purple` and `--dark` are read by `.score-bar .score-num`, `.check-btn`, and
`.rubric-table th` (`background:var(--purple)` / `var(--dark)`, `color:#ffffff`)
and defined nowhere on the page. Same defect, same mechanism as before: an
undefined `var()` invalidates the whole declaration, so the background drops and
white text sits on the white `.lab-section` card.

Traced the cause: the live body is now the board #264 mount-point version
(references `analysis-player.js`, zero embedded answer keys, 2 textareas versus
the original 6), which replaced the page body on some later import to move the
phishing specimens and grader server-side. That later sheet was built independent
of the #202 palette fix and did not carry its inserted block forward. Board #264
itself is `status: done, verified: NO`, artifact is API-side only (PR #595); its
own run note (`docs/runs/2026-09-07-claude-code-analysis-migration.md`) flags
"the page half needs a human import" as still open, which is consistent with
this: a later page-body sheet landed the mount point but dropped the palette fix
riding in the body before it.

Not filing a board task, per this routine's scope, but this is the top item for
whoever picks up #202/#264 next: the fix needs to be reapplied on top of the
current mount-point body, not reissued as the original sheet, which is now stale
against a body that no longer matches.

**Three more CSA Unit 4 lesson pages carry scraped Command Center nav text as
their meta description**, the same defect the 2026-09-05 crawl found on nine
other pages (rows already in `seed/seo-rewrites.js`): `ap-csa-lesson-4-2`,
`4-4`, `4-5`. All three also still carry the untouched default
title-plus-brand tag. Added as three new rows in `seed/seo-rewrites.js` and
regenerated the sheets into `imports/2026-09-14/`. `npm run smoke:seocsv`
passes (35/35), including the shipped-table assertions against the new rows,
and the generated CSV parses back byte-identical to what was authored.

## Verified false alarm, not reported as a finding

The crawl itself flagged `api-stale-deploy`: production serving `71cbe15`
against a local `origin/main` read as `1e896d0`. That was this session's own
stale git clone, fetched before I ran `git fetch origin main`. Confirmed
directly: `/api/health` reports `commit: 71cbe15`, and `71cbe1590cdf...` is the
actual current `origin/main` HEAD. Production is current. Not a real finding;
noting it here so it is not rediscovered as news tomorrow by a session running
from the same kind of stale checkout. The GitHub Actions run of this workflow
does not have this problem, since it always does a full fresh checkout first.

## Still open (unchanged from the standing list)

- `h1-duplicate`, ~47 of 50 pages, shared theme template, expected until that
  ships.
- `h1-is-title`, 11 pages, page-body fix needed.
- `robots.txt` serves a 1 byte body. Theme file.
- Eight competing AP Cybersecurity overview URLs, blocked on Search Console.
- School-year-2025-2026 text, ~250 pages across blog posts and a handful of
  hub/course pages. Unchanged in count and shape from yesterday.
- `ap-csa-teacher-superpack-free-preview` product body, 10109 bytes, under the
  20000 byte floor, 4 nights.

## Resolved since last night

None. Both nights' shards overlap enough URLs to compare but nothing that was
broken yesterday came back clean today.

## Deeper pass today (rotation)

Rechecked Course schema coverage on the four course hubs, since that item has
not been re-verified since it was first written down: `ap-csa-course` and
`ap-networking` carry `Course` JSON-LD, `ap-computer-science-principles-resources`
and `ap-cybersecurity-complete-course-guide` do not. Unchanged from the standing
note, confirmed live rather than assumed.

## Auto-fix scan

`node scripts/autofix-scan.js /tmp/today.json`: 701 findings, 0 scored eligible.
Every kind present today (`h1-duplicate`, `stale-year`, `title-overlong`,
`h1-is-title`, `meta-scraped`, `css-var-invisible-text`, `api-stale-deploy`,
`truncated-body`, `brand-doubled`, `css-var-undefined`) is off the allow list
entirely; none is close to eligible on a near-miss basis. Nothing to add to the
automation argument today beyond what is already on record.

## What changed in this repo

- `seed/seo-rewrites.js`: 3 new PAGES rows (36 to 39).
- `imports/2026-09-14/`: regenerated sheets (`seo-pages.csv`, `seo-products.csv`,
  `seo-collections.csv`). Nobody has imported these; they are a draft PR, not a
  change to the store.
- This run note.

Nothing else. No board write, no page body touched, no Shopify import run.
