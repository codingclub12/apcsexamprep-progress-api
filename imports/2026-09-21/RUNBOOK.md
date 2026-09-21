# CSP guided notes: point the CFU reference at a section that exists

Board 382. Four sheets, four imports, in this order. Do not combine them: a
MERGE overwrites a live body with no undo, so the blast radius of one click is
however many rows are in the file.

## What changes

67 sentences across 17 pages. Every one currently tells a student to check
themselves with "the matching CFUs on the Topic N.N page". No lesson page on
this store contains the string CFU. The section being referred to is headed,
on screen, **MCQ Practice**, and holds six questions.

    before  Answer in complete sentences. Then check yourself with the matching
            CFUs on the Topic 2.1 page.

    after   Answer in complete sentences. Check yourself with the six MCQ
            Practice questions on the Topic 2.1 page once you have finished the
            whole topic.

The header sentence on each page changes the same way, and loses its em-dash
because the sentence is being rewritten anyway. The other 450 em-dashes in
these bodies are deliberately left alone.

Nothing else in any body changes. The generator proves that by applying the
rules backwards and requiring the result to equal the live body byte for byte.

## Before you import anything

    node scripts/verify-csp-notes-cfu-live.js --before

Expected: `fixed 0   not yet 17   problem 0`, and the last line reads
"All 17 page(s) still carry the defect, so the sheets are current."

If it says any page is ALREADY FIXED, **stop**. That sheet is stale and
importing it would MERGE an older body over a newer one. Regenerate with
`node scripts/csp-notes-cfu-fix.js` and start again.

## The four imports

Matrixify, MERGE mode, one at a time. Each sheet has three columns
(Handle, Command, Body HTML) and no Published At.

| Step | File | Pages | After this step, `verify` should read |
|---|---|---|---|
| 1 | `csp-notes-cfu-fix-bi1-pages.csv` | 4 | fixed 4, not yet 13 |
| 2 | `csp-notes-cfu-fix-bi2-pages.csv` | 4 | fixed 8, not yet 9 |
| 3 | `csp-notes-cfu-fix-bi4-pages.csv` | 3 | fixed 11, not yet 6 |
| 4 | `csp-notes-cfu-fix-bi5-pages.csv` | 6 | fixed 17, not yet 0 |

Run the check after each step:

    node scripts/verify-csp-notes-cfu-live.js

Between steps it will exit non-zero, because not all 17 are done yet. That is
expected and is not a failure. Only step 4 should end with
"All 17 pages name a section that exists, with the right question count."

## What the check actually asserts

Not just that CFU is gone. A page could lose the word and still point at a
section that is not there, which is the same defect in different words. So for
each page it also reads the LESSON page and confirms "MCQ Practice" appears
once and that there are six questions, which is what the new sentence claims.

## No deliberate exceptions

All 17 pages are expected to end up fixed. Unlike the cyber quiz mounts, there
is no page here that is meant to stay as it is, so a partial result is a real
failure rather than an expected one.

## Not in these sheets

Big Idea 3's 18 notes pages are not live yet. Their generator
(`lib/csp-course-pages.js`) has been changed in the same commit so they ship
with the corrected wording, which is why this is 17 pages and not 35.
