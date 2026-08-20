'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GREENFOOT TRACE RECORDER - offline checks.
//
//  The valuable half of this file is section 5, which compiles the generated
//  program with a real javac and runs it on a real JVM. Everything else is
//  string checking, and string checking is exactly what let an earlier version
//  of the stub ship a program that looked right and did not compile.
//
//  What is pinned here:
//    - a graded case is completely unaffected by the recorder existing
//    - generated Java is never built from unvalidated input
//    - the caps are real, not documented
//    - a crash is captured rather than lost
//    - the student's own println survives alongside the trace
//
//  Zero PII: synthetic Java only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gftrace
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const stub = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

const { traceCase, parseTrace, expandCase, TRACE_BEGIN, TRACE_END } = stub;

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }
function throws(fn) {
  try { fn(); return null; } catch (e) { return e.message; }
}

const JAVA = 62;

// ── 1. The recorder must be invisible to grading ─────────────────────────────
//  Submit compares stdout to expected_stdout. If a graded case ever emitted a
//  trace, every CSA exercise would fail at once. The recorder is only reachable
//  by calling GreenfootTrace.record, which only traceCase generates.
section('1. A graded case is untouched by the recorder existing');

const gradedCase = {
  prelude: '// @greenfoot-stub actor\nclass Fruit extends Actor { }',
  postlude: '    System.out.println(1 + 2);',
};
const graded = expandCase(gradedCase);

// The sentinel STRING is present in every expanded prelude, because the
// recorder's source ships with the stub. That is fine and unavoidable. What
// must be true is that a graded case never CALLS it, which is 1.2, and that
// running one emits nothing, which is 5.16 with a real JVM behind it.
ok('1.1 the recorder is dead code in a graded case, reachable only by a call',
  graded.prelude.includes('class GreenfootTrace')
  && !/GreenfootTrace\s*\.\s*record/.test(graded.prelude + graded.postlude));
ok('1.2 a graded case never calls the recorder',
  !/GreenfootTrace\s*\.\s*record/.test(graded.postlude));
ok('1.3 a case with no sentinel is still returned byte for byte',
  (() => {
    const plain = { prelude: 'int a = 1;', postlude: 'System.out.println(a);' };
    const out = expandCase(plain);
    return out.prelude === plain.prelude && out.postlude === plain.postlude;
  })());

// ── 2. Generated Java is never built from unvalidated input ──────────────────
//  Scenes are authored in this repo, not by students. That is not a reason to
//  interpolate freely: a typo should fail here with a sentence, not inside
//  Judge0 as a compile error somebody's kid has to read.
section('2. Scene values are validated before they reach generated Java');

const goodScene = {
  world: { width: 10, height: 6, cell: 40 },
  actors: [{ type: 'Harness', x: 0, y: 3 }],
};

ok('2.1 a well formed scene builds', !!traceCase(goodScene).postlude);

ok('2.2 a type name that is not a Java identifier is refused',
  /Java identifier/.test(throws(() => traceCase({
    world: goodScene.world, actors: [{ type: 'Harness(); evil();', x: 0, y: 0 }],
  })) || ''));

ok('2.3 an actor outside the world is refused',
  /integer in/.test(throws(() => traceCase({
    world: goodScene.world, actors: [{ type: 'Harness', x: 99, y: 0 }],
  })) || ''));

ok('2.4 a key with quotes in it is refused',
  /key must be/.test(throws(() => traceCase({
    world: goodScene.world, actors: goodScene.actors, keys: ['a"); evil(); //'],
  })) || ''));

ok('2.5 a frame count over the cap is refused in Node, not silently clamped',
  /integer in/.test(throws(() => traceCase({
    world: goodScene.world, actors: goodScene.actors, frames: 100000,
  })) || ''));

ok('2.6 a scene with no actors is refused',
  /at least one actor/.test(throws(() => traceCase({
    world: goodScene.world, actors: [],
  })) || ''));

ok('2.7 an unknown harness base is refused',
  /unknown harness base/.test(throws(() => traceCase({
    world: goodScene.world, actors: goodScene.actors, base: 'nonsense',
  })) || ''));

// ── 3. parseTrace splits the two output channels ─────────────────────────────
section('3. parseTrace separates the trace from the student console output');

