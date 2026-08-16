'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COURSE MANIFEST SEED - the denominator authority for every course whose
//  grades arrive through POST /api/progress/attempt.
//
//  Visit items are generated straight from the COURSES config in utils.js
//  (CSA: 53 lessons across Units 1-4, 2025-2026 CED; CSP: 35 lessons across
//  Big Ideas 1-5; networking: 22 topics; intro-java: 42 lessons across 6
//  units), so the manifest can never drift from what /track records.
//
//  Graded (cfu/quiz) items are seeded for the CSA Unit 1 pilot only. The
//  manifest grows as reporters go live on more units.
//
//  Runs automatically on server boot in insert-or-ignore mode, so a fresh
//  deploy is never fail-closed with an empty manifest. Point or item edits in
//  this file are pushed to existing rows with:
//
//      node scripts/seed-manifest.js --update
//
//  Insert-or-ignore on boot deliberately never overwrites, so a row adjusted
//  directly in production SQLite survives restarts until an explicit --update.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

// Courses whose visit items come from the COURSES config. Cyber keeps its
// existing grade-reporting path and is intentionally not seeded here.
const VISIT_COURSES = ['ap-csa', 'ap-csp', 'ap-networking', 'intro-java'];

// CSA Unit 1 pilot: graded items per lesson, counted from the 2026-07-07
// Matrixify pages export. cfus = auto-graded apcs-ex widgets in the lesson
// body (item ids 1.X-cfu-1 .. 1.X-cfu-N in DOM order, 1 point each). quiz =
// question count of the Tier 3 AP Mastery Challenge section, which serves as
// the lesson quiz (item id 1.X-quiz, 1 point per question); quiz: 0 means the
// page has no mastery section and gets no quiz row. Reveal-rubric FRQs,
// games, and the code editor are not auto-graded and are never manifest
// items. Recount when pages change and push with --update.
//
// 1.1 and 1.2 carry `cfu_items` instead of a count. They are the only Unit 1
// pages with non-MCQ widgets: cfu-3 is `matching`, cfu-4 is `scenario-sort`,
// cfu-5 is `cloze`. Those three have no grading logic on the page at all (no
// interaction handler, nothing that sets .apcs-ex-feedback.show), so they can
// never report an attempt. Seeding them would put six items in the denominator
// while only three can ever be earned, capping every student at 50 percent on
// those lessons for a reason no teacher could see. Only the MCQ widgets, which
// are cfu-1, cfu-2 and cfu-6, are seeded. Note the gap: the gradeable items are
// NOT 1 through 3, so this cannot be expressed as a smaller count.
// When the three widget types are implemented, restore these two to
// { cfus: 6, quiz: 2 } and run --update; the rows come back with no data change.
//
// 1.1 and 1.2 briefly carried `cfu_items: [1, 2, 6]`, on the belief that their
// matching / scenario-sort / cloze widgets could never be graded because no
// interaction code existed for them. That was wrong in an important way: the
// items have 56 recorded attempts between them, so students HAD completed them
// before the page JS went missing. The guarded prune refused to delete rows with
// attempts, which is the only reason no gradebook data was lost.
//
// The widget engine is restored in the theme repo (assets/apcs-widgets.js), so
// all six CFUs on both pages can be earned again and the full range is seeded.
// Prefer fixing the page over shrinking the manifest.
const CSA_UNIT1_GRADED = {
  '1.1':  { cfus: 6, quiz: 2 },
  '1.2':  { cfus: 6, quiz: 2 },
  '1.3':  { cfus: 8, quiz: 2 },
  '1.4':  { cfus: 8, quiz: 2 },
  '1.5':  { cfus: 8, quiz: 2 },
  '1.6':  { cfus: 8, quiz: 0 },
  '1.7':  { cfus: 6, quiz: 2 },
  '1.8':  { cfus: 6, quiz: 2 },
  '1.9':  { cfus: 6, quiz: 2 },
  '1.10': { cfus: 8, quiz: 2 },
  '1.11': { cfus: 8, quiz: 2 },
  '1.12': { cfus: 6, quiz: 2 },
  '1.13': { cfus: 8, quiz: 2 },
  '1.14': { cfus: 8, quiz: 2 },
  '1.15': { cfus: 8, quiz: 2 },
};

