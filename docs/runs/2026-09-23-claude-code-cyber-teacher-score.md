# 2026-09-23, Claude Code: teachers can type a score into an AP Cyber cell

Board #395. Asked for by Tanner after the 1.4 Exercise 1 grader bug (board #394):
the grader held every student at 22 of 24, and the only remedy the dashboard
offered was Reset and a re-sit, because "typing a score in by hand is not
available on this course". That sentence was true. The 2026-08-24 run note
named the gap exactly: AP Cyber grades through the `score_events` ledger, and
the only teacher score-write endpoint wrote to `attempts`.

## What changed

- **`scoring.js`**: a third reserved item, `TEACHER_ITEM = 'teacher-entered'`.
  When that row exists for a cell it REPLACES the activity: every other row is
  set aside, whatever the retry policy says. The change is inside the two
  shared SQL fragments (`namedItemFlagSql`, `keepItemSql`), whose flag now
  carries three states instead of two. All five readers of the ledger
  (`progress.score`, the canonical gradebook, the teacher dashboard payload,
  the CSV export, and the denominator proposal) inherit the rule without being
  edited. That is the payoff of board 270 importing the fragments rather than
  restating them.
- **`PUT /api/teacher/classes/:code/cells`** `{student_id, unit, lesson,
  activity_type, score}`, where `score: null` clears.
  - It checks that the teacher owns the class and the student is in it.
  - The price is the column's authored total, from `denominatorMap`, the same
    lookup the dashboard header uses. An unpriced column refuses, because a
    typed number has to be out of something.
  - There is at most one typed row per cell: re-entry deletes the old row first.
  - `progress.score` is recomputed in the same transaction.
  - Clearing after a Reset does not bring back the grade that was reset away.
- **Reset** (`PATCH .../progress/:id/unlock {reset:true}`) now also deletes the
  typed row. Otherwise the typed mark would snap back on the student's next
  submission, because it overrides their new work.
- **Student write paths refuse the reserved name.** `/api/student/score` and the
  code-grading route both take `item` from the client. Without the guard, a
  student could post `teacher-entered` and grade themselves. The mutation run
  proved that: with the guard removed, a student posted 24 of 24 and got it.
- **The teacher progress payload** carries `teacher_entered` per cell.
- **`shopify/cyber-dashboard.html`**:
  - A priced cell's popover gets a score box with Save. A typed cell gets a
    "typed" flag and a confirmed "Clear typed score" button.
  - Both actions re-read the server afterwards, the same pattern as Reset.
  - The "not available on this course" note now appears only on unpriced
    columns, where it is still true.

## Evidence

- `npm run smoke:teachercyberscore`: 38 assertions against a real server.
  - The typed mark wins over a better and a worse student run, under both a
    best-attempt and a first-attempt class.
  - The dashboard payload, `progress.score` and the canonical gradebook agree.
  - Re-entry replaces, Clear restores, and Reset removes the typed row.
  - Every refusal fires on its own.
- Mutation: each of the five guards broken on purpose turns the suite red on
  its own assertions (9, 2, 2, 6 and 2 failures).
- The full offline suite ran locally before the push.

## Open

- The dashboard sheet has to be imported before teachers see the Save button.
  The API side ships on merge.
- AP CSP runs on the same ledger, so the endpoint works for it too. No CSP
  dashboard offers the button yet.
- The student history lists a typed row as an event named `teacher-entered`.
  That was left visible on purpose, so a student can see a teacher set the mark.
