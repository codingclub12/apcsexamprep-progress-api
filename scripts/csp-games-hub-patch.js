'use strict';
// -----------------------------------------------------------------------------
//  THE STUDY GAMES HUB: add the Big Idea 3 games, and retire the ones that have
//  shipped from the coming-soon list.
//
//  WHY THIS IS A SCRIPT AND NOT AN EDIT
//  Eighteen standalone game pages are worth nothing until something links them.
//  But the hub is a live, high-traffic page and its body is 350 KB of theme
//  markup that this repo is not the source of truth for. Hand-editing it is how
//  a page gets silently truncated at a stray quote, so nothing here is typed:
//  the live body goes in, a generated section goes in at ONE known anchor, the
//  result is checked against the input, and a Matrixify sheet comes out.
//
//  WHAT IT REFUSES TO DO
//  It compares the output against the input and fails on any of:
//    - a change in the number of opening or closing div tags beyond what the
//      inserted cards account for
//    - the anchor appearing zero times or more than once
//    - any existing /pages/ link disappearing
//    - an empty or suspiciously shrunken body
//  A Matrixify import with an empty Body HTML wipes the page and reports
//  success, so a body that came out smaller than it went in is a hard stop.
//
//  The generated markup is pure ASCII. The live page uses raw bullets, arrows
//  and emoji; numeric character references render identically and keep this
//  file inside the house rule.
//
//  Run: node scripts/csp-games-hub-patch.js <live-body.html> <out.csv>
//  Get the live body first, from the Shopify Admin API. Do not paste it by hand.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const { GAMES } = require('./csp-game-pages-csv');

const HANDLE = 'ap-csp-study-games-hub';
const PUBLISHED_AT = '2026-03-01 12:00:00';

// The new section goes in front of the coming-soon heading, so it lands after
// the games that already play and before the ones that do not. The heading text
// carries an emoji on the live page, so it is matched on the ASCII words either
// side of it rather than on the character itself.
const ANCHOR_RE = /<div class="sec-label">[^<]*More games coming[^<]*<\/div>/;

// The stored Body HTML carries the page's own stylesheet. A body scraped from
// the rendered page usually starts at the wrapper div and drops it, which
// imports cleanly and renders an unstyled page. That mistake was made once while
// writing this, so the shape is checked rather than trusted.
const REQUIRED = ['<style>', '#cspgh .card', '<div id="cspgh">'];

// One line per Big Idea 3 game: the icon and the one-sentence hook on the card.
// Keyed by the game id, so a game with no entry here is a hard error rather than
// a card that quietly says nothing.
const CARDS = {
  'swap-shop':           { icon: '&#128260;', blurb: 'Move values between variables one assignment at a time, and watch a value vanish the moment you overwrite it.' },
  'name-the-thing':      { icon: '&#127991;', blurb: 'Name the repeated value, then let a change request prove which copies you should have named and which you should not.' },
  'mod-machine':         { icon: '&#10145;',  blurb: 'Pick the expression that turns every input into the right output, and watch a near miss pass three rows and fail the fourth.' },
  'string-lab':          { icon: '&#9986;',   blurb: 'Cut the exact piece of text the job asks for, on a ruler that counts from one.' },
  'gate-keeper':         { icon: '&#128274;', blurb: 'Build the AND, OR and NOT expression that matches the spec on all four rows, including the one that flips.' },
  'boundary-patrol':     { icon: '&#128207;', blurb: 'Pick the operator that admits exactly the right values, including the one sitting on the line.' },
  'branch-runner':       { icon: '&#127807;', blurb: 'Walk one input down a nest of conditions and find out which IF the ELSE really belongs to.' },
  'iteration-station':   { icon: '&#128260;', blurb: 'Predict where each loop ends, then watch every pass run and see exactly where you drifted.' },
  'algorithm-assembler': { icon: '&#129513;', blurb: 'Every statement is correct. Putting it before, inside or after the loop is the entire job.' },
  'list-surgeon':        { icon: '&#128203;', blurb: 'Reshape a list with real AP operations and watch the indices renumber under your hands.' },
  'halving-hunter':      { icon: '&#128269;', blurb: 'Find the hidden number in as few guesses as binary search would need, and learn why doubling the list adds only one.' },
  'call-sheet':          { icon: '&#128222;', blurb: 'Fill the arguments, run the call, and see which parameter each one actually landed in.' },
  'procedure-shop':      { icon: '&#128736;', blurb: 'Three lines that nearly repeat. Decide what varies, because that and only that becomes a parameter.' },
  'doc-detective':       { icon: '&#128373;', blurb: 'You did not write this library and cannot see inside it. The documentation is all you get, so read it.' },
  'odds-maker':          { icon: '&#127922;', blurb: 'Call the odds before the machine runs, then watch two thousand trials decide whether you were right.' },
  'sim-lab':             { icon: '&#127981;', blurb: 'Decide what a model must include and what it can drop, then run it and see what the simplification cost.' },
  'big-o-race':          { icon: '&#127950;', blurb: 'Race two algorithms as the input grows and watch nested loops fall off a cliff while a single pass keeps up.' },
  'halt-or-not':         { icon: '&#128721;', blurb: 'Some questions a program can always answer. Some no program can answer for every input, however long you wait.' },
};

