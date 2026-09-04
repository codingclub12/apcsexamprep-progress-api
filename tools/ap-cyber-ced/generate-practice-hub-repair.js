'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REPAIR THE ONE EDGE THE HUB AND SPOKE IS MISSING.
//
//  ── WHAT IS WRONG ON THE LIVE SITE ─────────────────────────────────────────
//  Measured 2026-09-04 with scripts/verify-cyber-practice-live.js: 34 of its 35
//  checks pass and one fails. ap-cybersecurity-practice links NONE of its five
//  unit spokes. The spokes themselves serve 200, each reaches the course and its
//  unit study page, and every unit study page reaches its spoke. Only the hub's
//  own downward edge is absent, so the five pages are reachable from a study
//  page and from nowhere a student browsing the practice layer would look.
//
//  ── WHY THE OBVIOUS FIX IS WRONG, AND THIS IS THE POINT ────────────────────
//  That row already exists. imports/2026-09-04/cyber-practice-hub-links-pages.csv
//  carries ap-cybersecurity-practice with all five spoke links, and the OTHER
//  row in the same file, ap-cybersecurity-topics, matches the live body byte for
//  byte. So one row of a two row sheet landed and the other did not, and the
//  reflex is to re-import that file.
//
//  Do not. Diffing the sheet's row against today's live body finds THREE
//  differences, not one:
//
//      insert  883 chars   the related-links CSS          expected
//      insert  643 chars   the five spoke anchors         expected
//      DELETE  722 chars   a Question of the Day block    NOT EXPECTED
//
//  The live page has GAINED a Question of the Day card since that sheet was
//  written: 152 questions, all five units, linked from the practice hub. A
//  MERGE republishes the whole Body HTML, so re-importing the old row would
//  silently erase it. The sheet is not merely stale, it is destructive, and
//  nothing about re-running it would have said so.
//
//  So the block is rebuilt from TODAY's body, through the same lib/link-block.js
//  the original used, and the QOTD block is asserted present on the way out.
//
//  Run: node tools/ap-cyber-ced/generate-practice-hub-repair.js \
//         --bodies smoke/fixtures/live-bodies [--out-dir imports/2026-09-04d]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const linkBlock = require('../../lib/link-block.js');
const { roundTrip } = require('./sheet-csv');
const spec = require('../../lib/cyber-practice-spec');

const HEADER = ['Handle', 'Command', 'Body HTML'];
const HEADING = 'Practice by unit';

//  The one thing on the live page that the stale sheet would have removed. It
//  is asserted by a marker the block itself carries rather than by a byte count,
//  so the check keeps working when the card's copy is edited.
const CARRIED = [
  { what: 'the Question of the Day card', marker: 'data-practice-kind="daily"' },
  { what: 'the free response section', marker: 'ap-cybersecurity-frq-practice' },
  { what: 'the terminal labs section', marker: 'ap-cybersecurity-labs' },
  { what: 'the link back to the course', marker: 'ap-cybersecurity-complete-course-guide' },
];

function buildBody(live) {
  if (typeof live !== 'string' || !live.trim()) {
    throw new Error('the stored body is empty. An empty Body HTML cell erases the live page.');
  }
  const u = spec.umbrella();
  const links = spec.spokes().map((s) => ({
    handle: s.handle,
    label: `Unit ${s.unit_no} practice: ${s.unit_name}`,
  }));
  //  Every spoke resolves: all five answered 200 when this was written, and the
  //  live check re-establishes it rather than trusting this comment.
  const resolvable = new Set([...links.map((l) => l.handle), u.handle]);

  const res = linkBlock.build(live, links, resolvable, {
    selfHandle: u.handle,
    max: linkBlock.MAX_LINKS_HUB,
    heading: HEADING,
  });
  if (!res.changed) throw new Error('the hub already carries all five spoke links, so this is a no-op');
  if (res.added.length !== 5) {
    throw new Error(`expected to add 5 spoke links, added ${res.added.length}: ${res.added.join(', ')}`);
  }
  if (res.dropped && res.dropped.length) {
    throw new Error(`link-block dropped ${res.dropped.length}: ${res.dropped.join(', ')}`);
  }

  //  THE CHECK THE STALE SHEET WOULD HAVE FAILED. A MERGE writes the whole body,
  //  so anything the live page has that the new body does not is deleted on
  //  import. Assert the sections by marker, not by size.
  const lost = CARRIED.filter((c) => live.includes(c.marker) && !res.body.includes(c.marker));
  if (lost.length) {
    throw new Error(`the new body would delete ${lost.map((c) => c.what).join(', ')}`);
  }

  //  A link block adds. It never removes, so every byte of the live body has to
  //  still be in there, and the only difference is what the block inserted.
  //  check() throws a Refusal rather than returning a verdict, so calling it is
  //  the assertion. It re-derives div balance, byte growth, the anchor delta and
  //  script health, and script health is the one that matters here: this module
  //  put an insertion inside a JavaScript string literal on cyber-command-center
  //  once, and every structural check reported that as fine.
  linkBlock.check(live, res.body, res.added.length);

  return { body: res.body, added: res.added };
}

function generate(opts = {}) {
  const u = spec.umbrella();
  const file = path.join(opts.bodies, `${u.handle}.html`);
  if (!fs.existsSync(file)) {
    throw new Error(`no stored body at ${file}. Fetch it before generating:`
      + ' an empty Body HTML cell would erase the live page.');
  }
  const live = fs.readFileSync(file, 'utf8');
  const { body, added } = buildBody(live);

  const rows = [{ Handle: u.handle, Command: 'MERGE', 'Body HTML': body }];

  //  Parse the sheet back and diff, through the shared roundTrip so this uses
  //  the same comparison every other cyber sheet does. Generation is not
  //  evidence that generation worked: the CSP sheet lost 90 bytes a page while
  //  every semantic check passed, and a parse-back diff is what caught it.
  const { csv, drift } = roundTrip(rows, HEADER);
  if (drift.length) throw new Error(`parse-back drift: ${drift.join('; ')}`);

  return { csv, rows, body, live, added, header: HEADER };
}

module.exports = { generate, buildBody, HEADER, HEADING, CARRIED };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const bodies = arg('--bodies') || 'smoke/fixtures/live-bodies';
  const outDir = arg('--out-dir');
  const r = generate({ bodies });
  console.log(`live body   ${Buffer.byteLength(r.live)} bytes`);
  console.log(`new body    ${Buffer.byteLength(r.body)} bytes (+${Buffer.byteLength(r.body) - Buffer.byteLength(r.live)})`);
  console.log(`added       ${r.added.length} spoke links`);
  console.log('carried     ' + CARRIED.filter((c) => r.body.includes(c.marker)).map((c) => c.what).join(', '));
  console.log('parse-back: clean');
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'cyber-practice-hub-spokes-pages.csv');
    fs.writeFileSync(out, r.csv);
    console.log(`wrote ${out} (${Buffer.byteLength(r.csv)} bytes, ${r.rows.length} row)`);
  } else {
    console.log('(no --out-dir, nothing written)');
  }
}
