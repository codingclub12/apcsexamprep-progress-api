# 2026-09-24: CSA Exercise-2 doubled "Correct. Correct." prefix (board 403)

Part of the daily Urgent/Suggested/Bug triage. `ADMIN_READ_KEY` is now set on
this Claude Code environment (it was not as of yesterday's runs), so this
session read the report queue directly via
`GET /api/assistant/reports?status=open` and `npm run morning` instead of
working around it through the Command Center board or the Outlook mailbox.

## What changed

`lib/csa-exercise-2-pages.js`: the feedback renderer no longer prepends its
own "Correct."/"Incorrect." label when the authored `why` text already opens
with that exact word and period. Full detail and the live example are in
`imports/2026-09-24/RUNBOOK.md`. Board task #403.

## Evidence

- Independent audit (a separate agent, not this session) reproduced the bug
  live on `ap-csa-lesson-2-1-algorithms-selection-repetition-exercise-2`
  (customer report `esc_97f407ceb244314bf53d27a5`) and traced it to the
  renderer against three sampled pages before I touched anything.
- Rederive, independent of that audit: rendered all 38 pages locally from the
  seed data and counted `class="mcq-feedback ...">` divs directly. Before the
  fix, 142 of 912 divs across 37 of 38 pages read "Correct. Correct." or
  would have on re-generation. After: 912 divs, 0 doubled, 0 missing a label
  (checked by requiring the pattern `^(Correct|Incorrect)\.\s`).
- Suite: `node smoke/csa-exercise-2-pages.js`, 320 assertions, 0 failed,
  unchanged from before the fix (the suite did not previously test for this
  because it checks structure and balance, not this specific string).
- Mutation-adjacent: a first version of the fix used a looser match
  (`/^(correct|incorrect)\.?\s/i`, period optional) which silently ate the
  "Incorrect." label off 6 real distractor explanations that legitimately
  open with the English word "Correct" without a period (e.g. "Correct
  results, but it examines every cell to select the few on the diagonal.").
  Caught by the same rederive script before committing; tightened to require
  the literal period, re-checked at 0 missing / 0 doubled.
- Live: NOT YET. This is a Shopify page-body change and ships as a Matrixify
  sheet per house convention, not a code deploy; `imports/2026-09-24/` has
  the generated, MERGE-mode, mojibake-clean sheet (38 rows, byte-checked
  before writing) ready for import, plus the runbook with the exact expected
  end state and a spot-check string. This session did not self-import it.

## What is still open, not touched here

Found by the same audit pass, listed for the record, none fixed in this PR:

- The LunchDash Log page itself (CSP 1.2 Exercise 1, report
  `esc_75eed3a1756556a978585f39`) is fixed and live, but the two downloadable
  `.docx` files (`AP-CSP_1-2_Exercise1_Student_k7q2m9.docx` and the KEY) still
  say "10:30 a.m." where the live page now says "11:25 a.m." Binary Word
  documents, needs Tanner to regenerate and re-upload; not something this
  session can produce without inventing the missing content ordering.
- CSP Day 35 blog post (`csp-c2-day-35-lists-as-data-abstraction`, report
  `esc_5901d1d5acf89a5900c84d2c`) is labeled "Big Idea 2: Data" but the
  question is Big Idea 3, Topic 3.2. The cycle-1 twin
  (`csp-c1-day-5-lists-as-data-abstraction`) has the same label. No generator
  source was found in the repo for these daily-practice blog posts, so a
  one-off Admin API read/fix would be needed; flagged rather than attempted
  in this pass given the time budget.
- `shopify/games/harden-first.html` (the repo's checked-in generator source
  for the AP Networking "Harden First" game) still loops fix buttons in
  authored order (key, key, key, then distractors) at line 196. The LIVE page
  was already fixed via a CSV built on 2026-09-21
  (`imports/2026-09-21/leaderboard-xss-fix-networking-games-escmap-only.csv`,
  which added a per-round shuffle), but that fix only reached the CSV, not
  the repo source it was built from. Any future run of
  `scripts/networking-game-pages-csv.js` from `shopify/games/harden-first.html`
  as it stands would regenerate the pre-shuffle page and silently undo the
  fix. Worth a follow-up task; not done in this pass.
- CSA 2.1 Exercise-2 Q1 stem is ambiguous ("orders" plural read naturally as
  a loop-with-if, which is a wrong option) and CSP 3.5 Boolean Expressions
  Q6 tests Python syntax on a CSP page (AP pseudocode has no stated
  AND/OR precedence). Both are course-design judgment calls for Tanner, not
  defects with an unambiguous fix.
- `esc_5ca62cd2411845f63a41c0c0` is inert test data from 2026-09-04
  ("TEST REPORT filed by Claude Code at Tanner's request"); `/pages/pricing`
  is a genuine 404. Cannot mark it resolved from here: this environment holds
  `ADMIN_READ_KEY` but not `ADMIN_KEY`, and `PATCH /api/assistant/reports/:id`
  requires the write key.

No new Urgent/Suggested/Bug reports arrived since yesterday's 13:15 close-out
pass, confirmed both via the Outlook mailbox and via `npm run morning`.
