'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: one account across courses, and clickable assignment links.
//
//  Two features, one suite, because they meet on the same student view.
//
//  WHY THE ACCOUNT HALF NEEDS A TEST WITH TEETH
//  A student row is per class, so "the same student" spanning courses is an
//  inference, and the two ways it can be wrong are both silent:
//
//    - MERGING TOO EAGERLY. If two different students who both picked 'Avery'
//      and the same four digits end up on one account, each one's course
//      switcher lists the other's classes and a wrong click hands them the
//      wrong gradebook. Nothing errors. Section 2 asserts the join is REFUSED.
//
//    - MINTING A TOKEN FOR A CLASS THAT IS NOT YOURS. /switch takes a class code
//      from the client, so section 4 hands it one belonging to somebody else and
//      requires a 404 rather than a token.
//
//  WHY THE LINK HALF NEEDS ONE
//  A link that points at the wrong lesson is worse than no link: the student
//  does the wrong work and the grade never moves. Derived handles are therefore
//  round-tripped through pageFromHandle, and section 5 checks that a learned
//  handle (a page a student actually stood on) beats a derived guess.
//
//  Zero PII: synthetic names, throwaway PINs, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:accounts
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-student-accounts.db');
process.env.JWT_SECRET = 'smoke-student-accounts-secret-long-enough';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const section = (t) => console.log('\n' + t);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

// Two real classes on two different courses, which is the whole scenario.
const TEACHER = newId();
function makeClass(code, course, name) {
  const id = newId();
  db.prepare(`INSERT INTO classes (id, teacher_id, class_code, class_name, course, active)
              VALUES (?, ?, ?, ?, ?, 1)`).run(id, TEACHER, code, name, course);
  return id;
}

