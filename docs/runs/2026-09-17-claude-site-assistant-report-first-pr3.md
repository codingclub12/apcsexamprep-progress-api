# Site Assistant report-first rescope, PR 3: the morning verify/fix stage

2026-09-17. Board 350. Section 6 of `docs/handoffs/Site-Assistant-Report-First.md`.
PRs 1 and 2 merged earlier today as #705, #711 and #713.

## What changed

- `lib/assistant/morning.js`, new. The three tiers and the guardrails. This is
  the file that decides what an automated writer is allowed to touch on a live
  storefront, so Never Touch is first in the code and first in the comment.
- `routes/assistant.js`: `GET /api/assistant/reports` and
  `PATCH /api/assistant/reports/:id`, both fail-closed.
- `scripts/morning-report-review.js`, new, plus `npm run morning`. Pulls open
  reports, reproduces each against the live site, classifies, and sends one
  `[APCS Morning]` email.
- The **Daily site audit** routine, `trig_01QjTYB7H7DMigFcAUw6FDbo`, got a new
  step 6. No new trigger was created, which the handoff asks for explicitly and
  which the trigger list explains: the Morning brief trigger has no environment
  and cannot write to the repo, while the Daily site audit already has both
  repos checked out and already runs at 09:30 UTC.

## The tier order is the whole design

`classify()` checks Never Touch FIRST and returns. A report that is both "a
broken internal link" and "students can see the unit test" is the second thing,
and a classifier that consulted the auto-fix list first would file it as a
redirect. That is not a hypothetical ordering worry: the auto-fix tier contains
`broken_internal_link`, so the two lists genuinely overlap on real reports.

Never Touch matches on the CATEGORY and on the TEXT, because either alone has a
hole. A category is a dropdown somebody may have picked wrongly; text is absent
for every student report by construction. Both are deliberately broad. A false
Never Touch costs one email to a human who was going to read the morning report
anyway; a false auto-fix costs a live page.

## Credentials, which is what will stop this working tomorrow

The endpoints are admin-key protected and **nothing in this project holds an
admin key**. Sixteen GitHub workflows hold `TODO_KEY`; none hold `ADMIN_KEY`.
The Claude Code environment has neither. So `npm run morning` will exit 2 with a
message naming exactly which variable it wants, and the trigger prompt tells
tomorrow's audit that this is the expected state rather than a fault to debug.

The design works with that rather than around it. `GET /api/assistant/reports`
accepts `ADMIN_READ_KEY` as well as the full key, because **the dry run only
reads**: it pulls reports, reproduces them against the live site, and writes
nothing. Requiring the full read-write admin key for that would mean putting a
credential that can rewrite any class onto a scheduled session in order to run a
routine that cannot write at all. `PATCH` does not accept the read key, because
setting a report to `fixed` emails the teacher who reported it.

So: `ADMIN_READ_KEY` is enough for the whole fourteen day dry run, and
`ADMIN_KEY` is needed before `MORNING_FIX_MODE=live`. Both are Tanner's, like
`REPORTS_TO`.

## What this PR deliberately does NOT build

The auto-fix tier has four issue types and **none of them writes anything yet**.
Every fix in that tier writes to the live storefront, through a Matrixify sheet
or a Shopify redirect, and shipping the writer on the same day as the thing that
decides when to write would mean the guardrails and the writes were never
reviewed apart. The dry run is fourteen days long. The writer lands inside it.

What is built is everything that decides: the tiers, the gates, the reproduce
step, the re-verify step, and the email.

## Evidence

    suite     smoke:assistantmorning           59 passed, 0 failed  (new)
              smoke:assistantwidget            61 passed, 0 failed
              smoke:assistantrouting           87 passed, 0 failed
              smoke:assistantreport            95 passed, 0 failed
    mutation  smoke:assistantmorningmutation   47 passed, 0 failed  (new)
              23 mutations, each caught by the assertion it was aimed at
    live      the trigger's updated_at moved to 19:50 and its prompt now
              carries step 6; next run 2026-09-18T09:35Z; no new trigger

## What the mutation battery found

One no-op, and it is the same shape as the two PR 1 found: the explicit
"not reproduced" branch in `classify()` is redundant with the fall-through, so
removing it lands on the same tier by a different route. The code is right and
the mutation was aimed at the wrong thing.

But it is not PURELY redundant: the two routes produce different reason strings,
and the reason is what a human reads at 7am. "Not reproduced to a known issue
type" is a sentence; "issue type null is on no tier list" is a stack trace with
manners. The suite now asserts the reason rather than only the tier, and the
mutation is aimed there.

## Open

- `ADMIN_READ_KEY` is not set, so the morning stage cannot run. Tomorrow's audit
  will say so in one line and carry on, which is what the prompt tells it to do.
- `REPORTS_TO` is still not set, so no report email delivers either. Unchanged
  since PR 1.
- The auto-fix writer is not built, on purpose, as above.
- `reproduce()` currently recognises exactly one issue type, mojibake, through
  `lib/mojibake.js`. The other three in the auto-fix tier need detectors, and
  each one is a separate piece of work with its own way of being wrong. Until
  then they classify as `needs_tanner`, which is the safe direction.
- The theme PR, APCSExamPrep-theme#121, is still open and unmerged, waiting on
  Tanner. Its CI is green on all eight checks.
