#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY FOR ASSIGNMENT LOCKING: break each rule on purpose, one at a
//  time, and require smoke/gate-scope.js to go red FOR THAT RULE.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK, and here that is the exit code.
//
//  ── WHY PER-RULE AND NOT IN AGGREGATE ───────────────────────────────────────
//  "The suite went red" is not evidence that the rule you meant to test does
//  anything. Two guards in this repo were found hollow in exactly that way: the
//  suite went red for a NEIGHBOURING assertion while the rule under test sat
//  there doing nothing. So each case below names the assertions it must turn
//  red, and a mutation that reddens the suite somewhere ELSE is reported as a
//  FAILURE, not a pass. The rule is only proven when its own assertion is the
//  one that breaks.
//
//  ── WHY THE SOURCE IS PATCHED AND THE SUITE RE-RUN ──────────────────────────
//  These rules are not content rules that can be reached by editing an input.
//  They are decisions spread across four files: the specificity ladder in the
//  resolver, the SQL that decides which rows the render path can even see, the
//  submit-time re-check, and what the gradebook contract reports. A unit-scope
//  lock that the render SQL cannot see is the whole bug this feature had to
//  avoid, and no input can provoke it. So the battery patches the file, runs the
//  real suite as a subprocess against a real SQLite file, and restores.
//
//  Every patch is asserted to actually apply. A find string that silently missed
//  after a refactor would report a clean run over code it never touched, which
//  is the precise failure this exists to prevent.
//
//  The originals are restored in a finally, and on SIGINT, because leaving a
//  mutated resolver on disk would be worse than not running this at all.
//
//  Offline: no network, no secrets.
//
//  Run: npm run smoke:gatescopemutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'gate-scope.js');

const FILES = {
  gate: path.join(ROOT, 'lib', 'activity-gate.js'),
  quiz: path.join(ROOT, 'routes', 'quiz.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
  teacher: path.join(ROOT, 'routes', 'teacher.js'),
  page: path.join(ROOT, 'public', 'teacher-assignments.html'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');

function restore() {
  for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]);
}
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('    ok    ' + name); }
  else { fail++; console.log('    FAIL  ' + name + (extra !== undefined ? '\n            ' + JSON.stringify(extra, null, 2).slice(0, 900) : '')); }
};

// Run the suite and return which assertion names failed.
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const failed = [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|$)/gm)].map((m) => m[1].trim());
  return { code: r.status, failed, crashed: r.status !== 0 && r.status !== 1, out };
}

