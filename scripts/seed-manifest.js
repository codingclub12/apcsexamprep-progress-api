'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COURSE MANIFEST SEED — the denominator authority for ap-csa and ap-csp.
//
//  Visit items are generated straight from the COURSES config in utils.js
//  (CSA: 53 lessons across Units 1-4, 2025-2026 CED; CSP: 35 lessons across
//  Big Ideas 1-5), so the manifest can never drift from what /track records.
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
const CODE_ITEMS_ENABLED = false;
const CSA_UNIT1_CODE = {
  '1.1': 1, '1.2': 1, '1.3': 1, '1.4': 1, '1.5': 1, '1.6': 1,
  '1.7': 0, '1.8': 0,
  '1.9': 1, '1.10': 1, '1.11': 1, '1.12': 1, '1.13': 1, '1.14': 1, '1.15': 1,
};

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
