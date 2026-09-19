# What a classroom is worth in ads

`GET /api/admin/class-monetization`, backed by `lib/class-monetization.js`.

This exists to answer one question with a number you can defend: if a teacher
pays for an ad-free room, what did we just give up? Everything else in here is
in service of making that number checkable rather than plausible.

Read this before changing the model, adding a course to it, or quoting a figure
out of it.

## The funnel

    enrolled -> active -> sessions -> pageviews -> estimated ad revenue

Each stage is a different kind of uncertainty, and that is the reason it is a
funnel rather than one number. `enrolled` is a fact we hold. `active` is a fact
we hold. `pageviews` is currently mostly an estimate, and the revenue on the end
of it is only as good as whatever Raptive CSV was imported last. Collapsing
those into a single dollar figure hides which end is weak, and the weak end
moves a lot.

## The four rules that make the number worth having

**A missing reading is `null`, never `0`.** No RPM in `metrics_daily` means
every revenue figure in the response comes back null with a `unpriced_reason`
saying what to go import. This is the same rule the gradebook contract follows
for an unattempted cell, and it matters more here, not less: a class that reads
`$0 of ads` looks like a class not worth protecting, and the entire argument for
charging for an ad-free room inverts.

**An estimate is never labelled a measurement.** Every priced row carries a
`pageview_basis` of `measured`, `estimated`, `suppressed` or `none`, and the
confidence band widens when the basis is estimated. If you are reading a figure
and cannot see which basis produced it, you are reading it wrong.

**A class too small to anonymise reports nothing about its behaviour.** Below
five active students, a per-class row comes back with `suppressed: true` and
nulls. At one active student, a "class pageview rate" is one child's browsing
habits with a class code attached. The rollups and the scenario table are
unaffected, because nothing about pricing a 28 student room requires reading a
1 student room.

**Owner, prober and audit classes never set the rate.** They are classified
`excluded` and are kept out of the calibration and out of the pooled per-student
rate. Tanner's own test classes are among the heaviest users on the site, and
letting them in would price every school off his browsing. The mutation battery
proves this by leaking them in on purpose and requiring the suite to go red.

## Where the pageviews come from, and why most of them are estimated

`sessions.page_views` is the only measured pageview signal we own. It is written
by `POST /api/progress/heartbeat`, which is fed by `public/heartbeat-reporter.js`.

That reporter is not on the storefront. Checked live on 2026-09-19 against three
AP Cybersecurity Unit 1 lesson pages through `lib/storefront-fetch.js`: all three
carry `apcs-tracker.js`, none carries `heartbeat-reporter` or the
`APCS_HEARTBEAT` config block it needs. Nothing in the theme repo references it
either. So for almost every class, `page_views` is 0, and 0 there means "not
instrumented" rather than "read nothing".

Until that changes, a class with no measured pageviews has its pageviews
estimated from its graded events:

    pageviews_per_event = sum(measured pageviews) / sum(graded events)
                          over the classes that carry BOTH signals

    estimated pageviews = that class's graded events x pageviews_per_event

The ratio is derived from our own rows rather than from GA4, which is why this
needed no new analytics dimension, no third party, and no privacy decision. It
also self-corrects: every page that gets instrumented moves a class from the
estimated basis to the measured one and tightens the ratio for everyone still on
the estimate.

The honest limit: a class that submits a lot and reads little, or reads a lot and
submits little, is mis-estimated in proportion to how far it sits from the site
average. That error is what shrinks as instrumentation coverage grows, and
`instrumentation.coverage_pct` in the response is the number to watch.

## Why this is not a GA4 custom dimension

The obvious build is to stamp `class_id` onto GA4 events and let Google roll it
up. Two reasons we do not.

Our students are minors on a name and a PIN, and the repo posture is zero PII
with exactly one named exception. Sending class membership to an analytics
vendor is a second exception, and a second exception is a decision for Tanner
rather than a patch someone lands on a Tuesday.

And we do not need it. `sessions` already carries `class_id`, `page_views`,
`active_seconds` and a first-touch channel. `score_events` and `attempts` carry
`class_id` with a timestamp. The attribution GA4 would have to be taught is
already sitting in our own tables, already bounded, and already never leaves the
box. The `paid_class` and `student_tier` split it would also need is
`premiumStatus()` in `lib/admin-metrics.js`, which has existed for weeks.