const sample = `hello\n${TRACE_BEGIN}\n{"w":2,"h":2,"c":8,"t":["A"],"f":[[[1,0,0,0,0]]]}\n${TRACE_END}\nbye\n`;
const parsed = parseTrace(sample);
ok('3.1 the trace parses', parsed.trace && parsed.trace.w === 2, parsed.trace);
ok('3.2 the student println survives on both sides of the block',
  parsed.stdout.includes('hello') && parsed.stdout.includes('bye'), parsed.stdout);
ok('3.3 the sentinels are not left in the console text',
  !parsed.stdout.includes(TRACE_BEGIN) && !parsed.stdout.includes(TRACE_END));

const none = parseTrace('just output\n');
ok('3.4 output with no trace comes back whole and unflagged',
  none.trace === null && none.stdout === 'just output\n' && none.malformed === false);

const cut = parseTrace(`${TRACE_BEGIN}\n{"w":2,"h":2,"f":[[[1,0\n${TRACE_END}\n`);
ok('3.5 a truncated trace is reported rather than thrown',
  cut.trace === null && cut.malformed === true);

ok('3.6 parseTrace tolerates null', parseTrace(null).stdout === '');

// The student's code lands in a class called Harness, which is an assembly
// detail. A lesson about crabs must never show that word, so display names are
// applied at parse time while the recorder keeps printing the truth.
const named = parseTrace(
  `${TRACE_BEGIN}\n{"w":2,"h":2,"c":8,"t":["Harness","Worm"],"f":[[[1,0,0,0,0]]]}\n${TRACE_END}`,
  { names: { Harness: 'Crab' } });
ok('3.7 display names are applied without altering the real class names',
  named.trace.d[0] === 'Crab' && named.trace.t[0] === 'Harness', named.trace.d);
ok('3.8 a type with no display name keeps its class name',
  named.trace.d[1] === 'Worm', named.trace.d);
ok('3.9 with no names option there is no display array',
  parseTrace(sample).trace.d === undefined);

// ── 4. The caps exist in the Java, not only in the docs ──────────────────────
section('4. The caps are in the emitted Java');

ok('4.1 MAX_FRAMES is declared', /MAX_FRAMES\s*=\s*240/.test(stub.STUB_JAVA));
ok('4.2 MAX_ACTORS is declared', /MAX_ACTORS\s*=\s*300/.test(stub.STUB_JAVA));
ok('4.3 the frame loop is clamped by MAX_FRAMES',
  /Math\.min\(MAX_FRAMES,\s*frames\)/.test(stub.STUB_JAVA));
ok('4.4 actors carry a stable id', /__ident\(\)/.test(stub.STUB_JAVA));

// ── 5. It compiles and it runs ───────────────────────────────────────────────
section('5. javac accepts the trace program and the JVM produces a real trace');

let javacOk = true;
try { execFileSync('javac', ['-version'], { stdio: 'ignore' }); }
catch (e) { javacOk = false; }

