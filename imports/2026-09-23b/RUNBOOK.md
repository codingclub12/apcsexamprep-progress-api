# 2026-09-23b: cyber grader points fix

One sheet, one page. Import settings: MERGE, QUOTE_ALL, utf-8-sig.

| Step | Do | Expected |
|---|---|---|
| 0 | `node scripts/verify-cyber-points-fix-live.js --before` | exit 0 and "defect confirmed live". If it says the defect is already gone, DELETE the sheet instead of importing it. |
| 1 | Import `cyber-grader-points-fix-pages.csv` | 1 page updated: `ap-cyber-unit-1-lesson-4-exercise-1` |
| 2 | `node scripts/verify-cyber-points-fix-live.js` | exit 0, Parts 12 / 6 / 6, total 24 of 24 |

What changes: two `++` become `+=2`, and the two "+1" feedback labels next to
them become "+2" (Part 2 "Technique", Part 3 "Voice cloning defense"). Nothing
else in the body moves. The builder proves that before it writes the file.

Stored scores are NOT changed by this import. See
`docs/Email-Unknowns-Findings-2026-09-23.md`, Task 1.4, for the regrade plan.
