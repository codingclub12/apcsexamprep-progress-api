# The $249 page sells slides. The bundle is a whole course.

2026-09-04. Board 236. I asked for this work myself, on a premise that was wrong,
and the correction is the useful part of the note.

## The premise was wrong

Closing out the noindex work I told Tanner that hiding
`ap-csp-teacher-resources` "removes the only page describing what the CSP teacher
bundle contains" and that the bundle had no marketing counterpart. Both false.
`/pages/ap-csp-teacher-superpack` has existed since May, it is the product page
for "AP CSP Teacher Course Bundle" at $249, and it is a real sales page: free Big
Idea 1 preview, tutoring-hours credibility, who this is for, the lot.

I had listed teacher-facing handles earlier in the same session and did not read
them. The lesson is the ordinary one this repo keeps writing down: a claim about
what is on the site is a claim about live state, and live state gets queried.

## The gap that is actually there

Measured on the live body, not the rendered page:

    "slide"            9 occurrences
    guided notes       0
    pacing             0
    discussion guide   0
    lesson map         0
    teacher guide      0
    answer key         0
    Big Idea exam      0
    quiz               0
    exercise           0

Behind the paywall, `ap-csp-teacher-resources` carries about 590 files across the
35 topics: 224 guided notes in two tracks, two exercises and a topic quiz per
topic each with a key, a lesson map, teacher guide and discussion guide per topic,
five Big Idea exams with keys, two pacing guides, the Create Task pack, the Big
Idea 2 data project and Innovation Investigations.

So a teacher reads the page and concludes $249 buys slide decks. The page is not
missing. It undersells by roughly an order of magnitude, and the differentiation
angle, a standard and an honors handout for the same topic on the same day, is
the strongest thing in the product and appears nowhere.

Writing a second page would have been the wrong fix twice over: a duplicate
competing with a converting page for the same query, and the existing page is
good, it is just incomplete.

## An insertion, never a rewrite

Body HTML replaces wholesale and Matrixify calls the replacement a success either
way. That is how the self-study tab vanished from `/pages/join` on 2026-08-22
with every generator guard green (board 112).

So the generator never composes a body. It fetches the live one, splices one
block at a single anchor, and proves the result:

    out.length === live.length + block.length
    out with the block removed === live, byte for byte

Together those mean nothing else moved, changed, or vanished. A rendered-text
diff cannot make that claim about a 20KB body.

## What the mutation run found, which was in my own work twice

**`String.replace` interprets `$` in a string replacement.** A block containing
`$&`, `` $` `` or `$'` splices in the matched text, or the whole body before or
after the match. Measured: `AAA<anchor>ZZZ` came back as
`AAA[block <anchor> and AAA and ZZZ end]<anchor>ZZZ`. On a page whose selling
point is a price, a `$` is one edit away. splice() uses a function replacement,
which is not interpreted at all. Reverting it turns the suite red on the length
assertion, so the guard is not hollow.

**The test for that bug had the bug.** The case built its `$`-bearing block with
`BLOCK.replace(x, '... $& ...')`, a string replacement, so the sequences expanded
before `splice()` ever saw them and the case passed against a naive
implementation. It builds the block with a function replacement now.

**My first version of that mutation was not a mutation at all.** It claimed a
block whose tail also appears later in the body would "swallow content further
down". It cannot: `replace(ANCHOR, blk + ANCHOR)` only ever inserts. The suite
said GREEN WHERE RED WAS EXPECTED and it was right and I was wrong. The real
lesson is that `splice()` builds its own output, so a test that only calls
`splice()` can never prove the two assertions fire. They are factored out as
`verifyInsertion(live, blk, out)` and mutation tested against deliberately
corrupted outputs, including a deleted list item, a truncation, and a single
changed byte with the length preserved, which only the exact check can see.

## Evidence

    parse-back   sheet body 21444 = live 19873 + block 1571, exact
    preflight    clear, after supplying the live body for the emoji round trip
    mutation     10 of 10, each for its own reason
    hollowness   reverting the function replacement turns the suite red

The preflight refusal is worth keeping: it rejected the sheet because the body
carries raw emoji and no original was supplied to show they were already there.
They were, 2 of them, from the live page. `--carrying` proves it rather than
assuming it.

## What is still open

- **Not imported.** `matrixify/csp-teacher-bundle-inventory-pages.csv`, one row,
  MERGE, Body HTML. It is a live commercial page, so it wants a human eye on the
  copy before it lands, not just a green preflight.
- **No live verifier yet.** The check after import is that the page serves the
  new section and still serves everything it served before. Worth a
  `verify-*-live.js` if this pattern gets used on a second page.
- **The CSA bundle page has the same shape.** `ap-csa-teacher-superpack` is the
  same template with the same "Slides + Resources" framing. Nobody has counted
  what is behind it, so this note claims nothing about it.
- **`ap-csp-teacher-resources` is noindexed now**, which is right, and this
  section is what replaces its role for someone who has not bought yet.
