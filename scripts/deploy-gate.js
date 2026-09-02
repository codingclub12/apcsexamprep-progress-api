'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEPLOY GATE. Three INDEPENDENT kinds of check, or nothing ships.
//
//  Set 2026-09-02, when Tanner moved the CEO to act-then-report including
//  deploys. Autonomy without a gate is just faster mistakes, and the gate has to
//  be a program rather than a habit: this repo already learned that lesson once,
//  when "merge only on green CI" was a convention until PR #428 was merged at
//  16:59:01 while its own test run, started 16:57:19, was still going.
//
//  WHY THREE KINDS AND NOT THREE RUNS
//  Every real defect found on 2026-09-01 and 02 was caught by a kind of check
//  DIFFERENT from the ones that were passing at the time:
//
//    the CSP sheet lost 90 bytes a page      every semantic check passed;
//                                            a CSV parse-back diff caught it
//    the rewriter reformatted 23 live pages  every test passed; comparing the
//                                            live body to the source caught it
//    CDACDA, a key repeating inside itself   distinct, per-column and overall
//                                            balance all held; periodicity caught it
//    Unit 3 filed under retired lesson ids   nothing threw anywhere; comparing
//                                            the storefront to the server caught it
//    two guards were hollow                  the suite was green either way;
//                                            mutation testing caught it
//
//  Running the same check three times would have caught none of them. So the
//  gate counts KINDS, not passes, and refuses a manifest that cannot show three.
//
//  THE KINDS
//    suite     the repo's own tests, run as a contributor runs them
//    rederive  a SECOND implementation reaching the same conclusion from the raw
//              artifact, written without reference to the first
//    live      the deployed system observed directly, after the change is out
//    mutation  a guard proven not hollow: break it on purpose and require the
//              suite to go RED. A green mutation run is a failed check here.
//
//  `mutation` is the one nobody does by hand under time pressure, and it is the
//  only kind that can tell you a passing suite means anything. So it is
//  mandatory, and so is at least one of `live` or `rederive`, because `suite`
//  plus `mutation` still only ever examines this repo talking to itself.
//
//  A MUTATION SHOULD NAME THE ASSERTION IT EXPECTS TO TRIP: `expect_failure`.
//  "The suite went red" and "this guard is real" are not the same claim. Where
//  guards overlap, the strong one masks the weak one, and a suite that stops at
//  the first failure never even reaches the guard under test. The battery then
//  reports a clean run over a guard that cannot fire at all. That is how the
//  stoplist rule in lib/command-verify.js survived three separate suites. Set
//  `expect_failure` to a distinctive slice of the assertion that must appear in
//  the red output, and a mutation caught by some OTHER guard is refused.
//
//  A LIVE CHECK MUST ASSERT SOMETHING THAT WAS FALSE BEFORE THE DEPLOY.
//  This gate's own first manifest expected `"status":"ok"` from /api/health.
//  That was true before the deploy, true during it, and true if the deploy never
//  happened at all, so it verified nothing while reading like proof. Pin the
//  thing the change made true: the commit sha now serving, a byte string only
//  the new build emits, a count that moved. If the assertion would have passed
//  yesterday, it is decoration.
//
//  Usage:
//    node scripts/deploy-gate.js <manifest.json>
//    node scripts/deploy-gate.js <manifest.json> --pre    (skip `live` checks,
//                                run before the deploy; `live` runs after)
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const { execSync } = require('child_process');

const KINDS = ['suite', 'rederive', 'live', 'mutation'];
const REQUIRED_KIND = 'mutation';
const REQUIRED_ONE_OF = ['live', 'rederive'];
const MIN_KINDS = 3;

function sh(cmd, opts) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000, ...opts }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), status: e.status };
  }
}

// A mutation check INVERTS the pass condition: the point is that breaking the
// guard breaks the suite. If the suite still passes with the guard removed, the
// suite was not testing the guard, and a green run there is the finding.
function runMutation(m) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.find)) {
    return { ok: false, detail: `anchor not found in ${m.file}, so the mutation never applied` };
  }
  fs.writeFileSync(m.file, original.split(m.find).join(m.replace));
  let res;
  try {
    res = sh(m.command);
  } finally {
    fs.writeFileSync(m.file, original);   // always restore, even on throw
  }
  const restored = fs.readFileSync(m.file, 'utf8') === original;
  if (!restored) return { ok: false, detail: `FAILED TO RESTORE ${m.file}` };
  if (res.ok) {
    return { ok: false, detail: `the suite still PASSED with the guard broken, so it does not test it` };
  }
  //  GUARD SUBSUMPTION. "The suite went red" is not the same as "this guard is
  //  real". Where guards overlap, a strong one masks a weak one: a mutation
  //  aimed at "the group disallows everything" can be caught entirely by "the
  //  group exists", and the weak guard stays hollow while the battery reports a
  //  clean run. That is the same shape as the stoplist mutation that survived
  //  three separate suites here, and it is invisible without naming the
  //  assertion you expect to trip.
  if (m.expect_failure && !String(res.out || '').includes(m.expect_failure)) {
    return { ok: false, detail: `the suite went red, but NOT for ${JSON.stringify(m.expect_failure)}. `
      + `Another guard caught this mutation, so the one it targets is still unproven` };
  }
  return { ok: true, detail: `broke ${m.file} and the suite went red`
    + (m.expect_failure ? `, on ${JSON.stringify(m.expect_failure.slice(0, 48))}` : '') };
}

