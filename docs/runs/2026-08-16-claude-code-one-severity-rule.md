# 2026-08-16 - the 401 fix that did not reach the board

## What happened

Run 3 of `Reconcile the board` (`31969947031`) was the first against the fixed
verifier. Predictions had been written down beforehand, which turned out to be
the useful part.

| prediction | outcome |
| --- | --- |
| `#28` stops reporting `<h1>` counts | correct - moved to "Nothing flagged" |
| `#16` stops being a P0 | **WRONG** - still `**P0** status 401, not 200` |
| `#71`, `#82` unchanged | correct |
| `#30` still clean-but-not-a-pass | correct |
| 9 not-machine-checkable unchanged | correct |

## Why half the fix worked

The two fixes lived at different layers.

- The blob-to-raw rewrite went into `get()`/`inspect()`, which **is** shared:
  `verify-board.js` shells out to `verify-artifact.js --json` and consumes that
  output. So `#28` was fixed for both readers at once.
- The 401 fix went into `report()`, which `verify-board.js` **never calls**. It
  builds its own markdown from the JSON, and `readSignals()` held a second copy
  of the severity rule:

```js
if (v.status === 429) signals.push({ level: 'P1', ... });
else signals.push({ level: 'P0', text: `status ${v.status}, not 200` });
```

So the board kept printing a P0 for a JWT endpoint answering exactly as
designed, hours after that case was "fixed".

## The actual defect

Not the 401 handling. **Severity was decided in two places.** This is the same
failure `docs/gradebook-contract.md` exists to prevent: one normalizer, and
everything downstream reads the same contract. A view that re-derives is a bug
in the view.

`classifyStatus(status)` now lives in `verify-artifact.js` and is exported:

```
ok          200
rate-limit  429                    not broken, re-run slower
needs-human 401/403                no credential here, so no verdict either way
broken      everything else
```

Both readers call it. Neither derives severity from a status code.

## A 401 needed a third bucket

It is not a finding (nothing is known to be wrong) and it is not "Nothing
flagged" (that reads as clean). Filing it under either is the same mistake in
opposite directions, so the report grew a section:

```
#### Fetched, but no verdict is possible
```

## Testing

`smoke/verify-board.js`, 27 -> 43. A fake storefront route now answers 401.

```
new tests vs the OLD duplicated rule   37 passed, 6 failed
new tests vs the fix                   43 passed, 0 failed
all 60 offline suites                  pass
```

The old-code run reproduces the live symptom exactly:
`**P0** status 401, not 200`. `10.4 a real 404 is STILL a P0` passes under
**both**, which is the guard that this narrowed the rule rather than
suppressing failures.

### The guard that matters

`9.7b` reads `verify-board.js` as text and fails if `readSignals()` contains any
`status === <code>` comparison. A behavioural test only catches a duplicate that
currently disagrees, and this one agreed until it did not.

It is scoped to `readSignals` on purpose. The board also checks
`res.status === 401` when fetching the digest, which is a different question -
its own credential against the API, not a verdict about someone's artifact.
Sweeping that in would make the guard noisy enough to delete, which is how
guards die.

## What this says about the method

Writing the predictions down before the run is what caught this. The run was
green, the report looked plausible, and `#28` had visibly moved - a quick read
would have called it fixed. The only thing that flagged `#16` was having said in
advance what should happen to it.

## Still open

- `#71`/`#82` both report exactly 3 duplicated blocks. Still unconfirmed whether
  that is `theme.liquid` shipping duplicated markup site-wide. Needs a third,
  unrelated page as a control.
- Nobody has re-run the board since this fix.
