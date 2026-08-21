'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP EXERCISE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  All 70 pages built by lib/csp-exercise-pages.js, at the handles printed
//  inside the Teacher Course Bundle student handouts:
//
//      ap-csp-topic-{U}-{L}-exercise-{N}
//
//  Every one of those 70 URLs returned 404 as of 2026-08-17, verified one by
//  one. Topic 1.1's two were published by hand on 2026-08-21, through the Admin
//  API, because two pages did not need a sheet. The remaining 68 do.
//
//  TWO KINDS OF PAGE, AND THE DIFFERENCE IS NOT COSMETIC
//    graded       the handout mirror PLUS an author-written multiple choice
//                 check derived from the teacher answer key, which is the half
//                 that posts to the gradebook. Topic 1.1 only, so far.
//    mirror-only  the handout mirror alone. No check questions have been
//                 authored against the answer key for these topics yet, so the
//                 page carries none and SAYS it carries none, in a note that
//                 addresses the "auto-graded" line the student is holding in
//                 their hand. A score bar counting zero items would be a lie
//                 told in the student's own interface.
//
//  Writing boxes are local to the browser in both kinds. Nothing typed is ever
//  transmitted, which is what keeps the zero-PII posture intact.
//
//  WHY NO HANDLE ROUTING CHECK
//  scripts/csp-pages-csv.js asserts every handle routes through pageFromHandle,
//  because a graded page at a mis-routing handle files answers under the wrong
//  column. These handles route nowhere at all: ap-csp-topic-{U}-{L}-exercise-{N}
//  is not a pattern utils.js knows, so these pages record no VISIT. Grading is
//  unaffected, because the page dispatches course, unit and lesson explicitly in
//  the apcsActivity detail and the reporter prefers the detail over the handle.
//  Asserting a routing rule that is knowingly unmet would just be a failing
//  build with a comment explaining why to ignore it. Adding the pattern to
//  utils.js is a separate, additive change.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//  Identical to scripts/csp-pages-csv.js, and for the same reasons: MERGE mode,
//  QUOTE_ALL, utf-8-sig with the BOM written, a past-dated fixed Published At
//  literal so a re-import does not reorder /pages, and never an empty Body HTML
//  cell, which wipes a live page and reports success.
//
//  ONE DIFFERENCE FROM THAT SCRIPT'S SAFETY MODEL
//  There, every handle had to be NEW. Here two handles are expected to exist:
//  topic 1.1's, already published. So --live treats those two as takeovers by
//  the same content and everything else as fatal, rather than banning
//  collisions outright.
//
//  WHAT IT REFUSES TO WRITE
//  Nothing at all if any page fails. A partial sheet is worse than no sheet,
//  because the failure is invisible at import time.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run:
//    node scripts/csp-exercise-pages-csv.js out.csv
//    node scripts/csp-exercise-pages-csv.js rest.csv --skip-live-1-1
//    node scripts/csp-exercise-pages-csv.js out.csv --kind exercise-1
//    node scripts/csp-exercise-pages-csv.js out.csv --unit bi-2
//    node scripts/csp-exercise-pages-csv.js out.csv --live pages.json
//
//  <pages.json> is the raw result of a Shopify Admin API pages query. Both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csp-exercise-pages');
const { checkPage, PUBLISHED_AT } = require('./csp-pages-csv');

const ROOT = path.join(__dirname, '..');

// Published by hand on 2026-08-21, so a handle collision on these two is
// expected rather than a sign the sheet is about to overwrite a stranger's page.
const ALREADY_LIVE = new Set([
  'ap-csp-topic-1-1-exercise-1',
  'ap-csp-topic-1-1-exercise-2',
]);

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

function main(argv) {
  const out = argv.find((a) => !a.startsWith('--'));
  if (!out) {
    console.error('\n  usage: node scripts/csp-exercise-pages-csv.js <out.csv> [--kind K] [--unit U] [--skip-live-1-1] [--live pages.json]\n');
    process.exit(1);
  }
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  const kind = arg('--kind');
  const unit = arg('--unit');
  const live = arg('--live');
  const skipLive = argv.includes('--skip-live-1-1');

  const built = allPages();
  const total = built.length;
  let pages = built;
  if (kind) pages = pages.filter((p) => p.kind === kind);
  if (unit) pages = pages.filter((p) => p.unit === unit);
  if (skipLive) pages = pages.filter((p) => !ALREADY_LIVE.has(p.handle));

  if (!pages.length) {
    console.error('\n  no pages matched that filter\n');
    process.exit(1);
  }

  const problems = [];
  for (const p of pages) {
    for (const bad of checkPage(p)) problems.push(`${p.handle}: ${bad}`);
  }

  const handles = new Set();
  for (const p of pages) {
    if (handles.has(p.handle)) problems.push(`${p.handle}: duplicate handle in the build`);
    handles.add(p.handle);
  }

  // A mirror-only page must not carry a graded widget, and a graded page must.
  // The two are told apart on the page in words, so a mismatch here would mean
  // the page says one thing and does another.
  for (const p of pages) {
    const items = (p.bodyHtml.match(/class="mcq-item"/g) || []).length;
    if (p.graded && items !== p.questions) {
      problems.push(`${p.handle}: says ${p.questions} graded items, paints ${items}`);
    }
    if (!p.graded && items !== 0) {
      problems.push(`${p.handle}: is mirror-only but paints ${items} graded items`);
    }
    if (!p.graded && p.bodyHtml.includes('id="ex-score"')) {
      problems.push(`${p.handle}: is mirror-only but paints a score bar`);
    }
    if (!p.mirrored) problems.push(`${p.handle}: mirrors nothing from the handout`);
  }

  if (live) {
    const by = readLive(live);
    for (const p of pages) {
      const hit = by.get(p.handle);
      if (hit && !ALREADY_LIVE.has(p.handle)) {
        problems.push(`${p.handle}: Something already here, live title ${JSON.stringify(hit.title || '')}`);
      }
    }
  }

  if (problems.length) {
    console.error(`\n  REFUSING TO WRITE. ${problems.length} problem(s):\n`);
    for (const s of problems.slice(0, 40)) console.error(`    ${s}`);
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

  const graded = pages.filter((p) => p.graded);
  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const mirrored = pages.reduce((n, p) => n + (p.mirrored || 0), 0);

  console.log('');
  console.log(`    ${String(graded.length).padStart(3)}  graded (handout mirror plus an auto-graded check)`);
  console.log(`    ${String(pages.length - graded.length).padStart(3)}  mirror-only (handout reproduced, nothing recorded)`);
  console.log(`    ${String(pages.length).padStart(3)}  total  (of ${total} in the build)`);
  console.log(`    ${String(mirrored).padStart(3)}  handout items reproduced, every one a local-only writing box`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  These handles do not route through pageFromHandle, so the pages record no visit.');
  console.log('  Grading is unaffected: the page dispatches course, unit and lesson explicitly.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { ALREADY_LIVE };
