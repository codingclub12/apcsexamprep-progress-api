# The reporter gap: eleven records, four different problems

Generated 2026-09-01 from `GET /api/health` on commit `e9b8153`, then checked
page by page against the live storefront. Every claim here was measured, not
inferred from the board.

## Why this list exists

A page that marks work complete but never posts a score produces a gradebook
cell that used to render as a tick, which reads to a teacher as done and fine.
Peter Vo reported it as "my students' work shows Lesson and Ex1 and nothing
after". It is not recoverable: the number was never transmitted, so no read-time
fix can invent it. The only cure is the page reporting and the student
resubmitting.

`/api/health` now carries a `reporters` block naming these activities, so the
next one surfaces in under an hour instead of a week.

## How to tell a fixed page from a broken one

The working control is `ap-cyber-unit-1-lesson-1-exercise-1`:

    apcseReportScore   2 occurrences
    earned             5 occurrences

Its reporter, which is the shape the broken pages need:

    function apcseReportScore(earned, possible){
        if (earned == null || possible == null || !(possible > 0)) return;
        ...
        earned: Number(earned), possible: Number(possible),
        client_event_id: '1.1:exercise-1:redflags:' + earned + ':' + possible
    }

`client_event_id` is the idempotency key. It is what stops a page load posting a
duplicate or a false zero, which is a defect this codebase has already had.

## GROUP A. Five cyber pages with no scoring at all

`apcseReportScore` 0, `earned` 0, completion tracker present. The student
finishes, the page says done, nothing is scored.

| page | activity |
|---|---|
| `ap-cyber-unit-3-lesson-1-exercise-1` | 3.1 exercise-1 |
| `ap-cyber-unit-4-lesson-2-exercise-1` | 4.2 exercise-1 |
| `ap-cyber-unit-4-lesson-3-exercise-1` | 4.3 exercise-1 |
| `ap-cyber-unit-5-lesson-1-exercise-1` | 5.1 exercise-1 |
| `ap-cyber-unit-5-lesson-1-lab`        | 5.1 lab        |

Needs the full reporter plus a grading path that produces the pair.

## GROUP B. Two cyber pages that score but do not post

`apcseReportScore` 0, but `earned` appears 6 and 7 times, so scoring logic is
present and its result never leaves the page.

| page | activity | `earned` occurrences |
|---|---|---|
| `ap-cyber-unit-2-lesson-4-exercise-2` | 2.4 exercise-2 | 7 |
| `ap-cyber-unit-3-lesson-3-exercise-2` | 3.3 exercise-2 | 6 |

Smaller fix than group A: wire the existing computation to the post.

## GROUP C. One CSA debug page with neither tracker nor reporter

`ap-csa-lesson-1-7-api-libraries-debug`, native activity `debug`.
`apcseReportScore` 0 AND `saveLessonScore` 0, so it does not even mark
completion by the standard path, yet a completion was recorded for it.

These are Judge0-backed program exercises, so the scoring path differs from an
MCQ page. Do NOT assume the group A fix applies. Judge0 is also off limits
without an explicit instruction, per CLAUDE.md.

## GROUP D. Three CSA records whose page does not exist

Not a reporter problem. There is no page to fix.

| record | status |
|---|---|
| `ap-csa 1.1 exercise-2` | no such page. 38 of 53 CSA lessons have an `exercise-2`; this is one of the 15 that do not |
| `ap-csa 1.2 exercise-3` | **no CSA `exercise-3` page exists anywhere**, in any unit |
| `ap-csa 1.5 exercise-3` | same |

Measured across the 1344-page sitemap: 53 `frq`, 53 `exercise-1`, 53 `debug`,
38 `exercise-2`, 0 `exercise-3`.

Two things follow. Somebody authored `course_denominators` rows for activities
that have no page, which is why they are graded and therefore flagged. And
something recorded a completion against them. Both are worth understanding
before anyone builds a page to satisfy a row.

This is also a stated limit of the health check itself: it flags
authored-and-completed-and-unscored, which is the signature of a broken page but
also the signature of a denominator authored for a page nobody built.

## Scale, stated honestly

Every activity above shows `completions: 1`. That is small because units 2 to 5
are barely into the school year, not because the problem is small. It climbs
every day these stay unwired, and each increment is a student's graded work that
cannot be recovered.

## Where the fix ships

Groups A, B and C are Shopify page Body HTML. Per CLAUDE.md that is out of scope
for this repo and ships as a Matrixify sheet from the chat project. Group D is a
data and authoring question, not a page change.

Do not reconstruct these bodies from a rendered page fetch. The rendered page
includes theme-injected nav, popups and Klaviyo that are NOT in the source body,
so uploading one would inject the nav into the page.
