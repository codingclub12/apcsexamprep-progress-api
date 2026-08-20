'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA DEBUGGING EXERCISE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The pages built by lib/csa-debug-pages.js, currently one:
//
//      ap-csa-lesson-{U}-{L}-{slug}-debug
//
//  Same safety model as scripts/csa-exercise-pages-csv.js: every handle must
//  be new (--live aborts on a collision), and the same answer-leak check
//  applies, because a debugging exercise's REFERENCE (the fixed program) is
//  exactly as much an answer key as exercise-1's is. Only the STARTER (the
//  buggy version) is meant to be public; that is the whole exercise.
//
//  Run:
//    node scripts/csa-debug-pages-csv.js out.csv
//    node scripts/csa-debug-pages-csv.js out.csv --live pages.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csa-debug-pages');
const debugExercises = require('../seed/csa-debug-exercises');
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

  for (const m of body.match(/<script[\s\S]*?<\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');
  if (/auto-fit|auto-fill/.test(body)) bad.push('a grid uses auto-fit or auto-fill instead of repeat(N,1fr)');

  if (!body.includes('id="x1-code"')) bad.push('the page has no editor');
  if (!body.includes('/api/student/code-grade')) bad.push('the page never submits for grading');
  if (!body.includes('/api/judge0/run')) bad.push('the page has no Run button target');

  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) bad.push(`${h1s} h1 tags, must be exactly 1`);
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  if (!p.seoTitle || p.seoTitle.length > 70) bad.push(`SEO title is ${(p.seoTitle || '').length} chars, must be 1 to 70`);

  return bad;
}

function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csa') return `handle routes to ${r.course}, not ap-csa`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.lesson) return `handle routes to lesson ${r.lesson}, expected ${p.lesson}`;
  if (r.activity_type !== 'debug') {
    return `handle routes as ${r.activity_type}, so a graded submission would land in the wrong column`;
  }
  return null;
}

// Same two-line-run leak detector as scripts/csa-exercise-pages-csv.js. See
// that file's comment for why a single shared line is not a leak: the starter
// here is deliberately close to the reference (it is a buggy VERSION of it),
// so overlap is expected. What must never appear is a consecutive pair of
// lines that only the FIXED version has.
function consecutiveRuns(source, alreadyGiven) {
  const given = String(alreadyGiven || '');
  const lines = String(source).split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//'));
  const runs = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a.length + b.length < 30) continue;
    if (given.includes(a) && given.includes(b)) continue;
    runs.push({ text: a + '\n' + b, label: a });
  }
  return runs;
}

function bodyHasRun(flatBody, run) {
  const [a, b] = run.text.split('\n');
  const at = flatBody.indexOf(a);
  if (at === -1) return false;
  const after = flatBody.slice(at + a.length);
  return /^\s*/.test(after) && after.replace(/^\s+/, '').startsWith(b);
}

function checkNoLeak(p, x, expected) {
  const bad = [];
  const body = p.bodyHtml;
  const flat = body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  const rendered = (body.match(/<div class="sample">/g) || []).length;
  const visible = x.cases.filter((c) => !c.hidden).length;
  if (rendered !== visible) {
    bad.push(`renders ${rendered} sample cases but the bank has ${visible} visible ones`);
  }

  // The fixed reference is the answer key here. Lines that differ from the
  // buggy starter are exactly the lines that must not leak.
  for (const run of consecutiveRuns(x.reference, x.starter)) {
    if (bodyHasRun(flat, run)) {
      bad.push(`the body contains two consecutive FIXED-version lines not in the buggy starter: ${JSON.stringify(run.label.slice(0, 60))}`);
      break;
    }
  }

  x.cases.forEach((c, i) => {
    if (!c.hidden) return;
    const stdin = String(c.stdin || '').trim();
    const outText = String(expected[debugExercises.caseKey(x.lesson, i)] || '').trim();
    if (!stdin || !outText) return;
    if (body.includes(stdin) && body.includes(outText)) {
      bad.push(`hidden case ${i} appears on the page with both its input and its output`);
    }
  });

  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csa-debug-pages-csv.js <out.csv> [--live <pages.json>]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const live = arg('--live') ? readLive(arg('--live')) : null;

  const pages = allPages();
  const expected = require(debugExercises.EXPECTED_FILE).cases;
  const byLesson = new Map(debugExercises.all().map((x) => [x.lesson, x]));

  if (!pages.length) { console.error('no debug exercises authored yet'); process.exit(2); }

  const problems = [];
  const byHandle = new Map();
  for (const p of pages) {
    if (byHandle.has(p.handle)) problems.push(`duplicate handle ${p.handle}`);
    byHandle.set(p.handle, p);

    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
    const routing = checkHandleRouting(p);
    if (routing) problems.push(`${p.handle}: ${routing}`);
    for (const c of checkNoLeak(p, byLesson.get(p.lesson), expected)) problems.push(`${p.handle}: ${c}`);
    if (live && live.has(p.handle)) {
      const n = live.get(p.handle);
      problems.push(`${p.handle}: a live page ALREADY uses this handle`
        + ` (title ${JSON.stringify(n.title)}). Importing would replace its body.`);
    }
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    for (const m of problems) console.error('    ' + m);
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
  const cases = pages.reduce((n, p) => n + p.cases, 0);
  const hidden = pages.reduce((n, p) => n + p.hiddenCases, 0);

  console.log('');
  console.log(`    ${String(pages.length).padStart(3)}  debugging exercise page(s)`);
  console.log(`    ${String(cases).padStart(3)}  test cases, ${hidden} of them hidden, none of them on a page`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  BEFORE the rows land, run: node scripts/seed-code-tests.js --update\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, checkNoLeak, PUBLISHED_AT };
