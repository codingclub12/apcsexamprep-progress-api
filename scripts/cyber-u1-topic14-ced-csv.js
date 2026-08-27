#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET FOR THE TOPIC 1.4 CED REALIGNMENT.
//
//  Run:
//    node scripts/cyber-u1-topic14-ced-csv.js out/topic14.csv [--live page.json]
//                                             [--show-changes] [--html out.html]
//
//  ---- WHAT THIS GATE EXISTS TO CATCH ---------------------------------------
//  Every check below is here because of something that actually went wrong.
//
//  * THE dtb/match/seq WIDGETS GRADE BY STRING COMPARISON. A blank's
//    data-correct is compared against the chip's data-val. cfu-5 deliberately
//    renames two chips in this pass. Rename one side only and the widget marks
//    a correct placement wrong, silently, with no console error. Same shape as
//    the sort-widget bug on 1.1.
//
//  * AN ELEMENT THAT WAS HIDDEN MUST STAY HIDDEN. On 2026-08-27 a rewrite of
//    the 1.1 lesson dropped style="display:none" from eight CFU feedback boxes
//    and served the answer key on page load. That page had ten. So does this
//    one. Checked explicitly, and checked in the FAILING direction too.
//
//  * A TERM COUNT PROVES NOTHING ON ITS OWN. The point of this change is not
//    "fewer instances of the word vishing". It is that no off-CED term is
//    presented as the answer a question wants. So the gate reads the two
//    exam-cue tables by structure and fails if a legacy term is sitting in an
//    Attack Type cell, and it reports every changed sentence for a human.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-topic14-ced');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

//  Terms the CED does not contain that name a delivery channel or a legacy
//  category. Naming one is fine. Putting one in an "Attack Type" cell is not.
const LEGACY = ['spear phishing', 'spear-phishing', 'vishing', 'smishing', 'whaling',
  'baiting', 'quid pro quo', 'polymorphic'];

//  The vocabulary the topic is actually built on.
const CED_TERMS = ['digital avatar', 'ai phishing', 'prompt injection', 'data poisoning',
  'reconnaissance', 'ai malware', 'shared secret', 'multi-factor', 'reputable'];

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
  .replace(/&rarr;/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

//  Every element carrying display:none, keyed by id.
function hiddenIds(b) {
  const out = new Set();
  for (const m of b.matchAll(/<[a-z]+[^>]*>/gi)) {
    if (!m[0].replace(/\s/g, '').includes('display:none')) continue;
    const id = /id="([^"]+)"/.exec(m[0]);
    if (id) out.add(id[1]);
  }
  return out;
}

