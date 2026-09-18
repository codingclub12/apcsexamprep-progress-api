# Closing the orphan class, and the half of it that stays open

Board 351, claimed as claim 305. Board 372 opened for what this does not cover.

## What was asked

Tanner: "do 351". That task exists because board 352 was an instance of
something: a seven-problem autograded array page, live since February, reachable
from nothing, found only because he happened to open it.

## The design decision, made before any code

The repo already measures this properly. `scripts/link-graph.js` has the zone
model, the 35% ubiquity rule, 118 offline assertions, and it is good. It is also
42 minutes of network, and `lib/site-crawl.js` rates orphans P2 and does not
check them at all.

So the question was not "how do we measure orphans", which is answered. It was
"what can be decided without the crawl". On this site the naming convention IS
the architecture, so whether a page has a HOME is decidable from its handle.

`lib/site-architecture.js` therefore holds no opinion of its own. Everything
comes from `lib/link-graph.js`. The one thing worth knowing is that
`resolveClusters` reads edge fields only for its reporting stats: feed it nodes
with zeroed edges and families and hubs come out correct with no crawl. That is
what makes the whole thing offline.

## The hypothesis was tested against the known case first

Before building anything, the question was whether this approach would have
caught board 352 from the handle alone. It does:

    ap-csa-array-mastery-interactive-practice
      familyOf  ap-csa-array-mastery
      cluster   size 1, NO HUB
      verdict   parentless

That is pinned in the suite by name, so if the taxonomy ever stops catching the
page this task was written for, the suite says so.

## What is live, measured 2026-09-18

1,365 live page handles.

| | |
|---|---|
| site furniture, no course prefix | 68 |
| is its own family hub | 344 |
| has a declared parent | 712 |
| **parentless** | **241** |

By course, the parentless: CSP 83, CSA 62, Intro to Java 51, Networking 25,
Cyber 20. The three largest hubless families are `intro-java-help-*` at 13, 11
and 10 members, which matches what the 2026-08-27 crawl already recorded: "Intro
to Java: 109 pages, 52% orphaned, no course hub at all." Two independent methods
agreeing on the same worst case is the closest thing to corroboration available
without running the crawl.

## The honest limit, found by checking rather than assuming

**A declared parent is not a link.** Sampled 11 clusters that have a hub and
fetched each hub's stored body: it actually linked the child in **6 of 11**.

So this work closes the "no home at all" half and not the "home exists but does
not link" half. Saying otherwise would be the more comfortable report and it
would be false.

The useful part is that the second half is cheap, and that was not obvious going
in. The question is only whether each HUB links its members, so it fetches the
344 hubs rather than all 1,365 pages: roughly 7 minutes against 42. Board 372.

## What shipped

    lib/site-architecture.js       the module. No new clustering opinions.
    scripts/site-architecture.js   build, and --check as a ratchet
    config/site-architecture.json  generated, checked in, hand edits refused
    smoke/site-architecture.js     28 offline assertions, 5 source mutations
    matrixify-preflight.js         refuses a NEW page with no home
    docs/site-architecture.md      the contract

**The ratchet is the part that makes it adoptable.** 241 pages are parentless
today. A check that goes red on all of them on its first morning is a check
somebody turns off by lunchtime, and `lib/site-crawl.js` already records that
exact failure for a job that reprints the same fourteen tasks daily. So the
baseline may only shrink: a new parentless page fails, and a fixed one must
leave the file or the baseline quietly becomes a permanent exemption list.

**The sheet gate is where the class actually dies.** A page is orphaned at the
moment it is published. Every one of those seven board tasks was found
afterwards. The preflight now refuses a row that is both absent from the
architecture and parentless, which is the first check in this repo that prevents
an orphan rather than finding one.

## Two things the mutations found in this session's own work

Both are the reason CLAUDE.md insists the red must name its own rule.

**A hollow assertion.** A mutation of the node's `role` field came back GREEN.
`resolveClusters` passes role through to its report and never reads it for
clustering, and `classify` computes role itself. So the assertion was testing
nothing. It was replaced with a mutation of the page PATH, which is load
bearing, rather than kept because it looked reasonable.

**A test that was wrong about the site.** The first draft asserted that
`ap-csa-lesson-4-4-traversing-arrays-frq` belongs to `ap-csa-unit-4-course`. It
does not: `familyOf` stems on the numbered part, so the lesson page is the hub of
its own family and the activity's parent is the LESSON. That is the fifth naming
irregularity CLAUDE.md lists. The code was right and the test was wrong, which is
worth recording because the tempting fix was the other way round.

**The sheet gate was mutated four ways, each required to break its own rule:**

    gate never fires              -> "a NEW page with no hub is refused" fails
    stop skipping existing pages  -> "an EXISTING parentless page is not
                                     refused here" fails
    stop exempting site furniture -> "site furniture passes" fails, AND ten
                                     other suite assertions fail with it
    ignore whether a parent exists -> "a NEW page joining a family with a hub
                                     passes" fails

The third one deserves its collateral damage written down rather than tidied
away: without the scope exemption the gate fires on every synthetic fixture
handle in the preflight suite, because none of them carry a course prefix. The
exemption is not a nicety, it is what stops the gate refusing every page on the
site that is not coursework.

## Evidence

- `npm run smoke:architecture` 28 passed, 0 failed, including 5 source mutations.
- `npm run smoke:preflight` 69 passed, 0 failed, up from 65, the 4 new ones being
  the gate's cases.
- Regression check: the two most recent real import sheets in `imports/` produce
  zero new-page-no-home problems, so the gate does not argue with existing work.
- Three synthetic sheets: a new page with no hub is REFUSED, a new page joining
  an existing lesson family PASSES, site furniture PASSES.
- `smoke:linkgraph`, `smoke:volumepaths`, `smoke:encoding` all pass.
- Full offline suite as CI derives it: 268 suites, 7 failing, all
  `ModuleNotFoundError` for python-docx and python-pptx which are not installed
  in this container. Confirmed by stashing to clean main and reproducing the same
  failure, so they are environmental and pre-existing.

## Still open

- **Board 372**, the other half: a declared parent that does not link the child,
  6 of 11 sampled. Cheap, because hubs only.
- **241 parentless pages** are recorded, not fixed. The ratchet stops it growing;
  shrinking it is hub-down sheet work.
- `familyOf`'s singularizer turns `codehs` into `codeh`, so the family reads
  `ap-csp-codeh-midterm`. Cosmetic, it still groups correctly, and it is in a
  shared module with 118 tests, so it was left alone rather than fixed in
  passing.
- 68 handles carry no course prefix. Most are genuine site furniture, but some
  are real course content spelled out in full, such as
  `ap-computer-science-principles-practice-exam-2025`. Those are invisible to
  this check and would need a `COURSE_PREFIXES` entry.
