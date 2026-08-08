'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Schoology export states MARKS, not percentages.
//
//  WHY A THIRD FORMAT
//  Canvas and Schoology want different things, and the difference is the number
//  in the cell. The Canvas export authors every assignment out of 100 and posts
//  a percentage into it. Schoology imports by MAPPING columns onto assignments
//  that already exist, and a Schoology assignment has its own max points, so the
//  imported score is raw marks against that max: "7" into an assignment out of 8.
//
//  One question is one point, so marks are the thing the page actually counted.
//  A percentage is a derivation of them, and it cannot be imported into an
//  assignment worth 8 without being rescaled back into something else.
//
//  WHAT THIS PINS
//    1. Cells are marks. A student on 7 of 8 exports "7", not "88".
//    2. A column is only exported if its marks are REAL. A percent-only column
//       has no marks and no max, so there is no assignment for a teacher to
//       create. It is dropped AND listed in preflight.skipped, because a column
//       that silently vanishes is how half a gradebook fails to import.
//    3. Blank stays blank. A completed-but-unscored activity must never export
//       as 0, which would import a fabricated failure.
//    4. The header and the Points Possible row agree with the marks below them.
//
//  Zero PII: synthetic names, a throwaway PIN.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:schoology
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-schoology.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-schoology-secret-long-enough';

const express = require('express');
const db = require('../db');

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
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const getRaw = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, text: await r.text(), type: r.headers.get('content-type') }));
const getJson = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

const COURSE = 'ap-cybersecurity';
const parse = (line) => {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
};

(async () => {
  console.log('\nSCHOOLOGY EXPORT: MARKS, NOT PERCENTAGES\n');

  const reg = await post('/api/teacher/register', {
    email: 'schoology@example.org', password: 'a-long-enough-password',
    name: 'Schoology Test', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;

  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;

  // Student A REPORTS marks: 7 of 8 on an exercise, through the real endpoint.
  const a = await join('Ada Lovelace');
  for (let i = 1; i <= 8; i++) {
    await post('/api/student/score', {
      course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-2',
      item: 'q' + i, earned: i <= 7 ? 1 : 0, possible: 1,
    }, a);
  }
  // A column with only a PERCENT: no marks were ever counted for it.
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'quiz', score: 55, completed: true,
  }, a);
  // Completed, never scored. Must export blank, never 0.
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.3', activity_type: 'lab', completed: true,
  }, a);

  const b = await join('Grace Hopper');
  for (let i = 1; i <= 8; i++) {
    await post('/api/student/score', {
      course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-2',
      item: 'q' + i, earned: 0, possible: 1,
    }, b);
  }

  console.log('1. The route serves the format');
  const bad = await getJson(`/api/teacher/classes/${code}/export?format=nope`, tok);
  ok('  an unknown format is refused, naming schoology', bad.status === 400
    && /schoology/.test(bad.body.error || ''), bad.body);

  const res = await getRaw(`/api/teacher/classes/${code}/export?format=schoology`, tok);
  ok('  responds as CSV', res.status === 200 && /text\/csv/.test(res.type || ''), [res.status, res.type]);
  const lines = res.text.trim().split(/\r?\n/);
  ok('  has a header, a Points Possible row, and one row per student',
    lines.length === 4, lines.length);

  const head = parse(lines[0]);
  const pts = parse(lines[1]);
  const rowA = parse(lines[2]);
  const rowB = parse(lines[3]);

  console.log('2. Identity columns Schoology can map onto a student');
  ok('  First Name, Last Name, Unique ID lead the file',
    head[0] === 'First Name' && head[1] === 'Last Name' && head[2] === 'Unique ID', head.slice(0, 3));
  ok('  a two part name is split, not dumped into one cell',
    rowA[0] === 'Ada' && rowA[1] === 'Lovelace', rowA.slice(0, 2));

  console.log('3. Cells are MARKS, and the column states its total');
  const ex2 = head.findIndex((h) => /1\.1 Exercise 2/i.test(h));
  ok('  the reported column is present', ex2 > 2, { head });
  ok('  its header states the total the page actually asked',
    /out of 8/.test(head[ex2]), head[ex2]);
  ok('  the Points Possible row agrees with it', pts[ex2] === '8', pts[ex2]);
  ok('  7 of 8 exports as the mark 7, not the percentage 88',
    rowA[ex2] === '7', rowA[ex2]);
  ok('  a genuine zero exports as 0, not blank', rowB[ex2] === '0', rowB[ex2]);

  console.log('4. A column with no marks is dropped, and SAID so');
  const pre = await getJson(`/api/teacher/classes/${code}/export?format=schoology&preflight=1`, tok);
  ok('  preflight responds', pre.status === 200, pre.status);
  ok('  the percent-only quiz is not a column in the file',
    !head.some((h) => /1\.2 Quiz/i.test(h)), head);
  ok('  and it is reported as skipped rather than vanishing',
    (pre.body.skipped || []).some((h) => /1\.2/.test(h)), pre.body.skipped);
  ok('  preflight counts the columns that DID export',
    pre.body.columns === head.length - 3, { columns: pre.body.columns, head: head.length - 3 });

  console.log('5. The things that must never become a zero');
  ok('  completed-but-unscored is not a column with a 0 in it',
    !head.some((h) => /1\.3 Lab/i.test(h)) || rowA[head.findIndex((h) => /1\.3 Lab/i.test(h))] === '',
    head);
  const bodyCells = rowA.slice(3).concat(rowB.slice(3));
  ok('  every exported cell is a plain number or blank',
    bodyCells.every((c) => c === '' || /^\d+(\.\d{1,2})?$/.test(c)), bodyCells.filter((c) => c !== '' && !/^\d+(\.\d{1,2})?$/.test(c)));
  ok('  no cell contains a percent sign or a fraction',
    !bodyCells.some((c) => /[%/]/.test(c)), bodyCells.filter((c) => /[%/]/.test(c)));

  console.log('6. The other formats still work');
  const canvas = await getRaw(`/api/teacher/classes/${code}/export?format=canvas&scope=activity`, tok);
  ok('  canvas still exports', canvas.status === 200 && /Points Possible/.test(canvas.text));
  const native = await getRaw(`/api/teacher/classes/${code}/export`, tok);
  ok('  the native export still works', native.status === 200 && native.text.length > 0);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
