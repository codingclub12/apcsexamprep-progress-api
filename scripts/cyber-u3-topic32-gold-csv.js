#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  TOPIC 3.2 REBUILT TO THE UNIT 3 TEMPLATE: THE MATRIXIFY SHEET.
//
//  Fetches the live Topic 3.2 page, applies lib/cyber-u3-topic32-gold.js, runs
//  the gate, writes a one-row Matrixify pages sheet. Nothing here talks to the
//  Shopify Admin API: every page change on this site ships as a sheet a human
//  reads before importing.
//
//    node scripts/cyber-u3-topic32-gold-csv.js out/topic32.csv
//    node scripts/cyber-u3-topic32-gold-csv.js out/topic32.csv --live ./pages
//    node scripts/cyber-u3-topic32-gold-csv.js out/topic32.csv --html out/after.html
//
//  Matrixify column rules that have each cost a live page before:
//    Command MERGE, never blank         a blank Command creates a duplicate
//    Body HTML only when updating it    an empty Body HTML cell wipes the body
//    never a Published At column        setting it to now unpublishes the page
//    never open the sheet in Excel      it truncates cells at 32,767 chars
//
//  ---- THE GATE IS DIFFERENT FROM A SPLICE GATE ------------------------------
//  This build REBUILDS the body rather than editing it, so the failure mode is
//  not a splice that no-ops. It is a region that silently fails to make it into
//  the assembled page. The stylesheet, the unit rail, the collapsed coverage
//  table and 91 KB of protocol prose are all things a reader would not
//  immediately miss and all things whose loss would be permanent after import.
//  So the gate checks that each survives BY CONTENT, not by presence of a tag.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const T = require('../lib/cyber-u3-topic32-gold');
const ek = require('../lib/cyber-ek-density');

const BASE = 'https://www.apcsexamprep.com/pages';

//  Cloudflare serves an interstitial with HTTP 200 to a bare container request,
//  so the body looks fetched and is HTML. These four headers together get JSON.
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
  if (!text.startsWith('{')) throw new Error(`${handle}: not JSON, probably a Cloudflare interstitial`);
  return JSON.parse(text).page;
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const count = (s, re) => (s.match(re) || []).length;
const flat = (s) => s.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

function visibleCitations(b) {
  const skip = [];
  for (const m of b.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)) skip.push([m.index, m.index + m[0].length]);
  return ek.citations(b).citations
    .filter((x) => !x.protectedBy && !skip.some(([a, z]) => a <= x.index && x.index < z));
}

