# A dead inline script on a live page is now detectable, and the first run found one

Board #175. 2026-09-17.

## What I was asked to do, and what turned out to be true

Tanner picked board #173, CSA 1.9 broken live: Check answer does nothing and the
Java editor never renders. It was the most student-facing thing on the ready
list.

It is already fixed. The page body was updated 2026-09-09, six days after the
defect was proved, and both of the recorded faults are gone:

    're'  + newline + 'turn'      absent
    'getAtt' + newline + 'ribute' absent

The MCQ block is now 1338 bytes, which is byte-for-byte the size of the same
block on lesson 1.8. The board task predicted exactly that number as the correct
one, so this is not just "the strings are gone", it is the block matching its
sibling. All four executable inline scripts on 1.9 compile.

So #173 needed no repair. What it still needed was the thing that would have
caught it, which is #175, and that is what this run built.

## Why nothing could see it

A page with a dead inline script answers 200, carries every string a link check
or a content check looks for, and renders all of its markup. Only the
interaction is gone, and nothing here was looking at interaction.

The 1.9 MCQ defect is the one that defeats the obvious instrument. `opt.getAtt`
newline `ribute(...)` PARSES, because ASI inserts a semicolon after the member
access, and then throws ReferenceError at runtime. A syntax check is green on
it. That is why the detector has two rules rather than one:

    rule 1   every executable inline script must compile
    rule 2   no member access may be split across a newline

Either rule alone misses one of the two faults found on 2026-09-03.

## The first live run found a page nobody had reported

45 pages off the sitemap, sequential:

    BROKEN  2d-array-neighbors-ap-csa  (1 executable of 2 scripts)
        [syntax] Unexpected identifier 'q2'

A missing comma between two entries of an ANSWERS object literal:

    q1: { correct: "C", explanation: '...' }
    q2: { correct: "B", explanation: '...' }

There is no comma after the q1 entry. That is a hard SyntaxError, so the whole
6040 byte script never runs and every question on that page is dead. The page
was last updated 2026-08-20, so it has been broken for close to a month and
nobody reported it. Filed as board #354. The repair is a page body change and
ships as a Matrixify sheet, so it is not this task's to make.

One page also came back with no body at all, `ap-csa`, which is board #158
already. Worth noting only because the scanner reports it as unreachable rather
than as passing, which is the correct half of that distinction.

Measured noise: 1 fault in 44 readable pages, zero false positives.

## The two false positives that would have killed this

Both were found by running the detector against a page I already knew was
healthy, which is the only way to find this class of problem.

**ld+json.** Every lesson page carries five `type="application/ld+json"` blocks.
They are JSON, so compiling them as script fails on the first colon. A scanner
that does not filter by script type reports five errors per page on a completely
healthy site. That is not a small annoyance; that is a check that gets switched
off within a day, and then the next dead page ships.

**Java inside a template literal.** The lesson pages seed a Java starter program
inside backticks. A newline in there is legal JavaScript and means nothing.

## What the false positives taught me about my own mutation test

The re/turn mutation came back GREEN twice before it came back red, and both
times the detector was right and my test was wrong.

The first attempt split the first `return ` in the page body, which was in
visible prose: "A method with no return value". The second attempt split one
inside the editor block, which was in the Java template literal above. Neither
mutation touched a single byte of JavaScript, so neither proved anything.

A green mutation run is supposed to mean the guard is hollow. Here it meant the
mutation had missed the thing under test. Those are very different, and telling
them apart needs the mutation to be checked as carefully as the guard: I had to
confirm the injection landed inside an executable script before the result meant
anything at all. The suite now injects into real JavaScript and asserts the
template-literal and prose cases stay silent, so the trap is pinned rather than
remembered.

## What shipped

- `scripts/scan-inline-scripts.js`. Both rules, plus the network driver.
  Compiles with `vm.Script` and never runs anything. Takes handles, or
  `--from-sitemap` with `--shard`/`--shards`/`--limit`.
- `smoke/inline-scripts.js`, 23 assertions. Both real faults reproduced and
  caught independently, and every false positive above pinned.
- `.github/workflows/inline-script-watch.yml`, daily 09:10 UTC, one seventh of
  the site a night, sequential. Reports to the board as `linkcheck` /
  `inline-scripts`, because the finding is a storefront page and whoever picks
  it up ships a sheet.

## Still open

- **One line in `package.json`**, `smoke:inlinescripts`. `tests.yml` discovers
  offline suites by reading `smoke:*` keys, so until that entry exists the suite
  does not run in CI. It is not in this change because another session has held
  `api:package.json` for the last hour on board #349, and forcing a lock on the
  one file where two sessions actually collide is how the claim system stops
  being worth having. The nightly workflow calls the script directly and works
  without it.
- **Board #354**, the missing comma on `2d-array-neighbors-ap-csa`.
- Sharding means a fault can wait up to seven days to be seen. That is the
  deliberate trade against the storefront's rate limit, which this repo has
  already been burned by twice. Worth revisiting only if a shard ever turns up
  more than one or two faults.
