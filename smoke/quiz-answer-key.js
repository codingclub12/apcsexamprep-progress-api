'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the quiz answer key reaches an entitled teacher and nobody else.
//
//  The Command Center prints two links per quiz: the student page, and this
//  key. The first is public by design and the second must not be, so the whole
//  value of the pair rests on one endpoint failing closed. That is the property
//  pinned here, and it is pinned per REASON: a suite that only checks "an
//  anonymous caller is refused" goes green against a route that refuses
//  everyone, including the teacher who paid.
//
//  ── WHY THE PROJECTION IS TESTED TOO, AND NOT ONLY THE GATE ────────────────
//  A key with the wrong answer on it is worse than no key. A teacher reads it
//  aloud, and nothing throws, and the class is told B when the bank says C.
//  So section 3 pins the one property that matters: the option TEXT the bank
//  keys as correct is the option text the key marks correct, checked by text
//  rather than by index, because an index that matches is exactly what a
//  reordering bug preserves.
//
//  ── AND WHY THE BAD ROW IS A REFUSAL ───────────────────────────────────────
//  A correct_index pointing past the end of the options would render a blank as
//  the answer, which reads as "no option is right" rather than as a bug. That
//  is asserted as a throw, so it can never degrade into a confident empty line.
//
//  Offline and secret-free: throwaway SQLite, the real router in process.
//  Zero PII. No em-dashes, per repo convention.
//
//  Run: npm run smoke:quizkey
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quiz-answer-key.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken, signTeacherToken } = require('../utils');
const quizKey = require('../lib/quiz-answer-key');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const get = (u, auth, origin) => fetch(base() + u, {
  headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), ...(origin ? { Origin: origin } : {}) },
}).then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json().catch(() => null) }));

// ── the fixture ─────────────────────────────────────────────────────────────
const LOC = { course: 'ap-cybersecurity', unit: 'unit-9', lesson: '9.1', activity_type: 'quiz' };
const URL = `/api/quiz/${LOC.course}/${LOC.unit}/${LOC.lesson}/${LOC.activity_type}`;

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t-paid','Paid','paid@s.org','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t-free','Free','free@s.org','x')`);
run(`INSERT INTO entitlements (id,teacher_id,course,source,status,granted_at)
     VALUES ('e1','t-paid','ap-cybersecurity','manual','active',datetime('now'))`);
