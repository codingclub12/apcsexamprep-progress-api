'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: POST /api/student/progress no longer destroys a grade.
//
//  THE BUG THIS CLOSES
//  That route wrote `score = CASE WHEN ? IS NOT NULL THEN ? ELSE score END`, an
//  unconditional overwrite, and logged nothing anywhere. A lower later score
//  silently replaced a higher earlier one and the better score was gone forever.
//  Two client scripts now drive this path for EVERY non-quiz scored activity
//  (window.APCS_saveLessonScore), so a page refresh, a widget reset, or a DOM
//  re-render that momentarily reads 0 out of 6 was enough to turn a pass into a
//  fail with no record that it ever happened.
//
//  WHAT IS PINNED HERE
//   - a lower resubmission never lowers the stored score
//   - retry OFF: the FIRST attempt is the grade of record even when a later
//     attempt is higher (students must not grind)
//   - retry ON: the BEST attempt wins
//   - a student retry_override beats the class default, as everywhere else
//   - flipping the class retry setting later applies RETROACTIVELY, because the
//     grade is derived from the ledger and never patched in place
//   - the ledger holds exactly one row per scored submission, and none for an
//     unscored save
//   - a pre-existing score with no ledger behind it (there will be many on
//     deploy) is treated as an implicit first attempt and cannot drop
//   - a repeated client_event_id is a retry, not a second attempt
//   - lesson-score rows stay invisible to rollupScore, so the /api/student/score
//     path keeps behaving exactly as it did
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:progressguard
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-progress-score-guard.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const { rollupScore, LESSON_SCORE_ITEM } = require('../scoring');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed) VALUES
 ('c_off','CYBER-OFF','No retries','ap-cybersecurity','t1',1,80,0),
 ('c_on','CYBER-ON','Retries allowed','ap-cybersecurity','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s_off','c_off','A','x'),
 ('s_on','c_on','B','x'),
 ('s_legacy','c_off','C','x'),
 ('s_legacy_on','c_on','D','x'),
 ('s_flip','c_off','E','x'),
 ('s_over','c_off','F','x')`);
// A personal override on a first-attempt class, the same precedence the quiz
// path applies. This student gets best-of behavior anyway.
run(`UPDATE students SET retry_override = 1 WHERE id = 's_over'`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const tok = (id, cid, code) => signStudentToken({ id, class_id: cid, display_name: id }, code);
const TOK = {
  s_off: tok('s_off', 'c_off', 'CYBER-OFF'),
  s_on: tok('s_on', 'c_on', 'CYBER-ON'),
  s_legacy: tok('s_legacy', 'c_off', 'CYBER-OFF'),
  s_legacy_on: tok('s_legacy_on', 'c_on', 'CYBER-ON'),
  s_flip: tok('s_flip', 'c_off', 'CYBER-OFF'),
  s_over: tok('s_over', 'c_off', 'CYBER-OFF'),
};

const LOC = { course: 'ap-cybersecurity', unit: 'unit-4', lesson: '4.3', activity_type: 'exercise-1' };

const save = (who, body) => fetch(`${base()}/api/student/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK[who] },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const stored = (sid, loc) => db.prepare(`
  SELECT score, attempts FROM progress
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`).get(sid, loc.course, loc.unit, loc.lesson, loc.activity_type);

const ledger = (sid, loc) => db.prepare(`
  SELECT points, max_points, correct, answers FROM score_events
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ? AND item = ?
  ORDER BY created_at, rowid
`).all(sid, loc.course, loc.unit, loc.lesson, loc.activity_type, LESSON_SCORE_ITEM);

