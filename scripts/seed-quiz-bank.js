'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  QUIZ BANK SEED — loads server-owned answer keys into quiz_bank.
//
//  Deliberately NOT run on boot (unlike seed-manifest.js). A fresh deploy must
//  stay empty so every page not yet migrated keeps its existing client-side quiz
//  flow, and so placeholder content never lands in production by accident. Run it
//  by hand once the authoritative keys are ready:
//
//      node scripts/seed-quiz-bank.js            insert-or-ignore (safe, additive)
//      node scripts/seed-quiz-bank.js --update   also overwrite existing qids
//
//  Idempotent. Without --update, existing qids are left untouched. With --update,
//  prompt/options/correct_index/explanation/points are refreshed in place; the
//  qid (and therefore any score_events already tied to it) is preserved.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

// Each source module exports { location, questions }. Add more as courses go live.
const SOURCES = [
  require('../seed/cyber-quiz-bank'),
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
const upsertConfig = db.prepare(`
  INSERT INTO quiz_config (course, unit, lesson, activity_type, serve_count)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(course, unit, lesson, activity_type)
    DO UPDATE SET serve_count = excluded.serve_count
`);

function seedQuizBank({ update: doUpdate = false } = {}) {
  let inserted = 0, updated = 0, total = 0;
  const run = db.transaction(() => {
    for (const src of SOURCES) {
      const { course, unit, lesson, activity_type } = src.location;
      // N-of-M config always reflects the source (safe to overwrite: it is
      // config, not per-student data, and holds no attempt history).
      upsertConfig.run(course, unit, lesson, activity_type, Number(src.location.serve_count) || 0);
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
  return { inserted, updated, total };
}

if (require.main === module) {
  const doUpdate = process.argv.includes('--update');
  const r = seedQuizBank({ update: doUpdate });
  console.log(`quiz_bank seed: ${r.inserted} inserted, ${r.updated} updated, ${r.total} source rows${doUpdate ? ' (--update)' : ''}`);
  process.exit(0);
}

module.exports = { seedQuizBank };
