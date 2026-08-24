'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a teacher with real classes and students, end to end.
//
//  The counterpart to smoke:solo. Where a solo account roams across courses and
//  keeps its best attempt, a CLASS account is the opposite on both counts, and
//  those opposites are exactly where a shared code path can go wrong:
//
//    - a class account is COURSE LOCKED. Scoring a page from another course must
//      be refused. If the solo roaming rule leaked the other way, a cyber
//      student's CSP work would silently land in their cyber gradebook.
//    - retry_allowed defaults to 0, so the FIRST attempt is the grade of record.
//      A solo account keeps the best. Getting this backwards either freezes a
//      student out of improving or quietly lets them retry past a locked grade.
//
//  And the property no gradebook may ever violate: one teacher must never see
//  another teacher's class. Every teacher route is scoped by teacher_id, so that
//  is a property of the queries rather than of the data model, which is
//  precisely why it needs a test rather than an assumption.
//
//  Runs the real flow: register a teacher, create a class per course, have
//  students join with the class code, report scores through the same endpoint
//  the pages use, and read the gradebook back as the teacher.
//
//  Zero PII: synthetic names and throwaway PINs, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:classroom
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-classroom.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
// The authored denominators are seeded on boot in production. This fixture
// mounts the routers directly, so seed them here: without it the denominator
// map is legitimately empty and the assertion below would be testing nothing.
require('../scripts/seed-cyber-denominators').seedCyberDenominators();

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' },
    tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

