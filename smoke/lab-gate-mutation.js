#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the lab availability gate. Break each rule on purpose,
//  one at a time, and require smoke/lab-gate.js to go red FOR THAT RULE.
//  A green mutation run is a FAILED check, and here that is the exit code.
//
//  The first two are the defect a teacher actually reported: the route served
//  every lab without consulting the gate, and the gradebook then called the
//  resulting lock unenforceable. Both are now mutations rather than stories.
//
//  Run: npm run smoke:labgatemutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'lab-gate.js');
const FILES = {
  route: path.join(ROOT, 'routes', 'labs.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 700) : '')); }
};
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()), out };
}

const MUTATIONS = [
  {
    name: 'THE REPORTED BUG: the route serves every lab without consulting the gate',
    file: 'route',
    find: '  const gate = labGate(req, spec);',
    repl: '  const gate = { open: true, reason: "mutated" };',
    must: ['the signed-in student is refused'],
  },
  {
    name: 'THE OTHER HALF: the gradebook calls a lab lock unenforceable again',
    file: 'contract',
    find: '    if (l.course === course) bankKeys.add(`${l.unit}|${l.lesson}|${l.activity_type}`);',
    repl: '    if (false) bankKeys.add(`${l.unit}|${l.lesson}|${l.activity_type}`);',
    must: ['and it reports the lock as ENFORCEABLE, which is the half that was lying'],
  },
  {
    name: 'the spec is put on the wire beside the locked flag',
    file: 'route',
    find: '      locked: true, reason: gate.reason, lab: null,',
    repl: '      locked: true, reason: gate.reason, lab: null, brief: spec.brief, steps: spec.steps,',
    must: ['and the spec is NOT on the wire'],
  },
  {
    name: 'the token stops being optional, so teacher preview and public practice die',
    file: 'route',
    find: '  if (!stu) return { open: true, reason: \'self-study\' };',
    repl: '  if (!stu) return { open: false, reason: \'no-token\' };',
    must: ['an anonymous visitor still gets it, so teacher preview survives'],
  },
  {
    name: 'the gate reaches across courses, locking a class that never closed anything',
    file: 'route',
    find: '  if (!cls || cls.course !== spec.course) return { open: true, reason: \'self-study\' };',
    repl: '  if (!cls) return { open: true, reason: \'self-study\' };',
    must: ['a student in another course is unaffected'],
  },
  {
    name: 'only the exact activity scope is read, so a unit-wide close misses the lab',
    file: 'route',
    find: "  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'",
    repl: "  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ? AND lesson != \\'*\\''",
    must: ['a UNIT-scope close reaches the lab'],
  },
  {
    name: 'a closed lab 404s, so a student cannot tell shut from missing',
    file: 'route',
    find: '    return res.json({\n      course: req.params.course, item_id: req.params.item_id,',
    repl: '    return res.status(404).json({\n      course: req.params.course, item_id: req.params.item_id,',
    must: ['it is a 200, so the player can say "not opened yet" rather than "missing"'],
  },
];

console.log('\n  BASELINE (unmutated)');
const base = runSuite();
ok('the suite is green before anything is mutated', base.code === 0, { code: base.code, failed: base.failed.slice(0, 4) });
if (base.code !== 0) { console.log(base.out.slice(-1800)); process.exit(1); }
const names = [...base.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim());
for (const m of MUTATIONS) for (const w of m.must) {
  ok(`the suite has an assertion starting "${w.slice(0, 46)}"`, names.some((n) => n.startsWith(w)));
}

try {
  for (const m of MUTATIONS) {
    console.log(`\n  MUTATION: ${m.name}`);
    const src = ORIGINAL[m.file];
    const hits = src.split(m.find).length - 1;
    ok('  the patch target is present exactly once', hits === 1, { file: m.file, hits });
    if (hits !== 1) continue;
    fs.writeFileSync(FILES[m.file], src.replace(m.find, m.repl));
    const r = runSuite();
    restore();
    ok('  the suite goes RED', r.code !== 0, { code: r.code, failed: r.failed });
    ok('  it failed an assertion rather than crashing', r.failed.length > 0, { tail: r.out.slice(-260) });
    for (const w of m.must) {
      ok(`  it breaks "${w.slice(0, 46)}"`, r.failed.some((f) => f.startsWith(w)), { expected: w, actually_failed: r.failed });
    }
  }
} finally { restore(); }

let clean = true;
for (const [k, p] of Object.entries(FILES)) if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) clean = false;
ok('every mutated file is byte-identical to how it started', clean);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
