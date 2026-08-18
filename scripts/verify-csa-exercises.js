'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA EXERCISE VERIFIER - the thing that makes the answer key trustworthy.
//
//  WHAT IT DOES
//  Compiles and runs every AP CSA exercise's REFERENCE SOLUTION against every one
//  of its test cases with a real javac and java, and writes what Java actually
//  printed into seed/csa-exercises/expected.generated.json. That file is what the
//  seeder loads. Nothing hand-writes an expected output, so the class of bug
//  where a correct student fails because an author guessed that 5/2 prints 2.5
//  cannot exist here.
//
//  It assembles each program through lib/csa-code-modes.js, the SAME code path
//  routes/student.js uses to grade a submission. If assembly and verification
//  used different logic, this script would be proving something other than what
//  students are graded by.
//
//  ── THE FOUR THINGS IT REFUSES TO LET THROUGH ───────────────────────────────
//
//  1. A reference solution that does not compile, or that crashes on a case.
//  2. A STARTER that already passes. Handing a student a solved exercise is not
//     a small content bug: it is a page that grades everybody full marks for
//     clicking submit, and it looks exactly like a working exercise.
//  3. A hardcoded output that passes. For every `program` exercise the verifier
//     builds the actual cheat (a Main that prints case 0's expected output
//     verbatim) and asserts it fails at least one hidden case. This is the claim
//     the hidden-case rule makes, checked rather than asserted.
//  4. A generated file that no longer matches the reference solutions. The
//     default run recomputes everything and diffs; only --write updates the file.
//
//  Run:
//    node scripts/verify-csa-exercises.js            check (CI, default)
//    node scripts/verify-csa-exercises.js --write    regenerate the expected file
//    node scripts/verify-csa-exercises.js --lesson 3.4
//
//  Needs a local JDK. Author content only; no student source is involved at any
//  point. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const exercises = require('../seed/csa-exercises');
const codeModes = require('../lib/csa-code-modes');

const JAVA_LANGUAGE_ID = 62;
const RUN_TIMEOUT_MS = 15000;

// Same normalization the grader compares with (routes/student.js). Verifying
// against a looser or stricter rule than the one that grades would make this
// script a different test from the one that matters.
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

// Compile one assembled program once, then run it against many stdins. Compiling
// per case would triple the wall clock for no gain: only the input varies.
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

// A fresh directory per program: leftover .class files from a previous exercise
// would let a program compile against classes it does not actually declare.
function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-verify-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Assemble exactly as the grader will: the reference solution stands in for the
// student's submission.
function assembleFor(x, source) {
  return codeModes.assemble(x.mode, JAVA_LANGUAGE_ID, source, {
    postlude: x.mode === 'driver' ? x.harness : '',
  });
}

// The cheat this whole design exists to defeat: a program that prints the first
// visible case's expected output as a literal. Only meaningful for `program`
// exercises; a driver submission cannot even declare a main.
function cheatSource(expectedStdout) {
  const literal = JSON.stringify(String(expectedStdout));
  return 'public class Main {\n'
    + '  public static void main(String[] args) {\n'
    + '    System.out.print(' + literal + ');\n'
    + '  }\n'
    + '}\n';
}

function verifyOne(x, problems) {
  const results = {};

  withTempDir((dir) => {
    const built = compileOnce(dir, assembleFor(x, x.reference));
    if (!built.ok) {
      problems.push(`${x.lesson}: the REFERENCE SOLUTION does not compile:\n${indent(built.error)}`);
      return;
    }
    x.cases.forEach((c, i) => {
      const r = runOnce(dir, c.stdin);
      if (r.timedOut) {
        problems.push(`${x.lesson} case ${i}: the reference solution timed out`);
        return;
      }
      if (!r.ok) {
        problems.push(`${x.lesson} case ${i}: the reference solution crashed:\n${indent(r.stderr)}`);
        return;
      }
      results[exercises.caseKey(x.lesson, i)] = r.stdout;
    });
  });

  const keys = x.cases.map((_, i) => exercises.caseKey(x.lesson, i));
  if (!keys.every((k) => k in results)) return results;    // already reported

  // Two identical outputs across all cases means the inputs do not change what
  // is printed, so no hidden case can distinguish a real answer from a constant.
  const distinct = new Set(keys.map((k) => normalizeOutput(results[k])));
  if (distinct.size === 1) {
    problems.push(`${x.lesson}: every case prints the same thing, so a hardcoded answer passes all of them`);
  }

  // The starter must not already be the answer.
  withTempDir((dir) => {
    const built = compileOnce(dir, assembleFor(x, x.starter));
    if (!built.ok) return;            // a starter that does not compile cannot pass
    const passes = x.cases.every((c, i) => {
      const r = runOnce(dir, c.stdin);
      return r.ok && normalizeOutput(r.stdout) === normalizeOutput(results[exercises.caseKey(x.lesson, i)]);
    });
    if (passes) problems.push(`${x.lesson}: the STARTER already passes every case, so the exercise is pre-solved`);
  });

  // The hardcoding cheat must fail.
  if (x.mode === 'program') {
    const firstVisible = x.cases.findIndex((c) => !c.hidden);
    const shown = results[exercises.caseKey(x.lesson, firstVisible)];
    withTempDir((dir) => {
      const built = compileOnce(dir, cheatSource(shown));
      if (!built.ok) {
        problems.push(`${x.lesson}: could not build the hardcoding check`);
        return;
      }
      const beaten = x.cases.some((c, i) => {
        if (!c.hidden) return false;
        const r = runOnce(dir, c.stdin);
        return !(r.ok && normalizeOutput(r.stdout) === normalizeOutput(results[exercises.caseKey(x.lesson, i)]));
      });
      if (!beaten) {
        problems.push(`${x.lesson}: printing the sample output passes every hidden case. Give a hidden case a different input.`);
      }
    });
  }

  return results;
}

