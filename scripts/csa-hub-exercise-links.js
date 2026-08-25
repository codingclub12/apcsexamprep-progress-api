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
  let fromJson = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--handles') { handles = argv[i += 1]; continue; }
    if (argv[i] === '--out') { out = argv[i += 1]; continue; }
    if (argv[i] === '--from-json') { fromJson = argv[i += 1]; continue; }
    files.push(argv[i]);
  }
  return { files, handles, out, fromJson };
}

// ── --from-json ──────────────────────────────────────────────────────────────
// The bodies and the handle list both have to come from the Admin API in the
// same sitting, and the per-file route means somebody copies four live page
// bodies out of an API response and into four files by hand. A stored hub body
// is 18 KB of style rules; a single character altered in transit ships a broken
// live page, and nothing downstream can see it, because the generator's checks
// look at links, size and div balance rather than at CSS.
//
// So this reads the API response itself. Save one query, pass one file, retype
// nothing:
//
//   { pages(first: 10, query: "handle:ap-csa-unit-*-course") {
//       nodes { handle body } } }
//
// The handle list can come out of the same file when it carries the lesson and
// activity pages too, which is why --handles stays optional in this mode.
function readFromJson(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const seen = [];
  // Accept the response whole, or any {nodes:[...]} inside it, so a multi-alias
  // query (u1/u2/u3/u4) works as readily as a single paginated one.
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.nodes)) {
      for (const n of node.nodes) if (n && typeof n.handle === 'string') seen.push(n);
    }
    for (const k of Object.keys(node)) walk(node[k]);
  }(doc));

  const byHandle = new Map();
  for (const n of seen) if (!byHandle.has(n.handle)) byHandle.set(n.handle, n);
  const bodies = [...byHandle.values()].filter((n) => typeof n.body === 'string' && n.body.length);
  if (!bodies.length) {
    throw new Error(`${file} carries no page with a body; the query must select body as well as handle`);
  }
  return { bodies, handles: new Set(byHandle.keys()) };
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
  const { files, handles, out, fromJson } = parseArgs(argv);
  if (!out || (!fromJson && (!files.length || !handles))) {
    console.error('usage: node scripts/csa-hub-exercise-links.js --handles <handles.txt> --out <out.csv> <hub-body.html>...');
    console.error('   or: node scripts/csa-hub-exercise-links.js --from-json <admin-response.json> --out <out.csv>');
    console.error('       [--handles <handles.txt>]   to widen the live handle set beyond that response');
    console.error('  fetch the bodies and the handle list from the Shopify Admin API first');
    process.exit(2);
  }

  let live;
  const rows = [];
  try {
    const json = fromJson ? readFromJson(fromJson) : null;
    // Both sources union when both are given: the JSON knows the hub bodies, a
    // handles file can carry the far larger lesson and activity handle set that
    // decides whether each chip links or locks.
    live = new Set([
      ...(json ? json.handles : []),
      ...(handles ? readHandles(handles) : []),
    ]);
    if (!live.size) throw new Error('the live handle set is empty; pass --handles or a richer query');

    const inputs = json
      ? json.bodies.map((n) => ({ name: n.handle, body: n.body }))
      : files.map((f) => ({ name: f, body: fs.readFileSync(f, 'utf8') }));

    for (const { name: file, body: inBody } of inputs) {
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
