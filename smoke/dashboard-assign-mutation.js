#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the Assigned / Not assigned switches in the gradebook.
//  Break each rule on purpose, one at a time, and require the suite to go red
//  FOR THAT RULE. A green mutation run is a FAILED check, and here that is the
//  exit code.
//
//  Per rule, not in aggregate: "the suite went red" is not evidence that the
//  rule you meant to test does anything, and a mutation that reddens only a
//  neighbouring assertion is reported as a failure. Every case below names the
//  assertions it must break.
//
//  The first two are the bugs this feature actually had, caught by writing the
//  test rather than by reading the code:
//    - the lesson group switch wrote UNIT scope, so clicking above one lesson's
//      columns would have locked the whole unit;
//    - the warning outline sat on every unenforceable column rather than only
//      on ones actually shut, which would have outlined roughly 750 of 757.
//
//  Run: npm run smoke:dashassignmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'dashboard-assign-toggle.js');
const FILE = path.join(ROOT, 'shopify', 'cyber-dashboard.html');
const ORIGINAL = fs.readFileSync(FILE, 'utf8');
const restore = () => fs.writeFileSync(FILE, ORIGINAL);
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 700) : '')); }
};
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|$)/gm)].map((m) => m[1].trim()), out };
}

const MUTATIONS = [
  {
    name: 'THE BUG IT HAD: the lesson group control writes UNIT scope',
    find: "const gs=(this.gates&&gl&&st)?this.lkHtml('lesson',g.unit,gl,''",
    repl: "const gs=(this.gates&&gl&&st)?this.lkHtml('unit',g.unit,gl,''",
    must: ['a lesson group draws a LESSON-scope control, never a unit one'],
  },
  {
    name: 'THE OTHER BUG: the warning marks every unenforceable column, not only shut ones',
    find: "    const lying=(enf===false&&state==='off');",
    repl: "    const lying=(enf===false);",
    must: ['an OPEN column is never marked, even when it could not be enforced'],
  },
  {
    name: 'the control starts calling availability "locked" where a teacher reads it',
    find: "    const what=state==='on'?'Assigned':(state==='mix'?'Partly assigned':'Not assigned');",
    repl: "    const what=state==='on'?'Unlocked':(state==='mix'?'Partly locked':'Locked');",
    must: ['every switch carries an Assigned / Not assigned title'],
  },
  {
    // Mutating inside loadGates' own try/catch proved nothing: the catch
    // swallows it by design, and the first version of this case reported a
    // clean run over a rule it never tested. The rule is that the catch is
    // there, so the mutation removes it and lets the throw reach loadProgress,
    // which blanks the grid.
    name: 'a failed availability fetch takes the gradebook down with it',
    find: '    }catch(e){ this.gates=null; }',
    repl: '    }catch(e){ throw e; }',
    must: ['a thrown request is caught inside loadGates, not propagated'],
  },
  {
    name: 'switches render on columns the contract has never heard of',
    find: 'const it=this.colItem(c);',
    repl: 'const it=this.colItem(c)||{locked:false,lock_enforceable:true};',
    must: ['the unknown column renders no switch'],
  },
  {
    name: 'the header click is no longer stopped, so toggling also navigates',
    find: '    if(ev){ ev.stopPropagation(); ev.preventDefault(); }',
    repl: '    if(ev){ ev.preventDefault(); }',
    must: ['the header cell click is stopped, so it does not also navigate'],
  },
  {
    name: 'a mixed unit settles CLOSED on the first click',
    find: "    const open=(cur==='mix')?true:(cur!=='on');",
    repl: "    const open=(cur==='mix')?false:(cur!=='on');",
    must: ['a MIXED unit settles everything under it OPEN, not closed'],
  },
  {
    name: 'the unit switch starts sending a lesson, narrowing what it claims to set',
    find: "    if(kind!=='unit'){ body.lesson=lesson; body.activity_type=act; }",
    repl: "    body.lesson=lesson; body.activity_type=act;",
    must: ['a unit switch writes unit scope, with no lesson or activity'],
  },
  {
    name: 'the write drops the course, so a solo class resolves the wrong one',
    find: "    const body={course:this.gates.course,unit:unit,open:open};",
    repl: "    const body={unit:unit,open:open};",
    must: ["carrying the course, so a solo class resolves the right one"],
  },
];

console.log('\n  BASELINE (unmutated)');
const base = runSuite();
ok('the suite is green before anything is mutated', base.code === 0, { code: base.code, failed: base.failed.slice(0, 4) });
if (base.code !== 0) { console.log(base.out.slice(-2000)); process.exit(1); }
const names = [...base.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim());
for (const m of MUTATIONS) for (const w of m.must) {
  ok(`the suite has an assertion starting "${w}"`, names.some((n) => n.startsWith(w)));
}

try {
  for (const m of MUTATIONS) {
    console.log(`\n  MUTATION: ${m.name}`);
    const hits = ORIGINAL.split(m.find).length - 1;
    ok('  the patch target is present exactly once', hits === 1, { hits });
    if (hits !== 1) continue;
    fs.writeFileSync(FILE, ORIGINAL.replace(m.find, m.repl));
    const r = runSuite();
    restore();
    ok('  the suite goes RED', r.code !== 0, { code: r.code, failed: r.failed });
    // A mutation that CRASHES the suite has not tested a rule, it has broken the
    // harness, and counting it as a pass is how a battery reports green over
    // nothing.
    ok('  it failed an assertion rather than crashing', r.failed.length > 0,
      { code: r.code, tail: r.out.slice(-300) });
    for (const w of m.must) {
      ok(`  it breaks "${w}"`, r.failed.some((f) => f.startsWith(w)), { expected: w, actually_failed: r.failed });
    }
  }
} finally { restore(); }

ok('the file is byte-identical to how it started', fs.readFileSync(FILE, 'utf8') === ORIGINAL);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
