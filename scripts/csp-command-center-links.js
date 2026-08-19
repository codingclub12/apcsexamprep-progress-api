'use strict';
// -----------------------------------------------------------------------------
//  THE CSP COMMAND CENTER: give Big Idea 3 its page links.
//
//  WHAT IS WRONG TODAY
//  The teacher Command Center lists every topic as an accordion with three
//  groups: page links, student-safe files, and teacher-only files. Big Ideas 1,
//  2, 4 and 5 each give a teacher "Lesson page" and "Guided notes". Big Idea 3,
//  the largest at 30 to 35 percent of the exam, has an EMPTY pageLinks array on
//  all eighteen topics, so a teacher opening 3.7 sees downloads and nothing
//  else. The lesson pages and the guided notes pages exist. They were never
//  wired in.
//
//  WHAT THIS ADDS
//  Three links per Big Idea 3 topic: the lesson page, the guided notes, and the
//  study game. Fifty four entries across eighteen topics.
//
//  HOW IT EDITS
//  Surgically. The page body carries a large minified `var DATA = {...}` blob,
//  and re-serialising it would rewrite every byte of a 132 KB live page for the
//  sake of eighteen small insertions. So this finds each topic's exact
//  `"pageLinks":[]` and replaces only that, leaving the rest byte for byte
//  identical. It asserts eighteen replacements and no more.
//
//  WHAT IT REFUSES
//    - a body that is not the stored Command Center body
//    - a topic whose title in DATA does not match the title expected here,
//      which would mean the curriculum moved under us
//    - any target page handle that is not in the verified live set
//    - DATA that no longer parses as JSON after the edit
//    - a different number of replacements than the eighteen intended
//    - an output that is not larger than the input
//
//  Run: node scripts/csp-command-center-links.js <live-body.html> <out.csv> [--verified handles.txt]
//  Get the live body from the Shopify Admin API, never from the rendered page.
// -----------------------------------------------------------------------------

const fs = require('fs');
const { GAMES } = require('./csp-game-pages-csv');

const HANDLE = 'csp-command-center';
const PUBLISHED_AT = '2026-03-01 12:00:00';

const REQUIRED = ['var DATA = {', '"bigIdeas"', 'csp-command-center'];

// Topic id -> [lesson page handle, title as it must appear in DATA].
// The handles are editorial slugs and cannot be derived from the topic number,
// so they are listed. The title is carried alongside purely as a tripwire: if
// the curriculum is renumbered or retitled, this stops rather than writing a
// link onto the wrong topic.
const LESSONS = {
  '3.1':  ['ap-csp-course-bi3-variables',                'Variables and Assignments'],
  '3.2':  ['ap-csp-course-bi3-data-abstraction',         'Data Abstraction'],
  '3.3':  ['ap-csp-course-bi3-mathematical-expressions', 'Mathematical Expressions'],
  '3.4':  ['ap-csp-course-bi3-strings',                  'Strings'],
  '3.5':  ['ap-csp-course-bi3-boolean-expressions',      'Boolean Expressions'],
  '3.6':  ['ap-csp-course-bi3-conditionals',             'Conditionals'],
  '3.7':  ['ap-csp-course-bi3-nested-conditionals',      'Nested Conditionals'],
  '3.8':  ['ap-csp-course-bi3-iteration',                'Iteration'],
  '3.9':  ['ap-csp-course-bi3-developing-algorithms',    'Developing Algorithms'],
  '3.10': ['ap-csp-course-bi3-lists',                    'Lists'],
  '3.11': ['ap-csp-course-bi3-binary-search',            'Binary Search'],
  '3.12': ['ap-csp-course-bi3-calling-procedures',       'Calling Procedures'],
  '3.13': ['ap-csp-course-bi3-developing-procedures',    'Developing Procedures'],
  '3.14': ['ap-csp-course-bi3-libraries',                'Libraries'],
  '3.15': ['ap-csp-course-bi3-random-values',            'Random Values'],
  '3.16': ['ap-csp-course-bi3-simulations',              'Simulations'],
  '3.17': ['ap-csp-course-bi3-algorithmic-efficiency',   'Algorithmic Efficiency'],
  '3.18': ['ap-csp-course-bi3-undecidable-problems',     'Undecidable Problems'],
};

function notesHandle(topic) {
  return 'ap-csp-topic-' + topic.replace('.', '-') + '-guided-notes';
}

// Topic -> game id, taken from the same table that builds the game pages and the
// study games hub, so a game cannot appear in one place and not another.
function gameFor(topic) {
  const ids = Object.keys(GAMES).filter((id) => String(GAMES[id].topic) === topic);
  if (ids.length > 1) throw new Error(`${topic} maps to ${ids.length} games`);
  return ids[0] || null;
}

// The label says "not graded" because this page is where a teacher decides what
// to assign, and a game sitting beside the quiz reads as gradeable. It is not:
// scores go to game_scores and never reach progress, attempts or any gradebook
// table. Saying so here is cheaper than answering it in a support email.
const GAME_LABEL = 'Study game (not graded)';

