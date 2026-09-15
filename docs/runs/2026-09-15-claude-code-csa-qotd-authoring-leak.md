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
