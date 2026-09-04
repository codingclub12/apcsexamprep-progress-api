#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  CYBER QOTD: SERVER-RENDER THE BANK, ADD EDUCATION Q&A SCHEMA, AND LINK IT.
//
//  MEASURED 2026-09-03: /pages/ap-cybersecurity-question-of-the-day carries 152
//  questions and serves 2,227 crawlable characters. The whole bank lives in a
//  script block, so a crawler sees a nav blurb. For scale, ONE AP CSP daily
//  practice blog post serves 2,935 crawlable characters by itself. Moving cyber
//  to a single page was the right call - it has no fetch to break, unlike the
//  CSP hub that spent months stuck on "Loading..." - but it took the cost of
//  consolidating to one URL without collecting the benefit of depth on it.
//
//  -- WHY FIVE UNIT PAGES AND NOT ONE BIG ONE --------------------------------
//  The first build put all 152 questions plus the schema on the QOTD page and
//  scripts/matrixify-preflight.js refused it: the body came to 433,231
//  characters against Matrixify's 250,000 CSV cell limit. That is a hard
//  platform ceiling, not a style preference, and it cannot be tuned away. The
//  bank alone is 175,421 characters and the schema another 83,302, against a
//  budget of 90,270 once the existing 159,730-character body is counted.
//
//  So the bank ships as five per-unit pages, which is what the size forces and
//  also what search wants: five pages each targeting "AP Cybersecurity Unit N
//  practice questions" beat one page trying to rank for all of it. The QOTD
//  page keeps its interactive tool and gains a section linking the five.
//
//  This generator emits TWO sheets:
//
//    A. cyber-qotd-unit-pages.csv   5 NEW pages, each carrying its unit's
//       questions as real HTML plus Education Q&A structured data over them.
//    B. cyber-qotd-links-pages.csv  the two EXISTING pages, body only: the QOTD
//       page gains a browse section, and the practice umbrella gains the card
//       it has never had.
//
//  The split is not cosmetic. Matrixify treats a BLANK cell as "set this to
//  empty", so putting the existing pages in the same sheet as the new ones
//  would have blanked their SEO Title and SEO Description. Preflight caught
//  that too. Sheet B therefore carries no SEO columns at all.
//
//  -- WHY Education Q&A AND NOT Quiz PRACTICE PROBLEMS OR FAQPage ------------
//  Checked against Google's own docs on 2026-09-03, not from memory:
//    practice problems  DEPRECATED. Dropped from results Nov 2025, docs removed
//                       Jan 2026. Shipping it would be decoration.
//    FAQPage            not in the current supported list either.
//    Education Q&A      SUPPORTED, and it is precisely this content: flashcard
//                       style question and answer, eligible for the Q&A carousel.
//  Its spec constrains the markup in two ways that shape the HTML below:
//    - `eduQuestionType` takes the fixed value "Flashcard". Ours are multiple
//      choice, but that is the value the feature requires.
//    - "All questions must be immediately visible on the page." So stems and
//      options are rendered plainly and only the ANSWER sits behind a details
//      toggle. That also happens to be the flashcard interaction: read, commit,
//      flip. Hiding the stem to keep the page short would forfeit the schema.
//
//  -- TOPIC TITLES COME FROM THE CED, NOT FROM THE POOL ----------------------
//  CLAUDE.md: AP Cybersecurity topics come from config/cyber-topics.json, read
//  through lib/cyber-topics.js, and from nowhere else. Do not retype a topic
//  title.
//
//  The pool carried its own hardcoded copy of all 24 and four had drifted:
//  1.2, 2.1, 3.2 and 5.2. Two were truncations that dropped the "Protecting
//  Networks:" and "Protecting Applications and Data:" prefixes; two were
//  different titles outright. Topic 1.2 had reached THREE names across the
//  site, which is the failure the rule exists to prevent:
//      QOTD pool    Detecting Suspicious Account Activity
//      lesson page  Password Attacks
//      CED          Suspicious Website Logins
//
//  So every title here comes from topicTitle() and never from
//  POOL.TOPIC_TITLES. Correcting the four strings in place would have fixed
//  today and left the copy free to drift again; removing the copy as an
//  authority is what makes it stay fixed. The pool's TOPIC_TITLES survives
//  only so --topics can report the drift it used to cause.
//
//  Usage:
//    node scripts/cyber-qotd-page-csv.js            write the sheet
//    node scripts/cyber-qotd-page-csv.js --topics   print the CED title diff
//    node scripts/cyber-qotd-page-csv.js --stats    print size and crawl deltas
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { writeCsv, parseCsv, HEADER, PUBLISHED_AT } = require('../tools/ap-cyber-ced/sheet-csv');
const cyberTopics = require('../lib/cyber-topics');

