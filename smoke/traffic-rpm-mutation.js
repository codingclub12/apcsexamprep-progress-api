#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  MUTATION BATTERY for the rate denominators. Board 376.
//
//  Break each rule on purpose, one at a time, and require the traffic suite to go
//  red FOR THAT RULE. A green mutation run is a FAILED check, and here that is
//  the exit code.
//
//  WHY THESE RULES AND NOT OTHERS
//  Every mutation below restores a way for money-per-1000-of-one-thing to be
//  stored as money-per-1000-of-another. That is not a cosmetic mislabel:
//  lib/class-monetization.js multiplies the `rpm` metric by PAGEVIEWS, and the
//  measured gap between Raptive's page rate and its session rate on the
//  2026-08-14 to 09-12 export is 2.97x. A class revenue figure wrong by three
//  times, with nothing on the page to say so, is what this defends against.
//
//  The nastiest of them is the ORDER one. Before the split, `rpm`, `pagerpm`,
//  `sessionrpm` and `ecpm` were synonyms of a single metric, and mapHeaders keeps
//  the first match. Raptive exports "Page RPM" left of "RPM", so a naive import
//  was correct by luck. Reorder the columns and the same code stores the session
//  rate instead, silently.
//
//  Run: npm run smoke:trafficrpmmutation
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILES = {
  csv: path.join(ROOT, 'lib', 'traffic-csv.js'),
  contract: path.join(ROOT, 'lib', 'traffic-contract.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });
process.on('uncaughtException', (e) => { restore(); console.error(e); process.exit(1); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '\n           ' + JSON.stringify(x, null, 1).slice(0, 700) : '')); }
};

const SUITE = path.join(__dirname, 'traffic.js');
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return {
    code: r.status,
    failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()),
    out,
  };
}

const MUTATIONS = [
  {
    //  THE ORIGINAL DEFECT, restored exactly. One metric, four synonyms, and the
    //  winner decided by column order.
    name: 'THE COLLISION IS BACK: page, session and impression rates share one metric',
    file: 'csv',
    find: "  ['rpm', ['pagerpm', 'pageviewrpm', 'rpmpage', 'pagecpm']],\n  ['session_rpm', ['sessionrpm', 'rpmsession', 'visitrpm', 'sessioncpm']],\n  ['impression_rpm', ['ecpm', 'impressionrpm', 'adrpm']],",
    repl: "  ['rpm', ['rpm', 'pagerpm', 'sessionrpm', 'ecpm']],",
    //  NOT the order assertion, and that is worth knowing. With the collision
    //  restored the order test STILL passes, because AMBIGUOUS is checked before
    //  HEADER_MAP and refuses the bare column either way. What collapses is the
    //  separation itself: Session RPM and eCPM stop having anywhere to go.
    must: ['Session RPM maps to session_rpm'],
  },
  //  TWO MUTATIONS WERE REMOVED FROM HERE, and the reason is a property worth
  //  recording rather than an omission.
  //
  //  Adding `rpm` back into the HEADER_MAP list for either the page or the
  //  session metric is INERT: mapHeaders consults AMBIGUOUS first and returns
  //  before HEADER_MAP is reached, so the stray synonym never matches. Both
  //  mutations left the suite green, which read as an unguarded rule and is in
  //  fact defence in depth doing its job.
  //
  //  The ordering is what makes them inert, so the ordering is what gets
  //  mutated: see 'THE AMBIGUOUS CHECK MOVES AFTER THE MAP' below, which does go
  //  red. A mutation that cannot fail is not a test, and keeping one because it
  //  looks thorough is how a battery starts lying.
  {
    //  The refusal stops being checked first, so a synonym added to HEADER_MAP by
    //  mistake silently re-enables the guess.
    name: 'THE AMBIGUOUS CHECK MOVES AFTER THE MAP, so a stray synonym wins again',
    file: 'csv',
    find: "    if (AMBIGUOUS[cell]) { ambiguous.push({ header: header[i], reason: AMBIGUOUS[cell] }); return; }\n",
    repl: '',
    must: ['a bare RPM is REPORTED as ambiguous, not dropped in silence'],
  },
  {
    //  Refused but not reported. The data is safe and the importer is left with
    //  no way to find out why their rate never landed.
    name: 'THE REFUSAL GOES SILENT: ambiguous columns are dropped without a report',
    file: 'csv',
    find: '    if (AMBIGUOUS[cell]) { ambiguous.push({ header: header[i], reason: AMBIGUOUS[cell] }); return; }',
    repl: '    if (AMBIGUOUS[cell]) { return; }',
    must: ['a bare RPM is REPORTED as ambiguous, not dropped in silence'],
  },
  {
    //  The reason stops naming the two readings, so the report says a column was
    //  refused without saying how to fix it.
    name: 'THE REASON STOPS NAMING THE TWO READINGS AND THE REMEDY',
    file: 'csv',
    find: "  rpm: 'a bare \"RPM\" column does not say what it is per 1000 OF. Raptive exports '\n    + '\"Page RPM\" (per 1000 pageviews) and \"RPM\" (per 1000 sessions) side by side and '\n    + 'they differ by pages-per-session, measured at 2.97x. Rename the column to '\n    + '\"Page RPM\", \"Session RPM\" or \"eCPM\" and import again.',",
    repl: "  rpm: 'ambiguous column.',",
    must: ['and the reason names both readings and the remedy'],
  },
  {
    //  A file carrying only the ambiguous column parses as fine, so an importer
    //  sees ok:true and assumes the rate landed.
    name: 'A FILE WITH NOTHING BUT AN AMBIGUOUS COLUMN REPORTS OK',
    file: 'csv',
    find: "      reason: ambiguous.length\n        ? 'no usable metric columns: the only rate column is ambiguous'\n        : 'no recognised metric columns',",
    repl: "      reason: 'no recognised metric columns',",
    must: ['and an export with NOTHING but an ambiguous column is refused, saying which'],
  },
  {
    //  The parser splits them and the CONTRACT does not, so a hand-built reading
    //  can still put a session rate in the page column.
    name: 'THE CONTRACT FORGETS session_rpm, so only the parser knows they differ',
    file: 'contract',
    find: "  session_rpm: { unit: 'usd', agg: 'avg', label: 'Session RPM' },",
    repl: '',
    must: ['the contract knows all three as separate metrics'],
  },
  {
    //  The label goes back to bare "RPM", which is the ambiguity on a chart axis.
    name: 'THE LABEL GOES BACK TO A BARE "RPM"',
    file: 'contract',
    find: "  rpm: { unit: 'usd', agg: 'avg', label: 'Page RPM' },",
    repl: "  rpm: { unit: 'usd', agg: 'avg', label: 'RPM' },",
    must: ['and rpm is LABELLED the page rate, because "RPM" on an axis is the ambiguity itself'],
  },
];

