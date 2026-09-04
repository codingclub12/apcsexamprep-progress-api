#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Turn the `AP CSA Slides Map` sheet into config/csa-slide-embeds.js.
//
//    node scripts/csa-slide-embeds-from-csv.js <path-to-export.csv> [--write]
//
//  Without --write it reports and changes nothing. That is the default on
//  purpose: this file is the only thing standing between a spreadsheet typo
//  and a student being handed a teacher deck.
//
//  The sheet is produced by the Apps Script conversion
//  (scripts/csa-slides-conversion.gs) and has the columns:
//    lesson, day, variant, sourceName, slidesId, embedUrl, status
//
//  ADAPTED FROM scripts/cyber-slide-embeds-from-csv.js RATHER THAN REWRITTEN,
//  because the guards below were paid for once already and the failure they
//  prevent is identical on this course.
//
//  WHAT IS ACTUALLY BEING GUARDED. The Google Slides copies are shared "anyone
//  with the link", so the file id IS the access. Ranked by consequence:
//
//    1. A DUPLICATE ID means two deck slots point at one file. If those slots
//       straddle the teacher/student line, an entitled student receives the
//       teacher deck through a URL the route believes is a student deck. The
//       variant filter in routes/slides.js would be intact and bypassed at the
//       same time. Hard failure.
//    2. AN ID ON THE WRONG KEY does the same thing more quietly.
//    3. A MISSING ROW is survivable: that deck is simply not offered. As with
//       cyber and unlike CSP, a CSA deck with no Slides id is not reachable at
//       all, because there is no .pptx fallback. Still reported, still never
//       fatal, because a half-finished conversion showing 40 of 76 decks beats
//       one showing none.
//
//  WHY A CSA TEACHER DECK LEAKING IS WORSE THAN A CSP ONE. Every CSA teacher
//  deck carries per-slide speaker notes with the answers to that day's warm-up
//  and its "now break it" slide, and the kit builder derives the graded
//  debugging exercise in seed/csa-debug-unit<N>.js from the same bug. Handing a
//  student the teacher deck hands them that evening's homework answers.
//
//  TWO GUARDS INHERITED FROM THE CYBER GENERATOR, BOTH STILL LOAD-BEARING:
//
//    A track column. CSA has no CB / Deep Dive dimension, so a sheet that
//    carries one is almost certainly the CSP sheet passed by mistake. Writing
//    it would silently collapse two CSP tracks onto one CSA key and pick a
//    winner at random. Refused outright rather than ignored.
//
//    Lesson notation. Drive names folders Lesson_2.3_..., the manifest and the
//    route both speak 2-3. A sheet built by reading folder names will carry
//    dots. Normalising is safe and unambiguous (no CSA lesson id contains a
//    dot for any other reason), so it is normalised rather than rejected.
//
//  A ROW NAMING A LESSON THE MANIFEST DOES NOT HAVE IS REFUSED. Since
//  2026-09-04 config/csa-slide-manifest.js carries all 53 lessons, so in
//  practice this now catches a malformed lesson id (2-13, 5-1) rather than an
//  un-widened manifest. It stays fatal: a row the manifest cannot place is a
//  row whose deck would be silently dropped, and a conversion that ran wider
//  than the course is worth stopping to look at.
//
//  UNIT 1 IS IN THE MANIFEST BUT ITS DAY COUNTS ARE PLACEHOLDERS. Every Unit 1
//  lesson currently reports one teaching day when Drive holds 35 days across
//  15 lessons, so converting Unit 1 through this script BEFORE fixing those
//  counts would drop every Day 2 and Day 3 deck on the floor as "a deck the
//  manifest does not have". Fix the counts first. See the manifest header.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../lib/traffic-csv');
const manifest = require('../config/csa-slide-manifest');

const OUT = path.join(__dirname, '..', 'config', 'csa-slide-embeds.js');

// The sheet writes the filename casing (STUDENT/TEACHER); the route speaks
// lowercase keys.
const VARIANT_KEY = { teacher: 'teacher', student: 'student' };

// A Drive file id. Length varies by vintage, so this checks the alphabet and a
// sane floor rather than pretending to know the exact length.
const ID_RE = /^[A-Za-z0-9_-]{25,80}$/;

function fail(msg) {
  console.error('REFUSING TO WRITE: ' + msg);
  process.exitCode = 1;
}

// Drive says "1.1", the manifest says "1-1".
function normaliseLesson(raw) {
  return String(raw || '').trim().replace(/\./g, '-');
}

