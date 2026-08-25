'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Cyber per-unit exam totals.
//
//  The seed itself is four lines of INSERT. What is worth testing is the thing
//  it is FOR: an exam score that arrives as a bare percentage has to turn into
//  points once the column is priced, and it has to stop being counted as a
//  percent-only item. That is the whole reason to author a denominator, and it
//  happens in lib/gradebook-contract.js, not in the seed.
//
//  So this builds a class, posts a student a 90 percent unit exam through the
//  same shape the tracker uses (progress.score, the derived percent), and reads
//  the canonical gradebook twice: unpriced, then priced.
//
//    unpriced -> earned null, possible null, pct 90, counted in items_percent_only
//    priced   -> earned 18, possible 20, pct 90, counted in the points total
//
//  It also pins the reason this table is not course_denominators: all five exams
//  sit at lesson 'exam', so five lesson-keyed rows would collide into one and
//  four units would silently wear a fifth's total.
//
//  Zero PII: one synthetic student. No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberexams
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-cyber-exams.db');
for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
process.env.DB_PATH = DB;

const db = require('../db');
const { buildRows, EXAMS, seedCyberExamDenominators } = require('../scripts/seed-cyber-exam-denominators');
const contract = require('../lib/gradebook-contract');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

console.log('the rows');
{
  const rows = buildRows();
  ok('one row per unit, all five', rows.length === 5);
  ok('every exam is 20 points', rows.every((r) => r.possible === 20), rows.map((r) => r.possible));
  ok('all five share lesson "exam", which is why this is the unit-scoped table',
    new Set(rows.map((r) => r.lesson)).size === 1 && rows[0].lesson === 'exam');
  ok('five distinct units', new Set(rows.map((r) => r.unit)).size === 5);
}

db.prepare("INSERT INTO teachers (id,email,password_hash,name) VALUES ('t1','t@smoke.test','x','T')").run();
db.prepare(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,mastery_threshold)
            VALUES ('C1','t1','CYBER-EXAM','Smoke','ap-cybersecurity',80)`).run();
db.prepare("INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','C1','s1','x')").run();
// The shape apcs-tracker.js produces: a derived percent on progress, no pair.
db.prepare(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,attempts,updated_at)
            VALUES ('p1','s1','C1','ap-cybersecurity','unit-1','exam','exam',1,90,1,'2026-08-25T00:00:00Z')`).run();

const examCell = () => {
  const gb = contract.buildCanonicalGradebook('CYBER-EXAM', {});
  const item = gb.items.find((i) => i.unit === 'unit-1' && i.lesson_ref === 'exam' && i.native_activity === 'exam');
  const s = gb.students.find((x) => x.id === 's1');
  return { gb, item, cell: item ? s.items[item.item_key] : null, overall: s.overall };
};

console.log('before pricing: a percent that cannot join a points sum');
{
  const { item, cell, overall, gb } = examCell();
  ok('the exam column exists', !!item);
  ok('the cell keeps its percentage', cell && cell.pct === 90, cell);
  ok('but carries no points pair', cell && cell.earned === null && cell.possible === null, cell);
  ok('and is flagged percent-only', cell && cell.possible_source === 'percent' && overall.items_percent_only === 1, overall);
  ok('so it contributes nothing to the points total', overall.graded === 0, overall);
  ok('integrity reports it rather than hiding it',
    gb.integrity.percent_only_items.length === 1 && gb.integrity.ok === false);
}

console.log('after pricing: the same percent becomes points');
seedCyberExamDenominators();
{
  const { item, cell, overall, gb } = examCell();
  ok('the column now carries a total a teacher can see', item && item.possible === 20, item && item.possible);
  ok('90 percent of 20 is 18', cell && cell.earned === 18 && cell.possible === 20, cell);
  ok('the percentage is unchanged', cell && cell.pct === 90, cell);
  ok('it now counts toward the grade', overall.earned === 18 && overall.graded === 20, overall);
  ok('and is no longer percent-only',
    overall.items_percent_only === 0 && gb.integrity.percent_only_items.length === 0);
  ok('the grade is earned over graded, not over course possible',
    overall.pct === 90 && overall.possible > 20, overall);
}

console.log('unattempted exams cannot deflate anyone');
{
  const { gb } = examCell();
  const others = gb.items.filter((i) => i.native_activity === 'exam' && i.unit !== 'unit-1');
  ok('the other four exams are priced too', others.length >= 1 && others.every((i) => i.possible === 20),
    others.map((i) => [i.unit, i.possible]));
  const s = gb.students.find((x) => x.id === 's1');
  ok('yet none of them appear in this student\'s items',
    others.every((i) => !s.items[i.item_key]));
  ok('so graded stays at the one exam actually sat', s.overall.graded === 20, s.overall);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
