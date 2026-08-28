'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: operator view of the availability gates
//
//  This suite exists because of a real support ticket. A teacher reported that
//  his students had finished Exercise 1 and Exercise 2 but the quiz was still
//  greyed out, and nobody could answer him without opening the database, because
//  the only gate listing was behind that teacher's own login.
//
//  So the first assertion here is the SHAPE OF THE SYMPTOM, not the endpoint: a
//  class whose quiz_lock_default is 1 leaves the exercises open and closes only
//  the quiz. "Exercises work, quiz is locked" is what a locked class is SUPPOSED
//  to look like. Pinning that down matters more than the endpoint does, because
//  the expensive part of that ticket was three plausible theories about
//  reporters and network filtering for a symptom the gate already explained.
//
//  Then the endpoint: it must report open, closed, and the reason, and it must
//  agree with what routes/quiz.js actually serves the student. The two are
//  cross-checked against each other here rather than asserted separately, since
//  an operator view that quietly disagrees with the render path is worse than no
//  operator view at all.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real routers mounted in process on an ephemeral port, no network
//  and no live server. tests.yml derives its suite list from package.json.
//
//  Zero PII: synthetic teacher, class, and student; numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:admingates
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-admin-gates.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// Must be set before routes/admin.js is required: requireAdmin reads it per
// request, but the length floor is the thing under test here, not the value.
const ADMIN_KEY = 'smoke-admin-key-0123456789abcdef';
process.env.ADMIN_KEY = ADMIN_KEY;

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const { seedQuizBank } = require('../scripts/seed-quiz-bank');

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
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const admin = (url, key) => fetch(base() + url, {
  headers: key === null ? {} : { 'x-admin-key': key || ADMIN_KEY },
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
     VALUES ('c1','t1','CYBER-OPS','Ops Test',?,1,80,1,'all')`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });
const CODE = 'CYBER-OPS';

const at = (list, lesson, type) =>
  list.find((a) => a.lesson === lesson && a.activity_type === type);

(async () => {
  seedQuizBank();

  // ── 1) The endpoint is behind the same fail-closed auth as the rest ────────
  let r = await admin(`/api/admin/class/${CODE}/gates`, null);
  ok('no admin key is refused', r.status === 403, r.status);
  r = await admin(`/api/admin/class/${CODE}/gates`, 'wrong-key-but-long-enough-here');
  ok('wrong admin key is refused', r.status === 403, r.status);

  // ── 2) An untouched class reads as fully open ──────────────────────────────
  r = await admin(`/api/admin/class/${CODE}/gates`);
  ok('untouched class: 200', r.status === 200, r.status);
  ok('untouched class: resolves by class code', r.body && r.body.class.class_code === CODE, r.body && r.body.class);
  ok('untouched class: quiz_lock_default reported as 0', r.body && r.body.class.quiz_lock_default === 0);
  ok('untouched class: nothing closed', r.body && r.body.counts.closed === 0, r.body && r.body.counts);
  ok('untouched class: activities were found at all', r.body && r.body.counts.activities > 0, r.body && r.body.counts);
  ok('untouched class: reason is the open default',
    r.body && at(r.body.activities, '1.1', 'quiz').reason === 'class-default-open',
    r.body && at(r.body.activities, '1.1', 'quiz'));

  // Resolvable by internal id as well, the same as the gradebook routes.
  r = await admin('/api/admin/class/c1/gates');
  ok('resolves by internal class id too', r.status === 200 && r.body.class.id === 'c1', r.status);

  // ── 3) THE REPORTED SYMPTOM: lock the class, exercises stay open ───────────
  //  This is the assertion the support ticket was actually about.
  r = await call('PUT', `/api/teacher/classes/${CODE}`, { quiz_lock_default: 1 }, TT);
  ok('class flipped to locked-by-default', r.body && r.body.class.quiz_lock_default === 1, r.body);

  r = await admin(`/api/admin/class/${CODE}/gates`);
  const acts = r.body.activities;
  const quizzes = acts.filter((a) => a.activity_type === 'quiz');
  const practice = acts.filter((a) => a.activity_type !== 'quiz' && a.activity_type !== 'exam');

  ok('locked class: every quiz reads closed',
    quizzes.length > 0 && quizzes.every((a) => a.open === false), quizzes.map((a) => [a.lesson, a.open]));
  ok('locked class: every quiz gives the class default as the reason',
    quizzes.every((a) => a.reason === 'class-default-locked'));
  ok('locked class: no practice activity is swept up',
    practice.every((a) => a.open === true), practice.map((a) => [a.lesson, a.activity_type, a.open]));
  ok('locked class: closed_activities lists exactly the closed ones',
    r.body.closed_activities.length === quizzes.length
      && r.body.counts.closed === quizzes.length, r.body.counts);

  // ── 4) The operator view matches what the student is actually served ───────
  //  Cross-checked rather than asserted twice: this is the only thing that keeps
  //  the two from drifting apart.
  for (const a of acts.filter((x) => x.activity_type === 'quiz').slice(0, 3)) {
    const served = await call('GET', `/api/quiz/${COURSE}/${UNIT}/${a.lesson}/quiz`, null, ST);
    ok(`operator and render path agree on ${a.lesson} quiz (both locked)`,
      served.body.locked === !a.open && served.body.reason === a.reason,
      { operator: [a.open, a.reason], render: [served.body.locked, served.body.reason] });
  }

  // ── 5) An explicit open row is reported as explicit, not as the default ────
  r = await call('POST', `/api/teacher/classes/${CODE}/gate`,
    { course: COURSE, unit: UNIT, lesson: '1.1', activity_type: 'quiz', open: true }, TT);
  ok('teacher opened the 1.1 quiz', r.body && r.body.open === true, r.body);

  r = await admin(`/api/admin/class/${CODE}/gates`);
  const q11 = at(r.body.activities, '1.1', 'quiz');
  const q12 = at(r.body.activities, '1.2', 'quiz');
  ok('opened activity reads open with the explicit reason',
    q11.open === true && q11.reason === 'explicit-open', q11);
  ok('opened activity records that a row exists', q11.explicit_row === 'open', q11);
  ok('its neighbour is untouched and still closed',
    q12.open === false && q12.reason === 'class-default-locked' && q12.explicit_row === null, q12);

  const after = await call('GET', `/api/quiz/${COURSE}/${UNIT}/1.1/quiz`, null, ST);
  ok('render path agrees the 1.1 quiz reopened', after.body.locked === false, after.body.locked);

  // ── 6) A course the class is not enrolled in is self-study, not locked ─────
  //  Mirrors routes/quiz.js: gating another course's practice would lock a
  //  student out of work their teacher never intended to control.
  r = await admin(`/api/admin/class/${CODE}/gates?course=ap-csa`);
  ok('other course: reported against the requested course',
    r.status === 200 && r.body.course_checked === 'ap-csa', r.body && r.body.course_checked);
  ok('other course: nothing reads as locked',
    r.body.activities.every((a) => a.open === true), r.body.counts);

  // ── 7) Unknown class is a clean 404, not a 500 ─────────────────────────────
  r = await admin('/api/admin/class/CYBER-NOPE/gates');
  ok('unknown class returns 404', r.status === 404, r.status);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
