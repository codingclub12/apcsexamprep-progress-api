'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a scored LESSON is visible in the gradebook.
//
//  THE BUG THIS CLOSES
//  A founding-cohort AP Cybersecurity teacher reported that her students' grades
//  were not showing up in the gradebook, and that the site "doesn't seem to save
//  progress for anyone". The saving was fine. Every layer of it was fine: the
//  browser posted, the API stored the score, and
//  GET /api/teacher/classes/:code/progress read it back as score: 80.
//
//  The gradebook threw it away at render. lib/gradebook-contract.js treats a
//  'lesson' as a page visit rather than graded work, which is true on CSA and
//  CSP, where a lesson page is reading and the graded items sit beside it as
//  cfu / quiz / exercise rows. It is FALSE on cyber: the lesson page IS the
//  graded activity. Its CFU blocks are scored in the browser and
//  apcs-grade-reporter posts the percent as activity_type 'lesson'. So the
//  contract's ungraded branch blanked the only grade those students had, and the
//  two teacher views disagreed about the same stored row.
//
//  WHAT IS PINNED HERE
//   - a lesson row carrying a score surfaces that score as pct
//   - the two teacher views report the SAME percent for it
//   - it still contributes NO points: earned/possible stay null, and the
//     overall grade is byte-identical to what it was before the fix, because a
//     lesson percent has no denominator anyone can point at on a page
//   - a lesson with NO score is untouched: still 'done', still pct null, which
//     is every CSA and CSP lesson visit
//   - a real graded cell beside it keeps its authored pair
//
//  Zero PII: synthetic teacher and students, numbers only.
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-cyber-lesson-score.db');
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

const COURSE = 'ap-cybersecurity';

(async () => {
  console.log('\nCYBER LESSON SCORE VISIBILITY\n');

  console.log('1. A cyber class doing the work the live pages actually report');
  const reg = await post('/api/teacher/register', {
    email: 'cyber.lesson@example.org', password: 'a-long-enough-password',
    name: 'Cyber Lesson', school: 'Example High',
  });
  const teacherToken = reg.body.token;
  ok('  teacher registered', reg.status === 201 && !!teacherToken, reg.body);

  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, teacherToken);
  const code = cls.body && cls.body.class && cls.body.class.class_code;
  ok('  cyber class created', !!code, cls.body);

  const j = await post('/api/student/join', { class_code: code, display_name: 'CL1', pin: '1357' });
  const tok = j.body.token;
  ok('  student joined', j.status === 201 && !!tok, j.body);

  // Exactly the sequence a live cyber lesson page produces: the tracker posts an
  // unscored visit on load, then apcs-grade-reporter posts the CFU percent.
  const visit = await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'lesson', completed: false,
  }, tok);
  ok('  the on-load visit is accepted', visit.status === 200, visit.status);

  const graded = await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'lesson', completed: true, score: 80,
  }, tok);
  ok('  the CFU percent is accepted', graded.status === 200, graded.status);
  ok('  and it really is stored', graded.body.progress && graded.body.progress.score === 80,
    graded.body.progress && graded.body.progress.score);

  // A graded activity beside it, reported as real points by apcs-score-reporter.
  await post('/api/student/score', {
    course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'exercise-1',
    item: 'score', earned: 18, possible: 24, client_event_id: '1.2:exercise-1:score:18:24',
  }, tok);
  // An untouched lesson, to prove a pure visit is not changed by any of this.
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.3', activity_type: 'lesson', completed: true,
  }, tok);

  console.log('2. The teacher can SEE the lesson grade');
  const gb = await get(`/api/teacher/classes/${code}/gradebook`, teacherToken);
  ok('  gradebook responds', gb.status === 200 && Array.isArray(gb.body.students), gb.status);
  const row = gb.body.students[0];
  const lessonCell = row.items['unit-1/1.2/lesson'];

  ok('  the scored lesson carries its percent', lessonCell && lessonCell.pct === 80, lessonCell);
  ok('  and reads as attempted, not as a bare tick',
    lessonCell && lessonCell.status === 'attempted', lessonCell && lessonCell.status);

  console.log('3. But it still carries NO points');
  ok('  no points earned', lessonCell.earned == null, lessonCell.earned);
  ok('  no denominator invented', lessonCell.possible == null, lessonCell.possible);
  ok('  specifically not the 100 a percent carrier would leak',
    lessonCell.possible !== 100, lessonCell.possible);
  ok('  and it is labelled as a percent, not an authored total',
    lessonCell.possible_source === 'percent', lessonCell.possible_source);

  console.log('4. The overall grade is unchanged by the lesson percent');
  //  18 of 24 on the one column that has real points, and nothing else folded in.
  ok('  the grade is the points work alone',
    row.overall.earned === 18 && row.overall.graded === 24,
    [row.overall.earned, row.overall.graded]);
  ok('  and its percentage is points based', row.overall.pct === 75, row.overall.pct);

  console.log('5. A lesson with no score is untouched (every CSA / CSP visit)');
  const visitCell = row.items['unit-1/1.3/lesson'];
  ok('  an unscored lesson still has no percent', visitCell && visitCell.pct == null, visitCell);
  ok('  and still reads as done', visitCell && visitCell.status === 'done', visitCell && visitCell.status);

  console.log('6. The two teacher views agree about the same row');
  const pv = await get(`/api/teacher/classes/${code}/progress`, teacherToken);
  const detail = pv.body.summary[0].detail['unit-1']['1.2'].lesson;
  ok('  the older progress view reports the percent', detail.score === 80, detail.score);
  ok('  and the gradebook reports the SAME percent',
    lessonCell.pct === detail.score, [lessonCell.pct, detail.score]);
  ok('  both agree there are no points',
    lessonCell.possible == null && detail.points_possible == null,
    [lessonCell.possible, detail.points_possible]);

  console.log('\n------------------------------------------');
  console.log(`${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
