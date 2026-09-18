'use strict';
// -----------------------------------------------------------------------------
//  SURGICAL EDITS TO A LIVE SHOPIFY BODY, AND THE PROOF THEY TOUCHED NOTHING ELSE.
//
//  Extracted from scripts/csa-qotd-authoring-repair.js on 2026-09-17, when a
//  second repair needed the same machinery. The repo's own rule is that when a
//  module lands the MIGRATION is the change, so the original generator was moved
//  onto this and its mutation tests still cover it.
//
//  WHAT IT GIVES YOU
//    applyEdits    every anchor must match the live body EXACTLY once, spliced
//                  in one pass against the ORIGINAL, never a partly-edited copy
//    reverse       put the captured originals back; the result must equal the
//                  live body byte for byte, so an edit cannot quietly touch
//                  anything it did not declare
//    checkAuthored ASCII only and no dashes in text this repo writes
//    sheet         Matrixify CSV, BOM, CRLF rows, QUOTE_ALL
//    parseCsv      a reader that did not write the file
//    checkCombined a many-row sheet proved row for row against its single-row
//                  siblings: same handles, byte-identical bodies, none dropped,
//                  none repeated
//
//  TWO FAILURES THIS SHAPE IS BUILT AGAINST, both paid for once already:
//
//    an anchor validated against a body an earlier edit already changed is not
//    validated against anything real, and
//
//    a reverse pass that searches for its own replacement text finds the WRONG
//    copy when one replacement contains another. Day 15 had exactly that: the
//    rewritten trace paragraph contains the same index listing the tip-box edit
//    produces. Spans are recorded by offset, not re-found by content.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const BOM = '﻿';

//  Anchors are matched against the LIVE body and spliced in one pass.
function applyEdits(label, live, edits) {
  const spans = edits.map((e) => {
    const re = new RegExp(e.find.source, e.find.flags.indexOf('g') === -1 ? e.find.flags + 'g' : e.find.flags);
    const hits = [];
    let m;
    while ((m = re.exec(live))) {
      hits.push({ start: m.index, end: m.index + m[0].length, was: m[0] });
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
    if (hits.length === 0) throw new Error(label + ' edit ' + e.id + ': anchor matched 0 times, so the live body is not what this repair was written against');
    if (hits.length > 1) throw new Error(label + ' edit ' + e.id + ': anchor matched ' + hits.length + ' times, so it is not specific enough to be safe');
    return { id: e.id, start: hits[0].start, end: hits[0].end, was: hits[0].was, now: e.to };
  }).sort((a, b) => a.start - b.start);

  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) {
      throw new Error(label + ': edits ' + spans[i - 1].id + ' and ' + spans[i].id + ' overlap in the live body');
    }
  }

  let out = ''; let at = 0;
  spans.forEach((sp) => { out += live.slice(at, sp.start) + sp.now; at = sp.end; });
  out += live.slice(at);
  return { out, captured: spans };
}

function reverse(repaired, captured) {
  let back = ''; let at = 0; let shift = 0;
  for (const sp of captured) {
    const startInOut = sp.start + shift;
    back += repaired.slice(at, startInOut) + sp.was;
    at = startInOut + sp.now.length;
    shift += sp.now.length - sp.was.length;
  }
  back += repaired.slice(at);
  return back;
}

//  The dash class is written as escapes rather than as characters, the same way
//  lib/mojibake.js writes its examples as codepoints: a guard that hunts a
//  character must not be the reason that character is in this repository.
function checkAuthored(label, edits) {
  edits.forEach((e) => {
    if (/[—–]/.test(e.to)) throw new Error(label + ' edit ' + e.id + ': authored text contains an em-dash or en-dash');
    const nonAscii = e.to.match(/[^\x09\x0a\x0d\x20-\x7e]/g);
    if (nonAscii) {
      throw new Error(label + ' edit ' + e.id + ': authored text is not ASCII ('
        + [...new Set(nonAscii)].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ') + ')');
    }
  });
}

const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function sheet(cols, rows) {
  const lines = [cols.map(q).join(',')];
  rows.forEach((r) => lines.push(cols.map((c) => q(r[c] === undefined ? '' : r[c])).join(',')));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  Deliberately from scratch rather than the writer's own escaping run backwards.
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = []; let row = []; let cell = ''; let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; i++; }
    else if (c === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

//  `singles` maps handle to the Body HTML read back out of that article's own
//  sheet. Returns the row count so a caller can print something true.
function checkCombined(csvText, singles, cols, opts) {
  const o = opts || {};
  const name = o.label || 'combined sheet';
  const handleCol = o.handleCol || 'Handle';
  const bodyCol = o.bodyCol || 'Body HTML';
  const rows = parseCsv(csvText);
  if (!rows.length) throw new Error(name + ': parsed back as no rows at all');
  if (rows[0].join(',') !== cols.join(',')) throw new Error(name + ': header changed in the round trip');
  if (rows.length - 1 !== singles.size) {
    throw new Error(name + ': carries ' + (rows.length - 1) + ' rows but there are ' + singles.size + ' articles');
  }
  const hi = cols.indexOf(handleCol);
  const bi = cols.indexOf(bodyCol);
  const seen = new Set();
  rows.slice(1).forEach((row, i) => {
    const handle = row[hi];
    const body = row[bi];
    if (o.each) o.each(row, i);
    if (seen.has(handle)) throw new Error(name + ': ' + handle + ' appears twice, so one import would write that body twice');
    seen.add(handle);
    if (!singles.has(handle)) throw new Error(name + ': ' + handle + ' is not one of the articles this repair covers');
    if (singles.get(handle) !== body) {
      throw new Error(name + ': ' + handle + ' differs from its own sheet ('
        + singles.get(handle).length + ' vs ' + body.length + ' characters)');
    }
  });
  const missing = [...singles.keys()].filter((h) => !seen.has(h));
  if (missing.length) throw new Error(name + ': dropped ' + missing.join(', '));
  return seen.size;
}

module.exports = { BOM, applyEdits, reverse, checkAuthored, sheet, parseCsv, checkCombined };
