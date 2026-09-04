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

  console.log('1. Scope: the manifest knows all 53 CSA lessons, and nothing else');
  {
    // Was 15 (Unit 1 pilot) until 2026-09-04. Units 2-4 joined when the
    // already-authored teacher-kit decks were wired up, so the old
    // "2-1 is outside the pilot and 404s" assertion below had to invert. It is
    // kept rather than deleted, because a lesson silently leaving the manifest
    // is exactly the regression this section is for.
    ok('  53 lessons wired (all four units)', manifest.LESSON_IDS.length === 53, manifest.LESSON_IDS.length);
    ok('  1-1 through 1-15 are all present',
       Array.from({ length: 15 }, (_, i) => `1-${i + 1}`).every((l) => manifest.LESSON_IDS.includes(l)),
       manifest.LESSON_IDS);
    ok('  38 lessons come from the authored kit content',
       manifest.AUTHORED_LESSON_IDS.length === 38, manifest.AUTHORED_LESSON_IDS.length);
    ok('  every authored lesson has at least one teaching day',
       manifest.AUTHORED_LESSON_IDS.every((l) => manifest.dayCount(l) >= 1));

    // These four used to 404 as "outside the pilot". They are wired now, and
    // an entitled teacher must reach them with a 200 and an empty deck list.
    for (const l of ['2-1', '3-1', '4-1', '4-13']) {
      const r = await slides(COURSE, l, paidTeacherTok);
      ok(`  lesson ${l} (Units 2-4, now wired) -> 200`, r.status === 200, r);
      ok(`  lesson ${l} reports zero decks until conversion runs`,
         r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);
    }
    // A lesson number no CSA unit has must still 404 rather than answer empty.
    for (const l of ['5-1', '2-13', '3-10', '4-18']) {
      const r = await slides(COURSE, l, paidTeacherTok);
      ok(`  lesson ${l} does not exist in the CED -> 404`, r.status === 404, r);
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

  console.log('5. Every one of the 53 lessons is in the same honest pending state');
  {
    let allEmpty = true;
    let allUnlocked = true;
    for (const l of manifest.LESSON_IDS) {
      const r = await slides(COURSE, l, paidTeacherTok);
      if (!(r.body && r.body.locked === false)) allUnlocked = false;
      if (!(r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0)) allEmpty = false;
    }
    ok('  all 53 lessons unlock for the entitled teacher', allUnlocked);
    ok('  all 53 lessons report zero decks (nothing converted to Slides yet)', allEmpty);
  }

  console.log('6. An entitled STUDENT sees the identical pending state, never a teacher-only leak');
  {
    const r = await slides(COURSE, '1-1', paidStudentTok);
    ok('  entitled student: unlocked', r.body && r.body.locked === false, r.body);
    ok('  entitled student: decks is an empty array', r.body && Array.isArray(r.body.decks) && r.body.decks.length === 0, r.body);
  }

  // ── THE APPS SCRIPT'S EXPECTED COUNTS MATCH THE AUTHORED DAY DATA ─────────
  //  scripts/csa-slides-conversion.gs runs in Google Apps Script, which cannot
  //  read this repo, so the shape it checks an upload against has to be typed
  //  into the file as literals. Nothing tied those literals to anything until
  //  2026-09-04, and they were wrong the whole time: 9 lessons and 70 decks,
  //  carried over from the cyber script it was adapted from. preview() found
  //  all 152 CSA decks, printed every per-unit total correctly, and then told
  //  the operator to stop and reconcile against a number from another course.
  //
  //  A copied number needs a check that it still matches its source, and this
  //  is that check. config/csa-slide-days.json is the source: one entry per
  //  lesson, valued in teaching days, generated from the authored content.
  {
    const gs = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'csa-slides-conversion.gs'), 'utf8');
    const days = require('../config/csa-slide-days.json').days;
    const lessons = Object.keys(days);
    const totalDays = lessons.reduce((n, k) => n + Number(days[k]), 0);

    const constant = (name) => {
      const m = new RegExp('var\\s+' + name + '\\s*=\\s*(\\d+)').exec(gs);
      return m ? Number(m[1]) : null;
    };
    const gotLessons = constant('EXPECT_LESSONS');
    const gotDecks = constant('EXPECT_DECKS');

    ok('conversion script declares EXPECT_LESSONS and EXPECT_DECKS',
      gotLessons !== null && gotDecks !== null,
      `read ${gotLessons} / ${gotDecks}`);
    ok('  EXPECT_LESSONS matches the authored lesson count',
      gotLessons === lessons.length, `gs=${gotLessons} json=${lessons.length}`);
    ok('  EXPECT_DECKS matches teaching days x 2 variants',
      gotDecks === totalDays * 2, `gs=${gotDecks} json=${totalDays * 2}`);
    // The pair must also agree with ITSELF. A script claiming more lessons than
    // decks, or an odd deck count, describes a shape that cannot exist: every
    // teaching day ships exactly one TEACHER and one STUDENT deck.
    ok('  the two constants describe a possible shape',
      gotDecks % 2 === 0 && gotDecks >= gotLessons * 2,
      `${gotLessons} lessons cannot yield ${gotDecks} decks`);
  }

  // ── NO CYBER VALUE SURVIVES IN AN EMITTED STRING ──────────────────────────
  //  scripts/csa-slides-conversion.gs was adapted from the cyber script, and
  //  three of its literals were never changed over. All three shipped:
  //
  //    'EXPECTED: 9 lessons, 70 decks'   the cyber shape, so preview() told the
  //                                      operator to stop on a correct upload
  //    'AP-CYBER_' + deck.lesson         152 CSA decks named AP-CYBER in Drive
  //    'node scripts/cyber-slide-...'    the closing instruction named the wrong
  //                                      importer, which reads the cyber
  //                                      manifest and writes the cyber config
  //
  //  Each was found by a person looking, one at a time, after the fact. This is
  //  the rule that finds the next one: no STRING LITERAL in the file may mention
  //  cyber. Comments may and should, because the adaptation history is worth
  //  keeping; it is the emitted values that must belong to this course.
  {
    const gs = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'csa-slides-conversion.gs'), 'utf8');
    // A regex over the whole file is not good enough in either direction, and
    // both failures were seen while writing this. Matching literals directly
    // starts on an apostrophe inside a comment and runs away, swallowing prose
    // until the next quote. Stripping comments first with a // rule truncates
    // any line holding an https:// URL and hides whatever follows it.
    //
    // So walk the file once and know which of the four states each character is
    // in. It is twenty lines and it is exactly right, where the regex is short
    // and wrong.
    const literals = [];
    {
      let i = 0, buf = null, quote = null;
      while (i < gs.length) {
        const c = gs[i], d = gs[i + 1];
        if (buf === null) {
          if (c === '/' && d === '/') { while (i < gs.length && gs[i] !== '\n') i++; continue; }
          if (c === '/' && d === '*') { i += 2; while (i < gs.length && !(gs[i] === '*' && gs[i + 1] === '/')) i++; i += 2; continue; }
          if (c === "'" || c === '"') { quote = c; buf = ''; i++; continue; }
          i++; continue;
        }
        if (c === '\\') { buf += gs[i + 1] || ''; i += 2; continue; }
        if (c === quote) { literals.push(buf); buf = null; quote = null; i++; continue; }
        buf += c; i++;
      }
    }
    const offenders = literals.filter((l) => /cyber/i.test(l));
    ok('no string literal in the conversion script mentions cyber',
      offenders.length === 0, offenders.slice(0, 3).join('  '));
    // The rule is only as good as its reach. If the literal scan ever returns
    // almost nothing, it has stopped seeing the file rather than found it clean.
    ok('  the literal scan actually read the file',
      literals.length > 40, `only ${literals.length} literals found`);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
