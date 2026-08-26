#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Turn the `AP Cyber Slides Map` sheet into config/cyber-slide-embeds.js.
//
//    node scripts/cyber-slide-embeds-from-csv.js <path-to-export.csv> [--write]
//
//  Without --write it reports and changes nothing. That is the default on
//  purpose: this file is the only thing standing between a spreadsheet typo
//  and a student being handed a teacher deck.
//
//  The sheet is produced by the Apps Script conversion and has the columns:
//    lesson, day, variant, sourceName, slidesId, embedUrl, status
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
//    3. A MISSING ROW is survivable: that deck is simply not offered. Note
//       this is weaker than the CSP equivalent, where an unconverted deck
//       still had a .pptx to fall back on. A cyber deck with no Slides id is
//       not reachable at all. Still reported, still never fatal, because a
//       half-finished conversion showing 6 of 8 decks beats one showing none.
//
//  TWO GUARDS THE CSP GENERATOR DOES NOT NEED:
//
//    A track column. Cyber has no CB / Deep Dive dimension, so a sheet that
//    carries one is almost certainly the CSP sheet passed by mistake. Writing
//    it would silently collapse two CSP tracks onto one cyber key and pick a
//    winner at random. Refused outright rather than ignored.
//
//    Lesson notation. Drive names folders Lesson_1.1_..., the manifest and the
//    route both speak 1-1. A sheet built by reading folder names will carry
//    dots. Normalising is safe and unambiguous (no cyber lesson id contains a
//    dot for any other reason), so it is normalised rather than rejected.
//
//  A ROW FOR A UNIT 3, 4 OR 5 LESSON IS REFUSED. Those units are deliberately
//  absent from the manifest: each of their lessons currently holds one
//  whole-lesson deck rather than a per-day set (see the manifest header). A
//  row naming one means the conversion ran wider than the manifest, and the
//  right fix is to widen the manifest deliberately, not to let a 22-slide
//  whole-lesson deck appear on the site labelled "Day 1".
//
//  When Unit 3 is widened, its keys are CED TOPIC NUMBERS, not the site's old
//  six-lesson ordering. The two disagreed until 2026-08-26 and a key could not
//  tell them apart: '3-3' was Segmentation to the bundle and Firewalls to the
//  site, both two-day lessons, so no count would catch the swap. The manifest
//  header carries the decision and the verified day map.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../lib/traffic-csv');
const manifest = require('../config/cyber-slide-manifest');

const OUT = path.join(__dirname, '..', 'config', 'cyber-slide-embeds.js');

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
    console.error('usage: node scripts/cyber-slide-embeds-from-csv.js <export.csv> [--write]');
    process.exit(2);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (rows.length < 2) { fail('csv has no data rows'); return; }

  const header = rows[0].map((h) => String(h).trim().toLowerCase());

  // Guard A: a track column means this is very likely the CSP sheet.
  if (header.includes('track')) {
    fail('this sheet has a "track" column. AP Cybersecurity has no CB / Deep Dive '
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
  if (outOfScope.length) fail(`${outOfScope.length} row(s) name a lesson outside Units 1 and 2. Widen config/cyber-slide-manifest.js deliberately before converting those, and key Unit 3 by CED topic number (see that file's header).`);
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
    console.log('\nChecks passed. Re-run with --write to update config/cyber-slide-embeds.js');
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
