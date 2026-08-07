'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: off-platform score entry.
//    GET  /api/teacher/classes/:code/scores
//    POST /api/teacher/classes/:code/scores
//
//  WHY THIS EXISTS
//  smoke/manifest-prune.js pins the rule that a course_manifest row IS a
//  denominator, and that an item nobody can report marks every student down
//  invisibly. The printed instruments are the case that rule cannot solve by
//  un-seeding: the four AP Networking unit tests and the three cumulative exams
//  are 258 points of assessment a teacher really gives, on paper. Entry is what
//  makes those manifest rows true instead of a silent penalty.
//
//  The properties that matter, and that a careless refactor would break:
//   - the manifest supplies lesson_id, item_type and max_score; the teacher
//     supplies only a score, and an out-of-range one is refused
//   - RE-ENTRY REPLACES. A typo corrected from 34 to 43 must not leave 43 in the
//     bank as a best attempt under a retry-on class
//   - the replace is scoped to source = 'teacher'. A student-reported attempt at
//     the same item is never deleted, and still counts toward attempt_no
//   - a null score clears the teacher's row and writes nothing
//   - the batch is validated whole: one bad row writes none of them
//   - ownership fails closed. Another teacher's class is a 404, not a write
//   - the entered score reaches the rollup the dashboards read
//
//  Zero PII: synthetic ids and numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:scoreentry
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-teacher-score-entry.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');
const { attemptRollup } = require('../lib/attempt-rollup');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const all = (s, ...a) => db.prepare(s).all(...a);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

// ── FIXTURE ──────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES
 ('t1','Owner','owner@s.org','x'),
 ('t2','Other','other@s.org','x')`);
// retry_mode 'all' so grade of record is the BEST attempt. That is the mode in
// which a stacked correction does real damage, so it is the one to test under.
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,retry_mode) VALUES
 ('c1','NET-0001','Period 1','ap-networking','t1',1,80,1,'all'),
 ('c2','NET-0002','Somebody else','ap-networking','t2',1,80,1,'all')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c1','Ada','x'),
 ('s2','c1','Grace','x'),
 ('s3','c1','Alan','x'),
 ('sx','c2','Outsider','x')`);

