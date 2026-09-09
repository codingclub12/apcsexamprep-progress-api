'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: what a signed-out reader gets from a quiz some class has closed.
//
//  WHY THIS EXISTS
//  On 2026-09-07 this route began refusing an anonymous RENDER whenever any
//  class anywhere had closed that activity, to stop a student signing out to
//  walk around their teacher's lock. Nothing measured the cost, because every
//  quiz page still carried its own questions and nobody reached the route.
//
//  Mounting 22 cyber quiz pages on 2026-09-08 made the cost visible and it was
//  severe: all 22 answered locked to a signed-out request, so the public copy of
//  every one went dark, and one teacher's lock was closing a public page for the
//  whole internet. Tanner's words: "I don't want assignments locked when they
//  shouldn't be either."
//
//  WHAT IS PINNED, and it is two things that must not collapse into one
//   1. A signed-out reader GETS THE QUESTIONS, even when a class has closed the
//      activity. They were never the protected thing: they shipped in the public
//      page body, and the public practice layer is indexed on purpose.
//   2. That same reader gets NO KEY on submit. No correct_index, no explanation.
//      This is what makes serving the questions safe, and it is the half that
//      would silently rot if only the first were asserted.
//
//   3. A student IN a class is refused outright, unchanged. If this suite ever
//      goes green with that broken, the lock has stopped working entirely.
//
//  Offline and secret-free: throwaway SQLite, loopback only. Zero PII.
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-anon-visibility.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { seedQuizBank } = require('../scripts/seed-quiz-bank');
const { signStudentToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const LESSON = '1.1';

seedQuizBank();

//  Two classes, so "some OTHER class closed it" is the case under test rather
//  than "the caller's own class closed it".
db.prepare('INSERT OR REPLACE INTO teachers (id,name,email,password_hash) VALUES (?,?,?,?)')
  .run('t1', 'Probe', 'probe@example.invalid', 'x');
for (const [id, code] of [['c-strict', 'CYBER-AAAA'], ['c-open', 'CYBER-BBBB']]) {
  db.prepare(`INSERT OR REPLACE INTO classes (id,teacher_id,class_code,class_name,course,mastery_threshold,retry_allowed,active)
              VALUES (?,?,?,?,?,80,1,1)`).run(id, 't1', code, 'probe', COURSE);
}
//  c-strict closes 1.1 quiz. c-open closes nothing.
db.prepare(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open)
            VALUES (?,?,?,?,?,0)`).run('c-strict', COURSE, UNIT, LESSON, 'quiz');

db.prepare(`INSERT OR REPLACE INTO students (id,class_id,display_name,pin_hash,active)
            VALUES (?,?,?,?,1)`).run('s-strict', 'c-strict', 'Probe Student', 'x');

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const get = (u, h) => fetch(base() + u, { headers: h || {} }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (u, b, h) => fetch(base() + u, {
  method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: JSON.stringify(b),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

(async () => {
  const url = `/api/quiz/${COURSE}/${UNIT}/${LESSON}/quiz`;

  console.log('\n-- 1. setup: a class really has closed this activity --');
  const closed = db.prepare(
    "SELECT COUNT(*) n FROM activity_gates WHERE course=? AND unit=? AND lesson=? AND activity_type='quiz' AND open=0"
  ).get(COURSE, UNIT, LESSON).n;
  ok('one closing row exists, so the anonymous path has something to react to', closed === 1, closed);

  console.log('\n-- 2. the signed-out reader GETS THE QUESTIONS --');
  const anon = await get(url);
  ok('anonymous render is 200', anon.status === 200, anon.status);
  ok('and is NOT locked, though a class has closed it',
    anon.body && anon.body.locked === false, anon.body && { locked: anon.body.locked, reason: anon.body.reason });
  const qs = (anon.body && anon.body.questions) || [];
  ok('questions are served', qs.length > 0, qs.length);
  ok('and still carry no key on render',
    qs.every((q) => q.correct_index === undefined && q.explanation === undefined));

  console.log('\n-- 3. but that reader gets NO KEY on submit --');
  const answers = qs.map((q, i) => ({ qid: q.qid, chosen_index: 0, q: i }));
  const sub = await post('/api/quiz/submit', { order_token: anon.body.order_token, answers });
  ok('anonymous submit is 200', sub.status === 200, sub.status);
  ok('it reports released: false', sub.body && sub.body.released === false, sub.body && sub.body.released);
  const pq = (sub.body && sub.body.per_question) || [];
  ok('no per-question correct_index comes back', pq.length > 0 && pq.every((e) => e.correct_index === undefined),
    pq.slice(0, 2));
  ok('and no explanation', pq.every((e) => e.explanation === undefined));
  ok('a score still comes back, so the page can say how you did',
    sub.body && typeof sub.body.score === 'number' && typeof sub.body.total === 'number',
    sub.body && { score: sub.body.score, total: sub.body.total });
  ok('and nothing was recorded for an anonymous caller', sub.body && sub.body.recorded === false);

  console.log('\n-- 4. an OPEN activity still hands the key to a signed-out reader --');
  //  Without this the suite would pass against a route that never releases a key
  //  to anyone, which is a different bug wearing the same green.
  const openUrl = `/api/quiz/${COURSE}/${UNIT}/1.2/quiz`;
  const anon2 = await get(openUrl);
  const qs2 = (anon2.body && anon2.body.questions) || [];
  ok('setup: 1.2 is open to anonymous', anon2.body && anon2.body.locked === false);
  const sub2 = await post('/api/quiz/submit', {
    order_token: anon2.body.order_token,
    answers: qs2.map((q, i) => ({ qid: q.qid, chosen_index: 0, q: i })),
  });
  ok('an open activity still releases the key', sub2.body && sub2.body.released === true,
    sub2.body && sub2.body.released);
  ok('and that key really is present', ((sub2.body && sub2.body.per_question) || []).some((e) => e.correct_index !== undefined));

  console.log('\n-- 5. the lock still bites for a student in the class that set it --');
  const tok = signStudentToken({ id: 's-strict', class_id: 'c-strict', name: 'Probe Student' });
  const asStudent = await get(url, { Authorization: 'Bearer ' + tok });
  ok('their own class gate refuses them', asStudent.body && asStudent.body.locked === true,
    asStudent.body && { locked: asStudent.body.locked, reason: asStudent.body.reason });
  ok('and no questions reach them', !asStudent.body.questions);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