// A gate whose failure message does not say what went wrong gets re-run instead
// of read, which is how a real failure becomes a suspected flake. A thrown Node
// error puts the useful line near the top and a stack trace after it, so the
// tail of the output is exactly the wrong slice to show. Prefer the message.
function explain(out) {
  const text = String(out || '').trim();
  if (!text) return 'no output';
  const err = text.split('\n').find((l) => /^(?:.*\b)?Error:\s*\S/.test(l));
  if (err) return err.replace(/^.*?Error:\s*/, '').trim().slice(0, 160);
  const lines = text.split('\n').filter((l) => l.trim() && !/^\s+at\s/.test(l));
  return lines.slice(-3).join(' | ').slice(0, 160);
}

function runCheck(c) {
  if (c.kind === 'mutation') return runMutation(c);
  const res = sh(c.command);
  if (!res.ok) return { ok: false, detail: explain(res.out) };
  if (c.expect && !res.out.includes(c.expect)) {
    return { ok: false, detail: `output did not contain ${JSON.stringify(c.expect)}` };
  }
  const tail = (res.out || '').trim().split('\n').filter(Boolean).slice(-1)[0] || 'ok';
  return { ok: true, detail: tail.slice(0, 110) };
}

function gate(manifest, opts) {
  opts = opts || {};
  const checks = (manifest.checks || []).filter((c) => !(opts.pre && c.kind === 'live'));
  const problems = [];
  const results = [];

  for (const c of checks) {
    if (!KINDS.includes(c.kind)) {
      problems.push(`unknown kind ${JSON.stringify(c.kind)}, expected one of ${KINDS.join(', ')}`);
      continue;
    }
    const r = runCheck(c);
    results.push({ kind: c.kind, name: c.name, ok: r.ok, detail: r.detail });
    if (!r.ok) problems.push(`${c.kind}/${c.name}: ${r.detail}`);
  }

  // Independence, enforced rather than trusted. Two checks that do exactly the
  // same thing are one check counted twice, which is the failure this gate
  // exists to prevent and the easiest one to commit by accident.
  //
  // A check's identity is its command PLUS what it does to the tree first. Two
  // mutations of DIFFERENT guards validated by the same suite are two genuinely
  // different checks: the suite is the instrument, the mutation is the
  // experiment. Comparing commands alone called those a duplicate, which this
  // gate discovered by refusing its own change. Comparing the pair keeps the
  // rule and stops it firing on the case it was never about.
  const identity = (c) => [c.command || '', c.file || '', c.find || '', c.replace || ''].join('\u0000');
  const ids = checks.map(identity);
  const dupeAt = ids.findIndex((x, i) => ids.indexOf(x) !== i);
  if (dupeAt !== -1) {
    const c = checks[dupeAt];
    problems.push(`two checks are identical, so one of them is counted twice: `
      + `${c.kind}/${c.name} runs ${JSON.stringify((c.command || '').slice(0, 60))}`
      + (c.file ? ` with the same mutation of ${c.file}` : ''));
  }

  const kinds = new Set(results.filter((r) => r.ok).map((r) => r.kind));
  if (kinds.size < MIN_KINDS && !opts.pre) {
    problems.push(`${kinds.size} kind(s) of check passed, ${MIN_KINDS} are required. `
      + `Running one kind three times is not three checks.`);
  }
  if (!kinds.has(REQUIRED_KIND)) {
    problems.push(`no passing ${REQUIRED_KIND} check. Without one, a green suite means nothing: `
      + `it may be green because it tests nothing.`);
  }
  if (!opts.pre && !REQUIRED_ONE_OF.some((k) => kinds.has(k))) {
    problems.push(`no passing ${REQUIRED_ONE_OF.join(' or ')} check. suite plus mutation is still `
      + `only this repo talking to itself.`);
  }
  return { ok: problems.length === 0, problems, results, kinds: [...kinds] };
}

if (require.main === module) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) {
    console.error('usage: node scripts/deploy-gate.js <manifest.json> [--pre]');
    process.exit(2);
  }
  const pre = rest.includes('--pre');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`\nDEPLOY GATE${pre ? ' (pre-deploy, live checks deferred)' : ''}: ${manifest.change || file}\n`);
  const r = gate(manifest, { pre });
  for (const x of r.results) {
    console.log(`  [${x.ok ? 'PASS' : 'FAIL'}] ${x.kind.padEnd(9)} ${String(x.name).padEnd(34)} ${x.detail}`);
  }
  console.log(`\n  kinds passing: ${r.kinds.join(', ') || 'none'}`);
  if (!r.ok) {
    console.error('\n  REFUSING TO SHIP:');
    r.problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }
  console.log('\n  three independent kinds agree. clear to ship.\n');
}

module.exports = { gate, runCheck, runMutation, KINDS, MIN_KINDS };
