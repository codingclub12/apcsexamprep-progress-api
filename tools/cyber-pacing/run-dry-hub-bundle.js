'use strict';
// Dry run for the course hub rows and the teacher bundle copy fix.
const fs = require('fs');
const { execFileSync } = require('child_process');
const { transformHub, transformBundle } = require('./transform-hub-and-bundle.js');

for (const d of ['backup', 'diffs', '.work/new', '.work/tmp']) fs.mkdirSync(d, { recursive: true });
function ud(x, y, label) {
  fs.writeFileSync('.work/tmp/a', x); fs.writeFileSync('.work/tmp/b', y);
  try { execFileSync('diff', ['-u', '--label', `a/${label}`, '--label', `b/${label}`, '.work/tmp/a', '.work/tmp/b'], { encoding: 'utf8' }); return ''; }
  catch (e) { return e.stdout || ''; }
}
const results = [];
const ok = (n, p, d) => results.push({ name: n, pass: p, detail: d || '' });
const notes = [];

// --- course hub ---
const HUB = 'ap-cybersecurity-complete-course-guide';
const hubSrc = fs.existsSync(`backup/${HUB}.html`) ? `backup/${HUB}.html` : `.work/raw/${HUB}.html`;
const hubOrig = fs.readFileSync(hubSrc, 'utf8');
fs.writeFileSync(`backup/${HUB}.html`, hubOrig);
const hubNext = transformHub(hubOrig, notes);
fs.writeFileSync(`.work/new/${HUB}.html`, hubNext);
fs.writeFileSync(`diffs/${HUB}.diff`, ud(hubOrig, hubNext, HUB));

ok('hub: links the Unit 1 project', hubNext.includes('/pages/ap-cyber-unit-1-project'));
ok('hub: links Unit 1 scenario practice', hubNext.includes('/pages/ap-cyber-unit-1-scenario-practice'));
ok('hub: no Unit 3 project link added', !hubNext.includes('ap-cyber-unit-3-project'));
ok('hub: every pre-existing link survives',
  (hubOrig.match(/href="[^"]*"/g) || []).every((h) => hubNext.includes(h)));
ok('hub: only an insertion, nothing removed',
  hubNext.length > hubOrig.length && hubNext.replace(require('./transform-hub-and-bundle.js').HUB_ROWS, '') === hubOrig);

// --- teacher bundle ---
const BUNDLE = 'ap-cybersecurity-founding-teacher-bundle';
if (fs.existsSync(`backup/${BUNDLE}.html`)) {
  const bOrig = fs.readFileSync(`backup/${BUNDLE}.html`, 'utf8');
  const bNext = transformBundle(bOrig, notes);
  fs.writeFileSync(`.work/new/${BUNDLE}.html`, bNext);
  fs.writeFileSync(`diffs/${BUNDLE}.diff`, ud(bOrig, bNext, BUNDLE));
  ok('bundle: Course Access names projects', bNext.includes('plus unit projects and scenario practice'));
  ok('bundle: does not claim a project for every unit', !/projects for Units 1-5/.test(bNext));
  ok('bundle: single edit only',
    bNext.replace(require('./transform-hub-and-bundle.js').BUNDLE_NEW, require('./transform-hub-and-bundle.js').BUNDLE_OLD) === bOrig);
} else {
  console.log('(bundle description not cached; skipping bundle assertions)');
}

console.log('=== course hub + teacher bundle dry run ===\n');
for (const c of results) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (c.detail ? '  :: ' + c.detail : ''));
console.log('\nALL PASS: ' + results.every((r) => r.pass));
notes.forEach((n) => console.log('  edit: ' + n));
process.exit(results.every((r) => r.pass) ? 0 : 1);
