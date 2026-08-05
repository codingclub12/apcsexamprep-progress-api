'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the three-mode retry policy (W11).
//
//  WHAT CHANGED
//  classes.retry_allowed was a boolean and it only ever governed QUIZZES. The
//  practice rollup in scoring.js always kept the best points per item and never
//  looked at the setting at all, so a CFU or an exercise was best-of-many for
//  every class in the product. Teachers wanted the middle setting a boolean
//  cannot express: redo the practice, one shot at the quiz.
//
//  classes.retry_mode now holds 'all' | 'practice' | 'none' and every path that
//  asks "does the best attempt count" goes through retry-policy.js.
//
//  WHAT IS PINNED HERE
//   - the deploy-day migration: retry_allowed 1 -> 'all', 0 -> 'practice', run
//     with the SAME statements production runs, and no recorded grade moves
//   - 'all'      : best attempt on a practice item AND on an assessment
//   - 'practice' : best attempt on practice, FIRST attempt on an assessment
//   - 'none'     : first attempt on both
//   - students.retry_override still grants retries against every mode
//   - changing the mode is retroactive in BOTH directions, by re-derivation from
//     the ledger, with no row rewritten
//   - PATCH /api/teacher/classes/:code/retry accepts the new mode AND the legacy
//     boolean, mapping true -> 'all' and false -> 'practice'
//   - retry_allowed stays in sync: 1 if and only if the mode is 'all'
//   - the practice / assessment classification lives in exactly one place
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:retrymodes
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-retry-modes.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken, signTeacherToken } = require('../utils');
const { rollupScore } = require('../scoring');
const RP = require('../retry-policy');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
// Three classes, one per mode, plus two LEGACY rows written the old way (no
// retry_mode at all) that the migration section maps.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode) VALUES
 ('c_all','t1','CYBER-ALL','Everything','ap-cybersecurity',1,80,1,'all'),
 ('c_prac','t1','CYBER-PRC','Practice only','ap-cybersecurity',1,80,0,'practice'),
 ('c_none','t1','CYBER-NON','Nothing','ap-cybersecurity',1,80,0,'none')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s_all','c_all','A','x'),
 ('s_prac','c_prac','B','x'),
 ('s_none','c_none','C','x'),
 ('s_over_none','c_none','D','x'),
 ('s_over_prac','c_prac','E','x'),
 ('s_flip','c_none','F','x')`);
run(`UPDATE students SET retry_override = 1 WHERE id IN ('s_over_none','s_over_prac')`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const CLASS_OF = {
  s_all: ['c_all', 'CYBER-ALL'], s_prac: ['c_prac', 'CYBER-PRC'],
  s_none: ['c_none', 'CYBER-NON'], s_over_none: ['c_none', 'CYBER-NON'],
  s_over_prac: ['c_prac', 'CYBER-PRC'], s_flip: ['c_none', 'CYBER-NON'],
};
const TOK = {};
for (const [id, [cid, code]] of Object.entries(CLASS_OF)) {
  TOK[id] = signStudentToken({ id, class_id: cid, display_name: id }, code);
}
const TTOK = signTeacherToken({ id: 't1', email: 't@s.org' });

const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const patch = (p, body) => fetch(base() + p, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TTOK },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const COURSE = 'ap-cybersecurity';
const stored = (sid, unit, lesson, type) => {
  const r = one(`SELECT score FROM progress WHERE student_id = ? AND course = ? AND unit = ?
                 AND lesson = ? AND activity_type = ?`, sid, COURSE, unit, lesson, type);
  return r ? r.score : null;
};
// One graded item, submitted twice: a strong attempt then a weak one. Whichever
// of the two the stored score ends up matching IS the policy.
const scoreTwice = async (who, unit, lesson, type, first, second) => {
  await post('/api/student/score', {
    course: COURSE, unit, lesson, activity_type: type, item: 'q1',
    points: first, max_points: 10,
  }, TOK[who]);
  await post('/api/student/score', {
    course: COURSE, unit, lesson, activity_type: type, item: 'q1',
    points: second, max_points: 10,
  }, TOK[who]);
  return stored(who, unit, lesson, type);
};

(async () => {
  console.log('\nRETRY MODES (three-mode teacher policy)\n');

  // ── 1. The classification lives in exactly one place ─────────────────────
  console.log('1. Practice and assessment are classified once, in retry-policy.js');
  {
    ok('  quiz is an assessment', RP.classifyActivity('quiz') === 'assessment');
    ok('  exam is an assessment', RP.classifyActivity('exam') === 'assessment');
    for (const t of ['lesson', 'cfu', 'exercise-1', 'exercise-2', 'lab']) {
      ok(`  ${t} is practice`, RP.classifyActivity(t) === 'practice');
    }
    ok('  an activity type nobody enumerated is practice, not an assessment',
      RP.classifyActivity('escape-room') === 'practice');
    ok('  case and padding do not change the answer',
      RP.classifyActivity('  QUIZ ') === 'assessment');
  }

  // ── 2. The migration, run with production's own statements ───────────────
  //  A legacy row is one written before this column existed: retry_mode NULL.
  console.log('\n2. Migration mapping (the same SQL db.js runs on every boot)');
  {
    run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed)
         VALUES ('c_legacy_on','t1','CYBER-L1','Legacy retry on','ap-cybersecurity',1,80,1)`);
    run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed)
         VALUES ('c_legacy_off','t1','CYBER-L0','Legacy retry off','ap-cybersecurity',1,80,0)`);
    run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_leg','c_legacy_off','G','x')`);
    // A grade already on record. The migration must not touch it.
    run(`INSERT INTO progress (id, student_id, class_id, course, unit, lesson, activity_type, score, attempts)
         VALUES ('p_leg','s_leg','c_legacy_off',?, 'unit-1','1.1','exercise-1', 73, 2)`, COURSE);

    ok('  a legacy row starts with no mode at all',
      one(`SELECT retry_mode FROM classes WHERE id='c_legacy_off'`).retry_mode === null);

    for (const sql of RP.BACKFILL_SQL) db.exec(sql);

    ok('  retry_allowed = 1 lands on all',
      one(`SELECT retry_mode FROM classes WHERE id='c_legacy_on'`).retry_mode === 'all');
    ok('  retry_allowed = 0 lands on practice (NOT none: practice stays redoable)',
      one(`SELECT retry_mode FROM classes WHERE id='c_legacy_off'`).retry_mode === 'practice');
    ok('  no recorded grade moved', one(`SELECT score, attempts FROM progress WHERE id='p_leg'`).score === 73);
    ok('  and the derived boolean still agrees with the mode',
      one(`SELECT retry_allowed FROM classes WHERE id='c_legacy_on'`).retry_allowed === 1
      && one(`SELECT retry_allowed FROM classes WHERE id='c_legacy_off'`).retry_allowed === 0);

    // Idempotent: a second boot must not reclassify anything, above all it must
    // not push a teacher's deliberate 'none' back to 'practice'.
    const before = db.prepare(`SELECT id, retry_mode, retry_allowed FROM classes ORDER BY id`).all();
    for (const sql of RP.BACKFILL_SQL) db.exec(sql);
    const after = db.prepare(`SELECT id, retry_mode, retry_allowed FROM classes ORDER BY id`).all();
    ok('  running it twice changes nothing', JSON.stringify(before) === JSON.stringify(after), after);
    ok('  a deliberate none survives the backfill',
      one(`SELECT retry_mode FROM classes WHERE id='c_none'`).retry_mode === 'none');
  }

  // ── 3. Mode 'all' ────────────────────────────────────────────────────────
  console.log("\n3. Mode 'all': the best attempt counts on practice AND on assessments");
  {
    ok('  practice item: best of 8 then 3 is 80',
      await scoreTwice('s_all', 'unit-2', '2.1', 'exercise-1', 8, 3) === 80);
    ok('  assessment item: best of 9 then 2 is 90',
      await scoreTwice('s_all', 'unit-2', '2.2', 'quiz', 9, 2) === 90);
    const r = await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.3', activity_type: 'lab', score: 40 }, TOK.s_all);
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.3', activity_type: 'lab', score: 95 }, TOK.s_all);
    ok('  whole-activity lesson scores follow it too: 95 beats 40',
      stored('s_all', 'unit-2', '2.3', 'lab') === 95, r.body);
    ok('  and the API reports the mode it applied', r.body.retry_mode === 'all', r.body.retry_mode);
  }

  // ── 4. Mode 'practice' ───────────────────────────────────────────────────
  //  The setting a boolean could not express, and the one this whole change is for.
  console.log("\n4. Mode 'practice': redo the practice, one shot at the quiz");
  {
    ok('  practice item: best of 8 then 3 is 80',
      await scoreTwice('s_prac', 'unit-2', '2.1', 'exercise-1', 8, 3) === 80);
    ok('  assessment item: FIRST of 9 then 2 is 90, and a later 2 cannot lower it',
      await scoreTwice('s_prac', 'unit-2', '2.2', 'quiz', 9, 2) === 90);
    ok('  assessment item: FIRST of 4 then 10 stays 40 (no grinding a quiz up)',
      await scoreTwice('s_prac', 'unit-2', '2.4', 'quiz', 4, 10) === 40);
    ok('  practice item: a LATER better attempt does count, 4 then 10 is 100',
      await scoreTwice('s_prac', 'unit-2', '2.5', 'cfu', 4, 10) === 100);

    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.6', activity_type: 'lab', score: 40 }, TOK.s_prac);
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.6', activity_type: 'lab', score: 95 }, TOK.s_prac);
    ok('  a lab is practice, so its best attempt counts',
      stored('s_prac', 'unit-2', '2.6', 'lab') === 95);

    const st = await fetch(`${base()}/api/student/quiz/status?course=${COURSE}&unit=unit-2&lesson=2.2`,
      { headers: { Authorization: 'Bearer ' + TOK.s_prac } }).then((r) => r.json());
    ok('  the quiz page is told retries are NOT allowed', st.retry_allowed === false, st);
    ok('  and is told the mode by name', st.retry_mode === 'practice', st);
  }

  // ── 5. Mode 'none' ───────────────────────────────────────────────────────
  console.log("\n5. Mode 'none': the first attempt counts on everything");
  {
    ok('  practice item: FIRST of 4 then 10 is 40',
      await scoreTwice('s_none', 'unit-2', '2.1', 'exercise-1', 4, 10) === 40);
    ok('  assessment item: FIRST of 4 then 10 is 40',
      await scoreTwice('s_none', 'unit-2', '2.2', 'quiz', 4, 10) === 40);
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.6', activity_type: 'lab', score: 40 }, TOK.s_none);
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-2', lesson: '2.6', activity_type: 'lab', score: 95 }, TOK.s_none);
    ok('  and a whole-activity lesson score cannot be improved either',
      stored('s_none', 'unit-2', '2.6', 'lab') === 40);
  }

  // ── 6. The per-student escape hatch still beats every mode ───────────────
  console.log('\n6. students.retry_override grants retries against ANY mode');
  {
    ok("  mode none, override on: practice best attempt wins",
      await scoreTwice('s_over_none', 'unit-3', '3.1', 'exercise-1', 4, 10) === 100);
    ok("  mode none, override on: assessment best attempt wins too",
      await scoreTwice('s_over_none', 'unit-3', '3.2', 'quiz', 4, 10) === 100);
    ok("  mode practice, override on: the quiz opens up for this student",
      await scoreTwice('s_over_prac', 'unit-3', '3.2', 'quiz', 4, 10) === 100);
    const st = await fetch(`${base()}/api/student/quiz/status?course=${COURSE}&unit=unit-3&lesson=3.2`,
      { headers: { Authorization: 'Bearer ' + TOK.s_over_prac } }).then((r) => r.json());
    ok('  and the quiz page is told so', st.retry_allowed === true, st);

    // The other direction: an override of 0 must still shut a permissive class down.
    run(`UPDATE students SET retry_override = 0 WHERE id = 's_all'`);
    ok('  an override of 0 beats mode all',
      await scoreTwice('s_all', 'unit-3', '3.3', 'exercise-1', 4, 10) === 40);
    run(`UPDATE students SET retry_override = NULL WHERE id = 's_all'`);
  }

  // ── 7. Changing the mode is retroactive, both directions ─────────────────
  //  Nothing is rewritten. The grade is re-derived from the append-only ledger
  //  every time it is read or written, against the CURRENT policy.
  console.log('\n7. Changing the mode re-grades retroactively, in both directions');
  {
    const L = ['unit-4', '4.1', 'exercise-1'];
    await scoreTwice('s_flip', ...L, 4, 10); // class is 'none'
    ok('  none: the grade of record is the first attempt, 40', stored('s_flip', ...L) === 40);
    const events = () => one(`SELECT COUNT(*) n FROM score_events WHERE student_id='s_flip'`).n;
    const nBefore = events();

    await patch('/api/teacher/classes/CYBER-NON/retry', { retry_mode: 'practice' });
    const roll = rollupScore('s_flip', COURSE, ...L);
    ok('  after the flip the READ side already says 100, with no write at all',
      roll.pct === 100 && roll.retry_allowed === true, roll);
    // The cached progress.score catches up on the next write. The 1 below is
    // worse than everything on file, so only the policy can have moved the number.
    await post('/api/student/score',
      { course: COURSE, unit: L[0], lesson: L[1], activity_type: L[2], item: 'q1', points: 1, max_points: 10 },
      TOK.s_flip);
    ok('  and progress.score catches up to 100 on the next write', stored('s_flip', ...L) === 100);

    await patch('/api/teacher/classes/CYBER-NON/retry', { retry_mode: 'none' });
    await post('/api/student/score',
      { course: COURSE, unit: L[0], lesson: L[1], activity_type: L[2], item: 'q1', points: 1, max_points: 10 },
      TOK.s_flip);
    ok('  flipping back restores the first attempt, 40', stored('s_flip', ...L) === 40);
    ok('  no ledger row was rewritten or deleted', events() === nBefore + 2, events());
  }

  // ── 8. The teacher endpoint ──────────────────────────────────────────────
  console.log('\n8. PATCH /classes/:code/retry takes the mode, and the legacy boolean');
  {
    const modeOf = (id) => one(`SELECT retry_mode, retry_allowed FROM classes WHERE id = ?`, id);

    let r = await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_mode: 'all' });
    ok('  retry_mode all accepted', r.status === 200 && r.body.retry_mode === 'all', r.body);
    ok('  and stored', modeOf('c_prac').retry_mode === 'all');
    ok('  with a plain-language label, not the enum',
      typeof r.body.label === 'string' && !/^all$/i.test(r.body.label), r.body.label);

    r = await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_allowed: false });
    ok('  LEGACY {retry_allowed:false} maps to practice, what false has always meant',
      r.body.retry_mode === 'practice' && modeOf('c_prac').retry_mode === 'practice', r.body);
    r = await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_allowed: true });
    ok('  LEGACY {retry_allowed:true} maps to all',
      r.body.retry_mode === 'all' && modeOf('c_prac').retry_mode === 'all', r.body);

    r = await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_mode: 'none', retry_allowed: true });
    ok('  when both are sent the mode wins, so a stale boolean cannot override it',
      r.body.retry_mode === 'none' && modeOf('c_prac').retry_mode === 'none', r.body);

    r = await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_mode: 'sometimes' });
    ok('  a nonsense mode is refused, not coerced', r.status === 400, r.body);
    ok('  and the stored mode is untouched', modeOf('c_prac').retry_mode === 'none');

    r = await patch('/api/teacher/classes/CYBER-PRC/retry', {});
    ok('  an empty body is refused', r.status === 400, r.body);

    r = await patch('/api/teacher/classes/NOPE-0000/retry', { retry_mode: 'all' });
    ok('  another teacher / unknown class is 404', r.status === 404, r.body);

    await patch('/api/teacher/classes/CYBER-PRC/retry', { retry_mode: 'practice' });
  }

  // ── 9. The retry_allowed invariant ───────────────────────────────────────
  //  Everything downstream (the dashboards, the admin gradebook, System A) still
  //  reads the boolean. It must mean exactly "may an assessment be retaken".
  console.log('\n9. retry_allowed stays in sync: 1 if and only if the mode is all');
  {
    for (const mode of ['all', 'practice', 'none', 'all']) {
      await patch('/api/teacher/classes/CYBER-NON/retry', { retry_mode: mode });
      const row = one(`SELECT retry_mode, retry_allowed FROM classes WHERE id='c_none'`);
      ok(`  ${mode} -> retry_allowed ${RP.legacyFromMode(mode)}`,
        row.retry_mode === mode && row.retry_allowed === RP.legacyFromMode(mode), row);
    }
    // A direct SQL edit (a support fix, a restored backup) is repaired on boot.
    run(`UPDATE classes SET retry_allowed = 0 WHERE id = 'c_none'`);
    for (const sql of RP.BACKFILL_SQL) db.exec(sql);
    ok('  a row left disagreeing is repaired by the boot backfill',
      one(`SELECT retry_allowed FROM classes WHERE id='c_none'`).retry_allowed === 1);

    const bad = db.prepare(`
      SELECT COUNT(*) n FROM classes
      WHERE COALESCE(retry_allowed,0) != CASE WHEN retry_mode='all' THEN 1 ELSE 0 END
    `).get().n;
    ok('  no class in the database violates the invariant', bad === 0, bad);
  }

  // ── 10. A new class defaults to practice ─────────────────────────────────
  console.log('\n10. A new class defaults to practice only');
  {
    const r = await fetch(`${base()}/api/teacher/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TTOK },
      body: JSON.stringify({ class_name: 'Fresh Period 3', course: 'ap-cybersecurity' }),
    }).then(async (x) => ({ status: x.status, body: await x.json() }));
    ok('  created', r.status === 201, r.body);
    ok('  and its mode is practice', r.body.class.retry_mode === 'practice', r.body.class);
    ok('  with retry_allowed 0, exactly the old default', r.body.class.retry_allowed === 0);

    const r2 = await fetch(`${base()}/api/teacher/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TTOK },
      body: JSON.stringify({ class_name: 'Legacy Caller', course: 'ap-cybersecurity', retry_allowed: 1 }),
    }).then((x) => x.json());
    ok('  a legacy creator sending retry_allowed 1 still gets all',
      r2.class.retry_mode === 'all' && r2.class.retry_allowed === 1, r2.class);
  }

  // ── 11. The teacher gradebook reads the same policy ──────────────────────
  //  GET /classes/:code/progress sums points out of the ledger in its own
  //  aggregate pass. That pass used to be a flat MAX(points), a second copy of
  //  "best always wins", which under mode 'none' would print best-attempt POINTS
  //  next to a first-attempt PERCENT on the same row.
  console.log('\n11. The teacher gradebook agrees with progress.score under every mode');
  {
    await patch('/api/teacher/classes/CYBER-NON/retry', { retry_mode: 'none' });
    const cell = async () => {
      const d = await fetch(`${base()}/api/teacher/classes/CYBER-NON/progress`,
        { headers: { Authorization: 'Bearer ' + TTOK } }).then((x) => x.json());
      const row = d.summary.find((x) => x.student.id === 's_flip');
      return row.detail['unit-4']['4.1']['exercise-1'];
    };
    let c = await cell();
    ok('  mode none: the gradebook shows the FIRST attempt, 4 points',
      c.points_earned === 4 && c.score === 40, c);

    await patch('/api/teacher/classes/CYBER-NON/retry', { retry_mode: 'all' });
    c = await cell();
    ok('  mode all: the same ledger now reads 10 points',
      c.points_earned === 10, c);
    // The percent on this row is progress.score, a CACHE. It is recomputed from
    // the ledger on the student's next write, exactly as W10a established, so
    // straight after a mode flip the read-time points lead the cached percent.
    // Pinned deliberately: this is the documented lag, not a disagreement about
    // policy, and it closes the moment the student touches the activity again.
    ok('  the cached percent still shows the old policy until the next write',
      c.score === 40, c);
    await post('/api/student/score',
      { course: COURSE, unit: 'unit-4', lesson: '4.1', activity_type: 'exercise-1',
        item: 'q1', points: 1, max_points: 10 }, TOK.s_flip);
    c = await cell();
    ok('  after that write the percent agrees with the points, 100',
      c.score === 100 && c.points_earned === 10, c);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
