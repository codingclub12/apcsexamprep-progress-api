'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.4: STOP SAYING "THE CED" TO STUDENTS, AND RUN THE EK THINNER
//
//  This is the sheet the 1.4 lesson import unblocked. Matrixify MERGE writes
//  the whole body, so a second sheet for a page can only be built once the
//  first has landed; that happened, so this can be built now.
//
//  Two things at once, deliberately in one sheet rather than two:
//
//    1. Nine painted "CED" mentions, all inside the teaching. An objective, two
//       cells of the Common Mistakes table, and the whole exit ticket.
//    2. The EK thinner, which has never run on this page. It takes the source
//       from 26 codes to 16, which is 16 painted down to 6, because ten live in
//       the collapsed coverage table and were never painted.
//
//  The six the thinner cannot reach are all in the exit ticket and its answer
//  key: it strips a bare "(1.4.A.2)" citation but not "CED 1.4.A.2:" with the
//  word in front, and the answer block sits inside a protected span. Those are
//  spliced here, and the same splices are the ones removing the CED mentions,
//  so one rewrite does both jobs.
//
//  ── NOTHING IS ADDED ────────────────────────────────────────────────────────
//  The framing mention already exists in the right place: the accordion header
//  "College Board Essential Knowledge Coverage", above the first lesson section.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-thin-csv.js cyber-u1-topic14-thin out/topic14-thin.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const ekThin = require('./cyber-ek-thin');

const HANDLE = 'ap-cybersecurity-unit-1-ai-driven-threats';
const PAGE_ID = '132157866199';
const TITLE = 'AP Cybersecurity 1.4: AI-Driven Threats';

// ── the nine painted mentions ────────────────────────────────────────────────
const O1_FROM = '&bull; Apply the correct CED defense to a specific AI attack type in a scenario';
const O1_HTML = '&bull; Apply the right defense to a specific AI attack type in a scenario';

const M1_FROM = 'AI writes flawless phishing in any language. The CED explicitly states this detection cue has been removed.';
const M1_HTML = 'AI writes flawless phishing in any language, so the broken-English tell is simply gone. It was never a rule, only a symptom of who used to be writing.';

const M2_FROM = 'The CED (1.4.A.1) explicitly includes both phone AND video call impersonation.';
const M2_HTML = 'A digital avatar built from voice or image samples works on a phone call and a video call alike.';

const X1_FROM = 'List all six ways the CED says adversaries use AI to augment attacks (1.4.A.1&ndash;A.6).';
const X1_HTML = 'List all six ways an adversary can use AI to make an attack more effective.';

const X2_FROM = 'Is this still valid? Explain using the CED.';
const X2_HTML = 'Is this still valid, and what changed?';

const X3_FROM = 'Why is this a security risk per the CED, and which defense prevents it?';
const X3_HTML = 'Why is this a security risk, and which defense prevents it?';

const X4_FROM = 'Explain the attack and which two CED defenses reduce the risk.';
const X4_HTML = 'Explain the attack and which two defenses reduce the risk.';

const X5_FROM = 'What does this illustrate about AI-assisted defense per the CED, and what human oversight is required?';
const X5_HTML = 'What does this illustrate about the limits of AI-assisted defense, and what human oversight is required?';

// ── the answer key, which carries the last five painted codes ────────────────
//  The thinner strips a bare "(1.4.A.2)" citation but not "CED 1.4.A.2:" with
//  the word in front, and not the codes inside this block, which sits in a
//  protected span. Rewritten whole rather than patched five times.
const XA_FROM = '(2) No longer valid &mdash; CED 1.4.A.2: AI crafts native-quality phishing in any language. (3) Risk: some AI tools feed input into training (1.4.B.3); adversaries could extract the sensitive data. Defense: do not enter personal/sensitive data into AI tools. (4) AI deepfake attack (1.4.A.1). Defenses: shared secret (1.4.B.1) + MFA (1.4.B.2).';
const XA_HTML = '(2) No longer valid: AI now writes native-quality phishing in any language, so writing quality tells you nothing. (3) Risk: some AI tools feed what you type back into training, and an adversary may then be able to extract it. Defense: do not put personal or sensitive data into an AI tool. (4) A deepfake voice attack. Defenses: a shared secret agreed in advance, plus MFA.';

const SPLICES = [
  { name: 'objective: apply the right defense', from: O1_FROM, html: O1_HTML },
  { name: 'mistakes: grammar tell', from: M1_FROM, html: M1_HTML },
  { name: 'mistakes: deepfake channels', from: M2_FROM, html: M2_HTML },
  { name: 'exit ticket q1', from: X1_FROM, html: X1_HTML },
  { name: 'exit ticket q2', from: X2_FROM, html: X2_HTML },
  { name: 'exit ticket q3', from: X3_FROM, html: X3_HTML },
  { name: 'exit ticket q4', from: X4_FROM, html: X4_HTML },
  { name: 'exit ticket q5', from: X5_FROM, html: X5_HTML },
  { name: 'exit ticket answer key', from: XA_FROM, html: XA_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  '&bull;': '•', '&#9998;': '✎',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|bull|#9998);/g,
  (m) => LITERAL[m]);

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 80))}`);
  }
  return first;
}

//  Splices FIRST, then the thinner.
//
//  The order is not arbitrary. Every anchor below was read off the live body,
//  and the thinner rewrites prose; running it first would move the ground the
//  anchors stand on and turn a working splice into "anchor not found". Splicing
//  first means each anchor matches what a human actually looked at.
function applySplices(body) {
  const resolved = SPLICES.map((s) => {
    const from = lit(s.from);
    const start = indexOfUnique(body, from, s.name);
    return { name: s.name, start, end: start + from.length, html: lit(s.html), removed: from.length };
  }).sort((a, b) => a.start - b.start);

  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].start < resolved[i - 1].end) {
      throw new Error(`splice regions overlap: ${resolved[i - 1].name} and ${resolved[i].name}`);
    }
  }

  let out = '';
  let cursor = 0;
  for (const r of resolved) {
    out += body.slice(cursor, r.start) + r.html;
    cursor = r.end;
  }
  const spliced = out + body.slice(cursor);
  return { body: ekThin.thin(spliced), resolved };
}

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices };
