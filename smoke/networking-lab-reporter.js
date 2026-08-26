'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the AP Networking lab pages actually report.
//
//  THE DEFECT THIS CLOSES
//  The four browser labs graded themselves on screen and recorded nothing, from
//  the day they shipped until 2026-08-26. Every side of the contract was right
//  except one:
//
//    the lab page carries data-course/data-lesson-id/data-item-id   yes
//    the lab computes a score over its 8 checkpoints                yes
//    the lab builds a {q, sel, ok} detail array                     yes
//    the lab calls window.APNET_reportAttempt                       yes
//    something DEFINES window.APNET_reportAttempt on that page      NO
//    the manifest carries lab-1..lab-4 at 8 points                  yes, since 2026-08-17
//
//  ap-networking-reporter.js defines that function, and the theme snippet that
//  loads it gated on handles containing 'ap-networking-lesson-'. The labs ship
//  under 'ap-networking-lab-{N}-{slug}'. The widget guards its call with
//  `typeof window.APNET_reportAttempt === 'function'` inside a try/catch, so the
//  failure was perfectly silent: the student read "Recorded: 6 out of 8" and
//  nothing left the browser. 32 points of denominator nobody could earn, showing
//  up in the gradebook as a column of zeros that reads like students skipping
//  the work.
//
//  WHY A FIXTURE AND A MIRROR RATHER THAN A LIVE FETCH
//  This suite runs in tests.yml, which is offline by contract. The lab page
//  bodies live only in Shopify and the reporter and its snippet live only in the
//  theme repo, so what CI has is what is tested: shopify/ap-networking-reporter.js
//  and shopify/apcs-networking-reporter.liquid are byte-identical mirrors, and
//  smoke/fixtures/networking-labs.json is what the four live pages were actually
//  serving on 2026-08-26. Section 5 compares the mirrors against a theme clone
//  when one is present, because a mirror that has drifted tests nothing.
//
//  WHAT THIS CANNOT SEE, AND WHAT DOES
//  A fixture only knows the four page families that existed when it was written.
//  It cannot catch the NEXT page family that ships under a shape nobody thought
//  to add to the gate, which is exactly how this defect happened. That check has
//  to look at the live site, so it lives in scripts/verify-networking-reporting.js
//  and is deliberately not a smoke:* script.
//
//  Zero PII: one synthetic student, ids and counts only, no student text.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:netlabreporter
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const vm = require('vm');

