'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the teacher gradebook and the admin gradebook must tell the same story.
//
//  WHY THIS EXISTS
//  There are two renderers over one dataset, and they do not share code:
//
//    teacher  GET /api/teacher/classes/:code/progress   routes/teacher.js
//             points from the score_events rollup, rescaled to the authored
//             course_denominators value
//    admin    GET /api/admin/class/:id/gradebook        lib/admin-gradebook.js
//             columns from the COURSES config, cells from attempts OR
//             progress.score, rescaled to the same authored value
//
//  Two views of one number is exactly the shape of defect that had an operator
//  told a teacher grades were not syncing while the grades sat in her gradebook.
//  The failure mode is quiet: nothing errors, the two pages simply disagree, and
//  whoever is looking at one of them is wrong without knowing it.
//
//  So this runs a class through the real routes, renders it BOTH ways, and
//  compares every (student, lesson, activity) cell. A disagreement is printed
//  with both sides and the field that differs, so the report is usable as a
//  diagnosis and not just a red X.
//
//  It deliberately exercises the divergence-prone paths:
//    - columns WITH an authored denominator and columns without
//    - a lesson score whose points ratio does not land on a whole percent
//      (5/7 = 71.43%), which is where a rounded percent and a raw ratio part ways
//    - the quiz path, which writes quiz_attempts and progress but no score_event
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gbagree
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gb-agreement.db');
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
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

const run = (s, ...a) => db.prepare(s).run(...a);
const COURSE = 'ap-cybersecurity';

// Compare two numbers that traveled through different arithmetic. Percentages
// are integers on both sides and must match exactly. Points are derived by
// rescaling and carry rounding, so they agree to the cent.
const samePct = (a, b) => (a == null && b == null) || a === b;
const samePoints = (a, b) => (a == null && b == null)
  || (a != null && b != null && Math.abs(a - b) < 0.011);

