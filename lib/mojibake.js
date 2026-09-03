'use strict';
// -----------------------------------------------------------------------------
//  lib/mojibake.js - the ONE detector for text whose encoding was mangled.
//
//  Go through this module. Do not restate the convention as a grep pattern in a
//  doc, because that is exactly how the last one shipped blind: a handoff told
//  a future session to reject two literal patterns, both of which are the
//  DOUBLE corrupted form, and the failure actually on the live page is the
//  single corrupted form, which contains neither of them.
//
//  WHAT MOJIBAKE IS HERE. A UTF-8 byte sequence gets decoded as a single byte
//  codec and re-encoded as UTF-8. The result is still perfectly valid UTF-8: it
//  parses, it lints, it serves, every other suite passes. The only thing wrong
//  with it is that it means the wrong character, which no other check looks at.
//
//  THE TWO FLAVOURS, AND WHY BOTH ARE MANDATORY. Which single byte codec did
//  the decoding decides what the damage looks like, and the two do not overlap.
//  Bullet U+2022 is the bytes E2 80 A2:
//
//    read as latin-1   ->  U+00E2 U+0080 U+00A2   a-circumflex, a C1 control, cent
//    read as cp1252    ->  U+00E2 U+20AC U+00A2   the familiar a-euro-cent
//
//  latin-1 maps all 256 byte values, so it was argued here to be "the strictly
//  broader case". That is true in the DECODE direction and false in the
//  direction a detector needs. Going back from characters to bytes, latin-1
//  cannot express the 27 cp1252 characters in 0x80-0x9F: the euro sign, the
//  curly quotes, the bullet, the en and em dashes, Y-diaeresis. Those are
//  precisely what corrupted bullets, dashes, quotes and emoji turn into.
//
//  It was blind here, in a suite that gates every pull request. Until this
//  module, smoke/encoding-guard.js carried latin-1 only and caught 5 of 12
//  known cases: it saw the latin-1 flavour, and it saw the DOUBLE corrupted
//  cp1252 flavour, and it let single pass cp1252 straight through. Single pass
//  cp1252 is the one on the live page. A guard that catches the second order
//  version of a bug and not the bug is worse than no guard, because it reports
//  clean.
//
//  WHY THIS IS NOT A LIST OF KNOWN BAD STRINGS. A rule that greps for the exact
//  characters somebody pasted into a report catches that paste and nothing
//  else, and it cannot tell you it has stopped working. This works structurally
//  instead, from the shape of UTF-8 itself:
//
//    a lead character   in U+00C2-U+00F4, the rendering of a UTF-8 lead byte
//    followed by        exactly as many continuation characters as that lead
//                       byte declares (1, 2 or 3), each one the rendering of a
//                       byte in 0x80-0xBF under EITHER codec
//    such that          those bytes decode to exactly one character and
//                       re-encode to the same bytes
//
//  So it catches corrupted characters nobody has reported yet, at any depth,
//  and it is anchored on the whole lead class rather than one member of it.
//
//  ANCHORING ON U+00C3 ALONE IS THE SAME MISTAKE ONE LEVEL UP. It is the
//  natural next guess and it is still wrong: single pass cp1252 corruption of a
//  bullet is U+00E2 U+20AC U+00A2 and contains no U+00C3 anywhere. U+00C3 only
//  starts appearing at depth 2, because that is the depth at which the first
//  corruption's own a-circumflex gets corrupted in turn. An U+00C3 anchor
//  therefore reproduces the original defect exactly: depth 2 caught, depth 1
//  missed. smoke/encoding-guard.js has a mutation that proves this, so the
//  claim is checkable rather than an assertion in a comment.
//
//  WHY THE WIDTH IS DERIVED, NOT GUESSED. The lead byte says how many
//  continuations follow: 0xC2-0xDF means 2 bytes total, 0xE0-0xEF means 3,
//  0xF0-0xF4 means 4. The previous detector tried widths 3 and 2 only, so every
//  4 byte character was invisible to it in BOTH flavours. Every emoji is 4
//  bytes. The live page that started this had a corrupted emoji on it.
//
//  PURE ASCII ON PURPOSE. Every character above is named rather than shown, and
//  every fixture in the suite is generated from raw bytes, so this module and
//  its suite can both be scanned by the check they implement. The previous
//  version had to exclude itself from its own repository scan, which made a
//  real corruption introduced into the detector the one corruption nothing
//  could ever see.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

