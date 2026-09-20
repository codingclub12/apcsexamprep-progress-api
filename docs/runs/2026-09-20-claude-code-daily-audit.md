# Daily site audit, 2026-09-20

Read-only routine: crawl and report, no board tasks, no imports. One
metadata-only exception per the routine's own rules: SEO title and
description fixes for pages the crawl found, generated as a Matrixify sheet
and opened as a draft pull request, never imported by this session.

## What ran

`.github/workflows/site-audit.yml` had not produced a run for today by
session start (09:36 UTC, cron is 09:00 UTC; last completed run was #27,
2026-09-19, and it had already failed to produce a usable baseline gap since
run #27 itself succeeded and cached a valid `current-crawl.json`). Downloaded
that artifact (`site-audit-27`, run 35443952599) and used it as `--previous`,
so today's run gets mechanical night-tracking rather than the qualitative
comparison yesterday's session had to fall back to:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 \
  --previous /tmp/yesterday.json
```

Shard 5/7, 400 of 2122 sitemap URLs, 675 requests, 915s. `aborted: null`,
`truncated: null`, a usable baseline. API build `d454c9c`, confirmed current
against `origin/main` after `git fetch origin main`.

**Mistake made and corrected this session, recorded rather than hidden.**
While looking for a way to vary today's deeper check, I ran
`node scripts/link-graph.js --help` to read its usage, exactly the mistake
this routine's own instructions warn against for `site-crawl.js`. `link-graph.js`
has no `--help` flag either and started a real crawl of the full 2122-URL
sitemap. Caught and killed it at 50 requests in about 70 seconds (900ms
delay, same throttle as the nightly crawl), overlapping the tail end of the
legitimate `site-crawl.js` run already in flight. Net extra load on the
storefront: roughly 50 requests over about a minute, on top of the 675 the
scheduled crawl already made. Not a second full crawl, but a real,
avoidable overlap. The lesson generalizes past this one script: do not
probe an unfamiliar script in this repo with `--help` or an unrecognized
flag when it touches the storefront, full stop, because the pattern here
(no help text, no argument validation, immediate live action) is shared by
more than one script.

## Is anything on fire

Yes, still. Same page as yesterday, unresolved.

## P0 (3 findings, 1 page, confirmed live twice)

All three are on `https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-1-lab`
(`#cyber-lab-11`): `.score-bar .score-num` and `.check-btn` paint white text
on `var(--purple)`, and `.rubric-table th` paints white text on `var(--dark)`.
Neither custom property is defined anywhere on the page, so the background
declaration is invalid and drops, and the text renders on whatever is behind
it. This is the same failure class that cost 27 of 32 students in CYBER-T5KR
their lab score on 2026-09-03 (board #202,
`docs/runs/2026-09-03-claude-code-cyber-lab11-palette.md`) and the same page
`docs/runs/2026-09-19-claude-code-daily-audit.md` reported yesterday.

With a continuous baseline for the first time, the crawler's own fingerprint
tracking now dates this specific regression at **9 nights**, meaning roughly
since 2026-09-11, a second wave distinct from the original 2026-09-03
incident and its fix.

Reproduced directly today with the live verifier built for the original fix:

```
node scripts/verify-cyber-lab11-palette-live.js
```

15 of 16 assertions still fail: all ten custom properties still unresolvable,
0 of 4 email specimens present (should be ~4), only 1 of the expected
check/continue button markup found, the wrapper's own palette rule absent.
Only the gradebook lesson id assertion passes, meaning the page is still
wired to record a grade against broken content. Unchanged from yesterday's
read, byte for byte in outcome.

**No board task exists for this** (checked `apcs list --all` for
`lab-11`, `lesson-1-lab`, `cyber-lab`, `1.1 lab`, `tactic and impact`: no
match), despite yesterday's session pushing a proactive notification for it.
Reporting only, per this routine's scope: no fix attempted, nothing filed.
Pushing another notification with this note, since a P0 that survives a full
day unresolved after being flagged once is exactly the case this routine
exists to keep surfacing rather than letting go quiet.

## New since last night (167, all shard rotation, none of it real news)

Broken down by kind: `h1-duplicate` 128, `h1-is-title` 22, `meta-scraped` 7,
`title-overlong` 10. All fired only on URLs this shard (5/7) reached for the
first time in the current rotation; none is a fresh finding on a
previously-checked page. Same pattern documented on 2026-09-05 and
2026-09-06.

## Resolved (0)

None. The crawler's delta agrees: 0 resolved.

## Metadata fixed this pass

The 7 `meta-scraped` pages above are all AP CSA lesson pages whose stored
description is scraped breadcrumb and nav furniture ("AP CSA > Course > Unit
2..."). Fetched each page's actual body content live
(`lib/storefront-fetch.js`'s `pageBody()`, one request per page, 1s apart) to
write accurate descriptions rather than guess from a truncated snippet:

- `ap-csa-lesson-2-1-algorithms-selection-repetition`
- `ap-csa-lesson-2-10-implementing-string-algorithms`
- `ap-csa-lesson-2-11-nested-iteration`
- `ap-csa-lesson-2-3-if-statements`
- `ap-csa-lesson-3-5-methods-how-to-write-them`
- `ap-csa-lesson-3-6-methods-passing-returning-object-references`
- `ap-csa-lesson-4-6-using-text-files`

Added 7 rows to `seed/seo-rewrites.js`, all under the 140 to 160 character
description rule and the 60 character title rule, no brand, no em-dash.
`node smoke/seo-metadata-csv.js`: 42/42 passed. Generated
`imports/2026-09-20/` (59 page rows, 13 product rows, 7 collection rows) and
parsed the pages sheet back to confirm all 7 new rows are byte-identical
between `seed/seo-rewrites.js` and the CSV. Not imported by this session; a
draft pull request carries it for review.

## Also noticed, not this routine's to fix: CED Essential Knowledge codes visible to students on AP CSA lesson pages

While reading the 7 lesson bodies above for description content, four of
them render an inline `(EK N.N.A.N)` code directly in student-facing text,
for example "(EK 2.1.A.3)" in a vocabulary table on
`ap-csa-lesson-2-1-algorithms-selection-repetition` and "(EK 3.6.A.3)" inside
the "What You'll Learn" list on
`ap-csa-lesson-3-6-methods-passing-returning-object-references`. This repo's
own convention against putting EK codes in front of students
(`lib/cyber-ek-density.js`) is written generally but built and wired only
for AP Cybersecurity page structure; nothing in this repo currently scans AP
CSA lesson pages for the same defect. Board #223 already tracks this exact
problem for AP Cybersecurity Units 2-5 (297 codes). Whether AP CSA has its
own version of it is an open question this pass did not scope out: only 4 of
53 CSA lesson pages were read directly today, so this is a spot observation,
not a sweep. Not actioned, not filed as a board task per this routine's
scope; worth a deliberate sweep by whoever owns `lib/cyber-ek-density.js` or
a CSA-specific equivalent.

## Rotation: new College Board announcements (`npm run cedwatch`)

Ran `node scripts/ced-watch.js`, safe alongside the concurrent crawl since it
reads College Board rather than this storefront. All 17 first-party sources
read clean against last week: nothing changed for AP Cybersecurity, AP
Networking, AP CSA or AP CSP. Committed the resulting `checked_at` bump in
`docs/ced-snapshot/index.json` separately from this run note, since it was
ready before the crawl finished.

## Morning report review (`npm run morning`)

Exited as documented: "morning: no admin credential", pointing at
`ADMIN_READ_KEY`. Neither it nor `ADMIN_KEY` is on this environment, as
expected. Not raised further, per repo convention.

## Standing findings, unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the shared contact-section template: 128 of this shard's
  400 pages, expected until the theme edit ships.
- `h1-is-title`: 22 in this shard, needs a body sheet, out of scope here.
- `robots.txt`: still fixed (theme commit `90c36ea`), not re-tested this
  pass since nothing suggested regression.
- The eight competing AP Cybersecurity overview URLs: still blocked on
  Search Console being connected.
- Pages advertising 2025-2026 or 2025-26: 234 of 244 P1 findings this
  shard, same root cause and same out-of-scope-for-metadata status as every
  prior night.

## Also worth a human glance: a backlog of open daily-audit PRs

Exactly 15 pull requests are open on this repo right now (checked via the
GitHub API, not counted from a listing that might be paginated), the oldest
being `#579` (2026-09-07, a CED watch snapshot PR) and most of the rest
daily-audit or content PRs including yesterday's `#744`. Not this routine's
to resolve, but the backlog itself is a fact worth surfacing: metadata fixes
sitting in open PRs are not live until merged, so any "fixed" claim in a
past run note is a claim about a PR, not about production, until someone
checks which of these actually merged.

## What is still open

- **The cyber-lab-11 regression**, now confirmed on 2 consecutive days,
  crawler-dated to 9 nights, still no board task. The one item here that
  needs a person soon.
- The possible AP CSA Essential Knowledge code exposure noted above, not
  swept, not filed.
- The stale-year P1 bucket, `h1-duplicate` template issue, and the
  Search-Console-gated overview URLs, all unchanged.
- The open daily-audit PR backlog noted above.

## What was learned

Running an unfamiliar repo script with `--help` to check its usage is not
safe in this repo when the script touches the storefront: neither
`site-crawl.js` nor `link-graph.js` validates its arguments or offers real
help text, both start a live action immediately, and there is apparently no
reason to assume a third one would behave differently. The safe way to learn
a script's flags here is to read its source, not to invoke it speculatively.

## Artifact

- This run note, plus `docs/ced-snapshot/index.json` (committed separately).
- `imports/2026-09-20/seo-pages.csv`, `seo-products.csv`, `seo-collections.csv`,
  committed; draft pull request opens for review, not imported by this
  session.
- `/tmp/today.json` and `/tmp/crawl-report.txt` are local to this session's
  container and will not survive it. The live-verifier output quoted above
  (`scripts/verify-cyber-lab11-palette-live.js` against production,
  2026-09-20) is the evidence for the P0 claim and can be reproduced by
  anyone with network access to the storefront by re-running that script.
