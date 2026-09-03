'use strict';
// ---------------------------------------------------------------------------
//  LIVE CHECK for the 1.1 lab palette import. Board #202.
//
//      node scripts/verify-cyber-lab11-palette-live.js
//
//  Run this AFTER the Matrixify import, never before. Every assertion below is
//  FALSE on the page as it serves today, which is the only kind of live check
//  worth writing: the deploy gate's own first manifest asserted "status":"ok"
//  from /api/health, which was true before, during and after, and would have
//  passed if the deploy had never happened.
//
//  Storefront through lib/storefront-fetch.js with no User-Agent, per the
//  convention and because smoke:storefront scans every verify-*-live.js and
//  fails the build if one spoofs a browser again.
// ---------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch.js');

const PATH = '/pages/ap-cyber-unit-1-lesson-1-lab';
//  The ten the page reads. Each must resolve after the import.
const NEEDED = ['--purple', '--purple-mid', '--purple-light', '--purple-bg', '--purple-border',
  '--dark', '--gray-light', '--gray-border', '--green-bg', '--green-border'];

let fail = 0;
const check = (ok, msg, detail) => {
  console.log('  ' + (ok ? 'ok   ' : 'FAIL ') + msg + (detail ? '\n         ' + detail : ''));
  if (!ok) fail++;
};

let body;
try {
  body = sf.page(PATH, { timeout: 45 }).body;
} catch (e) {
  console.error('\n  could not read the page, so nothing below means anything:\n    ' + e.message + '\n');
  process.exit(2);
}

console.log('\n  ' + PATH + '  (' + body.length + ' bytes)\n');

//  1. The palette rule is actually being served. This is the byte string only
//     the new body emits, so it pins the import rather than the page.
check(body.includes('#cyber-lab-11{'), 'the wrapper carries a rule of its own');
check(/--purple\s*:\s*#6B21A8/i.test(body), 'the palette declares --purple as #6B21A8');

//  2. The real assertion: nothing the page reads is left unresolvable. This is
//     the condition the defect was, rather than a proxy for it, so it stays
//     true only while the fix is actually in place.
const used = new Set([...body.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]));
const defined = new Set([...body.matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
const undef = [...used].filter((u) => !defined.has(u)).sort();
check(undef.length === 0, 'every custom property the page reads is defined on the page',
  undef.length ? 'still unresolvable: ' + undef.join(' ') : null);
for (const n of NEEDED) check(defined.has(n), 'defined: ' + n);

//  3. The content the import must NOT have damaged. Cloudflare rewrites these
//     at serve time, so the live page shows the obfuscated form and the check
//     is that the SPECIMENS are still there at all, in either spelling.
const specimens = (body.match(/Email Specimen #\d/g) || []).length;
check(specimens === 4, 'all four email specimens survived the import', 'found ' + specimens);
const buttons = (body.match(/class="check-btn"/g) || []).length;
check(buttons >= 5, 'the check and continue buttons are still in the markup', 'found ' + buttons);
check(body.includes('data-lesson-id="1.1-lab"'), 'the gradebook lesson id is intact');

console.log(fail ? '\n  ' + fail + ' FAILED\n' : '\n  all green, the palette is live\n');
process.exit(fail ? 1 : 0);
