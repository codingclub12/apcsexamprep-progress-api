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
| 1 | `titles-page-year.csv` | 1 row | the first h1 on the topics page reads `AP CSA Topics` |
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

## Currency lines lose their year rather than gaining a new one

Tanner's call. A line like "aligned to the 2025-2026 4-unit curriculum" now reads
"aligned to the 4-unit curriculum", which is true for as long as the four-unit
curriculum is what we teach. The first draft moved it to 2026-2027, correct today
and due for this same pass next September.

The rule this follows:

- a year STAMPING CURRENCY on content goes: aligned to, built for, organized by,
  a hero eyebrow, a page-title badge
- a year stating a FACT about an administration stays and reads 2027: when the
  exam is, what is on it, the date, "Updated for the May 2027 exam"

Two lines were reworded rather than just trimmed, because the trim read badly.
"Complete AP CSP pseudocode reference sheet for the AP CSP exam" said the course
twice, so it is "for exam day". "Covers all 4 units, built specifically for the
four-unit curriculum" repeated itself, so it is "the current curriculum".

One mechanical consequence, which the generator caught rather than a human:
dropping a year makes a replacement SHORT, and "AP Computer Science A" occurs all
over its page. The surgical check refused every one of those sheets, correctly,
because reversing the edit rewrote every other occurrence too. Those find-strings
now carry their own markup, so the edit can only land in the one element it
means.
