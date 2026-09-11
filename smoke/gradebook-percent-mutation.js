#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY FOR THE PERCENTAGE RULES: break each one on purpose, one at
//  a time, and require smoke/gradebook-percent.js to go red FOR THAT RULE.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK, and here that is the exit code.
//
//  ── WHY PER RULE AND NOT IN AGGREGATE ───────────────────────────────────────
//  Four independent guards produced the one symptom a teacher saw, and any of
//  them can rot while the other three hold: the write range check on two
//  endpoints, the read reconciliation of a percent against its own pair, the
//  cap on rows already stored, and the scraped carrier filter. A battery that
//  only asked "did the suite go red" would certify a guard that no assertion
//  covers, which is exactly how board 270 was closed while the route the
//  teacher reads still doubled the carrier.
//
//  ── THE TEMPTING WRONG FIXES GET THEIR OWN MUTATIONS ────────────────────────
//  Two of these are not the defect that shipped, they are the repair somebody
//  reaches for next, and both must be refused by an assertion:
//    - clamping an out-of-range score at WRITE time instead of rejecting it,
//      which hands a student a mastery grade for work nobody measured
//    - excluding the scraped carrier outright instead of only where the page
//      names its own items, which deletes the grade on every page whose sole
//      writer is the reporter
//
//  Every patch is asserted to apply. A find string that silently missed after a
//  refactor would report a clean run over code it never touched. Originals are
//  restored in a finally and on SIGINT.
//
//  Offline: no network, no secrets.
//
//  Run: npm run smoke:gradebookpctmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'gradebook-percent.js');

const FILES = {
  student: path.join(ROOT, 'routes', 'student.js'),
  teacher: path.join(ROOT, 'routes', 'teacher.js'),
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
  const ran = /\d+ passed, \d+ failed/.test(out);
  return { code: r.status, failed, crashed: !ran, out };
}

// `must` names assertions the mutation has to break, matched by prefix so a
// wording tweak does not silently disarm the battery. A `must` entry that
// matches nothing is itself a failure: it means this is aimed at an assertion
// that no longer exists.
const MUTATIONS = [
  {
    name: 'THE ONE THAT SHIPPED: /progress stores any finite number as a percent',
    file: 'student',
    find: `    if (scored && (score < 0 || score > 100)) {
      return res.status(400).json({
        error: 'score must be a percentage between 0 and 100, or omitted',
        received: score,
      });
    }`,
    repl: '',
    must: ['POST /progress refuses 483', 'POST /progress refuses -5'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: clamp the write instead of rejecting it',
    file: 'student',
    find: `    if (scored && (score < 0 || score > 100)) {
      return res.status(400).json({
        error: 'score must be a percentage between 0 and 100, or omitted',
        received: score,
      });
    }`,
    repl: `    const score2 = scored ? Math.max(0, Math.min(100, score)) : null;
    if (scored) { req.body.score = score2; }`,
    must: ['POST /progress refuses 483'],
  },
  {
    name: 'the quiz path loses its range check',
    file: 'student',
    find: `    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({
        error: 'score must be a percentage between 0 and 100',
        received: score,
      });
    }`,
    repl: '',
    must: ['POST /quiz refuses 483'],
  },
  {
    name: 'the cell percent goes back to the progress table, ignoring its own pair',
    file: 'teacher',
    find: `      if (score != null && earned != null) {
        score = pctOf(earned, possible);
        scoreRaw = null;
      }`,
    repl: '',
    must: ['Leo byun    percent equals its own fraction', 'Leo byun reads 29 / 30 at 97%'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: reconcile every cell that has a pair, reset or not',
    file: 'teacher',
    find: '      if (score != null && earned != null) {',
    repl: '      if (earned != null) {',
    must: ['after the reset the percent is gone, not recomputed from the ledger'],
  },
  {
    name: 'a percent already stored out of range is served raw',
    file: 'teacher',
    find: `    if (score != null && (score < 0 || score > 100)) {
      scoreRaw = score;
      score = Math.max(0, Math.min(100, score));
    }`,
    repl: '',
    must: ['the stored 483 is served as 100'],
  },
  {
    name: 'the cap stops saying it capped anything',
    file: 'teacher',
    find: `      ...(scoreRaw != null ? { score_out_of_range: scoreRaw } : {}),\n`,
    repl: '',
    must: ['and the raw value is carried so the cap stays visible'],
  },
  {
    name: 'THE MISSED CONSUMER: the route sums the scraped carrier again',
    file: 'teacher',
    find: `    ) WHERE rn = 1 AND ${'${keepItemSql('}'item', 'has_named')}
    GROUP BY student_id, unit, lesson, activity_type`,
    repl: `    ) WHERE rn = 1
    GROUP BY student_id, unit, lesson, activity_type`,
    must: ['the doubled pair reads 7 / 7 under a /7 header'],
  },
  {
    name: 'the CSV export serves a stored out-of-range percent raw',
    file: 'teacher',
    find: `      if (p.score != null && (p.score < 0 || p.score > 100)) {
        p.score = Math.max(0, Math.min(100, p.score));
      }\n`,
    repl: '',
    must: ['the raw 483 does not appear anywhere in the file'],
  },
  {
    name: 'the CSV export sums the scraped carrier (its own copy of the ledger)',
    file: 'teacher',
    find: `      ) WHERE ${'${keepItemSql('}'item', 'has_named')}
      GROUP BY student_id, unit, lesson, activity_type`,
    repl: `      )
      GROUP BY student_id, unit, lesson, activity_type`,
    must: ['the doubled pair exports as 7/7, never 14/14'],
  },
  {
    name: 'THE TEMPTING WRONG FIX: drop the carrier outright',
    file: 'teacher',
    find: `        AND se.item <> '${'${LESSON_SCORE_ITEM}'}'`,
    repl: `        AND se.item <> '${'${LESSON_SCORE_ITEM}'}' AND se.item <> 'score'`,
    must: ['a page whose only writer is the carrier keeps its grade'],
  },
];

(function main() {
  console.log('\nMUTATION BATTERY: the gradebook percentage rules\n');
  console.log('A mutation that leaves the suite GREEN is a failure of this battery.\n');
  try {
    for (const m of MUTATIONS) {
      console.log('  ' + m.name);
      const p = FILES[m.file];
      const src = ORIGINAL[m.file];
      const n = src.split(m.find).length - 1;
      ok('patch applies exactly once to ' + path.basename(p), n === 1, { matches: n });
      if (n !== 1) { console.log(); continue; }
      fs.writeFileSync(p, src.replace(m.find, m.repl));
      const r = runSuite();
      restore();

      ok('the suite ran to a verdict (not a crash)', !r.crashed,
        r.crashed ? r.out.slice(-400) : undefined);
      if (r.crashed) { console.log(); continue; }
      ok('the suite went red', r.failed.length > 0);
      for (const want of m.must) {
        ok('and red ON: "' + want + '"',
          r.failed.some((f) => f.startsWith(want)), { actually_failed: r.failed });
      }
      console.log();
    }
  } finally {
    restore();
  }

  // The battery is worthless if the restored tree is not the tree we started
  // with, so prove it rather than trust the finally.
  for (const [k, p] of Object.entries(FILES)) {
    ok('restored ' + path.basename(p), fs.readFileSync(p, 'utf8') === ORIGINAL[k]);
  }
  const clean = runSuite();
  ok('and the unmutated suite is green', clean.code === 0 && clean.failed.length === 0,
    clean.failed);

  console.log('\n──────────────────────────────────────────');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
