'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.4 EXERCISE 2: THE CED REALIGNMENT SPLICE TABLE
//
//  ── THIS ONE IS MOSTLY FINE, AND THAT IS THE FINDING ────────────────────────
//  Exercise 1 keyed two of its credited answers to vocabulary the CED does not
//  contain, and offered no correct option at all for one 12-point scenario.
//  Exercise 2 does not. Its seven credited answers are:
//
//    p1a-cap='deepfake'      the plain name for what 1.4.A.1 describes
//    p1a-oob='yes'           a yes/no about verification, no label involved
//    p1b-why='trust'         why a recognised voice bypasses skepticism
//    p1b-defense='policy'    a process control, correct and CED-compatible
//    p1c-lesson='dual'       dual-use risk, conceptual
//    p2-attack='travel'      picks a scenario, names nothing
//    p3b-response='refuse'   conceptual
//
//  Not one names a legacy term. The free-text answers are graded by keyword
//  lists, and those are clean too: scenario specifics (sarah, cfo, chicago,
//  sage) and CED-compatible concepts (osint, evade, out-of-band, dual). A
//  student writing the CED vocabulary is not penalised anywhere.
//
//  So this is a much smaller change than Exercise 1: five labels and one
//  addition to an answer key. Saying so is the point. Manufacturing a rebuild
//  where the graded content is already sound would be the wrong outcome, and
//  the terms that remain are in positions the standard permits.
//
//  ── WHAT ACTUALLY NEEDS FIXING ──────────────────────────────────────────────
//  1. Part 2 is TITLED "OSINT & Spear Phishing Construction (6 pts)". A heading
//     naming a six-point graded section after the legacy term is the strongest
//     hit on the page.
//  2. The scenario setup and the question stem under it both tell the student
//     that what is being built is a spear phishing email.
//  3. One graded feedback string explains a credited answer using the term.
//  4. One distractor label, changed only for consistency with Exercise 1's
//     equivalent option. A legacy name in a wrong answer is permitted; having
//     the two exercises name the same wrong answer differently is just sloppy.
//
//  ── AND ONE THING THE STANDARD ACTUALLY DEMANDS ─────────────────────────────
//  Removing the legacy term is half the job. The other half is making sure the
//  CED term earns credit. The keyword list for "why do filters fail" accepts
//  'osint' and nothing resembling reconnaissance, so a student who writes "AI
//  reconnaissance gathered the details" scores lower than one who writes OSINT.
//  Both spellings now count. Nothing is removed from the list: a student who
//  writes OSINT is still right, because OSINT is still the industry word.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, no EK
//  codes in student-visible text.
//
//    node scripts/cyber-u1-l4-ex2-ced-csv.js out/l4ex2.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-lesson-4-exercise-2';
const PAGE_ID = '132673634519';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 4 Exercise 2';

// ── 1. the Part 2 heading ────────────────────────────────────────────────────
const HEAD_FROM = 'OSINT &amp; Spear Phishing Construction (6 pts)';
const HEAD_HTML = 'AI Reconnaissance &amp; AI Phishing Construction (6 pts)';

// ── 2. the scenario setup ────────────────────────────────────────────────────
const SETUP_FROM = 'The following social media posts are from a target the attacker is researching to build an AI-personalized spear phishing email. Identify what information the attacker can harvest and how it will be used.';
const SETUP_HTML = 'The following social media posts are from a target the attacker is researching. This research step is AI reconnaissance, and what it feeds is an AI phishing email. Identify what information the attacker can harvest and how it will be used.';

// ── 3. the question stem ─────────────────────────────────────────────────────
const STEM_FROM = '2. The attacker crafts a spear phishing email from Sarah M. (CFO). Which attack scenario is most effective based on this OSINT? (2 pts)';
const STEM_HTML = '2. The attacker crafts an AI phishing email that appears to come from Sarah M. (CFO). Which attack scenario is most effective, given what the reconnaissance turned up? (2 pts)';

// ── 4. one distractor label ──────────────────────────────────────────────────
//  Still a wrong answer. The value is untouched, so nothing about grading moves.
const OPT_FROM = '<option value="phishing">AI-generated spear phishing email</option>';
const OPT_HTML = '<option value="phishing">An AI phishing email, with no video involved</option>';

// ── 5. the graded feedback ───────────────────────────────────────────────────
const FB_FROM = "<strong>Why filters fail:</strong> +1 &mdash; Partial. Spear phishing with accurate personal details contains no generic phishing patterns.";
const FB_HTML = "<strong>Why filters fail:</strong> +1 &mdash; Partial. An AI phishing message carrying accurate personal details contains none of the generic patterns a filter matches on.";

// ── 6. the answer key accepts the CED word ───────────────────────────────────
//  Additive only. 'osint' stays, because a student who writes it is still right.
const KEYS_FROM = "tCount(why,['personal','specific','filter','keyword','no signat','osint','detail','bypass','evade','tailored','custom','context'])";
const KEYS_HTML = "tCount(why,['personal','specific','filter','keyword','no signat','osint','recon','detail','bypass','evade','tailored','custom','context'])";

const SPLICES = [
  { name: 'part 2 heading', from: HEAD_FROM, html: HEAD_HTML },
  { name: 'scenario setup', from: SETUP_FROM, html: SETUP_HTML },
  { name: 'question stem', from: STEM_FROM, html: STEM_HTML },
  { name: 'p1a-cap distractor label', from: OPT_FROM, html: OPT_HTML },
  { name: 'why-filters-fail feedback', from: FB_FROM, html: FB_HTML },
  { name: 'why keyword list accepts recon', from: KEYS_FROM, html: KEYS_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip);/g, (m) => LITERAL[m]);

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
