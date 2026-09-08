'use strict';
//  Parse the sheet back as a CSV and diff every body against live. The only
//  permitted differences are the handle swap and, on one page, the card focus.
const fs = require('fs');
const sf = require('/home/user/apcsexamprep-progress-api/lib/storefront-fetch');
const { extract } = require('/home/user/apcsexamprep-progress-api/scripts/extract-live-body');
const CSV = '/home/user/apcsexamprep-progress-api/matrixify/cyber-lab-handle-repoint-pages.csv';
const OLD = 'ap-cyber-unit-1-lesson-2-terminal-lab';
const NEW = 'ap-cyber-unit-4-lesson-3-terminal-lab';

let fail = 0;
const ok = (n, c, d) => { if (c) console.log('  ok    ' + n); else { fail++; console.log('  FAIL  ' + n + (d ? '\n        ' + d : '')); } };

const PAGES = ['ap-cybersecurity-complete-course-guide', 'cyber-command-center',
  'ap-cyber-unit-2-lesson-4-terminal-lab', 'ap-cybersecurity-labs', 'ap-cybersecurity-practice',
  'ap-cyber-unit-1-lesson-2-auth-log-lab', 'ap-cybersecurity-unit-1-practice'];
const LIVE = new Map(PAGES.map((h) => [h, extract(sf.page('/pages/' + h, { timeout: 45 }).body)]));
const PAGES_LIVE = [...LIVE.values()];

const raw = fs.readFileSync(CSV, 'utf8');
ok('UTF-8 BOM', raw.charCodeAt(0) === 0xFEFF);
ok('ends CRLF', /\r\n$/.test(raw));
ok('header fully quoted', /^﻿"Handle","Command","Body HTML"\r\n/.test(raw));

function parse(t) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r' && t[i+1] === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; }
    else cur += c; }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const t = parse(raw.replace(/^﻿/, ''));
const recs = t.slice(1).map((r) => Object.fromEntries(t[0].map((h, i) => [h, r[i]])));
ok('7 data rows', t.length === 8 && recs.length === 7, 'rows ' + t.length);
ok('every Command is MERGE', recs.every((r) => r.Command === 'MERGE'));
//  NOT "no em-dash anywhere". The convention governs text WE author, and these
//  bodies come from live pages that already contain 72 of them; re-flattening a
//  quoted source is a corruption, not a fix. The honest assertion is that the
//  sheet introduces none, so the count must MATCH the live total exactly.
const liveDashes = PAGES_LIVE.reduce((a, b) => a + [...b.matchAll(/[\u2014\u2013]/g)].length, 0);
const sheetDashes = [...raw.matchAll(/[\u2014\u2013]/g)].length;
ok('no em-dash INTRODUCED (sheet count equals the live total)', sheetDashes === liveDashes,
  'sheet ' + sheetDashes + ' vs live ' + liveDashes);

const moji = require('/home/user/apcsexamprep-progress-api/lib/mojibake').analyze(raw);
ok('no mojibake (analyze)', moji.length === 0, moji.slice(0,2).map(h=>JSON.stringify(h.chunk)+' means '+JSON.stringify(h.fixed)).join('; '));
const ek = require('/home/user/apcsexamprep-progress-api/lib/cyber-ek-density');
ek.EK_RX.lastIndex = 0;
const codes = raw.match(ek.EK_RX) || [];
ok('no EK codes', codes.length === 0, JSON.stringify(codes.slice(0,5)));

console.log('\n  per row, against live:');
for (const r of recs) {
  const live = LIVE.get(r.Handle);
  //  Reverse EVERY edit the generator makes, not most of them. The first draft
  //  reversed the handle and the unit label and forgot Topic 4.3, which the
  //  generator also changes on that one card, and reported a false difference.
  let norm = r['Body HTML'].split(NEW).join(OLD);
  if (r.Handle === 'ap-cybersecurity-practice') {
    norm = norm.split('>Unit 4<').join('>Unit 1<').split('Topic 4.3').join('Topic 1.2');
  }
  ok(r.Handle + ': differs from live ONLY by the intended swaps', norm === live,
    norm === live ? '' : 'lengths ' + norm.length + ' vs ' + live.length);
  ok(r.Handle + ': no old handle survives', !r['Body HTML'].includes(OLD));
  ok(r.Handle + ': live still carries the old handle, so this row is not a no-op', live.includes(OLD));
}
console.log(fail ? '\n  ' + fail + ' FAILED' : '\n  all passed');
process.exit(fail ? 1 : 0);
