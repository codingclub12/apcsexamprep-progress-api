'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSP BIG IDEA UNIT TEST TOTALS.
//
//  WHERE THESE NUMBERS COME FROM
//  Each unit test page carries its own answer key as a KEY={"e1":"D",...} map,
//  and one question is one point, so the number of entries in that map IS the
//  test's total. Counted from the pages, not assumed.
//
//  WHY A SEPARATE TABLE FROM scripts/seed-csp-denominators.js
//  Four Big Ideas name their test the same thing. course_denominators is keyed
//  (course, lesson, activity_type), so bi-1, bi-2, bi-4 and bi-5 would all
//  collide on one 'unit-test' row and three of them would silently take a
//  fourth's total, which is wrong for two of them: the tests are 12, 12, 10 and
//  14 questions. course_unit_denominators exists for exactly this collision, the
//  same one Cyber hits with its per-unit exams and case files.
//
//  WHY PRICE THEM AT ALL, GIVEN THEY REPORT
//  These pages DO report their own pair, and a reported pair always wins over an
//  authored total, so this is not what makes them gradeable. It gives the column
//  a total before anyone has sat the test, which is what lets a teacher see the
//  test is worth 12 marks rather than a blank, and it keeps them out of
//  integrity.missing_denominators.
//
//  Big Idea 3 sits its test in two parts. They are separate lessons on purpose:
//  a handle post carries no item name, so the server defaults it, and one shared
//  lesson would let part B overwrite part A.
//
//  SAFETY
//  Insert-or-ignore by default, so a hand-corrected value is never clobbered and
//  re-running is a no-op. Writes change only what a gradebook DISPLAYS; no
//  stored score is touched.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/seed-csp-unit-test-denominators.js [--dry-run] [--update]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const COURSE = 'ap-csp';
const ACTIVITY = 'exam';

// unit -> { lesson, possible }. Evidence in the trailing comment: the length of
// that page's own KEY map.
const TESTS = [
  { unit: 'bi-1', lesson: 'unit-test',        possible: 12 },  // bi1-unit-test, KEY has 12
  { unit: 'bi-2', lesson: 'unit-test',        possible: 12 },  // bi2-unit-test, KEY has 12
  { unit: 'bi-3', lesson: 'unit-test-part-a', possible: 14 },  // bi3 part A, KEY has 14
  { unit: 'bi-3', lesson: 'unit-test-part-b', possible: 14 },  // bi3 part B, KEY has 14
  { unit: 'bi-4', lesson: 'unit-test',        possible: 10 },  // bi4-unit-test, KEY has 10
  { unit: 'bi-5', lesson: 'unit-test',        possible: 14 },  // bi5-unit-test, KEY has 14
];

function buildRows() {
  return TESTS.map((t) => ({
    course: COURSE, unit: t.unit, lesson: t.lesson, activity_type: ACTIVITY, possible: t.possible,
  }));
}

function seedCspUnitTestDenominators({ update = false, dryRun = false } = {}) {
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
  const r = seedCspUnitTestDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
  });
  if (r.mode === 'dry-run') {
    console.log(`csp unit test denominators DRY RUN: ${r.would_add} of ${r.total} would be written`);
    for (const x of r.rows) console.log(`  ${x.unit} ${x.lesson} out of ${x.possible}`);
  } else {
    console.log(`csp unit test denominators: ${r.changed} of ${r.total} rows written (mode: ${r.mode})`);
  }
}

module.exports = { seedCspUnitTestDenominators, buildRows, TESTS };
