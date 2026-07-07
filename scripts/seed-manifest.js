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

// CSA Unit 1 pilot: graded items per lesson. cfus = how many numbered CFU
// items the lesson page has (item ids 1.X-cfu-1 .. 1.X-cfu-N, 1 point each);
// quiz = the lesson quiz's question count (item id 1.X-quiz, 1 point per
// question). PLACEHOLDER COUNTS: verify against the finalized lesson pages
// before the pilot and push corrections with --update.
const CSA_UNIT1_GRADED = {
  '1.1':  { cfus: 3, quiz: 10 },
  '1.2':  { cfus: 3, quiz: 10 },
  '1.3':  { cfus: 3, quiz: 10 },
  '1.4':  { cfus: 3, quiz: 10 },
  '1.5':  { cfus: 3, quiz: 10 },
  '1.6':  { cfus: 3, quiz: 10 },
  '1.7':  { cfus: 3, quiz: 10 },
  '1.8':  { cfus: 3, quiz: 10 },
  '1.9':  { cfus: 3, quiz: 10 },
  '1.10': { cfus: 3, quiz: 10 },
  '1.11': { cfus: 3, quiz: 10 },
  '1.12': { cfus: 3, quiz: 10 },
  '1.13': { cfus: 3, quiz: 10 },
  '1.14': { cfus: 3, quiz: 10 },
  '1.15': { cfus: 3, quiz: 10 },
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
    rows.push({ course: 'ap-csa', unit: 'unit-1', lesson_id: lesson, item_id: `${lesson}-quiz`, item_type: 'quiz', points: cfg.quiz });
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
