'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the intro-java content bank and the pages rendered from it.
//
//  WHY THIS EXISTS
//  Content bugs are silent. A page with two h1 tags still looks fine. A quiz
//  whose answer key shipped in the HTML still marks correctly, right up until a
//  student opens View Source and tells everyone. A screenshot with no alt text
//  looks perfect to the person who authored it and is a dead end for a student
//  using a screen reader. None of these fail at runtime, so none of them get
//  found unless something checks.
//
//  The most important assertion here is section 2: every correct answer string
//  in the bank is searched for in the rendered HTML of every page. The renderer
//  is built so keys cannot reach the page by construction, and this proves the
//  construction is still holding.
//
//  The SEO checks mirror scripts/verify-artifact.js, which is what this site
//  already grades live pages against: exactly one h1, a meta description between
//  70 and 160 characters, no mojibake. Failing here means the page would have
//  been flagged after it shipped, so it is cheaper to fail now.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:introjava
// ─────────────────────────────────────────────────────────────────────────────

const { BANKS } = require('../seed/intro-java-banks');
const help = require('../seed/intro-java-help');
const { renderLesson, handleFor } = require('../lib/intro-java-page');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// Every lesson across every authored unit. The suite is unit-agnostic on
// purpose: adding a unit to seed/intro-java-banks.js must bring it under all of
// these checks with no edit here, or the newest content is the least tested.
const LESSONS = BANKS.flatMap((b) => b.lessons);
const UNIT_OF = new Map();
for (const b of BANKS) for (const l of b.lessons) UNIT_OF.set(l.lesson, b);

// Render every lesson once, through the SAME builder the import script uses.
// Assembling them a second time here would let the suite prove one page correct
// while the importer shipped a slightly different one, built from the same
// renderer with different neighbours, and no check could see the difference.
const build = require('../lib/intro-java-build');
const pages = build.lessonPages();
// Memoised, because sections 11.5, 11 and 12 all want these and rendering the
// whole course three times over is pure waste.
let _hp = null, _hb = null;
function helpPagesForLinks() { if (!_hp) _hp = build.helpPages(); return _hp; }
function hubsForLinks() { if (!_hb) _hb = build.hubPages(); return _hb; }
let _pp = null;
// Project pages joined the build on 2026-08-19 and the hub links to all ten
// of them. Without this the link-integrity check below reports every one as
// dangling, which is the check being right about a universe that had not
// been told the new page kind exists.
function projectPagesForLinks() { if (!_pp) _pp = build.projectPages(); return _pp; }

// ── 1. The bank is structurally complete ─────────────────────────────────────
section('1. Every lesson is structurally complete');

ok('1.1 every authored unit is registered in the bank index', BANKS.length >= 2, BANKS.length);
ok('1.2 Unit 1 is 1.1 through 1.6 in order',
  BANKS[0].lessons.map((l) => l.lesson).join(',') === '1.1,1.2,1.3,1.4,1.5,1.6',
  BANKS[0].lessons.map((l) => l.lesson));
ok('1.3 Unit 2 is 2.1 through 2.7 in order',
  BANKS[1].lessons.map((l) => l.lesson).join(',') === '2.1,2.2,2.3,2.4,2.5,2.6,2.7',
  BANKS[1].lessons.map((l) => l.lesson));
ok('1.3b Unit 3 is 3.1 through 3.9 in order',
  BANKS[2].lessons.map((l) => l.lesson).join(',') === '3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9',
  BANKS[2].lessons.map((l) => l.lesson));
ok('1.3c every bank declares a human label for its unit',
  BANKS.every((b) => typeof b.label === 'string' && b.label.length > 8),
  BANKS.map((b) => b.label));
ok('1.3d every lesson number matches the unit it is filed under',
  BANKS.every((b) => b.lessons.every((l) => `unit-${l.lesson.split('.')[0]}` === b.unit)));
ok('1.4 no lesson id is used twice across units',
  new Set(LESSONS.map((l) => l.lesson)).size === LESSONS.length);
ok('1.5 no slug is used twice, which would collide as a page handle',
  new Set(LESSONS.map((l) => l.slug)).size === LESSONS.length);

for (const l of LESSONS) {
  const need = ['slug', 'title', 'seo', 'hook', 'objectives', 'vocab', 'steps',
    'misconceptions', 'cfus', 'quiz', 'recap', 'stuck', 'minutes'];
  const missing = need.filter((k) => l[k] === undefined || l[k] === null
    || (Array.isArray(l[k]) && !l[k].length));
  ok(`1.x ${l.lesson} has every required block`, missing.length === 0, missing);
}

// The misconceptions block is required, not optional. It is the teaching feature
// most likely to be quietly dropped when someone is in a hurry, and it is the
// one doing the most work for an absolute beginner.
for (const l of LESSONS) {
  ok(`1.x ${l.lesson} names at least three real misconceptions`,
    l.misconceptions.length >= 3, l.misconceptions.length);
  const shaped = l.misconceptions.every((m) => m.wrong && m.right && m.why);
  ok(`1.x ${l.lesson} every misconception has wrong, right and why`, shaped);
}

// ── 2. THE ANSWER KEY NEVER REACHES THE PAGE ─────────────────────────────────
section('2. No answer key reaches the rendered HTML');

let leaks = [];
for (let i = 0; i < LESSONS.length; i++) {
  const l = LESSONS[i];
  const html = pages[i].bodyHtml;

  // The rationale strings are the most damaging leak: they name the answer AND
  // explain it. Check them verbatim.
  for (const q of [...l.cfus, ...l.quiz]) {
    if (q.why && html.includes(q.why)) leaks.push(`${l.lesson} ${q.id} rationale`);
  }
  // The gap accept lists are the literal answers. Scope this to the gap SECTION:
  // an accept value like "Actor" or "turn" appears all over the lesson prose
  // that teaches it, and that is the lesson doing its job, not a leak. What
  // would be a leak is the answer reaching the exercise itself, through a
  // prefilled input, a hint that gives it away, or a marker left unreplaced.
  if (l.gap) {
    const sec = (html.match(/<section class="ij-gap"[\s\S]*?<\/section>/) || [''])[0];
    ok(`2.g ${l.lesson} the gap section rendered`, sec.length > 0);

    // Every marker became an input. A leftover ___N___ would show the student a
    // raw template and, worse, would mean a hole nobody can answer.
    ok(`2.g ${l.lesson} no unreplaced ___N___ marker survives into the page`,
      !/___\d+___/.test(sec));

    const inputs = [...sec.matchAll(/<input[^>]*class="ij-hole"[^>]*>/g)].map((m) => m[0]);
    ok(`2.g ${l.lesson} one input per hole`, inputs.length === l.gap.holes.length,
      { inputs: inputs.length, holes: l.gap.holes.length });
    ok(`2.g ${l.lesson} no input is prefilled with a value`,
      inputs.every((t) => !/\svalue=/.test(t)));

    for (const h of l.gap.holes) {
      const hint = String(h.hint);
      for (const a of h.accept) {
        // A hint that literally contains its own answer is a giveaway. Compared
        // case-insensitively on a word boundary so "turn" in a hint is caught
        // but "returns" is not.
        const re = new RegExp(`(^|[^A-Za-z0-9_])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`, 'i');
        if (re.test(hint)) leaks.push(`${l.lesson} hole ${h.n} hint gives away "${a}"`);
      }
    }
  }
}
ok('2.1 no rationale or gap answer reaches the page or its hints', leaks.length === 0, leaks);