// ── THE MUTATIONS ────────────────────────────────────────────────────────────
//  `must` names assertions from smoke/gate-scope.js that this mutation has to
//  break. Matching is by prefix so a later wording tweak in the suite does not
//  silently disarm the battery; a `must` entry that matches nothing at all is
//  itself reported, because that means the battery is aimed at an assertion that
//  no longer exists.
const MUTATIONS = [
  {
    name: 'ladder order reversed: a wider scope outranks a narrower one',
    file: 'gate',
    find: "const SCOPES = ['activity', 'lesson', 'unit-activity', 'unit'];",
    repl: "const SCOPES = ['unit', 'unit-activity', 'lesson', 'activity'];",
    must: ['lesson beats unit', 'activity beats lesson'],
  },
  {
    name: 'the lesson-versus-unit-activity tie decided by row order instead',
    file: 'gate',
    //  Anchored with the two lines that follow, because lockedForAnyClass runs
    //  the same ladder and the bare line now appears twice in this file. The
    //  mutation is about pickGateRow, so the anchor has to name pickGateRow.
    find: '    if (rank < bestRank) { best = row; bestRank = rank; }\n  }\n  return best;',
    repl: '    if (best === null) { best = row; bestRank = rank; }\n  }\n  return best;',
    // All three, and the middle one is the reason this case exists. The first
    // assertion once passed under this very mutation because the lesson row
    // happened to come back from SQL first, so the suite was asserting the
    // insert order rather than the ladder. Writing the rows the other way round
    // as well is what makes the DB-mediated pair honest.
    must: ['the tie: lesson scope outranks activity-type-across-the-unit',
      'the tie holds with the rows written in the opposite order',
      'the tie is decided by the ladder, not by row order'],
  },
  {
    name: 'wildcard rows ignored: only an exact lesson match counts',
    file: 'gate',
    find: "    if (row.lesson !== SCOPE_ALL && row.lesson !== lesson) continue;",
    repl: "    if (row.lesson !== lesson) continue;",
    must: ['unit scope: a whole unit locks in one call',
      'render: a UNIT-scope lock closes the quiz'],
  },
  {
    name: 'render path back to equality SQL: unit rows invisible to it',
    file: 'quiz',
    find: `const gateStmt = db.prepare(\`
  SELECT lesson, activity_type, open FROM activity_gates
  WHERE class_id = ? AND course = ? AND unit = ?
\`);`,
    repl: `const gateStmt = db.prepare(\`
  SELECT lesson, activity_type, open FROM activity_gates
  WHERE class_id = ? AND course = ? AND unit = ? AND lesson != '*'
\`);`,
    must: ['render: a UNIT-scope lock closes the quiz',
      'submit: a token minted before the unit lock is refused'],
  },
  {
    name: 'submit-time re-check removed: a stale token still spends',
    file: 'quiz',
    find: '      const gRows = gateStmt.all(req.student.class_id, course, unit);',
    repl: '      const gRows = [];',
    must: ['submit: a token minted before the unit lock is refused'],
  },
  {
    name: 'questions put on the wire alongside the locked flag',
    file: 'quiz',
    find: '        order_token: null, total: 0, pool: rows.length, questions: null,',
    repl: '        order_token: null, total: 0, pool: rows.length, questions: rows,',
    must: ['render: no questions reach the wire under a unit lock'],
  },
  {
    name: 'every lock reported enforceable, including the page-body quizzes',
    file: 'contract',
    find: "    it.lock_enforceable = bankKeys.has(`${it.unit}|${it.lesson_ref}|${it.native_activity}`);",
    repl: '    it.lock_enforceable = true;',
    must: ['contract: a lock on a page-body quiz is reported as NOT enforceable',
      'contract: the unenforceable locks are named, not just counted'],
  },
  {
    name: 'mixed roll-up collapsed into locked',
    file: 'contract',
    find: "    state: r.locked === 0 ? 'none' : (r.locked === r.items ? 'all' : 'mixed'),",
    repl: "    state: r.locked === 0 ? 'none' : 'all',",
    must: ['contract: a unit with some columns open reports mixed'],
  },
  {
    name: 'contract stops resolving the ladder and reads the class default only',
    file: 'contract',
    find: '    const row = pickGateRow(inUnit, it.lesson_ref, it.native_activity);',
    repl: '    const row = null;',
    must: ['contract: an item under the locked unit is marked locked',
      'contract agrees with the render path on the same column'],
  },
  {
    name: 'clear turns into an explicit open instead of removing the row',
    file: 'teacher',
    find: `  const info = db.prepare(\`
    DELETE FROM activity_gates
    WHERE class_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
  \`).run(cls.id, course, unit, lesson, activity_type);`,
    repl: `  const info = db.prepare(\`
    UPDATE activity_gates SET open = 1
    WHERE class_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
  \`).run(cls.id, course, unit, lesson, activity_type);`,
    must: ['after clearing, the unit decides the lesson again'],
  },
  {
    name: 'an omitted lesson stops meaning "all of them"',
    file: 'teacher',
    find: "  const wide = (v) => (v === undefined || v === null || v === '' ? SCOPE_ALL : String(v).trim());",
    repl: "  const wide = (v) => (v === undefined || v === null || v === '' ? '' : String(v).trim());",
    must: ['POST /gate with no lesson writes a unit-scope row'],
  },
  {
    name: 'a pattern in an id is accepted, so one row can address a scope it does not describe',
    file: 'teacher',
    find: '    if (v !== SCOPE_ALL && v.includes(SCOPE_ALL)) {',
    repl: '    if (false) {',
    must: ['a pattern smuggled into a unit id is refused'],
  },
  {
    name: 'legacy activity-scope reason strings renamed',
    file: 'gate',
    find: "    const reason = scope === 'activity' ? `explicit-${suffix}` : `${scope}-${suffix}`;",
    repl: '    const reason = `${scope}-${suffix}`;',
    must: ['activity scope keeps the reason string this repo has always emitted',
      'legacy row: reason string unchanged'],
  },
  {
    // The key is a bare string shared across three pages on two origins, which
    // is exactly the kind of thing that drifts without anyone noticing. It
    // already had: the board shipped reading apcs_teacher_token, and nothing
    // writes that.
    name: 'the board stops reading the token key the Command Center writes',
    file: 'page',
    find: '      return localStorage.getItem("apcse_teacher_token") ||',
    repl: '      return localStorage.getItem("apcs_teacher_token") ||',
    must: ['page: it rendered a board'],
  },
  {
    name: 'the page collapses mixed into one of the settled states',
    file: 'page',
    find: '      if (roll.state === "none") return "on";\n      return "mixed";',
    repl: '      if (roll.state === "none") return "on";\n      return "on";',
    must: ['page: the half-open unit draws a MIXED switch'],
  },
  {
    name: 'the page stops marking a lock the server cannot enforce',
    file: 'page',
    find: '                    (it.locked && !it.lock_enforceable ? " noforce" : "");',
    repl: '                    "";',
    must: ['page: an unenforceable lock is marked on the control itself'],
  },
  {
    name: 'the page drops the banner about unenforceable locks',
    file: 'page',
    find: '    if (nf.length) {',
    repl: '    if (false) {',
    must: ['page: the banner names the unenforceable locks'],
  },
  {
    name: 'the assignment board starts leaking the roster',
    file: 'teacher',
    find: '      class: gb.class,\n      course: gb.course,',
    repl: '      class: gb.class,\n      students: gb.students,\n      course: gb.course,',
    must: ['page: the endpoint returns no roster and no names'],
  },
];

