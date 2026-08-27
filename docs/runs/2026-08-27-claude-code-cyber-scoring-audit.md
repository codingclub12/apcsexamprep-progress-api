# Cyber scoring audit: the tool, and what Unit 1 says

2026-08-27, Claude Code.

## Why a script and not a pass

Hand-auditing AP Cyber lesson 1.2 found three defects on that one page. There are
124 graded cyber pages, and the pages are being edited, so any hand audit is stale
before it is finished. `scripts/audit-cyber-scoring.js` is the same audit as a
thing that can be re-run after every batch of edits.

It reads the page as DELIVERED, which is exactly what the reporter's `autoOk`
decision is made against, so executing scripts would add nothing. It uses regex
rather than a DOM parser on purpose: a parser is a dependency, and this repo keeps
heavy dependencies out of the root tree so the Railway image stays small, the same
reason Playwright lives in `smoke/`. On repeated 429/503 it STOPS, per
docs/nightly-crawl-playbook.md, because pushing the storefront makes it serve
challenges to real students on shared school IPs.

## Unit 1, first run: 26 of 26 candidate handles reachable

```
P0 1   P1 1   P2 9   across 26 pages
```

### P0, and it is one page, not the course

`ap-cyber-unit-1-lesson-2`: the tracker reads `/ 10` while the page carries **9**
CFU blocks, `data-num` 2 through 10 with no `cfu-1`. Max achievable is 90 percent
and every grade on the page is scaled by 9/10.

The useful half of that finding is the scoping. Lessons 1.1, 1.3, 1.4 and 1.5 all
report `blocks=10 denom=10` and are correct. This is a single page that lost a
question and kept its denominator, not a systemic bug. The earlier assumption that
the hardcoded `/ 10` capped every cyber lesson was wrong.

### P1: an exercise that has never recorded a score for anyone

`ap-cyber-unit-1-lesson-1-exercise-2` renders its score into `#x2scn`
(`"0 / 15"`, inside a `#x2score` wrapper that gets `.show` on check). Neither id is
in `SCORE_IDS` in `assets/apcs-score-reporter.js`, so the reporter loads, finds
nothing it recognises, and reports nothing.

Lessons 2 through 5 all use the standard `finalScore` / `totalScore`. Lesson 1 is
the only page with the bespoke naming, and it is the only one silently dropping its
grade.

The fix is one entry in `SCORE_IDS`, which is precisely the remedy that file already
records applying for `labTotal`: "It was missing, so those three had no readable
score even once the writer below existed." Same defect, same shape, one lesson later.
That is a theme change and is not made here.

### P2: duplicate ids on four of five lesson pages

`#cfu-score-num` and `#cfu-score-tracker` each appear twice on lessons 1.1, 1.2, 1.4
and 1.5. Lesson 1.3 is clean. `getElementById` returns the first, and the page engine
and the reporter both read the same first one, so the grade is unaffected. What it
costs is the student's own display: they may be watching the copy that never updates.

## The full sweep: all five units, 131 pages

```
unit 1   26/26 reachable    P0 1   P1 1   P2 9
unit 2   17/21 reachable    P0 0   P1 0   P2 0
unit 3   31/31 reachable    P0 0   P1 0   P2 0
unit 4   26/26 reachable    P0 0   P1 3   P2 0
unit 5   31/31 reachable    P0 0   P1 18  P2 0
```

### Two page generations, and the split explains everything

The first run reported lesson 3.6 as having an unreadable denominator. That was a
FALSE POSITIVE in the audit, and correcting it produced the most useful finding of
the sweep.

`lessonPct()` prefers `window.cfuState` and only falls back to scraping the tracker
text. Two shells are live:

| shell | mechanism | risk |
|---|---|---|
| new | assigns `cfuState = {score, total, answered}` | total tracks the real question count |
| old | hardcodes `"score / N"` for the reporter to SCRAPE | N drifts the moment a question is added or cut |

Unit 3 is fully migrated: all six lessons read `src=cfuState` and the unit is clean.
Unit 1 is mixed: 1.1, 1.3 and 1.5 are on `cfuState`; **1.2 and 1.4 are still scraped**.

That reframes the P0. Lesson 1.2 is not an isolated typo, it is the old shell doing
exactly what the old shell does: it lost a question and its hardcoded denominator
stayed at 10. **Lesson 1.4 is the same shell and currently correct, which makes it a
trap rather than a bug** - change its question count and it breaks silently and
identically. Migrating both to the `cfuState` shell fixes one and disarms the other,
and the target pattern already exists in this course.

### Unit 5: 18 graded pages that cannot report a score

Every `exercise-1`, `exercise-2` and `lab` across all six lessons. Verified on
`ap-cyber-unit-5-lesson-1-exercise-1`: it renders `correct + ' / ' + total` into
`#u5l1ex1-score`, loads `apcs-score-reporter.js`, and sets no `cfuState`.

The ids are **namespaced per page** (`u5l1ex1-...`), so this cannot be fixed by adding
a constant to `SCORE_IDS` the way `labTotal` was. Either the reporter learns a
pattern (a guarded fallback over `[id*="score"]`, which its existing visibility,
`0 / 0` and out-of-range guards make defensible), or the pages adopt the standard
ids. That is a decision, not a patch, and it is not made here.

### Unit 1 lesson 1: one bespoke id

`ap-cyber-unit-1-lesson-1-exercise-2` renders into `#x2scn` (`"0 / 15"`). Lessons 2
to 5 all use the standard `finalScore` / `totalScore`. One page, one id, and the
same shape as the `labTotal` gap that file already records fixing.

### Unit 4: three labs, NOT yet classified

`lesson-1-lab`, `lesson-4-lab`, `lesson-5-lab` carry no id the reporter knows. They
do have scoring machinery (`check-btn`, `correct`, `pts`) but no aggregate readout
was located, and no `textContent` write to a score-bearing element matched. So it is
not yet established whether these labs produce a total at all. Recorded as open
rather than reported as broken.

### Unit 2: clean, and 4 handles absent

17 of 21. The four missing are the `ap-cyber-unit-2-lesson-N` lesson pages: unit 2's
lesson landings exist only under the named family (`ap-cybersecurity-unit-2-<slug>`),
which this audit does not yet generate.

## What this run does NOT cover

- **Named lesson landings.** Handles come from the `COURSES` config, so the audit
  visits `ap-cyber-unit-1-lesson-2` but never
  `ap-cybersecurity-unit-1-password-attacks`. Both are wired and both write the same
  `(unit, lesson, activity)` row, so nothing double counts, but unit 2 shows the cost:
  a whole unit's lesson pages went unaudited.
- **Whether a widget is completable.** The audit proves `blockDone()` is reachable for
  every block. It cannot prove the widget works.
- **The three unit 4 labs** above.
