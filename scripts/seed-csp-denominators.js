'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP DENOMINATORS - the authored "out of" per lesson and activity.
//
//  WHERE THESE NUMBERS COME FROM
//  Every value was COUNTED from the Shopify page that owns the activity, on
//  2026-08-07, via the Admin API. One graded item is one
//
//      <div class="mcq-item" data-activity="{activity}" data-item="q{n}">
//
//  which is exactly the unit the page's reporter posts, so the denominator here
//  and the numerator a student earns are counting the same things. The trailing
//  comment on each line records the count that was observed.
//
//  All 35 lesson pages in the COURSES config were scanned, none was missing, and
//  the shape is strikingly regular: every lesson quiz is out of 6, and every Big
//  Idea 3 lesson additionally carries an exercise-1 out of 8. That regularity is
//  a finding, not an assumption. It was measured page by page, and a future page
//  edit that breaks it will be caught by rerunning the scan, not by trusting the
//  pattern.
//
//  WHY CSP HAD ZERO AUTHORED VALUES
//  ap-csp was the only course with no denominator authority of any kind: no
//  course_denominators rows and no graded course_manifest rows. Its 53 graded
//  columns were therefore denominated by whatever the page happened to paint,
//  which the page-side lessonPct() fallback scraped out of rendered text. With
//  this seeded, every CSP percentage is computed against a number that was
//  counted from the page instead.
//
//  WHY PER LESSON, NOT PER ACTIVITY TYPE
//  Kept per lesson even though the values are currently uniform. The cyber seed
//  learned this the hard way: an earlier pass there authored one value per
//  activity type and was wrong for nearly every column. A per-lesson table costs
//  nothing and means a single page changing its question count is a one line
//  edit rather than a re-think.
//
//  WHAT IS DELIBERATELY ABSENT
//  The Big Idea unit tests (ap-csp-course-bi{N}-unit-test). They are their own
//  pages and do not map onto the lesson|activity key this table uses.
//
//  EXERCISE 2, AND WHY IT IS GATED
//  Until 2026-08-17 exercise-2 was absent here too, on the reasoning that a
//  denominator would price a column that does not count. Half of that reasoning
//  was about grading and half was about the pages: there were no exercise-2
//  pages anywhere in CSP, so there was nothing to denominate.
//
//  The pages now exist in the repo (lib/csp-course-pages.js, 35 of them, six
//  MCQs each) and ship through scripts/csp-pages-csv.js. Their denominators are
//  DERIVED from the bank rather than scanned off a page, which is stronger
//  evidence than a scan: the page is generated from the bank, so the count
//  cannot drift from what the page paints.
//
//  They stay behind CSP_EXERCISE_2_PAGES_LIVE because a denominator seeded
//  before the import lands would give every CSP class 35 columns reading 0 of 6
//  for work no student could possibly have done yet. That is the same failure
//  the unit-test columns were added to prevent, pointed the other way: an
//  assessment that does not exist must not look like one nobody has taken.
//  Flip the flag after the Matrixify import is verified live, then run with
//  --update.
//
//  Seeding these changes what gradebooks DISPLAY, not what they count. CSP
//  resolves games_graded to false by default (lib/gradebook-contract.js), so an
//  exercise-2 column keeps its cell and its number and stays out of the grade
//  until a teacher opts in per class.
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
//  Run: node scripts/seed-csp-denominators.js [--dry-run] [--update]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

const COURSE = 'ap-csp';

