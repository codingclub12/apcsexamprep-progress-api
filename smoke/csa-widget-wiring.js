'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: CSA Unit 2-4 widget wiring.
//
//  38 CSA lesson pages carry graded apcs-ex widgets and no data-item-id
//  attributes, so for as long as those pages have been live nothing a student
//  did on them was recorded. Rather than rewrite 38 live page bodies, the
//  reporter mints positional ids and the manifest is seeded to match. That
//  makes the two sides a contract, and this is the test of the contract:
//
//    1. fallbackPlan names widgets the way the manifest expects: cfu-N counts
//       only graded widgets outside the mastery section, in document order,
//       and the mastery section is the quiz.
//    2. Every id the plan can mint for a Unit 2-4 lesson EXISTS in the seeded
//       manifest, and every seeded id can be minted. A mismatch either drops a
//       grade (page mints an id the server 400s) or deflates a denominator
//       (manifest counts an item no page can earn).
//    3. Unit 1 is untouched: those pages carry real attributes, and a page
//       that already has any widget item id must not be renamed.
//
//  Zero PII: item ids and counts only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:csawidgets
// ─────────────────────────────────────────────────────────────────────────────
global.window = global.window || {};
global.document = global.document || { addEventListener() {} };

const path = require('path');
const fs = require('fs');
const { buildRows } = require('../scripts/seed-manifest.js');

// The mirror is what CI has, so the mirror is what is tested. When a theme
// clone is present the two are also compared, because a mirror that has
// drifted from the deployed asset tests nothing.
const REPORTER = path.join(__dirname, '..', 'shopify', 'apcs-reporter.js');
const THEME = path.join(__dirname, '..', '..', 'apcsexamprep-theme', 'assets', 'apcs-reporter.js');
const { fallbackPlan } = require(REPORTER);

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const w = (gradable, inMastery) => ({ gradable, inMastery: !!inMastery });

console.log('fallbackPlan naming');
{
  const p = fallbackPlan('2.1', [w(true), w(true), w(true, true), w(true, true)]);
  ok('cfus are numbered in document order', JSON.stringify(p.cfuIds.filter(Boolean)) ===
    JSON.stringify(['2.1-cfu-1', '2.1-cfu-2']), p.cfuIds);
  ok('mastery section becomes the quiz', p.quizId === '2.1-quiz' && p.quizQuestions === 2, p);
}
{
  // An explainer block with no check button must not consume a number, or every
  // id after it shifts and 8 correct answers file as 8 wrong ones.
  const p = fallbackPlan('4.3', [w(false), w(true), w(false), w(true)]);
  ok('ungraded blocks do not consume an id',
    JSON.stringify(p.cfuIds) === JSON.stringify([null, '4.3-cfu-1', null, '4.3-cfu-2']), p.cfuIds);
}
{
  const p = fallbackPlan('2.2', [w(true), w(true)]);
  ok('no mastery section means no quiz id', p.quizId === null && p.quizQuestions === 0, p);
}
ok('no lesson means no ids at all', fallbackPlan(null, [w(true)]).cfuIds.length === 0);

console.log('the plan and the manifest agree');
const seeded = buildRows().filter((r) => r.course === 'ap-csa' && r.item_type !== 'visit');
const seededIds = new Set(seeded.map((r) => r.item_id));

// What the live pages carry, measured the same way seed-manifest.js counted:
// graded apcs-ex widgets outside the mastery section, then the mastery ones.
const LIVE = require('./fixtures/csa-unit234-widget-counts.json');

const minted = new Set();
for (const [lesson, c] of Object.entries(LIVE)) {
  const widgets = [];
  for (let i = 0; i < c.cfus; i++) widgets.push(w(true));
  for (let i = 0; i < c.quiz; i++) widgets.push(w(true, true));
  const p = fallbackPlan(lesson, widgets);
  for (const id of p.cfuIds) if (id) minted.add(id);
  if (p.quizId) minted.add(p.quizId);
}

// 3.1, 3.3 and 3.4 are built-model pages with no apcs-ex widgets; their rows
// come from LESSON_DATA, not from anything the fallback can mint.
const BUILT = ['3.1', '3.3', '3.4'];
const unmintable = [...seededIds].filter((id) =>
  /^[234]\./.test(id) && /-cfu-|-quiz$/.test(id) &&
  !BUILT.includes(id.split('-')[0]) && !minted.has(id));
const unseeded = [...minted].filter((id) => !seededIds.has(id));
ok('every id a Unit 2-4 page can mint is seeded', unseeded.length === 0, unseeded.slice(0, 8));
ok('every seeded Unit 2-4 cfu/quiz id can be minted', unmintable.length === 0, unmintable.slice(0, 8));

console.log('Unit 1 is untouched');
{
  const u1 = seeded.filter((r) => r.lesson_id.startsWith('1.'));
  ok('Unit 1 still has its 108 widget cfu rows', u1.filter((r) => /-cfu-/.test(r.item_id)).length === 108);
  ok('Unit 1 still has its 14 quiz rows', u1.filter((r) => r.item_type === 'quiz').length === 14);
  ok('Unit 1 code items survive', u1.filter((r) => /-code-/.test(r.item_id)).length === 13);
}
{
  // The guard that keeps an attributed page from being renamed underneath
  // itself lives in assignFallbackIds, which needs a DOM. Assert the selector
  // it guards on is still the one that matches Unit 1's markup.
  const src = fs.readFileSync(REPORTER, 'utf8');
  ok('fallback bails out when the page already has widget ids',
    src.includes(".apcs-ex[data-item-id], .apcsa-mastery[data-item-id]"));
  ok('fallback never overwrites, it only sets on the planned widgets',
    /if \(!plan\.cfuIds\[j\]\) continue;/.test(src));
  if (fs.existsSync(THEME)) {
    const cut = (t) => t.slice(t.indexOf('// -- POSITIONAL ITEM IDS'), t.indexOf('assignFallbackIds(ctx.lesson);'));
    ok('the mirror matches the deployed theme asset', cut(src) === cut(fs.readFileSync(THEME, 'utf8')));
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
