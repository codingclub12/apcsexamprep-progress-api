'use strict';
// -----------------------------------------------------------------------------
//  MOJIBAKE FIXTURES FOR THE SUITES. Not the detector: the corrupter.
//
//  lib/mojibake.js maps a code point BACK to the byte it came from. This file
//  maps a byte FORWARD to the character a misreading codec would show. Two
//  directions, two files, on purpose: a fixture built by the code under test
//  moves when that code moves, so mutating the module's table would corrupt the
//  fixture and the detector together and the suite would stay green. That is the
//  hollow-guard failure the deploy gate exists to catch, and it is easy to
//  commit by accident.
//
//  There is exactly ONE copy of this table, for the same reason there is now
//  exactly one detector. smoke/site-crawl.js first got a hand-cut five-entry
//  version of it and built a fixture that was cp1252 for one byte and latin-1
//  for another. No single misreading produces that, the module correctly
//  refused to call it mojibake, and the assertion failed for a reason that had
//  nothing to do with the code it was testing.
//
//  Everything is numbers and escapes, so this file is pure ASCII and cannot
//  itself be mojibaked.
// -----------------------------------------------------------------------------

//  cp1252 byte -> code point. cp1252 agrees with latin-1 everywhere except
//  0x80 to 0x9F, and these are the 27 positions it defines there. The five it
//  leaves undefined (0x81, 0x8D, 0x8F, 0x90, 0x9D) pass through unchanged.
const CP1252_DECODE = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

const ch = (cp) => String.fromCodePoint(cp);

//  The UTF-8 bytes of a character, which is what got misread in the first place.
const utf8 = (cp) => Array.from(Buffer.from(ch(cp), 'utf8'));

//  Those bytes read back through the wrong codec. THIS IS THE CORRUPTION,
//  performed rather than described.
const asCp1252 = (bytes) => bytes
  .map((b) => ch(CP1252_DECODE[b] === undefined ? b : CP1252_DECODE[b])).join('');
const asLatin1 = (bytes) => bytes.map((b) => ch(b)).join('');

//  A character corrupted once. cp1252 is what a browser and a spreadsheet show;
//  latin-1 is what the 2026-08-07 admin-page incident produced.
const cp1252Once = (cp) => asCp1252(utf8(cp));
const latin1Once = (cp) => asLatin1(utf8(cp));

//  Corrupting already-corrupted text again, which is what the drafts for the
//  2026-09-03 fix contained. A rule written from THIS cannot match the form
//  above: they do not even share a first character.
const corruptAgain = (text) => Array.from(text)
  .map((c) => asCp1252(Array.from(Buffer.from(c, 'utf8')))).join('');

module.exports = { CP1252_DECODE, utf8, asCp1252, asLatin1, cp1252Once, latin1Once, corruptAgain, ch };
