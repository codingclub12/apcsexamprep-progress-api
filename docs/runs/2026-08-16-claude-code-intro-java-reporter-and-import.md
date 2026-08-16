# Intro to Java: the reporter, the choice grader, and the import sheet

Date: 2026-08-16
Agent: Claude Code (progress-api)
Branch: `claude/java-ap-csa-greenfoot-cgtph7`

## What this pass was for

The course content was finished and tested. Two things stood between it and a
working course, and both were discovered by asking what actually happens when a
student clicks a button rather than by reading a checklist:

1. **Nothing graded the multiple choice.** The gap exercise had a server-side
   grader and a route. Concept checks and quizzes had neither, and could not
   have a client-side one: intro-java pages deliberately do not ship the answer
   key, so a browser has no way to work out a score. 84 concept-check buttons
   and 42 quiz buttons were inert.
2. **No import sheet existed.** Ninety pages of finished HTML lived in this repo
   with no way to reach the store.

## What changed

### `lib/choice-grader.js` and `POST /api/progress/choice`

Server-side scoring for concept checks and quizzes, keyed off the bank. Each
concept check is its own manifest item with one question; a quiz is one item with
one point per question, so a thirty-student class finishing a five-question quiz
is thirty inserts and not a hundred and fifty.

The selection IS stored here, unlike the gap grader, and the difference is
deliberate: an option index is a number chosen from a fixed list, not free text.
It is also the thing that lets a teacher see eleven students picking the same
wrong option, which is a fact about the question and not about the students.
Detail is the documented `[{"q":1,"sel":2,"ok":true}]` shape.

The response tells a student which questions were wrong and never which option
was right. Returning the answer would turn every concept check into a reveal
button and make retrying pointless.

### `shopify/intro-java-reporter.js`

The browser side. Binds `check-cfu`, `check-gap` and `submit-quiz` through one
delegated listener, sends selections, and renders the mark the server returns. It
never grades anything locally and cannot, because it holds no key.

A failed submission is reported visibly rather than swallowed. Silently dropping
one is how a student does the work twice and a teacher still sees an empty
gradebook.

### A defect found while writing the test

The renderer emitted one `.ij-feedback` per question and none at section level,
so the reporter's `section.querySelector('.ij-feedback')` resolved to question
one's paragraph. The quiz total would have been written on top of question one's
own mark and erased it. Fixed by giving each interactive section its own
`.ij-summary` slot outside the question list; `smoke/intro-java-reporter.js`
sections 1.13 to 1.15 pin both slots so it cannot come back.

### `lib/intro-java-build.js`

The ninety-page assembly, in one place. It had been written inside the content
smoke test, and the import script needed exactly the same ninety. A second copy
is the shape of thing where the suite proves one page correct and the importer
ships a slightly different one, built from the same renderer with different
neighbours, and no check can see the difference. Both callers now ask this.

### `scripts/intro-java-pages-csv.js`

The Matrixify sheet. MERGE mode, QUOTE_ALL, utf-8-sig, `Published At` past-dated
to a fixed literal, and a Body HTML cell that is never empty.

Its safety model is the INVERSE of `scripts/page-body-csv.js`. That script
updates pages that exist and aborts on a handle it cannot find live. These ninety
do not exist yet, so the dangerous direction is reversed: with `--live` this one
aborts on any handle that ALREADY exists, because a match there would replace a
page nobody meant to touch.

Nothing is written if any page fails a check. A partial sheet is worse than no
sheet, because the failure is then invisible at import time.

## Evidence

```
npm run smoke:introjava    3587 passed, 0 failed
npm run smoke:ijreporter     81 passed, 0 failed
npm run smoke:ijcsv          22 passed, 0 failed
npm run smoke:gapgrade       37 passed, 0 failed
npm run smoke:greenfoot      36 passed, 0 failed
npm run smoke:manifestprune  56 passed, 0 failed
npm run smoke:hazards       149 passed, 0 failed
npm run smoke:denominators   65 passed, 0 failed
npm run smoke:scoreentry     47 passed, 0 failed
npm run smoke:attemptretry   29 passed, 0 failed
npm run smoke:contract       42 passed, 0 failed
```

Sheet as generated: 90 rows, 1453 KB, 1380 KB of body HTML. Every body parsed
back out of the CSV with an RFC 4180 reader and compared byte for byte against
the renderer, which is the check the sheet has nothing else to catch it with.

