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

//  ── AN AP CLAIM STANDING NEXT TO OFF-CED CONTENT ───────────────────────────
//  This is the check that was missing, and the reason a page could pass a gate
//  and still fail a review.
//
//  The old rule was "off-CED enrichment must be labelled as enrichment". Topic
//  1.2 satisfied it: the hashing section carried a banner reading "not assessed
//  in this topic". Six other places on the same page then told the student the
//  opposite. The section after it opened with "each illustrates a specific,
//  testable AP exam concept" over a rainbow-table case study; the FAQ answered
//  "how do password attacks appear on the AP exam" with a list of salting and
//  spraying; three chips in a table read "Exam Trap". A label loses to a claim.
//
//  So the unit of analysis is not the section, it is the distance. Any of AP,
//  exam, testable, assessed within `pad` characters of any off-CED term is a
//  failure regardless of what the enclosing banner says. The window is
//  deliberately generous: it is measured on FLATTENED text, where 500
//  characters is roughly two paragraphs, which is about as far as a reader
//  carries a framing sentence.
//
//  Two consequences worth accepting rather than tuning away. It will flag a
//  sentence whose whole purpose is to say a term is NOT examined, which is why
//  `exempt` exists and why every entry in it should be a phrase that could not
//  be read as a requirement. And it cannot see a claim made in a heading three
//  screens up. It is a proximity check, not a comprehension check.
//  "tested" is deliberately absent. An attacker tests a password against an
//  account, a tool tests millions of pairs, and every one of those sentences
//  reads as a claim about an exam to a regex. Six of the first run's twenty-two
//  reports were that verb. The list is the four words that can only mean the
//  exam, plus the two that are unambiguous variants of them.
const CLAIM_WORDS = /\b(?:AP|exam|exams|examined|testable|assessed|assessment)\b/gi;

//  A course name is not a claim. "AP Cybersecurity" appears in the page label,
//  the breadcrumb trail and the author's job title, and none of those say
//  anything about what is examined. Skipping them is safe because a sentence
//  that IS a claim carries "exam" or "assessed" as well, and that word reports
//  on its own.
//  Matched as SPANS, not as a prefix, so a claim word anywhere inside one is
//  skipped: "Exam" in the publisher's name "AP CS Exam Prep" is the case that
//  forced this. A sentence that really is a claim carries a second claim word
//  outside the name and reports on that one.
const PROPER_NAMES = ['AP CS Exam Prep', 'AP Cybersecurity', 'AP Computer Science',
  'AP Precalculus', 'AP Statistics', 'AP CSA', 'AP CSP'];

