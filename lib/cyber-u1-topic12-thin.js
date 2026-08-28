'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.2: STOP SAYING "THE CED" TO STUDENTS
//
//  ── THE RULE ────────────────────────────────────────────────────────────────
//  Naming the course description where a topic BEGINS is fine: it tells a
//  student where this fits. Using it inside the teaching is not. "Map it to CED
//  concepts" is not a question about passwords, it is a question about a
//  document the student has never read and will never be handed.
//
//  Eleven uses were painted on this page. All eleven are inside content: an
//  adjective in a bullet ("all three CED signs"), three cells of the Common
//  Mistakes table, two Bellringer lines, and five Exit Ticket lines. Not one of
//  them was doing framing work; each was a qualifier that could be deleted
//  without changing what was being asked, which is the tell.
//
//  ── WHY NOTHING IS ADDED ────────────────────────────────────────────────────
//  The framing mention already exists and is already in the right place: the
//  accordion header "College Board Essential Knowledge Coverage / Topic 1.2 -
//  What Is Testable", four screens above the first lesson section. A student who
//  wants to know where this fits opens it and sees the coverage table. That is
//  the one surface the house rule keeps, and it needs no help.
//
//  So this module only removes. Checked by rendering rather than by counting:
//  after it runs, document.body.innerText contains the word CED zero times, and
//  the two source occurrences that remain (the "CED Ref" column header and the
//  "Source: AP Cybersecurity CED Effective Fall 2026" footnote) are both inside
//  ek12-body, which ships display:none.
//
//  ── WHAT REPLACES EACH ONE ──────────────────────────────────────────────────
//  Never a deletion that leaves a shorter sentence saying less. Where the CED
//  was carrying meaning by proxy, the replacement says the thing directly: "the
//  CED lists all three" becomes "there are three signs, not two", which is the
//  fact the student needed and the document reference never supplied.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-u1-topic12-thin-csv.js out/topic12-thin.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-password-attacks';
const PAGE_ID = '132157374679';
const TITLE = 'AP Cybersecurity 1.2: Suspicious Website Logins';

// ── 1. the objectives bullet ─────────────────────────────────────────────────
//  "all three CED signs" reads as though CED were a category of sign. There is
//  one kind of sign and there are three of them.
const B1_FROM = '&bull; Identify all three CED signs of an online password attack:';
const B1_HTML = '&bull; Identify all three signs of an online password attack:';

// ── 2 and 3. the Bellringer ──────────────────────────────────────────────────
const BR_Q_FROM = 'Name every CED sign of a password attack present in this scenario.';
const BR_Q_HTML = 'Name every sign of a password attack present in this scenario.';

const BR_A_FROM = '(2) Uses pet name and personally significant date &mdash; both CED-specified patterns adversaries build targeted dictionaries from.';
const BR_A_HTML = '(2) Uses a pet name and a date that means something to them, which is exactly the personal detail an adversary looks up and builds a targeted wordlist from.';

// ── 4, 5 and 6. the Common Mistakes table ────────────────────────────────────
//  Three cells whose last sentence was a citation rather than an explanation.
//  Each becomes the thing the student needed to be told.
const M1_FROM = 'Brute-force tries every combination. Dictionary attack uses a targeted list from personal info. The CED describes dictionary attacks specifically.';
const M1_HTML = 'Brute-force tries every combination. A dictionary attack uses a targeted list built from personal information, and that targeting is the whole difference.';

const M2_FROM = 'Students remember failed attempts and unknown devices but forget unusual times. The CED lists all three.';
const M2_HTML = 'Students remember failed attempts and unknown devices but forget unusual times. There are three signs, not two.';

const M3_FROM = 'CED says: long, random, unique. Passphrases are an explicitly listed valid approach.';
const M3_HTML = 'Long, random, unique. A passphrase is a perfectly good way to get all three at once.';

// ── 7 to 11. the Exit Ticket ─────────────────────────────────────────────────
//  The worst of them, because they are the questions a student is graded on.
//  "How would the CED describe what the adversary does next" asks the student
//  to guess at the wording of a document they have never seen.
const X1_FROM = 'List all three CED-specified signs of an online password attack';
const X1_HTML = 'List all three signs of an online password attack';

const X2_FROM = 'How would the CED describe what the adversary does next?';
const X2_HTML = 'Describe what the adversary does next, and name which of the three kinds of guess it is.';

const X3_FROM = 'Explain why it fails the CED criteria and suggest a better approach.';
const X3_HTML = 'Explain which of long, random and unique it fails, and suggest a better approach.';

const X4_FROM = 'What happened? Map it to CED concepts.';
const X4_HTML = 'What happened, and which signs give it away?';

const X5_FROM = '(3) Fails: pet name + personally significant date &mdash; both CED patterns to avoid.';
const X5_HTML = '(3) Fails: a pet name and a date that means something to them, both of which an adversary can look up.';

const SPLICES = [
  { name: 'objectives bullet', from: B1_FROM, html: B1_HTML },
  { name: 'bellringer question 1', from: BR_Q_FROM, html: BR_Q_HTML },
  { name: 'bellringer answer 2', from: BR_A_FROM, html: BR_A_HTML },
  { name: 'mistakes: dictionary vs brute force', from: M1_FROM, html: M1_HTML },
  { name: 'mistakes: the third sign', from: M2_FROM, html: M2_HTML },
  { name: 'mistakes: length over complexity', from: M3_FROM, html: M3_HTML },
  { name: 'exit ticket q1', from: X1_FROM, html: X1_HTML },
  { name: 'exit ticket q2', from: X2_FROM, html: X2_HTML },
  { name: 'exit ticket q3', from: X3_FROM, html: X3_HTML },
  { name: 'exit ticket q5', from: X4_FROM, html: X4_HTML },
  { name: 'exit ticket answer 3', from: X5_FROM, html: X5_HTML },
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
