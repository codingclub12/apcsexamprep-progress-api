'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: points_earned / points_possible for courses on the LEGACY path.
//
//  WHY THIS EXISTS
//  Cybersecurity and CSP report grades through POST /api/student/quiz, which
//  writes progress.score (a 0-100 percentage) and a quiz_attempts log row. It
//  never writes score_events. Every gradebook points column reads score_events,
//  so 75 cyber classes and 19 CSP classes show no points at all, while the
//  teacher can plainly see that quizzes and lessons "work".
//
//  The teacher dashboard already carries the fix: when a lesson/activity has an
//  AUTHORED denominator in course_denominators and no score_events exist, it
//  derives the ratio from progress.score and rescales it against the authored
//  "out of". Nothing tested that path, and authoring denominators for 94 live
//  classes on the strength of an unverified branch is not a bet worth taking.
//  This pins the behaviour before any production row is written.
//
//  The load-bearing branch is routes/teacher.js:
//      const ratio = (possible && possible > 0) ? (earned / possible)
//                  : (p.score != null ? p.score / 100 : null);
//
//  WHAT MUST HOLD
//    1. No authored denominator  -> no points. The current cyber state.
//    2. Authored + legacy percent -> real points, rescaled, percent unmoved.
//    3. score_events, when present, are preferred over the percentage.
//    4. A missing score yields null, NEVER a fabricated zero. A student who has
//       not taken a quiz and a student who scored 0 must never look the same.
//
//  Zero PII: author content and synthetic students only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:legacypoints
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-legacy-points.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

// ── Fixture ──────────────────────────────────────────────────────────────────
// One cyber class on the legacy path. Mastery 80 so the threshold is not the
// thing under test; the denominator is.
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c_cy','CYBER-SMOKE','Cyber','ap-cybersecurity','t1',1,80,0)`);

// s1 took the 1.1 quiz and scored 80 percent, recorded the legacy way.
// s2 took nothing at all: the null case that must not become a zero.
// s3 scored a genuine 0, which must stay distinguishable from s2.
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c_cy','A','x'), ('s2','c_cy','B','x'), ('s3','c_cy','C','x')`);

const prog = (id, sid, lesson, act, score, completed) => run(
  `INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,score,completed,attempts,locked,updated_at)
   VALUES (?,?,'c_cy','ap-cybersecurity','unit-1',?,?,?,?,1,0,datetime('now'))`,
  id, sid, lesson, act, score, completed
);

prog('p1', 's1', '1.1', 'quiz', 80, 1);   // legacy percentage
prog('p2', 's2', '1.1', 'lesson', null, 1); // visited, never scored
prog('p3', 's3', '1.1', 'quiz', 0, 1);    // a real zero

// ── Drive the REAL endpoint, not a reimplementation of it ────────────────────
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const token = signTeacherToken({ id: 't1', email: 't@s.org' });

const cell = (summary, sid, lesson, act) => {
  const row = summary.find((r) => r.student.id === sid);
  return row && row.detail && row.detail['unit-1']
    && row.detail['unit-1'][lesson] && row.detail['unit-1'][lesson][act];
};

