'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK THE STUDY GAMES FROM THE AP NETWORKING COURSE PAGE.
//
//  WHY THIS IS A SCRIPT AND NOT AN EDIT
//  Eleven game pages are worth nothing until something links them, and the hub
//  is worth nothing until the course page links the hub. But /pages/ap-networking
//  is a live, ranking page and this repo is not the source of truth for its body.
//  Hand-editing 20 KB of markup is how a page gets silently truncated at a stray
//  quote, so nothing here is typed: the live body goes in, a generated section
//  goes in at ONE known anchor, the result is checked against the input, and a
//  Matrixify sheet comes out.
//
//  Modelled directly on scripts/csp-games-hub-patch.js, which was written after
//  the same problem on the CSP side. The refusals below are its refusals.
//
//  WHAT IT REFUSES TO DO
//    - anchor appears zero times or more than once
//    - any existing /pages/ link disappears
//    - the div balance changes by anything other than what was inserted
//    - the body comes out smaller than it went in, or is suspiciously small
//    - the body does not start with the stored style tag and wrapper, which is
//      the tell that somebody pasted a body scraped from the RENDERED page and
//      dropped the page's own stylesheet
//    - the markup introduces non-ASCII, an em-dash, or a CSS grid using auto-fit
//  A Matrixify import with an empty Body HTML wipes the page and reports success,
//  so a body that came out smaller than it went in is a hard stop.
//
//  THE INSERTED MARKUP USES ONLY CLASSES THE PAGE ALREADY DEFINES
//  .unit, .u-eyebrow, .u-focus and .badge are all in the page's own stylesheet.
//  Adding a section that needs no new CSS is the smallest possible change to a
//  live page, and it cannot render unstyled.
//
//  Run: node scripts/networking-course-games-link.js <live-body.html> <out.csv>
//  Get the live body from the Shopify Admin API first. Do not paste it by hand.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');

const { GAMES, HUB_HANDLE } = require('./networking-game-pages-csv');

const HANDLE = 'ap-networking';
const PUBLISHED_AT = '2026-03-01 12:00:00';

// The section goes in front of the exam heading, so it lands after the units it
// draws on and before the exam and credential material.
const ANCHOR_RE = /<h2 id="exam">The exam and the credential<\/h2>/;

// And the contents entry goes after the units entry, matching the page order.
const TOC_RE = /<li><a href="#units">The four units and 22 topics<\/a><\/li>/;

// The stored Body HTML carries the page's own stylesheet and wrapper. A body
// scraped from the rendered page usually starts at the wrapper div and drops the
// style tag, which imports cleanly and renders an unstyled page.
const REQUIRED = [
  '<style>.main-page-title.page-title{display:none!important;}</style>',
  '<div id="apnet-hub"',
  '#apnet-hub .unit {',
  '<h2 id="units">',
];

const UNIT_NAME = {
  'unit-1': 'Unit 1',
  'unit-2': 'Unit 2',
  'unit-3': 'Unit 3',
  'unit-4': 'Unit 4',
};

function gameIds() {
  return Object.keys(GAMES).sort((a, b) => (GAMES[a].topic < GAMES[b].topic ? -1 : 1));
}

// One list item per game, ordered by topic so it reads in course order.
//
// The topic label is deliberately plain text and NOT a .badge. The green badge
// on this page means "this unit is live", and spending that signal on a topic
// number would dilute the one thing it currently tells a reader.
function items() {
  return gameIds().map((id) => {
    const g = GAMES[id];
    return '      <li><a href="/pages/ap-networking-game-' + id + '">'
      + g.shareName + '</a> (' + UNIT_NAME[g.unit] + ', Topic ' + g.topic + ')</li>';
  }).join('\n');
}

function section() {
  const n = gameIds().length;
  return [
    '  <h2 id="games">Free practice games</h2>',
    '  <p>Ten short games, one for every topic in the course that asks you to configure, secure or verify',
    '  something rather than just describe it. Each is built around a mistake people actually make on real',
    '  networks: the firewall rule that never gets reached, the subnet that is one host short, the test that',
    '  passes whether or not you configured anything. Nothing here is graded, so play them as often as you',
    '  like. <a href="/pages/' + HUB_HANDLE + '">Browse all ' + n + ' games -&gt;</a></p>',
    '',
    '  <div class="unit">',
    '    <div class="u-eyebrow">Practice <span class="badge live">Free</span>',
    '</div>',
    '    <h3>Every game, in course order</h3>',
    '    <p class="u-focus">The other twelve topics are covered by the study guides and topic quizzes, because',
    '    reading and answering questions is a fair way to assess explaining. It is not a fair way to assess',
    '    whether you can build the thing.</p>',
    '    <ol>',
    items(),
    '    </ol>',
    '  </div>',
    '',
  ].join('\n');
}

const TOC_ITEM = '<li><a href="#games">Free practice games</a></li>';

