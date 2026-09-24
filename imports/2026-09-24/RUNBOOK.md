# Board 403: CSA Exercise-2 doubled "Correct. Correct." prefix

Matrixify Pages, MERGE. 38 rows, all already-live `ap-csa-lesson-*-exercise-2`
handles (Units 2, 3 and 4). One file, one import.

## What was wrong

`lib/csa-exercise-2-pages.js` prepended its own "Correct."/"Incorrect." label
onto each answer's feedback text. 226 of 228 authored `why` strings for the
correct option already open with the literal word "Correct." (seed convention
across `seed/csa-exercise-2/unit2.js`, `unit3.js`, `unit4.js`), so the label
was applied twice. Live example, `ap-csa-lesson-2-1-...-exercise-2` question 1:

    Correct. Correct. A decision with no repeated work is exactly what
    selection is for.

142 of 228 questions across 37 of the 38 pages carried the doubled prefix
(confirmed by rendering the current live bank locally and counting; the only
clean page has all six correct-answer `why` strings that happen not to start
with "Correct.").

Reported by a customer as `esc_97f407ceb244314bf53d27a5` (2.1 Exercise 2, Q1),
found to be repo-wide while auditing that report on 2026-09-24.

## The fix

`lib/csa-exercise-2-pages.js`: the renderer now skips its own label only when
the seed's `why` text already opens with the literal `Correct.` or
`Incorrect.` (period required, case-sensitive). This was deliberately NOT a
looser match: some distractor `why` text legitimately opens with the English
word "Correct" without a period ("Correct results, but it scans the whole
array..."), and a loose match would have silently dropped the "Incorrect."
label those need. Verified locally: 912 feedback divs across the 38 pages, 0
doubled, 0 missing a label. Existing `smoke/csa-exercise-2-pages.js` (320
assertions, including a byte-for-byte Matrixify round-trip check) still
passes unchanged.

This sheet is what the fixed generator now produces for all 38 already-live
handles. Import repairs the live pages; nothing here changes questions,
answer keys, or scenario text, only the feedback label.

## Before importing

Re-run `npm run morning -- --json` (or refetch a couple of the pages live)
first. If a different session already regenerated and imported this sheet
since 2026-09-24, re-importing is harmless (MERGE, byte-identical) but skip
it if the live page already reads clean, per the CLAUDE.md rule about a sheet
going stale before it lands.

## Expected end state after import

All 38 `ap-csa-lesson-*-exercise-2` pages: every `mcq-feedback` div starts
with exactly one of "Correct. " or "Incorrect. ", never both, never neither.
Spot check: `ap-csa-lesson-2-1-algorithms-selection-repetition-exercise-2`
question 1, option B (correct), should read "Correct. A decision with no
repeated work is exactly what selection is for." with no repetition.
