'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MOJIBAKE DETECTION, GENERAL FORM.
//
//  ── THE BUG THIS IS FOR ─────────────────────────────────────────────────────
//  Text whose UTF-8 bytes were decoded with a single-byte codec and re-encoded
//  as UTF-8. The result is still perfectly valid UTF-8: it parses, it lints, it
//  serves, every other check passes. The only thing wrong with it is that it
//  means the wrong character, and the only reader who notices is a student.
//
//      a bullet     .   becomes  a-euro-cent
//      a dart       .   becomes  eth-Y-with-diaeresis-Z-caron-macron
//
//  ── WHY THIS IS NOT THE OBVIOUS PATTERN LIST ────────────────────────────────
//  Corruption comes at DEPTHS. Run the damage once and a bullet becomes three
//  characters led by U+00E2. Run it twice and those three become seven, led by
//  U+00C3. A rule written from examples of one depth is blind to the other, and
//  blind in the direction that matters: the single-pass form is what has
//  actually been observed on live pages.
//
//  The handoff for this work prescribed "U+00C3 followed by a codepoint in
//  U+0080 to U+00BF". That is exactly the double-pass form, and it is a strict
//  SUBSET of what is implemented here: U+00C3 is one of the 51 possible lead
//  characters, and the width-2 case is one of three. Implemented as prescribed
//  and nothing more, this rule would have passed the single-pass corruption
//  that the same handoff says was found on live pages, and it would have passed
//  the corruption sitting in this repo's own CED text dumps, which are damaged
//  at single-pass depth in exactly that way.
//
//  So the test is structural instead of a pattern list. Mojibake is reversible,
//  and reversibility is the whole signature:
//
//    1. map each character back to the byte a single-byte codec would have
//       given it (cp1252 first, latin-1 for the five bytes cp1252 leaves
//       unmapped)
//    2. require the first byte to be a UTF-8 lead byte and the rest to be
//       continuation bytes, in the count that lead byte demands
//    3. decode those bytes as UTF-8 and require exactly one character back,
//       with no replacement character
//
//  Anything that survives all three was mojibake, and step 3 just recovered the
//  original character. This fires at every depth, on both codecs, for 2, 3 and
//  4 byte characters, without knowing a single example in advance.
//
//  ── CP1252 IS NOT OPTIONAL ──────────────────────────────────────────────────
//  The repo already has a latin-1-only detector in smoke/encoding-guard.js. It
//  cannot see the corruption that has actually shipped, because the characters
//  a bullet turns into include the euro sign, and the euro sign has no latin-1
//  byte at all: the reversal attempt is lossy, the check skips the character,
//  and the file reports clean. Every byte from 0x80 to 0x9F is in that gap, and
//  those are precisely the bytes that show up mid-sequence in a corrupted
//  3-byte character. Board task filed separately; this module is the general
//  form and does not depend on that one.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  cp1252's 0x80 to 0x9F block, the 27 bytes that do not map to their own
//  codepoint. Written as codepoints so this file stays plain ASCII and cannot
//  itself be "repaired" by a well-meaning editor.
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

//  codepoint -> byte, for the characters a single-byte codec could have
//  produced. Latin-1 covers 0x00 to 0xFF directly; cp1252 overrides 27 of the
//  high controls with printable characters, and those are the ones a decoder
//  is most likely to have used, so they win.
const BYTE_OF = new Map();
for (let b = 0; b <= 0xff; b++) BYTE_OF.set(b, b);
for (const [b, cp] of Object.entries(CP1252_HIGH)) BYTE_OF.set(cp, Number(b));

//  How many bytes a UTF-8 lead byte promises, or 0 if it is not a lead byte.
//  0xC0 and 0xC1 are excluded: they can only encode an overlong ASCII
//  character, which a decoder rejects, so they are never a real lead.
function leadWidth(byte) {
  if (byte >= 0xc2 && byte <= 0xdf) return 2;
  if (byte >= 0xe0 && byte <= 0xef) return 3;
  if (byte >= 0xf0 && byte <= 0xf4) return 4;
  return 0;
}

