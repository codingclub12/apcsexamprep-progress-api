# 2026-09-15 The CSA question of the day was arguing with itself, and it was right

Board 327. Reported by Tanner: today's AP CSA question of the day leaks "AI logic"
when you select an answer.

## What today's question actually is

The CSA hub computes the current day by counting WEEKDAYS from an anchor of
2026-08-17, not calendar days:

```js
var ANCHOR = new Date('2026-08-17T00:00:00');
function todayG(){ ... while(cur<=t){ if(isWk(cur)) c++; ... } return c; }
```

Weekdays from 2026-08-17 through 2026-09-15 inclusive is 22, and global day 22 is
`ap-csa-u1-c1-day-22-math-random-range`. That is worth writing down because the
hub also lists a "Day 22" in each of the eight unit/cycle families, so picking one
by its slug finds the wrong page seven times out of eight.

## What the page served

The explanation is `display: none` until `checkAnswer()` runs, so this reaches a
student at exactly the moment they commit to an answer:

```
III: INCORRECT. Math.random() * 8 + 5 gives [5.0, 13.0). Cast to int gives 5-12,
which seems right. ... Actually this does produce 5-12... Wait. Let me recheck:
... This is actually correct too.
Correction: Both I and III produce values in the range 5-12. The answer should
evaluate III more carefully.
```

**The leak is not the defect, it is a confession of one.** The page keys `(A) I
only` and the correct answer is `(C) I and III only`. A student who worked it out
correctly and picked (C) got "Not quite."

## The leak is a map

lib/authoring-tells.js, new in this run, swept all 429 articles in
ap-csa-daily-practice. Nine carry a strict tell, and seven of the nine have a
broken item underneath it. Every key below was re-derived by compiling and running
the question's own code:

| article | what is wrong | was | is |
|---|---|---|---|
| u1-c1 day 22 math-random-range | III is also correct | key A | key C |
| u1-c1 day 15 chained-string | prints `VA PRA6`, not on the page at all | key B = `VA PR5` | option B = `VA PRA6` |
| u2-c2 day 4 loop-equivalence | (A) and (B) both print `0 3 6 9` | B duplicated A | B is `i <= 12` |
| u1-c2 day 7 error-method-calls | (B) and (C) are both compile errors | B was a second error | B compiles |
| unit-4 day 19 arraylist-shifting | the posted code works for every n | key B, premise false | stem uses `i++` |
| unit-4 day 25 selection-sort (x2) | stem sliced apart, grader compares a letter to an array string | every answer marked wrong | grader keys `'B'` |
| u1-c2 day 20 expression-evaluation | key correct, digression published | key D | key D |
| u1-c2 day 28 final-review | stray `&blank;` | | |

The day 25 twins are the worst of them and have nothing to do with authoring
voice. `var correctAnswer = '[1, 5, 8, 2, 9]'` is compared against
`selected.value`, which is "A" through "D", so **no answer can ever be correct**,
and the student is told the right answer is an array that is not among the four
options and is not the right answer either. One pass of selection sort on
`{5, 2, 8, 1, 9}` is `[1, 2, 8, 5, 9]`, which is option (B).

## Evidence

Nothing here is a report about a report.

- `smoke/csa-qotd-authoring-repair.js` compiles and runs every item on a real JVM
  and requires the repaired key to equal what Java did, tied to the keyed option's
  own text. 9 articles, 42 declared edits, 10 guard mutations. Green.
- `smoke/csa-qotd-authoring-tells.js` gives each of the 20 strict rules its own
  positive case and its own mutation: disable the rule and its case must go quiet.
  Nine negative cases of real teaching prose must stay quiet throughout. Green.
- Every anchor in the generator must match the live body exactly once, and
  `reverse()` must rebuild the live body byte for byte from the repaired one, so
  an edit cannot touch anything it did not declare.
- Every sheet is parsed back by a reader that did not write it and the Body HTML
  cell must equal the intended body byte for byte.
- `scripts/matrixify-preflight.js` clears all nine.
- `npm run verify:qotdauthoring` reads all nine off the live storefront. **It fails
  41 assertions right now**, which is the property that makes it worth running
  after the import.

## What is NOT done

The sheets are generated, validated and committed. **They are not imported.** That
is a click on a live body with no undo, and the runbook at
`imports/2026-09-15-csa-qotd-authoring/RUNBOOK.md` is ordered with the expected end
state per step. Day 22 is step 1 because it is today's question.

Four of the nine AUTHOR something rather than correct it: a new distractor on day 4
and day 7, a changed loop update on day 19, and a rebuilt option (A) on the day 25
twins. Those are marked in the runbook. Fixing a wrong key is a fact; choosing a
replacement distractor is a judgement, and judgements go in front of a person.

## Open

- **A wrong key does not need a leaked sentence to exist.** Nine articles were
  found because their author thought out loud. Day 15 is the warning: no option on
  it was correct, and the only thing that pointed at it was the word "wait". A
  correctness pass that RUNS all 429 items is a separate job and a much larger one.
  It is the only thing that would actually answer "is the question bank right".
- `unit-4-cycle-2-day-25-...` and `unit4-cycle2-day-25-...` are the same question
  at two handles, and after these sheets their bodies are byte-identical. Retiring
  one is a handle change, which is NEVER_AUTO.
