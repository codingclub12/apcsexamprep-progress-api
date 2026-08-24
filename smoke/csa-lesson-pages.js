'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the six recontented AP CSA Unit 4 lesson pages (4.6, 4.7, 4.13, 4.14,
//  4.15, 4.17). These replace live pages that taught the wrong CED topic
//  entirely (title and body), not just a nav or metadata fix.
//
//  WHAT IS BEING PROTECTED:
//
//  1. THE HANDLE. Each page's handle must match what the already-merged
//     exercise-1/exercise-2 renderers expect (e.g. ap-csa-lesson-4-6-using-
//     text-files), since those pages link to it by that exact slug.
//  2. THE ANSWER KEY. The first draft of this content clustered 9 of 10
//     correct answers on option B for lesson 4.6, and similar skews on
//     4.13/4.14/4.15. Checked directly against rendered output, not assumed.
//  3. HOUSE HAZARDS: pure ASCII (plus the live template's own established
//     symbol set: middot, chevrons, arrows, check/warning/pin glyphs), no
//     &quot; in attributes, no entities inside <script> blocks, exactly one
//     <h1>, balanced script tags.
//  4. THE PREV/NEXT CHAIN. Each page's footer nav must point at a real
//     neighboring handle, and the six pages must chain to each other and to
//     the unchanged surrounding lessons in lesson-number order.
//
//  Run: npm run smoke:csalessons
// ─────────────────────────────────────────────────────────────────────────────

const { LESSONS } = require('../seed/csa-lesson-content-unit4');
const { renderLessonPage } = require('../lib/csa-lesson-render');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// Symbols the LIVE ap-csa-lesson-4-16-recursion template already uses raw,
// confirmed against a saved copy of its body. Anything else non-ASCII fails.
const KNOWN_SYMBOL = (c) => {
  const cp = c.codePointAt(0);
  if (cp <= 0x7F) return true;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true; // emoji
  if (cp === 0xFE0F) return true; // variation selector
  return ['·', '›', '‹', '←', '→', '⚠', '✅', '✓'].includes(c);
};

const pages = LESSONS.map((l) => ({ lesson: l, page: renderLessonPage(l, '2026-08-21') }));

section('1. Coverage and uniqueness');
ok('1.1 six lessons authored', LESSONS.length === 6, LESSONS.length);
ok('1.2 handles are unique', new Set(pages.map((p) => p.page.handle)).size === pages.length);
ok('1.3 rendered handle matches the authored handle',
  pages.every((p) => p.page.handle === p.lesson.handle),
  pages.filter((p) => p.page.handle !== p.lesson.handle).map((p) => p.lesson.lesson));

section('2. The page contract (house hazards)');
for (const { lesson, page } of pages) {
  const tag = lesson.lesson;
  const body = page.bodyHtml;

  const badChars = [...new Set(Array.from(body))].filter((c) => !KNOWN_SYMBOL(c));
  ok(`2.${tag} body has no unexpected non-ASCII characters`, badChars.length === 0, badChars);

  ok(`2.${tag} no attribute carries &quot;`, !/="[^"]*&quot;/.test(body));

  const scriptBlocks = [...body.matchAll(/<script(?:(?!<\/script>)[\s\S])*?<\/script>/g)].map((m) => m[0]);
  ok(`2.${tag} no entities inside <script> blocks`,
    scriptBlocks.every((sb) => !/&amp;|&lt;|&gt;|&quot;/.test(sb)));

  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  ok(`2.${tag} has exactly one h1`, h1s === 1, h1s);

  const opens = (body.match(/<script[\s>]/g) || []).length;
  const closes = (body.match(/<\/script>/g) || []).length;
  ok(`2.${tag} script tags balance`, opens === closes, { opens, closes });

  ok(`2.${tag} SEO title is 70 chars or fewer`, page.seoTitle.length <= 70, page.seoTitle.length);
  ok(`2.${tag} SEO description is non-trivial`, page.seoDescription.length >= 50, page.seoDescription.length);
}

section('3. Question count and answer-key balance');
for (const { lesson, page } of pages) {
  const tag = lesson.lesson;
  const mcqs = [...page.bodyHtml.matchAll(/<div class="apcs-ex" data-type="mcq" data-answer="([A-D])"/g)];
  ok(`3.${tag} renders 10 MCQs (5 practice + 5 mastery)`, mcqs.length === 10, mcqs.length);

  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const m of mcqs) counts[m[1]]++;
  const max = Math.max(...Object.values(counts));
  ok(`3.${tag} no single letter carries more than half the answers`, max <= 5, counts);
}

section('4. Prev/next chain');
const byHandle = new Map(pages.map((p) => [p.page.handle, p.lesson]));
for (const { lesson } of pages) {
  ok(`4.${lesson.lesson} declares both a prev and a next handle`,
    !!lesson.prevHandle && !!lesson.nextHandle);
}
// Internal links within the six: 4.6->4.7, 4.13->4.14->4.15 chain forward correctly.
ok('4.1 4.6 points forward to 4.7', byHandle.get('ap-csa-lesson-4-6-using-text-files').nextHandle === 'ap-csa-lesson-4-7-wrapper-classes');
ok('4.2 4.7 points back to 4.6', byHandle.get('ap-csa-lesson-4-7-wrapper-classes').prevHandle === 'ap-csa-lesson-4-6-using-text-files');
ok('4.3 4.13 points forward to 4.14', byHandle.get('ap-csa-lesson-4-13-implementing-2d-array-algorithms').nextHandle === 'ap-csa-lesson-4-14-searching-algorithms');
ok('4.4 4.14 points back to 4.13 and forward to 4.15',
  byHandle.get('ap-csa-lesson-4-14-searching-algorithms').prevHandle === 'ap-csa-lesson-4-13-implementing-2d-array-algorithms' &&
  byHandle.get('ap-csa-lesson-4-14-searching-algorithms').nextHandle === 'ap-csa-lesson-4-15-sorting-algorithms');
ok('4.5 4.15 points back to 4.14', byHandle.get('ap-csa-lesson-4-15-sorting-algorithms').prevHandle === 'ap-csa-lesson-4-14-searching-algorithms');
ok('4.6 4.17 points forward to the Unit 4 hub, since it is the unit\'s last lesson',
  byHandle.get('ap-csa-lesson-4-17-recursive-searching-and-sorting').nextHandle === 'ap-csa-unit-4-course');

section('5. Assembly is deterministic');
{
  const again = LESSONS.map((l) => renderLessonPage(l, '2026-08-21'));
  ok('5.1 rendering the same lesson content twice produces byte-identical HTML',
    again.every((p, i) => p.bodyHtml === pages[i].page.bodyHtml));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
