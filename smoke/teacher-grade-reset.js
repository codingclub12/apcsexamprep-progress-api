'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a teacher gradebook reset grants exactly one retry, and sticks.
//
//  THE BUG THIS CLOSES
//  Making progress.score a value DERIVED from the score_events ledger (the W10a
//  lesson-score fix) silently broke the teacher's reset button. PATCH
//  /api/teacher/classes/:code/progress/:id/unlock with reset=true nulls the
//  stored score, so the gradebook goes blank and the teacher believes it worked.
//  But the pre-reset submissions were still in the ledger, so the next time the
//  student saved anything the derived grade recomputed straight back to the old
//  number: with retries off the first attempt is the grade of record forever.
//  The reset appeared to work and then quietly undid itself.
//
//  THE RULE THIS PINS
//  A reset stamps progress.score_reset_at. Grade of record is derived only from
//  submissions logged after that stamp, so the student's next attempt is attempt
//  1 and, with retries off, it locks in. That is "one retry for one student on
//  one activity", which is the owner's stated rule for the reset button.
//
//  Nothing is deleted. The pre-reset attempts stay in score_events and still come
//  back from GET /api/student/history, marked pre_reset, numbered in their own
//  era, and never flagged grade_of_record. Gradebook data always survives.
//
//  Zero PII: synthetic teacher and students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gradereset
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-teacher-grade-reset.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const { LESSON_SCORE_ITEM } = require('../scoring');

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

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const LOC = { course: 'ap-cybersecurity', unit: 'unit-4', lesson: '4.3', activity_type: 'exercise-1' };
const OTHER = { course: 'ap-cybersecurity', unit: 'unit-4', lesson: '4.4', activity_type: 'exercise-1' };

const stored = (sid, loc) => db.prepare(`
  SELECT id, score, score_reset_at FROM progress
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`).get(sid, loc.course, loc.unit, loc.lesson, loc.activity_type);

const ledgerCount = (sid, loc) => db.prepare(`
  SELECT COUNT(*) n FROM score_events
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ? AND item = ?
`).get(sid, loc.course, loc.unit, loc.lesson, loc.activity_type, LESSON_SCORE_ITEM).n;