// A correct-answer INDEX must not be emitted in any form.
const answerAttrPatterns = [/data-answer/i, /data-correct/i, /"answer"\s*:/i, /correctIndex/i];
let attrLeaks = [];
for (let i = 0; i < pages.length; i++) {
  for (const re of answerAttrPatterns) {
    if (re.test(pages[i].bodyHtml)) attrLeaks.push(`${LESSONS[i].lesson} matches ${re}`);
  }
}
ok('2.2 no answer index is emitted as an attribute or JSON', attrLeaks.length === 0, attrLeaks);

// And the whitelist itself: publicQuestion must not grow new fields by accident.
const { publicQuestion, publicHole } = require('../lib/intro-java-page');
ok('2.3 publicQuestion exposes exactly id, stem and options',
  JSON.stringify(Object.keys(publicQuestion({ id: 'x', stem: 's', options: [], answer: 1, why: 'w' })))
    === JSON.stringify(['id', 'stem', 'options']));
ok('2.4 publicHole exposes exactly n and hint',
  JSON.stringify(Object.keys(publicHole({ n: 1, hint: 'h', accept: ['a'] })))
    === JSON.stringify(['n', 'hint']));

// ── 3. Every question is answerable and correctly keyed ──────────────────────
section('3. Every question has exactly one valid answer');

for (const l of LESSONS) {
  for (const q of [...l.cfus, ...l.quiz]) {
    const n = q.options.length;
    const valid = Number.isInteger(q.answer) && q.answer >= 0 && q.answer < n;
    ok(`3.x ${l.lesson} ${q.id} answer index is in range`, valid, { answer: q.answer, options: n });
    ok(`3.x ${l.lesson} ${q.id} has at least three options`, n >= 3, n);
    ok(`3.x ${l.lesson} ${q.id} options are all distinct`,
      new Set(q.options).size === n, q.options);
    ok(`3.x ${l.lesson} ${q.id} explains why`, !!q.why && q.why.length > 15);
  }
}

// No all-of-the-above / none-of-the-above, per the house MCQ rules in
// lib/command-hazards.js.
let banned = [];
for (const l of LESSONS) {
  for (const q of [...l.cfus, ...l.quiz]) {
    for (const o of q.options) {
      if (/all of the above|none of the above/i.test(o)) banned.push(`${l.lesson} ${q.id}`);
    }
  }
}
ok('3.y no all-of-the-above or none-of-the-above options', banned.length === 0, banned);

// The key must not sit on the same letter every time, which is the classic
// authoring tell and lets a student pass by pattern.
const allAnswers = LESSONS.flatMap((l) => [...l.cfus, ...l.quiz].map((q) => q.answer));
const spread = new Set(allAnswers).size;
ok('3.z the correct option is spread across positions, not always the same one',
  spread >= 3, { distinct_positions: spread, total: allAnswers.length });

let maxShare = 0;
for (const pos of new Set(allAnswers)) {
  maxShare = Math.max(maxShare, allAnswers.filter((a) => a === pos).length / allAnswers.length);
}
// 35 percent is the house MCQ rule in lib/command-hazards.js, not a number
// picked here. The first draft of this bank sat at 58 percent on one position,
// which is guessable, and that is exactly what this caught.
ok('3.z2 no single position holds more than 35 percent of the keys',
  maxShare <= 0.35, Math.round(maxShare * 100) + '%');

// ── 4. Gap exercises are well formed ─────────────────────────────────────────
section('4. Gap-fill exercises are well formed');

for (const l of LESSONS) {
  if (!l.gap) { ok(`4.x ${l.lesson} has no gap, declared explicitly as null`, l.gap === null); continue; }
  const markers = [...String(l.gap.code).matchAll(/___(\d+)___/g)].map((m) => Number(m[1]));
  const holeNs = l.gap.holes.map((h) => h.n);

  ok(`4.x ${l.lesson} every marker in the code has a hole defined`,
    markers.every((m) => holeNs.includes(m)), { markers, holeNs });
  ok(`4.x ${l.lesson} every hole has a marker in the code`,
    holeNs.every((n) => markers.includes(n)), { markers, holeNs });
  ok(`4.x ${l.lesson} holes are numbered from 1 with no gaps`,
    JSON.stringify([...holeNs].sort((a, b) => a - b))
      === JSON.stringify(holeNs.map((_, i) => i + 1)), holeNs);
  ok(`4.x ${l.lesson} every hole has a hint and at least one accepted answer`,
    l.gap.holes.every((h) => h.hint && h.hint.length > 5 && h.accept && h.accept.length >= 1));
}

// ── 5. Accessibility ─────────────────────────────────────────────────────────
section('5. Accessibility is enforced, not encouraged');

for (const l of LESSONS) {
  const shots = l.steps.filter((s) => s.shot);
  ok(`5.x ${l.lesson} every screenshot has alt text`,
    shots.every((s) => s.shot.alt && s.shot.alt.length > 20),
    shots.filter((s) => !s.shot.alt || s.shot.alt.length <= 20).map((s) => s.shot.src));
  ok(`5.x ${l.lesson} alt text is descriptive, not a filename`,
    shots.every((s) => !/\.(png|jpg|gif)$/i.test(s.shot.alt) && /\s/.test(s.shot.alt)));
}

for (let i = 0; i < pages.length; i++) {
  const html = pages[i].bodyHtml;
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  ok(`5.y ${LESSONS[i].lesson} every rendered img tag carries a non-empty alt`,
    imgs.every((t) => /alt="[^"]{10,}"/.test(t)), imgs.filter((t) => !/alt="[^"]{10,}"/.test(t)));
  // A visible focus state is a keyboard-accessibility requirement, and the only
  // reason it survives is that something checks for it.
  ok(`5.z ${LESSONS[i].lesson} defines a visible keyboard focus style`,
    /:focus-visible/.test(html));
}

// ── 6. SEO, to the bar scripts/verify-artifact.js already enforces live ──────
section('6. SEO checks, matching the live page auditor');

