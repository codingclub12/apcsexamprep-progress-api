'use strict';
//  PARSE THE SHEETS BACK AND DIFF AGAINST LIVE. Generation is not evidence that
//  generation worked: the CSP sheet lost 90 bytes a page while every semantic
//  check passed, and a parse-back diff is what caught it.
//
//  Two sheets, because Matrixify reads a BLANK cell as "write empty" rather than
//  "leave alone". A single sheet carried a blank Body HTML on the title-only row
//  and blank titles on the body rows, and the repo's preflight refused it in
//  exactly those words. Rows from both files are pooled here so no page falls
//  between them.
const fs = require('fs');
const sf = require('/home/user/apcsexamprep-progress-api/lib/storefront-fetch');
const { extract } = require('/home/user/apcsexamprep-progress-api/scripts/extract-live-body');

const DIR = '/home/user/apcsexamprep-progress-api/matrixify/';
const FILES = ['cyber-lab-topic-retarget-title-pages.csv', 'cyber-lab-topic-retarget-body-pages.csv'];

let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) console.log('  ok    ' + name);
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : '')); }
};

function parse(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const raws = FILES.map((f) => fs.readFileSync(DIR + f, 'utf8'));
ok('every sheet starts with a UTF-8 BOM', raws.every((r) => r.charCodeAt(0) === 0xFEFF));
ok('every sheet ends with CRLF', raws.every((r) => /\r\n$/.test(r)));
ok('every header is fully quoted', raws.every((r) => /^﻿"Handle","Command",/.test(r)));

const recs = [];
let tableRows = 0;
for (const r of raws) {
  const t = parse(r.replace(/^﻿/, ''));
  tableRows += t.length;
  const head = t[0];
  for (const row of t.slice(1)) recs.push(Object.fromEntries(head.map((h, i) => [h, row[i]])));
}
//  Two headers plus three data rows. Record separators only parse as CRLF here,
//  so getting five is the proof, not a bare-newline scan: a page body legally
//  contains newlines inside its quoted field.
ok('3 data rows across the two sheets', tableRows === 5 && recs.length === 3,
  'table rows ' + tableRows + ', data rows ' + recs.length);
ok('every Command is MERGE', recs.every((r) => r.Command === 'MERGE'));

const all = raws.join('');
ok('no em-dash anywhere', !/—|–/.test(all));

const mojibake = require('/home/user/apcsexamprep-progress-api/lib/mojibake');
//  analyze() is the entry point, the same one tools/ap-cyber-ced/validator.js
//  rule 7 uses. The first draft of this file guessed findAll/scan, found
//  neither, and PASSED anyway, which is a hollow check dressed as a green one.
const hits = mojibake.analyze(all);
ok('no mojibake (lib/mojibake.js analyze)', hits.length === 0,
  hits.slice(0, 3).map((h) => JSON.stringify(h.chunk) + ' means ' + JSON.stringify(h.fixed)
    + ' (' + h.codec + ', width ' + h.width + ') at ' + h.index).join('; '));

const ek = require('/home/user/apcsexamprep-progress-api/lib/cyber-ek-density');
ek.EK_RX.lastIndex = 0;
const codes = all.match(ek.EK_RX) || [];
ok('no CED Essential Knowledge codes in student text', codes.length === 0, JSON.stringify(codes));

console.log('\n  per row, against live:');
for (const r of recs) {
  const rendered = sf.page('/pages/' + r.Handle, { timeout: 40 }).body;

  if (r['Body HTML'] !== undefined) {
    const liveBody = extract(rendered);
    const sheetBody = r['Body HTML'];
    const normalised = sheetBody.split('Topic 4.3').join('Topic 1.2').split('>Unit 4<').join('>Unit 1<');
    ok(r.Handle + ': body differs from live ONLY by the intended swaps', normalised === liveBody);
    ok(r.Handle + ': byte length preserved (no quoting loss)',
      sheetBody.length === liveBody.length, sheetBody.length + ' vs ' + liveBody.length);
    ok(r.Handle + ': no "Topic 1.2" survives in the new body', !/Topic\s*1\.2/i.test(sheetBody));
    ok(r.Handle + ': live still says the old label, so this row is not a no-op', /Topic\s*1\.2/i.test(liveBody));
  } else {
    const title = (rendered.match(/<title>([\s\S]*?)<\/title>/) || [])[1].trim();
    ok(r.Handle + ': its sheet carries NO Body HTML column, so no body is touched',
      r['Body HTML'] === undefined);
    ok(r.Handle + ': live title still says the OLD topic, so this row is not a no-op',
      /Topic\s*1\.2/.test(title), title);
    ok(r.Handle + ': new Title says Topic 4.3 and keeps the lab name',
      /Topic 4\.3$/.test(r.Title) && r.Title.includes('Find the Tournament Code'), r.Title);
    ok(r.Handle + ': new SEO Description says Topic 4.3',
      /Topic 4\.3 practice lab\.$/.test(r['SEO Description']), r['SEO Description']);
  }
}
console.log(fail ? '\n  ' + fail + ' FAILED' : '\n  all passed');
process.exit(fail ? 1 : 0);
