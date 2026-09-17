# The AP CSA past-paper FRQ pages

There are two different page sets in this repo with "FRQ" in the name, and
confusing them wastes a session.

| set | handles | count | built by |
|---|---|---|---|
| lesson FRQ practice | `ap-csa-lesson-{U}-{L}-{slug}-frq` | 53 | `lib/csa-frq-pages.js`, see `docs/csa-frq.md` |
| past-paper archive | `ap-csa-{YEAR}-frq-{N}[-{slug}]` | 90 | hand-authored, except 2026 |

This document is about the second one. The lesson pages are auto-graded items
with hidden test cases; the archive pages are worked solutions to real College
Board questions and nothing on them is graded.

## What is generated and what is not

`config/csa-frq-2026.json` plus `lib/csa-past-frq-pages.js` build the five 2026
pages: four questions and the year index. **Everything from 2004 to 2025 is
hand-authored in Shopify and has no generator.** That asymmetry is deliberate
for now. Retro-fitting a generator over 86 indexed pages means regenerating
bodies that rank, and the failure mode of getting it wrong is 86 live pages at
once.

## What hand-authoring 86 pages produced

Measured 2026-09-17 against live bodies pulled through `lib/storefront-fetch.js`,
not against titles and not against a report. `docs/reports/2026-09-17-csa-frq-audit.md`
carries the full findings and the method. The short version is the argument for
the generator:

    4 page formats      8KB, 12KB, 26KB and 62KB, grouped by the year they were built
    16 mangled titles   "Ap Csa 2022 Frq 1 Game", acronyms lowercased by a slug-to-title pass
    11 stub solutions   Marine Biology and GridWorld questions whose whole solution is a
                        comment saying the case study was withdrawn, under a title that
                        promises a Complete Solution
     6 contradictions   a Curriculum Alignment naming one unit beside a Study This Topic
                        link naming a different one, on the same page
     1 invalid JSON-LD  2016 FRQ 3, live today
    74 pages            still print "Points: 9" with no note that 2026 changed it

None of that is carelessness. It is what hand-authoring a structurally identical
page set produces over eight months, which is why the house rule is canonical
data plus a generator plus a validator plus a sheet, and why five pages is
already well over the line.

## 2026 changed the scoring, and that is the whole reason this set exists

Every free-response question from 2004 through 2025 was worth 9 points and the
section was 36. 2026 is the first exam under the four-unit course and the
section was rebuilt with it:

| question | type | 2026 | 2004-2025 |
|---|---|---|---|
| 1 | Methods and Control Structures | 7, split 4 and 3 | 9 |
| 2 | Class Design | 7 | 9 |
| 3 | Data Analysis with ArrayList | 5 | 9 |
| 4 | 2D Array | 6 | 9 |
| **section** | | **25** | **36** |

Section I is now 42 multiple-choice questions at 55% and Section II is 45%.
Only question 1 has parts.

So a page that prints `Points: 9` on a 2026 question is not a stale detail. It
is a wrong denominator on a tool a student self-grades against, and
`scripts/csa-past-frq-pages-csv.js` refuses to write a sheet carrying one.

## The parts

```
config/csa-frq-2026.json          the content: questions, rubrics, solutions, FAQ
lib/csa-past-frq-pages.js         renders four question pages and the year index
scripts/verify-csa-2026-frq.js    compiles and RUNS every solution, plus mutants
scripts/csa-past-frq-pages-csv.js the Matrixify sheet, and the rules that gate it
smoke/csa-past-frq-pages.js       npm run smoke:csa2026frq
```

Adding a year is a second JSON file and a `year` switch. Nothing else changes.

## The solutions are College Board's, and they are RUN rather than read

`scripts/verify-csa-2026-frq.js` compiles every model and alternate solution
with real `javac` and runs it against the examples **the question itself
states**: the two username cases for Q1, the six rows of the Bottle table for
Q2, the worked roster for Q3, the two `getPointsForRow` calls for Q4. No
expected value is hand-asserted anywhere.

It earned its place immediately. The scoring guidelines extract carried an
EN DASH where `j - 1` belongs in one of the Q1 alternates, because that is what
PDF text extraction does to a minus sign. A file nobody executes would have
shipped that to a student as an answer key.

