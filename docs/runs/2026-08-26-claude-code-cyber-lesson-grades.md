# Cyber lesson grades were saved and then thrown away at render

2026-08-26, Claude Code, branch `claude/gradebook-grades-not-saving-7hoi2b`.

## The report

A founding-cohort AP Cybersecurity teacher wrote in: her students' grades were
not showing up in the gradebook, she had confirmed the students were logged in,
and "the site doesn't seem to save progress for anyone, including me".

## The saving was never broken

That is worth stating plainly, because the report points at the write path and
the write path is fine. Checked in this order, each against the live system
rather than against a claim:

- `progress.apcsexamprep.com` resolves, is healthy, and answers `/api/health`.
- CORS preflight from `https://apcsexamprep.com` on `POST /api/student/progress`
  returns 204 with the origin echoed. The apex 301s to `www`, consistently, so
  the `localStorage` origin that holds `apcse_token` does not split.
- The live Shopify asset (not the GitHub copy) is current: `apcs-tracker.js`
  served from the CDN defines `APCS_saveLessonScore` and points at
  `progress.apcsexamprep.com`, not the blocked `*.up.railway.app` name.
- The wiring is present on every graded cyber page. `ap-cyber-unit-1-lesson-1-lab`
  and both Unit 1 exercise pages set `APCS_PAGE`, load the tracker AND
  `apcs-score-reporter.js`, and render a readable `finalScore` / `totalScore`.
- End to end against the disposable class `CYBER-Q9JG`: a student joined, posted
  a visit, posted a lesson score of 80, and read it back as `score=80`. The row
  is stored.

So the browser posts, the API accepts, and SQLite keeps it.

## What actually broke

`lib/gradebook-contract.js` decides what counts as graded work:

```js
function isGradedActivity(canonical) { return canonical !== 'lesson'; }
```

A lesson is a page visit, not graded work. That is true on CSA and CSP, where a
lesson page is reading and the graded items sit beside it as `cfu`, `quiz` and
`exercise` rows.

It is false on cyber. There the lesson page IS the graded activity: the live
`ap-cybersecurity-unit-1-password-attacks` body carries 13 CFU blocks, a
"Score X / 10" tracker and an injected "Submit for a grade" button, and
`apcs-grade-reporter` posts the resulting percent as `activity_type: 'lesson'`.

The contract's ungraded branch blanked it. Same student, same stored row, two
teacher views disagreeing:

```
GET /api/teacher/classes/:code/progress   ->  lesson 1.2  {"score": 80, ...}
GET /api/teacher/classes/:code/gradebook  ->  unit-1/1.2/lesson  {"pct": null, "status": "done"}
```

For a cyber class, where the lesson pages are the bulk of the graded work, that
is a gradebook with the grades missing. "It is not saving" is the only
reasonable thing for a teacher to conclude from the outside.

## The fix

One branch in the normalizer, which is where course-specific shape belongs per
`docs/gradebook-contract.md`. A lesson row that carries an actual score now
surfaces that score as `pct`. Everything else about it is unchanged:

- `earned` and `possible` stay null. A lesson percent has no denominator anyone
  can point at on a page, and pricing it out of a provisional 100 is the exact
  mistake SOURCE C in the same file already documents: it changes no percentage
  and destroys the weighting.
- It contributes nothing to `earned` / `graded`, so no existing grade moves. The
  `overall` object in the repro is byte-identical before and after.
- A lesson with NO score is untouched: still `status: 'done'`, still `pct: null`.
  That is every CSA and CSP lesson visit.

`smoke/gradebook-agreement.js` had an assertion that pinned the divergence
rather than catching it: it asserted the contract reports `pct == null` for a
lesson three lines after asserting the teacher route reports `20` for the same
cell. Its stated intent is "the lesson has no POINTS", so the points half is
kept and the percent half now asserts the two views AGREE.

## Evidence

- `smoke/cyber-lesson-score.js`, new, 20 assertions. Reverting the one-branch fix
  fails 4 of them, so it catches the actual defect rather than describing it.
- 21 gradebook and export suites re-run green, 0 failures: gradebook-agreement
  (26), gradebook-contract (42), admin-gradebook (58), admin-gradebook-page (21),
  student-teacher-agreement (21), ungraded-fallout (15), denominator-lesson-score
  (21), unit-denominators (14), cyber-denominators (56), csp-denominators (23),
  legacy-points (26), score-sources (19), attempt-rollup (15), admin-cyber-zeros
  (20), teacher-export (12), canvas-export (101), schoology-export (19),
  my-progress-page (25), quiz-grade-visibility (18), teacher-grade-reset (44),
  encoding-guard (13).

## Still open

- **A decision, not a bug: should a cyber lesson CFU score carry POINTS?** Right
  now it shows as a percent and weighs nothing, so a cyber overall grade is
  computed from exercises and labs alone. On a course where the lesson pages are
  most of the graded work, that is arguably the wrong weighting. Authoring a
  denominator per cyber lesson would price them properly and needs a real number
  per page, not a guess. This is Tanner's call and it is deliberately not made
  here.
- The live API is behind `main`. `/api/health` reported commit `597a224` while
  `origin/main` was 17 commits ahead. This fix is not live until that deploy runs.
- One disposable student, `ZZ-SMOKE 1787763647065`, was created on `CYBER-Q9JG`
  for the end to end check. `npm run smoke:cleanup` sweeps the `ZZ-SMOKE` prefix;
  it needs `SMOKE_TEACHER_EMAIL` / `SMOKE_TEACHER_PASSWORD`, which this session
  did not have.
- Task #83 (score reporter scrapes rendered text) is untouched and still
  bleeding. Related, but a different defect: it makes a reported denominator
  wrong, where this made a stored grade invisible. Worth noting that on the live
  1.2 page `window.cfuState` is never assigned by the page engine, so
  `lessonPct()` always falls through to the text scrape.
