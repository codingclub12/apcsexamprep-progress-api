#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBER UNIT 1, WO-3: THE TOPIC 1.1 MATRIXIFY SHEET.
//
//  Fetches the live page body, applies lib/cyber-u1-topic11-ced.js, runs the
//  gate, and writes a one-row Matrixify pages sheet. Nothing here talks to the
//  Shopify Admin API: every page change on this site ships as a sheet a human
//  reads before importing.
//
//  Run:
//    node scripts/cyber-u1-topic11-ced-csv.js out/wo3-topic11.csv
//    node scripts/cyber-u1-topic11-ced-csv.js out/wo3-topic11.csv --live pages/x.json
//
//  --live reads a saved GET /pages/<handle>.json instead of fetching, so a run
//  is reproducible and reviewable offline.
//
//  ── WHY THE GATE IS IN HERE AND NOT ONLY IN validate_csv.py ─────────────────
//  The python gate reads the finished sheet and cannot know what the page said
//  before. These checks compare against the live body: same wrapper, same nav,
//  no lost script or style block, the whole preserved preamble byte for byte.
//  A sheet that passes validate_csv.py can still have quietly dropped the
//  sticky #ucnav rail; this catches that. Both gates run, and both must pass.
//
//  Matrixify column rules that have each cost a live page before:
//    Command MERGE, never blank         a blank Command creates a duplicate
//    Body HTML only when updating it    an empty Body HTML cell wipes the body
//    never a Published At column        setting it to now unpublishes the page
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const ced = require('../lib/cyber-u1-topic11-ced');

const LIVE_URL = `https://www.apcsexamprep.com/pages/${ced.HANDLE}.json`;

//  Exact-match terms with ZERO occurrences in the CED effective Fall 2026.
//  These are NOT auto-failed. A rewritten page may name them while telling
//  students they are not assessed, which is what section 1.1.4 now does. The
//  gate reports every hit with its surrounding text so a human confirms each
//  one is explanatory rather than something a student is asked to learn.
const OFF_CED = [
  'spear phishing', 'spear-phishing', 'vishing', 'smishing', 'whaling', 'baiting',
  'quid pro quo', 'tailgating', 'shoulder surf', 'dumpster div', 'watering hole',
  'credential stuffing', 'password spraying', 'brute force', 'rainbow table',
  'keylogger', 'deepfake', 'honeypot', 'man-in-the-middle', 'rogue access point',
  'business email compromise',
];

//  Present in the CED but owned by Topic 2.1. Same rule: naming one while
//  saying where it belongs is fine, teaching it as Topic 1.1 content is not.
const WRONG_UNIT = {
  pretexting: '2.1.A.2', authority: '2.1.A.3', consensus: '2.1.A.5',
  scarcity: '2.1.A.6', familiarity: '2.1.A.7', 'script kiddie': '2.1.B.1',
  hacktivist: '2.1.B.2',
};

