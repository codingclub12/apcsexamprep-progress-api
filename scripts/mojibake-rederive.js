'use strict';
// -----------------------------------------------------------------------------
//  REDERIVE: a second, independent answer to "is there mojibake in this tree?"
//
//  scripts/deploy-gate.js defines a `rederive` as a second implementation that
//  reaches the same conclusion from the raw artifact, written to be wrong in
//  DIFFERENT places than the first one. So this shares nothing with
//  lib/mojibake.js except the list of files, which is the artifact rather than
//  the claim under test.
//
//  WHAT IS DIFFERENT, ON PURPOSE:
//
//    the codec tables   lib/mojibake.js carries a hand typed 32 entry cp1252
//                       table. That table is the most error prone thing in the
//                       module, and a one character typo in it would be
//                       invisible, because the detector and its own suite would
//                       agree with each other and both be wrong. Here the
//                       tables are DERIVED from ICU, by decoding all 256 byte
//                       values with TextDecoder and inverting the result.
//                       Nothing is typed, so nothing can be mistyped.
//
//    the scan           lib/mojibake.js walks character by character and derives
//                       the sequence width from the lead byte. This maps the
//                       whole text to a byte stream and runs ONE regular
//                       expression over it, letting the alternation decide the
//                       width. There is no per position loop and no width
//                       arithmetic to get wrong, which is exactly the
//                       arithmetic the previous detector had wrong.
//
//    the failure mode   a bug in the width derivation surfaces here as a hit the
//                       regex found and the detector missed, and the reverse.
//
//  It is deliberately NOT independent about what counts as a valid reversal:
//  both require the bytes to decode to exactly one character and to re-encode
//  to the same bytes. That is the definition of the thing being detected rather
//  than a technique for finding it, and a rederive that used a different
//  definition would be answering a different question and agreeing by accident.
//
//  Usage: node scripts/mojibake-rederive.js [dir]
//  Exit 0 only if both implementations agree on every file.
// -----------------------------------------------------------------------------
const path = require('path');
const canonical = require('../lib/mojibake.js');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');

const REPLACEMENT = '\uFFFD';

// -- Codec tables, derived rather than typed ----------------------------------
//  A TRAP, found by this script disagreeing with lib/mojibake.js and worth the
//  paragraph: `new TextDecoder('iso-8859-1')` is NOT latin-1. The WHATWG
//  Encoding Standard makes "iso-8859-1" an alias for windows-1252, so that
//  decoder returns a euro sign for 0x80 rather than a C1 control, and both
//  tables here came out identical. The latin-1 runs then broke at every C1
//  control, which is what the latin-1 flavour is made of, and this script
//  reported 25 hits against the detector's 65 on a real corrupted file.
//
//  Node's own `Buffer.toString('latin1')` IS true ISO-8859-1, so latin-1 is
//  derived from that and cp1252 from TextDecoder. Two different sources, and
//  neither is a table anybody typed. assertTablesDiffer below makes the trap
//  loud instead of silent if a future edit reaches for the label again.
function invertDecoder(decodeByte) {
  const toByte = new Map();
  for (let b = 0; b <= 0xFF; b++) {
    const ch = decodeByte(b);
    // A byte that decodes to the replacement character has no character form,
    // so nothing can have come from it.
    if (ch === REPLACEMENT) continue;
    if (!toByte.has(ch)) toByte.set(ch, b);
  }
  return toByte;
}

const cp1252Decoder = new TextDecoder('windows-1252');
const TABLES = [
  ['latin1', invertDecoder((b) => Buffer.from([b]).toString('latin1'))],
  ['cp1252', invertDecoder((b) => cp1252Decoder.decode(Buffer.from([b])))],
];

//  The two codecs must disagree, and they must disagree in BOTH directions:
//  each reverses 27 code points the other cannot. If a future edit collapses
//  them onto one codec the detector goes blind to a whole flavour while this
//  script keeps agreeing with it, which is the failure this file exists to
//  prevent and would be the worst possible way to lose it.
(function assertTablesDiffer() {
  const l1 = TABLES[0][1], cp = TABLES[1][1];
  const onlyL1 = Array.from(l1.keys()).filter((c) => !cp.has(c));
  const onlyCp = Array.from(cp.keys()).filter((c) => !l1.has(c));
  if (onlyL1.length !== 27 || onlyCp.length !== 27) {
    console.error('\nDERIVED CODEC TABLES ARE WRONG.');
    console.error('  expected 27 code points reversible under each codec alone, got '
      + onlyL1.length + ' and ' + onlyCp.length + '.');
    console.error('  If both are 0 the two labels resolved to the SAME codec: TextDecoder');
    console.error("  treats 'iso-8859-1' as an alias for windows-1252. Use Buffer latin1.");
    process.exit(1);
  }
}());

