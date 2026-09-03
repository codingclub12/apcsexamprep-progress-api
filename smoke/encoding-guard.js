'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: text encoding guard. Runs in CI on every pull request.
//
//  WHY THIS EXISTS: on 2026-08-07 every non-ASCII character in five admin pages
//  was silently rewritten with its UTF-8 bytes read as latin-1 and re-encoded.
//  2202 characters became mojibake. The dashboard delta badges rendered garbage
//  instead of a triangle for hours and nothing caught it, because double
//  encoded text is still perfectly valid UTF-8. It parses, it lints, it serves,
//  every other suite passes.
//
//  WHY IT WAS REWRITTEN ON 2026-09-03: it was hollow, and it was hollow in the
//  most expensive possible way, which is that it reported clean.
//
//  The detector carried latin-1 only, on the recorded argument that latin-1
//  "covers every byte value, which is the strictly broader case". That is true
//  decoding and false encoding: going back from characters to bytes, latin-1
//  cannot express the 27 cp1252 characters in 0x80-0x9F, which is what a
//  corrupted bullet, dash, curly quote or emoji actually becomes. It also tried
//  sequence widths 3 and 2 only, so no 4 byte character was visible to it in
//  either flavour, and every emoji is 4 bytes.
//
//  Measured against 12 known cases it caught 5. It caught the DOUBLE corrupted
//  cp1252 form and missed the single corrupted form, which is the one on the
//  live page. Its own self-test was seven hand-pasted latin-1 strings, so it
//  was green either way, and a mutation run against it would also have been
//  green: the mutation would inject the flavour the suite already tested.
//
//  WHAT REPLACES IT, AND WHY THAT IS NOT THE SAME TRICK AGAIN:
//
//    1. The detector moved to lib/mojibake.js and is structural. It anchors on
//       the whole UTF-8 lead class U+00C2-U+00F4, derives the sequence width
//       from the lead rather than guessing it, and reverses through cp1252 as
//       well as latin-1. Read that file for why each of those is load bearing.
//
//    2. The fixtures below are GENERATED, by a damage simulator written here
//       from the byte definitions rather than copied from the detector. A
//       corpus of real characters is corrupted at depth 1 and depth 2, in both
//       flavours, and every one must be both detected and exactly recovered.
//       There is no list of known bad strings to fall behind reality.
//
//    3. Section 5 asserts the property that makes the U+00C3 anchor wrong, so
//       the reasoning in lib/mojibake.js is a passing test rather than a claim
//       in a comment.
//
//    4. This file and lib/mojibake.js are pure ASCII and are scanned by the
//       check they implement. The old version had to exclude itself, which made
//       a corruption introduced into the detector invisible to the detector.
//
//  Run: npm run smoke:encoding
// -----------------------------------------------------------------------------
const path = require('path');
const mojibake = require('../lib/mojibake.js');

const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// -- The damage simulator ------------------------------------------------------
//  Written from the byte definitions, NOT from lib/mojibake.js, so a wrong
//  table in the detector cannot make its own fixtures agree with it. This is
//  the forward direction: take correct text, encode it UTF-8, then read those
//  bytes back through a single byte codec. That is the whole bug, in 4 lines.
const CP1252_DECODE_HIGH = {
  0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030,
  0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D,
  0x8F: 0x008F, 0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
  0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x009D,
  0x9E: 0x017E, 0x9F: 0x0178,
};

function misread(text, codec) {
  const bytes = Buffer.from(text, 'utf8');
  let out = '';
  for (const b of bytes) {
    const cp = (codec === 'cp1252' && CP1252_DECODE_HIGH[b] !== undefined) ? CP1252_DECODE_HIGH[b] : b;
    out += String.fromCodePoint(cp);
  }
  return out;
}

function corrupt(text, codec, depth) {
  let cur = text;
  for (let n = 0; n < depth; n++) cur = misread(cur, codec);
  return cur;
}

