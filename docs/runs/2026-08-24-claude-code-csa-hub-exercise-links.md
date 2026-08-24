# CSA exercise status, and the tool that links them from the unit hubs

2026-08-24, Claude Code. Started as a status question ("are the AP CSA exercises
mapped out, do we need to build them, do we just need to connect them?") and
turned into a measurement plus one generator.

## The status, measured live

| | count | how |
|---|---|---|
| Exercises authored | **53 of 53** | `seed/csa-exercises/unit{1..4}.js`, 15 + 12 + 9 + 17 |
| Exercise pages live | **21 of 53** | Admin API, `handle:ap-csa-lesson*exercise*` returns 27 pages: 21 exercise-1 plus 6 exercise-2 |
| Exercise links on the four unit hubs | **0** | the stored bodies of all four hubs, read in full |
| Lesson pages that can report a grade | 18 of 53 | unchanged, `docs/csa-manifest-readiness.md` |

So the content is finished and the distribution is not. Units 2 and 3 have no
exercise page at all, Unit 4 has six of seventeen, and nothing links any of them
from a hub. The sandbox does not change this: exercises grade through
`/api/student/code-grade` into `code_test_cases`, which has been live since
2026-08-18, and the sandbox is the deliberately separate ungraded lane.

## Two live defects found while measuring

**The Unit 4 hub links six lesson pages that do not exist.** 4.6, 4.7, 4.13,
4.14, 4.15 and 4.17 were recontented against the real CED on 2026-08-20 and
republished under new handles. The hub still points at
`ap-csa-lesson-4-6-arrays-as-parameters-and-return-values` and its five
siblings, and a handle query confirms no page carries any of them. Six of
seventeen cards on that hub are 404s today, and have been for four days.

**The Unit 1 and Unit 2 hubs render `class="u1-cta">` as visible text.** The
opening `<div` was lost in an earlier edit, so the CTA block is unstyled and its
`</div>` closes the wrapper early. Confirmed in the storefront HTML, line 225 of
the Unit 1 body. Units 3 and 4 are sound; my first reading of this guessed all
four and the measurement says otherwise.

## What shipped

`lib/csa-hub-links.js` and `scripts/csa-hub-exercise-links.js`: take the stored
hub bodies plus the live handle set, add a Coding Exercises section, repair the
CTA block, relink dead lesson handles, emit one Matrixify sheet. Same posture as
`scripts/csp-games-hub-patch.js`, for the same reason: these are live pages this
repo is not the source of truth for, and hand-editing a body is how a page gets
truncated at a stray quote.

What it refuses: a rendered-page scrape, a body with no lesson rows, a second
patch over an already-patched body, an ambiguous anchor, a handle set that was
assumed rather than queried, a lesson number with two candidate pages, a body
that came out smaller than it went in, a link that disappeared, a div balance
that moved beyond what the insert and the repair account for, and any href to a
page the live set does not contain.

`npm run smoke:csahublinks`, 42 assertions, offline, auto-enrolled into
`.github/workflows/tests.yml`. The checker is proved to work by being handed bad
input rather than trusted to have the branch.

Two hub markup models are live and both are handled: Units 1, 2 and 4 use
`uN-lesson-card` grids, Unit 3 uses `uN-topic-row` rows. Parsing only the first
finds zero lessons on the Unit 3 hub, which is exactly the silent nothing the
refusals exist to catch.

## Evidence

Dry run against the four real hub bodies (fetched with
`scripts/live-pages-dump.js`, which needs no token):

```
u1 | lessons parsed: 15 | refused: rendered page, fetch the stored body
u2 | lessons parsed: 12 | refused: rendered page, fetch the stored body
u3 | lessons parsed:  9 | built, 0 problems
u4 | lessons parsed: 17 | built, 0 problems
```

53 of 53 lessons parsed across the four hubs. Unit 4 with the full live handle
set: 6 relinks, all six the expected ones, 12 exercise links attached, 22 chips
locked, 0 problems.

## Still open

- **Nothing has been pushed to Shopify.** The sheet needs the STORED bodies from
  the Admin API, which needs a token this session does not have. That import is
  the next action and it is a human one.
- The 32 missing exercise-1 pages. `POST /api/admin/csa-exercise-pages/publish`
  with `ADMIN_KEY`, and the test bank has to be seeded first or every submission
  404s. Whether the live bank already holds all 53 items could not be checked
  from here: `/api/admin/code-tests` is cookie-auth.
- The six Unit 4 card titles still name the old topics. The relink makes them
  work; it does not make them honest.
- The Unit 1 hub says Unit 3 has 14 lessons, the Unit 2 hub says 9. Nine is
  right.
- The accordion nav still covers Units 1 and 4 only, so Unit 2 and Unit 3 lesson
  pages have no sideways route even once the hubs link exercises.
