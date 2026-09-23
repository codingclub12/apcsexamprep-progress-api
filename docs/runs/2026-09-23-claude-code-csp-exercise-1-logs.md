# CSP Exercise 1: the Part A logs for 2.3, 5.3 and 5.6

Date: 2026-09-23
Agent: Claude Code
Board: #397, following #393 (1.2, `docs/runs/2026-09-23-claude-code-csp-1-2-lunchdash-log.md`)

## What was wrong

Same defect as 1.2, on three more pages. Part B on each of these Exercise 1
pages points at rows of the handout's Part A log by number, and the page never
showed the log:

    2.3  "Row 5: the app re-ordered 1,400 songs..."
    5.3  "Row 5 was built by a solo developer", "the exact skew in Row 3"
    5.6  "Row 4 is convenience and danger", "Row 5: Jordan pressed delete"

All three are mirror-only, with no graded check, so nothing was being scored
against the missing table. A student working online still had prompts that
pointed at nothing.

## What changed

- `seed/csp-exercise-source.json`: a `log` on each of the three entries,
  extracted from the student handouts on the CDN
  (`AP-CSP_{2-3,5-3,5-6}_Exercise1_Student_k7q2m9.docx`). The extractor now
  finds the log by structure (the first table, with the two paragraphs before
  it and the one after) rather than by 1.2's heading. Before it touched a new
  page it was run on the 1.2 handout and reproduced the committed 1.2 log
  exactly, so it reads the documents the same way the first extraction did.
- Flattened to ASCII like 1.2, plus two characters 1.2 did not have: the
  accented e in "resume" (the repo already writes it that way) and the
  multiplication sign in "10x more audio".
- `lib/csp-exercise-stimulus.js`: the second column stays on one line only
  when it is the "Moment" column. These three logs put a name there
  ("AttendanceCast (skip-risk predictor)"), which has to wrap on a phone. 1.2's
  body is byte-identical to the step 5 sheet already handed over.
- `smoke/csp-exercise-stimulus.js`: `KNOWN_GAPS` is empty. Every page with a
  log is now held the way 1.2 is (log above Part B, rows 1 to 5, and every row
  its Part B cites actually on the page), plus the handout facts each Part B
  leans on. 57 assertions.
- `scripts/verify-csp-exercise-1-logs-live.js`: live before and after check.
- Three one-row sheets, steps 6 to 8 of `imports/2026-09-23/RUNBOOK.md`.

## Evidence

- suite: stimulus 57 passed; csp-exercise-pages, denominators,
  discoverability, unit-test-links, renderable-entities, encoding,
  mutationleak, volumepaths, storefront all green.
- exactly three of the 70 bodies change against `main`: the three pages.
- rederive: a second parse of each docx with plain regular expressions,
  compared cell by cell to the JSON. 30 of 30 cells match on each page.
- mutation: nine breaks, each red on its own rule. A log removed, a cited row
  dropped, rows reversed, a leaned-on cell reworded, a non-ASCII character left
  in, the one-line rule put back on every second column, the one-line rule
  taken off the Moment column, a healed gap re-listed, and a Part B prompt
  citing a row the log does not have.
- sheets: each parses back byte-identical to `renderExercise()`, one row, one
  log table, five rows, pure ASCII, preflight clear. md5
  2.3 624f09fa7ff82737ab93d993a577cfd6,
  5.3 f2dbba1dec16f2cd1c81769198c3b81a,
  5.6 33b8d0600ccf9cf38f2d3902717bf2ed.
- live, before: all three real pages (Part B present) show no log table. Each
  live body equals the generator's pre-change output apart from Shopify's
  normalisation and the inert `.ek` rule #392 dropped, so the sheets revert
  nothing. The verifier's after-mode passes on the sheet bodies and flags a
  page with a row missing.

## Still open

- Steps 6 to 8 are not imported. `verify-csp-exercise-1-logs-live.js` with no
  flag is the re-check afterwards.
- The 5.6 handout's own Part A questions print EK codes to students ("EK
  IOC-2.A.6"). That is the paper handout, not the page, since Part A is not
  mirrored. Noted, not changed.

## Learned

The 1.2 extraction was written against one document's heading. Making it find
the log by structure, and proving it on 1.2 before trusting it on the others,
is what let three new pages go through without anyone reading a table by hand.
