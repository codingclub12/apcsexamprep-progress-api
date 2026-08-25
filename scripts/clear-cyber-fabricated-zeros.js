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
//  Run: node scripts/clear-cyber-fabricated-zeros.js [--apply] [--cutoff ISO] [--scope v1|v2|all]
//  Dry run by default. It changes nothing without --apply.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const COURSE   = 'ap-cybersecurity';
const LESSON_SCORE_ITEM = require('../scoring').LESSON_SCORE_ITEM;

// ─────────────────────────────────────────────────────────────────────────────
//  SCOPE: WHICH COLUMNS THIS IS ALLOWED TO TOUCH.
//
//  Named sets, defined here in code, NOT taken from the caller. A request that
//  can name its own columns is a request that can clear any grade in the
//  course, and this runs behind an admin key that is full write everywhere. The
//  blast radius belongs in a diff someone can review, not in a request body.
//
//  v1, applied 2026-08-25T03:59Z, 170 rows. The nine columns whose pages showed
//  no score UI at all, so apcs-tracker.js posted `completed: true, score: 0` for
//  every student regardless of performance.
//
//  v2 exists because pricing those columns made the same latent bug ACTIVE on
//  three more. Until 2026-08-25 lesson 1.1 lab and lesson 1.2 exercise-1 and
//  exercise-2 had no authored denominator, so a fabricated zero sat in the
//  gradebook as a percent-only cell and was held OUT of the points total. Once
//  they were priced, that same cell became a counted 0 out of 24 (or 30) and
//  started dragging real grades down. The zeros were always wrong; pricing is
//  what made them cost something.
//
//  The signature is unmistakable on 1.1 lab: 93 pre-cutoff zeros against 5 real
//  scores. 1.2 exercise-1 and exercise-2 carry 118 and 91 pre-cutoff zeros
//  alongside 186 and 117 real ones, which is why the cutoff below does all the
//  work: it is the only thing separating a bug from a student who genuinely
//  scored nothing.
//
//  Lesson 1.3's exercise columns are deliberately absent from v2. They are in
//  v1 and were cleared in the first pass.
// ─────────────────────────────────────────────────────────────────────────────
const SCOPES = {
  v1: [
    ['1.3', 'exercise-1'], ['1.3', 'exercise-2'], ['1.3', 'lab'],
    ['1.4', 'exercise-1'], ['1.4', 'exercise-2'], ['1.4', 'lab'],
    ['1.5', 'exercise-1'], ['1.5', 'exercise-2'], ['1.5', 'lab'],
  ],
  v2: [
    ['1.1', 'lab'],
    ['1.2', 'exercise-1'], ['1.2', 'exercise-2'],
  ],
};
SCOPES.all = [...SCOPES.v1, ...SCOPES.v2];

// v1 stays the default so an unqualified call keeps doing exactly what it did.
const DEFAULT_SCOPE = 'v1';

function columnsFor(scope) {
  const key = scope || DEFAULT_SCOPE;
  const cols = SCOPES[key];
  if (!cols) throw new Error(`unknown scope "${key}"; known: ${Object.keys(SCOPES).join(', ')}`);
  return cols;
}

// Theme PR #68 finished propagating at 19:52Z on 2026-08-21, verified by
// sampling the deployed assets. Before that instant no real score could reach
// these nine columns from any path.
const DEFAULT_CUTOFF = '2026-08-21T19:52:00Z';

// (lesson, activity) pairs as an OR of equalities rather than two IN lists.
// Two IN lists are a cross product, which for v1 happened to be exactly the
// nine columns and for any other set would silently widen the scope.
function columnClause(cols, alias) {
  const a = alias ? alias + '.' : '';
  return '(' + cols.map(() => `(${a}lesson = ? AND ${a}activity_type = ?)`).join(' OR ') + ')';
}
function columnParams(cols) { return cols.flat(); }

