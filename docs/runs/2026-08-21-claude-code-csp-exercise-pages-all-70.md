# The other 68 CSP exercise URLs: a build, a sheet, and a page that admits what it is not

2026-08-21, Claude Code. Follows
`docs/runs/2026-08-21-claude-code-csp-1-1-exercise-publish.md`, which published
topic 1.1's two pages by hand.

## The ask

Get the remaining 68 printed URLs reaching a live page. All 70 student handouts
in the CSP Teacher Course Bundle print:

> Also available online (auto-graded): apcsexamprep.com/pages/ap-csp-topic-{U}-{L}-exercise-{N}

Two of those now resolve. Sixty-eight still 404.

## The constraint that shapes the answer

`seed/csp-exercise-source.json` has the mirror content for all 70, parsed from
the student documents. `seed/csp-exercise-checks/` has authored multiple choice
for **topic 1.1 only**. The other 68 have no check questions, because writing one
means deriving it from the teacher answer key and citing the sentence it came
from, and nobody has done that for those topics yet.

So the pages can exist today, but 68 of them cannot honestly be graded today. The
choice was between shipping 404s until 69 exercises are authored, or shipping the
work the student is actually being asked to do with the grading half absent and
labelled absent. This run does the second.

`renderExercise(handle, null)` is now the mirror-only page: the handout
reproduced verbatim into local-only writing boxes, no graded widget, no score
bar, and a note that addresses the handout line directly rather than leaving the
student to discover the gap:

> Your handout says this exercise is available online and auto-graded. The
> exercise IS here, and it is the same work in the same order, but the
> auto-graded half is not written for this topic yet. Nothing on this page is
> scored or sent to your teacher.

A score bar reading 0 of 0 would have been the easy version and a lie told in the
student's own interface.

## What is in the build

| | Count |
|---|---|
| Pages built | 70 |
| Graded (mirror plus auto-graded check) | 2, topic 1.1 |
| Mirror-only | 68 |
| Handout items reproduced as local-only writing boxes | 281 |
| Body HTML | 1177 KB |

Every one of the 70 passes `checkPage` from `scripts/csp-pages-csv.js`, the same
validator the other CSP sheets ship through: pure ASCII, exactly one h1, no
entity inside a script block, no `auto-fit` grid, SEO title and description in
range.

## Why a sheet and not 68 API calls

Topic 1.1 was published directly through the Admin API because two pages did not
need a sheet. Sixty-eight is 1.1 MB of body HTML, which cannot be pushed through
that path here. So this ships the way the other CSP page batches ship:
`scripts/csp-exercise-pages-csv.js` writes a Matrixify sheet, and the import is a
human step.

The generated sheet is deliberately NOT committed. `.gitignore` already says why
for the rebalance sheets: a generated megabyte is a snapshot, not source, and a
stale one is worse than none. Regenerate with

```
node scripts/csp-exercise-pages-csv.js rest.csv --skip-live-1-1
```

`--skip-live-1-1` omits the two handles already published, so the sheet is the 68
that are missing. MERGE mode, QUOTE_ALL, utf-8-sig with the BOM, and a fixed
past-dated `Published At` literal, per the house Matrixify rules.

Its safety model differs from `csp-pages-csv.js` in one way, on purpose. There,
every handle had to be new. Here two handles are expected to exist, so `--live`
treats exactly those two as ours and any other collision as fatal.

## What the smoke suite protects

`smoke/csp-exercise-pages.js`, 34 assertions, wired into `package.json` so CI
picks it up with no workflow edit:

- The build produces exactly the 70 handles in the source and nothing else. These
  handles are printed in documents already in teachers' hands, so a rename is a
  404 a teacher finds on behalf of a class.
- A mirror-only page paints no graded item, no score bar, and says in words that
  nothing is recorded.
- A graded page paints exactly the number of items it claims.
- No writing box is ever posted anywhere, and drafts reach `localStorage` only.
- The sheet is generated and parsed back with a real RFC 4180 reader, every body
  compared byte for byte, because Matrixify reports success on a sheet it
  silently truncated at a stray quote.
- The refusal is proved by feeding the writer a collision, not assumed from
  reading the code.

## One bug this run fixed before it shipped

The denominator seed walked `allPages()`. Once `allPages()` became all 70 rather
than the graded 2, that would have authored a denominator of 0 for every
mirror-only exercise-1 lesson, marking a class down for an assessment its page
does not contain. It now walks `gradedPages()`, and the smoke suite asserts no
mirror-only lesson is priced.

## Still open

1. **The theme PR.** `codingclub12/APCSExamPrep-theme#67`, against
   `claude/site-linking-audit-yhufjk`. Until it merges the reporter does not load
   on any of these handles, so even topic 1.1 grades into nothing.
2. **69 exercises still need check questions**, including topic 1.1's siblings.
   That is the work that turns "auto-graded" from a promise into a fact.
3. **The two activity_type collisions** from the previous run are unchanged, and
   they gate grading past Big Idea 1: every mirror slug is also a gated
   `seed/csp-exercise-2` slug, and Big Idea 3 already spends `exercise-1` on its
   coding-practice pages.
4. **Handle routing.** These handles still do not match `pageFromHandle`, so none
   of the 70 records a visit.
5. **The printed wording.** The next bundle build should say what the site
   actually does. The 70 handouts already distributed cannot be recalled, which
   is exactly why the mirror-only page addresses the line instead of ignoring it.
6. **The bundle CDN exposure** from the pilot note is still untouched.

## Deliberate non-actions

- Did not author check questions for 68 topics. They must be derived from the
  answer key with a verifiable citation, and inventing them to fill a column is
  the one failure mode this whole design exists to prevent.
- Did not import the sheet. That is a human step and it is 68 live pages.
- Did not commit the generated CSV.
