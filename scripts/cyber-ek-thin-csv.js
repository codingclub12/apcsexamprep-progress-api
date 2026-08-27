#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  THIN THE EK CITATIONS OUT OF A LIVE LESSON PAGE AND WRITE THE SHEET.
//
//  Run:
//    node scripts/cyber-ek-thin-csv.js out/thin.csv <handle> [--live page.json]
//
//  The rule is "Citing the CED to students" in
//  docs/ap-cyber-unit1-ced-realignment.md. lib/cyber-ek-density.js decides what
//  is protected, lib/cyber-ek-thin.js does the cutting, and this gates it.
//
//  ---- WHAT THE GATE HAS TO CATCH HERE -------------------------------------
//  This transform rewrites prose across most of the page, which makes it the
//  most dangerous kind of change to ship on a page students are using. Three
//  specific failures are in scope:
//
//  * A CITATION COUNT OF ZERO PROVES NOTHING. Deleting codes produced "A
//    birthdate applies." and the count still went to zero. So the gate reports
//    every changed sentence for a human to read, and refuses to write the sheet
//    if the caller has not asked to see them.
//
//  * THE SORT WIDGET GRADES BY STRING COMPARISON. data-correct is matched
//    against data-bucket. Renaming a bucket label without renaming both marks
//    every card wrong, silently, with no error anywhere.
//
//  * AN ELEMENT THAT WAS HIDDEN MUST STAY HIDDEN. On 2026-08-27 a rewrite of
//    this same page dropped style="display:none" from eight CFU feedback boxes
//    and served the answer key on load. Nothing in that day's gates could see
//    it. This one checks.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const ek = require('../lib/cyber-ek-density');
const { thin } = require('../lib/cyber-ek-thin');

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

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ');

function hiddenIds(b) {
  const out = new Set();
  for (const m of b.matchAll(/<[a-z]+[^>]*>/gi)) {
    if (!m[0].replace(/\s/g, '').includes('display:none')) continue;
    const id = /id="([^"]+)"/.exec(m[0]);
    if (id) out.add(id[1]);
  }
  return out;
}

function visibleCitations(b) {
  const skip = [];
  for (const m of b.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)) skip.push([m.index, m.index + m[0].length]);
  return ek.citations(b).citations
    .filter((x) => !x.protectedBy && !skip.some(([a, z]) => a <= x.index && x.index < z));
}

function gate(before, after) {
  const fail = [];
  const note = [];

  note.push(`visible EK citations: ${visibleCitations(before).length} -> ${visibleCitations(after).length}`);
  const s = ek.summary(after);
  note.push(`protected citations kept: ${s.kept}`);
  if (s.unbalanced.length) fail.push(`unbalanced blocks: ${s.unbalanced.join(', ')}`);

  //  nothing that was hidden may become visible
  const lost = [...hiddenIds(before)].filter((id) => !hiddenIds(after).has(id));
  if (lost.length) fail.push(`these were hidden and are not any more: ${lost.join(', ')}`);

  //  the sort widget still grades
  const buckets = [...after.matchAll(/data-bucket="([^"]+)"/g)].map((m) => m[1]);
  for (const a of [...after.matchAll(/data-correct="([^"]+)"/g)].map((m) => m[1])) {
    if (!buckets.includes(a)) fail.push(`sort answer ${JSON.stringify(a)} names no bucket`);
  }
  //  matching pairs and cloze answers survive
  for (const m of after.matchAll(/id="match-(\d+)-left"/g)) {
    const n = m[1];
    const seg = after.slice(after.indexOf(`id="match-${n}-left"`), after.indexOf(`id="cfu-${n}-btn"`));
    const rs = seg.indexOf(`id="match-${n}-right"`);
    const L = [...seg.slice(0, rs).matchAll(/data-match-key="([^"]+)"/g)].map((x) => x[1]);
    const R = [...seg.slice(rs).matchAll(/data-match-key="([^"]+)"/g)].map((x) => x[1]);
    if (L.length !== R.length || L.some((k) => !R.includes(k))) fail.push(`cfu-${n} matching pairs broken`);
  }
  for (const m of after.matchAll(/id="cloze-(\d+)-passage"/g)) {
    const n = m[1];
    const p = after.slice(after.indexOf(`id="cloze-${n}-passage"`), after.indexOf(`id="cloze-${n}-bank"`));
    const bank = after.slice(after.indexOf(`id="cloze-${n}-bank"`), after.indexOf(`id="cfu-${n}-btn"`));
    const chips = [...bank.matchAll(/data-chip="([^"]+)"/g)].map((x) => x[1]);
    for (const a of [...p.matchAll(/data-answer="([^"]+)"/g)].map((x) => x[1])) {
      if (!chips.includes(a)) fail.push(`cfu-${n} cloze answer ${JSON.stringify(a)} is not in the bank`);
    }
  }

  //  structure and scripts
  const nc = after.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'style', 'script', 'table', 'tr', 'td']) {
    const o = (nc.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const c = (nc.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (o !== c) fail.push(`<${tag}> unbalanced: ${o} open, ${c} close`);
  }
  for (const m of after.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`script does not compile: ${e.message}`); }
  }

  //  no new non-ASCII, and the CFU widgets all survive
  const cp = (x) => new Set([...x].filter((ch) => ch.charCodeAt(0) > 127));
  const had = cp(before);
  const added = [...cp(after)].filter((ch) => !had.has(ch));
  if (added.length) fail.push(`introduced non-ASCII: ${JSON.stringify(added.join(''))}`);
  const nBefore = (before.match(/<div class="cfu-block/g) || []).length;
  const nAfter = (after.match(/<div class="cfu-block/g) || []).length;
  if (nBefore !== nAfter) fail.push(`cfu block count changed: ${nBefore} -> ${nAfter}`);

  //  the sentences a human has to read
  const seen = new Set(flat(before).split(/(?<=[.?!]) /));
  const changed = flat(after).split(/(?<=[.?!]) /).filter((x) => !seen.has(x));
  note.push(`sentences changed: ${changed.length}`);
  return { fail, note, changed };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  const handle = process.argv[3];
  const show = process.argv.includes('--show-changes');
  if (!out || !handle) {
    console.error('usage: node scripts/cyber-ek-thin-csv.js <out.csv> <handle> [--live page.json] [--show-changes]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(handle, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  const before = page.body_html;
  const after = thin(before);

  const { fail, note, changed } = gate(before, after);
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 150)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. This rewrites prose across the page;');
    console.error('a citation count of zero says nothing about whether it still reads like English.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [page.id, page.handle, page.title, after, 'MERGE'].map(csvCell).join(','),
  ].join('\n') + '\n', 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