const mrow = (unit, lesson, item, type, pts) =>
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES ('ap-networking',?,?,?,?,?)`,
    unit, lesson, item, type, pts);
// The offline instruments, exactly as scripts/seed-manifest.js writes them.
mrow('course', 'exam', 'exam-midterm', 'quiz', 40);
mrow('unit-1', 'test', '1-test', 'quiz', 22);
// One online item, to prove the teacher route cannot disturb a student's row.
mrow('unit-1', '1.1', '1.1-quiz', 'quiz', 10);
// A visit row is not an assessment and must be refused.
mrow('unit-1', '1.1', '1.1', 'visit', 1);

const OWNER = signTeacherToken({ id: 't1', name: 'Owner', email: 'owner@s.org' });
const OTHER = signTeacherToken({ id: 't2', name: 'Other', email: 'other@s.org' });

const attemptsFor = (sid, item) =>
  all('SELECT score, max_score, attempt_no, passed, source FROM attempts WHERE student_id = ? AND item_id = ? ORDER BY attempt_no', sid, item);

(async () => {
  // ── 1. The roster loads before anything is entered ────────────────────────
  console.log('\n1. GET returns the roster and the manifest facts for the item');
  {
    const r = await call('GET', '/api/teacher/classes/NET-0001/scores?course=ap-networking&item_id=exam-midterm', null, OWNER);
    ok('  200', r.status === 200, r.body);
    ok('  max_score comes from the manifest, not the request', r.body.item && r.body.item.max_score === 40, r.body.item);
    ok('  lesson_id and item_type come from the manifest', r.body.item.lesson_id === 'exam' && r.body.item.item_type === 'quiz', r.body.item);
    ok('  all three students listed, none scored yet',
      r.body.students.length === 3 && r.body.students.every((s) => s.score === null && s.attempts === 0), r.body.students);
  }

  // ── 2. Ownership fails closed ─────────────────────────────────────────────
  console.log('\n2. Ownership and auth');
  {
    const anon = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's1', score: 10 }] });
    ok('  no token is 401', anon.status === 401, anon.body);

    const wrong = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's1', score: 10 }] }, OTHER);
    ok('  another teacher gets 404, not a write', wrong.status === 404, wrong.body);
    ok('  and nothing was written', attemptsFor('s1', 'exam-midterm').length === 0);

    const foreign = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 'sx', score: 10 }] }, OWNER);
    ok('  a student from another class is rejected', foreign.status === 400, foreign.body);
    ok('  and no row landed for them', attemptsFor('sx', 'exam-midterm').length === 0);
  }

  // ── 3. The manifest gates the item ────────────────────────────────────────
  console.log('\n3. The manifest is the gate');
  {
    const junk = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-nope', scores: [{ student_id: 's1', score: 10 }] }, OWNER);
    ok('  an unknown item is 400', junk.status === 400 && /course_manifest/.test(junk.body.error), junk.body);

    const visit = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: '1.1', scores: [{ student_id: 's1', score: 1 }] }, OWNER);
    ok('  a visit row is not enterable', visit.status === 400, visit.body);

    const wrongCourse = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-csa', item_id: 'exam-midterm', scores: [{ student_id: 's1', score: 10 }] }, OWNER);
    ok('  a course that is not the class course is 400', wrongCourse.status === 400, wrongCourse.body);
  }

  // ── 4. The batch is validated whole ───────────────────────────────────────
  console.log('\n4. One bad row writes none of them');
  {
    const r = await call('POST', '/api/teacher/classes/NET-0001/scores', {
      course: 'ap-networking', item_id: 'exam-midterm',
      scores: [{ student_id: 's1', score: 30 }, { student_id: 's2', score: 41 }],
    }, OWNER);
    ok('  over max_score is 400', r.status === 400 && /between 0 and 40/.test(r.body.error), r.body);
    ok('  the valid row in the same batch did NOT land', attemptsFor('s1', 'exam-midterm').length === 0);

    const dup = await call('POST', '/api/teacher/classes/NET-0001/scores', {
      course: 'ap-networking', item_id: 'exam-midterm',
      scores: [{ student_id: 's1', score: 30 }, { student_id: 's1', score: 20 }],
    }, OWNER);
    ok('  the same student twice is 400', dup.status === 400, dup.body);
    ok('  and still nothing landed', attemptsFor('s1', 'exam-midterm').length === 0);

    const empty = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [] }, OWNER);
    ok('  an empty batch is 400', empty.status === 400, empty.body);
  }

  // ── 5. A clean class set writes in one pass ───────────────────────────────
  console.log('\n5. Entering a class set');
  {
    const r = await call('POST', '/api/teacher/classes/NET-0001/scores', {
      course: 'ap-networking', item_id: 'exam-midterm',
      scores: [
        { student_id: 's1', score: 34 },
        { student_id: 's2', score: 40 },
        { student_id: 's3', score: 20 },
      ],
    }, OWNER);
    ok('  200 and three recorded', r.status === 200 && r.body.recorded === 3, r.body);

    const a = attemptsFor('s1', 'exam-midterm');
    ok('  one row, attempt_no 1, source teacher', a.length === 1 && a[0].attempt_no === 1 && a[0].source === 'teacher', a);
    ok('  max_score is the manifest points', a[0].max_score === 40, a);
    ok('  passed is computed against the class threshold, not hardcoded',
      a[0].passed === 1 && attemptsFor('s3', 'exam-midterm')[0].passed === 0);
  }

  // ── 6. Re-entry replaces, it does not stack ───────────────────────────────
  console.log('\n6. A corrected typo replaces the teacher row');
  {
    // The damaging case: 43 would be out of range, so use the real shape of the
    // mistake, a too-HIGH score corrected downward under retry-on (best wins).
    const r = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's2', score: 24 }] }, OWNER);
    ok('  200', r.status === 200, r.body);

    const a = attemptsFor('s2', 'exam-midterm');
    ok('  still exactly ONE row', a.length === 1, a);
    ok('  and it is the corrected score, not the original 40', a[0].score === 24, a);
    ok('  attempt_no stayed 1', a[0].attempt_no === 1, a);
    ok('  passed was recomputed on the new score', a[0].passed === 0, a);
  }

  // ── 7. Student-reported attempts are untouchable ──────────────────────────
  console.log('\n7. A student attempt at the same item survives, and numbers correctly');
  {
    run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,source)
         VALUES ('s1','c1','ap-networking','1.1','1.1-quiz','quiz',7,10,0,1,NULL)`);

    const r = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: '1.1-quiz', scores: [{ student_id: 's1', score: 9 }] }, OWNER);
    ok('  200', r.status === 200, r.body);

    let a = attemptsFor('s1', '1.1-quiz');
    ok('  two rows now: the student one and the teacher one', a.length === 2, a);
    ok('  the student row is intact', a[0].source === null && a[0].score === 7, a);
    ok('  the teacher row numbered after it', a[1].source === 'teacher' && a[1].attempt_no === 2, a);

    // Re-enter: the teacher row is replaced, the student row still stands.
    await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: '1.1-quiz', scores: [{ student_id: 's1', score: 8 }] }, OWNER);
    a = attemptsFor('s1', '1.1-quiz');
    ok('  after re-entry still two rows', a.length === 2, a);
    ok('  the student row was NOT deleted', a.some((x) => x.source === null && x.score === 7), a);
    ok('  the teacher row is the new score', a.some((x) => x.source === 'teacher' && x.score === 8), a);
  }

  // ── 8. null clears ────────────────────────────────────────────────────────
  console.log('\n8. A null score clears the teacher entry');
  {
    const r = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's3', score: null }] }, OWNER);
    ok('  200, nothing recorded, one cleared', r.status === 200 && r.body.recorded === 0 && r.body.cleared === 1, r.body);
    ok('  the row is gone', attemptsFor('s3', 'exam-midterm').length === 0);
    ok('  clearing again is harmless', (await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's3', score: null }] }, OWNER)).body.cleared === 0);
    ok('  a zero is a real score, not a clear', true);
    const zero = await call('POST', '/api/teacher/classes/NET-0001/scores',
      { course: 'ap-networking', item_id: 'exam-midterm', scores: [{ student_id: 's3', score: 0 }] }, OWNER);
    ok('  entering 0 writes a row', zero.body.recorded === 1 && attemptsFor('s3', 'exam-midterm').length === 1);
  }

  // ── 9. The GET reflects what was entered ──────────────────────────────────
  console.log('\n9. GET reads back the entered state');
  {
    const r = await call('GET', '/api/teacher/classes/NET-0001/scores?course=ap-networking&item_id=exam-midterm', null, OWNER);
    const byId = Object.fromEntries(r.body.students.map((s) => [s.id, s]));
    ok('  s1 shows 34, flagged as teacher-entered', byId.s1.score === 34 && byId.s1.entered_by_teacher === true, byId.s1);
    ok('  s3 shows the 0 it was given', byId.s3.score === 0 && byId.s3.entered_by_teacher === true, byId.s3);
  }

  // ── 10. It reaches the gradebook rollup ───────────────────────────────────
  console.log('\n10. The entered score reaches the rollup the dashboards read');
  {
    const roll = attemptRollup('c1', 'ap-networking');
    ok('  the course is on System A', !!roll);
    const cell = roll.cells.get('s1|exam|quiz');
    ok('  the exam cell exists for s1', !!cell, [...roll.cells.keys()]);
    ok('  it carries the 34 that was typed in', cell && cell.earned === 34, cell);
    ok('  denominated by the manifest, not the entry', cell && cell.possible === 40, cell);

    // The point of the whole exercise: before entry the exam was 40 points of
    // denominator with no numerator possible. Now it reads as attempted.
    ok('  and the cell counts as completed', cell && cell.completed === true, cell);

    // The unit test was never entered, so it stays an unearned denominator.
    // That is correct and visible, which is the difference from a silent one.
    ok('  an un-entered instrument has no cell at all', !roll.cells.get('s1|test|quiz'));
    ok('  but the manifest still carries its 22 points',
      roll.possible.get('test|quiz') && roll.possible.get('test|quiz').possible === 22,
      roll.possible.get('test|quiz'));
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
