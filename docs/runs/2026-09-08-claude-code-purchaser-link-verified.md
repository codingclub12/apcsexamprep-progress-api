# The purchaser's link serves the repaired Unit 1. All 202 files.

2026-09-08. Board 287. Closes the question left open by
`2026-09-08-claude-code-drive-watch-cries-wolf.md`.

## The question

Unit 1 was repaired four times on 2026-09-07 and the corrected files were
uploaded to Drive on 2026-09-08. Two Unit 1 trees are publicly link-shared and
they share not one byte, so "the repairs are live" was true of one of them and
false of the other, and nothing said which link the paying customer had.

Tanner answered it with the link itself:

    https://drive.google.com/drive/folders/1HYnA1ZNByvHDBqlJGcbCT3lRC4PphbHV

That folder id is `ap-csa-teacher-bundle` in `config/drive-bundles.json`. It is
the tree that received the corrected upload.

## The answer

**The purchaser has the repaired files.** Not sampled: all 202 of them.

    scanned            202 of 202 Unit 1 files, 1,169,246 characters
    files with hits    2
    both hits          the same deliberate exception, below

Every file was checked against its committed digest on the way in, so the bytes
scanned are the bytes Drive serves.

## The two hits are correct and were excluded on purpose

Both are in `Lesson_1.3_Expressions_and_Output/Slide_Decks/Day2_Deck_*.pptx`, and
both are the phrase "on the board" inside the REQUIRED OUTPUT of an escape
sequence exercise:

> Escape practice: write the single println statement that produces exactly this
> line of output, quotation marks and backslashes included:
> `He wrote "C:\temp" on the board.`

The string is the answer. Repairing it would break the exercise. This is why
`scripts/repair-csa-unit1-deck-voice.py` skips topic 1.3 and why
`smoke/deck-voice-repair.js` pins the exclusion rather than leaving it to
whoever edits the table next.

## The scanner was proved to work before its clean result was believed

A scan that reads nothing reports zero, which is the failure this repo keeps
finding, so the identical scanner was run against the PRE-REPAIR copies of the
same file types in the preview tree:

    teacher bundle (repaired)     108,277 chars, 15 files,  0 hits,  0 files hit
    preview tree  (pre-repair)    103,712 chars, 15 files, 14 hits, 10 files hit

Same patterns, same three document types, comparable corpus size. It finds the
defects when they are present.

**The first version of the scanner was wrong and its numbers are not in the table
above.** It pulled text with a `<w:t[^>]*>(.*?)</w:t>` regex, which swallows
markup whenever it meets a self-closing `<w:t/>`, so the "text" was part XML: 234K
against 170K characters for corpora that are really 108K and 104K. The risk was
not the inflated count, it was that a phrase split across two runs would be
separated by markup and missed. Re-done through `python-docx` and `python-pptx`.

The pptx path reads `notes_slide.notes_text_frame`. Speaker notes are invisible to
a `slide.shapes` scan, which is how the first sweep on 2026-09-07 reported 56
decks clean while 68 defects sat in their notes.

## Root level docs use minutes informationally, which is the rule, not a breach

`Course_Resources/Pacing_Guide_*.docx` and `Start_Here.docx` match a minutes
pattern. Read rather than pattern-matched, all of it describes the schedule
instead of directing the teacher:

- "A teaching day in this kit is 60 minutes. A block period is usually 85 to 95
  minutes, so plan roughly three kit days into two blocks."
- "Block counts are the minute totals divided by 90 and rounded. **They are
  arithmetic, not a plan.**"
- "CED class periods are 45 minutes, in College Board's own wording. This kit is
  built on 60-minute days, so the two columns are not directly comparable."

A pacing guide that would not say how long a period is would be useless. The
criterion was informational rather than directional, and this is the informational
side of it. No change made.

## Still open, and it is a decision rather than a defect

`AP CSA Unit 1 Course Preview_` (`1wLyRVqeMB0B2yn3UxMLPGoJfcD-FhrOV`) is still
link-shared to anyone and still serves the pre-repair files: 261 files, zero
digests in common with the teacher bundle, and 14 voice defects in the 15 files
sampled. Anyone holding that link reads the old material.

Three options, and the choice is Tanner's because it turns on what that tree is
FOR, which the repo does not know:

1. Replace its Unit 1 with the corrected files, if it is a live marketing preview.
2. Stop sharing it, if it is an abandoned copy.
3. Leave it, if the link was never circulated.

It is watched either way. `drive-watch` reads it weekly and the board carries the
result, so whatever it does next is visible without anybody opening a folder.

## Also noticed

- **Board 267 may be scoped against files that are not in this tree.** It says
  Unit 1's teacher guides promise handouts that do not ship. There are no teacher
  guides anywhere in the teacher bundle's Unit 1: the 202 files are guided notes,
  slide decks, exercises and quizzes only. The sole guide-shaped documents in the
  whole bundle are the two `Course_Resources` pacing guides, and both are clean.
  Worth confirming what 267 is looking at before anyone works it.
- 3 `.DS_Store` files ship inside the preview tree, one at its root. None in the
  teacher bundle.
