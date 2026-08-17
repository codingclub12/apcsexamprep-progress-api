# CSP course pages: the 53 the Teacher Bundle promises and the site did not have

2026-08-17, Claude Code, task #91.

## What was asked

"A build of the CSP course pages that are promised in the Teacher bundle but not
available on the site."

## What was actually missing, measured rather than assumed

The board titled task #91 "CSP bundle links to exercise pages that do not exist".
That framing turned out to be slightly wrong in a way worth recording, because
the correction is the finding.

I crawled the live storefront single threaded: the CSP hub, all five Big Idea
hubs, all 35 lesson pages, and the Teacher Course Bundle product page. Every
`/pages/` link found across those 41 pages was then status checked, 212 unique
URLs in total.

**211 of 212 returned 200.** There is no field of dead exercise links. The one
genuine 404 is the "Next" card at the bottom of
`/pages/ap-csp-course-big-idea-5-impact`, which points at
`/pages/ap-csp-exam-prep-hub`. That page does not exist, so the last step of the
course walk dead ends. It is real, it is small, and it is NOT what this build
fixes. It should get its own task.

The actual gap is not dead links. It is pages that were never linked because they
were never built:

| Promised | On the site 2026-08-17 |
|---|---|
| `exercise-2`, declared in `utils.js` for all five Big Ideas, so a column on every CSP gradebook | **0 pages.** No handle ending `-exercise-2` anywhere in CSP |
| Guided notes for Big Ideas 1, 2, 4, 5 (17 topics) | 17 notes pages, live since 2026-07-24 |
| Guided notes for Big Idea 3 (18 topics) | **0 pages** |
| `exercise-1` | 18 pages, Big Idea 3 only, and deliberately so per the `utils.js` comment |
| Lesson quizzes | Inline on all 35 lesson pages, 6 items each |

Two supporting facts. The CSA Teacher Course Bundle, same $249, same template,
spells out the house standard per lesson: "Teacher Guide, Guided Notes, **two
Exercises with Answer Keys**, a Discussion Activity, and a Bell Ringer + Quiz."
The CSP bundle promises "Lesson resources aligned to every topic on
APCSExamPrep.com". CSP delivers neither the second exercise anywhere nor notes
for its largest Big Idea, which is 30 to 35 percent of the exam.

The `utils.js` comment describing exercise-2 as "a practice game" that the other
Big Ideas "emit" describes something that has never existed. The comment is left
alone in this pass; the pages now make it true.

## What was built

53 pages, generated from data, shipped as a Matrixify sheet.

- **35 exercise-2 pages**, `ap-csp-course-bi{N}-{slug}-exercise-2`, six applied
  MCQs each, 210 questions with all four rationales written. Graded.
- **18 Big Idea 3 guided notes**, `ap-csp-course-bi3-{slug}-notes`, structurally
  matched to the 17 already live. Ungraded.

New files:

```
lib/csp-course-pages.js        renderer for both page kinds
seed/csp-exercise-2.js         index over seed/csp-exercise-2/bi{1,2,3a,3b,3c,4,5}.js
seed/csp-bi3-notes.js          index over seed/csp-bi3-notes/{a,b}.js
scripts/csp-pages-csv.js       validation gate plus the Matrixify sheet
smoke/csp-course-pages.js      51 offline checks, wired into CI via package.json
```

Build it with `npm run csppages -- out.csv`. `--kind exercise-2|notes` and
`--unit bi-N` split the sheet for a staged import.

## The trap that would have corrupted real grades

The CSP lesson pages share a `checkMCQ` handler that **hardcodes
`activity:'quiz'`** in the `apcsActivity` event it dispatches:

```js
_activity({activity:'quiz',item:qid,choice:chosen});
```

Reusing that handler on an exercise-2 page would have filed every answer under
the lesson's real QUIZ rollup, silently corrupting a grade a teacher is already
using. So these pages ship their own handler, which reads `data-activity` off
the enclosing `.mcq-item` instead. The markup is the single source of truth for
what an answer counts as. `smoke/csp-course-pages.js` 3.3 and 3.4 hold that line.

Worth noting for whoever owns the theme repo: the same latent bug sits in the
live lesson pages. It is harmless there only because every graded item on those
pages happens to be a quiz.

## Evidence

