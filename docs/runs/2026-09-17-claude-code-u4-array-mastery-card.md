# The array page nobody could reach, and the measurement that was wrong about why

Board 352, claimed as claim 275 on lock `shopify:ap-csa-unit-4-course`.
Board 351 opened alongside it for the class this belongs to.

## What was asked

Tanner found `ap-csa-array-mastery-interactive-practice` while looking at
something else, said it looked useful and orphaned, and asked where it should
go. Then asked the larger question: how to make the site architecture elite.

## What is live

The page is real and it is not a stub. Seven Java problems with 8 to 12 hidden
test cases each, four difficulty levels from forward traversal up to two-pointer
and two-sum, published 2026-02-28, last touched 2026-04-02. It is also
completely unreachable: 14 plausible parents fetched, including all three Unit 4
array lessons, the Unit 4 hub, the exam prep hub and every array-topic page.
Zero inbound.

Two defects found on the way that are not this task:

- It executes student Java against `https://emkc.org/api/v2/piston`, pinned to
  Java 15.0.2, rather than this repo's Judge0 proxy. One unauthenticated POST
  per test case, so problem 4 or 6 is twelve requests on one click, against a
  free public service that rate-limits. A class of 25 submitting together is
  where that shows.
- It carries no `data-lesson-id` and no reporter, so every score on it is lost.

## The measurement that was wrong

On 2026-09-10 this session reported that the Unit 4 hub already linked six
standalone array pages and that the array mastery page was simply missing from
that group. **That was wrong.** Those six handles were read off the RENDERED
page, where they sit in the mega-menu.

`docs/internal-linking.md` opens with exactly this warning, in the section
called "the one thing that makes the numbers mean anything": every page renders
about 135 `apcs-dropdown-link` anchors before its content starts, so counting
anchors makes every page look richly interlinked including the ones nobody can
reach. The doc was read in the same session that then made the mistake.

Reading the STORED body through `/pages/<handle>.json` gives the real answer.
`ap-csa-unit-4-course` links the 17 lesson families at five pages each, four
resource cards, its unit study guide and its sibling unit hubs. No standalone
array page, so the card added here is a new category on that hub rather than a
gap in an existing row.

What makes this worth writing down rather than quietly correcting: the zone
model exists, it is documented, it is tested by 118 offline assertions, and a
session with all of that in context still measured the rendered page. The
defence that works is not knowing about chrome. It is never grepping a rendered
body for a link.

## What shipped

`imports/2026-09-17-csa-u4-array-mastery/`, one row, MERGE, with a runbook
carrying the expected end state. One resource card in the `u4-resources` deck,
second position, labelled "ungraded self-check".

It deliberately does NOT go in the hub's "Coding Practice" section, whose own
copy promises "your score reports to your teacher automatically". This page
reports nothing. That section would have made the hub lie.

Supporting code, all committed:

- `scripts/csa-unit-hub-resource-card.js`, the generator. Fenced insertion, so
  a second run is a no-op and the edit reverses.
- `smoke/csa-unit-hub-resource-card.js`, `npm run smoke:hubcard`. 24 offline
  assertions, of which 6 are SOURCE mutations that each require one guard to
  fire by name.
- `scripts/verify-u4-array-mastery-live.js`, run before and after the import.

## Three guards earned their place during the build

Worth recording because each one caught a defect in this session's own work,
which is the argument for writing the refusal before the happy path.

1. **The reversal guard caught the generator.** The first version put the
   inserted newline OUTSIDE the fence, so `unmark()` returned a body one byte
   longer than `build()` started from. It refused to write a sheet. A fence that
   does not reverse is a fence that cannot be undone from the page.
2. **The preflight refused the sheet three times.** No BOM, which would have
   turned every bullet already in that hub body into three characters on the
   live page. A file name Matrixify reads the sheet type from and would have
   rejected whole in one second. And an emoji it could not prove was
   pre-existing until the carrying file was supplied. None of the three is
   visible by reading the CSV.