function gate(before, after) {
  const fail = [];
  const note = [];

  // ---- 1. nothing may be lost -------------------------------------------
  note.push(`bytes: ${before.length} -> ${after.length} (+${after.length - before.length})`);
  if (after.length <= before.length) fail.push(`body shrank: ${before.length} -> ${after.length}`);

  //  The stylesheet and the unit rail are carried through verbatim. A rebuild
  //  that dropped either would render as unstyled text or lose the navigation,
  //  and both are large enough that a byte comparison is a real check.
  const styleOf = (s) => (s.match(/<style>[\s\S]*?<\/style>/g) || []).join('');
  if (styleOf(before) !== styleOf(after)) fail.push('the stylesheet changed');
  else note.push(`stylesheet carried through byte-identical (${styleOf(after).length} bytes)`);

  const railOf = (s) => {
    const a = s.indexOf('<div id="ucnav">');
    const b = s.indexOf('</script>', a);
    return a === -1 ? '' : s.slice(a, b);
  };
  if (!railOf(after) || railOf(before) !== railOf(after)) fail.push('the unit rail changed or is missing');
  else note.push('unit rail carried through byte-identical');

  //  91 KB of protocol prose moves to the appendix. Check by CONTENT: every
  //  distinctive sentence from the original teaching body must still be found.
  const PROSE_PROBES = [
    'Many foundational internet protocols were designed',
    'SSL Stripping and HSTS',
    'SSH and SFTP',
    'DNSSEC: Authenticating DNS Responses',
    'Certificate Authorities and the PKI Trust Model',
    'Protocol Migration Best Practices',
  ];
  const missing = PROSE_PROBES.filter((p) => !after.includes(p));
  if (missing.length) fail.push(`protocol prose lost: ${missing.join(' | ')}`);
  else note.push(`all ${PROSE_PROBES.length} protocol prose probes still present (moved to appendix)`);
  if (!after.includes('id="apx-body"')) fail.push('appendix panel missing');

  // ---- 2. tag balance ----------------------------------------------------
  for (const tag of ['div', 'p', 'ul', 'li', 'table', 'tr', 'td', 'th', 'h2', 'h3', 'h4', 'select', 'label']) {
    const b = count(before, new RegExp(`<${tag}\\b`, 'g')) - count(before, new RegExp(`</${tag}>`, 'g'));
    const a = count(after, new RegExp(`<${tag}\\b`, 'g')) - count(after, new RegExp(`</${tag}>`, 'g'));
    if (a !== b) fail.push(`<${tag}> balance changed: ${b} -> ${a}`);
  }
  note.push('tag balance unchanged on every tag counted');

  // ---- 3. the template shape --------------------------------------------
  const secs = [...after.matchAll(/<h2>\s*<span class="section-icon">([^<]*)<\/span>([\s\S]*?)<\/h2>/g)];
  note.push(`icon sections: ${secs.length}`);
  if (secs.length !== 13) fail.push(`expected 13 icon sections, found ${secs.length}`);
  const numbered = secs.filter((m) => /^\d+$/.test(m[1])).map((m) => Number(m[1]));
  if (numbered.length !== 10 || !numbered.every((n, i) => n === i + 1)) {
    fail.push(`numbered icons are not 1..10 in order: ${numbered.join(',')}`);
  }
  const icons = secs.map((m) => m[1]);
  for (const want of ['?', '!', '+']) {
    if (!icons.includes(want)) fail.push(`missing the "${want}" section`);
  }
  const titles = secs.map((m) => flat(m[2]));
  for (const want of ['Learning Objectives', 'Essential Vocabulary', 'Real-World Case Studies',
    'Worked Examples', 'AP Exam Strategy', 'Frequently Asked Questions',
    'Common AP Exam Mistakes', 'Continue Learning']) {
    if (!titles.some((t) => t.includes(want))) fail.push(`template section missing: ${want}`);
  }
  //  Every numbered heading must read 3.2.N and agree with its icon.
  secs.filter((m) => /^\d+$/.test(m[1])).forEach((m) => {
    if (!flat(m[2]).startsWith(`3.2.${m[1]} `)) {
      fail.push(`icon ${m[1]} heads "${flat(m[2]).slice(0, 40)}"`);
    }
  });

  //  Component counts, against the range measured across the five siblings.
  const RANGE = {
    'case-block': [3, 3], 'ex-block': [2, 2], 'strat-card': [4, 4],
    'faq-item': [6, 6], 'related-link': [8, 8], 'obj-list': [1, 1],
  };
  for (const [cls, [lo, hi]] of Object.entries(RANGE)) {
    const n = count(after, new RegExp(`class="${cls}"`, 'g'));
    note.push(`${cls}: ${n} (siblings ${lo === hi ? lo : `${lo}-${hi}`})`);
    if (n < lo || n > hi) fail.push(`${cls} count ${n} is outside the sibling range ${lo}-${hi}`);
  }
  const vtf = count(after, /<table class="vocab-table-full"/g);
  note.push(`vocab-table-full tables: ${vtf} (siblings 3-6)`);
  if (vtf < 3 || vtf > 6) fail.push(`vocab-table-full count ${vtf} outside sibling range 3-6`);

  // ---- 4. the checks -----------------------------------------------------
  const blocks = [...after.matchAll(
    /<div class="cfu-block" id="cfu-(\d+)" data-type="([^"]+)" data-num="(\d+)" data-answer="([^"]*)"/g)];
  note.push(`checks: ${count(before, /class="cfu-block"/g)} -> ${blocks.length}`);
  if (blocks.length !== T.TOTAL_CFUS) fail.push(`expected ${T.TOTAL_CFUS} checks, found ${blocks.length}`);
  const nums = blocks.map((m) => Number(m[3]));
  if (new Set(nums).size !== nums.length) fail.push(`duplicate data-num among ${nums.join(',')}`);
  if (!nums.every((n, i) => n === i + 1)) fail.push(`checks are not 1..n: ${nums.join(',')}`);
  for (const m of blocks) {
    if (m[1] !== m[3]) fail.push(`check id ${m[1]} disagrees with data-num ${m[3]}`);
    if (!m[4]) fail.push(`check ${m[1]} has an empty answer key`);
    if (!after.includes(`id="cfu-fb-${m[1]}"`)) fail.push(`check ${m[1]} has no feedback element`);
  }
  const total = /var cfuState = \{ score: 0, total: (\d+),/.exec(after);
  if (!total) fail.push('cfuState total not found');
  else if (Number(total[1]) !== blocks.length) {
    fail.push(`cfuState total ${total[1]} but ${blocks.length} checks on the page`);
  }
  //  A key naming an option that is not on the page can never be answered.
  const blockOf = (n) => {
    const s = after.indexOf(`<div class="cfu-block" id="cfu-${n}"`);
    const e = after.indexOf('<div class="cfu-block" id="cfu-', s + 1);
    return after.slice(s, e === -1 ? after.indexOf('</div>\n</div>', s) + 200 : e);
  };
  for (const m of blocks) {
    const blk = blockOf(m[1]);
    if (m[2] === 'mcq') {
      const opts = [...blk.matchAll(/class="cfu-opt" data-val="([A-E])"/g)].map((x) => x[1]);
      const wrongs = [...blk.matchAll(/class="cfu-fb-wrong" data-a="([A-E])"/g)].map((x) => x[1]);
      if (!opts.includes(m[4])) fail.push(`check ${m[1]}: key ${m[4]} is not among options [${opts.join('')}]`);
      if (wrongs.includes(m[4])) fail.push(`check ${m[1]}: the correct option has wrong-answer feedback`);
      const gap = opts.filter((o) => o !== m[4] && !wrongs.includes(o));
      if (gap.length) fail.push(`check ${m[1]}: distractors without feedback: ${gap.join('')}`);
    }
    if (m[2] === 'matching') {
      const rows = count(blk.slice(0, blk.indexOf('cfu-feedback')), /class="cfu-match-row"/g);
      if (rows !== m[4].split(',').length) {
        fail.push(`check ${m[1]}: ${rows} rows but ${m[4].split(',').length} answers`);
      }
    }
    if (m[2] === 'checkbox') {
      const boxes = [...blk.matchAll(/class="cfu-cb" id="[^"]+" value="([A-E])"/g)].map((x) => x[1]);
      const bad = m[4].split(',').filter((k) => !boxes.includes(k));
      if (bad.length) fail.push(`check ${m[1]}: key names absent choices ${bad.join('')}`);
    }
  }
  note.push('every check is well formed and answerable');

  // ---- 5. house rules ----------------------------------------------------
  const vb = visibleCitations(before).length;
  const va = visibleCitations(after);
  note.push(`student-visible EK codes: ${vb} -> ${va.length}`);
  if (va.length) fail.push(`${va.length} EK code(s) visible to students: ${va.map((x) => x.text).join(', ')}`);
  const s = ek.summary(after);
  note.push(`protected citations kept: ${s.kept} (${Object.entries(s.byLabel).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  if (s.unbalanced.length) fail.push(`unbalanced protected block: ${s.unbalanced.join(', ')}`);
  if ((s.byLabel['EK coverage table'] || 0) !== 8) {
    fail.push(`coverage table should carry all 8 codes, has ${s.byLabel['EK coverage table'] || 0}`);
  }
  for (const cell of T.COVERED_IN) {
    if (!after.includes(`<td>${cell}</td>`)) fail.push(`coverage cell missing: ${cell}`);
    const sec = /3\.2\.\d+/.exec(cell)[0];
    if (!new RegExp(`<span class="section-icon">\\d+</span>${sec.replace(/\./g, '\\.')} `).test(after)) {
      fail.push(`coverage table names ${sec}, which is not a section on the page`);
    }
  }
  note.push('every section the coverage table names exists on the page');

  //  The three widgets every sibling carries. Their CSS was already in 3.2's
  //  stylesheet; only the markup was missing, which is why nothing looked
  //  broken and the score simply never appeared.
  for (const id of ['cfu-score-tracker', 'cfu-score-num', 'apcyber-progress-bar', 'apcyber-back-top']) {
    if (!after.includes(`id="${id}"`)) fail(`page widget missing: ${id}`);
  }
  const trackerInit = /id="cfu-score-num"[^>]*>0 \/ (\d+)</.exec(after);
  if (!trackerInit) fail('score tracker has no initial value');
  else if (Number(trackerInit[1]) !== T.TOTAL_CFUS) {
    fail(`tracker starts at 0 / ${trackerInit[1]} but there are ${T.TOTAL_CFUS} checks`);
  } else note.push(`score tracker present and starts at 0 / ${trackerInit[1]}`);

  // ---- 6. the body's old home --------------------------------------------
  const hero = after.indexOf('<div class="exhero"');
  const stale = [...after.matchAll(/lesson-6/g)].filter((m) => m.index > hero);
  if (stale.length) fail.push(`${stale.length} stale lesson-6 reference(s) after the rail`);
  else note.push('footer nav, breadcrumb and related links point at lesson-3');
  if (!after.includes('Topic 3.2: Network Security Policies')) fail.push('H1 was not renamed');

  return { fail, note };
}

async function main() {
  const args = process.argv.slice(2);
  const out = args[0];
  if (!out) {
    console.error('usage: node scripts/cyber-u3-topic32-gold-csv.js <out.csv> [--live <dir>] [--html <file>]');
    process.exit(2);
  }
  const liveDir = args.includes('--live') ? args[args.indexOf('--live') + 1] : null;
  const htmlOut = args.includes('--html') ? args[args.indexOf('--html') + 1] : null;

  const page = liveDir
    ? JSON.parse(fs.readFileSync(path.join(liveDir, `${T.HANDLE}.json`), 'utf8')).page
    : await fetchPage(T.HANDLE);

  if (String(page.id) !== T.PAGE_ID) {
    console.error(`\nREFUSING: live id ${page.id} is not the expected ${T.PAGE_ID}.`);
    process.exit(1);
  }
  if (page.handle !== T.HANDLE) {
    console.error(`\nREFUSING: fetched handle ${page.handle}, expected ${T.HANDLE}.`);
    process.exit(1);
  }
  console.log(`source: ${page.handle}  id=${page.id}  ${page.body_html.length} bytes  updated ${page.updated_at}`);

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

  const csv = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [page.id, page.handle, T.TITLE, body, 'MERGE'].map(csvCell).join(','),
  ].join('\n');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${csv}\n`, 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log('gate clean. Import in MERGE mode; do not open in Excel.');
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
