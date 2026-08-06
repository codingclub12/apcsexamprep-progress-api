'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: Canvas gradebook export (format=canvas&scope=unit).
//
//  What this guards, in order of how badly it hurts a teacher:
//
//   1. A FABRICATED ZERO. A unit a student has not reached must export BLANK.
//      Writing 0 would import an invented failure into a real Canvas gradebook,
//      which is the phantom-zero bug the ungraded-fallout suite exists to keep
//      dead. Blank means ungraded, always.
//   2. A CELL CANVAS REJECTS. The native export emits "Done" and "8/10" and a
//      percent, all in the same column. Canvas takes a number or a blank and
//      nothing else, so every data cell has to match /^$|^\d+(\.\d{1,2})?$/.
//   3. A SILENTLY DROPPED STUDENT. Canvas matches on whichever of its three ID
//      columns is populated, and here they all come from student_ref, which is
//      free text nobody validated. preflight=1 has to report exactly who will
//      not match BEFORE the teacher imports.
//   4. The Canvas file format itself: header row, "Points Possible" second,
//      BOM present.
//
//  Also pins that the native export is untouched by the shared formatter: the
//  default format is still the wide human CSV, "Done" and all.
//
//  Zero PII: synthetic students, synthetic refs.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:canvas
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-canvas.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-canvas-jwt-0123456789';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { CANVAS_CELL_RE } = require('../lib/export-format');
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
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

