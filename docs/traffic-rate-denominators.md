# Money per 1000 of what

Board 376. Read this before adding a rate column to `lib/traffic-csv.js`, before
importing a vendor export that carries one, or before using the `rpm` metric.

## The three rates are not interchangeable

    rpm              earnings / PAGEVIEWS    x 1000
    session_rpm      earnings / SESSIONS     x 1000
    impression_rpm   earnings / AD IMPRESSIONS x 1000   (what vendors call eCPM)

All three are dollars and all three are called some kind of RPM, which is the
whole problem. Measured on Raptive's own export for 2026-08-14 to 09-12, where
the vendor supplies both and its own arithmetic reconciles on all 30 rows:

    mean page rate      $7.20
    mean session rate  $21.42
    ratio               2.97
    pages per session   2.82

`lib/class-monetization.js` multiplies `rpm` by **pageviews**. So a session rate
stored in `rpm` overstates every class revenue figure by pages-per-session, which
on this site is about three times, with nothing on the page to say so.

**`rpm` is the page rate and nothing else.** Its contract label is "Page RPM"
rather than "RPM", because a bare RPM on a chart axis is exactly the ambiguity
this split removes.

## A bare "RPM" column is refused, not guessed

Raptive exports `Page RPM` and `RPM` side by side, and **the bare one is the
session rate.** So the header `RPM` cannot be mapped: whichever metric it went to
would be wrong for some vendor.

`AMBIGUOUS` in `lib/traffic-csv.js` holds `rpm` and `cpm`. A column matching one
is reported in `ambiguous_headers` with both readings and the remedy, and no
value is stored. `POST /api/admin/traffic/import` passes that field through, so
an importer whose rate never landed can find out why.

Nothing is stored is the safe direction. A missing reading makes the model report
`null`, which is recoverable. A wrong one looks correct.

## Why it was a real defect and not a theoretical one

Until 2026-09-25, `HEADER_MAP` read:

    ['rpm', ['rpm', 'pagerpm', 'sessionrpm', 'ecpm']],

One metric, four synonyms. `mapHeaders` keeps the FIRST match and skips the rest,
so **which column won was decided by its position in the file** rather than by
what it meant. Raptive happens to put `Page RPM` to the left of `RPM`, so a naive
import of the real export was correct by luck. Swap the two columns, or use a
vendor that orders them the other way, and the same code silently stores the
session rate.

That is why the fix is a split rather than a reorder: a reorder keeps the luck
and makes it slightly better luck.

## Adding a rate column

Name the denominator in the synonym list, never the bare word:

    ['rpm',            ['pagerpm', 'pageviewrpm', 'rpmpage', 'pagecpm']],
    ['session_rpm',    ['sessionrpm', 'rpmsession', 'visitrpm', 'sessioncpm']],
    ['impression_rpm', ['ecpm', 'impressionrpm', 'adrpm']],

`AMBIGUOUS` is consulted BEFORE `HEADER_MAP`, so adding a bare `rpm` to one of
these lists by mistake is inert: the refusal returns first. That ordering is the
defence, so the ordering is what the mutation battery breaks. Two mutations that
added the stray synonym were removed from that battery for leaving the suite
green, which is the ordering working rather than a gap. A mutation that cannot
fail is not a test.

## Testing

    npm run smoke:traffic              the rules, in the "Rate denominators" section
    npm run smoke:trafficrpmmutation   7 rules broken on purpose, each red for its own assertion

The assertion worth understanding is `ORDER NO LONGER DECIDES`: the same file with
the two rate columns swapped must still yield the page rate. That is the one the
old code failed.
