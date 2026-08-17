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
      env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT, TODO_KEY: '', ...env },
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

  console.log(`\n${'-'.repeat(70)}`);
  console.log(`session-hook: ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFailed:'); for (const f of failures) console.log('  - ' + f); }
  process.exit(fail ? 1 : 0);
})();
