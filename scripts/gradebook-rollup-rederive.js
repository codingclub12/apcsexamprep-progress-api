#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A SECOND IMPLEMENTATION OF THE GRADEBOOK ROLLUP, REACHING THE SAME NUMBERS.
//
//  WHY A SECOND ONE
//  The rollup rules in lib/admin-gradebook.js live inside one long loop over a
//  column grid: a cell source precedence, a denominator lookup, a points sum per
//  student, and four averages over that. A suite written against that code
//  agrees with it by construction. Every real defect in this repo has been
//  caught by a DIFFERENT KIND of check from the ones passing at the time, and
//  this one was found by comparing two builders, not by any suite.
//
//  So this reads raw rows with plain SELECTs, groups them in JavaScript, applies
//  the rules by hand, and requires buildGradebook to agree on every cell, every
//  student total, every column average, every lesson average, and the class
//  average. Nothing is imported from lib/admin-gradebook.js or from
//  lib/gradebook-contract.js: not the grid, not pointsFromRatio, not gradePct.
//
//  WHY THE CASES ARE GENERATED
//  A list of known-bad shapes only catches the shapes somebody thought of. This
//  generates cells across the axes that decide the answer: which pipeline wrote
//  the cell (attempts or a rolled-up percent), whether a denominator was
//  authored, whether the page reported its own out-of, how heavy the column is,
//  and whether the student finished it with no score at all. The seed is
//  printed, so a failure reproduces exactly.
//
//  WHAT IT DELIBERATELY DOES NOT COVER
//  Retry policy. Every generated item carries a single attempt, so the grade of
//  record is unambiguous and this script says nothing about best-of versus
//  first-attempt. That branch is covered by smoke:attemptretrymodes and by
//  scripts/gradebook-percent-rederive.js, which runs under both modes. Claiming
//  it here would be claiming a check this does not make.
//
//  Offline: a throwaway SQLite file, no network, no secrets. Zero PII:
//  synthetic names, never printed.
//
//  Run: node scripts/gradebook-rollup-rederive.js [--seed N] [--cells N]
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const SEED = arg('--seed', Date.now() % 100000);
const CELLS = arg('--cells', 120);

process.env.DB_PATH = path.join(__dirname, '..', 'smoke', 'gradebook-rollup-rederive.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { buildGradebook } = require('../lib/admin-gradebook');

// Deterministic PRNG, so --seed reproduces a failure exactly.
let s = (SEED >>> 0) || 1;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const COURSE = 'ap-cybersecurity';
const CLASS_ID = 'c_rd';
const CODE = 'CYBER-RD';
const THRESHOLD = 80;
// Regular lessons only, in two units. The cyber config gives EVERY unit a lesson
// called 'exam' and one called 'case-file', so an authored denominator keyed by
// (lesson, activity) would land on one grid column per unit and be counted more
// than once by the course total. Avoided here rather than special cased, and
// said out loud so nobody reads this restriction as an accident.
const LESSONS = [['unit-1', '1.1'], ['unit-1', '1.2'], ['unit-1', '1.3'],
  ['unit-2', '2.1'], ['unit-2', '2.2']];
const GRADED_ACTS = ['exercise-1', 'quiz', 'lab'];
const WEIGHTS = [1, 3, 5, 10, 25];

const run = (q, ...a) => db.prepare(q).run(...a);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,games_graded)
     VALUES (?,?,'Rederive',?, 't1',1,?,0,0)`, CLASS_ID, CODE, COURSE, THRESHOLD);

const STUDENTS = [];
for (let i = 0; i < 6; i++) {
  const id = 'sr' + i;
  STUDENTS.push(id);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash,created_at)
       VALUES (?,?,?,'x',datetime('now','-'||?||' days'))`, id, CLASS_ID, 'S' + i, 10 - i);
}

