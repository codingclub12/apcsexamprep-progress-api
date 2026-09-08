# The check found six columns nobody had reported, then had to be taught what a denominator is

Date: 2026-09-08
Agent: Claude Code (session 2353de81)
Board: #272, #273
PRs: #604, #608

## What happened, in order

Yesterday a teacher's email produced two fixes and one new check: `/api/health`
`prices`, which compares what a column is priced at against what the ledger says
students were served. It went live at 22:45 and named 23 columns and 400
students inside a minute.

Six were real. Fourteen were a mistake in the check. Three were history.

## The six real ones

    1.4  exercise-1   priced 25   page scores 24    90 students
    1.4  exercise-2   priced 25   page scores 24    77 students
    1.4  lab          priced 30   page scores 24    36 students
    1.5  exercise-1   priced 4    page scores 24    46 students
    1.5  exercise-2   priced 4    page scores 24    45 students
    1.5  lab          priced 30   page scores 24    20 students

1.5 Exercise 1 is the one worth remembering. Forty-six students were being shown
their work out of 4 on a page that had served them 24 points of it, so a student
who scored 18 read as something out of 4. Nobody reported it. It had presumably
been that way since the column was priced.

Three sources agreed on 24 before anything was changed, and needing three is the
lesson from the 1.1 exercise-2 price, which was authored off one bad read:

    the page badge         "~30-40 min . 3 Parts . 24 pts"
    the page arithmetic    updateTotals sums scores[1]+scores[2]+scores[3], and
                           upd() sums scores[1..4] on the labs, into the element
                           the score reporter scrapes, rendered "/ 24 pts"
    the ledger             24, across 314 students on the six columns

The middle source is the one an earlier crude sweep got wrong. It matched "/ 24"
anywhere in the body and could not tell a PART total from a WHOLE one, which is
why the sweep was refused as evidence that morning and the columns stayed wrong
for another day. Reading the routine that WRITES the scraped element is what
settles it, and that is the technique worth carrying forward.

Nobody was regraded. Every recorded score is priced from the ledger, so the
students who sat these keep exactly what they earned.

## Then the check had to be fixed

After the six landed, seventeen rows remained and EVERY ONE was healthy work.
The clearest:

    ap-csp bi-1 collaboration quiz   priced 6, observed 1 and 3 and 5

One column, three rows, because three students answered 1, 3 and 5 of its 6
questions and stopped. The check was comparing the price against each student's
own summed max_points, which is a denominator only where a page reports its
whole run in ONE row under the reserved 'score' item. Where a page reports one
row per question, that sum is how far the student got.

Fourteen of seventeen rows were that. An alarm whose every row is healthy work
is one people learn to skip, which is the failure the reporter block next door
was rewritten to avoid, and this one reached that state in fourteen hours.

Two rules fixed it. A per-question column is not compared at all, because the
ledger cannot state a denominator for it. And the comparison is against the
column MAXIMUM rather than each student's own sum, so one abandoned run cannot
make a correct price look wrong.

The block now reports zero columns, which is the honest answer and would also be
the answer if it had been broken into silence. What separates those two is the
fourth mutation: silence the comparison and the suite goes red on "the real
mispricing is detected".

## The pattern worth naming

The deploy gate refused four drafts across two days, and three of them were the
same shape: a rule written in two places, where breaking either changes nothing,
so no test can tell whether either works.

    the correction path     read the row, then write it under the same condition
    the price query, v1     the carrier restriction in two subqueries that joined
                            to each other
    the price query, v2     a WHERE clause mistaken for the max rule when it only
                            governed a count

Every one READ as careful. A guard that cannot be broken in isolation is not two
guards, it is one guard and one dead line, and this repository produces them
often enough that the per-rule mutation requirement is paying for itself several
times a week.

The fourth refusal was different and worth its own line: a mutation that was
really a ReferenceError, scored as "the suite went red" because node exits 1 on
an uncaught throw. The battery now requires the suite to print a verdict before
believing a red one.

## Evidence

- `npm run smoke:cyberdenoms` 75, `smoke:denomcorrections` 26,
  `smoke:healthintegrity` 44, `smoke:carrier` 14, `smoke:carrierrederive`.
- All 219 offline suites, twice.
- `deploy-gates/2026-09-08-cyber-14-15-reprice.json` and
  `deploy-gates/2026-09-08-price-check-false-positives.json`, both to four kinds
  including live.
- Production: `corrected=6` on the re-price deploy, `corrected=0` on the next,
  which is the idempotence claim measured rather than asserted. `prices` now
  reports `ok: true`, zero columns.

## Still open

- **The Unit Tests are still not locked.** `ap-cyber-unit-1-exam` serves all 20
  questions and `var ANSWERS` in the page body, so a teacher who locks one has
  changed her gradebook and nothing on a student's screen. Board #248. It is a
  three step migration, not a sheet edit, and it is the largest thing this
  teacher's email surfaced.
- **The 1.1 exercise-1 page still writes twice.** Harmless since the read-time
  rule landed, and the fix is a 1,713 character removal from the page body.
- **The check is blind to a column nobody has finished.** If every student in a
  carrier-reporting column abandoned partway, the maximum understates and the
  column reads as mispriced. The row carries the student count so a reader can
  weigh it, which is the honest handling rather than a guess.
