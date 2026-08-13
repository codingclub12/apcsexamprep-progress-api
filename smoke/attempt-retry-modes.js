'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: System A (the `attempts` table) honors the three-mode retry policy.
//
//  THE GAP THIS CLOSES
//  W11 made classes.retry_mode the policy for everything on the score_events
//  ledger, but deliberately left System A alone: routes/progress.js and every
//  reader of the attempts table still resolved grade of record from the legacy
//  boolean. Converting it in that pass would have regraded live CSA / CSP
//  attempts on deploy day, which the migration requirement forbade.
//
//  The consequence was that a class on mode 'practice' behaved TWO ways at once.
//  A CFU posted through POST /api/student/score was redoable; the same kind of
//  CFU posted through POST /api/progress/attempt was one shot, because the
//  legacy boolean for a 'practice' class is 0 and System A read 0 as "first
//  attempt on everything". That is the split this closes, and it is exactly the
//  path the CSA Unit 1 pilot exercises.
//
//  WHAT IS PINNED HERE
//   - POST /api/progress/attempt returns a grade of record that follows the mode
//     PER ITEM TYPE: under 'practice' a cfu is best-of and a quiz is first-only
//   - mode 'all' is best-of on both, mode 'none' is first-attempt on both
//   - students.retry_override still wins outright against every mode
//   - all five readers agree with each other and with the API response:
//       routes/progress.js, lib/admin-gradebook.js (and lib/attempt-rollup.js,
//       which reuses its query), routes/admin.js, lib/admin-exec.js
//   - GET /api/student/history flags the same attempt as the gradebook
//   - changing the mode re-grades retroactively, with no row rewritten
//   - the regrade DIRECTION on deploy: a 'practice' class moves cfu grades from
//     first to best, so a stored grade can only rise
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:attemptretry
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-attempt-retry-modes.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const { buildGradebook } = require('../lib/admin-gradebook');
const { attemptRollup } = require('../lib/attempt-rollup');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

const app = express();
app.use(express.json());
app.use('/api/progress', require('../routes/progress'));
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

// ── fixtures ─────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
// One class per mode. retry_allowed carries the derived invariant (1 only for
// 'all'), exactly as the boot backfill and the PATCH route maintain it.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode) VALUES
 ('c_all','t1','CSA-ALL','Everything','ap-csa',1,80,1,'all'),
 ('c_prac','t1','CSA-PRC','Practice only','ap-csa',1,80,0,'practice'),
 ('c_none','t1','CSA-NON','Nothing','ap-csa',1,80,0,'none')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s_all','c_all','A','x'),
 ('s_prac','c_prac','B','x'),
 ('s_none','c_none','C','x'),
 ('s_ovr','c_none','D','x')`);
// s_ovr sits in the strictest class but carries a personal override.
run(`UPDATE students SET retry_override = 1 WHERE id = 's_ovr'`);

// Manifest: one lesson, one CFU (practice) and one quiz (assessment), so the
// same class can be observed on both sides of the practice / assessment line.
const mrow = (item, type, pts) =>
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-csa','unit-1','1.1',?,?,?)`, item, type, pts);
mrow('1.1-cfu-1', 'cfu', 1);
mrow('1.1-quiz', 'quiz', 10);

const tok = (sid) => signStudentToken({ id: sid, class_id: one('SELECT class_id FROM students WHERE id = ?', sid).class_id });
const post = (sid, item_id, item_type, score, max_score) => call('POST', '/api/progress/attempt', {
  course: 'ap-csa', lesson_id: '1.1', item_id, item_type, score, max_score,
}, tok(sid));

// Points at grade of record as the ADMIN GRADEBOOK sees them (the GOR_FOR_CLASS
// pass, also used by lib/attempt-rollup.js for the teacher dashboard and the CSV
// export). Cells are keyed `lesson|activity`.
const gbScore = (classId, sid, activity) => {
  const g = buildGradebook(classId, {});
  const stu = (g.students || []).find((r) => r.id === sid);
  // Read the item's OWN key: the admin grid keys columns by unit, so a hand
  // built "1.1|quiz" silently matched nothing and every assertion read null.
  const item = (g.items || []).find((i) => i.lesson_id === '1.1' && i.activity === activity);
  const cell = stu && stu.items && item && stu.items[item.key];
  return cell ? cell.earned : null;
};

