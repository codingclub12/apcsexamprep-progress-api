# AP CSA daily practice: nine articles that published their author's thinking

Matrixify Blog Posts, MERGE. Two shapes of the same nine repairs, pick one.

## One file (what Tanner asked for)

`csa-qotd-repair-ALL-NINE-blog-posts.csv` carries all nine rows, 139 KB, in the
order of the steps below. Import it once and run the check once.

Know what you are clicking: MERGE overwrites a live body with no undo, so one
import rewrites nine live article bodies at once with nothing to check in
between. That is the whole reason this repo normally splits a sheet by unit. The
nine single-article files are still here, so if a row looks wrong you can go back
to the split version rather than unpicking a nine-page import.

The combination is proved rather than assumed: `npm run smoke:qotdrepair` parses
the combined file and all nine single files back with a reader that wrote
neither, and requires the same nine handles with byte-identical bodies, none
dropped and none repeated. Six mutations cover the ways that could go wrong, and
hollowing the guard turns all six red.

Day 22 is row 1 on purpose. If an import only gets partway, today's question is
the row that landed.

## Nine files (the fallback)

One article each. Import in the order below and run the check after each one.
Slower, but the blast radius of a click is one page.

## What this fixes

Reported 2026-09-15: today's AP CSA question of the day argued with itself as soon
as a student pressed Check Answer.

```
III: INCORRECT. ... Cast to int gives 5-12, which seems right. ... Actually this
does produce 5-12... Wait. Let me recheck: ... This is actually correct too.
Correction: Both I and III produce values in the range 5-12. The answer should
evaluate III more carefully.
```

That passage was right. The page keys **(A)** and the correct answer is **(C)**, so a
student who picked the right answer was told they were wrong.

Sweeping all 429 articles found nine in that state, and **seven of the nine have a
broken item underneath the leaked sentence.** Every answer below was re-derived by
compiling and running the question's own code, never by reading the explanation
next to it, because the explanation is the thing that was wrong.

## Steps

These are also the rows of the combined sheet, in order.

Importing one at a time: import the file, then run

```
npm run verify:qotdauthoring
```

which reads all nine off the live storefront. Expect that article's line to go to
full marks and the rest to stay short until you get to them. All nine at the end.

Importing the combined sheet: run that command once afterwards and expect all
nine at full marks in one go.

### 1. ap-csa-u1-c1-day-22-math-random-range  (today's question, do this one first)

`csa-qotd-repair-ap-csa-u1-c1-day-22-math-random-range-blog-posts.csv`

Key **A to C**. `(int)(Math.random() * 8 + 5)` produces 5 through 12, same as
`(int)(Math.random() * 8) + 5`, so expression III is correct and the answer is
"I and III only". The III paragraph and the Why Not block are rewritten.

Expected after: the page serves `var correct = 'C'`, the heading reads
`Answer: (C) I and III only`, and the word "Correction:" is gone.

### 2. unit-4-day-19-arraylist-shifting  **authored**

`csa-qotd-repair-unit-4-day-19-arraylist-shifting-blog-posts.csv`

The stem said the method does NOT work as intended. It worked. With `i += 2`, i
gains on size by one per pass, so the loop inserts exactly once per original
element and produces `[X, A, X, B, X, C]`, which is answer (A), which the page
listed as a mistake. Keyed answer was (B) infinite loop.

**The repair changes the code in the question**: `i += 2` becomes `i++`, which
genuinely never terminates. That keeps the keyed answer, the difficulty, the focus
badge and the AP skill, and makes the stem's claim true. The alternative was
re-keying to (A) and rewriting the Key Concept, the Common Mistakes and the Tip,
which would have thrown away what the item teaches. **This is the one to read
before importing.**

Expected after: the stem shows `i < list.size(); i++)`, the trace is a clean i++
trace, and "NOT infinite" and "let me reconsider" are gone.

### 3. ap-csa-u1-c1-day-15-chained-string-methods

`csa-qotd-repair-ap-csa-u1-c1-day-15-chained-string-methods-blog-posts.csv`

Key stays (B), but (B) was wrong. `"JAVA PRACTICE".substring(2, 8)` is `"VA PRA"`,
six characters, so the program prints `VA PRA6`. The page keyed `VA PR5`, and
`VA PRA6` was not on the page at all, so **no option was correct**. Option (B)
becomes `VA PRA6`; (A) `VA PRA7` stays as the length-error distractor. The trace,
both `&blank;` artifacts and three Why Not entries are rewritten.