// -- The corpus ----------------------------------------------------------------
//  Named by code point so this file stays pure ASCII and can be scanned by the
//  guard it defines. Chosen to cover all three sequence widths, because width
//  is exactly what the old detector got wrong: 2 byte accented Latin, 3 byte
//  punctuation and box drawing that this repo's dashboards actually use, and 4
//  byte emoji, which were wholly invisible before.
const CORPUS = [
  ['bullet',                0x2022], ['em dash',              0x2014],
  ['en dash',               0x2013], ['ellipsis',             0x2026],
  ['left double quote',     0x201C], ['right double quote',   0x201D],
  ['left single quote',     0x2018], ['right single quote',   0x2019],
  ['euro sign',             0x20AC], ['trade mark',           0x2122],
  ['right arrow',           0x2192], ['left arrow',           0x2190],
  ['up triangle',           0x25B2], ['down triangle',        0x25BC],
  ['box drawing light',     0x2500], ['check mark',           0x2713],
  ['black star',            0x2605], ['middle dot',           0x00B7],
  ['e acute',               0x00E9], ['n tilde',              0x00F1],
  ['u diaeresis',           0x00FC], ['sharp s',              0x00DF],
  ['degree sign',           0x00B0], ['pound sign',           0x00A3],
  ['copyright',             0x00A9], ['CJK ideograph shi',    0x4E16],
  ['direct hit emoji',      0x1F3AF], ['locked emoji',        0x1F512],
  ['rocket emoji',          0x1F680], ['blue book emoji',     0x1F4D8],
];

// -- 1. Every corpus character, both flavours, depth 1 and depth 2 ------------
//  This is the check the old suite could not express. Depth 1 cp1252 is the
//  reported live failure; the old detector caught NONE of it. Depth 2 is the
//  form that a handoff doc mistook for the bug itself.
console.log('\nGenerated corruption: detect and recover');
let generated = 0, missed = [], wrong = [];
for (const [label, cp] of CORPUS) {
  const original = String.fromCodePoint(cp);
  for (const codec of ['cp1252', 'latin1']) {
    for (const depth of [1, 2]) {
      const damaged = corrupt(original, codec, depth);
      // A guard against a hollow fixture: if the simulator produced no change
      // there is nothing to detect and a pass here would mean nothing.
      if (damaged === original) { wrong.push(label + '/' + codec + '/d' + depth + ' simulator no-op'); continue; }
      generated += 1;
      const text = 'lead ' + damaged + ' trail';
      const hits = mojibake.analyze(text);
      if (!hits.length) { missed.push(label + '/' + codec + '/depth' + depth); continue; }
      const fixed = mojibake.repair(text);
      if (fixed.text !== 'lead ' + original + ' trail') {
        wrong.push(label + '/' + codec + '/d' + depth + ' recovered ' + JSON.stringify(fixed.text));
      }
    }
  }
}
ok('the simulator generated a meaningful number of corrupt fixtures', generated >= 100, generated);
ok('every generated corruption is DETECTED', missed.length === 0, missed.slice(0, 12));
ok('every generated corruption is EXACTLY RECOVERED', wrong.length === 0, wrong.slice(0, 12));

// -- 2. The specific cases the previous detector let through -------------------
//  Kept as named regressions, separate from the generated sweep, because these
//  are the ones with a live page behind them. If the generated sweep is ever
//  weakened these still have to fail on their own.
console.log('\nNamed regressions: what shipped blind');
const REGRESSIONS = [
  ['single pass cp1252 bullet (the live page)',      0x2022,  'cp1252', 1],
  ['single pass cp1252 direct hit emoji (the live page)', 0x1F3AF, 'cp1252', 1],
  ['single pass latin-1 direct hit emoji (4 bytes)', 0x1F3AF, 'latin1', 1],
  ['single pass cp1252 em dash',                     0x2014,  'cp1252', 1],
  ['single pass latin-1 up triangle (2026-08-07)',   0x25B2,  'latin1', 1],
  ['double pass cp1252 bullet (what the doc said)',  0x2022,  'cp1252', 2],
];
for (const [label, cp, codec, depth] of REGRESSIONS) {
  const original = String.fromCodePoint(cp);
  const text = 'x ' + corrupt(original, codec, depth) + ' y';
  const hits = mojibake.analyze(text);
  const fixed = mojibake.repair(text);
  ok('catches ' + label, hits.length > 0 && fixed.text === 'x ' + original + ' y',
    { hits: hits.length, recovered: fixed.text });
}

