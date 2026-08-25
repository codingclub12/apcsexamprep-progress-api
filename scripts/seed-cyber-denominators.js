'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER DENOMINATORS - the authored "out of" per lesson and activity.
//
//  WHERE THESE NUMBERS COME FROM
//  Every value was extracted from the Shopify page that owns the activity, not
//  from a comment, a convention, or a guess. The trailing comment on each line
//  is the evidence: the page's own score display, its answer key, or its
//  gradeable-item array. An earlier pass authored one value per ACTIVITY TYPE
//  from repo comments and was wrong for nearly every column, which is why the
//  evidence is recorded inline and travels with the number.
//
//  WHY PER LESSON, NOT PER ACTIVITY TYPE
//  The totals genuinely differ. exercise-1 alone ranges over 4, 6, 7, 24 and 25
//  across the course. Unit 1 Exercise 1 has seven red flags and is out of 7;
//  Unit 2 Exercise 1 is out of 6. No single constant can be right, and the
//  gradebook printing "/5" above every exercise was the visible symptom.
//
//  WHAT IS DELIBERATELY ABSENT
//  Twenty activities whose pages state no total in any form this could read:
//  fifteen in Unit 1 (its `ap-cyber-unit-1-lesson-N-*` page set, which is
//  duplicated by an `ap-cybersecurity-unit-1-<topic>-*` set that DOES state
//  totals) and the five Unit 4 labs. An absent column keeps today's
//  behaviour; a guessed one silently regrades a class.
//  Per-unit exams are also absent: they need a key that distinguishes Unit 1's
//  exam from Unit 2's, which this lesson|activity shape cannot express.
//
//  SAFETY
//  Insert-or-ignore by default, so a value authored by hand is never clobbered
//  and re-running is a no-op. Writes change only what gradebooks DISPLAY; no
//  stored score is touched, and removing a row restores the prior behaviour
//  exactly (POST /api/admin/denominators/remove).
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/seed-cyber-denominators.js [--dry-run] [--update]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

const COURSE = 'ap-cybersecurity';

