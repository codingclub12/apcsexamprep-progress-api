#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE CHECK: does /pages/cyber-dashboard roll up MARKS, or a mean of
//  percentages? Board 85.
//
//  WHAT IT ASSERTS, AND WHY IT IS NOT A STRING SEARCH
//  "The new function is in the body" is the easy check and it is the wrong one:
//  a sheet that added the function and left the old call site in place would
//  pass it while the page still printed the mean. So this pulls the SCRIPT out
//  of the live body, runs it in a vm with a stub DOM, and calls the page's own
//  classAvg and colAvg on a fixture where the two rules give different answers.
//
//    class average   31 of 62 is 50.  A mean of 90 and 31 is 61.
//    column footer   19 of 22 is 86.  A mean of 90 and 50 is 70.
//
//  The numbers are the assertion. A page that returns 61 and 70 has not been
//  imported yet, whatever its text says.
//
//  RUN IT BEFORE THE IMPORT TOO. A sheet whose defect is already gone is a
//  sheet to delete, and on 2026-09-08 a day-old sheet nearly reverted a better
//  fix because nobody re-read the live page first.
//
//  Fetched through lib/storefront-fetch.js with NO User-Agent, per CLAUDE.md.
//  The bot management has been in three states in a week and a challenge page
//  contains none of the strings this looks for, so every "is it gone now"
//  assertion would pass on one. looksReal() is what stops that.
//
//  Offline-safe: no credential, no PII, reads a public page.
//
//  --file <path> judges a local body instead of the live page. That is how the
//  harness itself gets proved: run it against shopify/cyber-dashboard.html and
//  it must PASS, so a red live run means the page, not the checker.
//
//  Run: node scripts/verify-dashboard-rollup-live.js [--file <body.html>]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const sf = require('../lib/storefront-fetch');

const fileAt = process.argv.indexOf('--file');
const LOCAL = fileAt === -1 ? null : process.argv[fileAt + 1];

const HANDLE = 'cyber-dashboard';
const PATH = '/pages/' + HANDLE;

// The same fixture smoke/teacher-dashboard-page.js section 12 uses, restated
// here rather than imported: this script has to be able to judge a page the
// repo did not build.
const WEIGHT = {
  class: { class_name: 'Weighting', course: 'ap-cybersecurity' },
  course_config: { units: { 'unit-1': {
    label: 'Unit 1', lessons: ['1.1', '1.2', '1.3'], activities: ['quiz'],
  } } },
  denominators: { '1.1|quiz': 20, '1.2|quiz': 40 },
  summary: [
    { student: { id: 'a', name: 'A', ref: '', last_active: null }, units: {},
      detail: { 'unit-1': {
        '1.1': { quiz: { score: 90, points_earned: 18, points_possible: 20 } },
        '1.3': { quiz: { score: 80 } },
      } } },
    { student: { id: 'b', name: 'B', ref: '', last_active: null }, units: {},
      detail: { 'unit-1': {
        '1.1': { quiz: { score: 50, points_earned: 1, points_possible: 2 } },
        '1.2': { quiz: { score: 30 } },
        '1.3': { quiz: { score: 60 } },
      } } },
  ],
};

function loadPage(html) {
  const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');
  const el = () => ({
    style: { setProperty() {} }, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector: () => el(), querySelectorAll: () => [], add() {}, focus() {}, click() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
  });
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    document: {
      getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), addEventListener() {}, body: el(), documentElement: el(),
    },
    window: { innerWidth: 1400, scrollY: 0, scrollX: 0, addEventListener: () => {},
      location: { search: '', pathname: PATH, replace() {} } },
    location: { search: '?code=CYBER-TEST', pathname: PATH, replace() {} },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URLSearchParams, AbortController, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp,
    isNaN, parseInt, parseFloat, Option: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox, { timeout: 5000 });
  return sandbox.window.TCDash;
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (n, c, x) => {
    if (c) { pass++; console.log('  [PASS] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
  };

  //  The page JSON, not the rendered page. A rendered storefront page carries
  //  the theme's own script blocks, including JSON-LD, and running those in a vm
  //  throws on the first one. body_html is exactly what a Matrixify import
  //  writes, so it is also exactly what this should judge.
  let html, where;
  if (LOCAL) {
    html = fs.readFileSync(LOCAL, 'utf8');
    where = `FILE ${LOCAL}  ${html.length} bytes`;
  } else {
    const page = sf.pageBody(HANDLE);
    html = page.body_html;
    where = `LIVE ${PATH}  ${html.length} bytes  updated_at ${page.updated_at}`;
  }
  console.log(where + '\n');

  const T = loadPage(html);
  if (!T || typeof T.classAvg !== 'function' || typeof T.colAvg !== 'function') {
    console.log('  [FAIL] this body has no classAvg/colAvg. The sheet is NOT imported.');
    console.log('\nFAILED - /pages/cyber-dashboard still rolls up a mean of percentages');
    process.exit(1);
  }

  T.data = WEIGHT;
  T.model = T.buildModel(WEIGHT);
  const rows = T.model.students.map((s) => T.totals(s));
  const ca = T.classAvg(rows);
  ok('the live class average is 31 of 62, which is 50', ca.pct === 50, ca);
  ok('  and NOT the 61 a mean of 90 and 31 gives', ca.pct !== 61, ca.pct);
  ok('  it carries the marks behind it', ca.earned === 31 && ca.poss === 62, ca);

  const col = (l) => T.model.cols.find((c) => c.dl === l && c.da === 'quiz');
  const cells = (l) => T.model.students.map((s) => T.cellData(s, col(l)));
  const c11 = T.colAvg(cells('1.1'));
  ok('the live column footer is 19 of 22, which is 86', c11.pct === 86, c11);
  ok('  and NOT the 70 that averaging 90 and 50 gives', c11.pct !== 70, c11.pct);
  const c13 = T.colAvg(cells('1.3'));
  ok('an unpriced column still reports its mean, 70, and says so',
    c13.pct === 70 && c13.basis === 'percent', c13);

  console.log('\n' + (fail === 0
    ? `OK - ${LOCAL ? 'this body' : 'the live dashboard'} rolls up marks (${pass} checks)`
    : `FAILED - ${fail} of ${pass + fail} checks`));
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FAILED - ' + e.message);
  process.exit(1);
});
