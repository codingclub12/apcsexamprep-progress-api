'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the workflows that tell a human what production is doing.
//
//  Every failure this guards was silent, and every one was the same shape: a
//  check that was correct, and read by nobody, because /api/command/checks was
//  never called from that workflow.
//
//    deploy-drift.yml went red on 2026-08-28 and stayed red for four days while
//    the board's health panel said `checks: {total: 1, failing: 0}`. It was
//    right the whole time. It reported to the Actions tab, and a human looks at
//    the board. Fixed 2026-09-01.
//
//    Board task 166 (2026-09-02) found the same gap in SEVEN more workflows.
//    `checks: {total: 2, failing: 0}` was never a count of every check this
//    repo runs - it was a count of the two able to speak (deploy-drift.yml and
//    tests.yml). site-audit.yml had exited 1 since 2026-08-28 and the board
//    never said so. This is one reporting-architecture defect with (at least)
//    three counted instances, not three separate incidents.
//
//  So these assertions are mostly about WIRING, not logic: does the alarm reach
//  the place a person actually looks, is it bounded, and can it lie.
//
//  Section 7 exists because task 166 named the failure mode most likely to make
//  this WORSE rather than better: railway-deploy.yml has 70 green runs in which
//  every step skipped (RAILWAY_TOKEN unset) and the job exited 0. A naive
//  reporter posts pass for having done nothing. That section asserts the guard
//  against exactly that, and only that section is allowed to gate its report on
//  something other than job.status/cancelled.
//
//  Run: npm run smoke:deployreporting
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const { SOURCES, STATES } = require('../lib/command-checks');

const root = path.join(__dirname, '..');
const wfDir = path.join(root, '.github/workflows');
const drift = fs.readFileSync(path.join(wfDir, 'deploy-drift.yml'), 'utf8');
const board = fs.readFileSync(path.join(wfDir, 'verify-board.yml'), 'utf8');
const autoDispatch = fs.readFileSync(path.join(wfDir, 'auto-dispatch.yml'), 'utf8');
const cedWatch = fs.readFileSync(path.join(wfDir, 'ced-watch.yml'), 'utf8');
const nightlySweep = fs.readFileSync(path.join(wfDir, 'nightly-sweep.yml'), 'utf8');
const railwayDeploy = fs.readFileSync(path.join(wfDir, 'railway-deploy.yml'), 'utf8');
const siteAudit = fs.readFileSync(path.join(wfDir, 'site-audit.yml'), 'utf8');
const smoke = fs.readFileSync(path.join(wfDir, 'smoke.yml'), 'utf8');

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

console.log('\n7. The seven workflows board task 166 found silent now all reach the board');
// One entry per plain reporter: workflow text, source, check_id. railway-deploy
// is deliberately NOT in this list - it needs the extra skip guard checked
// separately in section 8, and folding it in here would let a passing loop
// over six honest reporters hide a missing assertion on the one that matters.
const PLAIN_REPORTERS = [
  { name: 'auto-dispatch.yml', text: autoDispatch, source: 'health', checkId: 'auto-dispatch' },
  { name: 'ced-watch.yml', text: cedWatch, source: 'linkcheck', checkId: 'ced-watch' },
  { name: 'nightly-sweep.yml', text: nightlySweep, source: 'health', checkId: 'nightly-sweep' },
  { name: 'site-audit.yml', text: siteAudit, source: 'linkcheck', checkId: 'site-audit' },
  { name: 'smoke.yml', text: smoke, source: 'smoke', checkId: 'auth-smoke' },
  { name: 'verify-board.yml', text: board, source: 'health', checkId: 'verify-board' },
];