async function progress() {
  const r = await fetch(`http://127.0.0.1:${server.address().port}/api/teacher/classes/CYBER-SMOKE/progress`,
    { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('progress endpoint returned ' + r.status);
  return (await r.json()).summary;
}

(async () => {
  console.log('\nLEGACY POINTS (cyber / CSP path)\n');

  // ── 1. The current production state: no authored denominator ───────────────
  console.log('1. No authored denominator (today\'s cyber)');
  {
    const s = await progress();
    const q = cell(s, 's1', '1.1', 'quiz');
    ok('the quiz cell exists at all', !!q);
    ok('  percentage is present and untouched', q.score === 80, q && q.score);
    ok('  points_earned is null (nothing to denominate against)', q.points_earned === null, q && q.points_earned);
    ok('  points_possible is null', q.points_possible === null, q && q.points_possible);
    ok('  denominator_source is null', q.denominator_source === null, q && q.denominator_source);
  }

  // ── 2. Author the denominator: the whole proposed fix, in one row ──────────
  console.log('\n2. Authored denominator 1.1|quiz = 6');
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
       VALUES ('ap-cybersecurity','unit-1','1.1','quiz',6)`);
  {
    const s = await progress();
    const q = cell(s, 's1', '1.1', 'quiz');
    // Points are counts of right and wrong, so the numerator is a whole number.
    // 80 percent of 6 is 4.8, which is not a score anyone can earn; the nearest
    // whole point is 5.
    //
    // This fixture is worth keeping exactly as it is, because 80 percent of 6 is
    // IMPOSSIBLE. A 6 mark quiz can only produce 0, 17, 33, 50, 67, 83 or 100.
    // A stored 80 therefore means the authored denominator and the page disagree,
    // and the rounding is what makes that disagreement visible instead of hiding
    // it inside a decimal. On a column where the two DO agree, which is every
    // column a real page feeds, the reconstruction is exact and this is a no-op.
    ok('  points_possible is the AUTHORED 6', q.points_possible === 6, q.points_possible);
    ok('  points_earned is a whole 5, not the impossible 4.8', q.points_earned === 5, q.points_earned);
    ok('  and it is genuinely an integer, not 5.0 with a hidden fraction',
      Number.isInteger(q.points_earned), q.points_earned);
    ok('  denominator_source reports "authored"', q.denominator_source === 'authored', q.denominator_source);
    // The stored percent is still the grade of record, so no mastery decision
    // moves when the numerator rounds.
    ok('  the percentage itself never moved', q.score === 80, q.score);
    // The pair cannot read back as 80 here, because no whole number of 6 marks
    // does. It lands on the closest achievable score, and the gap is bounded by
    // half a point, which is the most a rounded numerator can ever be off by.
    const pairPct = (q.points_earned / q.points_possible) * 100;
    ok('  the pair reads as the nearest achievable score instead',
      Math.round(pairPct) === 83, Math.round(pairPct));
    ok('  and it is within half a point of the stored percent',
      Math.abs(pairPct - q.score) <= (50 / q.points_possible) + 0.001,
      { pairPct, stored: q.score, bound: 50 / q.points_possible });
  }

  // ── 3. A real zero must survive as a zero ─────────────────────────────────
  console.log('\n3. A genuine 0 percent stays 0, and stays distinguishable');
  {
    const s = await progress();
    const z = cell(s, 's3', '1.1', 'quiz');
    ok('  points_earned is 0, not null', z.points_earned === 0, z.points_earned);
    ok('  points_possible is still 6', z.points_possible === 6, z.points_possible);
  }

  // ── 4. Never fabricate a zero for a student who did not take it ───────────
  console.log('\n4. Not-taken stays null (never a fabricated zero)');
  {
    const s = await progress();
    const none = cell(s, 's2', '1.1', 'quiz');
    ok('  a student with no quiz row has no quiz cell', !none, none);
    const lesson = cell(s, 's2', '1.1', 'lesson');
    ok('  their visited lesson still shows completed', !!lesson && lesson.completed === true);
    ok('  and carries no invented points', !!lesson && lesson.points_earned === null, lesson && lesson.points_earned);
  }

  // ── 5. score_events, when they exist, outrank the percentage ─────────────
  //  This is the guard that keeps the fallback from hijacking courses that
  //  already report properly. CSA must not start reading its own percentages.
  console.log('\n5. score_events take precedence over the legacy percentage');
  {
    run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,correct)
         VALUES ('e1','s1','c_cy','ap-cybersecurity','unit-1','1.2','quiz','q1',3,4,1)`);
    prog('p4', 's1', '1.2', 'quiz', 25, 1);   // percentage deliberately DISAGREES
    const s = await progress();
    const q = cell(s, 's1', '1.2', 'quiz');
    ok('  earned comes from the ledger (3), not the percentage (25%)', q.points_earned === 3, q.points_earned);
    ok('  possible comes from the ledger (4)', q.points_possible === 4, q.points_possible);
    ok('  denominator_source reports "observed"', q.denominator_source === 'observed', q.denominator_source);
  }

  // ── 6. Authored denominator rescales ledger points too ───────────────────
  console.log('\n6. Authored value also rescales real ledger points');
  {
    run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
         VALUES ('ap-cybersecurity','unit-1','1.2','quiz',8)`);
    const s = await progress();
    const q = cell(s, 's1', '1.2', 'quiz');
    // 3/4 rescaled onto 8 is 6.
    ok('  points_possible becomes the authored 8', q.points_possible === 8, q.points_possible);
    ok('  points_earned rescales 3/4 to 6/8', q.points_earned === 6, q.points_earned);
    ok('  ratio is preserved exactly', q.points_earned / q.points_possible === 3 / 4);
  }

  // ── 7. Nothing here may write a score ────────────────────────────────────
  console.log('\n7. Reading a gradebook writes nothing');
  {
    const before = db.prepare('SELECT COUNT(*) n FROM progress').get().n;
    const beforeEv = db.prepare('SELECT COUNT(*) n FROM score_events').get().n;
    await progress();
    ok('  progress row count unchanged', db.prepare('SELECT COUNT(*) n FROM progress').get().n === before);
    ok('  score_events count unchanged', db.prepare('SELECT COUNT(*) n FROM score_events').get().n === beforeEv);
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