(async () => {
  console.log('\nTEACHER GRADE RESET (one retry, and it sticks)\n');

  // ── setup: a real teacher, a real class per retry mode, real students ───────
  const reg = await call('POST', '/api/teacher/register',
    { email: 'reset.smoke@example.org', password: 'a-long-enough-password', name: 'Reset Smoke' });
  const TT = reg.body.token;
  ok('teacher registered', (reg.status === 200 || reg.status === 201) && !!TT, reg.body);

  const mk = async (name, retry) => {
    const r = await call('POST', '/api/teacher/classes',
      { class_name: name, course: 'ap-cybersecurity' }, TT);
    const code = r.body.class.class_code;
    db.prepare('UPDATE classes SET retry_allowed = ?, mastery_threshold = 80 WHERE class_code = ?')
      .run(retry, code);
    return code;
  };
  const CODE_OFF = await mk('No retries', 0);
  const CODE_ON = await mk('Retries allowed', 1);

  const join = async (code, name) => {
    const r = await call('POST', '/api/student/join',
      { class_code: code, display_name: name, pin: '1234' });
    return { id: r.body.student.id, token: r.body.token };
  };
  const sOff = await join(CODE_OFF, 'Reset Off');
  const sOn = await join(CODE_ON, 'Reset On');
  const sUntouched = await join(CODE_OFF, 'Never Reset');
  ok('two classes and three students exist', !!sOff.id && !!sOn.id && !!sUntouched.id);

  const save = (stu, body) => call('POST', '/api/student/progress', body, stu.token);
  const resetGrade = (code, progressId) => call(
    'PATCH', `/api/teacher/classes/${code}/progress/${progressId}/unlock`, { reset: true }, TT);

  // ── 1. The exact reported failure ──────────────────────────────────────────
  console.log('\n1. A reset is not undone by the next submission (retry OFF)');
  {
    await save(sOff, { ...LOC, score: 90, completed: true });
    ok('  student scores 90', stored(sOff.id, LOC).score === 90, stored(sOff.id, LOC));

    const r = await resetGrade(CODE_OFF, stored(sOff.id, LOC).id);
    ok('  teacher reset accepted', r.status === 200 && r.body.ok === true, r.body);
    ok('  gradebook goes blank', stored(sOff.id, LOC).score === null, stored(sOff.id, LOC));
    ok('  the reset moment was stamped', !!stored(sOff.id, LOC).score_reset_at);

    const after = await save(sOff, { ...LOC, score: 40, completed: true });
    ok('  the retake is what counts now, not the old 90',
      stored(sOff.id, LOC).score === 40, stored(sOff.id, LOC));
    ok('  and it is reported as attempt 1 of 1, a clean slate',
      after.body.grade_of_record.attempt_no === 1 && after.body.grade_of_record.attempts === 1,
      after.body.grade_of_record);
    ok('  nothing was deleted: both submissions are still in the ledger',
      ledgerCount(sOff.id, LOC) === 2, ledgerCount(sOff.id, LOC));
  }

  // ── 2. Exactly ONE retry, not unlimited ────────────────────────────────────
  console.log('\n2. It is ONE retry, not a switch to best-of');
  {
    const third = await save(sOff, { ...LOC, score: 95, completed: true });
    ok('  a second post-reset attempt does not displace the first',
      stored(sOff.id, LOC).score === 40, stored(sOff.id, LOC));
    ok('  first-attempt policy resumed immediately after the reset',
      third.body.grade_of_record.score === 40 && third.body.grade_of_record.attempt_no === 1,
      third.body.grade_of_record);
    ok('  a worse one cannot lower it either',
      (await save(sOff, { ...LOC, score: 5, completed: true }))
        && stored(sOff.id, LOC).score === 40, stored(sOff.id, LOC));
  }

  // ── 3. Retry ON: the reset drops the old attempts from best-of ─────────────
  console.log('\n3. Retry ON: best-of is scoped to the current era');
  {
    await save(sOn, { ...LOC, score: 90, completed: true });
    await save(sOn, { ...LOC, score: 70, completed: true });
    ok('  best-of holds the 90 before any reset', stored(sOn.id, LOC).score === 90);

    await resetGrade(CODE_ON, stored(sOn.id, LOC).id);
    const after = await save(sOn, { ...LOC, score: 40, completed: true });
    ok('  the pre-reset 90 no longer wins best-of',
      stored(sOn.id, LOC).score === 40, stored(sOn.id, LOC));
    ok('  attempt numbering restarts', after.body.grade_of_record.attempts === 1,
      after.body.grade_of_record);

    await save(sOn, { ...LOC, score: 60, completed: true });
    ok('  best-of still applies within the new era', stored(sOn.id, LOC).score === 60,
      stored(sOn.id, LOC));
    ok('  but never reaches back past the reset', stored(sOn.id, LOC).score !== 90);
  }

  // ── 4. A reset is scoped to one student and one activity ───────────────────
  console.log('\n4. A reset touches one student and one activity only');
  {
    await save(sUntouched, { ...LOC, score: 88, completed: true });
    await save(sOff, { ...OTHER, score: 77, completed: true });

    await save(sUntouched, { ...LOC, score: 12, completed: true });
    ok('  a classmate who was not reset keeps first-attempt behavior',
      stored(sUntouched.id, LOC).score === 88, stored(sUntouched.id, LOC));

    await save(sOff, { ...OTHER, score: 33, completed: true });
    ok('  another activity for the reset student is unaffected',
      stored(sOff.id, OTHER).score === 77, stored(sOff.id, OTHER));
    ok('  and carries no reset stamp', stored(sOff.id, OTHER).score_reset_at == null);
  }

  // ── 5. reset=false unlocks without resetting ───────────────────────────────
  console.log('\n5. unlock without reset leaves the grade alone');
  {
    const before = stored(sUntouched.id, LOC).score;
    const r = await call('PATCH',
      `/api/teacher/classes/${CODE_OFF}/progress/${stored(sUntouched.id, LOC).id}/unlock`,
      { reset: false }, TT);
    ok('  accepted', r.status === 200 && r.body.reset === false, r.body);
    ok('  score untouched', stored(sUntouched.id, LOC).score === before);
    ok('  and no reset stamp was written',
      stored(sUntouched.id, LOC).score_reset_at == null, stored(sUntouched.id, LOC));
  }

  // ── 6. A reset with nothing after it leaves no grade at all ────────────────
  console.log('\n6. A reset with no retake yet leaves the activity ungraded');
  {
    const p = stored(sUntouched.id, LOC).id;
    await resetGrade(CODE_OFF, p);
    ok('  stored grade is null', stored(sUntouched.id, LOC).score === null);

    const h = await call('GET', '/api/student/history?lesson=4.3', null, sUntouched.token);
    const mine = h.body.history.filter((r) => r.source === 'lesson-score');
    ok('  history still shows every pre-reset submission', mine.length === 2, mine.length);
    ok('  all of them marked pre_reset', mine.every((r) => r.pre_reset === true), mine);
    ok('  and NONE of them holds the grade of record',
      mine.every((r) => r.grade_of_record === false), mine);
  }

  // ── 7. History is honest about the two eras ────────────────────────────────
  console.log('\n7. GET /history separates the eras');
  {
    const h = await call('GET', '/api/student/history?lesson=4.3', null, sOff.token);
    const mine = h.body.history.filter((r) => r.source === 'lesson-score');
    // 90 before the reset; 40, 95 and 5 after it.
    ok('  every submission is still returned, pre and post reset',
      mine.length === 4, mine.length);

    const pre = mine.filter((r) => r.pre_reset);
    const live = mine.filter((r) => !r.pre_reset);
    ok('  one attempt sits before the reset', pre.length === 1, pre);
    ok('  three sit after it', live.length === 3, live);
    ok('  the pre-reset 90 is still visible, not erased',
      pre.some((r) => r.score === 90), pre);
    ok('  exactly one row holds the grade of record',
      mine.filter((r) => r.grade_of_record).length === 1, mine);
    ok('  and it is the first attempt of the live era (40)',
      mine.find((r) => r.grade_of_record).score === 40,
      mine.find((r) => r.grade_of_record));
    ok('  which is what the gradebook stores',
      mine.find((r) => r.grade_of_record).score === stored(sOff.id, LOC).score);
    ok('  the live era is numbered from 1',
      live.map((r) => r.attempt_no).sort().join(',') === '1,2,3', live.map((r) => r.attempt_no));
    ok('  a row from another source is never marked pre_reset',
      h.body.history.every((r) => r.source === 'lesson-score' || r.pre_reset === false));
  }

  // ── 8. Retroactivity survives a reset ──────────────────────────────────────
  console.log('\n8. Flipping the class retry setting is still retroactive');
  {
    db.prepare('UPDATE classes SET retry_allowed = 1 WHERE class_code = ?').run(CODE_OFF);
    const h = await call('GET', '/api/student/history?lesson=4.3', null, sOff.token);
    const mine = h.body.history.filter((r) => r.source === 'lesson-score');
    const gor = mine.find((r) => r.grade_of_record);
    ok('  retry ON now flags the best attempt of the live era', gor.score === 95, gor);
    ok('  which still ignores the pre-reset 90', gor.score !== 90);
    ok('  and it is still exactly one row',
      mine.filter((r) => r.grade_of_record).length === 1);

    db.prepare('UPDATE classes SET retry_allowed = 0 WHERE class_code = ?').run(CODE_OFF);
    const back = await call('GET', '/api/student/history?lesson=4.3', null, sOff.token);
    const gor2 = back.body.history.filter((r) => r.source === 'lesson-score')
      .find((r) => r.grade_of_record);
    ok('  flipping back restores the first attempt of the live era', gor2.score === 40, gor2);
    ok('  no write of any kind was needed either way', ledgerCount(sOff.id, LOC) === 4);
  }

  // ── 9. Ownership ───────────────────────────────────────────────────────────
  console.log('\n9. Only the owning teacher can reset');
  {
    const other = await call('POST', '/api/teacher/register',
      { email: 'other.reset@example.org', password: 'a-long-enough-password', name: 'Other' });
    const r = await call('PATCH',
      `/api/teacher/classes/${CODE_OFF}/progress/${stored(sOff.id, LOC).id}/unlock`,
      { reset: true }, other.body.token);
    ok('  another teacher gets 404, not a reset', r.status === 404, r.body);
    ok('  and the grade is untouched', stored(sOff.id, LOC).score === 40, stored(sOff.id, LOC));

    const anon = await call('PATCH',
      `/api/teacher/classes/${CODE_OFF}/progress/${stored(sOff.id, LOC).id}/unlock`,
      { reset: true }, null);
    ok('  an unauthenticated reset is refused', anon.status === 401, anon.status);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
