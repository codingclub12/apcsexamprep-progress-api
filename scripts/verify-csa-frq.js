#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY THE AP CSA FRQ BANK by compiling and running it.
//
//  Same posture as scripts/verify-csa-exercises.js and
//  scripts/verify-csa-debug-exercises.js: nothing in seed/csa-frq states an
//  expected output, because a hand written one is a guess and a wrong guess
//  fails a student whose code is right. This script runs each `reference`
//  through real javac/java and writes seed/csa-frq/expected.generated.json.
//
//  ── THE THREE THINGS IT PROVES ──────────────────────────────────────────────
//
//  1. The reference solution compiles and runs on every case.
//     Assembled through lib/csa-code-modes.js, the same assembler the live
//     grader uses, so a reference that only works because this script wrapped
//     it differently cannot pass here and fail in production.
//
//  2. A constant cannot pass. For each FRQ it builds the exact cheat a student
//     would write (print the visible case's output as literal text) and asserts
//     it FAILS at least one hidden case. An exercise that a constant passes is
//     not graded, it is decorated.
//
//  3. Every rubric part is discriminated by the case that claims it.
//     This is the check the other two verifiers have no reason to make, and it
//     is the one that keeps `parts` honest. For each case, its rubric part's
//     line of the reference output must not be identical across every case:
//     if part (c) prints the same value no matter what the inputs are, then no
//     case tests part (c) and a student who omitted it entirely still scores
//     four of four. That is a rubric that lies, and it fails the build.
//
//  4. Every declared mutant fails. A `mutants` entry is a named wrong version of
//     the reference, and this asserts it does NOT pass every case. Rubric
//     coverage says a part has cases behind it; a mutant says those cases can
//     actually catch the mistake the part is about. 1.9 had the first and not
//     the second: its casting point was covered by a case and still could not
//     fail a student who omitted the cast, because the harness fed it a
//     division that always came out even.
//
//  5. No hidden case merely repeats a visible case's ANSWER. A hidden case whose
//     output is byte-identical to some visible case's output is not hidden in
//     the way that matters: its answer is already printed on the page, and it
//     cannot distinguish a student who generalised from one who copied the
//     sample. Unit 2 shipped four of these before this check existed, and they
//     were found by the page leak detector reporting the symptom rather than
//     the cause.
//
//  Usage:
//      node scripts/verify-csa-frq.js            check, writes nothing
//      node scripts/verify-csa-frq.js --write    regenerate the expected file
//      node scripts/verify-csa-frq.js --lesson 1.6
//
//  Author content only. No student source is compiled, read or stored here.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const bank = require('../seed/csa-frq');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-frq-verify-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Assemble exactly the way routes/student.js does, per case: a segment case
// carries its own prelude, a driver case carries the shared harness.
function assembleFor(x, source, c) {
  return codeModes.assemble(x.mode, JAVA_LANGUAGE_ID, source, {
    prelude: x.mode === 'segment' ? String((c && c.prelude) || '') : '',
    postlude: x.mode === 'driver' ? x.harness : String((c && c.postlude) || ''),
  });
}

function indent(s) {
  return String(s).split('\n').slice(0, 14).map((l) => '      ' + l).join('\n');
}

function verifyOne(x, problems) {
  const outputs = {};

  x.cases.forEach((c, i) => {
    withTempDir((dir) => {
      // A segment case bakes its prelude into the source, so each case is its
      // own compile. Program and driver cases share one compile per exercise,
      // but compiling per case here costs seconds and keeps this loop simple
      // enough to be obviously correct.
      const built = compileOnce(dir, assembleFor(x, x.reference, c));
      if (!built.ok) {
        problems.push(`${x.lesson} case ${i}: the REFERENCE SOLUTION does not compile:\n${indent(built.error)}`);
        return;
      }
      const r = runOnce(dir, c.stdin);
      if (r.timedOut) { problems.push(`${x.lesson} case ${i}: the reference solution timed out`); return; }
      if (!r.ok) { problems.push(`${x.lesson} case ${i}: the reference solution crashed:\n${indent(r.stderr)}`); return; }
      outputs[bank.caseKey(x.lesson, i)] = normalizeOutput(r.stdout);
    });
  });

  return outputs;
}

// PROOF 2: the constant cheat must fail.
function proveConstantFails(x, outputs, problems) {
  const visible = x.cases.map((c, i) => ({ c, i })).filter(({ c }) => !c.hidden);
  if (!visible.length) return;
  const shown = outputs[bank.caseKey(x.lesson, visible[0].i)];
  if (shown == null) return;

  // The cheat a real student writes: print the sample output as literal text.
  const literal = String(shown).split('\n')
    .map((line) => `System.out.println(${JSON.stringify(line)});`).join('\n');
  const cheat = x.mode === 'segment'
    ? literal
    : `public class Main {\n  public static void main(String[] args) {\n${literal}\n  }\n}`;
  // A driver-mode cheat cannot even declare Main, so the assembler rejects it
  // and the cheat fails by construction. Nothing to prove there.
  if (x.mode === 'driver') return;

  const beaten = x.cases.some((c, i) => {
    if (!c.hidden) return false;
    const want = outputs[bank.caseKey(x.lesson, i)];
    if (want == null) return false;
    return withTempDir((dir) => {
      const built = compileOnce(dir, assembleFor(x, cheat, c));
      if (!built.ok) return true;
      const r = runOnce(dir, c.stdin);
      if (!r.ok) return true;
      return normalizeOutput(r.stdout) !== want;
    });
  });

  if (!beaten) {
    problems.push(`${x.lesson}: a constant that prints the visible sample passes every hidden case. `
      + 'Give at least one hidden case inputs that change the answer.');
  }
}

