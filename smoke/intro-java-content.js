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

// Render every lesson once, the same way the build script will.
const pages = LESSONS.map((l, i) => renderLesson(l, {
  prev: LESSONS[i - 1] ? { handle: handleFor(LESSONS[i - 1]), lesson: LESSONS[i - 1].lesson, title: LESSONS[i - 1].title } : null,
  next: LESSONS[i + 1] ? { handle: handleFor(LESSONS[i + 1]), lesson: LESSONS[i + 1].lesson, title: LESSONS[i + 1].title } : null,
  unitLabel: UNIT_OF.get(l.lesson).label,
  unitKey: UNIT_OF.get(l.lesson).unit,
  helpIndex: help.INDEX,
}));

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

ok('10.2 NO graded row is seeded while the pages are not live',
  ijRows.every((r) => r.item_type === 'visit'),
  ijRows.filter((r) => r.item_type !== 'visit').map((r) => r.item_id));

// What flipping the flag will produce, computed straight from the bank.
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
const helpPages = help.ALL.map((h) => renderHelp(h, {
  related: help.ALL.filter((x) => x.after === h.after && x.code !== h.code).slice(0, 3),
  lessonHandle: null,
}));

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
ok('11.z the catalog covers errors, gotchas and recipes',
  new Set(helpPages.map(kindOf ? (h) => h.kind : () => 1)).size === 3);

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
const hubs = renderAllHubs(BANKS, help);

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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
