# The unit exams were public, and the sitemap grep that found them was too wide

2026-09-04. Board 228. Started as a question about letting teachers assign and
hide coursework, and about whether gating quizzes would cost search traffic.

## What was actually wrong

Thirteen unit-exam-shaped pages sat in the public sitemap with no robots meta.
Five of them are the AP Cybersecurity end-of-unit exams, and each served all 20
questions, all four options and a full rationale per option as crawlable HTML.
CLAUDE.md tier 3 says unit tests plus keys are gated, noindex, premium only.
They were tier 1.

Measured live, no User-Agent, through `lib/storefront-fetch.js`:

    ap-cyber-unit-1-exam    200   26,414 unique chars   no robots meta
    ap-cyber-unit-1-lesson-1-quiz  200     941 unique   no robots meta

The lesson quiz number is the one worth keeping. Those pages are already on the
server render path, so they ship no questions to a crawler at all and 94% of the
body is nav and the contact form. Gating a lesson quiz costs nothing in search
because there is nothing there to rank. The unit exams are the opposite case and
were the only real leak.

## The 13 were not one set, and shipping them as one would have cost traffic

The regex that found them (`unit-N-exam|unit-N-practice-exam`) put two opposite
families in one bucket. `snippets/ap-csa-megamenu.liquid` links four of the CSA
ones from the public navigation under "Practice Exams", which makes them the SEO
engine, where CLAUDE.md calls gating a strategic error rather than a security
improvement. The cyber five are linked from no nav at all and carry a course
breadcrumb.

Tanner picked the cyber five. The split and its reasoning live in
`config/noindex-pages.json` rather than in a regex, because the two families look
identical in a sitemap listing and are opposite in intent.

`scripts/verify-noindex-live.js` asserts the negative side too: the four CSA
pages must STILL be indexable. An over-broad sheet is a traffic loss that takes
weeks to undo and would look exactly like success to a script that only checked
its own five.

## Mechanism: a metafield, not theme code

Shopify reads namespace `seo`, key `hidden`, value 1 and emits the noindex and
nofollow tags AND drops the page from `sitemap.xml` itself. Deleting the
metafield reverses both. Confirmed against shopify.dev rather than recalled.

That is worth more than convenience here. `layout/theme.liquid` wraps its own
canonical in `if disabled_by_yoast_seo`, a variable the theme never assigns, so
it is nil, so it is falsy. `snippets/meta-tags.liquid` documents the same trap
and the day it cost the storefront every og: tag. A robots meta added to the head
by hand would be one edit away from landing inside that dead block and rendering
nothing, silently. The metafield cannot.

## Evidence

    parse-back      5 rows, MERGE, seo.hidden = 1, header byte-matched
    preflight       clear to import, after it caught the filename
    mutation        10 of 10 red, each for its own rule
    live (pre)      10 assertions fail, exactly the 10 the import flips

The preflight catch is the one to remember: the first sheet was named
`cyber-unit-exam-noindex.csv` and was rejected because a CSV has no tab name, so
the FILE NAME carries the sheet type and Matrixify drops the whole file in one
second. It is now `-pages.csv`.

The parse-back also failed on its first run, on my own check rather than the
sheet: the QUOTE_ALL regex was reading the BOM as part of the header line.
Generation is not evidence that generation worked, and neither is writing a
validator.

The live verifier is deliberately red right now. It asserts the noindex meta is
present and the handles are gone from the pages sitemap, both false before the
import, both true after. An assertion that would have passed yesterday is
decoration.

## What is still open

- **The sheet is not imported.** `matrixify/cyber-unit-exam-noindex-pages.csv`
  is generated and preflighted, and importing is Tanner's, once, in MERGE mode.
  Then `node scripts/verify-noindex-live.js` must go green.
- **Noindex is not gating.** The pages stay reachable and their questions stay in
  the HTML for anyone with the URL. This removes them from search; it does not
  make them an assessment. Doing that means moving the questions into
  `quiz_bank` and onto the server render path, which is the migration
  `docs/quiz-locking.md` describes, one exam at a time.
- **The rest of the sitemap sweep.** `docs/meta-description-gaps.md` names 17
  internal, gated or test pages that almost certainly want noindex too, `join`
  and the teacher dashboards among them. `config/noindex-pages.json` has room for
  a second group and the generator reads all groups, but nobody has confirmed
  that list against live pages.
- **The CSA duplicate pair.** `ap-csa-unit-1-practice-exam` and
  `ap-csa-unit-1-exam-objects-methods-expressions` look like the same assessment
  at two handles, only one of which the megamenu links. That is a canonical
  question, not an indexing one, and it was out of scope here.

## What I could not measure

Whether any of these pages actually rank. The Ahrefs workspace is a trial with
`units_limit_workspace: 0`, so every Site Explorer call returns "API units limit
reached", and no GSC property is connected to either Ahrefs project, so
`gsc-pages` answers "No GSC data available". Everything above is about whether a
page CAN rank, which is a different question. If the unit exams turn out to pull
real clicks, the case for a public practice counterpart on a disjoint item bank
gets much stronger.
