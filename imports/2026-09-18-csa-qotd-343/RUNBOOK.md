# Board 343: 19 articles whose code block belonged to a different question

Matrixify Blog Posts, MERGE. 19 articles, one edit each: the question's code
block is replaced with the one the question is actually about.

`csa-qotd-343-ALL-NINETEEN-blog-posts.csv` carries all 19. The 19 single-article
sheets are here as the fallback, and the combined sheet is proved row for row
against them.

## Read this before importing: the recommendation changed

You were told the choice was between restoring each twin's code, which would
duplicate the question, and re-authoring 19 sets of options, which was the
recommendation. **The evidence reversed it.** Measured across all 19 pairs:

| | |
|---|---|
| explanation byte-identical to the twin's | 19 of 19 |
| code block different from the twin's | 19 of 19 |
| same four options and same answer | 19 of 19 (4 shuffled to other letters) |

Day 10's Why This Answer reads "the loop adds 1 + 2 + 3 + 4 = 10" and its Common
Mistake warns about `<= 4`, sitting directly under a code block that reads
`i <= 5`. Day 13 explains a running `sum` in code that contains no `sum`.

So the stem, the options, the key, the explanation, the Common Mistake and the AP
Exam Strategy are all one coherent question, and the code block is the single
piece that was swapped in. **Restoring it makes five sections right with one
edit and invents nothing.** Re-authoring would have meant rewriting five sections
per article to fit a program nobody intended to be there, and would have thrown
away the author's own explanation 19 times.

Nothing here is authored. Every replacement code block is the twin's, byte for
byte, and every one of the 19 is proved by running it.

## What it does not fix

After the restore each pair is the same question at two handles with the answers
shuffled. **That duplication is not created here** and the identical explanations
prove it predates the drift. It is the same shape as board 333 and stays a
separate decision.

## The 19, at a glance

