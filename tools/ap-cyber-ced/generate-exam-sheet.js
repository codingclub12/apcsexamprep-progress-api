'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RENDER THE 60 QUESTION REPLICA INTO ap-cybersecurity-practice-exam.
//
//  ── WHY THIS IS SURGERY AND NOT A REGENERATION ─────────────────────────────
//  That page ranks at position 1.6 with a 40.6 percent click-through on
//  "ap cybersecurity practice test", measured in the Search Console export for
//  Aug 30 to Sep 1. The decision taken with Tanner was an INTENT UPGRADE on the
//  ranking URL rather than a new competing page: a 40 question study set
//  becoming the 60 question replica better satisfies the same search, so the
//  URL keeps its authority and the practice experience underneath improves.
//
//  Everything that makes the SERP result what it is therefore survives. The
//  body is rebuilt from the LIVE body with three kinds of edit and nothing else:
//
//    PRESERVED byte for byte   both <style> blocks, the BreadcrumbList, the
//                              closing CTA, the resources grid, the footer, and
//                              the scoring script, which is generic: it reads
//                              data-correct off each card and does not care how
//                              many there are.
//    EDITED in place           the seven places in the head that state a count,
//                              plus the schema. See COUNT_EDITS.
//    REPLACED                  the question region, from the first unit divider
//                              to the closing CTA.
//
//  ── THE SCHEMA IS EDITED, AND THAT IS A DEPARTURE WORTH NAMING ─────────────
//  The instruction was to preserve the schema. The FAQPage and the Article both
//  hard-code "40 multiple choice questions and 3 free-response", and FAQPage is
//  rich-result eligible, so preserving them literally would publish structured
//  data that contradicts the page and could surface the wrong count in a SERP.
//  The intent behind the instruction was not to churn the SEO package, not to
//  ship a false claim, so the counts are corrected and the block's type, URLs,
//  question set and everything else is untouched.
//
//  ── THE SERP PACKAGE CHANGES IN EXACTLY ONE PLACE ──────────────────────────
//  The sheet carries Handle, Command, Body HTML and SEO Title. It does NOT
//  carry Title, so the page's internal title is left alone, and it does not
//  carry the meta description, which already reads "how the real exam is built:
//  60 MCQ and one Device Security Analysis" and stays true. One SERP variable
//  moves, which is what makes the effect on ranking attributable afterwards.
//
//  Run: node tools/ap-cyber-ced/generate-exam-sheet.js --bodies <dir> [--out-dir <dir>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { parseCsv, writeCsv } = require('./sheet-csv');
const { validate } = require('./exam-validator');
const bank = require('../../config/cyber-exam-items.json');
const blueprint = require('../../config/cyber-exam-blueprint.json');
const cyberTopics = require('../../lib/cyber-topics');

