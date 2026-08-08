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
// Lesson cells are pure rollups now; the source lives on the per-assignment cell.
const cfu11 = g.items.find((i) => i.lesson_id === '1.1' && i.activity === 'cfu');
ok('per-item cell records the score-rollup source',
  cfu11 && s1.items[cfu11.key] && s1.items[cfu11.key].source === 'score', cfu11 && s1.items[cfu11.key]);
ok('1.1 averages cfu 90 + quiz 80 = 85', s1.cells['1.1'].pct === 85, s1.cells['1.1']);
ok('cfu and quiz are separate assignment cells', (function () {
  const q = g.items.find((i) => i.lesson_id === '1.1' && i.activity === 'quiz');
  return cfu11 && q && s1.items[cfu11.key] && s1.items[q.key] &&
    s1.items[cfu11.key].pct === 90 && s1.items[q.key].pct === 80;
})());
ok('lesson rollup averages those two to 85', s1.cells['1.1'].items === 2 && s1.cells['1.1'].pct === 85, s1.cells['1.1']);
ok('passed computed vs class threshold 80', s1.cells['1.1'].passed === true);
ok('failing student marked not passed', g.students[1].cells['1.1'].passed === false, g.students[1].cells['1.1']);
ok('lesson with NO manifest row still shown', g.lessons.some((l) => l.lesson_id === '2.7'), g.lessons.map((l) => l.lesson_id));
ok('  and is flagged as off-manifest', g.lessons.find((l) => l.lesson_id === '2.7').in_manifest === false);
ok('the lesson visit is its own cell, marked done', (function () {
  const l = g.items.find((i) => i.lesson_id === '1.1' && i.activity === 'lesson');
  return l && s1.items[l.key] && s1.items[l.key].source === 'done' && s1.items[l.key].completed === true;
})());
ok('overall basis is percent', s1.overall.basis === 'percent', s1.overall);
ok('class average computed', typeof g.summary.class_avg_pct === 'number', g.summary);
ok('per-lesson class average', g.lessons.find((l) => l.lesson_id === '1.1').class_avg_pct === Math.round((85 + 50 + 100) / 3),
  g.lessons.find((l) => l.lesson_id === '1.1'));
ok('summary counts the score-rollup source', g.summary.sources.score_rollups > 0, g.summary.sources);

console.log('csa class (attempts path)');
const g2 = buildGradebook('CSA-1');
// Columns now come from the course config, so every declared lesson shows even
// with no data. Assert the ORDERING is natural rather than a fixed short list.
const order = g2.lessons.map((l) => l.lesson_id);
ok('all configured lessons shown', order.length > 2, order.length);
ok('lessons in natural order (1.9 < 1.10 < 2.1)', (function () {
  const i9 = order.indexOf('1.9'), i10 = order.indexOf('1.10'), i21 = order.indexOf('2.1');
  return i9 !== -1 && i10 !== -1 && i9 < i10 && (i21 === -1 || i10 < i21);
})(), order.slice(0, 12));
const a1 = g2.students[0];
const q12 = g2.items.find((i) => i.lesson_id === '1.2' && i.activity === 'quiz');
ok('per-item cell records the attempt source',
  q12 && a1.items[q12.key] && a1.items[q12.key].source === 'attempt', q12 && a1.items[q12.key]);
ok('retry_allowed=1 takes the BEST attempt (10/10)', a1.items[q12.key].pct === 100, a1.items[q12.key]);
ok('overall basis is points', a1.overall.basis === 'points', a1.overall);
ok('summary counts the attempts source', g2.summary.sources.attempts > 0, g2.summary.sources);

console.log('privacy');
ok('anonymized by default', g.students.every((s) => /^Student \d+$/.test(s.label)), g.students.map((s) => s.label));
ok('anonymized flag set', g.anonymized === true);
const gr = buildGradebook('CYBER-1', { reveal: true });
ok('reveal returns real names', gr.students.some((s) => s.label.startsWith('Real Name')), gr.students.map((s) => s.label));
ok('labels are stable across calls',
  buildGradebook('CYBER-1').students[0].id === g.students[0].id);

console.log('per-assignment columns + exercise detection');
// The Cyber config declares lesson, exercise-1, exercise-2, quiz per lesson.
// The seed above recorded ONLY cfu/quiz style rollups, never an exercise, which
// is exactly the reported production symptom.
const gi = buildGradebook('CYBER-1');
ok('per-assignment columns exist', (gi.items || []).length > 0, (gi.items || []).length);
ok('columns include expected exercise-1 from the course config',
  gi.items.some((i) => i.activity === 'exercise-1' && i.expected), gi.items.slice(0, 6));
ok('expected-but-never-observed exercise column is present but unobserved',
  gi.items.some((i) => i.activity === 'exercise-1' && i.expected && !i.observed));
const cov = new Map((gi.activity_coverage || []).map((c) => [c.activity, c]));
ok('activity_coverage reports every activity type', cov.size >= 3, [...cov.keys()]);
ok('quiz coverage shows scores', (cov.get('quiz') || {}).scored_cells > 0, cov.get('quiz'));
ok('exercise-1 flagged never_scored', (cov.get('exercise-1') || {}).never_scored === true, cov.get('exercise-1'));
ok('exercise-2 flagged never_scored', (cov.get('exercise-2') || {}).never_scored === true, cov.get('exercise-2'));
ok('lesson (a visit type) NOT flagged never_scored',
  (cov.get('lesson') || {}).never_scored === false, cov.get('lesson'));