| # | article | code it posted (wrong question) | code restored | prints | key |
|---|---|---|---|---|---|
| 1 | `day-10-iteration-accumulation` | `int sum = 0; for (int i = 1; i &lt;= 5; i++) { sum += i; } Sys` | `int total = 0; for (int i = 1; i &lt;= 4; i++) { total += i; }` | `10` | C |
| 2 | `day-11-iteration-nested-loop-count` | `int count = 0; for (int i = 0; i &lt; 3; i++) { for (int j = 0` | `int c = 0; for (int i = 0; i &lt; 3; i++) { for (int j = 1; j ` | `6` | B |
| 3 | `day-13-iteration-break` | `for (int i = 0; i &lt; 10; i++) { if (i == 5) { break; } Syste` | `int sum = 0; for (int i = 1; i &lt;= 5; i++) { if (i == 4) { b` | `6` | B |
| 4 | `day-14-iteration-selection-filtering` | `for (int i = 1; i &lt;= 10; i++) { if (i % 2 == 0) { System.ou` | `int sum = 0; for (int i = 1; i &lt;= 6; i++) { if (i % 2 != 0)` | `9` | D |
| 5 | `day-16-selection-if-else-if-boundary` | `int x = 10; if (x &lt; 10) { System.out.println("Less"); } els` | `int n = 0; if (n &gt;= 1) { System.out.print("A"); } else if (` | `B` | D |
| 6 | `day-19-iteration-while-loop-growth` | `int x = 1; while (x &lt; 100) { System.out.print(x + " "); x =` | `int x = 1; int steps = 0; while (x &lt; 20) { x *= 2; steps++;` | `5` | C |
| 7 | `day-20-iteration-accumulation` | `int val = 0; for (int i = 1; i &lt;= 5; i++) { val += i; } Sys` | `int s = 0; for (int i = 0; i &lt;= 4; i++) { s += i; } System.` | `10` | C |
| 8 | `day-21-iteration-break` | `for (int i = 0; i &lt; 10; i++) { if (i == 5) { break; } Syste` | `int sum = 0; for (int i = 1; i &lt;= 5; i++) { if (i == 3) { b` | `3` | A |
| 9 | `day-22-iteration-continue` | `for (int i = 0; i &lt; 5; i++) { if (i == 2) { continue; } Sys` | `int sum = 0; for (int i = 1; i &lt;= 5; i++) { if (i == 3) { c` | `12` | B |
| 10 | `day-23-iteration-while-loop-tracing` | `int x = 1; while (x &lt; 10) { System.out.print(x + " "); x = ` | `int x = 10; int c = 0; while (x &gt; 0) { x -= 4; c++; } Syste` | `3` | B |
| 11 | `day-24-iteration-nested-loop-count` | `int val = 0; for (int i = 0; i &lt; 3; i++) { for (int j = 0; ` | `int c = 0; for (int i = 0; i &lt; 2; i++) { for (int j = 0; j ` | `6` | C |
| 12 | `day-25-iteration-selection-nested-condition` | `for (int i = 1; i &lt;= 10; i++) { if (i % 2 == 0) { if (i % 3` | `int count = 0; for (int i = 1; i &lt;= 3; i++) { for (int j = ` | `3` | C |
| 13 | `day-26-iteration-break-in-nested-loops` | `for (int i = 0; i &lt; 3; i++) { for (int j = 0; j &lt; 3; j++` | `int c = 0; for (int i = 1; i &lt;= 3; i++) { for (int j = 1; j` | `3` | A |
| 14 | `day-27-iteration-selection-nested-filtering` | `for (int i = 1; i &lt;= 20; i++) { if (i % 2 == 0) { if (i % 5` | `int c = 0; for (int i = 1; i &lt;= 2; i++) { for (int j = 1; j` | `4` | D |
| 15 | `day-28-iteration-nested-loop-accumulation` | `int val = 0; for (int i = 1; i &lt;= 3; i++) { for (int j = 1;` | `int x = 0; for (int i = 1; i &lt;= 3; i++) { for (int j = 1; j` | `6` | C |
| 16 | `day-4-selection-nested-if-else` | `int x = 10; int y = 20; if (x &gt; 5) { if (y &gt; 15) { Syste` | `int x = 4; int y = 2; if (x &gt; 3) { if (y &gt; 3) { System.o` | `B` | B |
| 17 | `day-7-selection-two-separate-if-statements` | `int x = 10; if (x &gt; 5) { System.out.println("A"); } if (x &` | `int n = 12; if (n % 3 == 0) { System.out.print("X"); } if (n %` | `XY` | A |
| 18 | `day-8-iteration-for-loop-count` | `int count = 0; for (int i = 0; i &lt; 5; i++) { count++; } Sys` | `int count = 0; for (int i = 0; i &lt; 10; i += 3) { count++; }` | `4` | B |
| 19 | `day-9-iteration-while-loop-tracing` | `int x = 1; while (x &lt; 10) { System.out.print(x + " "); x = ` | `int x = 20; int y = 0; while (x &gt; 0) { x -= 6; y++; } Syste` | `4` | A |

Every row: the restored code prints the value in the `prints` column, and that is
the text of the option in the `key` column, which the article already keyed
before this repair. Nothing was re-keyed.

## Expected end state

```
npm run csa:qotdrederive <bodies>
```

All 19 move from `no-match` (or, for day 8, `mismatch`) to `agrees`. Before the
import they fail; there is no arrangement of answers a student could have picked
to be marked right.

Spot check one by eye: `unit-2-cycle-2-day-13-iteration-break` should show code
that sums 1, 2 and 3 then breaks at `i == 4`, four options 3 / 6 / 10 / 15, key
B, and an explanation that says "adds 1 + 2 + 3, then breaks when i reaches 4.
Sum is 6."

## Provenance

`config/csa-u2c2-restore.json` holds the twin code per article with a sha256 of
the twin body it came from. `npm run csa:u2c2data` rebuilds it and REFUSES any
row where running the twin code does not print the text of the option that
article already keys, so a wrong extraction cannot get into the data quietly.
