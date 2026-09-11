#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A SECOND IMPLEMENTATION OF THE CELL PERCENT, REACHING THE SAME NUMBERS.
//
//  WHY A SECOND ONE
//  The rule that stopped a teacher's 2.1 Lab column reading 483% lives in SQL
//  and in one branch of a loop: a window function, a predicate, and "a reported
//  pair wins, unless the grade was reset". A suite written against that code
//  agrees with it by construction. Every real defect in this repo has been
//  caught by a DIFFERENT KIND of check from the ones passing at the time.
//
//  So this one never touches the route's statements. It reads raw progress and
//  score_events rows with plain SELECTs, groups them in JavaScript, applies the
//  rules by hand, and requires GET /api/teacher/classes/:code/progress to agree
//  cell for cell on all three numbers: earned, possible, and the percent.
//
//  WHY THE CASES ARE GENERATED
//  A list of known-bad shapes only catches the shapes somebody thought of, and
//  the shape that produced 483 was one nobody had. This generates activities
//  across the axes that decide the answer: how many writers reported, whether
//  the page named its own item, how many attempts, whether a percent was posted
//  as well, whether that percent is in range, and whether a teacher reset the
//  cell afterwards. The seed is printed, so a failure is reproducible exactly.
//
//  Offline: a throwaway SQLite file, no network, no secrets. Zero PII: synthetic
//  names, never printed.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/gradebook-percent-rederive.js [--seed N] [--activities N]
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const SEED = arg('--seed', Date.now() % 100000);
const ACTIVITIES = arg('--activities', 80);

