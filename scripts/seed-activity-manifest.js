'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVITY MANIFEST SEED — the per-activity denominator authority for ap-csp.
//
//  Loads data/csp-course-manifest-FULL.json (130 rows: 35 lessons x
//  {lesson, quiz, exercise-*} plus 7 unit tests) into the activity_manifest
//  table, keyed by (course, unit, lesson, activity_type). item_count is the
//  number of gradable items in that activity, so percent = earned / item_count
//  uses a server-owned denominator instead of a client-sent ?total.
//
//  Runs automatically on server boot in insert-or-ignore mode, so a fresh deploy
//  is never fail-closed with empty denominators and rows adjusted directly in
//  production SQLite survive restarts. Push edits to existing rows with:
//
//      node scripts/seed-activity-manifest.js --update
//
//  This is a SEPARATE authority from course_manifest (seed-manifest.js), which is
//  the per-item CSA manifest. See the activity_manifest comment in db.js.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('../db');

const DATA_FILE = path.join(__dirname, '..', 'data', 'csp-course-manifest-FULL.json');

function loadRows() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('manifest data must be a JSON array');
  for (const r of rows) {
    if (!r.course || !r.unit || !r.lesson || !r.activity_type || !Number.isFinite(Number(r.item_count))) {
      throw new Error(`bad manifest row: ${JSON.stringify(r)}`);
    }
  }
  return rows;
}

function seedActivityManifest({ update = false } = {}) {
  const rows = loadRows();
  const insert = update
    ? db.prepare(`
        INSERT INTO activity_manifest (course, unit, lesson, activity_type, item_count)
        VALUES (@course, @unit, @lesson, @activity_type, @item_count)
        ON CONFLICT(course, unit, lesson, activity_type) DO UPDATE SET
          item_count = excluded.item_count
      `)
    : db.prepare(`
        INSERT OR IGNORE INTO activity_manifest (course, unit, lesson, activity_type, item_count)
        VALUES (@course, @unit, @lesson, @activity_type, @item_count)
      `);

  const changed = db.transaction((rs) => {
    let n = 0;
    for (const r of rs) {
      n += insert.run({
        course: r.course, unit: r.unit, lesson: r.lesson,
        activity_type: r.activity_type, item_count: Number(r.item_count),
      }).changes;
    }
    return n;
  })(rows);

  return { total: rows.length, changed, mode: update ? 'update' : 'ignore' };
}

if (require.main === module) {
  const result = seedActivityManifest({ update: process.argv.includes('--update') });
  console.log(`activity_manifest seed: ${result.changed} of ${result.total} rows written (mode: ${result.mode})`);
}

module.exports = { seedActivityManifest };
