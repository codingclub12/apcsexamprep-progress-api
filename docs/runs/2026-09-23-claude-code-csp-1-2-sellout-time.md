# CSP 1.2 Exercise 1: pizza sells out at 11:25, not 10:30

Date: 2026-09-23
Agent: Claude Code
Board: #400, following #393

## What was wrong

The LunchDash Log in the 1.2 Exercise 1 handout had pizza selling out at
10:30 (row 2), then a student ordering pizza at 11:14 (row 1) and "Surprise me"
offering pizza at 11:20 (row 5). #393 put the log on the page exactly as
printed and flagged the contradiction. Tanner's call: pizza sells out after
11:20.

## What changed

The sell-out is now 11:25 a.m., five minutes after the last row that offers
pizza. Nothing else moved. Row order is unchanged, so "row 4" still means the
same row on paper and online.

- `seed/csp-exercise-source.json`: row 2 time.
- `seed/csp-exercise-checks/1-2.js`: graded Q2 opened "At 10:30"; now "At 11:25".
  Its key citation is about input sources and never mentioned the time.
- `smoke/csp-exercise-stimulus.js`: the pinned time updated, plus the rule that
  actually matters, checked from the log itself: the sell-out row comes after
  every row that orders or offers pizza, and Q2 names the same time as the log.
- `imports/2026-09-23/csp-1-2-exercise-1-log-pages.csv`: step 5 regenerated,
  md5 a56c4d5bc6e28772e1abe6bddf0d7c11 (was a2d58aae...).
- `imports/2026-09-23/AP-CSP_1-2_Exercise1_Student_k7q2m9.docx`: the corrected
  student handout, md5 f1e2b2ba3795d57470459a89d5e247fc.
- The corrected answer key, md5 1d88d6c12ea179b468552c6229d308f2, was handed
  over in the conversation and is NOT committed: this repo is public and the
  keys stay out of it, the same rule `scripts/fetch-csp-keys.js` follows.

Both documents were edited as bytes, not re-saved from Word: the one run
`<w:t xml:space="preserve">10:30 a.m.</w:t>` became `11:25 a.m.`, every other
part of each file is byte-identical to what the CDN serves, and neither file
contains 10:30 anywhere else. The key's written answers were read for anything
that leaned on the early sell-out; none did.

## Evidence

- suite: stimulus green with the new rule; csp-exercise-pages, denominators,
  discoverability, unit-test-links, renderable-entities, encoding,
  mutationleak, volumepaths, storefront all green. One of 70 bodies changes.
- rederive: the log extracted from the corrected handout equals the page's
  source data exactly.
- mutation: sell-out put back at 10:30, sell-out at 11:19 (before the 11:20
  offer), and Q2 left saying 10:30. Each goes red, and the two time breaks
  fail the ordering rule on their own, not only the pinned time.
- key citations: all six 1.2 questions quote text present in the corrected key.
- sheet: parses back byte-identical to `renderExercise()`, no 10:30, 11:25 in
  the log and in Q2, no EK badge, preflight clear.

## Not done, and why

- **The CDN files are not replaced.** Shopify supports this without changing
  the URL (`fileUpdate` with a new `originalSource`), and the staged upload
  targets were created, but pushing the bytes was refused by this session's
  permission check as a change to a shared resource. So
  `gid://shopify/GenericFile/37971858325719` (student) and
  `gid://shopify/GenericFile/37971860291799` (key) still serve 10:30. The
  runbook's step 5 now says to replace them in Shopify admin first, with a
  one-line check.
- **Google Drive holds more copies**, under generic names:
  `Exercise1_Student.docx` of 14,260 bytes in folder `1A4PzQzJBgD0c4hsSrILsGbT48w5AR-Xj`
  (the same size as the CDN handout) and of 14,267 bytes in folders
  `1RFrMIP73KbgCvBoKFJmPycAAg1qzJVd3` and `1WNwMOZqzYUq4jRfRQyvczzzUZYF0ptxF`,
  each beside an `Exercise1_KEY.docx`, plus `AP_CSP_Course (1).zip`. Matched on
  name and size only, not opened, so which of these are 1.2 and which a buyer
  sees is not established here. None were changed.