function linksFor(topic) {
  const out = [];
  out.push({ href: '/pages/' + LESSONS[topic][0], label: 'Lesson page' });
  out.push({ href: '/pages/' + notesHandle(topic), label: 'Guided notes (student digital copy)' });
  const g = gameFor(topic);
  if (g) out.push({ href: '/pages/ap-csp-game-' + g, label: GAME_LABEL });
  return out;
}

function build(inBody, verified) {
  const missing = REQUIRED.filter((m) => inBody.indexOf(m) === -1);
  if (missing.length) {
    throw new Error('this is not the stored Command Center body, it is missing '
      + missing.join(', ') + '. Fetch it from the Shopify Admin API.');
  }

  let body = inBody;
  const added = [];
  for (const topic of Object.keys(LESSONS)) {
    const title = LESSONS[topic][1];
    // Anchor on id AND title AND the empty array, so a renumbered or retitled
    // curriculum fails loudly instead of landing a link on the wrong topic.
    const anchor = `"id":"${topic}","title":"${title}","days":`;
    const at = body.indexOf(anchor);
    if (at === -1) throw new Error(`${topic} (${title}) was not found with an unchanged title`);
    if (body.indexOf(anchor, at + 1) !== -1) throw new Error(`${topic} appears more than once`);
    const empty = '"pageLinks":[]';
    const emptyAt = body.indexOf(empty, at);
    if (emptyAt === -1 || emptyAt > at + anchor.length + 12) {
      throw new Error(`${topic} does not have an empty pageLinks immediately after its title`);
    }
    const links = linksFor(topic);
    for (const l of links) {
      const h = l.href.replace('/pages/', '');
      if (verified && !verified.has(h)) throw new Error(`${topic}: ${h} is not in the verified live page set`);
    }
    body = body.slice(0, emptyAt)
      + '"pageLinks":' + JSON.stringify(links)
      + body.slice(emptyAt + empty.length);
    added.push({ topic, links });
  }

  const problems = check(inBody, body, added);
  return { body, added, problems };
}

function check(inBody, outBody, added) {
  const problems = [];
  if (Buffer.byteLength(outBody) <= Buffer.byteLength(inBody)) {
    problems.push('the output is not larger than the input, so nothing was added');
  }
  const before = (inBody.match(/"pageLinks":\[\]/g) || []).length;
  const after = (outBody.match(/"pageLinks":\[\]/g) || []).length;
  if (before - after !== 18) problems.push(`${before - after} empty pageLinks were filled, expected 18`);

  // DATA must still be valid JSON, or the page renders nothing at all.
  const m = outBody.match(/var DATA = (\{[\s\S]*?\});\s*\n/) || outBody.match(/var DATA = (\{[\s\S]*?\})\s*;/);
  if (!m) problems.push('the DATA blob could not be located after the edit');
  else {
    let d = null;
    try { d = JSON.parse(m[1]); } catch (e) { problems.push('DATA no longer parses as JSON: ' + e.message); }
    if (d) {
      const bi3 = d.bigIdeas.find((b) => b.n === 3);
      const empty = bi3.topics.filter((t) => !t.pageLinks || !t.pageLinks.length);
      if (empty.length) problems.push(`${empty.length} Big Idea 3 topics still have no page links`);
      const totals = d.bigIdeas.map((b) => b.topics.reduce((n, t) => n + (t.pageLinks || []).length, 0));
      if (totals[2] !== 54) problems.push(`Big Idea 3 has ${totals[2]} page links, expected 54`);
    }
  }
  // Nothing that was linked before may have stopped being linked.
  const links = (s) => new Set(s.match(/\/pages\/[a-z0-9-]+/g) || []);
  const lost = [...links(inBody)].filter((l) => !links(outBody).has(l));
  if (lost.length) problems.push(`${lost.length} existing link(s) disappeared: ${lost.slice(0, 4).join(', ')}`);
  // House rule: everything this script writes is ASCII.
  const written = added.map((a) => JSON.stringify(a.links)).join('');
  // eslint-disable-next-line no-control-regex
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(written)) problems.push('the generated links contain non-ASCII characters');
  return problems;
}

function main(argv) {
  const src = argv[0];
  const out = argv[1];
  if (!src || !out) {
    console.error('usage: node scripts/csp-command-center-links.js <live-body.html> <out.csv> [--verified handles.txt]');
    process.exit(2);
  }
  let verified = null;
  const vi = argv.indexOf('--verified');
  if (vi > -1) {
    verified = new Set(fs.readFileSync(argv[vi + 1], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  }
  const inBody = fs.readFileSync(src, 'utf8');
  let res;
  try {
    res = build(inBody, verified);
  } catch (e) {
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

  const withGame = res.added.filter((a) => a.links.length === 3).length;
  console.log(`\n    filled ${res.added.length} Big Idea 3 topics`);
  console.log(`    ${res.added.reduce((n, a) => n + a.links.length, 0)} links added, ${withGame} of them including a study game`);
  console.log(`    body ${(Buffer.byteLength(inBody) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(res.body) / 1024).toFixed(0)} KB out`);
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live page first.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, linksFor, LESSONS, notesHandle, gameFor, GAME_LABEL, HANDLE };
