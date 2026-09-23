'use strict';
// -----------------------------------------------------------------------------
//  THE CYBER GRADER POINTS SHEET, AND EACH REFUSAL BROKEN ON PURPOSE.
//
//    1  the FIX is real: run the grader from a stored body of 1.4 Exercise 1
//       with the best answers. Unpatched it must top out at 12 / 5 / 5, and
//       patched at 12 / 6 / 6. Asserting both directions is what makes the
//       first number evidence rather than a coincidence of the harness.
//    2  the REFUSALS fire, each for its own reason, on a body mutated in
//       memory. A suite that goes red for a different rule is telling you the
//       rule you meant to test is hollow.
//    3  the SHEET on disk is what was described: BOM, MERGE, three columns,
//       one row per fixed handle, every after present and no before left.
//
//  Offline. Nothing here writes sabotage into the tree.
//  Run: npm run smoke:cyberpointsfix
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { FIXES, patchBody, readBack, HEADER } = require('../scripts/build-cyber-points-fix-sheet');
const { graderScript, parts, keywords, bestForPart } = require('../scripts/verify-cyber-points-fix-live');
const { parseCsv } = require('../scripts/build-leaderboard-xss-sheets');

const ROOT = path.join(__dirname, '..');
const HANDLE = 'ap-cyber-unit-1-lesson-4-exercise-1';
const SNAP = path.join(ROOT, 'shopify', 'page-snapshots', HANDLE + '.live-after-claims-import.html');
const SHEET = path.join(ROOT, 'imports', '2026-09-23b', 'cyber-grader-points-fix-pages.csv');

let fails = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; } else { fails++; console.error('  FAIL ' + msg); }
}

function scores(body) {
  const src = graderScript(body);
  const kw = keywords(src);
  return parts(body).map((p) => {
    const r = bestForPart(src, p, kw);
    return { n: p.n, stated: p.stated, got: r ? r.got : null };
  });
}

// -- 1  the fix is real ------------------------------------------------------
const src = fs.readFileSync(SNAP, 'utf8');
const before = scores(src);
ok(JSON.stringify(before.map((p) => p.got)) === '[12,5,5]',
  'unpatched grader should top out at 12/5/5, got ' + JSON.stringify(before.map((p) => p.got)));
ok(JSON.stringify(before.map((p) => p.stated)) === '[12,6,6]',
  'part headers should state 12/6/6, got ' + JSON.stringify(before.map((p) => p.stated)));

const out = patchBody(HANDLE, src, FIXES[HANDLE]);
ok(out.row && out.problems.length === 0, 'the stored body should patch cleanly: ' + out.problems.join('; '));
if (out.row) {
  const after = scores(out.row.after);
  ok(JSON.stringify(after.map((p) => p.got)) === '[12,6,6]',
    'patched grader should reach 12/6/6, got ' + JSON.stringify(after.map((p) => p.got)));
}

// -- 2  each refusal, alone --------------------------------------------------
function refusedFor(body, pairs, needle, label) {
  const r = patchBody('t', body, pairs);
  ok(!r.row, label + ': should have been refused');
  ok(r.problems.length === 1, label + ': expected exactly one reason, got ' + r.problems.length + ': ' + r.problems.join(' | '));
  ok(r.problems.some((p) => p.includes(needle)), label + ': reason should mention "' + needle + '", got ' + r.problems.join(' | '));
}

refusedFor('<p>a</p><p>a</p>', [['<p>a</p>', '<p>b</p>']], 'expected exactly 1', 'duplicated before');
refusedFor('<p>a</p>', [['<p>z</p>', '<p>b</p>']], 'expected exactly 1', 'missing before');
refusedFor('<p>x</p><p>y</p>', [['<p>x</p>', '<p>y</p>']], 'does not reverse', 'collision with existing text');
refusedFor('<p>a</p>', [['<p>a</p>', '<p>\u2014</p>']], 'non-ASCII', 'introduced em-dash');
refusedFor('<script>var a=1;</script>', [['var a=1;', 'var a=;']], 'no longer compiles', 'broken script');

// -- 3  the sheet on disk ----------------------------------------------------
ok(fs.existsSync(SHEET), 'sheet should be committed at ' + path.relative(ROOT, SHEET));
if (fs.existsSync(SHEET)) {
  const raw = fs.readFileSync(SHEET, 'utf8');
  ok(raw.charCodeAt(0) === 0xfeff, 'sheet should start with a BOM');
  const rows = parseCsv(raw.replace(/^\ufeff/, ''));
  const head = rows.shift();
  ok(head.join(',') === HEADER.join(','), 'header should be ' + HEADER.join(','));
  ok(rows.length === Object.keys(FIXES).length, 'one row per fixed handle');
  for (const r of rows) {
    ok(r.length === 3, r[0] + ': three columns');
    ok(r[1] === 'MERGE', r[0] + ': MERGE');
    const pairs = FIXES[r[0]];
    ok(!!pairs, r[0] + ': handle should be one this builder fixes');
    if (!pairs) continue;
    for (const [b, a] of pairs) {
      ok(!r[2].includes(b), r[0] + ': a before string is still in the sheet body');
      ok(r[2].split(a).length - 1 === 1, r[0] + ': an after string should appear exactly once');
    }
    const sc = scores(r[2]);
    ok(sc.every((p) => p.got === p.stated), r[0] + ': the sheet body should reach every stated part total, got '
      + JSON.stringify(sc));
  }
  ok(readBack(SHEET, rows.map((r) => ({ handle: r[0], after: r[2] }))) === rows.length, 'readBack agrees');
}

console.log('  cyber-points-fix: ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
