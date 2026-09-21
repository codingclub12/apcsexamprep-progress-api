#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  CUT THE EK CITATIONS OUT OF THE LIVE AP CSA LESSON PAGES AND WRITE THE SHEETS.
//
//      node scripts/csa-ek-thin-csv.js imports/<date> [--show-changes]
//                                      [--snapshots <dir>] [--offline]
//
//  Board 373. config/csa-ek-decisions.json is the canonical data,
//  lib/csa-ek-thin.js does the cutting, smoke/csa-ek-thin.js is the gate and
//  smoke/csa-ek-thin-mutation.js proves the gate bites.
//
//  ---- WHY THREE FILES AND NOT ONE ------------------------------------------
//  19 pages on one click, with nothing to check between them, is a blast radius
//  nobody chose. Tanner's question about the first big sheet is the rule here:
//  "can we not do this by unit?" So this writes one sheet per unit, 12 rows for
//  unit 2, 3 for unit 3, 7 for unit 4, and the runbook imports them one at a
//  time with a live check between.
//
//  Splitting has its own failure mode, so it is proved LOSSLESS rather than
//  assumed: the three sheets are parsed back with a reader that did not write
//  them, and the set of handles and the bytes of every body are diffed against
//  the bodies the module produced. A split that drops a page is worse than the
//  big sheet, because nothing announces it.
//
//  ---- THE FETCH ------------------------------------------------------------
//  Through lib/storefront-fetch.js, with NO User-Agent. The older
//  scripts/cyber-ek-thin-csv.js sends a browser UA, which is the workaround that
//  became the bug when the bot management inverted, and the reason a live check
//  can report a confident false regression.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ek = require('../lib/cyber-ek-density');
const gate = require('../lib/cyber-page-gate');
const { thin, decisions } = require('../lib/csa-ek-thin');
const { checkPair } = require('../smoke/csa-ek-thin');

const ROOT = path.join(__dirname, '..');
const SPECS = path.join(ROOT, '..', 'APCSExamPrep-theme', 'teacher-bundle', 'specs');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const OUT = process.argv[2];
const SNAP = arg('--snapshots') || path.join(ROOT, 'shopify', 'csa-ek-snapshots');
const SHOW = process.argv.includes('--show-changes');
const OFFLINE = process.argv.includes('--offline');

if (!OUT || OUT.startsWith('--')) {
  console.error('usage: node scripts/csa-ek-thin-csv.js <out-dir> [--show-changes] [--offline]');
  process.exit(2);
}

const flat = (s) => s.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

//  The handles come from the theme's lesson specs, which are the same list the
//  CED title check walks. Hardcoding 19 handles here would be a second opinion
//  about which pages exist.
function pages() {
  const out = [];
  for (const u of ['unit-2', 'unit-3', 'unit-4']) {
    const dir = path.join(SPECS, u);
    if (!fs.existsSync(dir)) {
      console.error(`no specs at ${dir}. This needs the theme repo checked out beside this one.`);
      process.exit(2);
    }
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      out.push({ unit: u, topic: s.topic, handle: s.handle });
    }
  }
  return out.sort((a, b) => parseFloat(a.topic) - parseFloat(b.topic));
}

//  A transient 503 on a 38-page sweep is common enough to matter; the shared
//  door covers 429 and 503 since 2026-09-18. A page that still does not come
//  back stops the run, because a thinner sweep is a sheet with pages missing
//  from it and nothing saying so.
function snapshot(list) {
  fs.mkdirSync(SNAP, { recursive: true });
  const failed = [];
  for (const p of list) {
    const at = path.join(SNAP, `${p.topic}.json`);
    if (OFFLINE) {
      if (!fs.existsSync(at)) failed.push(`${p.topic}: --offline and no snapshot at ${at}`);
      continue;
    }
    try { fs.writeFileSync(at, JSON.stringify(sf.pageBody(p.handle))); }
    catch (e) { failed.push(`${p.topic} ${p.handle}: ${e.message}`); }
  }
  if (failed.length) {
    for (const f of failed) console.log(`FAIL could not read ${f}`);
    console.log(`\n${failed.length} of ${list.length} pages did not come back. Nothing written.`);
    process.exit(1);
  }
}

//  The BOM is a hard requirement: without it the consuming tool guesses
//  Latin-1 and a bullet arrives as three characters. Written as an escape so
//  this file stays ASCII.
const BOM = '\ufeff';
const csv = (rows) => BOM + rows.map((r) => r.map(gate.csvCell).join(',')).join('\n') + '\n';

