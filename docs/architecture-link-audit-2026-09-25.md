# Architecture link audit, 2026-09-25

Board 372. Measured, not estimated: `npm run verify:architecture` read all 153
parents that have members claiming them and asked whether each one actually links
them. The raw result is beside this file as
`architecture-link-audit-2026-09-25.json`, so nothing here has to be taken on
trust.

Findings decay. Re-run the command rather than quoting this file.

## What it measured

| | |
|---|---|
| parents read | 153 |
| link every member | 36 |
| PARTIAL | 36 |
| TOTAL | 81 |
| distinct members missed | 432 |
| linked by another hub | 188 |
| **linked by no hub read** | **244** |

### The serious 244, by course

| course | pages |
|---|---|
| ap-csp | 167 |
| ap-cyber | 51 |
| ap-csa | 16 |
| intro-java | 10 |

### Top PARTIAL: one hub edit rescues several pages

| missed | of | hub |
|---|---|---|
| 28 | 31 | `ap-cyber-unit-5-lesson-1` |
| 18 | 20 | `ap-csp-bi1-testing` |
| 18 | 20 | `ap-csp-topic-5-1-exercise-1` |
| 16 | 18 | `ap-csp-bi2-data-cleaning` |
| 15 | 16 | `ap-csp-bi4-internet` |
| 7 | 26 | `ap-cyber-unit-4-lesson-1` |
| 7 | 12 | `ap-cybersecurity-unit-2-cia-triad` |
| 7 | 8 | `ap-csa-2d-arrays` |
| 6 | 35 | `ap-cyber-unit-3-lesson-1` |
| 3 | 4 | `ap-csa-unit-1-course` |
| 2 | 4 | `ap-csa-lesson-4-13-implementing-2d-array-algorithms` |
| 2 | 4 | `ap-csa-lesson-4-14-searching-algorithms` |
| 2 | 4 | `ap-csa-lesson-4-15-sorting-algorithms` |
| 2 | 4 | `ap-csa-lesson-4-17-recursive-searching-and-sorting` |
| 2 | 4 | `ap-csa-lesson-4-6-using-text-files` |

### Top TOTAL: read the hub before generating anything

| members | hub | every member from another family |
|---|---|---|
| 41 | `ap-csp-topic-3-1-code` | no |
| 5 | `ap-cybersecurity-practice-questions` | no |
| 4 | `ap-csa-lesson-2-1-algorithms-selection-repetition` | no |
| 4 | `ap-csa-lesson-2-10-implementing-string-algorithms` | no |
| 4 | `ap-csa-lesson-2-11-nested-iteration` | no |
| 4 | `ap-csa-lesson-2-12-informal-run-time-analysis` | no |
| 4 | `ap-csa-lesson-2-2-boolean-expressions` | no |
| 4 | `ap-csa-lesson-2-3-if-statements` | no |
| 4 | `ap-csa-lesson-2-4-nested-if-statements` | no |
| 4 | `ap-csa-lesson-2-5-compound-boolean-expressions` | no |
| 4 | `ap-csa-lesson-2-6-comparing-boolean-expressions` | no |
| 4 | `ap-csa-lesson-2-7-while-loops` | no |

## The correction this audit needed before it was worth anything

The first run reported **432 member pages not linked** and stopped there. That
number alone is badly misleading, and one hand check showed why.

`ap-csa-lesson-2-3-if-statements` really does not link its own `-debug`,
`-exercise-1`, `-exercise-2` or `-frq` pages. Its stored body carries only four
outbound page links: the exam prep hub, the course, the unit hub, and the previous
lesson. But `ap-csa-unit-2-course` links all four activities.

So those pages are REACHABLE. What is missing is a link from their own lesson
page, which is a navigation gap and not an orphan. 81 of the 81 TOTAL rows are
that shape: CSA lesson pages across Units 2, 3 and 4 that are dead ends for their
own activities.

Every miss is therefore asked a second question, at no extra fetch, because the
answer is already in the 153 bodies: is this member linked by ANY hub read here,
or by none? 188 of the 432 turn out to be reachable from a different hub. The
remaining **244** are the ones worth anybody's time.

## The limit, stated rather than buried

"Linked by no hub" means no hub **among the 153 read here**. An ordinary page
could still link it. Only the full crawl in `scripts/link-graph.js` settles that,
and this is deliberately the cheap approximation: 153 fetches and three minutes
against 2,063 fetches and 42 minutes.

Two further limits worth knowing:

- It reads the STORED body from `/pages/<handle>.json`, never the rendered page.
  A rendered hub carries about 135 mega-menu anchors and appears to link most of
  the site. A session in this repo made exactly that mistake on 2026-09-10.
- A parent is only as good as the taxonomy that assigned it, and two defects in
  that assignment were found by this run rather than by reading the code. They
  are filed separately and the TOTAL rows are where they show up.

## What to do with it

**The 36 PARTIAL rows first.** These are hubs that link most of their members and
miss a few, which is the hub-down fix `docs/internal-linking.md` argues for: one
page edit rescues several pages. `ap-cyber-unit-5-lesson-1` missing 28 of 31 is
the largest single win in the list.

**Read the TOTAL rows before generating anything from them.** A hub that owns 41
pages and links none of them is usually not their hub. `ap-csp-topic-3-1-code`
with 41 members, every one from another family, is a taxonomy defect rather than
41 missing links.

**CSP is where the pages are.** 167 of the serious 244. That sits alongside board
216, `/pages/ap-csp` serving a completely empty body.
