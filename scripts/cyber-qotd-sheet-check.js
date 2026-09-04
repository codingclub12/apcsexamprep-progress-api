#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  GATE FOR THE TWO CYBER QOTD SHEETS.
//
//  Both are read back FROM DISK and parsed, never checked as in-memory rows:
//  the point of a parse-back is defeated if the checks read the writer's copy.
//
//  WHAT THE TEXT RULES ARE FED, and why it is not the raw body.
//  validator.stripComments removes HTML comments only, and flatten turns tags
//  into spaces without removing the CONTENTS of <style> and <script>. On a
//  lesson page that is fine. These pages carry a lot of both, and feeding the
//  raw body produced eight failures that were all false:
//    R1 fired twice on a JS block comment documenting the pool's record shape
//       ("ek array essential-knowledge codes"), which no student reads.
//    R2 fired six times on CSS gradient stops: 0%, 62%, 100% inside
//       linear-gradient(...). Not exam weightings.
//  "Student-visible text" is the rule's subject, so script and style come out
//  first. Everything these sheets add lives outside both, so nothing real is
//  hidden. The JSON-LD is inside a script and IS surfaced by Google, so its
//  question text is checked separately.
//
//  R4 (topic title matches the canonical taxonomy) is not run as written: it
//  checks a per-topic lesson page's h1, and these pages each span a whole unit.
//  The meaningful half for a hub is run instead: every topic number the pool
//  labels must EXIST in the CED. The four known title differences are reported
//  by the generator's --topics flag, not enforced here.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const v = require('../tools/ap-cyber-ced/validator');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');
const cyberTopics = require('../lib/cyber-topics');
const gen = require('./cyber-qotd-page-csv');

const ROOT = path.join(__dirname, '..');
const POOL = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cyber-qotd-pool.json'), 'utf8'));
const UNIT_SHEET = path.join(ROOT, 'matrixify/cyber-qotd-unit-pages.csv');
const LINK_SHEET = path.join(ROOT, 'matrixify/cyber-qotd-links-pages.csv');
const LIMIT = 250000;

const visibleOf = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ');

function liveHandles() {
  const set = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'config/page-snapshots'))) {
    set.add(f.replace(/\.html$/, ''));
  }
  for (const [u] of gen.unitsOf()) set.add(gen.unitHandle(u));
  for (const f of [UNIT_SHEET, LINK_SHEET]) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/pages\/([a-z0-9-]+)/g)) set.add(m[1]);
  }
  return set;
}

function textRules(row, where, fails) {
  const body = visibleOf(row['Body HTML'] || '');
  fails.push(...v.ruleEkCodes(body).map((m) => `${where}: ${m}`));
  fails.push(...v.ruleExamWeighting(body).map((m) => `${where}: ${m}`));
  for (const col of Object.keys(row)) {
    const val = col === 'Body HTML' ? body : row[col];
    fails.push(...v.ruleEmDash(val, `${where} ${col}`));
    fails.push(...v.ruleMojibake(val, `${where} ${col}`));
  }
}

function structure(row, where, fails, expectQuestions) {
  const b = row['Body HTML'] || '';
  if (b.length > LIMIT) fails.push(`${where}: body is ${b.length}, over the ${LIMIT} cell limit`);
  const markup = b.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const opens = (markup.match(/<div\b/g) || []).length;
  const closes = (markup.match(/<\/div>/g) || []).length;
  if (opens !== closes) fails.push(`${where}: div imbalance, ${opens} open ${closes} close`);
  if (/[^\x00-\x7F]/.test(b) && !row.Handle.startsWith('ap-cybersecurity-practice-questions')) {
    // The two existing pages carry 21 non-ASCII characters from their own live
    // bodies. Those are pre-existing and pass through untouched; what this
    // change ADDS must be ASCII, which the new unit pages assert absolutely.
  } else if (/[^\x00-\x7F]/.test(b)) {
    fails.push(`${where}: new page body is not pure ASCII: `
      + JSON.stringify([...new Set(b.match(/[^\x00-\x7F]/g))].join('')));
  }
  if (expectQuestions != null) {
    const n = (b.match(/class="cy-bank-q"/g) || []).length;
    if (n !== expectQuestions) fails.push(`${where}: rendered ${n} questions, expected ${expectQuestions}`);
  }
}

