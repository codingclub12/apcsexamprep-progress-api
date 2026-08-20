'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE INTRO TO JAVA RUN ROUTE - offline checks against the real app.
//
//  This boots server.js on an ephemeral port and makes real HTTP requests. It
//  does NOT reach Judge0: RAPIDAPI_KEY is deliberately left unset, so the proxy
//  answers 503 and this suite checks everything on THIS side of that call.
//  What is on this side is the part that can be wrong in a way students feel:
//  validation, the rate limiter, and above all the assembly.
//
//  ── THE CHECK THAT MATTERS ──────────────────────────────────────────────────
//  Run and Submit must assemble a student's code the same way. If they ever
//  drift, a student's own code passes one button and fails the other, which is
//  the worst bug this system could have. So section 4 assembles both and
//  compiles them with a real javac, rather than trusting that two call sites
//  which LOOK the same behave the same.
//
//  Zero PII: synthetic source only, and none of it is stored anywhere.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:ijrun
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Judge0 must be unreachable, and it must be unreachable for a reason we chose
// rather than by accident. Cleared before server.js is required.
delete process.env.RAPIDAPI_KEY;
process.env.PORT = '0';

const { BY_LESSON, EXERCISES } = require('../seed/intro-java-exercises');
const { traceCase, expandCase } = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const JAVA = 62;
const PATROL = 'public void act()\n{\n    move(2);\n    if (isAtEdge())\n    {\n        turn(180);\n    }\n}';