- For the record and not for the page: in exact IEEE 754,
  `(int)(Math.random() * 8 + 5)` returns 13 on the single largest value
  `Math.random()` can return, `1 - 2^-53`, because `8 * (1 - 2^-53) + 5` rounds to
  exactly 13.0. One draw in about nine quadrillion. AP CSA holds the two forms
  equivalent and the student-facing text deliberately does not mention it. Written
  down so nobody rediscovers it and concludes the new key is wrong.

## What was learned

**A validator that reads its own output is not a validator.** Every one of these
nine pages carries an explanation that argues for its own answer, and on three of
them that explanation is the reason the key is wrong. The only check that could
settle it was the one that did not read the page: compile the code and run it.

**A report-only rule is worth more than a strict rule that has to be loosened.**
The first cut of the detector made "recheck" a hard rule and immediately flagged
`ap-csa-u4-c2-day-9-while-removal`, which says "re-check the same index since a new
element shifted in", which is exactly how you teach that pattern. One false
positive on a guard people have to keep green is how the guard gets switched off.
Both real occurrences were already caught by other rules, so the rule was demoted
and nothing was lost.

**The mutation half found a rule that could never fire.** `thinking-tag` looks for
`<thinking>` in a body, and `find()` was handing every rule the tag-stripped text,
so the tag was gone before the rule saw it. It read as a sensible rule, it sat in
the list, and it was dead. That is the same shape as the two hollow guards of
2026-09-02 and the third of 2026-09-03, and per-rule mutation is what catches it.

---

## Imported, same day

Tanner asked for the nine as one file, imported it, and said so. What the live
storefront says now:

```
npm run verify:qotdauthoring
  ok  ap-csa-u1-c1-day-22-math-random-range           7/7  4 nbsp -> plain space, board 292
  ok  ap-csa-u2-c2-day-4-iii-loop-equivalence         4/4  4 nbsp -> plain space, board 292
  ok  ap-csa-u1-c2-day-7-error-method-calls           4/4  4 nbsp -> plain space, board 292
  ok  ap-csa-u1-c1-day-15-chained-string-methods      5/5  4 nbsp -> plain space, board 292
  ok  ap-csa-u1-c2-day-20-iii-expression-evaluation   4/4  4 nbsp -> plain space, board 292
  ok  ap-csa-u1-c2-day-28-comprehensive-final-review  4/4  4 nbsp -> plain space, board 292
  ok  unit-4-day-19-arraylist-shifting                6/6  byte-identical to the sheet
  ok  unit-4-cycle-2-day-25-selection-sort-iteration  8/8  byte-identical to the sheet
  ok  unit4-cycle2-day-25-selection-sort-iteration    8/8  4 nbsp -> plain space, board 292

All 9 repaired articles are live and none of them talks to itself.
```

Today's question serves `var correct = 'C'` and reads `Answer: (C) I and III only`.

### The only deviation from the sheets, and it is board 292

Every live body was compared to the sheet that produced it, character by
character. Across all nine, the differences are 4 per article and every one of
them is the same substitution: `U+00A0` to `U+0020`. Zero differences of any
other kind.

That is the known Matrixify behaviour on board 292, and it is not caused by
anything in this run: the four non-breaking spaces sat between the option letter
and its text in the LIVE body before any of this, and the sheets carried them
through untouched. What a student sees change is the gap after `(A)` narrowing
from about two spaces to one, on the seven articles that had them.

Two articles had no non-breaking spaces and came back byte-identical, which is
the control: it rules out the substitution being something the extraction or the
comparison does on its own.

The twins are now byte-identical to each other, because those four characters
were the only thing left that distinguished them. Board 333.

### A verifier that was wrong, and what was done about it

The first run after the import reported day 19 as "not live yet". The import was
fine. The assertion was this:

```js
['trace is the i++ trace', 'size stays exactly 3 ahead of i forever']
```

and the repaired body breaks that sentence across a `</span>` and a newline, so
the needle could never match anything, on any import, ever. It read like a
sensible assertion and it sat in the list through a PR, a CI run and a merge.
**A wrong verifier is worse than no verifier**: it sends somebody to re-import a
page that is already correct.

Two changes, and the second is the one that matters:

- The primary assertion is now byte for byte against the sheet, with one named
  tolerance for board 292 and nothing else. That cannot be phrased wrongly.
- `smoke/csa-qotd-authoring-repair.js` now checks the checks offline. Every
  `must` needle has to be findable in the repaired body it describes AND absent
  from the pre-import one; every `mustNot` needle the reverse. Three mutations
  cover it, and the first one is the exact bug that shipped:

```
mutation 1  the original unmatchable needle
  FAIL  must-needle "trace is the i++ trace" is not in the repaired body,
        so it can never pass on a correct import
mutation 2  a must-needle that was already true before the repair
  FAIL  must-needle "key is C" was already in the body before the repair,
        so it asserts nothing
mutation 3  a mustNot that was never there to begin with
  FAIL  mustNot-needle "old key A" was not in the body before the repair
        either, so it asserts nothing
```

### What this cost and what it teaches

Nothing, this time, because the byte comparison was run before anyone acted on
the false report. It could easily have cost a second unreviewed MERGE over a
live body, which is the one thing the split-sheet rule exists to prevent.

The lesson is the one already written at the top of this file, turned back on
itself. The repair was careful to re-derive every answer key by running Java
rather than by reading the explanation. The verifier was not held to the same
standard: its needles were written by reading the diff and never run against the
case they describe. **A check is content too, and content gets verified.**
