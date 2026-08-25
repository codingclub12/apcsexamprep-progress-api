'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: GET /api/slides/ap-cybersecurity/:lessonId, the cyber slide gate.
//
//  Cyber decks differ from CSP decks in a way that matters to this gate: they
//  have NO Shopify .pptx url, only a Google Slides embed. So the thing being
//  withheld from an unentitled caller is the embed, and every locked-path
//  assertion below scans the RAW response text for docs.google.com rather than
//  reading the decks field. A gate that withholds a download link it never had
//  and ships the embed is not a gate.
//
//  A Slides id is a credential here in the fullest sense. The decks are shared
//  "anyone with the link" because the paying teacher is gated on their
//  APCSExamPrep teacher token and not on a Google account, so Google cannot do
//  the gating. Holding the id is holding access, and a TEACHER deck carries
//  speaker notes, timing cues and misconception alerts one click from
//  rendering. The student-never-gets-teacher assertion is the sharpest one in
//  this file.
//
//  The embeds map is stubbed through require.cache rather than read from the
//  real generated config, so the entitled path is deterministic before the
//  Drive conversion has run.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberslides
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-cyber-slide-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// ---- stub the embeds map BEFORE the manifest requires it -------------------
// Lesson 1-1 has 2 days in the manifest. Convert day 1 fully and leave day 2
// unconverted, so the partial-conversion path is exercised for real.
const EMBEDS_PATH = require.resolve('../config/cyber-slide-embeds');
const STUB_IDS = {
  '1-1|1|teacher': 'STUBteacherD1',
  '1-1|1|student': 'STUBstudentD1',
  '2-1|1|teacher': 'STUBteacher21',
  '2-1|1|student': 'STUBstudent21',
};
require.cache[EMBEDS_PATH] = {
  id: EMBEDS_PATH,
  filename: EMBEDS_PATH,
  loaded: true,
  exports: {
    slideId: (lessonId, day, variant) => {
      const k = `${lessonId}|${day}|${variant}`;
      return Object.prototype.hasOwnProperty.call(STUB_IDS, k) ? STUB_IDS[k] : null;
    },
    embedUrl: (id) => `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`,
    count: () => Object.keys(STUB_IDS).length,
    GENERATED_AT: '2026-08-25',
  },
};

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');
const manifest = require('../config/cyber-slide-manifest');

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
const COURSE = 'ap-cybersecurity';

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
  console.log('\nAP CYBERSECURITY SLIDE GATE\n');

  const paidTeacher = makeTeacher();
  grant(paidTeacher.id, COURSE);
  const paidTeacherTok = signTeacherToken(paidTeacher);

  const freeTeacher = makeTeacher();
  const freeTeacherTok = signTeacherToken(freeTeacher);

  const paidClassId = makeClass(paidTeacher.id, COURSE, 'CYBER-PAID');
  const paidStudentId = makeStudent(paidClassId, 'Paid Kid');
  const paidStudentTok = signStudentToken(
    { id: paidStudentId, class_id: paidClassId, display_name: 'Paid Kid' }, 'CYBER-PAID');

  const freeClassId = makeClass(freeTeacher.id, COURSE, 'CYBER-FREE');
  const freeStudentId = makeStudent(freeClassId, 'Free Kid');
  const freeStudentTok = signStudentToken(
    { id: freeStudentId, class_id: freeClassId, display_name: 'Free Kid' }, 'CYBER-FREE');

  // A teacher entitled for CSP must not unlock cyber decks.
  const cspTeacher = makeTeacher();
  grant(cspTeacher.id, 'ap-csp');
  const cspTeacherTok = signTeacherToken(cspTeacher);

  console.log('1. Scope: only the units that have real per-day decks are known');
  {
    ok('  9 lessons wired (Units 1 and 2)', manifest.LESSON_IDS.length === 9, manifest.LESSON_IDS);
    const days = manifest.LESSON_IDS.reduce((a, l) => a + manifest.dayCount(l), 0);
    ok('  35 teaching days across them', days === 35, days);

    // Units 3-5 hold ONE whole-lesson deck each, not a per-day set. Listing
    // them would report days:1 for a topic that runs six class periods.
    for (const l of ['3-1', '3-5', '4-1', '5-6']) {
      const r = await slides(COURSE, l, paidTeacherTok);
      ok(`  Unit 3-5 lesson ${l} is not wired yet -> 404`, r.status === 404, r);
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
    ok('  anonymous: overview still reports the day count', anon.body && anon.body.days === 2, anon.body);
    ok('  anonymous: ZERO docs.google.com anywhere in the payload',
       !anon.text.includes(GOOGLE_HOST), anon.text);
    ok('  anonymous: never cached', anon.cache === 'no-store', anon.cache);

    const junk = await slides(COURSE, '1-1', 'not-a-real-token');
    ok('  garbage token: locked, not a 500',
       junk.status === 200 && junk.body.locked === true, junk);
    ok('  garbage token: no embed leaks', !junk.text.includes(GOOGLE_HOST), junk.text);

    const ft = await slides(COURSE, '1-1', freeTeacherTok);
    ok('  unpaid teacher: locked', ft.body && ft.body.locked === true, ft.body);
    ok('  unpaid teacher: no embed leaks', !ft.text.includes(GOOGLE_HOST), ft.text);

    const fs2 = await slides(COURSE, '1-1', freeStudentTok);
    ok('  student of an unpaid teacher: locked', fs2.body && fs2.body.locked === true, fs2.body);
    ok('  student of an unpaid teacher: no embed leaks', !fs2.text.includes(GOOGLE_HOST), fs2.text);

    const xc = await slides(COURSE, '1-1', cspTeacherTok);
    ok('  CSP-entitled teacher does NOT unlock cyber', xc.body && xc.body.locked === true, xc.body);
    ok('  CSP-entitled teacher: no embed leaks', !xc.text.includes(GOOGLE_HOST), xc.text);
  }

  console.log('3. Entitled teacher gets every converted deck, both variants');
  {
    const r = await slides(COURSE, '1-1', paidTeacherTok);
    ok('  entitled teacher: unlocked', r.body && r.body.locked === false, r.body);
    const decks = (r.body && r.body.decks) || [];
    ok('  both variants for the converted day', decks.length === 2, decks);
    const variants = decks.map((d) => d.variant).sort();
    ok('  teacher and student decks present', JSON.stringify(variants) === '["student","teacher"]', variants);
    ok('  every deck carries an embedUrl', decks.every((d) => typeof d.embedUrl === 'string'), decks);
    ok('  NO deck carries a .pptx url (cyber is embed-only)',
       decks.every((d) => d.url === undefined), decks);
    ok('  no deck carries a track (cyber has no track dimension)',
       decks.every((d) => d.track === undefined), decks);
    ok('  tracks reported as empty for this course',
       r.body && Array.isArray(r.body.tracks) && r.body.tracks.length === 0, r.body && r.body.tracks);
  }

  console.log('4. An entitled STUDENT never receives a TEACHER deck');
  {
    const r = await slides(COURSE, '1-1', paidStudentTok);
    ok('  entitled student: unlocked', r.body && r.body.locked === false, r.body);
    const decks = (r.body && r.body.decks) || [];
    ok('  exactly one deck for the converted day', decks.length === 1, decks);
    ok('  it is the student deck', decks[0] && decks[0].variant === 'student', decks);
    // The sharpest assertion in this file: the teacher deck's id must not
    // appear ANYWHERE in the raw text, not merely be absent from decks[].
    ok('  the TEACHER deck id appears nowhere in the raw response',
       !r.text.includes('STUBteacherD1'), r.text);
    ok('  the student deck id IS present (the gate opened, it did not just fail)',
       r.text.includes('STUBstudentD1'), r.text);
  }

  console.log('5. A partial conversion is a working state, and days stays honest');
  {
    const r = await slides(COURSE, '1-1', paidTeacherTok);
    ok('  days still reports the real count (2), not the converted count',
       r.body && r.body.days === 2, r.body);
    const decks = (r.body && r.body.decks) || [];
    ok('  only day 1 is listed; the unconverted day 2 is omitted, not empty',
       decks.every((d) => d.day === 1), decks);

    // A lesson with nothing converted must NOT read as locked to a paying
    // teacher. locked is about entitlement; an empty deck list is about the
    // conversion. Collapsing the two would show a paying teacher the upsell.
    const none = await slides(COURSE, '1-5', paidTeacherTok);
    ok('  wholly unconverted lesson: still locked === false for a paying teacher',
       none.body && none.body.locked === false, none.body);
    ok('  wholly unconverted lesson: decks is an empty array, not null',
       none.body && Array.isArray(none.body.decks) && none.body.decks.length === 0, none.body);
    ok('  wholly unconverted lesson: day count still reported', none.body && none.body.days === 2, none.body);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
