'use strict';
// ---------------------------------------------------------------------------
//  REDERIVE: does the CSA slide-gate pilot's scope agree with the raw
//  artifact that defines it, checked WITHOUT calling into the code under
//  test?
//
//  Board task 183. The "first implementation" is config/csa-slide-manifest.js
//  (API repo) and the COURSES/csaLessonIdFromWrapper additions to
//  assets/apcs-slides-gate.js (theme repo), both hand-written this session.
//  This script is the second, independent one: it reads four files as RAW
//  TEXT with its own regexes, never requires config/csa-slide-manifest.js or
//  config/slide-manifests.js, and never calls a function either file exports.
//  If this script and the manifest agree, it is because the same 15 lessons
//  are really there, not because one was copied from the other.
//
//  What "the raw artifact" means here: lib/csa-nav.js's UNIT_1 table is the
//  progress API's own pre-existing, independently-authored inventory of which
//  15 AP CSA lessons are Unit 1 and what their live page handles are (used
//  for the accordion nav, unrelated to slides). It was not written for this
//  task and does not import or reference the slide manifest, so it is a
//  legitimate second source rather than the same fact restated.
//
//  Run: node scripts/verify-csa-slide-pilot-scope.js
//  Requires APCSEXAMPREP_THEME_DIR (defaults to the sibling checkout path
//  used throughout this session) to find the theme repo's two files.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const API_ROOT = path.join(__dirname, '..');
const THEME_ROOT = process.env.APCSEXAMPREP_THEME_DIR || path.join(API_ROOT, '..', 'APCSExamPrep-theme');

function readRaw(p, label) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error('  [FAIL] could not read ' + label + ' at ' + p + ': ' + e.message);
    fail++;
    return '';
  }
}

console.log('\nCSA SLIDE PILOT: scope rederived from raw files, not from the manifest code\n');

// ---- 1. lib/csa-nav.js is the ground truth for "what is Unit 1" -----------
const navSrc = readRaw(path.join(API_ROOT, 'lib', 'csa-nav.js'), 'lib/csa-nav.js');

// Pull out the UNIT_1 block specifically (between "const UNIT_1 = {" and the
// matching "const UNIT_4_BUILT" that follows it in the real file), so a
// change to Unit 4 elsewhere in the file cannot leak into this count.
const unit1Block = (() => {
  const start = navSrc.indexOf('const UNIT_1 = {');
  const end = navSrc.indexOf('const UNIT_4_BUILT');
  if (start === -1 || end === -1 || end <= start) return null;
  return navSrc.slice(start, end);
})();
ok('lib/csa-nav.js has a UNIT_1 block', !!unit1Block);

