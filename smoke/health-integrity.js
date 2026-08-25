'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Does /api/health actually tell you whether the code test bank is seeded?
//
//  The bug this guards against is not a crash. It is a silent gap: a manifest
//  row opens a denominator, the hidden cases behind it were never loaded, and
//  the only endpoint that could say so needed ADMIN_KEY. These tests pin the
//  three properties that make the new field worth trusting:
//
//    1. It counts the right thing, and flips when a bank is seeded.
//    2. It never breaks the probe. /api/health returning 200 is load-bearing
//       for Railway's own restart logic, so a failure to measure must degrade
//       to an absent key, never to a 500 and never to a cheerful ok:true.
//    3. It is cached, because this runs on a 1 vCPU box behind a liveness probe.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-health-integrity.db');
for (const suffix of ['', '-shm', '-wal']) {
  try { fs.unlinkSync(DB + suffix); } catch (e) { /* first run */ }
}
process.env.DB_PATH = DB;

const db = require('../db');
const integrity = require('../lib/health-integrity');

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  [PASS] ' + msg); }
  else { fail++; console.log('  [FAIL] ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

console.log('\nhealth integrity: is the code test bank seeded?\n');

console.log('1. An empty database');
{
  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  measures cleanly with no manifest at all', r !== null);
  ok('  reports ok when there is nothing to be wrong', r.ok === true, r);
  ok('  counts zero code items', r.code_items === 0, r);
}

console.log('\n2. A denominator with no test bank behind it');
{
  const ins = db.prepare(`INSERT OR REPLACE INTO course_manifest
    (course, unit, lesson_id, item_id, item_type, points) VALUES (?, ?, ?, ?, ?, ?)`);
  ins.run('intro-java', 'unit-1', '1.4', '1.4-code-1', 'code', 1);
  ins.run('intro-java', 'unit-1', '1.5', '1.5-code-1', 'code', 1);
  // A visit item must never be counted: it has no test bank by definition.
  ins.run('intro-java', 'unit-1', '1.1', '1.1-visit', 'visit', 1);

  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  the gap is reported, not hidden', r.ok === false, r);
  ok('  both code items are counted', r.code_items === 2, r);
  ok('  both are counted as unseeded', r.code_items_unseeded === 2, r);
  ok('  the visit item is NOT counted as a code item', r.code_items === 2, r);
  ok('  the course is named, so the fix is actionable', r.by_course['intro-java'].unseeded === 2, r.by_course);
}

console.log('\n3. Seeding one bank moves the number');
{
  db.prepare(`INSERT INTO code_test_cases
    (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
    VALUES (?, ?, ?, ?, '', '', '', 'segment', 'x', 1)`).run('intro-java', '1.4', '1.4-code-1', 1);

  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  the seeded item drops out of the unseeded count', r.code_items_unseeded === 1, r);
  ok('  the unseeded one is still reported', r.ok === false, r);
  ok('  the total is unchanged', r.code_items === 2, r);
}

console.log('\n4. Many cases on one item still count as one item');
{
  const st = db.prepare(`INSERT INTO code_test_cases
    (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
    VALUES (?, ?, ?, ?, '', '', '', 'segment', 'x', 1)`);
  for (let seq = 2; seq <= 6; seq++) st.run('intro-java', '1.4', '1.4-code-1', seq);

  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  five more cases do not inflate the item count', r.code_items === 2, r);
  ok('  and do not change the unseeded count', r.code_items_unseeded === 1, r);
}

console.log('\n5. Fully seeded reads ok');
{
  db.prepare(`INSERT INTO code_test_cases
    (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
    VALUES (?, ?, ?, ?, '', '', '', 'segment', 'x', 1)`).run('intro-java', '1.5', '1.5-code-1', 1);

  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  ok is true only when every code item has a bank', r.ok === true, r);
  ok('  and nothing is left unseeded', r.code_items_unseeded === 0, r);
}

console.log('\n6. The cache holds, because this sits behind a liveness probe');
{
  db.prepare(`INSERT OR REPLACE INTO course_manifest
    (course, unit, lesson_id, item_id, item_type, points) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('intro-java', 'unit-1', '1.6', '1.6-code-1', 'code', 1);

  const cached = integrity.codeSeedIntegrity();
  ok('  a second read does not re-query', cached.code_items === 2, cached);
  const fresh = integrity.codeSeedIntegrity({ force: true });
  ok('  and force: true does', fresh.code_items === 3, fresh);
  ok('  which surfaces the newly opened denominator', fresh.code_items_unseeded === 1, fresh);
}

console.log('\n7. It degrades to absent, never to a wrong answer');
{
  // Drop the table the query depends on. A liveness probe must not 500 because
  // an integrity extra could not be computed, and it must not claim ok either.
  db.exec('DROP TABLE code_test_cases');
  integrity.resetCache();
  const r = integrity.codeSeedIntegrity({ force: true });
  ok('  an unmeasurable state returns null, not a throw', r === null, r);
  ok('  and never returns a cheerful ok:true', !(r && r.ok === true), r);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
