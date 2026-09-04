'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADD ONE SECTION TO A LIVE PAGE BODY, AND PROVE NOTHING ELSE MOVED.
//
//  Extracted from scripts/csp-bundle-inventory-csv.js on 2026-09-04 when the CSA
//  page needed the same treatment. One implementation rather than two, for the
//  same reason the gradebook has one builder: a second copy drifts, and the copy
//  that drifts is the one nobody is looking at.
//
//  ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//  Body HTML replaces wholesale and Matrixify reports the replacement as a
//  success either way. On 2026-08-22 an import deleted the entire self-study tab
//  from /pages/join and every guard in that generator was green, because none of
//  them looked at the live page (board 112, docs/availability.md).
//
//  So a caller here never composes a body. It hands over the live one and a
//  block, and gets back the live one with the block inserted, or a refusal.
//
//  ── THE TWO ASSERTIONS ─────────────────────────────────────────────────────
//      out.length === live.length + block.length
//      out with the block removed === live, byte for byte
//
//  Together they mean no existing byte moved, changed or vanished. A diff of the
//  rendered text cannot make that claim about a 20KB body: it would wave through
//  a deleted list item three screens below the edit.
//
//  ── THE $ HAZARD, WHICH IS NOT OBVIOUS ─────────────────────────────────────
//  String.replace interprets $&, $` and $' in a STRING replacement, so a block
//  containing any of them splices in the matched text, or the whole body before
//  or after the match. Measured: "AAA<anchor>ZZZ" with a block carrying all
//  three came back "AAA[block <anchor> and AAA and ZZZ end]<anchor>ZZZ". On a
//  page whose selling point is a price, a "$" is one edit away. Both replaces
//  below are FUNCTION replacements, which are not interpreted at all.
// ─────────────────────────────────────────────────────────────────────────────

//  live    the body as fetched, never one this process composed
//  block   the authored section, including its own leading whitespace
//  anchor  a string that occurs EXACTLY once; the block goes immediately before
//  sentinel a phrase from the block used to detect an already-applied insert,
//          rather than matching on prose somebody may later edit
function splice({ live, block, anchor, sentinel }) {
  const problems = [];

  if (live.includes(sentinel)) {
    problems.push('the section is ALREADY on the live page: nothing to do, and a second insert would print it twice');
  }
  const hits = live.split(anchor).length - 1;
  if (hits !== 1) {
    problems.push(`the anchor occurs ${hits} times, expected exactly 1. The page layout changed and this must be re-aimed rather than guessed at.`);
  }
  if (problems.length) return { problems };

  const out = live.replace(anchor, () => block + anchor);
  problems.push(...verifyInsertion(live, block, out));
  return { problems, out };
}

//  Factored out so it can be mutation tested against a deliberately corrupted
//  output. splice() builds its own `out`, so a test that only calls splice()
//  can never prove these two assertions fire rather than merely existing.
function verifyInsertion(live, block, out) {
  const problems = [];
  if (out.length !== live.length + block.length) {
    problems.push(`length is ${out.length}, expected ${live.length + block.length}. Something other than a pure insertion happened.`);
  }
  if (out.replace(block, () => '') !== live) {
    problems.push('removing the block does not return the live body byte for byte');
  }
  return problems;
}

//  An authored block must not carry the dashes this repo does not use in its own
//  prose. Escapes rather than the characters themselves, so this file stays
//  clean under a repo-wide grep for them, the same reason lib/mojibake.js spells
//  its examples as codepoints.
function checkAuthored(block, sentinel) {
  if (!block.includes(sentinel)) throw new Error(`the block no longer contains the sentinel ${JSON.stringify(sentinel)}`);
  if (block.includes('\u2014') || block.includes('\u2013')) {
    throw new Error('the block contains a dash this repo does not use in authored prose');
  }
  return block;
}

module.exports = { splice, verifyInsertion, checkAuthored };
