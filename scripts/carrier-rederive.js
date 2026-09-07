#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A SECOND IMPLEMENTATION OF THE CARRIER RULE, REACHING THE SAME CELLS.
//
//  WHY A SECOND ONE
//  The rule that stopped a teacher's gradebook reading 14 out of 14 for a 7
//  point exercise lives in SQL: two window functions and a predicate, shared by
//  three readers. A suite written against that SQL agrees with it by
//  construction, and every real defect in this repo on 2026-09-01 and 02 was
//  caught by a DIFFERENT KIND of check from the ones passing at the time.
//
//  So this one never touches the statements. It reads raw score_events rows with
//  a plain SELECT, groups them in JavaScript, applies the rule by hand, and
//  requires the canonical gradebook to agree cell for cell.
//
//  WHY THE CASES ARE GENERATED
//  A list of known-bad shapes only ever catches the shapes somebody thought of.
//  This generates activities across the axes that actually decide the answer:
//  how many writers reported, whether the page named its own item, how many
//  attempts each item took, and whether the class allows retries. The seed is
//  printed, so a failure is reproducible exactly.
//
//  Offline: a throwaway SQLite file, no network, no secrets. Zero PII.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/carrier-rederive.js [--seed N] [--activities N]
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const SEED = arg('--seed', Date.now() % 100000);
const ACTIVITIES = arg('--activities', 60);

