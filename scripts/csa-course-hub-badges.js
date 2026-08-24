'use strict';
// -----------------------------------------------------------------------------
//  Retire the live/coming-soon badges on /pages/ap-csa-course and emit the
//  Matrixify sheet. All of the posture lives in lib/csa-course-hub-badges.js.
//
//    node scripts/csa-course-hub-badges.js <live-body.html> <out.csv>
//
//  Get the body from a Matrixify Pages export or the Admin API. The rendered
//  storefront body works too: the two came back byte-identical for every CSA
//  hub measured on 2026-08-24.
// -----------------------------------------------------------------------------

const fs = require('fs');
const { build, HANDLE } = require('../lib/csa-course-hub-badges');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const cell = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/csa-course-hub-badges.js <live-body.html> <out.csv>');
    process.exit(2);
  }
  const inBody = fs.readFileSync(src, 'utf8');
  let res;
  try {
    res = build(inBody);
  } catch (e) {
    console.error(`\n  Refused: ${e.message}\n`);
    process.exit(1);
  }
  if (res.problems.length) {
    console.error(`\n  ${res.problems.length} problem(s). No file written:\n`);
    res.problems.forEach((p) => console.error(`    ${p}`));
    console.error('');
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', res.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, `﻿${lines.join('\r\n')}\r\n`);

  const b = res.before;
  console.log(`\n    removed ${b.liveBadges} Live badges, ${b.comingSoonBadges} Coming soon badges, `
    + `${b.unitCardBadges} unit card badge, ${b.counters} lesson counters`);
  console.log(`    reset ${b.liveTopicClass} highlighted topic rows to the default style`);
  console.log(`    kept ${res.after.codeEditorBadges} Code Editor badges`);
  console.log(`    ${(Buffer.byteLength(inBody) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(res.body) / 1024).toFixed(0)} KB out`);
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live page first.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { main };
