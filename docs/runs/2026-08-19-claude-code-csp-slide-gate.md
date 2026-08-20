# 2026-08-19 claude code: AP CSP Teacher Bundle slide gate

## What was asked

Free overview slides for every Teacher Bundle topic, and a real lock on the
by-day decks so only paying teachers and their students reach them.

## What was actually wrong

Worth stating plainly, because the ask sounded like a feature and the finding
was a leak. `/pages/ap-csp-teacher-resources` is titled Premium and was writing
all **224** deck URLs straight into its own body: every topic, every day, both
tracks, and both the Student and the TEACHER variant. Anyone who opened the
page had the paid decks, as did anyone who viewed source or crawled it. The
"Teacher only" heading was a label, not a control.

The lesson pages, meanwhile, had never carried a slides section at all, which
is why the first delivery looked invisible to the person who asked for it.

## The shape of the fix

Hiding anchors client side would not have been a fix: the URL is already in the
response the server sent. So the problem was split.

1. **The page stops carrying deck URLs.** `content/csp-teacher-slides-gate/build.py`
   in the theme repo strips all 224 anchors and leaves one container per topic.
2. **A server that checks entitlement hands them out.** `GET /api/slides/:course/:lessonId`
   here returns the day/track/variant overview to everyone, and real URLs only
   to a caller holding an active entitlement. An entitled teacher gets both
   variants; an entitled student gets Student decks only, never the teacher
   decks. Fails closed on any error, which is the opposite of
   `apcs-entitlement.liquid` and deliberately so: that one fails OPEN to ads.
3. **`assets/apcs-slides-gate.js` renders it.** The free overview is drawn from
   data attributes with no network call. The API is asked only on a click, which
   keeps 35 containers from firing 35 requests per page view.

## Files

- `config/csp-slide-manifest.js`, `routes/slides.js`, `smoke/csp-slide-gate.js` (this repo, PR #213)
- theme: `assets/apcs-slides-gate.js`, `layout/theme.liquid`, `content/csp-teacher-slides-gate/` (PRs #57, #59)

## Verified

- 26 offline assertions (`npm run smoke:cspslides`), plus 26 browser assertions
  driving the real live page with the real minified asset, plus 24 driving real
  lesson pages. Covers the overview, the locked state, an entitled teacher, an
  entitled student, a hostile response, a server error, and token precedence.
- `build.py` refuses to write unless every check passes: 224 anchors removed,
  35 containers added, 556 docx preserved, no `.pptx` string survives, ASCII only.
- The manifest's 35 lessons and their day counts were checked lesson by lesson
  against the live Shopify file library, and the 35 lesson-page handles against
  `COURSES['ap-csp']`. Both agree exactly.
- Live: 0 of 12 fetches serve the old ungated body, 12 of 12 lesson pages carry
  the gate.

## Learned

**`main` is not this store's deploy branch.** PR #56 merged to `main` and
changed nothing on the site. The published theme is named
`APCSExamPrep-theme/claude/site-linking-audit-yh...`, and its `layout/theme.liquid`
is a byte-exact match for that branch (124,724) against `main`'s 138,760. Shopify
serves the GitHub-connected branch, which is `claude/site-linking-audit-yhufjk`.
Anything merged to `main` in the theme repo has not been reaching production.
Worth a deliberate migration; not a side effect of a feature PR.

**Shopify's page cache flaps for tens of minutes after a body import.** Six
minutes after the import, 5 of 12 requests still served the pre-import page
with all 224 URLs; at 38 minutes it was 6 of 12, from different `servedBy`
nodes. It cleared on its own by ~2 hours. A single fetch after an import proves
nothing; sample a dozen.

**A lesson page states its own identity.** The `.lesson-page` wrapper already
carries `data-course`, `data-unit` and the lesson slug, so the component mounts
itself and the 35-page rollout needed no content import at all. Check for an
existing wrapper before planning a bulk page edit.

## Still open

- **The 556 `.docx` files are still ungated**, including 222 `_KEY_` links.
  `AP-CSP_1-1_Quiz_KEY_k7q2m9.docx` returns HTTP 200 to anyone. Gating decks
  while answer keys stay public is a partial fix, and the keys are arguably the
  more sensitive half. Raised three times, no decision yet.
- **Old deck URLs still resolve.** Removing a link does not unpublish a Shopify
  file; `AP-CSP_1-1_Day1_Deck_TEACHER_CB_k7q2m9.pptx` still returns 200.
  Revoking them means re-uploading under new names and updating the manifest.
- **Google Slides migration is queued.** The plan is to convert the 224 pptx to
  Slides and embed them inline, gated the same way. Claude cannot run that
  conversion: the Drive connector's `share_file` takes only an email address and
  a reader/writer role, so the `anyone` permission type is unreachable (tested:
  `share_file(emailAddress:"anyone")` returns "Request contains an invalid
  argument" and leaves permissions unchanged), and uploads travel as base64
  inside tool calls, which for 72.4 MB of decks is ~25M tokens. An Apps Script
  was handed over instead; it writes an `AP CSP Slides Map` sheet that Claude can
  read back from Drive directly.
- **Only AP CSP.** No other course has by-day decks in Shopify yet.
