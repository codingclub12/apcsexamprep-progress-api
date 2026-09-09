'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the public course hub's Unit 3 list, on the CED's numbers.
//
//  WHY THIS EXISTS
//  The same three-way rotation that broke the Command Center broke this list
//  too, and this one faces STUDENTS: a student clicking "3.3 Firewalls & Packet
//  Filtering" landed on wireless security. Units 1, 2 and 4 were already on the
//  CED's numbers, so Unit 3 was the only card out of step.
//
//  WHAT IS PINNED
//   1. The map comes from lib/cyber-unit3-renumber.js PLAN and DISPLAY_MAP,
//      not typed here.
//   2. Six links, in CED order, each opening the lesson its number names.
//   3. Students read 3.1 TWICE, told apart by the Part label, because both
//      pages say Topic 3.1 in their own h1. 3.1a and 3.1b are gradebook keys
//      and belong on the teacher hub, not here.
//   4. Titles move with their bodies and none is renamed. CED 3.2 already
//      answers to three names.
//   5. The rewrite cannot reach another unit's card.
//
//  Offline and secret-free. Zero PII: page handles and lesson titles only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const M = require('../scripts/cyber-hub-unit3-ced-numbers');
const { PLAN, DISPLAY_MAP } = require('../lib/cyber-unit3-renumber');

const FIXTURE = path.join(__dirname, 'fixtures', 'cyber-hub-unit3-ced-rows.html');
const body = fs.readFileSync(FIXTURE, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const rewritten = M.rewrite(body);
if (!rewritten) {
  console.log('  [FAIL] rewrite() refused the fixture outright, so no rule below could be measured');
  console.log('\nFAIL  0 passed, 1 failed');
  process.exit(1);
}
const raw = rewritten.out;
const links = (s) => [...s.matchAll(/<a class="ch-lesson" href="\/pages\/ap-cyber-unit-3-lesson-(\d)">(\d\.\d)([^<]*)<\/a>/g)]
  .map((m) => ({ target: Number(m[1]), display: m[2], title: m[3] }));

console.log('\n-- 1. the map is derived, not typed --');
ok('every row comes from a PLAN entry',
  M.ROWS.every((r) => PLAN.some((p) => p.oldTopic === r.oldId && p.target === r.target)), M.ROWS);
ok('and the displayed number comes from DISPLAY_MAP',
  M.ROWS.every((r) => r.display === DISPLAY_MAP[r.oldId]), M.ROWS.map((r) => `${r.oldId}=>${r.display}`));

console.log('\n-- 2. the fixture really is broken before the rewrite --');
const before = links(body);
ok('it lists six lessons numbered 3.1 to 3.6',
  String(before.map((l) => l.display)) === String(['3.1', '3.2', '3.3', '3.4', '3.5', '3.6']), before.map((l) => l.display));
const wrongBefore = before.filter((l) => {
  const r = M.ROWS.find((x) => x.oldId === l.display);
  return r && r.target !== l.target;
});
ok('and three of them open the wrong lesson', wrongBefore.length === 3, wrongBefore.map((l) => l.display));
ok('and they are 3.3, 3.5 and 3.6, the three whose bodies moved',
  String(wrongBefore.map((l) => l.display).sort()) === String(['3.3', '3.5', '3.6']));

console.log('\n-- 3. after the rewrite: CED numbers, CED order, right pages --');
const after = links(raw);
ok('six links, reading 3.1, 3.1, 3.2, 3.3, 3.4, 3.5',
  String(after.map((l) => l.display)) === String(['3.1', '3.1', '3.2', '3.3', '3.4', '3.5']), after.map((l) => l.display));
ok('opening lesson-1 through lesson-6 in order',
  String(after.map((l) => l.target)) === String([1, 2, 3, 4, 5, 6]), after.map((l) => l.target));
ok('and nothing displays 3.6, which the CED does not have', !/>3\.6\s/.test(raw));

console.log('\n-- 4. a student can tell the two halves of 3.1 apart --');
const ones = after.filter((l) => l.display === '3.1');
ok('exactly two links read 3.1', ones.length === 2, ones.map((l) => l.title));
ok('and both carry a Part label', ones.every((l) => /Part \d of 2/.test(l.title)), ones.map((l) => l.title));
ok('no OTHER link gained a Part label',
  after.filter((l) => /Part \d of 2/.test(l.title)).length === 2);

console.log('\n-- 5. titles travel with their bodies and none is renamed --');
const titles = (s) => links(s).map((l) => l.title.replace(/ \(Part \d of 2\)$/, '')).sort().join('|');
ok('the set of titles is unchanged', titles(body) === titles(raw));
for (const [num, want] of [['3.2', 'Network Security Policies'], ['3.4', 'Firewalls'], ['3.5', 'IDS']]) {
  const l = after.find((x) => x.display === num);
  ok(`${num} is ${want}, and it opens the page that teaches it`, l && l.title.includes(want), l);
}

console.log('\n-- 6. blast radius --');
for (const u of [2, 4]) {
  const rx = new RegExp(`<a class="ch-lesson"[^>]*unit-${u}[^<]*</a>`, 'g');
  ok(`the unit ${u} card is byte-identical`, String(body.match(rx)) === String(raw.match(rx)));
}
const set = (s) => (s.match(/ap-cyber-unit-3-lesson-\d/g) || []).sort().join('|');
ok('the same six pages are linked, only from other positions', set(body) === set(raw));
ok('and the only lines that differ are the six anchors',
  body.split('\n').filter((l, i) => l !== raw.split('\n')[i]).length === 6,
  body.split('\n').filter((l, i) => l !== raw.split('\n')[i]).length);

//  The scope guard, exercised DIRECTLY. Mutating the bounds so the rewrite
//  reaches unit 2 makes this guard refuse before the byte-identical assertion
//  above can measure anything, so that assertion is the belt and this is the
//  braces: it is what actually stops a rewrite escaping its own card.
const foreign = body.replace(
  '<a class="ch-lesson" href="/pages/ap-cyber-unit-3-lesson-1">',
  '<a class="ch-lesson" href="/pages/ap-cyber-unit-9-lesson-9">9.9 &middot; Not a real lesson</a>\n      '
  + '<a class="ch-lesson" href="/pages/ap-cyber-unit-3-lesson-1">');
const quietGuard = console.error; console.error = () => {};
const guardCode = process.exitCode;
const refused = M.rewrite(foreign);
console.error = quietGuard; process.exitCode = guardCode;
ok('the rewrite refuses a lesson list holding an anchor that is not one of the six',
  refused === null, refused ? 'it rewrote it anyway' : undefined);

console.log('\n-- 7. a one-shot that says so --');
const quiet = console.error; console.error = () => {};
const code = process.exitCode;
const first = M.transform(body);
const again = first ? M.transform(first.out) : null;
console.error = quiet; process.exitCode = code;
ok('the guarded transform accepts the retired hub', !!first);
ok('and refuses its own output', again === null);

console.log(`\n${fail ? 'FAIL' : 'PASS'}  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