// cp1252 in 0x80-0x9F, where latin-1 puts C1 controls. The 5 slots cp1252
// leaves formally undefined (0x81, 0x8D, 0x8F, 0x90, 0x9D) are included as
// pass-through, which is what real decoders do and what WHATWG windows-1252
// specifies, so a sequence carrying one is still reversible here.
const CP1252_HIGH = {
  0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192,
  0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039,
  0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D, 0x8F: 0x008F,
  0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9D: 0x009D, 0x9E: 0x017E, 0x9F: 0x0178,
};

// Reverse map, character back to byte, for the cp1252 range only. Built once at
// module scope: this runs over every file in the repository and per-call
// allocation there is the shape of problem that has cost this project money.
const CP1252_TO_BYTE = new Map();
for (const b of Object.keys(CP1252_HIGH)) {
  CP1252_TO_BYTE.set(String.fromCodePoint(CP1252_HIGH[b]), Number(b));
}

// BOTH CODECS ARE STRICTLY NECESSARY, and neither one subsumes the other. The
// first draft of this module claimed in a comment that cp1252's reverse map was
// a superset and that cp1252 alone would do. It is not, and it would not. The
// two maps are disjoint on exactly 27 code points in each direction:
//
//   latin-1 only   U+0080, U+0082-U+008C, U+008E, U+0091-U+009C, U+009E, U+009F
//                  the C1 controls, which is what the latin-1 flavour is MADE
//                  of. cp1252 puts printable characters in those byte slots, so
//                  it cannot produce a C1 control and cannot reverse one.
//   cp1252 only    U+20AC, U+2018-U+201E, U+2022, U+2013, U+2014, U+2026,
//                  U+2122, U+0152, U+0160, U+0178, U+017D and the rest of the
//                  27, all above 0xFF, so latin-1 cannot express any of them.
//
// Drop either codec and you go blind to one entire flavour. smoke/encoding-guard.js
// asserts the 27 and 27 rather than trusting this comment, because a false claim
// in a comment is the thing this whole module was written in response to.
//
// The ORDER decides attribution only: latin-1 first, so a pure latin-1 sequence
// is reported as latin-1. That is the difference between "somebody's editor did
// this" and "a cp1252 aware pipeline did this".
const CODECS = ['latin1', 'cp1252'];

const LEAD_MIN = 0xC2;  // 0xC0 and 0xC1 are never legal UTF-8 lead bytes
const LEAD_MAX = 0xF4;  // 0xF5 and above are never legal either

function toByte(ch, codec) {
  const cp = ch.codePointAt(0);
  if (codec === 'cp1252') {
    const mapped = CP1252_TO_BYTE.get(ch);
    if (mapped !== undefined) return mapped;
    return (cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF)) ? cp : null;
  }
  return cp <= 0xFF ? cp : null;
}

function widthForLead(lead) {
  if (lead <= 0xDF) return 2;
  if (lead <= 0xEF) return 3;
  return 4;
}

