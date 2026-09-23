# CED Essential Knowledge codes visible on 8 live CSP exercise pages

Board 392, claim 336. Branch `claude/csp-ek-badge-removal`.

Found while investigating customer report `esc_75eed3a1756556a978585f39`
(morning triage, 2026-09-23), which became readable for the first time this
session once `ADMIN_READ_KEY` was added to the environment. `npm run morning`
surfaced two reports from the last day that the board digest workaround used
earlier today could not see.

## The two reports

**`esc_5901d1d5acf89a5900c84d2c`**, "this question looks wrong" on CSP Day 35
(lists as data abstraction, QOTD-style page). Traced the arithmetic by hand:
`data <- [5,10,15,20,25]`, `INSERT(data,3,12)`, `REMOVE(data,5)`,
`DISPLAY(data[4])`. AP CSP pseudocode indexes lists from 1, not 0. Working it
through: INSERT gives `[5,10,12,15,20,25]`, REMOVE(index 5, which is 20) gives
`[5,10,12,15,25]`, `data[4]` is 15. The page's own explanation reaches the
same answer and marks it correct. This reads like the classic 0-indexing
mistake, which the page's own "Watch Out!" box already warns against. Not a
bug. No board item, no fix.

**`esc_75eed3a1756556a978585f39`**, flagged on `ap-csp-topic-1-2-exercise-1`
with no text. Read the specific question the report tagged and the whole
page. The flagged content itself reads fine: internally consistent scenario,
a defensible correct answer, coherent feedback on all four options. But
reading the page turned up something the report did not name: every question
in the graded check carries a visible "EK CRD-2.C.5" style badge next to its
number.

## Why that matters

CLAUDE.md states the rule by name and gives its own history: "Never put CED
Essential Knowledge codes in front of students... The rebuilt Topic 1.1
lesson shipped with 218 of them in student-visible text before anyone
noticed." Traced to `lib/csp-exercise-pages.js:285`, which hardcoded
`<span class="ek">EK ${q.ek}</span>` into the graded-check markup for every
page it builds. 8 of the 70 pages this generator builds carry a graded check
(Topics 1.1 through 1.4, exercises 1 and 2); all 8 showed the badge, 5 to 8
times each depending on how many questions that page has.

## What changed

`lib/csp-exercise-pages.js`, two edits: the graded-check question template no
longer emits the `<span class="ek">` badge, and the now-dead `.ek` CSS rule
was removed from the shared stylesheet function. The `ek` field itself is
untouched in `seed/csp-exercise-checks/*.js`; this is a rendering change, not
a data change, and the existing check that every question cites an EK
(`scripts/verify-csp-exercise-checks.js`, `smoke/csp-exercise-pages.js`) still
passes because it reads the source data, not the markup.

No page body was touched live. Four Matrixify sheets, one per topic, are
built and validated in `imports/2026-09-23/`, with a runbook naming the
expected state after each step. Importing them is Tanner's action, same as
every other Shopify page change in this repo.

## Evidence

- `node scripts/verify-csp-ek-badge-live.js --before`: 8 of 8 graded pages
  show the badge live today, 5 to 8 times each.
- Parse-back: all 8 rows across the 4 sheets, read back with
  `lib/matrixify-body-edit.js`'s `parseCsv`, equal a fresh
  `renderExercise(handle, check).bodyHtml` call for that handle, byte for
  byte.
- `npm run smoke:csp-exercise-pages`: 53 passed, 0 failed, unchanged from
  before this edit.
- `npm run smoke:mutationleak`, `npm run smoke:encoding`: both clean.
- These were run by the session that made the change; under rule 4 they are
  evidence for a verifier, not a verification.

## Still open

- The two sample reports are not resolvable from this session:
  `ADMIN_READ_KEY` reads the report queue but `PATCH /api/assistant/reports/:id`
  needs the full `ADMIN_KEY`, which this environment does not have. Tanner
  (or a session with the full key) should mark `esc_5901d1d5...` resolved as
  not-a-bug and `esc_75eed3a1...` resolved once board 392 imports, or leave
  them for the next `npm run morning` pass once `ADMIN_KEY` is added.
- The `.ek` CSS rule stays, inert, on the 62 mirror-only pages until
  something else regenerates them. Not part of this item.
- Import is not done. Four sheets are built and validated; none have been
  imported.
