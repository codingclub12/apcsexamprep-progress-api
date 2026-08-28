#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  CYBER TOPIC 3.2: the authored core, and the renumbering that makes room.
//
//  Offline, no network, no secrets. Run: npm run smoke:cybertopic32
//
//  WHAT THIS DEFENDS
//  Two different things, and both fail quietly.
//
//  1. THE RENUMBERING. The page's ten existing checks shift from 1-10 to 6-15 so
//     five new ones can hold 1-5. The target range overlaps the source range, so
//     an ascending pass renames cfu-1 to cfu-6 and then renames it AGAIN when it
//     reaches 6, and two blocks end up sharing an id. The page still renders.
//     The grader still runs. One of the two checks simply stops recording, and
//     the score it reports is out of a total that no longer matches the number
//     of questions on the screen. Nothing throws.
//
//  2. THE HOUSE RULES ON AUTHORED COPY. No EK codes where a student reads them,
//     no em-dashes, ASCII only. These are not style preferences: the rebuilt
//     Topic 1.1 lesson shipped with 218 student-visible codes before anyone
//     noticed, and the only reason it was caught was a counter like this one.
//
//  The transform runs against the LIVE page at build time, so this file cannot
//  test it end to end without a network. It tests the arithmetic on a synthetic
//  body shaped like the real one, and it tests the authored content directly,
//  which is the half that is fixed in the repo.
//
//  Spec: docs/cyber-topic32-ced-content.md
// -----------------------------------------------------------------------------

const T = require('../lib/cyber-u3-topic32-ced');

let failures = 0;
const fail = (msg) => { console.log(`FAIL  ${msg}`); failures += 1; };
const pass = (msg) => console.log(`ok    ${msg}`);
const check = (cond, msg) => (cond ? pass(msg) : fail(msg));

// ── a synthetic body with the four shapes the shift has to touch ─────────────
function fakeBlock(n, type, answer, subs) {
  const sub = subs
    ? `<select class="cfu-match-select" id="cfu${n}-m1"></select>`
    : '';
  return `<div class="cfu-block" id="cfu-${n}" data-type="${type}" data-num="${n}" data-answer="${answer}">
<span class="cfu-counter">${n} / 10</span>
${sub}
<div class="cfu-feedback" id="cfu-fb-${n}"></div>
</div>`;
}

const KEYS = ['S,H,X', 'C', 'tls,session', 'B', 'A,C,D', 'R,S,P', 'D', 'A', 'B,C,D', 'D'];
const fakeBody = KEYS.map((k, i) =>
  fakeBlock(i + 1, i === 0 ? 'matching' : 'mcq', k, i === 0 || i === 5)).join('\n');

