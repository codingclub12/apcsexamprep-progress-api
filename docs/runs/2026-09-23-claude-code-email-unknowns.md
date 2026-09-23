# 2026-09-23, Claude Code: unknowns behind four teacher emails

Board #394. The findings Tanner answers from are in
`docs/Email-Unknowns-Findings-2026-09-23.md`.

## What changed

- `scripts/build-cyber-points-fix-sheet.js` builds a one-row MERGE sheet that
  fixes the 1.4 Exercise 1 grader, which gave +1 for two questions labelled
  (2 pts). The patch is declared as exact before and after pairs, and the
  builder refuses anything else that moves.
- `scripts/verify-cyber-points-fix-live.js` runs the live page's own grader in a
  vm with the best answer to every dropdown and compares the result with each
  part's stated points. It fails against the live page today, 22 of 24.
- `smoke/cyber-points-fix.js` (`npm run smoke:cyberpointsfix`) runs the grader
  in both directions on the stored snapshot, isolates each refusal, and checks
  the sheet on disk.
- `docs/drafts/ap-cyber-1-3-sample-login-pages.html` is a draft page for the
  missing 1.3 Day 3 warmup. It is not published.

## Evidence

- Live, before the import: Parts 12 / 5 / 5, total 22 of 24.
- Production: across 340 students with a /24 score on this page, the maximum
  ever recorded is 22 (read-only admin score events).
- Mutation: changing the fix back to `+=1` turns the smoke red on 2 checks.

## Open

- The sheet is not imported.
- There is no regrade, because the saved rows have totals only.
- The sweep found other hits; they are listed in the findings file.

## Learned

- A score-event row carries only the page total, so a grader bug cannot be
  fully regraded after the fact. The running totals the score reporter posts
  (for example 12, then 17, then 22) could recover per-part deltas for some
  students, but not per-question answers.
- The read-only admin key returns `teacher_email` from `/api/admin/classes`.
  Its route comment says "never PII". That is worth a look, but it was not
  changed here.