const HANDLE = 'ap-cybersecurity-practice-exam';
const HEADER = ['Handle', 'Command', 'Body HTML', 'SEO Title'];
const SEO_TITLE = 'AP Cybersecurity Practice Exam | 60 MCQ + Device Security Analysis';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const UNIT_NAME = {
  1: 'Introduction to Security', 2: 'Securing Physical Spaces', 3: 'Securing Networks',
  4: 'Securing Devices', 5: 'Securing Applications and Data',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Every head string that states a count. Each must match EXACTLY ONCE; a miss
//  throws rather than silently leaving a stale number on a live page, which is
//  the failure mode that matters here. The old page said 40 and 3 in seven
//  places and two schema blocks, and a rewrite that updates six of them is
//  worse than one that refuses.
// ─────────────────────────────────────────────────────────────────────────────
const COUNT_EDITS = [
  // leading managed comment
  ['AP CYBERSECURITY PRACTICE SET - 40 MCQ + 3 FRQ, NOT EXAM SHAPED',
   'AP CYBERSECURITY PRACTICE EXAM - 60 MCQ + 1 DEVICE SECURITY ANALYSIS, CED SHAPED'],
  ['40 practice MCQ + 3 free-response sets | All 5 Units | Interactive Scoring + Tim',
   '60 practice MCQ + 1 Device Security Analysis | All 5 Units | Interactive Scoring + Tim'],
  // FAQPage
  ['This practice set contains 40 multiple choice questions and 3 free-response practice questions, covering all 5 units',
   'This practice exam contains 60 multiple choice questions and one Device Security Analysis free-response question, covering all 5 units'],
  ['Yes, completely free. It includes 40 interactive MCQs with instant scoring and detailed explanations, plus 3 free-response practice questions with sample responses.',
   'Yes, completely free. It includes 60 interactive MCQs with instant scoring and detailed explanations, plus one Device Security Analysis free-response question with a full rubric.'],
  // Article
  ['AP Cybersecurity Practice Set: 40 MCQ + 3 Free Response with Answers (2026-2027)',
   'AP Cybersecurity Practice Exam: 60 MCQ + Device Security Analysis with Answers (2026-2027)'],
  ['Practise 40 scenario-based AP Cybersecurity multiple choice questions and 3 free-response questions across all 5 units',
   'Practise 60 scenario-based AP Cybersecurity multiple choice questions and one Device Security Analysis free-response question across all 5 units'],
  // hero
  //  The page uses the literal middle dot and en dash, not the entities.
  ['<div class="pq-hero-badge">Practice Set · 40 MCQ + 3 Free Response</div>',
   '<div class="pq-hero-badge">Full Practice Exam · 60 MCQ + Device Security Analysis</div>'],
  ['<h1>AP Cybersecurity Practice Set</h1>', '<h1>AP Cybersecurity Practice Exam</h1>'],
  ['Forty scenario-based multiple choice questions and three free-response questions across all 5 units, with interactive scoring and an explanation for every question. This is a study set rather than a replica: the real exam is 60 multiple choice questions and one free-response question.',
   'Sixty scenario-based multiple choice questions and one Device Security Analysis free-response question, built to the shape of the real exam: 60 multiple choice in Section I, one free response in Section II, with interactive scoring and an explanation for every question.'],
  ['<strong id="peAnswered">0</strong> / 40', '<strong id="peAnswered">0</strong> / 60'],
  // overview
  ['This set gives you <strong>40 multiple choice questions</strong> and <strong>3 free-response questions</strong>, distributed across all five course units and testing the three skill categories: Analyze Risk, Mitigate Risk, and Detect Attacks.',
   'This exam gives you <strong>60 multiple choice questions</strong> and <strong>one Device Security Analysis free-response question</strong>, matching the shape of the real exam. The multiple choice section is balanced across the three skill categories rather than by unit, because the College Board publishes a weighting per skill category and none per unit.'],
  // breadcrumb and footer still said Practice Set
  ['"name": "Practice Set", "item"', '"name": "Practice Exam", "item"'],
  ['AP Cybersecurity Practice Set | APCSExamPrep.com', 'AP Cybersecurity Practice Exam | APCSExamPrep.com'],
  //  One em-dash inherited from the resources grid. The rule governs text we
  //  author, and this was not ours, but a MERGE republishes the whole body so
  //  we are shipping it either way. One character, and the whole body comes
  //  out clean rather than clean apart from the bit we inherited.
  ['unit exams — the complete structured course.', 'unit exams, the complete structured course.'],
  //  The section heading and the FAQ's per-unit answer both still described the
  //  40 question set. Neither was in the first pass of this list, and a check
  //  built from hand-written patterns did not see either, which is why the
  //  guard behind it is now derived from the bank instead.
  ['<div class="pq-section"><h2>Section 1: Multiple Choice (40 Questions)</h2></div>',
   '<div class="pq-section"><h2>Section I: Multiple Choice (60 Questions)</h2></div>'],
  //  The old answer listed a count per unit. The replacement states the skill
  //  category balance instead, which is the axis College Board publishes a
  //  weighting for; a per-unit figure on this page invites the reader to treat
  //  it as a weighting, and there is no published per-unit weighting to treat.
  ['The set covers all 5 units: Unit 1 (Introduction to Security, 7 questions), Unit 2 (Securing Spaces, 9 questions), Unit 3 (Securing Networks, 10 questions), Unit 4 (Securing Devices, 8 questions), and Unit 5 (Securing Applications and Data, 6 questions), plus 3 FRQs spanning Units 2-5.',
   'The exam covers all 5 units and every one of the 24 topics in the course framework. The multiple choice section is balanced across the three skill categories at 20 questions each, which is the axis College Board publishes a weighting for. Section II is one Device Security Analysis free-response question.'],
  // how to take
  ['To rehearse exam pacing, try all 40 MCQs in one sitting, and give a free-response question about 50 minutes, which is the time the real exam suggests for its one question.',
   'To rehearse exam pacing, give yourself 80 minutes for the 60 multiple choice questions and 50 minutes for the Device Security Analysis, which are the times the real exam allows for each section.'],
];

//  The format note explained how the real exam differs from this set. The page
//  IS that shape now, so the note becomes a statement of what you are sitting.
const OLD_NOTE_OPEN = '<div class="pq-format-note">';
const NEW_NOTE = `<div class="pq-format-note">
      <p><strong>How this exam is built.</strong> It follows the published shape of the AP Cybersecurity exam:</p>
      <ul>
        <li> <strong>Section I:</strong> 60 multiple choice questions, 80 minutes, 70 percent of the exam. Every unit is assessed, and each skill category carries 25 to 40 percent. This exam is balanced at 20 questions per skill category.</li>
        <li> <strong>Section II:</strong> one free-response question, <strong>Device Security Analysis</strong>, 50 minutes, 30 percent of the exam. It gives you six sources about a single device (a device policy, firewall rules, authentication and application logs, a file listing with permissions, and update and backup status) and asks you to find security issues, spot evidence of attacks, configure permissions and firewall rules, and recommend hardening, citing the sources throughout. One part asks you to write an actual command, such as chmod. Only Skill Categories 2 and 3 are assessed.</li>
      </ul>
      <p>Every question below is new. If you worked through the earlier version of this page, nothing here repeats it.</p>
    </div>`;

function renderCard(item, number) {
  const t = cyberTopics.topic(item.topic);
  const unit = t ? t.unit_no : '';
  const opts = item.options.map((o, i) => {
    const L = ['A', 'B', 'C', 'D'][i];
    return `      <div class="pq-opt" data-val="${L}">\n`
      + `<span class="pq-opt-letter">${L}</span><span>${esc(o)}</span>\n</div>`;
  }).join('\n');
  return `<div class="pq-card" data-correct="${item.answer}" data-qid="${number}">
    <p class="pq-qnum">Question ${number} · Unit ${unit} · Topic ${item.topic}</p>
    <p class="pq-stem">${esc(item.stem)}</p>
    <div class="pq-opts">
${opts}
    </div>
    <button class="pq-check" disabled>Check Answer</button>
    <div class="pq-explain">
      <p class="pq-explain-title">Correct Answer: ${item.answer}</p>
      <p>${esc(item.explanation)}</p>
    </div>
  </div>`;
}

function renderUnitDivider(unit, from, to) {
  return `<div class="pq-unit-div" style="margin-left:24px!important;margin-right:24px!important;">
    <div class="pq-unum">${unit}</div>
    <div>
<p>Unit ${unit}: ${esc(UNIT_NAME[unit])}</p>
<span>Questions ${from}–${to}</span>
</div>
  </div>`;
}

function renderFrq(frq, firstNumber) {
  const sources = frq.sources.map((s) => `<div class="pq-card">
    <p class="pq-qnum">${esc(s.title)}</p>
    <pre class="pq-stem" style="white-space:pre-wrap!important;font-family:ui-monospace,monospace!important;font-size:14px!important;">${esc(s.body)}</pre>
  </div>`).join('\n');
  const parts = frq.parts.map((p) => `<div class="pq-card">
    <p class="pq-qnum">Part ${p.part} · ${p.points} points · Skill Category ${p.skill}</p>
    <p class="pq-stem" style="white-space:pre-wrap!important;">${esc(p.prompt)}</p>
    <button class="pq-check">Show Scoring Guidance</button>
    <div class="pq-explain">
      <p class="pq-explain-title">Scoring guidance, Part ${p.part}</p>
      ${p.rubric.map((r) => `<p>${esc(r)}</p>`).join('\n      ')}
    </div>
  </div>`).join('\n');
  return `<div class="pq-unit-div" style="margin-left:24px!important;margin-right:24px!important;">
    <div class="pq-unum">II</div>
    <div>
<p>Section II: Free Response</p>
<span>${esc(frq.name)} · ${frq.minutes} minutes · ${frq.weight_percent} percent</span>
</div>
  </div>
<div class="pq-section">
    <h2>${esc(frq.name)}</h2>
    <p>${esc(frq.scenario)}</p>
    <p>Suggested time: ${frq.minutes} minutes. Section II is ${frq.weight_percent} percent of the exam and is worth ${frq.parts.reduce((n, p) => n + p.points, 0)} points.</p>
  </div>
${sources}
${parts}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  countClaims: every number this page states about ITSELF must be one the item
//  bank can justify.
//
//  This replaces a hand-written list of five stale-count patterns, and it
//  replaces it because that list came back clean while the rendered body still
//  said "Section 1: Multiple Choice (40 Questions)" and still listed a question
//  count per unit from the old 40 question set. Neither string matched any of
//  the five patterns, and nothing about the list could report that it had
//  stopped covering the page. A pattern list cannot tell you it has gone blind.
//
//  So the allowed set is DERIVED from config/cyber-exam-items.json rather than
//  typed: change the bank and the guard moves with it. A number describing a
//  DIFFERENT page is the one exception, and it is anchored rather than
//  exempted, because an unanchored 15 would re-admit any stale count that
//  happened to be 15.
// ─────────────────────────────────────────────────────────────────────────────
const WORD_NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60,
};
//  A count immediately before one of these nouns is a claim about how much
//  assessment there is. Filler between the two is allowed because the page
//  writes "60 scenario-based multiple choice questions".
const COUNT_NOUN = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty)[\s-]+(?:(?:scenario-based|interactive|practice|multiple|choice|new|more|other|of|the|our|these)[\s-]+){0,4}(free-response questions?|free-response|questions?|mcqs?|frqs?|items?)\b/gi;
//  Counts that are true of a page this one links to. Accepted only when that
//  page's handle is nearby, so the number cannot launder a stale claim.
const CROSS_PAGE_COUNTS = [{ handle: 'ap-cybersecurity-practice-questions', count: 15 }];
const NEAR = 260;

function countClaims(body, bankArg) {
  const b = bankArg || bank;
  const items = b.items;
  const perUnit = new Map();
  const perSkill = new Map();
  for (const it of items) {
    const unit = String(it.topic).split('.')[0];
    perUnit.set(unit, (perUnit.get(unit) || 0) + 1);
    perSkill.set(it.skill, (perSkill.get(it.skill) || 0) + 1);
  }
  //  Allowed PER NOUN CLASS, not globally. A single pooled set let "3 FRQs"
  //  through, because 3 is the true number of skill categories, and a count is
  //  only true of the noun it is attached to. Section II has exactly one
  //  question and no other number is ever right in front of that noun.
  const allowedFor = (noun) => (/^(?:frqs?|free-response)/i.test(noun)
    ? new Set([1])
    //  1 is admitted here too, because "question" is genuinely ambiguous across
    //  the two sections: "the real exam suggests 50 minutes for its one
    //  question" is about Section II and reads with the bare noun. It costs
    //  nothing, since no stale count on this page was ever 1.
    : new Set([1, items.length, ...perUnit.values(), ...perSkill.values()]));
  //  Deliberately NOT allowing every qid 1..60 here. The card writes
  //  "Question 37", noun before number, which this regex never matches, and
  //  admitting the range would have admitted 40 and 3 as well. The first
  //  draft of this guard did exactly that and reported the OLD body clean.

  const bad = [];
  for (const m of body.matchAll(COUNT_NOUN)) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : WORD_NUM[raw];
    if (allowedFor(m[2]).has(n)) continue;
    const from = Math.max(0, m.index - NEAR);
    const window = body.slice(from, m.index + m[0].length + NEAR);
    if (CROSS_PAGE_COUNTS.some((c) => c.count === n && window.includes(c.handle))) continue;
    bad.push({ index: m.index, text: m[0], value: n });
  }
  return bad;
}

function buildBody(live) {
  let out = live;
  //  Collect every mismatch before throwing. Dying on the first hides how many
  //  of the counts have moved, and a rewrite that updates some of them is worse
  //  than one that refuses.
  const missed = [];
  for (const [from] of COUNT_EDITS) {
    const n = out.split(from).length - 1;
    if (n !== 1) missed.push(`matched ${n} times, expected 1: ${JSON.stringify(from.slice(0, 80))}`);
  }
  if (missed.length) {
    throw new Error(`${missed.length} of ${COUNT_EDITS.length} head edits do not match the live body:\n  ${missed.join('\n  ')}`);
  }
  for (const [from, to] of COUNT_EDITS) out = out.replace(from, to);

  //  Swap the format note for one that describes the exam this page now is.
  const ns = out.indexOf(OLD_NOTE_OPEN);
  if (ns === -1) throw new Error('the format note is not where it was');
  let depth = 0; let ne = ns;
  for (const m of out.slice(ns).matchAll(/<div\b[^>]*>|<\/div>/g)) {
    if (m[0] === '</div>') { depth -= 1; if (depth === 0) { ne = ns + m.index + m[0].length; break; } } else depth += 1;
  }
  out = out.slice(0, ns) + NEW_NOTE + out.slice(ne);

  //  Replace the question region: first unit divider through to the closing CTA.
  const start = out.indexOf('<div class="pq-unit-div"');
  const end = out.indexOf('<div class="pq-cta">');
  if (start === -1 || end === -1 || end <= start) throw new Error('cannot bound the question region');

  const byUnit = new Map();
  for (const it of bank.items) {
    const t = cyberTopics.topic(it.topic);
    const u = t ? t.unit_no : 0;
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(it);
  }
  const chunks = [];
  let n = 0;
  for (const unit of [1, 2, 3, 4, 5]) {
    const items = (byUnit.get(unit) || []).sort((a, b) => a.topic.localeCompare(b.topic, undefined, { numeric: true }));
    if (!items.length) continue;
    chunks.push(renderUnitDivider(unit, n + 1, n + items.length));
    for (const it of items) { n += 1; chunks.push(renderCard(it, n)); }
  }
  if (n !== blueprint.mcq_total) throw new Error(`rendered ${n} cards, the blueprint says ${blueprint.mcq_total}`);
  chunks.push(renderFrq(bank.frq, n + 1));

  const built = `${out.slice(0, start)}${chunks.join('\n')}\n${out.slice(end)}`;

  //  Refuse rather than write. The live body states 27 counts that the new bank
  //  cannot justify; if any of them survives the edits above, this throws with
  //  the offending phrase rather than leaving a wrong number on a ranking page.
  const stale = countClaims(built);
  if (stale.length) {
    throw new Error(`${stale.length} count claims the item bank cannot justify:\n  ${
      stale.map((v) => `${JSON.stringify(v.text)} at ${v.index}`).join('\n  ')}`);
  }
  return built;
}

function generate(opts = {}) {
  const file = path.join(opts.bodies, `${HANDLE}.html`);
  if (!fs.existsSync(file)) throw new Error(`no stored body at ${file}. An empty Body HTML cell erases the live page.`);
  const live = fs.readFileSync(file, 'utf8');
  if (!live.trim()) throw new Error('the stored body is empty');
  const body = buildBody(live);

  //  THE TAIL INVARIANT, AND WHY IT IS NOT "BYTE FOR BYTE".
  //  Two declared edits land after the closing CTA: the footer still said
  //  Practice Set, and the resources grid carried an inherited em-dash. So the
  //  tail is not identical and asserting that it is would be false. The useful
  //  claim is stronger: nothing in the tail changed EXCEPT the edits declared
  //  in COUNT_EDITS. Applying those to the live tail must reproduce the tail
  //  that shipped, so an unnoticed change anywhere after the CTA still throws.
  const tailFrom = live.indexOf('<div class="pq-cta">');
  let expectedTail = live.slice(tailFrom);
  for (const [from, to] of COUNT_EDITS) {
    if (expectedTail.includes(from)) expectedTail = expectedTail.replace(from, to);
  }
  if (!body.endsWith(expectedTail)) {
    throw new Error('the tail changed in a way COUNT_EDITS does not account for');
  }
  const tail = expectedTail;

  const rows = [{ Handle: HANDLE, Command: 'MERGE', 'Body HTML': body, 'SEO Title': SEO_TITLE }];
  const csv = writeCsv(rows, HEADER);
  const back = parseCsv(csv);
  const drift = [];
  if (back.rows.length !== 1) drift.push(`row count changed: ${back.rows.length}`);
  for (const c of HEADER) {
    const a = String(rows[0][c] ?? ''); const b = String(back.rows[0][c] ?? '');
    if (a !== b) drift.push(`column ${JSON.stringify(c)}: ${Buffer.byteLength(a)} bytes in, ${Buffer.byteLength(b)} out`);
  }
  const report = validate(bank, { existingStems: opts.existingStems || [] });
  return { body, live, csv, drift, report, rows, tail };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const bodies = arg('--bodies');
  const outDir = arg('--out-dir');
  if (!bodies) { console.error('usage: generate-exam-sheet.js --bodies <dir> [--out-dir <dir>]'); process.exit(2); }
  const existing = require('../../smoke/fixtures/cyber-practice-exam-existing-stems.json').stems;
  const r = generate({ bodies, existingStems: existing });

  console.log(`live body   ${Buffer.byteLength(r.live)} bytes`);
  console.log(`new body    ${Buffer.byteLength(r.body)} bytes (${Buffer.byteLength(r.body) - Buffer.byteLength(r.live) >= 0 ? '+' : ''}${Buffer.byteLength(r.body) - Buffer.byteLength(r.live)})`);
  console.log(`tail: ${r.tail.length} bytes, changed only by declared edits`);
  if (r.drift.length) { console.error('\nPARSE-BACK DRIFT:'); for (const d of r.drift) console.error(`  ${d}`); process.exit(1); }
  console.log('parse-back: clean');
  if (r.report.fail.length) { console.error(`\nVALIDATOR REFUSED (${r.report.fail.length}):`); for (const f of r.report.fail.slice(0, 20)) console.error(`  ${f}`); process.exit(1); }
  console.log('item bank: clean on all 11 rules');

  if (outDir) {
    const f = path.join(outDir, 'cyber-practice-exam-replica-pages.csv');
    fs.writeFileSync(f, r.csv);
    console.log(`wrote ${f} (${Buffer.byteLength(r.csv)} bytes, 1 row)`);
  } else console.log('(no --out-dir, nothing written)');
}

if (require.main === module) main();
module.exports = { generate, buildBody, renderCard, renderFrq, countClaims, COUNT_EDITS, CROSS_PAGE_COUNTS, HANDLE, SEO_TITLE, HEADER };
