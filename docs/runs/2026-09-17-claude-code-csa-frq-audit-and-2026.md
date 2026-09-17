# 2026-09-17 Claude Code: the FRQ archive audited, and the 2026 set built

Board 345.

## What was asked

Audit the AP CSA FRQ practice pages, then build a 2026 set in the same format
as the previous years if that format is the best one.

## What is here

`docs/reports/2026-09-17-csa-frq-audit.md` is the audit, measured against 117
live page bodies. `docs/csa-past-frq-pages.md` is how the new generator works.
The generated sheet is `imports/2026-09-17/csa-2026-frq-pages.csv`, five pages,
not yet imported.

## The two things worth reading before anything else

**2026 changed the free-response scoring, and 74 of the 86 archive pages still
say 9 points.** Questions 1 through 4 are now worth 7, 7, 5 and 6, the section
is 25 rather than 36, and only question 1 has parts. Section I moved to 42
questions at 55 percent. The 2023 to 2025 pages already carry a correct callout
about this; nothing older does. A student self-grading a 2019 question out of 9
is using a denominator that no longer exists.

**The 2026 questions were already published and the archive had not noticed.**
`ap26-frq-computer-science-a.pdf` and `ap26-sg-computer-science-a.pdf` both
answered 200 today. That is the first exam of the four-unit course, the only
released set matching the rubric students face next May, and the archive hub
advertises "Every released exam".

## The format question, answered

The archive runs four formats, grouped by the year each page was built: 8KB,
12KB, 26KB and 62KB. The newest, which its own body comment calls the "FRQ Holy
Grail Template v2.5", is clearly the best and the 2026 pages use it: the College
Board PDF embedded at the question's own page anchor, a per-part editor with no
Run button because Bluebook has none, a self-grade call to action, and behind it
a reveal panel ordered recap, solution, rubric, mistakes. Three JSON-LD blocks.
Its CSS and editor script are lifted unchanged so the new pages look like the
archive rather than like a new thing bolted on.

Three departures, each for a reason:

- **The given code is printed as text.** The archive embeds the PDF and stops,
  so the question exists on the page only as pixels. A screen reader cannot
  reach it and a search engine cannot index it.
- **The 2026 callout points the other way.** On an archive page it warns that
  2026 changed the scoring. On a 2026 page that is backwards, so it prints the
  whole point table instead.
- **The 6,535-byte `REPLACE THESE TOKENS THROUGHOUT` comment is gone.** It ships
  on twelve live pages today, carrying the template's authoring instructions and
  version history, at roughly 10 percent of each body.

## A generator, because 86 hand-authored pages is the argument for one

Canonical data, a renderer, a verifier, a validator and a sheet, per the house
rule. The audit is what makes the case: four formats, 16 machine-looking titles,
11 pages promising a Complete Solution and delivering a comment, 6 pages naming
two different units four lines apart, 1 JSON-LD block that does not parse. All
drift, none of it careless.

## Evidence

```
$ npm run csa:2026frq
  9 of 9 solution run(s) reproduce the question's own examples, 4 of 4 mutants caught

$ npm run smoke:csa2026frq
  70 passed, 0 failed

$ node scripts/csa-past-frq-pages-csv.js imports/2026-09-17/csa-2026-frq-pages.csv
  wrote 5 page(s), 236 KB of body
  parsed back and diffed clean against the renderer, every cell
```

Every solution on the four pages is College Board's own, compiled with real
`javac` and run against the examples the question itself states: the two
username cases for Q1, the six rows of the Bottle table for Q2, the worked
roster for Q3, the two `getPointsForRow` calls for Q4. No expected value is
hand-asserted anywhere in the bank.

## What the verifier caught, on its first run

College Board's scoring guidelines PDF extracts an EN DASH where `j - 1` belongs
in one of the Q1 alternate solutions. That is what PDF text extraction does to a
minus sign, it is invisible in review, and a file nobody executes would have
shipped it to a student as an answer key. The suite now refuses any unicode dash
in the bank.

## What the mutation testing taught, which is a different thing

The first four mutants all went red and three of them went red for the wrong
reason: they failed to COMPILE. A mutant that does not compile proves the
compiler works, not that the harness measures the answer. Rewritten as semantic
mutants, and the Q2 one is the keeper: changing the refill threshold from `<` to
`<=` produces correct output on **every row of College Board's own sample
table**, because none of its rows lands on the 25 percent boundary. It is caught
only because the harness runs the shampoo bottle, whose second call sits exactly
on 10 of 40.

The same rewrite happened on the sheet rules. Twenty mutations, each asserting
on the MESSAGE rather than the count, because a mutation that goes red for a
different rule is telling you the rule you meant to test is hollow. Two controls
sit beside them and the second one earned its place: the wrapper rule demanded
`<div id="...">` byte for byte and went red on an extra space, which is exactly
how a guard gets switched off.

## Still open, in the order the report ranks them

- **`ap-csa-frq-bootcamp-2026` is live and still selling tiers** for a Zoom
  event on April 16, 2026, under a static "29 days until the AP CSA Exam (May
  15)". It is the only item in the audit that can take money for something that
  cannot be delivered. Pricing is `NEVER_AUTO`, so this is Tanner's call:
  unpublish, repoint at 2027, or leave it with a banner.
- **The archive hub's headline numbers.** "88 FRQs Total" (there are 86; 2020
  had two questions), "Every released exam" (2026 exists), "36 points" (now 25),
  and a countdown to May 15, 2026 reading "46 days left".
- **13 pages naming May 15, 2026 as a future date.** The next exam is Wednesday,
  May 12, 2027, Session 2.
- **The 2026 sheet is generated and not imported.** Five pages, one import.
- A 2026 scoring note for the 74 pages without one, the 16 mangled titles, the
  11 stub pages, the 6 unit contradictions, the invalid JSON-LD on 2016 FRQ 3.

## What was not established

Whether any archive page ranks, so the ordering is by harm rather than traffic.
Whether the 2004 to 2013 question TEXT matches the real exams: the Java was
checked and the prompts were not, and three pages across three different years
are all titled `Fish`, two of them near-duplicates of each other. Whether the
archive should get a generator retro-fitted over its 86 indexed bodies, which
needs its own plan.

## One more thing the guards caught, on this branch

`npm run smoke:encoding` went red on **this suite's own test data**. The mojibake
mutation was written as `â€¢` in a shell heredoc and arrived in the
file as the bytes themselves, so the repository-wide scan correctly reported
`smoke/csa-past-frq-pages.js` as corrupt. CLAUDE.md warns about exactly this and
the warning was not enough; the fixture is built from code points now.

Worth the interruption, because fixing it surfaced a second problem. The
fixture that landed was the DOUBLE-pass form of a bullet, and the single-pass
form is the one seen on live pages. A mutation built only from the double-pass
form goes green against a detector blind to the real bug. There are two
mutations now, one per depth, asserted separately.

Five other offline suites fail in this container and all five fail identically on
a clean `origin/main` worktree: `csaunit1guides`, `csaunit1guidesmutation`,
`csakitstyle`, `deckvoice` and `exercisekeys`, every one of them
`ModuleNotFoundError` for `python-pptx` or `python-docx`. Environment, not this
branch. The other 248 pass.