ok('summary lists never-scored activities',
  (gi.summary.never_scored_activities || []).indexOf('exercise-1') !== -1, gi.summary.never_scored_activities);
ok('quiz NOT in never-scored list',
  (gi.summary.never_scored_activities || []).indexOf('quiz') === -1, gi.summary.never_scored_activities);

// A per-assignment cell carries its own score, not a lesson average.
const st1 = gi.students[0];
const quizKey = gi.items.find((i) => i.lesson_id === '1.1' && i.activity === 'quiz');
ok('1.1 quiz cell holds the quiz score alone', quizKey && st1.items[quizKey.key] &&
  st1.items[quizKey.key].pct === 80, quizKey && st1.items[quizKey.key]);
const cfuKey = gi.items.find((i) => i.lesson_id === '1.1' && i.activity === 'cfu');
ok('1.1 cfu cell holds the cfu score alone', cfuKey && st1.items[cfuKey.key] &&
  st1.items[cfuKey.key].pct === 90, cfuKey && st1.items[cfuKey.key]);
ok('lesson rollup still averages them to 85', st1.cells['1.1'].pct === 85, st1.cells['1.1']);
ok('completed lesson cell recorded as done', (function(){
  var lk = gi.items.find((i) => i.lesson_id === '1.1' && i.activity === 'lesson');
  return lk && st1.items[lk.key] && st1.items[lk.key].source === 'done';
})());
ok('per-item class average computed', quizKey.class_avg_pct != null, quizKey);

console.log('denominators come from the AUTHORED source, retroactively');
// The authored "out of" for these activities. Nothing about the stored rows
// changes; only how they are denominated at read time.
run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
 ('ap-cybersecurity','unit-1','1.1','quiz',6),
 ('ap-cybersecurity','unit-1','1.1','cfu',4)`);
const gd = buildGradebook('CYBER-1');
const qCol = gd.items.find((i) => i.lesson_id === '1.1' && i.activity === 'quiz');
const cCol = gd.items.find((i) => i.lesson_id === '1.1' && i.activity === 'cfu');
ok('column carries the authored denominator', qCol.denominator === 6 && qCol.denominator_source === 'authored', qCol);
const d1 = gd.students[0];
// student 1 scored 80 on the quiz. 80% of 6 is 4.8, and points are counts of
// right and wrong, so the numerator is the nearest whole mark: 5.
ok('rollup cell now shows an out-of', d1.items[qCol.key].possible === 6, d1.items[qCol.key]);
ok('  earned rescaled to the authored total, in whole marks', d1.items[qCol.key].earned === 5, d1.items[qCol.key]);
ok('  percentage is unchanged by the rescale', d1.items[qCol.key].pct === 80, d1.items[qCol.key]);
ok('  source labelled authored', d1.items[qCol.key].denominator_source === 'authored');
// cfu 90% of 4 is 3.6, so the nearest whole mark is 4.
ok('a second activity uses ITS own denominator', d1.items[cCol.key].possible === 4 && d1.items[cCol.key].earned === 4,
  d1.items[cCol.key]);
ok('an activity with no authored row has none', (function () {
  const noD = gd.items.find((i) => i.activity === 'exercise-1');
  return noD && noD.denominator === null && noD.denominator_source === null;
})());
ok('summary counts authored vs missing denominators',
  gd.summary.denominators_authored === 2 && gd.summary.denominators_missing > 0, gd.summary);

// A REPORTED pair beats an authored total, on the attempts path too.
//
// One question is one point. The attempt already records how many points were
// earned and out of how many, because the page counted its own questions. An
// authored row is a guess ABOUT that page, so it must never rescale a real pair.
//
// This assertion used to say the opposite. Under the old rule an authored 20
// rewrote a real 10/10 into 20/20, which meant every authored row was a chance
// to overwrite a correct score with a number nobody had checked against the
// page. The authored value still prices columns that report nothing; it simply
// no longer overrides columns that do.
run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES ('ap-csa','unit-1','1.2','quiz',20)`);
const gd2 = buildGradebook('CSA-1');
const q2 = gd2.items.find((i) => i.lesson_id === '1.2' && i.activity === 'quiz');
const a2 = gd2.students[0];
ok('attempts cell keeps the REPORTED denominator (10), ignoring the authored 20',
  a2.items[q2.key].possible === 10, a2.items[q2.key]);
ok('  earned is the points actually scored, not rescaled', a2.items[q2.key].earned === 10, a2.items[q2.key]);
ok('  and it is sourced observed, not authored',
  a2.items[q2.key].denominator_source === 'observed', a2.items[q2.key].denominator_source);
ok('  percentage still 100', a2.items[q2.key].pct === 100, a2.items[q2.key]);

console.log('edge cases');
ok('unknown class returns null', buildGradebook('NOPE-9999') === null);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active) VALUES ('c_e','CYBER-EMPTY','E','ap-cybersecurity','t1',1)`);
const ge = buildGradebook('CYBER-EMPTY');
ok('empty class still returns a shape', !!ge && ge.students.length === 0, ge && ge.students.length);
ok('empty class avg is null', ge.summary.class_avg_pct === null);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
