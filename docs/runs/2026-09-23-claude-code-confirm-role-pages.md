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
