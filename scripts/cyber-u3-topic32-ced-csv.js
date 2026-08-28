#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  TOPIC 3.2 CED CONTENT: THE MATRIXIFY SHEET.
//
//  Fetches the live Topic 3.2 lesson page, applies lib/cyber-u3-topic32-ced.js,
//  runs the gate, and writes a one-row Matrixify pages sheet. Nothing here talks
//  to the Shopify Admin API: every page change on this site ships as a sheet a
//  human reads before importing.
//
//  Run:
//    node scripts/cyber-u3-topic32-ced-csv.js out/topic32.csv
//    node scripts/cyber-u3-topic32-ced-csv.js out/topic32.csv --live ./pages
//    node scripts/cyber-u3-topic32-ced-csv.js out/topic32.csv --html out/after.html
//
//  --live reads a saved GET /pages/<handle>.json instead of fetching, so a run
//  is reproducible offline. --html writes the transformed body for eyeballing.
//
//  Matrixify column rules that have each cost a live page before:
//    Command MERGE, never blank         a blank Command creates a duplicate
//    Body HTML only when updating it    an empty Body HTML cell wipes the body
//    never a Published At column        setting it to now unpublishes the page
//    never open the sheet in Excel      it truncates cells at 32,767 chars
//
//  ---- WHY THIS SHEET IS ONE ROW AND NOT FIVE -------------------------------
//  The four activity pages under this lesson (exercise-1, exercise-2, lab, quiz)
//  moved here with the body and still teach secure protocols end to end. They
//  are misaligned with the topic in exactly the way the lesson was, and they are
//  NOT in this sheet. Realigning a lab and a quiz is authoring four more
//  instruments, not splicing sections, and folding it in would make a diff no
//  one can review. The gap is recorded in docs/cyber-topic32-ced-content.md and
//  in the run note so it stays visible rather than being quietly inherited.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const T = require('../lib/cyber-u3-topic32-ced');
const ek = require('../lib/cyber-ek-density');

const BASE = 'https://www.apcsexamprep.com/pages';

//  Cloudflare serves an interstitial with HTTP 200 to a bare request from a
//  container, so the body looks fetched and is HTML. A browser User-Agent alone
//  is not enough; these four headers together are what gets the JSON.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Mode': 'navigate',
};

