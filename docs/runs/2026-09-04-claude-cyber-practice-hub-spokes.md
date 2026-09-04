# 2026-09-04 - The practice hub's missing spoke edge, and the sheet that would have made it worse

Board 238. Found while checking whether the practice hub was linked from the top
of the course, which was a different question.

## What is wrong

`scripts/verify-cyber-practice-live.js` reports 34 of 35 checks passing.
`ap-cybersecurity-practice` links **none** of its five unit spokes.

The rest of the layer is fine, which is what makes this worth naming precisely
rather than describing as "the hub and spoke is broken":

- all five spokes serve 200
- each reaches the course and its unit study page
- every unit study page reaches its spoke
- the concept hub reaches the practice hub
- the course guide and the teacher Command Center both reach it

Only the hub's own downward edge is absent. So the five pages are reachable from
a unit study page and from nowhere a student browsing the practice layer would
look.

## The part worth reading

That row already exists. `imports/2026-09-04/cyber-practice-hub-links-pages.csv`
carries `ap-cybersecurity-practice` with all five links, and the **other** row in
the same two-row file matches its live body character for character. So one row
of one import landed and the other did not, and the obvious move is to re-import
the file.

Do not. Diffing that row against today's live body finds three differences:

```
insert  883 chars   the related-links CSS          expected
insert  643 chars   the five spoke anchors         expected
DELETE  722 chars   a Question of the Day block    NOT EXPECTED
```

The live page has **gained** a Question of the Day card since that sheet was
written: 152 questions, all five units, its own card in the practice grid. A
MERGE republishes the whole Body HTML, so re-importing the old row would have
deleted it, and nothing about re-running the file would have said so. The sheet
is not stale, it is destructive.

The general form, which is the part that outlives this sheet: **a generated sheet
is only valid against the body it was generated from.** A live page can change
under it between generation and import, and the older the sheet the likelier it
has. Check before re-importing anything that is not from the last hour, and check
by diffing rather than by asking whether it looks current.

## What shipped

`tools/ap-cyber-ced/generate-practice-hub-repair.js` rebuilds the block from
today's body through the same `lib/link-block.js` the original used. One row,
MERGE, Body HTML only. It refuses rather than writes when a declared section of
the live body would be lost, when fewer than five links go on, when the stored
body is missing or empty, or when the body already carries the links.

`imports/2026-09-04d/cyber-practice-hub-spokes-pages.csv`, 13,587 bytes,
preflight clear to import.

## Evidence

`deploy-gates/2026-09-04-cyber-practice-hub-spokes.json` with `--pre`:

```
suite     smoke:cyberhubrepair      22 checks, 5 mutations
suite     smoke:cyberpractice       29 checks, 16 mutations, unchanged
suite     smoke:linkgraph           128 passed, the other link-block consumer
rederive  cyber-hub-spokes-rederive 20 checks, by diff
suite     matrixify-preflight       clear to import
mutation  three, each red on its own rule
```

The rederive is the one worth explaining. The generator proves "nothing was lost"
against a list of markers it declares, and a list cannot report that it has
stopped covering the page. That is exactly the shape of the stale-count patterns
that let two wrong numbers onto the practice exam earlier the same day, so the
second implementation proves the stronger property a different way: **every
character of the live body must survive, in order, and every difference must be
an insertion.** One deletion of any size fails, whether or not anybody thought to
declare a marker for it. It also re-derives the finding itself, independently
locating the 722-character Question of the Day deletion in the old sheet.

The three mutations, each verified red on the rule that claims it: let the build
drop a section the live page had (this is the stale sheet's defect, reproduced);
accept a partial edge instead of all five spokes; stop refusing a missing stored
body.

Full offline suite green apart from `smoke:csakitstyle`, which fails identically
on an unmodified tree here because `python-pptx` is not installed.

## Open

- ~~The sheet is not imported.~~ **Imported 2026-09-04.**
  `npm run verify:cyberpractice` now reports **35 live checks: 33 that the import
  made true, 2 proving it erased nothing**, where it was 34 passed and 1 failed on
  exactly this edge. Measured separately on the served page afterwards, because it
  is the thing the stale sheet would have destroyed: the hub body is 13,254
  characters, the Question of the Day block and its 152 question card are present,
  all five spokes are linked, and the free response and labs sections are intact.
- **Do not import `imports/2026-09-04/cyber-practice-hub-links-pages.csv` again.**
  Its topics-hub row already landed and its practice-hub row is destructive. The
  new sheet supersedes it.
- **Why the row did not land the first time is unknown.** The other row in the
  same file did, so it was not a whole-file refusal. Matrixify's own import log
  would say and nobody has it. The practical answer is the same either way.
- **The top-of-course link is still not done.** That was the question that led
  here. Measured today: `ap-cybersecurity` does not link the practice hub at all,
  `ap-cybersecurity-complete-course-guide` links it at position 246 of 247 (byte
  100020 of 104812), and `ap-cybersecurity-topics` at 51 of 52. All three are at
  the bottom because `lib/link-block.js` appends. Putting one at the top is a
  different insertion, not another link block.