// `lesson|activity_type` -> points. The count observed on the page is the
// trailing comment, so the evidence travels with the number.
const POINTS = {

  // Big Idea 1: Creative Development
  'collaboration|quiz':                        6,   // 6 <div class="mcq-item" data-activity="quiz">
  'program-function-purpose|quiz':             6,   // 6 <div class="mcq-item" data-activity="quiz">
  'program-design-development|quiz':           6,   // 6 <div class="mcq-item" data-activity="quiz">
  'identifying-correcting-errors|quiz':        6,   // 6 <div class="mcq-item" data-activity="quiz">

  // Big Idea 2: Data
  'binary-numbers|quiz':                       6,   // 6 <div class="mcq-item" data-activity="quiz">
  'data-compression|quiz':                     6,   // 6 <div class="mcq-item" data-activity="quiz">
  'extracting-information|quiz':               6,   // 6 <div class="mcq-item" data-activity="quiz">
  'using-programs-with-data|quiz':             6,   // 6 <div class="mcq-item" data-activity="quiz">

  // Big Idea 3: Algorithms and Programming
  'variables|quiz':                            6,   // 6 <div class="mcq-item" data-activity="quiz">
  'variables|exercise-1':                      8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'data-abstraction|quiz':                     6,   // 6 <div class="mcq-item" data-activity="quiz">
  'data-abstraction|exercise-1':               8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'mathematical-expressions|quiz':             6,   // 6 <div class="mcq-item" data-activity="quiz">
  'mathematical-expressions|exercise-1':       8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'strings|quiz':                              6,   // 6 <div class="mcq-item" data-activity="quiz">
  'strings|exercise-1':                        8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'boolean-expressions|quiz':                  6,   // 6 <div class="mcq-item" data-activity="quiz">
  'boolean-expressions|exercise-1':            8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'conditionals|quiz':                         6,   // 6 <div class="mcq-item" data-activity="quiz">
  'conditionals|exercise-1':                   8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'nested-conditionals|quiz':                  6,   // 6 <div class="mcq-item" data-activity="quiz">
  'nested-conditionals|exercise-1':            8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'iteration|quiz':                            6,   // 6 <div class="mcq-item" data-activity="quiz">
  'iteration|exercise-1':                      8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'developing-algorithms|quiz':                6,   // 6 <div class="mcq-item" data-activity="quiz">
  'developing-algorithms|exercise-1':          8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'lists|quiz':                                6,   // 6 <div class="mcq-item" data-activity="quiz">
  'lists|exercise-1':                          8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'binary-search|quiz':                        6,   // 6 <div class="mcq-item" data-activity="quiz">
  'binary-search|exercise-1':                  8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'calling-procedures|quiz':                   6,   // 6 <div class="mcq-item" data-activity="quiz">
  'calling-procedures|exercise-1':             8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'developing-procedures|quiz':                6,   // 6 <div class="mcq-item" data-activity="quiz">
  'developing-procedures|exercise-1':          8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'libraries|quiz':                            6,   // 6 <div class="mcq-item" data-activity="quiz">
  'libraries|exercise-1':                      8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'random-values|quiz':                        6,   // 6 <div class="mcq-item" data-activity="quiz">
  'random-values|exercise-1':                  8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'simulations|quiz':                          6,   // 6 <div class="mcq-item" data-activity="quiz">
  'simulations|exercise-1':                    8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'algorithmic-efficiency|quiz':               6,   // 6 <div class="mcq-item" data-activity="quiz">
  'algorithmic-efficiency|exercise-1':         8,   // 8 <div class="mcq-item" data-activity="exercise-1">
  'undecidable-problems|quiz':                 6,   // 6 <div class="mcq-item" data-activity="quiz">
  'undecidable-problems|exercise-1':           8,   // 8 <div class="mcq-item" data-activity="exercise-1">

  // Big Idea 4: Computer Systems and Networks
  'the-internet|quiz':                         6,   // 6 <div class="mcq-item" data-activity="quiz">
  'fault-tolerance|quiz':                      6,   // 6 <div class="mcq-item" data-activity="quiz">
  'parallel-distributed-computing|quiz':       6,   // 6 <div class="mcq-item" data-activity="quiz">

  // Big Idea 5: Impact of Computing
  'beneficial-harmful-effects|quiz':           6,   // 6 <div class="mcq-item" data-activity="quiz">
  'digital-divide|quiz':                       6,   // 6 <div class="mcq-item" data-activity="quiz">
  'computing-bias|quiz':                       6,   // 6 <div class="mcq-item" data-activity="quiz">
  'crowdsourcing|quiz':                        6,   // 6 <div class="mcq-item" data-activity="quiz">
  'legal-ethical-concerns|quiz':               6,   // 6 <div class="mcq-item" data-activity="quiz">
  'safe-computing|quiz':                       6,   // 6 <div class="mcq-item" data-activity="quiz">
};

// ── EXERCISE 2 ───────────────────────────────────────────────────────────────
// Flip to true once scripts/csp-pages-csv.js has been imported and the pages
// are verified live. See the header for why this is gated rather than seeded
// straight away.
const CSP_EXERCISE_2_PAGES_LIVE = false;

if (CSP_EXERCISE_2_PAGES_LIVE) {
  // Derived from the bank that generates the page, so the denominator and the
  // number of graded items on the page are the same value by construction.
  for (const bank of require('../seed/csp-exercise-2')) {
    POINTS[`${bank.slug}|exercise-2`] = bank.questions.length;
  }
}

// Lesson -> unit, from the COURSES config. course_denominators requires a unit
// column but its primary key does not include one, so this only has to be
// right, never load-bearing. A lesson the config does not know is skipped
// rather than filed under a guessed Big Idea.
function unitIndex() {
  const idx = new Map();
  const cfg = COURSES[COURSE];
  for (const [unitId, u] of Object.entries((cfg && cfg.units) || {})) {
    for (const lesson of (u.lessons || [])) if (!idx.has(lesson)) idx.set(lesson, unitId);
  }
  return idx;
}

function buildRows() {
  const idx = unitIndex();
  const rows = [];
  for (const [key, possible] of Object.entries(POINTS)) {
    const sep = key.indexOf('|');
    const lesson = key.slice(0, sep);
    const activity_type = key.slice(sep + 1);
    const unit = idx.get(lesson);
    if (!unit) continue;
    rows.push({ course: COURSE, unit, lesson, activity_type, possible });
  }
  return rows;
}

function seedCspDenominators({ update = false, dryRun = false } = {}) {
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
  const r = seedCspDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
  });
  if (r.mode === 'dry-run') {
    console.log(`csp denominators DRY RUN: ${r.would_add} of ${r.total} would be written`);
    for (const x of r.rows) console.log(`  ${x.lesson.padEnd(30)} ${x.activity_type.padEnd(12)} out of ${x.possible}`);
  } else {
    console.log(`csp denominators: ${r.changed} of ${r.total} rows written (mode: ${r.mode})`);
  }
}

module.exports = { seedCspDenominators, buildRows, POINTS };
