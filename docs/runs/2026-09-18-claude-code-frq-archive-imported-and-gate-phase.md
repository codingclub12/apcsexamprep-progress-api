# The FRQ archive repair went live, and closing the gate found two real holes

2026-09-18, Claude Code.

Tanner imported all seven archive sheets plus the 2026 question set. This note
covers the verification, and the two defects that turned up while trying to
close the deploy gate. Neither was in the repair.

## What is live

    titles   43 ok, 0 failed
    bodies   86 ok, 0 failed
    hub      13 ok, 0 failed

Every assertion in `scripts/verify-csa-frq-archive-live.js` is written false
before the import and true after, so this is 142 things that changed. The hub's
thirteenth is the one worth naming: "no countdown to the dead date" now passes,
which is the third countdown script, the one writing `2026-05-15T08:00:00` where
the other two wrote `T00:00:00`. A literal find had matched two of three.

Sheets 02 to 06 were regenerated against live bodies before delivery and came
out BYTE IDENTICAL to the committed versions. That is the runbook's
regenerate-before-import step passing: nothing had edited those pages in the day
they sat unimported.

## Defect 1: the gate was unclosable by construction

`node scripts/deploy-gate.js deploy-gates/2026-09-17-csa-frq-archive-repair.json`
refused to ship, on the `rederive` check, with
`already carries the 2026 scoring note`.

That check's command IS the generator, and every transform in the generator is
find-or-refuse: `addScoringNote` throws the moment the note is on the page. So
the check is real evidence BEFORE the import and impossible after it. The
manifest could never be satisfied without `--pre`, while reading like a genuine
refusal to ship. The runbook told you to run it both ways; one of those runs
could not pass.

The gate already had the mirror of this, hardcoded since it was written: `live`
is deferred on a `--pre` run because it cannot observe a deploy that has not
happened. Nobody had needed the other direction.

So a check may now declare a `phase`: `pre`, `post`, or `both`, which is the
default. The `live` rule stays hardcoded rather than being rewritten in terms of
phase, so all 81 other manifests behave exactly as they did. Only this one uses
the field.

Three things kept it from becoming a way to delete a check:

- A `phase: pre` check still RUNS on a `--pre` run, and a failing one is still
  refused. Scheduling, not skipping.
- A deferred check is NAMED in the output, with the reason. A gate that quietly
  drops a check reads like a clean run over work nobody did.
- A misspelled phase is an error, not a silent fall back to "both". `PHASES` is
  validated per check.

And the abuse path is closed by arithmetic rather than by a new rule: marking
the only live-or-rederive check `pre` leaves the post run standing on suite and
mutation, which trips MIN_KINDS.

## Defect 2: the one door did not retry 503

With the phase fix in, the gate failed again, on `live`, at 141 ok 1 failed,
where the same three checks had been 142 of 142 twenty minutes earlier.

The failures were `503`, never the same handle twice. Run three times the
verifier lost 7 handles, then 1, then a different 1. Every one of those handles
answered 200 with the expected body when fetched on its own a moment later: the
note present, `25 points` present, the stale date gone.

`lib/storefront-fetch.js` has had a bounded retry since 2026-09-04, built for
exactly this after `verify-cyber-qotd-live` was throttled on its sixth request
and called a correct import broken. It was scoped to `429`. Shopify also sheds
load with `503`, and this verifier walks 142 requests in one pass.

`503` joins `429`. `502` and `504` did not: they are plausibly transient too,
but nothing here has observed one, and that list should earn entries by
measurement rather than by argument.

The reason this is worth fixing rather than re-running: a verifier that goes red
at random is a verifier that gets ignored, and that is how a guard gets switched
off. It is also the same failure the module was built to prevent, a transient
limit read as a fact about the page.

## The mutation run found two hollow assertions in the suite I had just written

Both in the new phase section, and this is the rule earning its keep again.

- The unknown-phase test reused `TRUE` as its command, which is also the command
  in `full()`. Disabling the phase validation left the DUPLICATE-command rule to
  refuse the manifest, so the assertion passed for the wrong reason. Fixed by
  giving it a command of its own.
