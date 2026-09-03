'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SHEET VALIDATOR: SEVEN RULES, AND A SHEET THAT BREAKS ANY OF THEM IS
//  REFUSED RATHER THAN WARNED ABOUT.
//
//  ── WHY A VALIDATOR IS THE LEVERAGE POINT ───────────────────────────────────
//  Twenty-four pages reviewed by hand is twenty-four judgement calls, made late
//  and under time pressure, and the record says how that goes: 218 CED codes
//  shipped in student-visible text on one rebuilt lesson before anyone noticed,
//  and AP CSP handout pages are shipping them today. A generator plus a real
//  validator turns those judgement calls into one reviewable sheet.
//
//  "Real" is the whole load-bearing word. A validator nobody has broken on
//  purpose is decoration, so every rule here is mutation tested by
//  tools/ap-cyber-ced/validator-mutation.js, each rule independently, and a
//  green mutation run is a FAILED check.
//
//  ── EVERY FAILURE NAMES ITS RULE ────────────────────────────────────────────
//  Messages begin with the rule id (R1 to R7). That is not cosmetic: it is what
//  lets the mutation battery insist that breaking rule 6 trips RULE 6, rather
//  than accepting a red run from whichever guard happened to fire first. Where
//  guards overlap, the strong one masks the weak one, and a battery that only
//  checks for redness reports a clean run over a rule that cannot fire at all.
//  That is exactly how a stoplist rule in this repo survived three suites.
//
//  ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────
//  It does not repair anything. A validator's job is to refuse the sheet, not
//  to rewrite it quietly: a sheet that was silently corrected is a sheet nobody
//  reviewed. It also cannot tell whether a lesson reads well. No check settles
//  that, and pretending otherwise would be the failure the human-judgement rule
//  exists to prevent.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const ekDensity = require('../../lib/cyber-ek-density');
const cyberTopics = require('../../lib/cyber-topics');
const mojibake = require('../../lib/mojibake');

