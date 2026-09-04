'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: GET /api/slides/ap-networking/:lessonId, the AP Networking slide gate.
//
//  THIS IS THE PIPE, NOT THE CONTENT, and the distinction matters more here
//  than it did for CSA. All 44 networking decks are authored and finished;
//  they are .pptx in Google Drive and not one has been converted to Google
//  Slides, so config/networking-slide-embeds.js is empty and every lesson
//  resolves zero decks. An entitled caller gets locked:false with an empty
//  decks array, never the upsell. That is the same "wholly unconverted"
//  state smoke/cyber-slide-gate.js section 5 proved correct for cyber's
//  lesson 1-5 and smoke/csa-slide-gate.js asserts for all 53 CSA lessons.
//
//  What this suite actually proves:
//    1. routes/slides.js needed zero course-specific changes to serve
//       ap-networking. The route was read before this was written; this suite
//       is the check that the reading was right, not a repeat of it.
//    2. The 404 is gone for a REASON a teacher cares about. Before this
//       change the course was absent from config/slide-manifests.js, so every
//       lesson 404d before the token was even looked at, and a paying teacher
//       could not tell "not converted yet" from "no such course". Section 1
//       pins that the course now answers and section 5 pins that it answers
//       honestly.
//    3. lib/entitlements.js's existing ap-networking bundle entitlement gates
//       this route exactly as it gates the CSP, cyber and CSA deck gates: an
//       ap-networking grant unlocks ap-networking and nothing else, and no
//       other course's grant unlocks ap-networking.
//    4. The manifest covers all 22 CED topics and refuses topic numbers the
//       framework does not have (no 1-5, no 2-7, no 3-7, no 4-7). The AP
//       Networking framework is 4/6/6/6, and a manifest that answered 200 for
//       a topic College Board does not define would be inventing curriculum.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: node smoke/networking-slide-gate.js
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-networking-slide-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');
const manifest = require('../config/networking-slide-manifest');
const embeds = require('../config/networking-slide-embeds');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/slides', require('../routes/slides'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const GOOGLE_HOST = 'docs.google.com';
const COURSE = 'ap-networking';

