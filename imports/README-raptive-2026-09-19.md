# Raptive earnings, 2026-08-18 to 2026-09-16

Source: Raptive "Ad Earnings Overview", last 30 days, supplied 2026-09-19.

## Import it

    curl -X POST https://progress.apcsexamprep.com/api/admin/traffic/import \
      -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" \
      -d "$(node -e '
        const fs=require("fs");
        console.log(JSON.stringify({source:"raptive",
          csv:fs.readFileSync("imports/raptive-2026-08-18-to-2026-09-16.csv","utf8")}));
      ')"

Add `"dry_run":true` first if you want to see what it would write.

## Why this file has no RPM column, and why that matters

The Raptive export reports **Sessions**, not pageviews. Revenue divided by
sessions is a SESSION RPM, and `lib/class-monetization.js` multiplies its RPM by
PAGEVIEWS. Loading one as the other overstates every class revenue figure by the
pages-per-session ratio, which on a content site is usually somewhere between
1.5x and 3x.

`lib/traffic-csv.js` will not protect you from this. `HEADER_MAP` maps both
`pagerpm` and `sessionrpm` onto the single `rpm` metric, so an export carrying a
Session RPM column lands in the same place a Page RPM would, silently. That is
board task 376.

So this file carries `Earnings` and `Sessions` only. It produces exactly 60
readings, 30 `revenue` and 30 `sessions`, and no `rpm` at all. With no stored
`rpm`, `siteRevenue()` falls through to its second branch and derives the page
RPM itself as `revenue / ga4_pageviews * 1000`, which is a true page RPM and is
labelled `derived_from_revenue_and_ga4_pageviews` in the response so a reader can
see which branch produced it.

**That branch needs GA4 pageviews in `metrics_daily`.** Run
`POST /api/admin/traffic/pull` for the same date range, or the model keeps
returning `rpm_usd: null` and every revenue figure stays null, which is the
correct behaviour rather than a bug.

## What is in the window

Verified by parsing the generated file back and diffing against the source:
30 rows, 2 metrics each, 0 mismatches.

    total            47,448 sessions, $1,012.17
    weekdays         mean 1,910 sessions, $41.51
    weekends         mean   678 sessions, $12.36, so 30% of a weekday

The weekday/weekend split is the first independent support for the
`SCHOOL_DAYS_PER_YEAR = 180` assumption in the model. It was a stated assumption
with nothing behind it until now.

**Aug 18-21 is anomalous and should be excluded from any baseline.** Those four
days carry 26% of the window's sessions and 9% of its earnings, at a session RPM
of $7.48 against $27.79 for every other weekday: more than twice the traffic of a
normal day, earning about half as much. Board task 377.

With that block removed, the defensible baseline over 18 weekdays is:

    median session RPM      $27.99
    mean weekday earnings   $45.53
    x180 school days        $8,196/yr from school days alone

**There is no RPM trend in this window.** First half $27.93, second half $27.68,
a change of -1%. The 67% "increase" visible across the raw month is entirely the
Aug 18-21 block sitting in the first half and dragging it down. Earnings did rise
21%, and that is traffic volume rather than rate.

The ad-stack placement fix is NOT in this data: it merged 2026-09-18, two days
after the window closes. Whatever lifted the rate around Aug 24 is not that, and
is not identified.
