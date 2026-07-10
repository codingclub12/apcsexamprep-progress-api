'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COURSE MANIFEST SEED — the denominator authority for ap-csa and ap-csp.
//
//  Visit items are generated straight from the COURSES config in utils.js
//  (CSA: 53 lessons across Units 1-4, 2025-2026 CED; CSP: 35 lessons across
//  Big Ideas 1-5), so the manifest can never drift from what /track records.
//
//  Graded (cfu/quiz) items are seeded for the CSA Unit 1 pilot. The CSP graded
//  map is scaffolded below with every lesson but zero counts, pending the CSP
//  pages export; fill the numbers and push with --update to light CSP up. The
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
const VISIT_COURSES = ['ap-csa', 'ap-csp'];

// CSA Unit 1 pilot: graded items per lesson, counted from the 2026-07-07
// Matrixify pages export. cfus = auto-graded apcs-ex widgets in the lesson
// body (item ids 1.X-cfu-1 .. 1.X-cfu-N in DOM order, 1 point each). quiz =
// question count of the Tier 3 AP Mastery Challenge section, which serves as
// the lesson quiz (item id 1.X-quiz, 1 point per question); quiz: 0 means the
// page has no mastery section and gets no quiz row. Reveal-rubric FRQs,
// games, and the code editor are not auto-graded and are never manifest
// items. Recount when pages change and push with --update.
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

// CSP graded items. Counts are from the 2026-07-10 Matrixify pages export.
// Unlike CSA, CSP lessons have no inline apcs-ex CFU widgets: each lesson body
// carries a single MCQ block that serves as the lesson quiz. So quiz = the
// mcq-item question count of that block (item id {slug}-quiz, 1 point per
// question) and cfus = 0 across the board. quiz: 0 means no MCQ block is
// authored yet (all of Big Idea 4 and 5 at export time) and gets no row, so
// denominators are never deflated by items nobody can earn. Keyed by CSP lesson
// slug; the unit (bi-N) is resolved from the COURSES config so item ids can
// never drift. Recount and push with --update when BI4/BI5 MCQs land or a
// block's question count changes. Reveal-rubric FRQs, the binary/compression
// demo widgets, and topic games are not auto-graded and are never manifest
// items (games post to the separate leaderboard, not the gradebook).
const CSP_GRADED = {
  // Big Idea 1: Creative Development (4-question MCQ block each)
  'collaboration':                 { cfus: 0, quiz: 4 },
  'program-function-purpose':      { cfus: 0, quiz: 4 },
  'program-design-development':    { cfus: 0, quiz: 4 },
  'identifying-correcting-errors': { cfus: 0, quiz: 4 },
  // Big Idea 2: Data (4-question MCQ block each)
  'binary-numbers':                { cfus: 0, quiz: 4 },
  'data-compression':              { cfus: 0, quiz: 4 },
  'extracting-information':        { cfus: 0, quiz: 4 },
  'using-programs-with-data':      { cfus: 0, quiz: 4 },
  // Big Idea 3: Algorithms and Programming (6-question MCQ block each)
  'variables':                     { cfus: 0, quiz: 6 },
  'data-abstraction':              { cfus: 0, quiz: 6 },
  'mathematical-expressions':      { cfus: 0, quiz: 6 },
  'strings':                       { cfus: 0, quiz: 6 },
  'boolean-expressions':           { cfus: 0, quiz: 6 },
  'conditionals':                  { cfus: 0, quiz: 6 },
  'nested-conditionals':           { cfus: 0, quiz: 6 },
  'iteration':                     { cfus: 0, quiz: 6 },
  'developing-algorithms':         { cfus: 0, quiz: 6 },
  'lists':                         { cfus: 0, quiz: 6 },
  'binary-search':                 { cfus: 0, quiz: 6 },
  'calling-procedures':            { cfus: 0, quiz: 6 },
  'developing-procedures':         { cfus: 0, quiz: 6 },
  'libraries':                     { cfus: 0, quiz: 6 },
  'random-values':                 { cfus: 0, quiz: 6 },
  'simulations':                   { cfus: 0, quiz: 6 },
  'algorithmic-efficiency':        { cfus: 0, quiz: 6 },
  'undecidable-problems':          { cfus: 0, quiz: 6 },
  // Big Idea 4: Computer Systems and Networks
  'the-internet':                  { cfus: 0, quiz: 0 },
  'fault-tolerance':               { cfus: 0, quiz: 0 },
  'parallel-distributed-computing':{ cfus: 0, quiz: 0 },
  // Big Idea 5: Impact of Computing
  'beneficial-harmful-effects':    { cfus: 0, quiz: 0 },
  'digital-divide':                { cfus: 0, quiz: 0 },
  'computing-bias':                { cfus: 0, quiz: 0 },
  'crowdsourcing':                 { cfus: 0, quiz: 0 },
  'legal-ethical-concerns':        { cfus: 0, quiz: 0 },
  'safe-computing':                { cfus: 0, quiz: 0 },
};

// Lesson slug -> unit (bi-N) for CSP, derived from the config so a typo'd slug
// in CSP_GRADED is caught (skipped) rather than seeding an orphan item id.
const CSP_UNIT_OF = {};
for (const [unit, cfg] of Object.entries(COURSES['ap-csp'].units)) {
  for (const lesson of cfg.lessons) CSP_UNIT_OF[lesson] = unit;
}

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

  // CSA Unit 1 cfu/quiz items (the pilot).
  for (const [lesson, cfg] of Object.entries(CSA_UNIT1_GRADED)) {
    for (let i = 1; i <= cfg.cfus; i++) {
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

  // CSP cfu/quiz items. Emits nothing until CSP_GRADED counts are filled, so
  // this is a safe no-op on production until the CSP pages export lands.
  for (const [lesson, cfg] of Object.entries(CSP_GRADED)) {
    const unit = CSP_UNIT_OF[lesson];
    if (!unit) continue; // slug not in the CSP config; skip rather than orphan
    for (let i = 1; i <= cfg.cfus; i++) {
      rows.push({ course: 'ap-csp', unit, lesson_id: lesson, item_id: `${lesson}-cfu-${i}`, item_type: 'cfu', points: 1 });
    }
    if (cfg.quiz > 0) {
      rows.push({ course: 'ap-csp', unit, lesson_id: lesson, item_id: `${lesson}-quiz`, item_type: 'quiz', points: cfg.quiz });
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

if (require.main === module) {
  const result = seedManifest({ update: process.argv.includes('--update') });
  console.log(`course_manifest seed: ${result.changed} of ${result.total} rows written (mode: ${result.mode})`);
}

module.exports = { seedManifest, buildRows };
