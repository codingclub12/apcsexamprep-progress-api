'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: AP CSA lesson 1.1 on the server render path.
//
//  This is the pilot for board 248, and the thing it has to prove is narrow: a
//  CSA quiz served by routes/quiz.js gives the student the questions and gives
//  them NOTHING ELSE, and a lock stops even that.
//
//  WHY EACH ASSERTION IS HERE
//
//  1. THE BANK IS THE REAL ONE. Not fixtures. seed/csa-unit-1-web-quizzes.js is
//     loaded through scripts/seed-quiz-bank.js exactly as boot does it, so a
//     typo'd course, unit or lesson in the seed fails here rather than in
//     production, where it would look like "no server-scored quiz for this
//     location" and be read as the migration simply not having happened.
//
//  2. NO KEY REACHES THE WIRE. The whole point of the move is that the live page
//     ships ten `data-answer` attributes today. A migration that served the key
//     from the API instead would have relocated the leak rather than closed it,
//     and it would still LOOK right in a browser. So the served payload is
//     scanned for correct_index, explanation, and for the literal answer text of
//     the correct option, which is the form a leak would actually take.
//
//  3. A LOCK EMPTIES THE PAYLOAD. `questions: null`, not `questions: [...]` with
//     a flag the page is trusted to honour. Trusting the page is the thing this
//     entire migration exists to stop doing.
//
//  4. THE SCOPE LADDER REACHES CSA. Locking `unit-1` with wildcards has to close
//     1.1 for a CSA class, because the four scopes were written and tested
//     against cyber and a course-specific bug there would be invisible until a
//     CSA teacher locked a unit and it did nothing.
//
//  5. SUBMIT STILL SCORES. Moving questions server-side is worthless if the
//     score path breaks, so a correct answer scores 1 of 2 and the key is
//     checked to be right by ANSWERING with it rather than by reading it back
//     out of the same table that produced it.
//
//  Offline and secret-free: throwaway SQLite, real routers in process on an
//  ephemeral port, no network. Zero PII: synthetic teacher, class and student.
//
//  Run: npm run smoke:csaquizbank
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-csa-quiz-bank.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');

const COURSE = 'ap-csa';
const UNIT = 'unit-1';
const LESSON = '1.1';
const CODE = 'CSA-PILOT';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

//  The real seed, the way boot loads it.
require('../scripts/seed-quiz-bank').seedQuizBank();

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c1','t1',?,'CSA Pilot',?,1,80,1,'all',0)`, CODE, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const URL = `/api/quiz/${COURSE}/${UNIT}/${LESSON}/quiz`;

