# CSP Big Idea 3 exercise-2: the publish sheet, and what publishing it does not fix

Date: 2026-08-26
Agent: Claude Code
Ask: "publish the 18 course exercise-2 pages. Has this been done."

## Answer to the status question

No. The sheet had been generated during the Big Idea 3 unit-test link fix on
2026-08-25, recognised as a publish rather than the link update that was asked
for, and deleted unimported. Nothing was ever imported. This run regenerates it,
verifies it, and hands it over.

## What was produced

`scripts/csp-pages-csv.js --kind exercise-2 --unit bi-3`, 18 rows, 416 KB,
md5 `9d1683e767383acc197eaa569090fc3c`. No repo file changed; the sheet is
ephemeral and this note is the only commit.

Regenerated after `origin/main` moved f2795e6 to e4cda36 mid-run and confirmed
byte-identical, so the delivered file is current against that head.

## Evidence

Everything below was measured against the live storefront or the built bodies,
politely: single threaded, 1.5s floor, exponential backoff on 429 and 503, and a
five-strike abort. The ad-hoc loop that drew nine 429s on 2026-08-25 is the
reason that discipline is written into every probe script now.

**Nothing collides.** All 53 pages `lib/csp-course-pages.js` builds return 404:
35 exercise-2 across all five Big Ideas, 18 Big Idea 3 guided notes. For a
publish the dangerous direction inverts, because a handle that already resolves
would have the import replace a page nobody meant to touch. Zero do.

**Nothing it ships is broken.** The 18 bodies carry 21 distinct internal link
targets between them: the Big Idea 3 hub, both halves of the split unit test,
and each page's own parent lesson. All 21 return 200. Publishing a page whose
own links 404 is precisely what the nightly crawl exists to catch, so it was
checked before the sheet went out rather than at 4am tomorrow.

**The sheet survives the round trip.** 27 checks in
`/tmp/bi3/verify-publish.js`: RFC 4180 reparse with a real reader, all 18 bodies
byte for byte against what the builder rendered, BOM, CRLF, QUOTE_ALL, MERGE on
every row, a fixed past-dated `Published At`, no duplicate handles, no empty
body, and the encoding checks. The hazard is the one
`smoke/csp-exercise-pages.js` records: Matrixify reports success on a sheet it
silently truncated at the first stray quote.

**Grades will land in the right column.** All 18 handles route through
`pageFromHandle` to ap-csp / bi-3 / exercise-2 and to 18 distinct lessons, so no
two pages share a gradebook column. All three reporter resolution paths are
present in every body, and `ap-csp-reporter.js` was confirmed loading on live
CSP lesson pages including one with an `-exercise-2` suffix, so the suffix does
not break attachment.

## What was learned

**I asserted the wrong contract and got three confident failures on pages that
are correct.** The first verification pass required `data-item-id` and an
embedded `<script src>`. That is the CSA contract: `apcs-reporter.js` bound to
`.apcs-ex` widgets posting to the manifest-gated `/api/progress/attempt`. CSP is
a different path entirely, documented in `docs/csp-reporter-contract.md`: it
posts to `/api/student/score`, the reporter is theme-deployed rather than
page-embedded, and it resolves a page three ways. The pages use `data-item` and
`data-activity` on each `.mcq-item`.

This is the same inferred-not-measured mistake the widget-to-reporter matrix
already cost once, when guessing the mapping produced twelve confident wrong
P0s. Both times the fix was to read the contract or measure the live page rather
than extrapolate from the course I had looked at most recently. The corrected
assertions now test each of the three resolution paths by name, including the
trap the builder header calls out: the shared `checkMCQ` hardcodes
`activity:'quiz'`, which would file every answer under the lesson's quiz rollup
and corrupt a real grade.

**The site has two "exercise 2" naming schemes and only one of them fills the
exercise-2 column.** The live Big Idea 3 lesson pages link to
`/pages/ap-csp-topic-{N}-{M}-exercise-2`, which exists and returns 200. The
pages in this sheet are `/pages/ap-csp-course-bi3-{slug}-exercise-2`. They are
different URLs, and they do not collide: the topic-numbered handles route
through `pageFromHandle` as activity `lesson`, not `exercise-2`, and their
bodies are written-response draft pages rather than graded MCQ. So the builder's
2026-08-17 measurement still holds. Every CSP class has 35 exercise-2 gradebook
columns that nothing can currently fill, despite pages whose names suggest
otherwise. That naming overlap is worth knowing before someone reads
"exercise 2 already exists" off a page title and closes the wrong task.

**Board #91 does not reproduce on the surfaces checked.** The task reads "CSP
bundle links to exercise pages that do not exist - dead links inside a paid
product" and is `in_progress` with no artifact. Reading all 35 live CSP lesson
pages yielded 106 distinct `ap-csp-topic-*` link targets and every one returns
200. The AP CSP Teacher Superpack product page links 143 pages, none in the
exercise-2 or notes families. Not checked: PDFs, Drive documents, email, and any
page outside those 36. The claim here is bounded to what was measured, and this
sheet does not close #91 either way, because nothing currently links to the
handles it publishes.

## What is still open

**The 18 pages will be orphans, and this has happened before with this exact
page family.** No live page links to `ap-csp-course-bi3-{slug}-exercise-2`. The
things that do link to them are the 18 Big Idea 3 guided-notes pages, which are
also built and also 404. Publishing this sheet alone makes 18 pages reachable
only by direct URL. They fill 18 previously unfillable gradebook columns, which
is real value, but no student finds them by browsing.

`smoke/csp-exercise-discoverability.js` opens by recording the precedent: the 70
CSP exercise pages "went live on 2026-08-22 with zero inbound links anywhere on
the site", four days ago. The remedy already exists as two scripts, a student
route (`scripts/csp-lesson-exercise-links.js`, a managed block appended to all
35 lesson pages) and a teacher route
(`scripts/csp-command-center-exercises.js`). Both read `lib/csp-exercise-pages`
and neither mentions `exercise-2` even once, so they cover the 70 topic-scheme
pages and not these 18. The pattern to copy is there; it needs pointing at the
other builder. Doing that before the import means the pages are reachable the
day they land instead of four days later.

**The denominator gate cannot simply be flipped after this import.**
`scripts/seed-csp-denominators.js` gates exercise-2 behind a single
`CSP_EXERCISE_2_PAGES_LIVE` boolean covering all 35 banks. Flipping it after an
18-page import seeds all 35, and 17 of them would be columns reading 0 of 6 for
pages that are still 404. That is exactly the failure the flag was added to
prevent, at 17 instead of 35. Two ways out, both a decision rather than a patch:
publish the remaining 17 exercise-2 pages so the flag is correct as written, or
make the gate per lesson. Left for the human, because it is a scope call.

**Not flipped, not seeded, not verified.** The flag stays `false`, no
denominator was written, and `verified` is not this agent's to set. The import
itself is a human action.