// The 22 CED topics, 4/6/6/6. Written out rather than derived from the
// manifest, so that a topic silently vanishing from the manifest fails this
// suite instead of quietly shrinking its own expectation.
const CED_TOPICS = [
  '1-1', '1-2', '1-3', '1-4',
  '2-1', '2-2', '2-3', '2-4', '2-5', '2-6',
  '3-1', '3-2', '3-3', '3-4', '3-5', '3-6',
  '4-1', '4-2', '4-3', '4-4', '4-5', '4-6',
];

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
  console.log('\nAP NETWORKING SLIDE GATE (ALL 22 TOPICS WIRED, NO DECKS CONVERTED)\n');

  const paidTeacher = makeTeacher();
  grant(paidTeacher.id, COURSE);
  const paidTeacherTok = signTeacherToken(paidTeacher);

  const freeTeacher = makeTeacher();
  const freeTeacherTok = signTeacherToken(freeTeacher);

  const paidClassId = makeClass(paidTeacher.id, COURSE, 'NET-PAID');
  const paidStudentId = makeStudent(paidClassId, 'Paid Kid');
  const paidStudentTok = signStudentToken(
    { id: paidStudentId, class_id: paidClassId, display_name: 'Paid Kid' }, 'NET-PAID');

  const freeClassId = makeClass(freeTeacher.id, COURSE, 'NET-FREE');
  const freeStudentId = makeStudent(freeClassId, 'Free Kid');
  const freeStudentTok = signStudentToken(
    { id: freeStudentId, class_id: freeClassId, display_name: 'Free Kid' }, 'NET-FREE');

  // Cross-course isolation, asserted from the networking side of the square.
  const cyberTeacher = makeTeacher();
  grant(cyberTeacher.id, 'ap-cybersecurity');
  const cyberTeacherTok = signTeacherToken(cyberTeacher);

  const csaTeacher = makeTeacher();
  grant(csaTeacher.id, 'ap-csa');
  const csaTeacherTok = signTeacherToken(csaTeacher);

  console.log('1. The course answers at all, which is the regression this file exists for');
  {
    // Before ap-networking was added to config/slide-manifests.js this was a
    // 404 with "Slides are not available for this course yet", fired before
    // the token was inspected. If this assertion ever fails again, the course
    // has been dropped from the registry.
    const r = await slides(COURSE, '1-1', null);
    ok('  ap-networking is a known course (not the registry 404)', r.status === 200, r);
    ok('  the registry-level error string is gone',
       !r.text.includes('not available for this course'), r.text);
  }

  console.log('2. Scope: all 22 CED topics, and no topic the framework does not define');
  {
    ok('  22 lessons wired', manifest.LESSON_IDS.length === 22, manifest.LESSON_IDS.length);
    ok('  every CED topic 1.1-4.6 is present',
       CED_TOPICS.every((l) => manifest.LESSON_IDS.includes(l)), manifest.LESSON_IDS);
    ok('  the manifest holds nothing beyond the 22',
       manifest.LESSON_IDS.every((l) => CED_TOPICS.includes(l)), manifest.LESSON_IDS);
    ok('  every topic reports at least one teaching day',
       CED_TOPICS.every((l) => manifest.dayCount(l) >= 1));

    // The framework is 4/6/6/6. A 200 for any of these would mean the manifest
    // had invented a topic.
    for (const l of ['1-5', '2-7', '3-7', '4-7', '5-1']) {
      const r = await slides(COURSE, l, paidTeacherTok);
      ok(`  topic ${l} is not in the framework -> 404`, r.status === 404, r);
    }
    const r404 = await slides(COURSE, '9-9', paidTeacherTok);
    ok('  unknown lesson -> 404', r404.status === 404, r404);
    ok('  404 body carries no Google url', !r404.text.includes(GOOGLE_HOST), r404.text);
  }

  console.log('3. Anonymous and unentitled callers get the overview, never an embed');
  {
    const anon = await slides(COURSE, '1-1', null);
    ok('  anonymous: 200', anon.status === 200, anon);
    ok('  anonymous: locked', anon.body && anon.body.locked === true, anon.body);
    ok('  anonymous: decks is null', anon.body && anon.body.decks === null, anon.body);
    ok('  anonymous: overview still reports the day count', anon.body && anon.body.days === 3, anon.body);
    ok('  anonymous: ZERO docs.google.com anywhere in the payload',
       !anon.text.includes(GOOGLE_HOST), anon.text);
    ok('  anonymous: never cached', anon.cache === 'no-store', anon.cache);

    const junk = await slides(COURSE, '1-1', 'not-a-real-token');
    ok('  garbage token: locked, not a 500', junk.status === 200 && junk.body.locked === true, junk);

    const ft = await slides(COURSE, '1-1', freeTeacherTok);
    ok('  unpaid teacher: locked', ft.body && ft.body.locked === true, ft.body);

    const fs2 = await slides(COURSE, '1-1', freeStudentTok);
    ok('  student of an unpaid teacher: locked', fs2.body && fs2.body.locked === true, fs2.body);
  }

  console.log('4. Cross-course isolation, both directions');
  {
    const cy = await slides(COURSE, '1-1', cyberTeacherTok);
    ok('  cyber-entitled teacher does NOT unlock ap-networking', cy.body && cy.body.locked === true, cy.body);

    const cs = await slides(COURSE, '1-1', csaTeacherTok);
    ok('  CSA-entitled teacher does NOT unlock ap-networking', cs.body && cs.body.locked === true, cs.body);

    // And the networking grant must not leak into the three other courses.
    for (const other of ['ap-csp', 'ap-cybersecurity', 'ap-csa']) {
      const r = await slides(other, '1-1', paidTeacherTok);
      ok(`  ap-networking-entitled teacher does NOT unlock ${other}`,
         r.body && r.body.locked === true, r.body);
    }
  }

  console.log('5. Entitled teacher: locked opens, and the state is PENDING because nothing is converted');
  {
    const r = await slides(COURSE, '1-1', paidTeacherTok);
    ok('  entitled teacher: unlocked (locked === false)', r.body && r.body.locked === false, r.body);
    ok('  decks is an empty array, not null (entitled, nothing to show yet)',
       r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);
    ok('  day count is still reported even with nothing converted', r.body && r.body.days === 3, r.body);
    ok('  tracks reported as empty for this course',
       r.body && Array.isArray(r.body.tracks) && r.body.tracks.length === 0, r.body && r.body.tracks);
    ok('  both variants are advertised',
       r.body && r.body.variants.length === 2
         && r.body.variants.includes('teacher') && r.body.variants.includes('student'),
       r.body && r.body.variants);
    ok('  no docs.google.com anywhere: there is nothing converted to leak',
       !r.text.includes(GOOGLE_HOST), r.text);
  }

  console.log('6. Every one of the 22 topics is in the same honest pending state');
  {
    let allEmpty = true;
    let allUnlocked = true;
    let allDaysMatch = true;
    for (const l of manifest.LESSON_IDS) {
      const r = await slides(COURSE, l, paidTeacherTok);
      if (!(r.body && r.body.locked === false)) allUnlocked = false;
      if (!(r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0)) allEmpty = false;
      if (!(r.body && r.body.days === manifest.dayCount(l))) allDaysMatch = false;
    }
    ok('  all 22 topics unlock for the entitled teacher', allUnlocked);
    ok('  all 22 topics report zero decks (nothing converted to Slides yet)', allEmpty);
    ok('  every topic reports the manifest day count', allDaysMatch);
    ok('  the embed map really is empty, which is why the above holds',
       embeds.count() === 0, embeds.count());
    ok('  and it says so about itself rather than claiming a stale generation',
       embeds.GENERATED_AT === null, embeds.GENERATED_AT);
  }

  console.log('7. An entitled STUDENT sees the pending state, and never a teacher-only deck');
  {
    const r = await slides(COURSE, '1-1', paidStudentTok);
    ok('  entitled student: unlocked', r.body && r.body.locked === false, r.body);
    ok('  entitled student: decks is an empty array',
       r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);

    // The variant boundary is the part that must survive conversion, so assert
    // it at the manifest level too, where it can be checked with a deck that
    // does not exist yet on the wire. decksForLesson must never return a
    // teacher deck when only 'student' was asked for, whatever the embed map
    // later contains.
    const studentOnly = manifest.decksForLesson('1-1', ['student']);
    ok('  decksForLesson(student) returns no teacher-variant rows',
       Array.isArray(studentOnly) && studentOnly.every((d) => d.variant === 'student'), studentOnly);
    ok('  decksForLesson on an unknown lesson is null, not an empty array',
       manifest.decksForLesson('9-9', ['student']) === null);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
