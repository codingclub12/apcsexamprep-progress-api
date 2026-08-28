'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.5: STOP SAYING "THE CED" TO STUDENTS
//
//  Twenty-three painted mentions, more than any page but 1.1, and a different
//  flavour from the others: this page leans on "CED Scenario 1E" as a name for
//  a worked example, repeating it nine times. A student cannot look Scenario 1E
//  up. What they can see is the scenario itself, which is on the page, so every
//  reference becomes a reference to that.
//
//  ── A DUPLICATED CARD, REPORTED NOT DELETED ────────────────────────────────
//  This page carries its Exit Ticket TWICE. Both copies are painted: a student
//  sees the same five questions and the same answer key one after the other.
//  The two differ slightly, in a way that reads like an older copy left behind
//  by an edit rather than a deliberate repeat.
//
//  Both copies are thinned here so the rule holds either way. Neither is
//  deleted: choosing which of two nearly identical cards to remove is a content
//  decision, and this sheet is a thinning pass. It is in the run note and the
//  PR so it is a decision on the record rather than something a sheet did
//  quietly while doing something else.
//
//  ── NOTHING IS ADDED ────────────────────────────────────────────────────────
//  The framing mention already exists in the right place: the accordion header
//  "College Board Essential Knowledge Coverage", above the first lesson section.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-thin-csv.js cyber-u1-topic15-thin out/topic15-thin.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-ai-cyber-defense';
const PAGE_ID = '132230676695';
const TITLE = 'AP Cybersecurity 1.5: AI in Cyber Defense';

// ── the meta bar badge ───────────────────────────────────────────────────────
const BADGE_FROM = '<span class="ch-badge">CED Topic 1.5</span>';
const BADGE_HTML = '<span class="ch-badge">Topic 1.5</span>';

// ── the opening three questions and their answers ────────────────────────────
const Q1_FROM = 'Explain why this creates a detection problem and why the CED presents AI as the solution.';
const Q1_HTML = 'Explain why this creates a detection problem, and why AI is the answer to it.';

const Q2_FROM = 'Should the team implement the changes immediately? What does the CED require first?';
const Q2_HTML = 'Should the team implement the changes immediately, or does something have to happen first?';

const Q3_FROM = '(2) No &mdash; the CED requires a knowledgeable security technician to review first.';
const Q3_HTML = '(2) No. A knowledgeable security technician has to review the recommendations first.';

// ── the objectives ───────────────────────────────────────────────────────────
const O1_FROM = 'Apply the CED Scenario 1E framework: given a scenario where an AI tool flags code vulnerabilities';
const O1_HTML = 'Work the code-review scenario on this page: given an AI tool that flags code vulnerabilities';

const O2_FROM = 'Connect AI defense tools to the four CED skills: identify which AI applications primarily serve';
const O2_HTML = 'Connect AI defense tools to the four skill categories: identify which AI applications primarily serve';

// ── the six applications, and the worked scenario ───────────────────────────
const S1_FROM = 'The CED Scenario 1E describes an AI tool performing static analysis.';
const S1_HTML = 'The code-review scenario later on this page is exactly this: an AI tool performing static analysis.';

const S2_FROM = 'Each maps to one or more CED skills and represents a category of AP exam question you will encounter.';
const S2_HTML = 'Each maps to one or more of the four skill categories, and each is a different kind of question to be able to answer.';

const S3_FROM = '<p><strong>CED Scenario 1E:</strong> This is exactly what the CED describes.';
const S3_HTML = '<p><strong>The scenario in full:</strong> this is the shape it takes.';

const S4_FROM = 'This matches CED Scenario 1E exactly.';
const S4_HTML = 'That is the whole pattern: the tool finds, the person decides.';

const S5_FROM = 'Case Study 1 &mdash; CED Scenario 1E in Practice';
const S5_HTML = 'Case Study 1 &mdash; AI Code Review in Practice';

const S6_FROM = '<li>CED Scenario 1E: dev team reviews and approves AI recommendations. This is the model.</li>';
const S6_HTML = '<li>The development team reviews and approves what the AI recommends. That is the model.</li>';

const S7_FROM = '<h4>CED Skill Quick Map</h4>';
const S7_HTML = '<h4>Skill Quick Map</h4>';