// One pass of detection. Returns a hit per corrupted character, in order, with
// the index measured in CODE POINTS rather than UTF-16 units so a legitimate
// astral character earlier in the text cannot shift every later offset.
//  opts.cap stops the scan early. lib/site-crawl.js runs this over live page
//  bodies that reach 270KB, and it only ever reports the first few hits, so
//  scanning the whole document to throw the tail away is the exact shape of
//  per-request waste this project has already paid a $169 bill for.
function analyze(text, opts) {
  const cap = (opts && opts.cap) || Infinity;
  const chars = Array.from(text);
  const hits = [];
  for (let i = 0; i < chars.length && hits.length < cap; i++) {
    const lead = chars[i].codePointAt(0);
    if (lead < LEAD_MIN || lead > LEAD_MAX) continue;
    const width = widthForLead(lead);
    if (i + width > chars.length) continue;

    let hit = null;
    for (const codec of CODECS) {
      const bytes = [];
      let usable = true;
      for (let k = 0; k < width; k++) {
        const b = toByte(chars[i + k], codec);
        // A FAST PATH, not a correctness guard, and the difference matters if
        // you are reading this while mutation testing. Requiring continuation
        // bytes after the lead is redundant: a non-continuation byte makes the
        // sequence invalid UTF-8, and the decode below rejects it anyway.
        // Verified exhaustively over every 2 and 3 byte sequence with a legal
        // lead, so a mutation of this line SURVIVES by design and belongs in no
        // deploy gate manifest.
        //
        // It stays because it is worth 3.2x on lead-dense text: 13ms against
        // 42ms over 288K characters of accented prose, where every accented
        // letter is a candidate that has to be rejected and would otherwise
        // allocate a Buffer and decode it. lib/site-crawl.js runs this over
        // live page bodies that reach 270KB.
        if (b === null || (k > 0 && (b < 0x80 || b > 0xBF))) { usable = false; break; }
        bytes.push(b);
      }
      if (!usable) continue;

      const buf = Buffer.from(bytes);
      const decoded = buf.toString('utf8');
      // Exactly one character, and no replacement character. Node's UTF-8
      // decoder already rejects overlong forms and encoded surrogates by
      // emitting U+FFFD, so neither needs a test of its own.
      //
      // There WAS one here, a re-encode identity check. It was removed on
      // 2026-09-03 because no mutation could kill it: checked exhaustively over
      // every 2 and 3 byte sequence with a legal lead, it changed the verdict
      // zero times. Unkillable code is how a guard becomes decoration, so the
      // dependency on the decoder is asserted directly in the suite instead of
      // being defended by code no test can reach.
      if (Array.from(decoded).length !== 1) continue;
      if (decoded.indexOf('\uFFFD') !== -1) continue;

      hit = { index: i, width, codec, chunk: chars.slice(i, i + width).join(''), fixed: decoded };
      break;
    }
    if (hit) { hits.push(hit); i += width - 1; }
  }
  return hits;
}

function repairOnce(text) {
  const hits = analyze(text);
  if (!hits.length) return { text, hits };
  const chars = Array.from(text);
  let out = '';
  let at = 0;
  for (const h of hits) {
    out += chars.slice(at, h.index).join('');
    out += h.fixed;
    at = h.index + h.width;
  }
  out += chars.slice(at).join('');
  return { text: out, hits };
}

// Reverse the damage until the text stops changing, and report how many layers
// deep it went. MAX_DEPTH is a hard stop rather than a while loop on purpose:
// this runs per file over the whole repository, and an unbounded loop over
// attacker-shaped text is the failure mode this project has already paid for.
const MAX_DEPTH = 8;

function repair(text) {
  let cur = text;
  let depth = 0;
  const passes = [];
  while (depth < MAX_DEPTH) {
    const r = repairOnce(cur);
    if (!r.hits.length) break;
    passes.push(r.hits);
    cur = r.text;
    depth += 1;
  }
  return { text: cur, depth, passes, truncated: depth === MAX_DEPTH };
}

// -- The shared artifact, so a rederive disagrees about DETECTION only ------
//  scripts/mojibake-rederive.js reimplements the detector and must reach the
//  same verdict. It walks with these helpers rather than its own copy, because
//  the claim under test is "this text is corrupted", not "these are the files".
//  A second walk that skipped one directory would read as a detector
//  disagreement, which is the one thing the rederive must not be able to fake.
const SCAN_EXT = new Set(['.html', '.js', '.md', '.json', '.css', '.yml', '.yaml', '.csv', '.liquid', '.txt', '.py']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', 'build']);

function walk(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

// Anything that is not valid UTF-8 is a DIFFERENT problem and returns null, so
// it is never reported as mojibake. Reporting it here would be a misleading hit
// on a file whose actual fault is that it was never UTF-8 to begin with.
function readUtf8(file) {
  let raw;
  try { raw = fs.readFileSync(file); } catch (e) { return null; }
  const text = raw.toString('utf8');
  if (Buffer.compare(Buffer.from(text, 'utf8'), raw) !== 0) return null;
  return text;
}

module.exports = {
  analyze, repairOnce, repair,
  walk, readUtf8, SCAN_EXT, SKIP_DIRS,
  CP1252_HIGH, CODECS, LEAD_MIN, LEAD_MAX, MAX_DEPTH, toByte, widthForLead,
};