async function main() {
  const app = require('../server');
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const post = async (body, headers) => {
    const r = await fetch(`${base}/api/intro-java/trace`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  // ── 1. The route is mounted and rejects what it should ─────────────────────
  section('1. Validation happens before anything is spent');

  const noLesson = await post({ source: PATROL });
  ok('1.1 a request with no lesson is 404, not a crash', noLesson.status === 404, noLesson);

  const badLesson = await post({ lesson: '9.9', source: PATROL });
  ok('1.2 a lesson with no exercise is 404', badLesson.status === 404, badLesson);

  const noSource = await post({ lesson: '1.6', source: '   ' });
  ok('1.3 an empty source is 400', noSource.status === 400, noSource);

  const huge = await post({ lesson: '1.6', source: 'x'.repeat(20_001) });
  ok('1.4 a paste bomb is 413 and never reaches the runner', huge.status === 413, huge);

  // An exercise with no scene has nothing to animate. 2.2 prints numbers.
  const noScene = await post({ lesson: '2.2', source: 'public void report(int s) { }' });
  ok('1.5 an exercise with no animation is 400 with a sentence, not a blank canvas',
    noScene.status === 400 && /Submit/.test(noScene.body.error || ''), noScene);

  // ── 1b. The player is served, and served once ──────────────────────────────
  section('1b. The trace player is served from the API, not inlined ten times');

  const player = await fetch(`${base}/api/intro-java/player.js`);
  const playerText = await player.text();
  ok('1b.1 it is served', player.status === 200, player.status);
  ok('1b.2 as javascript', /javascript/.test(player.headers.get('content-type') || ''),
    player.headers.get('content-type'));
  ok('1b.3 cached hard, since it only changes on a deploy',
    /max-age=\d{4,}/.test(player.headers.get('cache-control') || ''),
    player.headers.get('cache-control'));
  ok('1b.4 and it is the real player, byte for byte',
    playerText === fs.readFileSync(path.join(__dirname, '..', 'shopify', 'greenfoot-player.js'), 'utf8'));

  // ── 2. Judge0 being down is reported, not swallowed ────────────────────────
  section('2. A dead runner is reported honestly');

  const dead = await post({ lesson: '1.6', source: PATROL });
  ok('2.1 with no RAPIDAPI_KEY the route reports the proxy status, not a 200',
    dead.status >= 400 && dead.status !== 404, dead);
  ok('2.2 and says something rather than returning an empty body',
    typeof dead.body.error === 'string' && dead.body.error.length > 0, dead.body);
  ok('2.3 the failure never claims a trace', dead.body.trace === undefined, dead.body);

  // ── 3. The rate limiter is real ────────────────────────────────────────────
  //  12 per minute per identity. The proxy's hourly ceiling is the first guard;
  //  this is the second, and it is the one that stops a held-down key.
  section('3. The per-identity limiter stops a held-down Run button');

  let sawLimit = false;
  let before429 = 0;
  for (let i = 0; i < 20; i++) {
    const r = await post({ lesson: '1.6', source: PATROL }, { 'X-Forwarded-For': 'smoke-limit-test' });
    if (r.status === 429) { sawLimit = true; break; }
    before429++;
  }
  ok('3.1 sustained pressing eventually returns 429', sawLimit, { before429 });
  ok('3.2 and it allows a reasonable number of presses first', before429 >= 10, before429);

  server.close();

  // ── 4. Run and Submit assemble the same way ────────────────────────────────
  section('4. Run and Submit agree, proved with a real javac');

  let javacOk = true;
  try { execFileSync('javac', ['-version'], { stdio: 'ignore' }); }
  catch (e) { javacOk = false; }

  if (!javacOk) {
    console.log('  skip  no JDK on this machine, compile checks not run');
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ijrun-'));
    const env = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });
    const compiles = (src) => {
      fs.writeFileSync(path.join(dir, 'Main.java'), src);
      try {
        execFileSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, stdio: 'pipe', env });
        return null;
      } catch (e) {
        return String(e.stderr || e.message).slice(0, 400);
      }
    };

    const problems = [];
    for (const ex of EXERCISES) {
      // Submit path, exactly as routes/student.js builds it.
      const graded = codeModes.assemble('segment', JAVA, ex.reference, expandCase({
        prelude: `// @greenfoot-stub ${ex.base}\n${ex.helpers || ''}`,
        postlude: `    ${ex.cases[0].setup}`,
      }));
      const g = compiles(graded);
      if (g) problems.push(`${ex.lesson} graded: ${g}`);

      if (!ex.scene) continue;
      // Run path, exactly as routes/intro-java.js builds it.
      const run = codeModes.assemble('segment', JAVA, ex.reference, traceCase(
        Object.assign({}, ex.scene, {
          helpers: ex.helpers || '',
          base: ex.base,
        })));
      const r = compiles(run);
      if (r) problems.push(`${ex.lesson} run: ${r}`);

      // The two programs must share a prefix: the stub, the helpers and the
      // harness opening. They differ only in the postlude, which is the point.
      const cut = (s) => s.slice(0, s.indexOf('class Harness'));
      if (cut(graded) !== cut(run)) {
        problems.push(`${ex.lesson}: Run and Submit build DIFFERENT stubs`);
      }
    }
    ok('4.1 every exercise compiles on both the Run and the Submit path, and they share one stub',
      problems.length === 0, problems.slice(0, 4));

    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ── 5. The route stores nothing ────────────────────────────────────────────
  section('5. Nothing on this path can reach the database');

  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'intro-java.js'), 'utf8');
  ok('5.1 the route does not require the database at all', !/require\(['"]\.\.\/db['"]\)/.test(src));
  // Statement SHAPES, not bare keywords: the first version of this matched
  // `buckets.delete(k)` in the rate limiter's map cleanup and reported the route
  // as running SQL. 5.1 is the definitive check anyway; this one guards against
  // a raw query built through some other handle.
  ok('5.2 it runs no SQL',
    !/(SELECT\s+[\s\S]*\sFROM\s|INSERT\s+INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s)/i.test(src));
  ok('5.3 it never logs the student source',
    !/console\.(log|error)\([^)]*source/.test(src));
  ok('5.4 it calls the judge0 proxy rather than Judge0 itself',
    /\/api\/judge0\/run/.test(src) && !/rapidapi/i.test(src));
  ok('5.5 routes/judge0.js is untouched by this feature',
    !fs.readFileSync(path.join(__dirname, '..', 'routes', 'judge0.js'), 'utf8').includes('intro-java'));
  ok('5.6 no em-dashes', !/—/.test(src));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('\nsuite crashed:', e && e.stack);
  process.exit(1);
});