process.env.DB_PATH = path.join(__dirname, 'smoke-networking-lab-reporter.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-networking-lab-reporter-secret-long-enough';

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const { seedManifest } = require('../scripts/seed-manifest');

const FIXTURE = require('./fixtures/networking-labs.json');
const REPORTER = path.join(__dirname, '..', 'shopify', 'ap-networking-reporter.js');
const SNIPPET = path.join(__dirname, '..', 'shopify', 'apcs-networking-reporter.liquid');
const THEME = path.join(__dirname, '..', '..', 'apcsexamprep-theme');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const skip = (n, why) => console.log('  [SKIP] ' + n + '  ' + why);
const section = (t) => console.log('\n' + t);

const labs = Object.entries(FIXTURE.labs);

// ── 1. THE LABS AND THE MANIFEST ARE THE SAME CONTRACT ───────────────────────
//  POST /api/progress/attempt 400s on a lesson_id, item_type or max_score that
//  disagrees with the manifest row, so any drift here drops every lab grade
//  rather than degrading gracefully. Both directions are checked: a lab with no
//  row cannot post, and a row with no lab is a denominator nobody can earn.
section('the labs and the manifest agree');

seedManifest();
const manifestRow = db.prepare(
  'SELECT unit, lesson_id, item_id, item_type, points FROM course_manifest WHERE course = ? AND item_id = ?');

ok('the fixture carries all four browser labs', labs.length === 4, labs.map(([h]) => h));

for (const [handle, lab] of labs) {
  const row = manifestRow.get('ap-networking', lab.item_id);
  ok(`${lab.item_id}: seeded in the manifest`, !!row, { handle });
  if (!row) continue;
  ok(`${lab.item_id}: manifest points equal the checkpoints the page renders`,
    row.points === lab.checkpoints, { manifest: row.points, page: lab.checkpoints });
  ok(`${lab.item_id}: lesson_id equals item_id, so each lab is its own cell`,
    row.lesson_id === lab.item_id, row);
  ok(`${lab.item_id}: item_type matches what the page posts`,
    row.item_type === lab.item_type_posted, { manifest: row.item_type, page: lab.item_type_posted });
  ok(`${lab.item_id}: the page wrapper agrees with the row`,
    lab.wrapper['data-course'] === 'ap-networking' &&
    lab.wrapper['data-lesson-id'] === row.lesson_id &&
    lab.wrapper['data-item-id'] === row.item_id, lab.wrapper);
}

// The reverse direction, read from what was actually SEEDED rather than from
// the constant that feeds it, so a row that arrives by some other path is
// covered too. A browser-lab row with no page is a denominator nobody can earn,
// which is the failure smoke/manifest-prune.js exists to prevent and the reason
// NET_LABS carries its warning.
const fixtureIds = new Set(labs.map(([, l]) => l.item_id));
const seededLabRows = db.prepare(
  "SELECT item_id FROM course_manifest WHERE course = 'ap-networking' AND item_id LIKE 'lab-%'").all();
ok('the seed produced exactly the four browser-lab rows',
  seededLabRows.length === labs.length, seededLabRows.map((r) => r.item_id));
for (const r of seededLabRows) {
  ok(`${r.item_id}: seeded, and a page exists that can earn it`, fixtureIds.has(r.item_id));
}

// ── 2. THE THEME GATE MATCHES EVERY PAGE THAT REPORTS ────────────────────────
//  The snippet is Liquid, so it is read rather than executed. The condition is
//  required to be a plain or-joined list of `page.handle contains '...'` terms:
//  anything else (an `and`, an `unless`, a negation) would make the evaluator
//  below quietly wrong about a gate it cannot actually model, which is a worse
//  failure than not testing it.
section('the theme gate loads the reporter on every page that reports');

const snippet = fs.readFileSync(SNIPPET, 'utf8');
const ifLine = (snippet.match(/\{%-?\s*if\s+([^%]*?)\s*-?%\}/) || [])[1] || '';
const terms = [...ifLine.matchAll(/page\.handle\s+contains\s+'([^']+)'/g)].map((m) => m[1]);
const joinedByOrOnly = terms.length > 0 &&
  ifLine.replace(/page\.handle\s+contains\s+'[^']+'/g, 'T').trim() ===
  Array(terms.length).fill('T').join(' or ');

ok('the gate is an or-joined list of handle prefixes, so it can be modelled here',
  joinedByOrOnly, ifLine);
ok('the snippet loads ap-networking-reporter.js and nothing else',
  /asset_url/.test(snippet) &&
  (snippet.match(/'([a-z0-9.-]+\.js)'\s*\|\s*asset_url/g) || []).join() === "'ap-networking-reporter.js' | asset_url");

const gateMatches = (handle) => terms.some((t) => handle.includes(t));

for (const [handle, lab] of labs) {
  ok(`the gate matches ${handle}`, gateMatches(handle), { terms });
  ok(`${lab.item_id}: the page calls the function the gate's asset defines`,
    lab.reports_via === 'window.APNET_reportAttempt' && lab.report_calls_in_body > 0, lab);
}

// The 22 topic lesson pages were the original reason the gate exists. Widening
// it for the labs must not have dropped them.
ok('the gate still matches a topic lesson page',
  gateMatches('ap-networking-lesson-1-2-connecting-optimizing-device'));

// And it must stay a gate. The reporter self-gates on the wrapper too, so
// loading it everywhere would be harmless but would ship 10KB to every page on
// the site, which is the thing the snippet exists to avoid.
for (const h of [
  'ap-networking', 'ap-networking-unit-1', 'ap-networking-command-center',
  'ap-networking-game-subnet-sprint', 'ap-networking-study-guide',
  'ap-networking-practice-exam', 'ap-csa-lesson-1-2', 'contact',
]) {
  ok(`the gate does NOT match ${h}`, !gateMatches(h));
}

// ── 3. THE REPORTER TURNS A LAB SUBMIT INTO A RECORDED GRADE ─────────────────
//  The real asset, run in a DOM shaped like a lab page, handed the exact payload
//  the lab widget builds, posting into the real router over the real manifest.
//  Everything between the student clicking Submit and a row in `attempts` is
//  exercised here except the widget's own arithmetic.
section('a lab submit reaches the attempts table');

db.exec(`
  INSERT INTO teachers (id,name,email,password_hash) VALUES ('t_net','T','t@s.org','x');
  INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
    VALUES ('c_net','NET-SMOK','Networking','ap-networking','t_net',1,80,1);
  INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_net','c_net','A','x');
`);
const token = signStudentToken({ id: 's_net', class_id: 'c_net' });

const app = express();
app.use(express.json());
app.use('/api/progress', require('../routes/progress'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

// A DOM with exactly the surface the reporter touches. Anything it reaches for
// that is not here would throw, which is itself the assertion: the reporter must
// not depend on more of a page than a lab page provides.
function labPageContext(lab) {
  const listeners = {};
  const el = { getAttribute: (k) => lab.wrapper[k] || null, querySelector: () => null };
  const doc = {
    querySelector: (sel) => (sel.includes('data-course="ap-networking"') && sel.includes('data-lesson-id') ? el : null),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent: (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); return true; },
  };
  const win = {
    addEventListener: () => {},
    // The reporter's own documented override hook, so the asset is tested
    // unmodified and still lands on the in-process router.
    __nativeFetch: (url, init) => fetch(url.replace('https://progress.apcsexamprep.com', base()), init),
  };
  const ctx = {
    window: win, document: doc, console, setTimeout, clearTimeout, fetch,
    // Bare global, not window.localStorage: getToken() reads it unqualified and
    // swallows the ReferenceError in a try/catch, so putting it only on `window`
    // makes the reporter silently tokenless and every post below a false
    // negative. Costing an hour once is enough.
    localStorage: { getItem: (k) => (k === 'apcse_token' ? token : null) },
    CustomEvent: function (type, o) { return { type, detail: (o || {}).detail }; },
  };
  ctx.window.window = win;
  ctx.window.document = doc;
  ctx.window.console = console;
  ctx.window.localStorage = ctx.localStorage;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(REPORTER, 'utf8'), ctx, { filename: 'ap-networking-reporter.js' });
  return { ctx, doc, listeners };
}

// The payload the lab widget builds. Mirrors doSubmit in the page body: the
// lesson id is DERIVED from item_id there, which is why it is derived here too.
function submitPayload(lab, correct) {
  const detail = [];
  for (let i = 0; i < lab.checkpoints; i++) detail.push({ q: i + 1, sel: i % 4, ok: i < correct });
  return {
    lesson_id: lab.item_id,
    item_id: lab.item_id,
    item_type: lab.item_type_posted,
    score: correct,
    max_score: lab.checkpoints,
    detail,
  };
}

function submitAndWait(lab, correct) {
  const { ctx, doc } = labPageContext(lab);
  ok(`${lab.item_id}: the asset defines window.APNET_reportAttempt`,
    typeof ctx.window.APNET_reportAttempt === 'function');
  if (typeof ctx.window.APNET_reportAttempt !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    doc.addEventListener('apnet:attempt-recorded', (ev) => { clearTimeout(timer); resolve(ev.detail); });
    ctx.window.APNET_reportAttempt(submitPayload(lab, correct));
  });
}

