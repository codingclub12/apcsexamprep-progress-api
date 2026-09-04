'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the AP Networking Command Center file-gate sheet.
//
//  Runs entirely offline against two committed artifacts:
//    shopify/page-snapshots/ap-networking-command-center.before-file-gate.html
//    imports/2026-09-04d/networking-command-center-pages.csv
//
//  ── WHY THIS EXISTS AS A SUITE AND NOT ONLY AS A SCRIPT ─────────────────────
//  scripts/verify-networking-cc-sheet.js needs the live page and a generated
//  sheet, so it cannot gate a pull request. This runs the same generator over
//  the committed snapshot and requires it to reproduce the committed sheet byte
//  for byte. That catches the thing a one-shot script cannot: the generator and
//  the sheet drifting apart later, which is how a re-run quietly produces
//  something nobody reviewed.
//
//  ── WHAT IT PROVES ──────────────────────────────────────────────────────────
//    1. The generator is deterministic and still produces the committed sheet.
//    2. The sheet removes all 26 teacher Drive folder URLs.
//    3. The 44 student links survive byte for byte.
//    4. The gated ids are exactly the ones derived from the folders that were
//       on the page, and all of them are in the manifest routes/files.js reads.
//    5. The injected click code parses as JavaScript. A page whose script block
//       does not compile is worse than the leak it was fixing.
//    6. The generator REFUSES an already-gated body, so a second run cannot
//       double-apply.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
//
//  Run: node smoke/networking-cc-gate.js
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const gate = require('../scripts/networking-cc-gate-files');
const MANIFEST = require('../seed/networking-teacher-files.json');
const pf = require('../scripts/matrixify-preflight');

const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots',
  'ap-networking-command-center.before-file-gate.html');
const SHEET = path.join(__dirname, '..', 'imports', '2026-09-04d',
  'networking-command-center-pages.csv');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + String(x).slice(0, 200) : '')); }
};

const driveId = (id) => crypto.createHash('sha256').update(`drive:folder:${id}`).digest('hex').slice(0, 16);

console.log('\nAP NETWORKING COMMAND CENTER FILE GATE SHEET\n');

const src = fs.readFileSync(SNAP, 'utf8');
const rawSheet = fs.readFileSync(SHEET, 'utf8');
const sheetBody = pf.parseCsv(rawSheet.replace(/^﻿/, ''))[1][2];

console.log('1. The generator still reproduces the committed sheet');
{
  const res = gate.build(src);
  ok('  build produced no problems', res.problems.length === 0, res.problems.join(' | '));
  ok('  22 tf folders gated', res.tf === 22, res.tf);
  ok('  4 unit assessment folders gated', res.tests === 4, res.tests);
  ok('  44 student links preserved', res.student === 44, res.student);
  ok('  output matches the committed sheet byte for byte', res.body === sheetBody,
     res.body === sheetBody ? '' : `generated ${res.body.length} vs sheet ${sheetBody.length}`);
}

console.log('2. The exposure is gone and the student links are not');
{
  ok('  zero Drive folder references in the sheet',
     !/drive\.google\.com\/drive\/folders/.test(sheetBody));
  const srcFolders = [...src.matchAll(/(?:tf|tests):"https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
  ok('  the snapshot had 26 teacher folders', srcFolders.length === 26, srcFolders.length);
  const ids = (sheetBody.match(/"api:([0-9a-f]{16})"/g) || []).map((s) => s.slice(5, -1));
  ok('  26 api: ids in the sheet', ids.length === 26, ids.length);
  ok('  each is the id derived from its own folder',
     srcFolders.every((f) => ids.includes(driveId(f))));
  ok('  every id is one routes/files.js can resolve',
     ids.every((i) => Object.prototype.hasOwnProperty.call(MANIFEST, i)));

  const before = src.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
  const after = sheetBody.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
  ok('  44 student links before and after',
     before.length === 44 && after.length === 44, `${before.length} -> ${after.length}`);
  ok('  identical set, none altered',
     JSON.stringify(before.slice().sort()) === JSON.stringify(after.slice().sort()));
}

console.log('3. The injected JavaScript compiles');
{
  // The block carrying matButton is the one this change edits. A page whose
  // script does not parse is a worse outcome than the leak, so this is asserted
  // rather than assumed, and it is compared against the SNAPSHOT so a
  // pre-existing failure elsewhere on the page cannot be blamed on this change.
  const blockOf = (body) => [...body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .find((m) => m[2].includes('function matButton'));
  const srcBlock = blockOf(src);
  const outBlock = blockOf(sheetBody);
  ok('  the snapshot has a matButton block', !!srcBlock);
  ok('  the sheet still has one', !!outBlock);
  const compiles = (s) => { try { new vm.Script(s); return true; } catch (e) { return e.message; } };
  ok('  the snapshot block compiles', compiles(srcBlock[2]) === true, compiles(srcBlock[2]));
  ok('  the EDITED block compiles', compiles(outBlock[2]) === true, compiles(outBlock[2]));

  // AND THE FRESHLY GENERATED ONE, WHICH IS THE POINT.
  //
  // Compiling only the committed sheet tests a file, not the generator.
  // Mutation testing proved it: breaking the injected JS inside
  // networking-cc-gate-files.js left every assertion in this section GREEN and
  // went red only on the byte comparison in section 1, which would have
  // reported a size mismatch rather than "your JavaScript does not parse". A
  // generator that emits broken script is the failure this section exists for,
  // so it has to compile what the generator just built.
  const freshBlock = blockOf(gate.build(src).body);
  ok('  the FRESHLY GENERATED block compiles', compiles(freshBlock[2]) === true, compiles(freshBlock[2]));
  ok('  it emits data-file for api: hrefs', outBlock[2].includes('data-file="'));
  ok('  exactly one delegated listener', (sheetBody.match(/a\[data-file\]/g) || []).length === 1,
     (sheetBody.match(/a\[data-file\]/g) || []).length);
}

console.log('4. The sheet is shaped the way Matrixify needs');
{
  const rows = pf.parseCsv(rawSheet.replace(/^﻿/, ''));
  ok('  BOM present', rawSheet.charCodeAt(0) === 0xFEFF);
  ok('  header is Handle, Command, Body HTML',
     JSON.stringify(rows[0]) === JSON.stringify(['Handle', 'Command', 'Body HTML']), JSON.stringify(rows[0]));
  ok('  one data row, MERGE, right handle',
     rows.length === 2 && rows[1][0] === 'ap-networking-command-center' && rows[1][1] === 'MERGE');
  ok('  no CRLF survives inside the body cell', !/\r/.test(sheetBody));

  // The page has two script blocks the preflight cannot compile. They are in
  // the snapshot too, so this change neither introduced nor fixed them. Pinning
  // equality is what keeps that claim honest: if this change ever adds a third,
  // this assertion fails instead of the count being quietly accepted.
  const a = pf.scriptsCompile(src);
  const b = pf.scriptsCompile(sheetBody);
  ok('  the sheet compiles exactly as well as the snapshot did',
     JSON.stringify(a.bad) === JSON.stringify(b.bad), `snapshot ${a.bad.length} vs sheet ${b.bad.length}`);
}

console.log('5. Running the generator twice cannot double-apply');
{
  let refused = null;
  try { gate.build(sheetBody); } catch (e) { refused = e.message; }
  ok('  an already-gated body is refused', !!refused && /gated already/.test(refused), refused);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
