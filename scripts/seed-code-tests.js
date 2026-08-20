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
const codeModes = require('../lib/csa-code-modes');

// Each source module exports { items: [ { course, lesson, item, mode?, cases } ] }.
// Built lazily: the exercise bank reads its verified expected outputs off disk
// and throws a specific message when they have not been generated, and that
// message belongs to whoever RAN the seeder, not to whoever merely required it.
function sources() {
  return [
    require('../seed/csa-code-tests'),
    require('../seed/csa-exercises').codeTestItems(),
    require('../seed/intro-java-exercises').codeTestItems(),
  ];
}

function normalizeMode(raw, where) {
  const m = codeModes.normalizeMode(raw);
  if (!m) throw new Error(`${where}: unknown mode ${JSON.stringify(raw)}; use segment, program or driver`);
  return m;
}

const insert = db.prepare(`
  INSERT OR IGNORE INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const update = db.prepare(`
  INSERT INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(course, lesson, item, seq) DO UPDATE SET
    prelude = excluded.prelude, postlude = excluded.postlude,
    stdin = excluded.stdin, mode = excluded.mode,
    expected_stdout = excluded.expected_stdout, hidden = excluded.hidden
`);
const pruneStale = db.prepare(
  'DELETE FROM code_test_cases WHERE course = ? AND lesson = ? AND item = ? AND seq >= ?'
);

function seedCodeTests({ update: doUpdate = false } = {}) {
  const stmt = doUpdate ? update : insert;
  let written = 0, cases = 0, items = 0, pruned = 0;

  const run = db.transaction(() => {
    for (const src of sources()) {
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
        // The assembly shape belongs to the item, not to a case. An item whose
        // cases disagreed would assemble the same submission two different ways
        // and its pass count would mean nothing, so it is refused here rather
        // than discovered by a student. An item-level `mode` is the normal way
        // to say it; a per-case mode is allowed only if every case agrees.
        const itemMode = normalizeMode(it.mode, `${it.course} ${it.lesson} ${it.item}`);
        for (let i = 0; i < it.cases.length; i++) {
          const cm = it.cases[i].mode == null ? itemMode
            : normalizeMode(it.cases[i].mode, `${it.course} ${it.lesson} ${it.item} case ${i}`);
          if (cm !== itemMode) {
            throw new Error(`${it.course} ${it.lesson} ${it.item} case ${i}: mode '${cm}' disagrees with the item's '${itemMode}'`);
          }
        }
        // A driver item's harness IS the case. Without a postlude there is no
        // main, so the run fails for every student regardless of their answer.
        if (itemMode === 'driver' && it.cases.some((c) => !String(c.postlude || '').trim())) {
          throw new Error(`${it.course} ${it.lesson} ${it.item}: every driver case needs a postlude harness`);
        }
        // A program item's inputs arrive on stdin, so a prelude or postlude
        // would be silently dropped by the assembler. Refuse rather than drop.
        if (itemMode === 'program' && it.cases.some((c) => String(c.prelude || '').trim() || String(c.postlude || '').trim())) {
          throw new Error(`${it.course} ${it.lesson} ${it.item}: program cases take stdin only, not a prelude or postlude`);
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
            String(c.stdin || ''), itemMode, c.expected_stdout, c.hidden ? 1 : 0
          ).changes;
        });
        // Drop any case left over from a longer previous version of this item.
        // Without this, shrinking an item from five cases to four, or changing
        // its mode, leaves a stale row at the old seq: the item would then hold
        // cases assembled two different ways, and every student would be graded
        // against a case the current exercise does not have. Only in --update
        // mode, which is the only mode that claims to make the table match the
        // seed file.
        if (doUpdate) {
          pruned += pruneStale.run(it.course, it.lesson, it.item, it.cases.length).changes;
        }
      }
    }
  });
  run();
  return { written, cases, items, pruned, mode: doUpdate ? 'update' : 'ignore' };
}

if (require.main === module) {
  const r = seedCodeTests({ update: process.argv.includes('--update') });
  console.log(`code test bank seed: ${r.written} of ${r.cases} cases written across ${r.items} items (mode: ${r.mode})`);
  if (r.pruned) console.log(`  pruned ${r.pruned} stale case(s) left over from a longer previous version of an item`);
  process.exit(0);
}

module.exports = { seedCodeTests };
