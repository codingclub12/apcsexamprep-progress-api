#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY FOR THE SCRAPED CARRIER RULE: break it on purpose, one call
//  site at a time, and require smoke/reporter-carrier.js to go red FOR THAT RULE.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK, and here that is the exit code.
//
//  ── WHY THIS ONE NEEDS A BATTERY MORE THAN MOST ─────────────────────────────
//  The rule lives in three readers of one ledger, and every one of them can be
//  wrong on its own while the other two are right. That is not hypothetical:
//  'lesson-score' was excluded in scoring.js for months while
//  admin-denominators.js summed it, and the coverage view reported eighteen
//  corrupted columns in a gradebook that was correct the whole time. So each
//  reader gets its own mutation, and a mutation that reddens the suite
//  SOMEWHERE ELSE is reported as a failure, not a pass.
//
//  ── THE TWO DIRECTIONS ──────────────────────────────────────────────────────
//  Restoring the sum is the defect that shipped. Excluding the carrier outright
//  is the fix somebody reaches for next, and it deletes the grade on every page
//  whose only writer is the reporter. Both must go red, and against DIFFERENT
//  assertions, or the suite is only testing one half of the rule.
//
//  Every patch is asserted to apply. A find string that silently missed after a
//  refactor would report a clean run over code it never touched, which is the
//  precise failure this exists to prevent. Originals are restored in a finally
//  and on SIGINT.
//
//  Offline: no network, no secrets.
//
//  Run: npm run smoke:carriermutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'reporter-carrier.js');

const FILES = {
  scoring: path.join(ROOT, 'scoring.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
  denoms: path.join(ROOT, 'lib', 'admin-denominators.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
function restore() { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); }
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('    ok    ' + name); }
  else { fail++; console.log('    FAIL  ' + name + (extra !== undefined ? '\n            ' + JSON.stringify(extra).slice(0, 700) : '')); }
};

function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const failed = [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|$)/gm)].map((m) => m[1].trim());
  // A mutation that stops the suite LOADING exits 1 with no verdict, and read as
  // "red" it certifies a rule nothing tested. The first draft of this battery
  // scored exactly that as a pass, on a mutation that was really a
  // ReferenceError. The summary line is the proof the suite ran to the end.
  const ran = /\d+ passed, \d+ failed/.test(out);
  return { code: r.status, failed, crashed: !ran || (r.status !== 0 && r.status !== 1), out };
}

// `must` names assertions the mutation has to break, matched by prefix so a
// wording tweak does not silently disarm the battery. A `must` entry that
// matches nothing is itself a failure: it means this is aimed at an assertion
// that no longer exists.
const MUTATIONS = [
  {
    name: 'THE ONE THAT SHIPPED: the reader sums the carrier beside the named item',
    file: 'contract',
    find: "  ) WHERE rn = 1 AND ${keepItemSql('item', 'has_named')}",
    repl: '  ) WHERE rn = 1',
    must: ['exercise-1 is 7 out of 7, not 14 out of 14',
      'earned 23 over graded 27',
      'first-attempt mode reads 5 out of 7, not 10 out of 14'],
  },
  {
    name: 'the blunt fix: the carrier excluded outright, so a one-writer page loses its grade',
    file: 'contract',
    find: "WHERE se.class_id = ? AND se.course = ? AND se.item <> '${LESSON_SCORE_ITEM}'",
    repl: "WHERE se.class_id = ? AND se.course = ? AND se.item <> '${LESSON_SCORE_ITEM}'"
      + " AND se.item <> '${REPORTER_TOTAL_ITEM}'",
    must: ['exercise-2 keeps 12 out of 15'],
  },
  {
    name: 'progress.score goes back to summing both writers',
    file: 'scoring',
    find: "  ) WHERE ${keepItemSql('item', 'has_named')}\n`);",
    repl: '  )\n`);',
    must: ['the rollup returned by the write path is 7 of 7'],
  },
  {
    name: 'the re-pricing proposal observes the doubled total again',
    file: 'denoms',
    find: "  ) WHERE ${keepItemSql('item', 'has_named')}\n  GROUP BY unit, lesson, activity_type, student_id",
    repl: '  )\n  GROUP BY unit, lesson, activity_type, student_id',
    must: ['every observed total for exercise-1 is 7',
      '14 is nowhere in them, so adopt cannot author it'],
  },
  {
    name: 'the flag ignores the partition, so one page-named item anywhere silences every carrier',
    file: 'contract',
    find: "${namedItemFlagSql('se.item', 'se.student_id, se.unit, se.lesson, se.activity_type')} AS has_named",
    repl: "${namedItemFlagSql('se.item', '')} AS has_named",
    must: ['exercise-2 keeps 12 out of 15'],
  },
];

console.log('\nMUTATION BATTERY: the scraped carrier rule\n');

try {
  console.log('  baseline: the suite passes unmutated');
  const b = runSuite();
  ok('baseline is green', b.code === 0, b.failed);
  if (b.code !== 0) { console.log(b.out.slice(-1500)); throw new Error('baseline red, nothing below means anything'); }

  for (const m of MUTATIONS) {
    console.log('\n  ' + m.name);
    const p = FILES[m.file];
    const src = ORIGINAL[m.file];
    const applies = src.includes(m.find);
    ok('patch target still exists in ' + path.relative(ROOT, p), applies, m.find.slice(0, 90));
    if (!applies) continue;
    fs.writeFileSync(p, src.replace(m.find, m.repl));
    const r = runSuite();
    restore();

    ok('the suite goes red', r.code === 1 && !r.crashed, { code: r.code, failed: r.failed.slice(0, 6) });
    for (const want of m.must) {
      const hit = r.failed.some((f) => f.startsWith(want));
      ok('and it is THIS assertion that breaks: ' + want, hit, r.failed);
    }
  }
} finally {
  restore();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
