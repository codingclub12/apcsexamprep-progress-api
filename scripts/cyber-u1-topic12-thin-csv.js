#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET THAT TAKES "THE CED" OUT OF TOPIC 1.2's CONTENT.
//
//  Run:
//    node scripts/cyber-u1-topic12-thin-csv.js out/topic12-thin.csv
//                                              [--live page.json] --show-changes
//                                              [--html out.html]
//
//  ---- WHAT THIS GATE EXISTS TO CATCH ---------------------------------------
//  * A COUNT IS THE WRONG MEASURE HERE. Two occurrences must SURVIVE: the
//    "CED Ref" column header and the "Source: ... Effective Fall 2026" footnote,
//    both inside ek12-body, which ships display:none. A gate that just counted
//    would demand their removal and take the teacher's coverage table with them.
//    So the rule is expressed the way the house rule is written: zero in what a
//    reader sees, any number in what only a teacher opens.
//
//    That distinction cannot be made by reading markup. An earlier probe on this
//    page walked the DOM, filtered to leaf elements, and reported a painted EK
//    code as hidden because it sat in a div that also held a <strong>. This one
//    reads document.body.innerText in a real browser, which is the only thing
//    that answers the question actually being asked.
//
//  * THE FRAMING MENTION MUST STILL BE THERE. Removing every reference would
//    also satisfy "no CED in content", and would be wrong: a student is entitled
//    to know where the topic sits. The accordion header is that surface and the
//    gate asserts it survives.
//
//  * NOTHING GRADED MAY MOVE. This sheet touches an objectives bullet, a
//    warm-up, three table cells and an exit ticket. It touches no widget. Every
//    key is compared before against after and any change fails the build.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { chromium } = require('../smoke/node_modules/playwright');
const mod = require('../lib/cyber-u1-topic12-thin');
const gate0 = require('../lib/cyber-page-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

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

//  What a reader actually sees, from a real layout engine.
async function painted(body) {
  const browser = await chromium.launch({ executablePath: EXEC });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
      { waitUntil: 'domcontentloaded' });
    //  AWAITED, not returned. Returning the promise lets the finally block
    //  close the browser while evaluate is still pending, which fails with
    //  "Target page, context or browser has been closed" and reads like a
    //  Playwright problem rather than the ordinary try/finally bug it is.
    const r = await page.evaluate(() => ({
      text: document.body.innerText,
      feedbackVisible: [...document.querySelectorAll('.cfu-feedback')]
        .filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.id),
      coverageOpen: [...document.querySelectorAll('[id^="ek"][id$="-body"]')]
        .some((e) => getComputedStyle(e).display !== 'none'),
    }));
    return r;
  } finally {
    await browser.close();
  }
}

