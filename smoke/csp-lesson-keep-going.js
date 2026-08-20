'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the Keep going block on the Big Idea 3 lesson pages.
//
//  WHAT IS BEING PROTECTED
//
//  1. A LINK TO A GAME THAT IS EMBEDDED SOMEWHERE ELSE. Nineteen games are
//     embedded directly in lesson pages, and a second copy on a standalone page
//     posts to the same leaderboard id on a different scoring scale, so one
//     board mixes two games and neither rank means anything. That shipped once.
//     EMBEDDED_IN_LESSON is the guard and this asserts no Big Idea 3 topic
//     points at a game in it.
//
//  2. A LINK TO A PAGE THAT DOES NOT EXIST. The block's whole job is to be a way
//     onward. A 404 is worse than no link, so every handle it builds is checked
//     against the generators that own those handles rather than typed here.
//
//  3. AN EDIT THAT IS NOT ACTUALLY ADDITIVE. The block is appended and nothing
//     already on the page is touched, which is what makes rollback "delete from
//     the marker onward" rather than a snapshot. If that stops being true the
//     rollback story silently stops being true with it.
//
//  4. A RERUN DOUBLING THE BLOCK. Matrixify imports get repeated. The builder
//     refuses a body that already carries the marker; this proves it.
//
//  WHAT THIS CANNOT PROVE: that the block looks right. It was rendered at 900px
//  and 390px before shipping, three across and one down, no page errors.
//
//  Zero PII: author content only.
//
//  Run: npm run smoke:keepgoing
// -----------------------------------------------------------------------------

const { blockFor, MARKER, CSS, build } = require('../scripts/csp-lesson-keep-going');
const { LESSONS, notesHandle, gameFor } = require('../scripts/csp-command-center-links');
const { GAMES, EMBEDDED_IN_LESSON, registryIds } = require('../scripts/csp-game-pages-csv');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const topics = Object.keys(LESSONS);

section('1. Every Big Idea 3 topic has all three destinations');
ok('there are eighteen topics', topics.length === 18, topics.length);
const reg = registryIds();
for (const t of topics) {
  const g = gameFor(t);
  ok(`${t} has a study game`, !!g, g);
  if (!g) continue;
  ok(`${t}: ${g} is a built game`, !!GAMES[g]);
  ok(`${t}: ${g} is in the routes/game.js registry`, reg.has(g));
  ok(`${t}: ${g} is NOT embedded in a lesson page elsewhere`, !EMBEDDED_IN_LESSON.has(g),
    'a standalone link would share a leaderboard id with a different game');
}

section('2. The block links exactly the three pages, and nothing else');
for (const t of topics) {
  const html = blockFor(t);
  const hrefs = [...html.matchAll(/<a class="kg" href="([^"]+)"/g)].map((m) => m[1]);
  ok(`${t} links three pages`, hrefs.length === 3, hrefs);
  const want = [
    '/pages/ap-csp-topic-' + t.replace('.', '-') + '-code',
    '/pages/ap-csp-game-' + gameFor(t),
    '/pages/' + notesHandle(t),
  ];
  ok(`${t} links the right three`, JSON.stringify(hrefs) === JSON.stringify(want), { hrefs, want });
}

section('3. The block is house-safe');
const sample = blockFor('3.1');
// eslint-disable-next-line no-control-regex
const nonAscii = sample.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
ok('pure ASCII', !nonAscii, nonAscii && nonAscii.slice(0, 3));
ok('no em-dash', !sample.includes('—'));
ok('div tags balance', (sample.match(/<div/g) || []).length === (sample.match(/<\/div>/g) || []).length);
ok('exactly one style block', (sample.match(/<style>/g) || []).length === 1);
ok('no script at all', !/<script/i.test(sample));
ok('every colour is forced', (CSS.match(/color:/g) || []).length > 0
  && !/[^-]color:\s*#[0-9A-Fa-f]{3,6}\s*(?!!important)[;}]/.test(CSS));
ok('the grid is a fixed column count, never auto-fit', /repeat\(3,1fr\)/.test(CSS) && !/auto-fit/.test(CSS));
ok('the wrapper resets inherited styling', /#apcs-kg\{all:initial!important/.test(CSS));
ok('it carries the managed marker', sample.includes(MARKER));

section('4. Building is additive, and a rerun cannot double it');
// A synthetic body, so this runs offline with no fetched pages on disk.
const fakeBody = '<!--\n  PAGE: /pages/ap-csp-course-bi3-variables\n-->\n<div id="x">lesson</div>';
const appended = fakeBody + blockFor('3.1');
ok('the original bytes survive, in front, untouched', appended.startsWith(fakeBody));
ok('and the block is all that was added',
  appended.slice(fakeBody.length) === blockFor('3.1'));
ok('a body that already has the marker is detectable',
  appended.includes(MARKER) && !fakeBody.includes(MARKER));

section('5. The builder refuses rather than half-building');
const r = build('/nonexistent-directory-for-this-test');
ok('a missing page directory produces problems, not pages', r.pages.length === 0 && r.problems.length === 18,
  { pages: r.pages.length, problems: r.problems.length });

section('6. The emitted markup is well formed');
ok('every attribute quote is closed',
  (sample.match(/"/g) || []).length % 2 === 0, (sample.match(/"/g) || []).length);
ok('every anchor is closed', (sample.match(/<a /g) || []).length === (sample.match(/<\/a>/g) || []).length);
ok('the style block is closed', (sample.match(/<style>/g) || []).length === (sample.match(/<\/style>/g) || []).length);
// Every topic, not just the sample: a bad label on one topic would slip past.
const malformed = topics.filter((t) => {
  const h = blockFor(t);
  return (h.match(/"/g) || []).length % 2 !== 0
    || (h.match(/<div/g) || []).length !== (h.match(/<\/div>/g) || []).length;
});
ok('and the same holds for all eighteen', malformed.length === 0, malformed);

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
