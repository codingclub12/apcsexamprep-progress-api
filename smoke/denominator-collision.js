#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  NO DENOMINATOR KEY MAY BE WRITTEN TWICE.
//
//  lib/gradebook-contract.js denominatorMap writes course_denominators first and
//  course_manifest second, into one map, with `set`. So when both describe the
//  same (course, lesson, activity_type), the manifest silently REPLACES the
//  authored number. Nothing throws, nothing logs, and a teacher sees a column
//  denominated out of the wrong total.
//
//  That is not hypothetical. On 2026-09-04 the Topic 1.2 terminal lab was
//  flipped to graded, its 8 point manifest row landed on 1.2|lab, and Topic 1.2's
//  lab column went from 30 points to 8 for every AP Cybersecurity student. The
//  suite was green the whole time. docs/lab-contract.md had predicted a problem
//  here and predicted it in the wrong direction, as an ADDED denominator.
//
//  WHY A BLANKET RULE IS THE RIGHT ONE. Measured the same day across every
//  seeder in the repo: 306 manifest (lesson, type) groups, 152 authored rows,
//  and ZERO keys in both. A course either authors a denominator or generates one
//  from the manifest, never both. So this is not a heuristic with a tolerance,
//  it is a fact about the data that happened to be true and undefended.
//
//  Offline: seeds a scratch database, no network, no secrets.
//
//  Run: npm run smoke:denomcollision
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const DB = path.join(__dirname, 'smoke-denominator-collision.db');

//  Every seeder that writes either side of the comparison. A seeder missing from
//  this list is a blind spot, so the count assertion at the end is what notices.
const SEEDERS = [
  'scripts/seed-manifest.js',
  'scripts/seed-cyber-denominators.js',
  'scripts/seed-csp-denominators.js',
  'scripts/seed-cyber-case-file-denominators.js',
  'scripts/seed-cyber-exam-denominators.js',
  'scripts/seed-csp-unit-test-denominators.js',
];

function clean() {
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (e) {} }
}

function collect() {
  clean();
  const env = Object.assign({}, process.env, {
    DB_PATH: DB,
    JWT_SECRET: process.env.JWT_SECRET || 'smoke-only-not-a-real-secret',
  });
  for (const s of SEEDERS) {
    execFileSync('node', [path.join(REPO, s)], { env, cwd: REPO, stdio: 'pipe' });
  }
  const code = `
    process.env.DB_PATH = ${JSON.stringify(DB)};
    const d = require(${JSON.stringify(path.join(REPO, 'db.js'))});
    const man = d.prepare("SELECT course, lesson_id, item_type, SUM(points) pts FROM course_manifest WHERE item_type != 'visit' GROUP BY course, lesson_id, item_type").all();
    const auth = d.prepare("SELECT course, lesson, activity_type, possible FROM course_denominators").all();
    console.log('@@JSON@@' + JSON.stringify({ man, auth }));
  `;
  const out = execFileSync('node', ['-e', code], { env, cwd: REPO, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const line = out.split('\n').find((l) => l.startsWith('@@JSON@@'));
  if (!line) throw new Error('probe produced no JSON. stdout:\n' + out.slice(0, 400));
  return JSON.parse(line.slice(8));
}

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

const { man, auth } = collect();
const authored = new Map(auth.map((a) => [`${a.course}|${a.lesson}|${a.activity_type}`, a.possible]));
const collisions = [];
for (const m of man) {
  const k = `${m.course}|${m.lesson_id}|${m.item_type}`;
  if (authored.has(k)) collisions.push({ key: k, authored: authored.get(k), manifest: m.pts });
}

console.log(`\n  ${man.length} manifest (lesson, type) groups, ${auth.length} authored denominators`);

check('no (course, lesson, activity_type) is denominated twice', () => {
  if (collisions.length) {
    const lines = collisions.map((c) => `${c.key}: authored ${c.authored}, manifest ${c.manifest} WINS`);
    throw new Error(`${collisions.length} collision(s), the manifest silently replaces the authored value:\n        `
      + lines.join('\n        '));
  }
});

//  A guard over an empty table passes for the wrong reason. These two say the
//  seeders actually ran, so an environment that seeds nothing goes red instead
//  of reporting a clean bill of health.
check('the manifest side is populated', () => {
  if (man.length < 200) throw new Error(`only ${man.length} manifest groups; the seeders did not run`);
});
check('the authored side is populated', () => {
  if (auth.length < 100) throw new Error(`only ${auth.length} authored denominators; the seeders did not run`);
});

//  The specific row the rule was written for, asserted by name so a future
//  rename cannot quietly drop it back onto the colliding key.
check('every lab spec declares terminal-lab', () => {
  const labSpecs = require(path.join(REPO, 'lib/lab-spec'));
  const specs = labSpecs.all();
  if (!specs.length) throw new Error('no lab specs loaded at all');
  const wrong = specs.filter((s) => s.item_type !== 'terminal-lab');
  if (wrong.length) throw new Error(`${wrong.length} spec(s) declare something else: `
    + wrong.map((s) => `${s.course}|${s.item_id}=${s.item_type}`).join(', '));
});

clean();
console.log(failures ? `\n  ${failures} failed` : '\n  all passed');
process.exit(failures ? 1 : 0);
