# CSA Units 2-4: wiring the lesson widgets

Date: 2026-08-24
Agent: Claude Code
Repos: apcsexamprep-progress-api, apcsexamprep-theme

## What was wrong

All 53 AP CSA lesson pages are live and 38 of them recorded nothing. Units 2, 3
and 4 ship the same `apcs-ex` widget markup Unit 1 ships, with the same inline
grading handler that sets `.apcs-ex-feedback.show` plus `fb-correct` or
`fb-incorrect`. What they do not ship is a single `data-item-id` attribute, and
`assets/apcs-reporter.js` ignores widgets without one, on purpose.

So a student on 2.7 answers eight checks for understanding and a four question
mastery challenge, sees green feedback on every one, and the gradebook has never
heard of any of it. This is the same failure class as the AP Cyber
`APCS_saveLessonScore` bug from earlier this week: the code is correct and wired
to nothing.

Measured fresh, all 53 live pages fetched:

| unit | lessons needing wiring | graded widgets | mastery questions |
|---|---|---|---|
| 2 | 12 | 96 | 48 |
| 3 | 6 (3.1, 3.3, 3.4 are built-model and already reported) | 48 | 24 |
| 4 | 17 | 85 | 85 |

382 graded widgets across 35 lesson pages, every one of them an `mcq`, every one
of them with a working page handler.

## What changed, and why not the obvious thing

`docs/csa-manifest-readiness.md` records the plan from 2026-08-07: inject
`data-item-id` into 38 Shopify page bodies via Matrixify, then seed the
manifest. That is 38 rewrites of multi hundred kilobyte live page bodies, and
the repo's own conventions note that Body HTML is the one cell that has silently
truncated a live page.

The attributes are not information. They are position. The markup is uniform and
self describing: the CFU widgets are the graded `apcs-ex` blocks OUTSIDE the
`.apcsa-mastery` section in document order, and the mastery section is the quiz.
So the reporter now mints the ids itself.

**Theme, `assets/apcs-reporter.js`:** `assignFallbackIds()` runs at init and
names `U.L-cfu-N` / `U.L-quiz` on any lesson page that carries no widget item id
at all. The decision is factored into `fallbackPlan(lesson, widgets)`, a pure
function over an ordered list of `{ gradable, inMastery }`, so it is tested
without a DOM.

It is deliberately narrow:

- it bails out entirely if the page has any `.apcs-ex[data-item-id]` or
  `.apcsa-mastery[data-item-id]`, so an attributed page is never renamed
  underneath itself and Unit 1 is untouched
- it never overwrites an attribute, it only sets on widgets the plan named
- a widget with no check button is not a graded item and does not consume a
  number, so an explainer block cannot shift every id after it and file eight
  right answers as eight wrong ones
- the ids still have to exist in `course_manifest`. An id the server does not
  know is a 400 and nothing is written, so a page whose widget count drifts
  fails loudly instead of recording a wrong grade

**API, `scripts/seed-manifest.js`:** `CSA_UNIT234_GRADED` adds 96 + 48 + 85 cfu
rows and 12 + 6 + 17 quiz rows.

## Why the counts are trusted

They were produced by fetching each live page and counting `apcs-ex` blocks that
contain a check button, split on whether they sit inside `.apcsa-mastery`.
Running that exact method against the 15 Unit 1 pages reproduces the hand
counted `CSA_UNIT1_GRADED` table byte for byte, including 1.6 having no mastery
section and the 6 / 8 split across the unit. A method that reproduces the known
answer is the only reason to believe it on the unknown one.

## Evidence

- `npm run smoke:csawidgets` (new, 13 checks): the plan's naming, the plan and
  the manifest agreeing in both directions, Unit 1 untouched, and the mirror
  matching the deployed theme asset
- `npm run smoke:manifestprune` 56 passed, `smoke:denominators` 65 checks,
  `smoke:gradepath` 15 passed, `smoke:encoding` clean
- CI derives suites from `package.json`, so the new suite gates PRs with no
  workflow edit

## Order of operations

The manifest has to be live before the theme is, or the first student to click
gets a 400 and nothing recorded. API PR merges and deploys first, theme second.

## Still open

- 3.1, 3.3 and 3.4 are built-model pages and were already reporting. Nothing
  here touches them.
- The Judge0 code editors on Units 2-4 are not manifest items and still report
  nothing. Same rule as Unit 1: an editor becomes a graded item only once its
  page defines expected output and calls `APCS_reportAttempt`.
- No back-fill is possible. Work students did on these 35 pages before today was
  never sent anywhere and cannot be recovered.
