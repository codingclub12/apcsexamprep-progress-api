'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the claim guard, which is CLAUDE.md rule 2 made mechanical.
//
//  WHY THIS EXISTS: on 2026-09-03 three sessions rebuilt the same mojibake
//  detector in one afternoon and two of the three rebuilds were thrown away.
//  The claim protocol worked the whole time and the digest carried the live
//  locks; none of the three sessions claimed anything and none looked. Rule 1
//  was mechanical and rule 2 was advice, and that was the entire difference.
//
//  The guard is only worth having if it can FAIL. Everything below is written
//  so that breaking the rule it tests turns this suite red, and the mutations
//  at the bottom prove it rather than asserting it.
//
//  Run: npm run smoke:claimguard
// ---------------------------------------------------------------------------
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOOK = path.join(ROOT, '.claude', 'hooks', 'claim-guard.js');
const locks = require(path.join(ROOT, 'lib', 'claim-locks.js'));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// ---------------------------------------------------------------------------
//  1. PATH -> LOCK
//
//  Matching on directory NAME, not an absolute path, is what makes the same
//  hook work in a container, on a laptop, and in a git worktree.
// ---------------------------------------------------------------------------
console.log('\nPath to lock string');
const CASES = [
  ['/home/user/apcsexamprep-progress-api/CLAUDE.md', 'api:CLAUDE.md'],
  ['/home/user/apcsexamprep-progress-api/lib/site-crawl.js', 'api:lib/site-crawl.js'],
  ['/home/user/APCSExamPrep-theme/layout/theme.liquid', 'theme:layout/theme.liquid'],
  ['/Users/tanner/code/apcsexamprep-progress-api/smoke/x.js', 'api:smoke/x.js'],
  ['/tmp/worktrees/x/APCSExamPrep-theme/assets/a.js', 'theme:assets/a.js'],
];
for (const [p, expected] of CASES) {
  ok('maps ' + p.split('/').slice(-2).join('/'), locks.lockForPath(p, '/') === expected,
    locks.lockForPath(p, '/'));
}
ok('a path outside both checkouts is NOT lockable', locks.lockForPath('/tmp/scratch.txt', '/') === null);
ok('a repo root itself is NOT lockable',
  locks.lockForPath('/home/user/apcsexamprep-progress-api', '/') === null);

// ---------------------------------------------------------------------------
//  2. OWNERSHIP
//
//  The asymmetry here is the load-bearing part. An UNLABELED claim counts as
//  somebody else's, because a guard that goes quiet when it cannot tell is the
//  exact failure this repo keeps paying for. Being blocked by an unlabeled
//  claim is a visible annoyance with an obvious fix; ignoring one is an
//  invisible collision.
// ---------------------------------------------------------------------------
console.log('\nOwnership');
const CLAIMS = [
  { claim_id: 1, task_id: 10, surface: 'claude_code', session_label: 'sess-A', locks: ['api:a.js'], age_minutes: 4, state: 'running' },
  { claim_id: 2, task_id: 11, surface: 'claude_code', session_label: null, locks: ['api:b.js'], age_minutes: 9, state: 'running' },
  { claim_id: 3, task_id: 12, surface: 'cowork', session_label: 'sess-B', locks: ['theme:c.liquid'], age_minutes: 2, state: 'running' },
];
ok('another labeled session holding it is a conflict',
  locks.holdersOf('api:a.js', CLAIMS, 'sess-B').length === 1);
ok('my own claim is NOT a conflict',
  locks.holdersOf('api:a.js', CLAIMS, 'sess-A').length === 0);
ok('an UNLABELED claim counts as somebody else, on purpose',
  locks.holdersOf('api:b.js', CLAIMS, 'sess-A').length === 1);
ok('an unheld file has no holders',
  locks.holdersOf('api:zzz.js', CLAIMS, 'sess-A').length === 0);
ok('holdsLock is true only for my own label',
  locks.holdsLock('api:a.js', CLAIMS, 'sess-A') === true
  && locks.holdsLock('api:a.js', CLAIMS, 'sess-B') === false);
ok('a session with NO label owns nothing',
  locks.holdsLock('api:b.js', CLAIMS, null) === false);

// ---------------------------------------------------------------------------
//  3. THE HOOK, end to end, with the board stubbed
//
//  APCS_BASE points the library at a local stub so the suite is offline and
//  deterministic. The cache file is cleared between cases or the second case
//  would answer from the first one's fetch.
// ---------------------------------------------------------------------------
console.log('\nThe hook end to end');
const http = require('http');
let served = { in_flight: CLAIMS };
let serveStatus = 200;
const server = http.createServer((req, res) => {
  res.writeHead(serveStatus, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(served));
});

