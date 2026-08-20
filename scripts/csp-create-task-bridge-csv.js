'use strict';
// -----------------------------------------------------------------------------
//  Build the Matrixify sheet for the Create Task bridge page.
//
//  One page, one row. It is a NEW handle, so nothing it touches can be
//  overwritten and no snapshot is required. That changes the day this page is
//  regenerated: a second run against a live page IS a takeover, and the snapshot
//  rule in scripts/snapshot-live-page.js applies then.
//
//  It refuses to build from expected outputs that were not produced by running
//  the reference solutions, for the same reason the topic-page builder does: an
//  expected output typed by hand is a guess, and a wrong guess marks a correct
//  student answer wrong.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty.
//
//  Run: node scripts/csp-create-task-bridge-csv.js out.csv
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { render } = require('../lib/csp-create-task-bridge');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const SEED_DIR = path.join(__dirname, '..', 'seed', 'csp-create-task');

function build() {
  const expectedPath = path.join(SEED_DIR, 'expected.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error('expected.json is missing. Run scripts/verify-csp-code-pages.js --write first;'
      + ' the expected outputs must come from running the solutions, not from being typed.');
  }
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const data = require(path.join(SEED_DIR, 'bridge.js'));
  const exp = expected[data.slug];
  if (!exp) throw new Error('the bridge has no verified expected outputs');

  return [{
    handle: data.handle,
    title: 'AP CSP Create Task Practice - Build Up to All Six Requirements',
    seoDescription: 'Four AP CSP problems that add the six Create Task program requirements one'
      + ' at a time, with real input, run in Python or JavaScript and checked as you go.',
    bodyHtml: render(data, exp),
  }];
}

function checkPage(p) {
  const bad = [];
  const b = p.bodyHtml;
  if (!/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (!b.trim()) bad.push('empty body would wipe the page');
  if (Buffer.byteLength(b) < 6000) bad.push('body is too small to be a finished page');
  // eslint-disable-next-line no-control-regex
  const nonAscii = b.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (b.includes('—')) bad.push('body contains an em-dash');
  if ((b.match(/<h1[\s>]/g) || []).length !== 1) bad.push('must have exactly one h1');
  if ((b.match(/class="prob"/g) || []).length !== 4) bad.push('must have exactly four problems');
  const opens = (b.match(/<script[\s>]/g) || []).length;
  const closes = (b.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script opens vs ${closes} closes`);
  if (!b.includes('/api/judge0/run')) bad.push('the runner endpoint is missing');
  if (!b.includes('var STDINS')) bad.push('the input for each problem is missing');
  if (!b.includes('/pages/ap-csp-course-create-task')) bad.push('the handoff to the Create Task Builder is missing');
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out) {
    console.error('usage: node scripts/csp-create-task-bridge-csv.js <out.csv>');
    process.exit(2);
  }
  let pages;
  try { pages = build(); }
  catch (e) { console.error('\n  Refused: ' + e.message + '\n'); process.exit(1); }

  const problems = [];
  for (const p of pages) for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((m) => console.error('    ' + m));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At', 'SEO Description'];
  const lines = [header.map(cell).join(',')];
  for (const p of pages) {
    lines.push([p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT, p.seoDescription].map(cell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');
  pages.forEach((p) => console.log(`    ${p.handle}  ${(Buffer.byteLength(p.bodyHtml) / 1024).toFixed(0)} KB`));
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. This is a NEW page, so nothing is overwritten.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, checkPage };