// -- The scan: one regex over a byte stream -----------------------------------
//  The alternation IS the width rule: a 2 byte lead takes one continuation, a
//  3 byte lead takes two, a 4 byte lead takes three. Written as escapes because
//  half of these bytes are unprintable and a file full of them cannot be read.
const UTF8_SHAPE = /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/g;

function scanWithCodec(chars, toByte) {
  // Map the text to bytes, remembering which code point each byte came from. A
  // character this codec cannot express ends the current run: it cannot have
  // been produced by this codec, so no sequence is allowed to span it.
  const runs = [];
  let bytes = [];
  let origin = [];
  const flush = () => { if (bytes.length) runs.push({ bytes, origin }); bytes = []; origin = []; };
  for (let i = 0; i < chars.length; i++) {
    const b = toByte.get(chars[i]);
    if (b === undefined) { flush(); continue; }
    bytes.push(b);
    origin.push(i);
  }
  flush();

  const found = new Map();   // code point index -> { fixed, width }
  for (const run of runs) {
    const asChars = Buffer.from(run.bytes).toString('latin1');
    UTF8_SHAPE.lastIndex = 0;
    let m;
    while ((m = UTF8_SHAPE.exec(asChars)) !== null) {
      const raw = Buffer.from(run.bytes.slice(m.index, m.index + m[0].length));
      const decoded = raw.toString('utf8');
      if (Array.from(decoded).length !== 1) continue;
      if (decoded.indexOf(REPLACEMENT) !== -1) continue;
      found.set(run.origin[m.index], { fixed: decoded, width: m[0].length });
    }
  }
  return found;
}

function rederive(text) {
  const chars = Array.from(text);
  // latin-1 first, matching the canonical module's attribution order, then
  // cp1252 fills in positions latin-1 could not express. Neither table
  // subsumes the other, so both passes are load bearing.
  const merged = new Map();
  for (const entry of TABLES) {
    for (const pair of scanWithCodec(chars, entry[1])) {
      if (!merged.has(pair[0])) merged.set(pair[0], pair[1]);
    }
  }
  // Non-overlapping, left to right, so both implementations count the same way
  // where two corrupted characters abut.
  const out = [];
  let guard = -1;
  for (const at of Array.from(merged.keys()).sort((a, b) => a - b)) {
    if (at <= guard) continue;
    const h = merged.get(at);
    out.push({ index: at, fixed: h.fixed });
    guard = at + h.width - 1;
  }
  return out;
}

// -- Agree about corruption, not just about silence ---------------------------
//  A clean tree makes the file scan below vacuous: two implementations that both
//  find nothing have agreed about nothing. So first make both of them FIRE, on
//  corruption generated here from the derived tables, and require them to agree
//  character for character. Only then is "they agree on every file" worth
//  printing.
const CORPUS_CODEPOINTS = [
  0x2022, 0x2014, 0x2013, 0x2026, 0x201C, 0x201D, 0x2018, 0x2019, 0x20AC,
  0x2122, 0x2192, 0x2190, 0x25B2, 0x25BC, 0x2500, 0x2713, 0x2605, 0x00B7,
  0x00E9, 0x00F1, 0x00FC, 0x00DF, 0x00B0, 0x00A3, 0x00A9, 0x4E16,
  0x1F3AF, 0x1F512, 0x1F680, 0x1F4D8,
];

function damage(text, tableIndex, depth) {
  const toByte = TABLES[tableIndex][1];
  // Invert the derived map to get byte -> character, which is the forward
  // direction of the bug: read correct UTF-8 bytes through the wrong codec.
  const toChar = new Map();
  for (const pair of toByte) toChar.set(pair[1], pair[0]);
  let cur = text;
  for (let n = 0; n < depth; n++) {
    let out = '';
    for (const b of Buffer.from(cur, 'utf8')) {
      const ch = toChar.get(b);
      if (ch === undefined) return null;   // this codec cannot render that byte
      out += ch;
    }
    cur = out;
  }
  return cur;
}

