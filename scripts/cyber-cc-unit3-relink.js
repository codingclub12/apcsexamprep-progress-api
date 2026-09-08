'use strict';
// -----------------------------------------------------------------------------
//  CYBER COMMAND CENTER, UNIT 3: point each row at the page it names.
//
//  ── WHAT IS WRONG ──────────────────────────────────────────────────────────
//  Three of the six Unit 3 rows open a lesson about something else:
//
//      row 3.3 Firewalls   opens lesson-3, which is now Wireless   (CED 3.2)
//      row 3.5 IDS         opens lesson-5, which is now Firewalls  (CED 3.4)
//      row 3.6 Wireless    opens lesson-6, which is now IDS        (CED 3.5)
//
//  Rows 3.1, 3.2 and 3.4 are correct. That is the tell: an off-by-one would
//  move every row, and this moves exactly three, because Unit 3's renumbering
//  was a THREE-CYCLE over lessons 3, 5 and 6 (lib/cyber-unit3-renumber.js PLAN:
//  target 3 took source 6's body, target 5 took source 3's, target 6 took
//  source 5's). The rows whose bodies never moved still link correctly.
//
//  The Command Center keys its rows on the OLD SITE numbers and builds every
//  handle as lesson-<row number>. That identity held before the renumbering and
//  broke the moment three bodies swapped handles. Nothing here is off by one and
//  spot-checking two rows can easily hit two correct ones.
//
//  ── ONE PASS, NEVER A SEQUENCE OF REPLACES ─────────────────────────────────
//  This is the same trap lib/cyber-unit3-renumber.js documents. A three-cycle
//  rewritten as ordered replaces ping-pongs: turn lesson-3 into lesson-5, then
//  lesson-5 into lesson-6, and the row that was already correct moves too, and
//  the transform cannot tell its own output from its input.
//
//  So each row is rewritten from its OWN id, once. The replacement never reads
//  the number currently in the handle, which makes the transform idempotent:
//  running it on already-fixed input is a no-op rather than another rotation.
//
//  ── THE MAP IS DERIVED, NOT TYPED ──────────────────────────────────────────
//  OLD_TO_TARGET comes from PLAN. Retyping it is exactly how site 3.3 and 3.4
//  became each other's CED topics in the first place.
//
//  THIS WRITES A FILE AND NOTHING ELSE. Importing is a human action, and MERGE
//  overwrites a live body with no undo.
//
//  Run: node scripts/cyber-cc-unit3-relink.js <body.html> <out.csv>
// -----------------------------------------------------------------------------
const fs = require('fs');
const { PLAN } = require('../lib/cyber-unit3-renumber');

const CC_HANDLE = 'cyber-command-center';
const CC_TITLE = 'Cyber Command Center';
//  Fixed and past-dated, per scripts/matrixify-preflight.js: a live server time
//  scrambles Shopify's sort order on import.
const PUBLISHED_AT = '2026-03-01 12:00:00';

//  A body's original site topic -> the handle number that holds it today.
//  PLAN rows are {target, source, oldTopic, lessonId}: oldTopic is the number
//  the Command Center still uses as a row id, target is where that body lives.
const OLD_TO_TARGET = {};
for (const p of PLAN) OLD_TO_TARGET[p.oldTopic] = p.target;

function fail(msg) {
  console.error(`REFUSED  ${msg}`);
  process.exitCode = 1;
  return null;
}

//  Rewrite every ap-cyber-unit-3-lesson-N handle inside one row's text to the
//  target this row's id maps to. `n` is ignored on purpose: see the header.
function relinkRow(rowText, id) {
  const target = OLD_TO_TARGET[id];
  if (!target) return null;
  return rowText.replace(/ap-cyber-unit-3-lesson-\d/g, `ap-cyber-unit-3-lesson-${target}`);
}

