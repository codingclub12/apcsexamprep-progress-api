# Board 343: the code block was the drifted half, not the options

2026-09-18. 19 `unit-2-cycle-2-day-*` articles in `ap-csa-daily-practice` posted a
program their question was not about. Day 10 sums 1 to 5 and prints 15 while its
four options are 6, 9, 10 and 11, so there was no answer a student could pick and
be marked right. The other 18 are the same shape.

## What changed

PR [#719](https://github.com/codingclub12/apcsexamprep-progress-api/pull/719).
Nothing is authored. Every replacement is the twin article's code block byte for
byte, and no article was re-keyed.

| | |
|---|---|
| `config/csa-u2c2-restore.json` | the twin code per article, with a sha256 of the twin body it came from |
| `scripts/csa-u2c2-build-restore.js` | builds it, and refuses a row where running the twin code does not print the text of the option that article already keys |
| `scripts/csa-qotd-u2c2-repair.js` | the sheet generator, one edit per article |
| `scripts/verify-csa-u2c2-live.js` | the live check, and it runs BEFORE the import as well as after |
| `smoke/csa-qotd-u2c2-repair.js` | the offline suite |
| `imports/2026-09-18-csa-qotd-343/` | 19 single-article sheets, one combined sheet, a runbook |

## The recommendation I gave twice was wrong, and measuring reversed it

I advised re-authoring 19 sets of options to match the posted code, reasoning that
restoring the twin's code would duplicate the twin's question. Reading the
explanations settles it the other way:

| | |
|---|---|
| explanation byte-identical to the twin's | 19 of 19 |
| code block different from the twin's | 19 of 19 |
| same four options and same answer | 19 of 19, 4 shuffled to other letters |

Day 10's Why This Answer reads "the loop adds 1 + 2 + 3 + 4 = 10" and its Common
Mistake warns about `<= 4`, sitting directly under code that reads `i <= 5`. Day
13 explains a running `sum` in code containing no `sum`. So the stem, the options,
the key, the explanation, the Common Mistake and the AP Exam Strategy are one
coherent question and the code block is the single piece that was swapped in.
Restoring it makes five sections right with one edit. Re-authoring would have
rewritten five sections per article to fit a program nobody intended, nineteen
times, and thrown away the author's own explanation each time.

The duplication objection evaporated with the same measurement: identical
explanations prove the pairs were always the same question, so restoring creates
no duplication that did not already exist. That is board 333 and stays separate.

## Evidence

- `npm run smoke:u2c2`: all 19 fail agreement before the repair and agree on their
  keyed letter after it, on a real JVM, per article rather than sampled.
- The day 10 case is pinned as the evidence for which half drifted. If its
  explanation stops saying `1 + 2 + 3 + 4 = 10`, or its posted code stops reading
  `i <= 5`, CI says so and the argument above needs re-measuring.
- Only the code may move. A repair touching the key, the options or the
  explanation is refused. Four of the 19 carry the twin's options in a different
  ORDER, so an edit that tidied them would have silently broken four correct keys.
- 20 committed sheets regenerate byte-identically from bodies fetched live at
  14:31 UTC, so the sheet is current against the storefront.
- `node scripts/verify-csa-u2c2-live.js` reads 19 pending, 0 imported, 0 drifted.

## The live check runs before the import, and that is the point

`scripts/verify-csa-u2c2-live.js` takes no flag for which side of the import it is
on, because a flag can be set wrong. It derives one of three states per article:
`pending` (the live body is still the one the sheet was built from, and
regenerating off it reproduces the committed sheet byte for byte), `imported` (the
live body IS the sheet), or `drifted` (neither, so the sheet is stale and
importing it would MERGE an old body over a newer one).

`drifted` is the whole reason the file exists. On 2026-09-08 a Command Center
sheet sat unimported for a day while that page was renumbered onto CED lesson ids;
the sheet still applied cleanly, and importing it would have reverted the better
fix with nothing anywhere saying so. MERGE has no undo.

So the mutation that matters is the one leaving the anchor intact and changing the
page anyway. Three drift mutations are asserted, and hollowing `classify` turns
the suite red on exactly the assertions it should: suppressing the
applies-but-does-not-reproduce verdict reds the two anchor-intact cases and
nothing else, and swallowing a broken anchor reds the one anchor-breaking case and
nothing else.

## One number in CLAUDE.md looks stale, on one measurement

CLAUDE.md says the Railway deploy takes "about 55 seconds" against a CI suite of
about 4.5 minutes, and builds the case for gating before the merge on that gap.
Timed on this merge: merged 15:00:20 UTC, `/api/health` first reported 330d731 at
15:04:50. Four minutes thirty, not fifty-five seconds. CI on the same head ran
14:52:02 to 14:59:36, about seven and a half minutes.

That is one measurement against theirs, which was taken across runs 80 to 82 and
1024 to 1028 and called structural, so it is not enough to overwrite the figure
and this run note is deliberately the only place it is written down. What it is
enough for is to tell the next session to re-time it rather than trust the number.

The CONCLUSION is untouched either way: the deploy still starts before the suite
finishes, so a gate before the merge is still the only point that beats the race.
The gap narrowed from roughly four minutes to three; it did not close or reverse.

## Still open

- **The 19 pages are unchanged until Tanner imports.** The sheets are generated
  and validated, not imported. Run `node scripts/verify-csa-u2c2-live.js` again
  immediately before importing: if it reads anything other than 19 pending, the
  sheet is stale and must be regenerated off current live bodies first.
- Board 333. After the restore every `unit-2-cycle-2` pair is the same question at
  two handles with the answers shuffled. That predates this repair and is a handle
  decision rather than a content one.
- The 239 items the board 332 audit could not judge (conceptual stems, or classes
  with no driver) are still named rather than counted as passes.

## What this run cost, and the lesson it repeats

Three checkers were wrong before any content was. My first live fetcher asked
`/pages/<handle>.json` for blog articles and got 19 404s; the second read
`r.status` where the module returns `r.code` and got 19 undefineds. Either one,
reported without looking, would have read as "19 articles are gone". The third was
the earlier session's needle that spanned a `</span>`.

That is now three sessions running where the tool was broken before the thing it
measured. The habit that catches it every time is the same: when a check reports
that everything is wrong, suspect the check first.