// -- 3. Depth is reported, so a report says which pipeline did it --------------
console.log('\nDepth reporting');
{
  const bullet = String.fromCodePoint(0x2022);
  const d1 = mojibake.repair(corrupt(bullet, 'cp1252', 1));
  const d2 = mojibake.repair(corrupt(bullet, 'cp1252', 2));
  ok('single corruption reports depth 1', d1.depth === 1, d1.depth);
  ok('double corruption reports depth 2', d2.depth === 2, d2.depth);
  ok('neither report is truncated', !d1.truncated && !d2.truncated);
}

// -- 4. It must NOT fire on correct text --------------------------------------
//  A guard that flags healthy text gets switched off within a day, so this
//  section is as load bearing as section 1. Real multilingual prose, and the
//  correct versions of every character the dashboards use.
console.log('\nFalse positive check');
const cps = (...list) => list.map((c) => String.fromCodePoint(c)).join('');
const CLEAN = [
  ['plain ascii', 'the quick brown fox, 100% of it, 60 MCQ + 1 FRQ'],
  ['the correct dashboard characters', cps(0x25B2, 0x20, 0x25BC, 0x20, 0x2192, 0x20, 0x2190, 0x20, 0x2500, 0x20, 0x00B7, 0x20, 0x2026, 0x20, 0x2713, 0x20, 0x2022)],
  ['correct quotes and dashes', cps(0x2014, 0x20, 0x201C, 0x71, 0x201D, 0x20, 0x2018, 0x73, 0x2019)],
  ['french', 'caf' + cps(0x00E9) + ' ' + cps(0x00E9) + 'l' + cps(0x00E8) + 've na' + cps(0x00EF) + 've ' + cps(0x00E2) + 'me r' + cps(0x00F4) + 'le'],
  ['german', 'stra' + cps(0x00DF) + 'e Gr' + cps(0x00FC) + 'n ' + cps(0x00C4) + 'nderung sch' + cps(0x00F6) + 'n'],
  ['spanish', cps(0x00BF) + 'Qu' + cps(0x00E9) + '? se' + cps(0x00F1) + 'or ni' + cps(0x00F1) + 'o a' + cps(0x00F1) + 'o'],
  ['portuguese', 'a' + cps(0x00E7) + cps(0x00E3) + 'o cora' + cps(0x00E7) + cps(0x00E3) + 'o irm' + cps(0x00E3) + 'o'],
  ['nordic', 'sm' + cps(0x00F6) + 'rg' + cps(0x00E5) + 'sbord ' + cps(0x00C5) + 'ngstr' + cps(0x00F6) + 'm ' + cps(0x00D8) + 'resund'],
  ['emoji that are fine', cps(0x1F3AF, 0x20, 0x1F512, 0x20, 0x1F680, 0x20, 0x1F4D8)],
  ['cjk', cps(0x4E16, 0x754C, 0x3001, 0x3053, 0x3093, 0x306B, 0x3061, 0x306F)],
  ['accented text next to an emoji', 'caf' + cps(0x00E9) + ' ' + cps(0x1F680) + ' r' + cps(0x00F4) + 'le'],
];
for (const [label, text] of CLEAN) {
  const hits = mojibake.analyze(text);
  ok('no false positive on ' + label, hits.length === 0,
    hits.map((h) => h.chunk + ' -> ' + h.fixed + ' via ' + h.codec));
}

// -- 5. The property that makes an U+00C3 anchor wrong ------------------------
//  The obvious general rule, and the one a handoff proposed, is "an U+00C3
//  followed by a continuation character". It is the same inversion one level
//  up. Asserted here rather than argued in a comment, so it stays true.
console.log('\nWhy the U+00C3 anchor is not the general rule');
{
  const C3 = String.fromCodePoint(0x00C3);
  const bullet = corrupt(String.fromCodePoint(0x2022), 'cp1252', 1);
  const emoji = corrupt(String.fromCodePoint(0x1F3AF), 'cp1252', 1);
  const bulletD2 = corrupt(String.fromCodePoint(0x2022), 'cp1252', 2);
  ok('depth 1 cp1252 bullet contains NO U+00C3', bullet.indexOf(C3) === -1,
    Array.from(bullet).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()));
  ok('depth 1 cp1252 emoji contains NO U+00C3', emoji.indexOf(C3) === -1,
    Array.from(emoji).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()));
  ok('depth 2 DOES contain U+00C3, which is why it looked like the rule', bulletD2.indexOf(C3) !== -1);
  // And the lead class the detector actually uses covers both depths.
  const leadOf = (s) => Array.from(s)[0].codePointAt(0);
  ok('every depth 1 lead is inside U+00C2-U+00F4',
    [bullet, emoji].every((s) => leadOf(s) >= mojibake.LEAD_MIN && leadOf(s) <= mojibake.LEAD_MAX),
    [leadOf(bullet).toString(16), leadOf(emoji).toString(16)]);
}

