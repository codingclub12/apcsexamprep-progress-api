'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the 70 CSP exercise pages and their Matrixify sheet.
//
//  WHAT IS BEING PROTECTED
//
//  1. A PAGE THAT LIES ABOUT BEING GRADED. 68 of these pages carry no check
//     questions, because nobody has authored any against the answer key yet.
//     The student is holding a handout that says "also available online
//     (auto-graded)". So a mirror-only page must paint no graded widget, no
//     score bar, and must SAY in words that nothing on it is recorded. A page
//     that quietly showed "0 / 0 correct" would be a lie told in the student's
//     own interface, and it would look fine from every other angle.
//
//  2. A DENOMINATOR FOR WORK THAT DOES NOT EXIST. The seed prices columns from
//     the renderer. If it ever walked all 70 pages instead of the graded ones,
//     every mirror-only topic would author a denominator of 0 and mark a class
//     down for an assessment its page does not contain. That is asserted here
//     rather than left to the seed's own comment.
//
//  3. THE HANDLES. These are not a naming choice. They are printed inside 70
//     documents already in teachers' hands, so the build must produce exactly
//     the handles in the source and nothing else. A renamed handle is a 404 a
//     teacher discovers on behalf of a class.
//
//  4. THE CSV ITSELF. The sheet is read only by Matrixify, which reports
//     success on a sheet that silently truncated a body at the first stray
//     quote. These bodies are a megabyte of HTML full of commas, quotes and
//     newlines, so the sheet is generated and PARSED BACK with a real RFC 4180
//     reader and every body compared byte for byte.
//
//  5. THE REFUSAL. The writer refuses to write a partial sheet. A check that
//     cannot fail is not a check, so the refusal is proved by feeding it a
//     deliberately broken page rather than assumed from reading the code.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: node smoke/csp-exercise-pages.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages, gradedPages, allChecks, SOURCE } = require('../lib/csp-exercise-pages');
const { checkPage, PUBLISHED_AT } = require('../scripts/csp-pages-csv');
const { ALREADY_LIVE } = require('../scripts/csp-exercise-pages-csv');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// A real RFC 4180 reader. Deliberately NOT a split on commas: splitting is the
// bug this test exists to catch, so the test cannot be allowed to make it too.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n' || c === '\r') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

console.log('\nCSP EXERCISE PAGES\n');

const pages = allPages();
const checks = allChecks();
const byHandle = new Map(pages.map((p) => [p.handle, p]));

// ── 1. The build covers exactly the printed handles ──────────────────────────
section('1. The build covers exactly the handles printed in the handouts');
const sourceHandles = Object.keys(SOURCE).sort();
const builtHandles = pages.map((p) => p.handle).sort();
ok('  70 pages, one per student handout', pages.length === 70, pages.length);
ok('  every printed handle is built, and nothing else is',
  JSON.stringify(sourceHandles) === JSON.stringify(builtHandles),
  { missing: sourceHandles.filter((h) => !byHandle.has(h)).slice(0, 5) });
ok('  every handle is the ap-csp-topic-{U}-{L}-exercise-{N} shape',
  pages.every((p) => /^ap-csp-topic-\d+-\d+-exercise-[12]$/.test(p.handle)),
  pages.filter((p) => !/^ap-csp-topic-\d+-\d+-exercise-[12]$/.test(p.handle)).map((p) => p.handle));
ok('  the two already-published handles are in the build',
  [...ALREADY_LIVE].every((h) => byHandle.has(h)));

// ── 2. Graded and mirror-only pages are what they claim ──────────────────────
section('2. A page is what it says it is');
const graded = pages.filter((p) => p.graded);
const mirrorOnly = pages.filter((p) => !p.graded);
ok('  the graded set is exactly the set with authored checks',
  graded.length === Object.keys(checks).length
    && graded.every((p) => checks[p.handle]),
  { graded: graded.map((p) => p.handle), checks: Object.keys(checks) });
ok('  every other page is mirror-only', mirrorOnly.length === pages.length - graded.length);

