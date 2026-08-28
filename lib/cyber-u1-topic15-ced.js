'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY TOPIC 1.5: THE SMALL FIXES, AND WHY THEY ARE SMALL
//
//  ── THIS PAGE IS IN GOOD SHAPE, LIKE 1.3 ────────────────────────────────────
//  Every credited answer in all ten graded items is CED content, checked one by
//  one: the scale problem (1.5.B.1), signature versus anomaly detection
//  (1.5.B.2), code vulnerability analysis (1.5.A.2), false positives and the
//  human-review requirement that attaches to all three 1.5.A areas. Not one
//  names an off-CED term. There is nothing to realign.
//
//  The handoff's premise was that Unit 1 taught a legacy taxonomy. It was right
//  about 1.1, 1.2 and 1.4 and wrong about 1.3 and 1.5, and saying so is part of
//  the job.
//
//  ── WHAT IT DOES NEED ───────────────────────────────────────────────────────
//  EK codes in front of students, which the thinning pass handles, plus three
//  places the thinner cannot reach because they are not prose:
//
//    1. A learning objective reading "Recognize the three most common AP exam
//       traps on AI defense questions". Same habit that filled 1.2.9 with
//       invented question patterns, and worth removing while it is one line.
//    2. An AP Exam Focus bullet citing "all three 1.5.A areas" and
//       "Distinguish 1.4 from 1.5", which are codes in a summary box.
//    3. A Common Mistakes row headed with a bare code.
//
//  This module runs BEFORE the thinning pass in the same build, so one sheet
//  carries both. Two sheets for one page would each be built against the live
//  body and the second would undo the first.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-u1-topic15-ced-csv.js out/topic15.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-ai-cyber-defense';
const PAGE_ID = '132230676695';
const TITLE = 'AP Cybersecurity 1.5: AI in Cyber Defense';

// ── 1. the objective that claims to know the exam ────────────────────────────
const OBJ_FROM = '<span class="obj-check"></span>Recognize the three most common AP exam traps on AI defense questions';
const OBJ_HTML = '<span class="obj-check"></span>Name the three mix-ups that make AI defense questions go wrong: treating detection as a complete answer, forgetting that every recommendation needs a qualified human, and confusing AI used to defend with AI used to attack';

// ── 2. the focus box, which cites codes and cross-references a topic by number ─
const FOCUS_FROM = '&bull; Apply the human-in-the-loop principle: all three 1.5.A areas require qualified human review before implementation<br>&bull; Distinguish 1.4 (AI used to attack) from 1.5 (AI used to defend)';
const FOCUS_HTML = '&bull; Apply the human-in-the-loop principle: every one of the three things AI recommends here needs a qualified human to review it before it is implemented<br>&bull; Keep AI used to defend separate from AI used to attack, which is the previous topic';

// ── 3. a Common Mistakes row headed with a bare code ─────────────────────────
const MIST_FROM = '<td class="term">Forgetting human review is required for all three 1.5.A areas</td>\n<td>All three items (1.5.A.1, A.2, A.3) include the same caveat. Students often remember one but forget the others.</td>';
const MIST_HTML = '<td class="term">Forgetting that human review is required for all three</td>\n<td>Configuration review, code analysis and detection rules all carry the same caveat: a qualified person checks the recommendation before it is implemented. Students often remember one and forget the others.</td>';

// ── the three claims about what the exam does ────────────────────────────────
//  Found by the proximity gate built for 1.2, run across every Unit 1 page.
//  This module predates that gate, which is why a page reported as "in good
//  shape" still had three of these. The content in all three is correct and
//  stays; what goes is the assertion about what an exam contains, which is the
//  same habit that filled 1.2.9 with invented question patterns.
//
//  The first also cites "CED Scenario 1E" to a student, which is a document
//  reference they cannot act on, so it goes in the same splice.
const K1_FROM = '<span class="exam-trap">KEY</span> The AP exam specifically tests whether students understand that AI tools require human oversight. &ldquo;The AI tool should be trusted to automatically implement all security fixes&rdquo; is always wrong. The CED Scenario 1E explicitly shows the software development team reviewing AI recommendations before implementing them.';
const K1_HTML = '<span class="exam-trap">KEY</span> This is the part people get wrong: an AI tool is not trusted to implement security fixes on its own. A person reviews what it recommends and decides. The reason is in the row above, that the tool produces false positives and can be fed adversarial input, and neither of those is visible without someone looking.';

const K2_FROM = '<td class="vt-term">Example AP question</td>';
const K2_HTML = '<td class="vt-term">A question it answers</td>';

const K3_FROM = '<p><strong>The AP exam angle:</strong> The arms race concept appears in questions that ask why &ldquo;AI defense tools require ongoing maintenance and updates&rdquo; or why &ldquo;human oversight cannot be eliminated even with advanced AI tools.&rdquo; The answer is adversarial inputs and the AI-vs-AI dynamic.</p>';
const K3_HTML = '<p><strong>Why this matters:</strong> it is the reason two things on this page are not optional. An AI defense tool needs ongoing maintenance because the attacks it was trained on keep changing, and human oversight cannot be removed because adversarial input is designed to look normal to the model and wrong to a person.</p>';

const SPLICES = [
  { name: 'exam-traps objective', from: OBJ_FROM, html: OBJ_HTML },
  { name: 'AP Exam Focus bullets', from: FOCUS_FROM, html: FOCUS_HTML },
  { name: 'common mistakes row', from: MIST_FROM, html: MIST_HTML },
  { name: 'human-oversight exam claim', from: K1_FROM, html: K1_HTML },
  { name: 'example AP question column', from: K2_FROM, html: K2_HTML },
  { name: 'arms race exam angle', from: K3_FROM, html: K3_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  '&#9733;': '★', '&#9888;': '⚠', '&ne;': '≠', '&#9998;': '✎', '&bull;': '•',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|ne|bull|#9733|#9888|#9998);/g,
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