// -- 6. Sequence width is derived from the lead byte --------------------------
console.log('\nSequence width');
ok('a 2 byte lead declares width 2', mojibake.widthForLead(0xC3) === 2);
ok('a 3 byte lead declares width 3', mojibake.widthForLead(0xE2) === 3);
ok('a 4 byte lead declares width 4, which is every emoji', mojibake.widthForLead(0xF0) === 4);

// -- 7. Both codecs are reachable, and cp1252 is the one that was missing -----
console.log('\nCodec attribution');
{
  const bullet = String.fromCodePoint(0x2022);
  const viaCp = mojibake.analyze(corrupt(bullet, 'cp1252', 1));
  const viaL1 = mojibake.analyze(corrupt(bullet, 'latin1', 1));
  ok('the cp1252 flavour is attributed to cp1252', viaCp.length === 1 && viaCp[0].codec === 'cp1252',
    viaCp.map((h) => h.codec));
  ok('the latin-1 flavour is attributed to latin-1', viaL1.length === 1 && viaL1[0].codec === 'latin1',
    viaL1.map((h) => h.codec));
  ok('latin-1 alone CANNOT reverse the cp1252 flavour, which is the whole bug',
    mojibake.toByte(String.fromCodePoint(0x20AC), 'latin1') === null
    && mojibake.toByte(String.fromCodePoint(0x20AC), 'cp1252') === 0x80);

  // Neither codec subsumes the other. Asserted, because the first draft of
  // lib/mojibake.js claimed in a comment that cp1252 alone would do, and
  // dropping latin-1 on that basis would have gone blind to every C1 control,
  // which is what the entire latin-1 flavour is built out of.
  const onlyL1 = [], onlyCp = [];
  for (let cp = 0; cp <= 0x2200; cp++) {
    const ch = String.fromCodePoint(cp);
    const a = mojibake.toByte(ch, 'latin1');
    const b = mojibake.toByte(ch, 'cp1252');
    if (a !== null && b === null) onlyL1.push(cp);
    if (a === null && b !== null) onlyCp.push(cp);
  }
  ok('27 code points are reversible under latin-1 ONLY', onlyL1.length === 27, onlyL1.length);
  ok('27 code points are reversible under cp1252 ONLY', onlyCp.length === 27, onlyCp.length);
  ok('so neither codec subsumes the other and both are required',
    onlyL1.length > 0 && onlyCp.length > 0);
}

