# Money per 1000 of what, and a gate that refused me for the right reason

2026-09-25, Claude Code, board 376.

## The defect

`lib/traffic-csv.js` mapped four header synonyms onto one metric:

    ['rpm', ['rpm', 'pagerpm', 'sessionrpm', 'ecpm']],

`mapHeaders` keeps the FIRST match and skips the rest, so which rate column won
was decided by its POSITION IN THE FILE rather than by what it meant.
`lib/class-monetization.js` multiplies that metric by PAGEVIEWS, so a session rate
landing in it overstates every class revenue figure by pages-per-session.

Measured rather than argued, on Raptive's own export for 2026-08-14 to 09-12,
whose own arithmetic reconciles on all 30 rows: page rate $7.20, session rate
$21.42, a factor of 2.97, with pages per session at 2.82 from the other side.

Raptive puts `Page RPM` to the left of `RPM`, so importing the real file was
correct **by luck**. That is why the fix is a split and not a reorder: a reorder
keeps the luck and merely makes it better luck.

## The fix

Three metrics where there was one, named for their denominators: `rpm` (pages),
`session_rpm`, `impression_rpm` (eCPM). `rpm` is now LABELLED "Page RPM", because
a bare RPM on a chart axis is the same ambiguity one layer out.

A bare `rpm` or `cpm` header is **refused**, not assigned to a best guess.
Raptive's bare column is the session rate, so either mapping would be wrong for
some vendor. `AMBIGUOUS` in `lib/traffic-csv.js` reports it in
`ambiguous_headers` with both readings and the remedy, no value is stored, and
`POST /api/admin/traffic/import` passes that field through so an importer whose
rate never landed can find out why. Nothing stored is the safe direction: a
missing reading makes the model report null, which is recoverable, and a wrong
one looks correct.

## The gate refused me, and it was right

The first manifest ran on suite plus mutation, with a note asserting that no
`rederive` was available. `scripts/deploy-gate.js` refused to ship it: two kinds
is not three, and suite plus mutation is only this repo talking to itself.

The refusal was correct and the note was wrong. A rederive was available and is
the honest kind here.

`scripts/rederive-rate-denominators.js` never reads a column heading. For every
rate a parse stored, it recomputes all three candidates from the RAW revenue and
denominator columns in the same row and asks which one the number actually
satisfies. A value stored under a metric whose arithmetic it does not match is
the defect, whatever the column was called. That is board 376 stated as an
identity rather than as a mapping, and it shares no reasoning with the suite:
the suite compares the parser's answer against an expectation, and both sides of
that comparison read the same header.

It also permutes the three rate columns through all six orderings, because a
single hand-written order is what hid the bug in the first place.

**Confirmed against the pre-fix state rather than assumed.** With the collision
and the refusal both restored, the re-derivation goes red on 3 of its 6
assertions, including the defect itself. One assertion still passes there, and
that is the instructive part: on Raptive's real column order the page rate
happens to win, so the "correct by luck" case looks clean. Only the permutation
assertion sees the general failure.

## Two mutations were removed rather than kept

Adding a bare `rpm` back into either `HEADER_MAP` list is INERT, because
`AMBIGUOUS` is consulted before the map and returns first. Both mutations left
the suite green, which reads as an unguarded rule and is in fact defence in depth
working.

The ORDERING is what makes them inert, so the ordering is what gets mutated
instead, and that one does go red. A mutation that cannot fail is not a test, and
keeping one because it looks thorough is how a battery starts lying. The reason
is recorded in the harness where the two used to be.

## A document that had become false

`imports/README-raptive-2026-09-19.md` told the reader that `traffic-csv.js`
would not stop them and that the outcome depended on column order. True when
written, false the moment this landed. Corrected in the same commit, with the old
state kept as history rather than deleted, because the sheet it documents was
built under the old behaviour and imports identically under both.

## Evidence

    npm run smoke:traffic              OK - all 150 checks passed
    npm run smoke:trafficrpmmutation   9 passed (7 rules, each red for its own assertion)
    npm run smoke:raterederive         6 passed, across all 6 column orderings
    npm run smoke:classmonetization    81 passed (the model still reads only the page rate)
    npm run smoke:mutationleak         14 harnesses, 191 pairs, tree clean
    deploy-gate                        3 independent kinds agree: suite, rederive, mutation

## Still open

Nothing in this change. The Raptive sheet in `imports/` carries `Page RPM` and no
bare `RPM`, so it imported safely before this fix and imports identically after
it; the fix is for the next export, whose column order nobody controls.