// Rows look like: ['1.10', 'ap-csa-lesson-1-10-calling-class-methods', 'Title'],
const rowRe = /\['(\d+)\.(\d+)',\s*'(ap-csa-lesson-\d+-\d+-[a-z0-9-]+)',/g;
const navRows = [];
if (unit1Block) {
  let m;
  while ((m = rowRe.exec(unit1Block))) {
    navRows.push({ unit: m[1], num: m[2], handle: m[3] });
  }
}
ok('exactly 15 Unit 1 rows found in lib/csa-nav.js', navRows.length === 15, navRows.length);
ok('every row is unit "1"', navRows.every((r) => r.unit === '1'), navRows.map((r) => r.unit));
ok('lesson numbers are exactly 1 through 15, in order',
   navRows.map((r) => r.num).join(',') === Array.from({ length: 15 }, (_, i) => String(i + 1)).join(','),
   navRows.map((r) => r.num));

// Independently derive the expected manifest key set from the raw handles,
// e.g. "ap-csa-lesson-1-10-calling-class-methods" -> "1-10".
const expectedKeys = navRows
  .map((r) => r.handle.match(/^ap-csa-lesson-(\d+)-(\d+)-/))
  .filter(Boolean)
  .map((m) => `${m[1]}-${m[2]}`)
  .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
ok('handles themselves encode the same 15 lesson numbers as the row labels',
   expectedKeys.length === 15, expectedKeys);

// ---- 2. config/csa-slide-manifest.js, read as text, not required ----------
const manifestSrc = readRaw(path.join(API_ROOT, 'config', 'csa-slide-manifest.js'), 'config/csa-slide-manifest.js');
const keyRe = /'(\d+-\d+)':\s*\d+/g;
const manifestKeys = [];
{
  let m;
  while ((m = keyRe.exec(manifestSrc))) manifestKeys.push(m[1]);
}
const sortedManifestKeys = [...manifestKeys].sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
ok('manifest declares exactly 15 keys', manifestKeys.length === 15, manifestKeys);
ok('manifest keys are EXACTLY the 15 keys derived from lib/csa-nav.js, no more, no less',
   JSON.stringify(sortedManifestKeys) === JSON.stringify(expectedKeys),
   { manifest: sortedManifestKeys, expected: expectedKeys });

// ---- 3. config/slide-manifests.js registers ap-csa -------------------------
const registrySrc = readRaw(path.join(API_ROOT, 'config', 'slide-manifests.js'), 'config/slide-manifests.js');
ok("slide-manifests.js registers 'ap-csa'", /'ap-csa':\s*require\(['"]\.\/csa-slide-manifest['"]\)/.test(registrySrc));

// ---- 4. theme: assets/apcs-slides-gate.js, read as text --------------------
const gateSrc = readRaw(path.join(THEME_ROOT, 'assets', 'apcs-slides-gate.js'), 'assets/apcs-slides-gate.js');
ok('theme gate names the AP CSA Teacher Bundle', gateSrc.includes("bundleName: 'AP CSA Teacher Bundle'"));
ok('theme gate links the CSA bundle to the real live sales page',
   gateSrc.includes("bundleHref: '/pages/ap-csa-teacher-superpack'"));
ok('theme gate self-mount reads data-lesson-id off #apcsa-lesson',
   gateSrc.includes("querySelector('#apcsa-lesson[data-course=\"ap-csa\"]')"));
ok("theme gate bounds self-mount to unit '1' (the pilot), not all four CSA units",
   /if\s*\(\s*unit\s*!==\s*'1'\s*\)\s*return\s*null;/.test(gateSrc));

// ---- 5. theme: layout/theme.liquid path condition --------------------------
const liquidSrc = readRaw(path.join(THEME_ROOT, 'layout', 'theme.liquid'), 'layout/theme.liquid');
ok("theme.liquid loads the gate script on ap-csa-lesson-1-* pages",
   liquidSrc.includes("request.path contains '/pages/ap-csa-lesson-1-'"));
// The condition must still fire on the pre-existing CSP paths in the SAME
// if-statement, not a second, disconnected one that could be dropped from
// a template that only renders one of the two.
const ifLine = (liquidSrc.split('\n').find((l) => l.includes('{% if') && l.includes('ap-csa-lesson-1-')) || '');
ok('the CSA clause lives in the SAME if as the CSP clauses, not a separate one',
   ifLine.includes('ap-csp-teacher-resources') && ifLine.includes('ap-csp-course-bi'), ifLine.trim());

// ---- 6. the prefix cannot accidentally reach another CSA unit --------------
// Rederived independently: build every OTHER unit's real handle prefix from
// the same lib/csa-nav.js UNIT_4 rows and confirm none of them contains the
// Unit 1 prefix used in the theme condition (this is what makes the
// contains()-based match safe rather than merely convenient).
const unit4Block = navSrc.slice(navSrc.indexOf('const UNIT_4 = {'));
const unit4Rows = [];
{
  let m;
  const re4 = /'(ap-csa-lesson-\d+-\d+-[a-z0-9-]+)'/g;
  while ((m = re4.exec(unit4Block))) unit4Rows.push(m[1]);
}
ok('found Unit 4 handles to check the prefix against', unit4Rows.length > 0, unit4Rows.length);
ok('no Unit 4 handle contains the Unit 1 theme-condition prefix',
   unit4Rows.every((h) => !h.includes('ap-csa-lesson-1-')), unit4Rows.filter((h) => h.includes('ap-csa-lesson-1-')));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
