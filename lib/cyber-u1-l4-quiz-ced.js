'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.4 QUIZ: THE CED REALIGNMENT SPLICE TABLE
//
//  ── THE GRADED CONTENT IS SOUND ─────────────────────────────────────────────
//  Five questions, answer key {1:'B',2:'B',3:'C',4:'C',5:'C'}, and every keyed
//  answer describes something the CED covers, without a legacy label:
//
//    Q1 B  a video call impersonation, which is an AI deepfake
//    Q2 B  the attacker scraped social media and referenced what it found,
//          which is AI reconnaissance feeding AI phishing
//    Q3 C  AI rewrote each wave so the filter's patterns stopped matching
//    Q4 C  offensive and defensive AI share underlying capabilities
//    Q5 C  out-of-band verification, correct for a written BEC and consistent
//          with the lab, which keeps the same control credited for the same
//          reason
//
//  So this is three splices, not a rebuild.
//
//  ── WHAT NEEDED FIXING ──────────────────────────────────────────────────────
//  1. The Exam Overview line, which is the quiz's own statement of what it
//     tests, listed "spear phishing" among the techniques and claimed to cover
//     "psychological tactics". Topic 1.4 does not assess tactics at all; that
//     vocabulary belongs to 1.1 and 2.1. A syllabus line that misdescribes the
//     assessment is worse than a wrong distractor, because a student reads it
//     to decide what to revise.
//
//  2. Q1 option A named the legacy term. It is a distractor and a legacy name
//     in a wrong answer is permitted, but the same wrong answer now reads the
//     same way across the lesson, both exercises and the lab.
//
//  3. Q5 option D read "All three controls are equally important and choosing
//     only one would provide no meaningful protection", which is an
//     all-of-the-above in disguise and is barred by the house rules. It becomes
//     a real distractor that fails for the reason this topic hammers hardest:
//     relying on detecting whether a message is AI-generated. See the note at
//     the splice for why the first attempt at this one was worse.
//
//  Nothing keyed moves. The answer key is byte-identical after this change.
//
//  ── WHAT IS DELIBERATELY NOT FIXED HERE ─────────────────────────────────────
//  The answer key is B, B, C, C, C. No A, no D, and three of five are C, so a
//  student who guesses C on every question scores 60%. That is a real defect
//  and it is not this pass's to decide: rebalancing means changing which letter
//  is correct on a live graded quiz, which is an assessment call rather than a
//  CED-alignment one. It is reported rather than shipped. Board task #130
//  already tracks the same class of problem on the Unit 5 quizzes.
//
//  Worth knowing for whoever takes it: this page has NO reporter. It makes no
//  network call, so no attempt data exists to invalidate and reordering options
//  costs nothing today. Once the reporter lands, stored detail JSON records
//  option indices and reordering becomes expensive. Now is the cheap moment.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, no EK
//  codes in student-visible text.
//
//    node scripts/cyber-u1-l4-quiz-ced-csv.js out/l4quiz.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-lesson-4-quiz';
const PAGE_ID = '132673667287';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 4 Quiz';

// ── 1. the quiz's own description of what it tests ───────────────────────────
const OVERVIEW_FROM = '<strong>Exam Overview:</strong> 5 questions covering AI attack techniques (voice cloning, deepfakes, spear phishing, filter evasion, dual-use tools), psychological tactics, and defenses. Format matches AP Cybersecurity exam style with scenario-based questions.';
const OVERVIEW_HTML = '<strong>Exam Overview:</strong> 5 questions covering the AI attack types (deepfakes and voice cloning, AI phishing, AI reconnaissance, filter evasion) and the defenses that answer them, plus the dual-use nature of AI security tools. Format matches AP Cybersecurity exam style with scenario-based questions.';

// ── 2. Q1 distractor ─────────────────────────────────────────────────────────
//  Still wrong: the scenario is a video call, so an email is not the answer.
const Q1A_FROM = 'AI-generated spear phishing email spoofing the CEO&rsquo;s email address';
const Q1A_HTML = 'An AI phishing email spoofing the CEO&rsquo;s email address, with no video involved';

// ── 3. Q5 option D ───────────────────────────────────────────────────────────
//  "All three are equally important" is an all-of-the-above and the house rules
//  bar it.
//
//  The first replacement was the right control with a wrong reason, which is
//  good AP style in general and wrong here: it opened with the same words as
//  option C, the credited answer, so a student scanning the list met two
//  near-identical choices and the item became about careful reading rather than
//  about the content.
//
//  This one names a different control and fails for the reason this topic
//  hammers hardest: a defense that depends on detecting whether the message is
//  AI-generated is the one thing that does not work. It is tempting for exactly
//  that reason, which is what a distractor is for.
const Q5D_FROM = 'All three controls are equally important and choosing only one would provide no meaningful protection';
const Q5D_HTML = 'The AI email security platform, because detecting the AI-generated message is the only way to stop the attack before a human is involved';

// ── 4. the Q2 explanation ────────────────────────────────────────────────────
//  OSINT stays a permitted industry word, the same call made on Exercise 2
//  where it is still an accepted keyword. But an explanation is the page
//  telling a student what the technique is called, so it leads with the name
//  the topic uses and keeps the industry one alongside.
const EXP2_FROM = '2:"B &mdash; Personalization through OSINT-scraped details creates credibility that generic phishing lacks, reducing target skepticism.';
const EXP2_HTML = '2:"B &mdash; AI reconnaissance, sometimes called OSINT, gathered the details. Personalizing on them creates credibility that generic phishing lacks, and that is what lowers the target\'s guard.';

const SPLICES = [
  { name: 'exam overview line', from: OVERVIEW_FROM, html: OVERVIEW_HTML },
  { name: 'Q2 explanation', from: EXP2_FROM, html: EXP2_HTML },
  { name: 'Q1 option A', from: Q1A_FROM, html: Q1A_HTML },
  { name: 'Q5 option D', from: Q5D_FROM, html: Q5D_HTML },
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
