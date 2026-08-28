'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.4 LAB: THE CED REALIGNMENT SPLICE TABLE
//
//  ── WHAT IS WRONG ───────────────────────────────────────────────────────────
//  One credited answer, worth two points, names a taxonomy the CED does not
//  contain:
//
//    if(t==='spear'){pts+=2; ... Correct. AI-personalized spear phishing
//                                referenced a specific invoice number, date,
//                                and relationship.
//
//  Specimen 1 is a supplier invoice fraud email: a lookalike domain, a real
//  invoice number, a reference to a conversation last Tuesday, and changed
//  banking details. Measured against the CED that is AI phishing standing on AI
//  reconnaissance. The research is what makes the invoice number right.
//
//  The other five credited answers are clean. `s2-technique='deepfake'` names
//  the plain-language word for what 1.4.A.1 describes, which the standard
//  allows, and the rest are conceptual.
//
//  ── ONE ANSWER DELIBERATELY LEFT ALONE ──────────────────────────────────────
//  `s1-control='policy'` credits out-of-band verification: calling the supplier
//  back on a number you already had. On the lesson page's cfu-5 and on Exercise
//  1 that same control was demoted to a distractor in favour of a pre-arranged
//  shared secret, so leaving it credited here looks inconsistent. It is not.
//
//  Those two were person-impersonation-over-a-phone-call scenarios, which is
//  exactly the situation the CED's shared-secret defense describes: you agree a
//  phrase with a trusted contact in advance. This is a written invoice from a
//  supplier with changed bank details, where verifying through a channel you
//  chose yourself is the control that answers it and a pre-arranged phrase with
//  an accounts-receivable clerk is not a real practice. Consistency means
//  applying the same standard to every scenario, not the same answer.
//
//  ── AND SOMETHING THE GATE FOUND ON ITS OWN ─────────────────────────────────
//  Running the shared exercise gate on this page for the first time surfaced two
//  bugs in the gate rather than in the page, both now fixed and both regression
//  tested:
//
//    * variable bindings were resolved globally, so `var t` rebound in three
//      different if-blocks made the gate attribute `t==='spear'` to a textarea
//      at the bottom of the page and report two sound keys as ungettable
//    * keyword lists were matched by helper NAME (tMatch, tCount). This page
//      calls the helper `tc`, so all twelve of its rubrics were invisible to
//      the protection that stops an accepted answer being silently dropped
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, no EK
//  codes in student-visible text.
//
//    node scripts/cyber-u1-l4-lab-ced-csv.js out/l4lab.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-lesson-4-lab';
const PAGE_ID = '132673700055';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 4 Lab';

// ── 1. the credited option ───────────────────────────────────────────────────
//  Value untouched, so the scoring comparison does not move. "OSINT" becomes
//  "AI reconnaissance" because that is what the CED calls the step, and the
//  detail that makes it convincing is named rather than the delivery channel.
const OPT_FROM = '<option value="spear">AI-personalized spear phishing (used OSINT to reference a specific invoice, specific date, and a real relationship)</option>';
const OPT_HTML = '<option value="spear">AI phishing built on AI reconnaissance (research turned up a real invoice number, a real date, and a real relationship to reference)</option>';

// ── 2. its scoring branch, both directions ───────────────────────────────────
//  The zero branch states the answer just as the correct one does, so both move
//  together or a student who misses it reads a different name than one who does
//  not.
const JS1_FROM = "if(t==='spear'){pts+=2;det.push('<strong>Technique:</strong> +2 &mdash; Correct. AI-personalized spear phishing referenced a specific invoice number, date, and relationship.');}\n      else det.push('<strong>Technique:</strong> 0 &mdash; AI-personalized spear phishing: the email referenced invoice #HS-2024-8847 and mentioned \\'previous conversation last Tuesday\\' &mdash; OSINT used to craft targeted lures.');";
const JS1_HTML = "if(t==='spear'){pts+=2;det.push('<strong>Technique:</strong> +2 &mdash; Correct. AI phishing, and the invoice number, the date and the relationship all came from AI reconnaissance done before the email was written.');}\n      else det.push('<strong>Technique:</strong> 0 &mdash; AI phishing built on AI reconnaissance: the email cites invoice #HS-2024-8847 and a \\'previous conversation last Tuesday\\', which is research, not guesswork.');";

// ── 3. the week-by-week model answers ────────────────────────────────────────
//  Free text, scored by keyword. The model answer shown afterwards named the
//  legacy term for stage two while already naming reconnaissance correctly for
//  stage one.
const JS4A_FROM = "W1: AI OSINT reconnaissance (scraped LinkedIn for vendor/IT details); W2: AI-personalized spear phishing (referenced specific software/IT manager); W3: AI voice cloning (synthesized IT manager\\'s voice for credential request)";
const JS4A_HTML = "W1: AI reconnaissance (scraped LinkedIn for vendor and IT details); W2: AI phishing (referenced the specific software and the IT manager by name); W3: an AI deepfake of the IT manager\\'s voice, asking for credentials";

const JS4B_FROM = "W1: AI reconnaissance/OSINT scraping; W2: AI spear phishing personalized with scraped details; W3: AI voice cloning of the IT manager.";
const JS4B_HTML = "W1: AI reconnaissance, scraping public profiles; W2: AI phishing written from what that turned up; W3: an AI deepfake of the IT manager\\'s voice.";

// ── 4. two distractor labels ─────────────────────────────────────────────────
//  Both stay wrong answers. Changed so the page names the same wrong answer the
//  same way the two exercises now do.
const D1_FROM = 'AI spear phishing email preceding the video call';
const D1_HTML = 'An AI phishing email preceding the video call';

const D2_FROM = 'Week 2: A better email filter would have stopped the attack at the spear phishing stage';
const D2_HTML = 'Week 2: A better email filter would have stopped the attack at the phishing stage';

// ── the claim about what the exam does ───────────────────────────────────────
//  Found by the proximity gate built for 1.2, run across every Unit 1 page.
//  The teaching point is correct and stays; the assertion about what an exam
//  contains goes. A student who is told the exam "always" does something, and
//  then meets a question shaped differently, is worse off than one told nothing.
const LABA_FROM = '&#9998; AP Exam Tip';
const LABA_HTML = '&#9998; How to read a multi-stage attack';

const LABB_FROM = 'Multi-stage AI attack questions on the AP exam always ask: (1) which AI technique was used at each stage, (2) what made each stage more effective than a non-AI version, and (3) which SINGLE control would have broken the chain at the most efficient point.';
const LABB_HTML = 'Work a multi-stage attack one stage at a time: which AI technique was used at each, what made that stage more effective than the non-AI version, and which single control would have broken the chain at the cheapest point.';

const SPLICES = [
  { name: 's1 credited option', from: OPT_FROM, html: OPT_HTML },
  { name: 's1 scoring branch', from: JS1_FROM, html: JS1_HTML },
  { name: 's4 model answer, partial', from: JS4A_FROM, html: JS4A_HTML },
  { name: 's4 model answer, zero', from: JS4B_FROM, html: JS4B_HTML },
  { name: 's2 distractor label', from: D1_FROM, html: D1_HTML },
  { name: 's4 distractor label', from: D2_FROM, html: D2_HTML },
  { name: 'exam tip block', from: LABA_FROM, html: LABA_HTML },
  { name: 'exam tip body', from: LABB_FROM, html: LABB_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  //  The pencil that labels every tip box on these pages. Absent from this map
  //  the anchor never matched, and the build said "anchor not found" about a
  //  string that is plainly on the page.
  '&#9998;': '✎',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|#9998);/g, (m) => LITERAL[m]);

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