(async () => {
  console.log('\nGRADEBOOK AGREEMENT (teacher view vs admin view)\n');

  console.log('1. Build a class and put real work through the real routes');
  const reg = await post('/api/teacher/register', {
    email: 'gb.agree@example.org', password: 'a-long-enough-password', name: 'GB Agree', school: 'Example High',
  });
  const teacherToken = reg.body.token;
  ok('  teacher registered', reg.status === 201 && !!teacherToken, reg.body);

  const cls = await post('/api/teacher/classes', {
    class_name: 'Agreement Period 1', course: COURSE,
  }, teacherToken);
  const code = cls.body && cls.body.class && cls.body.class.class_code;
  ok('  class created', !!code, cls.body);

  // Authored denominators on SOME columns only, so both the authored and the
  // unauthored branch of each renderer is exercised in one run.
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
       (?,'unit-1','1.1','exercise-1',7),
       (?,'unit-1','1.1','quiz',6),
       (?,'unit-1','1.2','exercise-1',5)`, COURSE, COURSE, COURSE);

  // Six students so a class average is meaningful, each on a different score so
  // a cell mixed up between students would show rather than cancel out.
  const marks = [
    { ex1: 100, lab: 50, quiz: 92 },
    { ex1: 71, lab: 85, quiz: 100 },   // 71 is the 5-of-7 case
    { ex1: 43, lab: 100, quiz: 67 },
    { ex1: 86, lab: 0, quiz: 83 },
    { ex1: 0, lab: 75, quiz: 50 },
    { ex1: 57, lab: 90, quiz: 75 },
  ];
  for (let i = 0; i < marks.length; i++) {
    const j = await post('/api/student/join', { class_code: code, display_name: 'GA' + (i + 1), pin: '1234' });
    const tok = j.body.token;
    const m = marks[i];
    // Lesson visit, then two graded activities on 1.1 and one on 1.2.
    await post('/api/student/progress', { course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', completed: true }, tok);
    await post('/api/student/progress', { course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1', score: m.ex1, completed: true }, tok);
    // 'lab' has NO authored denominator: the unauthored branch.
    await post('/api/student/progress', { course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'lab', score: m.lab, completed: true }, tok);
    await post('/api/student/progress', { course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'exercise-1', score: m.ex1, completed: true }, tok);
    // The quiz path: quiz_attempts plus progress, never a score_event.
    await post('/api/student/quiz', { course: COURSE, unit: 'unit-1', lesson: '1.1', score: m.quiz, answers: {} }, tok);
  }
  ok('  six students carrying graded work', db.prepare('SELECT COUNT(*) n FROM students').get().n === 6);

  console.log('2. Render the same class both ways');
  const tv = await get(`/api/teacher/classes/${code}/progress`, teacherToken);
  ok('  teacher view responds', tv.status === 200 && Array.isArray(tv.body.summary), tv.status);
  const { buildGradebook } = require('../lib/admin-gradebook');
  const av = buildGradebook(code, { reveal: true });
  ok('  admin view responds', !!av && Array.isArray(av.students), !!av);

  console.log('3. Every cell must agree');
  //  Two severities, because they mean different things to whoever is looking.
  //
  //  GRADE disagreement: the two pages show a student a different mark for the
  //  same work. Always a defect, always fails.
  //
  //  PRESENTATION difference: same grade, different "out of". There is one KNOWN
  //  and intentional case. A whole-activity lesson score is stored as a percent,
  //  so its score_event carries a hardcoded max_points of 100. On a column with
  //  no authored course_denominators row the teacher view surfaces that as
  //  "50 / 100", while the admin view deliberately prints the percent alone
  //  rather than imply a 100 point assignment. Reported, not failed, because
  //  silencing it would hide the day an authored denominator goes missing.
  //
  //  Teacher: detail[unit][lesson][activity]. Admin: students[].items['lesson|activity'].
  const adminByName = new Map(av.students.map((s) => [s.name || s.label, s]));
  const authored = new Set(db.prepare(
    'SELECT lesson, activity_type FROM course_denominators WHERE course = ?'
  ).all(COURSE).map((r) => `${r.lesson}|${r.activity_type}`));

  const gradeDiffs = [];
  const presentation = [];
  let compared = 0;

  for (const row of tv.body.summary) {
    const a = adminByName.get(row.student.name);
    if (!a) { gradeDiffs.push({ student: row.student.name, cell: '-', field: 'student', teacher: 'present', admin: 'MISSING' }); continue; }
    for (const unit of Object.keys(row.detail || {})) {
      for (const lesson of Object.keys(row.detail[unit] || {})) {
        for (const act of Object.keys(row.detail[unit][lesson] || {})) {
          const t = row.detail[unit][lesson][act];
          const key = `${lesson}|${act}`;
          const cell = a.items[key];
          // A visit-only row carries no grade on either side; nothing to compare.
          if (t.score == null && !cell) continue;
          if (!cell) {
            gradeDiffs.push({ student: row.student.name, cell: `${lesson} ${act}`, field: 'cell', teacher: t.score, admin: 'MISSING' });
            continue;
          }
          compared++;

          // The grade itself.
          if (!samePct(t.score, cell.pct)) {
            gradeDiffs.push({ student: row.student.name, cell: `${lesson} ${act}`, field: 'pct', teacher: t.score, admin: cell.pct });
          }

          // The "out of". On an authored column both sides must land on the same
          // points, because both claim to be rescaling to the same authored value.
          const isAuthored = authored.has(key);
          const bucket = isAuthored ? gradeDiffs : presentation;
          if (!samePoints(t.points_possible, cell.possible)) {
            bucket.push({ student: row.student.name, cell: `${lesson} ${act}`, field: 'possible', teacher: t.points_possible, admin: cell.possible });
          }
          if (!samePoints(t.points_earned, cell.earned)) {
            bucket.push({ student: row.student.name, cell: `${lesson} ${act}`, field: 'earned', teacher: t.points_earned, admin: cell.earned });
          }
        }
      }
    }
  }

  const table = (title, rows) => {
    console.log('\n  ' + title + ' (' + rows.length + '):');
    console.log('  ' + 'student'.padEnd(9) + 'cell'.padEnd(18) + 'field'.padEnd(11) + 'teacher'.padEnd(12) + 'admin');
    for (const d of rows.slice(0, 40)) {
      console.log('  ' + String(d.student).padEnd(9) + String(d.cell || '').padEnd(18) +
        String(d.field).padEnd(11) + String(d.teacher).padEnd(12) + String(d.admin));
    }
    if (rows.length > 40) console.log('  ... and ' + (rows.length - 40) + ' more');
    console.log('');
  };

  ok(`  compared ${compared} graded cells`, compared >= 24, compared);
  if (gradeDiffs.length) table('GRADE DISAGREEMENTS', gradeDiffs);
  ok('  no student is shown a different grade by the two views', gradeDiffs.length === 0, gradeDiffs.length);

  if (presentation.length) {
    table('PRESENTATION DIFFERENCES (same grade, different "out of")', presentation);
    // Name the known case explicitly so an UNKNOWN one is not lost in the noise.
    const knownShape = presentation.every((d) =>
      (d.field === 'possible' && d.teacher === 100 && d.admin === undefined) ||
      (d.field === 'earned' && d.admin === undefined));
    console.log(knownShape
      ? '  All of the above are the known unauthored-column case: teacher renders the\n'
        + '  stored percent as "N / 100", admin prints the percent alone. Same grade.\n'
        + '  Authoring a course_denominators row for the column resolves it on both sides.\n'
      : '  NOTE: at least one of these is NOT the known unauthored-column case. Look.\n');
    ok('  every presentation difference is the known unauthored-column case', knownShape);
  } else {
    ok('  no presentation differences at all', true);
  }

  console.log('4. The quiz cell in particular carries through to both');
  const anyQuiz = av.students.every((s) => s.items['1.1|quiz'] && s.items['1.1|quiz'].pct != null);
  ok('  admin shows a quiz grade for every student', anyQuiz);
  const tQuiz = tv.body.summary.every((r) => r.detail['unit-1'] && r.detail['unit-1']['1.1'] &&
    r.detail['unit-1']['1.1'].quiz && r.detail['unit-1']['1.1'].quiz.score != null);
  ok('  teacher shows a quiz grade for every student', tQuiz);

  // ── 5. An ungraded column carries no points, in every view ────────────────
  //  A lesson is a page visit, not graded work, and lib/gradebook-contract.js is
  //  the one authority on that line. The teacher route did not ask it, and the
  //  disagreement was visible on a live dashboard: a lesson scored 20 percent
  //  was reported as points_earned 20 out of points_possible 100, sourced
  //  'observed' as though 100 had been counted, while the contract reported the
  //  same cell as ungraded with no points at all.
  //
  //  The 100 came from the synthetic 'lesson-score' row, a percent carrier
  //  stored as points = percent, max_points = 100. The contract excludes it;
  //  this route summed it.
  //
  //  Two things went wrong, and the second is the dangerous one:
  //    - the dashboard printed a red "20/100" for a page visit, so a row's own
  //      cells no longer added up to the row's total
  //    - the teacher's include-lessons toggle would have weighted that page
  //      visit at 100 points, twenty times a real 5 point quiz
  //
  //  Section 1 posts its lesson with no score at all, which is why this went
  //  unnoticed. A SCORED lesson is the case that matters.
  console.log('5. A scored lesson is ungraded everywhere, and carries no points');
  const sTok = (await post('/api/student/join',
    { class_code: code, display_name: 'GAL', pin: '1234' })).body.token;
  await post('/api/student/progress',
    { course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', score: 20, completed: true }, sTok);
  // A real graded cell alongside it, so this proves a targeted rule and not a
  // blanket "stop reporting points".
  await post('/api/student/progress',
    { course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'quiz', score: 20, completed: true }, sTok);

  const tv2 = await get(`/api/teacher/classes/${code}/progress`, teacherToken);
  const row = tv2.body.summary.find((r) => r.student && r.student.name === 'GAL');
  const tLesson = row.detail['unit-1']['1.1'].lesson;
  const tQuizCell = row.detail['unit-1']['1.1'].quiz;

  ok('  the teacher route still reports the lesson percent', tLesson.score === 20, tLesson.score);
  ok('  but reports no points for it', tLesson.points_possible == null && tLesson.points_earned == null,
    [tLesson.points_earned, tLesson.points_possible]);
  ok('  and does not claim a denominator was observed',
    tLesson.denominator_source == null, tLesson.denominator_source);
  ok('  specifically not the 100 the lesson-score carrier would have leaked',
    tLesson.points_possible !== 100, tLesson.points_possible);

  ok('  while a real graded cell beside it keeps its authored pair',
    tQuizCell.points_possible === 6 && Math.abs(tQuizCell.points_earned - 1.2) < 0.011,
    [tQuizCell.points_earned, tQuizCell.points_possible]);

  const cg = require('../lib/gradebook-contract').buildCanonicalGradebook(code, { reveal: true });
  const cs = cg.students.find((s) => (s.display_name || s.name || s.label) === 'GAL');
  const cLesson = cs.items['unit-1/1.1/lesson'];
  ok('  the contract agrees the lesson has no points',
    cLesson && cLesson.earned == null && cLesson.possible == null && cLesson.pct == null,
    cLesson);
  ok('  and the two views now agree cell for cell on that column',
    cLesson.possible === (tLesson.points_possible == null ? null : tLesson.points_possible));
  ok('  the lesson contributes nothing to the row total',
    cs.overall.graded === 6 && Math.abs(cs.overall.earned - 1.2) < 0.011,
    [cs.overall.earned, cs.overall.graded]);

  console.log('\n' + (fail === 0 ? `OK - all ${pass} checks passed` : `${fail} FAILED (${pass} passed)`));
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
