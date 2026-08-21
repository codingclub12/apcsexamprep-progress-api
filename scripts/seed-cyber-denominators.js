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
  // They stay COMMENTED OUT on purpose, and the reason is the rule that file
  // already states: pricing a column the page cannot report is strictly
  // harmful. Neither page contains a fetch, an XHR, or a sendBeacon, so no
  // real score can arrive. What arrives instead is a fabricated 0 from
  // apcs-tracker.js, which marks the exercise complete once every .check-btn
  // is spent and then scrapes #score-display (absent here) and
  // .answered-correct (absent here), so activityScorePct returns
  // Math.round(0 / 3 * 100). Pricing that would turn a percent-only 0 into a
  // confident 0 / 24 and grow items_total, making pace worse as well.
  //
  // Uncomment BOTH lines in the same pass that ships a reporter on these two
  // pages, never before. See docs/runs/2026-08-21-claude-code-cyber-1.2-fabricated-zero.md.
  // '1.2|exercise-1': 24,    // header badge, score bar, results panel, 12+6+6
  // '1.2|exercise-2': 30,    // header badge, score bar, 3 clients x (2+2+6)

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

module.exports = { seedCyberDenominators, buildRows, POINTS };
