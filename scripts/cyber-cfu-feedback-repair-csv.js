#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REPAIR: A CFU FEEDBACK BOX THAT IS VISIBLE BEFORE THE STUDENT ANSWERS.
//
//  ── THE DEFECT ──────────────────────────────────────────────────────────────
//  Every Check For Understanding widget hides its feedback with an INLINE style
//  on the div itself:
//
//      <div class="cfu-feedback" id="cfu-1-feedback" style="display:none!important;">
//
//  There is no CSS rule that hides it. The stylesheet gives .cfu-feedback its
//  padding, border and background and nothing else, and the grading engine
//  reveals it with feedDiv.style.setProperty('display','block','important').
//  So the inline attribute is not decoration: it is the only thing standing
//  between a student and the answer key.
//
//  On 2026-08-27 the WO-3 rewrite of the Topic 1.1 lesson dropped it from eight
//  of the ten blocks. The markup was read with inline style attributes stripped
//  for legibility, and the replacements were then authored from what had been
//  read. The page shipped, passed every gate, and served the correct answer and
//  the full explanation for all ten items on page load. A teacher found it.
//
//  Nothing in the gates could have caught it. They checked that the widgets
//  existed, that keys resolved, that tags balanced and that the CFU markup was
//  well formed. Not one of them asked whether an element that used to be hidden
//  still was. validate_csv.py --baseline now carries that check.
//
//  ── WHAT THIS SCRIPT DOES ───────────────────────────────────────────────────
//  Restores the attribute wherever it is missing, and nothing else. The gate
//  proves "nothing else" rather than asserting it: strip the inserted attribute
//  back out of the output and the result must be byte identical to the live
//  body. A repair that cannot be undone exactly is not a repair.
//
//  Run:
//    node scripts/cyber-cfu-feedback-repair-csv.js out/fix.csv <handle> [--live f.json]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const HIDDEN = ' style="display:none!important;"';
const OPEN_TAG = /<div class="cfu-feedback"(?: id="([^"]+)")?([^>]*)>/g;

async function readLive(handle, file) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8')).page;
  const url = `https://www.apcsexamprep.com/pages/${handle}.json?cb=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      // Cloudflare serves a challenge page to a default agent, and it arrives
      // with a 200 that parses as HTML rather than JSON.
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  if (text.trimStart().startsWith('<')) {
    throw new Error('the host returned HTML rather than JSON, most likely a Cloudflare challenge. Retry, or fetch the page yourself and pass --live.');
  }
  return JSON.parse(text).page;
}

function repair(body) {
  const fixed = [];
  const out = body.replace(OPEN_TAG, (whole, id, rest) => {
    if (/display\s*:\s*none/.test(whole)) return whole;
    fixed.push(id || '(no id)');
    return `<div class="cfu-feedback"${id ? ` id="${id}"` : ''}${HIDDEN}${rest}>`;
  });
  return { out, fixed };
}

function gate(before, after, fixed) {
  const fail = [];
  const note = [];

  const count = (b) => {
    const all = b.match(/<div class="cfu-feedback"[^>]*>/g) || [];
    return { all: all.length, hidden: all.filter((t) => /display\s*:\s*none/.test(t)).length };
  };
  const b0 = count(before);
  const b1 = count(after);
  note.push(`feedback boxes: ${b0.all} total, ${b0.hidden} hidden before -> ${b1.hidden} hidden after`);
  note.push(`repaired: ${fixed.join(', ') || 'nothing'}`);

  if (!fixed.length) fail.push('nothing to repair on this page; it was already correct');
  if (b1.hidden !== b1.all) fail.push(`${b1.all - b1.hidden} feedback box(es) still visible after the repair`);
  if (b1.all !== b0.all) fail.push(`feedback box count changed: ${b0.all} -> ${b1.all}`);

  //  The proof that nothing else moved. Remove exactly what was inserted and
  //  the output must collapse back onto the input, byte for byte.
  const undone = after.split(HIDDEN).join('');
  const beforeUndone = before.split(HIDDEN).join('');
  if (undone !== beforeUndone) {
    let i = 0;
    while (i < Math.min(undone.length, beforeUndone.length) && undone[i] === beforeUndone[i]) i++;
    fail.push(`the repair changed something other than the hidden attribute, first at offset ${i}\n`
      + `        live: ${JSON.stringify(beforeUndone.slice(i - 60, i + 120))}\n`
      + `        new : ${JSON.stringify(undone.slice(i - 60, i + 120))}`);
  }

  const nc = after.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'style', 'script']) {
    const o = (nc.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const c = (nc.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (o !== c) fail.push(`<${tag}> unbalanced: ${o} open, ${c} close`);
  }
  for (const m of after.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`a script block does not compile: ${e.message}`); }
  }

  return { fail, note };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  const handle = process.argv[3];
  if (!out || !handle) {
    console.error('usage: node scripts/cyber-cfu-feedback-repair-csv.js <out.csv> <handle> [--live page.json]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(handle, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  const before = page.body_html;

  const { out: after, fixed } = repair(before);
  const { fail, note } = gate(before, after, fixed);
  for (const n of note) console.log(`note  ${n}`);
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) {
    console.error(`\n${fail.length} check(s) failed. Nothing written.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [page.id, page.handle, page.title, after, 'MERGE'].map(csvCell).join(','),
  ].join('\n') + '\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
