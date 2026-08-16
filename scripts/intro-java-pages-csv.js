'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  Ninety pages, built from the bank by lib/intro-java-build.js:
//
//      1  course hub      intro-java-with-greenfoot
//      6  unit hubs       intro-java-unit-N-...
//     42  lessons         intro-java-lesson-U-L-slug
//     41  help pages      intro-java-help-{error,gotcha,recipe}-slug
//
//  WHY IT IS NOT scripts/page-body-csv.js
//  That script UPDATES three pages that already exist, and its whole safety
//  model is built on that: it refuses any handle it cannot find live, because an
//  unrecognised handle there means somebody typo'd a page that a real teacher is
//  using. These ninety do not exist yet. The dangerous direction is reversed: a
//  handle that DOES match something live would silently replace a page nobody
//  meant to touch. So this script inverts the check, and with --live it aborts
//  on any handle that already exists rather than on any handle that does not.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//    - MERGE mode, so a re-run after a partial import fixes the gaps instead of
//      duplicating the successes.
//    - QUOTE_ALL. Every cell is quoted, no exceptions, because a lesson body is
//      fifteen kilobytes of HTML full of commas and newlines.
//    - utf-8-sig. The BOM is written.
//    - Published At is past-dated to a fixed date, never now(). A future or
//      drifting date reorders the whole /pages listing on every import.
//    - Body HTML is present on every row because every row IS a body, and it is
//      never empty: an empty Body HTML cell wipes the live page rather than
//      leaving it alone, and Matrixify reports that as success.
//
//  WHAT IT REFUSES TO WRITE
//  Nothing is written at all if any page fails. A partial sheet is worse than no
//  sheet, because the failure is then invisible at import time.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run:
//    node scripts/intro-java-pages-csv.js out.csv
//    node scripts/intro-java-pages-csv.js hubs.csv --kind hub
//    node scripts/intro-java-pages-csv.js out.csv --live pages.json
//    node scripts/intro-java-pages-csv.js out.csv --seo-metafields
//
//  <pages.json> is the raw result of a Shopify Admin API pages query; both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const { allPages } = require('../lib/intro-java-build');
const { pageFromHandle } = require('../utils');

// Past-dated on purpose, per the house Matrixify rule. A fixed literal rather
// than a computed date so two runs a month apart produce the same sheet.
const PUBLISHED_AT = '2026-03-01 12:00:00';

// Shopify page bodies have no documented hard cap, but a body this far past the
// course average is a bug in the renderer rather than a long lesson.
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

  // The encoding defects that survive a CSV round trip and are invisible until a
  // student reads the page.
  if (body.includes('�')) bad.push('body contains a replacement character');
  if (/Ã[\x80-\xBF]|â€|Â[\x80-\xBF]/.test(body)) bad.push('body contains mojibake');
  if (body.includes('—')) bad.push('body contains an em-dash');
  // eslint-disable-next-line no-control-regex
  const nonAscii = body.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`body has ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);

  // A theme hazard rather than an encoding one: an entity inside a script block
  // is read as literal text by the JS parser and breaks the block.
  for (const m of body.match(/<script[\s\S]*?<\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');

  // SEO. The same thresholds scripts/verify-artifact.js grades live pages
  // against, so a page cannot be shipped and then flagged by our own auditor.
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) bad.push(`${h1s} h1 tags, must be exactly 1`);
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  if (!p.seoTitle || p.seoTitle.length > 70) bad.push(`SEO title is ${(p.seoTitle || '').length} chars, must be 1 to 70`);

  return bad;
}

// A lesson handle has to parse back into the lesson it came from, or the visit
// tracker files that page under nothing and the student's progress silently
// stops counting. Help handles must NOT parse, which is the same rule read the
// other way: reaching for help is not progress.
function checkHandleRouting(p) {
  const parsed = pageFromHandle(p.handle);
  if (p.kind === 'lesson') {
    if (!parsed || parsed.course !== 'intro-java') return 'lesson handle does not route to intro-java';
    if (!parsed.lesson) return 'lesson handle routes with no lesson id';
  } else if (p.kind === 'help') {
    if (parsed && parsed.lesson) return 'help handle routes as a lesson, so asking for help would count as progress';
  }
  return null;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/intro-java-pages-csv.js <out.csv> [--kind hub|lesson|help]'
      + ' [--only handle,handle] [--live <pages.json>] [--seo-metafields]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const kind = arg('--kind');
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  const live = arg('--live') ? readLive(arg('--live')) : null;
  // Matrixify writes page SEO through "SEO Title" and "SEO Description". If a
  // store's build ignores those, the metafield spelling is the fallback. Getting
  // this wrong costs the SEO fields on the import, never the page body.
  const seoMetafields = argv.includes('--seo-metafields');

  let pages = allPages();
  const total = pages.length;
  // 'hub' selects both hub kinds, since importing the course hub without its
  // unit hubs would ship a landing page whose every link is a 404.
  if (kind) {
    pages = pages.filter((p) => (kind === 'hub' ? p.kind.endsWith('-hub') : p.kind === kind));
  }
  if (only) pages = pages.filter((p) => only.has(p.handle));
  if (!pages.length) { console.error('no pages selected'); process.exit(2); }

  const problems = [];

  // Handle uniqueness across the whole set, not just the selection: two pages
  // sharing a handle means the second import silently overwrites the first, and
  // filtering to one of them would hide that.
  const byHandle = new Map();
  for (const p of allPages()) {
    if (byHandle.has(p.handle)) problems.push(`duplicate handle ${p.handle}`);
    byHandle.set(p.handle, p);
  }

  for (const p of pages) {
    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
    const routing = checkHandleRouting(p);
    if (routing) problems.push(`${p.handle}: ${routing}`);
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
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  header.push(seoMetafields ? 'Metafield: global.title_tag [single_line_text_field]' : 'SEO Title');
  header.push(seoMetafields ? 'Metafield: global.description_tag [single_line_text_field]' : 'SEO Description');

  const lines = [header.map(cell).join(',')];
  for (const p of pages) {
    lines.push([
      p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT, p.seoTitle, p.seoDescription,
    ].map(cell).join(','));
  }
  // CRLF and a BOM: utf-8-sig, per the house import settings.
  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(out, csv);

  const counts = {};
  for (const p of pages) counts[p.kind] = (counts[p.kind] || 0) + 1;
  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);

  console.log('');
  for (const [k, n] of Object.entries(counts)) console.log(`    ${String(n).padStart(3)}  ${k}`);
  console.log(`    ${String(pages.length).padStart(3)}  total  (of ${total} in the course)`);
  console.log(`\n  wrote ${out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  After the import lands, flip INTRO_JAVA_PAGES_LIVE in scripts/seed-manifest.js');
  console.log('  and run the seed with --update, or the graded items have no denominators.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, PUBLISHED_AT };
