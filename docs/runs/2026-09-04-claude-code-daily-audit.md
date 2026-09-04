# Daily site audit, 2026-09-04

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today at run time (its
last completed run was #9, 2026-09-03 13:10 UTC, shard 2/7). Ran it locally
instead, with that run's artifact as `--previous`:

```
node scripts/site-crawl.js --out /tmp/today.json \
  --previous /tmp/site-audit-9/current-crawl.json --budget 400 --max-minutes 30
```

Shard 3/7, 400 of 2103 sitemap URLs, 676 requests, 838s. `aborted: null`,
`truncated: null`, so this is a valid baseline for tomorrow. API build at
crawl time: `072f89f`.

## P0 (1, unchanged)

`ap-cyber-unit-1-frq-practice` carries a graded `data-item-id` widget with no
`apcs-score-reporter.js` loaded. First seen 6 nights ago (2026-08-29); tonight
is night 7, a full week with a score silently not recording for whoever hits
that page. Reporting per this routine's scope (read and report, no board task,
no fix), but a week unaddressed is worth someone picking up deliberately
rather than waiting for night 14.

## New since last night, and one that is not real

The report lists a new P1: `api-stale-deploy`, "production serves 072f89f,
which is 5.0h old; main is ffc152d". Checked and this is a false positive from
running the crawl outside CI: `scripts/site-crawl.js` compares against local
`git rev-parse origin/main`, and this container's cached `origin/main` was
stale at `ffc152d` before this session's first `git fetch`. Confirmed against
both live sources directly:

```
curl https://progress.apcsexamprep.com/api/health   -> "commit":"072f89f"
git fetch origin main && git log origin/main -1     -> 072f89f
```

Production and main agree. No drift. This failure mode is specific to running
the crawl locally with an unfetched clone; the GitHub Actions job checks out
fresh (`fetch-depth: 0`) each run and would not hit it. Noted here so nobody
reads today's report and chases a deploy lag that does not exist.

The other 160 "new" items are the shard rotating from 2/7 to 3/7, a different
seventh of the sitemap getting title/H1/meta checks it did not get last
night. Not drift, expected by design (`docs/site-crawl.md`, "one shard of
everything else, rotated daily").

## Resolved

0, same as last night. Nothing in the hot set (checked every night regardless
of shard) changed state.

## Standing findings, unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the same shared contact-section template, still pending
  the theme edit.
- `h1-is-title` needs a body sheet, not filed this pass.
- `robots.txt` 1-byte body, theme file, unchanged.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected.
- The 243+ pages advertising 2025-2026 are still the largest P1 bucket by
  page count; same root cause as every prior night (school-year strings that
  need a body sheet, out of scope for a metadata-only pass).

None of these moved. Not renarrated further.

## Also noticed, not news

`/api/health`'s `reporters: {ok:false, activities:11}` block is unchanged
from the state `docs/runs/2026-09-02-claude-code-board-166-workflow-reporting.md`
already recorded as a known, out-of-scope gap (nothing carries that field to
the board yet). Same 11 activities, same course list. Mentioned only so it is
not mistaken for something new.

## Rotation: College Board / competitor check

Searched for AP Cybersecurity and AP Networking news since the 2026-09-01 CED
snapshot. Nothing that changes anything on the site:

- AP Cybersecurity goes nationwide for 2026-27 (Cisco partnership), pilot
  reached 3,100 students across 183 schools in 2025-26. Consistent with what
  `docs/ced-snapshot/` already has.
- AP Networking's 2026-27 pilot is its third and final one, MCQ-only exam,
  restricted to schools that already piloted AP Networking or AP Cybersecurity.
  Nationwide from 2027-28. Worth a note for whoever next touches AP Networking
  copy: the pilot exam has no FRQ, which is a fact worth confirming against
  the CED before it ships anywhere on the site.

No metadata changes landed from this rotation; nothing found rose to a
`seed/seo-rewrites.js` row.

## What is still open

- The `ap-cyber-unit-1-frq-practice` reporter gap, now 7 nights.
- Everything in "Standing findings" above, unchanged, same blockers as
  2026-08-26 (a theme edit, a body sheet, Search Console).

## Artifact

Today's crawl JSON: `/tmp/today.json` (not committed, matches the pattern of
`current-crawl.json`/`previous-crawl.json` being CI cache artifacts, not
repo content). This run note is the evidence of record.
