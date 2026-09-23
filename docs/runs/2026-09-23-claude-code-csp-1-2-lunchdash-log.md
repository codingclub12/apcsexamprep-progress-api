# CSP 1.2 Exercise 1: the LunchDash Log goes on the page

Date: 2026-09-23
Agent: Claude Code
Board: #393
Report: `esc_75eed3a1756556a978585f39`, content_error on
`/pages/ap-csp-topic-1-2-exercise-1`, 2026-09-22 17:12, student, no text.

## What was wrong

The page asks six graded questions and one Part B prompt about the LunchDash
Log: row 4's idle window, the 10:30 inventory message, the two "Surprise me"
taps, the pizza tap with its buzz. The log was nowhere on the site. It lives in
Part A of the student handout, `AP-CSP_1-2_Exercise1_Student_k7q2m9.docx`, and
`lib/csp-exercise-pages.js` mirrors only Part B of an Exercise 1 handout, on
purpose, because every Exercise 1 handout says Part B is "the same items
available on the site exercise".

That rule was fine for a mirror-only page. It broke when a graded check got
written from the answer key, because the key's questions lean on Part A. So
this was never a missing file or a deleted section. The generator did what it
was told, and the page it built quoted a table it had been told to leave out.

## The log is real, and it came from the handout

Nothing was invented. The student handout is on the CDN at the path
`seed/csp-teacher-files.json` implies, and its Part A is a five-row table with
a heading, a lead paragraph and an attribution line. All of it went into
`seed/csp-exercise-source.json` as a `log` field on the 1.2 Exercise 1 entry,
extracted by a script, typography flattened to ASCII (em dashes to " - ", the
en dash in 10:40-11:00 to a hyphen, curly quotes to straight). Nothing retyped.

`lib/csp-exercise-stimulus.js` renders it as a numbered table inside an
`item paper` block directly above the Part B heading, the same visual language
Exercise 2 uses for its cases. An entry with no `log` renders the empty string,
so the other 69 pages are byte-identical to before. That was measured, not
assumed: every page body built before and after, one changed.

## The handout contradicts itself, and the page keeps the contradiction

The handout's rows are not in time order:

    row 1  11:14  a student orders pizza, gets a confirmation and a buzz
    row 2  10:30  inventory says "pizza: 0 remaining", the tile goes SOLD OUT
    row 5  11:20  "Surprise me" offers one student pizza

Read as one day, pizza sells out at 10:30 and is then ordered at 11:14 and
offered at 11:20. The page reproduces this exactly, because a student holding
the paper is told "row 4" and the page's row 4 has to be the same row.
Reordering or retiming the page would make it disagree with the sheet in the
student's hand, which is worse than the contradiction.

This is a content call for Tanner, not a patch: the fix is in the handout
(swap the times, or make row 2 a different item), and the page follows it.
`smoke:csp-exercise-stimulus` pins the handout order on purpose, so a future
session cannot "fix" the page on its own and split it from the paper.

## Evidence

- suite: `npm run smoke:csp-exercise-stimulus`, 28 assertions, and
  `smoke:csp-exercise-pages` still 53 of 53.
- rederive: a second parse of the docx with plain regular expressions and no
  XML parser, compared cell by cell to the committed JSON. 6 rows by 5 cells,
  match.
- mutation: eleven breaks, each red on its own rule. Hook removed, stimulus
  moved below Part B, row 4 dropped, rows sorted by time, the 10:30 row
  reworded, an em dash in a lean cell, an em dash in a cell nothing else reads,
  the log removed, a fourth page citing a row with no log, a known gap healed
  but still listed, a column header changed.
- live, before: the storefront body matched the generator's pre-change output
  except for Shopify's own normalisation (`&middot;` stored as the character,
  a newline before `</h2>`), so regenerating this page reverts nothing.

## The lock, and the import order

Board #392 held `lib/csp-exercise-pages.js` for the EK badge fix on the same
eight pages. Its session committed and opened draft PR #768 at 14:46, then went
silent and the board moved its claim to stale. Tanner told this session to
force-take the lock, after #392's commit had been merged into this branch, so
nothing of #392's work is lost and the sheet here carries both fixes.

That makes order matter. #392's topic 1.2 sheet rewrites this page from a tree
with no log. So the log sheet is step 5 of `imports/2026-09-23/RUNBOOK.md`,
after #392's four. Imported in that order the log survives and the badge stays
gone; the other way round, the log vanishes silently.

All four #392 sheets were refused by `scripts/matrixify-preflight.js`: a CSV
carries its sheet type in the file name and none of theirs had one. Renamed to
`-pages.csv`, contents unchanged, all five now clear.

## Evidence, continued

- sheet: `imports/2026-09-23/csp-1-2-exercise-1-log-pages.csv`, one row, md5
  a2d58aaee29ec65e2e6269308bc47136. Parsed back, the body equals a fresh
  `renderExercise()` byte for byte; zero EK badges, one log table, five rows,
  pure ASCII. Preflight clear.
- only one of the 70 bodies changes against the merged tree without the hook.
- live, before: `node scripts/verify-csp-1-2-log-live.js --before` read the
  real page (Part B present, six questions, six badges) with no log table.
  Its after-mode passes on the sheet's own body and fails when row 4 is
  renumbered, so it is not hollow.

## Still open

- Five imports, in runbook order. Not done by this session.
- After step 5, `verify-csp-1-2-log-live.js` is the independent re-check.
- Same defect, three more pages: Part B on 2.3, 5.3 and 5.6 Exercise 1 cites
  numbered rows of a log the page does not show. All three are mirror-only, so
  no graded question depends on them. They are `KNOWN_GAPS` in the new suite,
  which can only shrink.
- The handout time-order contradiction above, which is Tanner's call.

## Learned

A design rule that was right for one kind of page ("Part A stays on paper")
became wrong the day a second kind of content was attached to the same page,
and nothing checked the pairing. The new class guard asks the question
directly: does any Part B prompt cite a row the page does not show.