const ROOT = path.join(__dirname, '..');
const POOL = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cyber-qotd-pool.json'), 'utf8'));
const SNAP = (h) => fs.readFileSync(path.join(ROOT, 'config/page-snapshots', h + '.html'), 'utf8');

//  The one door for a topic title. Throws rather than falling back to the
//  pool's copy: a silent fallback is how that copy stayed authoritative.
function topicTitle(n) {
  const t = cyberTopics.topic(n);
  if (!t || !t.title) throw new Error(`topic ${n} is not in the CED taxonomy`);
  return t.title;
}

const QOTD_HANDLE = 'ap-cybersecurity-question-of-the-day';
const UMBRELLA_HANDLE = 'ap-cybersecurity-practice';
const QOTD_TITLE = 'AP Cybersecurity Question of the Day';
const UMBRELLA_TITLE = 'AP Cybersecurity Practice';

// ---------------------------------------------------------------------------
//  Escaping. Pure ASCII output, entities OUTSIDE script blocks and never inside
//  one, per CONVENTIONS.md. The pool is already ASCII (checked) but a future
//  edit will not be, so this is enforced rather than assumed.
//
//  -- WHY CODE BLOCKS ESCAPE TWICE -------------------------------------------
//  Shopify DECODES html entities when it stores a body. Measured on this store
//  2026-09-04: across every page checked, stored body_html contains zero
//  occurrences of &lt;, &gt; or &amp;. They are all decoded on save.
//
//  For prose that is harmless. Inside a code block it deleted content. Question
//  C1-102 shows a phishing header:
//      From: IT-Support &lt;it-support@micros0ft-secure.com&gt;
//  Shopify decoded that to a real angle bracket, its sanitizer then read
//  <it-support@micros0ft-secure.com> as a tag, and what survived on the live
//  page was:
//      From: IT-Support <it-support>
//  The lookalike domain is the entire question. A student is asked to spot
//  micros0ft-secure.com and it had been deleted from the stimulus.
//
//  This is the same failure lib/storefront-fetch.js documents for Cloudflare
//  email rewriting, by a different route: "does not damage the question, it
//  deletes it". So code blocks escape twice. &amp;lt; survives one decode pass
//  as &lt;, which renders as the character the question needs.
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0)};`);
}

// For <pre><code>: escape, then escape the ampersands again so Shopify's decode
// on save lands on &lt; rather than on a bare angle bracket its sanitizer eats.
function escCode(s) {
  return esc(s).replace(/&(?=(amp|lt|gt|quot|#\d+);)/g, '&amp;');
}

// JSON-LD lives inside a <script>, so entities are forbidden there. JSON.stringify
// handles quoting; `<` is escaped as < so the block cannot be closed early.
function jsonForScript(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

const byUnit = () => {
  const units = new Map();
  for (const q of POOL.pool) {
    if (!units.has(q.unit)) units.set(q.unit, new Map());
    const topics = units.get(q.unit);
    if (!topics.has(q.topic)) topics.set(q.topic, []);
    topics.get(q.topic).push(q);
  }
  return units;
};

// ---------------------------------------------------------------------------
//  The crawlable bank.
// ---------------------------------------------------------------------------
function bankHtml() {
  const units = byUnit();
  const out = [];
  out.push('  <section class="cy-bank" id="cy-bank" aria-labelledby="cy-bank-h">');
  out.push(`    <h2 id="cy-bank-h">Every question, by unit and topic</h2>`);
  out.push('    <p class="cy-bank-lede">All ' + POOL.pool.length + ' questions in the rotation, '
    + 'grouped the way the course framework is. Read the question, commit to an answer, '
    + 'then open the answer to check yourself and see why the other options fail.</p>');

  for (const [unit, topics] of [...units.entries()].sort((a, b) => a[0] - b[0])) {
    const count = [...topics.values()].reduce((n, qs) => n + qs.length, 0);
    out.push('    <div class="cy-bank-unit">');
    out.push(`      <h3 class="cy-bank-uh">Unit ${unit}: ${esc(POOL.UNIT_TITLES[String(unit)])}`
      + ` <span class="cy-bank-count">${count} questions</span></h3>`);
    for (const [topic, qs] of [...topics.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
      out.push(`      <h4 class="cy-bank-th">Topic ${esc(topic)} ${esc(topicTitle(topic))}</h4>`);
      for (const q of qs) {
        out.push(renderQuestion(q));
      }
    }
    out.push('    </div>');
  }
  out.push('  </section>');
  return out.join('\n');
}

function renderQuestion(q) {
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const rows = [];
  rows.push(`      <article class="cy-bank-q" id="q-${esc(q.id)}">`);
  // The stem is immediately visible: the schema requires it, and a collapsed
  // question is a question Google cannot see.
  //
  // 30 of the 152 are multi-correct items whose stems carry real newlines, so
  // the roman-numeral choices are separate lines as authored:
  //     Which controls help protect a physical server room?
  //     I.   Badge readers ...
  //     II.  Locks ...
  // HTML collapses whitespace, so rendering the stem as one <p> ran all of
  // those together into a paragraph nobody can read. Blank-line separated
  // blocks become paragraphs and single newlines become <br>, which is what the
  // author wrote.
  const blocks = String(q.stem).split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split(/\n/).map((t) => t.trim()).filter(Boolean).map(esc);
    rows.push(`        <p class="cy-bank-stem">${lines.join('<br>')}</p>`);
  }
  if (q.code) {
    rows.push(`        <pre class="cy-bank-code"><code>${escCode(q.code)}</code></pre>`);
  }
  rows.push('        <ol class="cy-bank-opts">');
  q.options.forEach((opt, i) => {
    rows.push(`          <li><span class="cy-bank-let">${L[i]}</span> ${esc(opt)}</li>`);
  });
  rows.push('        </ol>');
  rows.push('        <details class="cy-bank-ans">');
  rows.push('          <summary>Show the answer</summary>');
  rows.push(`          <p class="cy-bank-key"><strong>Answer:</strong> ${L[q.answer]}. `
    + `${esc(q.options[q.answer])}</p>`);
  rows.push(`          <p class="cy-bank-exp">${esc(q.explanation)}</p>`);
  rows.push('        </details>');
  rows.push('      </article>');
  return rows.join('\n');
}

// ---------------------------------------------------------------------------
//  Education Q&A (Quiz) structured data.
// ---------------------------------------------------------------------------
function schemaJson(qs, name) {
  const list = qs || POOL.pool;
  return {
    '@context': 'https://schema.org/',
    '@type': 'Quiz',
    name: name || QOTD_TITLE,
    about: { '@type': 'Thing', name: 'AP Cybersecurity' },
    educationalAlignment: [
      { '@type': 'AlignmentObject', alignmentType: 'educationalSubject', targetName: 'Cybersecurity' },
      { '@type': 'AlignmentObject', alignmentType: 'educationalLevel', targetName: 'High school' },
    ],
    hasPart: list.map((q) => ({
      '@context': 'https://schema.org/',
      '@type': 'Question',
      eduQuestionType: 'Flashcard',
      text: q.stem,
      acceptedAnswer: { '@type': 'Answer', text: `${q.options[q.answer]}. ${q.explanation}` },
    })),
  };
}

// ---------------------------------------------------------------------------
//  Styles. Scoped under the existing #cyb-qotd wrapper, colours hardcoded with
//  !important AND -webkit-text-fill-color, because Shopify reverts them on save.
//  repeat(N,1fr) never auto-fit, per the theme hazards.
// ---------------------------------------------------------------------------
const BANK_CSS = `
  /* --- crawlable question bank ------------------------------------------- */
  #cyb-qotd .cy-bank { margin: 28px 0 0; padding: 22px 18px; background: #ffffff !important;
    border: 1px solid var(--cy-line); border-radius: var(--cy-r); box-shadow: var(--cy-sh-sm); }
  #cyb-qotd .cy-bank h2 { font-size: 22px; line-height: 1.25; margin: 0 0 6px;
    color: #0f2a43 !important; -webkit-text-fill-color: #0f2a43 !important; font-weight: 700; }
  #cyb-qotd .cy-bank-lede { margin: 0 0 18px; font-size: 15px; line-height: 1.55;
    color: #40566d !important; -webkit-text-fill-color: #40566d !important; }
  #cyb-qotd .cy-bank-unit { margin: 0 0 26px; }
  #cyb-qotd .cy-bank-uh { font-size: 17px; margin: 22px 0 4px; padding: 0 0 6px;
    border-bottom: 2px solid #2f6df6; color: #0f2a43 !important;
    -webkit-text-fill-color: #0f2a43 !important; font-weight: 700; }
  #cyb-qotd .cy-bank-count { float: right; font-size: 12px; font-weight: 600;
    color: #64798f !important; -webkit-text-fill-color: #64798f !important; }
  #cyb-qotd .cy-bank-th { font-size: 14px; margin: 16px 0 8px; text-transform: uppercase;
    letter-spacing: .04em; color: #15395c !important;
    -webkit-text-fill-color: #15395c !important; font-weight: 700; }
  #cyb-qotd .cy-bank-q { margin: 0 0 14px; padding: 12px 14px; background: #f7f9fc !important;
    border: 1px solid var(--cy-line); border-radius: var(--cy-r-sm); }
  #cyb-qotd .cy-bank-stem { margin: 0 0 8px; font-size: 15px; line-height: 1.55;
    color: #16273a !important; -webkit-text-fill-color: #16273a !important; }
  #cyb-qotd .cy-bank-code { margin: 0 0 10px; padding: 10px 12px; overflow-x: auto;
    background: #0f2a43 !important; border-radius: var(--cy-r-sm); font-size: 13px;
    line-height: 1.5; color: #e8eef6 !important; -webkit-text-fill-color: #e8eef6 !important; }
  #cyb-qotd .cy-bank-opts { margin: 0 0 8px; padding: 0; list-style: none; }
  #cyb-qotd .cy-bank-opts li { margin: 0 0 4px; font-size: 14px; line-height: 1.5;
    color: #2b3d52 !important; -webkit-text-fill-color: #2b3d52 !important; }
  #cyb-qotd .cy-bank-let { display: inline-block; min-width: 20px; font-weight: 700;
    color: #2f6df6 !important; -webkit-text-fill-color: #2f6df6 !important; }
  #cyb-qotd .cy-bank-ans { margin: 6px 0 0; }
  #cyb-qotd .cy-bank-ans summary { cursor: pointer; font-size: 13px; font-weight: 600;
    color: #2f6df6 !important; -webkit-text-fill-color: #2f6df6 !important; }
  #cyb-qotd .cy-bank-key { margin: 8px 0 6px; font-size: 14px; line-height: 1.5;
    color: #1f9d57 !important; -webkit-text-fill-color: #1f9d57 !important; font-weight: 600; }
  #cyb-qotd .cy-bank-exp { margin: 0; font-size: 14px; line-height: 1.6;
    color: #40566d !important; -webkit-text-fill-color: #40566d !important; }
  @media (max-width: 600px) {
    #cyb-qotd .cy-bank { padding: 16px 12px; }
    #cyb-qotd .cy-bank-count { float: none; display: block; }
  }