function findFabricated(cutoff, cols) {
  const columns = cols || columnsFor(DEFAULT_SCOPE);
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
      AND ${columnClause(columns, 'se')}
      AND se.created_at < ?
    ORDER BY se.lesson, se.activity_type, se.created_at
  `).all(COURSE, LESSON_SCORE_ITEM, ...columnParams(columns), cutoff);
}

// Scores on the same nine columns recorded AFTER the cutoff. These can be real,
// so they are listed and never touched. Printing them is the point: a silent
// exclusion is how a cleanup turns into data loss.
function findProtected(cutoff, cols) {
  const columns = cols || columnsFor(DEFAULT_SCOPE);
  return db.prepare(`
    SELECT lesson, activity_type, COUNT(*) n, MIN(points) lo, MAX(points) hi
    FROM score_events
    WHERE course = ? AND item = ?
      AND ${columnClause(columns)}
      AND created_at >= ?
    GROUP BY lesson, activity_type
  `).all(COURSE, LESSON_SCORE_ITEM, ...columnParams(columns), cutoff);
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE OPERATION ITSELF, usable from the CLI and from the admin route.
//
//  ONE implementation, deliberately. A second copy of this UPDATE living in a
//  route handler is how the endpoint and the script drift, and a drifted regrade
//  is invisible until a teacher notices a wrong number weeks later.
//
//  Returns the full plan whether or not it wrote, so a dry run and a real run
//  report the same shape and the caller can show the operator exactly what was
//  or would be touched.
// ─────────────────────────────────────────────────────────────────────────────
function clearFabricatedZeros(opts) {
  const o = opts || {};
  const cutoff = o.cutoff || DEFAULT_CUTOFF;
  const apply = !!o.apply;
  const scope = o.scope || DEFAULT_SCOPE;
  const columns = columnsFor(scope);

  const rows = findFabricated(cutoff, columns);
  const protectedRows = findProtected(cutoff, columns);

  const byColumn = {};
  for (const r of rows) {
    const k = `${r.lesson}|${r.activity_type}`;
    byColumn[k] = (byColumn[k] || 0) + 1;
  }

  const todo = rows.filter((r) => r.progress_id && !r.score_reset_at);
  const plan = {
    cutoff,
    scope,
    columns: columns.map((c) => `${c[0]}|${c[1]}`),
    applied: false,
    found: rows.length,
    by_column: byColumn,
    already_reset: rows.filter((r) => r.score_reset_at).length,
    no_progress_row: rows.filter((r) => !r.progress_id).length,
    would_reset: todo.length,
    // Recorded after the cutoff, so possibly real. Reported, never touched: a
    // silent exclusion is how a cleanup turns into data loss.
    protected_after_cutoff: protectedRows.map((p) => ({
      lesson: p.lesson, activity_type: p.activity_type, rows: p.n, points_low: p.lo, points_high: p.hi,
    })),
    reset_at: null,
  };
  if (!apply) return plan;

  const now = new Date().toISOString();
  // Field for field the reset branch of the teacher unlock route.
  const stmt = db.prepare(`
    UPDATE progress SET locked = 0, completed = 0, score = NULL, attempts = 0,
      score_reset_at = ?, completed_at = NULL, updated_at = ? WHERE id = ?
  `);
  const run = db.transaction((list) => { for (const r of list) stmt.run(now, now, r.progress_id); });
  run(todo);

  plan.applied = true;
  plan.reset_at = now;
  return plan;
}

function main() {
  const apply  = process.argv.includes('--apply');
  const ci     = process.argv.indexOf('--cutoff');
  const cutoff = ci !== -1 && process.argv[ci + 1] ? process.argv[ci + 1] : DEFAULT_CUTOFF;
  const si     = process.argv.indexOf('--scope');
  const scope  = si !== -1 && process.argv[si + 1] ? process.argv[si + 1] : DEFAULT_SCOPE;

  const p = clearFabricatedZeros({ cutoff, apply, scope });

  console.log(`scope:  ${p.scope} (${p.columns.join(', ')})`);
  console.log(`cutoff: ${p.cutoff}`);
  console.log(`fabricated zeros found: ${p.found}\n`);

  for (const [k, n] of Object.entries(p.by_column).sort()) {
    console.log(`  ${k.padEnd(22)} ${n} student(s)`);
  }
  if (p.already_reset) console.log(`\n  ${p.already_reset} already carry a score_reset_at and will be skipped.`);
  if (p.no_progress_row) console.log(`  ${p.no_progress_row} have a ledger row but no progress row; nothing to reset.`);

  if (p.protected_after_cutoff.length) {
    console.log(`\nRecorded AFTER the cutoff, left untouched (these can be real grades):`);
    for (const x of p.protected_after_cutoff) {
      console.log(`  ${x.lesson}|${x.activity_type}  ${x.rows} row(s), points ${x.points_low} to ${x.points_high}`);
    }
  }

  if (!p.applied) {
    console.log(`\nDRY RUN. ${p.would_reset} progress row(s) would be reset. Re-run with --apply to write.`);
    return;
  }
  console.log(`\nAPPLIED. ${p.would_reset} progress row(s) reset at ${p.reset_at}.`);
  console.log('Nothing was deleted: the pre-reset ledger rows remain in score_events.');
}

if (require.main === module) main();
module.exports = { findFabricated, findProtected, clearFabricatedZeros, DEFAULT_CUTOFF,
  DEFAULT_SCOPE, SCOPES, columnsFor, COURSE };