//  Rows of a <table>, as arrays of cell text.
function tableRows(html, tableStart) {
  const end = html.indexOf('</table>', tableStart);
  const seg = html.slice(tableStart, end < 0 ? html.length : end);
  const rows = [];
  for (const tr of seg.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    rows.push([...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((c) => flat(c[1]).trim()));
  }
  return rows;
}

function gate(before, after) {
  const fail = [];
  const note = [];

  // ---- 1. nothing that was hidden may become visible ------------------------
  const hb = hiddenIds(before);
  const ha = hiddenIds(after);
  const lost = [...hb].filter((id) => !ha.has(id));
  if (lost.length) fail.push(`these were hidden and are not any more: ${lost.join(', ')}`);
  const fbBoxes = [...after.matchAll(/<div class="cfu-feedback" id="(cfu-\d+-feedback)"/g)].map((m) => m[1]);
  const visible = fbBoxes.filter((id) => !ha.has(id));
  if (visible.length) fail.push(`CFU feedback served visible: ${visible.join(', ')}`);
  note.push(`feedback boxes hidden: ${fbBoxes.length - visible.length}/${fbBoxes.length}`);

  // ---- 2. every widget still grades ----------------------------------------
  //  fill-in-the-blank: each blank's answer must exist as a chip value
  const chips = [...after.matchAll(/class="dtb-chip"[^>]*data-val="([^"]+)"/g)].map((m) => m[1]);
  const blanks = [...after.matchAll(/class="dtb-blank"[^>]*data-correct="([^"]+)"/g)].map((m) => m[1]);
  for (const b of blanks) {
    if (!chips.includes(b)) fail.push(`dtb answer ${JSON.stringify(b)} names no chip in the bank`);
  }
  if (new Set(blanks).size !== blanks.length) fail.push('two dtb blanks share one answer');
  note.push(`dtb: ${blanks.length} blanks against ${chips.length} chips, all resolved`);

  //  matching: every data-correct must be an option value that exists
  for (const m of after.matchAll(/id="mr-(\d+)-(\d+)"[^>]*data-correct="([^"]+)"/g)) {
    const sel = after.slice(after.indexOf(`id="ms-${m[1]}-${m[2]}"`));
    const opts = [...sel.slice(0, sel.indexOf('</select>')).matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]);
    if (!opts.includes(m[3])) fail.push(`match row mr-${m[1]}-${m[2]} answer ${m[3]} is not an option`);
  }

  //  ordering: the correct order must name exactly the step ids present
  for (const m of after.matchAll(/id="cfu-(\d+)"[^>]*data-correct-order="([^"]+)"/g)) {
    const seg = after.slice(after.indexOf(`id="seq-${m[1]}-list"`), after.indexOf(`id="cfu-${m[1]}-btn"`));
    const ids = [...seg.matchAll(/data-step-id="([^"]+)"/g)].map((x) => x[1]).sort();
    const want = m[2].split(',').sort();
    if (ids.join() !== want.join()) {
      fail.push(`cfu-${m[1]} correct order ${m[2]} does not match step ids ${ids.join(',')}`);
    }
  }

  //  MCQ: the keyed letter must exist as an option
  for (const m of after.matchAll(/id="cfu-(\d+)"[^>]*data-answer="([A-E])"/g)) {
    const seg = after.slice(after.indexOf(`id="cfu-${m[1]}-opts"`), after.indexOf(`id="cfu-${m[1]}-btn"`));
    const vals = [...seg.matchAll(/data-val="([A-E])"/g)].map((x) => x[1]);
    if (!vals.includes(m[2])) fail.push(`cfu-${m[1]} key ${m[2]} is not among its options ${vals.join(',')}`);
  }

  // ---- 3. no legacy term may sit in an exam-cue answer column ---------------
  //  This is the actual standard: not "zero mentions", but "never the answer".
  let cue = 0;
  for (const m of after.matchAll(/<table class="vocab-table"/g)) {
    const rows = tableRows(after, m.index);
    const head = rows[0] || [];
    const col = head.findIndex((h) => /attack type/i.test(h));
    if (col < 0) continue;
    cue++;
    for (const r of rows.slice(1)) {
      const cell = (r[col] || '').toLowerCase();
      for (const t of LEGACY) {
        if (cell.includes(t)) fail.push(`exam-cue table gives ${JSON.stringify(r[col])} as the Attack Type`);
      }
    }
  }
  note.push(`exam-cue tables checked: ${cue}`);

  //  and no column may be headed as an exam signal for a term list
  if (/<th>AP Exam Signal<\/th>/.test(after)) fail.push('an "AP Exam Signal" cue column is still present');

  //  A cue table is not the only shape this defect takes. The FAQ answer and a
  //  worked example both carried the same mapping written as prose, and a term
  //  count could not see the difference between those and a passing mention.
  //  What marks a mapping is the phrase in front of the term: an arrow, "it is",
  //  "classify it as", "Prediction:". Any of those pointing at a legacy term is
  //  the page naming it as the answer.
  //  Limit worth stating: this catches a MARKED mapping. Prose that classifies
  //  without a marker ("a perfect email referencing personal details is spear
  //  phishing") reads the same to a student and is invisible here, so the human
  //  step of auditing where each surviving term sits is not optional.
  //  No trailing \b after "Prediction:" - a word boundary between a colon and a
  //  space never matches, and that typo made this check inert until the
  //  sabotage suite caught it.
  const POINTS_AT = /(?:\u2192|->|\bit is\b|\bclassif(?:y|ied) (?:it |this )?as\b|\bPrediction:|\bthe (?:correct )?answer is\b)[^.!?]{0,70}/gi;
  const vis = after.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ' ');
  for (const m of flat(vis).matchAll(POINTS_AT)) {
    for (const t of LEGACY) {
      if (m[0].toLowerCase().includes(t)) {
        fail.push(`a classification mapping points at a legacy term: ${JSON.stringify(m[0].trim().slice(0, 80))}`);
      }
    }
  }

  // ---- 4. the graded keys of every CFU, before against after ----------------
  const keys = (b) => [...b.matchAll(/id="(cfu-\d+)"[^>]*data-answer="([A-E])"/g)]
    .map((m) => `${m[1]}=${m[2]}`).join(' ');
  if (keys(before) !== keys(after)) {
    note.push(`MCQ keys changed: ${keys(before)} -> ${keys(after)}`);
  } else {
    note.push(`MCQ keys unchanged: ${keys(after)}`);
  }
  const order = (b) => [...b.matchAll(/data-correct-order="([^"]+)"/g)].map((m) => m[1]).join(' ');
  if (order(before) !== order(after)) fail.push(`sequence order key changed: ${order(before)} -> ${order(after)}`);
  const match = (b) => [...b.matchAll(/id="mr-(\d+-\d+)"[^>]*data-correct="([^"]+)"/g)]
    .map((m) => `${m[1]}=${m[2]}`).join(' ');
  if (match(before) !== match(after)) fail.push(`match keys changed: ${match(before)} -> ${match(after)}`);

  // ---- 5. structure and scripts --------------------------------------------
  const nc = after.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'style', 'script', 'table', 'tr', 'td', 'th', 'select', 'label']) {
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

  // ---- 6. no new non-ASCII, no new em-dash, CFU count steady ---------------
  const cp = (x) => new Set([...x].filter((ch) => ch.charCodeAt(0) > 127));
  const had = cp(before);
  const added = [...cp(after)].filter((ch) => !had.has(ch));
  if (added.length) fail.push(`introduced non-ASCII: ${JSON.stringify(added.join(''))}`);
  const nBefore = (before.match(/<div class="cfu-block/g) || []).length;
  const nAfter = (after.match(/<div class="cfu-block/g) || []).length;
  if (nBefore !== nAfter) fail.push(`cfu block count changed: ${nBefore} -> ${nAfter}`);

  // ---- 7. no EK code enters student-visible text ----------------------------
  const EK = /\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g;
  const ekBefore = (before.match(EK) || []).length;
  const ekAfter = (after.match(EK) || []).length;
  if (ekAfter > ekBefore) fail.push(`EK citations went up: ${ekBefore} -> ${ekAfter}`);
  note.push(`EK citations on the page: ${ekBefore} -> ${ekAfter} (thinning is a separate sheet)`);

  // ---- 8. coverage moved the right way -------------------------------------
  const lo = (x) => flat(x).toLowerCase();
  const B = lo(before);
  const A = lo(after);
  const cov = CED_TERMS.map((t) => {
    const b = (B.match(new RegExp(t.replace(/[-]/g, '.'), 'g')) || []).length;
    const a = (A.match(new RegExp(t.replace(/[-]/g, '.'), 'g')) || []).length;
    return `${t} ${b}->${a}`;
  });
  note.push(`CED vocabulary in visible text: ${cov.join(', ')}`);
  const leg = LEGACY.map((t) => {
    const b = (B.match(new RegExp(t, 'g')) || []).length;
    const a = (A.match(new RegExp(t, 'g')) || []).length;
    return b || a ? `${t} ${b}->${a}` : null;
  }).filter(Boolean);
  note.push(`legacy terms still named: ${leg.join(', ')}`);

  // ---- 9. the sentences a human has to read --------------------------------
  const seen = new Set(flat(before).split(/(?<=[.?!]) /));
  const changed = flat(after).split(/(?<=[.?!]) /).filter((x) => !seen.has(x));
  note.push(`sentences changed: ${changed.length}`);
  return { fail, note, changed };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  const show = process.argv.includes('--show-changes');
  if (!out) {
    console.error('usage: node scripts/cyber-u1-topic14-ced-csv.js <out.csv> [--live page.json] [--show-changes] [--html f.html]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(mod.HANDLE, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: after, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved, ${before.length} -> ${after.length} bytes`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(7)}  -${String(r.removed).padStart(6)} +${String(r.html.length).padStart(6)}  ${r.name}`);
  }
  console.log('');

  const { fail, note, changed } = gate(before, after);
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 190)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. This rewrites two exam-cue tables and');
    console.error('five CFU items; a passing gate says the widgets grade, not that the copy is right.');
    process.exit(1);
  }

  const htmlIdx = process.argv.indexOf('--html');
  if (htmlIdx > 0) {
    fs.writeFileSync(process.argv[htmlIdx + 1], after, 'utf8');
    console.log(`wrote ${process.argv[htmlIdx + 1]} for preview`);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [page.id, page.handle, mod.TITLE, after, 'MERGE'].map(csvCell).join(','),
  ].join('\n') + '\n', 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

//  gate() is exported so scripts/cyber-u1-topic14-gate-sabotage.js can drive it
//  directly. The suite used to scrape this function out of the file with a
//  regex, which quietly stopped matching the moment the source was reformatted
//  and reported every sabotage as MISSED. Exporting it is the honest version:
//  the suite tests the same code the build runs, not a copy of it.
module.exports = { gate, flat, hiddenIds, tableRows, LEGACY, CED_TERMS };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
