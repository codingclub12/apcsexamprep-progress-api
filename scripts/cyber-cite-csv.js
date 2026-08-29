#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD A "STOP CITING THE CED AND THE EXAM AT STUDENTS" SHEET FOR ANY UNIT 1
//  PAGE THAT IS NOT A LESSON.
//
//    node scripts/cyber-cite-csv.js <module> <out.csv> --show-changes
//                                   [--live page.json] [--allow-ek N]
//                                   [--framing] [--strict-label]
//
//  module is the basename under lib/, e.g. cyber-u1-l3-lab-cite
//
//  --live is how a sheet gets built against the body a page HAD at a known
//  moment rather than whatever it has now. Seventeen sheets are built in one
//  pass here and imported one at a time; each is built against its own page and
//  no other, so the order they go in does not matter, but a page must not be
//  rebuilt between its build and its import.
//
//  --strict-label also refuses the bare "AP Exam Tip" heading. Off by default:
//  these are exam-practice pages and a heading over advice is not a claim. The
//  claim is the sentence under it.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { chromium } = require('../smoke/node_modules/playwright');
const gate0 = require('../lib/cyber-page-gate');
const { citeGate } = require('../lib/cyber-cite-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const EXEC = process.env.CHROMIUM_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

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
  if (!modName || !out || out.startsWith('--')) {
    console.error('usage: node scripts/cyber-cite-csv.js <module> <out.csv> --show-changes '
      + '[--live f.json] [--allow-ek N] [--framing] [--strict-label]');
    process.exit(2);
  }
  const modPath = path.join(__dirname, '..', 'lib', `${modName}.js`);
  const mod = require(modPath);
  const moduleSource = fs.readFileSync(modPath, 'utf8');

  const page = await readLive(mod.HANDLE, argAfter('--live'));
  const before = page.body_html;
  const { body: after, resolved } = mod.applySplices(before);

  const { fail, note, changed } = await citeGate(chromium, EXEC, before, after, {
    allowPaintedEk: Number(argAfter('--allow-ek') || 0),
    framing: process.argv.includes('--framing'),
    allowLabel: !process.argv.includes('--strict-label'),
    moduleSource,
  });

  console.log(`${mod.HANDLE}`);
  console.log(`  ${resolved.length} splices, ${before.length}B -> ${after.length}B`);
  note.forEach((n) => console.log(`  - ${n}`));
  if (process.argv.includes('--show-changes')) {
    changed.forEach((c) => console.log(`  ~ ${c}`));
  }
  if (fail.length) {
    console.error('\nGATE FAILED, nothing written:');
    fail.forEach((f) => console.error(`  x ${f}`));
    process.exit(1);
  }
  fs.writeFileSync(out, gate0.csvRow(page, after, mod.TITLE), 'utf8');
  fs.writeFileSync(out.replace(/\.csv$/, '-preview.html'), after, 'utf8');
  console.log(`\nwrote ${out}`);
}

main().catch((e) => { console.error(e.message); process.exit(2); });
