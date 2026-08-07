'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER CASE FILE DENOMINATORS - the authored "out of" for the five case files.
//
//  WHERE THESE NUMBERS COME FROM
//  Read from the Shopify page that owns each case file, on 2026-08-07, via the
//  Admin API. Every case file paints its own running total in a single element:
//
//      <span class="cf-scoretext" id="cfScoreText">Points: 0 / 15</span>
//
//  and the page's reporter derives the percentage it posts from exactly that
//  element. So the denominator authored here and the numerator a student earns
//  are counting the same points, which is the property that makes a pair safe to
//  display. The trailing comment on each line records the observed total.
//
//  WHY THIS IS A SEPARATE TABLE FROM scripts/seed-cyber-denominators.js
//  All five case files live at lesson 'case-file'. course_denominators is keyed
//  (course, lesson, activity_type), so the five would collide on one row and
//  four units would silently take a fifth unit's total. That collision is the
//  reason course_unit_denominators exists; this is its first seed. The sibling
//  script says as much about the per-unit exams, which have the same shape.
//
//  WHY THE CASE FILES ARE PRICEABLE WHEN THE EXAMS ARE NOT
//  A denominator is only safe to author for a column that can actually receive a
//  score, otherwise it prices work no student can earn and drags every average
//  down. The five case file pages each carry a self-contained reporter that
//  POSTs to /api/student/progress with lesson 'case-file' and activity_type
//  'case-file'. The five unit exam pages contain no fetch, no XMLHttpRequest, no
//  sendBeacon and no token read, so they cannot report anything and stay
//  deliberately unpriced. See docs/cyber-denominator-gaps.md for how that was
//  measured, including the control that an earlier and WRONG version of this
//  claim was missing.
//
//  SAFETY
//  Insert-or-ignore by default, so a value authored by hand is never clobbered
//  and re-running is a no-op. Writes change only what gradebooks DISPLAY; no
//  stored score is touched, and removing a row restores the prior behaviour
//  exactly.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/seed-cyber-case-file-denominators.js [--dry-run] [--update]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const COURSE = 'ap-cybersecurity';
const LESSON = 'case-file';
const ACTIVITY = 'case-file';

// unit -> points. Evidence in the trailing comment: the page's own cfScoreText.
const POINTS = {
  'unit-1': 15,   // ap-cyber-unit-1-case-file-1  "Points: 0 / 15"
  'unit-2': 14,   // ap-cyber-unit-2-case-file-2  "Points: 0 / 14"
  'unit-3': 11,   // ap-cyber-unit-3-case-file-3  "Points: 0 / 11"
  'unit-4': 12,   // ap-cyber-unit-4-case-file-4  "Points: 0 / 12"
  'unit-5': 11,   // ap-cyber-unit-5-case-file-5  "Points: 0 / 11"
};

function buildRows() {
  return Object.entries(POINTS).map(([unit, possible]) => ({
    course: COURSE, unit, lesson: LESSON, activity_type: ACTIVITY, possible,
  }));
}

function seedCyberCaseFileDenominators({ update = false, dryRun = false } = {}) {
  const rows = buildRows();
  const existing = new Set(
    db.prepare(`SELECT unit FROM course_unit_denominators
                WHERE course = ? AND lesson = ? AND activity_type = ?`)
      .all(COURSE, LESSON, ACTIVITY).map((r) => r.unit)
  );
  const wouldAdd = rows.filter((r) => !existing.has(r.unit));

  if (dryRun) {
    return { total: rows.length, changed: 0, would_add: wouldAdd.length, mode: 'dry-run', rows: wouldAdd };
  }

  const insert = update
    ? db.prepare(`INSERT INTO course_unit_denominators (course, unit, lesson, activity_type, possible)
                  VALUES (@course, @unit, @lesson, @activity_type, @possible)
                  ON CONFLICT(course, unit, lesson, activity_type)
                  DO UPDATE SET possible = excluded.possible`)
    : db.prepare(`INSERT OR IGNORE INTO course_unit_denominators (course, unit, lesson, activity_type, possible)
                  VALUES (@course, @unit, @lesson, @activity_type, @possible)`);

  const changed = db.transaction((rs) => {
    let n = 0;
    for (const r of rs) n += insert.run(r).changes;
    return n;
  })(rows);

  return { total: rows.length, changed, would_add: wouldAdd.length, mode: update ? 'update' : 'ignore' };
}

if (require.main === module) {
  const r = seedCyberCaseFileDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
  });
  if (r.mode === 'dry-run') {
    console.log(`cyber case file denominators DRY RUN: ${r.would_add} of ${r.total} would be written`);
    for (const x of r.rows) console.log(`  ${x.unit.padEnd(8)} case-file out of ${x.possible}`);
  } else {
    console.log(`cyber case file denominators: ${r.changed} of ${r.total} rows written (mode: ${r.mode})`);
  }
}

module.exports = { seedCyberCaseFileDenominators, buildRows, POINTS };
