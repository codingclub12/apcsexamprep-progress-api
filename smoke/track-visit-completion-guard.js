'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a bare page view never completes a graded activity.
//
//  WHAT WAS WRONG
//  POST /api/student/track (the sitewide footer beacon that fires on every
//  ap-* page load) set completed = 1 on the FIRST call for any activity_type
//  except quiz and exam, no grading interaction required. Cyber's Lab and
//  Exercise pages carry real check-btn grading (see apcs-tracker.js's
//  trackActivityCompletion), but a bare visit to one of those pages still
//  wrote completed = 1 to the progress table immediately, before a single
//  button was clicked. On the course hub (apcs-hub-progress.js) that showed
//  as the row turning green from a visit alone, reported live on 2026-08-22
//  as "Lab" turning green just from opening it. Confirmed against production
//  with a fresh account: POST solo-init, then POST /track with the Lab
//  handle, and GET /progress already showed completed: 1 with zero grading
//  interaction (see docs/runs/2026-08-24-claude-code-track-visit-fix.md).
//
//  THE FIX
//  /track now only auto-completes on a bare visit for activity_type
//  'lesson' (pure reading pages, unchanged from before). Exercise-1,
//  exercise-2 and lab still get a progress row on visit, so the hub still
//  shows started/amber, but completed stays 0 until the page's own grading
//  flow (POST /api/student/progress with completed: true) says otherwise.
//  Quiz and exam were already excluded before this fix and stay excluded.
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:trackguard
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-track-visit-completion-guard.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-track-visit-completion-guard-secret-long-enough';

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c1','CYBER-TRK','Cyber','ap-cybersecurity','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const sTok = signStudentToken({ id: 's1', class_id: 'c1', display_name: 'A' });

const track = (handle) => fetch(`${base()}/api/student/track`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sTok },
  body: JSON.stringify({ handle }),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const progressPost = (body) => fetch(`${base()}/api/student/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sTok },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const row = (unit, lesson, activity_type) => db.prepare(`
  SELECT completed, completed_at, score FROM progress
  WHERE student_id = 's1' AND course = 'ap-cybersecurity'
    AND unit = ? AND lesson = ? AND activity_type = ?
`).get(unit, lesson, activity_type);

(async () => {
  console.log('\nTRACK VISIT NEVER COMPLETES A GRADED ACTIVITY\n');

  console.log('1. A bare visit to the Lab page is seen, not completed');
  const t1 = await track('ap-cyber-unit-1-lesson-1-lab');
  ok('  /track reports it as tracked', t1.body.tracked === true, t1.body);
  const labAfterVisit = row('unit-1', '1.1', 'lab');
  ok('  a progress row exists (the hub can show started/amber)', !!labAfterVisit, labAfterVisit);
  ok('  but completed is 0, not 1', labAfterVisit && labAfterVisit.completed === 0, labAfterVisit);
  ok('  and completed_at is null', labAfterVisit && labAfterVisit.completed_at == null, labAfterVisit);

  console.log('2. Revisiting the same Lab page still does not complete it');
  await track('ap-cyber-unit-1-lesson-1-lab');
  const labAfterRevisit = row('unit-1', '1.1', 'lab');
  ok('  still not completed after a second bare visit', labAfterRevisit.completed === 0, labAfterRevisit);

  console.log('3. The real grading flow can still complete it');
  await progressPost({ course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.1',
    activity_type: 'lab', completed: true });
  const labAfterGrading = row('unit-1', '1.1', 'lab');
  ok('  completed becomes 1 once the page reports completion', labAfterGrading.completed === 1, labAfterGrading);

  console.log('4. A revisit after real completion does not un-complete it or move completed_at');
  const stampBefore = labAfterGrading.completed_at;
  await track('ap-cyber-unit-1-lesson-1-lab');
  const labAfterPostGradingVisit = row('unit-1', '1.1', 'lab');
  ok('  still completed', labAfterPostGradingVisit.completed === 1, labAfterPostGradingVisit);
  ok('  completed_at unchanged', labAfterPostGradingVisit.completed_at === stampBefore, labAfterPostGradingVisit);

  console.log('5. Exercise-1 and exercise-2 get the same treatment as Lab');
  await track('ap-cyber-unit-1-lesson-1-exercise-1');
  const ex1 = row('unit-1', '1.1', 'exercise-1');
  ok('  exercise-1 seen but not completed on a bare visit', ex1 && ex1.completed === 0, ex1);
  await track('ap-cyber-unit-1-lesson-1-exercise-2');
  const ex2 = row('unit-1', '1.1', 'exercise-2');
  ok('  exercise-2 seen but not completed on a bare visit', ex2 && ex2.completed === 0, ex2);

  console.log('6. Lesson pages are unaffected: a visit still completes them');
  await track('ap-cyber-unit-1-lesson-1');
  const lesson = row('unit-1', '1.1', 'lesson');
  ok('  a lesson visit still auto-completes', lesson && lesson.completed === 1, lesson);
  ok('  with no score, which a lesson visit must never carry', lesson.score == null, lesson);

  console.log('7. Quiz and exam stay excluded from /track entirely, unchanged');
  const t7 = await track('ap-cyber-unit-1-lesson-1-quiz');
  ok('  quiz handles are still reported as untracked', t7.body.tracked === false, t7.body);
  ok('  and no progress row was created for it', !row('unit-1', '1.1', 'quiz'));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  process.exit(1);
});
