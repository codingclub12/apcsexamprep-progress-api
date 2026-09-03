'use strict';
// -----------------------------------------------------------------------------
//  THE ONE PLACE THAT KNOWS WHAT MOJIBAKE LOOKS LIKE.
//
//  Before 2026-09-03 this repo held three independent opinions, and every one of
//  them was blind to part of the corruption reported on a live page:
//
//    lib/site-crawl.js              cp1252 YES, 4-byte characters NO
//    smoke/encoding-guard.js        cp1252 NO,  4-byte characters NO, .txt unscanned
//    scripts/matrixify-preflight.js cp1252 NO,  4-byte characters NO
//
//  The cp1252 half of the lesson had already been learned, in the crawler, with
//  a comment explaining exactly why it mattered. It was never carried to the
//  other two. That is the argument for one module rather than a fourth opinion:
//  lib/site-crawl.js was right and the repo stayed wrong anyway.
//
//  THREE HOLES, and they compound.
//
//  1. THE CODEC. cp1252 agrees with latin-1 everywhere except 0x80 to 0x9F,
//     where it maps ABOVE U+00FF: 0x80 is U+20AC, 0x92 is U+2019, 0x9F is
//     U+0178. Reversing through latin-1 alone cannot produce those code points,
//     so a lossless-round-trip test throws the run away and calls the text
//     clean. cp1252 is what Windows, Excel and every CSV pipeline into this
//     store use, so it is the flavor a Matrixify sheet actually carries and the
//     flavor a browser actually shows.
//
//  2. THE WIDTH. A 4-byte character corrupts into FOUR characters. All three
//     detectors tried widths 3 and 2 and led on {U+00C2, U+00C3, U+00E2}, so no
//     emoji could be detected at any width, by any of them. The reported page
//     had one.
//
//  3. THE DEPTH. A rule written from a doubly corrupted sample looks for the
//     wrong bytes. Reversibility makes depth a non-question: repair() runs
//     passes until the text stops changing and reports how many it took.
//
//  HOW THIS WORKS, and why it needs no pattern list at all. Mojibake is a
//  reversible accident, so detection is a decode rather than a match:
//
//    a. A run can only begin where the character maps back to a legal UTF-8
//       lead byte, 0xC2 to 0xF4. That range is DERIVED from UTF-8, not
//       enumerated from samples, so it covers leads nobody has seen yet.
//    b. The lead byte states the run's exact length: 2, 3 or 4. No guessing.
//    c. Map the run back to bytes under cp1252, then under latin-1, each
//       strictly: the moment a character cannot have come from that codec, that
//       codec is out. Strictness is what stops legitimate text being "repaired".
//    d. Decode the bytes as UTF-8. Exactly one character out, and no replacement
//       character, means the text was corrupted and the decode just recovered
//       the original. Anything else is healthy text and is left alone.
//
//  WHY THERE IS A SECOND TIER. Widening the lead range to all of 0xC2 to 0xF4
//  buys the emoji case and costs one class of false positive, found by scanning
//  both repositories rather than by reasoning: Shopify's own Nordic locale files
//  carry the sort labels "A-ring en-dash A" and "O-diaeresis en-dash A", which
//  reverse cleanly to U+0156 and U+0596. They are real text. Nothing structural
//  separates them from real mojibake, because structurally they ARE the same
//  shape, so the discriminator is the character recovered: this store's content
//  is English AP Computer Science, and it contains Latin-1 letters, punctuation,
//  arrows, box drawing and emoji. It does not contain Latin Extended-A or
//  Hebrew. A run that reverses to something outside PLAUSIBLE is reported as a
//  SUSPECT rather than a finding, so it is never silently dropped and never
//  fails a build on its own. Widen PLAUSIBLE the day this store ships Swedish.
// -----------------------------------------------------------------------------

//  Only the 0x80 to 0x9F window differs between cp1252 and latin-1; every other
//  byte is identical. Written as escapes rather than literal characters so this
//  table cannot itself be corrupted by the thing it exists to detect. Lifted
//  from lib/site-crawl.js, which had it right first.
const CP1252_HIGH = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A,
  '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F,
};

const CODECS = ['cp1252', 'latin1'];

//  U+FFFD, from its code point for the same reason as the table above.
const REPLACEMENT = String.fromCharCode(0xFFFD);

//  A UTF-8 lead byte says how long its character is. 0xC0 and 0xC1 are never
//  legal and nothing above 0xF4 is either, so the lead range is exactly this.
const LEAD_MIN = 0xC2;
const LEAD_MAX = 0xF4;

