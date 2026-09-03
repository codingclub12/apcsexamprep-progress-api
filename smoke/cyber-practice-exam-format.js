'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: parse the board-171 sheet BACK and diff it against the source.
//
//  Generation is not evidence that generation worked. The CSP sheet lost 90
//  bytes a page while every semantic check passed, and a parse-back diff is what
//  caught it. So this reads the CSV the way Matrixify will, not the way the
//  generator wrote it, and asserts the round trip.
//
//  Run: npm run smoke:practiceexamformat
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const gen = require('../scripts/cyber-practice-exam-format-csv');

const ROOT = path.join(__dirname, '..');
const SHEET = path.join(ROOT, 'imports/2026-09-03/cyber-practice-exam-format-pages.csv');
const SRC = process.env.PE_ADMIN_JSON || path.join(ROOT, 'shopify/page-snapshots/ap-cybersecurity-practice-exam.before-format-relabel.json');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); } };

// A real CSV reader: QUOTE_ALL, doubled quotes, CRLF, embedded newlines.
function parseCsv(raw) {
  const rows = []; let row = [], field = '', i = 0, inQ = false;
  raw = raw.replace(/^﻿/, '');
  while (i < raw.length) {
    const c = raw[i];
    if (inQ) {
      if (c === '"' && raw[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && raw[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

console.log('\nSheet round trip');
const raw = fs.readFileSync(SHEET, 'utf8');
ok('the file carries a BOM', raw.charCodeAt(0) === 0xFEFF);
const rows = parseCsv(raw);
ok('parses to a header and exactly one data row', rows.length === 2, rows.length);
const head = rows[0], rec = {};
rows[0].forEach((h, i) => { rec[h] = rows[1][i]; });
ok('columns are the ones declared', head.join('|') ===
  'Handle|Command|Title|Body HTML|Metafield: global.title_tag [string]', head.join('|'));
ok('handle is the live page', rec.Handle === gen.HANDLE, rec.Handle);
ok('command is MERGE', rec.Command === 'MERGE', rec.Command);
ok('title is the new one', rec.Title === gen.NEW_TITLE, rec.Title);
ok('title_tag is the new one',
  rec['Metafield: global.title_tag [string]'] === gen.NEW_TITLE_TAG);

console.log('\nBody survived the CSV, byte for byte');
if (!SRC || !fs.existsSync(SRC)) {
  ok('the committed source snapshot exists', false, SRC || 'unset');
} else {
  const live = JSON.parse(fs.readFileSync(SRC, 'utf8')).data.pages.edges[0].node.body;
  const expected = gen.transform(live).out;
  const got = rec['Body HTML'];
  ok('the parsed body is byte-identical to the transform output',
    got === expected, { expected: expected.length, got: got.length });

  console.log('\nWhat the edit actually changed');
  ok('no full-length claim survives', !/full[ -]?length/i.test(got));
  ok('the H1 no longer calls it an exam', !/<h1>[^<]*Practice Exam/i.test(got));
  ok('the H1 does say Practice Set', got.includes('<h1>AP Cybersecurity Practice Set</h1>'));
  ok('the schema headline was corrected', !/"headline": "AP Cybersecurity Practice Exam/.test(got));
  ok('the breadcrumb was corrected', !/"name": "Practice Exam"/.test(got));
  ok('the real format is stated above the fold',
    got.includes('the real exam is 60 multiple choice questions and one free-response question'));

  console.log('\nThe item set was carried through, not rebuilt');
  const q = (s) => (s.match(/class="pq-card"/g) || []).length;
  const o = (s) => (s.match(/class="pq-opt"/g) || []).length;
  ok('43 question cards, unchanged', q(got) === 43 && q(got) === q(live), q(got));
  ok('160 options, unchanged', o(got) === 160 && o(got) === o(live), o(got));
  ok('every question stem is untouched', (() => {
    const stems = (s) => (s.match(/<p class="pq-stem">[\s\S]*?<\/p>/g) || []);
    const a = stems(live), b = stems(got);
    return a.length === b.length && a.every((x, i) => x === b[i]);
  })());
  ok('this edit adds no em-dash',
    (got.match(/—/g) || []).length === (live.match(/—/g) || []).length);
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
