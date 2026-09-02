# The reporter gap: what the first pass got wrong, and the bigger thing underneath

Written 2026-09-01 from `GET /api/health`. **Substantially corrected 2026-09-02**
after checking the pages against the live storefront instead of grepping their
bodies. The correction is kept in place rather than rewritten away, because the
mistake is instructive and the original conclusion is still being quoted.

## Why this list exists

A page that marks work complete but never posts a score produces a gradebook cell
that used to render as a tick, which reads to a teacher as done and fine. Peter Vo
reported it as "my students' work shows Lesson and Ex1 and nothing after". It is
not recoverable: the number was never transmitted, so no read-time fix can invent
it. The only cure is the page reporting and the student resubmitting.

`/api/health` carries a `reporters` block naming these activities, so the next one
surfaces in under an hour instead of a week.

## THE CORRECTION: these pages are not missing a reporter

The first pass concluded that five pages had "no scoring at all" and two "score but
do not post", by counting occurrences of `apcseReportScore` and `earned` in the
fetched HTML. On that measure 103 of the 104 cyber activity pages look broken.

**That measure is wrong.** The reporter is not inlined per page. It is a theme
asset, and every single one of those pages loads it:

    <script src="/cdn/shop/t/7/assets/apcs-score-reporter.js?v=..." defer></script>

Checked on all nine pages in the original groups A and B plus the control. All ten
load it, all ten define `window.APCS_PAGE`, and all ten have `APCS_saveLessonScore`
available. Counting an inline function name measured whether a page had been
patched by hand, not whether it can report.

So the honest position on the original eleven records is: **the cause is not
established.** What was ruled out is "no reporter present".

### The repo's copy of that reporter is stale, and it is what misled the check

`shopify/apcs-score-reporter.js` is 8,317 bytes of readable source. The asset
actually served is 4,417 bytes minified and is a **materially different program**:
it gates on `ALLOWED_ACTIVITIES`, refuses to start unless `window.APCS_PAGE` names
an allowed activity, hands off through `window.APCS_saveLessonScore` rather than
posting directly, splits its score elements into RESULT and PROGRESS tiers, and
carries a 1500 ms settle timer and a visibility test. None of that is in the repo
copy.

The mirror carries no note saying it is a mirror. `apcs-tracker.js` has that rule
written down in CLAUDE.md; this file does not, and a stale copy that looks
canonical is worse than no copy.

## THE BIGGER THING: the storefront and the server disagree about Unit 3

Found while checking the above. This is a live defect, measured, not inferred.

The storefront sets `window.APCS_PAGE` from an inline snippet that derives the
lesson by arithmetic on the handle ordinals:

    m = h.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)-(exercise-1|exercise-2|lab|quiz)$/);
    if (m) p = { unit: 'unit-' + m[1], lesson: m[1] + '.' + m[2], activity: m[3] };

It never learned about the Fall 2026 CED renumbering. `utils.js`, the denominator
seed and `smoke/cyber-unit3-lessons.js` all did.

    ap-cyber-unit-3-lesson-1-*    theme says 3.1    server says 3.1a
    ap-cyber-unit-3-lesson-2-*    theme says 3.2    server says 3.1b
    ap-cyber-unit-3-lesson-3-*    theme says 3.3    server says 3.2
    ap-cyber-unit-3-lesson-4-*    theme says 3.4    server says 3.3
    ap-cyber-unit-3-lesson-5-*    theme says 3.5    server says 3.4
    ap-cyber-unit-3-lesson-6-*    theme says 3.6    server says 3.5

**All 24 Unit 3 activity pages. The other 80 cyber handles agree exactly.** Four of
them report the retired `3.6`, which is not a CED topic and has no gradebook column.

The header of `smoke/cyber-unit3-lessons.js` describes this failure precisely, and
was written to defend against it:

> Delete the map and the generic `unit.handleNumber` rule still returns a
> well-formed lesson for every Unit 3 handle: lesson-3 files under 3.3 while the
> page teaches 3.2. Nothing throws, no request fails, and a student's work lands
> on a lesson they never opened.

That is running in production. The suite pinned the server and nobody pinned the
storefront, so the two drifted apart in exactly the way the comment predicted.

Section 6 of that suite now pins the disagreement set at exactly those 24 handles.
A new disagreement fails the build; so does fixing the theme without emptying the
list. **It is green today and green is not good news here**, it means the defect is
still exactly as measured.

The fix belongs in the theme repo: use the same map, or read `data-lesson-id`,
which those pages already carry with the correct new values.

### This also revises the original record-to-page mapping

The first pass mapped the flagged record `3.3 exercise-2` to
`ap-cyber-unit-3-lesson-3-exercise-2`. Under the current numbering `3.3` is
`lesson-4`. Which page produced the record depends on which numbering was live when
it was written, and both pages exist and behave identically, so the mapping in the
original table should not be trusted for Unit 3.

## The eleven records, as they stand

| record | status |
|---|---|
| `ap-cybersecurity` unit-3 `3.1` exercise-1 | lesson id no longer exists in the course. Written under the retired numbering, which the theme still emits |
| `ap-cybersecurity` unit-3 `3.3` exercise-2 | ambiguous between `lesson-3` and `lesson-4`, see above |
| 5 other cyber records | cause not established, see the correction |
| `ap-csa 1.7 debug` | Judge0-backed. Off limits without an explicit instruction, per CLAUDE.md |
| `ap-csa 1.1 exercise-2` | no such page. 38 of 53 CSA lessons have an `exercise-2`; this is one of the 15 that do not |
| `ap-csa 1.2 exercise-3` | **no CSA `exercise-3` page exists anywhere**, in any unit |
| `ap-csa 1.5 exercise-3` | same |

Measured across the 1344-page sitemap: 53 `frq`, 53 `exercise-1`, 53 `debug`,
38 `exercise-2`, 0 `exercise-3`. Somebody authored `course_denominators` rows for
activities with no page, and something recorded completions against them. Both are
worth understanding before anyone builds a page to satisfy a row.

## What was deliberately NOT shipped

A per-page inline reporter, wired into the eight `exercise-2` pages that share a
keyword-scored rubric grader. It was written, verified and mutation tested before
the theme asset was discovered, and then deleted.

It would have worked, and it was still the wrong fix: a second reporter inlined on
eight pages, duplicating a deployed one that already covers 119 of 124 by design.
Two implementations of one rule is how they drift apart, which is the same argument
that kept the repeating-block detector out of the answer-key targets pass.

The cost of that detour was one turn. The cost of shipping it would have been two
reporters posting the same score under different item keys, which the gradebook
would have SUMMED into a denominator twice the real one.

## Where the fix ships

The storefront snippet and the theme assets are the theme repo. Per CLAUDE.md that
is out of scope here and reaches the storefront as a theme pull request against
`claude/site-linking-audit-yhufjk`, where merging is the deploy.

What belongs in this repo, and is now here, is the detector: the storefront cannot
quietly disagree with the server about a lesson id again without a build failing.

Do not reconstruct page bodies from a rendered fetch for a body update. The rendered
page includes theme-injected nav, popups and Klaviyo that are NOT in the source
body, so uploading one injects the nav into the page.
