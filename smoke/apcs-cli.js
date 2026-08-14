'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the apcs CLI, driven end to end against the REAL routers.
//
//  This suite exists because the CLI shipped with no tests and a bug that a
//  single test would have caught: `heartbeat` and `release` passed a TASK id to
//  routes that take a CLAIM id. Best case that 404s. Worst case a claim carrying
//  that number belongs to a different task, and the wrong lock is released with
//  a 200 and no error. Section 2 reproduces exactly that arrangement.
//
//  OFFLINE: throwaway database in a temp file, real routers on a throwaway
//  express app, real HTTP on an ephemeral port, and the real CLI process spawned
//  against it with APCS_BASE pointed at that port. No production data, no
//  network. Same shape as smoke/command-center.js.
//
//  Run: npm run smoke:apcs
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const DB = path.join(__dirname, 'smoke-apcs-cli.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (_) {} }

process.env.DB_PATH = DB;
process.env.TODO_KEY = 'test-apcs-key-0123456789-abcdefgh';
process.env.ADMIN_KEY = 'test-apcs-admin-0123456789-abcd';
process.env.TODO_KEY_SCOPE = '';

const express = require('express');
const store = require('../lib/command-store');

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

const app = express();
app.use(express.json({ limit: '1mb' }));
// A fixture storefront page, served from the same throwaway app so `apcs
// evidence` can be driven end to end with no network. It carries the two shapes
// the verifier exists for: a phrase that only lives in an HTML comment, and a
// stale date in real body copy.
app.get('/fixture/page', (req, res) => {
  res.type('html').send('<!DOCTYPE html><html><head><title>Fixture</title>'
    + '<meta name="description" content="' + 'd'.repeat(100) + '"></head><body>'
    + '<!-- Paste this code in Shopify Admin: Online Store > Themes -->'
    + '<h1>Fixture Page</h1><p>Doors open 2026-03-27, see you there.</p>'
    + '</body></html>');
});

app.use('/api/command', require('../routes/command'));
app.use('/api/todo', require('../routes/todo'));
const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const CLI = path.join(__dirname, '..', 'scripts', 'apcs.js');

// Runs the CLI exactly as an operator would, as a separate process.
//
// spawn, never spawnSync: the express server under test lives in THIS process,
// and spawnSync blocks the event loop, so the parent could never answer the
// child's requests and the suite would deadlock rather than fail.
function apcsEnv(extra, args) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI, ...args], {
      env: {
        ...process.env,
        APCS_BASE: BASE,
        APCS_TOKEN: process.env.TODO_KEY,
        // Force the no-colour branch so assertions match plain text.
        NO_COLOR: '1',
        ...extra,
      },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}
const apcs = (...args) => apcsEnv({}, args);

async function call(method, urlPath, body) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TODO_KEY}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
  return { status: res.status, body: parsed };
}

const liveFor = (taskId) => store.liveClaims().filter((c) => c.task_id === taskId && !c.released_at);

