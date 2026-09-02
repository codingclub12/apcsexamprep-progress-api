# Board 163: the 17 CSP exercise-2 pages that were never imported

Date: 2026-09-02
Agent: Claude Code
Artifact: `imports/2026-09-02/csp-exercise-2-publish-17-pages.csv`,
17 rows, 400 KB, md5 `2e96a71b28a83e5cbde9e5abf07620e2`. Not imported.

## What was measured, not assumed

`scripts/csp-exercise-2-live-status.js` fetched all 35 exercise-2 handles plus
every internal link target in their bodies, single threaded, 1200 ms apart, with
a browser User-Agent, retrying anything that was not a 200 or a 404. 81 handles,
zero unresolved. Recorded per handle with a timestamp in
`smoke/fixtures/csp-exercise-2-live-status.jsonl`.

    18 live 200   all Big Idea 3, each serving 6 mcq-item blocks
    17 dead 404   bi-1 four, bi-2 four, bi-4 three, bi-5 six
    46 link targets, all 200

That is the same 17 the board says, and the same 17
`smoke/fixtures/live-page-handles.txt` implies. Three counts, one answer.

## The correction the board item needs

The task text says `seed-csp-denominators` prices all 35 so the gradebook shows a
column with no page. The COLUMN does not come from the denominators.
`lib/gradebook-contract.js` creates an EXPECTED column for every
`(lesson, activity)` in `COURSES[course].units[*].activities`, and
`utils.js` lists `exercise-2` in all five Big Ideas, so all 35 lessons render the
column whatever the denominators say. `scripts/seed-csp-denominators.js` has
`CSP_EXERCISE_2_PAGES_LIVE = false` and seeds no exercise-2 denominator at all.
Editing the seeder would change nothing a teacher sees.

The task text also says `tools/ap-cyber-ced/validate_csv.py` counts EK codes. It
does not; it has no EK check and is shaped for AP Cybersecurity pages
(`id="ucnav"`, `APCYBER-*-NAV` markers). The module that resolves EK citations
and their protection is `lib/cyber-ek-density.js`, and that is what the new
check goes through.

## What the sheet refuses

`scripts/csp-pages-csv.js` gained `--status`, `--only-dead` and `--expect`, plus
four refusals. All are proven non-hollow by mutation in
`deploy-gates/2026-09-02-csp-exercise-2-publish.json`.

    body under 2000 bytes         an unfinished page erases more than it publishes
    handle already 200            Body HTML over a live handle is a REWRITE
    handle never measured         a 429 is not a 404, and board #79 saw 46 of them
    a link target not 200         the page would ship with its own links dead
    a CED code a student reads    both shapes, through the repo's own resolver

## The finding this instrument turned up on the way past

Wiring the CED check into the SHARED `checkPage` refused 21 of the 70 CSP
handout exercise pages that `lib/csp-exercise-pages.js` builds and that went live
on 2026-08-22. 83 codes a student can read today, including stems written around
the code: "Explain how a pull request satisfies EK CRD-1.B.1's description of
what online tools do", and `<span class="ek">EK CRD-1.A.3 / CRD-1.A.4</span>`
printed next to the question number.

That is a real defect and it is a different page family, already published, and
removing the codes means rewriting the questions. Authoring belongs to a human.
So the CED refusal was scoped to this program's own rows rather than left to
retroactively condemn a generator this pass was not asked to change.

## The Applied Challenge cards

`scripts/csp-lesson-exercise-links.js` adds the card only when the handle is in
the set passed to `--verified`. It does NOT skip dead pages intrinsically: with
`--verified` omitted it emits all 35 cards, 17 of them pointing at 404s. The 18
that shipped today are 18 because `smoke/fixtures/live-page-handles.txt` happens
to list exactly the 18 live handles.

Measured on the live storefront: `ap-csp-course-bi1-collaboration` carries the
managed block, no Applied Challenge card and no wide CSS.
`ap-csp-course-bi3-binary-search` carries all three. So after these 17 are
imported, 17 more lesson pages SHOULD gain a card. The generator is idempotent
(`unmark` strips the block and rebuilds), so a re-run over freshly fetched bodies
with a refreshed verified list produces them. It will not happen by itself: the
verified fixture has to be regenerated first, or the 17 stay uncarded.

## Still open

- The import. It is a human act against a live store.
- `CSP_EXERCISE_2_PAGES_LIVE` stays `false`. Flipping it after this import would
  make it correct as written for the first time, but that is a denominator
  decision and it is not this pass's to make.
- The 83 student-visible CED codes on 21 live CSP exercise pages.
- The Applied Challenge re-run, which needs the verified fixture refreshed after
  the import.
