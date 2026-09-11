#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY FOR THE ROLLUP RULES: break each one on purpose, one at a
//  time, and require smoke/gradebook-rollup.js to go red FOR THAT RULE.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK, and here that is the exit code.
//
//  ── WHY PER RULE AND NOT IN AGGREGATE ───────────────────────────────────────
//  The same arithmetic is applied in six places (the lesson cell, the lesson
//  footer, the column footer, the activity rollup, the student row, the class
//  average) and any one of them can rot while the other five hold. That is not
//  hypothetical: five of the six were wrong for six days after the student row
//  was fixed, with every gradebook suite in this repo green the whole time. A
//  battery that only asked "did the suite go red" would certify a level no
//  assertion covers, which is exactly how this happened.
//
//  ── THE TEMPTING WRONG FIXES GET THEIR OWN MUTATIONS ────────────────────────
//  Three of these are not the defect that shipped, they are the repair somebody
//  reaches for next, and each has to be refused by a named assertion:
//    - dividing the grade by the COURSE total instead of the attempted total,
//      which is the one arithmetic board 85 spells out as forbidden and reads
//      as a student failing for work they have not reached yet
//    - deleting the percent fallback on an unpriced column, "points only, no
//      exceptions", which blanks a real number on a teacher's screen where
//      nobody has authored an out-of yet
//    - flagging every completed cell with no score, visits included, which
//      turns the lost-score mark into noise on every class
//
//  Every patch is asserted to apply. A find string that silently missed after a
//  refactor would report a clean run over code it never touched, and a `must`
//  entry that matches nothing is itself a failure: it means this is aimed at an
//  assertion that no longer exists.
//
//  Offline: no network, no secrets.
//
//  Run: npm run smoke:gbrollupmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'gradebook-rollup.js');

