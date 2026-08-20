'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the CSA debugging exercise pages and their Matrixify sheet.
//
//  Same three failure classes as smoke/csa-exercise-2-pages.js and
//  smoke/csa-exercise-pages.js, applied to the new `debug` item id:
//  1. Handle routing to the right (course, unit, lesson, activity_type).
//  2. The page contract (editor present, Run and Submit both wired).
//  3. The CSV round trip, parsed back with a real RFC 4180 reader.
//
//  Plus the two checks specific to a debugging exercise:
//  4. The buggy starter actually fails at least one case (there is a REAL bug
//     to find, not a cosmetic one), while the reference (fixed) solution
//     passes every case, both checked against a real javac/java.
//  5. No consecutive pair of FIXED-only lines leaks onto the page.
//
//  Needs a local JDK for section 4. Skips that section with a clear note if
//  none is on PATH, same posture as smoke/csa-exercise-pages.js.
//
//  Run: npm run smoke:csadebug
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages } = require('../lib/csa-debug-pages');
const { checkNoLeak } = require('../scripts/csa-debug-pages-csv');
const { PUBLISHED_AT } = require('../scripts/csa-debug-pages-csv');
const { COURSES, pageFromHandle } = require('../utils');
const debugExercises = require('../seed/csa-debug-exercises');

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
const CSA = COURSES['ap-csa'].units;
const banks = debugExercises.all();

section('1. Coverage against the authored bank');
ok('1.1 one page per authored debug exercise', pages.length === banks.length, { built: pages.length, banks: banks.length });
ok('1.2 every bank lesson exists in COURSES',
  banks.every((x) => CSA[x.unit] && CSA[x.unit].lessons.includes(x.lesson)));
ok('1.3 every unit touched declares debug in COURSES',
  banks.every((x) => CSA[x.unit].activities.includes('debug')),
  banks.filter((x) => !CSA[x.unit].activities.includes('debug')).map((x) => x.unit));
ok('1.4 handles are unique', new Set(pages.map((p) => p.handle)).size === pages.length);
ok('1.5 debug is denominated in course_denominators seed for every CSA lesson', (() => {
  const manifest = require('../seed/csa-course-manifest').manifest;
  return manifest.length > 0 && manifest.every((row) => row.denominators.debug === 1);
})());

section('2. Handle routing');
for (const p of pages) {
  const r = pageFromHandle(p.handle);
  ok(`2.${p.lesson} routes to ${p.lesson} debug`,
    !!r && r.course === 'ap-csa' && r.unit === p.unit && r.lesson === p.lesson && r.activity_type === 'debug', r);
}

section('3. The page contract');
for (const p of pages) {
  ok(`3.${p.lesson} carries the wrapper the grade call reads context from`,
    p.bodyHtml.includes('data-course="ap-csa"') && p.bodyHtml.includes(`data-activity="debug"`));
  ok(`3.${p.lesson} has an editor, a Run target and a grade target`,
    p.bodyHtml.includes('id="x1-code"') && p.bodyHtml.includes('/api/judge0/run') && p.bodyHtml.includes('/api/student/code-grade'));
  ok(`3.${p.lesson} the starter is recoverable, so Reset cannot leave a student with nothing`,
    p.bodyHtml.includes('id="x1-starter"'));
  const h1s = (p.bodyHtml.match(/<h1[\s>]/g) || []).length;
  ok(`3.${p.lesson} has exactly one h1`, h1s === 1, h1s);
  ok(`3.${p.lesson} no attribute carries &quot;`, !/="[^"]*&quot;/.test(p.bodyHtml));
  ok(`3.${p.lesson} body is pure ASCII`, /^[\x09\x0A\x0D\x20-\x7E]*$/.test(p.bodyHtml));
}

section('4. No answer on the page');
{
  const expected = require(debugExercises.EXPECTED_FILE).cases;
  const byLesson = new Map(banks.map((x) => [x.lesson, x]));
  for (const p of pages) {
    const bad = checkNoLeak(p, byLesson.get(p.lesson), expected);
    ok(`4.${p.lesson} no solution, hidden case or fixed-only line leaks`, bad.length === 0, bad);
  }
  // The leak detector must actually be able to fail, or it is decoration.
  const fake = { ...pages[0], bodyHtml: pages[0].bodyHtml + '\n' + banks[0].reference };
  const caught = checkNoLeak(fake, banks[0], expected);
  ok('4.x the leak check catches a reference solution pasted into a body', caught.length > 0);
}

section('5. The buggy starter has a REAL bug, checked against a real javac and java');
{
  let haveJdk = true;
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore' });
    execFileSync('java', ['-version'], { stdio: 'ignore' });
  } catch (_) { haveJdk = false; }

  if (!haveJdk) {
    console.log('  [SKIP] no javac/java on PATH; section 5 needs a real JDK');
  } else {
    const { verifyOne } = require('../scripts/verify-csa-debug-exercises');
    for (const x of banks) {
      const problems = [];
      verifyOne(x, problems);
      ok(`5.${x.lesson} reference compiles, runs, and the buggy starter fails at least one case`,
        problems.length === 0, problems);
    }
  }
}

section('6. The Matrixify sheet survives a round trip');
{
  const tmp = path.join(os.tmpdir(), `csa-debug-smoke-${Date.now()}.csv`);
  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'csa-debug-pages-csv.js'), tmp], { stdio: 'pipe' });
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