function schemaChecks(row, where, fails, expected) {
  const b = row['Body HTML'] || '';
  const ld = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/.exec(b);
  if (!ld) { fails.push(`${where}: no JSON-LD block`); return; }
  let parsed = null;
  try { parsed = JSON.parse(ld[1].replace(/\\u003c/g, '<')); }
  catch (e) { fails.push(`${where}: JSON-LD does not parse: ${e.message}`); return; }
  if (parsed['@type'] !== 'Quiz') fails.push(`${where}: JSON-LD @type is ${parsed['@type']}, want Quiz`);
  if (!Array.isArray(parsed.hasPart) || parsed.hasPart.length !== expected) {
    fails.push(`${where}: JSON-LD hasPart holds ${parsed.hasPart && parsed.hasPart.length}, want ${expected}`);
  }
  const badType = (parsed.hasPart || []).filter((q) => q.eduQuestionType !== 'Flashcard').length;
  if (badType) fails.push(`${where}: ${badType} questions have an eduQuestionType other than "Flashcard"`);
  const noAnswer = (parsed.hasPart || []).filter((q) =>
    !q.acceptedAnswer || q.acceptedAnswer['@type'] !== 'Answer' || !String(q.acceptedAnswer.text || '').trim()).length;
  if (noAnswer) fails.push(`${where}: ${noAnswer} questions lack a usable acceptedAnswer`);
  // Google requires every marked-up question to be visible on its own page.
  // Compared as VISIBLE TEXT with whitespace normalised on both sides. A raw
  // string match was wrong here: multi-line stems render across <br>, and HTML
  // collapses whitespace, so the escaped stem is never a contiguous substring
  // of a correct page. Assert what a reader sees, not how it is marked up.
  const flat = (t) => String(t)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
  const visibleText = flat(b.replace(/<script[\s\S]*?<\/script>/gi, ' '));
  const invisible = (parsed.hasPart || []).filter((q) => !visibleText.includes(flat(q.text))).length;
  if (invisible) fails.push(`${where}: ${invisible} schema questions are not rendered in the page HTML`);
  const ldText = (parsed.hasPart || [])
    .map((q) => `${q.text} ${q.acceptedAnswer && q.acceptedAnswer.text}`).join('\n');
  fails.push(...v.ruleEkCodes(ldText).map((m) => `${where} JSON-LD: ${m}`));
  fails.push(...v.ruleEmDash(ldText, `${where} JSON-LD`));
  fails.push(...v.ruleMojibake(ldText, `${where} JSON-LD`));
}

