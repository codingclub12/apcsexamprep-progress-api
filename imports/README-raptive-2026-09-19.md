# Raptive earnings, 2026-08-14 to 2026-09-16

`imports/raptive-2026-08-14-to-2026-09-16.csv`, 34 days.

Built from two sources that were checked against each other first: the full
dashboard export (Aug 14 to Sep 12, with pageviews) and a pasted table
(Aug 18 to Sep 16, without). They overlap on 26 days and disagree on none.
The four days only the paste covers, Sep 13 to 16, carry revenue and sessions
but no pageviews, so they contribute no `rpm` reading. Nothing is filled in.

## Import it

    curl -X POST https://progress.apcsexamprep.com/api/admin/traffic/import \
      -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" \
      -d "$(node -e '
        const fs=require("fs");
        console.log(JSON.stringify({source:"raptive",
          csv:fs.readFileSync("imports/raptive-2026-08-14-to-2026-09-16.csv","utf8")}));
      ')"

Add `"dry_run":true` first to see what it would write. Expect **128 readings**:
34 revenue, 34 sessions, 30 pageviews, 30 rpm.

No GA4 pull is needed. An earlier version of this file said one was, because it
carried no pageviews and the model would have had to derive the page RPM from
GA4. The export has pageviews, so `rpm` is imported directly and
`siteRevenue()` takes its first branch, reporting `basis: 'reported'`.

## The column that must not be imported, and what it would have cost

The vendor exports **two** rate columns and they differ by about 3x:

    Page RPM    earnings / PAGEVIEWS x 1000      mean $7.20
    RPM         earnings / SESSIONS  x 1000      mean $21.42

Both reconcile exactly against the raw columns on all 30 rows, so there is no
ambiguity about which is which. `lib/class-monetization.js` multiplies its RPM
by **pageviews**, so only Page RPM is correct there.

Measured on this data, importing the session figure instead would have
overstated every class revenue number by **2.97x**. Pages per session over the
window is 2.82, which is the same ratio from the other side.

**`lib/traffic-csv.js` stops you now, and did not when this was written.** Board
376 is fixed as of 2026-09-25: `rpm`, `session_rpm` and `impression_rpm` are three
separate metrics, a bare `RPM` header is refused and reported in
`ambiguous_headers` rather than guessed at, and the contract labels `rpm`
"Page RPM". Importing the raw vendor file is now safe whatever order its columns
come in. See `docs/traffic-rate-denominators.md`.

As it stood when this sheet was built: `HEADER_MAP` mapped `pagerpm`, `sessionrpm`
and a bare `rpm` all onto the one `rpm` metric, and which one won was decided by
**column order** rather than by meaning, because `mapHeaders` keeps the first
match and skips the rest. In this export `Page RPM` happens to sit left of `RPM`,
so a naive import of the raw file would have been correct by luck.

This sheet is written with `Page RPM` and no `RPM` column at all, so its outcome
never depended on that luck, and it imports identically before and after the fix.

## What the window says

Verified by parsing the generated sheet back and diffing against both sources:
0 value mismatches, and the stored `rpm` is the page RPM on every row (checked
positively, by confirming it never equals that day's session RPM).

    weekdays    mean 1,910 sessions, $41.51
    weekends    mean   678 sessions, $12.36, so 30% of a weekday

The weekday/weekend split is the first independent support for the
`SCHOOL_DAYS_PER_YEAR = 180` constant in the model, which shipped as a stated
assumption with nothing behind it.

**Aug 18 to 21 is anomalous and is excluded from the baseline.** Four days
carrying 26% of the window's sessions and 9% of its earnings. With pageviews in
hand it is clearly low-value traffic rather than a counting artefact, because it
is depressed on both measures at once:

                        page RPM    pages per session
    Aug 18-21             $4.05           1.87
    every other weekday   $8.03           3.40

Half the rate and half the depth. Board task 377.

## The baseline

Clean weekdays, n=17:

    median page RPM     $7.95
    mean page RPM       $8.03
    most recent 5       $8.18      likeliest forward rate

## The trend, and a correction

Page RPM is **rising**, and an earlier note in this repo said the rate was flat.
That earlier reading was taken on the SESSION rpm, over a window ending Sep 16,
and on that metric it was -1%. Both numbers are arithmetically right. They
disagree because pages per session fell over the same period, from 3.67 to 3.21,
and a session rate nets that against the page rate and reports neither.

Fewer pages per visit, each worth more. Only the page rate says so.

Cut the window five ways and the direction holds while the size does not:

    all weekdays Aug 14 to Sep 12      +55%
    clean weekdays                     +38%
    clean weekdays from Aug 24         +34%
    clean weekdays from Aug 25         +19%
    last 15 weekdays                   +34%

So: up, somewhere between a fifth and a half, and 30 days cannot say more than
that. This is the case for the model's own staging rule rather than an argument
against it. `stage` will not read `estimate` until 60 days of revenue and class
behaviour overlap, and this is why.

The ad-stack placement fix is **not** in this data. It merged 2026-09-18, after
both windows close. Whatever lifted the rate from about Aug 25 is not that, and
is not identified.