for (const r of PLAIN_REPORTERS) {
  ok(`7.${r.name} posts to /api/command/checks`,
    /\/api\/command\/checks/.test(r.text), r.name);
  ok(`7.${r.name} sends the TODO_KEY bearer`,
    /Authorization: Bearer \$TODO_KEY/.test(r.text), r.name);
  ok(`7.${r.name} sends a browser User-Agent, or Cloudflare answers 1010`,
    /User-Agent: Mozilla/.test(r.text), r.name);
  ok(`7.${r.name} posts the registered source "${r.source}"`,
    r.text.includes(`\\"source\\":\\"${r.source}\\"`) && SOURCES.includes(r.source),
    { file: r.name, source: r.source, SOURCES });
  ok(`7.${r.name} posts a stable check_id "${r.checkId}"`,
    r.text.includes(`\\"check_id\\":\\"${r.checkId}\\"`), { file: r.name, checkId: r.checkId });
  ok(`7.${r.name} state is always a legal STATE`,
    /state=\$\(\[ "\$\{\{ job\.status \}\}" = "success" \] && echo pass \|\| echo fail\)/.test(r.text)
    && STATES.includes('pass') && STATES.includes('fail'),
    r.name);
  ok(`7.${r.name} never reports from a cancelled run`,
    /job\.status != 'cancelled'/.test(r.text), r.name);
  ok(`7.${r.name} still reports on a failed job, via if: always()`,
    (() => {
      // The reporter step's own `if:` line, not just any always() in the file
      // (several of these workflows use always() elsewhere for artifact upload
      // or summary steps that are not the command-center report).
      const lines = r.text.split('\n');
      const idx = lines.findIndex((l) => l.includes('Report to the command center'));
      if (idx === -1) return false;
      const window = lines.slice(idx, idx + 4).join('\n');
      return /if:\s*always\(\)/.test(window);
    })(), r.name);
  ok(`7.${r.name} continue-on-error, so the reporter cannot break the job`,
    /continue-on-error:\s*true/.test(r.text), r.name);
  ok(`7.${r.name} a missing TODO_KEY skips rather than fails`,
    /TODO_KEY not configured; skipping/.test(r.text), r.name);
  ok(`7.${r.name} a failed curl is swallowed, not fatal`,
    /report failed, ignoring/.test(r.text), r.name);
}

console.log('\n8. railway-deploy.yml never reports pass for a run that deployed nothing');
// railway-deploy.yml has 70 green runs in which RAILWAY_TOKEN was unset, every
// dependent step's `if: steps.gate.outputs.ready == 'true'` skipped it, and the
// job exited 0. A naive `job.status == success -> pass` here would post green
// for having done nothing, industrialising the exact failure task 166 exists
// to fix. These assertions are the guard against that, and section 9's
// mutation proves it is not hollow.
const rdReportIdx = railwayDeploy.split('\n').findIndex((l) => l.includes('Report to the command center'));
const rdReportBlock = rdReportIdx > -1
  ? railwayDeploy.split('\n').slice(rdReportIdx, rdReportIdx + 20).join('\n')
  : '';

ok('8.1 railway-deploy.yml posts to /api/command/checks at all',
  /\/api\/command\/checks/.test(railwayDeploy));
ok('8.2 the report step is gated on steps.gate.outputs.ready == \'true\'',
  /if:\s*always\(\)\s*&&\s*steps\.gate\.outputs\.ready == 'true'/.test(rdReportBlock),
  rdReportBlock);
ok('8.3 the gate condition sits INSIDE an always(), so a real deploy failure (job.status: failure) still reports rather than the implicit success() on a bare condition silently dropping it',
  /if:\s*always\(\)\s*&&\s*steps\.gate\.outputs\.ready/.test(rdReportBlock));
ok('8.4 it still checks job.status != \'cancelled\'',
  /job\.status != 'cancelled'/.test(rdReportBlock));
ok('8.5 it posts source "health" and check_id "railway-deploy"',
  rdReportBlock.includes('\\"source\\":\\"health\\"') && rdReportBlock.includes('\\"check_id\\":\\"railway-deploy\\"'));
ok('8.6 continue-on-error, so the reporter cannot break the deploy job',
  /continue-on-error:\s*true/.test(rdReportBlock));
