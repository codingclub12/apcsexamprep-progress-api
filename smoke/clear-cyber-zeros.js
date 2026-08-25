'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the fabricated-zero cleanup.
//
//  scripts/clear-cyber-fabricated-zeros.js edits student grade data in place.
//  It had never been executed anywhere when this test was written, which is the
//  worst possible state for a script whose first run is against production: the
//  only thing standing between a careful comment block and a wrong regrade is
//  whether the SQL actually does what the comment says.
//
//  So this builds a database containing every case the script has to tell
//  apart, runs the real script against it, and asserts on the rows afterwards:
//
//    A  fabricated zero before the cutoff, with a progress row   -> reset
//    B  a zero recorded AFTER the cutoff (can be a real grade)   -> untouched
//    C  a row that already carries score_reset_at                -> skipped
//    D  a ledger row with no progress row                        -> nothing to do
//    E  a zero on a lesson outside the nine columns (1.2)        -> untouched
//    F  a real nonzero score before the cutoff                   -> untouched
//
//  It also asserts the run is idempotent and that nothing is deleted from
//  score_events, both of which the script promises in prose.
//
//  Zero PII: synthetic students named sA to sF. No em-dashes, per convention.
//
//  Run: npm run smoke:clearzeros
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-clear-zeros.db');
for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
process.env.DB_PATH = DB;

const db = require('../db');
const { LESSON_SCORE_ITEM } = require('../scoring');
const script = path.join(__dirname, '..', 'scripts', 'clear-cyber-fabricated-zeros.js');

const BEFORE = '2026-08-20T10:00:00Z';
const AFTER  = '2026-08-22T10:00:00Z';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

db.prepare("INSERT INTO teachers (id,email,password_hash,name) VALUES ('t1','t@smoke.test','x','T')").run();
db.prepare("INSERT INTO classes (id,teacher_id,class_code,class_name,course) VALUES ('C1','t1','CYBER-SMOKE','Smoke','ap-cybersecurity')").run();
for (const s of ['sA', 'sB', 'sC', 'sD', 'sE', 'sF']) {
  db.prepare('INSERT INTO students (id,class_id,display_name,pin_hash) VALUES (?, ?, ?, ?)').run(s, 'C1', s, 'x');
}

function prog(sid, lesson, act, score, reset) {
  const id = `p-${sid}`;
  db.prepare(`INSERT INTO progress
    (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,attempts,locked,score_reset_at,completed_at,updated_at)
    VALUES (?,?,?,?,?,?,?,1,?,1,0,?,?,?)`)
    .run(id, sid, 'C1', 'ap-cybersecurity', 'unit-1', lesson, act, score, reset || null, BEFORE, BEFORE);
  return id;
}
function ev(sid, lesson, act, points, at) {
  db.prepare(`INSERT INTO score_events
    (student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(sid, 'C1', 'ap-cybersecurity', 'unit-1', lesson, act, LESSON_SCORE_ITEM, points, 100, at);
}

prog('sA', '1.3', 'exercise-1', 0);                            ev('sA', '1.3', 'exercise-1', 0, BEFORE);
prog('sB', '1.4', 'lab', 0);                                   ev('sB', '1.4', 'lab', 0, AFTER);
prog('sC', '1.5', 'exercise-2', 0, '2026-08-22T00:00:00Z');    ev('sC', '1.5', 'exercise-2', 0, BEFORE);
                                                               ev('sD', '1.3', 'lab', 0, BEFORE);
prog('sE', '1.2', 'exercise-1', 0);                            ev('sE', '1.2', 'exercise-1', 0, BEFORE);
prog('sF', '1.4', 'exercise-1', 88);                           ev('sF', '1.4', 'exercise-1', 88, BEFORE);

const eventsBefore = db.prepare('SELECT COUNT(*) c FROM score_events').get().c;

console.log('selection');
const { findFabricated, findProtected, DEFAULT_CUTOFF } = require(script);
const found = findFabricated(DEFAULT_CUTOFF);
const ids = found.map((r) => r.student_id).sort();
ok('selects only pre-cutoff zeros on the nine columns',
  JSON.stringify(ids) === JSON.stringify(['sA', 'sC', 'sD']), ids);
ok('a real nonzero score is never selected', !ids.includes('sF'));
ok('a lesson outside the nine columns is never selected', !ids.includes('sE'));
ok('a post-cutoff zero is reported as protected, not selected',
  !ids.includes('sB') && findProtected(DEFAULT_CUTOFF).some((p) => p.lesson === '1.4' && p.activity_type === 'lab'));
ok('a ledger row with no progress row carries a null progress_id',
  found.find((r) => r.student_id === 'sD').progress_id === null);

console.log('apply');
require('child_process').execFileSync(process.execPath, [script, '--apply'],
  { env: { ...process.env, DB_PATH: DB }, stdio: 'pipe' });

const row = (id) => db.prepare('SELECT * FROM progress WHERE id = ?').get(id);
const a = row('p-sA');
ok('A: the fabricated zero is cleared',
  a.score === null && a.completed === 0 && a.attempts === 0 && !!a.score_reset_at, a);
ok('B: a post-cutoff zero keeps its grade', row('p-sB').score === 0 && !row('p-sB').score_reset_at);
ok('C: an already-reset row keeps its original reset stamp',
  row('p-sC').score_reset_at === '2026-08-22T00:00:00Z');
ok('E: an out-of-scope lesson keeps its grade', row('p-sE').score === 0 && !row('p-sE').score_reset_at);
ok('F: a real score is untouched', row('p-sF').score === 88 && !row('p-sF').score_reset_at);
ok('nothing is deleted from the ledger',
  db.prepare('SELECT COUNT(*) c FROM score_events').get().c === eventsBefore);

console.log('idempotence');
const out = require('child_process').execFileSync(process.execPath, [script, '--apply'],
  { env: { ...process.env, DB_PATH: DB }, encoding: 'utf8' });
ok('a second apply resets nothing', /APPLIED\. 0 progress row\(s\)/.test(out));
ok('the first reset stamp survives the second run',
  row('p-sA').score_reset_at === a.score_reset_at);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
