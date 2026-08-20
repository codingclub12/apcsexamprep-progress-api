'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA EXERCISE 2 PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The pages built by lib/csa-exercise-2-pages.js, currently 6 of them (the
//  lessons with a seed/csa-exercise-2/ bank):
//
//      ap-csa-lesson-{U}-{L}-{slug}-exercise-2
//
//  See the header of lib/csa-exercise-2-pages.js and seed/csa-exercise-2.js for
//  why only these six so far.
//
//  SAFETY MODEL: EVERY HANDLE MUST BE NEW
//  Same posture as scripts/csa-exercise-pages-csv.js. These pages do not exist
//  yet, so the dangerous direction is a handle that DOES match something live:
//  importing it would silently replace a page nobody meant to touch. With
//  --live this aborts on any handle that already exists.
//
//  NO ANSWER-LEAK CHECK, ON PURPOSE
//  Unlike the exercise-1 code pages, an exercise-2 page's whole point is that
//  the correct option and its rationale become visible the moment a student
//  answers. There is no hidden test case and no reference solution to leak.
//  What this DOES check is that the page routes to the right gradebook column
//  (checkHandleRouting) and that the rendered question count matches the
//  authored bank exactly, so a bug in the renderer cannot silently drop or
//  duplicate a question.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//    - MERGE mode, so a re-run after a partial import fixes the gaps rather
//      than duplicating the successes.
//    - QUOTE_ALL. Every cell is quoted.
//    - utf-8-sig. The BOM is written.
//    - Published At is past-dated to a fixed literal, never now().
//    - Body HTML is present on every row and never empty.
//    - One import at a time.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run:
//    node scripts/csa-exercise-2-pages-csv.js out.csv
//    node scripts/csa-exercise-2-pages-csv.js out.csv --only <handle>,<handle>
//    node scripts/csa-exercise-2-pages-csv.js out.csv --live pages.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csa-exercise-2-pages');
const { banks } = require('../seed/csa-exercise-2');
const { pageFromHandle } = require('../utils');

const ROOT = path.join(__dirname, '..');
const PUBLISHED_AT = '2026-03-01 12:00:00';

const MAX_BODY_BYTES = 200 * 1024;
const MIN_BODY_BYTES = 4 * 1024;

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

function checkPage(p) {
  const bad = [];
  const body = p.bodyHtml;
  const bytes = Buffer.byteLength(body);

  if (!p.handle || !/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (!p.title || p.title.length < 4) bad.push('title is missing or too short');
  if (!body) bad.push('BODY IS EMPTY, which would wipe the page rather than skip it');
  if (bytes < MIN_BODY_BYTES) bad.push(`body is only ${bytes} bytes, which is not a finished page`);
  if (bytes > MAX_BODY_BYTES) bad.push(`body is ${(bytes / 1024).toFixed(0)} KB, past the sanity ceiling`);

  if (body.includes('�')) bad.push('body contains a replacement character');
  if (/Ã[\x80-\xBF]|â|Â[\x80-\xBF]/.test(body)) bad.push('body contains mojibake');
  if (body.includes('—')) bad.push('body contains an em-dash');
  // eslint-disable-next-line no-control-regex
  const nonAscii = body.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`body has ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);

  for (const m of body.match(/<script[\s\S]*?<\\?\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');
  if (/auto-fit|auto-fill/.test(body)) bad.push('a grid uses auto-fit or auto-fill instead of repeat(N,1fr)');

  // The scoring script and the event it posts have to actually be on the page,
  // or every answer click is silent and nothing is ever recorded.
  if (!body.includes('csaX2')) bad.push('the page never wires up the answer handler');
  if (!body.includes('apcsActivity')) bad.push('the page never dispatches apcsActivity, so nothing is ever recorded');
  if (!body.includes('data-activity="exercise-2"')) bad.push('no item declares activity exercise-2');

  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) bad.push(`${h1s} h1 tags, must be exactly 1`);
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  if (!p.seoTitle || p.seoTitle.length > 70) bad.push(`SEO title is ${(p.seoTitle || '').length} chars, must be 1 to 70`);

  return bad;
}

// A handle that does not route to exercise-2 on its own lesson is the whole
// reason this build exists: an answer would be recorded under the wrong
// column, or under no column at all.
function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csa') return `handle routes to ${r.course}, not ap-csa`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.lesson) return `handle routes to lesson ${r.lesson}, expected ${p.lesson}`;
  if (r.activity_type !== 'exercise-2') {
    return `handle routes as ${r.activity_type}, so a graded answer would land in the wrong column`;
  }
  return null;
}

// The rendered question count must equal the authored bank exactly: a
// renderer bug that drops or duplicates one is otherwise invisible until a
// teacher notices a gradebook column maxing out at the wrong number.
function checkQuestionCount(p, bank) {
  const rendered = (p.bodyHtml.match(/class="mcq-item"/g) || []).length;
  if (rendered !== bank.questions.length) {
    return `renders ${rendered} questions but the bank has ${bank.questions.length}`;
  }
  return null;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csa-exercise-2-pages-csv.js <out.csv>'
      + ' [--only handle,handle] [--live <pages.json>]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  const live = arg('--live') ? readLive(arg('--live')) : null;

  const everything = allPages();
  const byLesson = new Map(banks.map((b) => [b.lesson, b]));

  let pages = everything;
  const total = pages.length;
  if (only) pages = pages.filter((p) => only.has(p.handle));
  if (!pages.length) { console.error('no pages selected'); process.exit(2); }

  const problems = [];

  const byHandle = new Map();
  for (const p of everything) {
    if (byHandle.has(p.handle)) problems.push(`duplicate handle ${p.handle}`);
    byHandle.set(p.handle, p);
  }

  for (const p of pages) {
    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
    const routing = checkHandleRouting(p);
    if (routing) problems.push(`${p.handle}: ${routing}`);
    const countProblem = checkQuestionCount(p, byLesson.get(p.lesson));
    if (countProblem) problems.push(`${p.handle}: ${countProblem}`);
    if (live && live.has(p.handle)) {
      const n = live.get(p.handle);
      problems.push(`${p.handle}: a live page ALREADY uses this handle`
        + ` (title ${JSON.stringify(n.title)}). Importing would replace its body.`);
    }
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    for (const m of problems.slice(0, 40)) console.error('    ' + m);
    if (problems.length > 40) console.error(`    ... and ${problems.length - 40} more`);
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
    'SEO Title', 'SEO Description'];

  const lines = [header.map(cell).join(',')];
  for (const p of pages) {
    lines.push([
      p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT, p.seoTitle, p.seoDescription,
    ].map(cell).join(','));
  }
  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(out, csv);

  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const questions = pages.reduce((n, p) => n + p.questions, 0);

  console.log('');
  console.log(`    ${String(pages.length).padStart(3)}  pages selected (of ${total} in the build)`);
  console.log(`    ${String(questions).padStart(3)}  applied MCQ questions across those pages`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, checkQuestionCount, PUBLISHED_AT };
