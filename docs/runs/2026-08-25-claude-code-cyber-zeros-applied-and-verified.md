# The fabricated Cyber zeros: applied, and what verifying it turned up

Date: 2026-08-25
Agent: Claude Code
Repo: apcsexamprep-progress-api
Depends on: #313 (the endpoints), #314 (the plan)

## What ran

`POST /api/admin/cyber-zeros/clear` with `{confirm: true}`, at
**2026-08-25T03:59:06.058Z**. The dry run was read first.

**170 rows reset**, not nine. Nine is the number of COLUMNS, and several earlier
notes in this repo (including my own) said "nine fabricated zeros", which was
wrong by an order of magnitude. The dry run is the only reason that was caught
before writing.

| lesson | exercise-1 | exercise-2 | lab |
|---|---|---|---|
| 1.3 | 57 | 49 | 2 |
| 1.4 | 26 | 16 | 13 |
| 1.5 | 5 | 1 | 1 |

All 170 had progress rows, none were already reset, and 71 post-cutoff rows in
the same columns were reported and left alone.

## The near miss, which is the reason this note exists

`score_reset_at` excludes every score event at or before that instant for the
row. The cleanup stamped `now()`, which was 2026-08-25T03:59Z, four days AFTER
theme PR #68 made those pages grade correctly.

So any student who had BOTH an old fabricated zero AND a real score earned in
that four day window would have had the real score excluded too. The cleanup's
`protected_after_cutoff` list does not catch this: it reports post-cutoff LEDGER
rows, and says nothing about whether the same cell also carries a pre-cutoff zero
that puts its progress row in the reset set.

**Two students were in exactly that state.** Both were checked cell by cell in
the teacher gradebook afterward and both are intact: 24/24 rendering 100 percent,
and 20/24 rendering 83.3 percent.

They survived because `score_reset_at` is read by `routes/student.js` and by
nothing in `lib/gradebook-contract.js` or `lib/admin-gradebook.js`. The teacher
gradebook never consults it. That is luck rather than design, and it cuts the
other way too: the reset stamp is NOT what makes a cleared cell render blank to a
teacher. The cleared `progress` row is.

**If this script is ever run again, stamp the cutoff, not `now()`.** Setting
`score_reset_at` to the theme-fix instant excludes exactly the fabricated zeros
and preserves everything earned after. For 168 of the 170 rows the two are
identical; for the other 2 they are not, and next time the gradebook may not be
so forgiving.

## Verification, against production

**The cleanup did what it claimed.** Across the four worst hit classes:
451 blank cells, 12 real scores preserved, 3 remaining scored zeros. All three of
those were traced event by event and are LEGITIMATE post-fix zeros, students who
genuinely scored 0 on a retry after the pages were fixed. Nothing fabricated
survived and nothing real was lost.

**The write path carries live traffic.** 400 cyber score events since the theme
fix, 293 of them with points above zero, newest at 03:09Z that morning.

**All nine redo pages are wired.** Each returns 200, loads
`apcs-score-reporter.js` and `apcs-tracker.js`, sets `window.APCS_PAGE`, and
carries a score element.

One looked broken and is not: `ap-cyber-unit-1-lesson-5-exercise-1` has
`id="finalScore"` and no `totalScore`. Its markup is
`<span id="finalScore">0</span> / 24 pts`, so the span alone parses to null, and
`readScore` falls back to the parent's text and reads `18 / 24 pts` correctly.
The results panel is `display:none` until graded, so the placeholder never fires.

**The grade formula is `earned / graded`, and that keeps being misremembered.**
Checked live across four classes: `pct` equals `round(earned/graded, 1)` for
every student with attempted work, and unattempted students carry `pct: null`,
35 of 35 in one CSA class. A student at 20/20 on attempted work reads 100
percent. Under `earned / possible` the same student reads 1.2 percent, because
CSA totals 1666 points. Anyone proposing to "fix" the grade to be over total
possible is proposing to make every student look like they are failing.

## Left open

- **3 of the 170** could not be audited individually. Class-scoped
  `score-events` queries reached 167; the rest are most likely students in
  classes reporting zero active students.
- **23 students had ONLY phantom grades.** Their gradebooks now show dashes
  rather than zeros. Accurate, and it reads as an empty gradebook, so teachers
  should be told before they notice.
- **Pre-2026-08-21 work on those nine activities is gone**, not hidden. The 170
  activities are unlocked for one clean retry; students redo, they do not
  recover.
- **`integrity.unmapped_activities: ['debug']` on ap-csa.** The `debug` activity
  is seeded as a denominator on all 53 lessons, is mapped by nothing in
  `canonicalActivity`, and no page reports it. Harmless today, a column the
  contract does not understand tomorrow.
- **`GET /api/admin/score-events` caps at 2000 rows with no offset**, which is
  why the first pass at this audit silently saw only 102 of 170. A capped query
  with no pagination looks exactly like a complete answer. Worth a cursor.
