# The CSA page sells slides, and the product listing already sells the course

2026-09-04. Board 239, the CSA half of what board 236 did for CSP.

## The same defect, one page over

Live body of `/pages/ap-csa-teacher-superpack`, measured:

    slide          8        guided notes    0
    pacing         8        teacher guide   0
    FRQ            8        exercise        0
                            answer key      0
                            quiz            0
                            unit test       0
                            project         0
                            rubric          0

CSA is slightly better off than CSP was, because it does say pacing and FRQ. It
still never says the thing a teacher is actually buying.

## Where the inventory came from, and why it is a different source than CSP's

The CSP section was built by counting 590 real files on
`/pages/ap-csp-teacher-resources`. **CSA has no such page.** CSP and cyber both
have a teacher-resources delivery page and CSA does not. `csa-command-center`
exposes one generic material type per lesson, literally
`{ key:"pack", label:"Lesson materials" }`, rather than a file list, and carries
13 Drive-shaped ids against the cyber command center's 120.

So the source here is the **product listing** for `ap-csa-teacher-superpack`,
which is first-party and specific, in Tanner's own words:

    50+ complete lessons, each with 8 teacher documents: Teacher Guide, Guided
    Notes, two Exercises with Answer Keys, a Discussion Activity, and a Bell
    Ringer + Quiz.
    Unit Tests with AP-style MCQ sets plus free-response questions, full
    rationales, and distribution audits.
    Unit Projects with point-based scoring rubrics.

The page a teacher lands on from search sells less than the product page they
reach after clicking buy. The section moves the listing's own inventory to where
the pitch is.

## Two things this section deliberately does NOT say

**No total.** 53 lessons times 8 documents is 424, and that number is not in
here. It would be arithmetic on a claim rather than a count of anything, and the
CSP figure was a count. Board 206, Tanner's own and still open, says 38 CSA
lessons have no deck anywhere, which is a standing reason not to multiply out a
figure nobody has verified.

**Nothing about slides.** The page already makes that claim. Whether it holds is
board 206's problem, and repeating it in a section I am adding would launder an
open question into new marketing copy.

`config/csa-slide-manifest.js` carries 53 lessons and zero deck ids, which is
consistent with 206 and is why the restraint above is not theoretical.

## What changed structurally

`lib/page-section-insert.js` now holds the splice, the two byte assertions and
the authored-prose checks. Both generators call it. One implementation rather
than two, for the same reason the gradebook has one builder.

**The CSP sheet came back byte-identical, md5 `1b84493b`.** That is what says
the refactor changed no output.

Both blocks moved out of `content/*.html` and into their generators, so the only
artifact either produces is a CSV. `content/` is gone.

## Evidence

    parse-back   CSA 22099 = live 20737 + block 1362, exact
                 CSP 21444 = live 19873 + block 1571, exact, unchanged md5
    preflight    both clear, with each live body supplied for the emoji round trip
    mutation     22 of 22 across both pages, each for its own reason
    hollowness   reverting the function replacement fails 2 of 22, one per page

Two of my own checks were wrong before the code was:

- The hollowness run first reported zero pages going red. The suite HAD gone
  red, exit 1, two cases; my grep was matching a message the failure does not
  print. The failure prints `A $-BEARING BLOCK WAS REFUSED` because the length
  assertion catches the corruption before the interpretation check is reached.
- An ad-hoc slice said the CSA sheet body did not equal live plus block. It
  does. The slice was a naive `indexOf` on a quoted field; the real parser says
  CLEAN.

Both are the same lesson as the mojibake work: verify that a check covers a case
by RUNNING it against the case, and when a check disagrees with the code, find
out which one is wrong before believing either.

## What is still open

- **Neither sheet is imported.** `matrixify/csa-teacher-bundle-inventory-pages.csv`
  and `matrixify/csp-teacher-bundle-inventory-pages.csv`, one MERGE row each,
  Body HTML. Live commercial pages, so the copy wants a human read.
- **CSA has no teacher-resources page.** CSP and cyber do. That is the page that
  would let a future session COUNT the CSA inventory instead of quoting a claim,
  and it is also what a buyer uses to find a file. Nobody has scoped it.
- **Board 206 is unresolved and this section does not touch it.** If 38 lessons
  really have no deck, the slides claim already on the page is the problem worth
  fixing next, and it is a content problem rather than a copy one.
