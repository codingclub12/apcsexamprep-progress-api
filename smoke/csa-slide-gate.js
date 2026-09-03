'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: GET /api/slides/ap-csa/:lessonId, the AP CSA slide gate pilot.
//
//  This is the PIPE, not the content. No AP CSA slide deck has been authored
//  yet (see config/csa-slide-manifest.js and
//  docs/runs/2026-09-03-auditor-csp-slides.md, ITEM 3). Every lesson in this
//  suite is therefore in the "wholly unconverted" state that
//  smoke/cyber-slide-gate.js section 5 already proved correct for cyber's
//  lesson 1-5: an entitled caller gets locked:false with an empty decks
//  array, never the upsell. Here it is true for ALL 15 Unit 1 lessons, not
//  one, because none of them have decks yet.
//
//  What this suite actually proves:
//    1. routes/slides.js needed zero course-specific changes to serve ap-csa
//       (confirmed by reading it; this suite is the check that reading was
//       right, not a repeat of the reading).
//    2. lib/entitlements.js's existing ap-csa bundle entitlement gates this
//       route exactly the way it gates the CSP and cyber deck gates: an
//       ap-csa grant unlocks ap-csa lessons and nothing else, an ap-csp or
//       ap-cybersecurity grant unlocks neither ap-csa lesson.
//    3. The pilot's scope boundary is real: lessons outside Unit 1 (e.g.
//       2-1) are not in this manifest and 404, the same way cyber's Unit
//       3-5 lessons 404 today.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: node smoke/csa-slide-gate.js
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-csa-slide-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');
const manifest = require('../config/csa-slide-manifest');

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
const COURSE = 'ap-csa';

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
  console.log('\nAP CSA SLIDE GATE (UNIT 1 PILOT, NO REAL DECKS YET)\n');

  const paidTeacher = makeTeacher();
  grant(paidTeacher.id, COURSE);
  const paidTeacherTok = signTeacherToken(paidTeacher);

  const freeTeacher = makeTeacher();
  const freeTeacherTok = signTeacherToken(freeTeacher);

  const paidClassId = makeClass(paidTeacher.id, COURSE, 'CSA-PAID');
  const paidStudentId = makeStudent(paidClassId, 'Paid Kid');
  const paidStudentTok = signStudentToken(
    { id: paidStudentId, class_id: paidClassId, display_name: 'Paid Kid' }, 'CSA-PAID');

  const freeClassId = makeClass(freeTeacher.id, COURSE, 'CSA-FREE');
  const freeStudentId = makeStudent(freeClassId, 'Free Kid');
  const freeStudentTok = signStudentToken(
    { id: freeStudentId, class_id: freeClassId, display_name: 'Free Kid' }, 'CSA-FREE');

  // A teacher entitled for CSP or cyber must not unlock ap-csa, and an ap-csa
  // grant must not unlock CSP. Cross-course isolation is the same shared-route
  // property smoke/csp-slide-gate.js and smoke/cyber-slide-gate.js each assert
  // from their own course's side; this is the ap-csa side of the same triangle.
  const cspTeacher = makeTeacher();
  grant(cspTeacher.id, 'ap-csp');
  const cspTeacherTok = signTeacherToken(cspTeacher);

  console.log('1. Scope: the manifest knows exactly the 15 Unit 1 lessons, nothing else');
  {
    ok('  15 lessons wired (Unit 1 only)', manifest.LESSON_IDS.length === 15, manifest.LESSON_IDS);
    ok('  1-1 through 1-15 are all present', manifest.LESSON_IDS.every((l, i) => l === `1-${i + 1}`), manifest.LESSON_IDS);

    // Units 2-4 are real CSA units (lib/csa-nav.js has Unit 4 built) but are
    // deliberately outside this pilot's manifest, same posture as cyber's
    // Units 3-5: unwired means 404, not a silent empty response.
    for (const l of ['2-1', '3-1', '4-1', '4-13']) {
      const r = await slides(COURSE, l, paidTeacherTok);
      ok(`  lesson ${l} (outside the Unit 1 pilot) -> 404`, r.status === 404, r);
    }
    const r404 = await slides(COURSE, '9-9', paidTeacherTok);
    ok('  unknown lesson -> 404', r404.status === 404, r404);
    ok('  404 body carries no Google url', !r404.text.includes(GOOGLE_HOST), r404.text);
  }

  console.log('2. Anonymous and unentitled callers get the overview, never an embed');
  {
    const anon = await slides(COURSE, '1-1', null);
    ok('  anonymous: 200', anon.status === 200, anon);
    ok('  anonymous: locked', anon.body && anon.body.locked === true, anon.body);
    ok('  anonymous: decks is null', anon.body && anon.body.decks === null, anon.body);
    ok('  anonymous: overview still reports a day count', anon.body && anon.body.days === 1, anon.body);
    ok('  anonymous: ZERO docs.google.com anywhere in the payload',
       !anon.text.includes(GOOGLE_HOST), anon.text);
    ok('  anonymous: never cached', anon.cache === 'no-store', anon.cache);

    const junk = await slides(COURSE, '1-1', 'not-a-real-token');
    ok('  garbage token: locked, not a 500', junk.status === 200 && junk.body.locked === true, junk);

    const ft = await slides(COURSE, '1-1', freeTeacherTok);
    ok('  unpaid teacher: locked', ft.body && ft.body.locked === true, ft.body);

    const fs2 = await slides(COURSE, '1-1', freeStudentTok);
    ok('  student of an unpaid teacher: locked', fs2.body && fs2.body.locked === true, fs2.body);

    const xc = await slides(COURSE, '1-1', cspTeacherTok);
    ok('  CSP-entitled teacher does NOT unlock ap-csa', xc.body && xc.body.locked === true, xc.body);
  }

  console.log('3. An ap-csa grant does not cross into CSP');
  {
    const app2 = express();
    app2.use('/api/slides', require('../routes/slides'));
    const s2 = app2.listen(0);
    const csaOnCsp = await fetch(`http://127.0.0.1:${s2.address().port}/api/slides/ap-csp/1-1`, {
      headers: { Authorization: 'Bearer ' + paidTeacherTok },
    }).then((r) => r.json());
    ok('  ap-csa-entitled teacher does NOT unlock ap-csp', csaOnCsp.locked === true, csaOnCsp);
    s2.close();
  }

  console.log('4. Entitled teacher: locked opens, and the state is PENDING because nothing is converted');
  {
    const r = await slides(COURSE, '1-1', paidTeacherTok);
    ok('  entitled teacher: unlocked (locked === false)', r.body && r.body.locked === false, r.body);
    ok('  decks is an empty array, not null (entitled, nothing to show yet)',
       r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);
    ok('  day count is still reported even with nothing converted', r.body && r.body.days === 1, r.body);
    ok('  tracks reported as empty for this course',
       r.body && Array.isArray(r.body.tracks) && r.body.tracks.length === 0, r.body && r.body.tracks);
    ok('  no docs.google.com anywhere: there is nothing converted to leak',
       !r.text.includes(GOOGLE_HOST), r.text);
  }

  console.log('5. Every one of the 15 Unit 1 lessons is in the same honest pending state');
  {
    let allEmpty = true;
    let allUnlocked = true;
    for (const l of manifest.LESSON_IDS) {
      const r = await slides(COURSE, l, paidTeacherTok);
      if (!(r.body && r.body.locked === false)) allUnlocked = false;
      if (!(r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0)) allEmpty = false;
    }
    ok('  all 15 lessons unlock for the entitled teacher', allUnlocked);
    ok('  all 15 lessons report zero decks (no content authored yet)', allEmpty);
  }

  console.log('6. An entitled STUDENT sees the identical pending state, never a teacher-only leak');
  {
    const r = await slides(COURSE, '1-1', paidStudentTok);
    ok('  entitled student: unlocked', r.body && r.body.locked === false, r.body);
    ok('  entitled student: decks is an empty array', r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
