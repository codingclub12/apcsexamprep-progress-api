# Daily site audit, 2026-09-22

Scheduled routine. Crawl and report only: no board tasks filed, nothing
imported, no page body touched.

## What ran

The scheduled workflow (`site-audit.yml`) had not fired for today yet at
session start (its last completed run was 2026-09-21T15:34Z, run #29). Pulled
that run's artifact as the `--previous` baseline and ran the crawl once:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 --previous /tmp/yesterday.json
```

Shard 7/7, 400 of 2126 sitemap URLs, 674 requests, 925s, complete
(`aborted: null`, `truncated: null`). API build `58283a3`. `git fetch origin
main` confirmed `origin/main` is also at `58283a3`: no deploy staleness.

## Result: quiet night

**3 P0, 244 P1, 408 P2, 42 P3. 0 resolved.** The crawl reported 176 "new"
findings, but checking the raw findings for `nights <= 1` shows zero of them
are P0 or P1: today's shard (7/7) simply covers a different 400 URLs than
yesterday's (6/7), so the "new" count is shard-rotation noise on P2/P3, not
site movement. Nothing regressed and nothing was fixed since yesterday.

### P0 - unchanged, 11 nights

Same three `css-var-invisible-text` findings on
`/pages/ap-cyber-unit-1-lesson-1-lab` (`#cyber-lab-11` text painted against an
undefined `var(--purple)` / `var(--dark)`, so the background rule drops and
text renders on whatever is behind it). This is the standing P0 already
tracked on boards #202/#203/#264 (`verified=NO`) and reported in this same
routine every day since 2026-09-17. The fix is a theme edit and has not
shipped; nothing new to add today.

### P1 - unchanged

- School-year-ended text (`2025-2026` / `2025-26`) on 234+3+3+1+1+1 pages,
  standing 26-29 nights depending on the phrasing variant.
- `/products/ap-csa-teacher-superpack-free-preview` body still under the
  20000-byte floor (10109 bytes), 12 nights.

### Standing SEO findings, re-checked against the 2026-08-26 baseline

- `h1-duplicate`: 365 of 400 crawled pages today (91%), consistent with
  yesterday's 368/400 and the documented ~47/50 template-level cause. Still
  expected until the shared section ships; would be news if it dropped.
- `h1-is-title`: 33 pages today vs 30 yesterday, both shard samples of the
  same standing page-body issue. Not a regression.
- `robots.txt`: 0 findings. Still fixed (theme commit `90c36ea`), reconfirmed
  again today.

## Go deeper: collections with no meta description

Live-checked `/collections.json` directly (1 request, 10 collections): all
10 storefront collections (`ap-csa`, `ap-csp`, `bundles`, `flashcards`,
`frq`, `live-events`, `practice-exams`, `quick-reference`, `tutoring`,
`ap-csa-premium-frq-solutions`) still carry empty `body_html`. This matches
the finding first written up in `docs/site-audit-2026-08-positioning.md` on
2026-08-26, generalized from 3 collections checked then to all 10 confirmed
today.

No new row added to `seed/seo-rewrites.js`: 7 of the 10 already have
unimported rows on `main`, and an 8th (`live-events`) has a row sitting in
two still-open, unmerged draft PRs (#619 from 2026-09-08, #642 from
2026-09-09). The remaining 2 (`tutoring`, `ap-csa-premium-frq-solutions`)
were deliberately excluded by the 2026-09-08 session; did not re-open that
call today.

## Go deeper: College Board / competitor check

Web search for AP Cybersecurity / AP Networking news since the 2026-09-01
CED snapshot: nothing new. Same facts already in `CLAUDE.md` (Cybersecurity
national launch May 2027, Networking pilot 2026-27 with a 2027-28 national
launch). Search results for AP Cybersecurity curriculum and exam-prep queries
are dominated by apcsexamprep.com pages; no new competitor entrant seen.

## Morning report review stage

`npm run morning` exits cleanly with "no admin credential." Neither
`ADMIN_READ_KEY` nor `ADMIN_KEY` is set on this environment, and no workflow
in the repo holds one, exactly as `docs/handoffs/Site-Assistant-Report-First.md`
predicts. This is the expected state, not a fault. The morning review could
not run today for want of `ADMIN_READ_KEY`.

## Worth Tanner's attention: the draft-PR backlog

Not a site finding, but the routine's own output is piling up unread. 18
pull requests are open on this repo right now, all but one still `draft`,
and the oldest (#579, "3 scraped SEO descriptions, standing P0 vanished
rather than fixed") has been open since 2026-09-07, 15 days. Most are this
same daily-audit routine from prior days, several carrying validated,
parse-back-diffed Matrixify sheets that are ready to import (collections
metadata, scraped-description fixes, brand-doubled titles) and just haven't
been looked at. The routine keeps producing correct, checked work; none of
it ships until a human reviews and imports it, and the pile is growing by
about one PR a day.

## What did not change

Nothing in this repo changed today: no new metadata row, no regression, no
fix. This run note is the only diff.
