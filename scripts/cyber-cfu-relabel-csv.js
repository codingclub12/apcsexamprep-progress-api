#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  Build the Matrixify sheet that makes a cyber lesson's question labels honest.
//
//  Reads the live page, applies lib/cyber-cfu-relabel.js (display text only),
//  runs the page gates AND lib/cyber-denominator-gate.js over the RESULT, and
//  writes one MERGE row. It exits non-zero and writes nothing if the output
//  fails any guard, so a bad transform cannot reach an import by accident.
//  Verified by sabotage: breaking a script in the source makes it refuse.
//
//  What it checks is THIS EDIT, not the health of the live page. nothingUnhidden
//  and keysUnchanged are before/after comparisons, so a defect already present
//  in the live body is carried through unchanged rather than reported: a body
//  MERGE re-imports the whole body, and this transform neither introduces nor
//  repairs anything outside the counter labels and the printed total.
//
//  usage:
//    node scripts/cyber-cfu-relabel-csv.js <handle> <out.csv> [--live page.json]
//
//  --live takes a saved page JSON ({page:{id,handle,title,body_html}}) so this
//  is runnable with no network, which is how it was verified.
// -----------------------------------------------------------------------------

const fs = require('fs');
const rel = require('../lib/cyber-cfu-relabel');
const gate = require('../lib/cyber-denominator-gate');
const pg = require('../lib/cyber-page-gate');

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

const argAfter = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
};

async function main() {
  const handle = process.argv[2];
  const out = process.argv[3];
  if (!handle || !out || out.startsWith('--')) {
    console.error('usage: node scripts/cyber-cfu-relabel-csv.js <handle> <out.csv> [--live page.json]');
    process.exit(2);
  }

  const page = await readLive(handle, argAfter('--live'));
  const before = page.body_html;
  const res = rel.apply(before);

  if (!res.plan) {
    console.log(`${handle}: labels already honest, nothing to write`);
    process.exit(0);
  }
  const after = res.html;

  //  Everything that is NOT display text must be byte identical. This is the
  //  whole safety claim of this transform, so it is asserted here rather than
  //  trusted from the module.
  const same = (re) => (before.match(re) || []).join('|') === (after.match(re) || []).join('|');
  const fails = []
    .concat(same(/id="[^"]*"/g) ? [] : ['an id changed'])
    .concat(same(/data-num="\d+"/g) ? [] : ['a data-num changed'])
    .concat(same(/onclick="[^"]*"/g) ? [] : ['a handler changed'])
    .concat(same(/data-step-id="\d+"/g) ? [] : ['a data-step-id changed'])
    .concat(pg.nothingUnhidden(before, after))
    .concat(pg.balancedTags(after, ['div', 'span', 'script', 'p', 'button']))
    .concat(pg.scriptsParse(after))
    .concat(pg.noNewNonAscii(before, after))
    .concat(pg.keysUnchanged(before, after))
    .concat(gate.check(after).map((f) => `gate still reports ${f.kind}: ${f.detail}`));

  if (fails.length) {
    console.error(`REFUSING to write ${out}:`);
    for (const f of fails) console.error(`  ${f}`);
    process.exit(1);
  }

  fs.writeFileSync(out, pg.csvRow(page, after, page.title), 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log(`  ${res.changes.counters} counters relabelled, ${res.changes.totals} printed totals corrected`);
  console.log(`  gate: clean. ids, data-num, handlers and step order all byte identical.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