for (let i = 0; i < pages.length; i++) {
  const p = pages[i];
  const l = LESSONS[i];
  const h1s = (p.bodyHtml.match(/<h1[\s>]/g) || []).length;
  ok(`6.x ${l.lesson} has exactly one h1`, h1s === 1, h1s);

  const dLen = p.seoDescription.length;
  ok(`6.x ${l.lesson} meta description is 70 to 160 characters`,
    dLen >= 70 && dLen <= 160, dLen);

  ok(`6.x ${l.lesson} seo title is at most 65 characters`,
    p.seoTitle.length <= 65, { len: p.seoTitle.length, title: p.seoTitle });

  ok(`6.x ${l.lesson} handle matches the pageFromHandle rule`,
    /^intro-java-lesson-\d+-\d+-[a-z0-9-]+$/.test(p.handle), p.handle);

  // Headings must descend without skipping, or the document outline is wrong for
  // screen readers and for search engines reading structure.
  const levels = [...p.bodyHtml.matchAll(/<h([1-3])[\s>]/g)].map((m) => Number(m[1]));
  let skips = [];
  for (let k = 1; k < levels.length; k++) {
    if (levels[k] - levels[k - 1] > 1) skips.push(`${levels[k - 1]}->${levels[k]}`);
  }
  ok(`6.x ${l.lesson} heading levels never skip a step`, skips.length === 0, skips);
}

// Titles and descriptions must be unique, or pages compete with each other.
const titles = pages.map((p) => p.seoTitle);
const descs = pages.map((p) => p.seoDescription);
ok('6.y every seo title is unique across the unit', new Set(titles).size === titles.length);
ok('6.y every meta description is unique across the unit', new Set(descs).size === descs.length);

