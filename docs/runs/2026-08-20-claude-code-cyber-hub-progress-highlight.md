# 2026-08-20 claude code: cyber course hub progress highlight (Unit 1 pilot)

## The ask

Tanner shared screenshots of the AP Cybersecurity course hub (the accordion
listing Unit 1 -> Topic 1.1 -> Lesson/Ex1/Ex2/Lab/Quiz) and asked for the
same yellow-started/green-complete idea from the earlier session-bar work,
applied to that accordion, noting he didn't know where the colors were
coming from.

## What existed before this

- The accordion's row colors (the always-amber quiz row) are static,
  item-type-only CSS on `/pages/ap-cybersecurity-complete-course-guide`.
  Nothing on that page read student progress; `apcs-tracker.js` was never
  loaded there.
- `snippets/quiz-tracker-wiring.liquid` (theme repo) is the actual source
  of truth for how `window.APCS_PAGE` gets set on lesson/exercise/quiz
  pages, derived from the page handle. This is what let me confirm the
  exact `(course, unit, lesson, activity_type)` keys to match against.

## What shipped

- Theme repo: `assets/apcs-hub-progress.js` (`codingclub12/APCSExamPrep-theme#61`,
  merged), a new asset that colors each `.exercise-row` amber once a
  signed-in student has started it and green once it's complete or the
  quiz is submitted, reusing `/api/student/progress` and
  `/api/student/quiz/status`. Piloted on Unit 1 only.
- Deliberately shipped as an asset file, not inlined into the live page
  body, specifically so the live-page edit would be a single
  `<script src>` line instead of a multi-KB inline block on an
  un-versioned Shopify Page.
- The live page body (`ap-cybersecurity-complete-course-guide`) now carries
  that one `<script src>` line, added via `pageUpdate`.

## Incident during this session (own up to this)

While publishing the single script-tag line, I drafted the `pageUpdate`
mutation call twice with literal placeholder text
(`"PLACEHOLDER_WILL_NOT_BE_SENT"`, then `"RESTORE_IN_PROGRESS_DO_NOT_USE_THIS_CALL"`)
as a way of testing the call shape, and both times actually executed the
call instead of stopping to fill in the real content first. Each one
briefly replaced the entire live page body with that placeholder string.

Real-world exposure: roughly 6 minutes, 2026-08-20T22:35:35Z to
2026-08-20T22:41:39Z, during which any visitor to
`/pages/ap-cybersecurity-complete-course-guide` would have seen a broken
page (just the header comment plus the placeholder text, no CSS, no unit
list). Caught by immediately re-fetching and diffing against a locally
reconstructed trusted copy after every publish, per the page-snapshots
convention. The real content was republished on the third attempt.

What was learned: never draft a mutation call against a live,
no-rollback resource with placeholder content as a way of checking the
call shape. Validate structure with `validate_graphql_codeblocks`
(read-only, this repo's existing tool for exactly this) instead of a live
`graphql_mutation` call, and only ever call `graphql_mutation` once the
real payload is fully assembled.

A byte-diff against the reconstructed body after the real publish also
caught one unintended change: I'd added a stray
`-webkit-text-fill-color:#1E1B4B` to one `<div>` (the "AP Computer
Science Principles Hub" card) that wasn't in the original. Harmless and
arguably compliant with this repo's own "always pair color with
-webkit-text-fill-color" rule, but not something I meant to add, so I
corrected it with a scripted string replace (not manual retyping) rather
than leave an unrequested change in place.

## Verified

```
$ diff <trusted local reconstruction> <live page body after final publish>
# identical except a harmless trailing-newline difference
$ curl -s -o /dev/null -w "%{http_code}" https://www.apcsexamprep.com/pages/ap-cybersecurity-complete-course-guide
200
$ curl -s .../apcs-hub-progress.js -o /dev/null -w "%{http_code}"
200
```
Confirmed against Shopify directly (Admin API `page.body` re-fetch and a
plain HTTPS GET of the rendered page and the new asset), not just a
merged PR.

## Still open

- Not yet verified in an actual browser as a signed-in student: the
  amber/green row coloring logic has been code-reviewed and diffed but
  never watched render against real `/api/student/progress` data. Needs
  a human `apcs verify` pass, same as the session-bar work from
  2026-08-19.
- Only Unit 1 is wired. Units 2-5 need the same treatment once Unit 1
  is confirmed working live; the row-matching logic in
  `apcs-hub-progress.js` already generalizes, so that's removing the
  `pilotUnit` restriction, not new logic.
- Before/after snapshots for this page body live in
  `shopify/page-snapshots/ap-cybersecurity-complete-course-guide.{before,after}-progress-highlight.html`.
  The "before" one predates an unrelated Terminal Lab row another session
  added to Topic 1.2 mid-session; the "after" one is the true live state
  post-publish, confirmed by direct re-fetch.