`;

// ---------------------------------------------------------------------------
//  Assembly
// ---------------------------------------------------------------------------
function unitsOf() {
  const m = new Map();
  for (const q of POOL.pool) {
    if (!m.has(q.unit)) m.set(q.unit, []);
    m.get(q.unit).push(q);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

const unitHandle = (u) => `ap-cybersecurity-practice-questions-unit-${u}`;
const unitTitle = (u) => `AP Cybersecurity Unit ${u} Practice Questions: ${POOL.UNIT_TITLES[String(u)]}`;

// A standalone page per unit. Self-contained: its own wrapper, its own copy of
// the bank styles, its own schema over exactly the questions it renders.
function unitPageBody(unit, qs) {
  const topics = new Map();
  for (const q of qs) {
    if (!topics.has(q.topic)) topics.set(q.topic, []);
    topics.get(q.topic).push(q);
  }
  const parts = [];
  parts.push('<style>');
  parts.push('  #cyb-qotd { --cy-line: #dbe4ee; --cy-r: 14px; --cy-r-sm: 10px;');
  parts.push('    --cy-sh-sm: 0 1px 3px rgba(15,42,67,.08); }');
  parts.push(BANK_CSS);
  parts.push('</style>');
  parts.push('<div id="cyb-qotd">');
  parts.push(`  <h1>${esc(unitTitle(unit))}</h1>`);
  parts.push(`  <p class="cy-bank-lede">${qs.length} practice questions for Unit ${unit}, `
    + `${esc(POOL.UNIT_TITLES[String(unit)])}, grouped by CED topic. Read the question, commit to `
    + 'an answer, then open the answer to check yourself and see why the other options fail. '
    + `Free, no login. <a href="/pages/${QOTD_HANDLE}">One question a day</a> comes from this `
    + 'same bank, and the other units are linked at the foot of the page.</p>');
  parts.push('  <section class="cy-bank">');
  for (const [topic, list] of [...topics.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    parts.push(`      <h2 class="cy-bank-th">Topic ${esc(topic)} ${esc(topicTitle(topic))}</h2>`);
    for (const q of list) parts.push(renderQuestion(q));
  }
  parts.push('  </section>');
  parts.push('  <p class="cy-bank-lede">More practice: '
    + unitsOf().filter(([u]) => u !== unit)
      .map(([u]) => `<a href="/pages/${unitHandle(u)}">Unit ${u}</a>`).join(', ')
    + `, or the <a href="/pages/${QOTD_HANDLE}">question of the day</a>.</p>`);
  parts.push('</div>');
  parts.push('');
  parts.push(`<script type="application/ld+json">\n${jsonForScript(schemaJson(qs, unitTitle(unit)))}\n</script>`);
  return parts.join('\n');
}

// The QOTD page keeps its tool and gains a way in to the five unit pages. No
// schema here: it renders no questions of its own, and Education Q&A requires
// every marked-up question to be visible on the page carrying the markup.
function qotdBrowseSection() {
  const out = [];
  out.push('  <section class="cy-bank" id="cy-bank" aria-labelledby="cy-bank-h">');
  out.push('    <h2 id="cy-bank-h">Every question, by unit</h2>');
  out.push(`    <p class="cy-bank-lede">All ${POOL.pool.length} questions in the rotation are `
    + 'browsable in full, grouped by CED topic, with the answer and the reasoning on each one.</p>');
  out.push('    <div class="cy-bank-unit">');
  for (const [u, qs] of unitsOf()) {
    out.push(`      <p class="cy-bank-stem"><a href="/pages/${unitHandle(u)}">Unit ${u}: `
      + `${esc(POOL.UNIT_TITLES[String(u)])}</a> <span class="cy-bank-count">${qs.length} questions</span></p>`);
  }
  out.push('    </div>');
  out.push('  </section>');
  return out.join('\n');
}

//  The QOTD page ships its own `var TOPIC_TITLES` for the browse UI, and that
//  object is the copy the four drifted titles actually came from. Rewriting the
//  headings on the new unit pages while leaving this one in place would put two
//  different names for topic 1.2 on pages that link to each other, so it is
//  rebuilt from the CED here too. Emitted from JSON.stringify with the entities
//  left alone: this lives INSIDE a <script>, where CONVENTIONS.md forbids them.
function canonicalTopicTitlesJs(src) {
  const at = src.indexOf('var TOPIC_TITLES');
  if (at === -1) throw new Error('the QOTD body has no TOPIC_TITLES to correct');
  const open = src.indexOf('{', at);
  let depth = 0;
  let quote = null;
  let esc = false;
  let close = -1;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (quote) {
      if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) { close = i; break; } }
  }
  if (close === -1) throw new Error('TOPIC_TITLES object never closes');

  const canon = {};
  for (const t of cyberTopics.topics()) canon[t.topic] = t.title;
  const body = Object.keys(canon).sort((a, b) => parseFloat(a) - parseFloat(b))
    .map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(canon[k])}`).join(',\n');
  return src.slice(0, open) + `{\n${body}\n  }` + src.slice(close + 1);
}