// Structured data must be valid JSON, or the rich result silently never appears.
for (let i = 0; i < pages.length; i++) {
  const blocks = [...pages[i].bodyHtml.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  ok(`6.z ${LESSONS[i].lesson} emits structured data`, blocks.length >= 2, blocks.length);
  let allValid = true;
  const types = [];
  for (const b of blocks) {
    try { types.push(JSON.parse(b)['@type']); } catch (e) { allValid = false; }
  }
  ok(`6.z ${LESSONS[i].lesson} all JSON-LD parses`, allValid);
  ok(`6.z ${LESSONS[i].lesson} declares LearningResource and BreadcrumbList`,
    types.includes('LearningResource') && types.includes('BreadcrumbList'), types);
  // An entity inside a script block is parsed as literal text and breaks it.
  // This is a live storefront hazard, not a theoretical one.
  ok(`6.z ${LESSONS[i].lesson} no HTML entity inside a script block`,
    !blocks.some((b) => /&(amp|quot|lt|gt|#\d+);/.test(b)));
}

// FAQ blocks are the ones that can win a rich result, so every lesson gets them.
for (const l of LESSONS) {
  ok(`6.f ${l.lesson} ships at least three FAQ entries`,
    (l.seo.faq || []).length >= 3, (l.seo.faq || []).length);
  ok(`6.f ${l.lesson} every FAQ question is phrased as a real search query`,
    (l.seo.faq || []).every((f) => /\?$/.test(f.q) && f.a.length > 60));
}

// ── 7. The graded items line up with what the manifest will count ────────────
section('7. Graded items are tagged for the reporter');

for (let i = 0; i < pages.length; i++) {
  const l = LESSONS[i];
  const html = pages[i].bodyHtml;
  ok(`7.x ${l.lesson} carries its lesson id for the tracker`,
    html.includes(`data-lesson-id="${l.lesson}"`));
  for (const c of l.cfus) {
    ok(`7.x ${l.lesson} ${c.id} carries a data-item-id`,
      html.includes(`data-item-id="${l.lesson}-${c.id}"`));
  }
  ok(`7.x ${l.lesson} quiz carries a data-item-id`,
    html.includes(`data-item-id="${l.lesson}-quiz"`));
  if (l.gap) {
    ok(`7.x ${l.lesson} gap carries a data-item-id`,
      html.includes(`data-item-id="${l.lesson}-gap"`));
  }
}

// ── 8. The help catalog actually covers what lessons point at ────────────────
section('8. Every getting-unstuck link resolves');

let dangling = [];
for (const l of LESSONS) {
  for (const code of l.stuck) if (!help.INDEX[code]) dangling.push(`${l.lesson} -> ${code}`);
}
ok('8.1 no lesson points at a help page that does not exist', dangling.length === 0, dangling);

// A recipe built on syntax the student has not met is worse than no recipe.
let premature = [];
const order = LESSONS.map((l) => l.lesson);
for (const l of LESSONS) {
  for (const code of l.stuck) {
    const h = help.INDEX[code];
    if (h && order.indexOf(h.after) > order.indexOf(l.lesson)) {
      premature.push(`${l.lesson} links ${code} which needs ${h.after}`);
    }
  }
}
ok('8.2 no lesson links help that requires a later lesson', premature.length === 0, premature);

ok('8.3 every help page has a unique handle',
  new Set(help.ALL.map((h) => h.handle)).size === help.ALL.length);
ok('8.4 every help page has a unique code',
  new Set(help.ALL.map((h) => h.code)).size === help.ALL.length);
ok('8.5 help handles never match the lesson handle rule, so they cannot be tracked',
  help.ALL.every((h) => !/^intro-java-lesson-\d+-\d+-/.test(h.handle)));
ok('8.6 every error page names the message verbatim so it is searchable',
  help.ERRORS.every((e) => e.message && e.message.length > 5));
ok('8.7 every error and gotcha page ranks its causes',
  [...help.ERRORS, ...help.GOTCHAS].every((e) => e.causes && e.causes.length >= 2));
ok('8.8 every help page carries its own seo description in range',
  help.ALL.every((h) => h.seo && h.seo.description.length >= 70 && h.seo.description.length <= 160),
  help.ALL.filter((h) => !h.seo || h.seo.description.length < 70 || h.seo.description.length > 160)
    .map((h) => `${h.code}:${h.seo ? h.seo.description.length : 'none'}`));

// ── 9. House conventions ─────────────────────────────────────────────────────
section('9. House conventions hold across every rendered page');

for (let i = 0; i < pages.length; i++) {
  const p = pages[i];
  const blob = p.bodyHtml + p.seoTitle + p.seoDescription;
  ok(`9.x ${LESSONS[i].lesson} contains no em-dash`, !blob.includes('—'));
  ok(`9.x ${LESSONS[i].lesson} contains no emoji or non-ASCII`,
    // eslint-disable-next-line no-control-regex
    !/[^\x00-\x7F]/.test(blob),
    // eslint-disable-next-line no-control-regex
    (blob.match(/[^\x00-\x7F]/g) || []).slice(0, 5));
  ok(`9.x ${LESSONS[i].lesson} never uses &quot; inside an attribute`,
    !/="[^"]*&quot;/.test(p.bodyHtml));
  ok(`9.x ${LESSONS[i].lesson} scopes all css under the wrapper id`,
    !/<style>[\s\S]*?(^|\})\s*(body|html|\*)\s*\{/m.test(p.bodyHtml));
}

// ── 10. The manifest the bank will produce ───────────────────────────────────
//  These numbers ARE the denominators every student in the class is graded
//  against, so they are asserted here rather than discovered after a teacher
//  reports that everyone is failing. The gate is checked too: content existing
//  in this repo is not the same fact as a student being able to open it.
section('10. Manifest derivation, and the gate that holds it back');

process.env.DB_PATH = process.env.DB_PATH
  || require('path').join(require('os').tmpdir(), 'smoke-introjava-manifest.db');
const { buildRows } = require('../scripts/seed-manifest');
const ijRows = buildRows().filter((r) => r.course === 'intro-java');

ok('10.1 visit rows exist for all 42 lessons of the course',
  ijRows.filter((r) => r.item_type === 'visit').length === 42,
  ijRows.filter((r) => r.item_type === 'visit').length);
ok('10.1b every authored lesson has a visit row',
  LESSONS.every((l) => ijRows.some((r) => r.item_id === `${l.lesson}-visit`)),
  LESSONS.filter((l) => !ijRows.some((r) => r.item_id === `${l.lesson}-visit`)).map((l) => l.lesson));

// The gate opened on 2026-08-16, when all 90 pages went live on Shopify. This
// check used to assert the mirror of itself: that NO graded row was seeded while
// the pages did not exist. Now the rows ARE the denominators every student is
// graded against, so what matters is that they exist and that every one of them
// is reachable.
//
// The direction that actually protects a student is the second one below. A row
// nothing can post to is an unreachable denominator, which marks the whole class
// down for a reason no teacher can see, and it is invisible unless something
// compares the two sets.
const { INTRO_JAVA_PAGES_LIVE } = require('../scripts/seed-manifest');
ok('10.2 the gate is open, because the pages are live', INTRO_JAVA_PAGES_LIVE === true);

const gradedRows = ijRows.filter((r) => r.item_type !== 'visit');
ok('10.2a graded rows are seeded', gradedRows.length > 0, gradedRows.length);

// Every id the rendered pages actually post to, scraped from the HTML rather
// than recomputed from the bank, so this compares the PAGE against the MANIFEST
// rather than the bank against itself.
const ijPosted = new Set();
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  for (const m of p.bodyHtml.match(/data-item-id="([^"]+)"/g) || []) ijPosted.add(m.split('"')[1]);
}
const ijRowIds = new Set(gradedRows.map((r) => r.item_id));
const unreachable = [...ijRowIds].filter((id) => !ijPosted.has(id));
const unseeded = [...ijPosted].filter((id) => !ijRowIds.has(id));
ok('10.2b every graded row has a page that can post to it',
  unreachable.length === 0, unreachable.slice(0, 8));
ok('10.2c every item a page posts to has a manifest row',
  unseeded.length === 0, unseeded.slice(0, 8));
ok('10.2d the two sets are the same size, so neither hides a swap',
  ijRowIds.size === ijPosted.size, { rows: ijRowIds.size, posted: ijPosted.size });

// What the flag produces, computed straight from the bank.
let expCfu = 0, expGapItems = 0, expGapPts = 0, expQuizItems = 0, expQuizPts = 0;
for (const l of LESSONS) {
  expCfu += l.cfus.length;
  if (l.gap) { expGapItems++; expGapPts += l.gap.holes.length; }
  if (l.quiz.length) { expQuizItems++; expQuizPts += l.quiz.length; }
}
const totalPoints = expCfu + expGapPts + expQuizPts;
console.log(`         when live: ${expCfu} cfu + ${expGapItems} gap (${expGapPts} pts)`
  + ` + ${expQuizItems} quiz (${expQuizPts} pts) = ${totalPoints} points across ${BANKS.length} units`);

ok('10.3 every lesson contributes a quiz', expQuizItems === LESSONS.length, expQuizItems);
ok('10.4 gap items are one row per lesson, not one row per hole',
  expGapItems === LESSONS.filter((l) => l.gap).length, expGapItems);
// The upper bound is a smoke alarm for a runaway generator, not a design limit.
// The full six-unit course lands near 480 points, which is about 80 per unit and
// is what a year-long course should be worth.
ok('10.5 the authored units are worth a sane number of points, not thousands',
  totalPoints > 40 && totalPoints < 900, totalPoints);

// ── 11. The getting-unstuck pages render correctly ───────────────────────────
//  These are the pages a stranger finds by searching their error message, so
//  they are the largest SEO surface in the course and the one most likely to be
//  someone's first contact with the site. They are also the pages that must
//  never be tracked as progress.
section('11. Help pages render, rank their causes, and are never tracked');

const { renderHelp, kindOf } = require('../lib/intro-java-help-page');
const helpPages = build.helpPages();

ok('11.1 every catalog entry renders', helpPages.length === help.ALL.length);

for (const hp of helpPages) {
  const h1s = (hp.bodyHtml.match(/<h1[\s>]/g) || []).length;
  ok(`11.x ${hp.code} has exactly one h1`, h1s === 1, h1s);
  ok(`11.x ${hp.code} meta description is 70 to 160 characters`,
    hp.seoDescription.length >= 70 && hp.seoDescription.length <= 160, hp.seoDescription.length);
  ok(`11.x ${hp.code} seo title is at most 60 characters`, hp.seoTitle.length <= 60, hp.seoTitle.length);

  // Never trackable. No item ids, no lesson id, and a handle the tracker's
  // regex cannot match.
  ok(`11.x ${hp.code} carries no tracking attributes`,
    !/data-item-id|data-lesson-id/.test(hp.bodyHtml));
  ok(`11.x ${hp.code} handle cannot be mistaken for a lesson`,
    !/^intro-java-lesson-\d+-\d+-/.test(hp.handle), hp.handle);

  const blocks = [...hp.bodyHtml.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let valid = true; const types = [];
  for (const b of blocks) { try { types.push(JSON.parse(b)['@type']); } catch (e) { valid = false; } }
  ok(`11.x ${hp.code} structured data parses`, valid && blocks.length >= 2, types);
  ok(`11.x ${hp.code} declares TechArticle and a FAQ`,
    types.includes('TechArticle') && types.includes('FAQPage'), types);
  ok(`11.x ${hp.code} no HTML entity inside a script block`,
    !blocks.some((b) => /&(amp|quot|lt|gt|#\d+);/.test(b)));

  ok(`11.x ${hp.code} is pure ASCII with no em-dash`,
    // eslint-disable-next-line no-control-regex
    !/[^\x00-\x7F]/.test(hp.bodyHtml + hp.seoTitle + hp.seoDescription));
}

// The error message must appear VERBATIM, because it is the exact string
// somebody pastes into a search box.
for (const e of [...help.ERRORS, ...help.GOTCHAS]) {
  const hp = helpPages.find((x) => x.code === e.code);
  if (e.message) {
    ok(`11.m ${e.code} renders its message verbatim and searchable`,
      hp.bodyHtml.includes(`<code>${e.message.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</code>`),
      e.message);
  }
  ok(`11.m ${e.code} ranks at least two causes`, e.causes.length >= 2, e.causes.length);
  ok(`11.m ${e.code} gives a worked fix`, !!e.fix && e.fix.length > 60);
}

for (const r of help.RECIPES) {
  const hp = helpPages.find((x) => x.code === r.code);
  ok(`11.r ${r.code} ships working code`, !!r.snippet && hp.bodyHtml.includes('ij-code'));
}

ok('11.z every help page title is unique',
  new Set(helpPages.map((h) => h.title)).size === helpPages.length);
ok('11.z every help description is unique',
  new Set(helpPages.map((h) => h.seoDescription)).size === helpPages.length);
// The builder calls every one of these a 'help' page; `helpKind` is the axis
// that separates a compiler error from a game-design recipe. All three have to
// be present, because they answer three different kinds of stuck.
ok('11.z the catalog covers errors, gotchas and recipes',
  new Set(helpPages.map((h) => h.helpKind)).size === 3,
  [...new Set(helpPages.map((h) => h.helpKind))]);
ok('11.z helpKind agrees with the catalog classifier',
  helpPages.every((h) => h.helpKind === kindOf(help.INDEX[h.code])));

// ── 11.5 EVERY INTERNAL LINK RESOLVES ────────────────────────────────────────
//  The defect this exists for shipped to the live store and had to be found by
//  auditing Shopify afterwards. Three separate causes, one shape: a URL built
//  from a handle that nobody checked against the handles the build produces.
//
//    - The course hub took over a legacy slug, and three renderers still had
//      `/pages/intro-java` hardcoded. 83 pages pointed at a 404.
//    - Every lesson breadcrumb linked to `intro-java-unit-1` regardless of its
//      unit, so a Unit 6 crumb said "Unit 6" and went to Unit 1.
//    - All 41 help pages had a crumb to `/pages/intro-java-help`, an index page
//      that was never built.
//
//  None of these break a page, none throw, and none are visible in a diff. The
//  only thing that catches them is checking every link target against the set of
//  handles the build actually produces, which is what this does.
section('11.5 Every internal link points at a page this build produces');

const ijBuiltHandles = new Set([...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()].map((p) => p.handle));
const IJ_LINK_RE = /https:\/\/apcsexamprep\.com\/pages\/([a-z0-9-]+)/g;

// Only intro-java links are this build's responsibility. A link out to an
// existing AP CSA page is legitimate and cannot be checked from here.
const ijDangling = [];
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  for (const m of p.bodyHtml.match(IJ_LINK_RE) || []) {
    const h = m.split('/pages/')[1];
    if (h.startsWith('intro-java') || ijBuiltHandles.has(h)) {
      if (!ijBuiltHandles.has(h)) ijDangling.push(`${p.handle} -> ${h}`);
    }
  }
}
ok('11.5a no page links to an intro-java handle this build does not produce',
  ijDangling.length === 0, ijDangling.slice(0, 8));

// The course hub is the one link every page makes, and its handle is a legacy
// slug that reads like a mistake. Pin it so nobody "tidies" it back.
const IJ_COURSE_HANDLE = require('../lib/intro-java-page').COURSE_HANDLE;
ok('11.5b the course handle is the inherited slug, defined in one place',
  IJ_COURSE_HANDLE === 'greenfoot-basics-beginner-greenfoot-projects-and-tutorials', IJ_COURSE_HANDLE);
ok('11.5c a page with that handle is actually built', ijBuiltHandles.has(IJ_COURSE_HANDLE));

// Breadcrumb positions must run 1..n. Deleting a crumb and leaving the numbering
// alone is how structured data silently stops validating.
let ijCrumbSeq = 0;
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  for (const m of p.bodyHtml.match(/"@type":"BreadcrumbList"[\s\S]*?\]/g) || []) {
    const pos = (m.match(/"position":(\d+)/g) || []).map((x) => Number(x.split(':')[1]));
    if (pos.join(',') !== pos.map((_, i) => i + 1).join(',')) ijCrumbSeq++;
  }
}
ok('11.5d every breadcrumb numbers its items 1..n with no gaps', ijCrumbSeq === 0, ijCrumbSeq);

// And the lesson crumb must name the unit it actually links to.
let ijCrumbUnit = [];
for (const p of pages) {
  const lid = (p.bodyHtml.match(/data-lesson-id="([0-9.]+)"/) || [])[1];
  const unit = (p.bodyHtml.match(/pages\/intro-java-unit-(\d)/) || [])[1];
  if (!lid || !unit || lid.split('.')[0] !== unit) ijCrumbUnit.push(`${p.handle}: lesson ${lid}, crumb unit ${unit}`);
}
ok('11.5e every lesson breadcrumb links to its OWN unit hub',
  ijCrumbUnit.length === 0, ijCrumbUnit.slice(0, 5));

// ── 11.6 GENERATED QUESTION TEXT READS LIKE ENGLISH ──────────────────────────
//  FAQ questions are built by stripping a known prefix off the page title. When
//  five error pages were retitled to "Java error in Greenfoot: X" the pattern
//  stopped matching, and every one of them shipped structured data asking
//  "What usually causes Java error in Greenfoot: cannot find symbol?".
//
//  Nothing breaks, no check failed, and it is the kind of text that would go out
//  in a rich result. A generated string that embeds a title prefix is fragile by
//  nature, so it gets a check rather than a promise.
section('11.6 Generated FAQ questions read like questions');

const ijFaqNames = [];
for (const p of helpPagesForLinks()) {
  for (const m of p.bodyHtml.match(/"@type":"FAQPage"[\s\S]*?<\/script>/g) || []) {
    for (const n of m.match(/"name":"((?:[^"\\]|\\.)*)"/g) || []) {
      ijFaqNames.push({ page: p.handle, q: n.slice(8, -1) });
    }
  }
}
ok('11.6a help pages emit FAQ questions', ijFaqNames.length > 40, ijFaqNames.length);

// A leftover title prefix inside the question is the defect.
const ijLeftover = ijFaqNames.filter((x) => /causes Java error|causes How to|^How do I How /.test(x.q));
ok('11.6b no question embeds a title prefix it meant to strip',
  ijLeftover.length === 0, ijLeftover.slice(0, 5));

// And no question should contain a colon, which is what a stripped-prefix
// failure always leaves behind.
const ijColon = ijFaqNames.filter((x) => /causes [^?]*:/.test(x.q));
ok('11.6c no cause-question carries a stray colon', ijColon.length === 0, ijColon.slice(0, 5));

// ── 11.6e EVERY PAGE HAS A WAY BACK UP ───────────────────────────────────────
//  A lesson page had Previous and Next and nothing else. That is fine for a
//  student walking the course in order and useless for the one who arrived on
//  lesson 4.4 from a search result: no link to the unit, no link to the course,
//  no way to see what else exists. The site nav is not a substitute, because
//  these are Shopify pages whose body is the whole experience.
//
//  Prev/next is not a way up. It moves sideways, and on the first and last page
//  of a unit it does not even do that. So this checks for an actual upward
//  link, by target rather than by presence of a nav.
//
//  Project pages point at the project LIST on the hub rather than the hub's
//  top, which is the anchor PROJECTS_ANCHOR exists to keep honest: the id on
//  the hub and the fragment on ten project pages come from one constant, and
//  this check fails if the hub ever stops emitting it.
section('11.6e Every page has a link back up to its hub');

const IJ_PAGE = require('../lib/intro-java-page');

// Structured data is stripped first, and that is the whole point of the check.
// Every lesson page already carried its unit hub URL inside a BreadcrumbList,
// so a naive substring test passed on pages that gave the reader nothing to
// click. A crumb in JSON-LD is for Google. A student needs an anchor.
const visible = (p) => p.bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '');

