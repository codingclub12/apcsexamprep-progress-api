'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: teacher gradebook CSV export.
//  The regression this guards: the export gated a cell's score behind an
//  allow-list of "graded" activities (quiz, exam, case-file, exercise-3). A
//  recorded exercise-1 / exercise-2 score was therefore DISCARDED and rendered as
//  "Done", so exercises looked like they were not being graded when the numbers
//  were sitting in the database the whole time.
//
//  Run: npm run smoke:export
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-export.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-export-jwt-0123456789';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const run = (s, ...a) => db.prepare(s).run(...a);

// Parse a CSV row respecting quoted fields.
function splitCsv(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });

  // Register a teacher through the real route so the JWT is genuine.
  const reg = await fetch(base + '/api/teacher/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'export@school.org', password: 'exportpass1', name: 'Export Teacher' }),
  });
  const token = (await reg.json()).token;
  const teacherId = db.prepare('SELECT id FROM teachers WHERE email = ?').get('export@school.org').id;

  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c1','CYBER-EXP','Cyber','ap-cybersecurity',?,1,80)`, teacherId);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','Alpha Student','x')`);

  let pid = 0;
  const prog = (l, act, completed, score) =>
    run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score)
         VALUES (?,?,?,?,?,?,?,?,?)`, 'p' + (++pid), 's1', 'c1', 'ap-cybersecurity', 'unit-1', l, act, completed, score);

  // Every activity type the course declares for a lesson, each with a real score.
  prog('1.1', 'lesson', 1, null);        // completed, no score -> "Done"
  prog('1.1', 'exercise-1', 1, 73);      // was silently discarded before the fix
  prog('1.1', 'exercise-2', 1, 91);      // ditto
  prog('1.1', 'quiz', 1, 88);            // always worked
  prog('1.2', 'exercise-1', 1, null);    // completed, no score -> "Done"

  const res = await fetch(base + '/api/teacher/classes/CYBER-EXP/export', {
    headers: { Authorization: 'Bearer ' + token },
  });
  ok('export returns 200', res.status === 200, res.status);
  const csv = (await res.text()).replace(/^﻿/, '');
  const lines = csv.split('\r\n');
  const header = splitCsv(lines[0]);
  const row = splitCsv(lines[1]);
  const cell = (h) => { const i = header.indexOf(h); return i === -1 ? undefined : row[i]; };

  ok('header has a column per activity', header.indexOf('1.1 E1') !== -1 && header.indexOf('1.1 E2') !== -1,
    header.slice(0, 14));
  ok('quiz score exported (worked before)', cell('1.1 Q') === '88', cell('1.1 Q'));
  ok('exercise-1 SCORE exported, not "Done"', cell('1.1 E1') === '73', cell('1.1 E1'));
  ok('exercise-2 SCORE exported, not "Done"', cell('1.1 E2') === '91', cell('1.1 E2'));
  ok('completed lesson with no score still says Done', cell('1.1 L') === 'Done', cell('1.1 L'));
  ok('completed exercise with no score still says Done', cell('1.2 E1') === 'Done', cell('1.2 E1'));
  ok('untouched activity stays blank', cell('1.3 Q') === '', JSON.stringify(cell('1.3 Q')));
  ok('student name present', row[0] === 'Alpha Student', row[0]);

  // The unit average column is explicitly labelled "Avg Quiz", so it must stay
  // quiz-only even though exercises now export their scores.
  const avgIdx = header.findIndex((h) => /Avg Quiz$/.test(h));
  ok('Avg Quiz column still present', avgIdx !== -1, header.filter((h) => /Avg/.test(h)));
  ok('Avg Quiz remains quiz-only (88, not blended with 73/91)', row[avgIdx] === '88', row[avgIdx]);

  ok('another teacher cannot export this class', (await fetch(base + '/api/teacher/classes/CYBER-EXP/export')).status === 401);

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