//  What this store's text can plausibly contain. See the second-tier note above.
const PLAUSIBLE = [
  [0x00A0, 0x00FF],   // Latin-1 Supplement: accented letters, nbsp, degree, section
  [0x2000, 0x206F],   // General Punctuation: bullet, dashes, curly quotes, ellipsis
  [0x20A0, 0x20BF],   // Currency
  [0x2100, 0x214F],   // Letterlike: trademark, numero
  [0x2190, 0x21FF],   // Arrows
  [0x2200, 0x22FF],   // Mathematical Operators
  [0x2500, 0x259F],   // Box Drawing and Block Elements
  [0x25A0, 0x25FF],   // Geometric Shapes: the dashboard delta triangles
  [0x2600, 0x27BF],   // Miscellaneous Symbols and Dingbats: check marks
  [0x2B00, 0x2BFF],   // Miscellaneous Symbols and Arrows
  [0xFE0F, 0xFE0F],   // Variation selector 16, emoji presentation
  [0x1F000, 0x1FAFF], // Emoji
];

function plausible(ch) {
  const cp = ch.codePointAt(0);
  return PLAUSIBLE.some(([lo, hi]) => cp >= lo && cp <= hi);
}

function runLength(leadByte) {
  if (leadByte >= 0xF0) return 4;
  if (leadByte >= 0xE0) return 3;
  return 2;
}

//  Fast path. Nothing can be mojibake without a character in the lead range, and
//  almost every file here is pure ASCII. Page bodies run to 270K characters and
//  the preflight reads every one of them on every sheet.
const HAS_LEAD = new RegExp('[' + String.fromCharCode(LEAD_MIN)
  + '-' + String.fromCharCode(LEAD_MAX) + ']');

//  Turn a run of characters back into the bytes they were before something read
//  them with the wrong codec. Returns null the moment a character cannot have
//  come from this codec, which is what stops legitimate text being "repaired".
function toBytes(run, codec) {
  const bytes = [];
  for (const ch of run) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xFF) {
      //  In cp1252 the 0x80 to 0x9F slots hold the characters in the table
      //  above, so a raw control character in that window did not come from
      //  cp1252 text. Rejecting it here is the difference between two strict
      //  codecs and one loose union of them, and the union has a false positive
      //  the pair does not.
      if (codec === 'cp1252' && cp >= 0x80 && cp <= 0x9F) return null;
      bytes.push(cp);
      continue;
    }
    if (codec === 'cp1252' && CP1252_HIGH[ch] !== undefined) {
      bytes.push(CP1252_HIGH[ch]);
      continue;
    }
    return null;
  }
  return Buffer.from(bytes);
}

//  The single character a run means, or null when the run is healthy text that
//  merely happens to start with a lead-range character.
function reverseRun(run) {
  const width = Array.from(run).length;
  for (const codec of CODECS) {
    const buf = toBytes(run, codec);
    if (!buf || buf.length !== width) continue;
    const decoded = buf.toString('utf8');
    if (decoded.indexOf(REPLACEMENT) !== -1) continue;
    if (Array.from(decoded).length !== 1) continue;
    return decoded;
  }
  return null;
}

//  The byte a code point came from under either codec, or -1. Exported so the
//  suite can assert the derivation rather than trust the prose above.
function byteOf(codePoint) {
  const ch = String.fromCodePoint(codePoint);
  for (const codec of CODECS) {
    const buf = toBytes(ch, codec);
    if (buf && buf.length === 1) return buf[0];
  }
  return -1;
}

//  ONE DETECTION PASS.
//    hits      runs that reverse cleanly to a character this store can contain
//    suspects  runs that reverse cleanly to something it cannot. Reported, never
//              fatal. See the second-tier note at the top.
//  `cap` bounds the work on a corrupted megabyte; 0 means no cap.
function scan(text, cap) {
  const str = String(text == null ? '' : text);
  const out = { hits: [], suspects: [] };
  if (!HAS_LEAD.test(str)) return out;
  const limit = cap === undefined ? 0 : cap;
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    if (limit && out.hits.length >= limit) break;
    const lead = byteOf(chars[i].codePointAt(0));
    if (lead < LEAD_MIN || lead > LEAD_MAX) continue;
    const width = runLength(lead);
    if (i + width > chars.length) continue;
    const run = chars.slice(i, i + width).join('');
    const fixed = reverseRun(run);
    if (fixed === null) continue;
    (plausible(fixed) ? out.hits : out.suspects).push({ index: i, run, fixed });
    i += width - 1;
  }
  return out;
}

