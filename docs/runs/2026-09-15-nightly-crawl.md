# 2026-09-15 nightly crawl

Shard 7/7, 400 URLs, 677 requests, 15m32s, no abort, no throttling. Coverage:
sitemap advertises 2,111 URLs; hot set plus this shard's slice covered 400 of
400, all 200s.

## Is anything on fire

Same fire as the last four nights, still not fixed: the AP Cyber Unit 1
Lesson 1 lab's Check button and score display are still invisible. No new
fire tonight.

## New tonight

Nothing that is actually new. Two items surfaced by the crawler as fresh
findings turned out to be either a repeat of a known checker bug or new
instances of an already-tracked pattern, not new defects:

**`api-stale-deploy`, P1, checked and it is the same false alarm as last
night, from this container's own git state, not production.** Tonight's
crawl reported production serving `ee911ea` while local `origin/main` read
`1e896d0`. Reproduced independently: `git fetch origin main` fast-forwarded
local `origin/main` straight to `ee911ea`, and `git merge-base --is-ancestor
ee911ea origin/main` confirms `ee911ea` is exactly the current tip. Production
is caught up. The cause is unchanged from last night's note: `deployLag` in
`scripts/site-crawl.js` (around lines 315-336) compares against whatever
`origin/main` the session's local clone already has cached and never fetches
first, so any night where the crawl container's clone lags real GitHub main
past the grace window produces this same false alarm regardless of whether a
real deploy problem exists. Fix is still: have `deployLag` run `git fetch
origin main --quiet` before `git rev-parse origin/main`, or hit the GitHub
API's actual main sha directly instead of trusting the local clone. Filed
here, not the board, because this job reads and does not fix, and no board
task for this checker bug exists yet.

**`brand-doubled`, 2 pages tonight, both new instances of the same one-line
template bug, not two separate bugs.** `/pages/ap-csp-game-bridge-the-divide`
("Bridge the Divide | AP CSP Big Idea 5 Game | APCSExamPrep.com |
APCSExamPrep.com") and `/pages/ap-cybersecurity-complete-course-guide`
("AP Cybersecurity Course Guide | All 5 Units Live | APCSExamPrep.com |
APCSExamPrep.com") both render the store name twice in the title, same
pattern as `/pages/ap-csp-game-robot-director` reported last night. All three
look like a title template appending "| APCSExamPrep.com" on top of a
Shopify default title that already ends the same way. P2, low blast radius,
not verified further per playbook (P2 is counts and worst examples, not
individual checks).

**`meta-scraped`, 6 new instances tonight, same known root cause as the 4
course hub pages, no new pattern.** `ap-csa-lesson-2-4-nested-if-statements`,
`ap-csa-lesson-2-5-compound-boolean-expressions`, `ap-csa-lesson-4-16-recursion`,
`ap-csp-course-bi1-unit-test`, `ap-csp-course-bi5-summary-quiz`, and
`ap-cybersecurity-unit-2-physical-vulnerabilities` all carry breadcrumb-style
text as their meta description, same as the course hubs. These read as new
only because tonight's shard (7/7) covers different URLs than last night's
(6/7); the underlying defect is the same one the course hubs have carried for
11+ nights, just found on more pages as shard rotation covers more of the
site.

Everything else the crawler marked "fresh" (114 `h1-duplicate`, 21
`h1-is-title`, 23 `title-overlong`) is the identical shard-rotation effect:
new URLs seen for the first time carrying the same long-standing,
already-tracked page-template defects (#72/#247), not new regressions.

## Still open

**P0, night 4: AP Cyber Unit 1 Lesson 1 Lab's Check button and score display
are still invisible.** First caught as a regression on 2026-09-12 (night 1),
persisting on 09-13 and 09-14, and again tonight. Reproduced live just now, independent of the crawler: fetched
`/pages/ap-cyber-unit-1-lesson-1-lab` directly and confirmed `--purple` and
`--dark` are still declared nowhere on the page, while `#cyber-lab-11
.check-btn` and `.score-bar .score-num` still read
`background:var(--purple)!important;color:#ffffff!important` and
`.rubric-table th` still reads `var(--dark)!important`, all invalid at
computed-value time so the whole declaration drops and the text is white on
whatever background inherits through. No open board task tracks the
regression itself, only the three closed-but-unverified items behind it
(#202, #203, #264), same as every prior night. Board #313, opened since the
last note, is a related but distinct bug on the same page family (lab pages
posting a percent over 100 to the progress API) and does not touch this CSS
issue. Fix is unchanged: reinsert the ten-property palette block onto
`#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html` and re-import
via Matrixify. Who it hurts: any student attempting the 1.1 lab.
autofix-scan: not eligible.

**`stale-year`, P1, 252 findings tonight, oldest at 12 nights, still no board
task.** All 252 are persisting (0 fresh tonight), meaning this shard recrawled
the same set of URLs the prior baseline already had and every one still
reads the same way. Unchanged mechanism from prior nights:
`staleSchoolYears()` in `lib/site-crawl.js` flags any "20XX-20YY" pair with no
awareness of whether it names a school year or the CED curriculum label. Prior
nights already ran the repo's smarter classifier (`school-year-rollover.js`'s
`rollString`) against a sample and found a real mix of genuine staleness and
correctly-protected curriculum references; I did not re-run that sample
tonight since nothing in the finding set changed from last night's spot
check. Not reporting as new. Whoever picks this up should classify per page
before rolling anything, not roll on sight.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now
5+ nights.** Refetched directly: still exactly 10,109 bytes, still the
deliberate `meta http-equiv="refresh"` redirect to the same Google Drive
folder. `page()`'s `looksReal()` marker refuses this URL because the page has
no themed Shopify.theme marker, which is expected for a bare redirect stub,
not a sign of a challenge response; raw() confirms no challenge markers
either. Not a defect.

**#72/#247, H1 duplication, unchanged.** 365 pages with two H1s and 33 with
the raw SEO title rendered as an H1 tonight, same `page.liquid` root cause.
Checked the board: both #72 and #247 still read `status=done verified=NO`.
Not reporting as new.

**`meta-scraped` course hub pages, now 12 nights on all four CSA unit hubs**
(`unit-1-course` through `unit-4-course`; `unit-4-course` is new to this
finding as of this shard, same root cause), plus `unit-3-practice-exam-part-2`
at 11 nights. No board task found.

**`title-overlong`, 43 pages tonight**, same CSP daily-practice-template and
product-page pattern as recent nights, count creeping up slightly (41, then
29, then 32, now 43) as more of the site gets shard coverage.

## Resolved since last night

None. Tonight's shard (7/7) crawled a different 400 URLs than last night's
(6/7); the hot set recrawled the P0 and P1 URLs from before and both are
still broken, so nothing legitimately closes.

## Coverage

Shard 7/7, 400 of 2,111 sitemap URLs, 677 requests, no rate-limit abort, no
wall-clock truncation (15m32s of a 25 minute budget). autofix-scan: 0 of 712
findings scored eligible; top blocking reason `h1-duplicate` (365x), then
`stale-year` (252x). Same as every prior night: none of tonight's finding
kinds are on the scorer's allow list.
