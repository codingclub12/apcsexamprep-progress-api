'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: GET /api/student/history, the per-attempt record behind one number.
//
//  WHY IT EXISTS
//  Until now a stored grade was a single number with nothing behind it, which is
//  exactly what let POST /api/student/progress overwrite a passing score with a
//  failing one and leave no trace. A grade nobody can audit is a grade nobody can
//  dispute. This endpoint returns one row per SUBMISSION across every ledger that
//  exists today, newest first, and flags which single row is the grade of record.
//
//  WHAT IS PINNED HERE
//   - all three sources merge: score_events (both the lesson-score percents and
//     ordinary item writes), quiz_attempts, and the System A attempts table
//   - newest first, with the implicit pre-ledger attempt sorting last
//   - exactly one row per group carries grade_of_record
//   - retry OFF flags the first attempt, retry ON flags the best
//   - flipping the class retry setting changes the flag RETROACTIVELY, with no
//     write of any kind in between
//   - course / unit / lesson filters
//   - a student sees their own rows and only their own rows
//   - no answer payloads and no other student's name are ever returned
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:history
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-student-history.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

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
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed) VALUES
 ('c_off','CSA-OFF','No retries','ap-csa','t1',1,80,0),
 ('c_on','CSA-ON','Retries allowed','ap-csa','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c_off','A','x'),
 ('s2','c_off','B','x'),
 ('s3','c_on','C','x')`);

// One manifest item so the System A attempts rows resolve a unit.
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
     VALUES ('ap-csa','unit-1','1.2','1.2-quiz','quiz',10)`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const TOK = {
  s1: signStudentToken({ id: 's1', class_id: 'c_off', display_name: 'A' }, 'CSA-OFF'),
  s2: signStudentToken({ id: 's2', class_id: 'c_off', display_name: 'B' }, 'CSA-OFF'),
  s3: signStudentToken({ id: 's3', class_id: 'c_on', display_name: 'C' }, 'CSA-ON'),
};

