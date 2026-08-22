'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CLEAR THE FABRICATED ZEROS ON CYBER 1.3, 1.4 AND 1.5
//
//  WHAT WENT WRONG
//  Until theme PR #64 deployed on 2026-08-21, apcs-tracker.js decided a non-quiz
//  activity was complete and then asked activityScorePct for its score. On nine
//  Unit 1 pages that function found neither `#score-display` nor any
//  `.answered-correct`, and returned Math.round(0 / total * 100) rather than
//  null. The tracker posted `completed: true, score: 0`. A student who scored
//  full marks was stored as a zero, and it counts against the class average.
//
//  The pages are 1.3, 1.4 and 1.5, each of exercise-1, exercise-2 and lab.
//  Every detail here is evidenced in
//  docs/runs/2026-08-21-claude-code-cyber-tracker-sweep.md.
//
//  WHY A CORRECTED PAGE CANNOT FIX THIS ITSELF
//  After #64 those pages post no score at all, and after theme PR #68 they post
//  a real one. Neither overwrites the old zero, because the zero is already the
//  grade of record and nothing re-posts on the student's behalf. It has to be
//  cleared deliberately.
//
//  WHY score_reset_at AND NOT JUST score = NULL
//  POST /api/student/progress does not only cache the percent on progress.score.
//  It also appends a row to the score_events ledger under the reserved item name
//  'lesson-score'. progress.score is a DERIVED cache recomputed from that ledger
//  on every write, so nulling the cache alone is undone the moment the student
//  submits again. Stamping score_reset_at excludes everything logged at or
//  before that moment, which is exactly what the teacher unlock route does and
//  why it does it.
//
//  NOTHING IS DELETED. The pre-reset ledger rows stay in score_events and still
//  show in GET /api/student/history, marked pre-reset.
//
//  THE SEMANTICS ARE COPIED, NOT INVENTED
//  The UPDATE below is field for field the one in the reset branch of
//  PATCH /api/teacher/classes/:code/progress/:progressId/unlock. Student grade
//  data is the wrong place to invent a novel variant: that route is the tested
//  path (smoke:gradereset), its comment explains why each column is set, and a
//  reset there grants exactly one clean retry, which is what these students
//  need now that the pages grade correctly.
//
//  THE CUTOFF IS THE WHOLE SAFETY ARGUMENT
//  A zero recorded BEFORE the fix cannot be a real grade: on these pages that
//  code path returned 0 for every student regardless of performance. A zero
//  recorded AFTER it can be real, because the score reporter now reads the
//  page's own number and a student can genuinely score 0 of 24. So this only
//  ever touches ledger rows created before the cutoff, and prints any later
//  ones it is deliberately leaving alone.
//
//  Run: node scripts/clear-cyber-fabricated-zeros.js [--apply] [--cutoff ISO]
//  Dry run by default. It changes nothing without --apply.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const COURSE   = 'ap-cybersecurity';
const LESSONS  = ['1.3', '1.4', '1.5'];
const ACTS     = ['exercise-1', 'exercise-2', 'lab'];
const LESSON_SCORE_ITEM = require('../scoring').LESSON_SCORE_ITEM;

// Theme PR #68 finished propagating at 19:52Z on 2026-08-21, verified by
// sampling the deployed assets. Before that instant no real score could reach
// these nine columns from any path.
const DEFAULT_CUTOFF = '2026-08-21T19:52:00Z';

function placeholders(n) { return new Array(n).fill('?').join(','); }

function findFabricated(cutoff) {
  return db.prepare(`
    SELECT se.student_id, se.class_id, se.course, se.unit, se.lesson,
           se.activity_type, se.points, se.created_at,
           p.id AS progress_id, p.score AS progress_score,
           p.completed, p.score_reset_at
    FROM score_events se
    LEFT JOIN progress p
      ON p.student_id = se.student_id AND p.course = se.course
     AND p.unit = se.unit AND p.lesson = se.lesson
     AND p.activity_type = se.activity_type
    WHERE se.course = ?
      AND se.item = ?
      AND se.points = 0
      AND se.lesson IN (${placeholders(LESSONS.length)})
      AND se.activity_type IN (${placeholders(ACTS.length)})
      AND se.created_at < ?
    ORDER BY se.lesson, se.activity_type, se.created_at
  `).all(COURSE, LESSON_SCORE_ITEM, ...LESSONS, ...ACTS, cutoff);
}

// Scores on the same nine columns recorded AFTER the cutoff. These can be real,
// so they are listed and never touched. Printing them is the point: a silent
// exclusion is how a cleanup turns into data loss.
function findProtected(cutoff) {
  return db.prepare(`
    SELECT lesson, activity_type, COUNT(*) n, MIN(points) lo, MAX(points) hi
    FROM score_events
    WHERE course = ? AND item = ?
      AND lesson IN (${placeholders(LESSONS.length)})
      AND activity_type IN (${placeholders(ACTS.length)})
      AND created_at >= ?
    GROUP BY lesson, activity_type
  `).all(COURSE, LESSON_SCORE_ITEM, ...LESSONS, ...ACTS, cutoff);
}

function main() {
  const apply  = process.argv.includes('--apply');
  const ci     = process.argv.indexOf('--cutoff');
  const cutoff = ci !== -1 && process.argv[ci + 1] ? process.argv[ci + 1] : DEFAULT_CUTOFF;

  const rows = findFabricated(cutoff);
  const prot = findProtected(cutoff);

  console.log(`cutoff: ${cutoff}`);
  console.log(`fabricated zeros found: ${rows.length}\n`);

  if (rows.length) {
    const byCol = new Map();
    for (const r of rows) {
      const k = `${r.lesson}|${r.activity_type}`;
      byCol.set(k, (byCol.get(k) || 0) + 1);
    }
    for (const [k, n] of Array.from(byCol).sort()) console.log(`  ${k.padEnd(22)} ${n} student(s)`);

    const already = rows.filter((r) => r.score_reset_at).length;
    const noRow   = rows.filter((r) => !r.progress_id).length;
    if (already) console.log(`\n  ${already} already carry a score_reset_at and will be skipped.`);
    if (noRow)   console.log(`  ${noRow} have a ledger row but no progress row; nothing to reset.`);
  }

  if (prot.length) {
    console.log(`\nRecorded AFTER the cutoff, left untouched (these can be real grades):`);
    for (const p of prot) {
      console.log(`  ${p.lesson}|${p.activity_type}  ${p.n} row(s), points ${p.lo} to ${p.hi}`);
    }
  }

  const todo = rows.filter((r) => r.progress_id && !r.score_reset_at);
  if (!apply) {
    console.log(`\nDRY RUN. ${todo.length} progress row(s) would be reset. Re-run with --apply to write.`);
    return;
  }

  const now = new Date().toISOString();
  // Field for field the reset branch of the teacher unlock route.
  const stmt = db.prepare(`
    UPDATE progress SET locked = 0, completed = 0, score = NULL, attempts = 0,
      score_reset_at = ?, completed_at = NULL, updated_at = ? WHERE id = ?
  `);
  const run = db.transaction((list) => { for (const r of list) stmt.run(now, now, r.progress_id); });
  run(todo);
  console.log(`\nAPPLIED. ${todo.length} progress row(s) reset at ${now}.`);
  console.log('Nothing was deleted: the pre-reset ledger rows remain in score_events.');
}

if (require.main === module) main();
module.exports = { findFabricated, findProtected, DEFAULT_CUTOFF };