function main() {
  const conf = decisions();
  const list = pages();
  console.log(`reading ${list.length} lesson pages${OFFLINE ? ' from the snapshot' : ' live'} ...`);
  snapshot(list);

  const built = [];
  const fail = [];
  let v0 = 0, v1 = 0, j = 0, applied = 0;
  for (const p of list) {
    const page = JSON.parse(fs.readFileSync(path.join(SNAP, `${p.topic}.json`), 'utf8'));
    const before = page.body_html;
    if (!ek.summary(before).total) continue;
    const r = thin(before, p.topic, conf);
    const res = checkPair(p.topic, before, r.body, conf, r.missed);
    fail.push(...res.fail);
    v0 += res.v0; v1 += res.v1; j += res.j1; applied += r.applied.length;
    built.push({ ...p, page, before, after: r.body });
    if (SHOW) {
      for (const s of gate.changedSentences(before, r.body, flat)) {
        console.log(`  ${p.topic.padEnd(5)} ${s.trim().slice(0, 165)}`);
      }
    }
  }

  if (built.length !== 19) fail.push(`expected 19 pages carrying citations, found ${built.length}`);
  if (applied !== conf.prose.length) fail.push(`${applied} of ${conf.prose.length} prose decisions applied`);

  console.log(`\nnote  visible citations ${v0} -> ${v1}`);
  console.log(`note  left in the ld+json metadata on purpose: ${j}`);
  console.log(`note  prose decisions applied: ${applied} of ${conf.prose.length}`);
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }

  if (!SHOW) {
    console.error('\nRefusing to write without --show-changes. This rewrites prose on 19 pages');
    console.error('students are using, and a citation count of zero says nothing about whether');
    console.error('they still read like English. Read the sentences.');
    process.exit(1);
  }

  //  ---- write, one sheet per unit ----------------------------------------
  fs.mkdirSync(OUT, { recursive: true });
  const written = [];
  for (const u of ['unit-2', 'unit-3', 'unit-4']) {
    const rows = built.filter((b) => b.unit === u);
    if (!rows.length) continue;
    //  The FILE NAME carries the sheet type: a CSV has no tab name, and
    //  Matrixify rejects a whole file in one second if the name does not say
    //  what kind of sheet it is. scripts/matrixify-preflight.js refused the
    //  first three of these for exactly that.
    const file = path.join(OUT, `csa-ek-codes-${u}-pages.csv`);
    fs.writeFileSync(file, csv([
      ['Handle', 'Command', 'Body HTML'],
      ...rows.map((b) => [b.page.handle, 'MERGE', b.after]),
    ]), 'utf8');
    written.push({ file, rows });
  }

  //  ---- prove the split lossless -----------------------------------------
  //  Parsed back with a reader that did not write them. Generation is not
  //  evidence that generation worked: the CSP sheet lost 90 bytes a page while
  //  every semantic check passed, and a parse-back diff is what caught it.
  const back = [];
  for (const w of written) back.push(...parseSheet(fs.readFileSync(w.file, 'utf8')));
  const lost = [];
  const seen = new Set();
  for (const b of built) {
    const row = back.find((r) => r.Handle === b.page.handle);
    if (!row) { lost.push(`${b.topic}: ${b.page.handle} is in no sheet`); continue; }
    if (seen.has(row.Handle)) lost.push(`${b.topic}: ${row.Handle} appears in more than one sheet`);
    seen.add(row.Handle);
    if (row.Command !== 'MERGE') lost.push(`${b.topic}: command is ${JSON.stringify(row.Command)}`);
    if (row['Body HTML'] !== b.after) {
      lost.push(`${b.topic}: the body read back differs, ${b.after.length} written vs ${row['Body HTML'].length} read`);
    }
  }
  if (back.length !== built.length) lost.push(`${back.length} rows across the sheets, ${built.length} pages built`);
  if (lost.length) {
    for (const l of lost) console.log(`FAIL  ${l}`);
    console.error(`\nthe split is not lossless. ${lost.length} problem(s).`);
    process.exit(1);
  }

  //  ---- and let the preflight read the FILE ------------------------------
  //  Every other check above ran on rows this process built. The preflight
  //  parses what will actually be uploaded, with a reader that did not write it,
  //  and it is the gate between authored content and a live page body. Running
  //  it here rather than leaving it to the runbook means a sheet that would be
  //  rejected never reaches the runbook.
  //
  //  --carrying gives it the live bodies so the emoji already on these pages
  //  round-trip instead of reading as introduced here.
  const orig = path.join(SNAP, 'originals.json');
  fs.writeFileSync(orig, JSON.stringify(Object.fromEntries(built.map((b) => [b.page.handle, b.before]))));
  const cp = require('child_process');
  let rejected = 0;
  for (const w of written) {
    const r = cp.spawnSync(process.execPath,
      [path.join(__dirname, 'matrixify-preflight.js'), w.file, '--expect-command', 'MERGE', '--carrying', orig],
      { encoding: 'utf8', timeout: 600000 });
    if (r.status !== 0) {
      rejected++;
      console.log(`FAIL  preflight rejected ${path.basename(w.file)}`);
      console.log((r.stdout || '').split('\n').filter((l) => l.trim() && !/^\s*note/.test(l))
        .slice(-6).map((l) => `      ${l.trim()}`).join('\n'));
    }
  }
  if (rejected) { console.error(`\n${rejected} sheet(s) would be rejected on import. Fix before handing these over.`); process.exit(1); }

  console.log('');
  for (const w of written) {
    console.log(`wrote ${w.file}  (${fs.statSync(w.file).size} bytes, ${w.rows.length} rows, MERGE)`);
  }
  console.log(`\nparsed all three back: ${back.length} rows, every handle once, every body byte-identical.`);
  console.log('matrixify-preflight accepted all three, reading the files rather than the rows.');
}

//  A minimal RFC4180 reader. Deliberately NOT the writer's code path.
function parseSheet(text) {
  const s = text.replace(/^\ufeff/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

if (require.main === module) main();
module.exports = { parseSheet };