if (!javacOk) {
  console.log('  skip  no JDK on this machine, compile checks not run');
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gftrace-'));
  // JAVA_TOOL_OPTIONS is cleared because the JVM echoes it to stderr on every
  // invocation, and it is long enough to bury a real compile error.
  const env = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });
  const run = (src) => {
    fs.writeFileSync(path.join(dir, 'Main.java'), src);
    execFileSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, stdio: 'pipe', env });
    return execFileSync('java', ['-cp', '.', 'Main'], { cwd: dir, stdio: 'pipe', env }).toString();
  };
  const build = (segment, scene) => codeModes.assemble('segment', JAVA, segment, traceCase(scene));

  // 5.1 The Unit 1 lab, step 7, exactly as LAB.md asks a student to write it.
  const patrol = `
  public void act()
  {
      move(2);
      if (isAtEdge())
      {
          turn(180);
      }
  }
`;
  let patrolTrace = null;
  try {
    const out = run(build(patrol, {
      world: { width: 20, height: 10, cell: 40 },
      helpers: 'class Worm extends Actor { }',
      actors: [
        { type: 'Harness', x: 2, y: 5 },
        { type: 'Worm', x: 12, y: 5 },
      ],
      frames: 40,
    }));
    patrolTrace = parseTrace(out).trace;
    ok('5.1 the Unit 1 patrol scenario compiles and records', !!patrolTrace);
  } catch (e) {
    ok('5.1 the Unit 1 patrol scenario compiles and records', false,
      String(e.stderr || e.message).slice(0, 800));
  }

  if (patrolTrace) {
    ok('5.2 it records the frame count asked for', patrolTrace.f.length === 40, patrolTrace.f.length);
    ok('5.3 the name table holds both actor types',
      patrolTrace.t.length === 2 && patrolTrace.t.indexOf('Worm') !== -1, patrolTrace.t);

    // The crab is actor id 1 and it is the only thing that moves.
    const crabX = patrolTrace.f.map((fr) => (fr.find((a) => a[0] === 1) || [])[2]);
    ok('5.4 frame 0 is the scene BEFORE anything acts', crabX[0] === 2, crabX[0]);
    ok('5.5 it walks right two cells a frame', crabX[1] === 4 && crabX[2] === 6, crabX.slice(0, 3));
    ok('5.6 it reaches the far wall', Math.max.apply(null, crabX) === 19, Math.max.apply(null, crabX));
    ok('5.7 it turns round and comes back', crabX.indexOf(19) > 0 && crabX[crabX.indexOf(19) + 1] === 17,
      crabX.slice(crabX.indexOf(19), crabX.indexOf(19) + 3));

    const rot = patrolTrace.f.map((fr) => (fr.find((a) => a[0] === 1) || [])[4]);
    ok('5.8 turn(180) is visible in the rotation channel', rot.indexOf(180) !== -1);

    // Ids are what make tweening possible. The worm never moves, so its id must
    // be identical in every frame it appears in.
    const wormIds = patrolTrace.f.map((fr) => (fr.find((a) => a[1] === patrolTrace.t.indexOf('Worm')) || [])[0]);
    ok('5.9 a stationary actor keeps one id for the whole run',
      new Set(wormIds).size === 1, Array.from(new Set(wormIds)));
  }

  // 5.10 A crash keeps its frames and names the exception.
  try {
    const out = run(build(`
  private int n = 0;
  public void act()
  {
      move(1);
      n = n + 1;
      if (n == 4) { int boom = 5 / (n - 4); }
  }
`, {
      world: { width: 10, height: 6, cell: 40 },
      actors: [{ type: 'Harness', x: 0, y: 3 }],
      frames: 12,
    }));
    const t = parseTrace(out).trace;
    ok('5.10 a run that throws keeps the frames up to the throw',
      t && t.f.length === 4, t && t.f.length);
    ok('5.11 the exception is named in the trace, not lost',
      t && /ArithmeticException/.test(t.error || ''), t && t.error);
  } catch (e) {
    ok('5.10 a run that throws keeps the frames up to the throw', false,
      String(e.stderr || e.message).slice(0, 800));
  }

  // 5.12 The student's own println is not swallowed by the trace block.
  try {
    const out = run(build(`
  public void act()
  {
      System.out.println("x is " + getX());
      move(1);
  }
`, {
      world: { width: 8, height: 4, cell: 40 },
      actors: [{ type: 'Harness', x: 0, y: 2 }],
      frames: 3,
    }));
    const r = parseTrace(out);
    ok('5.12 student println lands in the console pane, not the trace',
      /x is 0/.test(r.stdout) && !!r.trace, r.stdout.slice(0, 80));
  } catch (e) {
    ok('5.12 student println lands in the console pane, not the trace', false,
      String(e.stderr || e.message).slice(0, 800));
  }

  // 5.13 The actor cap actually fires. A world that spawns every frame is the
  // G-09 mistake, and the recorder must stop rather than emit megabytes.
  try {
    const out = run(build(`
  public void act()
  {
      for (int i = 0; i < 40; i++)
      {
          getWorld().addObject(new Blob(), 1, 1);
      }
  }
`, {
      world: { width: 8, height: 8, cell: 40 },
      helpers: 'class Blob extends Actor { }',
      actors: [{ type: 'Harness', x: 0, y: 0 }],
      frames: 200,
    }));
    const t = parseTrace(out).trace;
    ok('5.13 runaway spawning trips the actor cap', t && t.trunc === 'actors', t && t.trunc);
    ok('5.14 and it stops well short of the frame count',
      t && t.f.length < 30, t && t.f.length);
  } catch (e) {
    ok('5.13 runaway spawning trips the actor cap', false,
      String(e.stderr || e.message).slice(0, 800));
  }

  // 5.15 Held keys reach the student's code, which is what makes an arrow-key
  // lesson demonstrable at all.
  try {
    const out = run(build(`
  public void act()
  {
      if (Greenfoot.isKeyDown("left")) { setLocation(getX() - 1, getY()); }
  }
`, {
      world: { width: 10, height: 4, cell: 40 },
      actors: [{ type: 'Harness', x: 9, y: 2 }],
      frames: 5,
      keys: ['left'],
    }));
    const t = parseTrace(out).trace;
    const xs = t.f.map((fr) => fr[0][2]);
    ok('5.15 a held key drives the run', xs[0] === 9 && xs[1] === 8 && xs[4] === 5, xs);
  } catch (e) {
    ok('5.15 a held key drives the run', false, String(e.stderr || e.message).slice(0, 800));
  }

  // 5.16 The one that actually protects grading: run a GRADED case end to end
  // and prove no trace comes out. Section 1 can only inspect strings; this
  // compiles the same shape a real submission compiles and reads the output.
  try {
    const out = run(codeModes.assemble('segment', JAVA, `
  public void slideLeft()
  {
      setLocation(getX() - 1, getY());
  }
`, expandCase({
      prelude: '// @greenfoot-stub actor',
      postlude: `    World w = new World(6, 3, 32);
    Harness h = new Harness();
    w.addObject(h, 4, 1);
    h.slideLeft();
    System.out.println(h.getX() + "," + h.getY());`,
    })));
    const r = parseTrace(out);
    ok('5.16 a graded case emits its expected output and NO trace',
      r.trace === null && out.trim() === '3,1', { out: out.trim(), trace: r.trace });
  } catch (e) {
    ok('5.16 a graded case emits its expected output and NO trace', false,
      String(e.stderr || e.message).slice(0, 800));
  }

  fs.rmSync(dir, { recursive: true, force: true });
}

