'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a graded quiz must be visible to every "are grades arriving" view.
//
//  The bug this closes: graded submissions live in TWO ledgers, not one.
//  score_events holds CFU items, per-item writes and whole-activity lesson
//  scores. Client-submitted quizzes do not go there. POST /api/student/quiz,
//  which is the path every Cybersecurity quiz page uses through
//  APCS_saveQuizScore, writes quiz_attempts plus the progress row.
//
//  Every operator view counted score_events alone, so a real, graded, passing
//  quiz registered as nothing:
//    - "Quizzes scoring" read 0 events and could never read anything else, on
//      the one course that submits quizzes this way
//    - a class working entirely through quizzes showed 0 score events and
//      tripped scores_missing, the flag that means a reporter is broken
//    - admin health raised its two CRITICAL "scores are not syncing" alarms
//      against classes whose quizzes were arriving perfectly well
//
//  A teacher was told grades were not syncing while the grades sat in their own
//  gradebook. So the bar here is: submit a quiz through the real route, then
//  assert every one of those views sees it.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:quizvisibility
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quiz-visibility.db');
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
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const run = (s, ...a) => db.prepare(s).run(...a);

(async () => {
  console.log('\nQUIZ GRADE VISIBILITY\n');

  run(`INSERT INTO teachers (id,name,email,password_hash,school)
       VALUES ('t_q','Quiz Teacher','quiz.teacher@example.org','x','Example High School')`);
  // Quiz-only class: every grade this class has lives in quiz_attempts. That is
  // the case the old code could not see at all.
  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
       VALUES ('c_q','CYBER-QSMK','Quiz Only','ap-cybersecurity','t_q',1,80,0)`);

  console.log('1. Five students each complete a lesson page and take the quiz');
  for (let i = 1; i <= 5; i++) {
    const j = await post('/api/student/join', { class_code: 'CYBER-QSMK', display_name: 'QS' + i, pin: '1234' });
    const tok = j.body.token;
    await post('/api/student/progress', {
      course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.2', activity_type: 'lesson', completed: true }, tok);
    const q = await post('/api/student/quiz', {
      course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.2', score: 92, answers: {} }, tok);
    if (i === 1) ok('  the quiz route accepts and passes the submission', q.status === 200 && q.body.passed === true, q.body);
  }
  ok('  five quiz attempts are on the ledger',
    db.prepare('SELECT COUNT(*) n FROM quiz_attempts').get().n === 5);
  ok('  and none of them wrote a score_event (this is why the views missed them)',
    db.prepare('SELECT COUNT(*) n FROM score_events').get().n === 0);

  console.log('2. The account view counts them as the graded work they are');
  const { teacherDetail, listTeachers } = require('../lib/admin-teacher');
  const d = teacherDetail('t_q');
  const cls = d.classes[0];
  ok('  class score events counts the quizzes', cls.score_events === 5, cls.score_events);
  ok('  totals agree', d.totals.score_events === 5, d.totals);
  ok('  the quiz KIND bucket is populated', cls.score_kinds.quiz === 5, cls.score_kinds);
  ok('  and they are not misfiled as exercises', cls.score_kinds.other === 0, cls.score_kinds);
  ok('  every student shows their quiz', d.roster.every((r) => r.score_events === 1), d.roster.map((r) => r.score_events));
  ok('  every student reads as syncing', d.roster.every((r) => r.syncing === true));
  ok('  no scores_missing problem is raised',
    !cls.problems.some((p) => p.code === 'scores_missing'), cls.problems);
  ok('  the 30 day timeline shows the quiz day',
    d.activity_30d.reduce((n, x) => n + x.scores, 0) === 5,
    d.activity_30d.filter((x) => x.scores));

  console.log('3. Feature adoption reports quizzes as adopted');
  const feat = (k) => d.feature_usage.find((f) => f.key === k);
  ok('  "Quizzes scoring" is marked used', feat('quiz').used === true, feat('quiz'));
  ok('  with the real count', feat('quiz').detail === '5 events', feat('quiz'));
  ok('  the catch-all bucket is named for what it holds',
    feat('code').label === 'Exercises and labs graded', feat('code').label);

  console.log('4. The teacher list health flag reads reporting, not broken');
  const row = listTeachers().teachers.find((t) => t.id === 't_q');
  ok('  status is reporting', row.status === 'reporting', row.status);
  ok('  score events are counted at list level too', row.score_events === 5, row.score_events);

  console.log('5. Admin health raises no false "scores are not syncing" alarm');
  const health = require('../lib/admin-health').computeHealth();
  const codes = (health.findings || []).map((f) => f.code);
  ok('  no class_no_graded_work', !codes.includes('class_no_graded_work'), codes);
  ok('  no students_visit_no_score', !codes.includes('students_visit_no_score'), codes);

  console.log('\n' + (fail === 0 ? `OK - all ${pass} checks passed` : `${fail} FAILED (${pass} passed)`));
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
