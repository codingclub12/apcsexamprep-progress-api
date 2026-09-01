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
for (const s of ['sA', 'sB', 'sC', 'sD', 'sE', 'sF', 'sG', 'sH']) {
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
// E is out of scope for EVERY scope. It used to be lesson 1.2, which v2 now
// legitimately covers, so it moves to a lesson no scope names.
prog('sE', '2.1', 'exercise-1', 0);                            ev('sE', '2.1', 'exercise-1', 0, BEFORE);
// G is a v2 column: a pre-cutoff zero that v1 must NOT touch and v2 must find.
prog('sG', '1.2', 'exercise-1', 0);                            ev('sG', '1.2', 'exercise-1', 0, BEFORE);
prog('sF', '1.4', 'exercise-1', 88);                           ev('sF', '1.4', 'exercise-1', 88, BEFORE);
// H is on 1.2 lab, one of the two columns ONLY v3 names. v1 and v2 must both
// miss it, or v3 is not actually reaching the new ground it was added for.
prog('sH', '1.2', 'lab', 0);                                   ev('sH', '1.2', 'lab', 0, BEFORE);

const eventsBefore = db.prepare('SELECT COUNT(*) c FROM score_events').get().c;

console.log('scopes');
const { findFabricated, findProtected, DEFAULT_CUTOFF, DEFAULT_SCOPE, SCOPES, columnsFor, clearFabricatedZeros } = require(script);
ok('the default scope is v1, so an unqualified call is unchanged', DEFAULT_SCOPE === 'v1');
ok('v1 is the original nine columns', SCOPES.v1.length === 9, SCOPES.v1.length);
ok('v2 is the three that pricing made harmful', SCOPES.v2.length === 3, SCOPES.v2);
ok('v3 is the ten columns the score reporter fabricated on load', SCOPES.v3.length === 10, SCOPES.v3.length);
// v3 deliberately overlaps v1 and v2 on eight columns, so `all` must dedupe or
// it double-lists and plan.columns stops describing what the run covered.
ok('all is the union of v1, v2 and v3, deduplicated', SCOPES.all.length === 14, SCOPES.all.length);
ok('all contains no repeated column',
  new Set(SCOPES.all.map((c) => c.join('|'))).size === SCOPES.all.length);
// The two columns v3 exists to add. If either drifts back out, Peter's 1.1
// exercise-1 and 1.2 lab zeros go unswept and nothing else notices.
{
  const inV1orV2 = new Set([...SCOPES.v1, ...SCOPES.v2].map((c) => c.join('|')));
  const novel = SCOPES.v3.map((c) => c.join('|')).filter((k) => !inV1orV2.has(k)).sort();
  ok('v3 adds exactly 1.1|exercise-1 and 1.2|lab over v1 and v2',
    JSON.stringify(novel) === JSON.stringify(['1.1|exercise-1', '1.2|lab']), novel);
}
// The lab columns v3 does NOT name. They were v1's, they no longer fabricate,
// and widening v3 to "every column v1 had" would clear grades nobody reviewed.
ok('v3 omits the 1.3, 1.4 and 1.5 labs',
  SCOPES.v3.every((c) => !(c[1] === 'lab' && ['1.3', '1.4', '1.5'].includes(c[0]))), SCOPES.v3);
ok('1.3 exercises are in v1 and NOT repeated in v2',
  SCOPES.v2.every((c) => c[0] !== '1.3'), SCOPES.v2.filter((c) => c[0] === '1.3'));
{
  let threw = null;
  try { columnsFor('everything'); } catch (e) { threw = e.message; }
  ok('an unknown scope throws rather than defaulting to a wide one', /unknown scope/.test(threw || ''), threw);
}

console.log('selection');
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

//  v2 must not reach into v1's columns, and vice versa. A scope that quietly
//  widened would clear grades nobody reviewed.
{
  const v2 = clearFabricatedZeros({ scope: 'v2', apply: false });
  ok('v2 finds only its own column, not v1\'s rows', v2.found === 1 && v2.would_reset === 1, v2);
  ok('v2 names the row it found as 1.2 exercise-1',
    JSON.stringify(Object.keys(v2.by_column)) === JSON.stringify(['1.2|exercise-1']), v2.by_column);
  ok('v2 names exactly its three columns',
    JSON.stringify(v2.columns) === JSON.stringify(['1.1|lab', '1.2|exercise-1', '1.2|exercise-2']), v2.columns);
  const v1 = clearFabricatedZeros({ scope: 'v1', apply: false });
  ok('v1 still finds its three fixture rows', v1.found === 3, v1.found);
  ok('the plan reports which scope produced it', v1.scope === 'v1' && v2.scope === 'v2');

  //  v3 spans columns v1 and v2 each hold a piece of, plus ground neither has.
  //  Asserting the exact student set is what catches a scope that quietly
  //  widened into the lab columns or narrowed out of the new ones.
  const v3 = clearFabricatedZeros({ scope: 'v3', apply: false });
  const v3ids = findFabricated(DEFAULT_CUTOFF, SCOPES.v3).map((r) => r.student_id).sort();
  ok('v3 finds sA (v1 column), sC (v1 column), sG (v2 column) and sH (v3 only)',
    JSON.stringify(v3ids) === JSON.stringify(['sA', 'sC', 'sG', 'sH']), v3ids);
  ok('v3 does NOT reach 1.3 lab, which is v1\'s and not v3\'s', !v3ids.includes('sD'));
  ok('v3 never selects a real nonzero score', !v3ids.includes('sF'));
  ok('v3 names ten columns in its plan', v3.columns.length === 10, v3.columns);

  //  1.2 lab is the whole reason v3 exists. Neither older scope may find it.
  ok('neither v1 nor v2 finds the 1.2 lab row',
    !findFabricated(DEFAULT_CUTOFF, SCOPES.v1).some((r) => r.student_id === 'sH')
    && !findFabricated(DEFAULT_CUTOFF, SCOPES.v2).some((r) => r.student_id === 'sH'));
}

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
ok('E: a lesson no scope names keeps its grade', row('p-sE').score === 0 && !row('p-sE').score_reset_at);
ok('G: a v2 column is untouched by a v1 apply', row('p-sG').score === 0 && !row('p-sG').score_reset_at);
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
