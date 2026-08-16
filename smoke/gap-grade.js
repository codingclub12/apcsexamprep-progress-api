'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: POST /api/progress/gap, the fill-in-the-code grader.
//
//  WHY THIS EXISTS
//  Three properties, and all three fail silently rather than loudly:
//
//  1. THE SUBMITTED TEXT MUST NEVER BE STORED. A filled hole is student-typed
//     free text and this product stores none. If a future edit passes the raw
//     body to the wire log or widens the detail sanitizer, nothing breaks, no
//     test goes red, and student writing quietly accumulates in a database
//     belonging to a product whose entire posture is that it holds none. So
//     this test grades a submission containing a marker string and then greps
//     the WHOLE database file for it.
//
//  2. THE SCORE MUST BE COMPUTED SERVER-SIDE. A client-sent score would be a
//     student reporting their own grade. The route has no score field; this
//     proves sending one changes nothing.
//
//  3. FEEDBACK MUST NOT LEAK THE KEY. Near-miss messages name the KIND of
//     mistake so a beginner learns something, and must never name the answer.
//
//  Zero PII: synthetic students, synthetic answers.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gapgrade
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-gap-grade.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const grader = require('../lib/gap-grader');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// ── Fixtures ─────────────────────────────────────────────────────────────────
// classes.teacher_id is a real foreign key, so the teacher has to exist first.
const tCols = db.prepare('PRAGMA table_info(teachers)').all().map((c) => c.name);
const tVals = { id: 't-gap', name: 'Test Teacher', email: 'teacher@example.invalid',
  password_hash: 'x', school: 'Test School' };
const useCols = tCols.filter((c) => tVals[c] !== undefined);
db.prepare(`INSERT OR REPLACE INTO teachers (${useCols.join(', ')}) `
  + `VALUES (${useCols.map(() => '?').join(', ')})`).run(...useCols.map((c) => tVals[c]));

db.prepare(`INSERT OR REPLACE INTO classes
  (id, class_code, class_name, course, teacher_id, active, mastery_threshold, retry_allowed)
  VALUES ('c-gap', 'JAVA-0001', 'Period 1', 'intro-java', 't-gap', 1, 80, 1)`).run();
db.prepare(`INSERT OR REPLACE INTO students (id, class_id, display_name, pin_hash, active)
  VALUES ('s-gap', 'c-gap', 'Test Student', 'x', 1)`).run();

// The manifest row the route gates on. 1.6 has four holes.
db.prepare(`INSERT OR REPLACE INTO course_manifest (course, unit, lesson_id, item_id, item_type, points)
  VALUES ('intro-java', 'unit-1', '1.6', '1.6-gap', 'gap', 4)`).run();
// A gap item with a manifest row but deliberately NO key, to prove the 404 path.
db.prepare(`INSERT OR REPLACE INTO course_manifest (course, unit, lesson_id, item_id, item_type, points)
  VALUES ('intro-java', 'unit-1', '9.9', '9.9-gap', 'gap', 2)`).run();

const app = express();
app.use(express.json());
app.use('/api/progress', require('../routes/progress'));
const server = app.listen(0);
const PORT = server.address().port;
const TOKEN = signStudentToken({ id: 's-gap', class_id: 'c-gap', display_name: 'Test Student' });

async function post(body, token) {
  const r = await fetch(`http://127.0.0.1:${PORT}/api/progress/gap`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token === null ? {} : { authorization: `Bearer ${token || TOKEN}` }),
    },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
}

// The correct answers for 1.6, read from the bank so this test cannot drift
// from the content.
const KEY16 = grader.KEY.get('intro-java|1.6-gap');