// -- BASELINE -----------------------------------------------------------------
console.log('\n  Baseline: the unmutated traffic suite must be GREEN\n');
const base = runSuite();
ok('the traffic suite passes on an unmutated tree', base.code === 0, base.failed.slice(0, 6));
if (base.code !== 0) {
  console.log('\n  Refusing to report on mutations against an already-red suite.\n');
  process.exit(1);
}

// -- THE BATTERY --------------------------------------------------------------
console.log('\n  Each rule, broken on purpose. Red is the pass.\n');
for (const m of MUTATIONS) {
  const p = FILES[m.file];
  const src = ORIGINAL[m.file];
  if (!src.includes(m.find)) {
    ok(m.name, false, { error: 'the find text is no longer in the file, so this mutation tests nothing', find: m.find.slice(0, 140) });
    continue;
  }
  fs.writeFileSync(p, src.split(m.find).join(m.repl));
  let r;
  try { r = runSuite(); } finally { restore(); }

  const hit = m.must.filter((name) => r.failed.some((f) => f.startsWith(name.slice(0, 55))));
  const stray = r.failed.filter((f) => !m.must.some((name) => f.startsWith(name.slice(0, 55))));

  ok(m.name, r.code !== 0 && hit.length === m.must.length,
    r.code === 0
      ? { error: 'SUITE STAYED GREEN. This rule is not guarded.', expected: m.must }
      : (hit.length !== m.must.length
        ? { error: 'the suite went red, but not for the rule under test', expected: m.must, actually_failed: r.failed.slice(0, 6) }
        : undefined));
  if (r.code !== 0 && hit.length === m.must.length && stray.length) {
    console.log('           (also red, which is fine: ' + stray.slice(0, 3).join('; ') + ')');
  }
}

restore();
let clean = true;
for (const [k, p] of Object.entries(FILES)) if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) clean = false;
ok('the tree is restored byte for byte', clean);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