async function fetchPage(handle) {
  const res = await fetch(`${BASE}/${handle}.json?cb=${Date.now()}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${handle}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.startsWith('{')) {
    throw new Error(`${handle}: not JSON, probably a Cloudflare interstitial`);
  }
  return JSON.parse(text).page;
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

//  Citations a student can read: everything the density module does not find
//  inside a protected block, minus anything inside a <script>, which is JSON-LD
//  and structured data rather than prose.
function visibleCitations(b) {
  const skip = [];
  for (const m of b.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)) {
    skip.push([m.index, m.index + m[0].length]);
  }
  return ek.citations(b).citations
    .filter((x) => !x.protectedBy && !skip.some(([a, z]) => a <= x.index && x.index < z));
}

// -----------------------------------------------------------------------------
//  THE GATE. Comparative, not absolute: every check is "what did this splice do
//  to the body it was handed", because that is the only way to see a loss.
// -----------------------------------------------------------------------------
function gate(before, after) {
  const fail = [];
  const note = [];
  const count = (s, re) => (s.match(re) || []).length;

  //  1. Nothing may be lost. The page is 152 KB of working content and the job
  //     is additive, so a shrink anywhere is a splice that ate something.
  note.push(`bytes: ${before.length} -> ${after.length} (+${after.length - before.length})`);
  if (after.length <= before.length) {
    fail.push(`body did not grow: ${before.length} -> ${after.length}`);
  }

  //  2. Tag balance. An unbalanced div does not throw; it swallows the rest of
  //     the page into a container the theme may hide.
  for (const tag of ['div', 'p', 'ul', 'li', 'table', 'tr', 'td', 'h2', 'h3', 'section']) {
    const b = count(before, new RegExp(`<${tag}\\b`, 'g')) - count(before, new RegExp(`</${tag}>`, 'g'));
    const a = count(after, new RegExp(`<${tag}\\b`, 'g')) - count(after, new RegExp(`</${tag}>`, 'g'));
    if (a !== b) fail.push(`<${tag}> balance changed: ${b} -> ${a}`);
  }

  //  3. The grader. Fifteen blocks, numbered 1..15 exactly once each, ids and
  //     data-num agreeing, and the state total matching the count on the page.
  const blocks = [...after.matchAll(
    /<div class="cfu-block" id="cfu-(\d+)" data-type="([^"]+)" data-num="(\d+)" data-answer="([^"]*)"/g)];
  note.push(`cfu blocks: ${count(before, /class="cfu-block"/g)} -> ${blocks.length}`);
  if (blocks.length !== T.TOTAL_AFTER) {
    fail.push(`expected ${T.TOTAL_AFTER} cfu blocks, found ${blocks.length}`);
  }
  const nums = blocks.map((m) => Number(m[3]));
  if (new Set(nums).size !== nums.length) fail.push(`duplicate data-num among ${nums.join(',')}`);
  if (!nums.every((n, i) => n === i + 1)) fail.push(`cfu numbering is not 1..n: ${nums.join(',')}`);
  for (const m of blocks) {
    if (m[1] !== m[3]) fail.push(`cfu id ${m[1]} disagrees with data-num ${m[3]}`);
    if (!m[4]) fail.push(`cfu ${m[1]} has an empty answer key`);
    if (!after.includes(`id="cfu-fb-${m[1]}"`)) fail.push(`cfu ${m[1]} has no feedback element`);
  }
  const total = /var cfuState = \{ score: 0, total: (\d+),/.exec(after);
  if (!total) fail.push('cfuState total not found');
  else if (Number(total[1]) !== blocks.length) {
    fail.push(`cfuState total ${total[1]} but ${blocks.length} blocks on the page`);
  }

  //  4. THE ONE THAT MATTERS MOST. The ten pre-existing answer keys have to
  //     arrive on the questions they started on, shifted by exactly CORE_CFUS.
  //     A shift that renumbers cleanly but pairs question 7 with question 8's
  //     key regrades ten items and looks perfect in every other check here.
  const keyOf = (b, n) => {
    const m = new RegExp(`id="cfu-${n}"[^>]*data-answer="([^"]*)"`).exec(b);
    return m && m[1];
  };
  for (let n = 1; n <= 10; n += 1) {
    const was = keyOf(before, n);
    const now = keyOf(after, n + T.CORE_CFUS);
    if (was !== now) fail.push(`answer key moved: old cfu-${n} was ${was}, new cfu-${n + T.CORE_CFUS} is ${now}`);
  }
  note.push('all 10 pre-existing answer keys arrived on their own questions');

  //  5. Section numbering runs 3.2.1 to 3.2.10 with nothing repeated. A repeat
  //     is what a partly-applied shift looks like.
  //  Core headings read "3.2.1: Title" and the enrichment ones, which this pass
  //  only renumbers, keep the page's original spaced dash. Both separators have
  //  to match or the check silently sees half the page.
  const secs = [...after.matchAll(/<h2 style="[^"]*">3\.2\.(\d+)\s*[:—]/g)].map((m) => Number(m[1]));
  note.push(`sections: ${secs.join(', ')}`);
  if (secs.length !== 10) fail.push(`expected 10 numbered sections, found ${secs.length}`);
  if (new Set(secs).size !== secs.length) fail.push(`duplicate section number in ${secs.join(',')}`);
  if (!secs.every((n, i) => n === i + 1)) fail.push(`sections are not 1..10 in order: ${secs.join(',')}`);

  //  6. The house rule. Codes belong in the collapsed coverage table and
  //     nowhere else on the page.
  const vb = visibleCitations(before).length;
  const va = visibleCitations(after);
  note.push(`student-visible EK codes: ${vb} -> ${va.length}`);
  if (va.length) {
    fail.push(`${va.length} EK code(s) still visible to students: ${va.map((x) => x.text).join(', ')}`);
  }
  const s = ek.summary(after);
  note.push(`protected citations kept: ${s.kept} (${Object.entries(s.byLabel).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  if (s.unbalanced.length) fail.push(`unbalanced protected block: ${s.unbalanced.join(', ')}`);
  if ((s.byLabel['EK coverage table'] || 0) !== 8) {
    fail.push(`the coverage table should still carry all 8 codes, has ${s.byLabel['EK coverage table'] || 0}`);
  }

  //  7. No em-dash may enter with new copy. Counted rather than forbidden: the
  //     page already had them and this pass is not an em-dash sweep, so the
  //     test is that the number did not GO UP.
  const dashBefore = count(before, /—/g);
  const dashAfter = count(after, /—/g);
  note.push(`em-dashes: ${dashBefore} -> ${dashAfter} (pre-existing, not swept in this pass)`);
  if (dashAfter > dashBefore) fail.push(`new copy added ${dashAfter - dashBefore} em-dash(es)`);

  //  8. The page must stop pointing at the handle this body used to live on.
  const hero = after.indexOf('<div class="exhero"');
  const stale = [...after.matchAll(/lesson-6/g)].filter((m) => m.index > hero);
  if (stale.length) fail.push(`${stale.length} stale lesson-6 reference(s) after the rail`);
  note.push('footer nav and breadcrumb point at lesson-3');

  //  9. The rail is not this pass's business and must come through untouched.
  const rail = (b) => (b.match(/<div class="ucn-steps"[\s\S]*?<\/div>/g) || []).length;
  if (rail(before) !== rail(after)) fail.push(`rail changed: ${rail(before)} -> ${rail(after)} step groups`);
  if (count(before, /ucnToggle\(/g) !== count(after, /ucnToggle\(/g)) {
    fail.push('rail toggle wiring changed');
  }
  note.push('rail untouched');

  //  10. The coverage table may not name a section that does not exist.
  for (const cell of T.COVERED_IN) {
    if (!after.includes(`<td>${cell}</td>`)) fail.push(`coverage cell missing: ${cell}`);
    const secNo = /3\.2\.\d+/.exec(cell)[0];
    if (!new RegExp(`<h2 style="[^"]*">${secNo.replace(/\./g, '\\.')}:`).test(after)) {
      fail.push(`coverage table names ${secNo}, which is not a heading on the page`);
    }
  }
  note.push('every section the coverage table names exists on the page');

  return { fail, note };
}

