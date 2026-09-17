'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the 2026 AP CSA FRQ pages, their sheet, and the rules that gate it.
//
//  Three things get checked, and the third is the one that makes the other two
//  worth anything:
//
//  1. The pages. Point totals, rubric arithmetic, structured data, the reveal
//     panel, the link set, the prose conventions.
//  2. The sheet. Written, parsed back with a reader that shares no code with
//     the writer, diffed cell by cell.
//  3. MUTATION. Every rule in scripts/csa-past-frq-pages-csv.js is broken on
//     purpose, one at a time, and the rule that is supposed to catch it must
//     fire BY NAME. A suite that goes red for a different rule is telling you
//     the rule you meant to test is hollow, and two guards in this repo were
//     found hollow exactly that way.
//
//  Offline. Running the Java is scripts/verify-csa-2026-frq.js's job and it
//  uses real javac; nothing here compiles anything.
//
//  Run: npm run smoke:csa2026frq
// -----------------------------------------------------------------------------

const fs = require('fs');
const os = require('os');
const path = require('path');

const renderer = require('../lib/csa-past-frq-pages');
const sheet = require('../scripts/csa-past-frq-pages-csv');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
}
function section(t) { console.log('\n' + t); }

const spec = renderer.spec;
const pages = renderer.pages();
const questions = pages.filter((p) => !p.isHub);
const hub = pages.find((p) => p.isHub);

console.log('2026 CSA FRQ pages smoke: ' + pages.length + ' page(s)');

// -- 1  THE CANONICAL DATA ---------------------------------------------------
section('1. the canonical data');
ok('four questions', spec.questions.length === 4, spec.questions.length);
ok('point totals are 7, 7, 5 and 6', spec.questions.map((q) => q.points).join(',') === '7,7,5,6',
  spec.questions.map((q) => q.points));
ok('section total is 25', spec.questions.reduce((n, q) => n + q.points, 0) === spec.exam.sectionTwoPoints);
ok('every question\'s parts add up to its total',
  spec.questions.every((q) => q.parts.reduce((n, p) => n + p.points, 0) === q.points),
  spec.questions.map((q) => q.number + ':' + q.parts.reduce((n, p) => n + p.points, 0) + '/' + q.points));
ok('every rubric\'s criteria add up to its total',
  spec.questions.every((q) => q.rubric.reduce((n, r) => n + r.points, 0) === q.points),
  spec.questions.map((q) => q.number + ':' + q.rubric.reduce((n, r) => n + r.points, 0) + '/' + q.points));
ok('every part has a model solution',
  spec.questions.every((q) => q.parts.every((p) => (q.modelSolution[p.label] || q.modelSolution['']) && (q.modelSolution[p.label] || q.modelSolution['']).length > 30)));
ok('the four question types are the four College Board names',
  spec.questions.map((q) => q.typeLabel).join(' | ')
    === 'Methods and Control Structures | Class Design | Data Analysis with ArrayList | 2D Array');
ok('section weightings add to 100', spec.exam.sectionOnePercent + spec.exam.sectionTwoPercent === 100);
ok('both source PDFs carry a sha256 and a length',
  spec.sources.filter((s) => /pdf/.test(s.id)).every((s) => /^[0-9a-f]{64}$/.test(s.sha256) && s.bytes > 0));
ok('every question names the PDF page its prompt starts on',
  spec.questions.every((q) => Number.isInteger(q.pdfPage) && q.pdfPage > 0));
ok('no alternate solution carries a unicode dash where an operator belongs',
  !JSON.stringify(spec).match(/[‐-―]/),
  (JSON.stringify(spec).match(/[‐-―]/g) || []).length);

// -- 2  THE PAGES ------------------------------------------------------------
section('2. the pages');
ok('five pages: four questions and a year index', pages.length === 5 && questions.length === 4 && !!hub);
ok('handles are ap-csa-2026-frq-N-slug',
  questions.every((p, i) => p.handle === 'ap-csa-2026-frq-' + (i + 1) + '-' + spec.questions[i].slug),
  questions.map((p) => p.handle));
ok('the index handle matches the archive\'s 22 year hubs', hub.handle === 'ap-csa-frq-2026');
ok('no title lowercases an acronym', pages.every((p) => !/\bFrq\b/.test(p.title) && !/^Ap Csa/.test(p.title)),
  pages.map((p) => p.title));
ok('every SEO description is 70 to 160 characters',
  pages.every((p) => p.metaDescription.length >= 70 && p.metaDescription.length <= 160),
  pages.map((p) => p.handle + ':' + p.metaDescription.length));