process.env.DB_PATH = path.join(__dirname, '..', 'smoke', 'gradebook-percent-rederive.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { REPORTER_TOTAL_ITEM, LESSON_SCORE_ITEM } = require('../scoring');

// Deterministic PRNG, so --seed reproduces a failure exactly.
let s = (SEED >>> 0) || 1;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const COURSE = 'ap-cybersecurity';
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

let idSeq = 0;
const newId = () => 'rd' + (idSeq++).toString(36) + '_' + SEED;

(async () => {
  console.log('\nREDERIVING THE GRADEBOOK CELL PERCENT  seed=' + SEED
    + '  activities=' + ACTIVITIES + '\n');

  const reg = await fetch(base() + '/api/teacher/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rederive.pct@example.org', password: 'a-long-enough-password',
      name: 'Rederive', school: 'Example High',
    }),
  }).then((r) => r.json());
  const tt = reg.token;
  const cls = await fetch(base() + '/api/teacher/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tt },
    body: JSON.stringify({ class_name: 'Rederive P1', course: COURSE }),
  }).then((r) => r.json());
  const code = cls.class.class_code, classId = cls.class.id;

  //  Rows are written STRAIGHT to the tables, not through the student API. The
  //  write guard now refuses an out-of-range percent, and out-of-range rows
  //  already on disk are exactly the case the read path has to survive, so
  //  going through the front door would generate only the easy half.
  const insStu = db.prepare(
    `INSERT INTO students (id, class_id, display_name, pin_hash, active)
     VALUES (?, ?, ?, 'x', 1)`);
  const insEv = db.prepare(
    `INSERT INTO score_events (id, student_id, class_id, course, unit, lesson,
       activity_type, item, points, max_points, correct, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insProg = db.prepare(
    `INSERT INTO progress (id, student_id, class_id, course, unit, lesson, activity_type,
       completed, score, attempts, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const students = [];
  for (let i = 0; i < 6; i++) {
    const id = 'stu_' + i;
    insStu.run(id, classId, 'Synthetic ' + i);
    students.push(id);
  }

  // Every activity is one (student, unit, lesson, activity_type) cell.
  const seen = new Set();
  const T0 = Date.parse('2026-09-01T00:00:00Z');
  for (let a = 0; a < ACTIVITIES; a++) {
    const student = pick(students);
    const unit = 'unit-' + int(1, 4);
    const lesson = unit.slice(5) + '.' + int(1, 5);
    const act = pick(['exercise-1', 'exercise-2', 'lab', 'quiz']);
    const key = [student, unit, lesson, act].join('|');
    if (seen.has(key)) continue;

    const namedItems = int(0, 3);                 // how many items the page named
    const carrier = rnd() < 0.55;                 // did the scraper also post
    if (namedItems === 0 && !carrier) continue;   // nothing reported at all
    seen.add(key);

    let clock = 0;
    const ev = [];
    for (let n = 1; n <= namedItems; n++) {
      const max = int(1, 8);
      const attempts = int(1, 3);
      for (let att = 0; att < attempts; att++) {
        ev.push({
          item: 'q' + n, points: int(0, max), max_points: max,
          created_at: new Date(T0 + (clock++) * 1000).toISOString(),
        });
      }
    }
    if (carrier) {
      const max = int(1, 15);
      ev.push({
        item: REPORTER_TOTAL_ITEM, points: int(0, max), max_points: max,
        created_at: new Date(T0 + (clock++) * 1000).toISOString(),
      });
    }
    for (const e of ev) {
      insEv.run(newId(), student, classId, COURSE, unit, lesson, act, e.item,
        e.points, e.max_points, e.points >= e.max_points ? 1 : 0, e.created_at);
    }

    // Some cells also carry a whole-activity percent, and a quarter of those are
    // the out-of-range rows this change is about. A few are then reset, which
    // nulls the score while the ledger keeps every row.
    const hasPct = rnd() < 0.7;
    const outOfRange = hasPct && rnd() < 0.25;
    const reset = hasPct && rnd() < 0.15;
    const pctVal = (!hasPct || reset) ? null : (outOfRange ? int(101, 900) : int(0, 100));
    insProg.run(newId(), student, classId, COURSE, unit, lesson, act,
      1, pctVal, ev.length, new Date(T0).toISOString());
  }

  //  ── THE SECOND IMPLEMENTATION ─────────────────────────────────────────────
  //  Plain SELECTs and plain JavaScript. No window function, no shared SQL
  //  fragment, nothing imported from the route.
  const rawEvents = db.prepare(
    `SELECT student_id, unit, lesson, activity_type, item, points, max_points,
            created_at, rowid AS rid
     FROM score_events WHERE course = ?`).all(COURSE);
  const rawProg = db.prepare(
    `SELECT student_id, unit, lesson, activity_type, score FROM progress WHERE course = ?`)
    .all(COURSE);

  const groups = new Map();
  for (const e of rawEvents) {
    if (e.item === LESSON_SCORE_ITEM) continue;
    const k = [e.student_id, e.unit, e.lesson, e.activity_type].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }

  //  WHICH ATTEMPT COUNTS IS A SHARED INPUT, NOT THE THING UNDER TEST.
  //
  //  The first version of this script took the best attempt unconditionally and
  //  reported five disagreements, all of them on quizzes. The route was right
  //  and the rederivation was wrong: under the class default a quiz is an
  //  assessment and the FIRST attempt counts, and only practice is best-of-many.
  //  So the policy is modelled here rather than assumed, and the comparison runs
  //  under both modes, which also exercises the first-attempt branch of the
  //  route's window function instead of leaving half of it unchecked.
  const earliest = (a, b) => (a.created_at < b.created_at
    || (a.created_at === b.created_at && a.rid < b.rid)) ? a : b;
  const deriveFor = (retryOn) => {
    const out = new Map();
    for (const [k, rows] of groups) {
      // The carrier rule, by hand: keep every named item, and keep the scraped
      // carrier only where it is the sole reporter.
      const pageNamedSomething = rows.some((r) => r.item !== REPORTER_TOTAL_ITEM);
      const kept = rows.filter((r) => r.item !== REPORTER_TOTAL_ITEM || !pageNamedSomething);
      const chosen = new Map();
      for (const r of kept) {
        const cur = chosen.get(r.item);
        if (!cur) { chosen.set(r.item, r); continue; }
        if (retryOn) {
          // best points per item, earliest on a tie
          if (r.points > cur.points
            || (r.points === cur.points && earliest(r, cur) === r)) chosen.set(r.item, r);
        } else if (earliest(r, cur) === r) {
          chosen.set(r.item, r);
        }
      }
      let earned = 0, possible = 0;
      for (const r of chosen.values()) { earned += r.points; possible += r.max_points; }
      out.set(k, { earned, possible });
    }
    return out;
  };
  //  'all' makes every activity best-of-many; 'none' makes every activity
  //  first-attempt. Two unambiguous ends, so the rederivation never has to
  //  restate the per-activity-type table that retry-policy.js owns.
  const MODES = [{ mode: 'all', retryOn: true }, { mode: 'none', retryOn: false }];

  const storedPct = new Map(rawProg.map((p) =>
    [[p.student_id, p.unit, p.lesson, p.activity_type].join('|'), p.score]));

  let checked = 0, compared = 0, disagreed = 0, overHundred = 0, resurrected = 0;
  const samples = [];
  const note = (why, extra) => { if (samples.length < 4) samples.push({ why, ...extra }); };

  for (const { mode, retryOn } of MODES) {
    const set = await fetch(base() + `/api/teacher/classes/${code}/retry`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tt },
      body: JSON.stringify({ retry_mode: mode }),
    }).then((r) => r.json());
    if (!set || set.error) throw new Error('could not set retry_mode ' + mode + ': ' + JSON.stringify(set));
    const expected = deriveFor(retryOn);
    const payload = await fetch(base() + `/api/teacher/classes/${code}/progress`,
      { headers: { Authorization: 'Bearer ' + tt } }).then((r) => r.json());

    for (const st of payload.summary) {
      for (const [unit, lessons] of Object.entries(st.detail)) {
        for (const [lesson, acts] of Object.entries(lessons)) {
          for (const [act, cell] of Object.entries(acts)) {
            const k = [st.student.id, unit, lesson, act].join('|');
            checked++;

            //  No percentage the route serves may sit outside 0 to 100, ever.
            if (cell.score != null && (cell.score < 0 || cell.score > 100)) {
              overHundred++;
              note('percent out of range', { mode, cell: k, score: cell.score });
              continue;
            }
            //  A reset cell stays reset, even though the ledger still has rows.
            if (storedPct.get(k) == null && cell.score != null) {
              resurrected++;
              note('a reset was undone', { mode, cell: k, score: cell.score });
              continue;
            }

            const mine = expected.get(k);
            if (!mine || !(mine.possible > 0) || storedPct.get(k) == null) continue;
            compared++;
            const wantPct = Math.round((mine.earned / mine.possible) * 100);
            if (cell.points_earned !== mine.earned || cell.points_possible !== mine.possible
                || cell.score !== wantPct) {
              disagreed++;
              note('cell disagrees', {
                mode,
                cell: k,
                route: { e: cell.points_earned, p: cell.points_possible, pct: cell.score },
                rederived: { e: mine.earned, p: mine.possible, pct: wantPct },
              });
            }
          }
        }
      }
    }
  }

  console.log('  modes exercised           ' + MODES.map((m) => m.mode).join(', '));
  console.log('  cells in the payloads     ' + checked);
  console.log('  cells compared in full    ' + compared);
  console.log('  percent out of range      ' + overHundred);
  console.log('  resets undone             ' + resurrected);
  console.log('  cells disagreeing         ' + disagreed);
  if (samples.length) {
    console.log('\n  first disagreements:');
    for (const x of samples) console.log('    ' + JSON.stringify(x).slice(0, 260));
  }

  //  A run that compared nothing is not a pass. The generator can in principle
  //  produce a dataset with no priced cell in it, and reporting that as green
  //  would certify arithmetic nobody ran.
  const bad = overHundred + resurrected + disagreed;
  const enough = compared >= 10;
  console.log('\n──────────────────────────────────────────');
  if (!enough) {
    console.log('FAILED - only ' + compared + ' cells were compared, too few to mean anything'
      + ' (seed ' + SEED + ')');
  } else if (bad === 0) {
    console.log('OK - the route and the rederivation agree on all ' + compared
      + ' compared cells, and no cell in the payload is out of range (seed ' + SEED + ')');
  } else {
    console.log('FAILED - ' + bad + ' bad cells of ' + checked + ' (seed ' + SEED + ')');
  }
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(bad === 0 && enough ? 0 : 1);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
