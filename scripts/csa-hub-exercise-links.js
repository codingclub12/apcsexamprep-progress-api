'use strict';
// -----------------------------------------------------------------------------
//  Patch the AP CSA unit hub pages: add the Coding Exercises section, repair the
//  broken CTA block, and emit one Matrixify sheet for the units you passed.
//
//  All of the safety posture lives in lib/csa-hub-links.js. This file is the
//  plumbing: read the live bodies, read the live handle list, refuse loudly,
//  write the sheet.
//
//    node scripts/csa-hub-exercise-links.js --handles live-handles.txt \
//      --out hubs.csv unit1.html unit2.html unit3.html unit4.html
//
//  Get BOTH inputs from the Shopify Admin API first; neither is safe to type.
//
//    pages(first: 50, query: "handle:ap-csa-unit-*-course") { nodes { handle body } }
//    pages(first: 50, query: "handle:ap-csa-lesson*exercise*") { nodes { handle } }
//
//  The handle list is what decides whether a chip is a link or a lock, so a
//  stale list ships a link to a 404. Re-query it in the same sitting as the
//  bodies, not from a document. Include the LESSON handles as well as the
//  exercise handles: a lesson handle the list does not contain is treated as a
//  dead link and relinked, so a partial list would rewrite live links.
// -----------------------------------------------------------------------------

const fs = require('fs');
const { build } = require('../lib/csa-hub-links');
const { UNIT_HUBS } = require('../lib/csa-exercise-pages');

const PUBLISHED_AT = '2026-03-01 12:00:00';

function hubHandle(unitPrefix) {
  const key = `unit-${unitPrefix.slice(1)}`;
  const handle = UNIT_HUBS[key];
  if (!handle) throw new Error(`no hub handle is known for ${key}`);
  return handle;
}

function parseArgs(argv) {
  const files = [];
  let handles = null;
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--handles') { handles = argv[i += 1]; continue; }
    if (argv[i] === '--out') { out = argv[i += 1]; continue; }
    files.push(argv[i]);
  }
  return { files, handles, out };
}

function readHandles(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const bad = lines.filter((l) => !/^[a-z0-9-]+$/.test(l));
  if (bad.length) throw new Error(`the handle list has ${bad.length} line(s) that are not handles: ${bad[0]}`);
  return new Set(lines);
}

function cell(s) {
  return `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
}

function main(argv) {
  const { files, handles, out } = parseArgs(argv);
  if (!files.length || !handles || !out) {
    console.error('usage: node scripts/csa-hub-exercise-links.js --handles <handles.txt> --out <out.csv> <hub-body.html>...');
    console.error('  fetch the bodies and the handle list from the Shopify Admin API first');
    process.exit(2);
  }

  let live;
  const rows = [];
  try {
    live = readHandles(handles);
    for (const file of files) {
      const inBody = fs.readFileSync(file, 'utf8');
      const res = build(inBody, live);
      if (res.problems.length) {
        console.error(`\n  ${res.problems.length} problem(s) in ${file}. No file written:\n`);
        res.problems.forEach((p) => console.error(`    ${p}`));
        console.error('');
        process.exit(1);
      }
      rows.push({ file, res, handle: hubHandle(res.unit), inBody });
    }
  } catch (e) {
    // A guard rail whose job is to explain should not explain with a stack trace.
    console.error(`\n  Refused: ${e.message}\n`);
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) {
    lines.push([r.handle, 'MERGE', r.res.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  }
  fs.writeFileSync(out, `﻿${lines.join('\r\n')}\r\n`);

  console.log('');
  for (const r of rows) {
    const linked = r.res.lessons.reduce((n, l) => n + l.exercises.filter((e) => e.built).length, 0);
    const locked = r.res.lessons.reduce((n, l) => n + l.exercises.filter((e) => !e.built).length, 0);
    for (const x of r.res.relinked) {
      console.log(`      relinked ${x.id}: ${x.from} -> ${x.to}`);
    }
    console.log(`    ${r.handle}: ${r.res.lessons.length} lessons, ${linked} exercise link(s), ${locked} locked, `
      + `CTA ${r.res.ctaFixed ? 'repaired' : 'already sound'}, `
      + `${(Buffer.byteLength(r.inBody) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(r.res.body) / 1024).toFixed(0)} KB out`);
  }
  console.log(`\n  wrote ${out}`);
  const anyRelinked = rows.some((r) => r.res.relinked.length);
  if (anyRelinked) {
    console.log('\n  A relinked card now points at the right page under its OLD label. Fixing the');
    console.log('  card title is a content change and is deliberately not done here.');
  }
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live pages first.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { main, readHandles, hubHandle };