// Judge0-backed code editors, counted from the same export: one Try It
// Yourself editor per lesson except 1.7 and 1.8, which have none. NOT yet
// seeded. An editor becomes a graded item only when its page defines an
// expected output or test cases, carries data-item-id="1.X-code-1", and its
// script calls APCS_reportAttempt on the first passing run (contract in
// shopify/apcs-reporter.js). Flip CODE_ITEMS_ENABLED when that ships, then
// run --update. Until then these rows stay out of the manifest so
// denominators are not deflated by items nobody can earn. Grades are
// test-case pass counts only; student source code is never stored.
const CODE_ITEMS_ENABLED = true;
const CSA_UNIT1_CODE = {
  '1.1': 1, '1.2': 1, '1.3': 1, '1.4': 1, '1.5': 1, '1.6': 1,
  '1.7': 0, '1.8': 0,
  '1.9': 1, '1.10': 1, '1.11': 1, '1.12': 1, '1.13': 1, '1.14': 1, '1.15': 1,
};

// CSA Unit 3 built lessons (the whole-activity page generation). Counts and
// point weights read from each page's LESSON_DATA in the 2026-07-29 Matrixify
// pages export: exercise-1 is 8 runnable problems worth 10 points (six 1-point
// and two 2-point), exercise-2 is the 6-round game (1 point per round), the
// quiz is 12 AP-style MCQs (1 point each), and exercise-3 is the 4-point FRQ.
// One manifest row PER ACTIVITY (the page reports one attempt per activity
// with per-problem results in the detail JSON), unlike Unit 1's row-per-widget
// model. Lessons 3.2 and 3.5 to 3.9 have no pages yet; add them here as they
// ship, then run --update.
const CSA_UNIT3_GRADED = {
  '3.1': { 'exercise-1': 10, 'exercise-2': 6, quiz: 12, 'exercise-3': 4 },
  '3.3': { 'exercise-1': 10, 'exercise-2': 6, quiz: 12, 'exercise-3': 4 },
  '3.4': { 'exercise-1': 10, 'exercise-2': 6, quiz: 12, 'exercise-3': 4 },
};

// AP Networking graded items per topic. cfu_ids lists WHICH checks exist as a
// reporting element on the page, not how many the lesson plan mentions. Every
// topic page carries exactly one graded practice widget, tagged
// data-item-id="U.T-cfu-2", and that is the only cfu the theme reporter can
// ever emit. cfu-1 and cfu-3 are named in the lesson notes as spoken checks for
// understanding; no page element exists for them.
//
// They were seeded anyway, which put 44 points of denominator across the course
// that no student could earn: 22 topics times the two missing checks. That is
// the failure smoke/manifest-prune.js exists to prevent, and it is why this is
// a list of ids rather than a count. A count invites "there are three CFUs in
// the lesson" when the question is "how many can report a score".
//
// Adding cfu-1 and cfu-3 back is a page-authoring job, not a seed change: build
// the widget, tag it, then add its id here. quiz = topic quiz
// question count (item id U.T-quiz, 1 point per question). The unit is
// derived from the lesson id prefix (2.3 -> unit-2).
// Only authored topics are listed; adding a NEW topic's items later is safe,
// but changing an existing item's points retroactively moves percentages, so
// counts here must match the shipped page. Topic 1.1 is the authored exemplar.
const NET_GRADED = {
  '1.1': { cfu_ids: [2], quiz: 8 },
  '1.2': { cfu_ids: [2], quiz: 8 },
  '1.3': { cfu_ids: [2], quiz: 8 },
  '1.4': { cfu_ids: [2], quiz: 8 },
  '2.1': { cfu_ids: [2], quiz: 8 },
  '2.2': { cfu_ids: [2], quiz: 8 },
  '2.3': { cfu_ids: [2], quiz: 8 },
  '2.4': { cfu_ids: [2], quiz: 8 },
  '2.5': { cfu_ids: [2], quiz: 8 },
  '2.6': { cfu_ids: [2], quiz: 8 },
  '3.1': { cfu_ids: [2], quiz: 8 },
  '3.2': { cfu_ids: [2], quiz: 8 },
  '3.3': { cfu_ids: [2], quiz: 8 },
  '3.4': { cfu_ids: [2], quiz: 8 },
  '3.5': { cfu_ids: [2], quiz: 8 },
  '3.6': { cfu_ids: [2], quiz: 8 },
  '4.1': { cfu_ids: [2], quiz: 8 },
  '4.2': { cfu_ids: [2], quiz: 8 },
  '4.3': { cfu_ids: [2], quiz: 8 },
  '4.4': { cfu_ids: [2], quiz: 8 },
  '4.5': { cfu_ids: [2], quiz: 8 },
  '4.6': { cfu_ids: [2], quiz: 8 },
};

