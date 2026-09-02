'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the gate refuses everything it is supposed to refuse.
//
//  A gate that passes when it should not is worse than no gate, because it
//  launders a bad change as a checked one. So every refusal path is pinned, and
//  the mutation path is tested in BOTH directions: a guard that dies when broken
//  passes, and a guard that survives being broken fails.
//
//  Run: npm run smoke:deploygate
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { gate } = require('../scripts/deploy-gate');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const TRUE = 'node -e "console.log(\'fine\')"';
const FALSE = 'node -e "process.exit(1)"';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
// A file with a "guard" in it, and a suite that only passes while the guard is
// intact. Breaking the guard must turn the suite red.
const guarded = path.join(tmp, 'guarded.js');
fs.writeFileSync(guarded, 'const GUARD = true;\nif (!GUARD) process.exit(1);\n');
const killable = {
  kind: 'mutation', name: 'guard is real',
  file: guarded, find: 'const GUARD = true;', replace: 'const GUARD = false;',
  command: `node ${guarded}`,
};

const full = (extra) => ({
  change: 'test',
  checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: `node -e "console.log('live ok')"` },
    killable,
  ].concat(extra || []),
});

console.log('\n1. A complete manifest passes');
{
  const r = gate(full());
  ok('  three kinds, all green, clear to ship', r.ok, r.problems);
  ok('  and it names the kinds it counted', r.kinds.length === 3, r.kinds);
}

console.log('\n2. Fewer than three KINDS is refused, however many checks there are');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'a', command: TRUE },
    { kind: 'suite', name: 'b', command: 'node -e "console.log(2)"' },
    { kind: 'suite', name: 'c', command: 'node -e "console.log(3)"' },
    Object.assign({}, killable),
  ] });
  ok('  three passing suites plus a mutation is still refused', !r.ok, r.problems);
  ok('  and the message says running one kind three times is not three checks',
    /not three checks/.test(r.problems.join(' ')), r.problems);
}

console.log('\n3. A mutation that does not kill is the finding');
{
  const survivor = path.join(tmp, 'hollow.js');
  fs.writeFileSync(survivor, 'const GUARD = true;\nprocess.exit(0);\n');   // ignores the guard
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: TRUE + ' && node -e "0"' },
    { kind: 'mutation', name: 'hollow guard', file: survivor,
      find: 'const GUARD = true;', replace: 'const GUARD = false;', command: `node ${survivor}` },
  ] });
  ok('  a suite that stays green with the guard broken is refused', !r.ok, r.problems);
  ok('  and the message says the suite does not test it',
    /does not test it/.test(r.problems.join(' ')), r.problems);
  ok('  the mutated file is restored either way',
    fs.readFileSync(survivor, 'utf8') === 'const GUARD = true;\nprocess.exit(0);\n');
}

console.log('\n4. A mutation whose anchor is missing never applied, so it proves nothing');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(9)"' },
    { kind: 'mutation', name: 'stale anchor', file: guarded,
      find: 'const NOT_PRESENT = 1;', replace: 'x', command: `node ${guarded}` },
  ] });
  ok('  a mutation that never applied is refused', !r.ok, r.problems);
  ok('  and says the anchor was not found', /anchor not found/.test(r.problems.join(' ')), r.problems);
  ok('  the file is untouched', fs.readFileSync(guarded, 'utf8').includes('const GUARD = true;'));
}

console.log('\n5. No mutation at all is refused, however green everything else is');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(1)"' },
    { kind: 'rederive', name: 'second reading', command: 'node -e "console.log(2)"' },
  ] });
  ok('  suite plus live plus rederive, no mutation, refused', !r.ok, r.problems);
  ok('  and says a green suite may be green because it tests nothing',
    /may be green because it tests nothing/.test(r.problems.join(' ')), r.problems);
}

console.log('\n6. Only looking at this repo is refused');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    killable,
  ] });
  ok('  suite plus mutation, nothing external, refused', !r.ok, r.problems);
  ok('  and says it is only this repo talking to itself',
    /talking to itself/.test(r.problems.join(' ')), r.problems);
}

console.log('\n7. The same check twice is one check counted twice');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'rederive', name: 'not really', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(4)"' },
    killable,
  ] });
  ok('  a duplicated command is refused', !r.ok, r.problems);
  ok('  and it is named', /counted twice/.test(r.problems.join(' ')), r.problems);

  // The case the first version of this rule got wrong, found when the gate
  // refused its own change: two mutations of DIFFERENT guards, both validated by
  // the same suite. The suite is the instrument, the mutation is the experiment,
  // and they are two experiments.
  //  The two mutations must share ONE command, because that is the real case:
  //  in the manifest that exposed this, both mutations were validated by the
  //  same suite and differed only in which guard they broke. A fixture where
  //  they also had different commands passed whether the rule looked at the
  //  mutation or not, which made it a test of nothing.
  const twoGuards = path.join(tmp, 'twoguards.js');
  const TWO_SRC = 'const A = true;\nconst B = true;\nif (!A || !B) process.exit(1);\n';
  fs.writeFileSync(twoGuards, TWO_SRC);
  const sameCmd = `node ${twoGuards}`;
  const r2 = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(7)"' },
    { kind: 'mutation', name: 'guard A', file: twoGuards,
      find: 'const A = true;', replace: 'const A = false;', command: sameCmd },
    { kind: 'mutation', name: 'guard B', file: twoGuards,
      find: 'const B = true;', replace: 'const B = false;', command: sameCmd },
  ] });
  ok('  two mutations of different guards sharing one suite are two checks', r2.ok, r2.problems);
  ok('  and the file survives both', fs.readFileSync(twoGuards, 'utf8') === TWO_SRC);

  // But the SAME mutation twice is still one check.
  const r3 = gate({ checks: [
    { kind: 'suite', name: 'tests', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(8)"' },
    killable,
    Object.assign({}, killable, { name: 'same thing again' }),
  ] });
  ok('  the identical mutation twice is still refused', !r3.ok, r3.problems);
}

console.log('\n8. A failing check fails the gate, and an unknown kind cannot sneak through');
{
  const r = gate({ checks: [
    { kind: 'suite', name: 'tests', command: FALSE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(5)"' },
    killable,
  ] });
  ok('  a red suite refuses', !r.ok, r.problems);

  const r2 = gate({ checks: [
    { kind: 'vibes', name: 'looks right', command: TRUE },
    { kind: 'live', name: 'production', command: 'node -e "console.log(6)"' },
    killable,
  ] });
  ok('  an invented kind refuses', !r2.ok, r2.problems);
  ok('  and says which kinds exist', /expected one of/.test(r2.problems.join(' ')), r2.problems);
}

console.log('\n9. Pre-deploy mode defers live but never the mutation');
{
  const r = gate(full(), { pre: true });
  ok('  suite plus mutation clears the pre-deploy gate', r.ok, r.problems);
  const r2 = gate({ checks: [{ kind: 'suite', name: 'tests', command: TRUE }] }, { pre: true });
  ok('  but a pre-deploy run with no mutation is still refused', !r2.ok, r2.problems);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