- The abuse-path test claimed to pin `REQUIRED_ONE_OF`, and cannot. `KINDS` has
  four members, two of which are `live` and `rederive`, so a manifest with
  neither reaches at most two kinds and `MIN_KINDS` fires as well. The two
  guards cannot be separated. The assertion now says so, and a comment records
  why, so nobody reads the redundancy as a bug.

The 429 retry, meanwhile, had never been tested at all in four days of
existence. It is now, against a real HTTP server, and so is the narrowness: a
404 must NOT be retried, because a 404 retried three times is still a 404 and
waiting on it only makes a red check slower.

That test had to run the server in its own PROCESS. Every caller of
`storefront-fetch` is synchronous, so the `Atomics.wait` between retry attempts
blocks the event loop and an in-process `listen()` never fires. The first cut
died on a null address.

## Evidence

    npm run smoke:deploygate      42 passed, 0 failed
    npm run smoke:storefront     141 passed, 0 failed
    npm run smoke:csafrqrepair    66 passed, 0 failed
    node scripts/deploy-gate.js deploy-gates/2026-09-17-csa-frq-archive-repair.json
      3 independent kinds agree: suite, mutation, live. clear to ship.

Mutations, each isolated to the assertion it targets:

    phase:pre not deferred post-deploy        red on 7.1-equivalent
    phase:pre deferred everywhere             red on "the same check runs"
    unknown phase treated as the default      red on "an unknown phase is refused"
    deferral not recorded                     red on "the deferral is NAMED"
    503 dropped from the retry set            red on 7.1
    retry loop disabled                       red on 7.1
    narrowness removed, everything retried    red on 7.5

## A sha pin is the right live check only when the change touches what the API serves

Added after the fact, because the gate manifest written to record all of the
above shipped with a defect of exactly the kind it was built to catch.

That manifest's live check pinned `"commit":"0c8de04"` from `/api/health`. The
convention in CLAUDE.md says to pin the sha now serving, and that convention is
right. It is right for a change that alters what the API serves, where the sha
is a proxy for the new behaviour being reachable.

This change altered nothing the API serves. It is tooling: a gate script, a
fetch module, two smoke suites. So the sha pin was a proxy for nothing, and it
was true for about ten minutes. Three other pull requests merged, production
moved to their commits, and the manifest became permanently unpassable while
reading like a regression on a change that was completely fine.

The first instinct was to leave the pin and add a comment explaining that a red
means staleness. That is worse, not better. The entire point of the file was to
make six mutations re-runnable, and a manifest that cannot run makes nothing
re-runnable. A comment does not fix a gate, it just excuses one.

**The refinement, for the next session reading the live-check rule:** ask what
the change made true THAT STAYS TRUE. If the answer is "a sha was serving for a
while", that is a dated receipt, not a check. For a change with no observable
API surface, `rederive` is the honest kind, and the gate already accepts it in
place of `live`.

`scripts/rederive-retry-policy.js` is what went in instead. It answers "which
codes does the one door retry" twice, from paths that share no code: a text
parse of the `RETRY_CODES` literal, and a behavioural probe of `raw()` against a
local server that answers a code once and then 200, counting the requests that
arrive. It probes 404, 429, 500, 502, 503 and 504, so it asserts the narrowness
and not only the additions.

Each direction of disagreement means something different and it says which:

    in the source, not the behaviour   the set was widened and the loop cannot
                                       act on it. This is what a broken retry
                                       looks like while reading perfectly
                                       correct.
    in the behaviour, not the source   something retries outside RETRY_CODES,
                                       so the set is no longer the policy and a
                                       reader of the module is being misled.

Both directions measured against a deliberate break rather than argued for.

## Still open

- **The 2027 bootcamp date.** `config/csa-frq-bootcamp-2027.json` has no
  `liveDate`. Set it, regenerate, re-import that sheet.
- **`/api/health` reports `reporters.ok: false`**, and 11 ap-csa Unit 1
  activities have completions with no manifest row. Pre-existing, unrelated to
  this work, and not mine to have fixed on the way past.
- **`502` and `504` in the retry set.** Deliberately absent. Add on measurement.