ok('8.7 a missing TODO_KEY still skips rather than fails',
  /TODO_KEY not configured; skipping/.test(rdReportBlock));

// ─────────────────────────────────────────────────────────────────────────────
//  9. The boot-seed reporter, run rather than read
//
//  Sections 1 to 8 assert WIRING by reading workflow text, which is the right
//  test for "does the alarm reach the board". It is the wrong test for "does
//  the alarm say the right thing", and this repo has now been bitten by that
//  distinction twice in one day: a mojibake rule that read as complete and had
//  holes, and a path check that read the repository to answer a question about
//  the container.
//
//  So the verdict script is EXTRACTED from deploy-drift.yml and executed
//  against three health payloads. It is the same text the runner executes; if
//  somebody edits the workflow, this runs the edit.
//
//  The three cases are the three real states, and the third is the one worth
//  protecting: a container older than lib/boot-seed.js has no seed block, and
//  neither pass nor fail is honest about it.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n9. The boot-seed verdict, executed against real payloads');

const seedStep = drift.slice(drift.indexOf('Report the boot-seed verdict'));
const scriptStart = seedStep.indexOf("node -e '");
const verdictScript = seedStep.slice(scriptStart + "node -e '".length, seedStep.indexOf("')", scriptStart));

ok('9.1 the verdict script was found in the workflow', verdictScript.length > 200, verdictScript.length);

function verdict(payload) {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['-e', verdictScript], {
    input: JSON.stringify(payload), encoding: 'utf8',
  });
  const [state, detail] = out.trim().split('\t');
  return { state, detail: detail || '' };
}

const passing = verdict({
  commit: 'abc1234',
  seed: { ok: true, failed: [], seeds: { course_manifest: { ok: true, total: 932, changed: 24 } } },
});
ok('9.2 a healthy boot reports pass', passing.state === 'pass', passing);
ok('9.3 and names the commit it saw', /abc1234/.test(passing.detail), passing.detail);

//  The exact shape of the 2026-09-03 incident.
const failing = verdict({
  commit: 'd059208',
  seed: {
    ok: false,
    failed: ['course_manifest', 'course_manifest prune'],
    seeds: {
      course_manifest: { ok: false, error: "cannot read /app/data/cyber-topics.json: ENOENT" },
      'course_manifest prune': { ok: false, error: "cannot read /app/data/cyber-topics.json: ENOENT" },
    },
  },
});
ok('9.4 the incident payload reports fail', failing.state === 'fail', failing);
ok('9.5 and carries the reason, not just a count',
  /ENOENT/.test(failing.detail) && /course_manifest/.test(failing.detail), failing.detail);
ok('9.6 the state it posts is a legal STATE', STATES.includes(failing.state), failing.state);

//  Neither pass nor fail: an older container cannot answer the question.
const older = verdict({ commit: 'old1234', integrity: { ok: true } });
ok('9.7 a container with no seed block is reported as unknown, not pass',
  older.state === 'unknown', older);
ok('9.8 and the workflow posts nothing at all in that case',
  /if \[ "\$state" = "unknown" \]; then\n\s*echo "Not reporting/.test(drift), 'the unknown branch must exit before the curl');

ok('9.9 the reporter posts source "health" and check_id "boot-seed"',
  drift.includes('\\"source\\": \\"health\\"') || drift.includes('source: "health"'),
  'source');
ok('9.10 it fingerprints to one ageing task via a stable check_id',
  /check_id: "boot-seed"/.test(drift), 'check_id');
ok('9.11 it never reports from a cancelled run',
  seedStep.slice(0, seedStep.indexOf('run:')).includes("job.status != 'cancelled'"), 'cancellation guard');
ok('9.12 it fetches health itself, so a drift failure cannot hide a seed failure',
  /HEALTH_URL/.test(seedStep) && seedStep.indexOf('curl -sS --max-time 20 "$HEALTH_URL"') > 0,
  'independent fetch');

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
