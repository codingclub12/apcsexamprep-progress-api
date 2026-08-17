'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: board-delta. The overnight sweep's morning artifact.
//
//  OFFLINE. Pure function over two JSON reports, no network, no database.
//
//  The properties that matter, in order:
//    1. "Nothing changed" is reachable AND is the answer when nothing changed.
//       A delta that always finds something is as useless as one that never
//       does, and it is the failure this whole system keeps producing: a report
//       nobody reads because it always says the same thing.
//    2. A real change is never missed. A new finding, a cleared one, a bucket
//       move, a task arriving or leaving.
//    3. No baseline is reported as no baseline, NOT as "everything is new".
//       A false alarm on the first morning teaches someone to ignore mornings.
//    4. An unreadable CURRENT report is a failure, not an empty delta.
//
//  Run: npm run smoke:boarddelta
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'board-delta.js');
const { index, diff, render } = require(SCRIPT);
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'delta-smoke-'));

let pass = 0; let fail = 0;
const failures = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); } else {
    fail++; failures.push(name);
    console.log(`  [FAIL] ${name}${extra !== undefined ? '  ' + JSON.stringify(extra) : ''}`);
  }
};
const section = (t) => console.log('\n' + t);

const P1 = (text) => ({ level: 'P1', text });
function report(over) {
  return Object.assign({
    generated_at: '2026-08-17T05:00:00.000Z',
    needs_verification_total: 4,
    checked: 3,
    quiet: [30],
    findings: [{ task: { id: 71, url: 'https://x/a' }, signals: [P1('3 duplicated block(s)')] }],
    undecidable: [{
      task: { id: 16, url: 'https://x/api' },
      signals: [{ level: 'needs-human', text: 'responded 401' }],
    }],
    not_machine_checkable: [{ id: 50, why: 'no artifact recorded' }],
    over_cap: [],
  }, over || {});
}
const write = (name, obj) => {
  const p = path.join(DIR, name);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
};
const run = (...args) => execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

console.log('\nBOARD DELTA\n');

section('1. An unchanged board reports nothing changed');
const base = report();
const out1 = run(write('a.json', base), write('b.json', report()));
ok('1.1 it says nothing changed', /Nothing changed/.test(out1), out1);
ok('1.2 and does not invent a change list', !/\bNEW\b/.test(out1));
ok('1.3 it still states the posture', /Nothing was written/.test(out1));
ok('1.4 and says most mornings should look like this',
  /Most mornings should look like this/.test(out1));

// generated_at differs on every single run. If that counted, every morning
// would be eventful and the report would be worthless by the second day.
section('2. A different timestamp alone is not a change');
const out2 = run(write('c.json', base),
  write('d.json', report({ generated_at: '2026-08-18T05:00:00.000Z' })));
ok('2.1 a new timestamp does not register as a change', /Nothing changed/.test(out2), out2);

section('3. Real changes are caught');
const gained = report({
  findings: [{
    task: { id: 71, url: 'https://x/a' },
    signals: [P1('3 duplicated block(s)'), P1('2 <h1> tags (expected 1)')],
  }],
});
const out3 = run(write('e.json', base), write('f.json', gained));
ok('3.1 a NEW signal on an existing task is reported', /\*\*NEW\*\* P1 2 <h1> tags/.test(out3), out3);
ok('3.2 and it is counted as one change', /1 change since the last sweep/.test(out3));

const cleared = report({ findings: [], quiet: [30, 71] });
const out4 = run(write('g.json', base), write('h.json', cleared));
ok('3.3 a cleared finding is reported as gone', /gone: P1 3 duplicated block/.test(out4), out4);
ok('3.4 and the bucket move is named', /finding -> quiet/.test(out4));

