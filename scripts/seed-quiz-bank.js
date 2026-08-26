'use strict';
// -----------------------------------------------------------------------------
//  QUIZ BANK SEED - loads server-owned question banks into quiz_bank.
//
//  RUNS ON BOOT IN UPDATE MODE as of 2026-08-26 (server.js, runBootSeed
//  'quiz_bank'). Two earlier positions were both wrong, and it is worth saying
//  why so neither comes back:
//
//    1. Excluded from boot entirely. The stated reasons were that a fresh deploy
//       must stay empty and that placeholder content must never land by accident.
//       The placeholder was deleted, and seeding does not migrate a page: a page
//       uses server scoring only if its body carries a data-apcs-quiz container,
//       so these rows are inert until one does.
//
//    2. On boot, but insert-or-ignore. That is the right posture for a table
//       where the database is the authority and the seed is only a floor, which
//       is true of course_manifest and the CSA bank. It is NOT true here. This
//       file IS the authority for quiz_bank: the rows are authored content,
//       reviewed in a pull request, and nothing else writes them. Insert-or-
//       ignore meant an approved wording fix deployed green and changed nothing
//       live, which is the exact shape of bug this codebase keeps paying for.
//
//  So a deploy now CONVERGES quiz_bank onto this file. Editing a stem here and
//  merging is the whole procedure; no shell against production, no --update flag
//  to remember.
//
//  WHY THAT CANNOT DISTURB A SAVED GRADEBOOK
//  qid is the primary key and is never rewritten, only matched on, so score_events
//  rows keep resolving to their question. And a grade is frozen at submission:
//  routes/quiz.js persists points and max_points per submission, so re-pricing a
//  question cannot regrade a sitting that already happened. smoke/denominator-
//  safety.js pins that property.
//
//  RETIREMENT, NOT DELETION
//  A qid dropped from this file is set active = 0 for its location, never deleted.
//  It stops being served (routes/quiz.js filters active = 1) while the row stays
//  behind so any score_events tied to it still resolve. Only locations this file
//  owns are touched, so a bank seeded from somewhere else is never in scope.
//
//  Still runnable by hand, though a deploy already does it:
//
//      node scripts/seed-quiz-bank.js            converge (same as boot)
//      node scripts/seed-quiz-bank.js --no-update  insert-only, leave existing rows
//
//  Idempotent either way.
// -----------------------------------------------------------------------------
const db = require('../db');

// Each source module exports { location, questions }; a module that owns more
// than one location exports an array of them, spread in here.
const SOURCES = [
  ...require('../seed/cyber-unit-1-quizzes'),
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO quiz_bank
    (qid, course, unit, lesson, activity_type, q_order, prompt, options, correct_index, explanation, points, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`);
const update = db.prepare(`
  UPDATE quiz_bank SET
    course = ?, unit = ?, lesson = ?, activity_type = ?, q_order = ?,
    prompt = ?, options = ?, correct_index = ?, explanation = ?, points = ?, active = 1
  WHERE qid = ?
`);
// Retire a question that this file no longer carries: active = 0, never DELETE,
// so score_events tied to the qid still resolve. Scoped to one location, and the
// NOT IN list is built per call because better-sqlite3 has no array binding.
function retireStmtFor(n) {
  const holes = new Array(n).fill('?').join(', ');
  return db.prepare(`
    UPDATE quiz_bank SET active = 0
    WHERE course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      AND active = 1
      ${n ? `AND qid NOT IN (${holes})` : ''}
  `);
}
const retireCache = new Map();

const upsertConfig = db.prepare(`
  INSERT INTO quiz_config (course, unit, lesson, activity_type, serve_count)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(course, unit, lesson, activity_type)
    DO UPDATE SET serve_count = excluded.serve_count
`);

function seedQuizBank({ update: doUpdate = true } = {}) {
  let inserted = 0, updated = 0, retired = 0, total = 0;
  const run = db.transaction(() => {
    for (const src of SOURCES) {
      const { course, unit, lesson, activity_type } = src.location;
      // N-of-M config always reflects the source (safe to overwrite: it is
      // config, not per-student data, and holds no attempt history).
      upsertConfig.run(course, unit, lesson, activity_type, Number(src.location.serve_count) || 0);
      // Anything this location used to serve but no longer lists stops being served.
      // A source that lists NOTHING is treated as an authoring mistake rather than
      // an instruction to unpublish the whole quiz, because the blast radius of
      // guessing wrong is a class sitting down to an empty page. Retiring an entire
      // location is deliberate work: empty the location's row from SOURCES instead.
      const liveQids = src.questions.map(q => q.qid);
      if (!liveQids.length) {
        throw new Error(`${course}/${unit}/${lesson}/${activity_type} lists no questions; refusing to retire the whole location`);
      }
      if (!retireCache.has(liveQids.length)) retireCache.set(liveQids.length, retireStmtFor(liveQids.length));
      retired += retireCache.get(liveQids.length)
        .run(course, unit, lesson, activity_type, ...liveQids).changes;
      src.questions.forEach((q, i) => {
        total++;
        if (typeof q.correct_index !== 'number' || !Array.isArray(q.options) || q.correct_index < 0 || q.correct_index >= q.options.length) {
          throw new Error(`Bad correct_index for ${q.qid}: must index into options`);
        }
        const optsJson = JSON.stringify(q.options);
        const points = q.points != null ? Number(q.points) : 1;
        const info = insert.run(q.qid, course, unit, lesson, activity_type, i,
          q.prompt, optsJson, q.correct_index, q.explanation || null, points);
        if (info.changes > 0) {
          inserted++;
        } else if (doUpdate) {
          update.run(course, unit, lesson, activity_type, i,
            q.prompt, optsJson, q.correct_index, q.explanation || null, points, q.qid);
          updated++;
        }
      });
    }
  });
  run();
  return { inserted, updated, retired, total };
}

if (require.main === module) {
  const doUpdate = !process.argv.includes('--no-update');
  const r = seedQuizBank({ update: doUpdate });
  console.log(`quiz_bank seed: ${r.inserted} inserted, ${r.updated} updated, ${r.retired} retired, ${r.total} source rows${doUpdate ? '' : ' (--no-update)'}`);
  process.exit(0);
}

module.exports = { seedQuizBank };