const ijNoWayUp = [];
for (const p of pages) {
  const unit = (p.bodyHtml.match(/data-unit="(unit-\d)"/) || [])[1];
  if (!unit || !visible(p).includes(`/pages/${IJ_PAGE.unitHandle(unit)}"`)) {
    ijNoWayUp.push(`${p.handle}: no href to ${unit ? IJ_PAGE.unitHandle(unit) : 'any unit hub'}`);
  }
}
ok('11.6e1 every lesson page links to its own unit hub',
  ijNoWayUp.length === 0, ijNoWayUp.slice(0, 5));

const ijHelpNoUp = helpPagesForLinks()
  .filter((p) => !visible(p).includes(`/pages/${IJ_PAGE.COURSE_HANDLE}`))
  .map((p) => p.handle);
ok('11.6e2 every help page links to the course hub', ijHelpNoUp.length === 0, ijHelpNoUp.slice(0, 5));

const ijProjNoUp = projectPagesForLinks()
  .filter((p) => !visible(p).includes(IJ_PAGE.PROJECTS_URL))
  .map((p) => p.handle);
ok('11.6e3 every project page links back to the project list, not just the hub top',
  ijProjNoUp.length === 0, ijProjNoUp.slice(0, 5));

// The fragment is worthless if nothing on the hub answers to it.
const ijCourseHub = hubsForLinks().find((p) => p.handle === IJ_PAGE.COURSE_HANDLE);
ok('11.6e4 the course hub emits the anchor those project links point at',
  !!ijCourseHub && ijCourseHub.bodyHtml.includes(`id="${IJ_PAGE.PROJECTS_ANCHOR}"`));