// AP Networking unit tests: one cumulative test per unit, item id U-test, at
// the lesson_id 'test-N', one per test, so it never collides with a topic row.
// ONE LESSON ID PER INSTRUMENT. Sharing a single 'test' across all four
// collapsed them into one gradebook cell: the rollup keys cells by
// (student, lesson, activity), so a student who scored 14 of 16 on the Unit 1
// test read 14/88, the whole year's tests as the denominator, filed under
// unit-1 because unitOf takes the first match. The same mistake was extended to
// the exams and the labs before it was caught. It is not a display bug; every
// student looks like they are failing. Points are the
// mc_points declared by each unit's own units/N/test/unit-test.yaml in the
// course repo (the MC item count). The two free-response prompts on each test
// are scored offline against the rubric and are deliberately NOT manifest
// items, so the denominator here matches exactly what auto-grades.
const NET_UNIT_TESTS = {
  'unit-1': 16,
  'unit-2': 24,
  'unit-3': 24,
  'unit-4': 24,
};

// AP Networking browser labs, one per unit, from labs/labs.yaml in the course
// repo. Eight checkpoints each, one point per checkpoint.
//
// lesson_id equals the item id, one per lab, so each lab gets its own cell with
// its own denominator. POST /api/progress/attempt 400s a submission whose
// lesson_id disagrees with its manifest row, so this string and the one the
// widget posts are a contract: changing one without the other silently drops
// every lab grade. The widget derives it from item_id for that reason.
//
// Unlike the unit tests and the exams, these ARE delivered in the browser and
// report themselves, so seeding them adds denominator that a student can
// actually earn. Seed them only once the lab pages are live; a manifest row for
// a page nobody can open is the exact failure smoke/manifest-prune.js exists to
// prevent.
const NET_LABS = {
  'lab-1': { unit: 'unit-1', points: 8 },
  'lab-2': { unit: 'unit-2', points: 8 },
  'lab-3': { unit: 'unit-3', points: 8 },
  'lab-4': { unit: 'unit-4', points: 8 },
};

// AP Networking cumulative exams, assembled in the course repo from the topic
// quiz and unit-test banks (exams/blueprints.yaml there). Points are the
// multiple-choice count, which is the only auto-graded section; free-response
// prompts are scored offline against the performance-task rubrics, exactly as
// the unit tests already work.
//
// The baseline diagnostic is deliberately absent. It runs in week 1 before any
// instruction, it is not graded for marks, and seeding it would put 20 points
// a student cannot yet earn into every denominator on every dashboard.
//
// lesson_id equals the item id, one per exam, so the midterm and the final are
// separate cells rather than one 130-point lump.
const NET_EXAMS = {
  'exam-midterm': 40,
  'exam-practice-pilot': 40,
  'exam-final': 50,
};

// Intro to Java with Greenfoot graded items, DERIVED from the authored content
// bank rather than counted by hand. seed/intro-java-unit1.js is the single
// source of truth for what actually exists on a lesson, so a denominator here
// cannot drift from the page the way a hand-maintained count does. Add a unit
// to INTRO_JAVA_BANKS as its bank lands.
//
// Points follow the item table in docs/intro-java-course-spec.md: one point per
// CFU, one point per gap HOLE (ONE item worth N points, never N items, so a
// class of 30 is 30 inserts and not 300), one point per quiz question.
//
// ── WHY THIS IS STILL GATED ─────────────────────────────────────────────────
// Content existing in this repo is NOT the same fact as a student being able to
// open it. Unit 1's pages have not shipped to Shopify yet, so seeding these rows
// now would put earnable-looking points in every denominator that nobody can
// reach, which marks every student down for a reason no teacher can see. That is
// exactly what smoke/manifest-prune.js exists to catch, and it is the same flag
// shape CODE_ITEMS_ENABLED already uses above.
//
// Flip to true in the SAME pass that imports the pages, then run --update.
const INTRO_JAVA_PAGES_LIVE = false;

