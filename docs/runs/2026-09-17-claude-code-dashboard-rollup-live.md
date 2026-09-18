# The dashboard rolls up marks, live

2026-09-17, Claude Code, boards 318, 340.

Tanner imported `matrixify/cyber-dashboard-gradebook-rollup-pages.csv`. Six days
after the teacher reported a column reading 483 percent, the gradebook he opens
computes a class average out of marks instead of averaging percentages.

## The live evidence

`node scripts/verify-dashboard-rollup-live.js`, against the page rather than the
repo. It does not search the body for a function name, it pulls the script out,
runs it in a vm with a stub DOM, and calls the page's own `classAvg` and
`colAvg` on a fixture where the two rules disagree:

```
[PASS] the live class average is 31 of 62, which is 50
[PASS]   and NOT the 61 a mean of 90 and 31 gives
[PASS] the live column footer is 19 of 22, which is 86
[PASS]   and NOT the 70 that averaging 90 and 50 gives
[PASS] an unpriced column still reports its mean, 70, and says so
```

That last one matters as much as the other five. A column nobody has priced
still shows its mean and SAYS it is a mean, so the fix does not turn "not
attempted" into a number that reads like a grade.

`deploy-gates/2026-09-15-cyber-dashboard-rollup.json` now passes on four
independent kinds: suite, rederive, mutation, live.

## Board 340 survived, and the section-5 correction earned itself

`npm run verify:lessonpadlock` passes 9 of 9 against the live page, and section
5 reports the three-mode control with the four dead switches gone.

The version of that check as it stood on 2026-09-16 asserted `rt-lesson`,
`rt-ex`, `rt-quiz` and `rt-exam` SURVIVE. Run here, on a correct import, it
would have gone red on all four and reported the fix as a regression, to a
person who had just been told by its own runbook to run it. The correction was
written the day before on reasoning; this is the measurement.

## One more expectation written against the wrong run

The gate refused the first time, and the page was fine. The live check expected

    OK - this body rolls up marks (6 checks)

and the live run prints

    OK - the live dashboard rolls up marks (6 checks)

`scripts/verify-dashboard-rollup-live.js` says "this body" under `--file` and
"the live dashboard" without it. The expect string had been copied from the
`--file` run, so the gate compared a live result against a file-mode sentence
and refused a correct import with something that read like a broken page.

Fourth in a week, all the same family, all in the expectation rather than the
code:

    the gate's first manifest   true before AND after
    the lab denominator gate    true only BEFORE the change
    the padlock check           FORBADE the next change
    this one                    written against a different run mode

The rederive check in the same manifest uses `--file` and keeps the other
wording on purpose, which is why it passed while the live one did not.

## What is still not fixed

Nothing on this page. The cyber dashboard now agrees with
`lib/admin-gradebook.js`, which has summed points since 2026-09-02.

Board 329 is untouched: the inflated percentages already on disk from abandoned
cyber lab runs. Board 328 too: six unit 5 labs that report no grade at all
because their score sits under an id the reporter does not know. Neither is
this page.