function buildQotdBody() {
  const src = canonicalTopicTitlesJs(SNAP(QOTD_HANDLE));
  const styleClose = src.lastIndexOf('</style>');
  if (styleClose === -1) throw new Error('no </style> in the QOTD body');
  let out = src.slice(0, styleClose) + BANK_CSS + src.slice(styleClose);
  const scriptOpen = out.indexOf('<script', out.indexOf('</style>'));
  if (scriptOpen === -1) throw new Error('no trailing <script> in the QOTD body');
  const wrapperClose = out.lastIndexOf('</div>', scriptOpen);
  if (wrapperClose === -1) throw new Error('no wrapper </div> before the script');
  return out.slice(0, wrapperClose) + qotdBrowseSection() + '\n' + out.slice(wrapperClose);
}

// The umbrella gets one card, in the section where it belongs and in the markup
// the page already uses. Section I is Multiple choice and today carries prose
// with no grid, so the card opens one there, wrapped in the same
// data-practice-* div the FRQ and labs grids use.
//
// An earlier version anchored on the first "</a>" it found and dropped the card
// into the middle of a sentence, splitting "The AP Cybersecurity practice exam"
// from "gives you scored questions". Anchor on structure, not on the first tag
// that matches.
const UMBRELLA_ANCHOR = '<p class="ph-sub">Section II of the exam</p>';