async function gate(before, after) {
  const fail = [];
  const note = [];

  const pb = await painted(before);
  const pa = await painted(after);

  // ---- 1. the rule, stated the way the house rule states it ----------------
  const seenBefore = (pb.text.match(/\bCED\b/g) || []).length;
  const seenAfter = (pa.text.match(/\bCED\b/g) || []).length;
  note.push(`"CED" in painted text: ${seenBefore} -> ${seenAfter}`);
  if (seenAfter) {
    for (const m of pa.text.matchAll(/[^.!?\n]{0,90}\bCED\b[^.!?\n]{0,90}/g)) {
      fail.push(`"CED" still reaches a reader: ${JSON.stringify(m[0].trim().slice(0, 120))}`);
    }
  }

  //  And the two that must survive, because they are the teacher's table.
  const srcAfter = (after.match(/\bCED\b/g) || []).length;
  note.push(`"CED" in source: ${(before.match(/\bCED\b/g) || []).length} -> ${srcAfter} `
    + '(the survivors are the coverage table, which ships collapsed)');
  if (srcAfter === 0) fail.push('the teacher coverage table lost its CED references entirely');

  // ---- 2. the framing mention has to survive -------------------------------
  //  Removing every reference would also pass check 1 and would be wrong.
  if (!/College Board Essential Knowledge Coverage/i.test(pa.text)) {
    fail.push('the coverage accordion header is gone, so nothing tells a student where this topic sits');
  } else {
    note.push('framing mention intact: the coverage accordion header');
  }
  if (pa.coverageOpen) fail.push('the coverage table is no longer collapsed');

  // ---- 3. nothing graded moved --------------------------------------------
  const keys = (b) => [...b.matchAll(/id="(cfu-\d+)"[^>]*data-answer="([A-E])"/g)]
    .map((m) => `${m[1]}=${m[2]}`).join(' ');
  if (keys(before) !== keys(after)) fail.push(`MCQ keys changed: ${keys(before)} -> ${keys(after)}`);
  else note.push(`MCQ keys unchanged: ${keys(after)}`);

  for (const [label, re] of [
    ['sequence order', /data-correct-order="([^"]+)"/g],
    ['match keys', /id="mr-(\d+-\d+)"[^>]*data-correct="([^"]+)"/g],
    ['dtb answers', /class="dtb-blank"[^>]*data-correct="([^"]+)"/g],
    ['dtb chips', /class="dtb-chip"[^>]*data-val="([^"]+)"/g],
  ]) {
    const g = (b) => [...b.matchAll(re)].map((m) => m.slice(1).join('=')).join(' ');
    if (g(before) !== g(after)) fail.push(`${label} changed: ${g(before)} -> ${g(after)}`);
  }
  note.push('sequence, match, dtb keys and chips all unchanged');

  // ---- 4. no answer becomes visible ---------------------------------------
  fail.push(...gate0.nothingUnhidden(before, after));
  if (pa.feedbackVisible.length) {
    fail.push(`CFU feedback painted on load: ${pa.feedbackVisible.join(', ')}`);
  }
  note.push(`feedback boxes painted on load: ${pa.feedbackVisible.length} (want 0)`);

  // ---- 5. structure, scripts, house rules ---------------------------------
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'table', 'tr', 'td', 'th', 'select', 'label', 'ol', 'li', 'p']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));
  fail.push(...gate0.unwiredSplices(fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'cyber-u1-topic12-thin.js'), 'utf8')));

  //  The second pass took every AP claim off this page. A thinning sheet is an
  //  easy place to put one back without noticing.
  const ASSERTS = /\b(?:is|are|remain|tend to be|will be)\s+(?:a\s+)?(?:high[- ]frequency|very\s+)?(?:common|frequent|typical|favou?rite)|\bfrequently\b|\bcommonly\b|\bhigh-frequency\b|\balways asks\b|\bspecifically tests\b|\bexam (?:signal|angle|tip)\b/i;
  for (const m of flat(after).matchAll(/[^.!?]{0,120}\b(?:AP )?exam[^.!?]{0,120}/gi)) {
    if (ASSERTS.test(m[0])) fail.push(`a claim about what the exam does: ${JSON.stringify(m[0].trim().slice(0, 90))}`);
  }

  // ---- 6. the sentences a human has to read -------------------------------
  const changed = gate0.changedSentences(before, after, flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail: fail.filter(Boolean), note, changed };
}

async function main() {
  const out = process.argv[2];
  const show = process.argv.includes('--show-changes');
  if (!out) {
    console.error('usage: node scripts/cyber-u1-topic12-thin-csv.js <out.csv> [--live page.json] --show-changes [--html f.html]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(mod.HANDLE, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: after, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved, ${before.length} -> ${after.length} bytes`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(7)}  -${String(r.removed).padStart(4)} +${String(r.html.length).padStart(4)}  ${r.name}`);
  }
  console.log('');

  const { fail, note, changed } = await gate(before, after);
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 200)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. This rewrites an exit ticket a');
    console.error('teacher grades; a passing gate says no widget moved, not that the copy is right.');
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

module.exports = { gate, flat, painted };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
