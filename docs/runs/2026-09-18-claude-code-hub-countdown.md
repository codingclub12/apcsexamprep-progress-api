# The CSA hub has been congratulating students since May

2026-09-18, Claude Code, board 368. Branch `claude/loving-wright-8yixh5`.

## What was live

`/pages/ap-csa-exam-prep-hub` renders its Quick Access header through a countdown
the page owns:

    <span id="hub-countdown" data-exam-iso="2026-05-15T12:00:00">Exam coming up</span>

and its own script turns a target in the past into one of two strings, the
second of which it had been showing for four months:

    if(diffMs<=0){ text = (-diffMs/36e5 < 6) ? 'Exam in progress ...'
                                             : 'Exam complete ...'; }

Loaded in Chromium against the live stored body, the header read:

    Quick Access — Exam complete — great work!

That is the flagship AP CSA hub, in September, to students eight months out.

## Why the pass that was looking for exactly this missed it

The 2026-09-17 body-year pass rewrote eleven visible strings on this very page.
It read prose and never opened an attribute value.

The generator's own stale-year check should have covered that gap and did not,
for a reason worth writing down because it is the interesting half. `staleYears()`
strips school-year spans so a correct `2026-27` is not flagged. Its span regex is
`\b(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})\b`, and against `2026-05-15` that matches
`2026-05`: start 2026, end `05`, which the two-digit branch expands to 2005. 2005
is not 2027, so no span hit was recorded. Then the stripper removed `2026-05`
**as a span**, so the bare 2026 never reached the standalone-year scan either.

The date was eaten by the rule written to protect correct dates. Every ISO date
on every page was invisible the same way, and the page came back clean.

## What changed

`scripts/body-year-csv.js` judges ISO dates first, before anything can strip
them, and against the clock rather than against `examYear`: a countdown target
that has passed is stale whatever year it names. One exemption, schema.org's own
vocabulary for when a thing was authored (`datePublished`, `dateModified`,
`dateCreated`, `uploadDate`), because `"datePublished": "2026-03-01"` in the
JSON-LD on `ap-csa-reference-sheet` is supposed to name a past date. That list is
schema.org's rather than one invented here, which is the difference between an
exemption and a pattern list. `startDate` and `endDate` are deliberately off it.

`seed/body-year-rewrites.js` gains `EXAM_ISO` beside `EXAM`, and the hub gains a
twelfth edit: the attribute, `2026-05-15T12:00:00` to `2027-05-12T12:00:00`.

## Evidence

**Rendered, before and after, in Chromium against the live body and the sheet's
body.** The live check asserts something that was false yesterday:

    LIVE TODAY        Quick Access — Exam complete — great work!
    AFTER THE SHEET   Quick Access — Exam in 33w 5d

**Parse-back.** The sheet read back as CSV and diffed against the live body
character by character: one differing run of seven characters at offset 36339,
`6-05-15` to `7-05-12`, in a body of 79,814 characters that is 79,814 characters
afterwards. Re-applying that single run to the live body reproduces the sheet
exactly.

**Sitewide sweep.** All 1365 page handles in the sitemap, fetched through
`lib/storefront-fetch.js`, scanned for any `data-*` attribute holding a parseable
date. One exists on the whole site and it is this one. So the defect is an
instance; the blindness was the class.

Nine handles could not be read, and none of them is new: seven store an empty
body, which is board 158, still exactly seven, and two are Cloudflare-rewritten
bodies the module correctly refuses.

**Mutation.** Eight mutations against the new rule, each required to go red for
the case that names it rather than red in aggregate. Two of my own cases came
back hollow on the first run and both are recorded in the suite:

- `a date inside a URL is still the address` used an `href="https://..."`, which
  the attribute stripper removes before the URL rule is reached. Then the second
  draft used `.../2026-05-15-recap`, which is not an ISO match at all because the
  lookahead refuses a date running into another dash. Neither version tested the
  line it named.
- `an ISO date is counted once` cannot be broken by removing the explicit
  `.replace(ISO, ' ')`, because the span stripper still eats `2026-05`. The line
  is genuinely redundant today. It is kept, and the generator now says out loud
  that it is belt and braces rather than a tested guarantee, so nobody reads it
  as one.

**The target is re-derived, not retyped.** `npm run smoke:bodyyear` rebuilds
`EXAM_ISO` from the two snapshots and diffs:

    docs/ced-snapshot/csa-exam.txt:62    Wed, May 12, 2027 | Session 2
    docs/ced-snapshot/csp-exam.txt:68    Fri, May 14, 2027 | Session 1
    docs/ced-snapshot/exam-dates.txt     Session 1 and Session 2 ... morning and
                                         afternoon ... 8 a.m. ... and 12 p.m.

Both of those exam pages were added to `config/ced-sources.json` earlier the same
day, under board 367, to answer a different question. The session time the
September pass had to drop as unsourceable was sitting in them within the hour.

71 assertions in `smoke:bodyyear`, up from 49.

## Still open

- **The sheet is not imported.** `imports/2026-09-18-hub-countdown/`, one file,
  with its runbook. Tanner imports.
- **`ap-csa-topics` is still waiting**, from `imports/2026-09-18-topics-h1/`.
  Regenerated today against the current live body and byte-identical to the sheet
  already handed over, so it is still good as it stands. The rendered page still
  carries four h1 elements; the title half of that fix is live, the body half is
  not.
- **`seo-products.csv` and `seo-collections.csv`**, 19 records from
  `imports/2026-09-17-seo-metadata/`, still not imported. Measured live: 0 of 12
  products and 0 of 7 collections.
- **The hub Title still reads `AP Computer Science A Exam Prep (2026-2027)`.**
  Current and true, so not stale, but the other five hub pages had their year
  dropped. A one-row title sheet and a separate decision.
- **The visible copy on `ap-csa-exam-format` no longer asserts a start time**,
  and could now, correctly, say CSA is an afternoon exam. The seed's header
  records this so the next pass restores it on purpose. Not bundled here:
  re-opening copy on a page imported today is a different change.
- **`ap-csa-exam-format` carries authoring scaffolding in an HTML comment** that
  still describes the 2026 exam and the old title. Not student-visible.

## What this cost and what it is worth

The rule that hid this was not careless. It was written to stop a correct
`2026-27` being flagged, it does that, and it has a passing test saying so. The
failure was that nobody asked what ELSE matched its pattern, and the answer was
every machine-readable date on the site.

A guard's blind spot is not visible from inside the guard. It took a defect
rendering in a browser to find this one, and the check that now catches it is
worth more than the seven characters it was built to fix.