**All 53 handles were 404 before this build.** Every one curl'd against the live
storefront, single threaded: 53 of 53 returned 404. That is both the proof the
pages are missing and the proof the import creates rather than replaces.

**End to end grading verified in a real browser** against the DEPLOYED
`assets/ap-csp-reporter.js` fetched from the Shopify CDN, with the POST
intercepted:

```json
{"course":"ap-csp","unit":"bi-3","lesson":"conditionals",
 "activity_type":"exercise-2","item":"x2-1",
 "client_event_id":"ap-csp:bi-3:conditionals:exercise-2:x2-1:1","correct":true}
{"course":"ap-csp","unit":"bi-3","lesson":"conditionals",
 "activity_type":"exercise-2","item":"x2-2",
 "client_event_id":"ap-csp:bi-3:conditionals:exercise-2:x2-2:0","correct":false}
```

`activity_type` is `exercise-2`, not `quiz`. The correct option took `.correct`,
the wrong one took `.incorrect` and revealed the key, the scorebar read
"1 / 6 correct, 2 answered", re-clicking an answered question posted nothing,
and there were zero page errors.

No theme change is needed. The deployed reporter already strips a trailing
`-exercise-2` from the handle to recover the lesson, so it was built expecting
these pages.

**66 offline smoke suites pass**, including the new one.

## A defect the smoke caught, worth recording

First draft of the banks put **183 of 210 correct answers on B**. A student could
have passed every exercise-2 page in the course without reading a question. I
wrote the correct answer second out of habit, 35 times.

`smoke/csp-course-pages.js` 4.5 caught it. The fix is a deterministic rotation at
render time (`balancedOrder` in `lib/csp-course-pages.js`): the correct answer
moves to a target letter that advances by 3 per question, offset by a per-topic
hash. Rotation rather than shuffle, because several stems order their options
numerically and a shuffle would destroy that. Check 4.7 asserts each option keeps
its own rationale through the rotation. Rendered key is now A 53, B 50, C 52,
D 55.

## Grading posture, deliberately unchanged

`lib/gradebook-contract.js:473` resolves `games_graded` to false for `ap-csp`
unless a teacher sets it. exercise-2 therefore keeps its cell and its number and
stays out of the grade until a teacher opts in per class. **No existing class's
grade moves when these pages land.**

The exercise-2 denominators are written but **gated** behind
`CSP_EXERCISE_2_PAGES_LIVE = false` in `scripts/seed-csp-denominators.js`.
Seeding them before the import would give all 294 active classes 35 columns
reading 0 of 6 for work no student could have done yet, which is the same
failure the unit test columns were added to prevent, pointed the other way.
They are derived from the bank rather than scanned off a page, so the
denominator and the item count cannot drift apart.

## Still open

1. **The import has not run.** These are files in a repo, not pages on a store.
   Nothing is live. Suggested order: notes first (18 rows, ungraded, cannot
   affect a gradebook), verify, then exercise-2 (35 rows).
2. **After the import lands**, flip `CSP_EXERCISE_2_PAGES_LIVE` to true and run
   `node scripts/seed-csp-denominators.js --update`, or the new columns are
   denominated by whatever a student happened to answer.
3. **Nothing links to the new pages yet.** The Big Idea hubs and lesson pages
   need an Exercise 2 and a Guided Notes link, or these join the 101 pages with
   zero inbound internal links (task #73). The notes pages link out to their
   lesson and their exercise; the reverse direction is a hub and lesson body
   edit, which is Matrixify work on pages this build does not touch.
4. **`/pages/ap-csp-exam-prep-hub` is still a 404** from the Big Idea 5 Next
   card. Needs its own task.
5. **Notes objectives carry no CED codes.** The live Big Idea 1 notes cite
   `LO CRD-1.A` and so on. The AAP codes for Big Idea 3 were not verified against
   the CED during this build, and a wrong code inside a paid teacher product is
   worse than no code, so the objectives are plain language. Adding the codes is
   a mechanical pass for someone with the CED open.
6. **Task #91's title is wrong** and should be re-scoped or split. There is no
   field of dead exercise links; there are missing pages and one dead hub link.

## What I did not do

- Did not touch `utils.js`, the theme repo, or any live Shopify page.
- Did not change the `games_graded` default or any gradebook logic.
- Did not add `exercise-1` for Big Ideas 1, 2, 4 and 5. `utils.js` excludes it
  there on purpose, and the comment explaining why is specific and recent.
