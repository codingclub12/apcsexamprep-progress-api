'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: attempts -> teacher cell rollup (lib/attempt-rollup.js).
//
//  The bug this closes: grades posted through POST /api/progress/attempt (CSA,
//  AP Networking) never reached the teacher dashboard or the CSV export, which
//  read only progress/score_events. This asserts the fold that fixes it:
//   - points_possible is the SUM of manifest points for the whole cell,
//     attempted or not (2 of 8 CFUs must read 2/8, never 2/2)
//   - grade of record honors the class retry MODE (best ratio) vs first-attempt
//   - a student retry_override beats the class default
//   - weighted items (a 2-point problem, a 12-point quiz) keep their weights
//   - an item missing from the manifest still surfaces via its recorded
//     max_score instead of disappearing
//   - a course with no graded manifest rows returns null (cyber/CSP no-op)
//
//  Run: npm run smoke:attemptrollup
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-attempt-rollup.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { attemptRollup } = require('../lib/attempt-rollup');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
// Retry policy is three-mode. This suite pins the two ENDS of it, because the
// cells it checks are PRACTICE (cfu): "first attempt of record" is now spelled
// mode 'none'. Plain retry_allowed = 0 maps to 'practice', which keeps practice
// best-of and would make c_first best-of here; that middle setting is covered by
// smoke/attempt-retry-modes.js. retry_allowed rides along as the derived
// assessment flag: 1 only for mode 'all'.
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,retry_mode) VALUES
 ('c_first','CSA-FIRST','First attempt of record','ap-csa','t1',1,80,0,'none'),
 ('c_retry','CSA-RETRY','Best attempt of record','ap-csa','t1',1,80,1,'all')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c_first','A','x'),
 ('s2','c_first','B','x'),
 ('s3','c_retry','C','x')`);
// s2 has a personal retry override even though the class is first-attempt.
run(`UPDATE students SET retry_override = 1 WHERE id = 's2'`);

// Manifest: a lesson with three 1-point CFUs plus one 2-point CFU (weighted),
// a 12-point quiz, and a 4-point FRQ. Total cfu possible = 5.
const mrow = (lesson, item, type, pts) =>
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES ('ap-csa','unit-9',?,?,?,?)`,
    lesson, item, type, pts);
mrow('9.1', '9.1-cfu-1', 'cfu', 1);
mrow('9.1', '9.1-cfu-2', 'cfu', 1);
mrow('9.1', '9.1-cfu-3', 'cfu', 1);
mrow('9.1', '9.1-cfu-4', 'cfu', 2);
mrow('9.1', '9.1-quiz', 'quiz', 12);
mrow('9.1', '9.1-exercise-3', 'exercise-3', 4);

const att = (sid, cid, item, type, score, max, no) =>
  run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES (?,?,'ap-csa','9.1',?,?,?,?,0,?)`, sid, cid, item, type, score, max, no);

// s1 (first-attempt class): cfu-1 wrong then right -> first attempt (0) is the
// grade of record. cfu-4 (2 pts) right first try. Quiz 8/12 then 11/12 -> 8.
att('s1', 'c_first', '9.1-cfu-1', 'cfu', 0, 1, 1);
att('s1', 'c_first', '9.1-cfu-1', 'cfu', 1, 1, 2);
att('s1', 'c_first', '9.1-cfu-4', 'cfu', 2, 2, 1);
att('s1', 'c_first', '9.1-quiz', 'quiz', 8, 12, 1);
att('s1', 'c_first', '9.1-quiz', 'quiz', 11, 12, 2);

// s2 (same class, retry_override=1): same rows as s1 -> best wins instead.
att('s2', 'c_first', '9.1-cfu-1', 'cfu', 0, 1, 1);
att('s2', 'c_first', '9.1-cfu-1', 'cfu', 1, 1, 2);

// s3 (retry class): quiz 3/12 then 9/12 -> 9. Plus an item that has no
// manifest row (a page shipped an ID before the seed caught up).
att('s3', 'c_retry', '9.1-quiz', 'quiz', 3, 12, 1);
att('s3', 'c_retry', '9.1-quiz', 'quiz', 9, 12, 2);
att('s3', 'c_retry', '9.1-ghost-1', 'cfu', 1, 1, 1);

console.log('attempt rollup: first-attempt class');
{
  const r = attemptRollup('c_first', 'ap-csa');
  ok('rollup exists for a manifest course', !!r);
  const cfu = r.cells.get('s1|9.1|cfu');
  ok('cfu earned = first attempt 0 + weighted 2', cfu && cfu.earned === 2, cfu);
  ok('cfu possible = all manifest cfu points (5), not just attempted', cfu && cfu.possible === 5, cfu);
  ok('cfu incomplete: 2 of 4 items attempted', cfu && cfu.items_attempted === 2 && cfu.items_total === 4 && !cfu.completed, cfu);
  const quiz = r.cells.get('s1|9.1|quiz');
  ok('quiz grade of record is FIRST attempt (8/12)', quiz && quiz.earned === 8 && quiz.possible === 12, quiz);
  ok('quiz complete: its one item was attempted', quiz && quiz.completed, quiz);
  ok('quiz pct rounds from points', quiz && quiz.pct === 67, quiz);
  const s2cfu = r.cells.get('s2|9.1|cfu');
  ok('student retry_override beats first-attempt class (best = 1)', s2cfu && s2cfu.earned === 1, s2cfu);
  ok('column denominator: quiz 12, cfu 5', r.possible.get('9.1|quiz').possible === 12 && r.possible.get('9.1|cfu').possible === 5);
  ok('unit resolved from manifest', r.unitOf.get('9.1') === 'unit-9');
}

console.log('attempt rollup: retry class and edge cases');
{
  const r = attemptRollup('c_retry', 'ap-csa');
  const quiz = r.cells.get('s3|9.1|quiz');
  ok('retry class grade of record is BEST attempt (9/12)', quiz && quiz.earned === 9 && quiz.pct === 75, quiz);
  ok('tries counted across attempts', quiz && quiz.tries === 2, quiz);
  const cfu = r.cells.get('s3|9.1|cfu');
  ok('unmanifested item still counts via recorded max_score', cfu && cfu.earned === 1 && cfu.possible === 6, cfu);
  ok('never-attempted exercise-3 produces no cell but has a denominator',
    !r.cells.get('s3|9.1|exercise-3') && r.possible.get('9.1|exercise-3').possible === 4);
}

console.log('attempt rollup: course off the attempts path');
{
  ok('no graded manifest rows -> null (cyber-style no-op)', attemptRollup('c_first', 'ap-cybersecurity') === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
