# Cyber 1.2 Exercise 1 and 2 record a fabricated 0

Date: 2026-08-21
Agent: Claude Code (progress-api)
Ledger: task 102, claim 9. Related: task 83.
Trigger: a teacher reported that students had completed Exercise 1 and Exercise 2
in AP Cybersecurity 1.2 "Suspicious Website Logins" and it was not showing in the
gradebook.

## What is actually happening

It is not missing. It is a zero that no student earned, which is worse: nothing
downstream can distinguish it from a real zero, and it drags the class average.

The two pages are `ap-cyber-unit-1-lesson-2-exercise-1` and
`ap-cyber-unit-1-lesson-2-exercise-2`. Both grade themselves correctly, out of 24
and 30. Neither tells anyone.

1. Neither page contains a `fetch`, an `XMLHttpRequest`, or a `sendBeacon`. Only
   1.1 Exercise 1 was ever retrofitted with the reporter in
   `docs/exercise-reporter-contract.md`.
2. The theme grade reporter resolves an activity for `lesson` and `exam` handles
   only. An `-exercise-N` handle falls through all three matchers and returns.
3. `apcs-tracker.js` IS wired here. The theme wiring matches
   `ap-cyber-unit-{U}-lesson-{L}-(exercise-1|exercise-2|lab|quiz)` and sets
   `window.APCS_PAGE`, so `trackActivityCompletion` runs, takes the GRADED path
   (the pages render `.check-btn`), and marks the activity complete when every
   check button is spent.
4. It then calls `activityScorePct`, which reads `#score-display` and falls back
   to counting `.answered-correct`. These pages have neither: they use
   `#totalScore` / `#finalScore` and `.feedback.correct`. So `correct` is 0 and
   the function returns `Math.round(0 / 3 * 100)`, which is `0`.
5. The tracker posts `completed: true, score: 0`. As ingest source C
   (`progress.score`) with no `attempts` or `score_events` row above it, that
   becomes the grade of record.

A student who scored 22 of 24 is stored as a 0.

## Evidence

- Live page bodies pulled from Shopify Admin (pages 132213702871, 132214161623).
  `fetch(`, `XMLHttpRequest`, `sendBeacon`, `api/student/score`,
  `api/student/progress`: **0 occurrences each, both pages**.
- `check-btn` present on both; `score-display` and `answered-correct` absent from
  both.
- Control, per this repo's own rule that a detector must be shown to be
  distinguishing: `ap-cyber-unit-1-lesson-1-exercise-1` (page 131898998999)
  returns `fetch(` 1 and `api/student/score` 1, and its `apcseReportScore`
  function is present in full. The same scan therefore separates a reporting page
  from a non-reporting one.
  (An earlier control attempt used `-lesson-1-exercise-2`, which turns out to
  have no reporter either. It is not a valid control and was discarded.)
- Rendered storefront HTML for `/pages/ap-cyber-unit-1-lesson-2-exercise-1`
  (HTTP 200) confirms the wiring snippet sets `APCS_PAGE` for this handle and
  that the grade reporter's matchers do not.
- The live deployed asset
  `cdn/shop/t/7/assets/apcs-tracker.js?v=108709354192309220521787172661` was
  fetched and read directly, not trusted from the repo mirror. Minified, its
  `activityScorePct` is logically identical to the mirror:
  `...var correct=document.querySelectorAll(".answered-correct").length;return total?Math.round(correct/total*100):null`.

Not verified: the students' actual stored rows. This session holds only
`COMMAND_READ_TOKEN` and `TODO_KEY`, neither of which reads a gradebook. The
mechanism is proven from live code; the specific rows are inferred from it.

## Denominators, now measured

Both totals are settled, by reading each page's grading code rather than its
prose. Three agreeing signals each.

| column | badge | score bar | grading code | value |
|---|---|---|---|---|
| `1.2/exercise-1` | `3 Parts . 24 pts` | `/ 24 pts` | `maxPts` 12 + 6 + 6 | 24 |
| `1.2/exercise-2` | `3 Clients . 30 pts` | `/ 30 pts` | 3 clients x (2 + 2 + 6) | 30 |

They are written into `scripts/seed-cyber-denominators.js` **commented out**.
That script is boot-seeded from `server.js`, so uncommenting deploys them.
Pricing a column that cannot report is the one thing
`docs/cyber-denominator-gaps.md` tells us not to do: it would turn a percent-only
0 into a confident `0 / 24` and grow `items_total`, making pace worse too.
Uncomment both lines in the same pass that ships a reporter, never before.

## What changed in this repo

Nothing that affects behaviour. This pass is diagnosis and institutional memory.

- `docs/cyber-denominator-gaps.md`: the two 1.2 columns move from "value unknown,
  not resolvable by reading the page" to settled, with the method that settled
  them, plus a new section on the fabricated zero.
- `scripts/seed-cyber-denominators.js`: the two values recorded, commented, with
  the evidence and the sequencing rule inline.
- This note.

## What is still open, and where it lives

Both fixes are in the theme repo. Neither belongs here, and neither was made.

**1. The two page bodies need a reporter (Matrixify, chat-side pipeline).**
Ships as a Body HTML update. Follows `docs/exercise-reporter-contract.md` and the
shape already live on 1.1 Exercise 1. Call it from `updateTotals()` at the point
the page already treats the exercise as finished, `done === 3`:

```js
// Exercise 1: total is out of 24. Exercise 2: out of 30, activity_type exercise-2.
function apcseReportScore(earned, possible){
  try {
    if (earned == null || possible == null || !(possible > 0)) return;  // never half a pair
    var t = null;
    try {
      t = localStorage.getItem('apcse_token')
       || localStorage.getItem('apcs_student_token')
       || localStorage.getItem('student_token');
    } catch (e) { return; }
    if (!t) return;                        // signed out: nothing to report
    fetch('https://progress.apcsexamprep.com/api/student/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
      body: JSON.stringify({
        course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.2',
        activity_type: 'exercise-1', item: 'parts',
        earned: Number(earned), possible: Number(possible),
        client_event_id: '1.2:exercise-1:parts:' + earned + ':' + possible
      })
    }).then(function(r){
      if (!r.ok) { r.json().then(function(e){ console.warn('[apcse] not scored:', e && e.error); }); }
    }).catch(function(){ /* offline: the student must never notice */ });
  } catch (e) { /* reporting must never break the exercise */ }
}
```

Zero-PII note: both pages grade free-text boxes by keyword matching. Only the
`earned` / `possible` pair is sent. No typed text leaves the page, and none is
stored. That keeps the single named sandbox exception the only one.

**2. `activityScorePct` in `assets/apcs-tracker.js` guesses 0. Fix it centrally.**
This is the real defect and the reason the incident looks like missing data. When
the function finds neither `#score-display` nor any `.answered-correct`, it
cannot tell "the student scored zero" from "this page does not expose a score in
either shape I know", and it currently answers with the one that destroys grades.
It should return `null` in that case, which `markComplete` already handles: it
omits `score` from the body and posts completion alone. Done, ungraded is the
truthful state, and the gradebook contract already renders it as such.

Blast radius is not just 1.2: it is every graded page whose score UI is neither
`#score-display` nor `.answered-correct`. That set has not been enumerated. Doing
so is the natural next step, and it is the concrete incident behind ledger task
83, "score reporter depends on scraping rendered text - fragile denominator".

Sequence: fix the scraper first (it stops new fabricated zeroes across the whole
course), then the two reporters, then uncomment the two denominators. Existing
`score: 0` rows for these columns will need clearing, since a corrected page
cannot overwrite what it never wrote.