for (const p of graded) {
  const items = (p.bodyHtml.match(/class="mcq-item"/g) || []).length;
  ok(`  ${p.handle} paints the ${p.questions} graded items it claims`,
    items === p.questions && p.questions > 0, items);
}
ok('  no mirror-only page paints a graded item',
  mirrorOnly.every((p) => !/class="mcq-item"/.test(p.bodyHtml)),
  mirrorOnly.filter((p) => /class="mcq-item"/.test(p.bodyHtml)).map((p) => p.handle).slice(0, 3));
ok('  no mirror-only page paints a score bar',
  mirrorOnly.every((p) => !p.bodyHtml.includes('id="ex-score"')),
  mirrorOnly.filter((p) => p.bodyHtml.includes('id="ex-score"')).map((p) => p.handle).slice(0, 3));
ok('  every mirror-only page says in words that nothing is recorded',
  mirrorOnly.every((p) => p.bodyHtml.includes('No graded check on this page yet')
    && p.bodyHtml.includes('Nothing on this page is scored or sent to your teacher.')),
  mirrorOnly.filter((p) => !p.bodyHtml.includes('No graded check on this page yet')).map((p) => p.handle).slice(0, 3));
ok('  and every mirror-only page addresses the handout line it contradicts',
  mirrorOnly.every((p) => p.bodyHtml.includes('auto-graded')),
  mirrorOnly.filter((p) => !p.bodyHtml.includes('auto-graded')).map((p) => p.handle).slice(0, 3));

// ── 3. The writing boxes, which are the zero-PII surface ─────────────────────
section('3. Every page mirrors the handout into local-only writing boxes');
ok('  every page reproduces at least one handout item',
  pages.every((p) => p.mirrored > 0), pages.filter((p) => !p.mirrored).map((p) => p.handle));
ok('  every page paints one textarea per mirrored item',
  pages.every((p) => {
    const boxes = (p.bodyHtml.match(/<textarea /g) || []).length;
    // exercise-1 mirrors Part B, one box per question. exercise-2 mirrors
    // scenarios, each carrying several prompts, so it is one box per prompt.
    return p.kind === 'exercise-1' ? boxes === p.mirrored : boxes > p.mirrored;
  }));
ok('  no page posts a writing box anywhere',
  pages.every((p) => !/textarea[\s\S]{0,400}?(fetch|XMLHttpRequest|sendBeacon)/.test(p.bodyHtml)));
ok('  drafts are stored in localStorage and nowhere else',
  pages.every((p) => p.bodyHtml.includes("localStorage.setItem(KEY")
    && !p.bodyHtml.includes('sendBeacon')));

// ── 4. Every page passes the shared page validator ───────────────────────────
section('4. Every page passes the same validator the other CSP sheets use');
const problems = [];
for (const p of pages) for (const bad of checkPage(p)) problems.push(`${p.handle}: ${bad}`);
ok('  70 pages, 0 problems', problems.length === 0, problems.slice(0, 5));
ok('  exactly one h1 per page',
  pages.every((p) => (p.bodyHtml.match(/<h1[\s>]/g) || []).length === 1));
ok('  every body is pure ASCII',
  // eslint-disable-next-line no-control-regex
  pages.every((p) => !/[^\x09\x0A\x0D\x20-\x7E]/.test(p.bodyHtml)));

// ── 5. The denominator seed prices only what exists ──────────────────────────
section('5. The denominator seed prices only pages that carry graded items');
const { buildRows } = require('../scripts/seed-csp-denominators');
const rows = buildRows();
const gradedSlugs = new Set(gradedPages().map((p) => p.slug));
const priced = rows.filter((r) => r.activity_type.startsWith('exercise-'));
const zeroes = rows.filter((r) => !(r.possible > 0));
ok('  no denominator is zero or negative', zeroes.length === 0, zeroes);
ok('  no mirror-only lesson is priced for an exercise it does not grade',
  priced.every((r) => r.unit === 'bi-3' || gradedSlugs.has(r.lesson)),
  priced.filter((r) => r.unit !== 'bi-3' && !gradedSlugs.has(r.lesson)).slice(0, 5));