// Every (lesson, day, variant) the manifest says should exist.
function expectedKeys() {
  const keys = new Set();
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of manifest.VARIANT_KEYS) {
        keys.add(`${lessonId}|${day}|${variant}`);
      }
    }
  }
  return keys;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const csvPath = args.find((a) => !a.startsWith('--'));

  if (!csvPath) {
    console.error('usage: node scripts/csa-slide-embeds-from-csv.js <export.csv> [--write]');
    process.exit(2);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (rows.length < 2) { fail('csv has no data rows'); return; }

  const header = rows[0].map((h) => String(h).trim().toLowerCase());

  // Guard A: a track column means this is very likely the CSP sheet.
  if (header.includes('track')) {
    fail('this sheet has a "track" column. AP CSA has no CB / Deep Dive '
       + 'dimension, so this looks like the AP CSP sheet. Use '
       + 'scripts/csp-slide-embeds-from-csv.js for that one.');
    return;
  }

  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`csv is missing the "${name}" column; saw: ${header.join(', ')}`);
    return i;
  };
  const iLesson = col('lesson');
  const iDay = col('day');
  const iVariant = col('variant');
  const iId = col('slidesid');
  const iStatus = col('status');

  const expected = expectedKeys();
  const ids = {};
  const byId = new Map();       // slidesId -> the key that claimed it first
  const failedRows = [];
  const badKeys = [];
  const outOfScope = [];
  const badIds = [];
  const dupeKeys = [];
  const dupeIds = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const status = String(row[iStatus] || '').trim();
    const lesson = normaliseLesson(row[iLesson]);
    const day = String(row[iDay] || '').trim();
    const variant = VARIANT_KEY[String(row[iVariant] || '').trim().toLowerCase()];
    const id = String(row[iId] || '').trim();
    const label = `row ${r + 1} (${lesson} day${day} ${row[iVariant]})`;

    if (status !== 'OK') { failedRows.push(`${label}: ${status || '(blank status)'}`); continue; }
    if (!variant) { badKeys.push(`${label}: unrecognised variant "${row[iVariant]}"`); continue; }

    const key = `${lesson}|${day}|${variant}`;

    // Separate the "wrong unit" case from a general bad key: it has a specific
    // cause and a specific fix, and lumping them together buries it.
    if (!manifest.isKnownLesson(lesson)) {
      outOfScope.push(`${label}: lesson ${lesson} is not in the manifest`);
      continue;
    }
    if (!expected.has(key)) { badKeys.push(`${label}: ${key} is not a deck the manifest expects`); continue; }
    if (!ID_RE.test(id)) { badIds.push(`${label}: slidesId "${id.slice(0, 20)}" is not a Drive file id`); continue; }
    if (ids[key]) { dupeKeys.push(`${label}: ${key} already claimed`); continue; }
    if (byId.has(id)) { dupeIds.push(`${label}: shares a file id with ${byId.get(id)}`); continue; }

    ids[key] = id;
    byId.set(id, key);
  }

  const got = Object.keys(ids).length;
  const missing = [...expected].filter((k) => !ids[k]);

  console.log(`rows read        : ${rows.length - 1}`);
  console.log(`decks expected   : ${expected.size}`);
  console.log(`ids accepted     : ${got}`);
  console.log(`not yet converted: ${missing.length}`);

  for (const [title, list] of [
    ['rows the script marked FAILED', failedRows],
    ['rows for a lesson outside the wired units', outOfScope],
    ['rows naming a deck the manifest does not have', badKeys],
    ['rows with an unusable file id', badIds],
    ['rows claiming a deck slot twice', dupeKeys],
    ['rows sharing one file id across two deck slots', dupeIds],
  ]) {
    if (!list.length) continue;
    console.log(`\n${title}: ${list.length}`);
    for (const line of list.slice(0, 15)) console.log('  ' + line);
    if (list.length > 15) console.log(`  ...and ${list.length - 15} more`);
  }

  // Gaps are survivable; a crossed wire is not.
  if (dupeIds.length) fail(`${dupeIds.length} file id(s) are claimed by more than one deck slot. A shared id can hand a student a teacher deck.`);
  if (dupeKeys.length) fail(`${dupeKeys.length} deck slot(s) appear twice in the sheet.`);
  if (outOfScope.length) fail(`${outOfScope.length} row(s) name a lesson config/csa-slide-manifest.js does not have. AP CSA has 53 lessons: 1.1-1.15, 2.1-2.12, 3.1-3.9, 4.1-4.17. A row outside that set is a malformed lesson id or a conversion that ran wider than the course.`);
  if (badKeys.length) fail(`${badKeys.length} row(s) name a deck the manifest does not have.`);
  if (badIds.length) fail(`${badIds.length} row(s) carry an unusable file id.`);
  if (!got) fail('no usable rows at all.');
  if (process.exitCode) return;

  if (missing.length) {
    console.log(`\nNOTE: ${missing.length} deck(s) have no Slides id. Unlike AP CSP there is no`);
    console.log('.pptx fallback, so these will not be offered at all until converted:');
    for (const k of missing.slice(0, 10)) console.log('  ' + k);
    if (missing.length > 10) console.log(`  ...and ${missing.length - 10} more`);
  }

  if (!write) {
    console.log('\nChecks passed. Re-run with --write to update config/csa-slide-embeds.js');
    return;
  }

  const src = fs.readFileSync(OUT, 'utf8');
  const body = Object.keys(ids).sort(cmpKey)
    .map((k) => `  '${k}': '${ids[k]}',`).join('\n');
  const stamp = new Date().toISOString().slice(0, 10);

  const next = src
    .replace(/const SLIDE_IDS = \{[\s\S]*?\n\};/, `const SLIDE_IDS = {\n${body}\n};`)
    .replace(/const GENERATED_AT = .*;/, `const GENERATED_AT = '${stamp}';`);

  if (next === src) { fail('could not find the SLIDE_IDS block to replace; config file shape changed.'); return; }
  fs.writeFileSync(OUT, next);
  console.log(`\nWrote ${got} ids to ${path.relative(process.cwd(), OUT)} (generated ${stamp}).`);
}

// Sort so the generated file reads in lesson order rather than string order
// ("2-2" before "2-10"), which makes a diff reviewable by eye.
function cmpKey(a, b) {
  const pa = a.split('|'); const pb = b.split('|');
  const [ua, la] = pa[0].split('-').map(Number);
  const [ub, lb] = pb[0].split('-').map(Number);
  return (ua - ub) || (la - lb) || (Number(pa[1]) - Number(pb[1]))
    || pa[2].localeCompare(pb[2]);
}

main();