const S8_FROM = 'CED Scenario 1E explicitly shows the <em>software development team reviewing and approving</em> AI code vulnerability recommendations before implementation.';
const S8_HTML = 'The code-review scenario on this page shows the <em>software development team reviewing and approving</em> the AI&rsquo;s vulnerability findings before anything is implemented.';

const S9_FROM = 'CED Scenario 1E models this: the developer uses the AI tool&rsquo;s findings as input to their own review process,';
const S9_HTML = 'The code-review scenario models this: the developer uses the AI tool&rsquo;s findings as input to their own review process,';

// ── the Common Mistakes table ────────────────────────────────────────────────
const M1_FROM = 'The CED repeatedly states AI recommendations must be reviewed by a qualified human before implementation.';
const M1_HTML = 'Every one of the three defensive applications on this page ends with a qualified human reviewing what the AI produced.';

const M2_FROM = 'The CED covers both alerting and corrective action, but the human response team remains essential for complex incidents.';
const M2_HTML = 'Alerting and corrective action are both real, but the human response team remains essential for complex incidents.';

const M3_FROM = 'The CED says event volume makes human-only examination impossible &mdash; not just inconvenient.';
const M3_HTML = 'Event volume makes human-only examination impossible, not merely inconvenient.';

const M4_FROM = 'The CED frames AI as a necessity, not a convenience.';
const M4_HTML = 'That is what makes AI a necessity here rather than a convenience.';

// ── the exit ticket, both copies ─────────────────────────────────────────────
const E1A_FROM = '<li>Name the three ways the CED says AI assists cyber defenders. For each, name the type of human who must review AI recommendations before implementation. <em style=\"color:#6B7280!important;\">(AP Skill: Mitigate Risk)</em>';
const E1A_HTML = '<li>Name the three ways AI assists cyber defenders. For each, name the type of human who must review the AI&rsquo;s recommendations before they are implemented. <em style=\"color:#6B7280!important;\">(AP Skill: Mitigate Risk)</em>';

const E2A_FROM = 'Using the CED, evaluate what gets right and what must remain in human hands.';
const E2A_HTML = 'Evaluate what the proposal gets right and what must remain in human hands.';

const E2B_FROM = 'Using the CED, evaluate what the proposal gets right and what must remain in human hands.';
const E2B_HTML = 'Evaluate what the proposal gets right and what must stay in human hands.';

const A1_FROM = '(2) Millions of events daily; humans cannot examine all &mdash; impossible, not inconvenient (1.5.B.1). (3) Risk of fully automated corrective action without human review on critical systems. Flag high-stakes events for human confirmation first. (4) Partially &mdash; novel AI malware (1.4.A.6) may not match training patterns; poisoned training data (1.4.A.4) could compromise the defense AI. AI is a layer, not a complete solution. (5) Right: automated alerting and event sorting (1.5.B.2&ndash;B.3). Must stay human: all three 1.5.A recommendation areas and final decisions on ambiguous corrective actions.';
const A1_HTML = '(2) Millions of events daily; humans cannot examine all of them, which is impossible rather than merely inconvenient. (3) Risk of fully automated corrective action without human review on critical systems. Flag high-stakes events for human confirmation first. (4) Partially: novel AI malware may not match the patterns the defense was trained on, and poisoned training data could compromise the defense AI itself. AI is a layer, not a complete solution. (5) Right: automated alerting and sorting events at scale. Must stay human: all three recommendation areas, and the final decision on any ambiguous corrective action.';

const A2_FROM = '(2) the CED: millions of events daily; humans cannot examine all &mdash; impossible, not inconvenient. (3) Risk of fully automated corrective action without human review on critical systems. Flag high-stakes events for human confirmation first. (4) Partially &mdash; AI catches some patterns but novel AI malware may not match training patterns; poisoned training data could compromise the defense AI. AI is a layer, not a complete solution. (5) Right: automated alerting and event sorting at scale (1.5.B.2&ndash;B.3). Must stay human: reviewing all three 1.5.A recommendation areas and final decisions on ambiguous corrective actions.';
const A2_HTML = '(2) Millions of events daily; humans cannot examine all of them, which is impossible rather than merely inconvenient. (3) Risk of fully automated corrective action without human review on critical systems. Flag high-stakes events for human confirmation first. (4) Partially: AI catches some patterns, but novel AI malware may not match what it was trained on, and poisoned training data could compromise the defense AI itself. AI is a layer, not a complete solution. (5) Right: automated alerting and sorting events at scale. Must stay human: reviewing all three recommendation areas, and the final decision on any ambiguous corrective action.';

