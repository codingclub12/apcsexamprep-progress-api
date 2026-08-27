'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: activity gate (teacher opens and closes a quiz)
//
//  Proves the four things the gate has to get right, in order:
//    1. A class left alone behaves exactly as it did before the gate existed.
//    2. Flipping quiz_lock_default closes quizzes with no per-activity writes.
//    3. Opening one activity opens exactly that one and nothing beside it.
//    4. A token minted while the quiz was open does not still spend after it
//       closes, which is the hole a render-time-only check would leave.
//
//  Self-study is checked too, because a gate that locks out the public practice
//  path would be a worse bug than the one it fixes. The seeded bank is scored
//  end to end as well, so a bad correct_index in seed/cyber-unit-1-quizzes.js
//  fails here rather than in front of a class.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real routers mounted in process on an ephemeral port, no network
//  and no live server. tests.yml derives its suite list from package.json, so
//  this runs on every pull request with no workflow edit.
//
//  Zero PII: synthetic teacher, class, and student; numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:quizgate
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quiz-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const { seedQuizBank } = require('../scripts/seed-quiz-bank');
// Derived, not hardcoded: a new lesson bank must not fail this suite.
const BANK_TOTAL = [
  ...require('../seed/cyber-unit-1-quizzes'),
  ...require('../seed/cyber-unit-1-web-quizzes'),
].reduce((n, p) => n + p.questions.length, 0);

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';

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

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
     VALUES ('c1','t1','CYBER-GATE','Gate Test',?,1,80,1,'all')`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });
const CODE = 'CYBER-GATE';

const quiz = (lesson) => `/api/quiz/${COURSE}/${UNIT}/${lesson}/quiz`;
const setGate = (lesson, open) => call('POST', `/api/teacher/classes/${CODE}/gate`,
  { course: COURSE, unit: UNIT, lesson, activity_type: 'quiz', open }, TT);

(async () => {
  const seeded = seedQuizBank();
  ok(`bank seeds ${BANK_TOTAL} questions across every seeded location`, seeded.total === BANK_TOTAL, { seeded, BANK_TOTAL });

  // 1) An untouched class keeps working.
  let r = await call('GET', quiz('1.1'), null, ST);
  ok('default class: 1.1 quiz open', r.body && r.body.locked === false, r.body);
  ok('default class: all 9 items served', r.body && r.body.total === 9, r.body && r.body.total);

  // 2) The class default closes everything with no per-activity rows.
  r = await call('PUT', `/api/teacher/classes/${CODE}`, { quiz_lock_default: 1 }, TT);
  ok('quiz_lock_default set to 1', r.body && r.body.class && r.body.class.quiz_lock_default === 1, r.body);

  r = await call('GET', quiz('1.1'), null, ST);
  ok('locked class: 1.1 quiz closed', r.body && r.body.locked === true, r.body);
  ok('locked class: no questions on the wire', r.body && r.body.questions === null);
  ok('locked class: no order_token minted', r.body && !r.body.order_token);
  ok('locked class: reason is the class default',
    r.body && r.body.reason === 'class-default-locked', r.body && r.body.reason);

  // Practice types are NOT swept up by the blanket default.
  ok('class default does not gate non-assessment types',
    require('../lib/activity-gate').resolveGate(null, { id: 'c1', quiz_lock_default: 1 }, 'exercise-1').open === true);

  // Public self-study is untouched: it has no teacher to open anything.
  r = await call('GET', quiz('1.1'));
  ok('self-study still open', r.body && r.body.locked === false && r.body.total === 9, r.body && r.body.locked);

  // 3) Opening one activity opens only that one.
  r = await setGate('1.1', true);
  ok('teacher opened 1.1 quiz', r.body && r.body.open === true, r.body);

  r = await call('GET', quiz('1.1'), null, ST);
  const token11 = r.body && r.body.order_token;
  ok('1.1 quiz now open to the student', r.body && r.body.locked === false, r.body && r.body.locked);
  ok('1.1 order_token minted', !!token11);

  r = await call('GET', quiz('1.2'), null, ST);
  ok('1.2 quiz still closed', r.body && r.body.locked === true, r.body && r.body.locked);

  // The seeded bank scores correctly end to end, on the token just minted.
  const served = (await call('GET', quiz('1.1'), null, ST)).body;
  const answers = served.questions.map((q) => {
    const row = db.prepare('SELECT options, correct_index FROM quiz_bank WHERE qid = ?').get(q.qid);
    const correctText = JSON.parse(row.options)[row.correct_index];
    return { qid: q.qid, chosen_index: q.options.indexOf(correctText) };
  });
  r = await call('POST', '/api/quiz/submit', { order_token: served.order_token, answers }, ST);
  ok('all-correct submit scores 9 of 9', r.body && r.body.score === 9 && r.body.total === 9,
    r.body && { score: r.body.score, total: r.body.total });

  // 4) Closing mid-flight invalidates a token minted while open.
  r = await setGate('1.1', false);
  ok('teacher closed 1.1 quiz', r.body && r.body.open === false, r.body);

  r = await call('POST', '/api/quiz/submit', { order_token: token11, answers: [] }, ST);
  ok('submit refused after close', r.status === 403, r.status);
  ok('submit refusal says locked', r.body && r.body.locked === true, r.body);

  // 5) The listing a teacher UI will read.
  r = await call('GET', `/api/teacher/classes/${CODE}/gates`, null, TT);
  ok('gates listing reports the class default', r.body && r.body.quiz_lock_default === 1, r.body);
  ok('gates listing has the 1.1 row', !!(r.body && (r.body.gates || []).some(
    (g) => g.lesson === '1.1' && g.activity_type === 'quiz' && g.open === 0)), r.body && r.body.gates);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