Two invariants ride along in the expected output and are worth knowing about,
because they look like padding and are not:

- Q1 prints `username` again after part B. The postcondition says `username` is
  unchanged, and rubric criterion B3 refuses the algorithm point to a response
  that modifies it. A solution that loops with `username = username.substring(...)`
  returns the right string and fails the rubric, and only that fourth line
  catches it.
- Q3 prints both list sizes. The postcondition says both lists are unchanged,
  and criterion 5 refuses the point to a response that modifies either.

## Mutation, and why a green mutation run is a failure

`--mutate` applies one named wrong edit per question and requires the run to go
red. All four are semantic rather than syntactic on purpose: a mutant that fails
to COMPILE proves the compiler works, not that the harness measures the answer.

    Q1  part B cuts only the hyphen and leaves the letter before it
    Q2  the refill threshold uses <= so a bottle at exactly 25 percent refills
    Q3  the absence comparison uses >= rather than >
    Q4  the row sum is taken down a column instead of across a row

The Q2 mutant is the one to keep. Nothing in College Board's sample table lands
on the 25 percent boundary, so `<=` produces correct output on every row the
question shows you. It is caught here only because the harness runs the
shampoo bottle, whose second call sits exactly on 10 of 40.

`smoke/csa-past-frq-pages.js` does the same thing to the twenty sheet rules,
and asserts on the MESSAGE rather than on the count: a mutation that goes red
for some other rule is telling you the rule you meant to test is hollow. Two
controls sit beside them, and the second one earned its place too: the wrapper
rule used to demand `<div id="...">` byte for byte and went red on an extra
space.

## The page format, and the three things changed from it

The archive's best pages, 2023 to 2025, run on what their own body comment calls
the "FRQ Holy Grail Template v2.5": embedded College Board PDF, a per-part
editor with no Run button because Bluebook has none, a self-grade call to action,
and behind it a reveal panel ordered recap, solution, rubric, mistakes. Three
JSON-LD blocks. That structure is kept, down to the CSS and the editor script,
which are lifted unchanged so the 2026 pages look like the archive rather than
like a new thing bolted on.

Three deliberate departures:

1. **The given code is printed as text.** The archive embeds the PDF and stops,
   which means the question exists on the page only as pixels: a screen reader
   cannot reach it and a search engine cannot index it. The PDF stays, because
   it is what the student sees in Bluebook, and the class skeleton is printed
   beside it.
2. **The 2026 callout points the other way.** On an archive page the callout
   warns that 2026 changed the scoring. On a 2026 page that warning is backwards;
   the reader who needs help is the one who practised on the archive. So it
   prints the whole point table instead, which is the fact a student cannot get
   from the question.
3. **The pacing note says what 22 minutes is.** It is a quarter of a 90-minute
   section, not a College Board instruction, and the questions are no longer
   worth the same. The archive prints `22:00` as though it came from the exam.

One thing is removed rather than changed. The live 2023 to 2025 bodies open with
a 6.5KB HTML comment headed `REPLACE THESE TOKENS THROUGHOUT`, listing the
template's own authoring instructions and its version history. It is invisible
to a reader and it is published on twelve public pages. The generated pages
carry a four-line note saying where the content came from and that hand-editing
the body in Shopify will be overwritten.

## Shipping it

```
npm run csa:2026frq                                    run the Java, with mutants
npm run smoke:csa2026frq                               the offline suite
node scripts/csa-past-frq-pages-csv.js imports/YYYY-MM-DD/csa-2026-frq-pages.csv
```

The sheet is MERGE, past-dated, BOM plus CRLF, every cell quoted, and the file
name must contain `pages` or Matrixify rejects the whole file in one second with
no per-row detail. The generator refuses to write a name it would reject.

Five pages is one import. The house rule is one import per unit or section, and
a question set with its own index is the smallest honest unit here.

**After importing, check the thing that matters rather than the thing that is
easy to see.** For these pages that is not "did the page appear": it is whether
the reveal panel is closed on arrival and whether the solution is absent from
the visible text above it. A sheet that landed the body but lost the collapse
would publish four answer keys and still look like a success.
