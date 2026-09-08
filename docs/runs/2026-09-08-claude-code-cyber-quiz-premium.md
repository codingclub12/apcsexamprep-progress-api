# The quiz is premium, in both places

2026-09-08. Board 285. Tanner, on reading the answer key work that shipped an
hour earlier: "Just lock the quiz all together. Student and teacher. Free preview
is fine with just the slides and other supplementals."

That is a scope call rather than a bug report, and it makes the previous pass
half a change. The answer key was gated on entitlement; the quiz it was the key
to was not.

## What was actually being given away

The Command Center gates lesson materials on `unlocked`, which is
`STATE.entitled || unitFree(u)`. Unit 1 is a free unit, so `unlocked` is TRUE for
a signed-out visitor, and the quiz was published to them twice:

    materials row   the teacher quiz DOCUMENT, a Drive url printed into the HTML
    pages row       the student quiz LINK, a live storefront path

Both now read `STATE.entitled`, through one predicate the answer key already
used. Three surfaces, one `quizOpen()`, so there is a single place this can be
undone rather than three that can drift apart.

## What did not move, which is the other half

The deck, the guided notes, the supplements, the teacher guide, the lesson page,
both scenarios, the terminal lab and the Question of the Day are untouched. A
teacher previewing Unit 1 still gets a full lesson to teach from; what they no
longer get is the instrument or its key.

That distinction is one careless line apart from the change itself. Writing
`var open = quizOpen()` instead of `var open = d[0]==="quiz" ? quizOpen() :
unlocked` locks the entire free preview, which is the more damaging of the two
mistakes because it removes the thing the free unit exists to show. So it is a
mutation in the gate, and section 9 asserts each surviving surface is still OPEN
rather than only asserting the quiz is shut. A suite that checked the lock alone
would pass on a page that had locked everything.

## What this is, and what it is not

Presentation gating on two of the three, and the difference is worth keeping
straight rather than letting "locked" do the work of both:

- The Drive quiz document is shared "anyone with the link". Hiding it stops the
  url being PUBLISHED to a visitor who has not paid. It does not revoke a link
  someone already copied.
- The student quiz page is a public Shopify page and stays reachable by URL.
- The answer key is different in kind. The server refuses it on a credential,
  and that one is access control.

Making the student quiz page itself refuse an unentitled reader is boards 258
and 276, not a Command Center edit. This change does not claim to have done it.

## Evidence

`deploy-gates/2026-09-08-cyber-quiz-premium-both-places.json`, green on three
kinds. There is no `live` kind and that is a property of the change: this touches
no route and no runtime module, so merging deploys nothing. It reaches a teacher
only when the sheet is imported.

- **suite**: `smoke:cyberquizkeys` 49 passed, `smoke:quizkey` 30 passed.
- **mutation**: four, each red for its own named assertion. Two restore the
  free-unit gate on each surface separately, so a fix that covered only one of
  them cannot pass. One breaks the shared predicate. The fourth is the overshoot
  above.
- **rederive**: the sheet parse-back, which now undoes FOUR line edits rather
  than two and still rebuilds the snapshot byte for byte, plus the CED-taxonomy
  crosswalk re-derivation, unchanged at 15 rows confirmed and 0 conflicts.

The behavioural section is the one worth reading. It does not read the
generator's source; it PATCHES the committed snapshot, lifts `matButton` and
`studentSection` out of the patched body, and runs them with `unlocked` true and
`entitled` false, which is exactly a signed-out visitor on Unit 1. Those two
functions live in the page rather than in this repo, so nothing short of running
the patched output can say what they do.

Its first run failed on the two answer-key assertions, and the cause was the
fixture rather than the code: the section reused the panel built for row 3.4
while asserting against row 1.1, so `QUIZKEY` had no entry and no key rendered.
Worth recording because a fixture that fails for its own reasons is one bad
guess away from being "fixed" by weakening the assertion.

## After the import, run this

Not runnable now, and it is the assertion that closes the loop. On the live page,
signed out:

    the materials row prints no drive.google.com url for the quiz
    the pages row prints no /pages/ap-cyber-unit-1-lesson-1-quiz
    the deck, notes, supplements and teacher guide urls are all still there

The third line is the one that matters, because the first two are also true of a
page that failed to render.

## The rollback is staged, so the import timing is a smaller decision

Tanner asked whether to import mid school day. The honest answer is that the
risk is low and asymmetric rather than zero, so the thing worth building was not
an argument, it was the undo.

`matrixify/cyber-cc-quiz-answer-keys-ROLLBACK-pages.csv` is one MERGE row
carrying the body the page has right now. Checked rather than assumed: parsed
back as a CSV, its Body HTML cell is byte identical to what the Admin API serves,
69,733 bytes, and the committed snapshot equals the live body too, so the forward
sheet was generated from what is actually there. Preflight clear.

The page has not been touched since 2026-09-04T03:48:40Z, so neither sheet is
racing an edit somebody else made.

## Still open

- The sheet is not imported. `matrixify/cyber-cc-quiz-answer-keys-pages.csv`,
  preflight clear, MERGE, one row.
- The student quiz PAGE is still public by URL. Boards 258 and 276.
- Board 283, the three Unit 3 rows that open the wrong page, is untouched here.
