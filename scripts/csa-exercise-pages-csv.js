'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA EXERCISE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The 53 pages built by lib/csa-exercise-pages.js, one per CSA lesson:
//
//      ap-csa-lesson-{U}-{L}-{slug}-exercise-1
//
//  See the header of lib/csa-exercise-pages.js for how the gap was measured.
//
//  SAFETY MODEL: EVERY HANDLE MUST BE NEW
//  Same inversion as scripts/csp-pages-csv.js. These pages do not exist yet, so
//  the dangerous direction is a handle that DOES match something live: importing
//  it would silently replace a page nobody meant to touch. With --live this
//  aborts on any handle that already exists. There are no takeovers in this set,
//  so a collision is always fatal and there is no allowlist.
//
//  THE CHECK THAT IS SPECIFIC TO THIS SET
//  These pages carry a code editor, so the sheet also refuses to write when a
//  page would ship an ANSWER. The reference solution and every hidden case's
//  input must be absent from the body, checked against the actual bank rather
//  than by eye. A page that leaked its own answer key would grade full marks
//  forever and look exactly like a working exercise.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//    - MERGE mode, so a re-run after a partial import fixes the gaps rather than
//      duplicating the successes.
//    - QUOTE_ALL. Every cell is quoted, because a page body is kilobytes of HTML
//      full of commas, newlines and Java source.
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
//    node scripts/csa-exercise-pages-csv.js out.csv
//    node scripts/csa-exercise-pages-csv.js u1.csv --unit unit-1
//    node scripts/csa-exercise-pages-csv.js out.csv --only <handle>,<handle>
//    node scripts/csa-exercise-pages-csv.js out.csv --live pages.json
//
//  <pages.json> is the raw result of a Shopify Admin API pages query. Both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages, esc } = require('../lib/csa-exercise-pages');
const exercises = require('../seed/csa-exercises');
const { pageFromHandle } = require('../utils');

const ROOT = path.join(__dirname, '..');

