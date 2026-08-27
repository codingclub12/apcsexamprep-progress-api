# Shopify page snapshots

Point-in-time copies of the Body HTML of live Shopify pages, captured immediately
before and after an agent-applied edit. Shopify keeps no usable version history for
page bodies, so these files are the rollback path.

These are reference copies, not a source of truth. The live page always wins. Never
edit a snapshot expecting it to reach the storefront.

## Topic 1.1 Exercise 1, before and after the CED fix

Both are the body of `gid://shopify/Page/131898998999`
(`/pages/ap-cyber-unit-1-lesson-1-exercise-1`). See
`docs/runs/2026-08-27-claude-code-cyber-u1-ex1.md`.

1. `ap-cyber-unit-1-lesson-1-exercise-1.before-ced-realignment.html`
   `updatedAt` 2026-07-28T23:05:46-05:00, 58,014 characters. Red flag #5 labelled
   Authority a psychological tactic, which is EK 2.1.A.3 and belongs to Unit 2.
   This is the rollback target.
2. `ap-cyber-unit-1-lesson-1-exercise-1.after-ced-realignment.html`
   `updatedAt` 2026-08-27T12:31:06-05:00, 58,273 characters, and what is live now.

Captured the right way round: the before copy went on disk before the sheet was
built, which is the correction to how the social-engineering pair below was done.
Both are byte exact against their source responses.

## Topic 1.1 social engineering, before and after the CED realignment

Both are the body of `gid://shopify/Page/132111237335`
(`/pages/ap-cybersecurity-unit-1-social-engineering`), WO-3 of the AP Cyber Unit 1
CED realignment. See `docs/runs/2026-08-27-claude-code-cyber-u1-wo3.md`.

1. `ap-cybersecurity-unit-1-social-engineering.before-ced-realignment.html`
   `updatedAt` 2026-08-10T16:25:18-05:00, 218,875 characters. The page as it
   taught the legacy attack taxonomy. This is the rollback target.
2. `ap-cybersecurity-unit-1-social-engineering.after-ced-realignment.html`
   `updatedAt` 2026-08-27T11:38:26-05:00, 212,598 characters, and what is live
   now.

Two notes on these two files specifically.

**They were captured from `GET /pages/<handle>.json`, not the Admin API.** That
endpoint returns the stored `body_html` directly, so the copy is byte exact by
construction rather than by transcription, which is the property the rule in
`scripts/snapshot-live-page.js` is protecting. Both were confirmed identical to
their source responses after writing.

**The "before" copy was written after the import, not before it.** It is byte
exact because the pre-import body had been fetched and kept during the same
session, but the process was still wrong way round: the snapshot is the only
rollback path and it belongs on disk before the sheet is imported, not after. On
WO-4 through WO-8, snapshot first.

`scripts/snapshot-live-page.js` was not used, and could not be without changing
it: it parses the Admin API `{"data":{"pages":...}}` shape with a `body` field,
and it hardcodes a `.before-intro-java.html` suffix. Teaching it the storefront
JSON shape and an arbitrary label would make it usable for work like this and is
worth doing before the next import.

## Unit 1 exam: three states, in order

All three are the body of `gid://shopify/Page/132079550679`
(`/pages/ap-cyber-unit-1-exam`).

1. `ap-cyber-unit-1-exam.before-rebalance.html` - original, `updatedAt`
   2026-06-05T19:18:34Z. The key answered B on 11 of 20 questions.
2. `ap-cyber-unit-1-exam.after-rebalance.html` - published 2026-08-13T03:10:44Z.
   Seven questions reordered to a 5/5/5/5 spread.
3. `ap-cyber-unit-1-exam.current-live.html` - published 2026-08-13T03:45:52Z, and
   what is live now. Differs from state 2 by a single character: the Q8 key.

Each file is byte-identical to what was actually served, confirmed by re-fetching
the live body after each publish and diffing.

## Greenfoot Basics, before the intro-java course hub takes the slug

`greenfoot-basics-beginner-greenfoot-projects-and-tutorials.before-intro-java.html`
is the body of `gid://shopify/Page/126393549015` as it stood on 2026-08-16,
`createdAt` 2025-09-15T05:13:56Z, `updatedAt` 2026-04-02T22:42:41Z.

The intro-java course hub takes that handle over to inherit its search
authority, and `scripts/intro-java-pages-csv.js` refuses to write a sheet
containing that row until this file exists.

**Read this before trusting it as a rollback.** Unlike the Unit 1 exam
snapshots above, this one is NOT byte-identical. It was written out of an Admin
API read during the session that built the course, rather than piped through
`scripts/snapshot-live-page.js`, because that session had no network route to
the store from its container. Blank lines inside the `<style>` block carried
trailing spaces on the live page and do not here. Nothing else differs, and the
difference is insignificant to CSS, so publishing this file would restore a
functionally identical page.

What it is verified to contain: 11 project cards, all 11 project titles, 11
tutorial video links, 7 Google Drive starter-file folders, one h1.

To replace it with a true byte copy before importing:

```
# query { pages(first: 5, query: "handle:greenfoot-basics-beginner-greenfoot-projects-and-tutorials") {
#   nodes { id handle title updatedAt body } } }
node scripts/snapshot-live-page.js pages.json --force
```

