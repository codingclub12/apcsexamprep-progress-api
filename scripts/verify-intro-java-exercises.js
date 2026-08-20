#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY THE INTRO TO JAVA EXERCISE BANK, AND GENERATE ITS EXPECTED OUTPUTS.
//
//  Ported from scripts/verify-csa-exercises.js, and it exists for the same
//  reason: a hand written expected output is a guess about what Java prints.
//  Here the guesses would be worse than in CSA, because Greenfoot's y grows
//  DOWNWARD and half the exercises move something. An author writing expected
//  output by hand gets the sign wrong roughly a third of the time, and a wrong
//  expected output fails a student whose code is correct.
//
//  So nothing in the bank states an expected output. This runs each `reference`
//  through real javac and java against every case and writes what actually came
//  out. The bank is correct by construction.
//
//  ── FOUR THINGS IT PROVES, NOT ONE ──────────────────────────────────────────
//
//  1. The reference COMPILES against the stub, assembled exactly the way a real
//     submission is assembled.
//  2. Every case produces output, which is what expected.generated.json records.
//  3. THE CHEAT FAILS. For each exercise it builds the submission that prints
//     the first visible case's expected output as a constant, and asserts that
//     submission does not pass every case. An exercise whose cheat passes is a
//     broken exercise, not a lenient one.
//  4. The Run scene records a trace, so a student pressing Run gets an animation
//     rather than an error. An exercise with a broken scene is caught here and
//     not by a fourteen year old at 11pm.
//
//  ── USAGE ───────────────────────────────────────────────────────────────────
//    node scripts/verify-intro-java-exercises.js            check only
//    node scripts/verify-intro-java-exercises.js --write    regenerate the file
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { EXERCISES, itemId } = require('../seed/intro-java-exercises');
const { expandCase, traceCase, parseTrace } = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

const JAVA = 62;
const OUT = path.join(__dirname, '..', 'seed', 'intro-java-expected.generated.json');

const write = process.argv.includes('--write');

// The JVM echoes JAVA_TOOL_OPTIONS to stderr on every invocation, and it is long
// enough to bury a real compile error in the failure detail. This compile needs
// none of what it carries.
const env = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });

let dir;
function compileAndRun(source) {
  fs.writeFileSync(path.join(dir, 'Main.java'), source);
  execFileSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, stdio: 'pipe', env });
  return execFileSync('java', ['-cp', '.', 'Main'], { cwd: dir, stdio: 'pipe', env }).toString();
}

/**
 * Assemble one graded case exactly the way routes/student.js assembles a real
 * submission: expandCase for the stub, then the shared assembler for the wrap.
 * Going through the same two functions is the point. A local reimplementation
 * would keep passing after the real path changed.
 */
function buildGraded(exercise, testCase, submission) {
  const expanded = expandCase({
    prelude: `// @greenfoot-stub ${exercise.base}\n${exercise.helpers || ''}`,
    postlude: `    ${testCase.setup}`,
  });
  return codeModes.assemble('segment', JAVA, submission, expanded);
}

function normalize(s) {
  return String(s).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}

