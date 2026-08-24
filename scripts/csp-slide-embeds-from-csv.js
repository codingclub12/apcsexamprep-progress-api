#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Turn the `AP CSP Slides Map` sheet into config/csp-slide-embeds.js.
//
//    node scripts/csp-slide-embeds-from-csv.js <path-to-export.csv> [--write]
//
//  Without --write it reports and changes nothing. That is the default on
//  purpose: this file is the only thing standing between a spreadsheet typo
//  and a student being handed a teacher deck, so the check runs before the
//  write, every time.
//
//  The sheet is produced by the Apps Script conversion and has the columns:
//    lesson, day, variant, track, sourceName, slidesId, embedUrl, status
//
//  WHAT IS ACTUALLY BEING GUARDED HERE. The Google Slides copies are shared
//  "anyone with the link", so the file ID is the access. Three failure modes
//  matter more than a missing row:
//
//    1. A DUPLICATE ID means two deck slots point at one file. If those slots
//       straddle the teacher/student line, an entitled student receives the
//       teacher deck through a URL the route believes is a student deck. The
//       variant filter in routes/slides.js would be intact and bypassed at the
//       same time. Hard failure.
//    2. AN ID ON THE WRONG KEY does the same thing more quietly.
//    3. A MISSING ROW is the benign one: that deck simply stays download-only,
//       which is exactly today's behaviour. Reported, never fatal.
//
//  So: duplicates and unknown keys refuse to write. Gaps only warn.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../lib/traffic-csv');
const manifest = require('../config/csp-slide-manifest');

const OUT = path.join(__dirname, '..', 'config', 'csp-slide-embeds.js');

// The sheet writes the filename casing; the route speaks lowercase keys.
const VARIANT_KEY = { teacher: 'teacher', student: 'student' };
const TRACK_KEY = { cb: 'cb', deepdive: 'deepDive' };

// A Drive file ID. Length varies by vintage, so this checks the alphabet and a
// sane floor rather than pretending to know the exact length.
const ID_RE = /^[A-Za-z0-9_-]{25,80}$/;

function fail(msg) {
  console.error('REFUSING TO WRITE: ' + msg);
  process.exitCode = 1;
}

// Every (lesson, day, variant, track) the manifest says should exist.
function expectedKeys() {
  const keys = new Set();
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of manifest.VARIANT_KEYS) {
        for (const track of manifest.TRACK_KEYS) {
          keys.add(`${lessonId}|${day}|${variant}|${track}`);
        }
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
    console.error('usage: node scripts/csp-slide-embeds-from-csv.js <export.csv> [--write]');
    process.exit(2);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (rows.length < 2) { fail('csv has no data rows'); return; }

  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`csv is missing the "${name}" column; saw: ${header.join(', ')}`);
    return i;
  };
  const iLesson = col('lesson');
  const iDay = col('day');
  const iVariant = col('variant');
  const iTrack = col('track');
  const iId = col('slidesid');
  const iStatus = col('status');

  const expected = expectedKeys();
  const ids = {};
  const byId = new Map();       // slidesId -> the key that claimed it first
  const failedRows = [];
  const badKeys = [];
  const badIds = [];
  const dupeKeys = [];
  const dupeIds = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const status = String(row[iStatus] || '').trim();
    const lesson = String(row[iLesson] || '').trim();
    const day = String(row[iDay] || '').trim();
    const variant = VARIANT_KEY[String(row[iVariant] || '').trim().toLowerCase()];
    const track = TRACK_KEY[String(row[iTrack] || '').trim().toLowerCase()];
    const id = String(row[iId] || '').trim();
    const label = `row ${r + 1} (${lesson} day${day} ${row[iVariant]} ${row[iTrack]})`;

    if (status !== 'OK') { failedRows.push(`${label}: ${status || '(blank status)'}`); continue; }
    if (!variant || !track) { badKeys.push(`${label}: unrecognised variant/track`); continue; }

    const key = `${lesson}|${day}|${variant}|${track}`;
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
  if (badKeys.length) fail(`${badKeys.length} row(s) name a deck the manifest does not have.`);
  if (badIds.length) fail(`${badIds.length} row(s) carry an unusable file id.`);
  if (!got) fail('no usable rows at all.');
  if (process.exitCode) return;

  if (missing.length) {
    console.log(`\nNOTE: ${missing.length} deck(s) have no Slides id and will stay download-only:`);
    for (const k of missing.slice(0, 10)) console.log('  ' + k);
    if (missing.length > 10) console.log(`  ...and ${missing.length - 10} more`);
  }

  if (!write) {
    console.log('\nChecks passed. Re-run with --write to update config/csp-slide-embeds.js');
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
// ("3-2" before "3-10"), which makes a diff reviewable by eye.
function cmpKey(a, b) {
  const pa = a.split('|'); const pb = b.split('|');
  const [bia, la] = pa[0].split('-').map(Number);
  const [bib, lb] = pb[0].split('-').map(Number);
  return (bia - bib) || (la - lb) || (Number(pa[1]) - Number(pb[1]))
    || pa[2].localeCompare(pb[2]) || pa[3].localeCompare(pb[3]);
}

main();
