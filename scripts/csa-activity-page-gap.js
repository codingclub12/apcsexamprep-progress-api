// ─────────────────────────────────────────────────────────────────────────────
//  WHAT THE AP CSA GRADEBOOK PROMISES A TEACHER, AGAINST WHAT THE SITE HAS.
//
//  Board 165. Two separate authorities decide what a teacher sees, and neither
//  one knows whether the page it is describing exists:
//
//    COURSES['ap-csa'].units[*].activities   decides which COLUMNS render
//    seed/csa-course-manifest.js             decides what each column is WORTH
//
//  Both are lists in this repo. The storefront is the third fact and it is the
//  only one a student can actually open. This reads all three and prints where
//  they disagree.
//
//  It reports and changes nothing. Which of the two possible corrections is
//  right (drop the activity, or build the pages) is a product decision, and an
//  expected column that renders blank is a legitimate way to say "planned and
//  not built yet". lib/gradebook-contract.js says so in as many words: an
//  activity that never reports "shows up as a column of blanks instead of
//  silently not existing". So this names the gap and leaves it named.
//
//  The live handles come from smoke/fixtures/live-page-handles.txt, captured
//  off the storefront. Pass a different file to re-run it against a fresher
//  capture.
//
//    node scripts/csa-activity-page-gap.js [live-page-handles.txt]
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const { COURSES, trailingActivity } = require('../utils');
const { manifest } = require('../seed/csa-course-manifest');

const COURSE = 'ap-csa';
const DEFAULT_HANDLES = path.join(__dirname, '..', 'smoke', 'fixtures', 'live-page-handles.txt');

//  A lesson page's handle carries a slug these lists do not hold, so the numeric
//  stem is the join key: ap-csa-lesson-<unit>-<n>-<slug>[-<activity>].
//  'lesson', 'cfu' and 'quiz' all live ON the lesson page, so for those the
//  lesson page IS the page.
const ON_THE_LESSON_PAGE = new Set(['lesson', 'cfu', 'quiz']);

//  THE ALIAS IS THE WHOLE REASON THIS READS utils AND NOT A REGEX OF ITS OWN.
//  utils.trailingActivity maps a handle to the activity the GRADEBOOK uses, and
//  ACTIVITY_ALIASES turns a page ending '-frq' into 'exercise-3', because that
//  is the student-facing name for the same work. A first version of this script
//  matched the suffix directly and reported all 53 exercise-3 columns as having
//  no page, plus all 53 FRQ pages as priced at nothing. Both were the same
//  mistake counted twice, and both were wrong: the FRQ page IS the exercise-3
//  column. Reading the alias from the code that resolves it is what stops a
//  measurement inventing a defect out of a naming convention.
function livePages(file) {
  const byLesson = new Map();
  for (const h of fs.readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)) {
    const m = /^ap-csa-lesson-(\d+)-(\d+)-(.+)$/.exec(h);
    if (!m) continue;
    const lesson = m[1] + '.' + m[2];
    if (!byLesson.has(lesson)) byLesson.set(lesson, new Set());
    byLesson.get(lesson).add(trailingActivity(h));
  }
  return byLesson;
}

function hasPage(pages, lesson, activity) {
  const have = pages.get(lesson);
  if (!have) return false;
  return ON_THE_LESSON_PAGE.has(activity) ? have.has('lesson') : have.has(activity);
}

function report(file) {
  const pages = livePages(file);
  const units = (COURSES[COURSE] || {}).units || {};
  const priced = new Map();     // lesson|activity -> points
  const unitOf = new Map();
  for (const row of manifest) {
    unitOf.set(row.lesson, row.unit);
    for (const [a, p] of Object.entries(row.denominators)) priced.set(row.lesson + '|' + a, p);
  }

  //  1. Columns the gradebook renders with no page anywhere behind them.
  const columnGap = new Map();
  let columns = 0;
  for (const [unit, cfg] of Object.entries(units)) {
    for (const lesson of (cfg.lessons || [])) {
      for (const activity of (cfg.activities || [])) {
        columns += 1;
        if (hasPage(pages, lesson, activity)) continue;
        const k = unit + ' ' + activity;
        columnGap.set(k, (columnGap.get(k) || 0) + 1);
      }
    }
  }

  //  2. Points the course total is priced at, with no page behind them.
  const pointGap = new Map();
  let pricedPoints = 0;
  let phantomPoints = 0;
  for (const [k, points] of priced) {
    const [lesson, activity] = k.split('|');
    pricedPoints += points;
    if (hasPage(pages, lesson, activity)) continue;
    phantomPoints += points;
    const g = (unitOf.get(lesson) || '?') + ' ' + activity;
    const cur = pointGap.get(g) || { n: 0, points: 0 };
    pointGap.set(g, { n: cur.n + 1, points: cur.points + points });
  }

  //  3. The other direction: a page that exists and nothing prices.
  const unpriced = new Map();
  for (const [lesson, have] of pages) {
    for (const activity of have) {
      if (activity === 'lesson') continue;
      if (priced.has(lesson + '|' + activity)) continue;
      unpriced.set(activity, (unpriced.get(activity) || 0) + 1);
    }
  }

  console.log('');
  console.log('AP CSA: GRADEBOOK COLUMNS AND PRICES AGAINST LIVE PAGES');
  console.log('  live handles read from ' + file);
  console.log('  lessons in the manifest : ' + manifest.length);
  console.log('  lesson stems seen live  : ' + pages.size);
  console.log('');
  console.log('1. COLUMNS THE GRADEBOOK RENDERS WITH NO PAGE BEHIND THEM');
  console.log('   columns the course config expects : ' + columns);
  if (!columnGap.size) console.log('   none');
  for (const [k, n] of [...columnGap].sort()) console.log('   ' + k.padEnd(24) + n + ' lesson(s)');
  console.log('');
  console.log('2. POINTS THE COURSE TOTAL CARRIES WITH NO PAGE BEHIND THEM');
  console.log('   priced points in the manifest : ' + pricedPoints);
  for (const [k, v] of [...pointGap].sort()) {
    console.log('   ' + k.padEnd(24) + String(v.n).padStart(3) + ' entries' + String(v.points).padStart(6) + ' points');
  }
  const pct = pricedPoints ? Math.round((phantomPoints / pricedPoints) * 1000) / 10 : 0;
  console.log('   ' + 'TOTAL'.padEnd(24) + '    ' + String(phantomPoints).padStart(9)
    + ' points, ' + pct + ' percent of the course');
  console.log('');
  console.log('3. PAGES THAT EXIST AND NOTHING PRICES');
  if (!unpriced.size) console.log('   none');
  for (const [k, n] of [...unpriced].sort()) console.log('   ' + k.padEnd(24) + n + ' live page(s), priced at nothing');
  console.log('');

  return { columns, columnGap, pricedPoints, phantomPoints, pointGap, unpriced };
}

module.exports = { livePages, hasPage, report };

if (require.main === module) report(process.argv[2] || DEFAULT_HANDLES);