// ── 1. the shift lands every block on a distinct new number ──────────────────
const shifted = T.shiftCfus(fakeBody);
const got = [...shifted.matchAll(
  /<div class="cfu-block" id="cfu-(\d+)" data-type="[^"]+" data-num="(\d+)" data-answer="([^"]*)"/g)];

check(got.length === 10, `all 10 blocks survive the shift (got ${got.length})`);

const nums = got.map((m) => Number(m[1]));
const distinct = new Set(nums);
check(distinct.size === 10, `10 distinct block ids after the shift (got ${distinct.size})`);
check(nums.every((n, i) => n === i + 1 + T.CORE_CFUS),
  `blocks read 6..15 in order (got ${nums.join(',')})`);
check(got.every((m) => m[1] === m[2]),
  'every block id matches its data-num (a mismatch silently unhooks the grader)');

// ── 2. THE POINT OF THE WHOLE FILE: no answer key moved ──────────────────────
//  A shift that renumbers correctly but pairs a question with another
//  question's key regrades ten items and looks perfect in a diff.
const keysAfter = got.map((m) => m[3]);
check(keysAfter.join('|') === KEYS.join('|'),
  'every answer key stayed with its own question');
KEYS.forEach((k, i) => {
  if (keysAfter[i] !== k) fail(`  key ${i + 1}: ${k} became ${keysAfter[i]}`);
});

// ── 3. counters, feedback ids and sub-input ids follow the block ─────────────
const counters = [...shifted.matchAll(/<span class="cfu-counter">(\d+) \/ (\d+)<\/span>/g)];
check(counters.every((m, i) => Number(m[1]) === i + 1 + T.CORE_CFUS),
  'counters follow the new numbering');
check(counters.every((m) => Number(m[2]) === T.TOTAL_AFTER),
  `counters read out of ${T.TOTAL_AFTER}`);
const fbs = [...shifted.matchAll(/id="cfu-fb-(\d+)"/g)].map((m) => Number(m[1]));
check(new Set(fbs).size === 10 && fbs.every((n) => distinct.has(n)),
  'each feedback div has a distinct id belonging to a real block');
check(!/id="cfu(?:[1-5])-m/.test(shifted),
  'sub-input ids moved too (a stale one collides with a new core block)');

// ── 4. a splice that stops matching must fail the build, never no-op ─────────
try {
  T.once('nothing here', 'missing string', 'x', 'deliberate');
  fail('once() accepted a splice that matched nothing');
} catch (e) {
  pass('once() throws when a splice matches nothing');
}
try {
  T.once('aa', 'a', 'b', 'deliberate');
  fail('once() accepted a splice that matched twice');
} catch (e) {
  pass('once() throws when a splice matches more than expected');
}

// ── 5. the coverage table must name sections that exist ─────────────────────
const cells = T.COVERED_IN;
check(cells.length === 8, `the coverage table has all 8 essential knowledge rows (got ${cells.length})`);
const CORE_SECTIONS = ['3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.2.5'];
check(cells.every((c) => CORE_SECTIONS.some((s) => c.includes(s))),
  'every row points at a section this module actually writes');
try {
  T.retargetCoverage('<td>Section 2 — Network Security Policies</td>');
  fail('retargetCoverage accepted a table with the wrong number of cells');
} catch (e) {
  pass('retargetCoverage throws when the table is not the shape it expects');
}

// ── 6. the authored copy obeys the house rules ──────────────────────────────
const CORE = T.SEC1 + T.SEC2 + T.SEC3 + T.SEC4 + T.SEC5 + T.CORE_CFU_HTML + T.ENRICH_BANNER;

const nonAscii = [...CORE].filter((c) => c.charCodeAt(0) > 126);
check(nonAscii.length === 0,
  `authored copy is ASCII with entities (found ${nonAscii.length}: ${[...new Set(nonAscii)].join('')})`);
check(!CORE.includes('—'), 'no em-dashes in authored copy');

//  The rule that cost Topic 1.1 218 violations. Codes belong in the collapsed
//  coverage table, which this module edits but does not author, and nowhere a
//  student reads.
const EK_RX = /\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g;
const codes = CORE.match(EK_RX) || [];
check(codes.length === 0,
  `no EK codes in student-visible copy (found ${codes.length}: ${[...new Set(codes)].join(' ')})`);

// ── 7. the five new checks are well formed and gradeable ────────────────────
const core = [...T.CORE_CFU_HTML.matchAll(
  /<div class="cfu-block" id="cfu-(\d+)" data-type="([^"]+)" data-num="(\d+)" data-answer="([^"]*)"/g)];
check(core.length === T.CORE_CFUS, `${T.CORE_CFUS} core checks authored (got ${core.length})`);
check(core.every((m, i) => Number(m[1]) === i + 1 && m[1] === m[3]),
  'core checks are numbered 1..5 with id and data-num agreeing');
check(core.every((m) => m[4].length > 0), 'every core check carries an answer key');
check(core.every((m) => T.CORE_CFU_HTML.includes(`id="cfu-fb-${m[1]}"`)),
  'every core check has its feedback element');
check(!/data-answer=""/.test(T.CORE_CFU_HTML), 'no core check has an empty answer');

//  Each check runs from its own opening tag to the next one, so a block's
//  feedback is read in full. Slicing to the first closing tag after the
//  feedback opens stops short of the wrong-answer divs, which made this test
//  report two false failures the first time it ran.
const blockOf = (num) => {
  const start = T.CORE_CFU_HTML.indexOf(`<div class="cfu-block" id="cfu-${num}"`);
  const next = T.CORE_CFU_HTML.indexOf('<div class="cfu-block" id="cfu-', start + 1);
  return T.CORE_CFU_HTML.slice(start, next === -1 ? undefined : next);
};

//  An MCQ whose key names an option that is not on the page can never be
//  answered correctly, and the page gives no sign of it.
for (const m of core.filter((x) => x[2] === 'mcq')) {
  const block = blockOf(m[1]);
  const opts = [...block.matchAll(/class="cfu-opt" data-val="([A-E])"/g)].map((x) => x[1]);
  const key = m[4];
  check(opts.includes(key), `check ${m[1]}: the key ${key} is one of the options [${opts.join('')}]`);
  const wrongs = [...block.matchAll(/class="cfu-fb-wrong" data-a="([A-E])"/g)].map((x) => x[1]);
  check(!wrongs.includes(key),
    `check ${m[1]}: the correct option has no wrong-answer feedback`);
  const missing = opts.filter((o) => o !== key && !wrongs.includes(o));
  check(missing.length === 0,
    `check ${m[1]}: every distractor has feedback (missing ${missing.join('') || 'none'})`);
}

//  A matching or select-all whose key has a different length from its rows
//  grades every attempt against the wrong number of slots.
for (const m of core.filter((x) => x[2] === 'matching')) {
  const block = blockOf(m[1]);
  const rows = (block.slice(0, block.indexOf('cfu-feedback')).match(/class="cfu-match-row"/g) || []).length;
  check(rows === m[4].split(',').length,
    `check ${m[1]}: ${rows} rows and ${m[4].split(',').length} answers`);
}

// ── 8. every section the coverage table names is actually authored ──────────
for (const s of CORE_SECTIONS) {
  check(CORE.includes(`<h2 style="`) && new RegExp(`>${s.replace(/\./g, '\\.')}:`).test(CORE),
    `section ${s} exists in the authored core`);
}

console.log(failures
  ? `\n${failures} assertion(s) failed`
  : '\nTopic 3.2 core content and renumbering are sound');
process.exit(failures ? 1 : 0);
