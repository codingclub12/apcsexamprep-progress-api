# The cyber practice hub and spoke gets its reverse edge

**Date:** 2026-09-04 · **Board:** #220 · **Follows:** PR #512 and #514

## The first import worked, and left the layer almost unreachable

The two sheets from #512 were imported. Verified live rather than assumed: all
five spoke handles serve, every spoke carries its own 22 to 31 practice assets,
reaches its unit study page and reaches its unit's course lessons. The import
gate now passes on all four kinds including `live`, 24 checks, 22 of them false
before the import.

Then the obvious next question, measured rather than guessed: what links IN?

| source | links any practice page |
|---|---|
| `ap-cybersecurity-topics` | the practice hub |
| the course guide | none |
| the teacher Command Center | none |
| all five unit study pages | none |
| course lesson pages, concept spokes | none |
| practice-questions, practice-exam, study-guide | none |

One inbound path for all five spokes, two hops deep. A spoke linked UP to its
unit study page and the study page did not link back, so the hub and spoke was
a one-way street: reachable if you start at the practice hub, invisible if you
start where a student actually starts.

## What shipped

Six reverse links plus the course guide, and the graph is now a contract rather
than a description: `lib/cyber-practice-spec.js` declares 48 required edges and
rule P3 checks the sheet renders every one.

The unit study pages are the ones that matter. Those are the five pages the
topics hub already links, and each now points at its own unit's practice.

Deliberately not included: the 128 course lesson pages and the 63 concept
spokes. Both already link their unit study page, which now links practice, so
they are two hops rather than orphaned. 191 more rows is a different change with
a different risk profile.

## Three things the work found

**lib/link-block.js was inserting into JavaScript string literals.** This is the
one worth reading. `cyber-command-center` has no `.related` block and no
`nav-row`, so insertion fell through to `body.lastIndexOf('</div>')`. That page
ENDS with `</script>`, and its last `</div>` sits at byte 65682, inside a script
spanning 17341 to 68693:

    +   '</div>'
    + '</div>';        <- the block went in here

An unterminated string literal, and the 51 KB script that builds the entire
teacher Command Center dies with "Invalid or unexpected token". Div balance
held, byte growth was positive, the anchor count moved by exactly one, and the
body round-tripped through CSV byte for byte. Every structural check passed.
Compiling the JavaScript is the only thing that failed, and nothing did that.

Two fixes, because the first alone is a guess that the fallback is the only way
in: insertion now skips `<script>` and `<style>` bodies, and `check()` compiles
every script before and after and refuses when one that compiled stops
compiling. A script already broken before the edit is tolerated, because that is
not this module's to fix and failing on it would block every future edit to that
page. Both halves are mutation tested, and the first mutation had to be rebuilt:
the fixture had its script in the middle, where the wrapper's own closing div
comes after it and the naive `lastIndexOf` finds the right place by luck. A
fixture that does not reproduce the bug tests nothing.

This module is used by `scripts/internal-link-csv.js`, which is the site-wide
linking pipeline, so this was latent for every page shaped like that one.

**The validator was judging prose it did not write.** The course guide carries
about 40 em-dashes of its own. Rules 1, 2, 3 and 7 govern text WE author, and a
MERGE row contains the whole page, so a one-link edit was refused over content
the edit does not touch. `authoredText()` narrows those four rules to what sits
inside link-block's own fences on an extended page. Structural rules still read
the whole row. The risk of any narrowing is a new blind spot, so a mutation puts
an em-dash INSIDE the added block and requires R3 to fire.

**R6 refused to republish two dead links, and it was right.** The course guide
links `ap-cyber-unit-1-lesson-1`, which does not exist in any form, and a plural
`ap-cybersecurity-study-guides` where the live handle is singular. A MERGE
rewrites the whole body, so adding a link there means republishing both. The
repair is declared in the spec and applied before the link block goes on. The
plural is a typo fix. The other is the one judgement in this change: the anchor
reads "Start Unit 1" inside a "Start the Free Course Now" call to action, so it
now points at Unit 1's own landing page, which is what the topics hub links.
That page ships as its OWN sheet, because repointing an anchor on the course's
flagship page is a content decision a human should see on its own rather than
buried in a six-row linking sheet.

## Evidence

- `npm run smoke:cyberpractice` - 29 checks, 16 mutations, every one caught by
  the rule that claims it.
- All 182 offline suites green, including the four other `lib/link-block.js`
  consumers: `smoke:linkgraph` (128 passed), `csahublinks`, `deadlinks`,
  `cspunittestlinks`.
- `node scripts/deploy-gate.js deploy-gates/2026-09-04-cyber-practice-reverse-edge.json --pre`
  - suite, rederive and mutation agree; `live` correctly deferred.
- `node scripts/deploy-gate.js deploy-gates/2026-09-04-cyber-practice-import.json`
  - all four kinds including `live`, for the first wave.
- Both new sheets clear `matrixify-preflight` with `--carrying`, which proves
  the 120 emoji in them were already on the live pages and none were added.

## Still open

- **The two new sheets are not imported.** Import
  `cyber-practice-reverse-links-pages.csv` first, then
  `cyber-course-guide-repair-pages.csv`, then run
  `npm run verify:cyberpractice`. Run today it reports the reverse assertions
  failing, which is the proof they are not decoration.
- The 128 course lesson pages and 63 concept spokes still do not link practice
  directly. Two hops, not orphaned. Internal-link pipeline's job.
- Board #209 also names `ap-cybersecurity-study-guides` on pages other than the
  course guide. Only the course guide is repaired here.
