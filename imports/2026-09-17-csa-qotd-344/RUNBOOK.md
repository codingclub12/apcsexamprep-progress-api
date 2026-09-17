# Board 344: one wrong answer key, three pairs of identical options, one misquote

Matrixify Blog Posts, MERGE. Eight articles.

## One file

`csa-qotd-344-ALL-EIGHT-blog-posts.csv`, eight rows. Import once, then run

```
npm run csa:qotdrederive <bodies>
```

The eight single-article sheets are here too as the fallback. The combined sheet
is proved row for row against them: same eight handles, byte-identical bodies,
none dropped, none repeated.

## The one that matters, and it is first

### 1. ap-csa-u1-c2-day-16-casting-precision-loss   KEY A to B

```java
double price = 19.99;
int cents = (int)(price * 100);     // 1998, not 1999
System.out.println("$" + cents / 100 + "." + cents % 100);
```

`19.99 * 100` is **`1998.9999999999998`**. Measured on the JVM, not reasoned
about. The cast truncates to 1998, so the program prints **`$19.98`**, which is
option (B). The page keys (A) `$19.99`.

What makes this worth reading rather than just importing: **the explanation
already knew.** It said

> "In some cases, floating-point imprecision could make `19.99 * 100` evaluate to
> `1998.9999...`, which would cast to 1998 and produce `$19.98`. This is a
> real-world concern but the AP exam typically assumes exact arithmetic for
> simple cases like this."

Three things wrong with that, on a page called casting-precision-loss whose
section reference is "Casting and Ranges":

- it is not "in some cases". IEEE 754 is deterministic and it is that value every
  time, on every JVM;
- the stem asks what is printed "as a result of executing the code segment",
  which is a question about what Java does;
- AP CSA teaches double imprecision rather than assuming it away.

The trace, the Why Not block and the Common Mistake box are rewritten so the
precision loss is the answer instead of a footnote apologising for itself.

Expected after: the page serves `var correct = 'B'`, the heading reads
`Answer: (B) $19.98`, and the phrase "assumes exact arithmetic" is gone.

## Three questions with two identical options, at two handles each  AUTHORED

A student who picked the unkeyed twin was marked wrong for an answer that reads
identically to the right one. Each replacement is drawn from the misconception
that article's own Common Mistake box names and does not already have an option.
**These six are the authored ones: read them before importing.**

### 2 and 3. day-20-arraylist-remove-with-wrapper

`remove(1)` removes index 1, so the list becomes `[10, 30, 20]`, which is (D).
Option (A) read the same thing. It becomes **`[10, 20, 30]`**: what you get if
you remove the trailing duplicate instead of the element at index 1.

### 4 and 5. day-5-2d-array-initialization

12 cells, 2 assigned, so 10 are still zero, which is (D). Option (A) read the
same thing. It becomes **`2`**: counting the cells that were SET rather than the
ones that were not.

### 6 and 7. day-26-arraylist-loop-adding

3 elements plus 3 appends is 6, which is (D). Java confirms the final size is 6.
Option (B) read the same thing. It becomes **`12`**: where you land if you
believe the loop re-reads the growing size.

## One cosmetic

### 8. ap-csa-u1-c1-day-13-string-concatenation-mixed

Keys correctly. The heading restated the answer as `7 sum / sum 34` where the
option reads `7 val / val 34`, because the variable was renamed in the option and
not in the heading. Six characters.

## Expected end state

Every one of the eight has four distinct options and keys the one the program
actually produces. After the import:

```
npm run csa:qotdaudit <bodies>     0 contradictions across the eight
npm run csa:qotdrederive <bodies>  6 agree, 2 not-applicable
```

The two `not-applicable` are the day 26 twins, whose stem asks for a final SIZE
rather than for output, so the re-deriver cannot classify them. That is not a
gap in the repair: `npm run smoke:qotd344` compiles and runs that exact list and
asserts the size is 6 and that the keyed option reads 6.

## Not in this pass

The 19 `unit-2-cycle-2-day-*` articles whose code does not belong to their
options are board 343 and need a decision first.