// -- 8. The properties lib/mojibake.js now DEPENDS ON -------------------------
//  Two checks were deleted from the detector on 2026-09-03 because no mutation
//  could kill them. Deleting unkillable code is right, but it converts a defence
//  into a dependency, and an unstated dependency is just a slower version of the
//  same problem. So both are asserted here, exhaustively rather than by example.
console.log('\nProperties the detector depends on');
{
  const decode = (bytes) => Buffer.from(bytes).toString('utf8');
  const REPL = String.fromCodePoint(0xFFFD);

  // (a) The removed re-encode check rejected overlong forms and surrogates.
  //     The decoder has to do that instead, or those become false positives.
  ok('the decoder rejects an overlong 2 byte form', decode([0xC0, 0xAF]).indexOf(REPL) !== -1);
  ok('the decoder rejects an overlong 3 byte form', decode([0xE0, 0x80, 0x80]).indexOf(REPL) !== -1);
  ok('the decoder rejects an encoded surrogate', decode([0xED, 0xA0, 0x80]).indexOf(REPL) !== -1);

  //     And exhaustively: over every sequence the detector can reach, the
  //     removed check never changed the answer. If a future Node loosens the
  //     decoder this goes red and the check comes back.
  const verdict = (bytes, strict) => {
    const buf = Buffer.from(bytes);
    const d = buf.toString('utf8');
    if (Array.from(d).length !== 1) return null;
    if (d.indexOf(REPL) !== -1) return null;
    if (strict && !Buffer.from(d, 'utf8').equals(buf)) return null;
    return d;
  };
  let reencodeDiffs = 0, checked = 0;
  for (let a = 0xC2; a <= 0xDF; a++) for (let b = 0; b <= 0xFF; b++) {
    checked++; if (verdict([a, b], true) !== verdict([a, b], false)) reencodeDiffs++;
  }
  for (let a = 0xE0; a <= 0xEF; a++) for (let b = 0; b <= 0xFF; b++) for (let c = 0; c <= 0xFF; c++) {
    checked++; if (verdict([a, b, c], true) !== verdict([a, b, c], false)) reencodeDiffs++;
  }
  ok('a meaningful number of sequences was checked', checked > 1000000, checked);
  ok('the removed re-encode check changes NO verdict, over every 2 and 3 byte sequence',
    reencodeDiffs === 0, reencodeDiffs);

  // (b) The continuation-byte rule that remains is a fast path, not a guard.
  //     Asserting that here is what stops a future session finding its mutation
  //     survives, concluding the guard is hollow, and "fixing" a 3.2x speedup.
  const verdictCont = (bytes, useCont) => {
    if (useCont) for (let k = 1; k < bytes.length; k++) {
      if (bytes[k] < 0x80 || bytes[k] > 0xBF) return null;
    }
    return verdict(bytes, false);
  };
  let contDiffs = 0;
  for (let a = 0xC2; a <= 0xDF; a++) for (let b = 0; b <= 0xFF; b++) {
    if (verdictCont([a, b], true) !== verdictCont([a, b], false)) contDiffs++;
  }
  for (let a = 0xE0; a <= 0xEF; a++) for (let b = 0; b <= 0xFF; b++) for (let c = 0; c <= 0xFF; c++) {
    if (verdictCont([a, b, c], true) !== verdictCont([a, b, c], false)) contDiffs++;
  }
  ok('the continuation-byte rule changes NO verdict either, so it is a fast path '
    + 'and its mutation survives by design', contDiffs === 0, contDiffs);
}

// -- 8. The repository itself must be clean -----------------------------------
//  No file is exempt. This file and lib/mojibake.js are pure ASCII precisely so
//  that they can be included here.
console.log('\nRepository scan');
const files = mojibake.walk(ROOT);
const offenders = [];
let scanned = 0;
for (const file of files) {
  const text = mojibake.readUtf8(file);
  if (text === null) continue;
  scanned += 1;
  const hits = mojibake.analyze(text);
  if (hits.length) {
    const rel = path.relative(ROOT, file);
    const byChar = {};
    for (const h of hits) byChar[h.fixed] = (byChar[h.fixed] || 0) + 1;
    const chars = Array.from(text);
    const line = chars.slice(0, hits[0].index).join('').split('\n').length;
    offenders.push({ file: rel, count: hits.length, first_line: line, chars: byChar, depth: mojibake.repair(text).depth });
  }
}

ok('scanned a meaningful number of files', scanned > 20, scanned);
ok('this guard scans ITSELF and the detector it uses',
  files.some((f) => f.endsWith(path.join('smoke', 'encoding-guard.js')))
  && files.some((f) => f.endsWith(path.join('lib', 'mojibake.js'))));
ok('no mojibake anywhere in the repository', offenders.length === 0);

if (offenders.length) {
  console.log('\n  Mojibake found. These characters mean something other than what');
  console.log('  they render as. Repair them rather than retyping the file:\n');
  for (const o of offenders) {
    const chars = Object.entries(o.chars).map(([c, n]) => JSON.stringify(c) + ' x' + n).join(', ');
    console.log('    ' + o.file + ':' + o.first_line + '  ' + o.count + ' occurrence(s), depth '
      + o.depth + '  -> ' + chars);
  }
  console.log('\n  node -e "const m=require(\'./lib/mojibake.js\');const fs=require(\'fs\');');
  console.log('  const f=process.argv[1];fs.writeFileSync(f,m.repair(m.readUtf8(f)).text)" <file>\n');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