// ── BASELINE ─────────────────────────────────────────────────────────────────
console.log('\n  BASELINE (unmutated)');
const baseline = runSuite();
ok('the suite is green before anything is mutated', baseline.code === 0,
  { code: baseline.code, failed: baseline.failed.slice(0, 5) });
if (baseline.code !== 0) {
  console.log('\n  Refusing to mutate a suite that is already red. Fix it first.');
  console.log(baseline.out.slice(-2500));
  process.exit(1);
}
// Every assertion the battery aims at must exist, or a rename has quietly
// disarmed the case that guards it.
const names = [...baseline.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim());
for (const m of MUTATIONS) {
  for (const want of m.must) {
    ok(`the suite has an assertion starting "${want}"`,
      names.some((n) => n.startsWith(want)));
  }
}

// ── RUN EACH MUTATION ────────────────────────────────────────────────────────
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
    ok('  it did not crash instead of failing an assertion', !r.crashed || r.failed.length > 0,
      { code: r.code, tail: r.out.slice(-400) });
    // The rule under test is the one that broke. A mutation that reddens only a
    // neighbouring assertion is telling us this rule is hollow.
    for (const want of m.must) {
      ok(`  it breaks "${want}"`, r.failed.some((f) => f.startsWith(want)),
        { expected: want, actually_failed: r.failed });
    }
  }
} finally {
  restore();
}

// The restore has to be provable, not assumed: a battery that leaves a mutated
// resolver behind is a worse outcome than never running.
let restored = true;
for (const [k, p] of Object.entries(FILES)) {
  if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) restored = false;
}
ok('every mutated file is byte-identical to how it started', restored);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