function main() {
  const fails = [];
  const units = parseCsv(fs.readFileSync(UNIT_SHEET, 'utf8'));
  const links = parseCsv(fs.readFileSync(LINK_SHEET, 'utf8'));
  const perUnit = new Map(gen.unitsOf().map(([u, qs]) => [gen.unitHandle(u), qs.length]));

  //  SURVIVES SHOPIFY'S DECODE. Shopify decodes entities when it stores a body:
  //  measured 2026-09-04, no stored body on this store holds a single &lt;, &gt;
  //  or &amp;. Prose does not care. A code block does. Question C1-102 shipped a
  //  phishing header, Shopify decoded the escaped angle brackets, its sanitizer
  //  read <it-support@micros0ft-secure.com> as a tag, and the live page served
  //  "From: IT-Support <it-support>". The lookalike domain the student is asked
  //  to spot had been deleted from the stimulus.
  //
  //  So this simulates the decode and requires the code to still be intact, and
  //  requires no tag-shaped run to appear where one was not authored.
  //  ONE PASS, and the distinction matters. Chained replaces are not a decode
  //  pass: .replace(/&amp;/) turning "&amp;lt;" into "&lt;" and then a later
  //  .replace(/&lt;/) in the same chain turning that into "<" decodes the same
  //  text twice and reports a correctly double-escaped block as unsafe. This
  //  check did exactly that on its first run. A real decoder matches each
  //  entity once, left to right, and never rescans what it produced.
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const decodeOnce = (t) => String(t).replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m;
  });

  for (const q of POOL.pool.filter((x) => x.code)) {
    const emitted = /<pre class="cy-bank-code"><code>([\s\S]*?)<\/code><\/pre>/
      .exec(gen.unitPageBody(q.unit, POOL.pool.filter((x) => x.unit === q.unit && x.code === q.code)));
    if (!emitted) { fails.push(`${q.id}: code block not found in the rendered unit page`); continue; }
    const afterShopify = decodeOnce(emitted[1]);
    // After one decode the block must still escape its angle brackets, so the
    // sanitizer never sees a tag.
    if (/<[a-zA-Z@][^>\n]*>/.test(afterShopify)) {
      fails.push(`${q.id}: after one entity decode the code block contains a tag-shaped run `
        + `(${JSON.stringify((afterShopify.match(/<[a-zA-Z@][^>\n]*>/) || [])[0])}), which Shopify's `
        + 'sanitizer will strip. Escape code blocks twice.');
    }
    // And the authored text must survive two decodes intact.
    const fully = decodeOnce(afterShopify);
    for (const frag of String(q.code).split(/\n/).map((t) => t.trim()).filter((t) => t.length > 8)) {
      if (!fully.includes(frag)) {
        fails.push(`${q.id}: code line ${JSON.stringify(frag.slice(0, 50))} does not survive the decode`);
        break;
      }
    }
  }

  // Multi-line stems must keep their line structure. HTML collapses whitespace,
  // so 30 multi-correct items rendered as unreadable run-on paragraphs before
  // this was asserted.
  for (const q of POOL.pool.filter((x) => /\n/.test(x.stem))) {
    const body = gen.unitPageBody(q.unit, [q]);
    if (!/<p class="cy-bank-stem">[^<]*<br>/.test(body)) {
      fails.push(`${q.id}: a multi-line stem renders without <br>, so its numbered choices `
        + 'collapse into one paragraph');
    }
  }

  // Pool integrity, first: nothing downstream is trustworthy over bad data.
  const thin = POOL.pool.filter((q) =>
    !String(q.stem || '').trim()
    || !String(q.explanation || '').trim()
    || !Array.isArray(q.options) || q.options.length < 2
    || q.options.some((o) => !String(o || '').trim())
    || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length);
  if (thin.length) {
    fails.push(`${thin.length} question(s) have an empty stem, an empty option, an empty `
      + `explanation, or an out-of-range answer: ${thin.slice(0, 5).map((q) => q.id).join(', ')}`);
  }

  let rendered = 0;
  units.rows.forEach((row, i) => {
    const where = `unit sheet row ${i + 1} (${row.Handle})`;
    const expect = perUnit.get(row.Handle);
    if (expect == null) { fails.push(`${where}: unexpected handle`); return; }
    textRules(row, where, fails);
    structure(row, where, fails, expect);
    schemaChecks(row, where, fails, expect);
    rendered += (row['Body HTML'].match(/class="cy-bank-q"/g) || []).length;
  });
  if (rendered !== POOL.pool.length) {
    fails.push(`the unit pages render ${rendered} questions between them, the pool holds ${POOL.pool.length}`);
  }

  links.rows.forEach((row, i) => {
    const where = `links sheet row ${i + 1} (${row.Handle})`;
    textRules(row, where, fails);
    structure(row, where, fails, null);
    if (Object.keys(row).some((c) => /^SEO /.test(c))) {
      fails.push(`${where}: carries an SEO column. A blank one blanks the live value, and these `
        + 'are existing pages, so this sheet must not have them at all.');
    }
  });

  // The links sheet must actually link: every unit page from the QOTD page, and
  // the QOTD page from the umbrella. This is the whole point of that sheet.
  const qotd = links.rows.find((r) => r.Handle === 'ap-cybersecurity-question-of-the-day');
  if (!qotd) fails.push('the QOTD row is missing from the links sheet');
  else {
    for (const [u] of gen.unitsOf()) {
      if (!qotd['Body HTML'].includes(`/pages/${gen.unitHandle(u)}`)) {
        fails.push(`the QOTD page does not link unit ${u}`);
      }
    }
  }
  const umb = links.rows.find((r) => r.Handle === 'ap-cybersecurity-practice');
  if (umb && !umb['Body HTML'].includes('/pages/ap-cybersecurity-question-of-the-day')) {
    fails.push('the practice umbrella does not link the QOTD page');
  }

  fails.push(...v.ruleDeadLinks([...units.rows, ...links.rows], liveHandles()));

  //  EVERY TOPIC TITLE IN EVERY BODY MUST BE THE CED'S.
  //
  //  The pool shipped its own copy of all 24 and four had drifted, which put
  //  three different names on topic 1.2 across the site. Correcting the strings
  //  would fix today; asserting the titles come from lib/cyber-topics.js is
  //  what stops them drifting again. Checked against what the sheets actually
  //  carry, not against the generator's intent.
  const canonTitle = {};
  cyberTopics.topics().forEach((t) => { canonTitle[t.topic] = t.title; });
  for (const row of [...units.rows, ...links.rows]) {
    const b = row['Body HTML'] || '';
    // Only OUR headings. A loose />Topic N.N ([^<]+)</ also matched the
    // umbrella's lab cards, whose meta line reads "Topic 1.2 . 10 min . 6
    // checks", and reported that as a wrong title. Anchor on the class this
    // generator emits.
    for (const m of b.matchAll(/class="cy-bank-th">Topic (\d+\.\d+) ([^<]+)</g)) {
      const want = canonTitle[m[1]];
      const got = m[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
      if (want && got !== want) {
        fails.push(`${row.Handle}: topic ${m[1]} heading reads ${JSON.stringify(got)}, `
          + `the CED says ${JSON.stringify(want)}`);
      }
    }
    // The browse UI's TOPIC_TITLES object on the QOTD page.
    for (const m of b.matchAll(/"(\d+\.\d+)":\s*"((?:[^"\\]|\\.)*)"/g)) {
      const want = canonTitle[m[1]];
      const got = m[2].replace(/\\"/g, '"');
      if (want && got !== want) {
        fails.push(`${row.Handle}: TOPIC_TITLES[${m[1]}] is ${JSON.stringify(got)}, `
          + `the CED says ${JSON.stringify(want)}`);
      }
    }
  }

  const canon = new Set(cyberTopics.topics().map((t) => t.topic));
  Object.keys(POOL.TOPIC_TITLES).filter((t) => !canon.has(t))
    .forEach((t) => fails.push(`R4-hub topic ${t} is not in the CED taxonomy`));

  console.log('checks: R1 EK codes, R2 weightings, R3 em-dashes, R7 mojibake, R6 links resolve,');
  console.log('        R4-hub topic numbers, pool integrity, cell limit, div balance, ASCII,');
  console.log('        per-unit question counts, JSON-LD shape and visibility, cross-linking');
  console.log('');
  if (fails.length) {
    console.log(`RESULT: FAIL - ${fails.length} problem(s)`);
    [...new Set(fails)].slice(0, 25).forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log(`RESULT: PASS - ${units.rows.length} new unit pages carrying ${rendered} questions, `
    + `${links.rows.length} existing pages updated, every rule that applies is clean`);
}

if (require.main === module) main();
module.exports = { main };
