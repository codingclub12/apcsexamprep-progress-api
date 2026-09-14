# The Predict first line comes out of the cyber quizzes

Board 324. 2026-09-14. Follow-on to board 319, same bundle, same tooling.

Tanner: remove the Predict first line from all of these documents, meaning the
five unit zips handed over on 2026-09-11.

206 lines removed from 27 documents, 22 lesson quizzes and 5 unit tests. All of
them are STUDENT copies; the KEYs never carried the line, so this brings the two
copies closer rather than pulling them apart.

## Four things say "Predict first" and only one is a line

This is the whole difficulty. "predict" appears 316 times in the bundle and most
are content: "consistent, predictable traffic patterns", an answer option about
predicting hardware failures, "their unpredictable rounds create time pressure".
A loose match eats answer options.

Of the real scaffolding, four shapes:

    206   Predict first: write your answer before reading the choices -> ______
          standalone paragraph between a stem and its options          REMOVED

     47   "Predict first" as a HEADING, owning a separate instruction
          paragraph under it                                            left
     14   "Step 1 - Predict first", a row in a numbered Step/What-to-do
          table whose Steps 2 to 4 would then be misnumbered            left
      2   "Predict First" in a Day 4 notes list headed "Use All Three
          Moves", which would then name two                             left

Only the first is a line. The other three are a heading with a body, a numbered
table row, and a member of a set with a stated size, and removing any of them is
a different edit with a visible consequence. Those went back to Tanner as a
question rather than being decided here.

The 2 in the Day 4 notes are outside the zips anyway: guided notes were never in
scope for board 319 and are not in the tree this ran against. `verify_predict.py`
reports that shape as 0 before and 0 after for that reason, not because it was
removed.

## Evidence

    suite      verify_predict.py, 714 checks, 0 failures
    rederive   python-docx over paragraphs AND table cells, sharing nothing with
               the stripper: target line 206 -> 0, any "predict first" 267 -> 61.
               61 is exactly 47 + 14, the two shapes deliberately spared.
               The board 319 re-derivation still reads 0 framework references,
               so this pass did not undo that one.
    mutation   mutate_predict.py, 6 defects injected one at a time, 6 caught by
               the check meant to catch them

The check worth naming is `only`: it asserts the surviving paragraphs equal the
original sequence MINUS the removed indexes, in order. Counting deletions would
pass a run that removed the right number of the wrong paragraphs. It is what
catches an off-by-one in the descending-index delete loop, and it caught three of
the six mutations as a side effect.

`spared` exists for the opposite failure: a greedier pattern would have taken the
exercise headings and the Step 1 rows, and a check that only counted the target
would call that a success.

## What changed in the tool

`docxedit.apply_edits` takes `new: None` to delete a paragraph outright. It
refuses to empty a table cell of its only paragraph, because Word treats that as
a corrupt document. Nothing here needed it, and if that ever changes the tool
says so instead of producing a file nobody can open.

## Still open

Nothing is fixed in Drive. Same wall as board 319: the connector writes a
`.docx` title and parent, not its content. The zips went to Tanner and supersede
the 2026-09-11 set.
