'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the 53 CSP course pages and their Matrixify sheet.
//
//  WHAT IS BEING PROTECTED
//  Three failures, each of which is silent until it is expensive:
//
//  1. THE ACTIVITY A PAGE REPORTS AS. The lesson pages' shared checkMCQ
//     hardcodes activity:'quiz' in the event it dispatches. If an exercise-2
//     page ever picked that handler up, every answer would be filed under the
//     lesson's real QUIZ rollup and corrupt a grade a teacher is using. So this
//     suite asserts the page never contains a hardcoded quiz activity and that
//     the handler reads data-activity off the item instead.
//
//  2. THE HANDLE ROUTING. An exercise-2 handle has to parse back to
//     activity_type exercise-2, and a notes handle has to parse back to its
//     PARENT lesson as a visit. Notes are ungraded reference; a notes handle
//     that minted its own lesson id is a bug utils.js already had to fix once.
//
//  3. THE CSV ITSELF. The sheet is read only by Matrixify, which reports
//     success on a sheet that silently truncated a body at the first stray
//     quote. So it is generated and PARSED BACK with a real RFC 4180 reader and
//     every body compared byte for byte against what the renderer produced.
//
//  It also pins the import settings that destroy content rather than erroring:
//  MERGE, a past-dated Published At, and a Body HTML cell that is never empty.
//  An empty Body HTML wipes the live page and Matrixify calls that a success.
//
//  WHAT THIS SUITE CANNOT PROVE, and where that proof came from instead: that
//  the deployed assets/ap-csp-reporter.js actually posts exercise-2 for a real
//  click. That needs a browser, and it was verified once against the deployed
//  reporter on 2026-08-17 (see docs/runs/2026-08-17-claude-code-csp-course-pages.md).
//  What is checked here is the contract that verification depended on.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:csppages
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages, esc } = require('../lib/csp-course-pages');
const { PUBLISHED_AT } = require('../scripts/csp-pages-csv');
const { COURSES, pageFromHandle } = require('../utils');
const BANKS = require('../seed/csp-exercise-2');
const NOTES = require('../seed/csp-bi3-notes');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

//  RUN THE GENERATOR AND REPORT WHAT IT DID, without letting a non-zero exit
//  throw past the assertion that is meant to read it.
//
//  This used to be a bare execFileSync in section 7, and a refusal there KILLED
//  THE PROCESS: every assertion after it silently never ran. The deploy gate
//  found it, exactly as its own header warns. A mutation that makes the renderer
//  emit a CED code was caught by the crash rather than by the guard it targets,
//  so the guard read as proven while being unreachable.
const script = path.join(__dirname, '..', 'scripts', 'csp-pages-csv.js');
function run(args) {
  try {
    const out = execFileSync(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, text: String(out) };
  } catch (e) {
    return { ok: false, text: String(e.stdout || '') + String(e.stderr || '') };
  }
}

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

const pages = allPages();
const x2 = pages.filter((p) => p.kind === 'exercise-2');
const notes = pages.filter((p) => p.kind === 'notes');
const CSP = COURSES['ap-csp'].units;

section('1. Coverage against the course config');
const allSlugs = Object.values(CSP).flatMap((u) => u.lessons);
ok('1.1 one exercise-2 page per CSP topic', x2.length === allSlugs.length, { built: x2.length, topics: allSlugs.length });
ok('1.2 exercise-2 covers every topic in COURSES',
  allSlugs.every((s) => x2.some((p) => p.slug === s)),
  allSlugs.filter((s) => !x2.some((p) => p.slug === s)));
ok('1.3 one notes page per Big Idea 3 topic', notes.length === CSP['bi-3'].lessons.length,
  { built: notes.length, topics: CSP['bi-3'].lessons.length });
ok('1.4 notes cover every Big Idea 3 topic and nothing else',
  notes.every((p) => p.unit === 'bi-3') && CSP['bi-3'].lessons.every((s) => notes.some((p) => p.slug === s)),
  notes.filter((p) => p.unit !== 'bi-3').map((p) => p.handle));
