# 2026-08-17, Claude Code: anonymous grading, and the first fifteen figures

Two shipped changes and one finding that outranks both.

## The finding: this repo is public

`codingclub12/apcsexamprep-progress-api` has `visibility: public`. Noticed
while looking for a way to hand fifteen PNGs to Shopify without uploading
them by hand, because a public repo makes `raw.githubusercontent.com` URLs
fetchable, which is exactly what made that step easy.

The same fact makes `seed/intro-java-banks.js` and `lib/gap-grader.js`
readable by anyone. Those hold every answer key in the course.

This matters more than it looks. The whole design of intro-java is that the
page ships no key and only the server can grade, and that property is
enforced by a smoke suite that greps every rendered page to prove the answers
never arrive in the browser. Those tests still pass. They are also no longer
worth much, because the thing they protect is on github.com. Either make the
repo private or move the banks into a private module; the tests cannot tell
the difference and will keep reporting green either way.

Not actioned here: it is an account-level decision, not a code change.

## Anonymous grading (PR #169, merged, verified live)

A free course could not be tried before it was joined. Signed out, the
reporter graded nothing and told the student to sign in, because intro-java
pages ship no answer key and only the server can score them.

`POST /api/progress/anon/choice` and `/anon/gap` grade the same way the
signed-in routes do and store nothing: no attempts row, no session row, no
wire-log entry, no PostHog event, not a counter. The rate limiter holds an IP
for at most one window and never writes it down.

`lib/anon-receipt.js` signs what the server graded, HMAC keyed off
JWT_SECRET but deliberately not equal to it, so a receipt can never be used
as a session. `POST /api/progress/import` verifies that signature and writes
real attempts rows with `source = 'imported'`.

The policy call worth remembering: a receipt proves the server graded that
item at that score. It does NOT prove it was a first try, since a signed-out
student can grade an item repeatedly and keep the receipt they liked. So an
import is exactly as strong as an unlimited retry, and may only land where
unlimited retries are already the policy. Under the default class mode
('practice') that means concept checks import and quizzes do not, and the
student is told both halves. Solo (ME-) accounts are 'all', so the
acquisition path works without overriding any teacher's setting.

A caching idea was raised and declined in part: the device-local cache was
built, the illusion was not. The note reads "Saved on this device. Make a
free account to keep it anywhere." Making cached marks SEEM permanent would
have been the same defect class as the two false reporter messages fixed the
same day, and it is the weaker product besides.

Evidence: `smoke:anongrade` 57 passed. Verified against production, not a
report: `/anon/choice` returned `graded:true, stored:false` with a receipt,
`ap-csa` was refused 403, `/import` without a session 401.

## Fifteen figures (PR #174, merged; import landed 14:52 UTC)

The bank references 158 images and none had been taken. Treating them as one
job is why none of them shipped. They are three jobs:

1. The Greenfoot window, its menus and a running scenario. Real captures.
   A mockup is WORSE than the "On your screen:" fallback, because the job of
   that image is "this is what your screen looks like".
2. Pictures of code. Not worth making at all: `lib/intro-java-page.js`
   already prints `s.code` as a `<pre>` directly beneath the image. The same
   argument removed the caption from inside the figures, since the step note
   is already printed under them.
3. Relationships: an array as boxes, a grid and its indexes, the visiting
   order of a nested loop, row/col becoming y/x. Nothing on the page carries
   these. That is what `scripts/intro-java-figures.js` draws.

Fifteen of category 3 now exist, drawn as HTML and rasterised with the
Chromium in the agent environment at 960x600 and 2x.

Two content bugs surfaced by drawing them, neither visible in prose:

- The grid-to-world figure marked a cell ON THE DIAGONAL, where both index
  orders produce the same pair of numbers. It would have quietly taught that
  the swap does not matter, in the lesson whose entire point is that it does.
- The transposed-grid figure now draws the rows that do not exist, dashed,
  rather than describing them.

## What is still open

- **Rotate the RapidAPI key.** Served publicly from Shopify's CDN for ten
  days. Deleting the file did not un-leak it.
- **The Railway deploy from #174 never landed.** `/api/health` returns 200
  but `/figures/*.png` still 404s more than twenty minutes after the merge,
  and the route works locally. Did not block the figures, which reached
  Shopify by raw GitHub URL instead, but it means merges are not reliably
  deploying and the last few may not be live.
- **The theme still tracks a feature branch**, not `main`, so every theme
  merge needs a manual fast-forward.
- **`/pages/cyber-class` has no source of truth in git.** The repo mirror
  `shopify/cyber-class.html` is 18KB, already missing the AP Networking
  option AND the cross-link nav bar the live page carries. Pushing the mirror
  would destroy the nav. Two known defects live there: no Intro to Java
  option in the create-class dropdown, and `formatCourse` maps only three
  courses so existing AP Networking classes render the raw slug.
- **143 images still unmade**, all category 1 and 2 above. The nine base
  captures that would unlock most of them are listed in the chat log; the
  figure generator is built to composite against them.
