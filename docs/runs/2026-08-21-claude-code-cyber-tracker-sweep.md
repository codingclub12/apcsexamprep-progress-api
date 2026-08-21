# Cyber tracker sweep: 13 of 104 pages mis-score, in two different ways

Date: 2026-08-21
Agent: Claude Code (progress-api)
Ledger: task 104, claim 11. Corrects task 102 / PR #256. Related: task 83.
Scanner: `node scripts/scan-tracker-score-risk.js`

## Why this ran

PR #256 diagnosed the teacher report on Cyber 1.2 and flagged that the blast
radius was probably wider than the two pages reported. This is that sweep. It
found the wider problem, and it also **corrected the 1.2 diagnosis itself**.

## The correction first

PR #256 concluded that 1.2 Exercise 1 and 2 store a fabricated `0`. That was
wrong at the last step. They store **nothing**.

`trackActivityCompletion` waits for every `.check-btn` to be disabled:

```js
var total = document.querySelectorAll('.check-btn').length;
...
if (btns[i].disabled) answered++;
if (answered >= total) markComplete(activityScorePct(total));
```

Both 1.2 pages carry three real `<button class="check-btn">` **and two
`<a class="check-btn">` nav links** ("Back to Lesson 1.2", "Continue to Exercise
2"). `total` is 5. An `<a>` has no `disabled` property, and the page's own
`disableSection` is scoped to its part sections, so the anchors are never
touched. `answered` tops out at 3. `3 >= 5` is never true, so `markComplete`
never fires and nothing is posted but the initial `completed: false` visit.

The teacher's own words were the accurate ones: it does not show up.

Why the first pass got it wrong: it verified every step of the chain up to
`activityScorePct` and then reasoned about what that function returns, without
checking whether the call site is ever reached. The score function's behaviour
was correctly described; it is simply never invoked on those pages.

## Method

104 live pages, every handle the theme wiring sets `APCS_PAGE` for, minus
quizzes (separate tracker branch, never reaches this code) and unit exams
(deliberately unwired). Rendered storefront HTML, because completion is decided
against the real DOM including theme-injected nav, which the Shopify page body
does not contain.

Classification per page:

| verdict | condition | consequence |
|---|---|---|
| `FABRICATED_ZERO` | has `.check-btn`, all disable-able, no `#score-display` and no `.answered-correct` | posts `completed: true, score: 0` |
| `NEVER_COMPLETES` | has an `<a class="check-btn">` inflating `total` | posts nothing but the visit |
| `OK_SCORED` | has a score UI | posts a real percent |
| `SAFE_READING` | no `.check-btn` at all | `markComplete(null)`, done and ungraded |

### The false-positive trap, recorded because it bit this scan

The first run used a `\bcheck-btn\b` regex and reported **20** at-risk pages.
Twelve of those style their buttons `l-check-btn`. `querySelectorAll('.check-btn')`
does not match that, because CSS matches whole class tokens, but the regex does,
since `-` is a word boundary. Those pages take the reading path and are safe.
The scanner now splits class attributes on whitespace and compares tokens.

Two mechanics were then verified by hand rather than assumed:
- Every `FABRICATED_ZERO` page really does disable all of its check buttons, so
  completion really does fire. Two labs do it through an
  `[onclick="checkAlert(n)"]` attribute selector rather than a class selector,
  which a class-only check would have missed.
- `OK_SCORED` pages write `score + ' / ' + answeredCount` into `#score-display`,
  and `activityScorePct` divides the first number by the question count, so the
  percent is right.

## Results

**13 of 104 pages mis-score. All 13 are in Unit 1.**

### Stores a hard zero nobody earned (9 pages)

    1.3 exercise-1, exercise-2, lab
    1.4 exercise-1, exercise-2, lab
    1.5 exercise-1, exercise-2, lab

These have real data to clear once fixed. A student at full marks is stored at 0
and it counts against the class average.

### Never completes, records nothing (4 pages)

    1.1 lab
    1.2 exercise-1, exercise-2, lab

Nothing to clear. The activity simply never registers.

### Working (22 pages)

All of Unit 2 and Unit 3's graded exercise-1 and lab pages. They carry a score
bar the tracker can read, and post a real percent.

### Reading path, completes ungraded (69 pages)

Includes every graded-looking page in Units 4 and 5, and all lesson landings.
No `.check-btn` at all, so they complete with `null`: done, ungraded. That is
honest rather than wrong, but it does mean **no Unit 4 or Unit 5 exercise or lab
carries a score today**. That is a coverage gap, and it is consistent with those
columns being unpriced in `course_denominators`.

## The two defects

1. **`activityScorePct` returns `0` where it should return `null`.** It cannot
   tell "the student scored zero" from "this page exposes no score in either
   shape I know", and it answers with the one that destroys grades.
   `markComplete` already handles `null` by posting completion alone.

2. **The completion threshold counts elements that can never satisfy it.**
   Counting `.check-btn` nodes that have no `disabled` property makes an
   activity permanently unfinishable. Count only elements that can carry a
   `disabled` state, and stop styling nav links with the class the grader counts.

Defect 2 is the one that hit the teacher. Defect 1 is the one that is quietly
corrupting nine other pages right now.

## Where the fixes live

The theme repo, both of them: `assets/apcs-tracker.js` for the scraper and the
threshold, and the page bodies for the nav-link class and the missing reporters.
Nothing in this repo changes behaviour.

Order:
1. Fix `activityScorePct` to return `null`. Stops new fabricated zeroes.
2. Fix the completion threshold. Unblocks the four stuck pages.
3. Clear the existing `score: 0` rows on the nine pages. A corrected page cannot
   overwrite them, because with a `null` score it no longer posts a score at all.
4. Then reporters and denominators, per PR #256.

Re-run `node scripts/scan-tracker-score-risk.js` after each theme deploy. It
exits non-zero while any page still mis-scores.

## Not verified

The students' stored rows. This session holds only `COMMAND_READ_TOKEN` and
`TODO_KEY`, neither of which reads a gradebook. Every finding here is derived
from live page markup and the live deployed tracker asset. Step 3 above needs
someone with gradebook access to confirm the row counts before clearing.
