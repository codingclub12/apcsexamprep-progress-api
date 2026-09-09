#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the analysis migration. Break each rule on purpose, one
//  at a time, and require the suite to go red FOR THAT RULE. A green mutation
//  run is a FAILED check, and here that is the exit code.
//
//  The rules being defended are the reasons the migration happened at all: the
//  answer key must not reach the browser, a closed activity must be withheld
//  from everyone, grading must be re-checked at submit, an activity nobody
//  closed must stay public, and the student's prose must not survive grading.
//
//  Run: npm run smoke:analysismutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILES = {
  route: path.join(ROOT, 'routes', 'analysis.js'),
  spec: path.join(ROOT, 'lib', 'analysis-spec.js'),
  grade: path.join(ROOT, 'lib', 'analysis-grade.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 600) : '')); }
};

const SUITES = {
  gate: path.join(__dirname, 'analysis-gate.js'),
  parity: path.join(__dirname, 'analysis-parity.js'),
};
function runSuite(which) {
  const r = spawnSync(process.execPath, [SUITES[which]], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()), out };
}

const MUTATIONS = [
  {
    //  THE REASON ANY OF THIS EXISTS. Put the answer key back on the wire and the
    //  migration has bought nothing: View Source has the answers again.
    name: 'THE ANSWER KEY GOES BACK ON THE WIRE: forBrowser stops stripping the answer block',
    file: 'spec',
    suite: 'gate',
    find: "  out.specimens = spec.specimens.map((sp) => {\n    const s = {};\n    for (const k of OUT_SPECIMEN) if (sp[k] !== undefined) s[k] = sp[k];\n    return s;\n  });",
    repl: '  out.specimens = spec.specimens;',
    must: ['senderKey is withheld'],
  },
  {
    //  The narrower version: the specimen keeps only its own correct select
    //  values. Still fatal, and a suite that only greps for "senderKey" misses it.
    name: 'a specimen carries its own correct answers, which a key-name grep would not catch',
    file: 'spec',
    suite: 'gate',
    find: "    for (const k of OUT_SPECIMEN) if (sp[k] !== undefined) s[k] = sp[k];\n    return s;",
    repl: "    for (const k of OUT_SPECIMEN) if (sp[k] !== undefined) s[k] = sp[k];\n    s.tactic = sp.answer.tactic; s.type = sp.answer.type;\n    return s;",
    must: ['no specimen carries its own correct answer'],
  },
  {
    name: 'THE LOCK ITSELF: the route stops consulting the gate on render',
    file: 'route',
    suite: 'gate',
    find: '  const gate = gateFor(req, spec);\n  //  A closed activity answers 200',
    repl: '  const gate = { open: true, reason: "self-study" };\n  //  A closed activity answers 200',
    must: ['the signed-in student is refused'],
  },
  {
    name: 'signing out walks past it again: anonymous goes back to automatic self-study',
    file: 'route',
    suite: 'gate',
    find: "    const hit = lockedForAnyClass(anyGateStmt.all(spec.course, unit), lesson, acts);\n    if (hit.locked) return { open: false, reason: 'anonymous-' + hit.reason, scope: hit.scope };",
    repl: '    if (false) return { open: false };',
    must: ['a signed-OUT student is refused too'],
  },
  {
    //  The overcorrection. Refusing everyone everything closes the hole and takes
    //  the public practice layer dark, which is the trade Tanner did not choose.
    name: 'THE OVERCORRECTION: every request is refused, so the public layer goes dark',
    file: 'route',
    suite: 'gate',
    find: '  const stu = student(req);\n  if (!stu) {',
    repl: '  const stu = student(req);\n  if (true) return { open: false, reason: "anonymous-closed-for-activity" };\n  if (!stu) {',
    must: ['an anonymous visitor gets the activity'],
  },
  {
    name: 'the submit path stops re-checking, so a page loaded before the lock still grades',
    file: 'route',
    suite: 'gate',
    find: '  const gate = gateFor(req, spec);\n  if (!gate.open) return res.json(LOCKED_BODY(req.params.course, req.params.item_id, gate));\n\n  const result',
    repl: '  const gate = { open: true };\n  if (!gate.open) return res.json(LOCKED_BODY(req.params.course, req.params.item_id, gate));\n\n  const result',
    must: ['a closed activity refuses to grade'],
  },
  {
    //  The PII line. Echoing the submission back is the easiest way for typed
    //  prose to end up somewhere it was promised never to go.
    name: 'THE PII LINE: the grade response echoes what the student typed',
    file: 'route',
    suite: 'gate',
    find: '  res.json({ locked: false, ...result });',
    repl: '  res.json({ locked: false, ...result, submitted: req.body && req.body.responses });',
    must: ['the response never echoes what they typed'],
  },
  {
    name: 'the stored detail carries the student\'s words instead of booleans',
    file: 'grade',
    suite: 'gate',
    find: '    .map((s) => ({ q: s.n, pts: s.points, ok: s.fields.map((f) => (f.ok ? 1 : 0)) }));',
    repl: '    .map((s) => ({ q: s.n, pts: s.points, ok: s.fields.map((f) => (f.ok ? 1 : 0)), why: s.fields.map((f) => f.detail.text) }));',
    must: ['what may be stored is numbers and booleans only'],
  },
  {
    //  Scoring parity. Any drift here moves a real student's grade.
    name: 'SCORING DRIFT: the text matcher becomes case sensitive',
    file: 'grade',
    suite: 'parity',
    find: '  const lower = String(input).toLowerCase();',
    repl: '  const lower = String(input);',
    must: ['every generated submission scores identically'],
  },
  {
    name: 'SCORING DRIFT: the minimum-length rule is dropped, so an empty answer scores',
    file: 'grade',
    suite: 'parity',
    find: '  const long = value.length > field.min_length;',
    repl: '  const long = true;',
    must: ['every generated submission scores identically'],
  },
  {
    name: 'SCORING DRIFT: a select scores on a loose match instead of an exact one',
    file: 'grade',
    suite: 'parity',
    find: '    const ok = rawValue !== undefined && rawValue !== null && String(rawValue) === answer[field.key];',
    repl: '    const ok = rawValue !== undefined && rawValue !== null && String(rawValue).length > 0;',
    must: ['every generated submission scores identically'],
  },
  {
    //  An unattempted specimen scored as a zero is the failure the gradebook
    //  contract names explicitly: not attempted and scored zero are different.
    name: 'an unattempted specimen is graded as a zero instead of left alone',
    file: 'grade',
    suite: 'gate',
    find: '    if (!has) {\n      specimens.push({ n: sp.n, attempted: false,',
    repl: '    if (false) {\n      specimens.push({ n: sp.n, attempted: false,',
    must: ['an unattempted specimen is marked unattempted, not scored zero'],
  },
  {
    //  The half that made the padlock lie in the first place.
    name: 'the gradebook forgets analysis activities, so the padlock is decorative again',
    file: 'contract',
    suite: 'gate',
    //  Retargeted 2026-09-09. labLocations and analysisLocations became one
    //  specAliasGroups(), because the lab half needed the alias GROUPS and two
    //  lists built the same way from two modules is how the two halves drifted
    //  in the first place. Same mutation: drop the analysis specs and an
    //  analysis lock goes back to being drawn as decoration.
    find: "  add('./analysis-spec');",
    repl: '',
    must: ['and the lock is now ENFORCEABLE, which is the whole point of the migration'],
  },
  {
    //  Only the spec's own name registered, so the column a teacher actually
    //  clicks would still read as unenforceable.
    name: 'only the spec name is registered as enforceable, not the column a teacher clicks',
    file: 'contract',
    suite: 'gate',
    find: '    for (const act of g.names) {',
    repl: '    for (const act of [g.names[0] === "lab" ? "terminal-lab" : "lab"]) {',
    must: ['and the lock is now ENFORCEABLE, which is the whole point of the migration'],
  },
];