`smoke/intro-java-reporter.js` is the one worth reading. It reads the selectors
and attributes out of the reporter SOURCE rather than retyping them, and checks
each against markup the renderer actually produced, in both directions: a class
the reporter binds must exist on a page, and a `data-role` a page emits must be
handled by the reporter. The second direction is the one that catches a widget
added to the renderer that nobody wired up.

## What is still open

- **Screenshots: 0 of 158 taken.** Pages render an "On your screen" instruction
  in place of each missing image, so this does not block the import. Each shot
  added is one line in `seed/intro-java-shots.js`.
- ~~`INTRO_JAVA_PAGES_LIVE` is still `false`~~ **Done later the same day.** See
  the closing section.
- ~~The reporter is not deployed.~~ **Done later the same day**, theme PR #47.
- **Nav.** The course hub is not linked from the main menu.
- **Not built, previously flagged:** Judge0 test cases for the code band, and the
  six project pages.

## Not verifiable from here

No live check was possible: this container's network policy returns 403 for
`progress.apcsexamprep.com`, confirmed against the proxy status endpoint. Every
number above is from local runs against a local SQLite file.

---

## Follow-up in the same session: the import target, decided against live data

Before generating the sheet I pulled the store's full page list (728 pages) to
check for handle collisions. Two findings changed what the sheet contains.

### No collision, confirmed twice

`handle:intro-java*` returns nothing, and the operator was verified working
first by running `handle:ap-csa-frq*`, which returns matches. The full page
listing contains no handle beginning with `intro-java`. All 90 handles were free.

### The Java-errors cluster already exists

`ap-csa-java-errors-hub` plus 11 `java-errors-*-ap-csa` pages, updated
2026-06-18. Five of the ten new error help pages target the identical compiler
error. Two pages of ours on one head term means Google picks one, and it would
have picked the older, better-linked CSA page, burying the beginner version that
is the one a student in this course actually needs.

Tanner chose to differentiate rather than drop or duplicate. Those five are
retitled `Java error in Greenfoot: X` with Greenfoot-led SEO descriptions, so
they answer "greenfoot cannot find symbol" while the CSA pages keep
"java cannot find symbol ap csa". The other five have no competitor and keep
their shorter titles.

### The course hub takes over a legacy slug

`greenfoot-basics-beginner-greenfoot-projects-and-tutorials` has existed since
2025-09-15 carrying a library of Greenfoot project tutorials. Tanner's call was
to reuse its accumulated authority rather than start a new `intro-java` handle
from zero.

Reading the page first changed how that was done. It was not a thin page: 11
projects, 11 YouTube tutorial links and 7 Google Drive starter-file folders,
none of which existed anywhere in this repo. A Matrixify import replaces a body
rather than merging into it, so a straight overwrite would have destroyed all of
it and reported success.

So `seed/intro-java-projects-library.js` carries the projects into the repo and
the hub renders them as a section, filed under the unit whose material each one
uses. Same URL, same authority, nothing lost. Unit hubs keep the clean
`intro-java-unit-N` prefix: they are new pages with nothing to inherit, and
deriving them from the course handle would have produced
`greenfoot-basics-beginner-greenfoot-projects-and-tutorials-unit-1`.

Three broken links were found on that page while reading it, and the rebuild
fixes all three:

| Link | Status |
|---|---|
| `/pages/ap-computer-science-a`, in the breadcrumb AND the primary CTA button | 404, real handle is `ap-csa` |
| `/pages/ap-csa-study-guide` | 404, real handle is `ap-csa-study-guides` |
| `/pages/ap-csa-frq-solutions` | 404, real is `ap-csa-frq-archive` |

Its main call to action had been dead for some time.

### The takeover is the sheet's most dangerous row, so it is fenced

`scripts/intro-java-pages-csv.js` aborts on any handle that already exists live.
The course hub now needs to collide on purpose, so it is named in an `INHERITED`
map. Being on that list is the only way to collide, and it costs two extra
requirements:

1. A rollback snapshot must exist at
   `shopify/page-snapshots/<handle>.before-intro-java.html` before the sheet
   will write at all. Shopify keeps no version history for page bodies, so that
   file is the only way back from a replacement Matrixify reports as a success.
2. The takeover and its title change are printed on every run. A rename nobody
   noticed is how a link in somebody's syllabus quietly starts pointing at a
   differently named thing.

