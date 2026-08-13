'use strict';
// Dry run for Task A: transform in memory, assert, write backups and diffs.
// Writes nothing to Shopify.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { transformBody } = require('./transform-nav.js');
const { assertNav } = require('./assert-nav.js');

const TARGETS = [
  'ap-cyber-unit-1-exam',
  'ap-cyber-unit-1-project',
  'ap-cyber-unit-1-scenario-practice',
  'ap-cyber-unit-1-lesson-1-exercise-1',
  'ap-cyber-unit-1-lesson-1-exercise-2',
  'ap-cyber-unit-1-lesson-1-lab',
  'ap-cyber-unit-1-lesson-2-exercise-1',
  'ap-cyber-unit-1-lesson-2-exercise-2',
  'ap-cyber-unit-1-lesson-2-lab',
  'ap-cyber-unit-1-lesson-2-quiz',
];

for (const d of ['backup', 'diffs', '.work/new', '.work/tmp']) fs.mkdirSync(d, { recursive: true });

function unifiedDiff(a, b, label) {
  fs.writeFileSync('.work/tmp/a', a);
  fs.writeFileSync('.work/tmp/b', b);
  try {
    execFileSync('diff', ['-u', '--label', `a/${label}`, '--label', `b/${label}`, '.work/tmp/a', '.work/tmp/b'],
      { encoding: 'utf8' });
    return '';
  } catch (e) {
    return e.stdout || '';
  }
}

const summary = [];
let allPass = true;

for (const handle of TARGETS) {
  const body = fs.readFileSync(`backup/${handle}.html`, 'utf8');
  fs.writeFileSync(`backup/${handle}.html`, body);

  const notes = [];
  let res;
  try {
    res = transformBody(body, notes);
  } catch (e) {
    summary.push({ handle, error: e.message });
    allPass = false;
    continue;
  }
  fs.writeFileSync(`.work/new/${handle}.html`, res.body);

  const checks = assertNav(body, res.body, handle);
  const failed = checks.filter((c) => !c.pass);
  if (failed.length) allPass = false;

  // Diff the nav block only; assertion 9 already proves the rest is untouched.
  const diff = unifiedDiff(res.oldNav + '\n', res.newNav + '\n', `${handle}#ucnav`);
  fs.writeFileSync(`diffs/${handle}.diff`, diff);

  summary.push({
    handle,
    revived: notes.filter((n) => n.startsWith('revived')).length,
    spanToDiv: notes.filter((n) => n.includes('span -> div')).length,
    current: notes.filter((n) => n.startsWith('current kept')).map((n) => n.split(' ').pop())[0] || '-',
    lenDelta: res.body.length - body.length,
    checks,
    failed: failed.length,
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log('\n=== TASK A DRY RUN: nav normalization ===\n');
console.log(pad('page', 36), pad('revived', 8), pad('span>div', 9), pad('current', 9), pad('dLen', 7), 'assertions');
console.log('-'.repeat(92));
for (const s of summary) {
  if (s.error) { console.log(pad(s.handle, 36), 'ERROR: ' + s.error); continue; }
  console.log(pad(s.handle, 36), pad(s.revived, 8), pad(s.spanToDiv, 9), pad(s.current, 9),
    pad((s.lenDelta >= 0 ? '+' : '') + s.lenDelta, 7),
    s.failed === 0 ? '9/9 PASS' : `${9 - s.failed}/9 -- FAIL`);
}

console.log('\n--- failures ---');
let any = false;
for (const s of summary) {
  for (const c of (s.checks || [])) {
    if (!c.pass) { any = true; console.log(`${s.handle}: ${c.name} :: ${c.detail}`); }
  }
}
if (!any) console.log('(none)');
console.log('\nALL PASS:', allPass);
