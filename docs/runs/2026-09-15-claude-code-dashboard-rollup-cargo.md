# The sheet was right. Two of its three changes had nobody's name on them

2026-09-15, Claude Code, board 318.

Board 318 is an IMPORT task, and an import is Tanner's click. So the work here
was not to ship it, it was to make it safe to ship: the sheet had been waiting
four days, it carries three changes rather than one, and by its own runbook only
the first had been verified by the session that built it.

## What the sheet is for

The teacher who reported the 483 percent column still opens a gradebook whose
class average is a mean of percentages. `lib/admin-gradebook.js` has summed
points since 2026-09-02, but the average and the column footers a teacher
actually reads are computed in the Shopify page body, which is a separate
surface nobody had updated. A class of two, one student on 1 of 1 and one on
12 of 40, reads 65 percent. They have earned 13 marks out of 41.

## Still fresh, which is the first thing to establish

`node scripts/verify-dashboard-rollup-live.js` reports the live page at 104858
bytes, `updated_at 2026-09-07`, unchanged since the sheet was generated. Nobody
fixed the page another way in those four days, so this is not the case the
runbook warns about, where importing would revert a better fix.

The loss guard in `scripts/page-body-csv.js`, re-run against the live page
today, names four deletions and only four: `rt-lesson`, `rt-ex`, `rt-quiz`,
`rt-exam`. They are the dead SAVING SOON switches change 2 removes on purpose.
Nothing else the live page has is dropped, which is the question worth asking
when a body is replaced outright and Shopify keeps no history.

## Opening the cargo

**Change 1, the rollup.** Verified against the exact bytes that ship, not
against the repo generally: the checker pulls the script out of the body, runs
it in a vm with a stub DOM, and calls the page's own `classAvg` and `colAvg` on
a fixture where the two rules give different answers. 31 of 62 is 50 and a mean
of 90 and 31 is 61. 19 of 22 is 86 and a mean of 90 and 50 is 70. Six checks,
all passing. A page that returned 61 and 70 would have the new function and the
old call site, which is exactly what a string search would have missed.

**Change 2, the retry panel.** The one that could have been bad. The panel
replaces four dead switches with three modes that save, and its save target is
`PATCH /api/teacher/classes/:code/retry`. If that route did not exist in
production, the new panel would be WORSE than what it replaces: the dead
switches at least failed visibly as "SAVING SOON", while a live-looking control
that 404s on every click reads as the teacher's fault.

It exists and it is deployed. Unauthenticated it answers
`401 {"error":"Teacher auth required"}` while a made-up route beside it answers
`404`, which is the difference between a route that is there and one that is
not, without a credential in the transcript. `classes.retry_mode` is in the
schema, and `/classes/:code/progress` returns the class row with `SELECT *`, so
the value the panel paints is the one the server enforces.

`npm run smoke:tchdashpage` section 11 already covered the behaviour more
thoroughly than the handover suggested: it asserts the PATCH goes out, carries
the mode the teacher picked, re-reads the class rather than trusting its own
click, and leaves the panel telling the truth after a 403. What it could not
cover is whether the endpoint exists in production. That needed the probe.

**Change 3, the unenforceable-lock warning.** Board 260. Nothing tested it. It
had ridden along on two sheets since 2026-09-07 with no assertion anywhere that
the glyph is appended, which is how a glyph quietly stops being appended.
Section 12 of the suite covers it now, seven assertions, mutation tested three
ways: drop the append, revert the aria-label, write the glyph as an entity. Each
goes red on its own named assertion.

The aria-label change is the part worth reading twice. It used to be
`Quiz: Not assigned`, which tells a screen reader that the lock is real while
the tooltip tells everybody else it cannot be enforced. It now carries the
explanation.

## Two comment edits, and the second one is not cosmetic

Both proved to be the only difference in the body: one differing region with
60452 identical characters before it and 51320 after.

**The labels were not verbatim and the comment said they were.** The three mode
blurbs are byte-verbatim from `retry-policy.js` MODE_DESCRIPTIONS, measured
rather than read. The three labels are not: MODE_LABELS reads
`Retries: everything` and the panel reads `Everything`, because the control sits
under a heading that already says Retries. That is the right call and the
comment claiming verbatim copying is a trap: the next session to diff them
"fixes" the labels and the panel says Retries four times.

**The rule against HTML entities was written as an HTML entity.** The comment
explaining "write the warning as a JS escape, never as the numeric entity, because
Shopify decodes entities on import" spelled the entity out. Shopify would have
decoded that one too, in the comment, so the live body and the repo mirror would
have differed by one character from the moment the sheet landed, and the next
regeneration would have seen a page that had drifted. A rule written in the form
it forbids is its own first exception.

That one was found by an assertion I wrote badly. The first version asserted the
entity appears nowhere in the body, went red, and the red was correct for a
reason I had not predicted.

## Evidence

`npm run smoke:tchdashpage`, 94 passed, 0 failed.

`node scripts/verify-dashboard-rollup-live.js --file shopify/cyber-dashboard.html`,
6 checks, against the bytes in the sheet.

`node scripts/matrixify-preflight.js matrixify/cyber-dashboard-gradebook-rollup-pages.csv --expect-command UPDATE`,
clear to import. The flag matters: the preflight defaults to MERGE and reports
`1 PROBLEM(S). Do not import.` without it, on a sheet that is fine. UPDATE is
what `scripts/page-body-csv.js` writes for every mirror-built sheet and it is
the safer command here, because MERGE would CREATE a page if the handle were
ever wrong.

`deploy-gates/2026-09-15-cyber-dashboard-rollup.json --pre` passes on suite,
rederive and three mutations. Its live check reads the live page and is false
until the import.

## Still open

- **The import.** One page, one row. The runbook carries the expected end state.
- **Board 335**, opened on the way: `scripts/page-body-csv.js` still detects
  mojibake with a pasted pattern of its own rather than through
  `lib/mojibake.js`. Same defect `scripts/matrixify-preflight.js` had until
  2026-09-04 and the same blast radius, since this script is the gate between an
  authored body and a live page. Its leads are the latin-1 flavour plus one
  cp1252 pair, so single-pass corruption of a 3 or 4 byte character walks
  through. The sheet here is clean, checked separately through the module.
