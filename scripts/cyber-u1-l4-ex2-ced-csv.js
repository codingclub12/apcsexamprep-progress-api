#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET FOR TOPIC 1.4 EXERCISE 2.
//
//    node scripts/cyber-u1-l4-ex2-ced-csv.js out/l4ex2.csv [--live page.json]
//                                            [--show-changes] [--html f.html]
//
//  Every check lives in lib/cyber-exercise-gate.js and lib/cyber-page-gate.js,
//  so this page is held to exactly the same standard as Exercise 1 rather than
//  to a copy of it that drifts. This file is the wiring.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-l4-ex2-ced');
const gate0 = require('../lib/cyber-page-gate');
const exgate = require('../lib/cyber-exercise-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

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

function gate(before, after) {
  const { fail, note } = exgate.check(before, after);

  fail.push(...gate0.nothingUnhidden(before, after));
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'select', 'option', 'p', 'textarea']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));

  const changed = gate0.changedSentences(before, after, exgate.flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail, note, changed };
}

async function main() {
  const out = process.argv[2];
  const show = process.argv.includes('--show-changes');
  if (!out) {
    console.error('usage: node scripts/cyber-u1-l4-ex2-ced-csv.js <out.csv> [--live f.json] [--show-changes] [--html f.html]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(mod.HANDLE, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: after, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved, ${before.length} -> ${after.length} chars`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(6)}  -${String(r.removed).padStart(5)} +${String(r.html.length).padStart(5)}  ${r.name}`);
  }
  console.log('');

  const { fail, note, changed } = gate(before, after);
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 185)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. This touches a graded page;');
    console.error('a passing gate says the keys are gettable, not that they are the right keys.');
    process.exit(1);
  }

  const htmlIdx = process.argv.indexOf('--html');
  if (htmlIdx > 0) {
    fs.writeFileSync(process.argv[htmlIdx + 1], after, 'utf8');
    console.log(`wrote ${process.argv[htmlIdx + 1]} for preview`);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, gate0.csvRow(page, after, mod.TITLE), 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

module.exports = { gate };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