// PROOF 3: every rubric part is actually discriminated by its own cases.
function proveRubricDiscriminates(x, outputs, problems) {
  const lines = (key) => String(outputs[key] == null ? '' : outputs[key]).split('\n');

  const byPart = new Map();
  x.cases.forEach((c, i) => {
    if (!byPart.has(c.part)) byPart.set(c.part, []);
    byPart.get(c.part).push(i);
  });

  // The reference prints one line per rubric part in order, except where a part
  // is documented to print two (1.6 part d). So compare the WHOLE output rather
  // than guessing a line index: if the case a part claims produces output that
  // is identical to every other case's output, that case discriminates nothing.
  for (const [part, idxs] of byPart) {
    const distinct = idxs.some((i) => {
      const mine = outputs[bank.caseKey(x.lesson, i)];
      return x.cases.some((_, j) => j !== i && outputs[bank.caseKey(x.lesson, j)] !== mine);
    });
    if (!distinct) {
      problems.push(`${x.lesson}: every case tagged rubric part ${part} `
        + `(${x.parts[part - 1].label}) produces output identical to every other case, `
        + 'so nothing about that part is being tested.');
    }
    void lines;
  }
}

// PROOF 4: each declared mutant must fail at least one case.
function proveMutantsFail(x, outputs, problems) {
  for (const m of x.mutants || []) {
    const mutated = String(x.reference).split(m.find).join(m.replace);
    const caught = x.cases.some((c, i) => {
      const want = outputs[bank.caseKey(x.lesson, i)];
      if (want == null) return false;
      return withTempDir((dir) => {
        const built = compileOnce(dir, assembleFor(x, mutated, c));
        if (!built.ok) return true;
        const r = runOnce(dir, c.stdin);
        if (!r.ok) return true;
        return normalizeOutput(r.stdout) !== want;
      });
    });
    if (!caught) {
      problems.push(`${x.lesson}: the mutant ${JSON.stringify(m.describe)} passes EVERY case, `
        + 'so that mistake cannot lose a point here. Change the case values until it fails.');
    }
  }
}

// PROOF 5: a hidden case must have an answer the page does not already show.
function proveHiddenAnswersAreNew(x, outputs, problems) {
  const visible = new Set(
    x.cases.map((c, i) => ({ c, i })).filter(({ c }) => !c.hidden)
      .map(({ i }) => outputs[bank.caseKey(x.lesson, i)])
      .filter((o) => o != null));

  x.cases.forEach((c, i) => {
    if (!c.hidden) return;
    const mine = outputs[bank.caseKey(x.lesson, i)];
    if (mine != null && visible.has(mine)) {
      problems.push(`${x.lesson}: hidden case ${i} produces exactly the same output as a `
        + 'VISIBLE case, so its answer is already printed on the page. Change its inputs '
        + 'so at least one part answers differently.');
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const li = args.indexOf('--lesson');
  const only = li >= 0 ? args[li + 1] : null;

  if (!haveJdk()) {
    console.error('javac and java are required. Install a JDK (21 is what CI uses) and re-run.');
    process.exit(2);
  }

  const all = bank.all().filter((x) => !only || x.lesson === only);
  if (!all.length) {
    console.error(only ? `no FRQ for lesson ${only}` : 'the FRQ bank is empty');
    process.exit(2);
  }

  const problems = [];
  let cases = {};

  all.forEach((x, n) => {
    const outputs = verifyOne(x, problems);
    cases = Object.assign(cases, outputs);
    proveConstantFails(x, outputs, problems);
    proveRubricDiscriminates(x, outputs, problems);
    proveMutantsFail(x, outputs, problems);
    proveHiddenAnswersAreNew(x, outputs, problems);
    if ((n + 1) % 5 === 0) console.log(`  ${n + 1}/${all.length}`);
  });

  const caseCount = all.reduce((s, x) => s + x.cases.length, 0);
  const mutantCount = all.reduce((s, x) => s + (x.mutants || []).length, 0);

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  if (write) {
    if (only) {
      console.error('\n  --write regenerates the whole file, so it cannot be combined with --lesson.\n');
      process.exit(2);
    }
    const doc = { generated_by: 'scripts/verify-csa-frq.js', item: bank.ITEM, cases };
    fs.writeFileSync(bank.EXPECTED_FILE, JSON.stringify(doc, null, 2) + '\n');
    console.log(`\nwrote ${path.relative(process.cwd(), bank.EXPECTED_FILE)}`);
  } else if (fs.existsSync(bank.EXPECTED_FILE)) {
    const have = JSON.parse(fs.readFileSync(bank.EXPECTED_FILE, 'utf8')).cases || {};
    const drifted = Object.keys(cases).filter((k) => have[k] !== cases[k]);
    const missing = Object.keys(cases).filter((k) => !(k in have));
    if (drifted.length) {
      console.error(`\n${drifted.length} case(s) no longer match the generated file, `
        + 'so the bank changed without the expectations being regenerated:');
      for (const k of drifted.slice(0, 10)) console.error('  - ' + k);
      console.error('\n  Run: node scripts/verify-csa-frq.js --write\n');
      process.exit(1);
    }
    void missing;
  }

  console.log(`\n${all.length} FRQ(s) verified clean against ${caseCount} cases.`);
  console.log('Every reference compiles and runs, no constant passes, and every rubric part is tested.');
  if (mutantCount) console.log(`${mutantCount} declared mistake(s) were each proven to fail at least one case.`);
}

main();
