# Hub pages, second pass, 2026-09-18

Six sheets. Five bodies, one page each, plus one title row.

These are the five hub pages the first pass left behind. They carry the stale
year as a school-year SPAN rather than a bare 2026, which is why they were
missed: the check stripped every span before looking, so `ap-csp-reference-sheet`
said "the 2025-2026 AP CSP exam" four times and the page read clean. Spans are
judged by their end year now.

## Before you import anything

    node scripts/verify-body-year-live.js

Expect **4 done** (yesterday's pages) and **5 pending**.

## The steps

| # | Sheet | Edits | Expected after |
|---|---|---|---|
| 1 | `titles-page-year.csv` | 1 row | the first h1 on the topics page reads 2027 |
| 2 | `body-ap-csp-practice-exams.csv` | 1 | `[DONE]` |
| 3 | `body-ap-csa-practice-exams.csv` | 4 | `[DONE]`, exam date reads May 12 2027 |
| 4 | `body-ap-csp-reference-sheet.csv` | 6 | `[DONE]`, no 2025-2026 anywhere visible |
| 5 | `body-ap-csa-topics.csv` | 8 | `[DONE]` |
| 6 | `body-ap-csa-exam-prep-hub.csv` | 13 | `[DONE]` |

Smallest first, so the cheapest sheet is the one that proves the path. Import one
at a time and run the verifier for that handle in between:

    node scripts/verify-body-year-live.js <handle>

`[DONE]` with 0 stale and all new claims present is success. `[PARTIAL]` means
some edits landed and some did not; stop there.

Element counts are in the verifier output and are the truncation check. If one
drops, the import cut the body short.

## What these sheets deliberately leave alone

Each of these is a past year that is CORRECT, and changing it would make the page
say something untrue:

- **"Starting with 2025-26, the exam is fully digital."** That is when it went
  digital. Two pages say it.
- **"File I/O with Scanner is a fully new addition to the 2025-2026 AP CSA
  exam"** and **"new to the 2025-2026 curriculum"**. That is when they were
  added.
- **"New and Updated Topics, 2025-2026 Curriculum"**, and the "New in 2026" and
  "NEW 2026" badges beside those same topics. They mark the four-unit rewrite.
- **The FRQ archive**, 2020 through 2025, and "appears every single year,
  consistently from 2004 to present". The archive is the point of the page.
- **The copyright year.**
- **Authoring scaffolding inside HTML comments.** Both practice-exam pages carry
  a block of "SEO: - Page Title: ... - Meta description: ..." notes left over
  from whoever built them, with stale years inside. Checked against the rendered
  page: none of it reaches a student. Untouched here, and worth cleaning up
  separately.

## One judgement call worth your eye

Lines like "aligned to the 2025-2026 4-unit curriculum" became "2026-2027". The
four-unit structure has not changed and is not being renamed; what changed is the
school year the page claims to be current for. That matches the SEO titles
already live, which read "2026-27".

If you would rather those lines named no year at all, say so and I will redo
them. It is the more durable option and I did not take it only because the
shipped titles set a precedent.