// One definition, two callers. Copying the formula into a second file is how
// 83 pages once ended up pointing at a handle nobody built.
ok('11.6e5 the unit handle formula is shared, not copied',
  require('../lib/intro-java-hub-page').unitHandle === IJ_PAGE.unitHandle);

// ── 11.6d EVERY FIGURE URL IS ONE SHOPIFY ACTUALLY SERVES ────────────────────
//  This shipped broken. The renderer built figure URLs as
//  https://apcsexamprep.com/cdn/shop/files/<name>.png, which looks entirely
//  plausible, is the path Shopify uses in plenty of other stores, and 404s on
//  this one. Nothing caught it: the pages imported cleanly, the <img> tags were
//  present and correct, the smoke suite was green, and every figure rendered as
//  a broken image with its alt text sitting in the box.
//
//  The two images that have always worked on this site (the logo and the profile
//  picture) both use the cdn.shopify.com form with the shop id in the path, so
//  that is the shape pinned here. A URL is only correct if a server agrees, and
//  the closest this suite can get to asking one is to require the same shape as
//  the images already known to load.
section('11.6d Figure URLs use the form this store serves');

const SERVED_PREFIX = 'https://cdn.shopify.com/s/files/1/0778/8403/1191/files/';
const ijImgSrcs = [];
// Lessons, hubs and help pages: a figure URL is wrong wherever it appears.
for (const p of pages.concat(hubsForLinks(), helpPagesForLinks())) {
  for (const m of p.bodyHtml.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    ijImgSrcs.push({ page: p.handle, src: m[1] });
  }
}
ok('11.6d1 the course renders figures at all', ijImgSrcs.length > 100, ijImgSrcs.length);
const badHost = ijImgSrcs.filter((x) => !x.src.startsWith(SERVED_PREFIX));
ok('11.6d2 every figure URL uses the prefix this store serves',
  badHost.length === 0, badHost.slice(0, 4));
// The exact form that shipped broken, named so the failure message says why.
const proxied = ijImgSrcs.filter((x) => /\/cdn\/shop\/files\//.test(x.src));
ok('11.6d3 no figure uses the storefront-proxied path, which 404s here',
  proxied.length === 0, proxied.slice(0, 4));
// A baked-in ?v= would pin each figure to the version it had on import day.
const versioned = ijImgSrcs.filter((x) => x.src.includes('?'));
ok('11.6d4 no figure URL carries a cache-busting query', versioned.length === 0, versioned.slice(0, 4));

// ── 11.7 US ENGLISH, BECAUSE THE AUDIENCE IS US ──────────────────────────────
//  The course shipped with British spelling throughout: behaviour, labelled,
//  maths, neighbours, capitalisation, and "marked" where a US teacher says
//  "graded". It reads as foreign to the students and teachers this is sold to,
//  and one of them was in a lesson TITLE and its URL.
//
//  The technical half matters more than the spelling. In US usage `()` are
//  PARENTHESES and `[]` are BRACKETS. The content called `()` "round brackets"
//  and `[]` "square brackets", so it used one word for both in a Java course
//  where a beginner meets both in the same week. That is a teaching defect, not
//  a dialect preference.
//
//  Deliberately NOT checked here: lib/greenfoot-stub.js, which implements the
//  real Greenfoot API. `turnTowards(int, int)` is a genuine method name and
//  "correcting" it would break every scenario that calls it.
section('11.7 US English throughout');

const BRITISH = [
  'behaviour', 'colour', 'favour', 'honour', 'labour', 'neighbour', 'flavour',
  'centre', 'metre', 'theatre', 'fibre',
  'capitalis', 'recognis', 'organis', 'normalis', 'optimis', 'realis',
  'labelled', 'travelled', 'cancelled', 'modelling',
  'whilst', 'amongst', 'learnt', 'spelt',
  'towards', 'afterwards', 'upwards', 'downwards', 'forwards',
  'grey', 'defence', 'licence',
];
const ijBritHits = [];
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  const text = p.bodyHtml.replace(/<[^>]+>/g, ' ');
  for (const w of BRITISH) {
    const re = new RegExp('\\b' + w + '[a-z]*', 'gi');
    for (const m of text.match(re) || []) ijBritHits.push(`${p.handle}: ${m}`);
  }
}
ok('11.7a no British spelling in any rendered page', ijBritHits.length === 0, ijBritHits.slice(0, 8));

