'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: unit-scoped denominators.
//
//  THE DEFECT
//  course_denominators is keyed (course, lesson, activity_type), with the unit
//  OUTSIDE the key. That is correct while a lesson id names exactly one lesson,
//  which holds for every numbered lesson in every course. It breaks for the
//  Cybersecurity pseudo-lessons: the COURSES config gives all five units a case
//  file at lesson 'case-file' and a unit exam at lesson 'exam', so ten distinct
//  gradebook columns collapse onto two rows.
//
//  This was not a value someone forgot to author. Authoring Unit 1's exam out of
//  20 and Unit 2's out of 25 is REJECTED by the primary key, and test 1 below
//  proves it against the real schema. Ten of Cybersecurity's fifteen unpriced
//  columns were structurally unpriceable, and would have stayed that way however
//  carefully anybody counted the pages.
//
//  There was a matching bug in the read path: lib/gradebook-contract.js keyed
//  its manifest lookup by (lesson, activity) too, so five units' exams all read
//  whichever manifest row happened to be scanned last. Test 4 pins that.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:unitdenoms
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-unit-denoms.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-unit-denoms-secret-long-enough';

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const COURSE = 'ap-cybersecurity';

(async () => {
  console.log('\nUNIT-SCOPED DENOMINATORS\n');

  // ── 1. The defect is real ─────────────────────────────────────────────────
  console.log('1. course_denominators structurally cannot price two units\' exams');
  const ins = db.prepare(
    'INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES (?,?,?,?,?)'
  );
  ins.run(COURSE, 'unit-1', 'exam', 'exam', 20);
  let rejected = false, msg = '';
  try { ins.run(COURSE, 'unit-2', 'exam', 'exam', 25); }
  catch (e) { rejected = true; msg = e.message; }
  ok('  the second unit\'s exam row is rejected by the primary key', rejected, msg);
  ok('  and it is a UNIQUE violation on (course, lesson, activity_type)',
    /UNIQUE constraint failed/.test(msg) && /activity_type/.test(msg), msg);
  db.prepare('DELETE FROM course_denominators WHERE course = ?').run(COURSE);

  // ── 2. The new table holds what the old one cannot ────────────────────────
  console.log('2. course_unit_denominators holds all five, independently');
  const uins = db.prepare(
    'INSERT INTO course_unit_denominators (course,unit,lesson,activity_type,possible) VALUES (?,?,?,?,?)'
  );
  const examPoints = { 'unit-1': 20, 'unit-2': 25, 'unit-3': 18, 'unit-4': 20, 'unit-5': 30 };
  for (const [u, p] of Object.entries(examPoints)) uins.run(COURSE, u, 'exam', 'exam', p);
  const stored = db.prepare(
    `SELECT unit, possible FROM course_unit_denominators WHERE course=? AND lesson='exam' ORDER BY unit`
  ).all(COURSE);
  ok('  all five rows stored', stored.length === 5, stored.length);
  ok('  each keeping its own value',
    JSON.stringify(stored.map((r) => r.possible)) === JSON.stringify([20, 25, 18, 20, 30]), stored);

  // ── 3. The contract reads them per unit ───────────────────────────────────
  console.log('3. The gradebook prices each unit\'s exam separately');
  const reg = await post('/api/teacher/register', {
    email: 'unit.denoms@example.org', password: 'a-long-enough-password',
    name: 'Unit Denoms', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;

  const g = buildCanonicalGradebook(code, { reveal: true });
  const exams = g.items.filter((i) => i.native_activity === 'exam');
  ok('  five exam columns, one per unit', exams.length === 5, exams.length);
  const got = {};
  exams.forEach((i) => { got[i.unit] = i.possible; });
  ok('  each carries its own authored value', JSON.stringify(got) === JSON.stringify(examPoints), got);
  ok('  and every one is sourced as authored, not observed',
    exams.every((i) => i.possible_source === 'authored'), exams.map((i) => i.possible_source));

  // Before this fix all five read the same number. Prove they no longer do.
  ok('  the five values are genuinely different, not one value repeated',
    new Set(exams.map((i) => i.possible)).size === 4, exams.map((i) => i.possible));

  // ── 4. The same collision in the manifest read path ───────────────────────
  console.log('4. The manifest lookup is unit-aware too');
  db.prepare('DELETE FROM course_unit_denominators WHERE course = ?').run(COURSE);
  const mins = db.prepare(
    'INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES (?,?,?,?,?,?)'
  );
  mins.run(COURSE, 'unit-1', 'case-file', 'cf-u1', 'case-file', 12);
  mins.run(COURSE, 'unit-2', 'case-file', 'cf-u2', 'case-file', 30);
  const g2 = buildCanonicalGradebook(code, { reveal: true });
  const cf = {};
  g2.items.filter((i) => i.native_activity === 'case-file')
    .forEach((i) => { cf[i.unit] = i.possible; });
  ok('  unit-1 case file reads 12 and unit-2 reads 30',
    cf['unit-1'] === 12 && cf['unit-2'] === 30, cf);
  ok('  a unit-less key would have made them equal, and they are not',
    cf['unit-1'] !== cf['unit-2'], cf);

  // ── 5. Precedence, and nothing else moves ─────────────────────────────────
  console.log('5. Precedence is most specific first, and existing columns are untouched');
  uins.run(COURSE, 'unit-1', 'case-file', 'case-file', 99);
  const g3 = buildCanonicalGradebook(code, { reveal: true });
  const cf1 = g3.items.find((i) => i.unit === 'unit-1' && i.native_activity === 'case-file');
  ok('  a unit-scoped row outranks the manifest', cf1.possible === 99, cf1.possible);
  const cf2 = g3.items.find((i) => i.unit === 'unit-2' && i.native_activity === 'case-file');
  ok('  and a unit with no such row still reads the manifest', cf2.possible === 30, cf2.possible);

  // A normal numbered lesson must be completely unaffected: for those, the
  // unit-aware key and the old key name the same column.
  db.prepare(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
              VALUES (?,'unit-1','1.1','quiz',5)`).run(COURSE);
  const g4 = buildCanonicalGradebook(code, { reveal: true });
  const q = g4.items.find((i) => i.item_key === 'unit-1/1.1/quiz');
  ok('  a numbered lesson still reads course_denominators unchanged',
    q && q.possible === 5 && q.possible_source === 'authored', q && { p: q.possible, s: q.possible_source });

  // ── 6. Nothing is priced that nobody authored ─────────────────────────────
  //  The table ships EMPTY. It is a mechanism, not a set of values: pricing a
  //  column whose page cannot report inflates `possible` and distorts pace for
  //  every student in the class, so the values are a separate, evidenced step.
  console.log('6. The mechanism ships without inventing any values');
  db.prepare('DELETE FROM course_unit_denominators').run();
  // Run every boot seed the server runs. None of them may write here: the values
  // for these columns are a separate, evidenced step.
  require('../scripts/seed-manifest').seedManifest();
  require('../scripts/seed-cyber-denominators').seedCyberDenominators();
  require('../scripts/seed-csp-denominators').seedCspDenominators();
  const afterSeeds = db.prepare('SELECT COUNT(*) n FROM course_unit_denominators').get().n;
  ok('  no boot seed writes a single unit-scoped value', afterSeeds === 0, afterSeeds);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
