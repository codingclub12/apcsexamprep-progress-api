#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: NO REPO FILE MAY LIVE WHERE THE RAILWAY VOLUME MOUNTS.
//
//  ── THE INCIDENT, 2026-09-03 ────────────────────────────────────────────────
//  A merge added data/cyber-topics.json and the boot seed that reads it. CI was
//  green, the file was tracked, .gitignore did not exclude it, and the deploy
//  workflow uploads a full checkout. It still was not there:
//
//      cannot read /app/data/cyber-topics.json: ENOENT
//
//  The service mounts its persistent volume at /app/data, which is where the
//  SQLite database lives. A mount REPLACES the directory: the file was in the
//  image and invisible at runtime. Every check that looked at the repository
//  said the file shipped, because every one of them was looking at the repo
//  rather than at the container, and the seed's own failure was swallowed into a
//  log. 24 manifest rows silently did not land for an hour.
//
//  The README says the mount path is /data. The runtime says /app/data. The
//  runtime wins, and this file exists so that the next person does not have to
//  discover that from an ENOENT.
//
//  ── WHAT THIS REFUSES ───────────────────────────────────────────────────────
//    1. any tracked file under data/, because the volume hides it
//    2. any runtime module resolving a path into data/, because that read works
//       on a laptop and throws in production, which is the worst kind of
//       difference
//
//  Runtime config that the server must read at boot belongs in config/, next to
//  ced-sources.json and labs/. The volume is for state the container writes, not
//  for content the repo ships.
//
//  Offline: no network, no secrets, no browser, no database.
//
//  Run: npm run smoke:volumepaths
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

//  Where the running container mounts its volume, and therefore what a repo file
//  in that directory is worth: nothing. Written as the repo-relative directory
//  the mount lands on.
const SHADOWED = ['data'];

//  Where the server reads files at boot or per request. A path into a shadowed
//  directory from any of these is the bug. Scripts under tools/ and scripts/ run
//  on a laptop or in CI, never in the container, so they are not scanned.
const RUNTIME_DIRS = ['lib', 'routes', 'middleware.js', 'server.js', 'db.js', 'utils.js', 'scoring.js'];

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

function tracked() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function jsFilesUnder(target) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return full.endsWith('.js') ? [full] : [];
  const out = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(full, entry.name);
    if (entry.isDirectory()) out.push(...jsFilesUnder(path.relative(ROOT, p)));
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

//  THE TWO DETECTORS, AS FUNCTIONS.
//
//  Pulled out so they can be fed a KNOWN-BAD case below. A guard that is only
//  ever run against a tree that is already clean passes for two different
//  reasons and cannot tell them apart: because the tree is clean, or because the
//  guard looks at nothing. This repo's own deploy gate caught exactly that here:
//  pointing SHADOWED at a directory that does not exist left every check green.
function shadowedFiles(files, shadowed) {
  return files.filter((f) => shadowed.some((d) => f === d || f.startsWith(`${d}/`)));
}

//  path.join(..., 'data', ...), a bare '/app/data', and './data/' are the three
//  shapes this has taken or could take.
function shadowedReads(source, shadowed) {
  const hits = [];
  for (const dir of shadowed) {
    const patterns = [
      new RegExp(`['"\`]${dir}['"\`]\\s*,`),
      new RegExp(`/app/${dir}\\b`),
      new RegExp(`['"\`]\\./${dir}/`),
    ];
    for (const rx of patterns) if (rx.test(source)) hits.push(String(rx));
  }
  return hits;
}

console.log('\nVolume-shadowed paths\n');

//  ── The detectors must be able to fire at all ───────────────────────────────
check('the file detector flags a file under the mount, and clears one outside it', () => {
  assert.deepStrictEqual(shadowedFiles(['data/cyber-topics.json'], SHADOWED), ['data/cyber-topics.json'],
    'the detector cannot see the exact file that caused the incident');
  assert.deepStrictEqual(shadowedFiles(['config/cyber-topics.json', 'database.js'], SHADOWED), [],
    'and it must not flag a path that merely starts with the same letters');
});

check('the source detector flags the read that caused the incident', () => {
  const bad = "const FILE = path.join(__dirname, '..', 'data', 'cyber-topics.json');";
  const good = "const FILE = path.join(__dirname, '..', 'config', 'cyber-topics.json');";
  assert.ok(shadowedReads(bad, SHADOWED).length, 'the detector cannot see the original defect');
  assert.deepStrictEqual(shadowedReads(good, SHADOWED), [], 'and it must clear the fix');
  assert.ok(shadowedReads("readFileSync('/app/data/x.json')", SHADOWED).length, 'nor the absolute form');
});

// ── The repository itself ────────────────────────────────────────────────────
check('no tracked file lives under a directory the volume mounts over', () => {
  const offenders = shadowedFiles(tracked(), SHADOWED);
  assert.deepStrictEqual(offenders, [],
    `these ship in the image and are invisible at runtime: ${offenders.join(', ')}`);
});

check('no runtime module resolves a path into a shadowed directory', () => {
  const offenders = [];
  for (const target of RUNTIME_DIRS) {
    for (const file of jsFilesUnder(target)) {
      for (const rx of shadowedReads(fs.readFileSync(file, 'utf8'), SHADOWED)) {
        offenders.push(`${path.relative(ROOT, file)} -> ${rx}`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `a read that works locally and throws in the container: ${offenders.join('; ')}`);
});

check('the taxonomy is in config/, which the volume does not cover', () => {
  const cyberTopics = require('../lib/cyber-topics');
  assert.ok(/config[\\/]cyber-topics\.json$/.test(cyberTopics.FILE), cyberTopics.FILE);
  assert.ok(fs.existsSync(cyberTopics.FILE), 'the file the loader points at does not exist');
  assert.strictEqual(cyberTopics.topics().length, 24, 'and it still carries the 24 CED topics');
});

//  The reason a laptop cannot see this class of bug at all: the directory is
//  simply there. Stating it as a test keeps the reasoning attached to the check.
check('the check is about the container, not about this machine', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'data')),
    'a data/ directory exists locally, which is exactly what makes the runtime failure invisible here');
});

console.log('');
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('OK - nothing the server reads is hidden by the volume');