// "maths" is its own check: the word is a plural in British usage and a
// substring of nothing useful, so a bare word-boundary match is exact.
const ijMaths = [];
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  if (/\bmaths\b/i.test(p.bodyHtml.replace(/<[^>]+>/g, ' '))) ijMaths.push(p.handle);
}
ok('11.7b the subject is math, not maths', ijMaths.length === 0, ijMaths);

// British education register. Work is graded, not marked.
const ijMarked = [];
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  const t = p.bodyHtml.replace(/<[^>]+>/g, ' ');
  if (/\b(marked|marking)\b/i.test(t)) ijMarked.push(p.handle);
}
ok('11.7c work is graded, not marked', ijMarked.length === 0, ijMarked.slice(0, 5));

// The technical one. `()` are parentheses; only `[]` may be called brackets.
const ijBrackets = [];
for (const p of [...pages, ...helpPagesForLinks(), ...hubsForLinks(), ...projectPagesForLinks()]) {
  const t = p.bodyHtml.replace(/<[^>]+>/g, ' ');
  if (/round brackets?/i.test(t)) ijBrackets.push(`${p.handle}: round bracket`);
  // A bare "bracket" not preceded by "square" is ambiguous to a US reader.
  for (const m of t.match(/(?<!square )brackets?/gi) || []) ijBrackets.push(`${p.handle}: bare ${m}`);
}
ok('11.7d parentheses are called parentheses, and only [] are brackets',
  ijBrackets.length === 0, ijBrackets.slice(0, 6));

// ── 12. This is a PRE-AP course, and the pages must read like one ────────────
//  intro-java is the on-ramp, not AP CSA. Most students taking it will never
//  sit the exam: it is sold to intro and pre-AP classes, and to teachers who
//  want a first-year course that happens to feed CSA.
//
//  So AP framing must not appear in anything a STUDENT reads. "This is a
//  favourite of AP exam questions" is demotivating to a beginner who is not
//  taking that exam, and it quietly changes what the course is promising. The
//  skill is worth having because it is useful, not because of a test.
//
//  Four such lines had leaked into lesson prose before this check existed.
//
//  The CSA ALIGNMENT ITSELF is real and stays: it is the business case, it is
//  why Unit 3 is shaped the way it is, and it belongs in the spec, the file
//  headers and the commit messages. Those are code comments and internal docs,
//  never rendered, which is exactly why this check runs against the RENDERED
//  HTML rather than against the source.
section('12. No AP framing reaches a student-facing page');

const AP_PATTERNS = [/AP exam/i, /AP CSA/i, /Advanced Placement/i, /College Board/i,
  /AP Computer Science/i];

let apLeaks = [];
for (let i = 0; i < pages.length; i++) {
  for (const re of AP_PATTERNS) {
    const m = pages[i].bodyHtml.match(re);
    if (m) apLeaks.push(`${LESSONS[i].lesson} contains "${m[0]}"`);
  }
  const meta = pages[i].seoTitle + ' ' + pages[i].seoDescription;
  for (const re of AP_PATTERNS) {
    if (re.test(meta)) apLeaks.push(`${LESSONS[i].lesson} seo metadata mentions AP`);
  }
}
for (const hp of helpPages) {
  for (const re of AP_PATTERNS) {
    const m = hp.bodyHtml.match(re);
    if (m) apLeaks.push(`${hp.code} contains "${m[0]}"`);
  }
}
ok('12.1 no LESSON or HELP page mentions the AP exam or AP CSA', apLeaks.length === 0, apLeaks);

// ── And the other direction ─────────────────────────────────────────────────
//  The hubs are the teacher-facing surface. A teacher choosing a first-year
//  course needs to know it feeds AP CSA, and that is the search they actually
//  run. So the AP relationship is REQUIRED here, and asserted, because an
//  over-zealous future cleanup that strips it from these pages would quietly
//  delete the reason a teacher finds the course at all.
const { renderAllHubs, PREAP_LINE, COURSE_HANDLE, unitHandle } =
  require('../lib/intro-java-hub-page');
const hubs = build.hubPages();

ok('12.4 the course hub and one hub per unit are rendered',
  hubs.length === BANKS.length + 1, hubs.length);

const courseHub = hubs[0];
ok('12.5 the course hub names the AP CSA relationship in its title',
  /AP Computer Science A|AP CSA/i.test(courseHub.seoTitle), courseHub.seoTitle);
ok('12.6 and in its meta description',
  /AP Computer Science A|AP CSA/i.test(courseHub.seoDescription), courseHub.seoDescription);
ok('12.7 and in the visible h1',
  /AP CSA|AP Computer Science/i.test((courseHub.bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ['', ''])[1]));

// The relationship is described, never branded. "Pre-AP Computer Science" as a
// course NAME would imply a College Board program this is not.
ok('12.8 the hub never uses Pre-AP as the course name or with a trademark mark',
  !/Pre-?AP\s+(Computer Science|CSA|Java)/i.test(courseHub.bodyHtml)
  && !/Pre-?AP\s*[(R)\u00ae\u2122]/i.test(courseHub.bodyHtml),
  (courseHub.bodyHtml.match(/.{0,40}Pre-?AP.{0,40}/gi) || []));
ok('12.9 any pre-AP mention describes how the course is USED, in one isolated line',
  PREAP_LINE === null || (courseHub.bodyHtml.includes(PREAP_LINE)
    && (courseHub.bodyHtml.match(/pre-?AP/gi) || []).length === 1),
  (courseHub.bodyHtml.match(/pre-?AP/gi) || []).length);

ok('12.10 no hub claims College Board affiliation or endorsement',
  !hubs.some((h) => /College Board|official AP|endorsed by|authorized by/i.test(h.bodyHtml)));