const { BANKS: INTRO_JAVA_BANKS } = require('../seed/intro-java-banks');

function introJavaGradedRows() {
  if (!INTRO_JAVA_PAGES_LIVE) return [];
  const rows = [];
  for (const bank of INTRO_JAVA_BANKS) {
    const unit = bank.unit;
    for (const l of bank.lessons) {
      for (const c of l.cfus) {
        rows.push({ course: 'intro-java', unit, lesson_id: l.lesson,
          item_id: `${l.lesson}-${c.id}`, item_type: 'cfu', points: 1 });
      }
      if (l.gap && l.gap.holes.length) {
        rows.push({ course: 'intro-java', unit, lesson_id: l.lesson,
          item_id: `${l.lesson}-gap`, item_type: 'gap', points: l.gap.holes.length });
      }
      if (l.quiz && l.quiz.length) {
        rows.push({ course: 'intro-java', unit, lesson_id: l.lesson,
          item_id: `${l.lesson}-quiz`, item_type: 'quiz', points: l.quiz.length });
      }
    }
  }
  return rows;
}

// Unit projects. Only the auto-graded TASK half of a project can ever be a
// manifest row, one row per checked task so the gradebook can answer "which
// task is the class stuck on". The built Greenfoot scenario runs on the desktop,
// cannot report itself, and is teacher-scored through
// POST /api/teacher/classes/:code/scores. Never add a row for the scenario, and
// never add one for a self-attested task: a checkbox is not evidence.
//
//   'project-1': { tasks: 8 }
const INTRO_JAVA_PROJECTS = {};

function buildRows() {
  const rows = [];

  // One visit item per lesson, both full courses.
  for (const course of VISIT_COURSES) {
    for (const [unit, cfg] of Object.entries(COURSES[course].units)) {
      for (const lesson of cfg.lessons) {
        rows.push({ course, unit, lesson_id: lesson, item_id: `${lesson}-visit`, item_type: 'visit', points: 1 });
      }
    }
  }

  // CSA Unit 1 cfu/quiz items (the pilot). A lesson declares either `cfus` (the
  // widgets are 1..N, the ordinary case) or `cfu_items` (an explicit list, for a
  // page where only some widgets can be graded; see the note on 1.1 and 1.2).
  for (const [lesson, cfg] of Object.entries(CSA_UNIT1_GRADED)) {
    const cfuNumbers = cfg.cfu_items
      ? cfg.cfu_items
      : Array.from({ length: cfg.cfus }, (_, i) => i + 1);
    for (const i of cfuNumbers) {
      rows.push({ course: 'ap-csa', unit: 'unit-1', lesson_id: lesson, item_id: `${lesson}-cfu-${i}`, item_type: 'cfu', points: 1 });
    }
    if (cfg.quiz > 0) {
      rows.push({ course: 'ap-csa', unit: 'unit-1', lesson_id: lesson, item_id: `${lesson}-quiz`, item_type: 'quiz', points: cfg.quiz });
    }
  }

  if (CODE_ITEMS_ENABLED) {
    for (const [lesson, nEditors] of Object.entries(CSA_UNIT1_CODE)) {
      for (let i = 1; i <= nEditors; i++) {
        rows.push({ course: 'ap-csa', unit: 'unit-1', lesson_id: lesson, item_id: `${lesson}-code-${i}`, item_type: 'cfu', points: 1 });
      }
    }
  }

  // CSA Unit 3 whole-activity items (built lessons only).
  for (const [lesson, acts] of Object.entries(CSA_UNIT3_GRADED)) {
    for (const [act, points] of Object.entries(acts)) {
      rows.push({ course: 'ap-csa', unit: 'unit-3', lesson_id: lesson, item_id: `${lesson}-${act}`, item_type: act, points });
    }
  }

  // AP Networking cfu/quiz items (authored topics only).
  for (const [lesson, cfg] of Object.entries(NET_GRADED)) {
    const unit = `unit-${lesson.split('.')[0]}`;
    for (const i of cfg.cfu_ids) {
      rows.push({ course: 'ap-networking', unit, lesson_id: lesson, item_id: `${lesson}-cfu-${i}`, item_type: 'cfu', points: 1 });
    }
    if (cfg.quiz > 0) {
      rows.push({ course: 'ap-networking', unit, lesson_id: lesson, item_id: `${lesson}-quiz`, item_type: 'quiz', points: cfg.quiz });
    }
  }

  // AP Networking unit tests (one per unit).
  for (const [unit, points] of Object.entries(NET_UNIT_TESTS)) {
    const n = unit.split('-')[1];
    rows.push({ course: 'ap-networking', unit, lesson_id: `test-${n}`, item_id: `${n}-test`, item_type: 'quiz', points });
  }

  // AP Networking browser labs (one per unit).
  for (const [itemId, cfg] of Object.entries(NET_LABS)) {
    rows.push({ course: 'ap-networking', unit: cfg.unit, lesson_id: itemId, item_id: itemId, item_type: 'quiz', points: cfg.points });
  }

  // AP Networking cumulative exams (course-wide, not tied to one unit).
  for (const [itemId, points] of Object.entries(NET_EXAMS)) {
    rows.push({ course: 'ap-networking', unit: 'course', lesson_id: itemId, item_id: itemId, item_type: 'quiz', points });
  }

  // Intro to Java graded items, derived from the content bank. Empty until
  // INTRO_JAVA_PAGES_LIVE is flipped in the pass that ships the pages.
  for (const r of introJavaGradedRows()) rows.push(r);

  // Intro to Java project tasks. lesson_id is its own instrument id
  // ('project-1'), never a lesson number, so a project can never share a
  // gradebook cell with a lesson the way the networking unit tests once did.
  for (const [lessonId, cfg] of Object.entries(INTRO_JAVA_PROJECTS)) {
    const unit = `unit-${lessonId.split('-')[1]}`;
    for (let i = 1; i <= cfg.tasks; i++) {
      rows.push({ course: 'intro-java', unit, lesson_id: lessonId,
        item_id: `${lessonId}-task-${i}`, item_type: 'gap', points: 1 });
    }
  }

  return rows;
}

