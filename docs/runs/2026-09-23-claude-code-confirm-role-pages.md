# 2026-09-23, Claude Code: the teacher and parent buttons in the Re-Ask email 404

Board #398. Reported by a teacher replying to "Quick question: which AP CS
class are you in?": the "I'm a teacher" button opens a 404.

## What was wrong

The live Klaviyo flow "No Course Selected - Re-Ask" (Y3ViBm, live since
2026-07-09) sends two emails (templates XqUfYJ and SA2pJw). Each has four
buttons pointing at `/pages/confirm-csa`, `confirm-csp`, `confirm-teacher` and
`confirm-parent`. Shopify has `confirm-csa`, `confirm-csp` and `confirm-both`.
The teacher and parent pages were never created.

The flow's routing is fine. Its conditional splits test the Clicked Email event
(metric Vsa5C2) for those exact URLs, and that event records the link as
written in the email, without the www redirect. So a teacher who clicks is
still added to the Teachers list. They just land on a 404.

## Evidence

- Live, 2026-09-23: `confirm-teacher` and `confirm-parent` answer 404 after the
  redirect to www; `confirm-csa` and `confirm-csp` answer 200.
- Shopify Admin `pages(query:"handle:confirm*")`: three pages, no teacher or parent.
- Klaviyo Clicked Email, 2026-07-09 to now, by URL: confirm-teacher 3 people,
  8 clicks, all in September; confirm-parent none; confirm-csa 7 people over
  three months; confirm-csp 1.

## What changed

- `shopify/confirm-teacher.html`, `shopify/confirm-parent.html`: the bodies.
  No script (the old confirm pages carry a `_learnq` identify with a literal
  placeholder email, which does nothing useful), inline styles only.
- `scripts/build-confirm-role-pages-sheet.js` writes
  `imports/2026-09-23f/confirm-role-pages.csv` and refuses an existing handle,
  a broken link, non-ASCII, an em-dash, a script or a style block.
- `smoke/confirm-role-pages.js` (`npm run smoke:confirmrole`) breaks each rule
  alone and tampers with the file to prove the parse-back catches it.
- `scripts/verify-confirm-role-pages-live.js` is the post-import check. It fails
  today on both pages.

## Open

- The sheet is not imported.
- The Teachers list flow ("Added to Teacher List", WGDekt) is a draft, and
  there is no parent flow at all. So after this click a teacher or parent is
  put on a list that sends nothing. The pages deliberately promise no emails
  for that reason.

## Follow-up, same day: better copy, and the teacher flow (board #401)

Tanner imported the creation sheet; `verify-confirm-role-pages-live.js` came
back all clear. He then asked for warmer page copy and for the teacher email
flow to be built.

- `shopify/confirm-teacher.html` and `confirm-parent.html` rewritten. The builder
  has `--update` now: it refuses unless both pages serve and their live text
  matches the last committed source, so it cannot overwrite an admin edit.
  Sheet: `imports/2026-09-23g/confirm-role-pages-copy.csv`. The live verifier
  compares live text to the source and fails until that sheet is imported.
- `scripts/build-teacher-flow-emails.js` writes the four emails for the draft
  flow WGDekt into `klaviyo/teacher-flow/`; `smoke:teacherflow` breaks each
  refusal alone. All 12 site links answered 200 at build time.
- The February draft was stale: Emails 1 and 2 linked to `/blogs/...` pages
  that 404, Email 3 sent teachers to TPT, and Email 4 pitched tutoring with
  prices (board #76 is open on tutoring). None mentioned the teacher dashboard.
- Klaviyo's API refused to update the flow's own templates (404 on all four)
  and has no flow-edit endpoint. The emails are saved as templates
  Umu2p3, Uq6gzU, UsGwLM and YaMNk2; `klaviyo/teacher-flow/README.md` is the
  five-minute swap in the flow editor. The February templates are unchanged.

Still open:
- The copy sheet is not imported.
- The flow is still a draft until the swap and the Live switch are done.
- The AP Cybersecurity bundle page still says founding pricing ends
  September 1, 2026. Pricing is Tanner's, so the emails quote no price.

Learned: a list-triggered Klaviyo flow's message templates are readable by id
through the templates API but not writable, so "update the flow's email" from
an agent means "make a saved template and hand over the swap".
