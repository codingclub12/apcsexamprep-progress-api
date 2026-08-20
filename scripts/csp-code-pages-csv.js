'use strict';
// -----------------------------------------------------------------------------
//  Build the Matrixify sheet for the two missing coding-practice pages.
//
//  Sixteen of these pages exist for Big Idea 3, covering 3.1 to 3.16. Topics
//  3.17 and 3.18 had none, which is why the Command Center link generator lists
//  them in NO_CODE_PAGE. This closes that gap.
//
//  It refuses to build a page whose expected outputs were not verified by
//  actually running the reference solutions, because an expected output typed by
//  hand is a guess, and a wrong guess marks a correct student answer wrong.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty.
//
//  Run: node scripts/csp-code-pages-csv.js out.csv
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { render } = require('../lib/csp-code-pages');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const TOPICS = ['3-17', '3-18'];

function build() {
  const expectedPath = path.join(__dirname, '..', 'seed', 'csp-code-pages', 'expected.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error('expected.json is missing. Run scripts/verify-csp-code-pages.js --write first;'
      + ' the expected outputs must come from running the solutions, not from being typed.');
  }
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

  return TOPICS.map((t) => {
    const data = require(path.join('..', 'seed', 'csp-code-pages', t + '.js'));
    const exp = expected[data.topic];
    if (!exp) throw new Error(`${data.topic} has no verified expected outputs`);
    const bodyHtml = render(data, exp);
    return {
      handle: 'ap-csp-topic-' + t + '-code',
      title: 'AP CSP Topic ' + data.topic + ' Coding Practice - ' + data.title,
      seoDescription: 'Write and run real Python or JavaScript for AP CSP Topic ' + data.topic + ', '
        + data.title.toLowerCase() + '. Four problems, checked automatically against expected output.',
      bodyHtml,
    };
  });
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
  if (!b.includes('var EXPECTED')) bad.push('the expected outputs are missing');
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out) {
    console.error('usage: node scripts/csp-code-pages-csv.js <out.csv>');
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
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. These are NEW pages, so nothing is overwritten.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, checkPage };