// fetch().text() runs a UTF-8 decode, which SWALLOWS the BOM. Reading the raw
// bytes is the only way to assert the BOM is really on the wire, and the BOM is
// what makes Canvas read a non-ASCII name correctly.
async function getCsv(url, opts) {
  const r = await fetch(url, opts);
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, buf, text: buf.toString('utf8') };
}

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });

  const reg = await fetch(base + '/api/teacher/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'canvas@school.org', password: 'canvaspass1', name: 'Canvas Teacher' }),
  });
  const token = (await reg.json()).token;
  const auth = { Authorization: 'Bearer ' + token };
  const teacherId = db.prepare('SELECT id FROM teachers WHERE email = ?').get('canvas@school.org').id;

  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c1','CYBER-CNV','Period 3','ap-cybersecurity',?,1,80)`, teacherId);

  // The roster is the identity story. Only s1 and s2 can reach Canvas.
  run(`INSERT INTO students (id,class_id,display_name,student_ref,pin_hash) VALUES
    ('s1','c1','Jane Doe','jane.doe@sfcakings.org','x'),
    ('s2','c1','Chen','student-4417','x'),
    ('s3','c1','Jane D.',NULL,'x'),
    ('s4','c1','M. Chen','has space','x'),
    ('s5','c1','Mary Jo Watson','watson, mary','x')`);

  let pid = 0;
  const prog = (sid, l, act, completed, score) =>
    run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score)
         VALUES (?,?,?,?,?,?,?,?,?)`, 'p' + (++pid), sid, 'c1', 'ap-cybersecurity',
        'unit-' + String(l).split('.')[0], l, act, completed, score);

  // s1, Unit 1: real scores plus a visit that carries no score.
  prog('s1', '1.1', 'lesson', 1, null);      // "Done" natively, blank for Canvas
  prog('s1', '1.1', 'quiz', 1, 90);
  prog('s1', '1.2', 'quiz', 1, 84);
  // s1, Unit 2: opened a lesson, never graded. THE fabricated-zero case.
  prog('s1', '2.1', 'lesson', 1, null);
  // s2, Unit 1: one score, so the class has more than one graded student.
  prog('s2', '1.1', 'quiz', 1, 71);

  console.log('\nCANVAS EXPORT\n');

  // ── 1. The file Canvas expects ─────────────────────────────────────────────
  console.log('1. Canvas file shape');
  const res = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit', { headers: auth });
  ok('  returns 200', res.status === 200, res.status);
  const raw = res.text;
  ok('  UTF-8 BOM present on the wire', res.buf[0] === 0xef && res.buf[1] === 0xbb && res.buf[2] === 0xbf,
    [...res.buf.slice(0, 3)]);

  const lines = raw.replace(/^﻿/, '').split('\r\n');
  const header = splitCsv(lines[0]);
  // All three Canvas identity columns ship, blank where unknown, so a district
  // can match on a student number and never store an email here.
  ok('  header is Student, the three Canvas ID columns, Section, then one column per unit',
    header.slice(0, 5).join('|') === 'Student|ID|SIS User ID|SIS Login ID|Section' && header.length === 10, header);
  ok('  assignment headers carry the course prefix so they cannot collide in Canvas',
    header[5] === 'Cyber Unit 1' && header[9] === 'Cyber Unit 5', header.slice(5));

  const points = splitCsv(lines[1]);
  ok('  row 2 is Points Possible (Canvas requires it second)', points[0] === 'Points Possible', points[0]);
  ok('  Points Possible leaves the ID columns and Section blank',
    points.slice(1, 5).every((c) => c === ''), points.slice(0, 5));
  ok('  every assignment is out of 100', points.slice(5).every((p) => p === '100'), points.slice(5));

  const dataRows = lines.slice(2).filter((l) => l.length).map(splitCsv);
  ok('  one row per student, no instruction row', dataRows.length === 5, dataRows.length);

  // ── 2. Every data cell is a number or a blank ──────────────────────────────
  console.log('\n2. No cell Canvas would reject');
  {
    const bad = [];
    for (const r of dataRows) for (const cell of r.slice(5)) if (!CANVAS_CELL_RE.test(cell)) bad.push(cell);
    ok('  every grade cell matches /^$|^\\d+(\\.\\d{1,2})?$/', bad.length === 0, bad);
    ok('  no "Done" anywhere in the file', !/\bDone\b/.test(raw));
    ok('  no "earned/possible" fraction anywhere in the file', !/\d+\/\d+/.test(raw));
  }

  // ── 3. The grades themselves ───────────────────────────────────────────────
  console.log('\n3. Unit grades');
  const rowFor = (name) => dataRows.find((r) => r[0] === name);
  {
    const jane = rowFor('Doe, Jane');
    ok('  Unit 1 is the points-weighted percent of the graded work (90 and 84 -> 87)',
      jane[5] === '87', jane[5]);
    ok('  a visited-but-ungraded unit is BLANK, never 0', jane[6] === '', jane[6]);
    ok('  an untouched unit is blank', jane[7] === '' && jane[8] === '' && jane[9] === '', jane.slice(7));
    ok('  a single graded item reports its own percent', rowFor('Chen')[5] === '71', rowFor('Chen')[5]);
    ok('  a student with no work at all is blank across every unit',
      rowFor('D., Jane').slice(5).every((c) => c === ''), rowFor('D., Jane').slice(5));
  }

  // ── 4. Identity ────────────────────────────────────────────────────────────
  console.log('\n4. Identity rides on student_ref');
  {
    ok('  a two-token name becomes "Last, First"', !!rowFor('Doe, Jane'), dataRows.map((r) => r[0]));
    ok('  a one-token name is emitted verbatim', !!rowFor('Chen'), dataRows.map((r) => r[0]));
    ok('  a three-token name is NOT reordered into a wrong name', !!rowFor('Mary Jo Watson'),
      dataRows.map((r) => r[0]));
    ok('  the Student column is always quoted', lines.slice(2).filter((l) => l.length).every((l) => l[0] === '"'),
      lines.slice(2, 4));
    ok('  an email student_ref becomes the SIS Login ID',
      rowFor('Doe, Jane')[3] === 'jane.doe@sfcakings.org', rowFor('Doe, Jane')[3]);
    ok('  an email does NOT land in the student-number column',
      rowFor('Doe, Jane')[2] === '', rowFor('Doe, Jane')[2]);
    ok('  a plain student number becomes the SIS User ID, so no email is needed',
      rowFor('Chen')[2] === 'student-4417', rowFor('Chen')[2]);
    ok('  and does NOT land in the login column', rowFor('Chen')[3] === '', rowFor('Chen')[3]);
    ok('  the Canvas ID column is never synthesized',
      dataRows.every((r) => r[1] === ''), dataRows.map((r) => r[1]));
    ok('  a missing student_ref is blank, never invented',
      rowFor('D., Jane').slice(1, 4).every((c) => c === ''), rowFor('D., Jane').slice(1, 4));
    ok('  a ref with a space is rejected as unmatchable',
      rowFor('Chen, M.').slice(1, 4).every((c) => c === ''), rowFor('Chen, M.').slice(1, 4));
    ok('  a ref with a comma is rejected (it would also break the CSV)',
      rowFor('Mary Jo Watson').slice(1, 4).every((c) => c === ''), rowFor('Mary Jo Watson').slice(1, 4));
    ok('  Section is the class name', dataRows.every((r) => r[4] === 'Period 3'), dataRows.map((r) => r[4]));
  }

  // ── 5. Preflight ───────────────────────────────────────────────────────────
  console.log('\n5. Preflight warns before the import, not after');
  {
    const pf = await (await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit&preflight=1',
      { headers: auth })).json();
    ok('  counts the roster', pf.students === 5, pf.students);
    ok('  counts who Canvas can match', pf.matchable === 2, pf.matchable);
    ok('  names exactly who it cannot', pf.unmatchable.slice().sort().join('|') === 'Jane D.|M. Chen|Mary Jo Watson',
      pf.unmatchable);
    ok('  preflight agrees with the file (matchable + unmatchable = students)',
      pf.matchable + pf.unmatchable.length === pf.students, pf);
    const blanks = dataRows.filter((r) => r.slice(1, 4).every((c) => c === '')).length;
    ok('  and the file has exactly that many blank IDs', blanks === pf.unmatchable.length, { blanks, pf });
  }

  // ── 6. The flag is additive ────────────────────────────────────────────────
  console.log('\n6. The native export is untouched');
  {
    const nat = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export', { headers: auth });
    const explicit = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export?format=native', { headers: auth });
    ok('  no format param still returns the wide human CSV', /1\.1 Q/.test(nat.text) && /Student Ref/.test(nat.text));
    ok('  which still says "Done" for a completed unscored activity', /Done/.test(nat.text));
    ok('  format=native is identical to no format at all', nat.buf.equals(explicit.buf));
    ok('  the native export keeps its BOM', nat.buf[0] === 0xef && nat.buf[1] === 0xbb && nat.buf[2] === 0xbf);
  }

  // ── 7. Guardrails ──────────────────────────────────────────────────────────
  console.log('\n7. Guardrails');
  {
    const s = async (q) => (await fetch(base + '/api/teacher/classes/CYBER-CNV/export' + q, { headers: auth })).status;
    ok('  scope=activity is refused rather than silently exporting units',
      await s('?format=canvas&scope=activity') === 400);
    ok('  an unknown format is refused', await s('?format=blackboard') === 400);
    ok('  scope defaults to unit', await s('?format=canvas') === 200);
    ok('  no token cannot export',
      (await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas')).status === 401);
    const other = await (await fetch(base + '/api/teacher/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'other@school.org', password: 'otherpass1', name: 'Other Teacher' }),
    })).json();
    ok('  another teacher cannot export this class',
      (await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas',
        { headers: { Authorization: 'Bearer ' + other.token } })).status === 404);
  }

  // ── 8. System A grades (attempts + course_manifest) ────────────────────────
  //  A CSA class grades through POST /api/progress/attempt, so its cells arrive
  //  as true points ("8/10"), not percents. Canvas must see the percent.
  console.log('\n8. Attempts-backed grades convert to percents');
  {
    run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_mode)
         VALUES ('c2','CSA-CNV','AP CSA Block 1','ap-csa',?,1,80,'all')`, teacherId);
    run(`INSERT INTO students (id,class_id,display_name,student_ref,pin_hash)
         VALUES ('s6','c2','Ada Lovelace','ada@sfcakings.org','x')`);
    run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES
      ('ap-csa','unit-1','1.1','1.1-cfu-1','cfu',1),
      ('ap-csa','unit-1','1.1','1.1-cfu-2','cfu',1),
      ('ap-csa','unit-1','1.1','1.1-quiz','quiz',10)`);
    const att = (item, type, score, max, no) => run(
      `INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES ('s6','c2','ap-csa','1.1',?,?,?,?,?,?)`, item, type, score, max, score / max >= 0.8 ? 1 : 0, no);
    att('1.1-cfu-1', 'cfu', 1, 1, 1);      // 1 of the 2 authored CFUs: 1/2 points
    att('1.1-quiz', 'quiz', 8, 10, 1);     // 8/10 points

    const csa = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export?format=canvas&scope=unit',
      { headers: auth })).text;
    const csaRows = csa.replace(/^﻿/, '').split('\r\n').slice(2).filter((l) => l.length).map(splitCsv);
    const ada = csaRows[0];
    ok('  header prefix follows the course', csa.split('\r\n')[0].indexOf('AP CSA Unit 1') !== -1,
      csa.split('\r\n')[0]);
    // 1/2 CFU points + 8/10 quiz points = 9 of 12 authored points = 75.
    // The unattempted CFU counts against the denominator exactly as the
    // dashboard counts it, so teacher and Canvas cannot disagree.
    ok('  points-weighted across item types (9 of 12 authored points -> 75)', ada[5] === '75', ada[5]);
    ok('  no fraction leaks into the Canvas cell', CANVAS_CELL_RE.test(ada[5]), ada[5]);
    ok('  units with no manifest items stay blank', ada.slice(6).every((c) => c === ''), ada.slice(6));

    const natCsa = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export', { headers: auth })).text;
    ok('  the native export still shows the raw points for the same cell', /9\/12|1\/2|8\/10/.test(natCsa),
      natCsa.split('\r\n')[1]);
  }

  // ── 9. Setting the ref, which is what makes any of this reach Canvas ───────
  //  The export is inert until a teacher can actually set student_ref. Nothing
  //  wrote it before this route did, so the whole identity bridge was
  //  documented but unreachable: every student exported blank and Canvas
  //  matched nobody.
  console.log('\n9. Teachers can set the SIS ref');
  {
    const patch = (sid, body) => fetch(base + '/api/teacher/classes/CYBER-CNV/students/' + sid, {
      method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const refOf = (sid) => db.prepare('SELECT student_ref FROM students WHERE id = ?').get(sid).student_ref;

    // s3 had no ref, so Canvas dropped them. This is the fix, end to end.
    const before = await (await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit&preflight=1',
      { headers: auth })).json();
    const r1 = await patch('s3', { student_ref: 'jane.d@sfcakings.org' });
    ok('  a valid ref is accepted', r1.status === 200, r1.status);
    ok('  and is stored', refOf('s3') === 'jane.d@sfcakings.org', refOf('s3'));
    const after = await (await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit&preflight=1',
      { headers: auth })).json();
    ok('  which moves the student from unmatchable to matchable',
      after.matchable === before.matchable + 1 && after.unmatchable.indexOf('Jane D.') === -1,
      { before: before.matchable, after: after.matchable, unmatchable: after.unmatchable });
    const file = (await getCsv(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit',
      { headers: auth })).text;
    ok('  and the ID reaches the file', file.indexOf('jane.d@sfcakings.org') !== -1);

    // A ref that would export blank is refused at set time, not discovered in
    // Canvas after an import silently dropped the student.
    const r2 = await patch('s3', { student_ref: 'has space' });
    ok('  a ref the export would blank is refused', r2.status === 400, r2.status);
    const r3 = await patch('s3', { student_ref: 'a,b' });
    ok('  a ref carrying a comma is refused', r3.status === 400, r3.status);
    ok('  and neither refusal changed the stored ref', refOf('s3') === 'jane.d@sfcakings.org', refOf('s3'));

    // Two students sharing one SIS ID would import one on top of the other.
    const r4 = await patch('s2', { student_ref: 'JANE.D@sfcakings.org' });
    ok('  a duplicate ref is refused, case-insensitively', r4.status === 409, r4.status);

    const r5 = await patch('s3', { student_ref: '' });
    ok('  empty string clears the ref', r5.status === 200 && refOf('s3') === null, { s: r5.status, ref: refOf('s3') });
    const r6 = await patch('s3', {});
    ok('  an empty body is still a 400', r6.status === 400, r6.status);

    // The pre-existing fields still work alongside it.
    const r7 = await patch('s3', { display_name: 'Jane Doe II', student_ref: 'jane2' });
    ok('  name and ref update together', r7.status === 200 && refOf('s3') === 'jane2', refOf('s3'));
  }

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
