'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CHECKS EVERY SHOPIFY PAGE SHEET HAS TO PASS, IN ONE PLACE.
//
//  ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//  There were three build scripts, each with its own copy of the same five
//  checks: tag balance, script compiles, JSON-LD parses, no new non-ASCII,
//  nothing that was hidden became visible. Copies drift, and both drifts that
//  happened were silent:
//
//    * stayed_hidden in the 1.1 gate printed its warning and returned 0, so it
//      reported a leak and passed anyway. It was the copy of a check that
//      worked elsewhere.
//    * the 1.4 gate's classification-mapping check used \bPrediction:\b. A word
//      boundary between a colon and a space never matches, so the marker was
//      unmatchable and the check was partly inert.
//
//  A fourth copy was about to be written for the Topic 1.4 exercises. This is
//  that copy, written once.
//
//  ── WHAT IS NOT HERE ────────────────────────────────────────────────────────
//  Anything page-shaped. The widget checks (dtb chips against blanks, match
//  keys, sequence ids), the exam-cue table rules, the EK density rules: those
//  belong to the page or the transform that needs them and stay in their own
//  script. Only the checks that are literally the same everywhere moved.
//
//  flat() did NOT move. The three callers had genuinely different versions, and
//  which entities a caller strips changes which sentences it reports as
//  changed. Each passes its own in.
// ─────────────────────────────────────────────────────────────────────────────

//  Every element carrying display:none, keyed by id. An element with no id
//  cannot be tracked across a rewrite and is skipped.
function hiddenIds(html) {
  const out = new Set();
  for (const m of html.matchAll(/<[a-z]+[^>]*>/gi)) {
    if (!m[0].replace(/\s/g, '').includes('display:none')) continue;
    const id = /id="([^"]+)"/.exec(m[0]);
    if (id) out.add(id[1]);
  }
  return out;
}

//  THE ANSWER-KEY LEAK CHECK. On 2026-08-27 a rewrite of the 1.1 lesson dropped
//  style="display:none" from eight CFU feedback boxes and served the answer key
//  on page load. Every static check that day passed: the markup was well formed,
//  the tags balanced, the scripts compiled.
function nothingUnhidden(before, after) {
  const has = hiddenIds(after);
  const lost = [...hiddenIds(before)].filter((id) => !has.has(id));
  return lost.length ? [`these were hidden and are not any more: ${lost.join(', ')}`] : [];
}

//  Comments are stripped first: an instruction comment containing a literal
//  <div> is not markup, and counting it as one hid a genuinely unclosed section
//  on 1.1 for a whole edit cycle.
function balancedTags(html, tags) {
  const fail = [];
  const nc = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of tags) {
    const open = (nc.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (nc.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) fail.push(`<${tag}> unbalanced: ${open} open, ${close} close`);
  }
  return fail;
}

//  new Function() is a parse, not an execution: nothing in the page body runs.
function scriptsParse(html) {
  const fail = [];
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`script does not compile: ${e.message}`); }
  }
  return fail;
}

//  Characters the page already had are fine; characters this edit introduced are
//  how mojibake got into earlier imports. Compared as a set, so moving an
//  existing character around is not flagged.
function noNewNonAscii(before, after) {
  const cp = (x) => new Set([...x].filter((ch) => ch.charCodeAt(0) > 127));
  const had = cp(before);
  const added = [...cp(after)].filter((ch) => !had.has(ch));
  return added.length ? [`introduced non-ASCII: ${JSON.stringify(added.join(''))}`] : [];
}

//  The sentences a human has to read. No automated check can tell whether copy
//  still reads like English, and a citation count of zero says nothing about it:
//  deleting codes from 1.1 produced "A birthdate applies." and the count still
//  went to zero. Caller supplies flat() because the three differ on entities.
function changedSentences(before, after, flat) {
  const seen = new Set(flat(before).split(/(?<=[.?!]) /));
  return flat(after).split(/(?<=[.?!]) /).filter((x) => !seen.has(x));
}

//  Matrixify wants one quoted cell per field, with embedded quotes doubled.
function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

function csvRow(page, body, title) {
  return [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [page.id, page.handle, title || page.title, body, 'MERGE'].map(csvCell).join(','),
  ].join('\n') + '\n';
}

module.exports = {
  hiddenIds,
  nothingUnhidden,
  balancedTags,
  scriptsParse,
  noNewNonAscii,
  changedSentences,
  csvCell,
  csvRow,
};
