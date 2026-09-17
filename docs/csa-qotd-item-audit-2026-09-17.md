# Every AP CSA daily-practice answer key, checked by running the question

Board 332. 2026-09-17. All 429 articles in `ap-csa-daily-practice`.

**28 articles are broken. 21 of them cannot be answered correctly by any student.**

Every finding below was produced by compiling the question's own code and running
it, never by reading the explanation beside it. That distinction is the whole
point of this audit: the nine articles repaired on 2026-09-15 were found because
their author had thought out loud in the prose, and the run note for that pass
warned that a wrong key does not need a leaked sentence to exist. It does not.

## What was run

    scripts/csa-qotd-item-audit.js     where an item contradicts ITSELF
    scripts/csa-qotd-key-rederive.js   compile the snippet, run it, compare

`npm run csa:qotdaudit <bodies>` and `npm run csa:qotdrederive <bodies>`, over a
cache pulled through `lib/storefront-fetch.js`. 429 of 429 fetched, no errors.

## The measurement that decides how much each check is worth

Run the in-page contradiction checks against the nine bodies known to have been
broken on 2026-09-15. **They catch two.**

Day 22 keyed (A). Its heading said `Answer: (A) I only`. Its Why Not block
explained why (C) was wrong. Nothing on the page disagreed with anything else on
the page, and the answer was (C). **A silently wrong key is self-consistent by
definition**, so the cheap checks are a floor, not a ceiling, and a clean run of
them means only that the bank does not contradict itself.

That number is pinned in `smoke/csa-qotd-item-audit.js`. If it ever moves, the
suite goes red and somebody has to say which way.

## Coverage, stated honestly

| | |
|---|---|
| re-derived by running the code | 162 agree, 25 flagged |
| not applicable | 179, the stem does not ask what the program prints |
| not runnable | 63, mostly a class posted with no driver |

**The 63 not-runnable and the 179 not-applicable are not cleared.** They are
unjudged. A conceptual item ("which statement about inheritance is true") and a
`Player` class with no `main` cannot be settled by running anything, and this
audit says so rather than counting them as passes. That is the residue, and it is
the honest answer to "is the question bank right": 162 of 429 are now proved
right, 28 are proved wrong, and 239 are untested by this method.

---

# The findings

Repairs are boards **343** (the 19) and **344** (the mis-key, the five
two-right-answer items and the two duplicates). Nothing here is repaired yet.

## 1. Nineteen articles whose code no longer belongs to their question

`unit-2-cycle-2-day-*`, the hyphenated family. **Every one of the 19 has an
intact twin** at the un-hyphenated handle, and the twins are the giveaway:

| | `unit-2-cycle-2-day-10` | `unit2-cycle2-day-10` |
|---|---|---|
| code | sums 1 to **5** | sums 1 to **4** |
| options | 6, 9, 10, 11 | 6, 9, 10, 11 |
| key | C = "10" | C = "10" |
| prints | **15**, not an option | 10, correct |

25 of the 28 hyphenated articles carry different code from their twin while 22 of
them keep the twin's options and key byte for byte. So the code blocks were
replaced under the original options at some point, and the options and answer key
were left behind. The un-hyphenated twin is the coherent original in all 19 cases.

A student on any of these 19 pages is marked wrong whatever they pick:

    day 10  prints 15           options 6, 9, 10, 11
    day 13  prints 0 1 2 3 4    options 3, 6, 10, 15
    day 22  prints 0 1 3 4      options ... , keys B
    day 26  prints 1,0 2,0 2,1  options ... , keys A
    day 28  prints 36           options ... , keys C

plus days 11, 14, 16, 19, 20, 21, 23, 24, 25, 27, 4, 7, 9. Day 8 of the same
family is worse in one way and better in another: its output IS on the page, at
option C, and the page keys B.

**This is one defect, not nineteen**, and it should be repaired as one job. Two
shapes of fix, and the choice is a judgement:

- restore each twin's code, which makes the options and key right again but
  leaves two handles serving the same question, or
- re-author the options to match the code that is there, which keeps 19 distinct
  questions and is 19 small pieces of authoring.

The second is better for students and is more work. It is Tanner's call, and it
is now board 343.

## 2. One independent mis-key, and it is the concept the lesson is named for

`ap-csa-u1-c2-day-16-casting-precision-loss`

```java
double price = 19.99;
int cents = (int)(price * 100);     // 1998, not 1999
int dollars = cents / 100;          // 19
int leftover = cents % 100;         // 98
System.out.println("$" + dollars + "." + leftover);
```

Prints `$19.98`. The page keys **(A) `$19.99`**; the answer is **(B) `$19.98`**.

`19.99 * 100` is `1998.9999999999998` in a double, and the cast truncates. The
page keys the answer a student gets by ignoring precision loss, on the page that
exists to teach precision loss. This one has no twin, no leaked sentence and no
internal contradiction: only running it finds it.

## 3. Five articles where two options are both right

The program's output matches two options, so a student picking the unkeyed twin
is marked wrong for the correct answer.

    ap-csa-u2-c1-day-19-nested-loop-pattern              prints "* * * * * *"   A and C
    unit-4-cycle-2-day-20-arraylist-remove-with-wrapper  prints "[10, 30, 20]"  A and D
    unit-4-cycle-2-day-5-2d-array-initialization         prints "10"            A and D
    unit4-cycle2-day-20-arraylist-remove-with-wrapper    prints "[10, 30, 20]"  A and D
    unit4-cycle2-day-5-2d-array-initialization           prints "10"            A and D

## 4. Two more with duplicate options

`unit-4-cycle-2-day-26-arraylist-loop-adding` and its twin: options B and D both
read `6`.

## 5. One cosmetic

`ap-csa-u1-c1-day-13-string-concatenation-mixed` keys correctly. Its explanation
heading restates the answer as `7 sum sum 34` where the option reads
`7 val val 34`, because the variable was renamed in the option and not in the
heading.

---

# What this audit got wrong about itself first

Worth recording, because it nearly became the finding.

The first run reported **30 empty options and 24 duplicate pairs**. Almost all of
it was the parser's fault. It stripped a leading `A)` from every option, to drop
the letter the qotd template prints inline. On the selection items the options
**are** the letters, because the question is which letter the program prints:

    A) A          <- deleted to nothing
    B) Nothing
    C) C
    D) B          <- deleted to nothing, and now a duplicate of A

Anchoring the read per template took it to 0 empty and 7 duplicates, and all 7
are real, verified by hand against the stored markup. The 2026-09-15 run note
said a check is content too and gets verified; this is the same lesson arriving
from the other direction. `unit-2-cycle-2-day-2-selection-if-else-if` is pinned
in the suite as the regression case.

A second self-inflicted one: the first full run judged all 429 regardless of what
was being asked, so every conceptual item compiled, printed nothing, matched no
option and was reported as a lead. Sixty pages of noise around twenty-eight real
findings is how a report gets skimmed. The runner now refuses to judge a stem it
cannot classify.

---

# What is NOT claimed

- **239 articles are untested**, not passed. See the coverage table.
- Nothing here has been repaired. This is a measurement.
- The 63 not-runnable are mostly a class with no driver, which is a shape a
  future pass could handle by taking the call out of the stem prose. It would
  need to be as careful as this one about not guessing.