(async () => {
  // 1 ── the seeded bank is reachable at the location the seed claims
  console.log('\n1. the real seed put lesson 1.1 where routes/quiz.js looks for it');
  const rows = db.prepare(
    'SELECT qid, correct_index, options FROM quiz_bank WHERE course=? AND unit=? AND lesson=? AND activity_type=? AND active=1 ORDER BY q_order'
  ).all(COURSE, UNIT, LESSON, 'quiz');
  ok('two questions seeded for ap-csa unit-1 1.1', rows.length === 2, rows.length);
  ok('qids use the web series, so a bundle import cannot collide',
    rows.every(r => r.qid.includes(':quiz#w')), rows.map(r => r.qid));

  const open = await call('GET', URL, null, ST);
  ok('GET answers 200', open.status === 200, open.status);
  ok('not locked by default', open.body && open.body.locked === false, open.body && open.body.locked);
  ok('serves both questions', open.body && open.body.total === 2, open.body && open.body.total);

  // 2 ── nothing but prompt and options crosses the wire
  console.log('\n2. the key does not reach the browser, which is the point of the move');
  const wire = JSON.stringify(open.body);
  ok('no correct_index in the payload', !/correct_index/.test(wire));
  ok('no explanation in the payload', !/explanation/.test(wire));
  const served = (open.body && open.body.questions) || [];
  ok('every question carries prompt and options only',
    served.every(q => q.prompt && Array.isArray(q.options)
      && !('correct_index' in q) && !('explanation' in q) && !('answer' in q)),
    served[0] && Object.keys(served[0]));
  //  A leak would most likely take the form of the correct option being
  //  flagged, so check the actual text rather than only the field names.
  const correctText = JSON.parse(rows[0].options)[rows[0].correct_index];
  const q0 = served.find(q => q.options && q.options.includes(correctText));
  ok('the correct option is present but not marked in any way',
    !!q0 && Object.values(q0).filter(v => typeof v === 'boolean').length === 0,
    q0 && Object.keys(q0));

  // 3 ── a lock empties the payload rather than flagging it
  console.log('\n3. a lock stops the questions reaching the wire at all');
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open)
       VALUES ('c1',?,?,?,'quiz',0)`, COURSE, UNIT, LESSON);
  const shut = await call('GET', URL, null, ST);
  ok('locked: true', shut.body && shut.body.locked === true, shut.body && shut.body.locked);
  ok('questions are null, not merely flagged', shut.body && shut.body.questions === null,
    shut.body && shut.body.questions);
  ok('no prompt text anywhere in the locked payload',
    !/prompt/.test(JSON.stringify(shut.body)));
  db.prepare('DELETE FROM activity_gates WHERE class_id=?').run('c1');

  // 4 ── the wildcard scopes reach CSA, not just the course they were built on
  console.log('\n4. the scope ladder works for a CSA class');
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open)
       VALUES ('c1',?,?,'*','*',0)`, COURSE, UNIT);
  const unitShut = await call('GET', URL, null, ST);
  ok('a unit-scope lock closes 1.1', unitShut.body && unitShut.body.locked === true,
    unitShut.body && unitShut.body.locked);
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open)
       VALUES ('c1',?,?,?,'*',1)`, COURSE, UNIT, LESSON);
  const reopened = await call('GET', URL, null, ST);
  ok('opening the lesson inside the locked unit reopens it',
    reopened.body && reopened.body.locked === false, reopened.body && reopened.body.locked);
  db.prepare('DELETE FROM activity_gates WHERE class_id=?').run('c1');

  // 5 ── the score path still works after the move
  console.log('\n5. submitting still scores, and the stored key is actually right');
  const fresh = await call('GET', URL, null, ST);
  const order = fresh.body.order_token;
  //  Options are shuffled per student and the order token owns the positions, so
  //  the answer is found by the TEXT of the correct option in the served order,
  //  never by reusing the bank's own index. Doing the latter scored 1 of 2 here
  //  and would have looked like a broken key rather than a broken test.
  const keyByQid = new Map(db.prepare(
    'SELECT qid, options, correct_index FROM quiz_bank WHERE course=? AND unit=? AND lesson=? AND activity_type=? AND active=1'
  ).all(COURSE, UNIT, LESSON, 'quiz').map(r => [r.qid, JSON.parse(r.options)[r.correct_index]]));
  const answers = fresh.body.questions.map((q) => ({
    qid: q.qid,
    selected: q.options.indexOf(keyByQid.get(q.qid)),
  }));
  ok('every served question was matched to its key', answers.every(a => a.selected >= 0), answers);
  const sub = await call('POST', '/api/quiz/submit', { order_token: order, answers }, ST);
  ok('submit answers 200', sub.status === 200, sub.status);
  ok('all correct scores 2 of 2', sub.body && sub.body.score === 2 && sub.body.total === 2,
    sub.body && { score: sub.body.score, total: sub.body.total });

  //  And a wrong answer must not score, or the assertion above proves nothing.
  const fresh2 = await call('GET', URL, null, ST);
  const wrong2 = fresh2.body.questions.map((q) => ({
    qid: q.qid, selected: (q.options.indexOf(keyByQid.get(q.qid)) + 1) % q.options.length,
  }));
  const subw = await call('POST', '/api/quiz/submit', { order_token: fresh2.body.order_token, answers: wrong2 }, ST);
  ok('all wrong scores 0 of 2', subw.body && subw.body.score === 0 && subw.body.total === 2,
    subw.body && { score: subw.body.score, total: subw.body.total });

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
