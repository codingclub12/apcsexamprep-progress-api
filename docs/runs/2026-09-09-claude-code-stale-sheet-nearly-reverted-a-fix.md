# A sheet that sat for a day would have reverted the fix it was written for

## What happened

All five per-unit cyber quiz sheets were imported. Measured against the live
storefront rather than taken from an import log:

    22 of 25 mounted, 3 still ship a key, 0 mount the wrong lesson,
    0 mounted but not served

Every number is the predicted one. The three keys are 2.3, 4.1 and topic 3.5,
held back on purpose.

The sixth sheet is the story. It repointed the Command Center's Unit 3 links,
and the scheduled check that should have said "still waiting to be imported"
instead said `rows=0 ced-matches-page=0`, which is neither the before state nor
the after state. That is what a verifier answering about a page that changed
shape underneath it looks like.

## What it turned out to be

Another session renumbered that page onto CED lesson ids on 2026-09-08 at 22:09,
in `scripts/cyber-cc-unit3-ced-numbers.js`. That is the deeper fix, and it is
the one this session had explicitly declined to make, calling it a content
decision rather than a link repair. The rows now carry 3.1a, 3.1b, 3.2, 3.3, 3.4
and 3.5 rather than retired site numbers, and all six resolve correctly through
`utils.pageFromHandle`.

So the defect is gone, fixed better, by somebody else.

**And the sheet became live ammunition.** It was generated from the 3 September
body. Importing it after 8 September would have MERGED a five-day-old page over
the renumbered one, reverting the fix and losing the ~870 bytes of other changes
between those dates. Nothing in the sheet, the preflight or the runbook would
have said so: the sheet was valid, it preflighted clear, and its md5 matched.

The runbook was the dangerous part, because it was the instruction. It said
"import this" and a human following it would have done exactly that.

## What changed here

- The sheet is DELETED. Its only purpose was to be imported and importing it now
  does damage.
- `scripts/cyber-cc-unit3-rederive.js` is gone. It asked whether each row's `ced`
  field matched the page it opened, and the renumbering removed that field, so it
  answered 0 rather than failing. Replaced by
  `scripts/cyber-cc-unit3-check.js`, which asks the question that survives the
  restructure: resolve the handle each row links and require it to equal that
  row's own id, through the resolver production keys on. Proven not hollow
  against two mutations, the original three-cycle bug and a 3.1a/3.1b collapse,
  both caught with the row named and a non-zero exit.
- `deploy-gates/2026-09-08-cyber-cc-unit3-relink.json` is gone with the rederive
  it depended on.
- The relink generator, its suite and its fixture STAY. The first instinct was to
  delete them with the rest, and that was wrong: the superseding session's gate
  cites `smoke:cyberccunit3` as a compatibility check, and it still passes
  because it runs against a committed fixture rather than the live page. Deleting
  it would have broken somebody else's gate to tidy up my own.

## The rule this earned

In CLAUDE.md, under the sheet-splitting rule: **re-run the post-import check
BEFORE importing, not only after.** It reads the live page, so it is the one
thing that can tell you the sheet's premise has expired. A sheet whose defect is
already gone is a sheet to delete.

## Still open

The superseding session's own gate now refuses its two `rederive` checks, with
`precondition: expected the six retired ids 3.1 ... 3.6`. That is their generator
correctly refusing to transform an already-transformed page, which is the same
staleness one step later. It is a record of a landed deploy rather than something
broken, and it is theirs, so it is named here rather than edited.
