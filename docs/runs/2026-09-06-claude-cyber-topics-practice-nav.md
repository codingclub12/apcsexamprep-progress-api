# 2026-09-06 - The concept index sent readers to the smallest practice page on the site

Board 251. The last of the three cyber entry pages; the two course pages were
done on 2026-09-04 and 06.

## What was wrong, including the half the board item did not predict

Measured on the served body:

```
ap-cybersecurity-topics   52 anchors   practice hub at 52 of 52
```

That much was expected. What the measurement also turned up: the page has a
quick-nav pill row directly under its hero, and that row's **one** practice pill
reads `Practice` and points at `ap-cybersecurity-practice-questions`.

That page serves **fifteen** questions. Verified on the live body rather than
taken from the board: 15 `data-qid` cards, 60 options, and the page states
"15 question" itself. Board 197 had reported the same number.

So the single practice link a reader saw at the top of the concept index went to
the smallest practice surface on the site, while the hub that reaches every quiz,
lab, unit exam, the free-response sets, the daily question and the five unit
spokes sat at the very bottom. Fixing only the ordinal problem would have left
two links called "Practice" pointing at wildly different things.

## What shipped

Two edits to the quick-nav row:

| | |
|---|---|
| added | a `Practice Hub` pill beside `Course Hub`, pointing at the hub |
| relabelled | the sampler pill from `Practice` to `Quick Sampler` |

The practice hub moves from anchor **52 of 52** to anchor **2 of 53**.

**Neither new label states a count.** "15-Question Sampler" would be true today,
and is exactly the kind of hardcoded number that kept "40 MCQ + 3 FRQ" on a live
page for two days after the page stopped being that. The label describes the
shape and lets the page it links to state its own size.

## The generator grew a mode rather than a copy

The band model inserts a block before a unique anchor. That is wrong for a page
that already has a navigation row: the fix belongs *in* the row, not in a second
strip under it. So a page may now declare `edits`, a list of `[from, to]` pairs,
and the invariant is the counterpart of the exact-split assertion: every `from`
matches exactly once, and **undoing every substitution must reproduce the live
body character for character**. Anything the edits did not declare survives that
reversal as a difference and throws.

`generate()` also grew a `handles` filter, and the reason is worth stating.
The two course-page fixtures are pre-import snapshots. Regenerating from them
reproduces rows that already landed, and shipping those again would republish a
body captured before the import, reverting anything either page has gained since.
That is board 238's defect exactly. So the offline suite builds all three pages,
because the fixtures are a consistent set, and a *sheet* is only ever emitted for
the handles a pass is actually changing.

## The same mistake, a third time, caught by its own mutation

The first draft of the edits-mode guard asserted that the result **links** the
practice hub. That was already true of this page, from anchor 52 of 52. The
mutation written to break it could not go red, which is the only reason I noticed.

This is the third time in one session that existential-versus-ordinal has been the
bug: the course guide already linked the hub from the bottom, the exam page already
"had a title", and now this. The guard is ordinal now, and the mutation that proves
it is the honest one: relabel the sampler pill *without* adding the hub pill, and
every existential check still passes while the hub stays at the bottom.

The gate then caught a second hollow guard, mine again. My first mutation for the
reversal check simply deleted it, and the suite stayed green, because the suite
computes the reversal itself and does not depend on the generator's copy. The gate
refused with "the suite still PASSED with the guard broken, so it does not test
it". Reaching that guard takes a `buildEdited` that changes something undeclared,
which is the defect it exists for; that is the mutation now.

## Evidence

`deploy-gates/2026-09-06-cyber-topics-practice-nav.json` with `--pre`:

```
suite     smoke:cyberctacourse       45 checks, 11 mutations
rederive  topics sheet, by diff      15 checks
rederive  course sheet, unchanged    35 checks
suite     matrixify-preflight        clear to import
mutation  three, each red on its own rule
```

The live check reports **15 passed, 3 failed**. The 3 are this change. The 12 that
pass are the two course pages, unchanged, which is what proves the sheet does not
disturb them.

## Open

- **The sheet is not imported.**
  `imports/2026-09-06/cyber-topics-practice-nav-pages.csv`, one row, MERGE. After
  importing run `npm run verify:cyberctacourse`; it must be 18 of 18.
- **The nav dropdown still advertises the sampler as "250+ MCQs across all 5
  units"**, and it serves 15. That is board 197, it is a theme change on a
  different surface, and it was not widened into this sheet. It is the last known
  false count on the cyber pages.
