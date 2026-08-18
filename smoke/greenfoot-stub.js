'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the headless Greenfoot stub that makes intro-java code exercises
//  auto-gradable.
//
//  WHY THIS EXISTS
//  The stub gets its top-level classes past the class/main wrap by closing main
//  and Main itself and reopening a harness class, which means it depends on the
//  wrap appending EXACTLY two closing braces. That is a real coupling to a
//  function this file does not own. Left unpinned, a change to the wrap would
//  not break loudly; it would make every intro-java code exercise fail to
//  compile, which the grader reports to students as a failed test case. Every
//  kid in the class gets a zero and the page looks fine.
//
//  So this asserts against the REAL wrap, never a copy of it. That wrap used to
//  be a private buildProgram inside routes/student.js and had to be read out of
//  the source; it now lives in lib/csa-code-modes.js as assemble('segment', ...)
//  and is imported directly, which is the same guarantee with less ceremony. And
//  where a JDK is present it goes further and actually compiles and runs the
//  assembled program, because "the braces balance" is not the same claim as
//  "javac accepts this".
//
//  Also pinned here: determinism (the seeded LCG), because a flaky case fails
//  students at random for code that is correct.
//
//  Zero PII: synthetic Java only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:greenfoot
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { expandCase, usesStub, STUB_JAVA } = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// ── The real wrap, not a copy ────────────────────────────────────────────────
// A local reimplementation would keep passing after the real wrap changed,
// which is the one failure this file exists to catch. So the shared assembler is
// called directly, and the route is checked to still be calling the same one.
const buildProgram = (languageId, prelude, segment, postlude) =>
  codeModes.assemble('segment', languageId, segment, { prelude, postlude });

const studentSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'student.js'), 'utf8');

section('1. The wrap this stub is coupled to still looks the way it did');
ok('1.1 the grade route still assembles through the shared assembler',
  /codeModes\.assemble\(/.test(studentSrc) && !/function buildProgram\(/.test(studentSrc));
ok('1.1b the grade route still expands the stub sentinel before assembling',
  /expandCase\(/.test(studentSrc));

const JAVA = 62;
ok('1.2 it still wraps Java in class Main with a main method',
  /public class Main/.test(buildProgram(JAVA, '', 'int x;', '')));
ok('1.3 it still closes with exactly two braces after the body',
  /\n {2}\}\n\}\n$/.test(buildProgram(JAVA, '', 'int x;', '')));

section('2. A case without the sentinel is untouched');
const plainCase = { prelude: 'int a = 17;\nint b = 5;', postlude: 'System.out.println("done");' };
const plainOut = expandCase(plainCase);
ok('2.1 expandCase returns both halves byte for byte',
  plainOut.prelude === plainCase.prelude && plainOut.postlude === plainCase.postlude);
ok('2.2 usesStub says no', usesStub(plainCase.prelude) === false);
ok('2.3 an empty or missing case is safe',
  expandCase({}).prelude === '' && expandCase(null).postlude === '');
ok('2.4 which means an existing CSA case assembles exactly as before',
  buildProgram(JAVA, plainOut.prelude, 'System.out.println(a + b);', plainOut.postlude)
  === buildProgram(JAVA, plainCase.prelude, 'System.out.println(a + b);', plainCase.postlude));

section('3. A stub case assembles into a brace-balanced program');
function braceBalance(src) {
  // Good enough for generated Java with no string or char literals containing
  // braces, which is what the stub and its cases are.
  let depth = 0, min = 0;
  for (const ch of src) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < min) min = depth; }
  }
  return { depth, min };
}

const actorCase = expandCase({
  prelude: '// @greenfoot-stub actor',
  postlude: [
    'World w = new World(10, 10, 32);',
    'Harness h = new Harness();',
    'w.addObject(h, 5, 5);',
    'h.slideLeft();',
    'System.out.println(h.getX() + "," + h.getY());',
  ].join('\n'),
});

const studentSegment = [
  'public void slideLeft() {',
  '  setLocation(getX() - 4, getY());',
  '}',
].join('\n');

const program = buildProgram(JAVA, actorCase.prelude, studentSegment, actorCase.postlude);
const bal = braceBalance(program);
ok('3.1 the assembled program is brace balanced', bal.depth === 0, bal);
ok('3.2 and never closes below top level partway through', bal.min === 0, bal);
ok('3.3 the stub classes land at top level, outside Main',
  /\n\}\n\}\n[\s\S]*?\nclass GreenfootStubError/.test(program.replace(/\r/g, '')));
ok('3.4 the student segment lands at CLASS level, so it can declare a method',
  program.indexOf('class Harness extends Actor') < program.indexOf('public void slideLeft'));
ok('3.5 main actually calls the harness', /Harness\.__main\(\);/.test(program));

section('4. The three harness bases are all reachable and balanced');
for (const base of ['actor', 'world', 'plain']) {
  const c = expandCase({ prelude: `// @greenfoot-stub ${base}`, postlude: 'System.out.println("x");' });
  const p = buildProgram(JAVA, c.prelude, '', c.postlude);
  ok(`4.${base} assembles balanced`, braceBalance(p).depth === 0, base);
}
// 'banana' does not match the sentinel, so the case is correctly treated as
// having no sentinel and passes through untouched. What must never happen is
// silently picking a base the author did not ask for.
ok('4.4 an unrecognised base does not silently default to one',
  expandCase({ prelude: '// @greenfoot-stub banana', postlude: 'x();' }).prelude
    === '// @greenfoot-stub banana');

