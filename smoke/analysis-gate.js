'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the 1.1 analysis activity is only handed out when it may be
//
//  Tanner asked, after finding a closed "Lab" column still open to a student:
//  can that page be made to actually lock? It could not, and the reason was
//  structural rather than a bug. The four email specimens, the six answer fields
//  and the answer key all lived in the Shopify page body, so the browser had the
//  whole activity before any server code ran, and `senderKey` was readable in
//  View Source.
//
//  This suite is what "moved to the server" has to mean:
//    the activity is withheld when a class has closed it, from a signed-in
//    student AND from a signed-out one, the answer key is never on the wire at
//    all, grading is re-checked at submit rather than only at render, and the
//    student's typed prose is never echoed, stored or storable.
//
//  What must ALSO stay true, and is asserted rather than assumed: an activity
//  nobody has closed is still served to anyone, because the public practice
//  layer pays for this and a blanket lock would take it dark.
//
//  Offline and secret-free: throwaway SQLite, the real router in process.
//  Zero PII. No em-dashes.
//
//  Run: npm run smoke:analysisgate
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-analysis-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const specs = require('../lib/analysis-spec');
const grader = require('../lib/analysis-grade');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use(require('../routes/analysis'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (m, u, b, auth) => fetch(base() + u, {
  method: m,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(b ? { body: JSON.stringify(b) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const SPEC = specs.get('ap-cybersecurity', '1.1-lab');
if (!SPEC) { console.log('  [FAIL] the 1.1 analysis spec did not load'); process.exit(1); }
const URL = `/api/analysis/${SPEC.course}/${SPEC.item_id}`;
const GRADE = URL + '/grade';

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t1','CYBER-ANA1','Closes it','ap-cybersecurity',1,80,1,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
//  A SECOND cyber class that closes nothing, so "a student whose own class left
//  it open still gets it" is a real assertion and not a vacuous one.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,quiz_lock_default)
     VALUES ('c2','t1','CYBER-ANA2','Leaves it open','ap-cybersecurity',1,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s2','c2','B','x')`);

const ST = signStudentToken({ id: 's1', class_id: 'c1' });
const OTHER = signStudentToken({ id: 's2', class_id: 'c2' });

const close = (lesson, act) => run(
  `INSERT OR REPLACE INTO activity_gates (class_id,course,unit,lesson,activity_type,open) VALUES ('c1',?,?,?,?,0)`,
  SPEC.course, SPEC.unit, lesson, act);

//  A correct submission, built FROM the spec's own keys so it cannot rot when
//  the authored page changes.
function perfect(n) {
  const sp = SPEC.specimens.find((s) => s.n === n);
  const r = {};
  for (const f of SPEC.fields) {
    r[f.key] = f.kind === 'select' ? sp.answer[f.key]
      : `the decisive detail is ${(sp.answer[f.key + 'Key'] || ['x'])[0]} which gives it away`;
  }
  return r;
}
const TYPED = 'the decisive detail is';

(async () => {
  console.log(`\n  driving ${SPEC.course} ${SPEC.item_id}: ${SPEC.specimens.length} specimens, ${SPEC.points} points\n`);

  console.log('1. Before anything is closed');
  let r = await call('GET', URL);
  ok('  an anonymous visitor gets the activity', r.status === 200 && !r.body.locked && r.body.activity, r.body && r.body.reason);
  ok('  it carries every specimen', r.body.activity.specimens.length === SPEC.specimens.length);
  r = await call('GET', URL, null, ST);
  ok('  so does a signed-in student', r.status === 200 && !r.body.locked);

  console.log('\n2. The answer key is never on the wire');
  const wire = JSON.stringify(r.body);
  for (const k of ['senderKey', 'elementsKey', 'impactKey', 'actionKey', 'tacticWhy', 'typeWhy']) {
    ok(`  ${k} is withheld`, !wire.includes(k));
  }
  //  The sharpest version: for every specimen, the correct select value must not
  //  be derivable from the payload. It appears as an OPTION, which every student
  //  sees, so the assertion is that no specimen object carries it.
  const derivable = (r.body.activity.specimens || []).some((sp, i) => {
    const ans = SPEC.specimens[i].answer;
    return JSON.stringify(sp).includes(`"${ans.tactic}"`) || JSON.stringify(sp).includes(`"${ans.type}"`);
  });
  ok('  no specimen carries its own correct answer', !derivable);

  console.log('\n3. THE POINT: the teacher closes it');
  close(SPEC.lesson_id, 'lab');
  r = await call('GET', URL, null, ST);
  ok('  the signed-in student is refused', r.body && r.body.locked === true, r.body);
  ok('  and the activity is NOT on the wire', r.body.activity === null && !JSON.stringify(r.body).includes('Specimen'), Object.keys(r.body));
  ok('  it is a 200, so the page can say "not opened" rather than "missing"', r.status === 200, r.status);
  r = await call('GET', URL);
  ok('  a signed-OUT student is refused too', r.body && r.body.locked === true, r.body && r.body.reason);
  ok('  and that refusal names the anonymous rule', /^anonymous-/.test(r.body.reason || ''), r.body && r.body.reason);

  console.log('\n4. What must stay true');
  r = await call('GET', URL, null, OTHER);
  ok('  a student whose own class left it open still gets it', r.status === 200 && !r.body.locked, r.body && r.body.reason);

  console.log('\n5. Grading is re-checked at SUBMIT, not only at render');
  r = await call('POST', GRADE, { responses: { 1: perfect(1) } }, ST);
  ok('  a closed activity refuses to grade', r.body && r.body.locked === true, r.body);
  ok('  and returns no score at all', r.body.score === undefined, r.body);

  console.log('\n6. Reopened, it grades');
  run(`DELETE FROM activity_gates`);
  r = await call('POST', GRADE, { responses: { 1: perfect(1) } }, ST);
  ok('  a perfect specimen scores full marks', r.body && r.body.specimens[0].points === SPEC.points_per_specimen,
    r.body && r.body.specimens && r.body.specimens[0]);
  ok('  and reports the right denominator', r.body.max_score === SPEC.points, r.body.max_score);
  ok('  one specimen is not the whole activity', r.body.complete === false && r.body.specimens_attempted === 1,
    { complete: r.body.complete, n: r.body.specimens_attempted });

  console.log('\n7. The student\'s prose is graded and dropped');
  ok('  the response never echoes what they typed', !JSON.stringify(r.body).includes(TYPED));
  const det = grader.detailForStorage(r.body);
  ok('  what may be stored is numbers and booleans only',
    /^[-0-9,:{}\[\]"a-z ]*$/.test(JSON.stringify(det)) && !JSON.stringify(det).includes(TYPED), det);
  //  A specimen nobody attempted must be distinguishable from one scored zero,
  //  the same rule the gradebook contract states for an unstarted column.
  const un = r.body.specimens.find((s) => s.n === 2);
  ok('  an unattempted specimen is marked unattempted, not scored zero',
    un && un.attempted === false && un.points === 0, un);
  ok('  and it is left out of what gets stored', !det.some((d) => d.q === 2), det);

  console.log('\n8. THE ORIGINAL COMPLAINT: the gradebook padlock stops lying');
  //  Tanner locked the 1.1 Lab column, opened the page as a student, and found
  //  it open. The gradebook drew that lock as unenforceable, correctly, because
  //  the questions were in the page body and no server could withhold them.
  //  Now they are here, so the same column must report ENFORCEABLE.
  run('DELETE FROM activity_gates');
  close(SPEC.lesson_id, 'lab');
  const gb = require('../lib/gradebook-contract').buildCanonicalGradebook('c1', { reveal: false });
  const item = gb.items.find((i) => i.unit === SPEC.unit && i.lesson_ref === SPEC.lesson_id
    && i.native_activity === 'lab');
  ok('  the 1.1 Lab has a gradebook column', !!item, gb.items.map((i) => i.item_key).slice(0, 8));
  ok('  it reports locked', item && item.locked === true, item && item.lock_scope);
  ok('  and the lock is now ENFORCEABLE, which is the whole point of the migration',
    item && item.lock_enforceable === true, item && item.lock_enforceable);
  ok('  so it is no longer named among the locks that cannot be enforced',
    !gb.gates.locked_but_unenforceable.includes(item && item.item_key), gb.gates.locked_but_unenforceable);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
