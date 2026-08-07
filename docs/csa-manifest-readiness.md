# CSA manifest readiness, Units 2-4

Measured 2026-08-07 against the live Shopify pages via the Admin API. Every AP CSA
lesson page in Units 2, 3 and 4 was scanned, plus 1.3 as a Unit 1 control.

## The finding, and why nothing was seeded

**35 of the 53 CSA lessons cannot report a grade at all.** Their pages carry the
`apcs-ex` widget markup (74 to 122 occurrences each) but none of the attributes the
reporter needs: no `data-lesson-id`, no `data-item-id`, no `APCS_reportAttempt`, and
no `LESSON_DATA`.

`shopify/apcs-reporter.js` is explicit about this:

> Widgets WITHOUT `data-item-id` are ignored on purpose.

So the CSA gap is **not a counting problem**. Counting the widgets on those pages is
easy, and it would be actively harmful to act on. A `course_manifest` row IS a
denominator: seeding one for an item no page can report gives every student in that
unit points they cannot possibly earn. Twelve unearnable CFUs on a lesson caps the
class at 0 percent on that lesson, for a reason no teacher could see, and it would
land as a silent regrade of a live class.

`scripts/seed-manifest.js` already states the rule for exactly this case:

> Until then these rows stay out of the manifest so denominators are not deflated by
> items nobody can earn.

This document records the measurement so the work can be targeted, and deliberately
changes no seed data.

## What unblocks it

Injecting `data-lesson-id` and `data-item-id` into the Shopify page Body HTML. Per
CLAUDE.md that ships via Matrixify CSVs and is handled in the Claude chat project, not
in this repo. Once a unit's attributes are live, counting its widgets and seeding the
manifest is the same mechanical pass that produced CSA Unit 1 and the CSP
denominators, and it can be done in one sitting per unit.

The order to do them in is Unit 2, then Unit 4, then the six remaining Unit 3 lessons.
Unit 2 and Unit 4 are uniform old-model pages; Unit 3 is mid-migration to the built
model and is the one place where the two page models are mixed.

## Two page models, both legitimate

| model | how it reports | lessons |
|---|---|---|
| widget | `.apcs-ex[data-item-id]` plus a `.apcsa-mastery` section, one manifest row per widget, `APCS_reportAttempt` | all of Unit 1 |
| built | a `LESSON_DATA` block (`problems`, `mcqs`, `frq`, `game`) posted to the grade endpoint, one manifest row per activity | 3.1, 3.3, 3.4 |

Both are seeded and working. The built-model rows were verified against the live
`LESSON_DATA`: `problems` is an array of 8 (seeded as exercise-1 out of 10 points, six
1-point and two 2-point), `mcqs` is an array of 12 (quiz out of 12), plus the FRQ out
of 4 and the 6-round game. Those numbers still match the pages.

## Anomalies worth fixing upstream

**4.4 is half-attributed.** `ap-csa-lesson-4-4-traversing-arrays` carries
`data-lesson-id="4.4"` but zero `data-item-id` attributes. It is the only page in this
state. The wrapper attribute landed and the per-item pass did not, so the page looks
instrumented and still reports nothing.

**Three lessons have two pages each.** Seeding from the wrong one would denominate
against a page students are not being sent to, so the live one has to be confirmed
before either is counted:

| lesson | handles |
|---|---|
| 2.9 | `ap-csa-lesson-2-9-implementing-algorithms`, `ap-csa-lesson-2-9-implementing-selection-iteration-algorithms` |
| 2.10 | `ap-csa-lesson-2-10-string-algorithms`, `ap-csa-lesson-2-10-implementing-string-algorithms` |
| 2.12 | `ap-csa-lesson-2-12-run-time-analysis`, `ap-csa-lesson-2-12-informal-run-time-analysis` |

In each pair the two pages differ in size (122 vs 98 `apcs-ex` occurrences), so they
are not copies and the counts would genuinely differ.

