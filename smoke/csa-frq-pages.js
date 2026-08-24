'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the CSA FRQ practice pages and their Matrixify sheet.
//
//  Same three failure classes as smoke/csa-debug-pages.js, applied to the FRQ
//  bank and its `exercise-3` item id:
//  1. Handle routing to the right (course, unit, lesson, activity_type).
//  2. The page contract (editor present, Run and Submit both wired).
//  3. The CSV round trip, parsed back with a real RFC 4180 reader.
//
//  Plus the checks specific to an FRQ:
//  4. The rubric is intact end to end: exactly four parts, every part has a
//     case behind it, and the page renders all four.
//  5. The item routes to exercise-3 and that column is DECLARED in COURSES for
//     every unit the bank touches, or the page grades into a column no
//     gradebook renders.
//  6. Nothing from the reference solution, and no hidden case, is on the page.
//
//  This suite is offline: it never compiles Java. Proving the references run is
//  scripts/verify-csa-frq.js's job, and it does it against real javac. What is
//  checked here is that the generated expectations EXIST for every case, so a
//  page can never be built from a bank whose outputs were never generated.
//
//  Run: npm run smoke:csafrq
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages } = require('../lib/csa-frq-pages');
const { checkPage, checkNoLeak, checkHandleRouting, PUBLISHED_AT } = require('../scripts/csa-frq-pages-csv');
const { COURSES, pageFromHandle } = require('../utils');
const bank = require('../seed/csa-frq');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

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

const pages = allPages();
const entries = bank.all();
const expected = require(bank.EXPECTED_FILE).cases;

console.log(`CSA FRQ pages smoke: ${pages.length} page(s)`);

section('1. The bank is whole');
{
  ok('1.1 at least one FRQ is authored', entries.length > 0, entries.length);
  ok('1.2 one page per bank entry', pages.length === entries.length,
    { pages: pages.length, entries: entries.length });
  ok('1.3 every lesson appears at most once',
    new Set(entries.map((x) => x.lesson)).size === entries.length);

  const missing = [];
  for (const x of entries) {
    x.cases.forEach((c, i) => {
      if (!(bank.caseKey(x.lesson, i) in expected)) missing.push(`${x.lesson} case ${i}`);
    });
  }
  ok('1.4 every case has a generated expected output, so no page is built from an unverified bank',
    missing.length === 0, missing.slice(0, 5));

  // Every lesson in the bank must be a real lesson of the 4-unit CED.
  const cfg = COURSES['ap-csa'].units;
  const unknown = entries.filter((x) => !cfg[x.unit] || !cfg[x.unit].lessons.includes(x.lesson));
  ok('1.5 every FRQ lesson exists in the 2025-2026 four-unit CED',
    unknown.length === 0, unknown.map((x) => `${x.unit} ${x.lesson}`));
}

section('2. The rubric survives from bank to page');
{
  ok('2.1 every entry declares exactly four parts', entries.every((x) => x.parts.length === 4));

  const uncovered = [];
  for (const x of entries) {
    const parts = new Set(x.cases.map((c) => c.part));
    for (let p = 1; p <= 4; p++) if (!parts.has(p)) uncovered.push(`${x.lesson} part ${p}`);
  }
  ok('2.2 every rubric part has at least one case behind it, so four of four means four of four',
    uncovered.length === 0, uncovered.slice(0, 5));

  ok('2.3 every page renders all four rubric rows',
    pages.every((p) => (p.bodyHtml.match(/class="plabel"/g) || []).length === 4));

  ok('2.4 every entry names a real AP FRQ question type',
    entries.every((x) => bank.FRQ_TYPES.includes(x.frqType)));
}