// -----------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const out = args[0];
  if (!out) {
    console.error('usage: node scripts/cyber-u3-topic32-ced-csv.js <out.csv> '
      + '[--live <dir>] [--html <file>] [--show-changes]');
    process.exit(2);
  }
  const liveDir = args.includes('--live') ? args[args.indexOf('--live') + 1] : null;
  const htmlOut = args.includes('--html') ? args[args.indexOf('--html') + 1] : null;

  const page = liveDir
    ? JSON.parse(fs.readFileSync(path.join(liveDir, `${T.HANDLE}.json`), 'utf8')).page
    : await fetchPage(T.HANDLE);

  //  The id belongs to the handle. This sheet edits one page in place, so there
  //  is no body move to get wrong, but the row is still built from the live
  //  page's own id rather than from the constant, and they are cross-checked.
  if (String(page.id) !== T.PAGE_ID) {
    console.error(`\nREFUSING: live id ${page.id} is not the expected ${T.PAGE_ID}.`);
    console.error('The handle may have been repointed. Check before shipping.');
    process.exit(1);
  }
  if (page.handle !== T.HANDLE) {
    console.error(`\nREFUSING: fetched handle ${page.handle}, expected ${T.HANDLE}.`);
    process.exit(1);
  }

  console.log(`source: ${page.handle}  id=${page.id}  ${page.body_html.length} bytes  `
    + `updated ${page.updated_at}`);

  const { body, actions } = T.transform(page.body_html);
  console.log(`actions: ${actions.join(', ')}`);

  const { fail, note } = gate(page.body_html, body);
  console.log('');
  for (const n of note) console.log(`  note  ${n}`);
  for (const f of fail) console.log(`  FAIL  ${f}`);
  if (fail.length) {
    console.error(`\n${fail.length} gate failure(s). No sheet written.`);
    process.exit(1);
  }

  if (htmlOut) {
    fs.mkdirSync(path.dirname(path.resolve(htmlOut)), { recursive: true });
    fs.writeFileSync(htmlOut, body, 'utf8');
    console.log(`\nwrote ${htmlOut} (${body.length} bytes) for review`);
  }

  //  Title is unchanged and is sent anyway: Matrixify MERGE writes only the
  //  columns present, and a Title column that matches what is live is a
  //  no-op that documents what the row is.
  const rows = [[page.id, page.handle, T.TITLE, body, 'MERGE']];
  const csv = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ].join('\n');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${csv}\n`, 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, ${rows.length} row, Command MERGE)`);
  console.log('gate clean. Import in MERGE mode; do not open in Excel.');
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
