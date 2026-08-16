# 2026-08-16 - going looking for the defect that kept finding us

## Why

Five times in one session, something failed and reported success:

1. a mojibake check that could not fire, in a suite whose section was titled
   after it and asserted nothing about it
2. `auto-dispatch.yml` exiting 0 on a night it read nothing
3. `node ... | tee` reporting TEE's status, so a dead script was a green tick
4. a 401 fix that never reached `verify-board.js`'s own copy of the rule
5. the board report publishing names into a public Actions log

All five were found by accident. This pass went looking on purpose.

## What was searched

**Workflows, for exit-code masking.** Clean. `auto-dispatch.yml` has eleven
pipes and no `pipefail`, which looked alarming until read: every one is inside a
failure branch that already `exit 1`s. `tests.yml` has a `continue-on-error`
step, which is a deliberate observer and documented as one - the command center
must never be able to break the build. `verify-board.yml` was the one real case
and it was already fixed.

**Every assertion in every suite, for conditions that cannot fail.** 2183
assertions across 64 suites.

## The scan was wrong twice before it was right

First attempt, a line regex, reported ~50 hits with "no condition at all" on
lines like:

```js
ok('reports the course', cov.course === 'ap-cybersecurity');
```

which plainly has a condition. The lazy `.*?` backtracked across the whole
argument list to the last quote. Every hit was noise.

Second attempt parsed arguments by tracking depth and quotes. Better, but four
false positives:

- `\bok\s*\(` matches `r.ok()` in Playwright calls
- the `"` inside a regex literal like `/"[a-z]+":"/` read as a string opening,
  which threw off the depth count

Worth recording plainly: **the tool built to hunt checks-that-do-not-check had
that defect twice.** It is not a rare mistake. It is the default outcome of
writing a check and not testing the check.

## What was actually found

One. `smoke/teacher-score-entry.js:234`:

```js
ok('  a zero is a real score, not a clear', true);
```

A section heading wearing an assertion's clothes. It always passed, and the
sentence it asserted is one of this repo's core invariants - not-attempted and
scored-zero are different facts. The invariant IS tested, by the two lines below
it, so nothing was actually untested. But a green line claiming a core invariant
holds, that looks at nothing, is the cheapest possible version of the whole
problem. It is now a `console.log`, which is what it always was.

Also tightened `smoke/gradebook-agreement.js:222`, an else-branch that reported
`true` where the data was available: now `presentation.length === 0`. Being in
the else already implied it, which is exactly why the constant was worthless -
restructure the condition above and the line keeps passing regardless.

**2183 assertions, one piece of decoration.** The suites are in good shape, and
saying so is the honest result.

## The part worth keeping

`smoke/assertion-integrity.js` reads every other suite as text and fails if any
contains `ok(label, true)`.

The one legitimate use is allowed by rule rather than by exception list:

```js
try  { doTheThing(); ok('it works', true); }
catch (e) { ok('it works', false, e.message); }
```

Reaching the line IS the assertion there, and the catch is the failing branch.
It is told apart from decoration by the paired `ok(<same label>, false)` in the
same file. Three suites use this and all three clear the guard automatically.

The regex is deliberately narrow - one unambiguous shape and nothing else -
because of the two failed attempts above. A guard that cries wolf is a guard
someone deletes.

Section 3 tests the guard against its own subject: a bare constant-true is
matched, a paired failing branch clears it, and a method call named `ok()` is
not matched. Without that, this suite would itself be a check that passes
because it looks at nothing.

Verified by planting a decoy in an unrelated suite:

```
[FAIL] 2.2 no always-passing assertion without a paired failing branch
       [{"file":"wire-log.js","line":165,"label":"a planted decoy that always passes"}]
```

## Testing

```
smoke:assertions        6 passed, 0 failed   (new)
all 61 offline suites   pass                 (60 + this one)
```

## Still open

- The five reconcile runs still carry names in their logs. Needs Tanner; this
  session's token is read-only on Actions (403 on both dispatch and delete).
- The `#71`/`#82` control run, same reason.
- `theme.liquid` duplicated blocks, if the control run confirms it - theme repo,
  not this one.
