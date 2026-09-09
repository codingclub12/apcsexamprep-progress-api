# I rebuilt a generator that had merged to main an hour earlier

**Board:** 276. No damage: neither sheet had been imported, and the duplicate was
deleted before it went anywhere except one message to Tanner, which was corrected.

The other session's work is the one that survives:
`scripts/cyber-quiz-stem-reword.js`, `smoke/cyber-quiz-stem-reword.js` with
committed fixtures, and `deploy-gates/2026-09-09-cyber-last-three-quizzes.json`.
Mine is gone.

## What happened

I claimed board 276, read the held-back stems out of
`docs/cyber-quiz-held-back-rewords.md`, and built a Matrixify generator to take
the CED citations out of five quiz stems. Six assertions, six mutations, a
preflight pass, a runbook, two sheets handed over.

Another session had shipped the same thing. It merged to `main` as part of a
17-commit run while I was working, and its sheet was already sitting in
`imports/2026-09-09-cyber-quiz-stem-reword/`.

The two sheets differ in three places and nowhere else:

```
2.3 w4   theirs  "ranked wrongly. Mitigations are prioritized by"
         mine    "ranked wrongly: mitigations are prioritized by"
4.1 q6   theirs  "which CIA principle is most directly affected?"
         mine    "which CIA principle does it most directly threaten?"
```

The 2.3 body is otherwise byte-identical. The 4.1 body differs by six bytes.

## Why the claim did not stop it

Rule 2 worked exactly as designed and could not have helped, which is the part
worth writing down.

I claimed `repo:scripts/cyber-quiz-stem-reword-csv.js`. They wrote
`scripts/cyber-quiz-stem-reword.js`. **A lock is on a path, and two sessions
solving the same problem do not choose the same filename.** The guard protects a
file from two writers; it does not protect a PROBLEM from two solvers.

The claim also could not conflict because their claim was already RETURNED. Their
work was finished and merged. `in_flight` was correctly empty.

So the board said 276 was `in_progress` and unclaimed, and it was right. `main`
said the work was done, and I did not look. The digest is a view of the ledger,
not of the repository, and it does not pretend otherwise.

## The check that would have caught it costs one command

```
git fetch origin main && git log origin/main --oneline -20
```

Ten seconds, before the first file. `main` had moved 17 commits and five of them
name the thing I was about to build. CLAUDE.md already says never to trust a file
for live state and to query the source; I applied that to the storefront and the
board and not to the repository I was standing in.

**Fetch main before starting, not only before pushing.** A stale checkout is a
stale report about what is already done.

## What was kept

One thing, and only because it was a real gap rather than a preference.

Their gate ran suite, rederive and mutation. All three run against committed
fixtures and a local transform, so **every one of them stays green if the sheet
is never imported**, or if it is imported over only one of the two pages. Nothing
in it observed the deployed system.

`scripts/verify-cyber-stem-reword-live.js` is now the gate's `live` check. It
asks the extractor itself, against both live bodies, whether it will now lift
those questions:

```
today                accepted=0/2 problems=7 questions=0
after both imports   accepted=2/2 problems=0 questions=11
```

It asserts the outcome rather than the edit on purpose. "The page no longer
contains the string CED" would pass on a page whose stems were fixed and which
still refuses for some other reason, and it would read like proof.

## What I got wrong in the same hour, separately

I told Tanner that `ap-cyber-unit-3-lesson-6-quiz` was still his call. It is not:
the other session got that answer on 2026-09-09 and encoded it as
`CONFIRMED['ap-cyber-unit-3-lesson-6-quiz'] = 10` in the extractor, with the
evidence that made it answerable rather than a coin flip. Same root cause.

## Still open

The 4.1 q6 verb, and it is genuinely open rather than a leftover. Their own
decision doc says "if 'affected' is wrong for the intended answer, name the verb
you want and it goes in", so it was put to Tanner and not answered.

What I can add is that the key does not depend on the choice, checked rather than
assumed. The scenario self-replicates with no user action and degrades network
performance. Key C is "Worm, most directly tied to Availability", and C is right
under either verb. D also says Availability but names a logic bomb, which does not
self-replicate, so the malware-type half discriminates either way. It is a taste
call, not a correctness one.