(async () => {
  console.log('\nTEACHER CLASSROOM (end to end)\n');

  // ── 1. Register the teacher ────────────────────────────────────────────────
  console.log('1. A teacher can register and log in');
  let tok;
  {
    const r = await post('/api/teacher/register',
      { email: 'smoke.teacher@example.org', password: 'a-long-enough-password', name: 'Smoke Teacher' });
    ok('  registered', r.status === 201, r.body);
    tok = r.body.token;

    const dupe = await post('/api/teacher/register',
      { email: 'smoke.teacher@example.org', password: 'another-password', name: 'Impostor' });
    ok('  the same email cannot register twice', dupe.status === 409, dupe.status);

    const login = await post('/api/teacher/login',
      { email: 'smoke.teacher@example.org', password: 'a-long-enough-password' });
    ok('  can log back in', login.status === 200, login.status);
    const bad = await post('/api/teacher/login',
      { email: 'smoke.teacher@example.org', password: 'wrong' });
    ok('  a wrong password is rejected', bad.status === 401, bad.status);
  }

  // ── 2. One class per course ────────────────────────────────────────────────
  console.log('\n2. A class per course, each with the right code prefix');
  const cls = {};
  {
    for (const [course, prefix] of [['ap-cybersecurity', 'CYBER'], ['ap-csp', 'CSP'], ['ap-csa', 'CSA']]) {
      const r = await post('/api/teacher/classes', { class_name: 'Period 1 ' + course, course }, tok);
      ok(`  created a ${course} class`, r.status === 201, r.body);
      cls[course] = r.body.class;
      ok(`    code is prefixed ${prefix}`, (r.body.class.class_code || '').startsWith(prefix + '-'),
        r.body.class && r.body.class.class_code);
    }
    ok('  every class defaults to first-attempt-of-record',
      Object.values(cls).every((c) => c.retry_allowed === 0),
      Object.values(cls).map((c) => c.retry_allowed));
    ok('  and to an 80 percent mastery bar',
      Object.values(cls).every((c) => c.mastery_threshold === 80));

    const bogus = await post('/api/teacher/classes', { class_name: 'Nope', course: 'ap-underwater-basketweaving' }, tok);
    ok('  an unknown course is refused', bogus.status === 400, bogus.status);
  }

  // ── 3. Students join ───────────────────────────────────────────────────────
  //  One student, three courses, ONE name and PIN. The first class is a signup;
  //  the rest are added to the account that signup created, which is why they go
  //  through /enroll and not a second /join. Joining again with the same name
  //  and PIN is now refused on purpose: /join cannot tell "the same kid adding a
  //  course" from "a different kid who picked the same four digits", and quietly
  //  merging the second case would put two students in one gradebook. See the
  //  name_pin_taken branch in routes/student.js.
  console.log('\n3. Students join each class with its code');
  const stu = {};
  {
    let first = true;
    let accountToken = null;
    for (const course of Object.keys(cls)) {
      const r = first
        ? await post('/api/student/join',
          { class_code: cls[course].class_code, display_name: 'Avery', pin: '1234' })
        : await post('/api/student/enroll', { class_code: cls[course].class_code }, accountToken);
      ok(`  a student joined the ${course} class`, r.status === 201, r.body);
      ok('    and is told the course', r.body.class && r.body.class.course === course, r.body.class);
      stu[course] = r.body.token;
      if (first) { accountToken = r.body.token; first = false; }
    }

    // The refusal itself, stated once here because this suite is where the
    // whole-classroom flow is read.
    const reJoin = await post('/api/student/join',
      { class_code: cls['ap-csp'].class_code, display_name: 'Avery', pin: '1234' });
    ok('  the same name and PIN cannot sign up twice', reJoin.status === 409, reJoin.status);

    const dupe = await post('/api/student/join',
      { class_code: cls['ap-csp'].class_code, display_name: 'avery', pin: '9999' });
    ok('  a duplicate name in the same class is refused', dupe.status === 409, dupe.status);

    const badPin = await post('/api/student/join',
      { class_code: cls['ap-csp'].class_code, display_name: 'Blake', pin: '12' });
    ok('  a non-4-digit PIN is refused', badPin.status === 400, badPin.status);

    const noClass = await post('/api/student/join',
      { class_code: 'CYBER-NOPE', display_name: 'Blake', pin: '1234' });
    ok('  an unknown class code is refused', noClass.status === 404, noClass.status);
  }

  // ── 4. A class account is COURSE LOCKED ────────────────────────────────────
  //  The opposite of a solo account. If solo's roaming rule leaked here, a cyber
  //  student's CSP work would silently land in their cyber gradebook.
  console.log('\n4. A class student is locked to their own course');
  {
    const own = await post('/api/student/score', {
      handle: 'ap-cybersecurity-unit-1-wireless-security-quiz', earned: 4, possible: 5 }, stu['ap-cybersecurity']);
    ok('  their own course is accepted', own.status === 200 && own.body.tracked !== false, own.body);

    const other = await post('/api/student/score', {
      course: 'ap-csp', unit: 'bi-1', lesson: 'collaboration', activity_type: 'quiz',
      item: 'q1', earned: 9, possible: 9 }, stu['ap-cybersecurity']);
    ok('  another course is NOT tracked', other.body.tracked === false, other.body);
    ok('    and says why', other.body.reason === 'off-course page', other.body);

    const leaked = db.prepare(
      `SELECT COUNT(*) n FROM score_events WHERE course = 'ap-csp' AND class_id = ?`
    ).get(cls['ap-cybersecurity'].id).n;
    ok('    so nothing leaked into the cyber class', leaked === 0, leaked);
  }

  // ── 5. The teacher sees the gradebook ──────────────────────────────────────
  console.log('\n5. The teacher reads their own gradebook');
  {
    await post('/api/student/score', {
      handle: 'ap-cybersecurity-unit-1-social-engineering-exercise-1', earned: 7, possible: 7 },
      stu['ap-cybersecurity']);

    const r = await get(`/api/teacher/classes/${cls['ap-cybersecurity'].class_code}/progress`, tok);
    ok('  the gradebook loads', r.status === 200, r.status);
    ok('  the roster has the student', (r.body.summary || []).length === 1, (r.body.summary || []).length);
    ok('  it carries the authored denominator map', !!r.body.denominators && Object.keys(r.body.denominators).length > 0);

    const d = r.body.summary[0].detail;
    const quiz = d['unit-1'] && d['unit-1']['1.3'] && d['unit-1']['1.3'].quiz;
    ok('  the quiz shows 4 of 5', quiz && quiz.points_earned === 4 && quiz.points_possible === 5, quiz);

    const ex = d['unit-1'] && d['unit-1']['1.1'] && d['unit-1']['1.1']['exercise-1'];
    ok('  the exercise shows 7 of 7, not 5', ex && ex.points_earned === 7 && ex.points_possible === 7, ex);
  }

  // ── 6. First attempt is the grade of record ────────────────────────────────
  //  retry_allowed defaults to 0. A solo account keeps its BEST attempt; a class
  //  account keeps its FIRST unless the teacher opens retries.
  console.log('\n6. Retries are closed by default, and the teacher can open them');
  {
    const locked = await post('/api/student/quiz', {
      course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.3', score: 40 }, stu['ap-cybersecurity']);
    ok('  a first quiz submission is accepted', locked.status === 200, locked.body);

    const r = await fetch(`${base()}/api/teacher/classes/${cls['ap-cybersecurity'].class_code}/retry`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ retry_allowed: 1 }),
    });
    ok('  the teacher can open retries', r.ok, r.status);
    const after = db.prepare('SELECT retry_allowed FROM classes WHERE id = ?').get(cls['ap-cybersecurity'].id);
    ok('    and it sticks', after.retry_allowed === 1, after);
  }

  // ── 7. One teacher never sees another's class ──────────────────────────────
  //  Every teacher route is scoped by teacher_id, so this is a property of the
  //  queries, not the schema. That is exactly why it needs pinning.
  console.log('\n7. A teacher cannot reach another teacher\'s class');
  {
    const other = await post('/api/teacher/register',
      { email: 'other.teacher@example.org', password: 'a-long-enough-password', name: 'Other Teacher' });
    const otherTok = other.body.token;

    const peek = await get(`/api/teacher/classes/${cls['ap-cybersecurity'].class_code}/progress`, otherTok);
    ok('  reading another teacher\'s gradebook fails', peek.status === 404 || peek.status === 403, peek.status);

    const del = await fetch(`${base()}/api/teacher/classes/${cls['ap-csa'].class_code}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + otherTok },
    });
    ok('  deleting another teacher\'s class fails', del.status === 404 || del.status === 403, del.status);
    ok('    and the class still exists',
      !!db.prepare('SELECT id FROM classes WHERE id = ?').get(cls['ap-csa'].id));

    const theirs = await get('/api/teacher/classes', otherTok);
    ok('  their class list is empty', (theirs.body.classes || []).length === 0,
      (theirs.body.classes || []).length);

    const mine = await get('/api/teacher/classes', tok);
    ok('  and the first teacher still sees all three', (mine.body.classes || []).length === 3,
      (mine.body.classes || []).length);
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