const save = (who, body) => fetch(`${base()}/api/student/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK[who] },
  body: JSON.stringify(body),
}).then((r) => r.json());

const scoreItem = (who, body) => fetch(`${base()}/api/student/score`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK[who] },
  body: JSON.stringify(body),
}).then((r) => r.json());

const quiz = (who, body) => fetch(`${base()}/api/student/quiz`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK[who] },
  body: JSON.stringify(body),
}).then((r) => r.json());

const history = (who, qs) => fetch(`${base()}/api/student/history` + (qs || ''),
  { headers: { Authorization: 'Bearer ' + TOK[who] } }).then(async (r) => ({ status: r.status, body: await r.json() }));

const EX = { course: 'ap-csa', unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1' };
const gor = (rows) => rows.filter((r) => r.grade_of_record);

(async () => {
  console.log('\nSTUDENT ATTEMPT HISTORY (GET /api/student/history)\n');

  // s1 is in a first-attempt class: three submissions on one activity.
  await save('s1', { ...EX, score: 62 });
  await save('s1', { ...EX, score: 91 });
  await save('s1', { ...EX, score: 12 });
  // s1 also has an ordinary per-item /score write and a quiz attempt pair.
  await scoreItem('s1', { course: 'ap-csa', unit: 'unit-1', lesson: '1.3', activity_type: 'cfu', item: 'q1', earned: 3, possible: 4 });
  await scoreItem('s1', { course: 'ap-csa', unit: 'unit-1', lesson: '1.3', activity_type: 'cfu', item: 'q1', earned: 4, possible: 4 });
  await quiz('s1', { course: 'ap-csa', unit: 'unit-1', lesson: '1.4', score: 50 });
  await quiz('s1', { course: 'ap-csa', unit: 'unit-1', lesson: '1.4', score: 80 });
  // ...and two System A attempts on a manifest item.
  run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES ('s1','c_off','ap-csa','1.2','1.2-quiz','quiz',4,10,0,1),
              ('s1','c_off','ap-csa','1.2','1.2-quiz','quiz',9,10,1,2)`);

  // s2 shares the class but did completely different work, for the isolation check.
  await save('s2', { ...EX, lesson: '9.9', score: 77 });

  console.log('1. Every submission is returned, from all three ledgers');
  let all;
  {
    const r = await history('s1');
    ok('  200', r.status === 200, r.status);
    all = r.body.history;
    const bySource = all.reduce((m, x) => { m[x.source] = (m[x.source] || 0) + 1; return m; }, {});
    ok('  three lesson-score submissions', bySource['lesson-score'] === 3, bySource);
    ok('  two score-event item writes', bySource['score-event'] === 2, bySource);
    ok('  two quiz attempts', bySource['quiz-attempt'] === 2, bySource);
    ok('  two System A attempts', bySource['attempt'] === 2, bySource);
    ok('  nine rows in total, one per submission', all.length === 9, all.length);
    ok('  count and total agree with the body', r.body.count === 9 && r.body.total === 9, r.body.count);
    ok('  no answers payload is ever returned', all.every((x) => !('answers' in x)));
  }

  console.log('\n2. Newest first');
  {
    const ts = all.map((x) => x.recorded_at).filter(Boolean);
    ok('  timestamps are non-increasing', ts.every((t, i) => i === 0 || ts[i - 1] >= t), ts);
    ok('  the newest row is the most recent write',
      all[0].recorded_at === ts[0] && ts[0] === ts.slice().sort().pop(), all[0]);
  }

  console.log('\n3. Retry OFF: the FIRST attempt carries the grade of record');
  {
    const rows = all.filter((x) => x.source === 'lesson-score');
    const flagged = gor(rows);
    ok('  exactly one row is flagged', flagged.length === 1, flagged.length);
    ok('  and it is the 62, not the 91', flagged[0].score === 62, flagged[0]);
    ok('  attempt numbers are 1..3 oldest first',
      rows.map((x) => x.attempt_no).sort().join(',') === '1,2,3', rows.map((x) => x.attempt_no));
    ok('  every row knows the group size', rows.every((x) => x.attempts === 3), rows.map((x) => x.attempts));
    ok('  the flagged row matches what progress.score stores',
      db.prepare(`SELECT score FROM progress WHERE student_id='s1' AND lesson='1.1'`).get().score === 62);
  }

  console.log('\n4. Each other ledger keeps the rule its own writer uses');
  {
    const items = all.filter((x) => x.source === 'score-event');
    ok('  the best /score write for an item is the grade of record (rollupScore semantics)',
      gor(items).length === 1 && gor(items)[0].points === 4, gor(items));
    const quizzes = all.filter((x) => x.source === 'quiz-attempt');
    ok('  the best quiz attempt is the grade of record (what the quiz path stores)',
      gor(quizzes).length === 1 && gor(quizzes)[0].score === 80, gor(quizzes));
    const att = all.filter((x) => x.source === 'attempt');
    ok('  System A attempts follow the retry policy: first attempt, 4 of 10',
      gor(att).length === 1 && gor(att)[0].points === 4, gor(att));
    ok('  and their unit resolves from the manifest', att.every((x) => x.unit === 'unit-1'), att.map((x) => x.unit));
    ok('  percentages are computed against the recorded max',
      att.find((x) => x.points === 9).score === 90, att);
  }

  console.log('\n5. Flipping the class retry setting re-grades retroactively, with no write');
  {
    run(`UPDATE classes SET retry_allowed = 1 WHERE id = 'c_off'`);
    const r = await history('s1');
    const rows = r.body.history.filter((x) => x.source === 'lesson-score');
    ok('  the flag moved to the best attempt, 91', gor(rows).length === 1 && gor(rows)[0].score === 91, gor(rows));
    const att = r.body.history.filter((x) => x.source === 'attempt');
    ok('  System A attempts moved too, to 9 of 10', gor(att)[0].points === 9, gor(att));
    ok('  the endpoint reports the setting it applied', r.body.retry_allowed === true, r.body.retry_allowed);
    ok('  and the ledger itself is untouched: still nine rows', r.body.history.length === 9, r.body.history.length);
    run(`UPDATE classes SET retry_allowed = 0 WHERE id = 'c_off'`);
    const back = await history('s1');
    ok('  flipping back restores the first-attempt answer',
      gor(back.body.history.filter((x) => x.source === 'lesson-score'))[0].score === 62);
  }

  console.log('\n6. A pre-ledger score shows up as the implicit first attempt');
  {
    run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,attempts,updated_at)
         VALUES ('p_old','s3','c_on','ap-csa','unit-2','2.5','exercise-2',1,88,1,datetime('now'))`);
    await save('s3', { course: 'ap-csa', unit: 'unit-2', lesson: '2.5', activity_type: 'exercise-2', score: 30 });
    const r = await history('s3', '?lesson=2.5');
    const rows = r.body.history;
    ok('  two rows: the carried-forward 88 and the new 30', rows.length === 2, rows);
    const prior = rows.find((x) => x.source === 'prior-score');
    ok('  the carried-forward row is marked as such and has no timestamp',
      prior && prior.recorded_at === null && prior.score === 88, prior);
    ok('  it sorts last, being older than anything logged', rows[rows.length - 1].source === 'prior-score', rows.map((x) => x.source));
    ok('  it is attempt 1', prior.attempt_no === 1, prior.attempt_no);
    ok('  retry on: 88 still beats the 30 and holds the grade of record',
      gor(rows).length === 1 && gor(rows)[0].score === 88, gor(rows));
  }

  console.log('\n7. Filters');
  {
    const byLesson = await history('s1', '?lesson=1.1');
    ok('  ?lesson narrows to one activity', byLesson.body.history.length === 3
      && byLesson.body.history.every((x) => x.lesson === '1.1'), byLesson.body.count);
    const byUnit = await history('s1', '?unit=unit-1');
    ok('  ?unit keeps everything in that unit', byUnit.body.history.length === 9, byUnit.body.count);
    const byCourse = await history('s1', '?course=ap-csp');
    ok('  ?course excludes another course entirely', byCourse.body.history.length === 0, byCourse.body.count);
    const combined = await history('s1', '?course=ap-csa&unit=unit-1&lesson=1.4');
    ok('  filters combine', combined.body.history.length === 2
      && combined.body.history.every((x) => x.source === 'quiz-attempt'), combined.body.history);
    const limited = await history('s1', '?limit=2');
    ok('  ?limit caps the rows and says so',
      limited.body.history.length === 2 && limited.body.truncated === true && limited.body.total === 9, limited.body);
  }

  console.log('\n8. A student cannot read another student');
  {
    const r = await history('s2');
    ok('  s2 sees only their own submission', r.body.history.length === 1
      && r.body.history[0].lesson === '9.9', r.body.history);
    ok('  no row belonging to s1 appears', !r.body.history.some((x) => x.lesson === '1.1'));
    ok('  the identity comes from the token, not a parameter',
      (await history('s2', '?student_id=s1')).body.history.length === 1);
    const anon = await fetch(`${base()}/api/student/history`);
    ok('  and an unauthenticated read is refused', anon.status === 401, anon.status);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
