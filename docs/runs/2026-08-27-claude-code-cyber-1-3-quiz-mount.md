# Cyber 1.3 quiz onto the server render path

2026-08-27. Asked for "the 1.3 fix" after the Unit 1 test key correction.

## What the 1.3 problem actually was

The session started from the reported symptom: a page titled "Topic 1.4:
AI-Based Cybersecurity Attacks - Quiz" that serves 1.3 wireless questions. That
symptom is real, but it is not the thing worth fixing first.

Checking the pages directly turned up the larger fact: **the canonical 1.3 quiz
page was never migrated.** `ap-cyber-unit-1-lesson-3-quiz` still carried
`ANSWERS` and five `checkQ(` call sites, so its answer key shipped to every
browser. The 1.3 bank in `quiz_bank` exists and is CED-verified, but it was
inert, exactly as `scripts/seed-quiz-bank.js` warns: seeding does not migrate a
page, only a `data-apcs-quiz` container does.

So 1.1 and 1.2 are migrated and 1.3 was not, which is the opposite of what the
earlier reporting in this session implied. That claim was made from the 1.1 page
and should not have been generalised to 1.3.

## Why the existing tool refused it

`scripts/cyber-quiz-mount-csv.js` bounds its splice with `<div class="score-bar"`
and asserts the hero survives via `class="qhero"|class="ex-header"`. The 1.3 page
is a third markup generation and has none of those: its hero is a bare
inline-styled banner and its questions live in `<div id="quizBody">`. The tool
refused the page rather than mangling it, which is the script working correctly.

The fix made both landmarks per-target rather than global. Loosening the two
checks to admit 1.3 would have retired the protection they give 1.1 and 1.2, so
1.3 names its own `startMark` and `heroMark` and every other assertion still
applies to all three pages.

Also added a handle filter to `main()`, so a sheet can cover one page without the
other targets reporting a missing body. A named handle that is unknown, or a
target whose body is absent, is still REFUSED rather than silently skipped.

## Evidence

Generated `imports/2026-08-27/cyber-1-3-quiz-mount.csv`, 63522 bytes of body down
to 36552. Every generator assertion passed, and each was then re-checked
independently against the written CSV rather than trusted:

- no `ANSWERS` / `checkQ(` / `data-correct` / `data-val` / `data-answer`
- exactly one mount, `data-lesson="1.3"`, one mount script tag
- ucnav and activity nav byte-identical to the original
- schema block and hero survive, div balance delta unchanged
- the five question stems are gone

Regression, both fail closed as they should: the already-migrated 1.1 body is
REFUSED for want of the default `score-bar` landmark, and an unknown handle is
REFUSED by name.

**The sheet is not imported.** It carries a `Body HTML` column, which is the same
shape as the 2026-08-22 sheet that blanked a live student page, so importing is a
human action taken deliberately. Nothing is live until someone does it.

## No content change for students

The five items in `quiz_bank` for 1.3 were seeded from this page unchanged, so
the mount serves the identical instrument. What leaves is the key beside it.
Audit finding 5 is also cleared: the copy-pasted authoring header naming
`1.2-ex1` is corrected. It was inside an HTML comment, so inert before and after.

## Still open, deliberately not touched

- **1.1 and 1.2 heroes lie about length.** Both advertise 9 and 12 questions
  while the server serves 5. Those counts were correct on 2026-08-26 against the
  bundle-derived banks, and went stale when those banks were retired a day later.
  Live defect, separate pages, needs its own sheet.
- **The unit nav swaps 1.3 and 1.4.** In `ucnav`, the 1.3 slot points at
  `ap-cybersecurity-unit-1-ai-driven-threats` (the 1.4 lesson) and the 1.4 slot
  points at `ap-cybersecurity-unit-1-wireless-security` (the 1.3 lesson). This is
  the root cause of the mistitled quiz, not a separate bug.
- **A duplicate 1.3 asset set** lives under `wireless-security-*` handles wearing
  1.4 titles, and it is what the nav's 1.4 slot links to. Nothing else on the
  pages checked links to it.
- **There is no 1.4 quiz at all.** Retiring the duplicate without authoring one
  leaves the 1.4 slot empty, so the two decisions are coupled and belong to
  Tanner rather than to a transform.
