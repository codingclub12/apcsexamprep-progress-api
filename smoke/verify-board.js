'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: verify-board. Phase 0.3 as a button.
//
//  OFFLINE. Stands up a fake digest endpoint AND fake storefront pages on one
//  throwaway server, points the real script at it, and reads what it prints. No
//  production, no network beyond loopback.
//
//  The properties that matter, in order:
//    1. It NEVER writes. Any request that is not a GET to the digest or a page
//       fetch is recorded and fails the suite.
//    2. A task whose artifact is a note, not a URL, is reported as not
//       machine-checkable rather than as a failure. Chasing an invoice leaves no
//       trace a script can read.
//    3. What it does not check is REPORTED. A truncated sweep that reads as
//       complete is the exact failure this system exists to prevent.
//    4. It reports signals, never verdicts, and says so.
//
//  Run: npm run smoke:verifyboard
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let pass = 0; let fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else {
    fail++; failures.push(name);
    console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  }
}
function section(t) { console.log('\n' + t); }

const SCRIPT = path.join(__dirname, '..', 'scripts', 'verify-board.js');
const KEY = 'test-board-key-0123456789-abcdef';

// Every request the script makes, so the read-only claim is checked rather than
// asserted.
const seen = [];

const meta100 = `<meta name="description" content="${'d'.repeat(100)}">`;
const PAGES = {
  // The task-70 shape: stale event copy still shipping in body text.
  '/pages/stale': `<!DOCTYPE html><html><head><title>Stale</title>${meta100}</head><body>`
    + '<h1>Bootcamp</h1><p>Doors open 2026-03-25, see you there.</p></body></html>',
  // Clean.
  '/pages/clean': `<!DOCTYPE html><html><head><title>Clean</title>${meta100}</head><body>`
    + '<h1>All Good</h1><p>Nothing wrong here.</p></body></html>',
  // Gone.
  '/pages/gone': null,
};

const DIGEST = {
  as_of: '2026-08-16T12:00:00Z',
  task_count: 4,
  needs_verification: [
    { id: 70, title: 'Remove the stale bootcamp banner', artifact_url: null },
    { id: 71, title: 'Fix the join page', artifact_url: 'PLACEHOLDER_STALE' },
    { id: 72, title: 'Ship the pricing tweak', artifact_url: 'PLACEHOLDER_CLEAN' },
    { id: 73, title: 'Chase the district PO', artifact_url: 'emailed the district on the 12th' },
    { id: 74, title: 'Retire the old landing page', artifact_url: 'PLACEHOLDER_GONE' },
  ],
};

