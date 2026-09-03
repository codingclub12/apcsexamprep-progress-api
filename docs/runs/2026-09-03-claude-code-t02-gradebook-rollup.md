# 2026-09-03: T-0.2, is the gradebook rollup defect actually open?

Board task 85, "Gradebook rollup: replace percentage-averaging with points-based
three-denominator model", status open, bucket now, size l.

**Finding: STALE as written. The defect does not reproduce.** The points-based
three-denominator model is in the code and behaves as CLAUDE.md 1b specifies.

This session did not fix anything and must not be the session that rebuilds
anything here, per the handoff and per rule 4.

## Why the question existed

CLAUDE.md 1b specifies the contract: the grade is `earned / graded`, points over
attempted work, never `earned / possible`; nothing attempted is `pct: null`,
never `0`; and the teacher view and the operator view may not drift. An open
board task said that behaviour was broken. Both could not be current.

CLAUDE.md 1b also says explicitly that the discrepancy may NOT be closed on a
code read, because a code read is not an observation of the running system.

## What was actually run

The test reproduces CLAUDE.md 1b's OWN worked example, the one that motivated the
change: a cyber student on 0/7, 7/8 and 5/5 plus two unpriced zeroes. That case
read 38% on the operator page and 60% on the teacher's. The two models give
different numbers on it, so the number that comes back names the model:

    points model                 12 earned of 20 attempted = 60, basis "points"
    percentage-averaging         mean of 0, 87.5, 100, 0, 0  = 38, basis "percent"

Observed, from `buildGradebook` itself:

```json
{ "pct": 60, "basis": "points", "items_graded": 5, "items_passed": 2,
  "earned": 12, "possible": 20 }
```

60, basis `points`. The denominator is 20, which is 7+8+5, the three PRICED and
attempted assignments only. The two unpriced zeroes and the never-attempted item
are not in it. That is points over attempted work.

### (a) An unattempted item renders null, never 0

    never attempted, per item     ABSENT from the cells map (undefined)
    never attempted, per lesson   ABSENT
    never attempted, overall      {"pct": null, "basis": "none", "possible": 0}
    genuinely scored zero         {"pct": 0,    "basis": "points", "possible": 7}

Not attempted and scored zero are different facts and do not render alike, which
is the rule. Note that `pct(a, b)` returns `0` when `b` is `0`, so this holds
because every call site guards on a positive denominator, not because the helper
is safe on its own. That is worth knowing before anyone refactors it.

### (b) The denominator is graded points, not total possible

The canonical contract shape carries all three denominators separately, which is
the "three-denominator model" the board task asks to be built:

```json
{ "pct": 60, "earned": 12, "graded": 20, "possible": 30,
  "items_graded": 5, "items_percent_only": 2 }
```

`pct` is `earned / graded` (12/20). `possible` (30) is tracked beside it rather
than used as the grade denominator, which is what pace is for.

### The operator and teacher views agree

This matters because the ORIGINAL defect was a divergence, 38 on one page and 60
on the other, and the two routes do call different entry points:

    GET /api/admin/class/:id/gradebook             -> buildGradebook
    GET /api/admin/class/:id/gradebook/as-teacher  -> buildCanonicalGradebook
    GET /api/teacher/classes/:code/gradebook       -> buildCanonicalGradebook

Run over identical data, both report `pct: 60`. No divergence.

## Why this is more than a code read, and where it still falls short

`GET /api/admin/class/:id/gradebook` is fail-closed. Probed live this session
with the only credentials available here:

    x-admin-key        -> 403 {"error":"Invalid or missing admin key."}
    Authorization      -> 403 {"error":"Invalid or missing admin key."}

So a production gradebook response could NOT be obtained, exactly as CLAUDE.md
predicted. What was done instead:

- **The builder exercised is byte-identical to the one production runs.**
  Production served `d059208` when this ran. `lib/admin-gradebook.js` md5
  `fac8e9b17f6a` and `lib/gradebook-contract.js` md5 `c1211526871e` are identical
  at `d059208`, at `origin/main`, and in the working tree. Neither file changed
  anywhere in the 20 commits between them.
- **The test was mutation tested, because a test that cannot fail proves
  nothing.** Disabling the points branch makes the same scenario report exactly
  `38, basis "percent"`, the defect's signature. Restoring it returns `60,
  "points"`. So the scenario distinguishes the two worlds rather than always
  printing the answer we wanted.

**What is still not established: production DATA.** The model is structural
rather than data-dependent, so this is a narrow gap, but it is a real one. A
session holding the admin key should run

    GET /api/admin/class/<a real class>/gradebook

against a class with a partially-attempted lesson and confirm `basis: "points"`
with a `possible` that counts only attempted work. That is a five minute check
and it is the last thing between this finding and certainty.

## Recommendation

Task 85 should be marked stale rather than worked. The named deliverable already
exists. Rebuilding it would be a large task (size `l`, bucket `now`) spent
reimplementing behaviour that is present, tested and live.

Task 86, "Gradebook wide CSV export for SIS import (CodeHS shape)", is open,
bucket `week`, size `m`, and is a separate piece of work that does NOT overlap
this one. If gradebook capacity was reserved on the strength of 85, 86 is the
thing to spend it on.

## Method notes

- Nothing in the repository was modified. The scenario ran from a scratchpad
  script against a scratch database. The one mutation was applied and reverted
  in the same command, and the tree was confirmed clean afterwards.
- Claimed as #75 with lock `api:lib/gradebook-contract.js`, per rule 2.
- Raw JSON for both shapes is in the scratchpad artifacts named in this note.
  The decisive fragments are quoted above in full rather than summarized.