function buildUmbrellaBody() {
  const src = SNAP(UMBRELLA_HANDLE);
  if (src.includes(QOTD_HANDLE)) return { body: src, changed: false };
  const at = src.indexOf(UMBRELLA_ANCHOR);
  if (at === -1) throw new Error('umbrella anchor not found: the Section II heading moved');
  const card =
    '<div data-practice-course="ap-cybersecurity" data-practice-kind="daily"><div class="ph-grid">\n'
    + `<a class="ph-card" href="https://www.apcsexamprep.com/pages/${QOTD_HANDLE}">`
    + '<span class="ph-card-focus">A question a day, and the whole bank when you want it</span>'
    + '<span class="ph-card-title">Question of the Day</span>'
    + '<span class="ph-card-blurb">One question for everyone each day, a random draw when you want '
    + 'more, and every question browsable by unit and topic. Each one shows the answer and why the '
    + 'other options fail.</span>'
    + '<span class="ph-card-meta"><span class="ph-pill ph-pill-core">Free</span>'
    + `${POOL.pool.length} questions &middot; All 5 units &middot; No login</span>`
    + '<span class="ph-card-go">Practice &rarr;</span></a>\n'
    + '</div></div>\n';
  return { body: src.slice(0, at) + card + src.slice(at), changed: true };
}

