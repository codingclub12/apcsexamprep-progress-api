'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the cyber / CSP denominator seed.
//
//  This seed is the whole fix for 75 cyber classes and 19 CSP classes. It writes
//  no score, but it changes what every teacher on those courses reads, so a bad
//  row here is a silent grade error at scale. The bar is therefore:
//
//    - it authors exactly the graded columns and nothing else
//    - it NEVER clobbers a row someone already authored
//    - re-running is a no-op
//    - it refuses to invent values it has no source for (case-file, exam)
//    - and, end to end, seeding actually turns a legacy percentage into points
//
//  That last block is the one that matters. Everything upstream can be correct
//  and still leave the teacher's cell blank, so this asserts the outcome rather
//  than the intermediate state.
//
//  Zero PII: author content and synthetic students only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:seeddenoms
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-seed-denoms.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');
const { seedDenominators, buildRows } = require('../scripts/seed-denominators');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

console.log('\nDENOMINATOR SEED (cyber / CSP)\n');

// ── 1. Shape of what it would author ─────────────────────────────────────────
console.log('1. Authors exactly the graded columns');
{
  const rows = buildRows();
  const n = (c, a) => rows.filter((r) => r.course === c && r.activity_type === a).length;
  ok('  cyber: 23 lessons x 3 graded activities', n('ap-cybersecurity', 'quiz') === 23
    && n('ap-cybersecurity', 'exercise-1') === 23 && n('ap-cybersecurity', 'exercise-2') === 23);
  ok('  csp: 35 lessons x 3 graded activities', n('ap-csp', 'quiz') === 35
    && n('ap-csp', 'exercise-1') === 35 && n('ap-csp', 'exercise-2') === 35);
  ok('  174 rows total', rows.length === 174, rows.length);

  // A visit is not graded. Authoring it would put a denominator on a column the
  // coverage report itself classes not_graded.
  ok('  never authors the `lesson` visit activity',
    rows.every((r) => r.activity_type !== 'lesson'));

  // No corroborated value exists for these anywhere in the repo. Guessing would
  // silently rewrite a real gradebook column.
  ok('  refuses to guess case-file / exam',
    rows.every((r) => r.activity_type !== 'case-file' && r.activity_type !== 'exam'));

  ok('  no duplicate primary keys', (() => {
    const s = new Set(rows.map((r) => `${r.course}|${r.lesson}|${r.activity_type}`));
    return s.size === rows.length;
  })());

  ok('  touches only cyber and csp', new Set(rows.map((r) => r.course)).size === 2
    && rows.every((r) => r.course === 'ap-cybersecurity' || r.course === 'ap-csp'));
}

// ── 2. Dry run writes nothing ────────────────────────────────────────────────
console.log('\n2. Dry run is inert');
{
  const plan = seedDenominators({ dryRun: true });
  ok('  reports 174 rows would be added', plan.would_add === 174, plan.would_add);
  ok('  wrote nothing', one('SELECT COUNT(*) n FROM course_denominators').n === 0);
}

// ── 3. An already-authored row must survive untouched ────────────────────────
//  This is the safety property. Someone authoring a correct value by hand and
//  having a later seed run silently overwrite it is the failure mode that would
//  be hardest to notice.
console.log('\n3. Never clobbers an existing authored row');
{
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
       VALUES ('ap-cybersecurity','unit-1','1.1','quiz',99)`);
  const res = seedDenominators();
  ok('  wrote the other 173', res.changed === 173, res.changed);
  ok('  the hand-authored 99 is intact',
    one(`SELECT possible p FROM course_denominators WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='quiz'`).p === 99);
}

// ── 4. Idempotent ────────────────────────────────────────────────────────────
console.log('\n4. Re-running is a no-op');
{
  const before = one('SELECT COUNT(*) n FROM course_denominators').n;
  const res = seedDenominators();
  ok('  second run writes 0 rows', res.changed === 0, res.changed);
  ok('  row count unchanged at 174', one('SELECT COUNT(*) n FROM course_denominators').n === before && before === 174, before);
}

// ── 5. --update is the deliberate override ───────────────────────────────────
console.log('\n5. --update pushes edits on purpose');
{
  const res = seedDenominators({ update: true });
  ok('  update mode rewrites rows', res.changed > 0, res.changed);
  ok('  the hand-authored 99 is now the seed value 6',
    one(`SELECT possible p FROM course_denominators WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='quiz'`).p === 6);
}

// ── 6. No stored score is ever touched ───────────────────────────────────────
console.log('\n6. Writes only affect display, never a score');
{
  ok('  score_events untouched', one('SELECT COUNT(*) n FROM score_events').n === 0);
  ok('  attempts untouched', one('SELECT COUNT(*) n FROM attempts').n === 0);
  ok('  progress untouched', one('SELECT COUNT(*) n FROM progress').n === 0);
}

// ── 7. THE OUTCOME: a legacy percentage becomes points on the real endpoint ──
console.log('\n7. End to end: the teacher actually sees points');
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c_cy','CYBER-SEED','Cyber','ap-cybersecurity','t1',1,80,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c_cy','A','x')`);
// Exactly what POST /api/student/quiz records: a percentage and nothing else.
run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,score,completed,attempts,locked,updated_at)
     VALUES ('p1','s1','c_cy','ap-cybersecurity','unit-1','1.1','quiz',50,1,1,0,datetime('now'))`);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const token = signTeacherToken({ id: 't1', email: 't@s.org' });

(async () => {
  const r = await fetch(`http://127.0.0.1:${server.address().port}/api/teacher/classes/CYBER-SEED/progress`,
    { headers: { Authorization: 'Bearer ' + token } });
  const body = await r.json();
  const cell = body.summary[0].detail['unit-1']['1.1'].quiz;

  ok('  points_possible is the seeded 6', cell.points_possible === 6, cell.points_possible);
  ok('  points_earned is 3 (50 percent of 6)', cell.points_earned === 3, cell.points_earned);
  ok('  denominator_source is "authored"', cell.denominator_source === 'authored', cell.denominator_source);
  ok('  the stored percentage is unchanged', cell.score === 50, cell.score);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