//  The one remaining painted code, in the opening three-question answer line.
const A3_FROM = 'AI sorts malicious from harmless at scale (1.5.B.1&ndash;B.2).';
const A3_HTML = 'AI sorts malicious from harmless at scale.';

const SPLICES = [
  { name: 'meta bar badge', from: BADGE_FROM, html: BADGE_HTML },
  { name: 'opening question 1', from: Q1_FROM, html: Q1_HTML },
  { name: 'opening question 2', from: Q2_FROM, html: Q2_HTML },
  { name: 'opening answer 2', from: Q3_FROM, html: Q3_HTML },
  { name: 'opening answer 1 code', from: A3_FROM, html: A3_HTML },
  { name: 'objective: the code-review scenario', from: O1_FROM, html: O1_HTML },
  { name: 'objective: the four skills', from: O2_FROM, html: O2_HTML },
  { name: 'static analysis reference', from: S1_FROM, html: S1_HTML },
  { name: '1.5.4 intro', from: S2_FROM, html: S2_HTML },
  { name: 'application 2 scenario label', from: S3_FROM, html: S3_HTML },
  { name: 'cfu feedback: matches the scenario', from: S4_FROM, html: S4_HTML },
  { name: 'case study 1 eyebrow', from: S5_FROM, html: S5_HTML },
  { name: 'trap 1 bullet', from: S6_FROM, html: S6_HTML },
  { name: 'skill quick map heading', from: S7_FROM, html: S7_HTML },
  { name: 'human oversight trap feedback', from: S8_FROM, html: S8_HTML },
  { name: 'collaboration tool feedback', from: S9_FROM, html: S9_HTML },
  { name: 'mistakes: human review', from: M1_FROM, html: M1_HTML },
  { name: 'mistakes: alerting and response', from: M2_FROM, html: M2_HTML },
  { name: 'mistakes: the scale problem', from: M3_FROM, html: M3_HTML },
  { name: 'mistakes: necessity not convenience', from: M4_FROM, html: M4_HTML },
  { name: 'exit ticket q1, both copies', from: E1A_FROM, html: E1A_HTML, all: true },
  { name: 'exit ticket A q5', from: E2A_FROM, html: E2A_HTML },
  { name: 'exit ticket A answers', from: A1_FROM, html: A1_HTML },
  { name: 'exit ticket B q5', from: E2B_FROM, html: E2B_HTML },
  { name: 'exit ticket B answers', from: A2_FROM, html: A2_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&rdquo;': '\u201d', '&ldquo;': '\u201c',
  '&mdash;': '\u2014', '&ndash;': '\u2013', '&rarr;': '\u2192', '&hellip;': '\u2026',
  '&bull;': '\u2022', '&#9998;': '\u270e',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|bull|#9998);/g,
  (m) => LITERAL[m]);

//  The exit ticket exists twice and its first question is byte-identical in
//  both copies, so a unique anchor cannot reach the second one. Splices marked
//  `all: true` replace every occurrence instead of demanding uniqueness. This
//  is narrow on purpose: an ambiguous anchor is usually a mistake, and only a
//  splice that says so explicitly is allowed past the check.
function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 80))}`);
  }
  return first;
}

function allIndexes(body, anchor, label) {
  const out = [];
  let i = -1;
  while ((i = body.indexOf(anchor, i + 1)) >= 0) out.push(i);
  if (!out.length) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  return out;
}

function applySplices(body) {
  const resolved = [];
  for (const s of SPLICES) {
    const from = lit(s.from);
    const starts = s.all ? allIndexes(body, from, s.name) : [indexOfUnique(body, from, s.name)];
    starts.forEach((start, k) => resolved.push({
      name: starts.length > 1 ? `${s.name} [${k + 1}/${starts.length}]` : s.name,
      start,
      end: start + from.length,
      html: lit(s.html),
      removed: from.length,
    }));
  }
  resolved.sort((a, b) => a.start - b.start);

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
