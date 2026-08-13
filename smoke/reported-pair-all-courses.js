'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a reported pair wins in EVERY column of EVERY course.
//
//  THE RULE
//  One question is one point. A page that grades its own questions knows both
//  halves and posts them, so the pair it reports is what the student saw and
//  what they earned. No authored denominator may override it.
//
//  WHY EXHAUSTIVE RATHER THAN A SAMPLE
//  The rule was verified on four hand-picked columns, which is exactly the kind
//  of check that misses the one place a course does something different. The
//  matrix below is generated from the COURSES config instead of typed out, so a
//  unit, lesson or activity added later is covered the day it is added rather
//  than the day someone remembers to extend this file.
//
//  Every graded column in the product gets:
//    - an authored course_denominators row that DELIBERATELY DISAGREES (9)
//    - a reported pair of 3 out of 4, posted through the real /api/student/score
//    - an assertion that the gradebook shows 3 of 4, sourced 'observed'
//
//  THE TWO EXPECTED NON-ANSWERS, asserted rather than skipped
//    'lesson'     a page visit, not graded work, so it carries no points at all
//    'exercise-2' on ap-csp only: CSP games are practice by default, so they
//                 carry no points until a teacher turns games on for the class.
//                 The suite then turns games on and asserts the same column DOES
//                 report 3 of 4, so "ungraded" is proved to be policy rather
//                 than a column that silently cannot report.
//
//  Zero PII: one synthetic student per course, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:pairallcourses
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-pair-all-courses.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-pair-all-courses-secret-long-enough';

const express = require('express');
const db = require('../db');
const { COURSES, examsOf } = require('../utils');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

// The pair every page reports in this suite, and the authored value that
// disagrees with it. 3 of 4 is chosen because 3/9 and 4/9 are both wrong in a
// way that is obvious in output if the authored row ever wins again.
const EARNED = 3, POSSIBLE = 4, AUTHORED_DECOY = 9;

const COURSE_LIST = ['ap-csa', 'ap-csp', 'ap-cybersecurity', 'ap-networking'];

// Every (unit, lesson, activity) the config declares, including the Cyber
// case-file and exam pseudo-lessons.
function columnsFor(course) {
  const cfg = COURSES[course];
  const out = [];
  if (!cfg || !cfg.units) return out;
  for (const [unitId, u] of Object.entries(cfg.units)) {
    for (const lesson of (u.lessons || [])) {
      for (const act of (u.activities || [])) out.push({ unit: unitId, lesson, act });
    }
    if (u.case_file) out.push({ unit: unitId, lesson: u.case_file.lesson, act: 'case-file' });
    // examsOf, not u.exam: a unit may declare SEVERAL exams (CSP Big Idea 3
    // sits its unit test in two parts) and `u.exam.lesson` on an array is
    // undefined, which this suite caught as a NOT NULL violation.
    for (const ex of examsOf(u)) out.push({ unit: unitId, lesson: ex.lesson, act: 'exam' });
  }
  return out;
}

// What the contract should say about a column, before any data is posted.
// 'lesson' is a page visit. A CSP game is practice until a teacher says else.
function expectsPoints(course, act, gamesOn) {
  if (act === 'lesson') return false;
  if (course === 'ap-csp' && act === 'exercise-2' && !gamesOn) return false;
  return true;
}