//  The findings a build may fail on. Callers that want the suspects use scan().
function detect(text, cap) {
  return scan(text, cap).hits;
}

//  REPAIR IS FOR TEXT YOU HAVE ALREADY ESTABLISHED IS CORRUPTED, and it reverses
//  every reversible run, SUSPECTS INCLUDED. That is deliberate and it is the
//  opposite of what detect() does, so the reason matters.
//
//  A doubly corrupted emoji passes through Latin Extended-A on its way back. The
//  target emoji at depth 2 is eight characters, and two of the four runs reverse
//  to U+0178 and U+017D, which detect() correctly classes as suspects because
//  this store's content has no Latin Extended-A in it. Reversing only the
//  plausible runs leaves the text stalled halfway, neither corrupted nor fixed,
//  and reports depth 1 for something that is depth 2. Reversing everything gets
//  the emoji back in exactly two passes.
//
//  The cost is that repair() WILL damage the Nordic sort labels that detect()
//  deliberately leaves alone: "A-ring en-dash A" becomes U+0156. So repair is
//  never wired into an automatic path, and every call site is a human deciding
//  that a specific file is corrupted. Pass { plausibleOnly: true } for the
//  conservative reversal when that is what you want.
//
//  `passes` is the corruption depth: 1 for text read through the wrong codec
//  once, 2 for the doubly corrupted form the handoff drafts were written from.
const MAX_PASSES = 8;

function repair(text, opts) {
  const options = typeof opts === 'number' ? { maxPasses: opts } : (opts || {});
  const limit = options.maxPasses === undefined ? MAX_PASSES : options.maxPasses;
  let current = String(text == null ? '' : text);
  let passes = 0;
  let total = 0;
  while (passes < limit) {
    const found = scan(current);
    const hits = options.plausibleOnly
      ? found.hits
      : found.hits.concat(found.suspects).sort((a, b) => a.index - b.index);
    if (!hits.length) break;
    const chars = Array.from(current);
    const out = [];
    let cursor = 0;
    for (const hit of hits) {
      out.push(chars.slice(cursor, hit.index).join(''));
      out.push(hit.fixed);
      cursor = hit.index + Array.from(hit.run).length;
    }
    out.push(chars.slice(cursor).join(''));
    current = out.join('');
    total += hits.length;
    passes += 1;
  }
  return { text: current, passes, hits: total };
}

//  The 1-based line a hit sits on, so a report points at somewhere to look.
function lineOf(text, index) {
  return Array.from(String(text)).slice(0, index).join('').split('\n').length;
}

//  Names for the characters this store actually uses, so a report stays legible
//  in a terminal that cannot render them and in a log that is pure ASCII.
const NAMES = {
  0x2022: 'bullet', 0x2013: 'en dash', 0x2014: 'em dash', 0x2026: 'ellipsis',
  0x2018: 'left single quote', 0x2019: 'right single quote',
  0x201C: 'left double quote', 0x201D: 'right double quote',
  0x00A0: 'no-break space', 0x2002: 'en space', 0x2003: 'em space',
  0x00A7: 'section sign', 0x00B7: 'middle dot', 0x00B0: 'degree sign',
  0x2192: 'right arrow', 0x2190: 'left arrow', 0x2500: 'box drawing dash',
  0x25B2: 'up triangle', 0x25BC: 'down triangle', 0x2713: 'check mark',
  0x2717: 'ballot x', 0x2122: 'trademark',
};

function describe(ch) {
  const cp = ch.codePointAt(0);
  const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  if (NAMES[cp]) return NAMES[cp] + ' (' + hex + ')';
  if (cp >= 0x1F000) return 'emoji ' + hex;
  return hex;
}

//  "bullet (U+2022) x3, em dash (U+2014)", for a message a human can act on.
function summarize(hits) {
  const counts = new Map();
  for (const hit of hits) counts.set(hit.fixed, (counts.get(hit.fixed) || 0) + 1);
  return [...counts.entries()]
    .map(([ch, n]) => describe(ch) + (n > 1 ? ' x' + n : ''))
    .join(', ');
}

module.exports = {
  scan,
  detect,
  repair,
  lineOf,
  summarize,
  describe,
  plausible,
  //  Exported so the suite asserts the derivation instead of trusting the prose.
  byteOf,
  runLength,
  toBytes,
  LEAD_MIN,
  LEAD_MAX,
  PLAUSIBLE,
  CP1252_HIGH,
};
