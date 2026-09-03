'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: parse the board-195 sheet BACK and diff it against the source.
//  Generation is not evidence that generation worked.
//  Run: npm run smoke:examformatced
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const gen = require('../scripts/cyber-exam-format-ced-csv');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 180) : '')); } };

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

const raw = fs.readFileSync(path.join(ROOT, gen.OUT), 'utf8');
const live = JSON.parse(fs.readFileSync(path.join(ROOT, gen.SNAP), 'utf8')).data.pages.edges[0].node.body;

console.log('\nSheet round trip');
ok('the file carries a BOM', raw.charCodeAt(0) === 0xFEFF);
const rows = parseCsv(raw);
ok('parses to a header and exactly one data row', rows.length === 2, rows.length);
const rec = {}; rows[0].forEach((h, i) => { rec[h] = rows[1][i]; });
ok('columns are Handle, Command, Body HTML',
  rows[0].join('|') === 'Handle|Command|Body HTML', rows[0].join('|'));
ok('command is MERGE', rec.Command === 'MERGE');
const got = rec['Body HTML'];
ok('the parsed body is byte-identical to the transform output', got === gen.transform(live).out,
  { expected: gen.transform(live).out.length, got: got.length });

console.log('\nThe page now states the format it is named after');
ok('no "not yet released" claim survives', !/has not yet released/i.test(got));
ok('60 multiple choice questions', got.includes('60 multiple choice questions'));
ok('one free-response question', /one free-response question/.test(got));
ok('80 minutes', got.includes('80 minutes'));
ok('50 minutes', got.includes('50 minutes'));
ok('Device Security Analysis', got.includes('Device Security Analysis'));
ok('the 25 to 40% per-category band', got.includes('25 to 40% each'));
ok('skill categories 2 and 3 named for the FRQ', /skill categories 2 and 3/.test(got));

console.log('\nThe numbers nobody may print');
ok('no per-unit exam weighting anywhere', !/Unit\s*[1-5][^<]{0,40}?\d{1,2}\s*%/i.test(got));
ok('the live page had none either, so this did not remove a problem it caused',
  !/Unit\s*[1-5][^<]{0,40}?\d{1,2}\s*%/i.test(live));

console.log('\nThis was a text correction, not a redesign');
const c = (s, re) => (s.match(re) || []).length;
ok('FAQ item count unchanged', c(got, /ef-faq-item/g) === c(live, /ef-faq-item/g));
ok('highlight block count unchanged', c(got, /ef-highlight/g) === c(live, /ef-highlight/g));
ok('this edit adds no em-dash', c(got, /—/g) === c(live, /—/g));
ok('this edit adds no non-ASCII character', (() => {
  const tally = (s) => { const m = new Map(); for (const ch of s) if (ch.charCodeAt(0) > 127) m.set(ch, (m.get(ch) || 0) + 1); return m; };
  const a = tally(live), b = tally(got);
  for (const [ch, n] of b) if (n > (a.get(ch) || 0)) return false;
  return true;
})());

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