(async () => {
  console.log('\nSTUDENT ACCOUNTS + ASSIGNMENT LINKS\n');

  db.prepare(`INSERT INTO teachers (id, email, name, password_hash, verified)
              VALUES (?, 'smoke-accounts@system.invalid', 'Smoke', 'x', 1)`).run(TEACHER);
  makeClass('CSA-SMK1', 'ap-csa', 'Period 1 CSA');
  makeClass('CYBER-SMK1', 'ap-cybersecurity', 'Period 3 Cyber');
  makeClass('CSP-SMK1', 'ap-csp', 'Period 5 CSP');

  // ── 1. Joining once, then adding a course ──────────────────────────────────
  section('1. One name and PIN reaches more than one course');

  const joined = await post('/api/student/join', {
    class_code: 'CSA-SMK1', display_name: 'Avery Smoke', pin: '1379',
  });
  ok('1.1 the first class is joined', joined.status === 201 && !!joined.body.token, joined.body);

  const token1 = joined.body.token;
  const added = await post('/api/student/enroll', { class_code: 'CYBER-SMK1' }, token1);
  ok('1.2 a second course is added with no name or PIN retyped',
    added.status === 201 && added.body.class.course === 'ap-cybersecurity', added.body);
  ok('1.3 the new class carries the same name', added.body.student && added.body.student.name === 'Avery Smoke', added.body);

  const enr = await get('/api/student/enrollments', token1);
  const codes = (enr.body.enrollments || []).map((e) => e.class_code).sort();
  ok('1.4 both courses list under the one account',
    JSON.stringify(codes) === JSON.stringify(['CSA-SMK1', 'CYBER-SMK1']), codes);
  ok('1.5 exactly one of them is marked current',
    (enr.body.enrollments || []).filter((e) => e.current).length === 1, enr.body);

  // The same PIN really does open the second class from a cold sign-in, which is
  // the promise a student is actually making use of.
  const relog = await post('/api/student/login', {
    class_code: 'CYBER-SMK1', display_name: 'Avery Smoke', pin: '1379',
  });
  ok('1.6 the second course signs in with the original PIN', relog.status === 200 && !!relog.body.token, relog.body);
  ok('1.7 sign-in returns the whole account, not just this class',
    (relog.body.enrollments || []).length === 2, relog.body.enrollments);

  const wrongPin = await post('/api/student/login', {
    class_code: 'CYBER-SMK1', display_name: 'Avery Smoke', pin: '2468',
  });
  ok('1.8 the wrong PIN is still refused on the added course', wrongPin.status === 401, wrongPin.body);

  // ── 2. The collision that would merge two different students ───────────────
  section('2. A name and PIN cannot belong to two people');

  const collide = await post('/api/student/join', {
    class_code: 'CSP-SMK1', display_name: 'Avery Smoke', pin: '1379',
  });
  ok('2.1 a second signup on the same name AND PIN is refused', collide.status === 409, collide.body);
  ok('2.2 it is refused as a name/PIN clash, not a roster clash',
    collide.body.code === 'name_pin_taken', collide.body);
  ok('2.3 the message asks for a different name or PIN',
    /pin/i.test(collide.body.error || '') && /name/i.test(collide.body.error || ''), collide.body.error);
  ok('2.4 it offers the signed-in route instead', collide.body.add_existing === true, collide.body);
  ok('2.5 it names nobody: no class, code, or course from the other account',
    !/CSA-SMK1|CYBER-SMK1|Period/i.test(JSON.stringify(collide.body)), collide.body);

  // Same name, DIFFERENT PIN is a different student and must go through.
  const sameName = await post('/api/student/join', {
    class_code: 'CSP-SMK1', display_name: 'Avery Smoke', pin: '8642',
  });
  ok('2.6 the same name with a different PIN is a different student, and joins',
    sameName.status === 201, sameName.body);

  const otherEnr = await get('/api/student/enrollments', sameName.body.token);
  ok('2.7 that student sees only their own class',
    JSON.stringify((otherEnr.body.enrollments || []).map((e) => e.class_code)) === JSON.stringify(['CSP-SMK1']),
    otherEnr.body.enrollments);

  // ── 3. Switching ───────────────────────────────────────────────────────────
  section('3. Switching courses');

  const sw = await post('/api/student/switch', { class_code: 'CYBER-SMK1' }, token1);
  ok('3.1 a token is issued for the other enrollment',
    sw.status === 200 && sw.body.class.code === 'CYBER-SMK1', sw.body);

  const me = await get('/api/student/me', sw.body.token);
  ok('3.2 the new token really is scoped to that class',
    me.status === 200 && me.body.class.class_code === 'CYBER-SMK1', me.body);

  // ── 4. Switching is not a way into someone else's class ────────────────────
  section('4. A class code alone opens nothing');

  const steal = await post('/api/student/switch', { class_code: 'CSP-SMK1' }, token1);
  ok('4.1 a class this account is not in is refused', steal.status === 404, steal.body);
  ok('4.2 no token comes back with the refusal', !steal.body.token, steal.body);

  const noAuth = await post('/api/student/switch', { class_code: 'CYBER-SMK1' });
  ok('4.3 an unauthenticated switch is refused', noAuth.status === 401, noAuth.body);

  // ── 5. Assignment links ────────────────────────────────────────────────────
  section('5. A score links back to its page');

  const links = require('../lib/lesson-links');

  // Derived, and verified against pageFromHandle in both directions.
  const csp = links.resolve('ap-csp', 'bi-3', 'iteration', 'quiz');
  ok('5.1 a CSP quiz derives its own page',
    csp && csp.kind === 'page' && /ap-csp-course-bi3-iteration-quiz$/.test(csp.handle), csp);

  const cyber = links.resolve('ap-cybersecurity', 'unit-1', '1.2', 'exercise-1');
  ok('5.2 a cyber exercise derives its own page',
    cyber && cyber.kind === 'page' && /ap-cyber-unit-1-lesson-2-exercise-1$/.test(cyber.handle), cyber);

  // CSA handles carry a title slug the lesson id does not hold, so nothing can
  // be derived and the honest answer is the unit hub, LABELLED as one.
  const csaBefore = links.resolve('ap-csa', 'unit-1', '1.4', 'quiz');
  ok('5.3 an unknown CSA page falls back to the unit, and says so',
    csaBefore && csaBefore.kind === 'unit', csaBefore);

  // Now teach it the page, the way /track does.
  links.learn({ course: 'ap-csa', unit: 'unit-1', lesson: '1.4', activity_type: 'quiz' },
    'ap-csa-lesson-1-4-calling-methods-quiz');
  const csaAfter = links.resolve('ap-csa', 'unit-1', '1.4', 'quiz');
  ok('5.4 a page a student actually visited beats a guess',
    csaAfter && csaAfter.kind === 'page' && csaAfter.handle === 'ap-csa-lesson-1-4-calling-methods-quiz', csaAfter);
  ok('5.5 the link is a real page URL', /^https?:\/\/[^ ]+\/pages\/ap-csa-lesson-1-4/.test(csaAfter.url), csaAfter.url);

  // A rule that drifts from pageFromHandle must produce NO link rather than a
  // confident wrong one. intro-java has no derivable form and no hub here.
  ok('5.6 an underivable course with no hub links to nothing',
    links.resolve('intro-java', 'unit-1', '1.1', 'lesson') === null);

  // ── 6. The student view carries the links ──────────────────────────────────
  section('6. My Progress gets the link with the score');

  const track = await post('/api/student/track', { handle: 'ap-cyber-unit-1-lesson-2' }, sw.body.token);
  ok('6.1 a tracked page is recorded', track.status === 200 && track.body.tracked === true, track.body);

  const learned = db.prepare(
    "SELECT handle FROM page_links WHERE course='ap-cybersecurity' AND lesson='1.2' AND activity_type='lesson'"
  ).get();
  ok('6.2 tracking taught the map where that lesson lives',
    learned && learned.handle === 'ap-cyber-unit-1-lesson-2', learned);

  const prog = await get('/api/student/progress', sw.body.token);
  const row = (prog.body.progress || []).find((r) => r.lesson === '1.2');
  ok('6.3 the progress row carries a url', !!(row && row.url), row);
  ok('6.4 and says what kind of link it is', row && row.url_kind === 'page', row);

  // An unknown handle must not mint a link out of nothing.
  const junk = await post('/api/student/track', { handle: 'some-random-blog-post' }, sw.body.token);
  ok('6.5 an unparseable handle is not learned', junk.body.tracked === false, junk.body);
  const junkRow = db.prepare("SELECT COUNT(*) n FROM page_links WHERE handle = 'some-random-blog-post'").get();
  ok('6.6 and leaves no row behind', junkRow.n === 0, junkRow);

  // ── 7. Nothing new about a minor is stored ─────────────────────────────────
  section('7. Zero PII posture holds');

  const acct = db.prepare('SELECT * FROM student_accounts LIMIT 1').get();
  ok('7.1 an account row holds a folded name and a hash, nothing else',
    Object.keys(acct).sort().join(',') === 'created_at,id,last_active,name_key,pin_hash', Object.keys(acct));
  ok('7.2 the PIN is not stored in the clear', !/1379/.test(JSON.stringify(acct)));

  const linkRow = db.prepare('SELECT * FROM page_links LIMIT 1').get();
  ok('7.3 a page link is a public slug with no student on it',
    !('student_id' in linkRow) && !/student/i.test(Object.keys(linkRow).join(',')), Object.keys(linkRow));

  console.log(`\n──────────────────────────\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