(async () => {
  for (const [, lab] of labs) {
    // 6 of 8 is chosen because it is 75 percent: below the class threshold of
    // 80, so a `passed` that came back true would mean the server had graded
    // against something other than the manifest points.
    const recorded = await submitAndWait(lab, 6);
    ok(`${lab.item_id}: the API recorded the attempt`, !!recorded && recorded.recorded === true, recorded);
    if (!recorded) continue;
    ok(`${lab.item_id}: 6 of 8 is below the 80 threshold and is not passed`, recorded.passed === false, recorded);
    ok(`${lab.item_id}: grade of record is 6 of 8`,
      recorded.grade_of_record && recorded.grade_of_record.score === 6 &&
      recorded.grade_of_record.max_score === lab.checkpoints, recorded.grade_of_record);

    const row = db.prepare(
      'SELECT course, lesson_id, item_id, item_type, score, max_score, detail FROM attempts WHERE item_id = ?')
      .get(lab.item_id);
    ok(`${lab.item_id}: one row landed, filed under its own lesson`,
      row && row.course === 'ap-networking' && row.lesson_id === lab.item_id && row.item_id === lab.item_id, row);
    ok(`${lab.item_id}: max_score is the manifest's 8, not something the page invented`,
      row && row.max_score === lab.checkpoints, row);

    // Zero PII: option indices and booleans only, never a student string.
    const detail = JSON.parse(row.detail || '[]');
    ok(`${lab.item_id}: detail is ${lab.checkpoints} entries of {q, sel, ok} and no free text`,
      detail.length === lab.checkpoints && detail.every((d) =>
        Object.keys(d).sort().join() === 'ok,q,sel' &&
        Number.isInteger(d.q) && (d.sel === null || Number.isInteger(d.sel)) && typeof d.ok === 'boolean'),
      detail.slice(0, 2));
  }

  // ── 4. THE REGRESSION ITSELF ───────────────────────────────────────────────
  //  Without the wrapper the reporter must stay silent, because that is what
  //  makes it safe to load on the terminal lab handles the widened gate also
  //  matches, and on anonymous SEO traffic. If this ever posts, the gate has to
  //  narrow again.
  section('the reporter is inert on a page that carries no wrapper');
  {
    // A VALID token is deliberately present. Without one the reporter returns
    // early for that reason instead, and this would pass while proving nothing
    // about the wrapper, which is the shape of a green check that is not a check.
    const ctx = vm.createContext({
      window: { addEventListener: () => {} },
      document: { querySelector: () => null, addEventListener: () => {}, dispatchEvent: () => true },
      console, setTimeout, clearTimeout,
      localStorage: { getItem: (k) => (k === 'apcse_token' ? token : null) },
      fetch: () => { throw new Error('the reporter posted with no [data-course] wrapper on the page'); },
      CustomEvent: function (type, o) { return { type, detail: (o || {}).detail }; },
    });
    ctx.window.window = ctx.window;
    ctx.window.document = ctx.document;
    vm.runInContext(fs.readFileSync(REPORTER, 'utf8'), ctx);
    let threw = null;
    try { ctx.window.APNET_reportAttempt(submitPayload(labs[0][1], 8)); } catch (e) { threw = e.message; }
    ok('no wrapper means no post, so the terminal lab handles are a proven no-op', threw === null, threw);
  }

  // ── 5. THE MIRRORS ARE NOT STALE ───────────────────────────────────────────
  //  Everything above tests the copies in this repo. The theme repo is the only
  //  source of truth for both files, so a mirror that has drifted from the
  //  deployed one is a suite testing a file nobody serves.
  section('the mirrors match the deployed theme files');
  for (const [mirror, deployed, label] of [
    [REPORTER, path.join(THEME, 'assets', 'ap-networking-reporter.js'), 'ap-networking-reporter.js'],
    [SNIPPET, path.join(THEME, 'snippets', 'apcs-networking-reporter.liquid'), 'apcs-networking-reporter.liquid'],
  ]) {
    if (!fs.existsSync(deployed)) { skip(`${label} mirror sync`, 'theme repo not checked out'); continue; }
    ok(`${label}: the mirror is byte-identical to the theme file`,
      fs.readFileSync(mirror, 'utf8') === fs.readFileSync(deployed, 'utf8'));
  }

  // House rules, on the files this suite owns.
  section('house rules');
  for (const [f, label] of [[REPORTER, 'the reporter'], [SNIPPET, 'the snippet']]) {
    const src = fs.readFileSync(f, 'utf8');
    ok(`${label} is pure ASCII`, !/[^\x00-\x7F]/.test(src));
    ok(`${label} carries no em- or en-dash`, !/[\u2013\u2014]/.test(src));
  }

  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  console.log(`\n  ${fail === 0 ? 'OK' : 'FAILED'} - ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