`scripts/snapshot-live-page.js` writes that snapshot byte for byte out of a raw
Admin API response. It never retypes or reconstructs a body, because a snapshot
that is almost right is worse than none: a rollback would restore something
subtly different and nobody would know.

## Evidence, second pass

```
npm run smoke:introjava     3587 passed, 0 failed
npm run smoke:ijreporter      81 passed, 0 failed
npm run smoke:ijcsv           37 passed, 0 failed
npm run smoke:gapgrade        37 passed, 0 failed
npm run smoke:greenfoot       36 passed, 0 failed
npm run smoke:manifestprune   56 passed, 0 failed
npm run smoke:hazards        149 passed, 0 failed
npm run smoke:encoding        13 passed, 0 failed
npm run smoke:pages            9 passed, 0 failed
npm run smoke:denominators    65 passed, 0 failed
```

Hub renders 11 projects, 11 video links and 7 Drive links, one h1. Sheet is 90
rows and 1471 KB.

## The blocker, stated plainly

**The sheet cannot be generated right now, and that is the guard working.** The
rollback snapshot for the takeover page does not exist, so the generator refuses.
`smoke/intro-java-pages-csv.js` check 1.0 asserts that is still true, so the day
somebody commits a real snapshot the suite says so.

Producing it needs one Admin API read, which this container cannot make: the
network policy returns 403 for the store, and the read was done through an MCP
client that cannot write to disk here.

```
# whoever has API access:
#   query { pages(first: 5, query: "handle:greenfoot-basics-beginner-greenfoot-projects-and-tutorials") {
#     nodes { id handle title updatedAt body } } }
node scripts/snapshot-live-page.js pages.json     # writes the snapshot
git add shopify/page-snapshots/ && git commit
node scripts/intro-java-pages-csv.js pages.csv --live pages.json
```


---

## Closing status, end of 2026-08-16

Everything below was verified against the live Shopify Admin API or the theme
repo, not against this repo's own output.

### Shipped

| Piece | State |
|---|---|
| 90 pages | Live. Imported, then re-imported twice for the link and FAQ fixes |
| `POST /api/progress/choice` | Deployed, Railway boot confirmed |
| Manifest gate | Open. 318 intro-java rows, 476 graded points |
| Reporter | Live. Theme `main` `1b1f142`, deploys via Shopify GitHub sync |
| Visit tracking | Fixed in the same theme PR. See below |

### The visit gate, which is the finding worth remembering

The sitewide track block in `layout/theme.liquid` read:

```js
if (!/^ap-/.test(seg)) return;
```

Every course handle starts `ap-` except this one, whose lessons are
`intro-java-lesson-{U}-{L}-{slug}`. So no intro-java page had ever recorded a
visit, while `course_manifest` carried 42 intro-java visit rows as denominators.

Two things about how that was found are worth keeping. First, it was found by
reading the theme to answer a different question ("how do I ship the reporter"),
not by any check. Second, the sequencing was wrong: the manifest gate was opened
after verifying the GRADED items were reachable in both directions, and the
visit path was never checked. The rows predate this session, but the commit that
opened the gate asserted the live pages made them correct, and for visits that
was not true until theme PR #47.

The general shape: a denominator nothing can post to fails silently at both
ends. No error in the theme, no error in the API, and the only symptom is a
class marked down for a reason no teacher can see.

### Still open

- **Screenshots: 0 of 158.** Missing shots render as "On your screen"
  instructions, so nothing is blocked. Each one added is a line in
  `seed/intro-java-shots.js`.
- **Nav.** The course hub is not linked from the main menu.
- **End-to-end proof.** Nobody has yet opened a lesson in a browser, answered a
  concept check, and seen the row land. Every check in both repos is static
  analysis or an Admin API read; storefront egress is blocked from the agent
  container, so this one is Tanner's to do.
- **Help index page.** The help breadcrumb dropped to two levels because
  `/pages/intro-java-help` was never built. Adding it would give 41 pages a
  parent and let the middle crumb come back.
- **Not built, previously flagged:** Judge0 test cases for the code band, and
  the six project pages.

### What no longer needs saying

Three defect classes now have permanent checks rather than a note here:
dangling internal links (11.5), generated FAQ question text (11.6), and the
reporter drifting from either the page renderer or its theme copy (1.5 to 1.23).
