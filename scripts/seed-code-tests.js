'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CODE TEST BANK SEED — loads hidden test cases into code_test_cases.
//
//  Deliberately NOT run on boot (same posture as scripts/seed-quiz-bank.js). A
//  fresh deploy stays empty so no page is graded against placeholder cases by
//  accident, and every code editor not yet backed by a test bank keeps its
//  existing client behavior (the grade route 404s where no cases exist). Run it by
//  hand once the authoritative cases are ready:
//
//      node scripts/seed-code-tests.js            insert-or-ignore (safe, additive)
//      node scripts/seed-code-tests.js --update   also overwrite existing cases
//
//  Integrity guard: every item must have at least three cases and at least one
//  hidden, so a hardcoded println of the visible expected output cannot pass.
//  Idempotent. Author content only; zero student PII.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

// Each source module exports { items: [ { course, lesson, item, cases } ] }.
const SOURCES = [
  require('../seed/csa-code-tests'),
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, expected_stdout, hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const update = db.prepare(`
  INSERT INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, expected_stdout, hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(course, lesson, item, seq) DO UPDATE SET
    prelude = excluded.prelude, postlude = excluded.postlude,
    stdin = excluded.stdin, expected_stdout = excluded.expected_stdout, hidden = excluded.hidden
`);

function seedCodeTests({ update: doUpdate = false } = {}) {
  const stmt = doUpdate ? update : insert;
  let written = 0, cases = 0, items = 0;

  const run = db.transaction(() => {
    for (const src of SOURCES) {
      for (const it of src.items) {
        if (!it.course || !it.lesson || !it.item || !Array.isArray(it.cases)) {
          throw new Error(`Bad code-test item: ${JSON.stringify(it && it.item)}`);
        }
        if (it.cases.length < 3) {
          throw new Error(`${it.course} ${it.lesson} ${it.item}: needs at least 3 test cases, has ${it.cases.length}`);
        }
        if (!it.cases.some((c) => c.hidden)) {
          throw new Error(`${it.course} ${it.lesson} ${it.item}: needs at least one hidden case so a hardcoded output cannot pass`);
        }
        items++;
        it.cases.forEach((c, i) => {
          if (typeof c.expected_stdout !== 'string') {
            throw new Error(`${it.course} ${it.lesson} ${it.item} case ${i}: expected_stdout must be a string`);
          }
          cases++;
          written += stmt.run(
            it.course, it.lesson, it.item, i,
            String(c.prelude || ''), String(c.postlude || ''),
            String(c.stdin || ''), c.expected_stdout, c.hidden ? 1 : 0
          ).changes;
        });
      }
    }
  });
  run();
  return { written, cases, items, mode: doUpdate ? 'update' : 'ignore' };
}

if (require.main === module) {
  const r = seedCodeTests({ update: process.argv.includes('--update') });
  console.log(`code test bank seed: ${r.written} of ${r.cases} cases written across ${r.items} items (mode: ${r.mode})`);
  process.exit(0);
}

module.exports = { seedCodeTests };
