# Import runbook: the EK codes on the AP CSA lesson pages

Board 373. **This directory is shared.** Several changes landed sheets here on
the same day, each with its own runbook. This one covers exactly these three
files and no others:

    csa-ek-codes-unit-2-pages.csv
    csa-ek-codes-unit-3-pages.csv
    csa-ek-codes-unit-4-pages.csv

Anything else here belongs to a different change: `README.md` covers the
leaderboard XSS and the "undefined questions" cards, and `RUNBOOK.md` covers the
CSP guided-notes CFU sheets. **Measured, not assumed:** these three sheets carry
19 handles, the other eight carry 69, and no handle appears in both sets. So the
three sets can be imported in any order relative to each other. Check any later
arrival the same way rather than importing on the strength of this paragraph.

**One import each, in order, with a check between them.** MERGE overwrites a live
body with no undo, so the blast radius of a single click is however many rows are
in the file. Nineteen on one click with nothing to look at in between is not a
thing to do.

Matrixify settings for all three: **MERGE, QUOTE_ALL, utf-8-sig, one import at a
time.** No `Published At` column, so nothing is re-dated.

## What this changes

171 CED Essential Knowledge codes come out of student-visible text on 19 of the
38 Units 2-4 lesson pages. The rule is the project's own: the code is teacher
knowledge, so name the idea, not the code. 7 codes stay, in the `ld+json` search
metadata, and that is a decision recorded in `config/csa-ek-decisions.json`
rather than something the tooling could not reach.

Nothing else on any page changes. Not a heading, not a code sample, not an answer
key. That is asserted rather than intended: a second implementation strips the
codes from the live body and from the rewritten one and the two come out
byte-identical, and line for line the only lines that differ are the lines a
citation was on.

## Before you start

```
npm run csaek:live
```

Expect **19 pages listed as still serving a code**, summing to 171. That is the
work not yet done, and it is also the staleness check: a page already reading
clean is a page somebody has fixed another way since these sheets were built, and
its row should come out of the sheet before importing. On 2026-09-08 a sheet that
sat for a day would have reverted a better fix, and nothing in the sheet said so.

If the command instead reports pages clean, **stop and read the page** before
importing anything.

## Step 1: Unit 2

Import `csa-ek-codes-unit-2-pages.csv`. MERGE mode,
9 rows, 738,711 bytes.

Pages: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9.

Then:

```
npm run csaek:live -- unit-2
```

**Expected: 12 live pages in unit-2, not one EK code in student-visible text.**

Twelve, not nine: 2.10, 2.11 and 2.12 never carried a code and are checked
anyway, because a check that only looks at the pages you changed cannot tell you
an import reached a page it should not have.

## Step 2: Unit 3

Import `csa-ek-codes-unit-3-pages.csv`. MERGE mode,
3 rows, 212,178 bytes.

Pages: 3.5, 3.6, 3.7.

Then:

```
npm run csaek:live -- unit-3
```

**Expected: 9 live pages in unit-3, not one EK code in student-visible text.**

3.6 is the page worth opening by eye afterwards. It is the only one where the
rewrite had to write new sentences rather than cut: MCQ 6's stem now reads "Which
statement about accessing a parameter's private fields is TRUE?" and MCQ 7's
feedback explains pass-by-value instead of citing two codes. Both were checked
against the options and the answer key, and both are recorded with their reason
in `config/csa-ek-decisions.json`.

## Step 3: Unit 4

Import `csa-ek-codes-unit-4-pages.csv`. MERGE mode,
7 rows, 526,997 bytes.

Pages: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8, 4.9.

Then:

```
npm run csaek:live
```

with no unit argument, which checks all 38.

**Expected: 38 live pages, not one EK code in student-visible text, 7 left in the
ld+json metadata on purpose, every question still has the options its key names.**

That last clause is the one that matters. "No EK codes" is easy and nearly
worthless: a sheet that blanked a body would pass it. So the check also asserts
the body is still long enough to be a lesson, that every graded MCQ answer letter
names an option that exists, and that the metadata count did not move.

## If a step fails

The check names the page. Do not re-import the same sheet to see if it takes the
second time; a MERGE that half-landed is not fixed by another MERGE. Read the
live page, and if the body is wrong, the previous body is in
`shopify/csa-ek-snapshots/` from the run that built these sheets, if that
directory still exists in the session that made them. It is gitignored, so on a
fresh checkout rebuild it with `npm run csaek:sheets -- <dir> --show-changes`,
which fetches all 38 pages again and will show you what live looks like now.

## Rebuilding the sheets

```
npm run csaek:sheets -- imports/<today> --show-changes
```

It refuses to write without `--show-changes`, and that is deliberate. This
rewrites prose on pages students are using, and a citation count of zero says
nothing about whether the sentences still read like English. The flag prints
every changed sentence. Read them.

The run also refuses to write if any page does not come back, if a decision's
exact text is no longer on its page, if the three sheets do not parse back to
byte-identical bodies, or if `scripts/matrixify-preflight.js` would reject any of
the files.
