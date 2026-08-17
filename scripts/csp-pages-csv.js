'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP COURSE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The 53 pages built by lib/csp-course-pages.js:
//
//     35  exercise-2    ap-csp-course-bi{N}-{slug}-exercise-2
//     18  guided notes  ap-csp-course-bi3-{slug}-notes
//
//  These are the CSP pages the Teacher Course Bundle promises per topic and that
//  the site does not have. See the header of lib/csp-course-pages.js for how the
//  gap was measured.
//
//  SAFETY MODEL: EVERY HANDLE MUST BE NEW
//  Same inversion as scripts/intro-java-pages-csv.js. These pages do not exist
//  yet, so the dangerous direction is a handle that DOES match something live:
//  importing it would silently replace a page nobody meant to touch. With --live
//  this aborts on any handle that already exists. There are no takeovers in this
//  set, so there is no allowlist and a collision is always fatal.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//    - MERGE mode, so a re-run after a partial import fixes the gaps rather than
//      duplicating the successes.
//    - QUOTE_ALL. Every cell is quoted, because a page body is kilobytes of HTML
//      full of commas and newlines.
//    - utf-8-sig. The BOM is written.
//    - Published At is past-dated to a fixed literal, never now(). A drifting
//      date reorders the whole /pages listing on every import.
//    - Body HTML is present on every row because every row IS a body, and it is
//      never empty: an empty Body HTML cell wipes the live page rather than
//      leaving it alone, and Matrixify reports that as success.
//    - One import at a time.
//
//  WHAT IT REFUSES TO WRITE
//  Nothing at all if any page fails. A partial sheet is worse than no sheet,
//  because the failure is invisible at import time.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run:
//    node scripts/csp-pages-csv.js out.csv
//    node scripts/csp-pages-csv.js x2.csv --kind exercise-2
//    node scripts/csp-pages-csv.js notes.csv --kind notes
//    node scripts/csp-pages-csv.js out.csv --unit bi-3
//    node scripts/csp-pages-csv.js out.csv --live pages.json
//
//  <pages.json> is the raw result of a Shopify Admin API pages query. Both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csp-course-pages');
const { pageFromHandle } = require('../utils');

const ROOT = path.join(__dirname, '..');

// Past-dated on purpose, per the house Matrixify rule. A fixed literal rather
// than a computed date, so two runs a month apart produce the same sheet.
const PUBLISHED_AT = '2026-03-01 12:00:00';

const MAX_BODY_BYTES = 200 * 1024;
const MIN_BODY_BYTES = 2 * 1024;

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