(async () => {
  // ── 1. The pure grader ─────────────────────────────────────────────────────
  section('1. The grader itself');

  ok('1.1 a key exists for an authored gap', grader.hasKey('intro-java', '1.6-gap'));
  ok('1.2 no key for an item that was never authored', !grader.hasKey('intro-java', '9.9-gap'));
  ok('1.3 the key knows its lesson', grader.lessonFor('intro-java', '1.6-gap') === '1.6');

  const right = {}; KEY16.holes.forEach((h) => { right[h.n] = h.accept[0]; });
  const all = grader.gradeSubmission('intro-java', '1.6-gap', right);
  ok('1.4 an all-correct submission scores full marks',
    all.score === all.max_score && all.max_score === KEY16.holes.length, all);
  ok('1.5 detail is hole number, null selection, and a boolean, nothing else',
    all.detail.every((d) => Object.keys(d).join(',') === 'q,sel,ok' && d.sel === null), all.detail[0]);

  const none = grader.gradeSubmission('intro-java', '1.6-gap', {});
  ok('1.6 an empty submission scores zero and is not an error', none.found && none.score === 0);
  ok('1.7 an empty blank says so', none.holes.every((h) => h.reason === 'blank'));

  // Whitespace is forgiven; capitalisation is not, but is explained.
  const padded = {}; KEY16.holes.forEach((h) => { padded[h.n] = `   ${h.accept[0]}  `; });
  ok('1.8 surrounding whitespace is forgiven',
    grader.gradeSubmission('intro-java', '1.6-gap', padded).score === KEY16.holes.length);

  const wrongCase = {}; KEY16.holes.forEach((h) => { wrongCase[h.n] = h.accept[0].toUpperCase(); });
  const cased = grader.gradeSubmission('intro-java', '1.6-gap', wrongCase);
  ok('1.9 wrong capitalisation is WRONG, because Java is case sensitive',
    cased.score < KEY16.holes.length);
  ok('1.10 and it explains itself rather than just saying no',
    cased.holes.some((h) => h.reason === 'capitalisation'), cased.holes);

  // ── 2. Near-miss feedback never names the answer ───────────────────────────
  section('2. Feedback teaches without leaking');

  let leaked = [];
  for (const variant of [wrongCase, {}, { 1: 'act', 2: 'move', 3: 'isAtEdge', 4: '181' }]) {
    const g = grader.gradeSubmission('intro-java', '1.6-gap', variant);
    for (const h of g.holes) {
      if (!h.message) continue;
      const accept = KEY16.holes.find((x) => x.n === h.n).accept;
      for (const a of accept) {
        if (a.length > 2 && h.message.includes(a)) leaked.push(`hole ${h.n}: "${h.message}"`);
      }
    }
  }
  ok('2.1 no near-miss message contains its own answer', leaked.length === 0, leaked);

  ok('2.2 a missing-parentheses answer is recognised as such',
    grader.gradeHole('isAtEdge', ['isAtEdge()']).reason === 'missing_parentheses');
  ok('2.3 a stray semicolon is recognised as such',
    grader.gradeHole('180;', ['180']).reason === 'stray_semicolon');
  ok('2.4 a genuinely unrelated answer gets no hint at all',
    grader.gradeHole('banana', ['180']).reason === null);
  ok('2.5 every near miss still scores zero for that hole',
    !grader.gradeHole('isAtEdge', ['isAtEdge()']).ok
    && !grader.gradeHole('180;', ['180']).ok);

  // ── 3. The route ───────────────────────────────────────────────────────────
  section('3. The route');

  const unauth = await post({ course: 'intro-java', item_id: '1.6-gap', answers: right }, null);
  ok('3.1 an unauthenticated submission is refused', unauth.status === 401, unauth.status);

  const good = await post({ course: 'intro-java', item_id: '1.6-gap', answers: right });
  ok('3.2 a correct submission is recorded', good.status === 200 && good.body.recorded === true, good);
  ok('3.3 it scores full marks', good.body && good.body.score === 4 && good.body.max_score === 4, good.body);
  ok('3.4 and passes at the class threshold', good.body && good.body.passed === true);
  ok('3.5 per-hole feedback comes back', good.body && good.body.holes.length === 4);
  ok('3.6 the response never contains a correct answer',
    !KEY16.holes.some((h) => h.accept.some((a) => a.length > 2
      && JSON.stringify(good.body).includes(`"${a}"`))), good.body);

  const unknown = await post({ course: 'intro-java', item_id: 'nope-gap', answers: right });
  ok('3.7 an item with no manifest row is rejected', unknown.status === 400, unknown.status);

  const noKey = await post({ course: 'intro-java', item_id: '9.9-gap', answers: { 1: 'x' } });
  ok('3.8 a manifest row with no key 404s rather than scoring zero', noKey.status === 404, noKey);

  const badAnswers = await post({ course: 'intro-java', item_id: '1.6-gap', answers: 'not an object' });
  ok('3.9 a non-object answers field is refused', badAnswers.status === 400);

  const huge = await post({
    course: 'intro-java', item_id: '1.6-gap',
    answers: { 1: 'x'.repeat(5000) },
  });
  ok('3.10 an oversized answer is refused rather than stored', huge.status === 400);

  const wrongCourse = await post({ course: 'ap-csa', item_id: '1.6-gap', answers: right });
  ok('3.11 a course that is not the class course is refused', wrongCourse.status === 400);

  // ── 4. The score is the SERVER'S, not the student's ────────────────────────
  section('4. The score is computed server-side');

  const forged = await post({
    course: 'intro-java', item_id: '1.6-gap',
    answers: { 1: 'wrong', 2: 'wrong', 3: 'wrong', 4: 'wrong' },
    score: 4, max_score: 4, passed: true,
  });
  ok('4.1 a client-sent score is ignored entirely',
    forged.status === 200 && forged.body.score === 0, forged.body);
  ok('4.2 and the student does not pass on their own say-so', forged.body.passed === false);

  // ── 5. THE SUBMITTED TEXT IS NOWHERE IN THE DATABASE ───────────────────────
  section('5. Student free text is never stored');

  const MARKER = 'zzmarkerzz' + 'QWERTY' + '9182';
  const marked = await post({
    course: 'intro-java', item_id: '1.6-gap',
    answers: { 1: MARKER, 2: MARKER + 'b', 3: MARKER + 'c', 4: MARKER + 'd' },
  });
  ok('5.1 the marked submission was graded', marked.status === 200, marked.status);
  ok('5.2 and scored zero, since the marker is not an answer', marked.body.score === 0);

  // Every text-ish column of every table, checked directly.
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  let found = [];
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    for (const c of cols) {
      const hit = db.prepare(
        `SELECT COUNT(*) n FROM "${t.name}" WHERE CAST("${c.name}" AS TEXT) LIKE ?`
      ).get(`%${MARKER}%`);
      if (hit && hit.n > 0) found.push(`${t.name}.${c.name}`);
    }
  }
  ok('5.3 the submitted text appears in NO column of NO table', found.length === 0, found);

  // And not in the raw file either, which catches anything the column scan missed.
  db.pragma('wal_checkpoint(TRUNCATE)');
  const raw = fs.readFileSync(process.env.DB_PATH);
  ok('5.4 the submitted text does not appear in the database file at all',
    !raw.includes(MARKER));

  // What IS stored is the booleans.
  const row = db.prepare(
    "SELECT detail, score, max_score FROM attempts WHERE item_id='1.6-gap' ORDER BY id DESC LIMIT 1").get();
  ok('5.5 what is stored is per-hole booleans',
    /^\[\{"q":\d+,"sel":null,"ok":(true|false)\}/.test(row.detail), row.detail);
  ok('5.6 the stored detail contains no letters from any answer',
    !/[A-Za-z]/.test(row.detail.replace(/"[qsel ok]+":/g, '').replace(/true|false|null/g, '')),
    row.detail);

  // ── 6. Retry and grade of record ───────────────────────────────────────────
  section('6. Retry behaviour matches the class policy');

  const before = db.prepare("SELECT COUNT(*) n FROM attempts WHERE item_id='1.6-gap'").get().n;
  const retry = await post({ course: 'intro-java', item_id: '1.6-gap', answers: right });
  const after = db.prepare("SELECT COUNT(*) n FROM attempts WHERE item_id='1.6-gap'").get().n;
  ok('6.1 every submission is stored, never overwritten', after === before + 1, { before, after });
  ok('6.2 attempt_no counts up', retry.body.attempt_no === after, retry.body.attempt_no);
  ok('6.3 the grade of record is the BEST attempt for a retryable class',
    retry.body.grade_of_record.score === 4, retry.body.grade_of_record);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