`--force` is required precisely because a differing snapshot already exists; the
script will not discard one silently.

Separately, the projects on that page do not depend on this file surviving.
`seed/intro-java-projects-library.js` holds all 11 with their links, and the new
hub renders them, so the assets are safe even if a rollback never happens.

Three links on the live page are 404s and the replacement fixes all three:
`/pages/ap-computer-science-a` (in the breadcrumb and the primary CTA button,
real handle `ap-csa`), `/pages/ap-csa-study-guide` (real handle
`ap-csa-study-guides`), and `/pages/ap-csa-frq-solutions` (real
`ap-csa-frq-archive`).

## Rolling back

Publish the chosen snapshot back over the page body with `pageUpdate` on page id
`gid://shopify/Page/132079550679`. Confirm first that the live body still matches
`current-live.html`, so a rollback cannot silently discard somebody else's later
edit.

## Q8 key correction

State 2 carried a defect that predated the rebalance. Q8 asks which measures reduce
phishing risk: I domain-check training, II email filtering, III longer passwords.
The key said `A` (`I only`), but the explanation argued I and II are both effective
and the distractor note on `(A)` read "Incomplete - email filtering (II) is also an
effective anti-phishing control." Every piece of feedback on the page said `B`
(`I and II only`); only the key disagreed, so a student who reasoned it out and
picked B was marked wrong and then told the option they rejected was incomplete.

State 3 flips the key to `B`. Options are deliberately NOT reordered to compensate,
so the spread is 4/6/5/5 rather than 5/5/5/5. One question of imbalance is cheaper
than shuffling a question that is already correct, and the worst bubble-one-letter
score is still 30%, down from the original 55%.

Nothing else needed to change: the distractor notes sit on `(A)` and `(D)`, both
still wrong answers, and the explanation already argued for I and II.

## Scripts

`scripts/one-off/rebalance-cyber-unit-1-exam-answers.js` turns state 1 into state 2.
It reorders existing option markup rather than substituting new copy, and aborts
unless option text is a pure permutation, each new key letter still carries the old
correct answer text, the spread is 5/5/5/5, no distractor lands on a correct answer,
and no same-letter run exceeds two.

`scripts/one-off/fix-cyber-unit-1-exam-q8-key.js` turns state 2 into state 3. It
aborts unless exactly one character changes and that character is the e8 letter
going A to B.

`scripts/one-off/verify-cyber-unit-1-exam-key.js` is the standalone checker: four
options per question, radio value matching the visible letter, key letter present,
and no distractor explanation sitting on a correct answer. Run it against a snapshot
before publishing one. It exits non-zero on failure.

```
node scripts/one-off/rebalance-cyber-unit-1-exam-answers.js \
  shopify/page-snapshots/ap-cyber-unit-1-exam.before-rebalance.html /tmp/step2.html
node scripts/one-off/fix-cyber-unit-1-exam-q8-key.js /tmp/step2.html /tmp/step3.html
node scripts/one-off/verify-cyber-unit-1-exam-key.js /tmp/step3.html
```

## Still open

Q12 has no distractor explanation for wrong option `B` ("II and III only"). It had
none before the rebalance either; the reorder did not create the gap.

Any printed or PDF answer key for this exam is stale as of 2026-08-13. If one ships
in the Unit 1 Superpack or the teacher Drive folder it needs the same updates, or
teachers will grade against the old letters.

## Study games hub, before the Big Idea 3 links

`ap-csp-study-games-hub.before-bi3-links.html` is the stored Body HTML of
`/pages/ap-csp-study-games-hub` as it stood on 2026-08-18, `updatedAt`
2026-07-10T01:45:51Z. Ten game cards and eight coming-soon tiles, two of which
named games that had since shipped.

This is the rollback path for the hub import that adds the eighteen Big Idea 3
cards. It is the body from the Admin API, not a scrape of the rendered page: an
earlier extraction started at the wrapper div and lost both the page's own
`<!-- PAGE: -->` header and its stylesheet, which would have imported cleanly
and rendered an unstyled page.

## CSP Command Center, before Big Idea 3 got its page links

`csp-command-center.before-bi3-pagelinks.html` is the stored Body HTML of
`/pages/csp-command-center` as it stood on 2026-08-19, `updatedAt`
2026-08-04T22:42:42Z. Big Ideas 1, 2, 4 and 5 each carried a Lesson page and a
Guided notes link per topic; all eighteen Big Idea 3 topics carried an empty
`pageLinks` array.

Rollback path for the import that fills those eighteen. The page is 132 KB and
most of it is a minified `var DATA` blob, so a hand edit is not recoverable by
eye; this file is.

## CSP Command Center, before the coding practice links

`csp-command-center.before-code-links.html` is the stored body as it stood on
2026-08-20, `updatedAt` 2026-08-19T20:25:32Z: Big Idea 3 carrying 54 page links
(lesson, guided notes, study game) and no link to the coding practice pages,
which existed for sixteen of the eighteen topics and were reachable from
nowhere on the site.

Rollback path for the import that raises Big Idea 3 to 70 links.
