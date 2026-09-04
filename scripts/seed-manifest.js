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
const labSpecs = require('../lib/lab-spec');
const cyberTopics = require('../lib/cyber-topics');

// Courses whose visit items come from the COURSES config. Cyber is absent on
// purpose: its visit rows come from the canonical CED taxonomy instead, one per
// TOPIC rather than one per lesson page, because the site teaches CED 3.1 as two
// pages. See the cyber block in buildRows(). Its graded work still arrives
// through the existing score_events path, which this does not touch.
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

// CSA Units 2, 3 and 4 cfu/quiz items. Same widget model as Unit 1 (one row per
// auto-graded apcs-ex widget, plus one quiz row for the mastery section), and
// the counts were produced by the same method: fetch the live lesson page,
// count the apcs-ex blocks that carry a check button, split them on whether
// they sit inside the .apcsa-mastery section. Running that method against the
// 15 Unit 1 pages reproduces CSA_UNIT1_GRADED above exactly, which is why the
// numbers below are trusted.
//
// These pages ship NO data-item-id attributes. They report because
// assets/apcs-reporter.js assigns positional ids (U.L-cfu-N in document order,
// U.L-quiz for the mastery section) on any page that carries none, so the ids
// here and the ids the page mints are one contract. Changing a page's widget
// count without recounting here means the extra widget posts an id the
// manifest does not have and 400s: loud, and never a wrong grade.
//
// 3.1, 3.3 and 3.4 are absent on purpose. They are built-model pages with a
// LESSON_DATA block and no apcs-ex widgets at all; their rows come from
// CSA_UNIT3_GRADED below.
const CSA_UNIT234_GRADED = {
  '2.1':   { cfus: 8, quiz: 4 },
  '2.2':   { cfus: 8, quiz: 4 },
  '2.3':   { cfus: 8, quiz: 4 },
  '2.4':   { cfus: 8, quiz: 4 },
  '2.5':   { cfus: 8, quiz: 4 },
  '2.6':   { cfus: 8, quiz: 4 },
  '2.7':   { cfus: 8, quiz: 4 },
  '2.8':   { cfus: 8, quiz: 4 },
  '2.9':   { cfus: 8, quiz: 4 },
  '2.10':  { cfus: 8, quiz: 4 },
  '2.11':  { cfus: 8, quiz: 4 },
  '2.12':  { cfus: 8, quiz: 4 },
  '3.2':   { cfus: 8, quiz: 4 },
  '3.5':   { cfus: 8, quiz: 4 },
  '3.6':   { cfus: 8, quiz: 4 },
  '3.7':   { cfus: 8, quiz: 4 },
  '3.8':   { cfus: 8, quiz: 4 },
  '3.9':   { cfus: 8, quiz: 4 },
  '4.1':   { cfus: 5, quiz: 3 },
  '4.2':   { cfus: 4, quiz: 4 },
  '4.3':   { cfus: 6, quiz: 4 },
  '4.4':   { cfus: 5, quiz: 5 },
  '4.5':   { cfus: 5, quiz: 5 },
  '4.6':   { cfus: 5, quiz: 5 },
  '4.7':   { cfus: 5, quiz: 5 },
  '4.8':   { cfus: 5, quiz: 5 },
  '4.9':   { cfus: 5, quiz: 5 },
  '4.10':  { cfus: 5, quiz: 5 },
  '4.11':  { cfus: 5, quiz: 5 },
  '4.12':  { cfus: 5, quiz: 5 },
  '4.13':  { cfus: 5, quiz: 5 },
  '4.14':  { cfus: 5, quiz: 5 },
  '4.15':  { cfus: 5, quiz: 5 },
  '4.16':  { cfus: 5, quiz: 5 },
  '4.17':  { cfus: 5, quiz: 5 },
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

// ── AP NETWORKING HANDS-ON WORK. NOT SEEDED YET, ON PURPOSE ──────────────────
//
// WHY THESE EXIST
//   docs/ap-networking-full-year-readiness.md measured the course against the
//   verbs its own framework uses. Sub-skills ending .C ("implement and
//   document") and .D ("verify") are 13 of the 55 skill assignments, or 24%,
//   and appear in 10 of the 22 topics, and the course answered them with four
//   browser labs worth 32 of 448 points, or 7%. Skill category 4, Collaborate,
//   is required in topics 1.4 and 2.4 and had no asset at all.
//
//   config/networking-hands-on.json is the authored spec: what the student
//   configures, which EK statement each check is anchored to, and which half is
//   auto-graded versus teacher-scored. These constants are only the manifest
//   side of it.
//
// WHY THE FLAG IS FALSE
//   Same reason NET_LABS carries its warning and INTRO_JAVA_PAGES_LIVE exists: a
//   denominator for a page nobody can open marks every student down for work
//   that does not exist, and smoke/manifest-prune.js exists to catch exactly
//   that. Flip this in the pass that ships the pages, not before.
//
// THE TWO KINDS
//   NET_CONFIG_LABS report themselves from the page, like every other graded
//   widget. NET_UNIT_DOCS and NET_TEAM_PROJECT cannot: they assess documentation
//   and teamwork, which are free text, and this API never stores free text from
//   a student. They are entered by the teacher through the score-entry route
//   that already exists (POST /api/teacher/classes/:code/scores), which already
//   validates the item against this manifest. No new write surface is needed;
//   the rows are.
const NET_HANDS_ON_LIVE = false;

// One configuration activity per topic that carries a .C or .D sub-skill.
// lesson_id is the topic, and item_type 'lab' keeps it in its own gradebook cell
// rather than sharing the topic's quiz cell.
const NET_CONFIG_LABS = {
  '1.4': 8, '2.2': 8, '2.4': 8, '2.6': 8, '3.3': 8,
  '3.4': 8, '3.5': 8, '4.3': 8, '4.4': 8, '4.5': 8,
};

// One documentation record per unit, teacher-scored. Per unit and not per topic
// because ten of these is 300 hand entries for a class of thirty, which is a
// feature nobody uses; four is one a teacher will actually complete.
//
// lesson_id is its own instrument id, never a topic number, for the reason given
// on INTRO_JAVA_PROJECTS below.
const NET_UNIT_DOCS = {
  'doc-1': { unit: 'unit-1', points: 6 },
  'doc-2': { unit: 'unit-2', points: 6 },
  'doc-3': { unit: 'unit-3', points: 6 },
  'doc-4': { unit: 'unit-4', points: 6 },
};

// The collaborative task, teacher-scored. unit 'course' because it draws on 1.4
// and 2.4 and is scheduled after 2.4, so it belongs to neither unit alone.
//
// This runs against the judgment recorded on INTRO_JAVA_PROJECTS, that projects
// are not worth grading into the gradebook. The difference is that intro-java
// answers to nobody, while AP Networking has to evidence skill category 4 to
// carry the Advanced Placement label, and a task scored outside the gradebook
// leaves category 4 with no evidence in the system of record. Tanner's call.
const NET_TEAM_PROJECT = {
  'team-project-1': { unit: 'course', points: 24 },
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
// ── THE GATE, NOW OPEN ──────────────────────────────────────────────────────
// Content existing in this repo is NOT the same fact as a student being able to
// open it, which is why these rows waited. Seeding them early would have put
// earnable-looking points in every denominator that nobody could reach, marking
// every student down for a reason no teacher can see.
//
// All 90 pages were imported to Shopify on 2026-08-16 and verified live against
// the Admin API: every handle present, published, and carrying the data-item-id
// attributes these rows are the denominators for. So the condition the gate was
// waiting on is met and it is open.
//
// ONE THING IS STILL NOT TRUE, and it is deliberate rather than overlooked. The
// reporter has not shipped to the theme yet, so a student can open every page
// but cannot yet submit anything. That does not make these rows wrong: the
// gradebook contract computes a grade as earned over ATTEMPTED work, so an item
// nobody has attempted is `pct: null` and drags nothing down. It shows up as
// pace, which correctly reads as "none of the course done yet".
//
// The boot seed is insert-or-ignore, so the deploy that carries this flag
// inserts these rows on its own. `--update` is only needed to push edits to rows
// that already exist.
const INTRO_JAVA_PAGES_LIVE = true;

const { BANKS: INTRO_JAVA_BANKS } = require('../seed/intro-java-banks');
const { EXERCISES: INTRO_JAVA_EXERCISES, itemId: exerciseItemId } = require('../seed/intro-java-exercises');

// The derivation and the shipping gate are two separate facts, so they are two
// separate functions. smoke/intro-java-reporter.js needs to check that every
// item id the rendered pages post to has a manifest row waiting for it, and it
// needs that answer NOW, months before the gate flips. Folding the gate into the
// derivation would have made that check impossible to write without a mock.
function introJavaRows() {
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

// ── THE EXERCISE GATE, DELIBERATELY STILL SHUT ───────────────────────────────
// The code exercises are authored and verified (seed/intro-java-exercises.js,
// proved by scripts/verify-intro-java-exercises.js), but their PAGES have not
// been imported to Shopify and the run endpoint does not exist yet. Content
// existing in this repo is not the same fact as a student being able to reach
// it, which is the whole lesson INTRO_JAVA_PAGES_LIVE above records.
//
// Seeding these rows now would put one earnable-looking point per exercise into
// every intro-java denominator with nothing on earth able to fill it, marking
// every student down for a reason no teacher could see or explain.
//
// ── THE GATE, NOW OPEN ──────────────────────────────────────────────────────
// The ten exercise pages were imported to Shopify on 2026-08-20 and verified
// live against the Admin API on 2026-08-21: every handle present, published, and
// carrying data-item-id="{U}.{L}-code-1" plus the four attributes the page
// script reads. So the condition this gate was waiting on is met.
//
// ONE THING TO KNOW ABOUT THE ORDER, because it is the opposite of what the
// original plan said. POST /api/student/code-grade refuses to grade an item with
// no manifest denominator (400, and it spends no Judge0 run), so the dangerous
// state is denominators WITHOUT test cases, not the other way round: that is the
// one where a student's correct work is told it is not graded while the column
// still counts against their pace.
//
// So the hidden cases are seeded FIRST, through POST /api/admin/code-tests/seed,
// and this flip lands after. Seeding cases early is harmless; opening the
// denominator early is not.
const INTRO_JAVA_EXERCISES_LIVE = true;

// One point per exercise. Not more: an exercise is one submission and one row,
// the same shape as a gap-fill, and weighting it above a quiz would make a
// single lesson's coding task worth more than its whole quiz for no reason
// anybody could defend to a parent.
function introJavaExerciseRows() {
  const unitOf = {};
  for (const bank of INTRO_JAVA_BANKS) {
    for (const l of bank.lessons) unitOf[l.lesson] = bank.unit;
  }
  return INTRO_JAVA_EXERCISES.map((e) => {
    const unit = unitOf[e.lesson];
    if (!unit) throw new Error(`intro-java exercise ${e.lesson} has no lesson in any bank`);
    return { course: 'intro-java', unit, lesson_id: e.lesson,
      item_id: exerciseItemId(e.lesson), item_type: 'code', points: 1 };
  });
}

function introJavaGradedRows() {
  if (!INTRO_JAVA_PAGES_LIVE) return [];
  return INTRO_JAVA_EXERCISES_LIVE
    ? [...introJavaRows(), ...introJavaExerciseRows()]
    : introJavaRows();
}

// Unit projects. THIS IS EMPTY ON PURPOSE AND IS MEANT TO STAY EMPTY.
//
// Decided 2026-08-18 by Tanner: intro-java projects are not worth grading into
// the gradebook. Read that as a teaching judgment, not a missing feature, and
// do not "finish" this map on the assumption that somebody ran out of time.
//
// The reasoning is in the shape of the work. A Greenfoot project is a built
// scenario on a desktop. It cannot report itself, so the only things a manifest
// row could ever track are the checked TASKS around it, and a task that a
// student ticks is a self-report. A checkbox is not evidence, so the row would
// carry a number that looks like a grade and is not one. Projects are scored by
// the teacher through POST /api/teacher/classes/:code/scores, where a human is
// the one making the claim, which is the honest place for it.
//
// The mechanism below still works if that call is ever revisited, one row per
// checked task, so the gradebook could answer "which task is the class stuck
// on". Never add a row for the scenario itself.
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

  // ── AP CYBERSECURITY: one visit item per CED TOPIC ────────────────────────
  //  Cyber is not in VISIT_COURSES above, and this is why: its lesson set is
  //  not the config's lesson list. The CED has 24 topics and the site teaches
  //  25 lesson pages, because CED 3.1 runs over two of them. Generating rows
  //  from the config would produce 25 denominators for a 24-topic course and
  //  file one of them under a topic number the CED does not have.
  //
  //  So the rows come from config/cyber-topics.json, which is built from the CED
  //  text itself, and the count is the CED's: 24. Adding a topic is a rebuild
  //  of that file, not an edit here.
  //
  //  WHAT THIS DOES AND DOES NOT MOVE. These are `visit` rows, and visit rows
  //  are skipped by lib/gradebook-contract.js denominatorMap and by
  //  lib/attempt-rollup.js, so no cyber score, column or percentage changes:
  //  cyber's graded work keeps arriving through score_events and its authored
  //  denominators. What DOES change is lesson completion: lib/admin-exec.js
  //  denominates that from manifest visit rows, and cyber had none, so every
  //  cyber student counted zero lessons assigned. After this they are assigned
  //  24 and their visits count, which is the number a teacher already believes
  //  they are looking at.
  //
  //  Filed under the lesson id the topic's manifest row names (3.1 -> 3.1a),
  //  because gradebook-contract builds its lesson grid from the manifest as
  //  well as from the config, so a row naming a lesson the config does not list
  //  would add a phantom column to every cyber gradebook.
  rows.push(...cyberTopics.manifestRows());

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

  // CSA Units 2-4 cfu/quiz items (positional ids, see the note on the table).
  for (const [lesson, cfg] of Object.entries(CSA_UNIT234_GRADED)) {
    const unit = `unit-${lesson.split('.')[0]}`;
    for (let i = 1; i <= cfg.cfus; i++) {
      rows.push({ course: 'ap-csa', unit, lesson_id: lesson, item_id: `${lesson}-cfu-${i}`, item_type: 'cfu', points: 1 });
    }
    if (cfg.quiz > 0) {
      rows.push({ course: 'ap-csa', unit, lesson_id: lesson, item_id: `${lesson}-quiz`, item_type: 'quiz', points: cfg.quiz });
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

  // AP Networking hands-on work. Empty until NET_HANDS_ON_LIVE is flipped in
  // the pass that ships the pages; see the block above for why.
  if (NET_HANDS_ON_LIVE) {
    for (const [lesson, points] of Object.entries(NET_CONFIG_LABS)) {
      rows.push({ course: 'ap-networking', unit: `unit-${lesson.split('.')[0]}`,
        //  terminal-lab, matching config/networking-hands-on.json and the four
        //  of these ten that have already shipped as specs in config/labs/.
        //  Plain 'lab' here would put them on the same denominator key as a
        //  per-lesson lab widget, which is the collision smoke:denomcollision
        //  now refuses.
        lesson_id: lesson, item_id: `${lesson}-lab`, item_type: 'terminal-lab', points });
    }
    for (const [itemId, cfg] of Object.entries(NET_UNIT_DOCS)) {
      rows.push({ course: 'ap-networking', unit: cfg.unit, lesson_id: itemId,
        item_id: itemId, item_type: 'project', points: cfg.points });
    }
    for (const [itemId, cfg] of Object.entries(NET_TEAM_PROJECT)) {
      rows.push({ course: 'ap-networking', unit: cfg.unit, lesson_id: itemId,
        item_id: itemId, item_type: 'project', points: cfg.points });
    }
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

  // Interactive terminal labs, derived from their own spec files.
  //
  // The row comes FROM config/labs/*.json rather than from a constant here, so
  // the denominator and the lab a student plays cannot disagree: points equal
  // the check count, lib/lab-spec.js refuses a spec where they do not, and the
  // smoke suite refuses a lab whose row and spec have drifted apart.
  //
  // Only `graded: true` specs are seeded. That is the same rule NET_LABS and
  // INTRO_JAVA_PAGES_LIVE carry: a manifest row is a denominator, and a
  // denominator for work a student cannot do marks the whole class down for a
  // reason no teacher can see on screen. A practice lab is playable and scores
  // nothing, so it gets no row.
  //
  // A lab that is ALSO listed in a constant above (4.3 is in NET_CONFIG_LABS)
  // must not produce a second row, so this skips anything already built. The
  // two agree today and the smoke suite pins that they keep agreeing.
  {
    const seen = new Set(rows.map((r) => `${r.course}|${r.item_id}`));
    for (const spec of labSpecs.graded()) {
      const k = `${spec.course}|${spec.item_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({
        course: spec.course, unit: spec.unit, lesson_id: spec.lesson_id,
        //  spec.item_type, not a literal. It is 'terminal-lab' now, and the
        //  literal here is exactly how a rename in the spec would fail to reach
        //  the denominator: the row would keep saying 'lab' and keep colliding
        //  with the per-lesson lab on the same lesson id. lib/lab-spec.js
        //  refuses any other value, so this cannot drift open.
        item_id: spec.item_id, item_type: spec.item_type, points: spec.points,
      });
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

//  ── RETYPE ATTEMPTS WRITTEN BEFORE THE terminal-lab RENAME ──────────────────
//  Every attempt on a simulated-shell lab was stored with item_type 'lab' until
//  2026-09-04. The manifest row for those items now says 'terminal-lab', and
//  attempt-rollup keys a gradebook cell on `${lesson_id}|${item_type}` from the
//  ATTEMPT row while denominating it from the MANIFEST row, so a stale 'lab'
//  attempt would look for a denominator that no longer exists under that name
//  and the student's score would fall out of the gradebook.
//
//  So the old rows move with the rename. Three things keep this safe to run on
//  every boot:
//
//    - it is an allowlist by exact (course, item_id), taken from the specs
//      themselves, never a pattern and never a course-wide sweep
//    - it only rewrites rows that still say 'lab'. Once they are moved it
//      changes nothing and reports 0, which is what makes it idempotent
//    - it touches one column. No score, no student, no row is created or
//      deleted, so the worst case is a type string that has to be moved back
//
//  Reversible by hand: UPDATE attempts SET item_type='lab' for the same ids.
function retypeTerminalLabAttempts({ apply = true } = {}) {
  const specs = labSpecs.all();
  const pairs = specs.map((sp) => [sp.course, sp.item_id]);
  if (!pairs.length) return { candidates: 0, moved: 0, byItem: [] };

  const count = db.prepare(
    "SELECT COUNT(*) n FROM attempts WHERE course = ? AND item_id = ? AND item_type = 'lab'"
  );
  const byItem = [];
  for (const [course, itemId] of pairs) {
    const n = count.get(course, itemId).n;
    if (n) byItem.push({ course, item_id: itemId, rows: n });
  }
  const candidates = byItem.reduce((a, r) => a + r.rows, 0);

  let moved = 0;
  if (apply && candidates) {
    const upd = db.prepare(
      "UPDATE attempts SET item_type = 'terminal-lab' WHERE course = ? AND item_id = ? AND item_type = 'lab'"
    );
    moved = db.transaction((rs) => {
      let n = 0;
      for (const r of rs) n += upd.run(r.course, r.item_id).changes;
      return n;
    })(byItem);
  }
  return { candidates, moved, byItem };
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
  deadNetworkingCfuIds, cleanDeadNetworkingCfus, retypeTerminalLabAttempts,
  introJavaRows, introJavaGradedRows, introJavaExerciseRows,
  INTRO_JAVA_PAGES_LIVE, INTRO_JAVA_EXERCISES_LIVE,
  NET_HANDS_ON_LIVE, NET_CONFIG_LABS, NET_UNIT_DOCS, NET_TEAM_PROJECT };
