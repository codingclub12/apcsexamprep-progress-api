# Classroom ad-revenue model, and the collection half that was already built

2026-09-19, Claude Code, board 375.

## What was asked

Rough range now, real estimate by December, pricing-grade by February, for what
a classroom is worth in ad revenue. The framing named the blocker as
"class-level monetization attribution", and asked for a privacy-safe
`class_id` / `paid_class` / `student_tier` dimension "to GA4 or your own
analytics".

## What was actually there

The surprise, and the reason this landed in one pass: most of the collection
half already exists and nobody had said so.

- `sessions` carries `class_id`, `page_views`, `active_seconds`, `total_seconds`
  and a first-touch `channel`, one row per visit, upserted monotonically.
- `POST /api/progress/heartbeat` writes it, rate limited at 40/min per student,
  zero PII by design, documented in `docs/session-time-tracking.md`.
- `premiumStatus()` in `lib/admin-metrics.js` is already the `paid_class` /
  `student_tier` split: a class is premium when its (teacher, course) holds a
  live entitlement.
- `metrics_daily` already reserves `raptive` as a source with `rpm`, `revenue`
  and `ad_impressions` metrics, and `POST /api/admin/traffic/import` already
  takes the Raptive CSV.

So the dimension that was asked for does not need building and does not need to
go to GA4. It needed joining up, and it needed something to refuse to lie when
the data is thin.

## What was missing, verified live rather than assumed

`public/heartbeat-reporter.js` is not on the storefront.

Checked through `lib/storefront-fetch.js` (no User-Agent, per the 2026-09-03
rule) against three live AP Cybersecurity Unit 1 lesson pages:

    /pages/ap-cybersecurity-unit-1-social-engineering   666990 bytes
    /pages/ap-cybersecurity-unit-1-password-attacks     667678 bytes
    /pages/ap-cybersecurity-unit-1-wireless-security    552334 bytes

All three carry `apcs-tracker`. None carries `heartbeat-reporter` or
`APCS_HEARTBEAT`. A grep of the whole theme repo for "heartbeat" returns
nothing. `docs/session-time-tracking.md` says the reporter is "the canonical
reference implementation ... copy it there or serve it from the API origin, and
include it on lesson pages after login", and that second half never happened.

So `sessions.page_views` is empty for practically every class, and 0 there means
"not instrumented" rather than "read nothing". That distinction is the whole
design problem.

## What shipped

`lib/class-monetization.js`, the one place a class's monetization shape is
interpreted, plus `GET /api/admin/class-monetization` as a thin read over it.

The funnel is `enrolled -> active -> sessions -> pageviews -> estimated revenue`,
per class, with the tier split attached. Pageviews are measured where the
heartbeat runs and estimated from graded events where it does not, using a ratio
derived from the classes carrying both signals. The ratio comes from our own
rows, so this needed no GA4 dimension, no third party and no second PII
exception, and it tightens on its own as pages get instrumented.

Four rules are enforced rather than documented:

- a missing reading is `null`, never `0` (a class reading `$0 of ads` inverts the
  argument for charging for an ad-free room)
- an estimate is never labelled a measurement, and its confidence band is wider
- below five active students a class reports nothing about its behaviour
- owner, prober and audit classes never set the rate real schools are priced on

The maturity `stage` is derived from joint coverage, the intersection of days
carrying both a revenue reading and class behaviour. A caller cannot assert it.
That exists so a February pricing decision cannot be made on October data by
accident.

## The defect the re-derivation caught

`scripts/class-monetization-rederive.js` is a second implementation: one query
per class, no `GROUP BY` anywhere, over a seeded generated fixture. It
disagreed with the module on 2 of 24 classes, by one cent.

The module was pricing off an unrounded annual pageview count while REPORTING
the rounded one. Small numbers only: 4 pageviews over 7 active days annualises
to 102.857, and a $9.37 RPM prices the unrounded figure at $0.96 and the
reported 103 at $0.97.

The hand-written smoke fixture uses round numbers (18000 and 9000 annual
pageviews at $12.00) and could not see it. Neither could review. The module now
rounds first and prices second, so a reader can take the pageview figure a row
states, multiply by the stated RPM, and land on the money that row states. That
property has its own assertion, on deliberately awkward numbers, and its own
mutation.