process.env.DB_PATH = path.join(__dirname, '..', 'smoke', 'carrier-rederive.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const { REPORTER_TOTAL_ITEM, LESSON_SCORE_ITEM } = require('../scoring');
//  WHICH ATTEMPT counts is a shared input, not the thing under test: it has its
//  own suites, and re-deriving it here would only test this file's memory of it.
//  WHAT IS SUMMED is the thing under test, and that is done by hand below.
//  The first run of this pass disagreed on every quiz cell for exactly this
//  reason: it took the best attempt everywhere, and under retry_mode 'practice'
//  a quiz counts the FIRST one. The SQL was right and this pass was wrong, which
//  is the whole reason a second implementation is worth writing.
const { retryAllowedFor } = require('../retry-policy');

// Deterministic PRNG, so --seed reproduces a failure exactly.
let state = SEED >>> 0 || 1;
const rnd = () => { state = (state * 1103515245 + 12345) >>> 0; return state / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const CY = 'ap-cybersecurity';
const now = () => new Date().toISOString();

function build() {
  db.prepare(`INSERT INTO teachers (id,email,password_hash,name,school)
    VALUES ('t-red','rederive@example.org','x','Rederive','Example High')`).run();
  db.prepare(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,retry_allowed,retry_mode)
    VALUES ('c-red','t-red','CYBER-RED','Rederive P1',?,1,'practice')`).run(CY);
  const stu = db.prepare(`INSERT INTO students (id,class_id,display_name,pin_hash)
    VALUES (?, 'c-red', ?, 'x')`);
  const students = [];
  for (let i = 1; i <= 6; i++) { stu.run('s-red-' + i, 'RS' + i); students.push('s-red-' + i); }

  const ev = db.prepare(`INSERT INTO score_events
    (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,correct,created_at)
    VALUES (?,?,'c-red',?,?,?,?,?,?,?,?,?)`);
  const denom = db.prepare(`INSERT OR IGNORE INTO course_denominators
    (course,unit,lesson,activity_type,possible) VALUES (?,?,?,?,?)`);

  let id = 0;
  const rows = [];
  for (let a = 0; a < ACTIVITIES; a++) {
    const unit = 'unit-' + int(1, 3);
    const lesson = int(1, 5) + '.' + int(1, 5);
    const activity = pick(['exercise-1', 'exercise-2', 'lab', 'quiz']);
    const total = pick([4, 5, 7, 8, 15, 24, 25, 30]);
    if (rnd() < 0.7) denom.run(CY, unit, lesson, activity, total);

    // Which writers reported, which is the axis the rule turns on.
    const shape = pick(['carrier-only', 'named-only', 'both', 'per-question', 'per-question-plus-carrier']);
    for (const sid of students) {
      if (rnd() < 0.3) continue;                       // not everybody does everything
      const earned = int(0, total);
      const items = [];
      if (shape === 'carrier-only') items.push([REPORTER_TOTAL_ITEM, earned, total]);
      if (shape === 'named-only') items.push([pick(['redflags', 'run', 'main']), earned, total]);
      if (shape === 'both') {
        const named = pick(['redflags', 'run', 'main']);
        items.push([named, earned, total]);
        // The scrape can settle on a different number than the page's own count.
        items.push([REPORTER_TOTAL_ITEM, rnd() < 0.8 ? earned : int(0, total), total]);
      }
      if (shape.startsWith('per-question')) {
        const n = int(3, 6);
        for (let q = 1; q <= n; q++) items.push(['q' + q, rnd() < 0.7 ? 1 : 0, 1]);
        if (shape === 'per-question-plus-carrier') {
          const e = items.reduce((s, i) => s + i[1], 0);
          items.push([REPORTER_TOTAL_ITEM, e, n]);
        }
      }
      // A lesson-score carrier rides the same ledger and is excluded everywhere.
      if (rnd() < 0.25) items.push([LESSON_SCORE_ITEM, int(0, 100), 100]);

      for (const [item, points, max] of items) {
        const tries = rnd() < 0.25 ? 2 : 1;            // some items were retried
        for (let t = 0; t < tries; t++) {
          const p = t === 0 ? Math.max(0, points - (tries > 1 ? int(0, points) : 0)) : points;
          ev.run('ev-' + (++id), sid, CY, unit, lesson, activity, item, p, max,
            p >= max ? 1 : 0, now());
          rows.push({ sid, unit, lesson, activity, item, points: p, max });
        }
      }
    }
  }
  return { students, rows };
}

//  THE SECOND IMPLEMENTATION. Plain rows in, cells out, no SQL beyond SELECT *.
//  Best attempt per item (the class allows retries), reserved carriers handled
//  by hand, summed.
function rederiveCells() {
  const raw = db.prepare(`SELECT student_id, unit, lesson, activity_type, item, points, max_points
    FROM score_events WHERE class_id = 'c-red' ORDER BY created_at ASC, rowid ASC`).all();

  const cls = db.prepare("SELECT retry_mode, retry_allowed FROM classes WHERE id = 'c-red'").get();
  const overrides = new Map(db.prepare(
    "SELECT id, retry_override FROM students WHERE class_id = 'c-red'"
  ).all().map((r) => [r.id, r.retry_override]));

  const perItem = new Map();   // sid|unit|lesson|activity|item -> {points, max}
  const order = new Map();     // same key -> the first row seen, for no-retry mode
  for (const r of raw) {
    if (r.item === LESSON_SCORE_ITEM) continue;                  // never a graded item
    const k = [r.student_id, r.unit, r.lesson, r.activity_type, r.item].join('|');
    const best = retryAllowedFor(cls.retry_mode, r.activity_type,
      overrides.has(r.student_id) ? overrides.get(r.student_id) : null);
    if (best) {
      const cur = perItem.get(k);
      if (!cur || r.points > cur.points) perItem.set(k, { points: r.points, max: r.max_points });
    } else if (!order.has(k)) {
      order.set(k, true);
      perItem.set(k, { points: r.points, max: r.max_points });
    }
  }

  const byActivity = new Map();
  for (const [k, v] of perItem) {
    const [sid, unit, lesson, activity, item] = k.split('|');
    const ak = [sid, unit, lesson, activity].join('|');
    if (!byActivity.has(ak)) byActivity.set(ak, []);
    byActivity.get(ak).push({ item, ...v });
  }

  const cells = new Map();
  for (const [ak, items] of byActivity) {
    // The rule, by hand: a page that named its own items has already said what
    // the run was worth, so the scraped carrier is the same run twice. Alone,
    // the carrier IS the run.
    const named = items.filter((i) => i.item !== REPORTER_TOTAL_ITEM);
    const kept = named.length ? named : items;
    let earned = 0, possible = 0;
    for (const i of kept) { earned += i.points; possible += i.max; }
    if (possible > 0) cells.set(ak, { earned, possible });
  }
  return cells;
}

const fixture = build();
const mine = rederiveCells();
const gb = buildCanonicalGradebook('CYBER-RED', { reveal: true });

const theirs = new Map();
for (const s of gb.students) {
  for (const [key, c] of Object.entries(s.items || {})) {
    if (c.earned == null || c.possible == null) continue;
    if (c.possible_source !== 'observed') continue;   // only ledger-priced cells
    const [unit, lesson, activity] = key.split('/');
    theirs.set([s.ref || s.id, unit, lesson, activity].join('|'), { earned: c.earned, possible: c.possible });
  }
}

// The gradebook labels students by id or ref, this pass by student_id. Match on
// the (unit, lesson, activity) triple per student through the roster.
const idByRef = new Map(gb.students.map((s) => [s.ref || s.id, s.id]));
let compared = 0, disagreed = [];
for (const [k, v] of theirs) {
  const [ref, unit, lesson, activity] = k.split('|');
  const sid = idByRef.get(ref) || ref;
  const mineCell = mine.get([sid, unit, lesson, activity].join('|'));
  compared++;
  if (!mineCell) { disagreed.push({ cell: k, mine: null, theirs: v }); continue; }
  if (mineCell.earned !== v.earned || mineCell.possible !== v.possible) {
    disagreed.push({ cell: k, mine: mineCell, theirs: v });
  }
}

// And nothing this pass found may be MISSING from the gradebook.
for (const [k, v] of mine) {
  const [sid, unit, lesson, activity] = k.split('|');
  const key = [sid, unit, lesson, activity].join('|');
  if (!theirs.has(key)) disagreed.push({ cell: key, mine: v, theirs: null });
}

console.log(`\nCARRIER REDERIVE  seed ${SEED}, ${ACTIVITIES} activities`);
console.log(`  raw events        ${fixture.rows.length}`);
console.log(`  cells compared    ${compared}`);
console.log(`  disagreements     ${disagreed.length}`);
for (const d of disagreed.slice(0, 10)) console.log('   ', JSON.stringify(d));

for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

if (!compared) {
  console.log('\nFAIL: nothing was compared, so this proved nothing.\n');
  process.exit(1);
}
if (disagreed.length) {
  console.log(`\nFAIL: two implementations disagree. Reproduce with --seed ${SEED}\n`);
  process.exit(1);
}
console.log(`\nOK - ${compared} cells, two implementations, identical.\n`);
