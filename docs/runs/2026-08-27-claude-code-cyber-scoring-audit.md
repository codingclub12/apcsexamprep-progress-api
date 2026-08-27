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

## What this run does NOT cover

- **Named lesson landings.** The audit derives handles from the `COURSES` config, so
  it visits `ap-cyber-unit-1-lesson-2`. The named landing
  `ap-cybersecurity-unit-1-password-attacks` is a second handle for the same lesson
  and is not generated. Both are wired by `quiz-tracker-wiring.liquid` and both write
  the same `(unit, lesson, activity)` row, so the grade is not double counted, but the
  audit should discover them rather than skip them.
- **Whether a student can complete every widget.** The audit proves `blockDone()` is
  reachable for every block in Unit 1. It cannot prove the widget works.
- **Units 2 to 5.** `--unit 2` and up are one flag away and unrun.
