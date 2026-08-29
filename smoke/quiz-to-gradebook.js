'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a student's quiz submission reaches the teacher's gradebook.
//
//  ── THE GAP THIS CLOSES ────────────────────────────────────────────────────
//  Both halves of this journey were already covered and the JOIN was not.
//  smoke/quiz-gate.js proves an authenticated submit scores correctly.
//  smoke/admin-gradebook.js proves the gradebook prices what is in the ledger.
//  Nothing asserted that the rows one writes are the rows the other reads.
//
//  That gap is the shape of a real outage: submit could keep answering 200 with
//  a correct score while writing an activity_type, a lesson id or a class_id the
//  gradebook does not look under, and every existing suite would stay green
//  while every teacher saw an empty column. The failure is invisible from either
//  end alone, which is exactly why it needs a test that spans both.
//
//  ── WHAT IT DRIVES, IN ORDER ───────────────────────────────────────────────
//   1. teacher, class and two students, one of whom never submits
//   2. the teacher opens the 1.1 quiz gate
//   3. student A is served the quiz and submits EVERY answer correct
//   4. the teacher's gradebook shows A's quiz cell at full marks
//   5. student B, who submitted nothing, is not scored zero: not attempted and
//      scored zero are different facts and CLAUDE.md requires they never render
//      alike. A gradebook that prints 0 for an absent student is the bug this
//      step exists to catch.
//   6. a second, worse attempt does not lower a recorded best score under
//      retry_mode 'all', which is where a rollup that overwrites rather than
//      rolling up would show itself.
//
//  The correct answers are read from the bank by qid rather than hardcoded, so
//  editing seed/cyber-unit-1-web-quizzes.js cannot make this suite lie.
//
//  Offline and secret-free per .github/workflows/tests.yml: throwaway SQLite,
//  real routers in process on an ephemeral port, no network.
//
//  Zero PII: synthetic teacher, class and students; numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:quiztogradebook
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quiz-to-gradebook.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const { seedQuizBank } = require('../scripts/seed-quiz-bank');
const WEB_PACKS = require('../seed/cyber-unit-1-web-quizzes');

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const LESSON = '1.1';
const CODE = 'CYBER-GB01';
//  Derived, never hardcoded: a content change to the bank must not make this
//  suite assert the wrong total.
const N = WEB_PACKS.find((p) => p.location.lesson === LESSON).questions.length;

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
     VALUES ('c1','t1',?,'Gradebook Join',?,1,80,1,'all')`, CODE, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('sA','c1','A','x')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('sB','c1','B','x')`);

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const SA = signStudentToken({ id: 'sA', class_id: 'c1' });

//  Reads the served set and answers every question correctly, mapping the
//  correct option TEXT back to the index it was shown at, because the server
//  permutes options per token.
async function submitAll(auth, correct) {
  const served = (await call('GET', `/api/quiz/${COURSE}/${UNIT}/${LESSON}/quiz`, null, auth)).body;
  const answers = served.questions.map((q) => {
    const row = db.prepare('SELECT options, correct_index FROM quiz_bank WHERE qid = ?').get(q.qid);
    const opts = JSON.parse(row.options);
    const want = correct ? opts[row.correct_index] : opts.find((o, i) => i !== row.correct_index);
    return { qid: q.qid, chosen_index: q.options.indexOf(want) };
  });
  return call('POST', '/api/quiz/submit', { order_token: served.order_token, answers }, auth);
}

//  The contract keys every cell by item_key, so the cell is looked up by
//  identity rather than by a column position a layout change would move.
const ITEM_KEY = `${UNIT}/${LESSON}/quiz`;
function cellFor(body, label) {
  const row = (body.students || []).find((r) => r.label === label);
  if (!row) return { missing: 'row' };
  if (!(body.items || []).some((i) => i.item_key === ITEM_KEY)) {
    return { missing: 'column', items: (body.items || []).map((i) => i.item_key).slice(0, 8) };
  }
  return { cell: (row.items || {})[ITEM_KEY], row };
}

(async () => {
  seedQuizBank();

  // ---- 1. the teacher opens the quiz ---------------------------------------
  let r = await call('POST', `/api/teacher/classes/${CODE}/gate`,
    { course: COURSE, unit: UNIT, lesson: LESSON, activity_type: 'quiz', open: true }, TT);
  ok('teacher opened the 1.1 quiz', r.status === 200, { status: r.status, body: r.body });

  // ---- 2. the student submits, all correct ---------------------------------
  r = await submitAll(SA, true);
  ok(`submit scores ${N} of ${N}`, r.body && r.body.score === N && r.body.total === N,
    r.body && { score: r.body.score, total: r.body.total });
  ok('submit reports it was recorded', r.body && r.body.recorded === true, r.body && r.body.recorded);

  // ---- 3. the ledger actually carries it -----------------------------------
  const events = db.prepare(
    `SELECT COUNT(*) n FROM score_events WHERE student_id='sA' AND course=? AND unit=? AND lesson=? AND activity_type='quiz'`
  ).get(COURSE, UNIT, LESSON).n;
  ok(`score_events carries ${N} rows for the submission`, events === N, events);

  // ---- 4. THE JOIN: the teacher's gradebook shows it ------------------------
  r = await call('GET', `/api/teacher/classes/${CODE}/gradebook`, null, TT);
  ok('gradebook responds 200', r.status === 200, r.status);
  const A = cellFor(r.body || {}, 'A');
  ok('gradebook has a 1.1 quiz column', A.missing !== 'column', A.items);
  ok('gradebook has a row for the student who submitted', A.missing !== 'row', A.missing);
  const got = A.cell && (A.cell.earned !== undefined ? A.cell.earned : A.cell.points);
  ok(`the quiz cell reads ${N} earned`, got === N, A.cell);

  // ---- 5. the student who submitted nothing is NOT a zero ------------------
  const B = cellFor(r.body || {}, 'B');
  const bVal = B.cell && (B.cell.earned !== undefined ? B.cell.earned : B.cell.points);
  const bPct = B.cell && B.cell.pct;
  ok('a student who never submitted is not scored zero',
    B.missing === 'row' || bVal === null || bVal === undefined || bPct === null, B.cell);

  // ---- 6. a worse second attempt does not lower the record -----------------
  await submitAll(SA, false);
  r = await call('GET', `/api/teacher/classes/${CODE}/gradebook`, null, TT);
  const A2 = cellFor(r.body || {}, 'A');
  const got2 = A2.cell && (A2.cell.earned !== undefined ? A2.cell.earned : A2.cell.points);
  ok(`a worse retry does not lower the recorded ${N}`, got2 === N, A2.cell);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
