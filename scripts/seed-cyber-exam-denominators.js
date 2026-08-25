'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY PER-UNIT EXAM TOTALS.
//
//  WHERE THESE NUMBERS COME FROM
//  Every one of the five unit exams is 20 questions, one point each, counted
//  from the live page bodies. The containers are named differently per unit,
//  which is why this was worth counting rather than assuming: units 1 and 2 use
//  id="q-eN", unit 3 uses id="uNexam-qN", units 4 and 5 use id="qN". The count
//  was recorded in scripts/seed-cyber-denominators.js (EXAM_UNPRICEABLE) before
//  this file existed and is re-confirmed here against the live pages.
//
//  WHY A SEPARATE TABLE
//  All five exams sit at lesson 'exam'. course_denominators is keyed
//  (course, lesson, activity_type), so five rows would collide into one and four
//  units would silently take a fifth's total. course_unit_denominators exists for
//  exactly this collision, the same one CSP hits with 'unit-test' and Cyber hits
//  with 'case-file'.
//
//  WHY THIS IS BEING SEEDED NOW, HAVING BEEN DELIBERATELY LEFT OUT
//  The earlier note concluded the exams could not report, on the grounds that no
//  exam page body contains a fetch, an XHR or a sendBeacon. That observation is
//  correct and the conclusion drawn from it was wrong: the page does not have to
//  report itself. All five exams load assets/apcs-tracker.js and set
//  window.APCS_PAGE, and the TRACKER posts on the page's behalf.
//
//  It is not a theory. As of 2026-08-25 the ledger holds 19 unit exam
//  submissions, every one of them a real score (60 to 100), across unit-1 and
//  unit-2. Those students' exams render as a bare percentage today, contribute
//  nothing to their points total, and sit in integrity.percent_only_items.
//
//  Units 1 and 2 report because they carry id="score-display", which the
//  tracker's activityScorePct can read. Units 3, 4 and 5 carry no score element,
//  so the tracker records completion and no score. Pricing all five anyway is
//  deliberate and safe: the grade is earned over ATTEMPTED work, so a column
//  nobody has sat contributes nothing to any student's denominator. It gives the
//  column a total before anyone sits the exam, which is what lets a teacher see
//  the exam is worth 20 marks rather than a blank.
//
//  WHAT PRICING ACTUALLY CHANGES
//  A percent with no denominator cannot join a points sum, so it is held out of
//  the total and counted in overall.items_percent_only. With a total authored,
//  lib/gradebook-contract.js converts it: earned = pointsFromRatio(pct/100, 20).
//  A student who scored 90 percent reads 18 / 20 and their exam finally counts.
//
//  SAFETY
//  Insert-or-ignore by default, so a hand-corrected value is never clobbered and
//  re-running is a no-op. Writes change only what a gradebook DISPLAYS; no
//  stored score is touched. A reported pair always outranks an authored total,
//  so this can never override a page that starts sending real points.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/seed-cyber-exam-denominators.js [--dry-run] [--update]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const COURSE = 'ap-cybersecurity';
const ACTIVITY = 'exam';
const LESSON = 'exam';

// unit -> possible. Evidence in the trailing comment: the question containers
// counted in that unit's live exam body.
const EXAMS = [
  { unit: 'unit-1', possible: 20 },  // 20 q-eN containers, "20 questions"
  { unit: 'unit-2', possible: 20 },  // 20 q-eN containers, "20 questions"
  { unit: 'unit-3', possible: 20 },  // 20 uNexam-qN containers, "20 MCQ", score "0/20"
  { unit: 'unit-4', possible: 20 },  // 20 qN containers, score "0 / 20"
  { unit: 'unit-5', possible: 20 },  // 20 qN containers, "20 multiple-choice", score "0 / 20"
];

function buildRows() {
  return EXAMS.map((e) => ({
    course: COURSE, unit: e.unit, lesson: LESSON, activity_type: ACTIVITY, possible: e.possible,
  }));
}

function seedCyberExamDenominators({ update = false, dryRun = false } = {}) {
  const rows = buildRows();
  const existing = new Set(
    db.prepare(`SELECT unit, lesson FROM course_unit_denominators
                WHERE course = ? AND activity_type = ?`)
      .all(COURSE, ACTIVITY).map((r) => `${r.unit}|${r.lesson}`)
  );
  const wouldAdd = rows.filter((r) => !existing.has(`${r.unit}|${r.lesson}`));

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
  const r = seedCyberExamDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
  });
  if (r.mode === 'dry-run') {
    console.log(`cyber exam denominators DRY RUN: ${r.would_add} of ${r.total} would be written`);
    for (const x of r.rows) console.log(`  ${x.unit} ${x.lesson} out of ${x.possible}`);
  } else {
    console.log(`cyber exam denominators: ${r.changed} of ${r.total} rows written (mode: ${r.mode})`);
  }
}

module.exports = { seedCyberExamDenominators, buildRows, EXAMS };
