#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a boot seed that fails must SAY SO from outside the container.
//
//  ── THE DEPLOY THAT PAID FOR THIS ───────────────────────────────────────────
//  2026-09-03. A merge added 24 course_manifest rows for AP Cybersecurity.
//  Production confirmed it was serving the new commit, the railway-deploy check
//  went green, and the live manifest count did not move: 908 before, 908 after.
//  Every boot seed runs inside a catch, on purpose, so that a bad seed can never
//  stop the API serving. The line naming the cause went to the Railway console,
//  which an agent cannot read.
//
//  From outside, "the seed threw" and "the seed ran and had nothing to do" were
//  the same observation. That is the failure shape this repo keeps paying for:
//  not a crash, a silence that reads as success.
//
//  ── WHAT THIS PINS ──────────────────────────────────────────────────────────
//  Three things, and the third is the one that would rot first:
//    1. a failing seed is recorded as failed, with its message
//    2. a succeeding seed is recorded with the numbers it returned
//    3. server.js actually WIRES the snapshot into /api/health, checked by
//       reading the source rather than by trusting it, the same way
//       unwiredSplices reads the module that builds a page. A recorder nobody
//       serves is a recorder nobody reads.
//
//  Offline: no network, no secrets, no browser, no database.
//
//  Run: npm run smoke:bootseed
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bootSeed = require('../lib/boot-seed');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

//  record() logs a failing seed loudly, which is right in production and noise
//  here: this suite throws on purpose, and a stack trace in the middle of a
//  green run reads like a broken suite. Silenced around the deliberate failures
//  only, in the TEST rather than in the module, so production stays loud.
function quietly(fn) {
  const real = console.error;
  console.error = () => {};
  try { return fn(); } finally { console.error = real; }
}

console.log('\nBoot seed visibility\n');

check('a seed that throws is recorded as failed, with its first line', () => {
  bootSeed.reset();
  const value = quietly(() => bootSeed.record('manifest', () => {
    throw new Error('cannot read data/cyber-topics.json\n  at somewhere deep');
  }));
  assert.strictEqual(value, null, 'a failing seed still returns null to the caller');
  const snap = bootSeed.snapshot();
  assert.strictEqual(snap.ok, false);
  assert.deepStrictEqual(snap.failed, ['manifest']);
  assert.strictEqual(snap.seeds.manifest.ok, false);
  assert.ok(/cannot read data\/cyber-topics\.json/.test(snap.seeds.manifest.error),
    `the message has to survive: ${snap.seeds.manifest.error}`);
  assert.ok(!/at somewhere deep/.test(snap.seeds.manifest.error), 'the stack does not belong on a public endpoint');
});

check('a seed that throws does not stop the ones after it', () => {
  bootSeed.reset();
  quietly(() => bootSeed.record('first', () => { throw new Error('nope'); }));
  bootSeed.record('second', () => ({ total: 3, changed: 3 }));
  const snap = bootSeed.snapshot();
  assert.deepStrictEqual(snap.failed, ['first']);
  assert.strictEqual(snap.seeds.second.ok, true);
  assert.strictEqual(snap.seeds.second.changed, 3);
});

check('a seed that succeeds is recorded with the numbers it returned', () => {
  bootSeed.reset();
  const value = bootSeed.record('manifest', () => ({ total: 932, changed: 24, mode: 'ignore' }));
  assert.deepStrictEqual(value, { total: 932, changed: 24, mode: 'ignore' }, 'the caller still gets its result');
  const snap = bootSeed.snapshot();
  assert.strictEqual(snap.ok, true);
  assert.deepStrictEqual(snap.failed, []);
  assert.strictEqual(snap.seeds.manifest.total, 932);
  assert.strictEqual(snap.seeds.manifest.changed, 24);
  assert.strictEqual(snap.seeds.manifest.mode, undefined, 'strings are not numbers and are not kept');
  assert.ok(typeof snap.seeds.manifest.ms === 'number');
});

//  "changed: 0" is a real answer and must not be confused with "did not run".
//  It is the difference between a seed with nothing to do and a seed that threw,
//  which is the exact distinction this whole file exists to restore.
check('a seed that ran and changed nothing is not the same as a seed that failed', () => {
  bootSeed.reset();
  bootSeed.record('quiet', () => ({ total: 900, changed: 0 }));
  const snap = bootSeed.snapshot();
  assert.strictEqual(snap.ok, true);
  assert.strictEqual(snap.seeds.quiet.ok, true);
  assert.strictEqual(snap.seeds.quiet.changed, 0);
});

check('a seed that returns nothing is still recorded as having run', () => {
  bootSeed.reset();
  bootSeed.record('sideEffectOnly', () => undefined);
  assert.strictEqual(bootSeed.snapshot().seeds.sideEffectOnly.ok, true);
});

check('the recorder keeps boot order, so a reader can see where boot got to', () => {
  bootSeed.reset();
  for (const n of ['a', 'b', 'c']) bootSeed.record(n, () => ({ n: 1 }));
  assert.deepStrictEqual(Object.keys(bootSeed.snapshot().seeds), ['a', 'b', 'c']);
});

check('numbersOf keeps numbers, drops everything else, and is bounded', () => {
  const wide = {};
  for (let i = 0; i < 20; i++) wide[`n${i}`] = i;
  assert.strictEqual(Object.keys(bootSeed.numbersOf(wide)).length, 6);
  assert.deepStrictEqual(bootSeed.numbersOf({ a: 1, b: 'two', c: null, d: { e: 3 } }), { a: 1 });
  assert.deepStrictEqual(bootSeed.numbersOf(null), {});
});

// ── The wiring, read from source ─────────────────────────────────────────────
//  A recorder that nothing serves is a recorder nobody reads, and that failure
//  is invisible to every test that only exercises the module.
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

check('server.js routes its boot seeds through the recorder', () => {
  assert.ok(/require\('\.\/lib\/boot-seed'\)/.test(server), 'server.js does not require lib/boot-seed');
  assert.ok(/bootSeed\.record\(label, fn\)/.test(server),
    'runBootSeed no longer delegates to the recorder, so nothing is recorded');
});

check('/api/health serves the snapshot', () => {
  const handler = server.slice(server.indexOf("app.get('/api/health'"));
  const body = handler.slice(0, handler.indexOf('res.json(body)'));
  assert.ok(/body\.seed = bootSeed\.snapshot\(\)/.test(body),
    'the health payload does not carry the seed snapshot');
});

check('every boot seed still goes through runBootSeed, none added around it', () => {
  //  A seed added later that calls its own try/catch would be invisible again.
  //  Counted rather than asserted exactly, so adding a seed does not fail this.
  const wrapped = (server.match(/runBootSeed\(/g) || []).length;
  assert.ok(wrapped >= 8, `only ${wrapped} runBootSeed call sites found`);
});

console.log('');
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('OK - a failed boot seed can be seen from outside the container');
