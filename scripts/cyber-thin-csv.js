#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD A "STOP SAYING THE CED TO STUDENTS" SHEET FOR ANY UNIT 1 PAGE.
//
//   node scripts/cyber-thin-csv.js <module> <out.csv> --show-changes
//                                  [--live page.json] [--html f.html]
//                                  [--allow-ek N]
//
//   module is the basename under lib/, e.g. cyber-u1-topic13-thin
//
//  One script for four pages rather than four copies of one script. The repo
//  has already paid for the alternative twice: a stayed_hidden check that
//  printed its warning and returned 0, and a \bPrediction:\b that could never
//  match. Both were copies that drifted from something that worked.
//
//  --allow-ek exists because thinning a page's EK codes and thinning its prose
//  are not always the same sheet. Where codes are staged for a later pass the
//  allowance is stated on the command line, in the run note and in the PR, so
//  it is a decision on the record rather than a silent omission.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { chromium } = require('../smoke/node_modules/playwright');
const gate0 = require('../lib/cyber-page-gate');
const { thinGate } = require('../lib/cyber-thin-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function readLive(handle, file) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8')).page;
  const url = `https://www.apcsexamprep.com/pages/${handle}.json?cb=${Date.now()}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  if (text.trimStart().startsWith('<')) {
    throw new Error('host returned HTML, most likely a Cloudflare challenge. Retry or pass --live.');
  }
  return JSON.parse(text).page;
}

const argAfter = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
};

async function main() {
  const modName = process.argv[2];
  const out = process.argv[3];
  const show = process.argv.includes('--show-changes');
  if (!modName || !out || out.startsWith('--')) {
    console.error('usage: node scripts/cyber-thin-csv.js <module> <out.csv> --show-changes [--live f.json] [--html f.html] [--allow-ek N]');
    process.exit(2);
  }
  const modPath = path.join(__dirname, '..', 'lib', `${modName}.js`);
  const mod = require(modPath);

  const page = await readLive(mod.HANDLE, argAfter('--live'));
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: after, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved, ${before.length} -> ${after.length} bytes`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(7)}  -${String(r.removed).padStart(4)} +${String(r.html.length).padStart(4)}  ${r.name}`);
  }
  console.log('');

  const { fail, note, changed } = await thinGate(chromium, EXEC, before, after, {
    allowPaintedEk: Number(argAfter('--allow-ek') || 0),
    moduleSource: fs.readFileSync(modPath, 'utf8'),
  });
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 200)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. A passing gate says no widget moved,');
    console.error('not that the replacement copy says the thing the citation used to stand for.');
    process.exit(1);
  }

  const htmlOut = argAfter('--html');
  if (htmlOut) { fs.writeFileSync(htmlOut, after, 'utf8'); console.log(`wrote ${htmlOut} for preview`); }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, gate0.csvRow(page, after, mod.TITLE), 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
