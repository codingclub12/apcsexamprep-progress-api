# 2026-08-24 Claude Code: AP CSA FRQ Units 2, 3 and 4

## What changed

The FRQ bank went from 15 lessons to **all 53**. Units 2, 3 and 4 were stubs
exporting an empty array; they now hold 38 authored questions.

```
seed/csa-frq/unit2.js   12 lessons, Selection and Iteration
seed/csa-frq/unit3.js    9 lessons, Class Creation
seed/csa-frq/unit4.js   17 lessons, Data Collections
```

No wiring changed to add them, which was the point of building the
infrastructure first.

## Evidence

```
$ node scripts/verify-csa-frq.js
  53 FRQ(s) verified clean against 270 cases.
  Every reference compiles and runs, no constant passes, and every rubric part is tested.
  160 declared mistake(s) were each proven to fail at least one case.

$ npm run smoke:csafrq
  24 passed, 0 failed

$ node scripts/csa-frq-pages-csv.js out.csv
  wrote 53 FRQ page(s), 1099 KB of body, 270 cases, 164 hidden

$ all 102 offline smoke suites
  FAILED: none
```

## Every entry from 2.1 on is driver mode

Unit 1 had to be `segment`, because a segment cannot declare a method and Unit 1
teaches using objects rather than writing them. From 2.1 the student can write a
method with a loop and a condition in it, so from there the question hands over
a signature and a hidden harness calls it.

That is not a cosmetic choice. A driver-mode question cannot be passed by
printing, because the harness prints and the harness only prints what the
student's method RETURNED. Printing instead of returning is the most common way
a fluent student loses free response points, and it is ungradeable in any mode
where the student owns the output.

## Each unit is built around its own failure mode

- **Unit 2, the boolean hazard.** Half the unit returns booleans, and a boolean
  method has two answers, so `return true;` passes any case set that never asks
  for false. Every boolean part has cases on both sides and `always returns
  true` is a declared mutant.
- **Unit 3, silent failure.** A broken class compiles cleanly and every getter
  returns 0. Every mutant here produces no error message: a shadowed field, an
  instance counter that should be static, a getter handing out the object's own
  array. Every harness builds at least two objects, because a shared static or
  a leaked reference is invisible to a harness that builds one.
- **Unit 4, the index bug in costume.** Every grid is deliberately non square,
  because swapping a row and a column silently transposes on a 3 by 3 and throws
  on a 2 by 4.

Threads are closed across units rather than left implicit: the swap without a
temporary appears in 2.1 and again inside a sort in 4.15; the discarded return
value appears in 1.10 and again inside recursion in 4.17; the accumulator
identity rule in 2.8 becomes the recursive base case in 4.16.

## What the checks caught, in order

Every one of these was found by a gate rather than by review.

1. **2.2, 3.5, 3.9, 4.2, 4.15** had a rubric part with no case behind it. The
   loader refused to load, naming the part.
2. **2.8** had no harness at all. The loader named it.
3. **2.3, 2.5, 2.6, 4.3** had hidden cases whose output was byte-identical to a
   visible case's, so the answer was already printed on the page.
4. **2.6** was worse than that: part (d) was `exactlyOneOpen`, which is
   SYMMETRIC, so the rows `true false` and `false true` produced identical
   output and each printed the other's answer. Replaced with an asymmetric
   fourth part.
5. **4.9** had no case whose value sat exactly ON the threshold, so `>` and
   `>=` agreed everywhere and part (b)'s boundary could not be scored.
6. **4.8, 4.9, 4.10** tripped the leak check on `import java.util.ArrayList;`,
   a line the starter already gives the student.

## Two mutants were withdrawn rather than forced

This is the part worth keeping. When a declared mistake will not fail, the
temptation is to bend the cases until it does. Twice that was the wrong move,
because the mistake was genuinely undetectable:

- **2.9** declared `>` versus `>=` on a two-argument max. Both return the same
  VALUE on a tie, so no case can separate them. The distinction only becomes
  gradeable when an INDEX is tracked, which is 4.5, and it is declared there.
- **2.11** declared a trailing space. Output normalisation strips trailing
  whitespace per line before comparing, so the grader cannot see it. A LEADING
  separator survives, so that is what the rubric row scores now, and the task
  text was corrected to stop promising something ungradeable.

A rubric row naming a mistake the grader cannot detect is worse than no row,
because it reads as covered. Both are recorded in the source next to the
mutants that replaced them, so the next author does not re-add them.

## Two checks were added while authoring

- **Hidden answers must be new.** A hidden case whose output equals a visible
  case's is not hidden in the way that matters. Unit 2 shipped four of these
  before the check existed, found by the page leak detector reporting the
  symptom rather than the cause.
- **`teaches`.** An explicit, per-entry list of reference lines the page may
  print because they are the idiom being taught. 3.2's shadowing hint has to
  show `this.threshold = threshold;` to be a hint. The loader refuses an entry
  that is not actually in the reference, so a stale exemption cannot widen the
  hole silently. Starter lines are exempt automatically, for the same reason.

Both were re-validated by breaking them after the fact. The leak check was
re-proven after being relaxed, by pasting a genuine reference line into a hint
and confirming it still fires.

## Still open

- Nothing has been imported. The sheet generates and passes its own publish
  checks; per CLAUDE.md it ships as a Matrixify sheet when Tanner decides.
- `exercise-2` is still Unit 4 only.
- The board token in this session is read only, so no claim was written and no
  task closed.
