'use strict';
// -----------------------------------------------------------------------------
//  THIN THE EK CITATIONS OUT OF AN AP CSA LESSON PAGE.
//
//  The rule is "Citing the CED to students" in
//  docs/ap-cyber-unit1-ced-realignment.md, and it is about the convention rather
//  than about Cybersecurity: the EK code is teacher knowledge, so name the idea,
//  not the code. config/csa-ek-decisions.json is the canonical data, one entry
//  per prose case with the reason it reads the way it does.
//
//  ---- WHY THIS IS NOT lib/cyber-ek-thin.js ---------------------------------
//  That module's machinery is reused here and its PROSE table is not, and the
//  difference matters. Its table maps codes to meanings: 1.1.C.1 becomes
//  "personal information". Those meanings are AP Cybersecurity's. In AP CSA,
//  2.2.A.1 is about == on reference types. Running the cyber table over a CSA
//  page would substitute confident, plausible nonsense, and every citation count
//  would still go to zero.
//
//  What IS reused is outsideProtected(), so that the protection mechanism has
//  one implementation rather than two opinions.
//
//  ---- THE SHAPES, MEASURED RATHER THAN GUESSED -----------------------------
//  178 citations across 19 live pages on 2026-09-21, and CSA writes them far
//  more regularly than Cyber does:
//
//      136  a trailing parenthetical    ...every program. (EK 2.1.A.1)</td>
//       13  a What You'll Learn label   <li><strong>2.7.A:</strong> Identify...
//        6  a CED range heading         <h4 ...>CED EK 3.5.A.1-3.5.A.8</h4>
//       15  prose, one case at a time   <p>EK 2.2.A.1 explicitly covers...
//        8  inside the JSON-LD script   "Aligned to 2025-2026 CED topic 2.1.A."
//
//  Only the first three are rules. The 15 prose cases are DATA, each with its
//  own replacement and its own reason, because the lesson cyber-ek-thin.js paid
//  for is that a general substitution rule over prose produces sentences nobody
//  read. Every one of them is a counted replacement: if the live page no longer
//  contains the exact text, this throws rather than skipping it, which is what
//  turns a stale sheet into a failure instead of a quiet no-op.
//
//  The JSON-LD 8 are left alone on purpose. See the config's _why.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { outsideProtected } = require('./cyber-ek-thin');

const DECISIONS = path.join(__dirname, '..', 'config', 'csa-ek-decisions.json');

const CODE = String.raw`(?:EK\s+)?\d\.\d\.[A-C](?:\.\d)?`;
//  A separator INSIDE one parenthetical: "(EK 2.8.A.1, 2.8.A.2)",
//  "(EK 2.1.A.1 &amp; 2.1.A.2)". U+2013 is the en dash the unit 3 pages use in
//  their ranges; it is written as an escape so this file stays ASCII.
const SEP = String.raw`(?:\s*(?:,|&amp;|and|to|\u2013|-)\s*)`;
const PAREN = new RegExp(String.raw`\s*\((?:${CODE})(?:${SEP}(?:${CODE}))*\)`, 'g');
//  <li><strong>2.7.A:</strong> Identify when an iterative process is required.
//  The siblings in the same list carry no label at all, so the label goes and
//  the item joins them.
const OBJECTIVE_LABEL = new RegExp(String.raw`<strong>\s*${CODE}\s*:\s*</strong>\s*`, 'g');
//  Unit 3 heads its CED box "CED EK 3.5.A.1-3.5.A.8" where unit 2 heads the same
//  box "CED Connection (EK 2.2.A.3)". Both land on "CED Connection", so the two
//  families end up saying the same thing, which they did not before.
const CED_RANGE = new RegExp(String.raw`CED\s+${CODE}\s*\u2013\s*${CODE}`, 'g');

//  Spans this module must not touch: the JSON-LD block. Those 8 citations are
//  search metadata, not page text, and the decision to leave them is recorded in
//  the config rather than implied by a regex that happens not to reach them.
function scriptSpans(body) {
  const spans = [];
  for (const m of body.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)) {
    spans.push({ a: m.index, z: m.index + m[0].length, label: 'script' });
  }
  return spans;
}

//  Apply fn only outside the given spans. Same shape as outsideProtected, which
//  reads its spans from lib/cyber-ek-density.js; this one takes them, so the two
//  can be composed without either knowing about the other.
function outside(body, spans, fn) {
  let out = '';
  let cursor = 0;
  for (const s of spans.slice().sort((x, y) => x.a - y.a)) {
    if (s.a < cursor) continue;
    out += fn(body.slice(cursor, s.a)) + body.slice(s.a, s.z);
    cursor = s.z;
  }
  return out + fn(body.slice(cursor));
}

function decisions() {
  return JSON.parse(fs.readFileSync(DECISIONS, 'utf8'));
}

//  Returns { body, applied, missed }. A miss is NOT an exception here so that a
//  caller can report every miss at once rather than the first; the gate in
//  scripts/csa-ek-thin-csv.js is what refuses to write.
function thin(body, topic, cfg) {
  const conf = cfg || decisions();
  const skip = scriptSpans(body);
  const applied = [];
  const missed = [];

  //  1. the prose cases FIRST, because they are exact strings and several of
  //     them contain a parenthetical the mechanical rule would otherwise eat.
  //     "(EK 2.8.A.3 <em dash> equivalence holds only when...)" is the one that
  //     proves it: PAREN does not match it, but an earlier draft's looser
  //     version did, and it deleted the caveat.
  let b = body;
  for (const d of conf.prose.filter((x) => x.topic === topic)) {
    const n = b.split(d.find).length - 1;
    if (n !== 1) { missed.push({ find: d.find, found: n }); continue; }
    b = b.replace(d.find, d.repl);
    applied.push(d.find);
  }

  //  2. the three mechanical shapes, outside the JSON-LD block
  b = outside(b, scriptSpans(b), (chunk) => chunk
    .replace(CED_RANGE, 'CED Connection')
    .replace(OBJECTIVE_LABEL, '')
    .replace(PAREN, ''));

  //  3. THERE IS NO TIDYING STEP, and an earlier draft of this file had one.
  //
  //     It carried two rules meant to repair what the cuts leave behind: a
  //     stranded colon in "<strong>Order matters :</strong>" and a stranded
  //     period before a closing tag. Measured across all 19 pages after the
  //     cuts, BOTH FIRED ZERO TIMES. PAREN eats the whitespace in front of the
  //     parenthetical and nothing in front of what follows it, so there is
  //     nothing stranded to repair.
  //
  //     They were deleted rather than kept as insurance, and the reason is the
  //     second rule. It matched any space before a period at an element end,
  //     anywhere on the page, whether or not a citation had ever been near it.
  //     On the next page it ran against it would have quietly reformatted
  //     whitespace that has nothing to do with EK codes, which is the rewriter
  //     that reformatted 23 live pages, one convention over. A rule that never
  //     fires is not conservative; it is an unreviewed edit waiting for a page
  //     that happens to match it.

  return { body: b, applied, missed, skipped: skip.length };
}

module.exports = { thin, decisions, outside, scriptSpans, PAREN, OBJECTIVE_LABEL, CED_RANGE };