section('5. The stub covers the taught surface');
for (const sym of ['class Greenfoot', 'class Actor', 'class World',
  'getRandomNumber', 'isKeyDown', 'setLocation', 'isAtEdge', 'getOneIntersectingObject',
  'removeTouching', 'addObject', 'removeObject', 'getObjectsAt', 'numberOfObjects']) {
  ok(`5.x stub declares ${sym}`, STUB_JAVA.includes(sym), sym);
}
// Determinism depends on the LCG, not on java.util.Random, whose sequence is
// not guaranteed identical across Java implementations.
ok('5.y getRandomNumber does not instantiate java.util.Random',
  !/new\s+java\.util\.Random/.test(STUB_JAVA));

// ── 6. It actually compiles and runs ─────────────────────────────────────────
//  Skipped rather than failed when no JDK is present, so the suite still runs
//  on a machine without one. CI has a JDK.
section('6. javac accepts it and the program produces the expected output');
let javacOk = true;
try { execFileSync('javac', ['-version'], { stdio: 'ignore' }); }
catch (e) { javacOk = false; }

if (!javacOk) {
  console.log('  skip  no JDK on this machine, compile checks not run');
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gfstub-'));
  // JAVA_TOOL_OPTIONS is cleared because the JVM echoes it to stderr on every
  // invocation, and it is long enough to bury a real compile error in the
  // failure detail. It carries proxy and truststore settings this offline
  // compile does not need.
  const env = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });
  const run = (src) => {
    fs.writeFileSync(path.join(dir, 'Main.java'), src);
    execFileSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, stdio: 'pipe', env });
    return execFileSync('java', ['-cp', '.', 'Main'], { cwd: dir, stdio: 'pipe', env }).toString().trim();
  };

  // 6.1 The actor case from section 3, end to end.
  try {
    ok('6.1 an Actor exercise compiles and runs', run(program) === '1,5', run(program));
  } catch (e) {
    ok('6.1 an Actor exercise compiles and runs', false, String(e.stderr || e.message).slice(0, 600));
  }

  // 6.2 Determinism. Same seed, same sequence, every time. This is the property
  // that stops a correct student answer failing at random.
  const randCase = expandCase({
    prelude: '// @greenfoot-stub plain',
    postlude: [
      'Greenfoot.__seed(42L);',
      'StringBuilder sb = new StringBuilder();',
      'for (int i = 0; i < 5; i++) sb.append(Greenfoot.getRandomNumber(10)).append(",");',
      'System.out.println(sb.toString());',
    ].join('\n'),
  });
  try {
    const a = run(buildProgram(JAVA, randCase.prelude, '', randCase.postlude));
    const b = run(buildProgram(JAVA, randCase.prelude, '', randCase.postlude));
    ok('6.2 getRandomNumber is deterministic across runs', a === b, { a, b });
    ok('6.3 and stays inside its exclusive upper bound',
      a.split(',').filter(Boolean).every((n) => Number(n) >= 0 && Number(n) < 10), a);
  } catch (e) {
    ok('6.2 getRandomNumber is deterministic across runs', false, String(e.stderr || e.message).slice(0, 600));
  }

  // 6.4 Scripted keyboard input, the Unit 2 grading shape.
  const keyCase = expandCase({
    prelude: '// @greenfoot-stub actor',
    postlude: [
      'Greenfoot.__keys("left");',
      'World w = new World(10, 10, 32);',
      'Harness h = new Harness();',
      'w.addObject(h, 5, 5);',
      'h.act();',
      'System.out.println(h.getX());',
    ].join('\n'),
  });
  const keySegment = [
    'public void act() {',
    '  if (Greenfoot.isKeyDown("left")) { setLocation(getX() - 1, getY()); }',
    '  if (Greenfoot.isKeyDown("right")) { setLocation(getX() + 1, getY()); }',
    '}',
  ].join('\n');
  try {
    ok('6.4 scripted key input drives the student act()',
      run(buildProgram(JAVA, keyCase.prelude, keySegment, keyCase.postlude)) === '4');
  } catch (e) {
    ok('6.4 scripted key input drives the student act()', false, String(e.stderr || e.message).slice(0, 600));
  }

  // 6.5 The not-in-world guard, which is a real Greenfoot behavior and one of
  // the error-reference pages.
  const orphanCase = expandCase({
    prelude: '// @greenfoot-stub plain',
    postlude: [
      'Actor a = new Actor();',
      'try { a.getX(); System.out.println("NO ERROR"); }',
      'catch (RuntimeException e) { System.out.println("threw"); }',
    ].join('\n'),
  });
  try {
    ok('6.5 an actor not in a world throws rather than returning 0',
      run(buildProgram(JAVA, orphanCase.prelude, '', orphanCase.postlude)) === 'threw');
  } catch (e) {
    ok('6.5 an actor not in a world throws rather than returning 0', false, String(e.stderr || e.message).slice(0, 600));
  }

  // 6.6 The Unit 6 destination: a 2D array tile map rendered into a world.
  const gridCase = expandCase({
    prelude: '// @greenfoot-stub world',
    postlude: [
      'int[][] map = { {0,1,0}, {1,1,0}, {0,0,1} };',
      'Harness w = new Harness();',
      'System.out.println(w.countWalls(map));',
    ].join('\n'),
  });
  const gridSegment = [
    'public int countWalls(int[][] map) {',
    '  int n = 0;',
    '  for (int r = 0; r < map.length; r++) {',
    '    for (int c = 0; c < map[r].length; c++) {',
    '      if (map[r][c] == 1) { n++; }',
    '    }',
    '  }',
    '  return n;',
    '}',
  ].join('\n');
  try {
    ok('6.6 a World harness grades a 2D array traversal',
      run(buildProgram(JAVA, gridCase.prelude, gridSegment, gridCase.postlude)) === '4');
  } catch (e) {
    ok('6.6 a World harness grades a 2D array traversal', false, String(e.stderr || e.message).slice(0, 600));
  }

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