ok('every page body is pure ASCII', pages.every((p) => !/[^\x00-\x7F]/.test(p.body)));
ok('no page carries an em-dash', pages.every((p) => !/—|&mdash;|&#8212;/.test(p.body)));
ok('every page carries exactly three JSON-LD blocks and all of them parse',
  pages.every((p) => {
    const bs = p.body.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
    if (bs.length !== 3) return false;
    return bs.every((b) => { try { JSON.parse(b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')); return true; } catch (e) { return false; } });
  }));
ok('every question page prints its own point total and never 9',
  questions.every((p, i) => {
    const vis = p.body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<details class="frq-2026-callout"[\s\S]*?<\/details>/i, ' ');
    return vis.indexOf(spec.questions[i].points + '-Point Rubric for') >= 0 && !/\b9[- ]point\b/i.test(vis);
  }));
ok('every question page carries the 2026 point-structure callout',
  questions.every((p) => /<details class="frq-2026-callout"/.test(p.body)));
ok('every question page carries a per-part editor',
  questions.every((p, i) => (p.body.match(/<textarea /g) || []).length === spec.questions[i].parts.length),
  questions.map((p) => (p.body.match(/<textarea /g) || []).length));
ok('no page offers a Run button, because Bluebook has none',
  pages.every((p) => !/>\s*Run\b/.test(p.body.replace(/<script[\s\S]*?<\/script>/gi, ' '))));
ok('every question page prints the given code as text, not only as a PDF',
  questions.every((p, i) => p.body.indexOf(renderer.esc(spec.questions[i].given.split('\n')[0])) >= 0));
ok('every question page embeds the College Board PDF at its own page anchor',
  questions.every((p, i) => p.body.indexOf('ap26-frq-computer-science-a.pdf#page=' + spec.questions[i].pdfPage) >= 0));

// -- 3  THE ANSWER IS BEHIND THE REVEAL --------------------------------------
section('3. nothing is given away above the reveal panel');
for (const p of questions) {
  const q = p.question;
  const at = p.body.indexOf('id="frq2026q' + q.number + '-sol"');
  const above = at < 0 ? p.body : p.body.slice(0, at);
  const sol = Object.values(q.modelSolution).join('\n');
  const lines = sol.split('\n').map((s) => s.trim())
    .filter((s) => s.length > 12 && !/^[{}]/.test(s) && !/^public |^\/\*|^\*|^\/\//.test(s));
  const leaked = lines.filter((l) => above.indexOf(renderer.esc(l)) >= 0);
  ok('FRQ ' + q.number + ': none of its ' + lines.length + ' solution lines appear above the reveal', leaked.length === 0, leaked.slice(0, 2));
}
ok('the reveal panel is collapsed until a button opens it',
  questions.every((p) => /class="frq-collapsible-content" id="frq2026q\d-sol"/.test(p.body)
    && /classList.add\('open'\)/.test(p.body)));

// -- 4  THE FAQ IS NOT ONE TEMPLATE ------------------------------------------
section('4. the FAQ differs page to page');
const qs = [], as = [];
for (const p of pages) {
  const blocks = p.body.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    let o; try { o = JSON.parse(b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')); } catch (e) { continue; }
    if (o['@type'] !== 'FAQPage') continue;
    for (const e of o.mainEntity) { qs.push(e.name); as.push(e.acceptedAnswer.text); }
  }
}
ok('every FAQ question is unique across the set', new Set(qs).size === qs.length, qs.length + ' questions, ' + new Set(qs).size + ' unique');
ok('every FAQ answer is unique across the set', new Set(as).size === as.length, as.length + ' answers, ' + new Set(as).size + ' unique');
ok('there are at least 20 FAQ entries in total', qs.length >= 20, qs.length);

// -- 5  THE LINK SET ---------------------------------------------------------
section('5. the links');
const live = new Set(fs.readFileSync(path.join(__dirname, 'fixtures', 'live-page-handles.txt'), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean));
const willExist = new Set(pages.map((p) => p.handle));
const deadLinks = [];
for (const p of pages) {
  for (const m of p.body.matchAll(/href="\/pages\/([a-z0-9-]+)"/g)) {
    if (!live.has(m[1]) && !willExist.has(m[1])) deadLinks.push(p.handle + ' -> ' + m[1]);
  }
}
ok('no page links to a handle that is neither live nor in this sheet', deadLinks.length === 0, deadLinks.slice(0, 5));
ok('every question page links to the year index',
  questions.every((p) => p.body.indexOf('/pages/ap-csa-frq-2026') >= 0));
ok('the year index links to all four questions',
  questions.every((p) => hub.body.indexOf('/pages/' + p.handle) >= 0));
ok('no internal link is missing its /pages/ prefix',
  pages.every((p) => !/href="\/ap-csa-/.test(p.body)));

// -- 6  THE SHEET ------------------------------------------------------------
section('6. the Matrixify sheet');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csa26sheet-'));
const csv = sheet.buildCsv(pages);
const dest = path.join(tmp, 'csa-2026-frq-pages.csv');
fs.writeFileSync(dest, csv);
const rows = sheet.parseCsv(fs.readFileSync(dest, 'utf8'));
ok('the sheet carries a BOM', csv.charCodeAt(0) === 0xfeff);
ok('the sheet uses CRLF', csv.indexOf('\r\n') > 0);
ok('every cell is quoted', !/,(?!")/.test(rows.length ? csv.split('\r\n')[0] : ''), csv.split('\r\n')[0]);
ok('header is the eight Matrixify page columns', rows[0].join(',') === sheet.HEADER.join(','), rows[0]);
ok('one row per page plus the header', rows.length === pages.length + 1, rows.length);
ok('Command is MERGE on every row', rows.slice(1).every((r) => r[1] === 'MERGE'));
ok('Published At is past-dated', rows.slice(1).every((r) => r[5] === sheet.PUBLISHED_AT));
let cellDiffs = 0;
pages.forEach((p, n) => {
  const r = rows[n + 1];
  if (r[0] !== p.handle) cellDiffs++;
  if (r[2] !== p.title) cellDiffs++;
  if (r[3] !== p.body) cellDiffs++;
  if (r[7] !== p.metaDescription) cellDiffs++;
});
ok('the file parses back byte for byte into what the renderer produced', cellDiffs === 0, cellDiffs + ' differing cell(s)');
ok('a file name Matrixify cannot place is refused', (() => {
  try { sheet.assertSheetName('csa-2026-canary.csv'); return false; } catch (e) { return /file name must contain/.test(e.message); }
})());
ok('a good file name is accepted', (() => {
  try { sheet.assertSheetName('imports/x/csa-2026-frq-pages.csv'); return true; } catch (e) { return false; }
})());
fs.rmSync(tmp, { recursive: true, force: true });

// -- 7  MUTATION -------------------------------------------------------------
//  Each row breaks ONE thing and names the rule that has to fire. A mutation
//  that goes red for some other reason proves nothing about the rule under
//  test, so the assertion is on the message, not on the count.
section('7. mutation: every rule broken on purpose, and it must fire by name');

//  Code points to a string, so a fixture never has to be typed as characters.
function cp() {
  return String.fromCodePoint.apply(String, Array.prototype.slice.call(arguments));
}

function mutate(fn) {
  const p = JSON.parse(JSON.stringify(questions[0]));
  p.question = spec.questions[0];
  fn(p);
  return sheet.checkPage(p, pages);
}

const MUTATIONS = [
  //  These three fixtures are BUILT from code points rather than typed.
  //  Writing them as characters puts real mojibake and a real em-dash into this
  //  file, and npm run smoke:encoding then reports the repository corrupt on the
  //  strength of its own test data. That happened once here; the bullet below
  //  went in as an escape and came out of the shell as bytes.
  ['non-ASCII byte', (p) => { p.body = p.body.replace('<h2 class="frq-pagetitle">', '<h2 class="frq-pagetitle">' + cp(0xe9)); }, /non-ASCII/],
  ['em-dash', (p) => { p.body = p.body.replace('Worked Solution', 'Worked ' + cp(0x2014) + ' Solution'); }, /em-dash/],
  //  SINGLE pass: a UTF-8 bullet read as cp1252 and re-encoded. This is the
  //  depth actually seen on live pages, and a mutation built only from the
  //  double-pass form goes green against a detector blind to it, which is worse
  //  than no mutation at all.
  ['mojibake, single pass', (p) => { p.body = p.body.replace('Worked Solution', 'Worked ' + cp(0xe2, 0x20ac, 0xa2) + ' Solution'); }, /mojibake/],
  //  DOUBLE pass: the same bullet run through the damage twice. Asserted
  //  separately, because the two depths look nothing alike and a guard can
  //  catch either one while missing the other.
  ['mojibake, double pass', (p) => { p.body = p.body.replace('Worked Solution', 'Worked ' + cp(0xc3, 0xa2, 0xe2, 0x201a, 0xac, 0xc2, 0xa2) + ' Solution'); }, /mojibake/],
  ['mangled title', (p) => { p.title = 'Ap Csa 2026 Frq 1 Account'; }, /title is|lowercases an acronym/],
  //  Same masking, same fix. A mangled title trips the acronym rule AND the
  //  parity rule, so it proves neither on its own. This title is correctly cased
  //  and simply is not the canonical one, which only parity can catch.
  ['a title that drifts from canonical without mangling its casing', (p) => { p.title = '2026 AP CSA FRQ 1: Account Solution and Rubric'; }, /title is .*canonical says/],
  ['a JSON-LD block that does not parse', (p) => { p.body = p.body.replace('{"@context":"https://schema.org","@type":"FAQPage"', '{"@context":,"@type":"FAQPage"'); }, /does not parse/],
  ['an HTML entity inside JSON-LD', (p) => { p.body = p.body.replace('"@type":"LearningResource"', '"@type":"Learning&amp;Resource"'); }, /HTML entity/],
  ['a missing JSON-LD block', (p) => { p.body = p.body.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, ' '); }, /JSON-LD block\(s\), expected 3/],
  ['the answer moved above the reveal', (p) => {
    const line = renderer.esc('username = requestedName + count;');
    p.body = p.body.replace('<h2 class="frq-pagetitle">', '<pre>' + line + '</pre><h2 class="frq-pagetitle">');
  }, /leaks above the reveal panel/],
  ['no reveal panel at all', (p) => { p.body = p.body.replace('id="frq2026q1-sol"', 'id="frq2026q1-nothing"'); }, /no reveal panel/],
  ['a stale 9-point claim', (p) => { p.body = p.body.replace('The Official 7-Point Rubric for', 'The Official 9-Point Rubric for'); }, /prints 9 points|9-point rubric outside/],
  //  The row above accepts EITHER rule, and there are two: the points-parity
  //  loop and the blanket 9-point rule. The blanket one masks the parity one, so
  //  that row alone leaves the parity rule unproven and the deploy gate said so.
  //  8 is wrong and is not 9, so only the parity rule can see it.
  ['a point total that is wrong without being 9', (p) => { p.body = p.body.replace('The Official 7-Point Rubric for', 'The Official 8-Point Rubric for'); }, /prints 8 points where the canonical data says 7/],
  ['a point table missing a question', (p) => { p.body = p.body.replace(/<tr><td>Question 3<\/td>[\s\S]*?<\/tr>/, ' '); }, /point table omits question 3/],
  //  replaceAll, not replace: the phrase also appears inside the FAQ JSON-LD,
  //  which the rule deliberately does not read, so mutating only the first
  //  occurrence would leave the visible text intact and prove nothing.
  ['a dropped section total', (p) => { p.body = p.body.replaceAll('25 points across four questions', '25 points, total'); }, /section total/],
  ['a fabricated per-unit exam weighting', (p) => { p.body = p.body.replace('<div class="frq-meta">', '<div class="frq-meta"><span>Unit 2 is 18% of the exam</span>'); }, /per-unit exam weighting/],
  ['a link to a handle that does not exist', (p) => { p.body = p.body.replace('href="/pages/ap-csa-frq-archive"', 'href="/pages/ap-csa-frq-archiv"'); }, /not a live handle/],
  ['a link missing its /pages/ prefix', (p) => { p.body = p.body.replace('href="/pages/ap-csa-frq-2026"', 'href="/ap-csa-frq-2026"'); }, /missing the \/pages\/ prefix/],
  ['an unbalanced pre element', (p) => { p.body = p.body.replace('</pre>', ' '); }, /unbalanced <pre>/],
  ['a missing wrapper div', (p) => { p.body = p.body.replace('<div id="frq2026q1">', '<div>'); }, /no unique wrapper div/],
  ['a missing all:initial reset', (p) => { p.body = p.body.replace(/all:\s*initial\s*!important/g, 'all:unset'); }, /all:initial reset/],
  ['a missing generated-file note', (p) => { p.body = p.body.replace(/^<!--[\s\S]*?-->/, ' '); }, /generated-file note/],
];

for (const [name, fn, want] of MUTATIONS) {
  const found = mutate(fn);
  const hit = found.some((m) => want.test(m));
  ok('caught: ' + name, hit, hit ? undefined : (found.length ? found : 'NOTHING FIRED'));
}

//  Two controls. An edit that changes nothing a rule is about must NOT go red,
//  or every row above is passing on a rule that fires at anything. The second
//  one is the shape that caught a real over-strict rule: the wrapper check used
//  to demand `<div id="...">` byte for byte and went red on an extra space.
const control1 = mutate((p) => { p.body = p.body + '\n'; });
ok('control: a trailing newline stays green', control1.length === 0, control1);
const control2 = mutate((p) => { p.body = p.body.replace('<div id="frq2026q1">', '<div  id="frq2026q1" >'); });
ok('control: whitespace inside the wrapper tag stays green', control2.length === 0, control2);

//  And the unmutated set has to be clean, which is what makes a red row above
//  mean something.
const clean = [];
for (const p of pages) for (const m of sheet.checkPage(p, pages)) clean.push(p.handle + ': ' + m);
for (const m of sheet.checkSet(pages)) clean.push(m);
ok('the real pages pass every rule', clean.length === 0, clean.slice(0, 6));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
