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
- ~~**The Railway deploy from #174 never landed.**~~ **WRONG, and worth
  reading before trusting any deploy claim in this file.** It had landed. I
  set `Cache-Control: public, max-age=86400` on `/figures/*` BEFORE knowing
  the response would succeed, Cloudflare cached the 500, and I then read that
  same cached 500 four separate times over several hours and reported the
  deploy dead each time. Railway's own dashboard said `#182 ACTIVE, deployment
  successful`. Fixed in #183: never cache an error, and probe with a cache
  buster. The general lesson is that a stale edge cache is indistinguishable
  from a dead origin unless you go out of your way to tell them apart.
- **There is still no way to ask the API which commit is live.**
  `/api/health` returns `{status, ts}` and nothing else, so "did that merge
  deploy" is unanswerable from outside, which is what made the above possible.
  Railway injects `RAILWAY_GIT_COMMIT_SHA` into every container; surfacing it
  on the health payload turns that question into one curl. Not done, three
  lines, worth doing.
- **The theme still tracks a feature branch**, not `main`, so every theme
  merge needs a manual fast-forward.
- **`/pages/cyber-class` has no source of truth in git.** The repo mirror
  `shopify/cyber-class.html` is 18KB, already missing the AP Networking
  option AND the cross-link nav bar the live page carries. Pushing the mirror
  would destroy the nav. Two known defects live there: no Intro to Java
  option in the create-class dropdown, and `formatCourse` maps only three
  courses so existing AP Networking classes render the raw slug.
- **13 images still unmade**, down from 143. `scripts/intro-java-figures.js`
  now generates 145 of the 158 the bank references, and all 145 are live on
  the Shopify CDN at 1920x1200. The remaining 13 are category 1 only, the
  ones a mockup would make worse rather than better: 1.1 step-1, all four of
  1.2, 1.3 steps 1 to 3, 1.4 step-1, 1.6 step-3, 3.6 step-2, 3.7 step-3 and
  3.8 step-3. They need real captures of the Greenfoot window and of the Unit
  1 crab scenario, which only Tanner's machine can take.
- **An orphaned duplicate of lesson 6.6 is live and indexable.** The bank's
  spelling was Americanised at some point, and the import created a second
  page rather than renaming the first, so both
  `intro-java-lesson-6-6-bounds-and-neighbours` and
  `...-neighbors` are published. The British one is unlinked (6.5's Next and
  6.7's Prev both point at the American handle) and has no URL redirect, so it
  is an unmaintained copy of a lesson competing with its own canonical. Fix is
  delete plus a 301, awaiting a go-ahead because it deletes a live page.

## A second day, and a pattern in what broke

Two more content bugs landed after the figures did, and both have the same
shape, which is why they are worth writing down together rather than as two
lines in a changelog.

Lesson 1.2 spends a paragraph explaining that Greenfoot has no separate Pause
button, because Run turns into Pause while it is running. Its meta description
promised a tour of "the Act, Run, Pause and Reset buttons".

Lesson 5.1 teaches that a new array's default depends on its type: zeros for
int, false for boolean, null for objects. Its own FAQ answer on the same page
says so. Its meta description said "why every slot starts at zero", and one of
its target keywords is "java array default values".

In both cases the lesson body was right and a RESTATEMENT of the body in the
metadata was wrong. That is the risk `seo.description` carries and nothing
else in the bank does: `lib/intro-java-page.js` emits it twice, once as the
meta tag and once as the `description` of the `LearningResource` JSON-LD. So
it is simultaneously what a search result shows, what a model summarising the
page reads, and in 5.1's case a direct contradiction of the FAQ sitting six
lines below it in the same JSON-LD block.

Every check was green on both. The strings passed the 70 to 160 character
gate, the encoding scan, and all 3607 `smoke:introjava` assertions.

I tried to automate the catch and could not. A sweep for capitalised terms
asserted in metadata but absent from the lesson body returned 27 hits across
42 lessons, and all 27 were Title Case in the SEO title. It is not committed,
because a checker that fires 27 times on nothing will bury the one time it
fires on something.

What DID work was checking the countable claims by hand, since a number is
cheap to verify: 1.1 three ideas, 2.1 four types, 3.5 three numbers in super,
4.6 two jobs the enhanced for cannot do, 5.4 two jobs still needing an index
loop, 5.5 five array algorithms. All six hold against their own recaps.

So the honest conclusion is that this class of defect is found by reading, and
the 42 descriptions have now been read. If a lesson's SEO block is edited, or
a lesson is added, someone has to read the description against the body. There
is no check standing behind it and pretending otherwise would be worse than
the gap.