## Annualising

A class generates pageviews on school days, so a daily rate annualised over 365
roughly doubles it. The constant is `SCHOOL_DAYS_PER_YEAR = 180` and it is
returned in `assumptions` so you can re-run the arithmetic with your own.

The daily rate divides by ACTIVE days, not by the window. A 30 day window
containing a two week break would otherwise read as an engagement collapse, and
a class that worked one day would read as a full year of traffic.

## The report ties out to itself

Take the `est_annual_pageviews` a row states, divide by 1000, multiply by the
`rpm_usd` the response states, and you land on that row's
`est_annual_revenue_usd`. Every time.

That sounds like it should be free, and it was not. The first cut priced off an
unrounded pageview count while reporting the rounded one, and
`scripts/class-monetization-rederive.js` found two of twenty four generated
classes a cent out. The defect only shows on small classes: four pageviews over
seven active days annualises to 102.857, and a $9.37 RPM prices the unrounded
figure at $0.96 and the reported 103 at $0.97. The hand-written fixture used
round numbers and could not see it at all.

A report a reader cannot reconcile is not checkable, whichever of the two numbers
happens to be more accurate. The rule now has its own assertion and its own
mutation.

## Maturity, which is derived and not asserted

The response carries a `stage`, computed from JOINT COVERAGE: days on which we
hold both a revenue reading and class-side behaviour. An intersection, not the
smaller of the two counts, because two months of revenue and two months of
behaviour that never overlap price nothing.

| stage | joint days | what it is good for |
|---|---|---|
| `rough` | 0 to 59 | order of magnitude, planning conversations |
| `estimate` | 60 to 149 | planning against, not pricing against |
| `pricing_grade` | 150+ | setting a price |

A caller cannot pass in a stage. That is the point: the thresholds exist so a
February pricing decision cannot quietly be made on October data.

## Reading the response

```
GET /api/admin/class-monetization?days=30&sizes=28,55,110
x-admin-key: <admin key, full or read-only>
```

Fail closed, same posture as everything under `/api/admin/*`. The read-only key
reaches it because the payload carries no student or teacher identity and there
is no reveal mode that would add one.

`?include_classes=false` returns the rollups without the per-class array, which
is what you want on a store with 637 classes.

The blocks that matter:

- `stage` how far the model can be trusted today, and why
- `site_revenue` the RPM and where it came from, or nulls
- `instrumentation` how many classes have a measured pageview, and the coverage
- `calibration` the pageviews-per-event ratio and how many classes set it
- `by_tier` premium against free, which is the opportunity-cost split
- `scenarios` the table you actually quote from
- `classes` per class, suppressed where too small

## What has to happen for December and February

The schema half is done and has been for a while, which was the surprise when
this was built. What is left is short.

**Instrument the pages.** Include `heartbeat-reporter.js` on storefront lesson
pages so `sessions.page_views` fills with real numbers. This is theme work, it
writes student session data, and it is therefore Tanner's call rather than an
agent's under the `NEVER_AUTO` rules. Until it lands, every pageview figure in
this model is estimated from graded events and the band stays wide.

**Import Raptive regularly.** `POST /api/admin/traffic/import` takes the CSV
export. Without it every revenue figure is null. A monthly import is enough for
`estimate`, and the joint-coverage rule means the import dates have to overlap
days classes were actually working, which in practice they will.

Do both and the joint coverage clock starts. Sixty days of overlap moves the
model to `estimate`, which on a September start lands around late November. A
hundred and fifty lands in February, which is where the pricing conversation was
already headed.

## Testing

    npm run smoke:classmonetization           44 assertions, offline
    npm run smoke:classmonetizationmutation   14 rules broken on purpose
    npm run smoke:classmonetizationrederive   a second implementation, must agree

The re-derivation is the one worth understanding. It computes the same figures
with one query per class and no `GROUP BY` anywhere, over a seeded generated
fixture, so a grouping bug in the module cannot survive both paths. Pass a seed
as the first argument to reproduce a failure. It has already earned its place
once, by catching the rounding defect described above.
