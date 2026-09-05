# Daily site audit, 2026-09-05

Read-only routine: crawl and report, no board tasks, no imports. One
metadata-only exception per the routine's own rules: SEO title and
description fixes for pages the crawl found, generated as a Matrixify sheet
and opened as a draft pull request, never imported by this session.

## What ran

`.github/workflows/site-audit.yml` had not fired for today by the time this
routine started (09:36 UTC, cron is 09:00 UTC; the last completed run was #10,
2026-09-04 13:04 UTC, shard 3/7). Ran it locally instead, with that run's
artifact as `--previous`:

```
node scripts/site-crawl.js --out /tmp/today.json \
  --previous /tmp/yesterday.json --budget 400 --max-minutes 30
```

Shard 4/7, 400 of 2095 sitemap URLs, 676 requests, 815s. `aborted: null`,
`truncated: null`, so this is a valid baseline for tomorrow. API build at
crawl time: `b84635e`.

## P0 (1, unchanged, now 8 nights)

`ap-cyber-unit-1-frq-practice` still carries a graded `data-item-id` widget
with no `apcs-score-reporter.js` loaded. First seen 2026-08-28; tonight is
night 8, over a week of a score silently not recording for whoever hits that
page. No board task exists for it (checked `apcs list --all` for
"frq-practice", "reporter", "score-reporter": no match). Reporting per this
routine's scope, but a week unaddressed with nothing tracking it is worth
someone picking up deliberately.

