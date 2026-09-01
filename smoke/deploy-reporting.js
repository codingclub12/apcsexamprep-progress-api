'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the two workflows that tell a human what production is doing.
//
//  Both failures this guards were silent, and both were the same shape: a check
//  that was correct, and read by nobody.
//
//    deploy-drift.yml went red on 2026-08-28 and stayed red for four days while
//    the board's health panel said `checks: {total: 1, failing: 0}`. It was
//    right the whole time. It reported to the Actions tab, and a human looks at
//    the board.
//
//    verify-board.yml gathered exactly the evidence needed to shrink a 60-item
//    verification backlog, and only ever when somebody remembered to press it.
//
//  So these assertions are mostly about WIRING, not logic: does the alarm reach
//  the place a person actually looks, is it bounded, and can it lie.
//
//  Run: npm run smoke:deployreporting
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const { SOURCES, STATES } = require('../lib/command-checks');

const root = path.join(__dirname, '..');
const drift = fs.readFileSync(path.join(root, '.github/workflows/deploy-drift.yml'), 'utf8');
const board = fs.readFileSync(path.join(root, '.github/workflows/verify-board.yml'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// The compare step's shell body, which is where every verdict is decided.
const compareBody = (() => {
  const start = drift.indexOf('id: compare');
  const end = drift.indexOf('- name: Report the drift verdict');
  return start > -1 && end > start ? drift.slice(start, end) : '';
})();

console.log('\n1. deploy-drift reaches the board at all');
ok('1.1 it posts to /api/command/checks',
  /\/api\/command\/checks/.test(drift));
ok('1.2 it sends the TODO_KEY bearer',
  /Authorization: Bearer \$TODO_KEY/.test(drift));
ok('1.3 and a browser User-Agent, or Cloudflare answers 1010',
  /User-Agent: Mozilla/.test(drift));

console.log('\n2. What it posts is what the API will actually accept');
const source = (drift.match(/source:\s*"([a-z]+)"/) || [])[1];
const checkId = (drift.match(/check_id:\s*"([a-z0-9-]+)"/) || [])[1];
ok(`2.1 source "${source}" is a registered source in lib/command-checks.js`,
  !!source && SOURCES.includes(source), { source, SOURCES });
ok('2.2 check_id is set, so results fingerprint to one ageing task',
  !!checkId && checkId.length > 0, { checkId });
const statesPosted = [...drift.matchAll(/state=(pass|fail)\b/g)].map((m) => m[1]);
ok('2.3 every state it can post is a legal state',
  statesPosted.length > 0 && statesPosted.every((s) => STATES.includes(s)),
  { statesPosted, STATES });

console.log('\n3. The observer cannot lie, and cannot break the job');
// tests.yml opened task #88 against a cancelled run that had compared nothing.
ok('3.1 it never reports from a cancelled run, which knows nothing',
  /job\.status != 'cancelled'/.test(drift));
ok('3.2 it still reports on failure, or a red drift would never reach the board',
  /if:\s*always\(\)/.test(drift));
ok('3.3 continue-on-error, so the reporter cannot turn the alarm red by itself',
  /continue-on-error:\s*true/.test(drift));
ok('3.4 a missing TODO_KEY skips rather than fails',
  /TODO_KEY not configured; skipping/.test(drift));
ok('3.5 a failed curl is swallowed',
  /report failed, ignoring/.test(drift));

console.log('\n4. Every verdict is described, none silently');
const exits = (compareBody.match(/^\s*exit [01]\s*$/gm) || []).length;
const details = (compareBody.match(/detail=.*>> "\$GITHUB_OUTPUT"/g) || []).length;
ok('4.1 the compare step has exit paths to describe', exits > 0, { exits });
ok('4.2 every exit path writes a detail, so the board never shows a blank verdict',
  exits === details, { exits, details });
ok('4.3 and an absent detail still posts something readable',
  /no verdict recorded by the compare step/.test(drift));

console.log('\n5. verify-board runs without being remembered');
ok('5.1 it has a schedule', /^\s{2}schedule:/m.test(board));
ok('5.2 it kept the button, so reconciling on demand still works',
  /^\s{2}workflow_dispatch:/m.test(board));
ok('5.3 a scheduled run is still bounded, or it sweeps 60 tasks at a rate-limited host',
  /inputs\.limit \|\| '\d+'/.test(board));
ok('5.4 it still refuses to run without a credential rather than reporting nothing',
  /TODO_KEY not configured/.test(board));
ok('5.5 --redact is still not optional; this log is public',
  /args="--redact"/.test(board));

console.log('\n6. The claim in the file matches what the file does');
// This repo has been bitten twice by a comment that was true when written.
// The phrase is allowed to SURVIVE as a quotation: this repo retires a stale
// claim by quoting and correcting it in place (see the CORRECTION block in
// server.js), which keeps the reasoning legible instead of erasing it. What
// must not survive is the phrase asserted as still true, so every line carrying
// it has to mark it as history.
const CLAIM = 'MANUAL ONLY, on purpose. There is no schedule here';
const liveClaims = board.split('\n')
  .filter((l) => l.includes(CLAIM))
  .filter((l) => !/used to say/.test(l));
ok('6.1 verify-board no longer asserts it is manual only, except as a quote',
  liveClaims.length === 0, liveClaims);
ok('6.2 and it says why that changed',
  /having been manual on purpose/i.test(board));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
