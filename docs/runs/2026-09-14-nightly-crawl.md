# 2026-09-14 nightly crawl

Shard 6/7, 400 URLs, 675 requests, 16m46s, no abort, no throttling. Coverage:
sitemap advertises 2,107 URLs; hot set (course hubs, reporter-bearing pages,
prior P0/P1 URLs) plus this shard's slice covered 400 of 400, all 200s.

## Is anything on fire

Same fire as the last two nights, still not fixed. Nothing new that blocks a
student tonight.

## New tonight

**P1, `api-stale-deploy`, checked and it is a false alarm from this session's
own git state, not a production problem.** The crawl reported production
serving `71cbe15` while its local `origin/main` read `1e896d0`, a 60.85 hour
gap. Reproduced independently: `git fetch origin main` just now fast-forwarded
local `origin/main` from `1e896d0` straight to `71cbe15`, the exact commit
production is running. `71cbe15` (PR #668, merged 2026-09-13 23:25:57-05:00)
IS current main tip. `.github/workflows/deploy-drift.yml`, the check this
one's own comment names as the better implementation, ran at 06:30 UTC today
against head `71cbe15` and reported success. So production is caught up;
nothing is stale.

The cause is in the check itself, `scripts/site-crawl.js:315-336`
(`deployLag`). It runs `git rev-parse origin/main` against whatever the
session's local clone already has cached, and never fetches first. This
container's clone had `origin/main` frozen at `1e896d0` (a shallow fetch from
around 2026-09-11, well before tonight's session), so the check compared
production against a two-day-stale local ref instead of GitHub's actual main.
Any night where the crawl container's clone lags real GitHub main by more
than the 30 minute grace window will produce this same false alarm, whether
or not a real deploy problem exists. What I would do: have `deployLag` run
`git fetch origin main --quiet` (or equivalent) before `git rev-parse
origin/main`, or drop the local-git approach and hit `api_commit` against the
GitHub API's actual main sha directly. Filed here rather than the board
because the crawl reads, it does not fix.

autofix-scan: not eligible, `api-stale-deploy` is not on the allow list, and
would not belong there regardless since the fix is in the checker, not the
site.

## Still open

**P0, night 3: AP Cyber Unit 1 Lesson 1 Lab still has invisible Check buttons
and score display.** Reproduced live again just now, independent of the
crawler: fetched `/pages/ap-cyber-unit-1-lesson-1-lab` directly and confirmed
`--purple` and `--dark` are declared nowhere among the page's ~110 custom
properties, while `#cyber-lab-11 .check-btn`, `.score-bar .score-num`, and
`.rubric-table th` all still read `background:var(--purple)!important` or
`var(--dark)!important` with white text. Same regression documented on
2026-09-12 and 2026-09-13: board #202/#203 fixed this once, #264's
server-render migration (PR #595) silently dropped the fix, and nothing has
re-landed it. No open board task tracks the regression itself, only the three
closed-but-unverified items behind it (#202, #203, #264). Fix is unchanged
from the last two nights: reinsert the ten-property palette block onto
`#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html` and re-import
via Matrixify. Who it hurts: any student attempting the 1.1 lab, same as
before, autofix-scan: not eligible.

**`stale-year`, P1, up to 252 findings tonight, some URLs open 11 nights, no
board task.** Same mechanical cause as every prior night:
`staleSchoolYears()` in `lib/site-crawl.js` flags any consecutive "20XX-20YY"
in title, meta, or H1 with no awareness of whether it names a school year or
the CED curriculum version, by design (its own comment says so). Past nights
spot-checked one page and generalized; tonight I ran the repo's own smarter
classifier, `scripts/school-year-rollover.js`'s `rollString`, against the
actual title+meta+H1 text of 5 sampled pages instead of one, and the result
does not cleanly split "blog pages are false positives, product pages are
real" the way prior notes implied. 3 of 5 rolled as genuine staleness
(`ap-cyber... /blogs/ap-csp-daily-practice/algorithms-efficiency`,
`/products/products`, `/products/ap-csp-big-idea-1-flashcards`, all should
read 2026-2027). 2 of 5 were correctly refused by the classifier as protected
curriculum references (`/products/ap-csa-flashcards-unit-1`: "for the
2025-2026 exam"; `/products/ap-csa-flashcards-complete-bundle`: "aligned to
the 2025-2026 curriculum"). Those two happen to be the exact two pages
2026-09-13's note named as "the oldest, most actionable": they are not
safe to roll as written, they need a human read of whether "the 2025-2026
exam" there means the specific 2025-26 sitting (stale) or the CED redesign
label CLAUDE.md says AP CSA must keep referencing (correct as is). I did not
run the classifier against all 252; this is a sample, not a verification of
the set. What is not in question: this P1 has now recurred, unverified, for
11+ nights on some URLs with no board task anywhere. Whoever picks this up
should run `rollString` per-page before touching anything, not roll on sight.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`,
night 4.** Refetched directly: still 10,109 bytes, still the deliberate
`meta http-equiv="refresh"` redirect to the same Google Drive folder, not a
challenge response. Byte-identical to the last 3 nights. Not a defect.

**#72 / #247, H1 duplication, unchanged.** Tonight's shard found 368 pages
with two H1s and 29 with the raw SEO title rendered as an H1, same
`page.liquid` root cause #72 identified on 2026-08-05. Both #72 and #247
still read status done, verified NO when checked against the board just now.
Not reporting as new.

**`meta-scraped`, 13 pages tonight, oldest at 11 nights, not previously named
by count.** All three CSA unit-course hub pages
(`ap-csa-unit-1-course`/`unit-2-course`/`unit-3-course`) carry breadcrumb text
("AP CSA > Course > Unit 1...") as their meta description and have every
night since this check started tracking them, 11 nights, because course hubs
are in the nightly hot set. Distinct from #77 (missing description outright).
No board task found.

**`title-overlong`, 32 pages tonight**, same pattern as recent nights (41,
then 29), mostly CSP daily-practice template and product pages.

**`brand-doubled`, 1 page, new tonight.**
`/pages/ap-csp-game-robot-director` renders the store name twice:
"Robot Director | AP CSP Big Idea 3 Game | APCSExamPrep.com | APCSExamPrep.com".
P2, single instance, not verified individually per playbook, noted since it
is a new kind for this page.

## Resolved since last night

None. Tonight's shard (6/7) crawled a different 400 URLs than last night's
(5/7); the hot set recrawled last night's P0 and P1 URLs and both are still
broken, so nothing legitimately closes.

## Coverage

Shard 6/7, 400 of 2,107 sitemap URLs, 675 requests, no rate-limit abort, no
wall-clock truncation (16m46s of a 25 minute budget). autofix-scan: 0 of 701
findings scored eligible; top blocking reason `h1-duplicate` (368x), then
`stale-year` (252x). Same as every prior night: none of tonight's finding
kinds are on the scorer's allow list.

## One process note, not a site finding

The working tree on this log branch carries a `CLAUDE.md` frozen well before
the claim-guard hook, the TODO_KEY-on-environment decision, and the corrected
theme deploy guidance existed; it still tells a reader to run the fast-forward
push (`git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk`)
that the current `main` CLAUDE.md explicitly warns is backwards and would
rewind the live theme by dozens of commits. Expected, since this branch never
merges with `main` and this job's own rule is commit nothing here but the
state file and this note, so it is left as is. Worth a human noting it in case
anyone ever reads CLAUDE.md while checked out on this branch instead of main.
