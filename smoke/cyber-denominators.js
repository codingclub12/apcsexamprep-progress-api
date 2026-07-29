'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: page-derived cyber denominators, and the column map the header needs.
//
//  The gradebook printed "Ex 1 /5" above every exercise because the page had no
//  source for a column denominator and fell back to a per-activity constant.
//  The totals actually differ: Unit 1 Exercise 1 has seven red flags and is out
//  of 7, Unit 2 Exercise 1 is out of 6. A constant cannot express that.
//
//  Two things have to hold for a normal gradebook:
//    1. the authored value per lesson+activity is what the page states, and
//       different lessons keep different values
//    2. the teacher endpoint hands the page a COLUMN map, so a header can show
//       the right "out of" before any student has submitted
//
//  And one thing must not: a column with no authored value must be ABSENT from
//  that map, never defaulted, so the page can tell "out of 7" from "unknown"
//  and render no denominator rather than a wrong one.
//
//  Zero PII: author content and synthetic students only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberdenoms
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-cyber-denoms.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');
const { seedCyberDenominators, POINTS } = require('../scripts/seed-cyber-denominators');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

console.log('\nCYBER DENOMINATORS (page-derived)\n');

// ── 1. The values themselves ─────────────────────────────────────────────────
console.log('1. Per-lesson values, as the pages state them');
{
  ok('  1.1 exercise-1 is out of 7 (seven red flags)', POINTS['1.1|exercise-1'] === 7, POINTS['1.1|exercise-1']);
  ok('  2.1 exercise-1 is out of 6, NOT 7', POINTS['2.1|exercise-1'] === 6, POINTS['2.1|exercise-1']);
  ok('  1.1 exercise-2 is out of 8', POINTS['1.1|exercise-2'] === 8, POINTS['1.1|exercise-2']);
  ok('  1.5 exercise-1 is out of 4', POINTS['1.5|exercise-1'] === 4, POINTS['1.5|exercise-1']);

  // The whole point: one constant per activity type could never be right.
  const ex1 = new Set(Object.entries(POINTS)
    .filter(([k]) => k.endsWith('|exercise-1')).map(([, v]) => v));
  ok('  exercise-1 takes several distinct values', ex1.size >= 4, [...ex1].sort());
  ok('  and 5 is not one of them', !ex1.has(5), [...ex1].sort());

  ok('  no value is zero or negative', Object.values(POINTS).every((v) => v > 0));
  ok('  no lesson column is authored twice', new Set(Object.keys(POINTS)).size === Object.keys(POINTS).length);
}

// ── 2. Seeding ───────────────────────────────────────────────────────────────
console.log('\n2. Seeding is safe and idempotent');
{
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
       VALUES ('ap-cybersecurity','unit-1','1.1','exercise-1',99)`);
  const first = seedCyberDenominators({});
  ok('  a hand-authored value is never clobbered',
    db.prepare(`SELECT possible p FROM course_denominators
                WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='exercise-1'`).get().p === 99);
  ok('  everything else is written', first.changed === Object.keys(POINTS).length - 1, first.changed);
  ok('  re-running writes nothing', seedCyberDenominators({}).changed === 0);
  ok('  --update is the deliberate override',
    seedCyberDenominators({ update: true }).changed > 0
    && db.prepare(`SELECT possible p FROM course_denominators
                   WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='exercise-1'`).get().p === 7);
}

// ── 3. The column map reaches the page ───────────────────────────────────────
console.log('\n3. The teacher endpoint hands the page a column map');
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c1','CYBER-DEN','Cyber','ap-cybersecurity','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const tok = signTeacherToken({ id: 't1', email: 't@s.org' });

(async () => {
  const r = await fetch(`http://127.0.0.1:${server.address().port}/api/teacher/classes/CYBER-DEN/progress`,
    { headers: { Authorization: 'Bearer ' + tok } });
  const body = await r.json();
  const d = body.denominators;

  ok('  the response carries a denominators map', !!d && typeof d === 'object');
  ok('  1.1|exercise-1 reads 7', d['1.1|exercise-1'] === 7, d && d['1.1|exercise-1']);
  ok('  2.1|exercise-1 reads 6', d['2.1|exercise-1'] === 6, d && d['2.1|exercise-1']);
  ok('  1.1|quiz reads 5', d['1.1|quiz'] === 5, d && d['1.1|quiz']);

  // Present BEFORE any student has submitted: a header cannot wait for a cell.
  ok('  present with zero submissions recorded',
    db.prepare('SELECT COUNT(*) n FROM progress').get().n === 0 && d['1.1|exercise-1'] === 7);

  // An unauthored column must be absent, not defaulted. 1.3 was one of the
  // seven Unit 1 activities whose page states no total.
  ok('  an UNAUTHORED column is absent, not defaulted',
    !('1.3|exercise-1' in d), d['1.3|exercise-1']);
  ok('  a lesson visit is never authored', !('1.1|lesson' in d), d['1.1|lesson']);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
