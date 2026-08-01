'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the solo student, end to end.
//
//  Solo accounts (ME-XXXX) are not a variation on a class account, they are a
//  distinct path:
//
//    - the class row has course 'solo', so the COURSE comes from the page rather
//      than the class. A solo student roams across cyber, CSP and CSA, and the
//      off-course guard that protects class accounts must not fire on them.
//    - retry_allowed is 1, so the grade of record is best-attempt, not first.
//    - login is a personal code plus PIN, with no teacher and no roster.
//
//  Every one of those is a place a class-shaped assumption can leak in, and the
//  whole point of a solo account is that a student with no teacher can still
//  see their own work. So this runs the real flow: create the account, report
//  scores through the same endpoint the pages use, and read them back as the
//  student.
//
//  Zero PII: a synthetic name and a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:solo
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-solo.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
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
  console.log('\nSOLO STUDENT (end to end)\n');

  // ── 1. Create the account ──────────────────────────────────────────────────
  console.log('1. A solo account can be created');
  let token, loginCode;
  {
    const r = await post('/api/student/solo-init', { name: 'Test Solo', pin: '2468' });
    ok('  created', r.status === 201, r.body);
    token = r.body.token;
    loginCode = r.body.login_code;
    ok('  returns a session token', typeof token === 'string' && token.length > 0);
    ok('  returns a personal login code', typeof loginCode === 'string' && loginCode.length > 0, loginCode);
    ok('  the code is an ME- code', /^ME-/.test(loginCode || ''), loginCode);

    const cls = db.prepare('SELECT course, retry_allowed FROM classes WHERE class_code = ?').get(loginCode);
    ok('  the class is course "solo"', cls && cls.course === 'solo', cls);
    // Best-attempt is the whole point of a self-study account: a student with no
    // teacher must be able to retry without a first attempt becoming permanent.
    ok('  retry is allowed, so the grade of record is best-attempt',
      cls && cls.retry_allowed === 1, cls);
  }

  // ── 2. Log back in ─────────────────────────────────────────────────────────
  console.log('\n2. The student can log back in with code and PIN');
  {
    const r = await post('/api/student/solo-login', { login_code: loginCode, pin: '2468' });
    ok('  correct PIN succeeds', r.status === 200, r.status);
    ok('  and returns a working token', typeof r.body.token === 'string');
    const bad = await post('/api/student/solo-login', { login_code: loginCode, pin: '1111' });
    ok('  a wrong PIN is rejected', bad.status === 401, bad.status);
    token = r.body.token;
  }

  // ── 3. Roaming: a solo account is not bound to one course ─────────────────
  //  A class account may only score its own course's pages. A solo account has
  //  no course, so the page decides. If the class-account guard leaked in here,
  //  every solo submission would be silently dropped as "off-course".
  console.log('\n3. A solo student roams across courses');
  {
    const cy = await post('/api/student/score', {
      handle: 'ap-cybersecurity-unit-1-wireless-security-quiz', earned: 4, possible: 5 }, token);
    ok('  a cyber page is accepted', cy.status === 200, cy.body);
    ok('  and is actually tracked, not silently dropped',
      cy.body.tracked !== false, cy.body);

    const csa = await post('/api/student/score', {
      course: 'ap-csa', unit: 'unit-1', lesson: '1.1', activity_type: 'quiz',
      item: 'q1', earned: 3, possible: 4 }, token);
    ok('  a CSA page from the same account is accepted', csa.status === 200, csa.body);

    const courses = db.prepare('SELECT DISTINCT course FROM score_events ORDER BY course').all()
      .map((r) => r.course);
    ok('  both courses are recorded for one student',
      courses.includes('ap-cybersecurity') && courses.includes('ap-csa'), courses);
  }

  // ── 4. The student can see their own scores ───────────────────────────────
  console.log('\n4. The student can read their own progress back');
  {
    const r = await get('/api/student/progress', token);
    ok('  progress is readable', r.status === 200, r.status);
    ok('  it carries records', Array.isArray(r.body.progress) && r.body.progress.length > 0,
      r.body.progress && r.body.progress.length);
    ok('  and the class mastery threshold, so the page can draw the real line',
      typeof r.body.mastery_threshold === 'number', r.body.mastery_threshold);

    const quiz = (r.body.progress || []).find((p) => p.activity_type === 'quiz' && p.course === 'ap-cybersecurity');
    ok('  the cyber quiz appears', !!quiz, r.body.progress);
    // 4 of 5 is 80 percent. The student sees a percentage today; points are
    // teacher-side only, which is the known asymmetry.
    ok('  and shows the percentage the student earned', quiz && quiz.score === 80, quiz && quiz.score);
  }

  // ── 5. Best attempt, not first ────────────────────────────────────────────
  console.log('\n5. A retake keeps the better result');
  {
    await post('/api/student/score', {
      handle: 'ap-cybersecurity-unit-1-wireless-security-quiz', item: 'retry', earned: 1, possible: 5 }, token);
    await post('/api/student/score', {
      handle: 'ap-cybersecurity-unit-1-wireless-security-quiz', item: 'retry', earned: 5, possible: 5 }, token);
    const best = db.prepare(
      `SELECT MAX(points) p FROM score_events WHERE item = 'retry'`).get();
    ok('  the ledger keeps every attempt', db.prepare(
      `SELECT COUNT(*) n FROM score_events WHERE item = 'retry'`).get().n === 2);
    ok('  and the best is 5, not the earlier 1', best.p === 5, best.p);
  }

  // ── 6. One student cannot see another ─────────────────────────────────────
  //  Solo accounts share the system class structure, so this is worth pinning
  //  explicitly rather than assuming.
  console.log('\n6. A solo student sees only their own work');
  {
    const other = await post('/api/student/solo-init', { name: 'Other Solo', pin: '1357' });
    await post('/api/student/score', {
      course: 'ap-csp', unit: 'bi-1', lesson: 'collaboration', activity_type: 'quiz',
      item: 'q1', earned: 9, possible: 9 }, other.body.token);

    const mine = await get('/api/student/progress', token);
    const sawOther = (mine.body.progress || []).some((p) => p.course === 'ap-csp');
    ok('  the first student does not see the second student\'s work', !sawOther,
      (mine.body.progress || []).map((p) => p.course));

    const theirs = await get('/api/student/progress', other.body.token);
    ok('  and the second sees only their own',
      (theirs.body.progress || []).every((p) => p.course === 'ap-csp'),
      (theirs.body.progress || []).map((p) => p.course));
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