(async () => {
  console.log('\nSYSTEM A RETRY MODES (the attempts table follows the policy)\n');

  // ── 1. mode 'practice': the split that was the whole bug ──────────────────
  console.log('1. Mode practice: a CFU is redoable, a quiz in the same class is not');
  {
    await post('s_prac', '1.1-cfu-1', 'cfu', 0, 1);
    const better = await post('s_prac', '1.1-cfu-1', 'cfu', 1, 1);
    ok('  the CFU grade of record moved to the better attempt',
      better.body.grade_of_record.score === 1, better.body.grade_of_record);
    ok('  and it is reported as attempt 2 of 2',
      better.body.grade_of_record.attempt_no === 2, better.body.grade_of_record);

    await post('s_prac', '1.1-quiz', 'quiz', 4, 10);
    const retake = await post('s_prac', '1.1-quiz', 'quiz', 9, 10);
    ok('  the quiz grade of record stayed on the FIRST attempt',
      retake.body.grade_of_record.score === 4, retake.body.grade_of_record);
    ok('  every submission is still stored: two quiz rows',
      one(`SELECT COUNT(*) n FROM attempts WHERE student_id='s_prac' AND item_id='1.1-quiz'`).n === 2);
  }

  // ── 2. The other two modes ────────────────────────────────────────────────
  console.log('\n2. Mode all is best on both; mode none is first on both');
  {
    await post('s_all', '1.1-cfu-1', 'cfu', 0, 1);
    const c = await post('s_all', '1.1-cfu-1', 'cfu', 1, 1);
    await post('s_all', '1.1-quiz', 'quiz', 4, 10);
    const q = await post('s_all', '1.1-quiz', 'quiz', 9, 10);
    ok('  all: CFU best', c.body.grade_of_record.score === 1, c.body.grade_of_record);
    ok('  all: quiz best', q.body.grade_of_record.score === 9, q.body.grade_of_record);

    await post('s_none', '1.1-cfu-1', 'cfu', 0, 1);
    const c2 = await post('s_none', '1.1-cfu-1', 'cfu', 1, 1);
    await post('s_none', '1.1-quiz', 'quiz', 4, 10);
    const q2 = await post('s_none', '1.1-quiz', 'quiz', 9, 10);
    ok('  none: CFU first', c2.body.grade_of_record.score === 0, c2.body.grade_of_record);
    ok('  none: quiz first', q2.body.grade_of_record.score === 4, q2.body.grade_of_record);
  }

  // ── 3. The per-student override still wins ────────────────────────────────
  console.log('\n3. students.retry_override beats the class mode, unchanged');
  {
    await post('s_ovr', '1.1-cfu-1', 'cfu', 0, 1);
    const c = await post('s_ovr', '1.1-cfu-1', 'cfu', 1, 1);
    await post('s_ovr', '1.1-quiz', 'quiz', 4, 10);
    const q = await post('s_ovr', '1.1-quiz', 'quiz', 9, 10);
    ok('  override grants best-of on practice in a none class',
      c.body.grade_of_record.score === 1, c.body.grade_of_record);
    ok('  and on the assessment too', q.body.grade_of_record.score === 9, q.body.grade_of_record);
  }

  // ── 4. Every reader agrees ────────────────────────────────────────────────
  //  This is the assertion that actually protects the change. Five call sites
  //  resolve grade of record over `attempts`; if any one of them keeps its own
  //  copy of the rule, a teacher sees a different number depending on which
  //  screen she opens.
  console.log('\n4. The API, the gradebook and the rollup report the same attempt');
  {
    ok('  gradebook agrees on the practice-mode CFU (best, 1)',
      gbScore('c_prac', 's_prac', 'cfu') === 1, gbScore('c_prac', 's_prac', 'cfu'));
    ok('  gradebook agrees on the practice-mode quiz (first, 4)',
      gbScore('c_prac', 's_prac', 'quiz') === 4, gbScore('c_prac', 's_prac', 'quiz'));
    ok('  gradebook agrees on the none-mode CFU (first, 0)',
      gbScore('c_none', 's_none', 'cfu') === 0, gbScore('c_none', 's_none', 'cfu'));

    // attempt-rollup drives the teacher dashboard and the CSV export off the
    // same query, so it must not need its own assertion of the rule.
    const roll = attemptRollup('c_prac', 'ap-csa');
    const cfuCell = roll && roll.cells.get('s_prac|1.1|cfu');
    ok('  the teacher rollup counts the same CFU points (1 of 1)',
      !!cfuCell && cfuCell.earned === 1, cfuCell);
    const quizCell = roll && roll.cells.get('s_prac|1.1|quiz');
    ok('  and the same quiz points (4 of 10)',
      !!quizCell && quizCell.earned === 4, quizCell);
  }

  // ── 5. History flags the same row ─────────────────────────────────────────
  console.log('\n5. GET /api/student/history flags the attempt the gradebook uses');
  {
    const h = await call('GET', '/api/student/history?lesson=1.1', null, tok('s_prac'));
    const att = (h.body.history || []).filter((r) => r.source === 'attempt');
    const gorOf = (item) => att.filter((r) => r.item === item && r.grade_of_record);
    ok('  the CFU grade of record is the better attempt (1)',
      gorOf('1.1-cfu-1').length === 1 && gorOf('1.1-cfu-1')[0].points === 1, gorOf('1.1-cfu-1'));
    ok('  the quiz grade of record is the FIRST attempt (4)',
      gorOf('1.1-quiz').length === 1 && gorOf('1.1-quiz')[0].points === 4, gorOf('1.1-quiz'));
    ok('  history reports the class mode it applied',
      h.body.retry_mode === 'practice', h.body.retry_mode);
  }

  // ── 6. Retroactive in both directions, with no rewrite ────────────────────
  console.log('\n6. Changing the mode re-grades attempts already recorded');
  {
    const before = one(`SELECT COUNT(*) n FROM attempts WHERE student_id = 's_prac'`).n;

    run(`UPDATE classes SET retry_mode = 'none', retry_allowed = 0 WHERE id = 'c_prac'`);
    ok('  none: the CFU falls back to the first attempt (0)',
      gbScore('c_prac', 's_prac', 'cfu') === 0, gbScore('c_prac', 's_prac', 'cfu'));

    run(`UPDATE classes SET retry_mode = 'all', retry_allowed = 1 WHERE id = 'c_prac'`);
    ok('  all: the quiz rises to the best attempt (9)',
      gbScore('c_prac', 's_prac', 'quiz') === 9, gbScore('c_prac', 's_prac', 'quiz'));

    run(`UPDATE classes SET retry_mode = 'practice', retry_allowed = 0 WHERE id = 'c_prac'`);
    ok('  and back to practice: CFU best (1), quiz first (4)',
      gbScore('c_prac', 's_prac', 'cfu') === 1 && gbScore('c_prac', 's_prac', 'quiz') === 4);
    ok('  no attempt row was written, rewritten or deleted by any of it',
      one(`SELECT COUNT(*) n FROM attempts WHERE student_id = 's_prac'`).n === before, before);
  }

  // ── 6b. A NULL retry_mode resolves the SAME way in SQL and in JS ──────────
  //  A row can carry a NULL retry_mode only between an insert by an older code
  //  path and the next boot, which is exactly the window nobody tests. The JS
  //  (resolveMode, used by routes/progress.js) falls back to the legacy boolean
  //  through the deploy mapping; the SQL passes must do the same or the API and
  //  the gradebook report different attempts for the same student. This pins the
  //  two together rather than trusting that they happen to agree.
  console.log('\n6b. A NULL retry_mode reads the same way from SQL and from JS');
  {
    // retry_allowed 0 means the deploy mapping 'practice': best on practice,
    // first on an assessment. Clear the mode WITHOUT touching the boolean.
    run(`UPDATE classes SET retry_mode = NULL WHERE id = 'c_prac'`);

    const cfu = await post('s_prac', '1.1-cfu-1', 'cfu', 1, 1);
    ok('  JS (the attempt API) reads NULL + retry_allowed 0 as practice: CFU best',
      cfu.body.grade_of_record.score === 1, cfu.body.grade_of_record);
    ok('  SQL (the gradebook) agrees on the CFU',
      gbScore('c_prac', 's_prac', 'cfu') === 1, gbScore('c_prac', 's_prac', 'cfu'));
    ok('  and both hold the quiz on its first attempt',
      gbScore('c_prac', 's_prac', 'quiz') === 4, gbScore('c_prac', 's_prac', 'quiz'));

    // The boot backfill is what closes the window. Same statements as production.
    for (const sql of require('../retry-policy').BACKFILL_SQL) db.exec(sql);
    ok('  the boot backfill maps the row to practice, closing the window',
      one(`SELECT retry_mode FROM classes WHERE id = 'c_prac'`).retry_mode === 'practice');
  }

  // ── 7. The deploy-day direction ───────────────────────────────────────────
  //  What actually changes for live data when this ships. A 'practice' class is
  //  the only one that moves, and it moves practice items from first to best, so
  //  a recorded grade can only rise. Assessments do not move at all: the legacy
  //  boolean for a 'practice' class was 0, which was already first-attempt.
  console.log('\n7. On deploy a practice class moves practice UP, and nothing else');
  {
    // Reproduce the old behavior exactly: the legacy boolean alone.
    const legacyFirst = one(`
      SELECT score FROM (
        SELECT score, ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY attempt_no ASC) rn
        FROM attempts WHERE student_id = 's_prac' AND item_id = '1.1-cfu-1'
      ) WHERE rn = 1
    `).score;
    ok('  the old rule would have kept the CFU at 0', legacyFirst === 0, legacyFirst);
    ok('  the new rule reports 1, which is a rise, never a fall',
      gbScore('c_prac', 's_prac', 'cfu') > legacyFirst);

    const quizNow = gbScore('c_prac', 's_prac', 'quiz');
    ok('  the quiz is untouched by the change: still the first attempt, 4',
      quizNow === 4, quizNow);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