// ── Author denominators for a random subset of the columns ──────────────────
//  An unpriced column is not an edge case here, it is most of AP Cyber: 7 of 80
//  columns were unpriced when board 84 was written. Both kinds have to be in the
//  fixture, because they take different branches and one of them cannot join a
//  points sum at all.
const authored = new Map();       // `${lesson}|${act}` -> possible
for (const [unit, lesson] of LESSONS) {
  for (const act of GRADED_ACTS) {
    if (rnd() < 0.7) {
      const p = pick(WEIGHTS);
      authored.set(`${lesson}|${act}`, p);
      run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES (?,?,?,?,?)`,
        COURSE, unit, lesson, act, p);
    }
  }
}

// ── Generate the cells ──────────────────────────────────────────────────────
let pid = 0, aid = 0;
const manifestPoints = new Map();  // item_id -> points, the attempts-path override
const seen = new Set();
for (let n = 0; n < CELLS; n++) {
  const sid = pick(STUDENTS);
  const [unit, lesson] = pick(LESSONS);
  const act = pick(GRADED_ACTS);
  const key = `${sid}|${unit}|${lesson}|${act}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const shape = rnd();
  if (shape < 0.35) {
    // A page that reports its own pair, through `attempts`. The out-of is
    // whatever that page counted, so it can differ student to student on one
    // column: that is the shape a mean of percentages cannot survive.
    const max = pick([2, 4, 8, 20]);
    const sc = int(0, max);
    const itemId = `${lesson}-${act}-a`;
    if (rnd() < 0.25 && !manifestPoints.has(itemId)) {
      // A manifest row overrides the reported out-of for this item.
      const pts = pick(WEIGHTS);
      manifestPoints.set(itemId, pts);
      run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
           VALUES (?,?,?,?,?,?)`, COURSE, unit, lesson, itemId, act, pts);
    }
    run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
         VALUES (?,?,?,?,?,?,?,?,?,1)`,
      sid, CLASS_ID, COURSE, lesson, itemId, act, sc, max, sc / max * 100 >= THRESHOLD ? 1 : 0);
    aid++;
  } else if (shape < 0.85) {
    // A rolled-up percent in progress.score. Priced only where a denominator is
    // authored.
    run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
         VALUES (?,?,?,?,?,?,?,1,?,datetime('now'))`,
      'pr' + (++pid), sid, CLASS_ID, COURSE, unit, lesson, act, int(0, 100));
  } else {
    // Finished, and no number ever arrived.
    run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
         VALUES (?,?,?,?,?,?,?,1,NULL,datetime('now'))`,
      'pr' + (++pid), sid, CLASS_ID, COURSE, unit, lesson, act);
  }
}
// Lesson visits, which are never graded and must never count as a lost score.
for (const sid of STUDENTS) {
  for (const [unit, lesson] of LESSONS) {
    if (rnd() < 0.6) {
      run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
           VALUES (?,?,?,?,?,?,'lesson',1,NULL,datetime('now'))`,
        'pv' + (++pid), sid, CLASS_ID, COURSE, unit, lesson);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE REDERIVATION. Plain SELECTs, grouped by hand.
// ─────────────────────────────────────────────────────────────────────────────
const rows = {
  attempts: db.prepare('SELECT student_id, lesson_id, item_id, item_type, score, max_score FROM attempts WHERE class_id = ?').all(CLASS_ID),
  progress: db.prepare('SELECT student_id, unit, lesson, activity_type, completed, score FROM progress WHERE class_id = ?').all(CLASS_ID),
  denom: db.prepare('SELECT lesson, activity_type, possible FROM course_denominators WHERE course = ?').all(COURSE),
  manifest: db.prepare('SELECT item_id, points, item_type FROM course_manifest WHERE course = ?').all(COURSE),
};
const D = new Map(rows.denom.map((r) => [`${r.lesson}|${r.activity_type}`, r.possible]));
const MP = new Map(rows.manifest.filter((m) => m.item_type !== 'visit').map((m) => [m.item_id, m.points]));

// Points are whole where the denominator is. Restated here on purpose: this is
// the arithmetic under test, so importing it would be agreeing with the thing
// being checked.
const round2 = (n) => Math.round(n * 100) / 100;
const marksFrom = (ratio, possible) =>
  Number.isInteger(possible) ? Math.round(ratio * possible) : round2(ratio * possible);

const att = new Map();   // `${sid}|${lesson}|${act}` -> {earned, possible, items}
for (const a of rows.attempts) {
  const k = `${a.student_id}|${a.lesson_id}|${a.item_type}`;
  const c = att.get(k) || { earned: 0, possible: 0, items: 0 };
  c.earned += a.score;
  c.possible += MP.has(a.item_id) ? MP.get(a.item_id) : a.max_score;
  c.items += 1;
  att.set(k, c);
}
const prg = new Map();   // `${sid}|${unit}|${lesson}|${act}` -> row
for (const p of rows.progress) prg.set(`${p.student_id}|${p.unit}|${p.lesson}|${p.activity_type}`, p);

const isGraded = (act) => act !== 'lesson' && act !== 'visit' && act !== 'page' && act !== 'read'
  && act !== 'exercise-2';

// Every (unit, lesson, activity) this fixture can produce a cell for.
const COLUMNS = [];
for (const [unit, lesson] of LESSONS) {
  for (const act of GRADED_ACTS) COLUMNS.push({ unit, lesson, act, key: `${unit}|${lesson}|${act}` });
}

const mine = { students: new Map(), columns: new Map(), lessons: new Map() };
let classEarned = 0, classGraded = 0;

for (const sid of STUDENTS) {
  let earned = 0, graded = 0, lost = 0;
  const lessonAgg = new Map();
  for (const col of COLUMNS) {
    const a = att.get(`${sid}|${col.lesson}|${col.act}`);
    const p = prg.get(`${sid}|${col.unit}|${col.lesson}|${col.act}`);
    let cell = null;
    if (a && a.possible > 0 && isGraded(col.act)) {
      cell = { earned: round2(a.earned), possible: a.possible, pct: Math.round((a.earned / a.possible) * 100) };
    } else if (p && p.score != null && isGraded(col.act)) {
      const auth = D.get(`${col.lesson}|${col.act}`);
      const pc = Math.round(p.score);
      cell = auth != null
        ? { earned: marksFrom(pc / 100, auth), possible: auth, pct: pc }
        : { earned: null, possible: null, pct: pc };
    } else if (p && (p.completed || p.score != null)) {
      if (isGraded(col.act)) lost += 1;
      cell = null;
    }
    if (!cell) continue;

    if (cell.possible != null && cell.possible > 0) { earned += cell.earned; graded += cell.possible; }

    const cc = mine.columns.get(col.key) || { earned: 0, graded: 0, pctSum: 0, pctN: 0 };
    cc.pctSum += cell.pct; cc.pctN += 1;
    if (cell.possible != null && cell.possible > 0) { cc.earned += cell.earned; cc.graded += cell.possible; }
    mine.columns.set(col.key, cc);

    const la = lessonAgg.get(col.lesson) || { earned: 0, possible: 0, priced: 0, n: 0, sum: 0 };
    la.n += 1; la.sum += cell.pct;
    if (cell.possible != null && cell.possible > 0) { la.earned += cell.earned; la.possible += cell.possible; la.priced += 1; }
    lessonAgg.set(col.lesson, la);
  }

  const lessonCells = new Map();
  for (const [lesson, la] of lessonAgg) {
    const whole = la.priced === la.n && la.possible > 0;
    lessonCells.set(lesson, {
      pct: whole ? Math.round((la.earned / la.possible) * 100) : Math.round(la.sum / la.n),
      earned: whole ? round2(la.earned) : null,
      possible: whole ? round2(la.possible) : null,
    });
    const lc = mine.lessons.get(lesson) || { earned: 0, graded: 0, pctSum: 0, pctN: 0 };
    const cellPct = whole ? Math.round((la.earned / la.possible) * 100) : Math.round(la.sum / la.n);
    lc.pctSum += cellPct; lc.pctN += 1;
    if (whole) { lc.earned += la.earned; lc.graded += la.possible; }
    mine.lessons.set(lesson, lc);
  }

  const pct = graded > 0 ? Math.round((earned / graded) * 100) : null;
  if (pct != null) { classEarned += earned; classGraded += graded; }
  mine.students.set(sid, { earned: round2(earned), graded: round2(graded), pct, lost, lessonCells });
}

// The course total: every graded column that carries an authored out-of.
let coursePossible = 0;
for (const col of COLUMNS) {
  const d = D.get(`${col.lesson}|${col.act}`);
  if (d != null) coursePossible += d;
}
coursePossible = round2(coursePossible);

// ─────────────────────────────────────────────────────────────────────────────
//  THE COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
const g = buildGradebook(CODE, { reveal: true });
const byLabel = new Map(g.students.map((st) => [st.label, st]));
const idOf = new Map(STUDENTS.map((sid, i) => [sid, 'S' + i]));

let checked = 0;
const bad = [];
const cmp = (what, a, b, ctx) => {
  checked += 1;
  const same = (a == null && b == null) || a === b;
  if (!same) bad.push({ what, mine: a, builder: b, ctx });
};

for (const sid of STUDENTS) {
  const m = mine.students.get(sid);
  const st = byLabel.get(idOf.get(sid));
  if (!st) { bad.push({ what: 'student missing from the builder', ctx: idOf.get(sid) }); continue; }
  cmp('student earned', m.earned, st.overall.earned, sid);
  cmp('student graded', m.graded, st.overall.graded, sid);
  cmp('student pct', m.pct, st.overall.pct, sid);
  cmp('student course total', coursePossible, st.overall.possible, sid);
  cmp('student lost scores', m.lost, st.overall.items_score_missing, sid);
  for (const [lesson, lc] of m.lessonCells) {
    const c = st.cells[lesson];
    cmp('lesson cell pct', lc.pct, c ? c.pct : null, `${sid} ${lesson}`);
    cmp('lesson cell earned', lc.earned, c ? c.earned : null, `${sid} ${lesson}`);
    cmp('lesson cell possible', lc.possible, c ? c.possible : null, `${sid} ${lesson}`);
  }
}

for (const col of COLUMNS) {
  const mc = mine.columns.get(col.key);
  const it = g.items.find((i) => i.key === col.key);
  if (!it) { bad.push({ what: 'column missing from the builder', ctx: col.key }); continue; }
  const expect = mc
    ? (mc.graded > 0 ? Math.round((mc.earned / mc.graded) * 100)
      : (mc.pctN ? Math.round(mc.pctSum / mc.pctN) : null))
    : null;
  cmp('column average', expect, it.class_avg_pct, col.key);
  cmp('column basis', mc ? (mc.graded > 0 ? 'points' : (mc.pctN ? 'percent' : 'none')) : 'none',
    it.class_avg_basis, col.key);
}

for (const [lesson, lc] of mine.lessons) {
  const l = g.lessons.find((x) => x.lesson_id === lesson);
  if (!l) { bad.push({ what: 'lesson missing from the builder', ctx: lesson }); continue; }
  const expect = lc.graded > 0 ? Math.round((lc.earned / lc.graded) * 100)
    : (lc.pctN ? Math.round(lc.pctSum / lc.pctN) : null);
  cmp('lesson average', expect, l.class_avg_pct, lesson);
}

cmp('class earned', round2(classEarned), g.summary.earned, 'summary');
cmp('class graded', round2(classGraded), g.summary.graded, 'summary');
cmp('class course total', coursePossible, g.summary.possible, 'summary');
cmp('class average', classGraded > 0 ? Math.round((classEarned / classGraded) * 100) : null,
  g.summary.class_avg_pct, 'summary');

// A run where the generator produced nothing worth comparing would pass while
// checking nothing, so the shape of the fixture is asserted too.
const pricedCols = [...mine.columns.values()].filter((c) => c.graded > 0).length;
const unpricedCols = [...mine.columns.values()].filter((c) => c.graded === 0 && c.pctN > 0).length;
const lostTotal = [...mine.students.values()].reduce((n, m) => n + m.lost, 0);
const weightsSeen = new Set([...mine.columns.values()].filter((c) => c.graded > 0).map((c) => c.graded));

console.log(`seed ${SEED}  cells ${seen.size}  attempts ${aid}  students ${STUDENTS.length}`);
console.log(`priced columns ${pricedCols}  unpriced columns ${unpricedCols}  `
  + `lost scores ${lostTotal}  distinct column weights ${weightsSeen.size}`);
console.log(`compared ${checked} numbers`);

const thin = [];
if (pricedCols < 3) thin.push('fewer than 3 priced columns');
if (unpricedCols < 1) thin.push('no unpriced column, so the percent fallback was not exercised');
if (weightsSeen.size < 2) thin.push('every column weighs the same, so weighting was not exercised');
if (classGraded <= 0) thin.push('nothing priced at all');

if (bad.length) {
  console.log(`\n${bad.length} DISAGREEMENTS:`);
  for (const b of bad.slice(0, 25)) console.log('  ' + JSON.stringify(b));
  console.log(`\nFAILED - the rederivation and the builder disagree (seed ${SEED})`);
  process.exit(1);
}
if (thin.length) {
  console.log(`\nFAILED - the fixture was too thin to prove anything: ${thin.join('; ')} (seed ${SEED})`);
  process.exit(1);
}
console.log('\nOK - the builder and the rederivation agree');