// `lesson|activity_type` -> points. Evidence in the trailing comment.
const POINTS = {

  // ── 1.1 ────────────────────────────────────────────
  '1.1|exercise-1': 7,        // foundCount reads / 7
  '1.1|exercise-2': 8,        // ANSWERS[] has 8 entries
  '1.1|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 1.2 ────────────────────────────────────────────
  '1.2|lab': 30,              // score readout reads 0 / 30
  '1.2|quiz': 5,              // score-display reads 0 / 5
  //
  // 1.2 exercise-1 (24) and exercise-2 (30) are MEASURED, not unknown. Both
  // values were read off the live page bodies on 2026-08-21 and each is
  // corroborated by three independent signals on its own page:
  //   exercise-1: header badge "3 Parts . 24 pts", score bar "/ 24 pts",
  //               results panel "/ 24", and maxPts 12 + 6 + 6 = 24.
  //   exercise-2: header badge "3 Clients . 30 pts", score bar "/ 30 pts",
  //               and three clients scored 2 + 2 + 6 = 10 each.
  // This supersedes the "value unknown, not resolvable by reading the page"
  // row for these two columns in docs/cyber-denominator-gaps.md section 3.
  //
  // They are NOT entries in this table, and the reason is the rule that file
  // already states: pricing a column the page cannot report is strictly
  // harmful. Neither page contains a fetch, an XHR, or a sendBeacon, so no
  // real score can arrive.
  //
  // The measured values are not lost. They live in MEASURED_UNPRICEABLE below,
  // which is exported and covered by smoke/cyber-denominators.js. A commented
  // out line records a number but proves nothing; a table can be asserted
  // against, so re-adding one of these to POINTS by hand now fails a test
  // instead of quietly regrading a class.
  //
  // CORRECTED 2026-08-21: an earlier version of this comment said a fabricated
  // 0 arrives instead, from apcs-tracker.js. It does not, on THESE two pages.
  // Each carries two <a class="check-btn"> nav links beside its three real
  // buttons, so the tracker's `total` is 5 while `answered` can only ever reach
  // 3 (an anchor has no `disabled` property). markComplete is never called and
  // nothing is recorded but the initial visit. See
  // docs/runs/2026-08-21-claude-code-cyber-tracker-sweep.md and
  // scripts/scan-tracker-score-risk.js.
  //
  // Either way these columns stay unpriced: pricing a column no page can report
  // would grow items_total and make pace worse for every student.

  // ── 1.4 ────────────────────────────────────────────
  '1.4|exercise-1': 25,       // score readout reads 0 / 25
  '1.4|exercise-2': 25,       // score readout reads 0 / 25
  '1.4|lab': 30,              // score readout reads 0 / 30
  '1.4|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 1.5 ────────────────────────────────────────────
  '1.5|exercise-1': 4,        // score readout reads 0 / 4
  '1.5|exercise-2': 4,        // score readout reads 0 / 4
  '1.5|lab': 30,              // score readout reads 0 / 30
  '1.5|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 2.1 ────────────────────────────────────────────
  '2.1|exercise-1': 6,        // ANSWERS{} has 6 keys
  '2.1|exercise-2': 24,       // score-display reads 0 / 24
  '2.1|lab': 30,              // score-display reads 0 / 30
  '2.1|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 2.2 ────────────────────────────────────────────
  '2.2|exercise-1': 6,        // ANSWERS{} has 6 keys
  '2.2|exercise-2': 24,       // score-display reads 0 / 24
  '2.2|lab': 30,              // score-display reads 0 / 30
  '2.2|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 2.3 ────────────────────────────────────────────
  '2.3|exercise-1': 6,        // ANSWERS{} has 6 keys
  '2.3|exercise-2': 24,       // score-display reads 0 / 24
  '2.3|lab': 30,              // score-display reads 0 / 30
  '2.3|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 2.4 ────────────────────────────────────────────
  '2.4|exercise-1': 6,        // ANSWERS{} has 6 keys
  '2.4|exercise-2': 24,       // score-display reads 0 / 24
  '2.4|lab': 30,              // score-display reads 0 / 30
  '2.4|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 3.1 ────────────────────────────────────────────
  '3.1|exercise-1': 6,        // ANSWERS{} has 6 keys
  '3.1|exercise-2': 24,       // score-display reads 0 / 24
  '3.1|lab': 30,              // score-display reads 0 / 30
  '3.1|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 3.2 ────────────────────────────────────────────
  '3.2|exercise-1': 6,        // ANSWERS{} has 6 keys
  '3.2|exercise-2': 24,       // score-display reads 0 / 24
  '3.2|lab': 30,              // score-display reads 0 / 30
  '3.2|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 3.3 ────────────────────────────────────────────
  '3.3|exercise-1': 6,        // ANSWERS{} has 6 keys
  '3.3|exercise-2': 24,       // score-display reads 0 / 24
  '3.3|lab': 30,              // score-display reads 0 / 30
  '3.3|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 3.4 ────────────────────────────────────────────
  '3.4|exercise-1': 6,        // ANSWERS{} has 6 keys
  '3.4|exercise-2': 24,       // score-display reads 0 / 24
  '3.4|lab': 30,              // score-display reads 0 / 30
  '3.4|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 3.5 ────────────────────────────────────────────
  '3.5|exercise-1': 24,       // score-display reads 0 / 24
  '3.5|exercise-2': 24,       // score-display reads 0 / 24
  '3.5|lab': 24,              // score-display reads 0 / 24
  '3.5|quiz': 10,             // score-display reads 0 / 10

  // ── 3.6 ────────────────────────────────────────────
  '3.6|exercise-1': 6,        // ANSWERS{} has 6 keys
  '3.6|exercise-2': 24,       // score-display reads 0 / 24
  '3.6|lab': 30,              // score-display reads 0 / 30
  '3.6|quiz': 5,              // ANSWERS{} has 5 keys

  // ── 4.1 ────────────────────────────────────────────
  '4.1|exercise-1': 5,        // score readout reads 0 / 5
  '4.1|exercise-2': 4,        // score readout reads 0 / 4
  '4.1|quiz': 6,              // score readout reads 0 / 6

  // ── 4.2 ────────────────────────────────────────────
  '4.2|exercise-1': 5,        // score readout reads 0 / 5
  '4.2|exercise-2': 4,        // score readout reads 0 / 4
  '4.2|quiz': 5,              // score readout reads 0 / 5

  // ── 4.3 ────────────────────────────────────────────
  '4.3|exercise-1': 5,        // score readout reads 0 / 5
  '4.3|exercise-2': 4,        // score readout reads 0 / 4
  '4.3|quiz': 5,              // score readout reads 0 / 5

  // ── 4.4 ────────────────────────────────────────────
  '4.4|exercise-1': 5,        // score readout reads 0 / 5
  '4.4|exercise-2': 4,        // score readout reads 0 / 4
  '4.4|quiz': 5,              // score readout reads 0 / 5

  // ── 4.5 ────────────────────────────────────────────
  '4.5|exercise-1': 5,        // score readout reads 0 / 5
  '4.5|exercise-2': 4,        // score readout reads 0 / 4
  '4.5|quiz': 5,              // score readout reads 0 / 5

  // ── 5.1 ────────────────────────────────────────────
  '5.1|exercise-1': 8,        // score readout reads 0 / 8
  '5.1|exercise-2': 6,        // score readout reads 0 / 6
  '5.1|lab': 6,               // score readout reads 0 / 6
  '5.1|quiz': 5,              // score readout reads 0 / 5

  // ── 5.2 ────────────────────────────────────────────
  '5.2|exercise-1': 8,        // score readout reads 0 / 8
  '5.2|exercise-2': 6,        // score readout reads 0 / 6
  '5.2|lab': 6,               // score readout reads 0 / 6
  '5.2|quiz': 5,              // score readout reads 0 / 5

  // ── 5.3 ────────────────────────────────────────────
  '5.3|exercise-1': 8,        // score readout reads 0 / 8
  '5.3|exercise-2': 6,        // score readout reads 0 / 6
  '5.3|lab': 6,               // score readout reads 0 / 6
  '5.3|quiz': 5,              // score readout reads 0 / 5

  // ── 5.4 ────────────────────────────────────────────
  '5.4|exercise-1': 8,        // score readout reads 0 / 8
  '5.4|exercise-2': 6,        // score readout reads 0 / 6
  '5.4|lab': 6,               // score readout reads 0 / 6
  '5.4|quiz': 5,              // score readout reads 0 / 5

  // ── 5.5 ────────────────────────────────────────────
  '5.5|exercise-1': 8,        // score readout reads 0 / 8
  '5.5|exercise-2': 6,        // score readout reads 0 / 6
  '5.5|lab': 6,               // score readout reads 0 / 6
  '5.5|quiz': 5,              // score readout reads 0 / 5

  // ── 5.6 ────────────────────────────────────────────
  '5.6|exercise-1': 8,        // score readout reads 0 / 8
  '5.6|exercise-2': 6,        // score readout reads 0 / 6
  '5.6|lab': 6,               // score readout reads 0 / 6
  '5.6|quiz': 5,              // score readout reads 0 / 5
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEASURED, DELIBERATELY UNPRICED
//
//  Columns whose "out of" IS known, read off the live page body, but which must
//  not be authored yet because the page cannot report a score into them. A
//  denominator is half of a pair; authoring one without a numerator grows
//  items_total and drags every student's pace down for work they cannot submit.
//
//  This table exists so the measurement survives without being active. Each
//  entry carries the value, the evidence it was read from, and the single
//  condition that would let it move into POINTS. Nothing here is ever written to
//  the database: buildRows() reads POINTS only.
//
//  TO ACTIVATE ONE: confirm its page now reports (a fetch, XHR or sendBeacon to
//  /api/student/progress, or a tracker path that posts a real score rather than
//  a fabricated 0), move the line into POINTS, and delete it here. Both halves
//  in the same pass, never one.
//
//  Measured 2026-08-22 against the live Shopify page bodies via the Admin API.
//  Every value below is corroborated by two independent signals on its own page.
// ─────────────────────────────────────────────────────────────────────────────
const MEASURED_UNPRICEABLE = {
  // Unit 1 lesson 1.2. Two <a class="check-btn"> nav links sit beside the three
  // real buttons, so the tracker's completion count can never be reached.
  '1.2|exercise-1': { possible: 24, evidence: 'header badge "3 Parts . 24 pts", score bar "/ 24 pts", parts 12+6+6', blocker: 'no reporter; check-btn anchors block markComplete' },
  '1.2|exercise-2': { possible: 30, evidence: 'score bar "/ 30 pts", three clients at 10 each', blocker: 'no reporter; check-btn anchors block markComplete' },

  // Unit 1 lesson 1.3. These three were absent from this file entirely, not
  // because the pages state no total (they do) but because nobody had read
  // them. The pages carry no fetch, XHR or sendBeacon of their own.
  '1.3|exercise-1': { possible: 24, evidence: 'header badge "3 Parts . 24 pts", score bar and finalScore "/ 24 pts", parts 12+6+6', blocker: 'no reporter in page body' },
  '1.3|exercise-2': { possible: 24, evidence: 'header badge "3 Parts . 24 pts", finalScore "/ 24 pts", parts 12+6+6', blocker: 'no reporter in page body' },
  '1.3|quiz': { possible: 5, evidence: 'qzScore reads "0 / 5", ANSWERS has 5 keys, q1..q5 present', blocker: 'no reporter in page body' },
};

// The five per-unit exams, which this file's (lesson|activity) shape cannot key
// anyway: all five collapse onto lesson 'exam'. course_unit_denominators is the
// table that CAN hold them, and scripts/seed-cyber-exam-denominators.js now
// seeds them from exactly the counts below.
//
// Every one is 20 questions, confirmed by counting question containers in the
// live body: units 1 and 2 use id="q-eN", unit 3 uses id="uNexam-qN", units 4
// and 5 use id="qN".
//
// CORRECTION, 2026-08-25. This block used to end "None of the five contains a
// fetch, an XHR, a sendBeacon or a token read, so none can report. Unpriced is
// correct, not an oversight." The observation was right and the conclusion was
// wrong. A page does not have to report itself: all five load apcs-tracker.js
// and set window.APCS_PAGE, and the tracker posts on their behalf. By the time
// this was noticed the ledger held 19 real unit exam submissions across unit-1
// and unit-2, every one of them rendering as a bare percentage that counted for
// nothing. Units 1 and 2 report because they carry id="score-display" for
// activityScorePct to read; 3, 4 and 5 have no score element and record
// completion only. The name of the constant is kept as a marker of the mistake.
const EXAM_UNPRICEABLE = {
  'unit-1': { possible: 20, evidence: '20 q-eN containers, "20 questions"' },
  'unit-2': { possible: 20, evidence: '20 q-eN containers, "20 questions"' },
  'unit-3': { possible: 20, evidence: '20 uNexam-qN containers, "20 MCQ", score "0/20"' },
  'unit-4': { possible: 20, evidence: '20 qN containers, score "0 / 20"' },
  'unit-5': { possible: 20, evidence: '20 qN containers, "20 multiple-choice", score "0 / 20"' },
};

// unit is descriptive, not part of the primary key, so a best-effort lookup from
// the course config is enough. A lesson the config does not know still seeds.
function unitFor(lesson) {
  const cfg = COURSES[COURSE];
  if (!cfg || !cfg.units) return 'unit-1';
  for (const [unitId, u] of Object.entries(cfg.units)) {
    if ((u.lessons || []).includes(lesson)) return unitId;
  }
  return 'unit-1';
}

function buildRows() {
  return Object.entries(POINTS).map(([key, possible]) => {
    const [lesson, activity_type] = key.split('|');
    return { course: COURSE, unit: unitFor(lesson), lesson, activity_type, possible };
  });
}

function seedCyberDenominators({ update = false, dryRun = false } = {}) {
  const rows = buildRows();
  const existing = new Set(
    db.prepare('SELECT lesson, activity_type FROM course_denominators WHERE course = ?')
      .all(COURSE).map((r) => `${r.lesson}|${r.activity_type}`)
  );
  const wouldAdd = rows.filter((r) => !existing.has(`${r.lesson}|${r.activity_type}`));

  if (dryRun) {
    return { total: rows.length, changed: 0, would_add: wouldAdd.length, mode: 'dry-run', rows: wouldAdd };
  }

  const insert = update
    ? db.prepare(`INSERT INTO course_denominators (course, unit, lesson, activity_type, possible)
                  VALUES (@course, @unit, @lesson, @activity_type, @possible)
                  ON CONFLICT(course, lesson, activity_type)
                  DO UPDATE SET unit = excluded.unit, possible = excluded.possible`)
    : db.prepare(`INSERT OR IGNORE INTO course_denominators (course, unit, lesson, activity_type, possible)
                  VALUES (@course, @unit, @lesson, @activity_type, @possible)`);

  const changed = db.transaction((rs) => {
    let n = 0;
    for (const r of rs) n += insert.run(r).changes;
    return n;
  })(rows);

  return { total: rows.length, changed, would_add: wouldAdd.length, mode: update ? 'update' : 'ignore' };
}

if (require.main === module) {
  const r = seedCyberDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
  });
  if (r.mode === 'dry-run') {
    console.log(`cyber denominators DRY RUN: ${r.would_add} of ${r.total} would be written`);
    for (const x of r.rows) console.log(`  ${x.lesson.padEnd(6)} ${x.activity_type.padEnd(12)} out of ${x.possible}`);
  } else {
    console.log(`cyber denominators: ${r.changed} of ${r.total} rows written (mode: ${r.mode})`);
  }
}

module.exports = {
  seedCyberDenominators, buildRows, POINTS, MEASURED_UNPRICEABLE, EXAM_UNPRICEABLE,
};