// Sheet A: the five NEW unit pages. New handles, so every column including SEO
// is safe to set.
function unitRows() {
  return unitsOf().map(([u, qs]) => ({
    Handle: unitHandle(u),
    Command: 'MERGE',
    Title: unitTitle(u),
    'Body HTML': unitPageBody(u, qs),
    Published: 'TRUE',
    'Published At': PUBLISHED_AT,
    'SEO Title': `AP Cybersecurity Unit ${u} Practice Questions with Answers`,
    'SEO Description': `${qs.length} free AP Cybersecurity practice questions for Unit ${u}, `
      + `${POOL.UNIT_TITLES[String(u)]}, grouped by CED topic. Every question shows the answer `
      + 'and why the other options fail. No login.',
  }));
}

// Sheet B: the two EXISTING pages, body only. No SEO columns, because a blank
// cell in Matrixify means "set this to empty" and would wipe what is there.
const LINKS_HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];

function linkRows() {
  const umbrella = buildUmbrellaBody();
  const out = [{
    Handle: QOTD_HANDLE,
    Command: 'MERGE',
    Title: QOTD_TITLE,
    'Body HTML': buildQotdBody(),
    Published: 'TRUE',
    'Published At': PUBLISHED_AT,
  }];
  if (umbrella.changed) {
    out.push({
      Handle: UMBRELLA_HANDLE,
      Command: 'MERGE',
      Title: UMBRELLA_TITLE,
      'Body HTML': umbrella.body,
      Published: 'TRUE',
      'Published At': PUBLISHED_AT,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
function topicDiff() {
  const canon = {};
  cyberTopics.topics().forEach((t) => { canon[t.topic] = t.title; });
  const diffs = [];
  for (const k of Object.keys(POOL.TOPIC_TITLES)) {
    if (canon[k] !== POOL.TOPIC_TITLES[k]) {
      diffs.push({ topic: k, page: POOL.TOPIC_TITLES[k], ced: canon[k] || '(absent)' });
    }
  }
  return diffs;
}

function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--topics')) {
    const d = topicDiff();
    console.log(`topic titles differing from the CED taxonomy: ${d.length} of ${Object.keys(POOL.TOPIC_TITLES).length}`);
    d.forEach((x) => {
      console.log(`  ${x.topic}\n     page: ${JSON.stringify(x.page)}\n     CED : ${JSON.stringify(x.ced)}`);
    });
    return;
  }

  const LIMIT = 250000;
  const sheets = [
    { file: 'matrixify/cyber-qotd-unit-pages.csv', rows: unitRows(), header: HEADER },
    { file: 'matrixify/cyber-qotd-links-pages.csv', rows: linkRows(), header: LINKS_HEADER },
  ];

  for (const s of sheets) {
    const csv = writeCsv(s.rows, s.header);

    // Generation is not evidence that generation worked. Parse it back and diff.
    const back = parseCsv(csv);
    const drift = [];
    if (back.rows.length !== s.rows.length) drift.push(`row count ${back.rows.length} != ${s.rows.length}`);
    s.rows.forEach((want, i) => {
      const got = back.rows[i] || {};
      for (const col of s.header) {
        if ((got[col] || '') !== (want[col] || '')) {
          drift.push(`row ${i} column ${col}: ${(want[col] || '').length} bytes in, `
            + `${(got[col] || '').length} bytes back`);
        }
      }
    });
    if (drift.length) {
      console.error(`PARSE-BACK DRIFT in ${s.file}, refusing to write:`);
      drift.forEach((d) => console.error('  ' + d));
      process.exit(1);
    }

    const over = s.rows.filter((r) => (r['Body HTML'] || '').length > LIMIT);
    if (over.length) {
      console.error(`${s.file}: ${over.length} row(s) exceed the ${LIMIT} character cell limit:`);
      over.forEach((r) => console.error(`  ${r.Handle}: ${r['Body HTML'].length}`));
      process.exit(1);
    }

    const out = path.join(ROOT, s.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, csv);
    const biggest = Math.max(...s.rows.map((r) => (r['Body HTML'] || '').length));
    console.log(`wrote ${s.file}`);
    console.log(`  rows      : ${s.rows.length} (${s.rows.map((r) => r.Handle).join(', ')})`);
    console.log(`  biggest   : ${biggest.toLocaleString()} of ${LIMIT.toLocaleString()} allowed`);
    console.log('  parse-back: no drift');
  }

  const rendered = unitRows().reduce((n, r) => n + (r['Body HTML'].match(/class="cy-bank-q"/g) || []).length, 0);
  console.log('');
  console.log(`questions rendered across the unit pages: ${rendered} of ${POOL.pool.length}`);
  const t = topicDiff();
  if (t.length) {
    console.log(`NOTE: the pool's own copy of ${t.length} topic title(s) still differs from the `
      + 'CED (run --topics). Nothing emitted uses that copy: every title above came from '
      + 'lib/cyber-topics.js. The copy is reported rather than deleted because it is what the '
      + 'live page shipped, and seeing the drift is the point.');
  }
}

if (require.main === module) main();
module.exports = {
  schemaJson, buildQotdBody, buildUmbrellaBody, unitPageBody, unitRows, linkRows,
  unitsOf, unitHandle, unitTitle, topicDiff, esc, LINKS_HEADER,
};