const FILES = {
  admin: path.join(ROOT, 'lib', 'admin-gradebook.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
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
  // A mutation that stops the suite LOADING exits non-zero with no verdict, and
  // read as "red" it certifies a rule nothing tested. The summary line is the
  // proof the suite ran to the end.
  const ran = /(OK - all \d+ checks passed|\d+ FAILED \(\d+ passed\))/.test(out);
  return { code: r.status, failed, crashed: !ran, out };
}

const MUTATIONS = [
  {
    name: 'THE ONE THAT SHIPPED: the lesson cell percent is a mean of its item percentages',
    file: 'admin',
    find: '      const points = whole ? gradePct(la.earned, la.possible) : null;',
    repl: '      const points = null;',
    must: ['the lesson percent is 33, the marks answer',
      'and NOT the 60 a mean of the two item percentages gives',
      'the lesson percent equals its own displayed fraction'],
  },
  {
    name: 'THE ONE THAT SHIPPED: the column footer averages student percentages',
    file: 'admin',
    find: `    it.class_avg_pct = points != null ? round(points) : (n ? round(sum / n) : null);`,
    repl: `    it.class_avg_pct = n ? round(sum / n) : null;`,
    must: ['19 of 22 is 86', 'and NOT the 70 that averaging 90 and 50 gives'],
  },
  {
    name: 'THE ONE THAT SHIPPED: the lesson footer averages student percentages',
    file: 'admin',
    find: `    l.class_avg_pct = points != null ? round(points) : (n ? round(sum / n) : null);`,
    repl: `    l.class_avg_pct = n ? round(sum / n) : null;`,
    must: ['lesson 1.3 averages 19 of 22, not 90 and 50'],
  },
  {
    name: 'THE ONE THAT SHIPPED: the class average is a mean of student grades',
    file: 'admin',
    find: `      class_avg_pct: classPoints != null ? round(classPoints)
        : (withScores.length`,
    repl: `      class_avg_pct: (false
        ? null
        : withScores.length`,
    must: ['the class average is 39 of 62, which is 63',
      'and NOT the 74 a mean of the two student grades gives'],
  },
  {
    name: 'THE ONE THAT SHIPPED: the activity rollup is a mean of column averages',
    file: 'admin',
    find: `    if (it.class_graded != null) { c.earned += it.class_earned; c.graded += it.class_graded; }
    else if (it.class_avg_pct != null) {`,
    repl: `    if (it.class_avg_pct != null) {`,
    must: ['the quiz rollup is 24 of 47, which is 51'],
  },
  {
    name: 'THE COLLAPSE: `possible` carries the attempted sum again',
    file: 'admin',
    find: `        graded: Math.round(possibleSum * 100) / 100,
        possible: coursePossible,`,
    repl: `        graded: Math.round(possibleSum * 100) / 100,
        possible: Math.round(possibleSum * 100) / 100,`,
    must: ['possible is the whole course, a bigger number',
      'every student reports the same course total'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: divide the grade by the course total',
    file: 'admin',
    find: '    const overallPoints = gradePct(earnedSum, possibleSum);',
    repl: '    const overallPoints = gradePct(earnedSum, coursePossible);',
    must: ['the grade divides by graded: 28 of 50 is 56'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: points only, so an unpriced column reports nothing',
    file: 'admin',
    find: `    it.class_avg_pct = points != null ? round(points) : (n ? round(sum / n) : null);`,
    repl: `    it.class_avg_pct = points != null ? round(points) : null;`,
    must: ['an unpriced column falls back to the mean, 75'],
  },
  {
    name: 'THE ONE THAT SHIPPED: a lost score reads as done',
    file: 'admin',
    find: '        if (it.graded_kind) { cell.score_missing = true; scoreMissing += 1; }',
    repl: '',
    must: ['the lost cell is flagged score_missing', 'the student row tallies it'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: flag every completed cell with no score, visits included',
    file: 'admin',
    find: '        if (it.graded_kind) { cell.score_missing = true; scoreMissing += 1; }',
    repl: '        { cell.score_missing = true; scoreMissing += 1; }',
    must: ['a lesson visit beside it is NOT counted as a missing grade'],
  },
  {
    name: 'NOTHING ATTEMPTED READS AS ZERO: gradePct returns 0 instead of null',
    file: 'contract',
    find: '  return graded > 0 ? (earned / graded) * 100 : null;',
    repl: '  return graded > 0 ? (earned / graded) * 100 : 0;',
    must: ['a column nobody has touched has no average at all'],
  },
  {
    name: 'THE DRIFT ITSELF: the contract class average goes back to a mean',
    file: 'contract',
    find: '      class_pct: classGraded > 0 ? round1(gradePct(classEarned, classGraded)) : null,',
    repl: `      class_pct: scored.length
        ? round1(scored.reduce((n, s) => n + s.overall.pct, 0) / scored.length) : null,`,
    must: ['same class average'],
  },
];

console.log('MUTATION BATTERY: lib/admin-gradebook.js rollup rules, board 85');
console.log('A green run here is a FAILED check.\n');

try {
  // The unmutated suite must be green first. A battery run against an already
  // red suite reports every mutation as a success and means nothing.
  console.log('0. The suite is green before anything is broken');
  const base = runSuite();
  ok('baseline passes', base.code === 0 && base.failed.length === 0,
    { code: base.code, failed: base.failed.slice(0, 5) });
  if (base.code !== 0) {
    console.log('\nBaseline is red. Fix the suite before reading anything below.');
    console.log(base.out.split('\n').filter((l) => l.includes('[FAIL]')).slice(0, 10).join('\n'));
    restore();
    process.exit(1);
  }

  MUTATIONS.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.name}`);
    const p = FILES[m.file];
    const src = ORIGINAL[m.file];
    const hits = src.split(m.find).length - 1;
    ok('the patch applies, and to exactly one place', hits === 1, { hits, file: m.file });
    if (hits !== 1) return;

    fs.writeFileSync(p, src.replace(m.find, m.repl));
    const r = runSuite();
    fs.writeFileSync(p, src);

    ok('the suite still ran to the end', !r.crashed,
      r.crashed ? r.out.split('\n').slice(-6).join(' | ') : undefined);
    ok('the suite went red', r.code !== 0 && r.failed.length > 0, { code: r.code });
    for (const want of m.must) {
      ok(`it broke the assertion that names it: "${want}"`,
        r.failed.some((f) => f.startsWith(want)),
        { wanted: want, got: r.failed.slice(0, 8) });
    }
  });
} finally {
  restore();
}

// Restoration is the one thing a battery must never get wrong: a mutation left
// on disk is a defect committed by whoever runs `git add -A` next, and that has
// happened in this repo.
const dirty = Object.entries(FILES).filter(([k, p]) => fs.readFileSync(p, 'utf8') !== ORIGINAL[k]);
ok('every mutated file is back to how it was found', dirty.length === 0, dirty.map(([k]) => k));

console.log('\n' + (fail === 0 ? `${pass} passed, 0 failed` : `${fail} FAILED (${pass} passed)`));
process.exit(fail === 0 ? 0 : 1);
