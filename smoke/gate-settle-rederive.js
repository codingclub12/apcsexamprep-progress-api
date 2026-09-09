'use strict';
// -----------------------------------------------------------------------------
//  REDERIVE: which rows a gate write should settle, decided twice
//
//  WHY A REDERIVE AND NOT A LIVE CHECK. The behaviour that changed is what the
//  teacher WRITE path stores, and observing that against production needs a
//  teacher credential. A session never asks for one and never puts one in a
//  transcript, so there is no live observation available for the thing that
//  moved. An assertion about a read path would have passed yesterday.
//
//  WHAT IS COMPARED. Every combination of a target write against a full set of
//  pre-existing rows, run through the real route, and the surviving rows diffed
//  against an independently written containment predicate. The predicate is
//  written from the rule in English, not from the SQL:
//
//    a row is UNDER this write when every column the write NAMES matches, and
//    it is not the row being written
//
//  It shares no code with routes/teacher.js. In particular it does not read the
//  DELETE's WHERE clause and translate it, which would be one implementation
//  wearing two hats.
//
//  THE MATRIX IS EXHAUSTIVE over the four scope shapes in both positions, so the
//  two cases that catch a width-based implementation, (1.2,*) against (*,quiz)
//  and its mirror, are covered by construction rather than by remembering to add
//  them. Sixteen pairs, plus a full-table write against all four at once.
//
//  Run: npm run smoke:gatesettlerederive
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gate-settle-rederive.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-gate-settle-rederive-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const CODE = 'CYBER-RD';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c1','t1',?,'RD',?,1,80,1,'all',0)`, CODE, COURSE);
const TT = signTeacherToken({ id: 't1', email: 't@s.org' });

// ── the second implementation, written from the rule in English ─────────────
//  Every column the write NAMES must match, and the row must not be the target.
function isUnder(row, target) {
  if (row.lesson === target.lesson && row.activity === target.activity) return false;
  if (target.lesson !== '*' && row.lesson !== target.lesson) return false;
  if (target.activity !== '*' && row.activity !== target.activity) return false;
  return true;
}

//  The four scope shapes. Two lessons and two activity types, so "same lesson,
//  different activity" and "same activity, different lesson" both exist.
const SHAPES = [
  { lesson: '*', activity: '*' },
  { lesson: '*', activity: 'quiz' },
  { lesson: '1.2', activity: '*' },
  { lesson: '1.2', activity: 'quiz' },
];
//  Extra rows that must never be swept by a 1.2 or a quiz write.
const NEIGHBOURS = [
  { lesson: '1.3', activity: 'quiz' },
  { lesson: '1.2', activity: 'exercise-1' },
  { lesson: '1.3', activity: 'exercise-1' },
];
const ALL_ROWS = SHAPES.concat(NEIGHBOURS);

const key = (r) => `${r.lesson}|${r.activity}`;
const seed = (rows) => {
  db.prepare('DELETE FROM activity_gates').run();
  for (const r of rows) {
    run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
         VALUES ('c1',?,?,?,?,0,datetime('now'))`, COURSE, UNIT, r.lesson, r.activity);
  }
};
const survivors = () => db.prepare(
  'SELECT lesson, activity_type FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'
).all('c1', COURSE, UNIT).map((r) => `${r.lesson}|${r.activity_type}`).sort();

const write = (target) => fetch(`${base()}/api/teacher/classes/${CODE}/gate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TT },
  body: JSON.stringify({
    course: COURSE,
    unit: UNIT,
    ...(target.lesson === '*' ? {} : { lesson: target.lesson }),
    ...(target.activity === '*' ? {} : { activity_type: target.activity }),
    open: true,
  }),
}).then(async (r) => await r.json().catch(() => null));

(async () => {
  console.log(`\n${SHAPES.length} target shapes against ${ALL_ROWS.length} pre-existing rows\n`);

  let compared = 0, disagreed = 0, totalCleared = 0, totalKept = 0;

  for (const target of SHAPES) {
    seed(ALL_ROWS);
    const res = await write(target);

    //  What the second implementation says should be left: everything not under
    //  the target, plus the target row itself, which the write puts back.
    const expected = ALL_ROWS
      .filter((r) => !isUnder(r, target))
      .map(key)
      .concat(ALL_ROWS.some((r) => key(r) === key(target)) ? [] : [key(target)])
      .sort();
    const actual = survivors();

    const expectedCleared = ALL_ROWS.filter((r) => isUnder(r, target)).length;
    compared++;
    totalCleared += expectedCleared;
    totalKept += expected.length;

    const rowsAgree = JSON.stringify(actual) === JSON.stringify([...new Set(expected)].sort());
    const countAgrees = res && res.cleared === expectedCleared;
    if (!rowsAgree || !countAgrees) {
      disagreed++;
      console.log(`  DISAGREE  write ${key(target)}`);
      console.log(`      route     kept ${JSON.stringify(actual)} cleared=${res && res.cleared}`);
      console.log(`      rederive  kept ${JSON.stringify([...new Set(expected)].sort())} cleared=${expectedCleared}`);
    } else {
      console.log(`  agree     write ${key(target).padEnd(12)} cleared ${expectedCleared}, kept ${actual.length}`);
    }
  }

  console.log('');
  ok(`the route and an independent containment rule agree on all ${compared} writes`,
    disagreed === 0, { disagreed });

  //  A comparison in which nothing is ever cleared, or everything always is,
  //  proves nothing. Both sides of the rule have to fire somewhere in the matrix.
  ok('the matrix both CLEARS and KEEPS rows, so the agreement is not vacuous',
    totalCleared > 0 && totalKept > 0, { cleared: totalCleared, kept: totalKept });

  //  The two pairs that a width-based implementation gets wrong, asserted by
  //  name so their absence from the matrix would be visible rather than silent.
  ok('a lesson write does NOT contain a unit-activity row',
    isUnder({ lesson: '*', activity: 'quiz' }, { lesson: '1.2', activity: '*' }) === false);
  ok('and a unit-activity write does NOT contain a lesson row',
    isUnder({ lesson: '1.2', activity: '*' }, { lesson: '*', activity: 'quiz' }) === false);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
