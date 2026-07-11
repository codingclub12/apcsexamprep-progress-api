# Roadmap Gap Report (progress-api)

Audit of this repository against the 6-phase APCSExamPrep Full Build Roadmap.
Verdicts cover this repo's responsibilities only; theme/Shopify work is flagged
as out-of-scope where it applies. Snapshot taken 2026-07-10.

## Summary

The reporting and gradebook plumbing is built and solid: attempts, score_events,
the manifest as the single denominator authority, a single-pass gradebook, and
retry/mastery recomputed at read time. The roadmap's highest-priority item,
Phase 2 ("the server scores, the browser never holds the key"), is not yet
implemented: every scoring endpoint today trusts a client-computed score.
Phases 4, 5, and 6 are essentially unstarted on the API side.

Two concrete guardrail items surfaced by this audit are addressed in the same
change that adds this report (see "Addressed in this change" below).

## Phase 1: Cyber purchaser delivery

Verdict: not this repo (theme/Shopify). The only interface here is the reporter
string contract. utils.js defines Cyber Unit 3 as lessons 3.1 to 3.5 with
generic labels, so the CED re-sequencing is page content, not API. Keep
pageFromHandle in step once handles change.

## Phase 2: Server-side scoring / no exposed answer keys

Verdict: NOT DONE. This is the biggest gap.

Every graded path accepts a client-supplied score or correct flag; the server
never holds an answer key and never grades:

- POST /api/student/quiz takes score from the body (routes/student.js).
- POST /api/student/score takes correct / points from the body (routes/progress.js).
- POST /api/progress/attempt takes score from the body (routes/progress.js).
- The reporter infers correctness by reading the page's own DOM grading result
  (fb-correct / fb-incorrect classes in shopify/apcs-reporter.js), which means
  the key still lives in page source / client JS. That is the exposure the
  roadmap calls the single most important technical fix.

Missing entirely: a questions table with a server-only correct column, server
scoring, and the order_token shuffle-to-qid mapping. This phase is blocked on
Phase 5 (the question bank is where keys live), which is why the roadmap pairs
them.

## Phase 3: Gradebook MVP

Verdict: mostly done (API side), with items noted below.

Done and good:

- GET /api/admin/class/:id/gradebook is a single window-function pass, no N+1,
  manifest denominators, passed recomputed at read time against the current
  threshold/retry. Matches the single aggregate SQL pass constraint.
- Retroactive settings: threshold/retry changes re-evaluate at read time with no
  migration.
- Roster: rename, reset-PIN, retry override, quiz unlock.
- Teacher ownership is fail-closed: all /api/teacher/* routes use requireTeacher
  JWT plus a teacher_id ownership check, so a class code alone cannot write.

Gaps:

- Hard-delete of students (ADDRESSED in this change; see below).
- Denominator inconsistency: CSV export and /classes/:code/progress compute
  totals from the COURSES config in utils.js, not the manifest, while the
  gradebook and admin views use the manifest. These can disagree, which is the
  exact failure mode the manifest was introduced to prevent.
- Threshold clamp is 0 to 100 in the teacher routes, versus the spec's 50 to 100
  clamp.
- The tabbed UI (Overview / By Unit / By Lesson / By Student / By Assignment /
  Settings / CSV) is theme-repo work.

## Phase 4: Teacher Command Center

Verdict: not started (API side). None of the primitives exist:

- No entitlements table, no POST /api/teacher/entitlement, no Shopify order
  webhook, so no "owns Unit N" flag.
- No "Continue Teaching" (furthest-complete lesson) endpoint.
- No "N need help" endpoint (students below threshold on the most recent
  activity), though the data to compute it exists in score_events / attempts.

## Phase 5: Question bank + randomization

Verdict: not started. No questions table (qid, course, unit, lesson, ek,
difficulty, type, stem, options, correct, explanation, pool), no N-of-M pool
selection, no server-side order/option shuffle, no order_token, no cyber-JSON
seed. This is the structural prerequisite that makes the Phase 2 fix possible.

## Phase 6: Analytics

Verdict: not started. No per-lesson or per-question analytics endpoints
(completion rate, average score, average time, abandonment, retry rate, per
question percent missed). The raw material is already captured: attempts.detail
holds per-question {q, sel, ok}, duration_seconds is a real column, and
score_events is append-only, so this is mostly reads over existing tables once
the phases above populate them.

## Cross-cutting findings

1. JWT_SECRET default (ADDRESSED in this change; see below).
2. Hard-delete guardrail violation (ADDRESSED in this change; see below).
3. Leaderboard isolation holds: game_scores never touches a gradebook table,
   matching the roadmap's leaderboard note.

## Addressed in this change

- Student hard-delete to deactivate. DELETE /api/teacher/classes/:code/students/:studentId
  no longer removes the row (which cascaded away the student's progress,
  attempts, and quiz history). It now sets active = 0. Attempt history is
  gradebook data and always survives, per the roadmap and CLAUDE.md. A new
  students.active column (additive migration, default 1) backs this;
  PATCH .../students/:studentId now also accepts { active } to reactivate;
  deactivated students are blocked from login; and active is surfaced in the
  roster and gradebook reads so the frontend can mark rather than hide them.
- JWT_SECRET fail-closed. utils.js now refuses to boot in production
  (NODE_ENV=production) when JWT_SECRET is unset or equals the dev default, and
  warns in dev. Without a real secret, student (180-day) and teacher tokens are
  forgeable, which would undercut the Phase 2 trust posture. Set JWT_SECRET in
  the Railway environment before merging to main.

## Suggested next action

The roadmap's own sequencing makes Phase 2 the top technical priority, but it is
blocked on Phase 5 (keys need a questions table to live in). The highest-leverage
real work is Phase 5 and Phase 2 together: stand up the question bank with a
server-only correct column, then flip the scoring endpoints to grade server-side
and strip keys from pages.
