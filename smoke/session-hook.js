'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the SessionStart hook.
//
//  OFFLINE. Runs the real hook script against a loopback digest, plus static
//  checks on the settings that register it.
//
//  THE PROPERTY THAT MATTERS
//    The hook exists to make "open with the digest" TRUE rather than merely
//    asked for. Its worst failure is therefore not crashing - it is injecting
//    NOTHING while the session proceeds as though state had been checked. That
//    is the same defect this repo has shipped five ways already, and here it
//    would be invisible: the session just starts, looking normal.
//
//    So every failure path must (a) still exit 0, because a dead board must not
//    stop someone working offline, and (b) say loudly, in context, exactly what
//    the session does NOT know.
//
//  Run: npm run smoke:sessionhook
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HOOK = path.join(ROOT, '.claude', 'hooks', 'session-start.sh');
const SETTINGS = path.join(ROOT, '.claude', 'settings.json');

let pass = 0; let fail = 0;
const failures = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); } else {
    fail++; failures.push(name);
    console.log(`  [FAIL] ${name}${extra !== undefined ? '  ' + JSON.stringify(extra) : ''}`);
  }
};
const section = (t) => console.log('\n' + t);

// Async spawn, never execFileSync: the server below lives in THIS process, and
// a sync child would block the event loop it needs to answer. That deadlock has
// already cost this repo two debugging rounds.
function run(env) {
  return new Promise((res) => {
    const c = spawn('bash', [HOOK], {
      cwd: ROOT,
      env: {
        ...process.env, CLAUDE_PROJECT_DIR: ROOT, TODO_KEY: '', COMMAND_READ_TOKEN: '', ...env,
      },
    });
    let out = '';
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { out += d; });
    c.on('close', (code) => res({ code, out }));
  });
}
const serve = (handler) => new Promise((res) => {
  const s = http.createServer(handler);
  s.listen(0, '127.0.0.1', () => res({
    base: `http://127.0.0.1:${s.address().port}`, close: () => s.close(),
  }));
});

const DIGEST = {
  as_of: '2026-08-17T02:40:00Z',
  task_count: 14,
  needs_verification: [{ id: 71, title: 'a task', artifact_url: 'https://x/a' }],
  in_flight: [{ id: 70, claim_id: 9, agent: 'other', locks: ['theme:assets/x.js'] }],
};