function seedManifest({ update = false } = {}) {
  const rows = buildRows();
  const insert = update
    ? db.prepare(`
        INSERT INTO course_manifest (course, unit, lesson_id, item_id, item_type, points)
        VALUES (@course, @unit, @lesson_id, @item_id, @item_type, @points)
        ON CONFLICT(course, item_id) DO UPDATE SET
          unit = excluded.unit, lesson_id = excluded.lesson_id,
          item_type = excluded.item_type, points = excluded.points
      `)
    : db.prepare(`
        INSERT OR IGNORE INTO course_manifest (course, unit, lesson_id, item_id, item_type, points)
        VALUES (@course, @unit, @lesson_id, @item_id, @item_type, @points)
      `);

  const changed = db.transaction((rs) => {
    let n = 0;
    for (const r of rs) n += insert.run(r).changes;
    return n;
  })(rows);

  return { total: rows.length, changed, mode: update ? 'update' : 'ignore' };
}

// ── PRUNE (report by default, delete only when asked, never with attempts) ────
//  Seeding is insert-or-upsert and never deletes, which is the right default
//  against a live database. But un-seeding an item leaves its row behind, and a
//  manifest row IS a denominator: an item nobody can earn quietly marks every
//  student down. That is exactly the 1.1 / 1.2 case above.
//
//  So this reports orphans (rows in the manifest that buildRows no longer
//  produces) and deletes them ONLY with --prune. An orphan that has ANY recorded
//  attempt is never deleted, whatever the flags say: attempts are gradebook data
//  and a manifest row is what makes one legible. Those are reported as kept, so
//  a real conflict surfaces instead of being silently resolved.
//
//  Deleting a manifest row is reversible: restore the seed entry and re-run.
//  Nothing on `attempts`, `score_events` or `progress` is touched here.
function findOrphans() {
  const wanted = new Set(buildRows().map((r) => `${r.course}|${r.item_id}`));
  const live = db.prepare('SELECT course, unit, lesson_id, item_id, item_type, points FROM course_manifest').all();
  const orphans = [];
  for (const row of live) {
    if (wanted.has(`${row.course}|${row.item_id}`)) continue;
    const attempts = db.prepare(
      'SELECT COUNT(*) n FROM attempts WHERE course = ? AND item_id = ?'
    ).get(row.course, row.item_id).n;
    orphans.push({ ...row, attempts });
  }
  return orphans;
}

