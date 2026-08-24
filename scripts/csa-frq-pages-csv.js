'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA FRQ PRACTICE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The pages built by lib/csa-frq-pages.js:
//
//      ap-csa-lesson-{U}-{L}-{slug}-frq
//
//  Same safety model as scripts/csa-exercise-pages-csv.js and
//  scripts/csa-debug-pages-csv.js: every handle must be new (--live aborts on a
//  collision rather than replacing a live body), the body must be clean ASCII
//  with no em-dashes, and the reference solution must not leak onto the page.
//
//  ── THE LEAK RULE IS STRICTER HERE THAN FOR debug ───────────────────────────
//  A debugging page publishes a starter that is deliberately CLOSE to the
//  reference, so overlap between the two is expected and only a run of two
//  consecutive fixed-only lines counts as a leak. An FRQ starter is a comment
//  block. Nothing in the reference is meant to be on the page at all, so a
//  single non-trivial reference line appearing in the body is a leak, and this
//  script says so.
//
//  Run:
//    node scripts/csa-frq-pages-csv.js out.csv
//    node scripts/csa-frq-pages-csv.js out.csv --live pages.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csa-frq-pages');
const bank = require('../seed/csa-frq');
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

  // The rubric is the question. A page that renders three of four parts is
  // asking a different question from the one it is graded against.
  const rows = (body.match(/class="plabel"/g) || []).length;
  if (rows !== 4) bad.push(`renders ${rows} rubric parts, must be exactly 4`);

  return bad;
}

function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csa') return `handle routes to ${r.course}, not ap-csa`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.lesson) return `handle routes to lesson ${r.lesson}, expected ${p.lesson}`;
  if (r.activity_type !== 'exercise-3') {
    return `handle routes as ${r.activity_type}, so a graded submission would land in the wrong column`;
  }
  return null;
}

// A reference line worth protecting: real code, long enough to be distinctive,
// and not something the starter or the task text would legitimately contain.
function referenceLines(x) {
  return String(x.reference).split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 20 && !l.startsWith('//'));
}

function checkNoLeak(p, x, expected) {
  const bad = [];
  const body = p.bodyHtml;
  const flat = body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const rendered = (body.match(/<div class="sample">/g) || []).length;
  const visible = x.cases.filter((c) => !c.hidden).length;
  if (rendered !== visible) {
    bad.push(`renders ${rendered} sample cases but the bank has ${visible} visible ones`);
  }

  for (const line of referenceLines(x)) {
    if (flat.includes(line)) {
      bad.push(`the body contains a line of the reference solution: ${JSON.stringify(line.slice(0, 60))}`);
      break;
    }
  }

  // A hidden case is only hidden if the page does not show its input. For a
  // segment FRQ the input IS the prelude declarations, which is exactly what
  // the "what is given" samples render for visible cases.
  x.cases.forEach((c, i) => {
    if (!c.hidden) return;
    const input = String(x.mode === 'segment' ? (c.prelude || '') : (c.stdin || '')).trim();
    const outText = String(expected[bank.caseKey(x.lesson, i)] || '').trim();
    if (!input || !outText) return;
    if (body.includes(input)) {
      bad.push(`hidden case ${i} has its input printed on the page`);
    } else if (flat.includes(outText) && outText.length > 6) {
      bad.push(`hidden case ${i} has its expected output printed on the page`);
    }
  });

  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csa-frq-pages-csv.js <out.csv> [--live <pages.json>]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const live = arg('--live') ? readLive(arg('--live')) : null;

  const pages = allPages();
  const expected = require(bank.EXPECTED_FILE).cases;
  const byLesson = new Map(bank.all().map((x) => [x.lesson, x]));

  if (!pages.length) { console.error('no FRQs authored yet'); process.exit(2); }

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
  // BOM plus CRLF, byte for byte what scripts/csa-exercise-pages-csv.js and
  // scripts/csa-debug-pages-csv.js write. Matrixify reads utf-8-sig, and a
  // sheet in a subtly different dialect from the two that already import
  // cleanly is a problem discovered during an import rather than before one.
  const csv = '\ufeff' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(path.resolve(ROOT, out), csv);

  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const cases = pages.reduce((n, p) => n + p.cases, 0);
  const hidden = pages.reduce((n, p) => n + p.hiddenCases, 0);
  console.log(`wrote ${pages.length} FRQ page(s) to ${out}`);
  console.log(`  ${(bytes / 1024).toFixed(0)} KB of body, ${cases} cases, ${hidden} hidden`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { checkPage, checkNoLeak, checkHandleRouting, referenceLines, PUBLISHED_AT };
