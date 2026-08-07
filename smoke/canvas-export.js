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
//      and NO BOM. Canvas matches the first header cell against the literal
//      "Student", so a BOM makes it read "\ufeffStudent" and Canvas rejects the
//      file with "The CSV header row is invalid." The native export keeps its
//      BOM, because Excel needs it.
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

// Column positions are looked up BY HEADER, never hardcoded. The identity block
// grew a summary section (Letter Grade, %, Total Earned, Total Graded, Total
// Possible) between Section and the graded columns, and every fixed index in
// this suite silently pointed one section to the left the moment it landed:
// twelve assertions read a letter grade where they expected a unit score.
// A header lookup cannot drift when a column is inserted.
const SUMMARY = ['Letter Grade', '%', 'Total Earned', 'Total Graded', 'Total Possible'];
const IDENT = 5;                 // Student + 3 Canvas id columns + Section
const FIRST_COL = IDENT + SUMMARY.length;   // where the graded columns start
const colOf = (header, name) => header.indexOf(name);

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
// bytes is the only way to tell whether a BOM is really on the wire, which is
// the difference between a file Canvas imports and one it rejects outright.
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

  // Deactivated, with a perfectly good ref. Must not reach Canvas at all: a
  // withdrawn student is a row the teacher would have to match by hand.
  run(`INSERT INTO students (id,class_id,display_name,student_ref,pin_hash,active)
       VALUES ('s9','c1','Gone Student','gone@sfcakings.org','x',0)`);

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
  // THE header bug: a BOM here is what made Canvas answer "The CSV header row
  // is invalid" on the first real import attempt.
  ok('  NO BOM on the wire, so the first header cell is literally "Student"',
    !(res.buf[0] === 0xef && res.buf[1] === 0xbb && res.buf[2] === 0xbf),
    [...res.buf.slice(0, 3)]);
  ok('  the file begins with the exact bytes of "Student,"',
    res.buf.slice(0, 8).toString('utf8') === 'Student,', res.buf.slice(0, 8).toString('utf8'));

  const lines = raw.split('\r\n');
  const header = splitCsv(lines[0]);
  // All three Canvas identity columns ship, blank where unknown, so a district
  // can match on a student number and never store an email here.
  ok('  header is Student, the three Canvas ID columns, Section, then one column per unit',
    header.slice(0, 5).join('|') === 'Student|ID|SIS User ID|SIS Login ID|Section' && header.length === 15, header);
  ok('  then the summary block, in CodeHS order',
    header.slice(IDENT, FIRST_COL).join('|') === SUMMARY.join('|'), header.slice(IDENT, FIRST_COL));
  ok('  assignment headers carry the course prefix so they cannot collide in Canvas',
    header[FIRST_COL] === 'Cyber Unit 1' && header[FIRST_COL + 4] === 'Cyber Unit 5', header.slice(FIRST_COL));

  const points = splitCsv(lines[1]);
  ok('  row 2 is Points Possible (Canvas requires it second)', points[0] === 'Points Possible', points[0]);
  ok('  Points Possible leaves the ID columns and Section blank',
    points.slice(1, 5).every((c) => c === ''), points.slice(0, 5));
  ok('  the summary columns are read only, not scoreable assignments',
    points.slice(IDENT, FIRST_COL).every((p) => p === '(read only)'), points.slice(IDENT, FIRST_COL));
  ok('  every assignment is out of 100',
    points.slice(FIRST_COL).every((p) => p === '100'), points.slice(FIRST_COL));

  const dataRows = lines.slice(2).filter((l) => l.length).map(splitCsv);
  ok('  one row per ACTIVE student, no instruction row', dataRows.length === 5, dataRows.length);
  ok('  a deactivated student is not exported to Canvas at all',
    raw.indexOf('Gone Student') === -1 && raw.indexOf('gone@sfcakings.org') === -1);

  // ── 2. Every data cell is a number or a blank ──────────────────────────────
  console.log('\n2. No cell Canvas would reject');
  {
    const bad = [];
    for (const r of dataRows) for (const cell of r.slice(FIRST_COL)) if (!CANVAS_CELL_RE.test(cell)) bad.push(cell);
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
      jane[FIRST_COL] === '87', jane[FIRST_COL]);
    ok('  a visited-but-ungraded unit is BLANK, never 0', jane[FIRST_COL + 1] === '', jane[FIRST_COL + 1]);
    ok('  an untouched unit is blank',
      jane.slice(FIRST_COL + 2, FIRST_COL + 5).every((c) => c === ''), jane.slice(FIRST_COL + 2));
    ok('  a single graded item reports its own percent', rowFor('Chen')[FIRST_COL] === '71', rowFor('Chen')[FIRST_COL]);
    ok('  a student with no work at all is blank across every unit',
      rowFor('D., Jane').slice(FIRST_COL).every((c) => c === ''), rowFor('D., Jane').slice(FIRST_COL));
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
    ok('  counts the ACTIVE roster only', pf.students === 5, pf.students);
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
    ok('  scope=activity is served, not refused', await s('?format=canvas&scope=activity') === 200);
    ok('  an unknown scope is refused rather than silently exporting units',
      await s('?format=canvas&scope=lesson') === 400);
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
    ok('  points-weighted across item types (9 of 12 authored points -> 75)', ada[FIRST_COL] === '75', ada[FIRST_COL]);
    ok('  no fraction leaks into the Canvas cell', CANVAS_CELL_RE.test(ada[FIRST_COL]), ada[FIRST_COL]);
    ok('  units with no manifest items stay blank', ada.slice(FIRST_COL + 1).every((c) => c === ''), ada.slice(FIRST_COL + 1));

    const natCsa = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export', { headers: auth })).text;
    ok('  the native export still shows the raw points for the same cell', /9\/12|1\/2|8\/10/.test(natCsa),
      natCsa.split('\r\n')[1]);
  }

  // ── 8b. The summary block ──────────────────────────────────────────────────
  //  THE DISTINCTION IT EXISTS FOR
  //  Ada has one unit graded at 75 and the rest untouched. AP CSA is the 4-unit
  //  2025-2026 structure, so the course is 400 points. Over that she is 75 of
  //  400, which reads as 19 percent and is a lie about her work: she has not
  //  reached those units. Over GRADED work she is 75 of 100, which is 75 and is
  //  true. The percent must be the second number, and Total Possible must still
  //  report the 400 so nothing is hidden.
  console.log('\n8b. The summary block (Letter Grade, %, Earned / Graded / Possible)');
  {
    const csaB = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export?format=canvas&scope=unit',
      { headers: auth })).text;
    const lb = csaB.replace(/^\ufeff/, '').split('\r\n').filter((l) => l.length);
    const hb = splitCsv(lb[0]);
    const adaB = splitCsv(lb[2]);
    const at = (n) => adaB[colOf(hb, n)];

    ok('  % is earned over GRADED, not over possible', at('%') === '75%', at('%'));
    ok('  Total Earned counts only graded work', at('Total Earned') === '75', at('Total Earned'));
    ok('  Total Graded is the graded denominator', at('Total Graded') === '100', at('Total Graded'));
    ok('  Total Possible still reports the whole course (CSA is 4 units)',
      at('Total Possible') === '400', at('Total Possible'));
    ok('  the letter follows the summary percent, not a column', at('Letter Grade') === 'C', at('Letter Grade'));
    ok('  earned over possible would have read 19 percent, which is why it is not used',
      Math.round((75 / 400) * 100) === 19);

    // A student with nothing graded is blank across the block, never an F.
    run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_zoe_sum','c2','Zoe Null','x')`);
    const csaC = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export?format=canvas&scope=unit',
      { headers: auth })).text;
    const lc = csaC.replace(/^\ufeff/, '').split('\r\n').filter((l) => l.length);
    const hc = splitCsv(lc[0]);
    const zoe = lc.map(splitCsv).find((r) => r[0].indexOf('Zoe') !== -1);
    ok('  nothing graded gets a BLANK letter, not an F', zoe[colOf(hc, 'Letter Grade')] === '');
    ok('  and a blank percent', zoe[colOf(hc, '%')] === '');
    ok('  but Total Possible still shows the course size', zoe[colOf(hc, 'Total Possible')] === '400');
    ok('  and Total Graded is 0, which makes the blank percent legible',
      zoe[colOf(hc, 'Total Graded')] === '0');

    // The activity export carries the same block, so the two scopes agree.
    const actB = (await getCsv(base + '/api/teacher/classes/CSA-CNV/export?format=canvas&scope=activity',
      { headers: auth })).text;
    const ha = splitCsv(actB.replace(/^\ufeff/, '').split('\r\n')[0]);
    ok('  scope=activity carries the summary block too',
      SUMMARY.every((n) => colOf(ha, n) !== -1), ha.slice(0, FIRST_COL));
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

  // ── 10. scope=activity: one Canvas assignment per graded activity ─────────
  console.log('\n10. Activity scope');
  {
    const act = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=activity',
      { headers: auth });
    ok('  returns 200', act.status === 200, act.status);
    const aLines = act.text.split('\r\n');
    const aHeader = splitCsv(aLines[0]);
    const aPoints = splitCsv(aLines[1]);
    const aRows = aLines.slice(2).filter((l) => l.length).map(splitCsv);

    ok('  keeps the same identity columns as unit scope',
      aHeader.slice(0, IDENT).join('|') === 'Student|ID|SIS User ID|SIS Login ID|Section', aHeader.slice(0, IDENT));
    ok('  has far more columns than the five unit ones', aHeader.length > 20, aHeader.length);

    // A Canvas assignment name is global to the course, so a bare "Case File"
    // would collide across all five units and silently overwrite grades.
    const names = aHeader.slice(FIRST_COL);
    ok('  every assignment name is unique', new Set(names).size === names.length,
      names.filter((n, i) => names.indexOf(n) !== i));
    ok('  every assignment name carries the course prefix',
      names.every((n) => n.indexOf('Cyber') === 0), names.filter((n) => n.indexOf('Cyber') !== 0).slice(0, 3));
    ok('  a case file names its unit, so the five do not collide',
      names.filter((n) => /Case File/.test(n)).length >= 2
      && new Set(names.filter((n) => /Case File/.test(n))).size
         === names.filter((n) => /Case File/.test(n)).length,
      names.filter((n) => /Case File/.test(n)));
    ok('  no name contains a Canvas reserved phrase',
      !names.some((n) => /current (score|points|grade)|final (score|points|grade)|override/i.test(n)));
    ok('  activity columns read as words, not the export abbreviations',
      names.some((n) => /1\.1 Quiz$/.test(n)) && !names.some((n) => / Q$/.test(n)),
      names.slice(0, 4));

    ok('  Points Possible is 100 for every activity',
      aPoints.slice(FIRST_COL).every((p) => p === '100'), aPoints.slice(FIRST_COL, FIRST_COL + 3));

    // The rules that matter most survive the different column set.
    const bad = [];
    for (const r of aRows) for (const c of r.slice(FIRST_COL)) if (!CANVAS_CELL_RE.test(c)) bad.push(c);
    ok('  every cell is still a number or a blank', bad.length === 0, bad.slice(0, 5));
    ok('  no "Done" leaks into activity scope', !/\bDone\b/.test(act.text));
    const janeA = aRows.find((r) => r[0] === 'Doe, Jane');
    ok('  a graded quiz reports its own percent, not a unit average',
      janeA.slice(FIRST_COL).indexOf('90') !== -1 && janeA.slice(FIRST_COL).indexOf('84') !== -1,
      janeA.slice(FIRST_COL).filter(Boolean));
    ok('  the visited-but-ungraded lesson is still BLANK, never 0',
      janeA.slice(FIRST_COL).filter((c) => c === '0').length === 0,
      janeA.slice(FIRST_COL).filter(Boolean));
    ok('  deactivated students stay out of activity scope too',
      act.text.indexOf('Gone Student') === -1);

    const pfA = await (await fetch(base
      + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=activity&preflight=1',
      { headers: auth })).json();
    ok('  preflight works for activity scope as well', pfA.students === 5, pfA);

    const bogus = await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=nonsense',
      { headers: auth });
    ok('  an unknown scope is still refused', bogus.status === 400, bogus.status);
  }

  // ── 11. The export matches what the dashboard is showing ──────────────────
  //  The dashboard has four include toggles and a unit selection. An export
  //  that ignores them hands a teacher a different gradebook from the one on
  //  their screen. Both filters are opt-in, so an absent param still means the
  //  whole course and no existing caller changes.
  console.log('\n11. include= and units= follow the dashboard');
  {
    const head = async (q) => {
      const r = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export' + q, { headers: auth });
      return { status: r.status, cols: splitCsv(r.text.split('\r\n')[0]) };
    };

    const all = await head('?format=canvas&scope=activity');
    const quizOnly = await head('?format=canvas&scope=activity&include=quiz');
    ok('  include=quiz drops every non-quiz column',
      quizOnly.cols.slice(FIRST_COL).every((c) => / Quiz$/.test(c) || /Case File$/.test(c)),
      quizOnly.cols.slice(FIRST_COL).filter((c) => !/ Quiz$|Case File$/.test(c)).slice(0, 4));
    ok('  and is genuinely smaller than the unfiltered export',
      quizOnly.cols.length < all.cols.length, { filtered: quizOnly.cols.length, all: all.cols.length });

    // A case file has no toggle and always counts, exactly as the dashboard's
    // own counts() does by falling through to true.
    ok('  a case file survives even when nothing is included',
      (await head('?format=canvas&scope=activity&include=')).cols.slice(FIRST_COL).every((c) => /Case File$/.test(c)));

    const u1 = await head('?format=canvas&scope=activity&units=unit-1');
    ok('  units=unit-1 exports that unit only',
      u1.cols.slice(FIRST_COL).every((c) => /^Cyber (1\.|Unit 1 )/.test(c)),
      u1.cols.slice(FIRST_COL).filter((c) => !/^Cyber (1\.|Unit 1 )/.test(c)).slice(0, 4));

    const u13 = await head('?format=canvas&scope=unit&units=unit-1,unit-3');
    ok('  unit scope honours the same selection',
      u13.cols.slice(FIRST_COL).join('|') === 'Cyber Unit 1|Cyber Unit 3', u13.cols.slice(FIRST_COL));

    // Filtering changes the denominator, so the unit grade has to move with it.
    const bothTypes = await getCsv(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit',
      { headers: auth });
    const janeAll = bothTypes.text.split('\r\n').slice(2).map(splitCsv).find((r) => r[0] === 'Doe, Jane');
    const lessonOnly = await getCsv(
      base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&scope=unit&include=lesson', { headers: auth });
    const janeLesson = lessonOnly.text.split('\r\n').slice(2).map(splitCsv).find((r) => r[0] === 'Doe, Jane');
    ok('  excluding quizzes changes the unit grade rather than silently keeping it',
      janeAll[FIRST_COL] === '87' && janeLesson[FIRST_COL] !== '87', { all: janeAll[FIRST_COL], lessonOnly: janeLesson[FIRST_COL] });
    ok('  a unit with nothing included is blank, never 0', janeLesson[FIRST_COL] === '', janeLesson[FIRST_COL]);

    // A typo would silently export a smaller gradebook, which is worse than an
    // error because the teacher would not know what was missing.
    const bad = await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&include=quizzes',
      { headers: auth });
    ok('  an unknown include value is refused', bad.status === 400, bad.status);
    const badUnit = await fetch(base + '/api/teacher/classes/CYBER-CNV/export?format=canvas&units=unit-9',
      { headers: auth });
    ok('  an unknown unit is refused', badUnit.status === 400, badUnit.status);

    const untouched = await head('?format=canvas&scope=activity');
    ok('  omitting both params still exports the whole course',
      untouched.cols.length === all.cols.length, untouched.cols.length);
  }

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