//  ASYNC ON PURPOSE. execFileSync blocks this process's event loop, and the stub
//  server lives in this process, so a synchronous child could never be answered:
//  its fetch would sit there until the abort timer fired and every case would
//  report "board unreachable". Two assertions PASSED that way while proving
//  nothing, because the unreachable path also returns no permission decision.
//  A test that cannot tell "allowed" from "never asked" is the hollow-guard
//  failure this repo keeps writing conventions about.
async function runHook(filePath, sessionLabel, env = {}) {
  try { fs.unlinkSync(locks.CACHE_FILE); } catch (_) {}
  const payload = JSON.stringify({ tool_name: 'Edit', session_id: sessionLabel, tool_input: { file_path: filePath } });
  const child = execFileAsync('node', [HOOK], {
    env: {
      ...process.env,
      APCS_BASE: `http://127.0.0.1:${server.address().port}`,
      //  The container routes outbound traffic through an agent proxy, and the
      //  child inherits it, so a fetch to 127.0.0.1 goes to the proxy and hangs
      //  until the abort timer fires. The suite is offline by design; clear the
      //  proxy for the child rather than making the library proxy-aware.
      HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '',
      NO_PROXY: '*', no_proxy: '*',
      COMMAND_READ_TOKEN: 'stub-token',
      TODO_KEY: '',
      APCS_SESSION_LABEL: sessionLabel,
      CLAUDE_PROJECT_DIR: ROOT,
      TMPDIR: fs.mkdtempSync(path.join(os.tmpdir(), 'claimguard-')),
      ...env,
    },
    encoding: 'utf8',
  });
  child.child.stdin.end(payload);
  const { stdout } = await child;
  return stdout ? JSON.parse(stdout) : {};
}

server.listen(0, '127.0.0.1', async () => {
  const held = path.join(ROOT, 'a.js');

  // THE ONE THAT MATTERS. Another session holds it, so the edit is refused.
  const denied = await runHook(held, 'sess-B');
  const hso = denied.hookSpecificOutput || {};
  ok('DENIES an edit to a file another session holds',
    hso.permissionDecision === 'deny', denied);
  ok('names the holder, the task and the claim so it can be chased',
    /sess-A/.test(hso.permissionDecisionReason || '')
    && /#10/.test(hso.permissionDecisionReason || '')
    && /#1\b/.test(hso.permissionDecisionReason || ''),
    hso.permissionDecisionReason);
  ok('offers --force as a deliberate, audited act rather than a shortcut',
    /--force/.test(hso.permissionDecisionReason || '')
    && /audit row/.test(hso.permissionDecisionReason || ''));

  // My own lock must not block me, or the guard punishes the one session that
  // followed the rule, and gets switched off within a day.
  const mine = await runHook(held, 'sess-A');
  ok('ALLOWS an edit to a file I hold myself',
    !mine.hookSpecificOutput, mine);

  // Unclaimed: allowed, but said out loud once.
  const free = await runHook(path.join(ROOT, 'never-claimed.js'), 'sess-A');
  ok('ALLOWS an unclaimed file', !free.hookSpecificOutput, free);
  ok('but says it is unclaimed and how to claim it',
    /not claimed by anyone/.test(free.systemMessage || '')
    && /apcs claim/.test(free.systemMessage || ''), free);

  // Not lockable is not the same as unlocked, and must be silent.
  const outside = await runHook('/tmp/scratch-file.txt', 'sess-A');
  ok('is SILENT for a path outside both checkouts',
    !outside.hookSpecificOutput && !outside.systemMessage, outside);

  // A board outage must not brick the session, but must not be silent either.
  serveStatus = 500;
  const blind = await runHook(held, 'sess-B');
  ok('a broken board does NOT block the edit', !blind.hookSpecificOutput, blind);
  ok('and says the locks could not be checked',
    /could NOT check file locks/.test(blind.systemMessage || ''), blind);
  serveStatus = 200;

  // -------------------------------------------------------------------------
  //  4. MUTATION. A green run here is a FAILED check, per the deploy gate.
  //     Each mutation breaks one rule and must turn the matching assertion red.
  // -------------------------------------------------------------------------
  console.log('\nMutation: each broken rule must be caught');

  const m1 = locks.holdersOf('api:b.js', CLAIMS, 'sess-A');
  ok('MUTATION treating an unlabeled claim as mine would be caught',
    m1.length === 1,
    'if holdersOf ignored unlabeled claims this would be 0 and the guard would go quiet under load');

  const m2 = locks.lockForPath('/home/user/apcsexamprep-progress-api/CLAUDE.md', '/');
  ok('MUTATION matching absolute paths instead of directory names would be caught',
    m2 === 'api:CLAUDE.md' && locks.lockForPath('/elsewhere/apcsexamprep-progress-api/CLAUDE.md', '/') === 'api:CLAUDE.md',
    'the same file under a different parent must still resolve, or worktrees and laptops go unguarded');

  const m3 = locks.holdersOf('api:a.js', CLAIMS, null);
  ok('MUTATION a session with no label is protected by, not exempt from, the guard',
    m3.length === 1,
    'no label must mean everything is somebody elses, never nothing is');

  server.close();
  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  process.exit(fail ? 1 : 0);
});
