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

section('4. The four live pages this repo does not own stay fixed');
// These four were authored outside this repo, so there is no seed to protect.
// What is on disk is the snapshot taken before the fix, which means the guard
// available here is: running the patcher over the snapshot must still produce a
// body with no one-liners left in the regions the patcher owns. If a rule in
// the patcher stops matching, this goes red even though no seed changed.
const { patch } = require('../scripts/beginner-style-patch');
const SNAPSHOTS = [
  ['ap-csp-topic-3-4-code', 1],
  ['ap-csp-topic-3-9-code', 6],
  ['ap-csp-topic-3-14-code', 20],
  ['ap-csp-topic-3-9-guided-notes', 10],
];
const SNAP_DIR = path.join(__dirname, '..', 'shopify', 'page-snapshots');
for (const [handle, expected] of SNAPSHOTS) {
  const file = path.join(SNAP_DIR, handle + '.before-beginner-style.html');
  if (!fs.existsSync(file)) { ok(`${handle} has a rollback snapshot`, false, file); continue; }
  ok(`${handle} has a rollback snapshot`, true);
  const before = fs.readFileSync(file, 'utf8');
  const r = patch(before);
  ok(`${handle} still rewrites ${expected} one-liner(s)`, r.starters + r.pseudo === expected,
    { starters: r.starters, pseudo: r.pseudo });
  ok(`${handle} leaves nothing it does not understand`, r.refused === 0, r.refused);

  const hits = [];
  const m = r.body.match(/var STARTERS = (\[[\s\S]*?\]);\n/);
  if (m) {
    const arr = JSON.parse(m[1]
      .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
      .replace(/\\u([0-9a-f]{4})/g, (x, h) => String.fromCharCode(parseInt(h, 16))));
    arr.forEach((o) => Object.keys(o).forEach((l) => findOneLiners(o[l], l).forEach((h) => hits.push(h.text))));
  }
  (r.body.match(/<pre class="[^"]*\bps\b[^"]*">[\s\S]*?<\/pre>/g) || [])
    .forEach((b) => findOneLiners(b, 'pseudo').forEach((h) => hits.push(h.text)));
  ok(`${handle} has no one-liner left in the code a student reads`, hits.length === 0, hits.slice(0, 3));

  // The patcher is only allowed inside the starter blob and the pseudocode
  // blocks. Anything else moving means it reached somewhere it should not.
  const strip = (b) => b.replace(/var STARTERS = \[[\s\S]*?\];\n/, 'S')
    .replace(/<pre class="[^"]*\bps\b[^"]*">[\s\S]*?<\/pre>/g, 'P');
  ok(`${handle} is untouched outside those two regions`, strip(before) === strip(r.body));
}

section('5. The 3.9 guided notes has no pseudocode left inside a sentence');
// Eleven one-liners on that page were inside prose or in one column of a
// comparison table, so reformatting them in place would have dropped a nine-line
// block into the middle of a sentence. scripts/csp-notes-code-blocks.js lifts
// them out into real code blocks instead. Every edit is a literal before/after
// pair, so this asserts each still applies exactly once against the snapshot.
const { patch: patchLive } = require('../scripts/beginner-style-patch');
const { apply, PAGES } = require('../scripts/csp-notes-code-blocks');
// Metasyntax survives on purpose: `IF(condition){ block }` in a summary bullet
// is the grammar being named, not code a student writes. A block whose body is
// a placeholder word rather than a statement is therefore not a finding.
const PLACEHOLDER = /^\s*(first |second )?(block|statement|expression|\.\.\.)\s*$/;
const EXPECTED_EDITS = {
  'ap-csp-topic-3-9-guided-notes': 11,
  'ap-csp-topic-3-6-guided-notes': 8,
  'ap-csp-topic-3-13-guided-notes': 3,
};
for (const [handle, page] of Object.entries(PAGES)) {
  const snap = path.join(SNAP_DIR, handle + '.before-beginner-style.html');
  if (!fs.existsSync(snap)) { ok(`${handle} has a snapshot`, false, snap); continue; }
  ok(`${handle} has a snapshot`, true);
  const staged = patchLive(fs.readFileSync(snap, 'utf8')).body;
  const res = apply(staged, page.edits);
  ok(`${handle}: every prose edit still applies exactly once`, res.missed.length === 0, res.missed);
  ok(`${handle}: has ${EXPECTED_EDITS[handle]} edits`,
    page.edits.length === EXPECTED_EDITS[handle], page.edits.length);

  const outside = res.body.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, '');
  const left = [...outside.matchAll(/IF\s*\([^)]*\)\s*\{([^{}]*)\}/g)]
    .filter((m) => !PLACEHOLDER.test(m[1]));
  ok(`${handle}: no concrete pseudocode is left inside a sentence`, left.length === 0,
    left.slice(0, 2).map((m) => m[0]));

  const inside = [];
  (res.body.match(/<pre class="[^"]*\bps\b[^"]*">[\s\S]*?<\/pre>/g) || [])
    .forEach((b) => findOneLiners(b, 'pseudo').forEach((h) => inside.push(h.text)));
  ok(`${handle}: no one-liner is left inside a code block`, inside.length === 0, inside.slice(0, 3));
  ok(`${handle}: the div tags still balance`,
    (res.body.match(/<div/g) || []).length === (res.body.match(/<\/div>/g) || []).length);
  ok(`${handle}: the page grew, so something was actually expanded`,
    Buffer.byteLength(res.body) > Buffer.byteLength(staged));
}

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