function indent(s) {
  return String(s).split('\n').slice(0, 12).map((l) => '      ' + l).join('\n');
}

function main(argv) {
  const write = argv.includes('--write');
  const only = argv.indexOf('--lesson') === -1 ? null : argv[argv.indexOf('--lesson') + 1];

  if (!haveJdk()) {
    console.error('\n  No javac/java on PATH. This script verifies by RUNNING the reference'
      + '\n  solutions, so there is nothing it can honestly check without a JDK.\n');
    process.exit(2);
  }

  const list = exercises.all().filter((x) => !only || x.lesson === only);
  if (!list.length) {
    console.error(`no exercise matches ${only}`);
    process.exit(2);
  }

  const problems = [];
  const cases = {};
  let done = 0;
  for (const x of list) {
    Object.assign(cases, verifyOne(x, problems));
    done++;
    if (done % 5 === 0 || done === list.length) {
      process.stdout.write(`\r  ran ${done}/${list.length} exercises`);
    }
  }
  process.stdout.write('\n');

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). Nothing written:\n`);
    for (const p of problems) console.error('    ' + p);
    console.error('');
    process.exit(1);
  }

  if (write) {
    // A partial --write would leave the file describing some exercises at their
    // current reference and others at a stale one, so a filtered run refuses.
    if (only) {
      console.error('\n  --write regenerates the whole file, so it cannot be combined with --lesson.\n');
      process.exit(2);
    }
    const doc = { generated_by: 'scripts/verify-csa-exercises.js', item: exercises.ITEM, cases };
    fs.writeFileSync(exercises.EXPECTED_FILE, JSON.stringify(doc, null, 1) + '\n');
    console.log(`\n  wrote ${path.relative(path.join(__dirname, '..'), exercises.EXPECTED_FILE)}`);
    console.log(`    ${Object.keys(cases).length} verified case outputs across ${list.length} exercises\n`);
    process.exit(0);
  }

  // Check mode: the stored file must match what the reference solutions print.
  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(exercises.EXPECTED_FILE, 'utf8'));
  } catch (_) {
    console.error('\n  expected.generated.json is missing or unreadable.'
      + '\n  Run: node scripts/verify-csa-exercises.js --write\n');
    process.exit(1);
  }

  const drift = [];
  for (const [k, v] of Object.entries(cases)) {
    if (!(k in stored.cases)) drift.push(`${k}: not in the generated file`);
    else if (stored.cases[k] !== v) drift.push(`${k}: stored output no longer matches the reference solution`);
  }
  if (!only) {
    for (const k of Object.keys(stored.cases)) {
      if (!(k in cases)) drift.push(`${k}: in the generated file but no longer an exercise case`);
    }
  }

  if (drift.length) {
    console.error(`\n  ${drift.length} case(s) drifted from the reference solutions:\n`);
    for (const d of drift.slice(0, 30)) console.error('    ' + d);
    console.error('\n  Run: node scripts/verify-csa-exercises.js --write\n');
    process.exit(1);
  }

  console.log(`\n  ${list.length} exercises verified against real javac/java.`);
  console.log('    every reference solution compiles, runs and matches the stored key');
  console.log('    no starter passes, and no hardcoded output beats the hidden cases\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { normalizeOutput, assembleFor, cheatSource };