## Per lesson

### unit-1

| lesson | pages | `data-lesson-id` | `data-item-id` | `LESSON_DATA` | verdict |
|---|---|---|---|---|---|
| 1.3 | 1 | yes | 10 | no | reports |

### unit-2

| lesson | pages | `data-lesson-id` | `data-item-id` | `LESSON_DATA` | verdict |
|---|---|---|---|---|---|
| 2.1 | 1 | no | **0** | no | **silent** |
| 2.2 | 1 | no | **0** | no | **silent** |
| 2.3 | 1 | no | **0** | no | **silent** |
| 2.4 | 1 | no | **0** | no | **silent** |
| 2.5 | 1 | no | **0** | no | **silent** |
| 2.6 | 1 | no | **0** | no | **silent** |
| 2.7 | 1 | no | **0** | no | **silent** |
| 2.8 | 1 | no | **0** | no | **silent** |
| 2.9 | 2 | no | **0** | no | **silent** |
| 2.10 | 2 | no | **0** | no | **silent** |
| 2.11 | 1 | no | **0** | no | **silent** |
| 2.12 | 2 | no | **0** | no | **silent** |

### unit-3

| lesson | pages | `data-lesson-id` | `data-item-id` | `LESSON_DATA` | verdict |
|---|---|---|---|---|---|
| 3.1 | 1 | no | **0** | yes | reports (built) |
| 3.2 | 1 | no | **0** | no | **silent** |
| 3.3 | 1 | no | **0** | yes | reports (built) |
| 3.4 | 1 | no | **0** | yes | reports (built) |
| 3.5 | 1 | no | **0** | no | **silent** |
| 3.6 | 1 | no | **0** | no | **silent** |
| 3.7 | 1 | no | **0** | no | **silent** |
| 3.8 | 1 | no | **0** | no | **silent** |
| 3.9 | 1 | no | **0** | no | **silent** |

### unit-4

| lesson | pages | `data-lesson-id` | `data-item-id` | `LESSON_DATA` | verdict |
|---|---|---|---|---|---|
| 4.1 | 1 | no | **0** | no | **silent** |
| 4.2 | 1 | no | **0** | no | **silent** |
| 4.3 | 1 | no | **0** | no | **silent** |
| 4.4 | 1 | yes | **0** | no | **silent** |
| 4.5 | 1 | no | **0** | no | **silent** |
| 4.6 | 1 | no | **0** | no | **silent** |
| 4.7 | 1 | no | **0** | no | **silent** |
| 4.8 | 1 | no | **0** | no | **silent** |
| 4.9 | 1 | no | **0** | no | **silent** |
| 4.10 | 1 | no | **0** | no | **silent** |
| 4.11 | 1 | no | **0** | no | **silent** |
| 4.12 | 1 | no | **0** | no | **silent** |
| 4.13 | 1 | no | **0** | no | **silent** |
| 4.14 | 1 | no | **0** | no | **silent** |
| 4.15 | 1 | no | **0** | no | **silent** |
| 4.16 | 1 | no | **0** | no | **silent** |
| 4.17 | 1 | no | **0** | no | **silent** |

## How this was measured

For each page body, via the Shopify Admin API:

- `data-lesson-id="..."` present on any element
- distinct `data-item-id="..."` values, split into `-cfu-`, `-quiz`, `-code-`
- `APCS_reportAttempt` referenced anywhere in the body
- `LESSON_DATA` present (the built-lesson model)

A lesson counts as reporting only if it has item ids under the widget model, or a
`LESSON_DATA` block under the built model. Presence of `apcs-ex` markup alone is not
enough and is precisely the trap this scan exists to avoid: the widgets are visible on
the page and gradeable to a student's eye, while the reporter ignores every one of
them.

Re-run this scan after each Matrixify push. It turns "are the attributes live yet"
into a measurement instead of an assumption, which is the same discipline the CSP
denominators were authored under.