## The hollow test the mutation battery caught

The first battery run had "THE IDLE GUARD IS REMOVED" staying GREEN.

The integration case that was meant to cover it deleted a class's sessions and
score events, which makes pageviews null, so the `pv == null` branch returned
before the zero-active-days branch was ever reached. The test passed for the
wrong reason and the guard was untested.

It is also unreachable through the tables: a measured pageview implies a session
inside the window, which implies an active day, and an estimated pageview
implies a graded event, which implies one too. So the guard is pinned directly
on `priceRow` with a synthetic row instead, and the comment says why. An
unreachable guard still has to hold; the day a new signal contributes pageviews
without contributing a day, it is what stops the model reporting Infinity as
money.

## The pooling defect, found by benchmarking rather than by review

Benchmarked at the live shape before merging: 637 active classes, 1826 active
students, 82k graded events over 90 days. Performance was never the problem.
64ms for a 30 day report, 136ms for 90 days, 3MB of heap across several runs.

The scenario table came back null.

1826 students over 637 classes is 2.9 students a class. The k-anonymity floor
is 5 active students, and the first cut dropped every suppressed class from the
POOLED rate as well as from its own row. So every class fell below the floor,
the pool had nothing in it, and the tool answered nothing on the only data it
will ever see.

The floor protects a ROW. Aggregating across hundreds of classes is exactly
what k-anonymity permits, and excluding the small ones from a total is how a
census would lose its smallest towns. The floor now applies to the POOL: at
least 3 classes and 20 active students, or the rate is null with a reason
naming both thresholds.

Two things worth keeping about how this was found. It was not reachable by
reading the code, because the code was self-consistent and every hand-written
fixture had 10 student classes. And a benchmark written to answer "is this fast
enough for a 1 vCPU box" answered a completely different question, because it
was the first thing to run the model against a realistic SHAPE rather than a
realistic size.

The same pass added a second correction that is a modelling judgement rather
than a privacy rule: solo ME- accounts are kept out of the pool. The scenario
table answers "what is a 28 student classroom worth", and a self-study student
working alone is a different population from a class assigned work by a teacher.
Averaging the two gives a number that describes neither. Solo classes are still
reported in `by_tier`.

## Evidence

    npm run smoke:classmonetization            52 passed, 0 failed
    npm run smoke:classmonetizationmutation    19 passed, 0 failed (17 rules, each red for its own assertion)
    npm run smoke:classmonetizationrederive    8 passed, 0 failed, on 10 separate seeds
    npm run smoke:mutationleak                 42 passed; 11 harnesses, tree clean
    node scripts/deploy-gate.js deploy-gates/2026-09-19-class-monetization-model.json
                                               3 independent kinds agree: suite, rederive, mutation
    benchmark at 637 classes / 1826 students   64ms at 30d, 136ms at 90d, 3MB heap
    npm run smoke:encoding                     54 passed, no mojibake
    npm run smoke:volumepaths                  nothing the server reads is hidden by the volume
    npm run smoke:storefront                   144 passed
    npm run smoke:admingates                   43 passed
    npm run smoke:adminreadkey                 20 passed

All three new suites enroll in `Offline smoke suites` automatically, because
`.github/workflows/tests.yml` derives the suite list from `package.json`.

## Still open

**The pages are not instrumented, and that is now the only thing between here
and a December estimate.** Including `heartbeat-reporter.js` on storefront
lesson pages is theme work that writes student session data, which is on the
`NEVER_AUTO` list, so it is Tanner's call rather than an agent's. It is a small
change: one snippet, rendered from `layout/theme.liquid` beside
`quiz-tracker-wiring`, self-gating on the student token the tracker already
uses.

**Raptive has to be imported.** Every revenue figure is null without it.
`POST /api/admin/traffic/import` takes the CSV export. Whether production
currently holds any `raptive` rows could not be checked from here: this session
holds `COMMAND_READ_TOKEN` and `TODO_KEY` only, and every `/api/admin/*` route
is fail closed against both.

**Nothing here sets a price.** Money and pricing is `NEVER_AUTO` rule one. This
is the instrument, not the decision.
