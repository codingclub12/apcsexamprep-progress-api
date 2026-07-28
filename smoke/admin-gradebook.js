'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: full gradebook (merges attempts + score_events rollups).
//  The regression this guards: the previous gradebook read only `attempts`, so a
//  Cybersecurity class (which reports via score_events -> progress.score) came
//  back empty even though every score was in the database. The first block below
//  is exactly that case.
//
//  Run: npm run smoke:gradebook
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gradebook.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { buildGradebook, compareLessonId } = require('../lib/admin-gradebook');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed) VALUES
 ('c_cy','CYBER-1','Cyber','ap-cybersecurity','t1',1,80,0),
 ('c_csa','CSA-1','CSA','ap-csa','t1',1,70,1)`);
let sid = 0;
const stu = (cid, n) => { const o = []; for (let i = 0; i < n; i++) { const id = 's' + (++sid);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash,created_at) VALUES (?,?,?,?,datetime('now','-'||?||' days'))`, id, cid, 'Real Name ' + sid, 'x', 30 - i);
  o.push(id); } return o; };
const cy = stu('c_cy', 3);
const csa = stu('c_csa', 2);

let pid = 0;
const prog = (s, c, co, u, l, act, completed, score) =>
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`, 'p' + (++pid), s, c, co, u, l, act, completed, score);

// ── Cyber class: scores live ONLY in progress.score (score_events rollup) ────
cy.forEach((s, i) => {
  prog(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'lesson', 1, null);   // visit
  prog(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'cfu', 0, [90, 60, 100][i]);
  prog(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'quiz', 0, [80, 40, 100][i]);
  prog(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.2', 'cfu', 0, [70, 50, 90][i]);
});
// A lesson with real scores but NO manifest row: must still appear as a column.
prog(cy[0], 'c_cy', 'ap-cybersecurity', 'unit-2', '2.7', 'cfu', 0, 88);
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES
 ('ap-cybersecurity','unit-1','1.1','1.1-visit','visit',1),
 ('ap-cybersecurity','unit-1','1.2','1.2-visit','visit',1)`);

// ── CSA class: attempts pipeline, plus lesson-order check (1.2 before 1.10) ──
let aid = 0;
const att = (s, c, co, l, item, type, sc, mx, no) =>
  run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES (?,?,?,?,?,?,?,?,?,?)`, s, c, co, l, item, type, sc, mx, sc / mx * 100 >= 70 ? 1 : 0, no);
csa.forEach((s, i) => {
  att(s, 'c_csa', 'ap-csa', '1.2', '1.2-quiz', 'quiz', i ? 9 : 5, 10, 1);
  att(s, 'c_csa', 'ap-csa', '1.10', '1.10-quiz', 'quiz', 8, 10, 1);
  prog(s, 'c_csa', 'ap-csa', 'unit-1', '1.2', 'lesson', 1, null);
});
// retry_allowed=1 on this class, so the BEST attempt must win.
att(csa[0], 'c_csa', 'ap-csa', '1.2', '1.2-quiz', 'quiz', 10, 10, 2);
['1.2', '1.10'].forEach((l) => run(
  `INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES ('ap-csa','unit-1',?,?,'quiz',10)`, l, l + '-quiz'));

console.log('lesson id ordering');
ok('1.2 sorts before 1.10', compareLessonId('1.2', '1.10') < 0);
ok('natural order overall',
  ['1.10', '1.2', '1.1', '2.1', '1.9'].sort(compareLessonId).join(' ') === '1.1 1.2 1.9 1.10 2.1');

console.log('cyber class (score_events rollup path) - the regression this guards');
const g = buildGradebook('CYBER-1');
ok('resolves by class code', !!g && g.class.class_code === 'CYBER-1');
ok('NOT empty: lessons present', g.lessons.length >= 3, g.lessons.map((l) => l.lesson_id));
ok('every student has scores', g.students.every((s) => Object.keys(s.cells).length > 0));
const s1 = g.students[0];
ok('cell uses the score rollup source', s1.cells['1.1'].source === 'score', s1.cells['1.1']);
ok('1.1 averages cfu 90 + quiz 80 = 85', s1.cells['1.1'].pct === 85, s1.cells['1.1']);
ok('carries the per-activity breakdown', (s1.cells['1.1'].activities || []).length === 2, s1.cells['1.1'].activities);
ok('passed computed vs class threshold 80', s1.cells['1.1'].passed === true);
ok('failing student marked not passed', g.students[1].cells['1.1'].passed === false, g.students[1].cells['1.1']);
ok('lesson with NO manifest row still shown', g.lessons.some((l) => l.lesson_id === '2.7'), g.lessons.map((l) => l.lesson_id));
ok('  and is flagged as off-manifest', g.lessons.find((l) => l.lesson_id === '2.7').in_manifest === false);
ok('visit recorded on the cell', s1.cells['1.1'].visited === true);
ok('overall basis is percent', s1.overall.basis === 'percent', s1.overall);
ok('class average computed', typeof g.summary.class_avg_pct === 'number', g.summary);
ok('per-lesson class average', g.lessons.find((l) => l.lesson_id === '1.1').class_avg_pct === Math.round((85 + 50 + 100) / 3),
  g.lessons.find((l) => l.lesson_id === '1.1'));
ok('summary counts the score-rollup source', g.summary.sources.score_rollups > 0, g.summary.sources);

console.log('csa class (attempts path)');
const g2 = buildGradebook('CSA-1');
ok('lessons in natural order', g2.lessons.map((l) => l.lesson_id).join(' ') === '1.2 1.10', g2.lessons.map((l) => l.lesson_id));
const a1 = g2.students[0];
ok('cell uses the attempt source', a1.cells['1.2'].source === 'attempt', a1.cells['1.2']);
ok('retry_allowed=1 takes the BEST attempt (10/10)', a1.cells['1.2'].pct === 100, a1.cells['1.2']);
ok('overall basis is points', a1.overall.basis === 'points', a1.overall);
ok('summary counts the attempts source', g2.summary.sources.attempts > 0, g2.summary.sources);

console.log('privacy');
ok('anonymized by default', g.students.every((s) => /^Student \d+$/.test(s.label)), g.students.map((s) => s.label));
ok('anonymized flag set', g.anonymized === true);
const gr = buildGradebook('CYBER-1', { reveal: true });
ok('reveal returns real names', gr.students.some((s) => s.label.startsWith('Real Name')), gr.students.map((s) => s.label));
ok('labels are stable across calls',
  buildGradebook('CYBER-1').students[0].id === g.students[0].id);

console.log('edge cases');
ok('unknown class returns null', buildGradebook('NOPE-9999') === null);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active) VALUES ('c_e','CYBER-EMPTY','E','ap-cybersecurity','t1',1)`);
const ge = buildGradebook('CYBER-EMPTY');
ok('empty class still returns a shape', !!ge && ge.students.length === 0, ge && ge.students.length);
ok('empty class avg is null', ge.summary.class_avg_pct === null);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