function pruneManifest({ apply = false } = {}) {
  const orphans = findOrphans();
  const removable = orphans.filter((o) => o.attempts === 0);
  const kept = orphans.filter((o) => o.attempts > 0);
  let deleted = 0;
  if (apply && removable.length) {
    const del = db.prepare('DELETE FROM course_manifest WHERE course = ? AND item_id = ?');
    deleted = db.transaction((rs) => {
      let n = 0;
      for (const r of rs) n += del.run(r.course, r.item_id).changes;
      return n;
    })(removable);
  }
  return { orphans, removable, kept, deleted, applied: !!apply };
}

// ── ONE-SHOT: the 44 dead AP Networking CFU rows ─────────────────────────────
//  Every ap-networking topic page carries exactly one graded practice widget,
//  tagged cfu-2. cfu-1 and cfu-3 are spoken checks with no page element and were
//  seeded anyway: 22 topics times two, 44 points of denominator no student can
//  earn. Un-seeding them is not enough, because the boot seed never deletes.
//
//  The general MANIFEST_PRUNE flag is the right mechanism for orphans in the
//  abstract, but it needs dashboard access. This clears these specific rows
//  without it, and ONLY these:
//
//   • scoped to ap-networking, so the 30 legitimate ap-csa cfu-1/cfu-3 rows are
//     untouched. A pattern match on the item id alone would have deleted them.
//   • an exact id allowlist DERIVED from the seed, not typed. The topics that
//     seed a cfu-2 are exactly the topics that used to seed cfu-1 and cfu-3.
//   • only rows findOrphans() already considers orphaned, so an id that the
//     seed starts producing again is immediately out of scope.
//   • zero-attempt only. A row with recorded work is never deleted, matching
//     pruneManifest's guarantee rather than working around it.
//
//  Reversible: put the ids back in NET_GRADED and the next boot re-seeds them.
//  Remove this once a deploy logs zero. It is a migration, not a feature.
function deadNetworkingCfuIds() {
  const ids = new Set();
  for (const r of buildRows()) {
    if (r.course === 'ap-networking' && r.item_type === 'cfu') {
      ids.add(`${r.lesson_id}-cfu-1`);
      ids.add(`${r.lesson_id}-cfu-3`);
    }
  }
  return ids;
}

function cleanDeadNetworkingCfus({ apply = true } = {}) {
  const ids = deadNetworkingCfuIds();
  const all = findOrphans().filter((o) => o.course === 'ap-networking' && ids.has(o.item_id));
  const removable = all.filter((o) => o.attempts === 0);
  const kept = all.filter((o) => o.attempts > 0);
  let deleted = 0;
  if (apply && removable.length) {
    const del = db.prepare('DELETE FROM course_manifest WHERE course = ? AND item_id = ?');
    deleted = db.transaction((rs) => {
      let n = 0;
      for (const r of rs) n += del.run(r.course, r.item_id).changes;
      return n;
    })(removable);
  }
  const points = removable.reduce((a, r) => a + r.points, 0);
  return { candidates: all.length, removable, kept, deleted, points };
}

if (require.main === module) {
  const apply = process.argv.includes('--prune');
  const result = seedManifest({ update: process.argv.includes('--update') });
  console.log(`course_manifest seed: ${result.changed} of ${result.total} rows written (mode: ${result.mode})`);

  const p = pruneManifest({ apply });
  if (!p.orphans.length) {
    console.log('course_manifest prune: no orphaned rows.');
  } else {
    for (const o of p.removable) {
      console.log(`  ${apply ? 'removed' : 'ORPHAN (run --prune to remove)'}: ${o.course} ${o.item_id} (${o.item_type}, ${o.points} pt, 0 attempts)`);
    }
    for (const o of p.kept) {
      console.log(`  KEPT, has ${o.attempts} attempt(s), refusing to delete: ${o.course} ${o.item_id}`);
    }
    console.log(`course_manifest prune: ${p.orphans.length} orphan(s), ${p.removable.length} removable, ${p.deleted} deleted.`);
  }
}

module.exports = { seedManifest, buildRows, findOrphans, pruneManifest,
  deadNetworkingCfuIds, cleanDeadNetworkingCfus };