console.log('\n  MUTATION BATTERY: analysis migration\n');
const base = {};
for (const k of Object.keys(SUITES)) {
  base[k] = runSuite(k);
  ok(`the ${k} suite is green before anything is mutated`, base[k].code === 0, base[k].failed.slice(0, 3));
}
const names = Object.values(base).flatMap((b) => [...b.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim()))
  .concat(['every generated submission scores identically']);
for (const m of MUTATIONS) for (const w of m.must) {
  ok(`the suite has an assertion starting "${w.slice(0, 46)}"`, names.some((n) => n.startsWith(w)), w);
}

for (const m of MUTATIONS) {
  console.log(`\n  MUTATION: ${m.name}`);
  const p = FILES[m.file];
  const src = ORIGINAL[m.file];
  const n = src.split(m.find).length - 1;
  ok('  the patch target is present exactly once', n === 1, { found: n, file: m.file });
  if (n !== 1) continue;
  fs.writeFileSync(p, src.replace(m.find, m.repl));
  const r = runSuite(m.suite);
  restore();
  ok('  the suite goes RED', r.code !== 0, { code: r.code, failed: r.failed.slice(0, 4) });
  ok('  it failed an assertion rather than crashing', r.failed.length > 0, { tail: r.out.slice(-500) });
  for (const w of m.must) {
    ok(`  it breaks "${w.slice(0, 46)}"`, r.failed.some((f) => f.startsWith(w)), { expected: w, actually_failed: r.failed.slice(0, 5) });
  }
}

restore();
let clean = true;
for (const [k, p] of Object.entries(FILES)) if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) clean = false;
ok('every mutated file is byte-identical to how it started', clean);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