A same-session reproduction attempt against this page hit a 429 (the
storefront throttling this session after the crawl's own 676 requests), so it
was not re-verified live tonight beyond what the crawler itself already
confirmed. Not evidence the finding is stale; the crawler's own detector
already reproduces it via a real fetch each night.

## New since last night, one real and one that is not

**Real:** the crawl's own delta reported 170 fresh findings. Broken down by
kind, 164 of them are the shard rotating from 3/7 to 4/7: a different
seventh of the sitemap getting h1/title checks it did not get last night
(`h1-duplicate` 116, `h1-is-title` 24, `title-overlong` 21, on pages the
crawl had simply not looked at before). Not drift, expected by design.

The other 6 are genuine, newly-observed defects on 6 pages this shard
reached for the first time: 3 pages with a scraped meta description
(`meta-scraped`) and 3 AP CSP games with the store name twice in the title
(`brand-doubled`, `ap-csp-game-binary-conversion-race` also carrying both).
Fixed tonight, see below.

**Not real:** a new P1, `api-stale-deploy`, "production serves b84635e,
which is 10.7h old; main is 5282fc5." Checked and this is the same false
positive `docs/runs/2026-09-04-claude-code-daily-audit.md` already
diagnosed: `scripts/site-crawl.js` compares the deployed commit against this
container's local `git rev-parse origin/main`, which was cached from before
this session's first `git fetch origin main`. Confirmed against both live
sources directly, after fetching:

```
curl https://progress.apcsexamprep.com/api/health   -> "commit":"b84635e"
git fetch origin main && git log origin/main -1     -> b84635e
```

Production and main agree (both `b84635e`, PR #558). No drift. This failure
mode is specific to running the crawl from a session clone that has not
fetched recently; the GitHub Actions job checks out fresh (`fetch-depth: 0`)
each run and would not hit it.

## Resolved (1)

`h1-duplicate` on `/pages/ap-networking-command-center` is gone, confirmed
by recrawl (the crawler only claims a resolution on a URL it actually
looked at again tonight).

## Metadata fixed this pass

Found 11 pages with a broken SEO title or description, all traced to two
causes: a scraped fallback description (breadcrumbs and nav labels landing
in `SEO Description` instead of authored text) and, on three CSP games, the
store name appearing twice in the title. None had a `seed/seo-rewrites.js`
row yet. Added 11 rows, all passing `npm run smoke:seometadata`-equivalent
(`node smoke/seo-metadata-csv.js`, 35/35) and a parse-back diff against the
generated CSV (all 11 rows byte-identical between source and sheet):

- `ap-csa-lesson-2-7-while-loops`, `ap-csa-lesson-2-9-implementing-selection-iteration-algorithms`,
  `ap-csp-course-bi3-unit-test-part-b`, `ap-cybersecurity-unit-2-detecting-physical-attacks`:
  scraped descriptions, freshly found tonight.
- `ap-csp-game-binary-conversion-race`, `ap-csp-game-spot-the-bias`,
  `ap-csp-game-two-sides`: brand doubled in the title, freshly found tonight.
- `ap-csa-unit-1-course`, `ap-csa-unit-2-course`, `ap-csa-unit-4-course`,
  `ap-csa-unit-3-practice-exam-part-2`: scraped descriptions that have been
  sitting for 9 to 10 nights with no board task and no fix. These are course
  hub pages, real search traffic, not edge cases.

Two bonus fixes surfaced while writing these, both content mismatches
outside what the crawler itself flags:

- `ap-csa-unit-1-course` had a stale title, "AP CSA Unit 1: Primitive
  Types", while the page's own H1 and content are "Using Objects and
  Methods". Retitled to match the actual page.
- `ap-csa-unit-4-course` carried an em dash in its title ("Data Collections
  — Course Hub"), against the repo's own no-em-dash convention. Retitled
  without it.

**Deferred, not guessed:** `ap-csa-unit-3-course` has the same scraped-
description defect (10 nights old) and also carries the stale year
2025-2026 inside that description, so fixing it clears two findings at
once. Did not fetch its full body to write an accurate description: two
live requests to it both hit a 429 tonight (this session's own crawl had
just made 676 requests against the storefront), and guessing a course
hub's description from a 120-character truncated snippet risks writing
something confidently wrong. Left for a future pass with a fresh rate
budget rather than fabricated tonight.

Sheet: `imports/2026-09-05/seo-pages.csv`, 36 rows (25 previously shipped,
11 new). Generated with `node scripts/seo-metadata-csv.js imports/2026-09-05`,
MERGE, no content column in the header. Not imported by this session; a
draft pull request carries it for review.

## Standing findings, unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the shared contact-section template, still pending the
  theme edit. 367 of ~400 pages in tonight's shard alone.
- `h1-is-title`: needs a body sheet, not filed this pass. Worth a flag: 36
  pages carried it in tonight's single shard, well above the "11 pages"
  figure from the 2026-08-26 baseline. That figure may simply be stale (one
  shard is a seventh of the site), not evidence of new drift; a full
  7-night rotation is needed before calling this a change.
- `robots.txt` serves a 1-byte body, theme file, unchanged.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected.
- Pages advertising 2025-2026 or 2025-26 remain the largest P1 bucket by
  page count (252 in tonight's shard). Same root cause as every prior
  night: most of these are body content, out of scope for a metadata-only
  pass. The handful that are pure title/description issues were pulled out
  and fixed above rather than left in this bucket.

None of these moved beyond the notes above. Not renarrated further.

## Also noticed, not news

`/api/health`'s `reporters: {ok:false, activities:11}` block is unchanged
from prior runs: same 11 activities, same course list (ap-csa units 1.1,
1.3, 1.5, 1.7; ap-cybersecurity 2.4, 3.1, 3.3, 4.2, 4.3, 5.1 exercise and
lab). Known, out-of-scope gap, mentioned only so it is not mistaken for
something new.

## What is still open

- The `ap-cyber-unit-1-frq-practice` reporter gap, now 8 nights, no board
  task.
- `ap-csa-unit-3-course`'s scraped description and stale year, deferred
  above pending a fresh rate budget.
- Everything in "Standing findings" above, same blockers as 2026-08-26 (a
  theme edit, a body sheet, Search Console).

## What was learned

Fixing "fresh" findings only understates the backlog. Four of the eleven
rows added tonight were findings the crawler has been reporting for 9 to 10
nights as `persisting`, not `fresh`, on pages this shard happened to
recrawl; they never surfaced in a "what's new" read of the report because
nothing about them was new. A metadata-only pass is cheap enough that it is
worth grepping the full findings list for `meta-scraped` and
`brand-doubled` regardless of fresh/persisting status, not just reading the
top of the report, since those two kinds are the ones this routine can
safely fix without touching a page body.

## Artifact

- Sheet, committed: `imports/2026-09-05/seo-pages.csv`
- Source: `seed/seo-rewrites.js`, 11 new rows
- Today's crawl JSON: `/tmp/today.json` (not committed, matches the pattern
  of CI's own `current-crawl.json` cache artifact, not repo content)
- This run note is the evidence of record for what was found; the pull
  request is the evidence of record for what was proposed.