(async () => {
  console.log('\nPROGRESS SCORE GUARD (POST /api/student/progress)\n');

  // ── 1. The exact reported failure ────────────────────────────────────────
  console.log('1. A lower resubmission does NOT lower the stored score');
  {
    const first = await save('s_off', { ...LOC, score: 90, completed: true });
    ok('  first save accepted', first.status === 200 && first.body.ok, first.body);
    ok('  stored 90', stored('s_off', LOC).score === 90, stored('s_off', LOC));

    // The widget reset / re-render case: 0 out of 6 arrives a second later.
    const reset = await save('s_off', { ...LOC, score: 0, completed: false });
    ok('  the 0 is accepted (it is a real submission)', reset.status === 200, reset.body);
    ok('  but the stored score is still 90', stored('s_off', LOC).score === 90, stored('s_off', LOC));
    ok('  and the response reports the grade of record, not the submission',
      reset.body.grade_of_record && reset.body.grade_of_record.score === 90
      && reset.body.submitted_score === 0, reset.body);
    ok('  completed stays sticky once earned', stored('s_off', LOC).score === 90
      && db.prepare('SELECT completed FROM progress WHERE student_id = ?').get('s_off').completed === 1);
  }

  // ── 2. Retry OFF means the FIRST attempt counts ──────────────────────────
  //  Not "the best", which would let a student grind. The owner's rule, and
  //  the one System A already implements.
  console.log('\n2. Retry OFF: the FIRST attempt is the grade of record');
  {
    const L = { ...LOC, lesson: '4.4' };
    await save('s_off', { ...L, score: 55 });
    ok('  first attempt recorded', stored('s_off', L).score === 55, stored('s_off', L));
    await save('s_off', { ...L, score: 95 });
    ok('  a BETTER later attempt does not replace it', stored('s_off', L).score === 55, stored('s_off', L));
    await save('s_off', { ...L, score: 10 });
    ok('  and a worse one does not either', stored('s_off', L).score === 55, stored('s_off', L));
    ok('  three submissions, three ledger rows', ledger('s_off', L).length === 3, ledger('s_off', L).length);
  }

  // ── 3. Retry ON means the BEST attempt counts ────────────────────────────
  console.log('\n3. Retry ON: the BEST attempt is the grade of record');
  {
    const L = { ...LOC, lesson: '4.5' };
    await save('s_on', { ...L, score: 40 });
    ok('  40 after one attempt', stored('s_on', L).score === 40, stored('s_on', L));
    await save('s_on', { ...L, score: 90 });
    ok('  90 after improving', stored('s_on', L).score === 90, stored('s_on', L));
    await save('s_on', { ...L, score: 20 });
    ok('  a bad third attempt cannot take it away', stored('s_on', L).score === 90, stored('s_on', L));
    const r = await save('s_on', { ...L, score: 20 });
    ok('  grade of record points at attempt 2 of 4',
      r.body.grade_of_record.attempt_no === 2 && r.body.grade_of_record.attempts === 4, r.body.grade_of_record);
  }

  // ── 4. Student override beats the class default ──────────────────────────
  console.log('\n4. A student retry_override beats the class setting');
  {
    const L = { ...LOC, lesson: '4.6' };
    await save('s_over', { ...L, score: 30 });
    await save('s_over', { ...L, score: 80 });
    ok('  best-of applies despite the first-attempt class', stored('s_over', L).score === 80, stored('s_over', L));
    const r = await save('s_over', { ...L, score: 1 });
    ok('  and the response says retries are allowed for this student', r.body.retry_allowed === true, r.body);
  }

  // ── 5. Flipping the class setting is RETROACTIVE ─────────────────────────
  //  The grade is derived from the ledger, so a teacher changing their mind in
  //  October re-grades September with no migration.
  console.log('\n5. Flipping retry_allowed later changes the grade of record retroactively');
  {
    const L = { ...LOC, lesson: '4.7' };
    await save('s_flip', { ...L, score: 40 });
    await save('s_flip', { ...L, score: 90 });
    ok('  first-attempt class: stored 40 despite a better second try',
      stored('s_flip', L).score === 40, stored('s_flip', L));

    run(`UPDATE classes SET retry_allowed = 1 WHERE id = 'c_off'`);

    // The cache catches up on the next write, from the SAME ledger rows. No new
    // information was supplied: the 10 below is worse than everything already
    // there, so the only thing that moved the number is the policy change.
    const r = await save('s_flip', { ...L, score: 10 });
    ok('  after the flip the grade of record is the best attempt, 90',
      r.body.grade_of_record.score === 90, r.body.grade_of_record);
    ok('  and progress.score agrees', stored('s_flip', L).score === 90, stored('s_flip', L));
    ok('  no ledger row was rewritten: still 3 submissions', ledger('s_flip', L).length === 3, ledger('s_flip', L).length);

    run(`UPDATE classes SET retry_allowed = 0 WHERE id = 'c_off'`);
  }

  // ── 6. The ledger is one row per submission, and only for submissions ────
  console.log('\n6. The ledger records every scored submission and nothing else');
  {
    const L = { ...LOC, lesson: '4.8' };
    const rows0 = ledger('s_off', L);
    ok('  nothing logged before anything happened', rows0.length === 0);

    await save('s_off', { ...L, score: 70 });
    await save('s_off', { ...L, score: 71 });
    await save('s_off', { ...L, score: 72 });
    const rows = ledger('s_off', L);
    ok('  three submissions, three rows, in order',
      rows.length === 3 && rows[0].points === 70 && rows[2].points === 72, rows.map((r) => r.points));
    ok('  each row is a percent out of 100', rows.every((r) => r.max_points === 100), rows);
    ok('  correct is a pass snapshot against the class threshold (80)',
      rows[0].correct === 0 && rows[2].correct === 0, rows.map((r) => r.correct));

    // A visit / confidence / time save carries no score, so it is not an attempt.
    const before = ledger('s_off', L).length;
    const r = await save('s_off', { ...L, completed: true, confidence: 3, time_spent_s: 60 });
    ok('  an unscored save is accepted', r.status === 200 && r.body.ok, r.body);
    ok('  it adds no ledger row', ledger('s_off', L).length === before, ledger('s_off', L).length);
    ok('  and it leaves the grade alone', stored('s_off', L).score === 70, stored('s_off', L));
    ok('  while still recording confidence',
      db.prepare('SELECT confidence FROM progress WHERE student_id = ? AND lesson = ?').get('s_off', '4.8').confidence === 3);
  }

  // ── 7. Rows that already exist, with no history behind them ──────────────
  //  This path never logged, so on deploy almost every stored score is like this.
  //  It must be treated as an implicit first attempt, never as absent.
  console.log('\n7. A pre-existing score with no ledger is an implicit FIRST attempt');
  {
    const L = { ...LOC, lesson: '4.9' };
    const seed = (sid, cid, score) => run(
      `INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,attempts,updated_at)
       VALUES (?,?,?,?,?,?,?,1,?,1,datetime('now'))`,
      'p_' + sid, sid, cid, L.course, L.unit, L.lesson, L.activity_type, score);

    seed('s_legacy', 'c_off', 90);
    seed('s_legacy_on', 'c_on', 90);

    // Retry OFF: the old 90 is the first attempt, so nothing can move it.
    await save('s_legacy', { ...L, score: 40 });
    ok('  retry off: a worse submission cannot lower the legacy 90',
      stored('s_legacy', L).score === 90, stored('s_legacy', L));
    const rows = ledger('s_legacy', L);
    ok('  the legacy value is carried into the first ledger row, not fabricated as its own row',
      rows.length === 1 && JSON.parse(rows[0].answers).prior_score === 90, rows);
    await save('s_legacy', { ...L, score: 95 });
    ok('  and a better one cannot either, because first attempt wins',
      stored('s_legacy', L).score === 90, stored('s_legacy', L));

    // Retry ON: the old 90 is still an attempt, so best-of includes it.
    await save('s_legacy_on', { ...L, score: 40 });
    ok('  retry on: the legacy 90 still beats a worse submission',
      stored('s_legacy_on', L).score === 90, stored('s_legacy_on', L));
    await save('s_legacy_on', { ...L, score: 97 });
    ok('  and a genuinely better attempt does raise it',
      stored('s_legacy_on', L).score === 97, stored('s_legacy_on', L));
  }

  // ── 8. Double submit is a retry, not an attempt ──────────────────────────
  console.log('\n8. A repeated client_event_id is deduped');
  {
    const L = { ...LOC, lesson: '4.10' };
    await save('s_on', { ...L, score: 88, client_event_id: 'evt-1' });
    const again = await save('s_on', { ...L, score: 88, client_event_id: 'evt-1' });
    ok('  the replay is reported as a duplicate', again.body.duplicate === true, again.body);
    ok('  one ledger row, not two', ledger('s_on', L).length === 1, ledger('s_on', L).length);
    await save('s_on', { ...L, score: 12, client_event_id: 'evt-2' });
    ok('  a genuinely new event id is a real second attempt', ledger('s_on', L).length === 2);
    ok('  best-of still holds', stored('s_on', L).score === 88, stored('s_on', L));
  }

  // ── 9. A score we cannot read is refused, never stored ───────────────────
  console.log('\n9. A non-numeric score is refused');
  {
    const L = { ...LOC, lesson: '4.11' };
    const r = await save('s_on', { ...L, score: 'lots' });
    ok('  400, not a stored NaN', r.status === 400, r.body);
    ok('  nothing was written', ledger('s_on', L).length === 0 && !stored('s_on', L));
  }

  // ── 10. The other writer on the same ledger is unaffected ────────────────
  //  progress.score for an activity is owned by one arithmetic or the other, and
  //  a whole-activity percent must never be summed in beside a real item.
  console.log('\n10. lesson-score rows stay invisible to rollupScore');
  {
    const L = { ...LOC, lesson: '4.12' };
    await fetch(`${base()}/api/student/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK.s_on },
      body: JSON.stringify({ ...L, item: 'redflags', earned: 5, possible: 7 }),
    });
    const before = rollupScore('s_on', L.course, L.unit, L.lesson, L.activity_type);
    ok('  /score rolled up 5 of 7', before.earned === 5 && before.possible === 7, before);

    await save('s_on', { ...L, score: 83 });
    const after = rollupScore('s_on', L.course, L.unit, L.lesson, L.activity_type);
    ok('  a lesson-score submission does not become 88 out of 107',
      after.earned === 5 && after.possible === 7, after);
    ok('  and it does not inflate the event count', after.events === before.events, after.events);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