// ── 6. The sheet survives a round trip ───────────────────────────────────────
section('6. The sheet round trips byte for byte');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-ex-csv-'));
const csvPath = path.join(tmp, 'all.csv');
const script = path.join(__dirname, '..', 'scripts', 'csp-exercise-pages-csv.js');
execFileSync(process.execPath, [script, csvPath], { stdio: ['ignore', 'pipe', 'pipe'] });

const text = fs.readFileSync(csvPath, 'utf8');
ok('  the BOM is written', text.charCodeAt(0) === 0xFEFF);
const rowsCsv = parseCsv(text.slice(1));
ok('  one header plus one row per page', rowsCsv.length === pages.length + 1, rowsCsv.length);

const head = rowsCsv[0];
const col = (name) => head.indexOf(name);
ok('  the header is the house shape',
  col('Handle') === 0 && col('Body HTML') === 3 && col('SEO Description') === 7, head);

let mismatched = 0, unpublished = 0, wrongDate = 0;
for (const r of rowsCsv.slice(1)) {
  const p = byHandle.get(r[col('Handle')]);
  if (!p || r[col('Body HTML')] !== p.bodyHtml) mismatched++;
  if (r[col('Published')] !== 'TRUE') unpublished++;
  if (r[col('Published At')] !== PUBLISHED_AT) wrongDate++;
}
ok('  every body survives the round trip byte for byte', mismatched === 0, mismatched);
ok('  every row is published', unpublished === 0, unpublished);
ok('  Published At is the fixed past-dated literal, never now()', wrongDate === 0, wrongDate);
ok('  every row is MERGE', rowsCsv.slice(1).every((r) => r[col('Command')] === 'MERGE'));

// The 68-row sheet, which is the one that actually gets imported.
const restPath = path.join(tmp, 'rest.csv');
execFileSync(process.execPath, [script, restPath, '--skip-live-1-1'], { stdio: ['ignore', 'pipe', 'pipe'] });
const rest = parseCsv(fs.readFileSync(restPath, 'utf8').slice(1));
ok('  --skip-live-1-1 writes exactly the 68 that are not live yet', rest.length === 69, rest.length);
ok('  and omits both already-published handles',
  rest.slice(1).every((r) => !ALREADY_LIVE.has(r[0])));

// ── 7. The refusal works ─────────────────────────────────────────────────────
section('7. The writer refuses rather than shipping a partial sheet');
const liveJson = path.join(tmp, 'live.json');
fs.writeFileSync(liveJson, JSON.stringify({
  data: { pages: { nodes: [{ handle: 'ap-csp-topic-2-1-exercise-1', title: 'Somebody else' }] } },
}));
let refused = false, refusalText = '';
try {
  execFileSync(process.execPath, [script, path.join(tmp, 'nope.csv'), '--live', liveJson],
    { stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  refused = true;
  refusalText = String(e.stderr || '');
}
ok('  a collision with a page nobody meant to touch aborts the write', refused);
ok('  the refusal names the handle and the live title',
  refusalText.includes('ap-csp-topic-2-1-exercise-1') && refusalText.includes('Somebody else'),
  refusalText.slice(0, 160));
ok('  no partial sheet is left behind', !fs.existsSync(path.join(tmp, 'nope.csv')));

// A collision on the two already-live handles is expected, not fatal.
const liveOk = path.join(tmp, 'live-ok.json');
fs.writeFileSync(liveOk, JSON.stringify({
  data: { pages: { nodes: [...ALREADY_LIVE].map((h) => ({ handle: h, title: 'ours' })) } },
}));
let acceptedOwn = true;
try {
  execFileSync(process.execPath, [script, path.join(tmp, 'own.csv'), '--live', liveOk],
    { stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) { acceptedOwn = false; }
ok('  but the two pages we published ourselves are not treated as strangers', acceptedOwn);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