function transform(body) {
  const before = body;
  let out = body;
  const moves = [];

  //  Block 1: the LESSONS data array. Only the site:{...} sub-object carries
  //  page handles; mats:{...} holds Google Drive ids that must not be touched.
  out = out.replace(/(\{ id:"(3\.\d)",[\s\S]*?site:\{)([^}]*)(\})/g, (m, head, id, site, tail) => {
    const next = relinkRow(site, id);
    if (next === null) { fail(`data array: row ${id} is not in PLAN`); return m; }
    if (next !== site) moves.push({ block: 'data array', id });
    return head + next + tail;
  });

  //  Block 2: the flat link map, "3.3":{page:...,quiz:...,ex1:...,ex2:...}.
  out = out.replace(/("(3\.\d)":\{)([^}]*)(\})/g, (m, head, id, links, tail) => {
    const next = relinkRow(links, id);
    if (next === null) { fail(`link map: row ${id} is not in PLAN`); return m; }
    if (next !== links) moves.push({ block: 'link map', id });
    return head + next + tail;
  });

  // ── assertions ────────────────────────────────────────────────────────────
  //  1. Exactly the three rotated rows moved, in both blocks. A transform that
  //     moved 6 rows has rotated the correct ones too.
  const movedIds = [...new Set(moves.map((m) => m.id))].sort();
  const WANT = ['3.3', '3.5', '3.6'];
  if (String(movedIds) !== String(WANT)) {
    return fail(`assertion 1: expected rows ${WANT} to move, got ${JSON.stringify(movedIds)}`);
  }
  if (moves.length !== 6) {
    return fail(`assertion 1: expected 3 rows x 2 blocks = 6 edits, got ${moves.length}`);
  }

  //  2. Every row now points at the handle its id maps to, in both blocks.
  //     Checked on the OUTPUT rather than trusted from the replace.
  for (const [, id, links] of out.matchAll(/"(3\.\d)":\{([^}]*)\}/g)) {
    const want = `ap-cyber-unit-3-lesson-${OLD_TO_TARGET[id]}`;
    for (const [, h] of links.matchAll(/(ap-cyber-unit-3-lesson-\d)/g)) {
      if (h !== want) return fail(`assertion 2: link map row ${id} still points at ${h}, wanted ${want}`);
    }
  }

  //  3. NOTHING ELSE CHANGED. The only bytes that may differ are the single
  //     digit after "lesson-" inside the rows that moved, so normalising every
  //     unit-3 handle to a placeholder must make input and output identical.
  const flat = (s) => s.replace(/ap-cyber-unit-3-lesson-\d/g, 'ap-cyber-unit-3-lesson-N');
  if (flat(before) !== flat(out)) {
    return fail('assertion 3: the transform changed something other than a unit-3 lesson number');
  }

  //  4. Idempotent. A second pass must be a no-op, which is the property the
  //     one-pass rule buys and the thing a ping-ponging fix would fail.
  const twice = transform.raw(out);
  if (twice !== out) return fail('assertion 4: running the transform twice is not a no-op');

  //  5. No Google Drive id was touched. They live in mats:{...} beside the
  //     site handles and a greedier regex would eat them.
  const ids = (s) => (s.match(/D\+"[A-Za-z0-9_-]+"/g) || []).join('|');
  if (ids(before) !== ids(out)) return fail('assertion 5: a Drive id changed');

  //  6. Unit 3 only. Units 1, 2, 4 and 5 must be byte-identical.
  for (const u of [1, 2, 4, 5]) {
    const rx = new RegExp(`ap-cyber-unit-${u}-[a-z0-9-]+`, 'g');
    if (String(before.match(rx)) !== String(out.match(rx))) {
      return fail(`assertion 6: a unit-${u} handle changed`);
    }
  }

  return { out, moves };
}

//  The raw rewrite, without the assertions, so assertion 4 can call it without
//  recursing forever.
transform.raw = function (body) {
  let out = body;
  out = out.replace(/(\{ id:"(3\.\d)",[\s\S]*?site:\{)([^}]*)(\})/g,
    (m, head, id, site, tail) => head + (relinkRow(site, id) ?? site) + tail);
  out = out.replace(/("(3\.\d)":\{)([^}]*)(\})/g,
    (m, head, id, links, tail) => head + (relinkRow(links, id) ?? links) + tail);
  return out;
};

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main() {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error('usage: node scripts/cyber-cc-unit3-relink.js <body.html> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const r = transform(body);
  if (!r) { console.error('\nNo sheet written.'); return; }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([CC_HANDLE, 'MERGE', CC_TITLE, r.out, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${out}`);
  console.log(`  ${body.length} -> ${r.out.length} bytes`);
  for (const m of r.moves) {
    console.log(`  row ${m.id} (${m.block}) now opens ap-cyber-unit-3-lesson-${OLD_TO_TARGET[m.id]}`);
  }
  console.log('\nMERGE overwrites the live body and Shopify keeps no undo.');
}

if (require.main === module) main();
module.exports = { transform, OLD_TO_TARGET, CC_HANDLE };
