# CSP topic 1.1 exercise pages: published, and the reporter was not loading on them

2026-08-21, Claude Code.

Follow-on to `docs/runs/2026-08-18-claude-code-csp-exercise-mirror-pilot.md`, which
built the two topic 1.1 pages and deliberately imported nothing. This run imported
them.

## What is live

Both pages exist on the storefront for the first time, created through the Shopify
Admin API rather than a Matrixify sheet, since it is two pages:

| Handle | Page ID | HTTP before | HTTP after |
|---|---|---|---|
| ap-csp-topic-1-1-exercise-1 | 137680879831 | 404 | 200 |
| ap-csp-topic-1-1-exercise-2 | 137681010903 | 404 | 200 |

Two of the 70 dead URLs printed inside the Teacher Course Bundle handouts now
resolve. The other 68 still 404.

Verified by fetching each live page and diffing its body against the local render
from `lib/csp-exercise-pages.js`. Both are identical once Shopify's own sanitizer
is accounted for: it decodes `&middot;` to the literal character and inserts a
newline before a closing tag that follows a `span`. No content difference of any
kind. Exercise 1 carries 5 graded items and 3 writing boxes, exercise 2 carries 5
and 12, which matches the renderer.

SEO title and description are set through the `global` metafields and both render
in the live `head`.

## The thing that would have made this a silent failure

`snippets/apcs-csp-reporter.liquid` in the theme loads `ap-csp-reporter.js` only
when the page handle contains `ap-csp-course-bi`. The exercise handles are
`ap-csp-topic-{U}-{L}-exercise-{N}`, so **the reporter was not on these pages at
all**. Confirmed by fetching the live page and listing its script tags: the lesson
page loads the reporter, the exercise page loaded nothing.

The page would have looked completely fine. The graded check scores, paints the
feedback, updates the score bar, and dispatches `apcsActivity` into a document
where nothing is listening. Every student answer would have gone nowhere, and the
gradebook column would have stayed empty with no error anywhere to explain it.

The pilot run note reports a browser test against the deployed reporter on both of
these pages. That test cannot have been running through this handle gate. Whatever
it exercised, the gate is what the storefront does, and it did not include these
pages.

Fixed in the theme repo on branch `claude/ap-csp-topic-1-1-exercise-1-hdt5l8`: the
snippet now also loads on a handle containing both `ap-csp-topic-` and
`-exercise-`. The reporter's v2 event handling already understands the
`{activity, item, correct}` shape these pages dispatch, and it self-gates on the
`.lesson-page[data-course="ap-csp"]` wrapper and on `apcse_token`, so anonymous
traffic is unaffected. **That PR is not merged. Until it is, both live pages grade
into nothing.**

## Denominators, and a collision that is now on the record

`scripts/seed-csp-denominators.js` seeds `collaboration|exercise-1` at 5, derived
from the renderer rather than scanned off the page, so the denominator and the
number of graded items cannot drift. It rides the existing boot seed, insert or
ignore, so it lands on the next deploy and re-running is a no-op.

`collaboration|exercise-2` is deliberately NOT seeded, and the reason is worth
keeping:

- The table is keyed `(lesson, activity_type)`, one row per pair.
- All 35 slugs in `seed/csp-exercise-2` are also mirror-page slugs. So
  `collaboration|exercise-2` is claimed by topic 1.1's live mirror page AND by the
  gated whole-run practice game from `lib/csp-course-pages.js`.
- Seeding it would price one activity with the other's count the moment that
  import lands.

The same shape waits in Big Idea 3: those topics already carry a scanned
`exercise-1` worth 8 from the coding-practice pages, so a Big Idea 3 mirror page
collides too. Topic 1.1 is Big Idea 1 and collides with nothing, which is the only
reason it could be priced today.

Left unpriced means the column still scores; it falls back to the count the page
paints, exactly as it did before today. Nothing regressed. But scaling the mirror
pages past Big Idea 1 needs the mirror activity to get its own `activity_type` in
the `COURSES` config and the renderer first. That is a contract change and it is a
decision, not a seed edit.

`smoke/csp-denominators.js` now asserts both halves: the one mirror row that is
priced, and that no `exercise-2` is priced at all. The existing gate assertion in
`smoke/csp-course-pages.js` is untouched and still passes.

## Still open

1. **The theme PR gates everything.** Unmerged, the pages are a worksheet mirror
   with a decorative score bar.
2. **Handle routing.** `ap-csp-topic-{U}-{L}-exercise-{N}` still does not match
   `pageFromHandle` in `utils.js`, so these pages record no VISIT. Grading is
   unaffected because the page dispatches course, unit and lesson explicitly.
   Carried forward from the pilot, unchanged.
3. **Score bar resets on reload.** Answers already posted; the bar reads 0
   answered after a refresh. Carried forward from the pilot, unchanged.
4. **68 URLs still 404.** 69 exercises still need check questions, and the two
   activity_type collisions above have to be settled before the mirror pages can
   go past Big Idea 1.
5. **The bundle CDN exposure** flagged as urgent in the pilot note is untouched
   here and still open.

## Deliberate non-actions

- Did not merge the theme PR. The theme repo has no CI, so merging is deploying
  to the live storefront.
- Did not widen the denominator seed past exercise-1, which would have made the
  collision above invisible instead of documented.
- Did not add the handle pattern to `pageFromHandle`. It is additive and safe, and
  it is a different change from publishing these two pages.