(async () => {
  console.log('\nA REPORTED PAIR WINS IN EVERY COLUMN OF EVERY COURSE\n');
  console.log(`Every graded column gets an authored decoy of ${AUTHORED_DECOY} and a`);
  console.log(`reported pair of ${EARNED} of ${POSSIBLE}. The pair must win.\n`);

  const reg = await post('/api/teacher/register', {
    email: 'pair.all@example.org', password: 'a-long-enough-password',
    name: 'Pair All', school: 'Example High',
  });
  const teacherToken = reg.body.token;
  ok('teacher registered', !!teacherToken, reg.body);

  const decoy = db.prepare(
    `INSERT OR REPLACE INTO course_denominators (course,unit,lesson,activity_type,possible)
     VALUES (?,?,?,?,?)`
  );
  const unitDecoy = db.prepare(
    `INSERT OR REPLACE INTO course_unit_denominators (course,unit,lesson,activity_type,possible)
     VALUES (?,?,?,?,?)`
  );

  let grandTotal = 0, grandGraded = 0, grandUngraded = 0;

  for (const course of COURSE_LIST) {
    const cols = columnsFor(course);
    const cls = await post('/api/teacher/classes', { class_name: 'Pair ' + course, course }, teacherToken);
    const code = cls.body && cls.body.class && cls.body.class.class_code;
    ok(`${course}: class created`, !!code, cls.body);
    if (!code) continue;

    const j = await post('/api/student/join', { class_code: code, display_name: 'PA', pin: '1234' });
    const stok = j.body.token;
    ok(`${course}: student joined`, !!stok, j.body);
    if (!stok) continue;

    // Poison every column with a disagreeing authored total, on BOTH tables, so
    // the unit-scoped path (Cyber exam and case-file share one lesson name) is
    // covered as well as the lesson-scoped one.
    for (const c of cols) {
      decoy.run(course, c.unit, c.lesson, c.act, AUTHORED_DECOY);
      unitDecoy.run(course, c.unit, c.lesson, c.act, AUTHORED_DECOY);
    }

    // Report a real pair into every column, through the real endpoint.
    let posted = 0, rejected = [];
    for (const c of cols) {
      const r = await post('/api/student/score', {
        course, unit: c.unit, lesson: c.lesson, activity_type: c.act,
        item: 'q1', earned: EARNED, possible: POSSIBLE,
      }, stok);
      if (r.status === 200) posted += 1;
      else if (rejected.length < 5) rejected.push({ ...c, status: r.status, err: r.body && r.body.error });
    }
    ok(`${course}: all ${cols.length} columns accepted a reported pair`,
      posted === cols.length, { posted, of: cols.length, rejected });

    const g = buildCanonicalGradebook(code, { reveal: true });
    const items = g.students[0] ? g.students[0].items : {};

    const wrong = [], missing = [], ungradedWrong = [];
    let graded = 0, ungraded = 0;
    for (const c of cols) {
      const cell = items[`${c.unit}/${c.lesson}/${c.act}`];
      const shouldScore = expectsPoints(course, c.act, false);
      if (!cell) { missing.push(c); continue; }
      if (shouldScore) {
        graded += 1;
        if (!(cell.earned === EARNED && cell.possible === POSSIBLE && cell.possible_source === 'observed')) {
          if (wrong.length < 6) {
            wrong.push({ ...c, earned: cell.earned, possible: cell.possible, src: cell.possible_source });
          }
        }
      } else {
        ungraded += 1;
        // An ungraded column must carry NO points. It must not quietly pick up
        // the authored decoy either.
        if (cell.earned != null || cell.possible != null) {
          if (ungradedWrong.length < 6) {
            ungradedWrong.push({ ...c, earned: cell.earned, possible: cell.possible });
          }
        }
      }
    }

    ok(`${course}: every column has a cell (${cols.length} columns)`, missing.length === 0, missing.slice(0, 6));
    ok(`${course}: all ${graded} graded columns show ${EARNED}/${POSSIBLE} sourced observed, not the decoy`,
      wrong.length === 0, wrong);
    ok(`${course}: all ${ungraded} ungraded columns carry no points`,
      ungradedWrong.length === 0, ungradedWrong);

    grandTotal += cols.length; grandGraded += graded; grandUngraded += ungraded;
    console.log(`  ${course.padEnd(18)} ${String(cols.length).padStart(4)} columns  ` +
      `${String(graded).padStart(4)} graded  ${String(ungraded).padStart(3)} ungraded by policy`);

    // CSP games: prove "ungraded" is POLICY, not a column that cannot report.
    // Same class, same already-posted data, teacher turns games on.
    if (course === 'ap-csp') {
      db.prepare('UPDATE classes SET games_graded = 1 WHERE class_code = ?').run(code);
      const g2 = buildCanonicalGradebook(code, { reveal: true });
      const it2 = g2.students[0].items;
      const games = cols.filter((c) => c.act === 'exercise-2');
      const bad = games.filter((c) => {
        const cell = it2[`${c.unit}/${c.lesson}/${c.act}`];
        return !(cell && cell.earned === EARNED && cell.possible === POSSIBLE && cell.possible_source === 'observed');
      });
      ok(`  ap-csp: all ${games.length} game columns report ${EARNED}/${POSSIBLE} once the teacher enables games`,
        games.length > 0 && bad.length === 0, bad.slice(0, 5));
      db.prepare('UPDATE classes SET games_graded = NULL WHERE class_code = ?').run(code);
    }
  }

  console.log(`\n  ${String(grandTotal).padStart(4)} columns total across four courses  ` +
    `(${grandGraded} graded, ${grandUngraded} ungraded by policy)`);

  // ── Every assignment reaches the OPERATOR grid too ────────────────────────
  //  The matrix above proves the contract renders every column. The operator
  //  page is built by a different function, lib/admin-gradebook.js, and it was
  //  quietly losing columns: its key was `lesson|activity` with no unit, so
  //  cyber's five unit exams (all at lesson 'exam') collapsed into ONE column
  //  and its five case files into another. Eight of 114 columns never reached
  //  the screen, and one unit's exam cell overwrote another's.
  //
  //  Column COUNT alone is not enough to catch that, since a lost column and an
  //  added one cancel out, so the two sets are compared by identity.
  console.log('\nEvery assignment also reaches the operator grid');
  const { buildGradebook } = require('../lib/admin-gradebook');
  for (const course of COURSE_LIST) {
    const cls2 = await post('/api/teacher/classes', { class_name: 'Grid ' + course, course }, teacherToken);
    const code2 = cls2.body && cls2.body.class && cls2.body.class.class_code;
    if (!code2) { ok(`${course}: grid class created`, false, cls2.body); continue; }

    const admin = buildGradebook(code2, { reveal: true });
    const contract = buildCanonicalGradebook(code2, { reveal: true });
    const aSet = new Set((admin.items || []).map((i) => `${i.unit}/${i.lesson_id}/${i.activity}`));
    const cSet = new Set((contract.items || []).map((i) => `${i.unit}/${i.lesson_ref}/${i.native_activity}`));
    const missing = [...cSet].filter((k) => !aSet.has(k));
    const extra = [...aSet].filter((k) => !cSet.has(k));

    ok(`${course}: the operator grid shows all ${cSet.size} columns, none collapsed`,
      missing.length === 0, missing.slice(0, 6));
    ok(`${course}: and invents none`, extra.length === 0, extra.slice(0, 6));
    // The specific shape that was broken: five distinct exam columns, not one.
    if (course === 'ap-cybersecurity') {
      const exams = (admin.items || []).filter((i) => i.activity === 'exam');
      const files = (admin.items || []).filter((i) => i.activity === 'case-file');
      ok('  ap-cybersecurity: five separate unit exams, not one merged column',
        exams.length === 5 && new Set(exams.map((e) => e.unit)).size === 5, exams.length);
      ok('  ap-cybersecurity: five separate case files',
        files.length === 5 && new Set(files.map((f) => f.unit)).size === 5, files.length);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