function main() {
  let hasJdk = true;
  try { execFileSync('javac', ['-version'], { stdio: 'ignore' }); }
  catch (e) { hasJdk = false; }

  if (!hasJdk) {
    // --write without a JDK is refused outright: generating an expected output
    // without running the code is the exact thing this script exists to prevent,
    // and a plausible-looking file written from nothing is worse than no file.
    if (write) {
      console.error('\n  no JDK on this machine, so there is nothing to generate FROM.');
      console.error('  Refusing to write expected output that was never run.\n');
      process.exit(2);
    }
    // Checking without a JDK skips, the same as smoke:greenfoot and
    // smoke:gftrace. CI pins a JDK (see .github/workflows/tests.yml) so this
    // path is for a developer laptop, not for the gate.
    console.log('\n  skip  no JDK on this machine, exercise verification not run\n');
    return;
  }

  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ijverify-'));
  const generated = {};
  const problems = [];
  let cases = 0;

  for (const ex of EXERCISES) {
    const key = `${ex.lesson}:${itemId(ex.lesson)}`;
    const outputs = [];

    // Integrity rules, checked before anything is run so a malformed exercise
    // reports as malformed rather than as a compile error.
    if (!ex.cases || ex.cases.length < 3) {
      problems.push(`${key}: needs at least 3 cases, has ${(ex.cases || []).length}`);
      continue;
    }
    if (!ex.cases.some((c) => c.hidden)) {
      problems.push(`${key}: needs at least one hidden case`);
      continue;
    }
    if (!ex.reference || !ex.starter) {
      problems.push(`${key}: needs both a starter and a reference`);
      continue;
    }
    if (normalize(ex.starter) === normalize(ex.reference)) {
      problems.push(`${key}: the starter IS the reference, so the exercise asks for nothing`);
      continue;
    }

    // 1 and 2. The reference compiles and every case produces output.
    let referenceOk = true;
    for (let i = 0; i < ex.cases.length; i++) {
      try {
        const out = normalize(compileAndRun(buildGraded(ex, ex.cases[i], ex.reference)));
        outputs.push(out);
        cases++;
      } catch (e) {
        referenceOk = false;
        problems.push(`${key} case ${i}: reference failed\n${String(e.stderr || e.message).slice(0, 700)}`);
        break;
      }
    }
    if (!referenceOk) continue;

    // The starter must NOT already pass. A starter that passes means the
    // exercise is answered before the student opens it.
    let starterPasses = true;
    try {
      for (let i = 0; i < ex.cases.length; i++) {
        const out = normalize(compileAndRun(buildGraded(ex, ex.cases[i], ex.starter)));
        if (out !== outputs[i]) { starterPasses = false; break; }
      }
    } catch (e) {
      // A starter that does not compile is fine and usual: the body is empty.
      starterPasses = false;
    }
    if (starterPasses) problems.push(`${key}: the STARTER already passes every case`);

    // 3. The cheat must fail. This is the submission a student writes when they
    // read the visible expected output and print it back as a literal.
    const visible = ex.cases.findIndex((c) => !c.hidden);
    if (visible !== -1) {
      const lines = outputs[visible].split('\n').filter((l) => l.length);
      const body = lines.map((l) => `    System.out.println(${JSON.stringify(l)});`).join('\n');
      // Same signature as the reference's first method, so it compiles into the
      // same harness slot. The signature line is whatever the reference declares.
      const sig = (ex.reference.match(/^\s*public [^\n]*\)\s*$/m) || [])[0];
      if (sig) {
        const cheat = `${sig.trim()}\n{\n${body}\n}`;
        let cheatPasses = true;
        try {
          for (let i = 0; i < ex.cases.length; i++) {
            const out = normalize(compileAndRun(buildGraded(ex, ex.cases[i], cheat)));
            if (out !== outputs[i]) { cheatPasses = false; break; }
          }
        } catch (e) {
          cheatPasses = false;
        }
        if (cheatPasses) {
          problems.push(`${key}: a submission that prints the visible output as a constant PASSES. `
            + 'Add a hidden case whose setup differs.');
        }
      }
    }

    // 4. The Run scene records a trace.
    if (ex.scene) {
      try {
        const scene = traceCase(Object.assign({}, ex.scene, {
          helpers: ex.helpers || '',
          base: ex.base,
        }));
        const out = compileAndRun(codeModes.assemble('segment', JAVA, ex.reference, scene));
        const parsed = parseTrace(out, { names: ex.scene.names });
        if (!parsed.trace) {
          problems.push(`${key}: the Run scene produced no trace`);
        } else if (!parsed.trace.f.length) {
          problems.push(`${key}: the Run scene produced zero frames`);
        } else if (parsed.trace.error) {
          problems.push(`${key}: the Run scene threw: ${parsed.trace.error}`);
        }
      } catch (e) {
        problems.push(`${key}: the Run scene failed to build or run\n${String(e.stderr || e.message).slice(0, 700)}`);
      }
    }

    generated[key] = {
      lesson: ex.lesson,
      item: itemId(ex.lesson),
      expected: outputs,
    };
  }

  fs.rmSync(dir, { recursive: true, force: true });

  console.log(`\n  ${EXERCISES.length} exercises, ${cases} cases run through real javac and java`);

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`   - ${p}`);
    console.error('');
    process.exit(1);
  }

  if (write) {
    fs.writeFileSync(OUT, `${JSON.stringify(generated, null, 2)}\n`);
    console.log(`  wrote ${path.relative(path.join(__dirname, '..'), OUT)}`);
  } else if (fs.existsSync(OUT)) {
    const onDisk = fs.readFileSync(OUT, 'utf8');
    if (onDisk !== `${JSON.stringify(generated, null, 2)}\n`) {
      console.error('\n  expected.generated.json is STALE. Run with --write.\n');
      process.exit(1);
    }
    console.log('  expected outputs on disk match what the references actually print');
  } else {
    console.error('\n  no expected file yet. Run with --write.\n');
    process.exit(1);
  }

  console.log('  every reference compiles, every cheat fails, every scene animates\n');
}

main();
