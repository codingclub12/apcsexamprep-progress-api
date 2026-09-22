# The bug report with nothing in it, and the guard that agreed with the bug

2026-09-22, claude_code, board 387. Triggered by `esc_f7e6c570aef9252c995203ae`,
an anonymous `content_error` sitting unread since 2026-09-21T22:58:28Z against
`/pages/ap-csp-course-bi4-fault-tolerance`. No reporter text, empty console
buffer, no console errors to go on.

## What was wrong

The student was right, and the thing they saw is in the page's stored body. The
last card of the exercise row, the one that opens the only activity on the page
whose answers reach the gradebook:

    <a class="ex wide" href="/pages/ap-csp-course-bi4-fault-tolerance-exercise-2">
      Applied Challenge<span>undefined questions, and every answer is recorded
      for your teacher</span></a>

Nothing throws, nothing logs, and the page renders. There was never going to be
anything in that console buffer.

## Why the console was empty and the defect was still real

This is the class of report that reads as a false positive. It is not. The
failure is in text a student reads, and the only instrument that finds it is
reading the body.

## The repair is two things, and the sheet is the smaller one

Going through the function whose job it is to build that card rather than
guessing from the page, `appliedCard()` in `scripts/csp-lesson-exercise-links.js`:

    const n = applied.questions.length;

`lib/csp-course-pages.js` sets `questions: n`, a Number. `.length` on a Number is
`undefined` rather than an error, so the card was built with the word in it and
shipped to every lesson page that had a live Applied Challenge. Reproduced
offline in one line, with no network:

    node -e "const {allPages}=require('./lib/csp-course-pages');
             const {appliedCard}=require('./scripts/csp-lesson-exercise-links');
             console.log(appliedCard(allPages().filter(p=>p.kind==='exercise-2')[0]))"

So repairing the 17 page bodies and stopping there would have left the generator
free to write the same card again on its next run.

## The guard was hollow in the same shape as the bug

`smoke/csp-exercise-discoverability.js` had this, and it was green the whole time:

    ok('  the subtitle carries the page\'s own question count',
      card.includes(`${one.questions.length} questions`), card);

The test derived its expectation the same wrong way the code derived its output,
so the assertion was `includes('undefined questions')` against a card that said
exactly that. Both sides agreed and both were wrong. This is the failure named in
CLAUDE.md about the preflight's mojibake fixture sharing a blind spot with the
guard it tested, arriving through a different door: not a pasted pattern this
time, a derived expectation.

It is a literal now, `6 questions`, with a second assertion that refuses the word
`undefined` outright whatever the count turns out to be.

## The defect is wider than the report and wider than yesterday's board

Yesterday's pass (`docs/runs/2026-09-21-claude-code-esc-xss-and-undefined-sweep.md`)
found this card on Big Idea 3 and treated it as a Big Idea 3 problem. The
generator built the block on all 35 lesson pages, so it was never one.

Measured today against the stored bodies of all 35 live CSP lesson pages:

| | count |
|---|---|
| lesson pages carrying "undefined questions" | 31 of 35 |
| of those, in Big Idea 3, covered by yesterday's unimported sheet | 14 |
| of those, outside Big Idea 3, with no sheet at all | 17 |
| already correct, fixed by hand on 2026-09-21 | 4 |

Also worth recording: yesterday's Big Idea 3 sheet has **not** been imported. All
14 of its pages still serve the broken card. That is a fact about the storefront,
not a criticism of the sheet, and it is why the two sets are kept apart.

## What ships

Four sheets in `imports/2026-09-22/`, split one per Big Idea, with a runbook
carrying the expected end state per step.

| | |
|---|---|
| canonical data | the 17 handles in `scripts/verify-csp-applied-undefined-live.js`, grouped by Big Idea |
| generator | `scripts/build-csp-applied-undefined-sheets.js`, nine refusals, preflights each sheet in process |
| validator | `smoke/csp-applied-undefined.js`, `npm run smoke:cspappliedundefined` |
| rederive | `scripts/csp-applied-undefined-rederive.py`, a second reading of the finished CSV against live |
| sheets | `imports/2026-09-22/*.csv`, MERGE, BOM, QUOTE_ALL, CRLF, no Published At |

