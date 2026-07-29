'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COURSE DENOMINATOR SEED - the authored "out of" for cyber and CSP.
//
//  WHY
//  Cyber and CSP report grades through POST /api/student/quiz, which stores
//  progress.score as a 0-100 percentage and nothing else. No points, no "out
//  of". Every gradebook points column reads score_events, which those two
//  courses have never written, so 75 cyber classes and 19 CSP classes show no
//  points while their teachers can see that quizzes plainly work.
//
//  The teacher dashboard already resolves this at read time: given an AUTHORED
//  denominator it derives the ratio from progress.score and rescales it, so
//  80 percent against an authored 6 renders as 4.8 / 6 and the percentage never
//  moves. That branch is pinned by smoke/legacy-points.js. The only missing
//  ingredient is the authored row, which is what this file supplies.
//
//  WHY NOT adopt_proposed
//  POST /api/admin/denominators/adopt proposes values from what students'
//  submissions agree on. Cyber and CSP have no recorded submissions at all, so
//  every column reports no_data and there is nothing to propose from. These
//  values have to be stated, not inferred.
//
//  SOURCE OF THE VALUES
//  Corroborated in two places each:
//    quiz        6   lib/admin-gradebook.js:152, smoke/admin-denominators.js:148
//    exercise-1  1   lib/admin-gradebook.js:152, docs/code-grading-contract.md:77
//    exercise-2  6   lib/admin-gradebook.js:152, routes/student.js:636
//  exercise-3 is documented inconsistently (4 vs 1) but does not apply here:
//  neither cyber nor CSP has an exercise-3. It is the CSA FRQ.
//
//  NOT SEEDED
//  Cyber's unit case-file and exam columns have no corroborated value anywhere
//  in the repo, so they are deliberately left unauthored rather than guessed.
//  An unauthored column keeps today's behaviour exactly; a wrongly authored one
//  would silently rewrite what every teacher sees. Add them to POINTS_EXTRA
//  once the real totals are known.
//
//  SAFETY
//  Insert-or-ignore by default, so an existing authored row is NEVER clobbered
//  and re-running is a no-op. Writes only affect what gradebooks DISPLAY; no
//  stored score is touched, and deleting a row restores the prior behaviour
//  exactly. Pass --update to push edits to existing rows, --dry-run to print
//  the plan and write nothing.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node scripts/seed-denominators.js [--dry-run] [--update] [--course=X]
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

// Per-activity authored totals, by course. `lesson` is deliberately absent: a
// visit is not graded, and the coverage report classes it not_graded.
const POINTS = {
  'ap-cybersecurity': { 'exercise-1': 1, 'exercise-2': 6, quiz: 6 },
  'ap-csp':           { 'exercise-1': 1, 'exercise-2': 6, quiz: 6 },
};

// Unit-level extras (cyber case-file / exam). Empty on purpose: see NOT SEEDED.
// Shape when filled: { 'ap-cybersecurity': { 'case-file': 10, exam: 25 } }
const POINTS_EXTRA = {};

function buildRows(only) {
  const rows = [];
  for (const [course, byActivity] of Object.entries(POINTS)) {
    if (only && course !== only) continue;
    const cfg = COURSES[course];
    if (!cfg || !cfg.units) continue;

    for (const [unit, u] of Object.entries(cfg.units)) {
      // Only author activities this course actually declares, so a config
      // change cannot leave a denominator authored for something unreachable.
      const declared = new Set(u.activities || []);
      for (const lesson of (u.lessons || [])) {
        for (const [activity_type, possible] of Object.entries(byActivity)) {
          if (!declared.has(activity_type)) continue;
          rows.push({ course, unit, lesson, activity_type, possible });
        }
      }

      const extras = POINTS_EXTRA[course] || {};
      // case_file and exam share one lesson key per course, and the table's
      // primary key is (course, lesson, activity_type), so these collapse to a
      // single row each rather than one per unit. Deduped below.
      if (u.case_file && extras['case-file'] != null) {
        rows.push({ course, unit, lesson: u.case_file.lesson, activity_type: 'case-file', possible: extras['case-file'] });
      }
      if (u.exam && extras.exam != null) {
        rows.push({ course, unit, lesson: u.exam.lesson, activity_type: 'exam', possible: extras.exam });
      }
    }
  }

  // Dedupe on the real primary key. First unit wins, matching the table's own
  // treatment of unit as descriptive rather than identifying.
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.course}|${r.lesson}|${r.activity_type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function seedDenominators({ update = false, dryRun = false, course = null } = {}) {
  const rows = buildRows(course);

  const existing = new Set(
    db.prepare('SELECT course, lesson, activity_type FROM course_denominators').all()
      .map((r) => `${r.course}|${r.lesson}|${r.activity_type}`)
  );
  const wouldAdd = rows.filter((r) => !existing.has(`${r.course}|${r.lesson}|${r.activity_type}`));

  if (dryRun) {
    return { total: rows.length, changed: 0, would_add: wouldAdd.length, mode: 'dry-run', rows: wouldAdd };
  }

  const insert = update
    ? db.prepare(`
        INSERT INTO course_denominators (course, unit, lesson, activity_type, possible)
        VALUES (@course, @unit, @lesson, @activity_type, @possible)
        ON CONFLICT(course, lesson, activity_type) DO UPDATE SET
          unit = excluded.unit, possible = excluded.possible
      `)
    : db.prepare(`
        INSERT OR IGNORE INTO course_denominators (course, unit, lesson, activity_type, possible)
        VALUES (@course, @unit, @lesson, @activity_type, @possible)
      `);

  const changed = db.transaction((rs) => {
    let n = 0;
    for (const r of rs) n += insert.run(r).changes;
    return n;
  })(rows);

  return { total: rows.length, changed, would_add: wouldAdd.length, mode: update ? 'update' : 'ignore' };
}

if (require.main === module) {
  const arg = (p) => (process.argv.find((a) => a.startsWith(p)) || '').split('=')[1] || null;
  const result = seedDenominators({
    update: process.argv.includes('--update'),
    dryRun: process.argv.includes('--dry-run'),
    course: arg('--course'),
  });

  if (result.mode === 'dry-run') {
    console.log(`course_denominators DRY RUN: ${result.would_add} of ${result.total} rows would be written\n`);
    const byCourse = {};
    for (const r of result.rows) {
      byCourse[r.course] = byCourse[r.course] || {};
      byCourse[r.course][r.activity_type] = (byCourse[r.course][r.activity_type] || 0) + 1;
    }
    for (const [c, acts] of Object.entries(byCourse)) {
      console.log(`  ${c}`);
      for (const [a, n] of Object.entries(acts)) {
        const pts = (POINTS[c] || {})[a];
        console.log(`    ${a.padEnd(12)} ${String(n).padStart(3)} lessons  out of ${pts}`);
      }
    }
    if (!result.would_add) console.log('  nothing to write; every row is already authored');
  } else {
    console.log(`course_denominators seed: ${result.changed} of ${result.total} rows written (mode: ${result.mode})`);
  }
}

module.exports = { seedDenominators, buildRows, POINTS };
