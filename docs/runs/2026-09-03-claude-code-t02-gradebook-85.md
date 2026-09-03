# 2026-09-03: T-0.2, is board task 85 actually open?

**Answer: partly. The headline defect is FIXED. The task is still open, on a
narrower and different scope than it is written.** Do not close it, and do not
rebuild what already works.

Claimed #85 with locks `api:lib/admin-gradebook.js` and
`api:lib/gradebook-contract.js` (claim 77) before reading anything.

## What #85 says, and what is true now

#85 was written against a measured live case on class CYBER-Z8LA: overall.pct
was the MEAN of per-item percentages, and `earned:0 possible:0` was hardcoded on
every student. Its acceptance criteria: points not percentages, three
denominators that must not be collapsed, `pct = earned/graded` and NEVER
`earned/possible`, `pct` null when nothing is attempted, and retire
`basis:'percent'`.

Reproduced #85's own worked example (exercise-1 0/7, lab 7/8, quiz 5/5 = 12/20)
through the REAL routes on a throwaway database:
`node scripts/gradebook-endpoint-diff.js`.

    GET /api/admin/class/:id/gradebook            HTTP 200
      {"pct":60,"basis":"points","items_graded":3,"items_passed":2,
       "earned":12,"possible":20}

    GET /api/admin/class/:id/gradebook/as-teacher HTTP 200
      {"pct":60,"earned":12,"graded":20,"possible":25,"items_graded":3,
       "items_passed":2,"items_total":89,"items_percent_only":0,
       "items_score_missing":0}
      pace: {"items_graded":3,"items_total":89,"pct":3.4,...}

**Fixed on BOTH endpoints, so this half of #85 is genuinely stale:**

- `pct` is 60, the points answer. The mean of the three percentages is 62.7 and
  neither endpoint returns it.
- `earned`/`possible` are computed per student, not hardcoded 0/0.
- `pct` is `null`, not `0`, for a student who has attempted nothing.

## What is still open, and it is not what the task says

**There are TWO gradebook builders, and only one of them is the contract.**

    routes/admin.js:1044   /class/:id/gradebook             -> lib/admin-gradebook.js
    routes/admin.js:1155   /class/:id/gradebook/as-teacher  -> lib/gradebook-contract.js

`docs/gradebook-contract.md` line 99: "Three denominators. **Do not collapse
them.**" `graded` is the sum over attempted, `possible` is the sum over the whole
course. The plain endpoint collapses them into one field and names it `possible`:

    plain       possible: 20     <- the ATTEMPTED sum. The contract calls this `graded`.
    as-teacher  graded:   20
                possible: 25     <- the course-wide sum, which plain does not report at all

So the same field name carries two different denominators on two endpoints of the
same system. A consumer that reads `overall.possible` to answer "how much of the
course is priced" gets the attempted total instead, which equals the graded total
by construction and therefore always looks complete.

Also missing from the plain endpoint: `graded`, `items_total`,
`items_percent_only`, `items_score_missing`, and the whole `pace` block. Still
present: `basis`, which #85 asked to retire.

**Why it drifted with a green suite.** `smoke/gradebook-contract.js` test 12
asserts the TEACHER route and `as-teacher` return a byte-identical document. It
never requests `/class/:id/gradebook`. Nothing in the suite has ever compared the
plain endpoint to the contract, so it was free to diverge. This is the same shape
as the mojibake guards earlier today: the check and the thing it was supposed to
check were not pointed at each other.

CLAUDE.md is therefore wrong in one specific clause. It says the operator view
"cannot drift from the teacher view" because they call the same builder, and "do
not add a second implementation of either". That is true of `as-teacher`. A
second implementation exists and is what `/gradebook` serves.

## What this evidence is, and what it is not

The run drives the real Express routes over the real code. The three files
involved are byte-identical between my tree and the deployed commit `d84753f`,
so this is the code production serves, exercised in process.

It is NOT a live production response. `GET /api/admin/class/:id/gradebook` is
fail-closed and `ADMIN_KEY` is not set in a Claude Code session, so the artifact
URL on #85, the real CYBER-Z8LA class, was not fetched. What that would add:
behaviour that depends on real data rather than on a fixture, in particular
whether any live class falls into the `basis:'percent'` fallback. Someone with
the admin key should run:

    curl -sS -H "x-admin-key: $ADMIN_KEY" \
      "https://progress.apcsexamprep.com/api/admin/class/e57aa18d-92ca-4cc6-84bf-7c821a8c042e/gradebook"
    curl -sS -H "x-admin-key: $ADMIN_KEY" \
      "https://progress.apcsexamprep.com/api/admin/class/e57aa18d-92ca-4cc6-84bf-7c821a8c042e/gradebook/as-teacher"

and diff the two `overall` blocks. I expect them to differ exactly as above.

## Recommendation

Rewrite #85 rather than working it as written. As written it asks for a rebuild
that is already done. What is left is smaller and different:

1. Point `/class/:id/gradebook` at `buildCanonicalGradebook`, or delete it and
   let `as-teacher` be the endpoint. One builder, which is what CLAUDE.md already
   says.
2. Extend smoke test 12 to cover the plain endpoint, so the two cannot diverge
   again. Without this, step 1 can silently regress.
3. Decide `basis`. CLAUDE.md defends it as a labelled fallback for a class with
   nothing priced; #85 says retire it. Those disagree, and only Tanner needs to
   settle it if the plain endpoint stops existing, because the contract has no
   `basis` field at all.

Not done here because #85 is size `l`, is owned by `agent`, and the point of
T-0.2 was to find out whether the rebuild is needed before anyone spends a
session on it. It is not needed. A much smaller change is.

**#84, the seven missing denominators that BLOCKS #85, is `status=done` and
`verified=NO`.** Whether those seven are actually authored is a separate live
check that also needs the admin key, and it gates any re-scoping of #85.