const RULES = {
  R1: 'a CED Essential Knowledge code in student-visible text',
  R2: 'a fabricated per-unit or per-topic exam weighting',
  R3: 'an em-dash',
  R4: 'a topic title that does not match the canonical taxonomy byte for byte',
  R5: 'a Body HTML column on a row that is not a body update',
  R6: 'an internal link to a handle that does not resolve',
  R7: 'mojibake',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Text helpers
// ─────────────────────────────────────────────────────────────────────────────

//  Comments are stripped before any text rule runs: an instruction comment is
//  not something a student reads, and counting one as prose has already cost
//  this repo a false report in a different gate.
const stripComments = (html) => String(html || '').replace(/<!--[\s\S]*?-->/g, '');

//  Tags to spaces rather than to nothing, so two words either side of a tag do
//  not fuse into one and defeat a word-boundary match.
const flatten = (html) => stripComments(html)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 1: an EK code a student can read.
//
//  Routed through lib/cyber-ek-density.js, which already knows the three places
//  a code earns its place (the collapsed coverage table a teacher audits, a
//  block whose claim the code is evidence for, a teacher-facing answer key) plus
//  one orientation tag per concept card. Writing a second opinion about that
//  convention here is how two modules end up disagreeing about the same page.
//
//  An UNBALANCED block is a failure too, and that is the subtle half. The
//  density module locates protected regions by walking a tag to its matching
//  close; a block that never closes means the protection map is unreliable, and
//  an unreliable map reports codes as protected that are not. Silence there
//  reads exactly like a clean page.
// ─────────────────────────────────────────────────────────────────────────────
function ruleEkCodes(body) {
  const out = [];
  const { citations, unbalanced } = ekDensity.citations(stripComments(body));
  for (const u of unbalanced) {
    out.push(`R1 the EK protection map is unreliable: ${u} never closes, so no code on this page can be judged`);
  }
  for (const c of citations) {
    if (c.protectedBy) continue;
    out.push(`R1 ${RULES.R1}: ${JSON.stringify(c.code)} at ${c.index}: ${JSON.stringify(c.context.slice(0, 120))}`);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 2: a fabricated exam weighting.
//
//  THE DISTINCTION THIS RULE HAS TO GET RIGHT, or it rejects correct pages:
//
//    LEGITIMATE   the CED's per-SKILL-CATEGORY band. "Each skill category is
//                 25% to 40% of the exam" is CED-verbatim and true.
//    FABRICATED   any per-UNIT or per-TOPIC percentage. "Unit 3 is 22% of the
//                 exam" is not in the CED at all. AP Cybersecurity publishes no
//                 per-unit weighting, so every number of that shape was
//                 invented by whoever typed it.
//
//  So a percentage is judged by what it is ATTACHED to, not by its value:
//
//    no exam word nearby            ignored. "80% of breaches begin with a
//                                   stolen credential" is content, not a claim
//                                   about the exam.
//    a unit or topic nearby         refused, whatever the number is.
//    a skill category nearby        allowed, but only inside the 25 to 40 band
//                                   the CED states. A skill category at 55% is
//                                   as invented as a unit at 22%.
//    an exam word and nothing else  refused. An unattributed exam percentage
//                                   has no CED source to check it against.
//
//  ATTACHED MEANS NEAREST, and that detail is what makes the rule usable. Every
//  one of these pages carries "Topic 1.2" in its own heading, so a rule that
//  failed on any unit or topic word ANYWHERE in a 260 character window rejected
//  the CED's own correct sentence on the first page it saw: the heading was in
//  the window, and the heading is not a claim about the exam. So the anchors are
//  ranked by distance from the percentage and the closest one wins. A tie goes
//  to the unit, because failing closed on an ambiguous exam claim costs a
//  rewrite and passing one costs a student a wrong belief about the exam.
// ─────────────────────────────────────────────────────────────────────────────
const PAD = 260;
const EXAM_WORDS = /\b(?:exam|exams|weighting|weightings|weighted|weight|weights)\b/i;
const UNIT_WORDS = /\b(?:unit\s*[0-5]|units\s*[0-5]|this unit|the unit|per unit|per-unit|topic\s*\d\.\d|this topic|the topic|per topic)\b/i;
const SKILL_WORDS = /\b(?:skill categor(?:y|ies)|analyze risk|mitigate risk|detect attacks)\b/i;
//  The CED's band. Both ends are the CED's numbers, not a tolerance.
const BAND = { low: 25, high: 40 };

const PERCENT = new RegExp(
  //  a range first, so "25% to 40%" is one claim rather than two
  '(\\d{1,3})\\s*(?:%|percent)?\\s*(?:to|through|[-\\u2013])\\s*(\\d{1,3})\\s*(?:%|percent)'
  + '|(\\d{1,3})\\s*(?:%|percent)',
  'gi'
);

//  The anchor closest to `at`, searched inside `window` only. Distance is
//  measured to the nearer edge of the match, so a phrase that ENDS just before
//  the percentage counts as closer than one that starts earlier.
function nearestAnchor(text, at, length, kinds) {
  let best = null;
  for (const [kind, re] of Object.entries(kinds)) {
    const rx = new RegExp(re.source, `${re.flags.replace('g', '')}g`);
    let m;
    while ((m = rx.exec(text))) {
      if (m.index + m[0].length < at - PAD || m.index > at + length + PAD) continue;
      const distance = m.index >= at + length ? m.index - (at + length)
        : Math.max(0, at - (m.index + m[0].length));
      //  A tie goes to whichever kind was listed first, and `unit` is listed
      //  first on purpose: an ambiguous exam claim fails closed.
      if (!best || distance < best.distance) best = { kind, distance, text: m[0] };
    }
  }
  return best;
}

function ruleExamWeighting(body) {
  const out = [];
  const text = flatten(body);

  for (const m of text.matchAll(PERCENT)) {
    const values = (m[1] !== undefined ? [Number(m[1]), Number(m[2])] : [Number(m[3])]);
    const window = text.slice(Math.max(0, m.index - PAD), m.index + m[0].length + PAD);
    if (!EXAM_WORDS.test(window)) continue;

    const context = JSON.stringify(text.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90));
    const anchor = nearestAnchor(text, m.index, m[0].length, { unit: UNIT_WORDS, skill: SKILL_WORDS });

    if (!anchor) {
      out.push(`R2 an exam weighting with nothing to attribute it to: ${JSON.stringify(m[0])}.`
        + ` The only weighting the CED states is ${BAND.low} to ${BAND.high} percent per skill category. ${context}`);
      continue;
    }
    if (anchor.kind === 'unit') {
      out.push(`R2 ${RULES.R2}: ${JSON.stringify(m[0])} is attached to ${JSON.stringify(anchor.text)}`
        + ` (${anchor.distance} characters away). The CED publishes no per-unit or per-topic exam weighting. ${context}`);
      continue;
    }
    const bad = values.filter((v) => v < BAND.low || v > BAND.high);
    if (bad.length) {
      out.push(`R2 a per-skill-category weighting outside the CED band: ${JSON.stringify(m[0])}`
        + ` is not within ${BAND.low} to ${BAND.high} percent. ${context}`);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 3: an em-dash.
//
//  Entities count. The rule is about what a student sees, and &mdash; renders as
//  an em-dash: a rule that only looked for the literal character would pass the
//  encoded form of the same defect, which is the shape half the hollow guards in
//  this repo have had.
// ─────────────────────────────────────────────────────────────────────────────
const EMDASH = /\u2014|&mdash;|&#8212;|&#x2014;/gi;

function ruleEmDash(value, where) {
  const hits = [...String(value || '').matchAll(EMDASH)];
  return hits.map((h) => `R3 ${RULES.R3} in ${where} at ${h.index}: ${JSON.stringify(h[0])}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 4: the topic title, byte for byte against the canonical taxonomy.
//
//  This is the rule that exists because of the 1.3 versus 1.4 swap. The site
//  calls topic 1.3 "Wireless Security"; the CED calls it "Best Practices for
//  Public Networks". Both names are in the repo's history, so "close enough"
//  cannot be the test: the canonical string has to appear, exactly, in the
//  sheet Title and in the page's own heading.
//
//  Three separate ways to be wrong, and all three are checked, because catching
//  only the first would let the other two ship:
//    the Title cell does not carry the canonical title
//    the page heading does not carry it (the Title column is not what a student
//    reads; the h1 is)
//    the row carries ANOTHER topic's canonical title, which is the swap itself
// ─────────────────────────────────────────────────────────────────────────────
function ruleTitle(row, spec) {
  const out = [];
  const canonical = cyberTopics.titleOf(spec.topic);
  const title = String(row.Title || '');
  const body = stripComments(row['Body HTML']);

  if (!title.includes(canonical)) {
    out.push(`R4 ${RULES.R4}: topic ${spec.topic} is ${JSON.stringify(canonical)},`
      + ` and the Title column reads ${JSON.stringify(title)}`);
  }

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(body);
  if (!h1) {
    out.push(`R4 the page has no h1, so its title cannot be checked against topic ${spec.topic}`);
  } else if (!flatten(h1[1]).includes(canonical)) {
    out.push(`R4 ${RULES.R4}: the page heading reads ${JSON.stringify(flatten(h1[1]))},`
      + ` and topic ${spec.topic} is ${JSON.stringify(canonical)}`);
  }

  //  Another topic's title, anywhere in the heading or the Title column, is the
  //  swap. Checked against every other canonical title rather than against a
  //  list of known mistakes.
  const heading = `${title} ${h1 ? flatten(h1[1]) : ''}`;
  for (const other of cyberTopics.topics()) {
    if (other.topic === spec.topic) continue;
    //  One canonical title contains another: topic 5.5 is "Protecting
    //  Applications" and topic 5.2 is "Protecting Applications and Data:
    //  Managerial Controls and Access Controls". The shorter one is inside the
    //  longer one, so a plain substring test would report 5.2's own correct
    //  heading as carrying 5.5's title. Skipping the containment case keeps the
    //  swap check honest without weakening it: a real swap puts a title that
    //  is NOT part of this topic's title on the page.
    if (canonical.includes(other.title)) continue;
    if (heading.includes(other.title)) {
      out.push(`R4 the title of topic ${other.topic} (${JSON.stringify(other.title)})`
        + ` appears on the page for topic ${spec.topic}`);
    }
  }

  //  A stated topic number that disagrees with the row's topic. "Topic 1.4" on
  //  the 1.3 page is the same swap wearing a number instead of a name.
  for (const m of heading.matchAll(/\bTopic\s+(\d\.\d)\b/gi)) {
    if (m[1] !== spec.topic) {
      out.push(`R4 the page for topic ${spec.topic} calls itself Topic ${m[1]}`);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 5: the Body HTML column, and the live page it can erase.
//
//  Matrixify MERGE writes the WHOLE Body HTML. An empty Body HTML cell does not
//  mean "leave the body alone", it means "the body is now empty", and the live
//  page is gone. The standing rule is therefore to omit the column entirely
//  unless the row IS a body update.
//
//  Both halves are enforced: an empty cell in a sheet that carries the column,
//  and a row the spec marks as metadata-only sitting in a sheet that carries the
//  column at all. The second is what keeps a "publish these pages" row from
//  travelling in the same file as a body rewrite.
// ─────────────────────────────────────────────────────────────────────────────
function ruleBodyColumn(rows, specs, header) {
  const out = [];
  if (!header.includes('Body HTML')) {
    //  No column, nothing to erase. A metadata-only sheet is the correct shape
    //  for metadata-only rows.
    return out;
  }
  rows.forEach((row, i) => {
    const spec = specs[i] || {};
    const body = String(row['Body HTML'] == null ? '' : row['Body HTML']);
    if (!body.trim()) {
      out.push(`R5 ${RULES.R5}: row ${i + 1} (${row.Handle}) has an EMPTY Body HTML cell.`
        + ' A MERGE import would replace the live page body with nothing.');
      return;
    }
    if (spec.body_update === false) {
      out.push(`R5 ${RULES.R5}: row ${i + 1} (${row.Handle}) is a metadata-only row,`
        + ' and it is in a sheet that carries the Body HTML column. Split it into its own sheet.');
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 6: an internal link to a handle that does not resolve.
//
//  379 internal /pages/ links across 142 targets were 404ing on this site when
//  somebody last counted (board task 156), so this is not a hypothetical.
//
//  A handle the SHEET ITSELF creates counts as resolvable: a batch that
//  cross-links its own pages is correct, and refusing it would be the rule
//  getting in the way of the thing it is protecting.
// ─────────────────────────────────────────────────────────────────────────────
const INTERNAL_LINK = /href\s*=\s*["'](?:https?:\/\/[^/"']*apcsexamprep\.com)?\/pages\/([^"'#?]+)/gi;

function ruleDeadLinks(rows, liveHandles) {
  const out = [];
  const created = new Set(rows.map((r) => String(r.Handle || '').trim()).filter(Boolean));
  const resolves = (h) => created.has(h) || liveHandles.has(h);

  rows.forEach((row, i) => {
    const body = stripComments(row['Body HTML']);
    const seen = new Set();
    for (const m of body.matchAll(INTERNAL_LINK)) {
      const handle = m[1].replace(/\/+$/, '');
      if (resolves(handle) || seen.has(handle)) continue;
      seen.add(handle);
      out.push(`R6 ${RULES.R6}: row ${i + 1} (${row.Handle}) links to /pages/${handle},`
        + ' which is neither live nor created by this sheet');
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RULE 7: mojibake, at every corruption depth.
//
//  DETECTION IS NOT DONE HERE. It goes through lib/mojibake.js, for the same
//  reason rule 1 goes through lib/cyber-ek-density.js: one module per
//  convention, or two modules eventually disagree about the same page.
//
//  This branch shipped its own structural detector on 2026-09-03 and main
//  shipped one the same afternoon, from a different direction and with a
//  generated-fixture suite behind it. Two implementations of one convention is
//  the thing both of them exist to prevent, so this file now formats what the
//  shared module finds and holds no opinion of its own about what mojibake is.
//
//  What a formatter still owes the reader: the codec and the width. "cp1252,
//  width 4" is what says an emoji was damaged once, and "latin1, width 2" is
//  what says the damage has been run over twice. A message that only said
//  "mojibake here" would send somebody back to the module to find out which.
// ─────────────────────────────────────────────────────────────────────────────
function ruleMojibake(value, where) {
  const text = String(value == null ? '' : value);
  if (!text) return [];
  return mojibake.analyze(text).map((h) => {
    const context = text.slice(Math.max(0, h.index - 40), h.index + h.width + 40);
    return `R7 ${RULES.R7}: ${where}: ${JSON.stringify(h.chunk)} at ${h.index}`
      + ` means ${JSON.stringify(h.fixed)} (${h.codec}, width ${h.width}): ${JSON.stringify(context)}`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Judge a sheet. Nothing is written and nothing is repaired.
 *
 * @param {object} sheet          {header, rows} as parsed by ./sheet-csv.js
 * @param {object} opts
 * @param {object[]} opts.specs   the per-row source spec, in row order. Each
 *                                entry needs `topic`, and may set
 *                                `body_update: false` for a metadata-only row.
 * @param {Set<string>} opts.liveHandles handles that already exist live
 * @returns {{fail: string[], byRule: object, rules: object}}
 */
function validate(sheet, opts = {}) {
  const specs = opts.specs || [];
  const liveHandles = opts.liveHandles || new Set();
  const header = sheet.header || [];
  const rows = sheet.rows || [];
  const fail = [];

  rows.forEach((row, i) => {
    const spec = specs[i];
    const where = `row ${i + 1} (${row.Handle})`;
    if (!spec || !spec.topic) {
      fail.push(`R4 ${where} has no source spec, so nothing about it can be checked against the taxonomy`);
      return;
    }

    fail.push(...ruleEkCodes(row['Body HTML']));
    fail.push(...ruleExamWeighting(row['Body HTML']));
    fail.push(...ruleTitle(row, spec));

    //  Every cell, not only the body: a title or an SEO description is text a
    //  human reads, and both have carried a defect before.
    for (const col of header) {
      fail.push(...ruleEmDash(row[col], `${where} column ${JSON.stringify(col)}`));
      fail.push(...ruleMojibake(row[col], `${where} column ${JSON.stringify(col)}`));
    }
  });

  fail.push(...ruleBodyColumn(rows, specs, header));
  fail.push(...ruleDeadLinks(rows, liveHandles));

  const byRule = {};
  for (const id of Object.keys(RULES)) byRule[id] = fail.filter((f) => f.startsWith(`${id} `));
  return { fail, byRule, rules: RULES };
}

module.exports = {
  RULES, validate, flatten, stripComments,
  ruleEkCodes, ruleExamWeighting, ruleEmDash, ruleTitle, ruleBodyColumn, ruleDeadLinks, ruleMojibake,
  BAND, PAD,
};