(async () => {
  console.log('\nSESSION START HOOK\n');

  section('1. It is registered, and registered at the path it lives');
  ok('1.1 the hook script exists', fs.existsSync(HOOK));
  ok('1.2 and is executable', (fs.statSync(HOOK).mode & 0o111) !== 0);
  const cfg = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  const cmds = (cfg.hooks?.SessionStart || []).flatMap((g) => g.hooks || []).map((h) => h.command);
  ok('1.3 settings.json registers a SessionStart hook', cmds.length === 1, cmds);
  // A registration pointing at a path that does not exist would fail silently
  // on every future session, which is the whole failure mode this guards.
  ok('1.4 pointing at the script that actually exists',
    cmds[0] === '$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh', cmds[0]);

  section('2. No credential: says so, does not block');
  const a = await run({ TODO_KEY: '' });
  ok('2.1 it exits 0, so a session still starts', a.code === 0, a.code);
  ok('2.2 it says there is NO live state', /NO LIVE STATE/.test(a.out), a.out.slice(0, 200));
  ok('2.3 it warns against assuming the board is empty',
    /Do not assume the board is empty/.test(a.out));
  ok('2.4 and it names the specific risk: someone else holds the lock',
    /may hold a lock/.test(a.out));
  ok('2.5 it does NOT print an empty digest that reads as "nothing to do"',
    !/COMMAND CENTER DIGEST/.test(a.out));

  section('3. Board unreachable: says so, does not block');
  const b = await run({ TODO_KEY: 'k', APCS_BASE: 'http://127.0.0.1:1' });
  ok('3.1 it exits 0', b.code === 0, b.code);
  ok('3.2 it says the digest was unreachable', /DIGEST UNREACHABLE/.test(b.out));
  ok('3.3 and tells the session to say so rather than pretend',
    /rather than working as though you had checked/.test(b.out));

  section('4. A 200 is not proof of a digest');
  const bad = await serve((q, r) => {
    r.writeHead(200, { 'Content-Type': 'text/html' });
    r.end('<html><body>502 Bad Gateway</body></html>');
  });
  const c = await run({ TODO_KEY: 'k', APCS_BASE: bad.base });
  bad.close();
  ok('4.1 an HTML error page is not accepted as state',
    /UNEXPECTED SHAPE/.test(c.out), c.out.slice(0, 200));
  ok('4.2 it still exits 0', c.code === 0, c.code);
  ok('4.3 and does not print it as a digest', !/COMMAND CENTER DIGEST/.test(c.out));

  section('5. A real digest reaches the session');
  const good = await serve((q, r) => {
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify(DIGEST));
  });
  const d = await run({ TODO_KEY: 'k', APCS_BASE: good.base });
  good.close();
  ok('5.1 the digest is printed into context', /COMMAND CENTER DIGEST/.test(d.out), d.out.slice(0, 200));
  ok('5.2 with the actual board contents', /"task_count":14/.test(d.out));
  ok('5.3 including who is holding which lock',
    /theme:assets\/x\.js/.test(d.out));
  ok('5.4 it says the state DECAYS rather than implying it stays true',
    /decays/.test(d.out) && /re-run/.test(d.out));
  ok('5.5 and restates the rules that the digest alone does not enforce',
    /claim before you touch a file/.test(d.out) && /not yours to set/.test(d.out));

  section('6. It carries the credential and does not echo it');
  let seenAuth = null;
  const spy = await serve((q, r) => {
    seenAuth = q.headers.authorization || '';
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify(DIGEST));
  });
  const e = await run({ TODO_KEY: 'super-secret-key-value', APCS_BASE: spy.base });
  spy.close();
  ok('6.1 it authorises as a bearer token', seenAuth === 'Bearer super-secret-key-value', seenAuth);
  ok('6.2 and never prints the key into context',
    !e.out.includes('super-secret-key-value'), 'KEY LEAKED INTO SESSION CONTEXT');

  section('7. The read token is preferred, and never printed');
  //  Environment configuration is not a secrets store, and a session can echo a
  //  variable into its own transcript at any time - which already happened once
  //  with TODO_KEY. So the credential left in readable config should be the one
  //  that cannot write. The read token travels IN THE URL rather than a header,
  //  which makes every path that prints a URL a place it can leak.
  const TOK = 'read-token-abcdefghijklmnop';

  let sawPath = null;
  const rt = await serve((q, r) => {
    sawPath = q.url;
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify(DIGEST));
  });
  const g = await run({ COMMAND_READ_TOKEN: TOK, TODO_KEY: 'full-write-key-value', APCS_BASE: rt.base });
  rt.close();
  ok('7.1 with both set, the READ TOKEN is used', sawPath === `/api/command/digest/r/${TOK}`, sawPath);
  ok('7.2 and the report says which credential it used', /read-only, PII-stripped/.test(g.out), g.out.slice(0, 300));
  ok('7.3 the token is not printed on success', !g.out.includes(TOK), 'TOKEN LEAKED');
  ok('7.4 nor is the write key it did not use', !g.out.includes('full-write-key-value'));

  //  The failure path prints the URL it tried, and the token lives in that URL.
  //  This is where the fix would swap one leak for a fresher one.
  const h = await run({ COMMAND_READ_TOKEN: TOK, APCS_BASE: 'http://127.0.0.1:1' });
  ok('7.5 an unreachable board still reports the failure', /DIGEST UNREACHABLE/.test(h.out));
  ok('7.6 and the token is REDACTED from the URL it names',
    !h.out.includes(TOK) && /<token redacted>/.test(h.out), h.out.slice(0, 400));

  //  A server that echoes the request URL back in an error body is a second
  //  route to the same leak, so the response is scrubbed as well.
  const echoer = await serve((q, r) => {
    r.writeHead(500, { 'Content-Type': 'text/plain' });
    r.end(`upstream error for http://x${q.url}`);
  });
  const i2 = await run({ COMMAND_READ_TOKEN: TOK, APCS_BASE: echoer.base });
  echoer.close();
  ok('7.7 a server echoing the URL back cannot leak it either',
    !i2.out.includes(TOK), i2.out.slice(0, 400));

  //  Falling back matters: someone who has only ever set TODO_KEY must not
  //  silently lose board state because a better option now exists.
  let sawAuth = null;
  const bearer = await serve((q, r) => {
    sawAuth = q.headers.authorization || '';
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify(DIGEST));
  });
  const j2 = await run({ TODO_KEY: 'fallback-key-value-here', APCS_BASE: bearer.base });
  bearer.close();
  ok('7.8 with no read token it falls back to the bearer', sawAuth === 'Bearer fallback-key-value-here', sawAuth);
  ok('7.9 and says so, so the operator knows which one is exposed',
    /full read\/write/.test(j2.out), j2.out.slice(0, 300));

  const k2 = await run({});
  ok('7.10 with neither, it names the read token as the one to set',
    /COMMAND_READ_TOKEN/.test(k2.out) && /NO LIVE STATE/.test(k2.out), k2.out.slice(0, 300));

  console.log(`\n${'-'.repeat(70)}`);
  console.log(`session-hook: ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFailed:'); for (const f of failures) console.log('  - ' + f); }
  process.exit(fail ? 1 : 0);
})();
