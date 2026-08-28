#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET FOR TOPIC 1.3.
//
//    node scripts/cyber-u1-topic13-ced-csv.js out/topic13.csv [--live page.json]
//                                             [--show-changes] [--html f.html]
//
//  ---- WHY THIS BUILD DOES TWO THINGS -----------------------------------------
//  Topic 1.3 needs a handful of splices AND the EK thinning pass. Matrixify
//  MERGE writes the whole Body HTML and every sheet is built against whatever is
//  live at build time, so shipping them as two sheets means the second is built
//  on the pre-first body and undoes it. They run in one build, splices first,
//  and one sheet carries both.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-topic13-ced');
const gate0 = require('../lib/cyber-page-gate');
const ek = require('../lib/cyber-ek-density');
const { thin } = require('../lib/cyber-ek-thin');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

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
  note.push(`protected citations kept: ${s.kept} (${Object.entries(s.byLabel).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  if (s.unbalanced.length) fail.push(`unbalanced blocks: ${s.unbalanced.join(', ')}`);

  //  No ASSERTION about what an exam frequently or commonly does. This page had
  //  one sentence of it; 1.2 had a whole section, and that is how it starts.
  //
  //  The word "common" alone is not the test. Every page in this unit has a
  //  section headed "Common AP Exam Mistakes", which is a noun phrase naming a
  //  list of misconceptions, not a claim about what an exam contains. The first
  //  version of this check failed on it. What marks an assertion is a verb: the
  //  pattern IS common, questions ARE frequent, expect this, this is a favourite.
  const ASSERTS = /\b(?:is|are|remain|tend to be|will be)\s+(?:a\s+)?(?:high[- ]frequency|very\s+)?(?:common|frequent|typical|favou?rite)|\bfrequently\b|\bcommonly\b|\bexpect\s+(?:scenario|question|to see)|\bhigh-frequency\b|\balways asks\b/i;
  for (const m of flat(after).matchAll(/[^.!?]{0,120}\b(?:AP )?exam[^.!?]{0,120}/gi)) {
    if (ASSERTS.test(m[0])) {
      fail.push(`a claim about what the exam does: ${JSON.stringify(m[0].trim().slice(0, 90))}`);
    }
  }

  //  Widgets still grade, and the answer key has not moved.
  const keys = (b) => [...b.matchAll(/id="(cfu-\d+)"[^>]*data-answer="([A-E])"/g)]
    .map((m) => `${m[1]}=${m[2]}`).join(' ');
  if (keys(before) !== keys(after)) fail.push(`MCQ keys changed: ${keys(before)} -> ${keys(after)}`);
  note.push(`MCQ keys: ${keys(after)}`);
  const buckets = [...after.matchAll(/data-bucket="([^"]+)"/g)].map((m) => m[1]);
  for (const a of [...after.matchAll(/data-correct="([^"]+)"/g)].map((m) => m[1])) {
    if (/^[A-E]$/.test(a)) continue;
    if (buckets.length && !buckets.includes(a)) fail.push(`sort answer ${JSON.stringify(a)} names no bucket`);
  }

  fail.push(...gate0.nothingUnhidden(before, after));
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'table', 'tr', 'td', 'th', 'span']));
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
    console.error('usage: node scripts/cyber-u1-topic13-ced-csv.js <out.csv> [--live f.json] [--show-changes] [--html f.html]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(mod.HANDLE, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: spliced, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(6)}  -${String(r.removed).padStart(5)} +${String(r.html.length).padStart(5)}  ${r.name}`);
  }
  const after = thin(spliced);
  console.log(`then thinned: ${before.length} -> ${after.length} chars`);
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
    console.error('\nRefusing to write without --show-changes. The thinning pass rewrites prose;');
    console.error('a citation count says nothing about whether it still reads like English.');
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