(async () => {
  // ── 1. The basics work at all ──────────────────────────────────────────────
  section('1. The CLI can reach the ledger');

  for (let i = 1; i <= 4; i++) {
    await call('POST', '/api/todo', {
      title: `Smoke task ${i}`, bucket: 'now', surface: 'api', size: 's', owner: 'agent',
    });
  }

  const digest = await apcs('digest');
  ok('1.1 digest renders the live board', digest.code === 0 && /Smoke task/.test(digest.out), digest.out.slice(0, 200));

  const show = await apcs('show', '1');
  ok('1.2 show renders one task with its routing',
    show.code === 0 && /Smoke task 1/.test(show.out) && /routed ->/.test(show.out), show.out.slice(0, 200));

  const prompt = await apcs('prompt', '1');
  ok('1.3 prompt returns the compiled prompt with hazards',
    prompt.code === 0 && /Additive migrations only/.test(prompt.out), prompt.out.slice(0, 160));
  ok('1.4 the compiled prompt never contains the token',
    !prompt.out.includes(process.env.TODO_KEY));

  // ── 2. Task ids and claim ids are different numbers ─────────────────────────
  //  Claims are taken in reverse task order so the two numbering schemes are
  //  guaranteed to disagree, which is the normal state of a board in use.
  section('2. A task id is never mistaken for a claim id');

  const claimOf = {};
  for (const t of [4, 3, 2]) {
    const r = await call('POST', `/api/command/task/${t}/claim`, { surface: 'claude_code' });
    claimOf[t] = r.body.claim_id;
  }
  ok('2.0 the two id spaces genuinely disagree in this fixture',
    claimOf[4] !== 4 && claimOf[2] !== 2, claimOf);

  // Task 2 holds claim #3. Task 4 holds claim #1. The old CLI sent the task id
  // to /claim/:id/release, so "release 4" would have released claim #4 (absent)
  // and "release 2" would have released claim #2, which belongs to task 3.
  const beforeTask3 = liveFor(3).length;
  const rel2 = await apcs('release', '2');
  ok('2.1 release names the claim it actually released',
    rel2.code === 0 && new RegExp(`claim #${claimOf[2]}`).test(rel2.out), rel2.out.trim());
  ok('2.2 task 2 has no live claim left', liveFor(2).length === 0);
  ok('2.3 NO OTHER TASK was touched: task 3 still holds its claim',
    liveFor(3).length === beforeTask3 && beforeTask3 === 1,
    { task3_live: liveFor(3).length, before: beforeTask3 });
  ok('2.4 and task 4 still holds its claim', liveFor(4).length === 1);

  const hb = await apcs('heartbeat', '3');
  ok('2.5 heartbeat resolves the claim and succeeds',
    hb.code === 0 && /alive/.test(hb.out) && new RegExp(`claim #${claimOf[3]}`).test(hb.out), hb.out.trim());

  const hbNone = await apcs('heartbeat', '1');
  ok('2.6 heartbeat on an unclaimed task fails loudly instead of hitting a stranger',
    hbNone.code !== 0 && /no live claim/.test(hbNone.out), hbNone.out.trim());

  const hbExplicit = await apcs('heartbeat', '3', '--claim', String(claimOf[3]));
  ok('2.7 --claim bypasses the lookup', hbExplicit.code === 0 && /alive/.test(hbExplicit.out));

  // ── 3. Locks are expressible, and a conflict is reported ────────────────────
  section('3. The lock protocol is reachable from the CLI');

  const claim1 = await apcs('claim', '1', '--lock', 'theme:assets/apcs-tracker.js', '--label', 'sessionA');
  ok('3.1 claim accepts --lock and echoes it',
    claim1.code === 0 && /assets\/apcs-tracker\.js/.test(claim1.out), claim1.out.trim());
  ok('3.2 claim reports the claim id it received',
    new RegExp(`claim #${liveFor(1)[0].claim_id || liveFor(1)[0].id}`).test(claim1.out), claim1.out.trim());

  const conflict = await apcs('claim', '2', '--lock', 'theme:assets/apcs-tracker.js');
  ok('3.3 a conflicting lock is a reported 409, not a silent success',
    conflict.code === 3 && /lock conflict/.test(conflict.out), conflict.out.trim());
  ok('3.4 the conflict names the holder and the file',
    /held by claude_code "sessionA"/.test(conflict.out)
    && /assets\/apcs-tracker\.js/.test(conflict.out), conflict.out.trim());
  ok('3.5 the conflicting claim was NOT created', liveFor(2).length === 0);

  const forced = await apcs('claim', '2', '--lock', 'theme:assets/apcs-tracker.js', '--force');
  ok('3.6 --force takes the lock and says an audit row names you',
    forced.code === 0 && /forced out/.test(forced.out), forced.out.trim());
  ok('3.7 the previous holder lost its claim', liveFor(1).length === 0);

  const noLock = await apcs('claim', '1');
  ok('3.8 claiming with no lock warns that nothing will 409',
    noLock.code === 0 && /no locks named/.test(noLock.out), noLock.out.trim());

  // ── 4. done returns the claim rather than orphaning it ──────────────────────
  section('4. Closing a claimed task releases its lock');

  const noArtifact = await apcs('done', '1');
  ok('4.1 done without --artifact refuses locally, before any write',
    noArtifact.code !== 0 && /--artifact is required/.test(noArtifact.out), noArtifact.out.trim());
  ok('4.2 and the task is untouched by the refusal',
    (await call('GET', '/api/todo/1')).body.task.status !== 'done');

  const before = liveFor(1).length;
  const done1 = await apcs('done', '1', '--artifact', 'https://github.com/o/r/pull/1');
  ok('4.3 done on a claimed task reports it as returned',
    done1.code === 0 && /returned/.test(done1.out), done1.out.trim());
  ok('4.4 THE CLAIM IS RELEASED, not left to rot into stale',
    before === 1 && liveFor(1).length === 0, { before, after: liveFor(1).length });

  const t1 = (await call('GET', '/api/todo/1')).body.task;
  ok('4.5 the task is done with its artifact recorded',
    t1.status === 'done' && t1.artifact_url === 'https://github.com/o/r/pull/1', t1.artifact_url);
  ok('4.6 and it landed UNVERIFIED, which is the whole point', !t1.verified);

  // A task with no claim still has to be closeable: chat-routed work never
  // holds one, and the router refuses to give chat a lock.
  const done3 = await apcs('done', '3', '--artifact', 'md5 3858f62230ac3c915f300c664312c63f');
  ok('4.7 a task whose claim was already released still closes',
    done3.code === 0 && /done|returned/.test(done3.out), done3.out.trim());
  ok('4.8 non-URL artifacts are accepted as evidence',
    (await call('GET', '/api/todo/3')).body.task.artifact_url.includes('md5'));

  // ── 5. The verify guard is respected from the client side ───────────────────
  section('5. The CLI cannot close the loop on its own report');

  const verify = await apcs('verify', '1');
  ok('5.1 verify refuses and explains why',
    verify.code === 0 && /Cannot verify from the CLI/.test(verify.out)
    && /AGENT_FORBIDDEN_FIELDS/.test(verify.out), verify.out.trim());
  ok('5.2 verify points at the cookie-auth page instead',
    /admin\/command/.test(verify.out));
  ok('5.3 nothing the CLI did set verified on any task',
    [1, 2, 3, 4].every((id) => !store.getTask(id).verified));

  // Belt and braces: the server must refuse it even if a client tried.
  const sneaky = await call('PATCH', '/api/todo/1', { verified: 1 });
  ok('5.4 the server rejects a bearer-auth attempt to set verified',
    sneaky.status === 403 || (sneaky.status === 200 && !store.getTask(1).verified),
    { status: sneaky.status, verified: store.getTask(1).verified });

  // ── 5b. evidence: the ledger reaches reality ───────────────────────────────
  //  This is the path the whole Command Center turns on: a task carries an
  //  artifact, and `apcs evidence` goes and looks at it rather than trusting the
  //  report. It shells out to scripts/verify-artifact.js, so this also proves the
  //  two files are wired together and found on disk.
  section('5b. evidence goes and looks at the artifact');

  await call('POST', '/api/todo', {
    title: 'Fixture page task', bucket: 'now', surface: 'shopify', size: 's',
  });
  const fixtureTask = 5;
  await call('PATCH', `/api/todo/${fixtureTask}`, {
    status: 'done', artifact_url: `${BASE}/fixture/page`,
  });

  const ev = await apcs('evidence', String(fixtureTask));
  ok('5b.1 evidence fetches the artifact and reports a status',
    ev.code === 0 && /200/.test(ev.out), ev.out.trim().slice(0, 200));
  ok('5b.2 it flags the stale date in body copy',
    /in BODY COPY/.test(ev.out), ev.out.trim().slice(0, 300));
  ok('5b.3 it states it is evidence, not a verdict',
    /reports evidence, not a verdict/.test(ev.out));

  const evPhrase = await apcs('evidence', String(fixtureTask), '--phrase', 'Paste this code');
  ok('5b.4 --phrase reaches the verifier and reports the LAYER',
    /shipped in comment only/.test(evPhrase.out), evPhrase.out.trim().slice(0, 300));
  ok('5b.5 and it refuses to claim a reader sees it',
    /invisible to a reader/.test(evPhrase.out));

  await call('POST', '/api/todo', { title: 'Chase the PO', bucket: 'now', size: 's' });
  await call('PATCH', '/api/todo/6', { status: 'done', artifact_url: 'emailed the district on the 12th' });
  const evNote = await apcs('evidence', '6');
  ok('5b.6 a non-URL artifact is reported as not machine-checkable, not as a failure',
    evNote.code === 0 && /not a URL/.test(evNote.out), evNote.out.trim().slice(0, 200));

  const evNone = await apcs('evidence', '4');
  ok('5b.7 a task with no artifact says so rather than inventing one',
    evNone.code !== 0 && /no artifact_url/.test(evNone.out), evNone.out.trim().slice(0, 160));

  // ── 6. Failure modes are legible ───────────────────────────────────────────
  section('6. Failures say what to do next');

  const noCred = await apcsEnv({ APCS_TOKEN: '', HOME: path.join(__dirname, 'no-such-home') }, ['digest']);
  ok('6.1 a missing credential explains where to put one',
    noCred.code !== 0 && /APCS_TOKEN|\.apcsrc/.test(noCred.out), noCred.out.trim().slice(0, 160));

  const badCred = await apcsEnv({ APCS_TOKEN: 'wrong-token-entirely' }, ['digest']);
  ok('6.2 a rejected credential says so rather than printing a stack trace',
    badCred.code !== 0 && /401/.test(badCred.out) && !/at Object\./.test(badCred.out),
    badCred.out.trim().slice(0, 160));
  ok('6.3 and it never echoes the token it tried',
    !badCred.out.includes('wrong-token-entirely'));

  const unknown = await apcs('frobnicate');
  ok('6.4 an unknown command prints help and exits non-zero',
    unknown.code === 64 && /apcs digest/.test(unknown.out));

  const missingId = await apcs('show');
  ok('6.5 a missing argument prints usage', missingId.code !== 0 && /usage: apcs show/.test(missingId.out));

  // ── summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'-'.repeat(70)}`);
  console.log(`apcs cli: ${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailed:');
    for (const f of failures) console.log('  - ' + f);
  }
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (_) {} }
  process.exit(fail ? 1 : 0);
})();