Plus the two code fixes above, which are the part that stops it coming back.

## The refusal that only existed where nothing could test it

`patchBody` was split out of the fetching half so the refusals could be broken on
purpose offline. The first run of the new suite went red on one assertion, and
the rule was wrong rather than the test: the "zero graded items" refusal lived
beside the fetch, so the pure half would happily have built
`0 questions, and every answer is recorded for your teacher`. A confident 0 is
worse than "undefined", because "undefined" is visibly broken and gets reported
by a student while 0 never gets looked at again. The refusal moved into the pure
half and both the zero and the not-a-number cases are asserted.

## Evidence

- `node scripts/verify-csp-applied-undefined-live.js --before`:
  `fixed 0   not yet 17   problem 0`, so the sheets are current rather than stale.
- All 17 Applied Challenge targets fetched and counted: 6 graded items each,
  `id="csp-x2"` present on all 17, measured twice by two implementations.
- Every sheet parsed back out of the finished CSV by three different readers and
  diffed against the body that went in.
- `scripts/csp-applied-undefined-rederive.py`: 17 rows, 17 unique handles, each
  differing from the body that is live right now in exactly one edit region, and
  that region inside the Applied Challenge subtitle. Proved not hollow by
  changing one character of one row's HTML comment header, four thousand bytes
  from the card: it reported
  `ap-csp-course-bi4-fault-tolerance has 2 edit regions, expected 1` and exited 1.
  A count of replacements cannot see an edit like that.
- Matrixify preflight clear on all four, run with `--carrying` so its emoji rule
  has the original to compare against.
- `smoke:cspappliedundefined` 138/0, each refusal broken independently and
  matched on its own message.
- `smoke:csp-exercise-discoverability` 44/0 with the corrected literal, 42/2 when
  the generator fix alone is reverted, and **43/0 when the hollow assertion is
  restored alongside the bug**. That last run is the point: the suite is green on
  a card that reads "undefined questions".
- `smoke:encoding` 54/0, `smoke:mutationleak` 42/0, `smoke:volumepaths` ok.

## The instrument that was wrong before it was right

Worth more than the repair list, because the next builder pays for it otherwise.

- **The rederive looked like a hang and was a rate limit.** Its first run paced
  the outer loop, one sleep per page, while two fetches happen per row. Shopify
  answered 429 with the "Verifying your connection" interstitial, which parses as
  neither JSON nor a page, so the script sat in exponential backoff for fifteen
  minutes with no output. Pacing moved inside `fetch()`, where every call pays it.
  A 429 body that is not an error page is the same trap `lib/storefront-fetch.js`
  exists for, arriving as a stall instead of a false reading.
- **The preflight refuses a correct sheet from the command line.** Its emoji rule
  needs `--carrying` to prove a character was already on the live page, and with
  no original it has to assume "introduced". That is the right default and the
  wrong answer here, so the generator calls `preflight()` in process with the
  live bodies still in hand. Run by hand with no flag, all four sheets read
  "PROBLEM. Do not import."
- **A CSV whose name lacks the word "page" is rejected by Matrixify in one
  second**, because a CSV has no tab name. The first four files were written
  without it and the preflight caught it, not the import.

## Still open

- **The import is Tanner's.** Nothing has been imported. Four clicks, in the
  runbook's order, with the check between each.
- **Yesterday's Big Idea 3 sheet is still unimported**, and those 14 pages are
  still broken live. It is not this pass's artifact and was not re-validated
  here beyond reading its handles for the overlap check.
- The live check for these four sheets cannot pass until the import.
  `verify-csp-applied-undefined-live.js` with no flag is the post-import gate.
- The generator is a script run by hand, not a scheduled job, so nothing
  re-emits the block until somebody runs it. The fix removes the trap rather
  than closing an active leak.