function bigIdea3Ids() {
  return Object.keys(GAMES)
    .filter((id) => String(GAMES[id].topic).indexOf('3.') === 0)
    .sort((a, b) => parseFloat(GAMES[a].topic.slice(2)) - parseFloat(GAMES[b].topic.slice(2)));
}

function card(id) {
  const meta = GAMES[id];
  const c = CARDS[id];
  if (!c) throw new Error(`${id} has no card entry, so it would render an empty card`);
  return '<a class="card" href="/pages/ap-csp-game-' + id + '">'
    + '<span class="bi bi3">Big Idea 3 &bull; Topic ' + meta.topic + '</span>'
    + '<div class="icon">' + c.icon + '</div>'
    + '<h3>' + meta.shareName + '</h3>'
    + '<p>' + c.blurb + '</p>'
    + '<span class="play">Play &rarr;</span>'
    + '</a>';
}

function section(ids) {
  return '<div class="sec-label">&#129504; Big Idea 3: Algorithms and Programming</div>'
    + '<p class="note" style="margin:0 auto 14px">'
    + 'A game for every one of the eighteen Big Idea 3 topics, which is thirty to thirty five percent of the exam. '
    + 'Each one is built around the mistake that topic actually produces.'
    + '</p>'
    + '<div class="grid">' + ids.map(card).join('') + '</div>';
}

// A coming-soon tile for a game that now exists is worse than no tile: it tells
// a student the thing they are looking at does not exist yet.
function dropShippedMinis(body, ids) {
  const names = ids.map((id) => GAMES[id].shareName);
  let out = body;
  const dropped = [];
  for (const name of names) {
    const re = new RegExp('<div class="mini">(?:(?!</div>)[\\s\\S])*?<h4>' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</h4>[\\s\\S]*?</div>', 'g');
    const before = out;
    out = out.replace(re, '');
    if (out !== before) dropped.push(name);
  }
  return { body: out, dropped };
}

function check(inBody, outBody, ids) {
  const problems = [];
  if (!outBody.trim()) problems.push('the output body is empty, which would wipe the live page');
  if (Buffer.byteLength(outBody) < Buffer.byteLength(inBody)) {
    problems.push('the output is SMALLER than the input, so something was lost rather than added');
  }
  const links = (s) => new Set((s.match(/\/pages\/[a-z0-9-]+/g) || []));
  const lost = [...links(inBody)].filter((l) => !links(outBody).has(l));
  if (lost.length) problems.push(`${lost.length} existing link(s) disappeared: ${lost.slice(0, 4).join(', ')}`);
  for (const id of ids) {
    if (outBody.indexOf('/pages/ap-csp-game-' + id) === -1) problems.push(`${id} is not linked in the output`);
  }
  const open = (s) => (s.match(/<div[\s>]/g) || []).length;
  const close = (s) => (s.match(/<\/div>/g) || []).length;
  if (open(outBody) !== close(outBody)) {
    problems.push(`the output has ${open(outBody)} div opens and ${close(outBody)} closes`);
  }
  // eslint-disable-next-line no-control-regex
  const generated = section(ids);
  const nonAscii = generated.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) problems.push(`the generated section has ${nonAscii.length} non-ASCII char(s)`);
  return problems;
}

function build(inBody) {
  const ids = bigIdea3Ids();
  const missing = REQUIRED.filter(function (m) { return inBody.indexOf(m) === -1; });
  if (missing.length) {
    throw new Error('this is not the stored hub body, it is missing ' + missing.join(', ')
      + '. Fetch it from the Shopify Admin API rather than from the rendered page.');
  }
  const hits = inBody.match(new RegExp(ANCHOR_RE.source, 'g')) || [];
  if (hits.length !== 1) {
    throw new Error('the coming-soon heading was found ' + hits.length + ' times; refusing to guess');
  }
  const at = inBody.search(ANCHOR_RE);
  const withSection = inBody.slice(0, at) + section(ids) + inBody.slice(at);
  const { body, dropped } = dropShippedMinis(withSection, ids);
  return { body, ids, dropped, problems: check(inBody, body, ids) };
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/csp-games-hub-patch.js <live-body.html> <out.csv>');
    console.error('  fetch the live body from the Shopify Admin API first; do not paste it by hand');
    process.exit(2);
  }
  const inBody = fs.readFileSync(src, 'utf8');
  let res;
  try {
    res = build(inBody);
  } catch (e) {
    // A guard rail whose job is to explain should not explain with a stack trace.
    console.error('\n  Refused: ' + e.message + '\n');
    process.exit(1);
  }
  if (res.problems.length) {
    console.error(`\n  ${res.problems.length} problem(s). No file written:\n`);
    res.problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', res.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  console.log(`\n    linked ${res.ids.length} Big Idea 3 games`);
  console.log(`    retired ${res.dropped.length} coming-soon tile(s): ${res.dropped.join(', ') || 'none'}`);
  console.log(`    body ${(Buffer.byteLength(inBody) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(res.body) / 1024).toFixed(0)} KB out`);
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live page first.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, section, card, bigIdea3Ids, CARDS, ANCHOR_RE, REQUIRED, HANDLE };
