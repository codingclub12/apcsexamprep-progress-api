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
- **`INTRO_JAVA_PAGES_LIVE` is still `false`** in `scripts/seed-manifest.js`.
  It must flip in the same pass that imports the pages, then the seed runs with
  `--update`. Flipping it early puts earnable-looking points in every denominator
  that nobody can reach.
- **The reporter is not deployed.** It has to land in the theme repo at
  `assets/intro-java-reporter.js` and be included on intro-java page templates.
  Until then the buttons are still inert. `shopify/` here is a mirror.
- **Nav.** The course hub is not linked from the main menu.
- **Not built, previously flagged:** Judge0 test cases for the code band, and the
  six project pages.

## Not verifiable from here

No live check was possible: this container's network policy returns 403 for
`progress.apcsexamprep.com`, confirmed against the proxy status endpoint. Every
number above is from local runs against a local SQLite file.