// Past-dated on purpose, per the house Matrixify rule. A fixed literal rather
// than a computed date, so two runs a month apart produce the same sheet.
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
  if (/Ã[\x80-\xBF]|â|Â[\x80-\xBF]/.test(body)) bad.push('body contains mojibake');
  if (body.includes('—')) bad.push('body contains an em-dash');
  // eslint-disable-next-line no-control-regex
  const nonAscii = body.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`body has ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);

  // Theme hazards rather than encoding ones. An entity inside a script block is
  // read as literal text by the JS parser and breaks the block. An attribute
  // carrying &quot; is decoded back to a literal quote on save and breaks the
  // attribute, which is why no Java source is ever put in one.
  for (const m of body.match(/<script[\s\S]*?<\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');

  // A grid that reflows by itself is the hazard; the house rule is an explicit
  // column count.
  if (/auto-fit|auto-fill/.test(body)) bad.push('a grid uses auto-fit or auto-fill instead of repeat(N,1fr)');

  // The editor has to be reachable and has to know where to post.
  if (!body.includes('id="x1-code"')) bad.push('the page has no editor');
  if (!body.includes('/api/student/code-grade')) bad.push('the page never submits for grading');
  if (!body.includes('/api/judge0/run')) bad.push('the page has no Run button target');

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
// reason this build exists: the reporter would file a graded submission under
// the wrong column, or under no column at all.
function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csa') return `handle routes to ${r.course}, not ap-csa`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.lesson) return `handle routes to lesson ${r.lesson}, expected ${p.lesson}`;
  if (r.activity_type !== 'exercise-1') {
    return `handle routes as ${r.activity_type}, so a graded submission would land in the wrong column`;
  }
  return null;
}

// THE ANSWER KEY CHECK. A code exercise page that ships its own solution, or the
// input to a case the student is not supposed to see, is not a small content
// bug: it is a page that awards full marks to anybody who reads the source.
// Checked against the real bank rather than by eye.
// A single shared line proves nothing and flagging one would be noise: the 1.4
// hint deliberately hands over `Scanner input = new Scanner(System.in);`,
// because writing that line IS the lesson and the exercise is graded on what the
// program then does with it. What is never legitimate is a RUN of consecutive
// solution lines. So the unit of comparison is a two line window: two lines of
// the answer, in order, that the student was not already given.
function consecutiveRuns(source, alreadyGiven) {
  const given = String(alreadyGiven || '');
  const lines = String(source).split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//'));
  const runs = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    // Skip windows made only of punctuation or boilerplate every answer shares.
    if (a.length + b.length < 30) continue;
    if (given.includes(a) && given.includes(b)) continue;
    runs.push({ text: a + '\n' + b, label: a });
  }
  return runs;
}

// A body has leaked a run when both of its lines appear, in order, with nothing
// but whitespace between them. Compared against a whitespace-collapsed body so
// indentation differences cannot hide a match.
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

  // STRUCTURAL, and the check that actually guarantees the property: the page
  // renders exactly as many sample blocks as there are visible cases. A hidden
  // case cannot be on the page if the count matches, whatever any text scan says.
  const rendered = (body.match(/<div class="sample">/g) || []).length;
  const visible = x.cases.filter((c) => !c.hidden).length;
  if (rendered !== visible) {
    bad.push(`renders ${rendered} sample cases but the bank has ${visible} visible ones`);
  }

  // The reference solution.
  for (const run of consecutiveRuns(x.reference, x.starter)) {
    if (bodyHasRun(flat, run)) {
      bad.push(`the body contains two consecutive reference solution lines: ${JSON.stringify(run.label.slice(0, 60))}`);
      break;
    }
  }

  // A hidden case. Its input alone is usually a short number that matches by
  // coincidence, and so is its output, so neither is a signal on its own. Both
  // of them present IS a signal, because that is what a rendered case looks like.
  x.cases.forEach((c, i) => {
    if (!c.hidden) return;
    const stdin = String(c.stdin || '').trim();
    const outText = String(expected[exercises.caseKey(x.lesson, i)] || '').trim();
    if (!stdin || !outText) return;
    if (body.includes(esc(stdin)) && body.includes(esc(outText))) {
      bad.push(`hidden case ${i} appears on the page with both its input and its output`);
    }
  });

  // A driver exercise's GRADING harness must never be on the page. The sample
  // harness the Run button uses is a different, deliberately published one.
  if (x.mode === 'driver') {
    for (const run of consecutiveRuns(x.harness, x.runHarness)) {
      if (bodyHasRun(flat, run)) {
        bad.push(`the body contains two consecutive grading harness lines: ${JSON.stringify(run.label.slice(0, 60))}`);
        break;
      }
    }
  }

  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csa-exercise-pages-csv.js <out.csv>'
      + ' [--unit unit-N] [--only handle,handle] [--live <pages.json>]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const unit = arg('--unit');
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  const live = arg('--live') ? readLive(arg('--live')) : null;

  const everything = allPages();
  const expected = require(exercises.EXPECTED_FILE).cases;
  const byLesson = new Map(exercises.all().map((x) => [x.lesson, x]));

  let pages = everything;
  const total = pages.length;
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
    for (const c of checkNoLeak(p, byLesson.get(p.lesson), expected)) problems.push(`${p.handle}: ${c}`);
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

  const byUnit = {};
  for (const p of pages) byUnit[p.unit] = (byUnit[p.unit] || 0) + 1;
  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const cases = pages.reduce((n, p) => n + p.cases, 0);
  const hidden = pages.reduce((n, p) => n + p.hiddenCases, 0);
  const drivers = pages.filter((p) => p.mode === 'driver').length;

  console.log('');
  for (const [u, n] of Object.entries(byUnit).sort()) console.log(`    ${String(n).padStart(3)}  ${u}`);
  console.log(`    ${String(pages.length).padStart(3)}  total  (of ${total} in the build)`);
  console.log(`    ${String(drivers).padStart(3)}  write-the-class exercises graded by a hidden harness`);
  console.log(`    ${String(cases).padStart(3)}  test cases, ${hidden} of them hidden, none of them on a page`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  BEFORE the rows land, run: node scripts/seed-code-tests.js --update');
  console.log('  A page whose cases are not seeded answers every submission with a 404 and grades nothing.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, checkNoLeak, PUBLISHED_AT };