function build(inBody) {
  for (const need of REQUIRED) {
    if (!inBody.includes(need)) {
      throw new Error(`the body is missing ${JSON.stringify(need)}. This does not look like the stored `
        + 'Body HTML for /pages/ap-networking. Fetch it from the Admin API rather than the rendered page.');
    }
  }
  const anchors = (inBody.match(new RegExp(ANCHOR_RE.source, 'g')) || []).length;
  if (anchors !== 1) throw new Error(`the exam heading anchor appears ${anchors} times, expected exactly 1`);
  const tocs = (inBody.match(new RegExp(TOC_RE.source, 'g')) || []).length;
  if (tocs !== 1) throw new Error(`the units contents entry appears ${tocs} times, expected exactly 1`);
  if (inBody.includes('id="games"')) throw new Error('the page already has a games section; this patch is not idempotent by design, re-run it against a clean body');

  let out = inBody.replace(ANCHOR_RE, section() + '$&');
  out = out.replace(TOC_RE, '$&\n    ' + TOC_ITEM);
  return out;
}

function check(inBody, outBody) {
  const bad = [];

  // Growth. A shrunken body is the failure that wipes a page.
  if (Buffer.byteLength(outBody) <= Buffer.byteLength(inBody)) {
    bad.push(`output is ${Buffer.byteLength(outBody)} bytes against an input of ${Buffer.byteLength(inBody)}`);
  }
  if (Buffer.byteLength(outBody) < 4096) bad.push('output is too small to be this page');

  // Div balance. The section adds exactly two of each.
  const opens = (s) => (s.match(/<div[\s>]/g) || []).length;
  const closes = (s) => (s.match(/<\/div>/g) || []).length;
  const dOpen = opens(outBody) - opens(inBody);
  const dClose = closes(outBody) - closes(inBody);
  if (dOpen !== 2) bad.push(`div opens changed by ${dOpen}, expected 2`);
  if (dClose !== 2) bad.push(`div closes changed by ${dClose}, expected 2`);
  if (opens(outBody) !== closes(outBody)) {
    bad.push(`output has ${opens(outBody)} div opens and ${closes(outBody)} closes`);
  }

  // Nothing that was linked may stop being linked.
  const links = (s) => (s.match(/href="\/pages\/[a-z0-9-]+"/g) || []);
  const before = new Set(links(inBody));
  const after = new Set(links(outBody));
  for (const l of before) if (!after.has(l)) bad.push(`existing link disappeared: ${l}`);

  // Every game and the hub must now be linked, exactly once each.
  const wanted = gameIds().map((id) => `href="/pages/ap-networking-game-${id}"`)
    .concat([`href="/pages/${HUB_HANDLE}"`]);
  for (const w of wanted) {
    const n = (outBody.match(new RegExp(w.replace(/[/"]/g, (c) => '\\' + c), 'g')) || []).length;
    if (n !== 1) bad.push(`${w} appears ${n} times, expected exactly 1`);
  }

  // House rules on the markup this script generates.
  const added = outBody.slice(0);
  // eslint-disable-next-line no-control-regex
  const nonAscii = added.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (section().includes('—')) bad.push('the generated section contains an em-dash');
  if (/auto-fit|auto-fill/.test(section())) bad.push('the generated section uses auto-fit or auto-fill');

  // Exactly one contents entry and one section heading.
  const h2 = (outBody.match(/<h2 id="games">/g) || []).length;
  if (h2 !== 1) bad.push(`${h2} games headings, expected 1`);
  const toc = (outBody.match(/<a href="#games">/g) || []).length;
  if (toc !== 1) bad.push(`${toc} games contents entries, expected 1`);

  // The JSON-LD block must survive untouched.
  if ((outBody.match(/application\/ld\+json/g) || []).length
      !== (inBody.match(/application\/ld\+json/g) || []).length) {
    bad.push('the structured data block was disturbed');
  }
  return bad;
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const [inPath, out] = argv;
  if (!inPath || !out) {
    console.error('usage: node scripts/networking-course-games-link.js <live-body.html> <out.csv>');
    console.error('  <live-body.html> is the STORED Body HTML from the Shopify Admin API.');
    process.exit(2);
  }
  const inBody = fs.readFileSync(inPath, 'utf8');
  const outBody = build(inBody);
  const problems = check(inBody, outBody);
  if (problems.length) {
    console.error('Refusing to write a sheet that would damage the page:');
    problems.forEach((c) => console.error('  ' + c));
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([HANDLE, 'MERGE', outBody, 'TRUE'].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${out}`);
  console.log(`  ${HANDLE}: ${Buffer.byteLength(inBody)} -> ${Buffer.byteLength(outBody)} bytes`);
  console.log(`  added a contents entry, one section, and ${gameIds().length + 1} links`);
  console.log(`  every check passed: div balance, no lost links, structured data intact`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, check, section, items, gameIds, ANCHOR_RE, TOC_RE, REQUIRED, HANDLE };