// Every check that can stop the write. Each returns a list of complaints.
function checkPage(p) {
  const bad = [];
  const body = p.bodyHtml;
  const bytes = Buffer.byteLength(body);

  if (!p.handle || !/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (!p.title || p.title.length < 4) bad.push('title is missing or too short');
  if (!body) bad.push('BODY IS EMPTY, which would wipe the page rather than skip it');
  if (bytes < MIN_BODY_BYTES) bad.push(`body is only ${bytes} bytes, which is not a finished page`);
  if (bytes > MAX_BODY_BYTES) bad.push(`body is ${(bytes / 1024).toFixed(0)} KB, past the sanity ceiling`);

  // Encoding defects that survive a CSV round trip and are invisible until a
  // student reads the page.
  if (body.includes('�')) bad.push('body contains a replacement character');
  if (/Ã[\x80-\xBF]|â€|Â[\x80-\xBF]/.test(body)) bad.push('body contains mojibake');
  if (body.includes('—')) bad.push('body contains an em-dash');
  // eslint-disable-next-line no-control-regex
  const nonAscii = body.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`body has ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);

  // Theme hazards rather than encoding ones. An entity inside a script block is
  // read as literal text by the JS parser and breaks the block. An attribute
  // carrying &quot; is decoded back to a literal quote on save and breaks the
  // attribute.
  for (const m of body.match(/<script[\s\S]*?<\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');

  // A grid that reflows by itself is the hazard; the house rule is an explicit
  // column count.
  if (/auto-fit|auto-fill/.test(body)) bad.push('a grid uses auto-fit or auto-fill instead of repeat(N,1fr)');

  // SEO, at the same thresholds scripts/verify-artifact.js grades live pages
  // against, so a page cannot be shipped and then flagged by our own auditor.
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) bad.push(`${h1s} h1 tags, must be exactly 1`);
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  if (!p.seoTitle || p.seoTitle.length > 70) bad.push(`SEO title is ${(p.seoTitle || '').length} chars, must be 1 to 70`);

  return bad;
}

// A handle that does not route back to the activity it renders is the whole
// reason this build exists, so it is checked rather than assumed.
//
//   exercise-2  must route to ap-csp, the right unit and lesson, and the
//               activity_type exercise-2, or the reporter files a graded answer
//               under the wrong column.
//   notes       must route to its PARENT lesson as a visit. Notes are ungraded
//               reference, and a notes handle that minted its own lesson id is
//               exactly the bug utils.js already had to fix once.
function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csp') return `handle routes to ${r.course}, not ap-csp`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.slug) return `handle routes to lesson ${r.lesson}, expected ${p.slug}`;
  if (p.kind === 'exercise-2' && r.activity_type !== 'exercise-2') {
    return `handle routes as ${r.activity_type}, so graded answers would land in the wrong column`;
  }
  if (p.kind === 'notes' && r.activity_type !== 'lesson') {
    return `notes handle routes as ${r.activity_type}, so reading the notes would be graded`;
  }
  return null;
}

// The bank itself, checked before it is ever rendered. A malformed question is
// far easier to read as a complaint here than as broken markup on a live page.
function checkBank(p, raw) {
  const bad = [];
  if (p.kind !== 'exercise-2') return bad;
  raw.questions.forEach((q, i) => {
    const at = `q${i + 1}`;
    if (!Array.isArray(q.options) || q.options.length !== 4) bad.push(`${at}: needs exactly 4 options`);
    if (!['A', 'B', 'C', 'D'].includes(q.correct)) bad.push(`${at}: correct must be A, B, C or D`);
    for (const L of ['A', 'B', 'C', 'D']) {
      if (!q.why || !q.why[L]) bad.push(`${at}: missing rationale for ${L}`);
    }
    if (!q.stem || q.stem.length < 10) bad.push(`${at}: stem is missing or too short`);
    if (!q.tag) bad.push(`${at}: missing difficulty tag`);
    // Every distractor rationale should say something specific. A rationale that
    // is a restatement of "this is wrong" teaches nothing, and length is the
    // cheapest proxy for that which does not need a human to read all 840.
    for (const L of ['A', 'B', 'C', 'D']) {
      if (q.why && q.why[L] && q.why[L].length < 25) bad.push(`${at}: rationale for ${L} is too thin`);
    }
  });
  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csp-pages-csv.js <out.csv> [--kind exercise-2|notes]'
      + ' [--unit bi-N] [--only handle,handle] [--live <pages.json>]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const kind = arg('--kind');
  const unit = arg('--unit');
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  const live = arg('--live') ? readLive(arg('--live')) : null;

  const everything = allPages();
  const banks = require('../seed/csp-exercise-2');
  const bankBySlug = new Map(banks.map((b) => [b.slug, b]));

  let pages = everything;
  const total = pages.length;
  if (kind) pages = pages.filter((p) => p.kind === kind);
  if (unit) pages = pages.filter((p) => p.unit === unit);
  if (only) pages = pages.filter((p) => only.has(p.handle));
  if (!pages.length) { console.error('no pages selected'); process.exit(2); }

  const problems = [];

  // Handle uniqueness across the WHOLE set, not just the selection: two pages
  // sharing a handle means the second import silently overwrites the first, and
  // filtering to one of them would hide that.
  const byHandle = new Map();
  for (const p of everything) {
    if (byHandle.has(p.handle)) problems.push(`duplicate handle ${p.handle}`);
    byHandle.set(p.handle, p);
  }

  for (const p of pages) {
    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
    const routing = checkHandleRouting(p);
    if (routing) problems.push(`${p.handle}: ${routing}`);
    if (p.kind === 'exercise-2') {
      for (const c of checkBank(p, bankBySlug.get(p.slug))) problems.push(`${p.handle}: ${c}`);
    }
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

  const counts = {};
  for (const p of pages) counts[p.kind] = (counts[p.kind] || 0) + 1;
  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const questions = pages.reduce((n, p) => n + (p.questions || 0), 0);

  console.log('');
  for (const [k, n] of Object.entries(counts)) console.log(`    ${String(n).padStart(3)}  ${k}`);
  console.log(`    ${String(pages.length).padStart(3)}  total  (of ${total} in the build)`);
  if (questions) console.log(`    ${String(questions).padStart(3)}  graded MCQ items, all with four written rationales`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  After the exercise-2 rows land, run scripts/seed-csp-denominators.js --update');
  console.log('  or the new columns are denominated by whatever a student happened to answer.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, checkBank, PUBLISHED_AT };
