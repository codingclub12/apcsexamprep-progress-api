# Unit 4 is teaching the wrong topic at six lessons, confirmed against the real CED

2026-08-19, Claude Code, follow-on to the CodeHS Cortado reference doc.

## What happened

Tanner pasted the actual text of the AP Computer Science A Course and Exam
Description, Effective Fall 2025, directly into the conversation. This
resolved the Unit 4 question `docs/csa-codehs-exercise-reference.md` had left
open: whether CodeHS's Cortado sequence or this platform's live Unit 4 list
was the one that matched the real CED past lesson 4.4. This session's own
egress to `apcentral.collegeboard.org` was still blocked at the time (checked
again, still `EGRESS_BLOCKED`), so the primary source came in as pasted text
rather than a fetch.

## The finding

Confirmed in three separate places in the CED text that agree with each
other: the Course at a Glance table, the Unit 4 "Unit at a Glance" table, and
every individual topic header from 4.1 through 4.17. CodeHS's Cortado
sequence matches the official CED word for word at all 17 Unit 4 positions.
This platform's live Unit 4 list does not, starting at lesson 4.6:

| lesson | CED (official) | this platform (live) |
|---|---|---|
| 4.6 | Using Text Files | Arrays as Parameters and Return Values |
| 4.7 | Wrapper Classes | ArrayList Introduction |
| 4.13 | Implementing 2D Array Algorithms | Searching and Sorting |
| 4.14 | Searching Algorithms | Reading Data from Files |
| 4.15 | Sorting Algorithms | Using Data Sets with Arrays and ArrayLists |
| 4.17 | Recursive Searching and Sorting | Informal Code Analysis |

Checked one level deeper than the page titles: `seed/csa-exercises/unit4.js`
has an exercise already authored for each of these six lessons, and every one
of them is built around the platform's topic, not the CED's. 4.6's exercise
tests array aliasing, not file reading. 4.14's is a file-reading exercise,
correct in content but sitting eight lessons away from where the CED puts that
topic. 4.13 through 4.15 collapse three distinct required topics (2D array
algorithms, linear/binary search, selection/insertion sort) into one merged
"Searching and Sorting" exercise plus the misplaced file-reading one. 4.17
duplicates Unit 2's own "Informal Run-Time Analysis" (2.12) under a title that
is not a real Unit 4 CED topic, instead of covering recursive binary search
and merge sort.

Net effect: two full required exam topics, Wrapper Classes and 2D-array
algorithms as their own distinct topic, have no correctly-placed exercise
anywhere in this platform's Unit 4 bank. Unit 4 carries 30-40% of the
multiple-choice weighting, the largest of the four units, and free-response
Question 4 ("2D Array") is drawn from exactly this territory.

4.1 through 4.4, 4.8 through 4.12, and 4.16 are fine: exact CED matches, or
harmless title rewording of the same topic (this platform's "Traversing
Arrays" for the CED's "Array Traversals," and similarly at 4.5, 4.9, 4.10,
4.12).

## What was and was not done

Updated `docs/csa-codehs-exercise-reference.md` in place with the resolved
finding, replacing the earlier "unresolved, check pending" language, and added
a one-line pointer from `docs/csa-exercise-pages.md` so anyone touching a Unit
4 exercise sees the warning before they start. Did not touch any exercise
content, page title, or code. Fixing this is a real decision, not a
mechanical one: it means relabeling and recontenting six lessons that already
have live pages and authored (if unpublished) exercises, and it is Tanner's
call how to sequence that against the exercise-count decision the reference
doc was originally written for.

## What is still open

- How to fix the six mismatched lessons. Only 4.14's authored content is
  salvageable by moving rather than rewriting: it is a file-reading exercise,
  which is the CED's actual 4.6 topic, just eight lessons away from where it
  belongs. The other five (4.6, 4.7, 4.13, 4.15, 4.17) each need a new
  exercise written for the topic that actually belongs at that number; none of
  their current content covers a real Unit 4 CED topic anywhere else in the
  unit.
- Whether this same kind of check is worth running against Units 1-3 as a
  matter of course, now that a live CED text is in hand; they matched CodeHS
  cleanly in this pass, but that was a cross-check against CodeHS, not a
  direct read of the CED for those units specifically.
- The exercise-count decision itself, unchanged from the prior doc: still
  Tanner's call, and now sequenced behind the Unit 4 content fix rather than
  parallel to it.