// exercise-2 is declared for all five Big Ideas in utils.js. That declaration is
// the promise these pages exist to keep, so it is asserted rather than assumed.
ok('1.5 every unit still declares exercise-2 in COURSES',
  Object.values(CSP).every((u) => u.activities.includes('exercise-2')),
  Object.entries(CSP).filter(([, u]) => !u.activities.includes('exercise-2')).map(([k]) => k));
ok('1.6 handles are unique across the whole build',
  new Set(pages.map((p) => p.handle)).size === pages.length);

section('2. Handle routing');
for (const p of x2) {
  const r = pageFromHandle(p.handle);
  if (!r || r.activity_type !== 'exercise-2' || r.lesson !== p.slug || r.unit !== p.unit || r.course !== 'ap-csp') {
    ok(`2.x ${p.handle} routes to exercise-2 on its own lesson`, false, r);
  }
}
ok('2.1 all 35 exercise-2 handles route to activity_type exercise-2',
  x2.every((p) => {
    const r = pageFromHandle(p.handle);
    return r && r.course === 'ap-csp' && r.activity_type === 'exercise-2' && r.lesson === p.slug && r.unit === p.unit;
  }));
// A notes handle routing as anything but a visit on its parent lesson would
// make reading the notes count as graded work, or mint a phantom lesson column.
ok('2.2 all 18 notes handles route to their parent lesson as a visit',
  notes.every((p) => {
    const r = pageFromHandle(p.handle);
    return r && r.course === 'ap-csp' && r.activity_type === 'lesson' && r.lesson === p.slug;
  }),
  notes.map((p) => [p.handle, pageFromHandle(p.handle)]).filter(([, r]) => !r || r.activity_type !== 'lesson'));

section('3. The reporter contract on an exercise-2 page');
for (const p of x2) {
  const b = p.bodyHtml;
  const items = b.match(/<div class="mcq-item" data-activity="([a-z0-9-]+)" data-item="([a-z0-9-]+)">/g) || [];
  if (items.length !== p.questions) { ok(`3.x ${p.handle} renders every question as an mcq-item`, false, items.length); }
}
ok('3.1 every graded item declares data-activity="exercise-2"',
  x2.every((p) => {
    const acts = [...p.bodyHtml.matchAll(/<div class="mcq-item" data-activity="([a-z0-9-]+)"/g)].map((m) => m[1]);
    return acts.length === p.questions && acts.every((a) => a === 'exercise-2');
  }));
ok('3.2 every page carries the wrapper the reporter reads context from',
  x2.every((p) => new RegExp(`<div id="csp-x2" class="lesson-page" data-course="ap-csp" data-unit="${p.unit}" data-lesson="${p.slug}">`).test(p.bodyHtml)));