const arrived = report({
  needs_verification_total: 5,
  findings: [
    { task: { id: 71, url: 'https://x/a' }, signals: [P1('3 duplicated block(s)')] },
    { task: { id: 99, url: 'https://x/new' }, signals: [P1('mojibake on 2 line(s)')] },
  ],
});
const out5 = run(write('i.json', base), write('j.json', arrived));
ok('3.5 a task entering needs_verification is reported', /Entered needs_verification \(1\)/.test(out5), out5);
ok('3.6 by id', /- \*\*#99\*\*/.test(out5));

const departed = report({ needs_verification_total: 3, quiet: [] });
const out6 = run(write('k.json', base), write('l.json', departed));
ok('3.7 a task leaving is reported', /Left needs_verification \(1\)/.test(out6), out6);
ok('3.8 without guessing WHY it left',
  /cannot tell which, and guessing would/.test(out6) && !/verified by/i.test(out6));

section('4. No baseline is said out loud, not faked');
const out7 = run('--none', write('m.json', base));
ok('4.1 --none reports no previous sweep', /No previous sweep to compare against/.test(out7), out7);
ok('4.2 it does NOT report every task as new', !/Entered needs_verification/.test(out7));
ok('4.3 and explains why that would be a false alarm', /false alarm/.test(out7));

// A cache miss or an older stored format must not fail the night, and must not
// silently look like a quiet morning either.
const badPrev = path.join(DIR, 'corrupt.json');
fs.writeFileSync(badPrev, '{ not json');
const out8 = run(badPrev, write('n.json', base));
ok('4.4 an unreadable PREVIOUS state degrades to no-baseline',
  /No previous sweep to compare against/.test(out8), out8);
ok('4.5 and does not claim nothing changed', !/Nothing changed/.test(out8));

section('5. An unreadable CURRENT report is a failure, not an empty delta');
let code = 0; let stderr = '';
try {
  execFileSync('node', [SCRIPT, write('o.json', base), badPrev],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) { code = e.status; stderr = String(e.stderr || ''); }
ok('5.1 it exits non-zero', code === 1, code);
ok('5.2 and says what went wrong', /cannot read the current report/.test(stderr), stderr);
ok('5.3 it did NOT print a reassuring report', !/Nothing changed/.test(stderr));

section('6. A task over the per-run cap is not churn');
// The cap moves between runs. A task that was checked last night and skipped
// tonight has not changed; it is unobserved. Reporting that as a bucket move
// would produce a change every single morning the cap lands differently.
const capped = report({
  findings: [],
  over_cap: [{ id: 71 }],
});
const out9 = run(write('p.json', base), write('q.json', capped));
ok('6.1 an unchecked task is not reported as a change', /Nothing changed/.test(out9), out9);

section('7. The comparison is on data, not on formatting');
const reordered = report({
  findings: [{
    task: { id: 71, url: 'https://x/a' },
    signals: [P1('3 duplicated block(s)')],
  }],
  quiet: [30],
});
const ix = index(reordered);
ok('7.1 every indexed task carries a bucket',
  [...ix.values()].every((t) => typeof t.bucket === 'string' && t.bucket));
ok('7.2 signals are sorted, so emission order is not a change',
  index(report({
    findings: [{ task: { id: 71 }, signals: [P1('b'), P1('a')] }],
  })).get('71').signals.join('|') === 'P1 a|P1 b');
const d0 = diff(index(base), index(report()));
ok('7.3 diff of identical reports is empty',
  !d0.entered.length && !d0.left.length && !d0.changed.length, d0);

section('8. The workflow cannot silently stop comparing');
// The delta is only as good as the baseline reaching it, and both ways that
// can break are invisible: the run stays GREEN and just reports "no baseline"
// forever. Neither is catchable by testing this script, so the YAML is pinned.
const WF = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'nightly-sweep.yml'), 'utf8');

// actions/cache restores a file to the path it was SAVED from. Saving
// current.json and restoring into previous.json means previous.json never
// exists, every morning says "no baseline", and nothing is ever compared.
const savePaths = [...WF.matchAll(/cache\/save@[^\n]*\n(?:[\s\S]*?)path:\s*(\S+)/g)].map((m) => m[1]);
const restorePaths = [...WF.matchAll(/cache\/restore@[^\n]*\n(?:[\s\S]*?)path:\s*(\S+)/g)].map((m) => m[1]);
ok('8.1 the workflow both saves and restores a state file',
  savePaths.length === 1 && restorePaths.length === 1, { savePaths, restorePaths });
ok('8.2 and saves it under the SAME filename it restores',
  savePaths[0] === restorePaths[0], { save: savePaths[0], restore: restorePaths[0] });
ok('8.3 which is the file the step actually looks for',
  new RegExp(`\\[ -f ${savePaths[0].replace('.', '\\.')} \\]`).test(WF), savePaths[0]);

// Without pipefail, `node ... | tee` reports TEE's status and a dead sweep is
// a green tick. This repo has shipped that bug once already.
ok('8.4 pipefail is set, so a piped failure is not a green tick',
  /set -o pipefail/.test(WF));
ok('8.5 a missing credential fails the night instead of skipping',
  /TODO_KEY/.test(WF) && /NOT CONFIGURED/.test(WF) && /exit 1/.test(WF));
ok('8.6 the sweep redacts, because this log is public',
  /--redact/.test(WF));
ok('8.7 the baseline is only saved on success, so a failed night cannot poison it',
  /if: success\(\)[\s\S]{0,200}cache\/save/.test(WF)
  || /cache\/save[\s\S]{0,200}if: success\(\)/.test(WF));
ok('8.8 it shares a concurrency group with the manual reconcile',
  /group:\s*verify-board/.test(WF));
// Reading unattended and writing unattended are different risks. Tonight only
// the first is being taken, so nothing here may grant write.
ok('8.9 the workflow grants no write permission',
  /permissions:\s*\n\s*contents:\s*read/.test(WF) && !/write/.test(WF));

fs.rmSync(DIR, { recursive: true, force: true });
console.log(`\n${'-'.repeat(70)}`);
console.log(`board-delta: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailed:'); for (const f of failures) console.log('  - ' + f); }
process.exit(fail ? 1 : 0);