const isContinuation = (byte) => byte >= 0x80 && byte <= 0xbf;

//  Decode bytes as UTF-8 and return the single character they mean, or null.
//  Strict: Buffer.toString substitutes U+FFFD for invalid sequences rather than
//  throwing, so the result is checked instead of trusted.
function reverse(bytes) {
  const decoded = Buffer.from(bytes).toString('utf8');
  if (decoded.includes('�')) return null;
  const chars = [...decoded];
  return chars.length === 1 ? chars[0] : null;
}

/**
 * Every mojibake sequence in a string, left to right, non-overlapping.
 *
 * Runs on DECODED text: the input is a JavaScript string, so whatever read the
 * file has already turned bytes into characters. That is the level the bug
 * lives at.
 *
 * @param {string} text
 * @returns {Array<{index: number, text: string, means: string}>}
 *   `text` is the damaged sequence and `means` the character it really is.
 */
function findMojibake(text) {
  const hits = [];
  if (typeof text !== 'string' || !text) return hits;

  for (let i = 0; i < text.length; i++) {
    const lead = BYTE_OF.get(text.codePointAt(i));
    if (lead === undefined) continue;
    const width = leadWidth(lead);
    if (!width) continue;

    const bytes = [lead];
    let ok = true;
    for (let k = 1; k < width; k++) {
      const b = BYTE_OF.get(text.codePointAt(i + k));
      if (b === undefined || !isContinuation(b)) { ok = false; break; }
      bytes.push(b);
    }
    if (!ok) continue;

    const means = reverse(bytes);
    if (means === null) continue;

    hits.push({ index: i, text: text.slice(i, i + width), means });
    i += width - 1;
  }
  return hits;
}

/**
 * How many corruption passes a string is carrying: 0 for clean text, 1 for the
 * single-pass form, 2 when one repair pass leaves mojibake behind because the
 * text was damaged twice.
 *
 * Depth matters because a rule written from one depth's examples is blind to the
 * other, which is the specific way this rule was found hollow before it
 * shipped. The mutation battery asserts both depths separately for that reason.
 *
 * @param {string} text
 * @returns {number}
 */
function mojibakeDepth(text) {
  let cur = text;
  //  Four is far past anything real. The cap is here so a pathological string
  //  cannot spin.
  for (let pass = 0; pass < 4; pass++) {
    if (!findMojibake(cur).length) return pass;
    cur = repair(cur);
  }
  return 4;
}

/**
 * The same finding as a list of human sentences, for a gate's failure output.
 * @param {string} text
 * @param {string} [label] what the text is, for the message
 * @returns {string[]} empty when the text is clean
 */
function mojibakeFailures(text, label) {
  const where = label ? `${label}: ` : '';
  const depth = mojibakeDepth(text);
  return findMojibake(text).map((h) => {
    const context = text.slice(Math.max(0, h.index - 40), h.index + h.text.length + 40);
    return `${where}mojibake at ${h.index}, ${JSON.stringify(h.text)} means ${JSON.stringify(h.means)}`
      + ` (corruption depth ${h.depth}): ${JSON.stringify(context)}`;
  });
}

//  Repair, for tooling that has to report what the text SHOULD say. Deliberately
//  not wired into any gate: a validator's job is to refuse the sheet, not to
//  quietly rewrite it. One pass, right to left, so indexes stay valid.
function repair(text) {
  let out = text;
  for (const h of findMojibake(text).reverse()) {
    out = out.slice(0, h.index) + h.means + out.slice(h.index + h.text.length);
  }
  return out;
}

module.exports = { findMojibake, mojibakeDepth, mojibakeFailures, repair, leadWidth, BYTE_OF, CP1252_HIGH };