Expected after: option B reads `VA PRA6`, heading reads `Answer: (B) VA PRA6`,
`VA PR5` is gone.

### 4. ap-csa-u2-c2-day-4-iii-loop-equivalence  **authored**

`csa-qotd-repair-ap-csa-u2-c2-day-4-iii-loop-equivalence-blog-posts.csv`

Both (A) and (B) printed `0 3 6 9`, so the item had two right answers and the
explanation admitted it. **New distractor**: (B) becomes `i <= 12`, which prints
`0 3 6 9 12`. Key stays (A).

Expected after: option B reads `i &lt;= 12`, and the Why Not (B) entry explains
the 12.

### 5. ap-csa-u1-c2-day-7-error-method-calls  **authored**

`csa-qotd-repair-ap-csa-u1-c2-day-7-error-method-calls-blog-posts.csv`

Both (B) and (C) were compile errors. javac confirms both. **New distractor**: (B)
becomes `c.display("Sum: " + c.add(3, 4));`, which compiles, so (C) is the only
error. Key stays (C). The paragraph beginning "Wait - both (B) and (C) have
errors" is deleted.

Expected after: option B reads `c.display("Sum: " + c.add(3, 4));`.

### 6. unit-4-cycle-2-day-25-selection-sort-iteration  **authored**

`csa-qotd-repair-unit-4-cycle-2-day-25-selection-sort-iteration-blog-posts.csv`

Triple broken, and none of it was the author's thinking. Some earlier pipeline
sliced the stem apart: the array the question is about ended up as option (A)
inside a markdown code fence, the code block held the trailing half of the
question sentence, "Why This Answer?" held a bare letter A, and the explanation
and the mistake were sitting in each other's boxes. On top of that the grader
compares the radio VALUE ("A" to "D") against the string `[1, 5, 8, 2, 9]`, so
**every answer is marked wrong** and the student is told the correct answer is a
fifth thing that is not on the page and is not right either.

One pass of selection sort on `{5, 2, 8, 1, 9}` gives `[1, 2, 8, 5, 9]`, which is
option (B). **New distractor**: (A) becomes `[1, 2, 5, 8, 9]`, the fully sorted
array.

Expected after: the code block holds `int[] arr = {5, 2, 8, 1, 9};`, option A is
an array, the grader keys `'B'`, and no backticks survive.

### 7. unit4-cycle2-day-25-selection-sort-iteration  **authored**

`csa-qotd-repair-unit4-cycle2-day-25-selection-sort-iteration-blog-posts.csv`

Same defect, same repair. This is a near-duplicate of step 6 that is separately
published; see the open item at the bottom.

### 8. ap-csa-u1-c2-day-20-iii-expression-evaluation

`csa-qotd-repair-ap-csa-u1-c2-day-20-iii-expression-evaluation-blog-posts.csv`

**Key (D) is correct.** Cosmetic only: statement I's paragraph carried a "Wait, but
we proved earlier that..." digression. Rewritten to make the same point cleanly.

### 9. ap-csa-u1-c2-day-28-comprehensive-final-review

`csa-qotd-repair-ap-csa-u1-c2-day-28-comprehensive-final-review-blog-posts.csv`

**Key is fine.** One stray `&blank;` rendering as literal text in an index listing.
Six bytes.

## Expected end state

```
npm run verify:qotdauthoring
```

All nine articles at full marks, with the line

```
All 9 repaired articles are live and none of them talks to itself.
```

Before any import, that same command fails 41 assertions. That is the point: every
assertion in it was false this morning, so a green run cannot be a green run
against a page that never changed.

## Still open after these nine

- **A wrong answer key does not need a leaked sentence to exist.** These nine were
  found because their author said something out loud. Day 15 is the warning: its
  key was wrong AND it leaked, and nothing but the leak pointed at it. A
  correctness pass over all 429 items, running each one, is a separate and much
  larger job.
- **Steps 6 and 7 are the same question published at two handles.** Retiring one
  is a handle change, which is on the NEVER_AUTO list and is Tanner's call.
- **Day 22, for the record and not for the page.** In exact IEEE 754 arithmetic,
  `(int)(Math.random() * 8 + 5)` returns 13 on the single largest value
  `Math.random()` can produce, `1 - 2^-53`, because `8 * (1 - 2^-53) + 5` rounds to
  exactly 13.0. One draw in about nine quadrillion. It is not what AP CSA tests,
  every AP treatment holds the two forms equivalent, and the student-facing text
  deliberately does not mention it. Noted here so nobody rediscovers it and
  concludes the new key is wrong.