// Entitled to a DIFFERENT course, which is the case a gate that forgets to
// compare courses gets wrong while still refusing the anonymous caller.
run(`INSERT INTO entitlements (id,teacher_id,course,source,status,granted_at)
     VALUES ('e2','t-free','ap-csa','manual','active',datetime('now'))`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t-paid','CYBER-QKEY','Key','ap-cybersecurity',1,80,1,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

// Three questions whose correct answers are at three different positions, so a
// key that hardcodes one position cannot pass. The correct TEXT is what the
// assertions below compare, and each is unique inside its own question.
const BANK = [
  { q: 1, correct: 2, opts: ['alpha-wrong', 'bravo-wrong', 'charlie-RIGHT', 'delta-wrong'], why: 'because charlie' },
  { q: 2, correct: 0, opts: ['echo-RIGHT', 'foxtrot-wrong', 'golf-wrong', 'hotel-wrong'], why: null },
  { q: 3, correct: 3, opts: ['india-wrong', 'juliet-wrong', 'kilo-wrong', 'lima-RIGHT'], why: 'because lima' },
];
for (const b of BANK) {
  run(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
    `${LOC.course}:${LOC.unit}:${LOC.lesson}:quiz#${b.q}`, LOC.course, LOC.unit, LOC.lesson, 'quiz',
    b.q, `Question ${b.q}?`, JSON.stringify(b.opts), b.correct, b.why);
}

const paid = signTeacherToken({ id: 't-paid', email: 'paid@s.org' });
const free = signTeacherToken({ id: 't-free', email: 'free@s.org' });
const stu = signStudentToken({ id: 's1', class_id: 'c1', display_name: 'A' });

(async () => {
  console.log('\nQUIZ ANSWER KEY\n');

  console.log('1. The gate refuses everyone it should, one reason at a time');
  const anon = await get(URL + '/key');
  ok('  no token is refused', anon.status === 403, anon);
  const bad = await get(URL + '/key', 'not-a-token');
  ok('  a garbage token is refused', bad.status === 403, bad);
  const asStudent = await get(URL + '/key', stu);
  ok('  a STUDENT token is refused, even one in this very class', asStudent.status === 403, asStudent);
  //  The assertion above does NOT pin the role check, and the mutation battery
  //  is how that was found: deleting `payload.role !== 'teacher'` left the
  //  suite green, because a real student's id is not in `entitlements` and the
  //  gate below refused it anyway. So the role guard was being tested by
  //  accident and would have rotted silently.
  //
  //  This is the case that isolates it: a token whose role is student and
  //  whose id is the entitled TEACHER's. evaluateTeacherGate looks that id up
  //  in entitlements by teacher_id and approves it, so the role claim is the
  //  only thing left standing between this caller and the key.
  const studentRoleTeacherId = signStudentToken({ id: 't-paid', class_id: 'c1', display_name: 'A' });
  const impostor = await get(URL + '/key', studentRoleTeacherId);
  ok('  a student-role token carrying an entitled teacher id is refused on the ROLE alone',
    impostor.status === 403, impostor);
  const wrongCourse = await get(URL + '/key', free);
  ok('  a teacher entitled to another course is refused', wrongCourse.status === 403, wrongCourse);
  const noBank = await get('/api/quiz/ap-cybersecurity/unit-9/9.9/quiz/key', paid);
  ok('  an entitled teacher asking for a location with no bank is refused', noBank.status === 403, noBank);
  ok('  and every refusal reads the same, so the route cannot be walked to find banks',
    new Set([anon, bad, asStudent, wrongCourse, noBank].map((r) => JSON.stringify(r.body))).size === 1,
    [anon.body, bad.body, asStudent.body, wrongCourse.body, noBank.body]);

  console.log('2. The gate lets the teacher who paid through');
  const good = await get(URL + '/key', paid);
  ok('  an entitled teacher gets 200', good.status === 200, { status: good.status, body: good.body });
  ok('  and a key with all three questions', good.body && good.body.key && good.body.key.questions.length === 3,
    good.body && good.body.key && good.body.key.questions.length);
  ok('  never cached, because the response varies by credential',
    /no-store/.test(good.headers.get('cache-control') || ''), good.headers.get('cache-control'));
  const withOrigin = await get(URL + '/key', paid, 'https://www.apcsexamprep.com');
  ok('  the storefront origin is allowed to make the credentialed read',
    withOrigin.headers.get('access-control-allow-origin') === 'https://www.apcsexamprep.com',
    withOrigin.headers.get('access-control-allow-origin'));
  const otherOrigin = await get(URL + '/key', paid, 'https://evil.example.com');
  ok('  and any other origin is not',
    !otherOrigin.headers.get('access-control-allow-origin'),
    otherOrigin.headers.get('access-control-allow-origin'));

  console.log('3. The key says what the bank says, compared by TEXT not by index');
  const key = good.body.key;
  const byN = Object.fromEntries(key.questions.map((q) => [q.n, q]));
  let allRight = true, marked = [];
  for (const b of BANK) {
    const q = byN[b.q];
    const flagged = q.options.filter((o) => o.correct);
    marked.push(flagged.length);
    if (flagged.length !== 1) { allRight = false; continue; }
    if (flagged[0].text !== b.opts[b.correct]) allRight = false;
    if (q.correct_text !== b.opts[b.correct]) allRight = false;
  }
  ok('  exactly one option is marked correct per question', marked.every((n) => n === 1), marked);
  ok('  and it is the option text the bank keys as correct', allRight,
    key.questions.map((q) => q.correct_text));
  ok('  the correct answers sit at three different positions, so a hardcoded one would fail',
    new Set(key.questions.map((q) => q.correct_index)).size === 3,
    key.questions.map((q) => q.correct_index));
  ok('  an explanation is carried when the bank has one', byN[1].explanation === 'because charlie', byN[1].explanation);
  ok('  and is null, not empty string, when it does not', byN[2].explanation === null, byN[2].explanation);
  ok('  points are summed', key.total_points === 3, key.total_points);
  ok('  the key names the pool and what is served', key.pool === 3 && key.served === 3 && key.serves_whole_pool === true,
    { pool: key.pool, served: key.served, whole: key.serves_whole_pool });
  ok('  and it carries the disclosure', typeof key.disclosure === 'string' && key.disclosure.length > 80);

  console.log('4. The render path still leaks nothing, which is what the key is for');
  //  The options themselves ARE served, and must be: a student cannot answer a
  //  question whose choices are withheld. So "the correct option text is
  //  absent" is the wrong assertion, and it failed here for that reason. What
  //  must be absent is anything that says WHICH option it is.
  const render = await get(URL, stu);
  const raw = JSON.stringify(render.body || {});
  const rq = (render.body && render.body.questions) || [];
  ok('  the student is served all three questions', rq.length === 3, rq.length);
  ok('  with every option, because a question without its choices is unanswerable',
    rq.every((q) => Array.isArray(q.options) && q.options.length === 4), rq.map((q) => (q.options || []).length));
  ok('  no correct_index on the render response', !/correct_index/.test(raw));
  ok('  no explanation on the render response', !/explanation/.test(raw));
  //  Per FIELD, not per string: an option carrying { correct: false } would
  //  pass a text search and still hand over the key by elimination.
  const leakedField = rq.flatMap((q) => [
    ...Object.keys(q).filter((k) => /^(correct|answer|ok|key)/i.test(k)),
    ...(q.options || []).flatMap((o) => (o && typeof o === 'object' ? Object.keys(o) : [])),
  ]);
  ok('  and no field on any question or option names the answer', leakedField.length === 0, leakedField);

  console.log('5. N-of-M is reported rather than left to be inferred');
  run(`INSERT INTO quiz_config (course,unit,lesson,activity_type,serve_count) VALUES (?,?,?,?,2)`,
    LOC.course, LOC.unit, LOC.lesson, 'quiz');
  const sub = await get(URL + '/key', paid);
  ok('  the key still prints the whole pool', sub.body.key.questions.length === 3, sub.body.key.questions.length);
  ok('  but says only two of them are served', sub.body.key.served === 2 && sub.body.key.serves_whole_pool === false,
    { served: sub.body.key.served, whole: sub.body.key.serves_whole_pool });

  console.log('6. A bank row that points past its options is a refusal, not a blank answer');
  let threw = null;
  try {
    quizKey.build(LOC, [{ qid: 'x#1', prompt: 'p', options: '["a","b"]', correct_index: 7, points: 1 }]);
  } catch (e) { threw = e.message; }
  ok('  build() throws on an out-of-range correct_index', !!threw && /correct_index/.test(threw), threw);
  let threw2 = null;
  try { quizKey.build(LOC, [{ qid: 'x#2', prompt: 'p', options: 'not json', correct_index: 0, points: 1 }]); }
  catch (e) { threw2 = e.message; }
  ok('  and on options that are not JSON', !!threw2 && /not JSON/.test(threw2), threw2);
  let threw3 = null;
  try { quizKey.build(LOC, []); } catch (e) { threw3 = e.message; }
  ok('  and on a location with no rows at all', !!threw3, threw3);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
