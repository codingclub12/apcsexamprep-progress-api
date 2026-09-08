# The Unit 3 exam could be passed by clicking B twenty times

2026-09-08. Board 274. The defect was found on 2026-09-01 by
`docs/cyber-unit-tests-availability.md`, recorded, and left. It is unchanged on
the body served today, so this is the fix rather than the discovery.

    BBBCCBBBBBCBBBABBBBB      A:1  B:16  C:3  D:0   longest run 5

Answering B on every question scores 16 of 20 without reading a stem. D is never
correct, so one option in four is dead on all twenty items and a student
guessing at random is really guessing between three. No individual question is
mis-keyed. It is a distribution defect, which is exactly why the fix touches no
content.

## The fix moves options and nothing else

Each question's four options are reordered and the key follows them. The
invariant is the whole safety argument, so it is asserted by re-parsing the
rewritten body from scratch rather than by trusting the code that wrote it: for
all twenty questions, the option TEXT that was correct before is the option text
that is correct after, and the same four options are offered. Everything outside
the option lists and the `CORR` array is byte-identical. Twelve of the twenty had
the correct answer's position move.

Three things about this page make that safe, and all three were read off the live
body before any code was written:

- `EXPS` is per QUESTION, not per option, so no rationale is bound to a position.
- Nothing names a letter. Zero matches for "option A", "(B)", "answer C", "the
  first option" and four more patterns across the whole 38 KB body.
- The handler resolves by index at click time (`opts[correct]`), so the only
  things that have to move together are DOM order, `data-idx`, the two handler
  arguments and `CORR`.

The new key is `ABCCDBAADCCBDBADDBAC`: five of each letter, longest run 2, best
single-letter score 5 of 20.

## The first key this tool generated was worse than the bug

The generator started as a greedy schedule: walk the twenty slots, take the
letter with the most budget left, refuse anything that would make a run of three.
Deterministic and balanced. It produced

    ABCDABCDABCDABCDABCD

which is 5/5/5/5 with a longest run of 1 and a best single-letter score of 5/20,
and passes a count-and-run audit perfectly. A student who notices the cycle
scores 20 of 20 instead of 16. Greedy tie-breaking on a uniform budget IS a cycle
generator, so that was not bad luck, it was the algorithm.

This is the `CDACDA` hole CLAUDE.md already records, where distinct, per-column
and overall balance all held and periodicity is what caught it. I walked into it
from the other direction: not by failing to check for a pattern, but by writing a
generator whose only possible output was one.

Two changes came out of that, and the second matters more than the first.
`audit()` gained a self-similarity test at every lag. And the generator stopped
being trusted: it is a seeded shuffle now whose output goes through the same
`audit()` every other key faces, so it proposes and the audit disposes. A future
change to either one cannot quietly reintroduce a pattern.

The periodicity test also fires on the ORIGINAL key, at 79% self-match on lag 6,
which nobody had noticed. That is a second thing wrong with the live key on top
of the three already recorded.

## Evidence

    suite          35 passed, 0 failed; 9 mutations, each red by its own rule
    rederive (1)   scripts/one-off/verify-exam-key.js, the tool that FOUND this,
                   months older than the fix and sharing no code with it:
                   FAIL 3 defects on the live body, PASS 20/20 clean on the new
    rederive (2)   20 checks, Python, its own CSV reader and regexes
    preflight      clear to import, with --carrying proving the one emoji on the
                   page was already there
    parse-back     1 row, MERGE, Body HTML only, clean
    live (pre)     4 passed, 6 failed, and the 6 are what the import flips
    deploy gate    --pre passes on suite, rederive, mutation

`deploy-gates/2026-09-08-cyber-u3-exam-key.json`. The live check is deferred
until the IMPORT rather than until the deploy: merging ships a rewriter, a suite,
a verifier and a CSV, none of it on the server render path.

The four assertions that pass in the live pre-check are deliberate. Twenty
questions, four options each, `data-idx` matching DOM position, handlers agreeing
with `CORR`: all true before and after. They are the no-damage guard, not the
change, and a fix that broke one of them would be worse than the bug.

### Both re-derivations found a hole, and one was in my own work

The Python re-derivation shipped with a `blank()` that replaced the whole
`<div class="cfu-item">` block before comparing, and the stem lives inside that
block. So "stems and explanations are byte-identical" was comparing two strings
with no stems in them. Mutation caught it: editing a question from "switch" to
"ROUTER" passed clean. It blanks only the option lists now. A check that blanks
its own subject is not a check.

The deploy gate then refused twice, both times correctly. Once because a `suite`
check cannot expect a failure, and I had written one that runs the old checker
against the defective body, where succeeding would mean the defect was gone. And
once on guard subsumption: my dead-letter mutant key was `012012012...`, which is
a dead letter AND a perfect cycle, so the periodicity rule caught it and the rule
under test stayed unproven. The mutant is a non-periodic three-letter key now,
and it trips exactly one rule.

## What is still open

- **The sheet is not imported.** `imports/2026-09-08/cyber-u3-exam-key-pages.csv`,
  one row, MERGE, Body HTML only. Then
  `node scripts/verify-cyber-u3-exam-key-live.js` has to go green.
- **The key is still in the page body.** Rebalancing raises the floor for a
  student who guesses; it does nothing about one who opens View Source, because
  `CORR` and every handler argument are right there. Closing that means moving
  the exam onto the server render path, which is `docs/quiz-locking.md`, and it
  is a different and larger job.
- **Two key shapes the auditor still cannot read**, `var DATA={...}` and
  `var sel={...}`, both on lesson quizzes. A page it cannot recognise is skipped,
  and a silent skip is how this defect shipped: the summary said "skipped 3" and
  the exit code stayed 0.
- **`CORR` is dead code.** It is declared and never read; the handler takes the
  correct index as an argument. It is kept in sync here because it is the
  second source the audit cross-checks against, and a stale copy would break
  that agreement. Retiring it is a separate decision.

## What I could not measure

Whether any student has actually gamed this. There is no per-question response
data for the page: it is graded in the browser and only a total reaches the
gradebook, so a class that all scored 80% would look like a class that studied.
