# CED coverage on the free lesson summary, and what the survey turned up

2026-09-04, Claude Code. Board #224 (shipped), #223 (filed, not fixed).

Tanner asked, in his words: "Have the lesson slides overview have EK's from the
CED to show the value and that we are covering the right things. Thoughts?"

## The short answer

The goal is right and the placement is not. The free summary is the most
student-facing surface on a lesson page, and printing EK codes there is the one
thing the house style forbids outright. But the proof he wants was already on
the page, hidden: every one of the 25 cyber lessons carries a
`CED Ref | Essential Knowledge | Covered In` table at `display:none` behind an
unlabeled chevron. Surfacing it as a slide, with the code column dropped, gives
a teacher the alignment evidence and gives a student nothing they should not
read.

Theme PR: https://github.com/codingclub12/APCSExamPrep-theme/pull/106

## What shipped

`assets/apcs-lesson-summary.js` gains a coverage slide immediately before the
bundle CTA. It reads the lesson's own EK table and prints the statement plus the
section that teaches it. 222 rows across the 25 pages.

The table is located by HEADER SHAPE, not by cell class, because some pages
write `<td class="term">` and others write `<td style="font-weight:700...">`.
Same table either way. The section survey earlier in this session gave three
different wrong answers in a row by keying on the markup of the one page its
author had open, and this is the same trap.

The mount guard also moved. It required three teaching sections, which skipped
Topic 5.5 entirely; 5.5 has two sections and five coverage rows, so the deck it
would have built was six slides and worth reading. Measure the deck, not one
ingredient of it. 5.5 went from 0 rendered characters to 406.

## Evidence

All 25 live pages fetched through `lib/storefront-fetch.js` with no
User-Agent, rendered with the local build in headless Chromium:

    pages rendered              : 25
    pages with a coverage slide : 25
    pages that rendered it      : 25
    total coverage rows         : 222
    EK CODES IN ANY SLIDE TEXT  : 0

Mutation tested per rule, after proving the detector fires on `4.3.A.1` and
stays silent on the same sentence without it:

    M2  slide reads the CED Ref column, stripping removed   CAUGHT, 46 codes
    M3  a code injected into the `where` field              CAUGHT, 46 codes
    M1  reads the CED Ref column, stripCed left in place    stayed green

M1 is recorded, not counted as a pass. It stayed green because `stripCed` runs
on every value on its way to a slide, so a bare code is unprintable and the row
drops as empty. Real defence, wrong test. An earlier M3 draft removed `stripCed`
from the statement column and also stayed green, and that one injected nothing
at all: the Essential Knowledge column is CED prose and carries no codes. A
mutation that cannot produce the defect proves nothing in either direction, and
counting it as a failure would have been as wrong as counting it as a pass.

## The finding, which is bigger than the request

Surveying the 25 pages through `lib/cyber-ek-density.js` to answer "where may a
code go" answered a different question first: **297 EK codes are in rendered
student-visible prose on 19 of 25 live cyber lesson pages right now.** Board
#223.

The raw number the module reports is 502, and most of the gap is the module
being right about a rule it was not asked. Classified:

    JSON-LD / script only         38   in the FAQ schema, served to Google, never rendered
    inside an Answers block       24   teacher answer key, a protected placement
    LO code, three segments      143   "LO 4.3.A" in headers, TOC and objective tails
    EK code in student prose     297   the convention violation

Worst pages: 2.4 (50), 4.4 (44), 4.3 (41), 4.2 (31), 4.1 (28). Unit 1 reads 0 on
all five pages, because the 2026-08 realignment fixed it and nothing did the same
for Units 2 to 5. That the detector reads 0 on exactly the pages that were fixed
and non-zero on the ones that were not is the control that makes the number
believable.

Samples, so this is not an abstraction:

    "...are often the first to detect unauthorized persons (2.4.A.4)"    objective bullet
    "What Logs Record (CED 4.4.A.1, A.3)"                                section heading
    "D is correct. CED 2.4.A.4 explicitly states:"                       CFU feedback
    "A File-Based IoC (4.4.A.5)"                                         matching-game label

## Two things about the detector, for whoever takes #223

`protectedSpans` in `lib/cyber-ek-density.js` was built on Unit 1 markup and
over-reports on Units 2 to 5. Its own comments already record this happening
twice (pinned to `ek11-body`, pinned to an "EK " prefix); this is the third.

- It finds an answer key only as `<strong>Answer Key:</strong>`. Units 2 to 5
  write `<em>Answers:` inside a small grey div. 24 citations sit in those.
- The completeness picture is muddier than it looks. Comparing each page's table
  against the CED text extracts, 21 of 25 cover every EK code for their topic.
  Of the four that do not, the two Unit 3 pages both map to topic 3.1 and split
  it between them, so per-page completeness is the wrong unit there; 3.4 is
  missing `3.4.C.3` and carries `3.3.A.1`, which looks like residue of the
  documented 3.3 / 3.4 swap. Only 2.2 (missing `2.2.A.1` and `2.2.C.1`) looks
  like a plain gap.

That is why the slide does not claim completeness. It says what is in the table
and counts it, which is true on every page; "all of it" is not something this
session established.

## Still open

- #223, the 297 codes. Nineteen pages of prose, so it ships as canonical data
  plus generator plus validator plus one Matrixify sheet. The validator rule
  exists already as rule 1 of `tools/ap-cyber-ced/validator.js`.
- The `<em>Answers:` variant above should be taught to `protectedSpans` before
  anyone acts on a per-page count from it.
- #211, the Command Center Drive exposure, still parked by Tanner.
- Whether the coverage slide should ALSO appear on the CSA and CSP summaries.
  Those courses have no EK table on the page, so it would need a different
  source, and nobody has asked.

## Post-deploy live check, added after the merge

Tanner merged theme PR #106 himself at 2026-09-04 13:58:35Z, six seconds after
taking it out of draft. The deploy is confirmed, and this is the second gate run
the convention asks for, the one where `live` can actually observe something.

It asserts a thing that was FALSE before the deploy, which is the whole point of
the rule. Not "the widget renders", which was true yesterday.

The served asset moved:

    before   apcs-lesson-summary.js?v=1603876131900443861...   8476 bytes
    after    apcs-lesson-summary.js?v=636384150469707115...   11077 bytes

Eight coverage markers are present in the new build and absent from the old one:
`apcs-ls-cover`, `apcs-ls-cover-what`, `apcs-ls-cover-where`, `collectCoverage`,
the CED alignment eyebrow, the slide headline, the Essential Knowledge copy, and
the `ced ref` header match. Zero CED codes anywhere in the served file.

Then the CDN copy itself, not the local build, rendered against three live page
bodies fetched through `lib/storefront-fetch.js` with no User-Agent:

    4.3   9 slides, coverage at 8 of 9,  9 rows, 0 EK codes
    5.5   6 slides, coverage at 5 of 6,  5 rows, 0 EK codes
    1.1  12 slides, coverage at 11 of 12, 8 rows, 0 EK codes

5.5 is the one worth noting: it rendered NO widget at all before the mount-guard
change, so its 5 rows are the guard doing what the commit said it would.

The detector was proved to fire on "policy (4.3.A.1) governs" before that zero
was trusted, same as during the build.

Board #224 carries this as a note rather than as a verification. Rule 4 stands:
the session that did the work is not the one that says it is true.