section('3. Routing lands in the gradebook column the page claims');
{
  const routingProblems = pages.map((p) => checkHandleRouting(p)).filter(Boolean);
  ok('3.1 every handle routes to ap-csa exercise-3 at the right unit and lesson',
    routingProblems.length === 0, routingProblems.slice(0, 4));

  ok('3.2 every handle ends in -frq, the student-facing name',
    pages.every((p) => p.handle.endsWith('-frq')));

  // The alias is only useful if the column it aliases to is declared. A page
  // that grades into an undeclared activity is invisible in every gradebook.
  const undeclared = [];
  for (const p of pages) {
    const acts = COURSES['ap-csa'].units[p.unit].activities || [];
    if (!acts.includes('exercise-3')) undeclared.push(p.unit);
  }
  ok('3.3 exercise-3 is declared in COURSES for every unit the bank touches',
    undeclared.length === 0, Array.from(new Set(undeclared)));

  ok('3.4 the -frq alias did not reclassify the other activity handles',
    pageFromHandle('ap-csa-lesson-1-1-intro-algorithms-exercise-1').activity_type === 'exercise-1'
    && pageFromHandle('ap-csa-lesson-4-4-array-traversals-debug').activity_type === 'debug');
}

section('4. The page contract');
{
  const problems = [];
  for (const p of pages) for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
  ok('4.1 every page passes the publish checks (editor, Run, Submit, one h1, SEO, ASCII)',
    problems.length === 0, problems.slice(0, 5));

  ok('4.2 every page carries the data attributes the reporter reads',
    pages.every((p) => p.bodyHtml.includes('data-activity-type="exercise-3"')
      && p.bodyHtml.includes('data-lesson-id=')));

  ok('4.3 every page says how it is scored rather than implying a human reader',
    pages.every((p) => p.bodyHtml.includes('not how a human AP reader marks a rubric')));
}

section('5. Nothing leaks');
{
  const byLesson = new Map(entries.map((x) => [x.lesson, x]));
  const problems = [];
  for (const p of pages) {
    for (const c of checkNoLeak(p, byLesson.get(p.lesson), expected)) problems.push(`${p.handle}: ${c}`);
  }
  ok('5.1 no reference line and no hidden case appears on any page',
    problems.length === 0, problems.slice(0, 5));

  ok('5.2 every entry has a hidden case whose input differs from every visible one',
    entries.every((x) => {
      const inputOf = (c) => String(x.mode === 'segment' ? (c.prelude || '') : (c.stdin || ''));
      const visible = new Set(x.cases.filter((c) => !c.hidden).map(inputOf));
      return x.cases.some((c) => c.hidden && !visible.has(inputOf(c)));
    }));
}

section('6. The Matrixify sheet survives a round trip');
{
  const tmp = path.join(os.tmpdir(), `csa-frq-smoke-${process.pid}.csv`);
  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'csa-frq-pages-csv.js'), tmp], { stdio: 'pipe' });
  const raw = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);

  ok('6.1 the BOM is written', raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF);
  const text = raw.toString('utf8').slice(1);
  const rows = parseCsv(text.replace(/\r\n$/, ''));
  const header = rows[0];
  const dataRows = rows.slice(1);

  ok('6.2 one row per page', dataRows.length === pages.length, { rows: dataRows.length, pages: pages.length });
  ok('6.3 every row is MERGE, so a re-run repairs rather than duplicates',
    dataRows.every((r) => r[header.indexOf('Command')] === 'MERGE'));
  ok('6.4 Published At is the fixed past date, never a drifting now()',
    dataRows.every((r) => r[header.indexOf('Published At')] === PUBLISHED_AT));
  ok('6.5 no Body HTML cell is empty', dataRows.every((r) => r[header.indexOf('Body HTML')].length > 0));

  const byHandle = new Map(pages.map((p) => [p.handle, p]));
  ok('6.6 every body survives the round trip byte for byte',
    dataRows.every((r) => {
      const p = byHandle.get(r[header.indexOf('Handle')]);
      return p && r[header.indexOf('Body HTML')] === p.bodyHtml;
    }));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