// Hubs are held to the same page quality bar as everything else.
for (const h of hubs) {
  ok(`12.h ${h.handle} has exactly one h1`,
    (h.bodyHtml.match(/<h1[\s>]/g) || []).length === 1);
  ok(`12.h ${h.handle} meta description is 70 to 160 characters`,
    h.seoDescription.length >= 70 && h.seoDescription.length <= 160, h.seoDescription.length);
  ok(`12.h ${h.handle} seo title is at most 65 characters`,
    h.seoTitle.length <= 65, { len: h.seoTitle.length, t: h.seoTitle });
  ok(`12.h ${h.handle} carries no tracking attributes`,
    !/data-item-id|data-lesson-id/.test(h.bodyHtml));
  ok(`12.h ${h.handle} handle cannot be mistaken for a lesson`,
    !/^intro-java-lesson-\d+-\d+-/.test(h.handle), h.handle);
  const blocks = [...h.bodyHtml.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let valid = true;
  for (const b of blocks) { try { JSON.parse(b); } catch (e) { valid = false; } }
  ok(`12.h ${h.handle} structured data parses`, valid && blocks.length >= 2, blocks.length);
  ok(`12.h ${h.handle} no HTML entity inside a script block`,
    !blocks.some((b) => /&(amp|quot|lt|gt|#\d+);/.test(b)));
  ok(`12.h ${h.handle} is pure ASCII with no em-dash`,
    // eslint-disable-next-line no-control-regex
    !/[^\x00-\x7F]/.test(h.bodyHtml + h.seoTitle + h.seoDescription));
}

ok('12.11 hub titles and descriptions are all unique',
  new Set(hubs.map((h) => h.seoTitle)).size === hubs.length
  && new Set(hubs.map((h) => h.seoDescription)).size === hubs.length);

// The whole point of building these: every lesson now has a parent that links
// to it, and the breadcrumbs on every lesson finally resolve.
const hubHtml = hubs.map((h) => h.bodyHtml).join('');
let unlinked = LESSONS.filter((l) => !hubHtml.includes(`/pages/${handleFor(l)}`));
ok('12.12 every one of the 42 lessons is linked from its unit hub',
  unlinked.length === 0, unlinked.map((l) => l.lesson));

let unlinkedHelp = help.ALL.filter((h) => !hubHtml.includes(`/pages/${h.handle}`));
ok('12.13 every help page is linked from a hub', unlinkedHelp.length === 0,
  unlinkedHelp.map((h) => h.code));

ok('12.14 the breadcrumb targets on lesson pages now resolve to real hubs',
  pages.every((p) => {
    const crumbs = (p.bodyHtml.match(/\/pages\/(intro-java[a-z0-9-]*)/g) || [])
      .map((u) => u.replace('/pages/', ''));
    return crumbs.filter((c) => c === COURSE_HANDLE || /^intro-java-unit-\d+$/.test(c))
      .every((c) => hubs.some((h) => h.handle === c));
  }));

// The alignment claim is allowed, and expected, in the internal spec.
const fsMod = require('fs');
const specPath = require('path').join(__dirname, '..', 'docs', 'intro-java-course-spec.md');
if (fsMod.existsSync(specPath)) {
  const spec = fsMod.readFileSync(specPath, 'utf8');
  ok('12.2 the internal spec still records the CSA alignment, which is the business case',
    /CSA/.test(spec));
}

// And the course must describe itself as a beginner course, not an AP one.
ok('12.3 the course description in structured data makes no AP claim',
  !pages.some((p) => /"AP |Advanced Placement/.test(
    (p.bodyHtml.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join(''))));

// ── 13. Screenshots: shippable now, upgradeable later ────────────────────────
//  158 screenshots are referenced and almost none are taken. That must not block
//  the course, and it must not ship broken image icons either.
//
//  So a shot that is not in seed/intro-java-shots.js is not rendered as an image
//  at all: its alt text becomes an "On your screen" instruction, pointing the
//  student at their own Greenfoot window. The alt text was written to describe
//  what matters in the frame, which is the only reason that reads as teaching
//  rather than as an apology.
//
//  The check that earns its keep is 13.4: a path in the AVAILABLE list that no
//  step actually references. That is a typo during upload, and without this it
//  fails silently, showing the instruction forever while somebody is certain
//  they uploaded the picture.
section('13. Screenshot availability and the shot list');

const shots = require('../seed/intro-java-shots');
const shotList = require('../scripts/intro-java-shot-list');
const allShots = shotList.collect();

ok('13.1 every screenshot in the bank appears in the generated shot list',
  allShots.length === LESSONS.reduce((n, l) => n + l.steps.filter((s) => s.shot).length, 0),
  allShots.length);

ok('13.2 the shot list names both the path and the flattened upload name',
  allShots.every((r) => r.src.includes('/') && r.upload === r.src.split('/').join('-')));

// Nothing renders a broken image. Either the file exists and is an img, or it
// does not and the step explains what to look at instead.
let brokenImgs = [];
for (let i = 0; i < pages.length; i++) {
  const imgs = [...pages[i].bodyHtml.matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => m[1]);
  for (const src of imgs) {
    const bare = src.split('/').pop();
    if (!shots.AVAILABLE.some((a) => a.split('/').join('-') === bare)) {
      brokenImgs.push(`${LESSONS[i].lesson} renders ${bare} which is not in AVAILABLE`);
    }
  }
}
ok('13.3 no page renders an image that has not been taken', brokenImgs.length === 0, brokenImgs);

// The failure this exists for: a path uploaded and listed, but misspelled, so it
// never matches and the instruction shows forever.
const referenced = new Set(allShots.map((r) => r.src));
const orphans = shots.AVAILABLE.filter((a) => !referenced.has(a));
ok('13.4 every path in AVAILABLE matches a screenshot the bank actually references',
  orphans.length === 0, orphans);

// Every step that has no image must still be teachable on its own.
let mute = [];
for (let i = 0; i < pages.length; i++) {
  const l = LESSONS[i];
  const shotSteps = l.steps.filter((s) => s.shot).length;
  const looks = (pages[i].bodyHtml.match(/class="ij-look"/g) || []).length;
  const imgs = (pages[i].bodyHtml.match(/<img/g) || []).length;
  if (looks + imgs !== shotSteps) {
    mute.push(`${l.lesson}: ${shotSteps} shots, ${imgs} images, ${looks} instructions`);
  }
}
ok('13.5 every screenshot step renders either an image or an on-screen instruction',
  mute.length === 0, mute);

ok('13.6 an on-screen instruction carries the full description, not a filename',
  pages.every((p) => {
    const looks = [...p.bodyHtml.matchAll(/<p class="ij-look">([\s\S]*?)<\/p>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    return looks.every((t) => t.length > 40 && !/\.png/i.test(t));
  }));

console.log(`         ${shots.AVAILABLE.length} of ${allShots.length} screenshots taken`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