// ── 6. The player is loadable and does not reach for the network ─────────────
section('6. The browser player');

const playerSrc = fs.readFileSync(path.join(__dirname, '..', 'shopify', 'greenfoot-player.js'), 'utf8');
ok('6.1 it exposes a mount function', /window\.GreenfootPlayer\s*=/.test(playerSrc));
ok('6.2 it makes no network calls', !/\bfetch\(|XMLHttpRequest|import\(/.test(playerSrc));
ok('6.3 it honours prefers-reduced-motion', /prefers-reduced-motion/.test(playerSrc));
ok('6.3b it renders a legend, so a student can tell which disc is theirs',
  /legend/.test(playerSrc) && /trace\.d \|\| trace\.t/.test(playerSrc));
// A hardcoded light-page grey renders as invisible text on a dark host, which
// is exactly what the first dark-theme screenshot of the demo page showed.
ok('6.3c control text inherits colour rather than hardcoding a light-page grey',
  !/color:#(5a6672|3d4b59)/.test(playerSrc) && /color:inherit/.test(playerSrc));
ok('6.4 autoplay is off: play only happens on a click',
  !/requestAnimationFrame\(tick\);\s*\n\s*\}\s*\n\s*render\(\);\s*\n\s*play\(\)/.test(playerSrc)
  && /playBtn\.addEventListener/.test(playerSrc));
// Not a pure-ASCII check: every lib file in this repo draws box rules in its
// header comment. The hazard is the characters that break when a file is
// re-encoded or pasted into a Liquid template, which is smart quotes and dashes.
ok('6.5 no smart quotes or dashes that break on re-encoding',
  !/[\u2018\u2019\u201c\u201d\u2013\u2014]/.test(playerSrc));
ok('6.6 no em-dashes anywhere in this feature',
  !/—/.test(playerSrc)
  && !/—/.test(fs.readFileSync(path.join(__dirname, '..', 'docs', 'greenfoot-trace.md'), 'utf8')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