// The whole reason this file ships its own handler.
ok('3.3 no page hardcodes a quiz activity in its dispatched event',
  x2.every((p) => !/activity\s*:\s*['"]quiz['"]/.test(p.bodyHtml)),
  x2.filter((p) => /activity\s*:\s*['"]quiz['"]/.test(p.bodyHtml)).map((p) => p.handle));
ok('3.4 the handler reads the activity off the item instead',
  x2.every((p) => p.bodyHtml.includes("activity: item.getAttribute('data-activity')")));
ok('3.5 item ids are unique within a page',
  x2.every((p) => {
    const ids = [...p.bodyHtml.matchAll(/data-item="([a-z0-9-]+)"/g)].map((m) => m[1]);
    return new Set(ids).size === ids.length && ids.length === p.questions;
  }));
// The reporter reads correctness from the class the handler applies, so the
// class names it looks for have to be the ones the page sets.
ok('3.6 the handler applies the correct and incorrect classes the reporter reads',
  x2.every((p) => /'correct'\s*:\s*'incorrect'/.test(p.bodyHtml) || p.bodyHtml.includes("chosen === correct ? 'correct' : 'incorrect'")));
ok('3.7 notes pages carry no lesson-page wrapper and no graded items',
  notes.every((p) => !p.bodyHtml.includes('lesson-page') && !p.bodyHtml.includes('mcq-item')),
  notes.filter((p) => p.bodyHtml.includes('mcq-item')).map((p) => p.handle));

section('4. Question banks');
ok('4.1 every bank slug exists in COURSES', BANKS.every((b) => allSlugs.includes(b.slug)),
  BANKS.filter((b) => !allSlugs.includes(b.slug)).map((b) => b.slug));
ok('4.2 every question has exactly four options', BANKS.every((b) => b.questions.every((q) => q.options.length === 4)));
ok('4.3 every question names a correct letter in range',
  BANKS.every((b) => b.questions.every((q) => ['A', 'B', 'C', 'D'].includes(q.correct))));
ok('4.4 every option has its own written rationale',
  BANKS.every((b) => b.questions.every((q) => ['A', 'B', 'C', 'D'].every((L) => q.why[L] && q.why[L].length >= 25))));
// A key concentrated on one letter is a set a student can pass without reading
// a question, and the first draft of these banks put 183 of 210 answers on B.
// The renderer rotates the options to fix that, so the check has to run on the
// RENDERED page rather than on what the author happened to type.
function renderedKey(p) {
  // The third argument of the onclick is the correct letter for that question.
  const byItem = new Map();
  for (const m of p.bodyHtml.matchAll(/cspX2\('([a-z0-9-]+)','([A-D])','([A-D])'/g)) {
    byItem.set(m[1], m[3]);
  }
  return [...byItem.values()];
}
const letters = { A: 0, B: 0, C: 0, D: 0 };
for (const p of x2) for (const L of renderedKey(p)) letters[L]++;
const totalQ = Object.values(letters).reduce((a, n) => a + n, 0);
ok('4.5 the rendered answer key is spread across all four letters',
  totalQ === 210 && Object.values(letters).every((n) => n >= totalQ * 0.15), letters);
ok('4.6 no page has the same correct letter for every question',
  x2.every((p) => new Set(renderedKey(p)).size > 1),
  x2.filter((p) => new Set(renderedKey(p)).size === 1).map((p) => p.handle));
// Rotation must move the option and its rationale together. If they came apart,
// every distractor would be explained by the wrong paragraph and the page would
// look fine while teaching the opposite of the truth.
let paired = true, pairDetail = null;
for (const p of x2) {
  const bank = BANKS.find((b) => b.slug === p.slug);
  bank.questions.forEach((q, i) => {
    const qid = `x2-${i + 1}`;
    const correct = (p.bodyHtml.match(new RegExp(`cspX2\\('${qid}','[A-D]','([A-D])'`)) || [])[1];
    const optRe = new RegExp(`cspX2\\('${qid}','${correct}','${correct}','[^']*'\\)"><span class="mcq-option-letter">${correct}</span> ([^<]*)</button>`);
    const shownText = (p.bodyHtml.match(optRe) || [])[1];
    const fbRe = new RegExp(`<div id="${qid}-fb-${correct}" class="mcq-feedback correct-fb">Correct\\. ([^<]*)</div>`);
    const shownWhy = (p.bodyHtml.match(fbRe) || [])[1];
    // Compare against the ESCAPED author text, since that is what the page
    // renders: '<-' in AP pseudocode ships as '&lt;-'.
    const wantText = esc(q.options[['A', 'B', 'C', 'D'].indexOf(q.correct)]);
    const wantWhy = esc(q.why[q.correct]);
    if (shownText !== wantText || shownWhy !== wantWhy) {
      paired = false;
      if (!pairDetail) pairDetail = { page: p.handle, qid, shownText, wantText };
    }
  });
}
ok('4.7 rotation keeps each option with its own rationale', paired, pairDetail);
ok('4.8 every notes page has objectives, vocabulary and sections',
  NOTES.every((n) => n.objectives.length && n.vocab.length && n.sections.length && n.exitTicket));

section('5. Encoding and theme hazards');
for (const p of pages) {
  // eslint-disable-next-line no-control-regex
  const nonAscii = p.bodyHtml.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) ok(`5.x ${p.handle} is pure ASCII`, false, nonAscii.slice(0, 3));
}
ok('5.1 every body is pure ASCII',
  // eslint-disable-next-line no-control-regex
  pages.every((p) => !/[^\x09\x0A\x0D\x20-\x7E]/.test(p.bodyHtml)));
ok('5.2 no body contains an em-dash', pages.every((p) => !p.bodyHtml.includes('—')));
ok('5.3 no HTML entity appears inside a script block',
  pages.every((p) => (p.bodyHtml.match(/<script[\s\S]*?<\/script>/g) || [])
    .every((s) => !/&(?:amp|quot|lt|gt|#\d+);/.test(s))));
ok('5.4 no attribute value contains &quot;', pages.every((p) => !/="[^"]*&quot;/.test(p.bodyHtml)));
ok('5.5 no grid uses auto-fit or auto-fill', pages.every((p) => !/auto-fit|auto-fill/.test(p.bodyHtml)));
ok('5.6 every page has exactly one h1',
  pages.every((p) => (p.bodyHtml.match(/<h1[\s>]/g) || []).length === 1));
ok('5.7 every page scopes its CSS under one wrapper id with all:initial',
  pages.every((p) => /#(csp-x2|apcsp-notes)\{all:initial!important/.test(p.bodyHtml)));
// Shopify reverts button and title colours on save, and the text-fill property
// is the one that survives.
ok('5.8 hero titles pin -webkit-text-fill-color',
  pages.every((p) => /h1\{[^}]*-webkit-text-fill-color/.test(p.bodyHtml)));
ok('5.9 answer buttons are type="button" so a form cannot swallow the click',
  x2.every((p) => !/<button (?!type="button")/.test(p.bodyHtml)));

section('6. SEO, at the thresholds our own auditor uses');
ok('6.1 every SEO description is 70 to 160 chars',
  pages.every((p) => p.seoDescription.length >= 70 && p.seoDescription.length <= 160),
  pages.filter((p) => p.seoDescription.length < 70 || p.seoDescription.length > 160)
    .map((p) => [p.handle, p.seoDescription.length]));
ok('6.2 every SEO title is 1 to 70 chars',
  pages.every((p) => p.seoTitle.length >= 1 && p.seoTitle.length <= 70));
ok('6.3 every SEO description is distinct', new Set(pages.map((p) => p.seoDescription)).size === pages.length);

section('7. The Matrixify sheet');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-pages-'));
const out = path.join(tmp, 'all.csv');
const gen = run([out]);
ok('7.0 the generator writes the whole build rather than refusing it', gen.ok,
  gen.text.slice(0, 400));
//  On a refusal, stand in a header-only sheet so the rest of section 7 FAILS as
//  assertions instead of throwing. A dead process reports nothing at all, and
//  nothing at all is indistinguishable from a clean run.
const STUB = '\uFEFF"Handle","Command","Title","Body HTML","Published","Published At",'
  + '"SEO Title","SEO Description"\r\n';
const raw = gen.ok ? fs.readFileSync(out, 'utf8') : STUB;

ok('7.1 the sheet is written with a BOM (utf-8-sig)', raw.charCodeAt(0) === 0xFEFF);
const rows = parseCsv(raw.slice(1)).filter((r) => r.length > 1);
const head = rows[0];
const body = rows.slice(1);
ok('7.2 one row per page', body.length === pages.length, body.length);
ok('7.3 the header carries Body HTML and Published At',
  head.includes('Body HTML') && head.includes('Published At'), head);

const col = (name) => head.indexOf(name);
ok('7.4 every row is MERGE', body.every((r) => r[col('Command')] === 'MERGE'));
ok('7.5 Published At is the fixed past date, never now()',
  body.every((r) => r[col('Published At')] === PUBLISHED_AT) && PUBLISHED_AT < '2026-08',
  PUBLISHED_AT);
ok('7.6 no Body HTML cell is empty, which would wipe the live page',
  body.every((r) => r[col('Body HTML')].length > 1000));

// The reason this suite exists. A quoting bug that eats half a page fails here.
const byHandle = new Map(pages.map((p) => [p.handle, p]));
const mismatched = body.filter((r) => {
  const p = byHandle.get(r[col('Handle')]);
  return !p || r[col('Body HTML')] !== p.bodyHtml;
});
ok('7.7 every body survives the CSV round trip byte for byte', mismatched.length === 0,
  mismatched.slice(0, 3).map((r) => r[col('Handle')]));
ok('7.8 every title survives the round trip',
  body.every((r) => byHandle.get(r[col('Handle')]).title === r[col('Title')]));

section('8. Selecting part of the build');
for (const [flag, value, expected] of [['--kind', 'exercise-2', 35], ['--kind', 'notes', 18], ['--unit', 'bi-3', 36]]) {
  const f = path.join(tmp, `${value}.csv`);
  const r = run([f, flag, value]);
  const n = r.ok
    ? parseCsv(fs.readFileSync(f, 'utf8').slice(1)).slice(1).filter((x) => x.length > 1).length
    : -1;
  ok(`8.x ${flag} ${value} writes ${expected} rows`, n === expected, r.ok ? n : r.text.slice(0, 200));
}

section('9. It refuses to overwrite a live page');
// The safety inversion: these handles are all new, so a handle that already
// exists live means the import would replace a page nobody meant to touch.
const livePath = path.join(tmp, 'live.json');
fs.writeFileSync(livePath, JSON.stringify({
  data: { pages: { nodes: [{ handle: x2[0].handle, title: 'Something already here' }] } },
}));
let refused = false, refusalText = '';
try {
  execFileSync(process.execPath, [script, path.join(tmp, 'nope.csv'), '--live', livePath],
    { stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  refused = true;
  refusalText = String(e.stderr || '');
}
ok('9.1 a colliding handle aborts the write', refused);
ok('9.2 the refusal names the handle and the live title',
  refusalText.includes(x2[0].handle) && refusalText.includes('Something already here'), refusalText.slice(0, 200));
ok('9.3 no partial sheet is left behind', !fs.existsSync(path.join(tmp, 'nope.csv')));

section('10. The denominator gate');
const seed = require('../scripts/seed-csp-denominators');
const denomKeys = new Set(seed.buildRows().map((r) => `${r.lesson}|${r.activity_type}`));
const anyX2 = [...denomKeys].some((k) => k.endsWith('|exercise-2'));
// Seeding a denominator before the pages are live would give every CSP class 35
// columns reading 0 of 6 for work no student could have done. The flag in the
// seed script is what holds that back, so its state is asserted rather than
// left to a reader to notice.
ok('10.1 exercise-2 denominators stay gated until the pages are imported', !anyX2,
  [...denomKeys].filter((k) => k.endsWith('|exercise-2')).slice(0, 3));
ok('10.2 the existing quiz denominators are untouched',
  [...denomKeys].filter((k) => k.endsWith('|quiz')).length === 35);

section('11. Publishing a SUBSET, where the storefront decides which rows exist');
//  Board 163. 17 of the 35 exercise-2 pages were never imported and 18 have
//  been live since 2026-08-26. A sheet that publishes the 17 is only safe if
//  the program can tell those two groups apart from a MEASUREMENT rather than
//  from a fixture, and refuses everything it cannot account for.
//
//  The status file here is synthetic on purpose. If the suite read the real
//  probe output it would pass for the wrong reason the day the storefront
//  changed, and it would need a network. The shape is exactly what
//  scripts/csp-exercise-2-live-status.js writes.
const { readStatus, bodyLinkTargets, cedCodesVisible, checkPage: checkPageFn } = require('../scripts/csp-pages-csv');

const STATUS = path.join(tmp, 'status.jsonl');
const AT = '2026-09-02T00:00:00.000Z';
const linkTargets = new Set();
for (const p of x2) for (const t of bodyLinkTargets(p.bodyHtml)) linkTargets.add(t);

//  Half the set pretended live, half pretended missing, and every internal link
//  target answering 200.
const baseRows = () => [
  ...x2.map((p, i) => ({ handle: p.handle, at: AT, status: i < 18 ? 200 : 404, bytes: 1, attempts: 1 })),
  ...[...linkTargets].map((h) => ({ handle: h, at: AT, status: 200, bytes: 1, attempts: 1 })),
];
const writeStatus = (rows) => { fs.writeFileSync(STATUS, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); };

writeStatus(baseRows());
const deadCsv = path.join(tmp, 'dead.csv');
const r0 = run([deadCsv, '--kind', 'exercise-2', '--status', STATUS, '--only-dead', '--expect', '17']);
ok('11.0 --only-dead writes a row for exactly the handles measured 404', r0.ok
  && parseCsv(fs.readFileSync(deadCsv, 'utf8').slice(1)).slice(1).filter((r) => r.length > 1).length === 17,
  r0.text.slice(0, 300));

//  A page row carries Body HTML, and Body HTML over a page that exists is a
//  rewrite. This program publishes; it does not rewrite. Without --only-dead all
//  35 are selected and the 18 that already resolve have to stop the sheet.
const r1 = run([path.join(tmp, 'nope1.csv'), '--kind', 'exercise-2', '--status', STATUS]);
ok('11.2 a handle the storefront already serves is REFUSED, because that is a rewrite',
  !r1.ok && /serves HTTP 200 for this handle already/.test(r1.text)
    && !fs.existsSync(path.join(tmp, 'nope1.csv')), r1.text.slice(0, 240));

//  Board item #79: 46 pages of this storefront answered 429 during a crawl. A
//  handle nobody measured is not a handle that is missing, and folding the two
//  together is how a publish turns into an overwrite.
writeStatus(baseRows().filter((r) => r.handle !== x2[20].handle));
const r2 = run([path.join(tmp, 'nope2.csv'), '--kind', 'exercise-2', '--status', STATUS,
  '--only', x2[20].handle]);
ok('11.3 a handle with no measurement at all is REFUSED, because unmeasured is not missing',
  !r2.ok && /no row in the status file/.test(r2.text), r2.text.slice(0, 240));

const unresolvedRows = baseRows().map((r) => (r.handle === x2[20].handle
  ? { ...r, status: 429, unresolved: true, error: 'HTTP 429' } : r));
writeStatus(unresolvedRows);
const r2b = run([path.join(tmp, 'nope2b.csv'), '--kind', 'exercise-2', '--status', STATUS,
  '--only', x2[20].handle]);
ok('11.3b a throttled handle is REFUSED rather than read as a 404',
  !r2b.ok && /the storefront never answered/.test(r2b.text), r2b.text.slice(0, 240));

//  A page whose own links 404 ships broken. The target chosen is one the bodies
//  really do link, read out of the markup rather than typed.
//  Picked from the pages the synthetic status marks 404, because those are the
//  rows --only-dead selects. A target linked only by a page that is not in the
//  sheet would prove nothing, and the first version of this test did exactly
//  that and read as a broken guard.
const deadTargets = new Set();
for (const p of x2.slice(18)) for (const t of bodyLinkTargets(p.bodyHtml)) deadTargets.add(t);
const oneTarget = [...deadTargets][0];
writeStatus(baseRows().map((r) => (r.handle === oneTarget ? { ...r, status: 404 } : r)));
const r3 = run([path.join(tmp, 'nope3.csv'), '--kind', 'exercise-2', '--status', STATUS, '--only-dead']);
ok('11.4 a body linking a handle that is not live is REFUSED',
  !r3.ok && new RegExp(`links /pages/${oneTarget}, which returns HTTP 404`).test(r3.text),
  r3.text.slice(0, 240));

//  A body under 2000 bytes is not a finished page, and a short Body HTML cell
//  destroys more than it publishes.
const stub = { ...x2[0], bodyHtml: '<h1>x</h1>' };
ok('11.1 a body under 2000 bytes is REFUSED as an unfinished page',
  checkPageFn(stub).some((c) => /body is only \d+ bytes/.test(c)), checkPageFn(stub));

//  218 CED codes reached students on the rebuilt Topic 1.1 lesson. Both shapes
//  the site can emit are counted, and one is enough to stop the sheet.
for (const [label, code] of [['AP CSP', 'AAP-2.K.4'], ['AP Cybersecurity', '1.1.A.2']]) {
  const poisoned = x2[0].bodyHtml.replace('<h1', `<p>Recall ${code} here.</p><h1`);
  ok(`11.5 a CED Essential Knowledge code in student-visible text is REFUSED (${label} shape)`,
    cedCodesVisible(poisoned).includes(code), cedCodesVisible(poisoned).slice(0, 4));
}
ok('11.5c none of the 35 built bodies carries a CED code a student could read',
  x2.every((p) => cedCodesVisible(p.bodyHtml).length === 0),
  x2.filter((p) => cedCodesVisible(p.bodyHtml).length).map((p) => p.handle));

//  THE INSTRUMENT BUG THIS REPO KEEPS REPEATING. A dead-link scan here once read
//  href="/pages/'+prev.handle+'" out of a <script> and reported 141 dead links
//  that were string concatenation. An href is a URL only where the HTML parser
//  is the one reading it.
//  The fixture has to contain a /pages/ href the REGEX WOULD MATCH, inside a
//  script block. The first version put string concatenation there, which the
//  regex never matched with or without the strip, so the mutation that deletes
//  the strip left the suite green. The deploy gate reported it as a guard that
//  does not test anything, which is what it was.
const scripty = '<a href="/pages/real-one">x</a>'
  + '<script>d.innerHTML = \'<a href="/pages/ghost-page">go</a>\';</script>';
ok('11.6 a /pages/ href inside a script block is NOT counted as a link',
  JSON.stringify(bodyLinkTargets(scripty)) === JSON.stringify(['real-one']), bodyLinkTargets(scripty));

//  And the other half of the same rule: protection is decided by
//  lib/cyber-ek-density.js, not re-decided here. A code inside an EK coverage
//  table is a teacher artifact and must survive.
const covered = '<div id="ek11-body"><table><tr><td class="term">1.1.A.2 Intimidation</td>'
  + '<td>Covered</td></tr></table></div>';
ok('11.7 a CED code inside the EK coverage table is NOT reported, per the resolver',
  cedCodesVisible(covered).length === 0, cedCodesVisible(covered));

//  THE WIRING, not just the detector. cedCodesVisible can be perfect and never
//  be called. This runs the real generator over the real rendered bodies and
//  requires both that it writes and that it did not have to say the word CED to
//  get there. Mutate the RENDERER to emit one code and this is the assertion
//  that goes red, which is the only way to prove the refusal is actually reached
//  when no real body triggers it.
writeStatus(baseRows());
const r5 = run([path.join(tmp, 'wired.csv'), '--kind', 'exercise-2', '--status', STATUS,
  '--only-dead', '--expect', '17']);
ok('11.9 the generator writes the sheet only because no body carries a CED code',
  r5.ok && !/CED Essential Knowledge/.test(r5.text), r5.text.slice(0, 300));

//  A row count nobody reviewed is a different sheet with the same name.
writeStatus(baseRows());
const r4 = run([path.join(tmp, 'nope4.csv'), '--kind', 'exercise-2', '--status', STATUS,
  '--only-dead', '--expect', '18']);
ok('11.8 a selection whose size is not --expect is REFUSED as a different sheet',
  !r4.ok && /--expect said 18/.test(r4.text), r4.text.slice(0, 240));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