const server = http.createServer((req, res) => {
  seen.push({ method: req.method, url: req.url, auth: req.headers.authorization || '' });
  if (req.url.startsWith('/api/command/digest')) {
    if (req.headers.authorization !== `Bearer ${KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end('{"error":"Authentication required."}');
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(DIGEST));
  }
  const page = Object.prototype.hasOwnProperty.call(PAGES, req.url) ? PAGES[req.url] : undefined;
  if (page === undefined) { res.writeHead(404); return res.end('not found'); }
  if (page === null) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<h1>Gone</h1>'); }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  return res.end(page);
});
server.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

for (const t of DIGEST.needs_verification) {
  if (t.artifact_url === 'PLACEHOLDER_STALE') t.artifact_url = `${BASE}/pages/stale`;
  if (t.artifact_url === 'PLACEHOLDER_CLEAN') t.artifact_url = `${BASE}/pages/clean`;
  if (t.artifact_url === 'PLACEHOLDER_GONE') t.artifact_url = `${BASE}/pages/gone`;
}

function run(extraEnv, args) {
  return new Promise((resolve) => {
    const child = spawn('node', [SCRIPT, ...args], {
      env: {
        ...process.env, APCS_BASE: BASE, TODO_KEY: KEY, VERIFY_PAUSE_MS: '0', NO_COLOR: '1', ...extraEnv,
      },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

(async () => {
  section('1. It reads the board and reports what it found');
  const r = await run({}, []);
  ok('1.1 it exits cleanly', r.code === 0, r.out.slice(0, 300));
  ok('1.2 it says nothing was written', /Nothing was written/.test(r.out));
  ok('1.3 it says the verify bit is not its to set', /cookie-auth only/.test(r.out));
  ok('1.4 it counts the board', /In needs_verification: \*\*5\*\*/.test(r.out), r.out.slice(0, 400));

  section('2. Real signals surface, clean pages stay quiet');
  ok('2.1 the stale page is flagged with its date', /#71/.test(r.out) && /2026-03-25/.test(r.out), r.out);
  ok('2.2 it is labelled a body-copy finding', /BODY COPY/.test(r.out));
  ok('2.3 the clean page reports nothing flagged', /Nothing flagged/.test(r.out) && /#72/.test(r.out));
  ok('2.4 a 404 artifact is a P0', /#74/.test(r.out) && /status 404/.test(r.out));

  section('3. Unverifiable is reported as unverifiable, not as failure');
  ok('3.1 a note artifact is called not machine-checkable',
    /Not machine-checkable/.test(r.out) && /#73/.test(r.out) && /not a URL/.test(r.out));
  ok('3.2 a task with no artifact is listed too',
    /#70/.test(r.out) && /no artifact recorded/.test(r.out));
  ok('3.3 neither makes the run fail', r.code === 0);

  section('4. It never claims more certainty than a static fetch allows');
  ok('4.1 it says a static fetch cannot run JavaScript', /cannot run JavaScript/.test(r.out));
  ok('4.2 it calls a quiet result evidence, not a verdict', /evidence, not a verdict/.test(r.out));

  section('5. What it skips is reported, never silently dropped');
  const capped = await run({}, ['--limit', '1']);
  ok('5.1 the cap is honoured', /checked: \*\*1\*\*/.test(capped.out), capped.out.slice(0, 400));
  ok('5.2 and what it skipped is listed', /Not checked this run/.test(capped.out));
  ok('5.3 with the reason and the way to widen it',
    /rate-limits/.test(capped.out) && /--limit/.test(capped.out));

  const one = await run({}, ['--task', '72']);
  ok('5.4 a single task can be checked on its own',
    one.code === 0 && /checked: \*\*1\*\*/.test(one.out) && /#72/.test(one.out), one.out.slice(0, 300));

  section('6. It is read-only, and that is checked rather than claimed');
  const writes = seen.filter((s) => s.method !== 'GET');
  ok('6.1 not one non-GET request was made', writes.length === 0, writes);
  const touchedTodo = seen.filter((s) => /\/api\/todo/.test(s.url));
  ok('6.2 it never touched the write routes', touchedTodo.length === 0, touchedTodo);
  ok('6.3 it never asked to set verified', !seen.some((s) => /verify/.test(s.url)), seen.map((s) => s.url));

  section('7. Failures are loud and name the fix');
  const noKey = await run({ TODO_KEY: '' }, []);
  ok('7.1 a missing credential exits non-zero', noKey.code !== 0, noKey.out.slice(0, 200));
  ok('7.2 and says it must match the API', /must match the value the API runs with/.test(noKey.out));
  const badKey = await run({ TODO_KEY: 'wrong-key-entirely' }, []);
  ok('7.3 a rejected credential exits non-zero and says 401',
    badKey.code !== 0 && /401/.test(badKey.out), badKey.out.slice(0, 200));
  ok('7.4 and never echoes the credential it tried', !badKey.out.includes('wrong-key-entirely'));

  section('8. JSON mode, for whatever reads this next');
  const j = await run({}, ['--json']);
  let parsed = null;
  try { parsed = JSON.parse(j.out); } catch (_) { /* handled below */ }
  ok('8.1 --json emits parseable JSON', !!parsed, j.out.slice(0, 200));
  ok('8.2 with the counts and the findings',
    !!parsed && parsed.needs_verification_total === 5 && Array.isArray(parsed.findings));
  ok('8.3 and it records what it could not check',
    !!parsed && parsed.not_machine_checkable.length === 2);

  console.log(`\n${'-'.repeat(70)}`);
  console.log(`verify-board: ${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailed:');
    for (const f of failures) console.log('  - ' + f);
  }
  server.close();
  process.exit(fail ? 1 : 0);
})();
