'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: GET /api/slides/:course/:lessonId, the AP CSP Teacher Bundle
//  slide gate (routes/slides.js).
//
//  The property that matters here is not "does it return 200" but "does an
//  unentitled caller ever receive a real Shopify URL". A client-side
//  show/hide of a link already in the response is not a gate, so every
//  locked-path assertion below scans the raw JSON text for the CDN host,
//  not just the `decks` field, to catch a leak hiding under a different key.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cspslides
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-csp-slide-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/slides', require('../routes/slides'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const CDN_HOST = 'cdn.shopify.com';

const slides = (course, lessonId, tok) => fetch(`${base()}/api/slides/${course}/${lessonId}`, {
  headers: tok ? { Authorization: 'Bearer ' + tok } : {},
}).then(async (r) => {
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) {}
  return { status: r.status, cache: r.headers.get('cache-control'), text, body };
});

function makeTeacher() {
  const id = newId();
  db.prepare("INSERT INTO teachers (id, email, password_hash, name) VALUES (?, ?, 'x', 'T')")
    .run(id, `t-${id}@example.invalid`);
  return { id, email: `t-${id}@example.invalid` };
}
function makeClass(teacherId, course, code) {
  const classId = newId();
  db.prepare('INSERT INTO classes (id, teacher_id, class_code, class_name, course) VALUES (?, ?, ?, ?, ?)')
    .run(classId, teacherId, code, 'Smoke Class', course);
  return classId;
}
function makeStudent(classId, name) {
  const id = newId();
  db.prepare("INSERT INTO students (id, class_id, display_name, pin_hash) VALUES (?, ?, ?, 'x')")
    .run(id, classId, name);
  return id;
}
const grant = (teacherId, course) => db.prepare(
  "INSERT INTO entitlements (id, teacher_id, course, source, status, granted_at) VALUES (?, ?, ?, 'manual', 'active', datetime('now'))"
).run(newId(), teacherId, course);

