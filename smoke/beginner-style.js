'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: no code on this site is written the way a machine writes it.
//
//  WHAT IS BEING PROTECTED
//
//  Every starter, reference solution and pseudocode block a student reads is a
//  model they will copy. `if (steps[d] > goal) { over = over + 1; }` is legal
//  and compact and instantly reads as generated: a first-year student puts the
//  brace on its own line, because that is how they were taught and how every
//  worked example on the AP reference sheet is laid out.
//
//  This shipped once across three seed files and eighteen live pages before
//  anyone said it out loud, which is exactly why it is a gate now rather than a
//  habit. A habit survives until the next tired session.
//
//  WHAT THIS DOES NOT CHECK: a page's own machinery. Nobody learns to program
//  from the runner that posts to Judge0. This is about code students read as an
//  example, not about house style in general.
//
//  WHAT THIS CANNOT PROVE: that the sixteen Big Idea 3 coding pages authored
//  outside this repo are clean. Their bodies live on Shopify, not here. They
//  were swept live and the offenders are listed in the run note; this suite
//  covers everything this repo is the source of.
//
//  Zero PII: author content only, no student data anywhere near this.
//
//  Run: npm run smoke:beginnerstyle
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { findInProblem, findOneLiners } = require('../lib/beginner-style');

// The CSP coding seeds have a known shape, so they are walked problem by problem
// and reported per problem.
const PROBLEM_SEEDS = [
  ['seed/csp-code-pages/3-17.js', '../seed/csp-code-pages/3-17'],
  ['seed/csp-code-pages/3-18.js', '../seed/csp-code-pages/3-18'],
  ['seed/csp-create-task/bridge.js', '../seed/csp-create-task/bridge'],
];

// Everything else in seed/ is walked generically: every string value in the
// module is tested as brace-language code. Enumerating the directory rather than
// listing files is the point. A seed added next month is covered on the day it
// lands, with nobody remembering to add it here.

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

section('1. The detector itself works, in every language it claims to cover');
// A detector that silently stops matching would turn this whole suite green and
// mean nothing, so it is checked against known-bad and known-good code first.
const cases = [
  ['javascript', 'if (a) { b(); }', 1, 'a braced one-line if'],
  ['javascript', 'if (a) {\n  b();\n}', 0, 'a properly formatted if'],
  ['javascript', 'if (k % d === 0) return false;', 1, 'a braceless one-line if'],
  ['javascript', 'function f(x) { return x; }', 1, 'a one-line function'],
  ['javascript', 'function f(x) {\n  return x;\n}', 0, 'a properly formatted function'],
  ['javascript', 'for (let i = 0; i < n; i++) { s += i; }', 1, 'a one-line for'],
  ['python', 'if a: b', 1, 'a python one-line if'],
  ['python', 'if a:\n    b', 0, 'a properly formatted python if'],
  ['python', 'def f(x): return x', 1, 'a python one-line def'],
  ['pseudo', 'IF(x) { y }', 1, 'a one-line pseudocode block'],
  ['pseudo', 'IF(x)\n{\n  y\n}', 0, 'properly formatted pseudocode'],
];
for (const [lang, code, want, label] of cases) {
  ok(`${label} is ${want ? 'caught' : 'allowed'}`, findOneLiners(code, lang).length === want,
    findOneLiners(code, lang));
}

section('2. No CSP coding seed shows a student a one-line body');
for (const [label, mod] of PROBLEM_SEEDS) {
  const data = require(mod);
  ok(`${label} loads and has problems`, Array.isArray(data.problems) && data.problems.length > 0);
  data.problems.forEach((p, i) => {
    const hits = findInProblem(p);
    ok(`${label} problem ${i + 1} is written the way a beginner writes it`, hits.length === 0,
      hits.map((h) => `${h.where}: ${h.text}`));
  });
}

section('3. No other seed does either');
const SEED_DIR = path.join(__dirname, '..', 'seed');
const seedFiles = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.js')).sort();
ok('there are seed modules to walk', seedFiles.length > 0, seedFiles.length);
for (const file of seedFiles) {
  let data;
  try { data = require(path.join(SEED_DIR, file)); }
  catch (e) { ok(`seed/${file} loads`, false, e.message); continue; }
  const hits = [];
  (function walk(v) {
    if (typeof v === 'string') {
      findOneLiners(v, 'java').forEach((h) => hits.push(h.text));
      return;
    }
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') return Object.values(v).forEach(walk);
  })(data);
  ok(`seed/${file} is written the way a beginner writes it`, hits.length === 0,
    [...new Set(hits)].slice(0, 5));
}

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