const corpusProblems = [];
let corpusCases = 0;
for (const cp of CORPUS_CODEPOINTS) {
  const original = String.fromCodePoint(cp);
  for (let t = 0; t < TABLES.length; t++) {
    for (const depth of [1, 2]) {
      const damaged = damage(original, t, depth);
      if (damaged === null || damaged === original) continue;
      corpusCases += 1;
      const text = 'lead ' + damaged + ' trail';
      const a = canonical.analyze(text).map((h) => h.index + ':' + h.fixed);
      const b = rederive(text).map((h) => h.index + ':' + h.fixed);
      const label = 'U+' + cp.toString(16).toUpperCase() + '/' + TABLES[t][0] + '/depth' + depth;
      if (!a.length) corpusProblems.push(label + ' canonical found NOTHING');
      else if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
        corpusProblems.push(label + ' canonical=' + JSON.stringify(a) + ' rederived=' + JSON.stringify(b));
      }
    }
  }
}

if (corpusCases < 80) {
  console.error('\nthe generated corpus produced only ' + corpusCases + ' cases, which is too few to mean anything');
  process.exit(1);
}
if (corpusProblems.length) {
  console.error('\nTHE TWO IMPLEMENTATIONS DISAGREE ON GENERATED CORRUPTION:\n');
  for (const p of corpusProblems.slice(0, 20)) console.error('    ' + p);
  console.error('');
  process.exit(1);
}

// -- Compare -------------------------------------------------------------------
const files = canonical.walk(ROOT);
const disagreements = [];
let scanned = 0, filesWithHits = 0, totalHits = 0;

for (const file of files) {
  const text = canonical.readUtf8(file);
  if (text === null) continue;
  scanned += 1;

  const a = canonical.analyze(text).map((h) => h.index + ':' + h.fixed);
  const b = rederive(text).map((h) => h.index + ':' + h.fixed);
  if (a.length) { filesWithHits += 1; totalHits += a.length; }

  if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
    disagreements.push({
      file: path.relative(ROOT, file),
      canonical: a.length, rederived: b.length,
      only_canonical: a.filter((x) => b.indexOf(x) === -1).slice(0, 6),
      only_rederived: b.filter((x) => a.indexOf(x) === -1).slice(0, 6),
    });
  }
}

console.log('\nMOJIBAKE REDERIVE');
console.log('  root                ' + ROOT);
console.log('  generated cases     ' + corpusCases + ', both implementations agreed on all');
console.log('  files scanned       ' + scanned);
console.log('  files with mojibake ' + filesWithHits);
console.log('  total hits          ' + totalHits);
console.log('  latin-1 table       derived from Buffer latin1, ' + TABLES[0][1].size + ' characters');
console.log('  cp1252 table        derived from ICU windows-1252, ' + TABLES[1][1].size + ' characters');

if (disagreements.length) {
  console.log('\n  THE TWO IMPLEMENTATIONS DISAGREE on ' + disagreements.length + ' file(s).');
  console.log('  One of them is wrong and neither can tell you which:\n');
  for (const d of disagreements) {
    console.log('    ' + d.file + '  canonical=' + d.canonical + ' rederived=' + d.rederived);
    if (d.only_canonical.length) console.log('      only lib/mojibake.js: ' + JSON.stringify(d.only_canonical));
    if (d.only_rederived.length) console.log('      only the rederive   : ' + JSON.stringify(d.only_rederived));
  }
  console.log('');
  process.exit(1);
}

// Agreeing that nothing is wrong is a far weaker statement than agreeing about
// what IS wrong, so this says which of the two it just made.
console.log('\n  Two independent implementations agree on every file.');
if (totalHits === 0) {
  console.log('  No file in this tree is corrupted, so the file scan alone would be');
  console.log('  vacuous. The ' + corpusCases + ' generated cases above are what makes this run mean');
  console.log('  something: both implementations fired on every one and agreed.');
}
console.log('\nREDERIVE AGREES');