(async () => {
  console.log('\nCSP TEACHER BUNDLE SLIDE GATE\n');

  const paidTeacher = makeTeacher();
  grant(paidTeacher.id, 'ap-csp');
  const paidTeacherTok = signTeacherToken(paidTeacher);

  const freeTeacher = makeTeacher();
  const freeTeacherTok = signTeacherToken(freeTeacher);

  const paidClassId = makeClass(paidTeacher.id, 'ap-csp', 'CSP-PAID');
  const paidStudentId = makeStudent(paidClassId, 'Paid Kid');
  const paidStudentTok = signStudentToken({ id: paidStudentId, class_id: paidClassId, display_name: 'Paid Kid' }, 'CSP-PAID');

  const freeClassId = makeClass(freeTeacher.id, 'ap-csp', 'CSP-FREE');
  const freeStudentId = makeStudent(freeClassId, 'Free Kid');
  const freeStudentTok = signStudentToken({ id: freeStudentId, class_id: freeClassId, display_name: 'Free Kid' }, 'CSP-FREE');

  // A teacher entitled for a DIFFERENT course must not unlock CSP.
  const wrongCourseTeacher = makeTeacher();
  grant(wrongCourseTeacher.id, 'ap-csa');
  const wrongCourseTeacherTok = signTeacherToken(wrongCourseTeacher);

  console.log('1. Unknown course and unknown lesson both 404, never a leak');
  {
    // THIS EXAMPLE IS DERIVED, AND IT TOOK TWO STALENESSES TO GET THERE.
    // It was 'ap-csa' until board task 183 gave that course a manifest, then
    // 'ap-networking' until that course got one too. Same trap both times, the
    // one this repo already learned porting cyber
    // (docs/runs/2026-08-25-claude-code-cyber-slide-gate.md): a course string
    // baked in as "the unsupported one" goes stale the moment that course is
    // wired, and a stale example stops testing what it claims to.
    //
    // The comment that used to sit here named that hazard precisely and then
    // picked another literal anyway, which is why it sprang a second time. So
    // pick nothing. Ask the registry which courses it serves and use a real
    // course that is not one of them. This repairs itself the next time a
    // course is wired. The only way it can go stale now is every course in the
    // repo gaining a manifest, and the fallback turns that into an honest
    // synthetic 404 rather than a silent pass.
    const wired = new Set(require('../config/slide-manifests').COURSE_KEYS);
    const unsupported = require('../lib/entitlements').VALID_COURSES.find((c) => !wired.has(c))
      || 'ap-course-with-no-manifest';
    const r1 = await slides(unsupported, '1-1', paidTeacherTok);
    ok(`  unsupported course (${unsupported}) -> 404`, r1.status === 404, r1);
    ok('  unsupported course response has no CDN url', !r1.text.includes(CDN_HOST), r1.text);

    const r2 = await slides('ap-csp', '9-9', paidTeacherTok);
    ok('  unknown lesson -> 404', r2.status === 404, r2);
  }

  console.log('2. Anonymous and unentitled callers get the free overview, never real URLs');
  {
    const anon = await slides('ap-csp', '1-2', null);
    ok('  anonymous: 200', anon.status === 200, anon);
    ok('  anonymous: locked', anon.body && anon.body.locked === true, anon.body);
    ok('  anonymous: decks is null', anon.body && anon.body.decks === null, anon.body);
    ok('  anonymous: overview still reports day count', anon.body && anon.body.days === 2, anon.body);
    ok('  anonymous: no CDN url anywhere in the payload', !anon.text.includes(CDN_HOST), anon.text);
    ok('  anonymous: never cached', anon.cache === 'no-store', anon.cache);

    const junk = await slides('ap-csp', '1-2', 'not-a-real-token');
    ok('  garbage token: still locked, not a 500', junk.status === 200 && junk.body.locked === true, junk);

    const freeTeacherResp = await slides('ap-csp', '1-2', freeTeacherTok);
    ok('  unpaid teacher: locked', freeTeacherResp.body && freeTeacherResp.body.locked === true, freeTeacherResp.body);
    ok('  unpaid teacher: no CDN url leaks', !freeTeacherResp.text.includes(CDN_HOST), freeTeacherResp.text);

    const freeStudentResp = await slides('ap-csp', '1-2', freeStudentTok);
    ok('  unpaid student: locked', freeStudentResp.body && freeStudentResp.body.locked === true, freeStudentResp.body);

    const wrongCourseResp = await slides('ap-csp', '1-2', wrongCourseTeacherTok);
    ok('  entitled for a different course: still locked for csp', wrongCourseResp.body && wrongCourseResp.body.locked === true, wrongCourseResp.body);
  }

  console.log('3. An entitled TEACHER gets every real deck, both variants');
  {
    const r = await slides('ap-csp', '1-2', paidTeacherTok);
    ok('  200, unlocked', r.status === 200 && r.body.locked === false, r.body);
    const decks = r.body.decks || [];
    // 1-2 has 2 days x 2 variants x 2 tracks = 8 decks.
    ok('  8 decks for a 2-day lesson (2 variants x 2 tracks x 2 days)', decks.length === 8, decks.length);
    ok('  includes TEACHER-variant decks', decks.some((d) => d.variant === 'teacher'), decks);
    ok('  includes student-variant decks', decks.some((d) => d.variant === 'student'), decks);
    ok('  every url is a real Shopify CDN pptx link', decks.every((d) => d.url.includes(CDN_HOST) && d.url.endsWith('.pptx')), decks);
    ok('  day 2 is present for a 2-day lesson', decks.some((d) => d.day === 2), decks);
  }

  console.log('4. An entitled STUDENT gets student decks only, never the teacher variant');
  {
    const r = await slides('ap-csp', '1-2', paidStudentTok);
    ok('  200, unlocked', r.status === 200 && r.body.locked === false, r.body);
    const decks = r.body.decks || [];
    ok('  4 decks (student variant x 2 tracks x 2 days)', decks.length === 4, decks.length);
    ok('  no TEACHER-variant deck reaches a student', decks.every((d) => d.variant === 'student'), decks);
    ok('  answer-key/teacher filenames never appear in the raw response', !r.text.includes('_TEACHER_'), r.text);
  }

  console.log('5. A single-day lesson reports one day and 4 decks when unlocked');
  {
    const r = await slides('ap-csp', '1-1', paidTeacherTok);
    ok('  days is 1', r.body.days === 1, r.body.days);
    ok('  4 decks (2 variants x 2 tracks x 1 day)', (r.body.decks || []).length === 4, r.body.decks);
  }

  server.close();
  db.close();

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
