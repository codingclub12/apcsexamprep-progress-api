#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET FOR TOPIC 1.4 EXERCISE 1.
//
//    node scripts/cyber-u1-l4-ex1-ced-csv.js out/l4ex1.csv [--live page.json]
//                                            [--show-changes] [--html f.html]
//
//  ---- WHAT AN EXERCISE GATE HAS TO CHECK THAT A LESSON GATE DOES NOT --------
//  This page grades in JavaScript. A <select> holds option VALUES, and the
//  scoring code compares those values as strings. Nothing connects the two
//  except that they happen to spell the same thing, so:
//
//   * A CREDITED VALUE THAT NAMES NO OPTION IS UNGETTABLE. The scoring branch
//     never fires, the student cannot score that point however well they
//     understand it, and the page throws no error. This gate walks every
//     `x==='...'` comparison back to the select it reads and fails if the value
//     is not there.
//
//   * AN OPTION VALUE NO COMPARISON MENTIONS IS EITHER A DISTRACTOR OR A BUG,
//     and they look identical. Reported as a note rather than a failure, so a
//     human reads the list and recognises the one that should have been keyed.
//
//   * A getElementById THAT NAMES NO ELEMENT throws at grade time and takes the
//     whole Check button with it. Renaming p1a-tactic to p1a-defense in the
//     markup and not in the script is exactly that bug.
//
//   * NO CREDITED ANSWER MAY NAME A LEGACY TERM. This is the point of the whole
//     change and it is the one check that reads meaning rather than structure.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-l4-ex1-ced');
const gate0 = require('../lib/cyber-page-gate');
const exgate = require('../lib/cyber-exercise-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

//  Off-CED names that describe a delivery channel or a legacy category, plus the
//  Unit 2 tactics. Naming one in a distractor is allowed. Crediting one is not.
const LEGACY = ['spear phishing', 'spear-phishing', 'vishing', 'smishing', 'whaling',
  'baiting', 'quid pro quo', 'polymorphic', 'authority', 'consensus', 'scarcity',
  'familiarity', 'pretexting', 'tailgating'];

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

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

//  { selectId: [{value, label}] }
function selects(html) {
  const out = {};
  for (const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    out[m[1]] = [...m[2].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
      .map((o) => ({ value: o[1], label: flat(o[2]).trim() }))
      .filter((o) => o.value !== '');
  }
  return out;
}

//  Every `var NAME=document.getElementById('SELECT').value` in the page, so a
//  comparison against NAME can be traced to the select it actually reads.
function varToSelect(html) {
  const map = {};
  for (const m of html.matchAll(/(\w+)\s*=\s*document\.getElementById\('([^']+)'\)\.value/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function credited(html) {
  const vars = varToSelect(html);
  const out = [];
  for (const m of html.matchAll(/(\w+)\s*===?\s*'([^']+)'/g)) {
    if (vars[m[1]]) out.push({ varName: m[1], select: vars[m[1]], value: m[2] });
  }
  return out;
}

function gate(before, after) {
  //  Everything exercise-shaped now lives in lib/cyber-exercise-gate.js, so
  //  Exercise 2 and the lab get the same checks rather than a copy of them.
  //  The copies that drifted before were copies of checks exactly like these.
  const { fail, note } = exgate.check(before, after);

  // ---- page-level checks, shared with the lesson gates ----------------------
  fail.push(...gate0.nothingUnhidden(before, after));
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'select', 'option', 'p']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));

  const changed = gate0.changedSentences(before, after, flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail, note, changed };
}

async function main() {
  const out = process.argv[2];
  const show = process.argv.includes('--show-changes');
  if (!out) {
    console.error('usage: node scripts/cyber-u1-l4-ex1-ced-csv.js <out.csv> [--live f.json] [--show-changes] [--html f.html]');
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
    console.error('\nRefusing to write without --show-changes. This rewrites a graded answer key;');
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

module.exports = { gate, flat, selects, credited, LEGACY };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