//  Every Essential Knowledge statement in CED Topic 1.1. The rebuilt page has
//  to cite all of them; 1.1.B.1 was the one the old page missed.
const REQUIRED_EK = [
  '1.1.A.1', '1.1.A.2', '1.1.B.1', '1.1.B.2', '1.1.B.3',
  '1.1.C.1', '1.1.C.2', '1.1.C.3',
];

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function visibleText(html) {
  const noCode = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return noCode.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function countTag(html, tag) {
  const open = (html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  return { open, close };
}

async function readLive(file) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8')).page;
  const res = await fetch(`${LIVE_URL}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`GET ${LIVE_URL} returned ${res.status}`);
  return (await res.json()).page;
}

// ── the gate ─────────────────────────────────────────────────────────────────
function gate(before, after, resolved) {
  const fail = [];
  const warn = [];
  const note = [];

  // 1. structural balance, counted with comments stripped. The naive count is
  //    what makes the CURRENT live page look broken: it contains a commented
  //    out <div class="attack-block" id="atk-phishing">, which is not markup.
  const clean = stripComments(after);
  for (const tag of ['div', 'style', 'script']) {
    const { open, close } = countTag(clean, tag);
    if (open !== close) fail.push(`<${tag}> unbalanced: ${open} open, ${close} close`);
  }

  // 2. the preamble has to survive byte for byte. Everything above the wrapper
  //    is the sticky rail, its script and the page CSS, and none of it is ours.
  const WRAPPER = '<div id="apcyber-wrapper" data-lesson-id="1.1">';
  const beforeHead = before.slice(0, before.indexOf(WRAPPER));
  const afterHead = after.slice(0, after.indexOf(WRAPPER));
  const jsonldStart = beforeHead.indexOf('<script type="application/ld+json">');
  const jsonldEnd = beforeHead.indexOf('</script>', jsonldStart) + '</script>'.length;
  const stripLd = (s, a, z) => s.slice(0, a) + s.slice(z);
  const afterLdEnd = afterHead.indexOf('</script>', afterHead.indexOf('<script type="application/ld+json">')) + '</script>'.length;
  if (stripLd(beforeHead, jsonldStart, jsonldEnd) !== stripLd(afterHead, jsonldStart, afterLdEnd)) {
    fail.push('the preamble above #apcyber-wrapper changed outside the JSON-LD block');
  }

  // 3. things whose absence breaks the page rather than the lesson
  const mustKeep = [
    ['id="ucnav"', 'the sticky unit nav rail'],
    [WRAPPER, 'the lesson wrapper and its data-lesson-id'],
    ['id="cfu-score-tracker"', 'the CFU score tracker'],
    ['<!--APCYBER-LESSON-NAV-START-->', 'the lesson nav strip open marker'],
    ['<!--APCYBER-LESSON-NAV-END-->', 'the lesson nav strip close marker'],
    ['</div><!-- close #apcyber-wrapper -->', 'the wrapper close'],
    ['window.cfuSubmitMCQ', 'the CFU grading script'],
    ['id="section-faq"', 'the FAQ section anchor'],
  ];
  for (const [needle, why] of mustKeep) {
    if (!after.includes(needle)) fail.push(`lost ${why} (${needle})`);
  }

  // 4. the ten CFU widgets, their types, and the MCQ key balance
  const blocks = [...after.matchAll(/<div class="cfu-block[^"]*" id="cfu-(\d+)"([^>]*)>/g)];
  if (blocks.length !== 10) fail.push(`expected 10 cfu blocks, found ${blocks.length}`);
  const seen = new Set(blocks.map((m) => Number(m[1])));
  for (let n = 1; n <= 10; n++) if (!seen.has(n)) fail.push(`cfu-${n} is missing`);
  for (const m of blocks) {
    const num = m[1];
    const attrs = m[2];
    const type = (attrs.match(/data-type="([a-z]+)"/) || [])[1];
    if (!type) fail.push(`cfu-${num} has no data-type`);
    if (!attrs.includes(`data-num="${num}"`)) fail.push(`cfu-${num} data-num does not match its id`);
    if (!after.includes(`id="cfu-${num}-feedback"`)) fail.push(`cfu-${num} has no feedback block`);
    if (!after.includes(`id="cfu-${num}-btn"`)) fail.push(`cfu-${num} has no submit button`);
    if (type === 'mcq' && !attrs.includes('data-answer=')) fail.push(`cfu-${num} is an mcq with no data-answer`);
  }

  const keys = blocks
    .filter((m) => m[2].includes('data-type="mcq"'))
    .map((m) => (m[2].match(/data-answer="([A-D])"/) || [])[1]);
  if (keys.some((k) => !k)) fail.push('an mcq has an unreadable data-answer');
  const tally = {};
  for (const k of keys) tally[k] = (tally[k] || 0) + 1;
  const worst = Math.max(0, ...Object.values(tally));
  if (keys.length && worst / keys.length > 0.35) {
    fail.push(`mcq key balance: ${JSON.stringify(tally)} puts one letter above 35%`);
  }
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    run = keys[i] === keys[i - 1] ? run + 1 : 1;
    if (run >= 3) fail.push(`three consecutive mcq keys are ${keys[i]}`);
  }
  note.push(`mcq keys in order: ${keys.join(', ')}`);

  // matching, cloze and sort widgets grade by comparing data attributes, so a
  // key that names a bucket no bucket declares silently marks everyone wrong
  for (const m of [...after.matchAll(/id="match-(\d+)-left"/g)]) {
    const num = m[1];
    const section = after.slice(after.indexOf(`id="match-${num}-left"`), after.indexOf(`id="cfu-${num}-btn"`));
    const left = [...section.matchAll(/id="match-\d+-left"[\s\S]*?(?=id="match-\d+-right")/g)];
    const leftKeys = [...(left[0] ? left[0][0] : '').matchAll(/data-match-key="([^"]+)"/g)].map((x) => x[1]);
    const rightKeys = [...section.slice(section.indexOf(`id="match-${num}-right"`)).matchAll(/data-match-key="([^"]+)"/g)].map((x) => x[1]);
    if (new Set(leftKeys).size !== leftKeys.length) fail.push(`cfu-${num} matching: duplicate key on the left, every pair must be distinct`);
    if (leftKeys.length !== rightKeys.length) fail.push(`cfu-${num} matching: ${leftKeys.length} left items against ${rightKeys.length} right items`);
    for (const k of leftKeys) if (!rightKeys.includes(k)) fail.push(`cfu-${num} matching: left key ${k} has no scenario`);
    for (const k of rightKeys) if (!leftKeys.includes(k)) fail.push(`cfu-${num} matching: scenario key ${k} has no classification`);
  }
  for (const m of [...after.matchAll(/id="sort-(\d+)-cards"/g)]) {
    const num = m[1];
    const bucketsHtml = after.slice(after.indexOf(`id="sort-${num}-buckets"`), after.indexOf(`id="sort-${num}-cards"`));
    const buckets = [...bucketsHtml.matchAll(/data-bucket="([^"]+)"/g)].map((x) => x[1]);
    const cardsHtml = after.slice(after.indexOf(`id="sort-${num}-cards"`), after.indexOf(`id="cfu-${num}-btn"`));
    for (const c of [...cardsHtml.matchAll(/data-correct="([^"]+)"/g)].map((x) => x[1])) {
      if (!buckets.includes(c)) fail.push(`cfu-${num} sort: card answer ${JSON.stringify(c)} names no bucket`);
    }
  }
  for (const m of [...after.matchAll(/id="cloze-(\d+)-passage"/g)]) {
    const num = m[1];
    const passage = after.slice(after.indexOf(`id="cloze-${num}-passage"`), after.indexOf(`id="cloze-${num}-bank"`));
    const bank = after.slice(after.indexOf(`id="cloze-${num}-bank"`), after.indexOf(`id="cfu-${num}-btn"`));
    const chips = [...bank.matchAll(/data-chip="([^"]+)"/g)].map((x) => x[1]);
    for (const a of [...passage.matchAll(/data-answer="([^"]+)"/g)].map((x) => x[1])) {
      if (!chips.includes(a)) fail.push(`cfu-${num} cloze: answer ${JSON.stringify(a)} is not in the word bank`);
    }
  }

  // 5. the eight jump links in the enrichment grid. They were dead on the live
  //    page: the ids were left as a TODO comment and never applied.
  for (const id of ced.ATTACK_ANCHOR_IDS) {
    if (after.includes(`href="#${id}"`) && !after.includes(`id="${id}"`)) {
      fail.push(`jump link #${id} has no target`);
    }
  }

  // 6. CED coverage
  for (const ek of REQUIRED_EK) if (!after.includes(ek)) fail.push(`no reference to EK ${ek}`);

  // 7. house rules on new copy
  const text = visibleText(after);
  if (/all of the above|none of the above/i.test(text)) fail.push('an option says all/none of the above');
  //  \u2014 written as an escape so this file stays free of the character it
  //  is counting, per repo convention.
  const emdash = (after.match(/\u2014/g) || []).length;
  const beforeEmdash = (before.match(/\u2014/g) || []).length;
  if (emdash) note.push(`em-dashes remaining in preserved copy: ${emdash} (was ${beforeEmdash})`);
  //  Written as escapes on purpose. These needles ARE double-encoded text, and
  //  smoke/encoding-guard.js scans this repo for exactly that, so spelling them
  //  literally makes the guard red on the file whose job is to catch them.
  //  tools/ap-cyber-ced/validate_csv.py carries the same list, same reason.
  const mojibake = ['\u00e2\u20ac', '\u00c3\u00a2', '\u00c3\u00b0', '\u00e2\u0080\u00a2'];
  for (const m of mojibake) if (after.includes(m)) fail.push('mojibake sequence present in the body');

  //  New copy is authored in pure ASCII with HTML entities, because literal
  //  Unicode is how earlier imports on this site produced mojibake. Preserved
  //  regions keep the characters they already render correctly, so the check
  //  is not "ASCII only": it is that the sheet introduces no codepoint the
  //  live page did not already carry.
  const codepoints = (s) => new Set([...s].filter((ch) => ch.charCodeAt(0) > 127));
  const had = codepoints(before);
  const added = [...codepoints(after)].filter((ch) => !had.has(ch));
  if (added.length) {
    fail.push(`new copy introduced non-ASCII characters: ${JSON.stringify(added.join(''))}`);
  }

  // 8. off-CED accounting, reported not enforced
  const low = text.toLowerCase();
  const strays = {};
  for (const t of OFF_CED) {
    const n = (low.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (n) strays[t] = n;
  }
  const beforeLow = visibleText(before).toLowerCase();
  const beforeTotal = OFF_CED.reduce((a, t) => a + (beforeLow.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 0);
  const afterTotal = Object.values(strays).reduce((a, b) => a + b, 0);
  note.push(`off-CED exact matches: ${beforeTotal} before, ${afterTotal} after`);
  if (afterTotal) warn.push(`off-CED terms still present, confirm each is explanatory: ${JSON.stringify(strays)}`);

  const wrong = {};
  for (const [t, owner] of Object.entries(WRONG_UNIT)) {
    const n = (low.match(new RegExp(t, 'g')) || []).length;
    if (n) wrong[t] = `${n} (belongs to ${owner})`;
  }
  if (Object.keys(wrong).length) warn.push(`Unit 2 terms present, confirm each is labelled as Unit 2: ${JSON.stringify(wrong)}`);

  // 9. the enrichment banner is what makes every hit above acceptable
  if (afterTotal && !after.includes('not assessed on the AP exam')) {
    fail.push('off-CED vocabulary is present but no not-assessed banner was found');
  }

  //  The page claimed March in two places while it was last edited in August.
  //  A teacher auditing the page reads the date before the content.
  if (/(Last Updated|last reviewed and updated)[^<]*<?[^>]*>?\s*March 2026/.test(after)) {
    fail.push('a March 2026 review date is still on the page');
  }

  // 10. nothing silently vanished
  const shrink = 1 - after.length / before.length;
  note.push(`body ${before.length} -> ${after.length} bytes (${(shrink * 100).toFixed(1)}% smaller)`);
  if (after.length < before.length * 0.6) fail.push('body lost more than 40% of its bytes, check the splice anchors');
  if (after.length > 240 * 1024) fail.push(`body is ${after.length} bytes, too large to import comfortably`);

  for (const r of resolved) note.push(`  spliced ${r.name}: ${r.removed} bytes -> ${r.html.length}`);

  return { fail, warn, note };
}

function csvCell(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/cyber-u1-topic11-ced-csv.js <out.csv> [--live pages/<handle>.json]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  const before = page.body_html;

  //  This script rewrites the PRE-WO-3 body. Once the sheet is imported the
  //  anchors it splices against are gone, and every rerun dies on the first
  //  missing one with a message that reads like a bug in the script. It is not:
  //  the work already shipped. Say so, because the README hands a future session
  //  this exact command and "anchor not found" will send them hunting.
  if (before.includes('1.1.4: The Three Victim Impacts')) {
    console.error('This page already carries the WO-3 rewrite, so there is nothing to splice.');
    console.error('');
    console.error('  Imported 2026-08-27. To check it is still intact:');
    console.error('    ./tools/ap-cyber-ced/fetch_pages.sh ./verify');
    console.error('    python3 tools/ap-cyber-ced/ced_audit.py ./verify');
    console.error('');
    console.error('  The sheet this built is not reproducible from the current live body,');
    console.error('  and re-importing it would revert the page to the 2026-08-27 text.');
    console.error('  A further change to Topic 1.1 is a new splice table against the body');
    console.error('  as it stands now, not a rerun of this one.');
    process.exit(3);
  }

  const { body: after, resolved } = ced.applySplices(before);
  const { fail, warn, note } = gate(before, after, resolved);

  for (const n of note) console.log(`note  ${n}`);
  for (const w of warn) console.log(`WARN  ${w}`);
  for (const f of fail) console.log(`FAIL  ${f}`);

  if (fail.length) {
    console.error(`\n${fail.length} check(s) failed. Nothing written.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const rows = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [ced.PAGE_ID, ced.HANDLE, ced.TITLE, after, 'MERGE'].map(csvCell).join(','),
  ];
  fs.writeFileSync(out, rows.join('\n') + '\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log('gate passed. Import once, in MERGE mode, then verify against');
  console.log(`  ${LIVE_URL}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
