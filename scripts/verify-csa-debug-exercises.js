'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA DEBUG EXERCISE VERIFIER - same posture as verify-csa-exercises.js,
//  scoped to seed/csa-debug-exercises.js.
//
//  Compiles and runs the REFERENCE SOLUTION (the fixed program) against every
//  case with a real javac and java, through the same lib/csa-code-modes.js
//  assembly the grader uses, and writes what Java actually printed into
//  seed/csa-debug-exercises.expected.generated.json. Also proves the STARTER
//  (the buggy version) does NOT already pass every case, which for a
//  debugging exercise is the whole point: if the bug does not actually change
//  the output, it is not a real bug to find.
//
//  Run:
//    node scripts/verify-csa-debug-exercises.js            check (nothing written)
//    node scripts/verify-csa-debug-exercises.js --write    regenerate the expected file
//
//  Needs a local JDK. Author content only; no student source is involved.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const exercises = require('../seed/csa-debug-exercises');
const codeModes = require('../lib/csa-code-modes');

const JAVA_LANGUAGE_ID = 62;
const RUN_TIMEOUT_MS = 15000;

function normalizeOutput(s) {
  return String(s == null ? '' : s)
    .replace(/\r\n/g, '\n')
    .split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n+$/, '');
}

function haveJdk() {
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore' });
    execFileSync('java', ['-version'], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function compileOnce(dir, source) {
  fs.writeFileSync(path.join(dir, 'Main.java'), source);
  const r = spawnSync('javac', ['-nowarn', 'Main.java'], {
    cwd: dir, encoding: 'utf8', timeout: RUN_TIMEOUT_MS,
  });
  return { ok: r.status === 0, error: (r.stderr || r.stdout || '').trim() };
}

function runOnce(dir, stdin) {
  const r = spawnSync('java', ['-XX:-UsePerfData', 'Main'], {
    cwd: dir, encoding: 'utf8', input: String(stdin || ''), timeout: RUN_TIMEOUT_MS,
  });
  return {
    ok: r.status === 0 && !r.error,
    stdout: r.stdout || '',
    stderr: (r.stderr || '').trim(),
    timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'),
  };
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-debug-verify-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function assembleFor(x, source) {
  return codeModes.assemble(x.mode, JAVA_LANGUAGE_ID, source, {
    postlude: x.mode === 'driver' ? x.harness : '',
  });
}

function indent(s) {
  return String(s).split('\n').slice(0, 12).map((l) => '      ' + l).join('\n');
}

function verifyOne(x, problems) {
  const results = {};

  withTempDir((dir) => {
    const built = compileOnce(dir, assembleFor(x, x.reference));
    if (!built.ok) {
      problems.push(`${x.lesson}: the REFERENCE SOLUTION (fixed version) does not compile:\n${indent(built.error)}`);
      return;
    }
    x.cases.forEach((c, i) => {
      const r = runOnce(dir, c.stdin);
      if (r.timedOut) { problems.push(`${x.lesson} case ${i}: the reference solution timed out`); return; }
      if (!r.ok) { problems.push(`${x.lesson} case ${i}: the reference solution crashed:\n${indent(r.stderr)}`); return; }
      results[exercises.caseKey(x.lesson, i)] = r.stdout;
    });
  });

  const keys = x.cases.map((_, i) => exercises.caseKey(x.lesson, i));
  if (!keys.every((k) => k in results)) return results;

  const distinct = new Set(keys.map((k) => normalizeOutput(results[k])));
  if (distinct.size === 1) {
    problems.push(`${x.lesson}: every case prints the same thing, so a hardcoded answer would pass all of them`);
  }

  // The debugging-exercise version of "the starter must not already pass": the
  // BUGGY starter must fail at least one case, or the planted bug never
  // actually changes the output and there is nothing real to find.
  withTempDir((dir) => {
    const built = compileOnce(dir, assembleFor(x, x.starter));
    if (!built.ok) return;   // a starter that fails to compile is definitely not passing
    const allPass = x.cases.every((c, i) => {
      const r = runOnce(dir, c.stdin);
      return r.ok && normalizeOutput(r.stdout) === normalizeOutput(results[exercises.caseKey(x.lesson, i)]);
    });
    if (allPass) {
      problems.push(`${x.lesson}: the buggy STARTER already passes every case, so there is no real bug to find`);
    }
  });

  return results;
}

function main(argv) {
  const write = argv.includes('--write');

  if (!haveJdk()) {
    console.error('\n  No javac/java on PATH. This script verifies by RUNNING the reference'
      + '\n  solution and the buggy starter, so there is nothing it can honestly check'
      + '\n  without a JDK.\n');
    process.exit(2);
  }

  const list = exercises.all();
  const problems = [];
  const cases = {};
  for (const x of list) Object.assign(cases, verifyOne(x, problems));

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). Nothing written:\n`);
    for (const p of problems) console.error('    ' + p);
    console.error('');
    process.exit(1);
  }

  if (write) {
    const doc = { generated_by: 'scripts/verify-csa-debug-exercises.js', item: exercises.ITEM, cases };
    fs.writeFileSync(exercises.EXPECTED_FILE, JSON.stringify(doc, null, 1) + '\n');
    console.log(`\n  wrote ${path.relative(path.join(__dirname, '..'), exercises.EXPECTED_FILE)}`);
    console.log(`    ${Object.keys(cases).length} verified case outputs across ${list.length} exercise(s)\n`);
    process.exit(0);
  }

  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(exercises.EXPECTED_FILE, 'utf8'));
  } catch (_) {
    console.error('\n  csa-debug-exercises.expected.generated.json is missing or unreadable.'
      + '\n  Run: node scripts/verify-csa-debug-exercises.js --write\n');
    process.exit(1);
  }

  const drift = [];
  for (const [k, v] of Object.entries(cases)) {
    if (!(k in stored.cases)) drift.push(`${k}: not in the generated file`);
    else if (stored.cases[k] !== v) drift.push(`${k}: stored output no longer matches the reference solution`);
  }
  if (drift.length) {
    console.error(`\n  ${drift.length} case(s) drifted from the reference solutions:\n`);
    for (const d of drift) console.error('    ' + d);
    console.error('\n  Run: node scripts/verify-csa-debug-exercises.js --write\n');
    process.exit(1);
  }

  console.log(`\n  ${list.length} debug exercise(s) verified clean against ${Object.keys(cases).length} cases.\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { verifyOne };