//  A URL is never a claim, and apcsexamprep.com puts "ap" and "exam" inside
//  every path on the site. Blanked to spaces rather than removed so that every
//  offset downstream still lines up with the text that was passed in.
const blankUrls = (t) => t.replace(/https?:\/\/[^\s"'<>]+/g, (m) => ' '.repeat(m.length));

function apClaimsNear(raw, terms, opts = {}) {
  const pad = opts.pad || 500;
  const exempt = opts.exempt || [];
  const out = [];
  const text = blankUrls(raw);
  const lower = text.toLowerCase();
  const hits = [];
  for (const t of terms) {
    let i = -1;
    while ((i = lower.indexOf(t.toLowerCase(), i + 1)) >= 0) hits.push({ t, i });
  }
  const spans = [];
  for (const n of PROPER_NAMES) {
    let i = -1;
    while ((i = text.indexOf(n, i + 1)) >= 0) spans.push([i, i + n.length]);
  }
  for (const m of text.matchAll(CLAIM_WORDS)) {
    const near = hits.filter((h) => Math.abs(h.i - m.index) <= pad);
    if (!near.length) continue;
    if (spans.some((sp) => m.index >= sp[0] && m.index < sp[1])) continue;
    const a = Math.max(0, m.index - 90);
    const window = text.slice(a, Math.min(text.length, m.index + 130)).trim();
    //  Exemption is read from a wider slice than the window that gets printed,
    //  because the sentence that disclaims a term often sits just before the
    //  clause the claim word lands in.
    const around = text.slice(Math.max(0, m.index - 260), m.index + 260);
    if (exempt.some((e) => around.includes(e))) continue;
    const names = [...new Set(near.map((h) => h.t))].join(', ');
    out.push(`"${m[0]}" sits within ${pad} chars of ${names}: ${JSON.stringify(window)}`);
  }
  //  One report per claim word, not one per (claim, term) pair.
  return [...new Set(out)];
}

//  ── A SPLICE THAT WAS WRITTEN AND NEVER WIRED ──────────────────────────────
//  cfu-5 on Topic 1.2 shipped with its question rebuilt and its feedback still
//  explaining the question it used to be, because C5_FB_FROM/TO/HTML were
//  defined in the module and never added to SPLICES. Nothing could see it: the
//  module was valid, the build resolved every splice it was given, and the
//  gate only ever reads the OUTPUT. A student answering correctly was told the
//  answer was something else.
//
//  So the module's own source is checked too. Every `const X_HTML` has to be
//  named somewhere in the SPLICES array, or the build stops.
function unwiredSplices(source) {
  const arr = source.slice(source.indexOf('const SPLICES = ['));
  const body = arr.slice(0, arr.indexOf('\n];'));
  const out = [];
  for (const m of source.matchAll(/^const ([A-Z][A-Z0-9_]*_HTML) =/gm)) {
    if (!body.includes(m[1])) out.push(`${m[1]} is defined but never added to SPLICES`);
  }
  return out;
}

//  Matrixify wants one quoted cell per field, with embedded quotes doubled.
//  ── EVERY KEY A SHEET MUST NOT MOVE ────────────────────────────────────────
//  A citation or a claim can be edited on any page in Unit 1; a graded answer
//  cannot be edited by accident on any of them. This is the list, in one place,
//  so a page shape that grows a seventh kind of key grows it for every gate at
//  once. It lived inside the thinning gate and the lesson pages were the only
//  shapes it had ever seen; exercises, labs, quizzes and the unit exam add the
//  quiz ANSWERS map and the <select> credited values.
//
//  Values, not counts. Two keys that swap places leave the count identical.
function gradedKeys(body) {
  const out = {};
  for (const [label, re] of [
    ['mcq', /id="(cfu-\d+)"[^>]*data-answer="([A-E])"/g],
    ['seq', /data-correct-order="([^"]+)"/g],
    ['match', /id="mr-(\d+-\d+)"[^>]*data-correct="([^"]+)"/g],
    ['blanks', /class="dtb-blank"[^>]*data-correct="([^"]+)"/g],
    ['chips', /class="dtb-chip"[^>]*data-val="([^"]+)"/g],
    ['answers', /(?:var|const|let)\s+ANSWERS\s*=\s*(\{[^}]*\})/g],
    ['key', /"key"\s*:\s*(\d+)/g],
    ['dataAnswer', /data-answer="([^"]+)"/g],
    ['dataCorrect', /data-correct="([^"]+)"/g],
    ['optionValues', /<option value="([^"]*)"/g],
  ]) {
    out[label] = [...body.matchAll(re)].map((m) => m.slice(1).join('=')).join(' | ');
  }
  return out;
}

//  Returns one message per key set that moved, empty when nothing did.
function keysUnchanged(before, after) {
  const b = gradedKeys(before);
  const a = gradedKeys(after);
  return Object.keys(b)
    .filter((k) => b[k] !== a[k])
    .map((k) => `${k} keys changed:\n     before ${b[k].slice(0, 300)}\n     after  ${a[k].slice(0, 300)}`);
}

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
  apClaimsNear,
  unwiredSplices,
  gradedKeys,
  keysUnchanged,
  csvCell,
  csvRow,
};
