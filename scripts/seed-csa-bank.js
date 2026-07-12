'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA BANK SEED — loads the server-owned CSA quiz answer key and the CSA
//  per-lesson denominators for the ap-csa reporter (System B, the
//  score_events -> progress.score path used by POST /api/student/score).
//
//  Unlike scripts/seed-quiz-bank.js, this DOES run on boot (insert-or-ignore),
//  because the answer key must be present the moment the reporter goes live or
//  every quiz choice post would fail to score. Insert-or-ignore never overwrites,
//  so a row corrected directly in production SQLite survives restarts until an
//  explicit --update:
//
//      node scripts/seed-csa-bank.js            insert-or-ignore (safe, additive)
//      node scripts/seed-csa-bank.js --update   also overwrite existing rows
//
//  Idempotent. Author content only; zero student PII.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const answerSrc = require('../data/csa-answer-bank');
const manifestSrc = require('../data/csa-course-manifest');

const insAnswer = db.prepare(
  'INSERT OR IGNORE INTO quiz_answer_bank (course, lesson, item, answer) VALUES (?, ?, ?, ?)'
);
const updAnswer = db.prepare(`
  INSERT INTO quiz_answer_bank (course, lesson, item, answer) VALUES (?, ?, ?, ?)
  ON CONFLICT(course, lesson, item) DO UPDATE SET answer = excluded.answer
`);
const insDenom = db.prepare(
  'INSERT OR IGNORE INTO course_denominators (course, unit, lesson, activity_type, possible) VALUES (?, ?, ?, ?, ?)'
);
const updDenom = db.prepare(`
  INSERT INTO course_denominators (course, unit, lesson, activity_type, possible) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(course, lesson, activity_type) DO UPDATE SET unit = excluded.unit, possible = excluded.possible
`);

function seedCsaBank({ update = false } = {}) {
  const answerStmt = update ? updAnswer : insAnswer;
  const denomStmt = update ? updDenom : insDenom;
  let answers = 0, answerRows = 0, denoms = 0, denomRows = 0;

  db.transaction(() => {
    for (const [lesson, items] of Object.entries(answerSrc.bank)) {
      for (const [item, letter] of Object.entries(items)) {
        answerRows++;
        const l = String(letter).trim().toUpperCase();
        if (!/^[A-Z]$/.test(l)) throw new Error(`Bad answer letter for ${lesson} ${item}: ${letter}`);
        answers += answerStmt.run(answerSrc.course, lesson, item, l).changes;
      }
    }
    for (const row of manifestSrc.manifest) {
      for (const [activity_type, possible] of Object.entries(row.denominators)) {
        denomRows++;
        const p = Number(possible);
        if (!Number.isFinite(p) || p <= 0) throw new Error(`Bad denominator for ${row.lesson} ${activity_type}: ${possible}`);
        denoms += denomStmt.run(row.course, row.unit, row.lesson, activity_type, p).changes;
      }
    }
  })();

  return { answers, answerRows, denoms, denomRows, mode: update ? 'update' : 'ignore' };
}

if (require.main === module) {
  const r = seedCsaBank({ update: process.argv.includes('--update') });
  console.log(
    `csa bank seed: ${r.answers} of ${r.answerRows} answer rows, ` +
    `${r.denoms} of ${r.denomRows} denominator rows written (mode: ${r.mode})`
  );
  process.exit(0);
}

module.exports = { seedCsaBank };
