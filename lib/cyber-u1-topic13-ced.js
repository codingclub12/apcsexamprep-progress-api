'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY TOPIC 1.3: THE SMALL FIXES, AND WHY THEY ARE SMALL
//
//  ── THIS PAGE IS IN GOOD SHAPE ──────────────────────────────────────────────
//  Worth saying plainly, because the handoff's premise was that Unit 1 taught a
//  legacy taxonomy and 1.1, 1.2 and 1.4 all bore that out. 1.3 does not.
//
//  Its three attack types, evil twin, jamming and war driving, are the CED's own
//  three (1.3.B.1 to 1.3.B.3). Its three protections, verify the SSID, avoid
//  open networks, use a VPN, are the CED's own three (1.3.C.1 to 1.3.C.3). Its
//  adversary-skill material is 1.3.A.1. Every credited answer in every graded
//  item is CED content, checked one by one, and not one of them names an
//  off-CED term. There is nothing to realign.
//
//  ── WHAT IT DOES NEED ───────────────────────────────────────────────────────
//  Two things, and neither is about the CED's content.
//
//  1. EK codes in front of students, which is the house rule from
//     docs/ap-cyber-unit1-ced-realignment.md. The thinning pass handles most of
//     them; this module handles the two it cannot, because they are not prose:
//     a badge in the page meta bar reading "LO 1.3.A - 1.3.C", and a section
//     heading reading "Individual Protections (CED 1.3.C)".
//
//  2. One claim about what the exam does. "Understanding which protection works
//     against which attack is a high-frequency AP exam pattern." That is the
//     same habit that filled 1.2.9 with invented question patterns, and it is
//     worth removing here while it is still one sentence.
//
//     Two nearby boxes are labelled "AP Exam Pattern" and "AP Exam Trap". Their
//     CONTENT is correct and useful, so they keep it; the labels are reworded to
//     describe what is in the box rather than to assert what an exam contains.
//
//  This module runs BEFORE the thinning pass in the same build, so one sheet
//  carries both. Two sheets for one page would each be built against the live
//  body and the second would undo the first.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-u1-topic13-ced-csv.js out/topic13.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-wireless-security';
const PAGE_ID = '132230447319';
const TITLE = 'AP Cybersecurity 1.3: Wireless Network Security';

// ── 1. the meta bar badge ────────────────────────────────────────────────────
//  The only EK code a student meets before they have read a word of the lesson.
const META_FROM = '<span class="ch-badge">LO 1.3.A &ndash; 1.3.C</span>';
const META_HTML = '<span class="ch-badge">Adversaries, wireless attacks, and what you can do</span>';

// ── 2. the section heading ───────────────────────────────────────────────────
const HEAD_FROM = '1.3.5 &mdash; Individual Protections (CED 1.3.C)</h2>\n  <p>The CED identifies three specific actions';
const HEAD_HTML = '1.3.5 &mdash; Individual Protections</h2>\n  <p>There are three specific actions';

// ── 3. the frequency claim ───────────────────────────────────────────────────
const FREQ_FROM = 'The three individual protections address different attack types. Understanding which protection works against which attack is a high-frequency AP exam pattern.';
const FREQ_HTML = 'The three individual protections address different attack types, and they do not all address the same ones. Working out which protection answers which attack, and which attack none of them answers, is the point of this table.';

// ── 4. two labels that assert what an exam contains ──────────────────────────
//  The content in both boxes is correct and stays. Only the labels change, from
//  a claim about the exam to a description of what is in the box.
const LBL1_FROM = '&#9733; AP Exam Pattern &mdash; Jamming Has No Individual Defense';
const LBL1_HTML = 'Jamming Has No Individual Defense';

const LBL2_FROM = '&#9888; AP Exam Trap &mdash; Damage &ne; Skill';
const LBL2_HTML = 'A common mix-up: damage is not skill';

const SPLICES = [
  { name: 'meta bar LO badge', from: META_FROM, html: META_HTML },
  { name: '1.3.5 section heading', from: HEAD_FROM, html: HEAD_HTML },
  { name: 'exam-frequency claim', from: FREQ_FROM, html: FREQ_HTML },
  { name: 'jamming box label', from: LBL1_FROM, html: LBL1_HTML },
  { name: 'skill trap box label', from: LBL2_FROM, html: LBL2_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  '&#9733;': '★', '&#9888;': '⚠', '&ne;': '≠', '&#9998;': '✎',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|ne|#9733|#9888|#9998);/g,
  (m) => LITERAL[m]);

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 80))}`);
  }
  return first;
}

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
  return { body: out + body.slice(cursor), resolved };
}

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices };
