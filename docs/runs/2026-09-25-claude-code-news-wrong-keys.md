# Four news posts that marked the right answer wrong, and two more the sweep could not see

Board 429. Claude Code, 2026-09-25.

## What was asked

The board 425 sweep of `/blogs/news/` filed four practice questions whose key was
wrong. Tanner: "fix the wrong keys in 429 too."

## What was wrong, by page

Every key below was re-derived by running the page's own code, not by tracing it.

**`ap-csa-recursion-complete-guide`.** The sweep flagged Q3. Running all five
questions on the JVM found two more problems on the same page:

| Q | Before | Fix |
|---|---|---|
| 3 | `compute(5, 0)` returns 12 (C). Keyed B, headed "Why B (11) is correct"; the trace ends "12... wait!" | Key and header to C (12). The two self-correcting paragraphs become one explanation |
| 2 | The base case is `return s;`, so `mystery("hello", 0)` returns "hellohello" and all three statements are false. No option was right | The base case returns `""`. That is the method the explanation describes ("effectively `s.substring(k)`"), and it makes the existing key C true |
| 4 | Keyed C is the right diagnosis, but it ended "may produce a wrong answer for some non-palindromes". Across all 1,093 strings over {a, b, c} up to length 6, the method is wrong on 60 palindromes and never on a non-palindrome. The explanation shows this with "abba", right after "Actually this example works." | C now says "returns false for some palindromes, such as abba"; the explanation says it once |
| 1 | Key right. Its option said 7s above the ones place are "never counted", but `countSevens(70)` counts one | The option now says what the method does: once it finds a 7 it returns 1 |

Q5 was right and is untouched.

**`ap-csp-day-29-list-mutation-and-aliasing`, and its twin `-aliasing`.** Keyed D
(99), and every paragraph taught that list assignment makes an alias. The CSP Exam
Reference Sheet, in the CED appendix: "aList <- bList: Assigns a copy of the list bList
to the list aList." So listA[2] is still 20 (B). The explanation, the three distractor
notes, the common mistake and the exam tip are rewritten around the copy rule. The
Python and JavaScript habit it replaces is now named as the mistake.

**`unit-2-cycle-2-day-20`.** The loop prints 10. The options were 11, 9, 14 and 8,
keyed B (9), and the published explanation said "I think the answer key might be
wrong" before settling on 9. B now reads 10, so the grader's key is unchanged. The
distractor notes were false as well ("11 would be the count if you forgot to exclude
..." is 13). So the distractors are replaced, the way board 344 did it, with values
that come from real mistakes: 13 drops the `% 5` filter; 3 reads `!=` as `==`; 9
misses 48, which is the endpoint slip the page's own tip warns about. **The new
distractors are authored content**, drawn from the page's own Common Mistake and tip.
They are the one part of this repair a teacher may want to reword.

Copies elsewhere were checked. The CSP daily-practice Day 29 is now a fault
tolerance question. The CSA daily-practice Day 20 is a different question, and its
old `unit-2-cycle-2-day-20` handle redirects to a study guide. The two Java aliasing
posts are correct, because Java references do alias. Only these four URLs carried
these keys.

## Why the sweep saw only one of the recursion guide's three

Its key check asks whether the grader, the printed label and the explanation AGREE.
Q2 agreed with itself perfectly and was false throughout. Q4's key and label agreed;
only running the method shows its option describes the wrong failure. The report
already lists this blind spot ("A consistent wrong key... gets through"). Here it
cost two questions on the one page that was supposed to be fixed.

## How the key is re-derived

`smoke/news-wrong-keys-repair.js` pulls each question's code out of the repaired page
and runs it: `javac` through `scripts/csa-qotd-key-rederive.js` for the Java, and
`lib/csp-pseudocode.js` for Day 29.

- A value question matches the output to an option.
- An I/II/III question evaluates each statement and matches the set.
- A which-describes-the-error question applies the fix each option implies, and asks
  whether the method then agrees with a reference implementation on every input tried
  (0 to 3,000 for `countSevens`, every string up to length 6 for `isPalindrome`).

The keyed diagnosis must be the only one whose fix works. The claims at each option
position are pinned, so a reordered question fails instead of being judged against
the wrong claim.

`lib/csp-pseudocode.js` is the interpreter written for board 425, moved out of that
suite so both can use it. The board 425 gate's interpreter mutation followed it and
still goes red.

## Two guards that changed during the build

- The length floor refused day 20: removing the monologue takes the page to 0.876 of
  its length. Lowering the floor page-wide would have weakened it everywhere. Instead
  it is lowered for that page only, with the measurement in a comment, and a sharper
  guard now covers every page: no single edit may replace more than 1,500 characters.
  The largest intended span is 1,164, so a lazy match that runs past its end anchor is
  refused. The byte-exact reverse cannot catch that, because the span is declared.
- "non-palindromes." was first refused page-wide and fired on a correct sentence in
  Q4's own "Why Not the Others". The rule now reads the option.

## Evidence

Live, before any import, `node scripts/verify-news-wrong-keys-live.js --browser`:

    3 ok, 13 failed
    recursion guide: the grader accepts 4 of 5 right answers (q3 C: "Not quite. The correct answer is B.")
    day 29, both handles: 0 of 1 (answer B: "Not quite. The correct answer is D.")

Of the 3 ok, two are the day 29 pages carrying no self-correction. The third is the
day 20 grader, which already keyed B; what was wrong there was B's value.

`--simulate-import --browser`, each sheet body spliced into its live page: 16 ok, 0
failed, including every grader accepting every right answer. It exits 3 by design.

`node scripts/deploy-gate.js deploy-gates/2026-09-25-news-wrong-keys.json --pre`:
two suites (51 and 56 passed), the rebuild from the four live articles, and six
mutations, each red on the assertion it names.

## Import runbook

1. Run `node scripts/verify-news-wrong-keys-live.js` first. It must be RED. If a page
   already passes, it was fixed another way and its row is stale.
2. Import `imports/2026-09-25-news-wrong-keys/news-wrong-keys-repair-blog-posts.csv`
   in Matrixify. Four rows, all in the news blog, MERGE, Body HTML only.
3. Run `node scripts/verify-news-wrong-keys-live.js --browser`. Expected: 16 ok and
   "OK - the board 429 repairs are live".
4. Run the gate without `--pre`.

If the import damages a page, the ROLLBACK sheet puts back today's bodies.

## Still open

- `ap-csa-searching-sorting` Q1 is reported keyed wrong behind a dead script. That is
  board 430 and was not touched here.
- The day 20 page's Previous and Next links point at retired daily-practice handles
  that 301 to a study guide.
