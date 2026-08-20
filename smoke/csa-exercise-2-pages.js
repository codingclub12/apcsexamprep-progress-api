'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the CSA exercise-2 applied MCQ pages and their Matrixify sheet.
//
//  WHAT IS BEING PROTECTED, same three failure classes as smoke/csp-course-pages.js:
//
//  1. THE ACTIVITY A PAGE REPORTS AS. Every item declares data-activity off
//     itself rather than a shared handler hardcoding 'quiz', and the handler
//     (csaX2, not the lesson pages' shared checkMCQ) reads it from there.
//  2. THE HANDLE ROUTING. An exercise-2 handle has to parse back to
//     activity_type exercise-2, on the right course/unit/lesson.
//  3. THE CSV ITSELF, parsed back with a real RFC 4180 reader and every body
//     compared byte for byte against what the renderer produced.
//
//  Also checks the answer-key rotation this file exists because of: the
//  authored bank puts 33 of 36 correct answers on option B (a fact, checked
//  against the data, not assumed), and the renderer has to actually balance
//  that at render time rather than ship the skew.
//
//  Run: npm run smoke:csax2pages
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages, esc } = require('../lib/csa-exercise-2-pages');
const { PUBLISHED_AT } = require('../scripts/csa-exercise-2-pages-csv');
const { COURSES, pageFromHandle } = require('../utils');
const { banks } = require('../seed/csa-exercise-2');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// A real RFC 4180 reader, deliberately not a split on commas.
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

section('1. Coverage against the authored banks');
ok('1.1 one page per authored bank', pages.length === banks.length, { built: pages.length, banks: banks.length });
ok('1.2 every bank lesson exists in COURSES',
  banks.every((b) => CSA[b.unit] && CSA[b.unit].lessons.includes(b.lesson)),
  banks.filter((b) => !(CSA[b.unit] && CSA[b.unit].lessons.includes(b.lesson))).map((b) => b.lesson));
ok('1.3 every unit touched still declares exercise-2 in COURSES',
  banks.every((b) => CSA[b.unit].activities.includes('exercise-2')),
  banks.filter((b) => !CSA[b.unit].activities.includes('exercise-2')).map((b) => b.unit));
ok('1.4 handles are unique', new Set(pages.map((p) => p.handle)).size === pages.length);

section('2. Handle routing');
for (const p of pages) {
  const r = pageFromHandle(p.handle);
  ok(`2.${p.lesson} routes to ${p.lesson} exercise-2`,
    !!r && r.course === 'ap-csa' && r.unit === p.unit && r.lesson === p.lesson && r.activity_type === 'exercise-2',
    r);
}

section('3. The page contract');
for (const p of pages) {
  ok(`3.${p.lesson} carries the lesson-page wrapper the reporter reads context from`,
    p.bodyHtml.includes(`data-course="ap-csa"`) && p.bodyHtml.includes(`data-lesson="${p.lesson}"`));
  ok(`3.${p.lesson} declares activity exercise-2 on every item, never quiz`,
    p.bodyHtml.includes('data-activity="exercise-2"') && !p.bodyHtml.includes(`activity:'quiz'`) && !p.bodyHtml.includes('activity: "quiz"'));
  const h1s = (p.bodyHtml.match(/<h1[\s>]/g) || []).length;
  ok(`3.${p.lesson} has exactly one h1`, h1s === 1, h1s);
  const opens = (p.bodyHtml.match(/<script[\s>]/g) || []).length;
  const closes = (p.bodyHtml.match(/<\\?\/script>/g) || []).length;
  ok(`3.${p.lesson} script tags balance`, opens === closes, { opens, closes });
  ok(`3.${p.lesson} no attribute carries &quot;`, !/="[^"]*&quot;/.test(p.bodyHtml));
  ok(`3.${p.lesson} body is pure ASCII`, /^[\x09\x0A\x0D\x20-\x7E]*$/.test(p.bodyHtml));
}

section('4. Question count matches the authored bank exactly');
const byLesson = new Map(banks.map((b) => [b.lesson, b]));
for (const p of pages) {
  const bank = byLesson.get(p.lesson);
  const rendered = (p.bodyHtml.match(/class="mcq-item"/g) || []).length;
  ok(`4.${p.lesson} renders ${bank.questions.length} of ${bank.questions.length} questions`, rendered === bank.questions.length, rendered);
}

section('5. The answer key is balanced, not clustered on one letter');
{
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const p of pages) {
    for (const m of p.bodyHtml.matchAll(/csaX2\('x2-\d+','([A-D])','([A-D])'/g)) {
      if (m[1] === m[2]) counts[m[1]]++;
    }
  }
  const max = Math.max(...Object.values(counts));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  ok('5.1 every option letter is used', Object.values(counts).every((n) => n > 0), counts);
  ok('5.2 no single letter carries more than half the correct answers', max <= total / 2, counts);
  ok('5.3 the authored bank itself is the skewed one this exists to fix',
    banks.reduce((n, b) => n + b.questions.filter((q) => q.correct === 'B').length, 0) > total / 2);
}

section('6. Assembly is deterministic');
{
  const first = allPages();
  const second = allPages();
  ok('6.1 rendering the same bank twice produces byte-identical HTML',
    first.every((p, i) => p.bodyHtml === second[i].bodyHtml));
}

section('7. The Matrixify sheet survives a round trip');
{
  const tmp = path.join(os.tmpdir(), `csa-x2-smoke-${Date.now()}.csv`);
  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'csa-exercise-2-pages-csv.js'), tmp], { stdio: 'pipe' });
  const raw = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);

  ok('7.1 the BOM is written', raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF);
  const text = raw.toString('utf8').slice(1);
  const rows = parseCsv(text.replace(/\r\n$/, ''));
  const header = rows[0];
  const dataRows = rows.slice(1);

  ok('7.2 one row per page', dataRows.length === pages.length, { rows: dataRows.length, pages: pages.length });
  ok('7.3 the expected columns are present',
    JSON.stringify(header) === JSON.stringify(['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At', 'SEO Title', 'SEO Description']));

  const idx = (name) => header.indexOf(name);
  ok('7.4 every row is MERGE, so a re-run repairs rather than duplicates',
    dataRows.every((r) => r[idx('Command')] === 'MERGE'));
  ok('7.5 Published At is the fixed past date, never a drifting now()',
    dataRows.every((r) => r[idx('Published At')] === PUBLISHED_AT));
  ok('7.6 no Body HTML cell is empty', dataRows.every((r) => r[idx('Body HTML')].length > 0));

  const byHandle = new Map(pages.map((p) => [p.handle, p]));
  ok('7.7 every body survives the round trip byte for byte',
    dataRows.every((r) => {
      const p = byHandle.get(r[idx('Handle')]);
      return p && r[idx('Body HTML')] === p.bodyHtml;
    }));
  ok('7.8 titles and SEO fields survive the round trip',
    dataRows.every((r) => {
      const p = byHandle.get(r[idx('Handle')]);
      return p && r[idx('Title')] === p.title && r[idx('SEO Title')] === p.seoTitle && r[idx('SEO Description')] === p.seoDescription;
    }));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
