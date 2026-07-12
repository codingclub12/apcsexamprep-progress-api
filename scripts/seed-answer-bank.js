'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ANSWER BANK SEED — loads server-owned correct answers into answer_bank.
//
//  Loads data/csp-answer-bank-FULL.json (294 records, one per gradable MCQ item):
//
//      { "course":"ap-csp", "unit":"bi-1", "lesson":"collaboration",
//        "activity_type":"quiz", "item":"q1", "correct":"B",
//        "rationale":"Correct. Diverse perspectives ..." }
//
//  Deliberately NOT run on boot (like seed-quiz-bank.js). A fresh deploy must
//  stay empty so every quiz/exam not yet seeded keeps its existing flow, and so
//  placeholder keys never land in production by accident. Run it by hand once the
//  authoritative keys are in place:
//
//      node scripts/seed-answer-bank.js            insert-or-ignore (safe, additive)
//      node scripts/seed-answer-bank.js --update   also overwrite existing items
//
//  Idempotent. Without --update, existing (course, unit, lesson, item) rows are
//  left untouched. With --update, correct/rationale/activity_type are refreshed in
//  place; the key row is preserved so any score_events already tied to the item
//  keep lining up.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('../db');

const DATA_FILE = path.join(__dirname, '..', 'data', 'csp-answer-bank-FULL.json');
const VALID_LETTERS = new Set(['A', 'B', 'C', 'D']);
const VALID_ACTIVITIES = new Set(['quiz', 'exam']);

const insert = db.prepare(`
  INSERT OR IGNORE INTO answer_bank (course, unit, lesson, activity_type, item, correct, rationale)
  VALUES (@course, @unit, @lesson, @activity_type, @item, @correct, @rationale)
`);
const update = db.prepare(`
  UPDATE answer_bank SET
    activity_type = @activity_type, correct = @correct, rationale = @rationale
  WHERE course = @course AND unit = @unit AND lesson = @lesson AND item = @item
`);

function seedAnswerBank({ update: doUpdate = false } = {}) {
  if (!fs.existsSync(DATA_FILE)) {
    return { missing: true, file: DATA_FILE, inserted: 0, updated: 0, total: 0 };
  }
  const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(records)) throw new Error('answer bank data must be a JSON array');

  let inserted = 0, updated = 0, total = 0;
  db.transaction(() => {
    for (const r of records) {
      total++;
      const correct = String(r.correct || '').trim().toUpperCase();
      if (!r.course || !r.unit || !r.lesson || !r.item) {
        throw new Error(`answer bank row missing a key field: ${JSON.stringify(r)}`);
      }
      if (!VALID_ACTIVITIES.has(r.activity_type)) {
        throw new Error(`answer bank item ${r.unit}/${r.lesson}/${r.item}: activity_type must be quiz or exam, got ${r.activity_type}`);
      }
      if (!VALID_LETTERS.has(correct)) {
        throw new Error(`answer bank item ${r.unit}/${r.lesson}/${r.item}: correct must be A-D, got ${JSON.stringify(r.correct)}`);
      }
      const row = {
        course: r.course, unit: r.unit, lesson: r.lesson,
        activity_type: r.activity_type, item: r.item,
        correct, rationale: r.rationale || null,
      };
      const info = insert.run(row);
      if (info.changes > 0) inserted++;
      else if (doUpdate) { update.run(row); updated++; }
    }
  })();

  return { missing: false, inserted, updated, total };
}

if (require.main === module) {
  const r = seedAnswerBank({ update: process.argv.includes('--update') });
  if (r.missing) {
    console.log(`answer_bank seed: data file not found at ${r.file}. Nothing seeded. Drop csp-answer-bank-FULL.json into data/ and re-run.`);
  } else {
    console.log(`answer_bank seed: ${r.inserted} inserted, ${r.updated} updated, ${r.total} source records${process.argv.includes('--update') ? ' (--update)' : ''}`);
  }
  process.exit(0);
}

module.exports = { seedAnswerBank };