3. **The mutation harness was wrong before the guards were.** Six source
   mutations all failed with module-not-found, because the mutant was written to
   a temp dir where `../lib` does not resolve. That reads exactly like six
   hollow guards. A mutation suite that cannot load its own mutant reports the
   same green as a suite whose rules are decorative, which is the reason this
   repo requires the red to name its rule.

An absolute count also went wrong in the verifier: `u4-resource-card` appears
four times in the page's own CSS as well as on four anchors, so the deck read 8.
The generator's matching guard is a delta and cancelled it out; the verifier's
absolute count did not.

## Evidence

- PRE check, 8 of 8: target serves a real page with its 7 editors, hub does not
  link it, deck holds its 4 incumbent cards.
- Parse-back diff: CSV read back, Body HTML matched the intended body byte for
  byte, md5 `ec091aba4866`.
- Preflight: clear to import.
- `npm run smoke:hubcard`: 24 passed, 0 failed.
- Simulated POST against the body the sheet will write: inbound 1, deck 5, all
  four incumbents present.

## Still open

- **The sheet is not imported.** Every Shopify page change ships as a sheet a
  human imports, and this one is handed over rather than applied.
- The page still reports no score and still depends on emkc.org. Separate work.
- Board 351 is the class this instance belongs to: seven board tasks since #73
  are all "a page shipped and nothing links it", six closed as instances. The
  nightly crawl rates orphans P2 and does not check for them at all.

---

## Addendum, 2026-09-18: imported, and what the import proved

Tanner imported the sheet. Live hub `updated_at 2026-09-18T09:17:00-05:00`.

`node scripts/verify-u4-array-mastery-live.js --post`: **8 of 8**. The hub links
the target exactly once, the deck holds five card anchors where it held four,
all four incumbent cards survive, and the target still serves its 7 editors.

Three checks beyond the verifier, each re-derivable by someone who does not
trust this note:

- **Byte-exact.** The imported CSV was parsed back and its Body HTML column
  compared to the live stored body. Identical, 64,592 UTF-16 units. So the live
  page is exactly what was reviewed, with nothing added or lost in transit.
- **A student sees it.** The RENDERED page answers 200, passes `looksReal`,
  carries the card text, and shows five resource-card anchors.
- **The original measurement, re-run.** Inbound content links to
  `ap-csa-array-mastery-interactive-practice` went from **0 to 1** across the
  same 15 parents, reading stored bodies so chrome is excluded. That is the
  measurement that established the defect, which is the one worth repeating:
  proving a fix with a friendlier check than the one that found it proves
  nothing.

Board 352 is `done` with `verified` still false, deliberately. This session did
the work and rule 4 says the worker is never the one who says it is true.

## The sheet is deleted, and that is the point

A Matrixify sheet carries a WHOLE BODY SNAPSHOT rather than a patch. This one now
holds the 2026-09-17 body. Import it next week and it MERGES that body over the
page, silently reverting anything that landed in between. The fenced card is
idempotent; the body around it is not. So the CSV and its carrying file are gone
and the runbook is the record, following what #702 did the day before.

`scripts/verify-u4-array-mastery-live.js` stays, for the reason that note gave:
a page being right today is no reason to stop noticing if it stops being right.

## What that turned up, which is bigger than this task

`scripts/matrixify-preflight.js` was re-run against this sheet AFTER the import,
with its carrying body a day out of date, and answered **clear to import.**

The staleness rule that fired on its first real case on 2026-09-17, and that
CLAUDE.md now cites as the thing standing between a stale sheet and a reverted
page, lives inside ONE generator: `scripts/csa-cyber-quiz-mount-unpin-csv.js`,
in its `--check` path. It is not in the shared preflight that every sheet passes
through on its way to a live page.

So the gate that catches this is the one a session has to remember to build into
its own generator, and the gate everybody actually runs does not have it. Every
other sheet under `imports/` is a re-import that nothing would refuse. Filed as
its own board item rather than fixed here, because moving that rule into the
shared preflight touches every generator that already has its own copy, and that
is a change worth reviewing on its own.

Same shape as board 351: an instance was fixed, the class was not.
