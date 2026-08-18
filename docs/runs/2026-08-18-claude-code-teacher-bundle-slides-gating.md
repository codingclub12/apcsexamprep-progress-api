# 2026-08-18 claude code: Teacher Bundle slides gate (AP CSP)

## The ask

Tanner asked directly in session (no board task filed) for two things on
every Teacher Bundle "by day" lesson: a free overview, and a locked gate on
the real slide decks. Scoped down in conversation to: API-side gate only (no
new slide content authored), AP CSP only (the only course with by-day decks
today).

## What existed before this

- `lib/entitlements.js` / `routes/gate.js` already answer "does this
  teacher/student hold a paid seat for this course", generically, for any
  course.
- The real "Teacher Bundle Slides" are `.pptx` files sitting on Shopify's
  CDN, named `AP-CSP_<lessonId>_Day<N>_Deck_<TEACHER|Student>_<CB|DeepDive>_
  <token>.pptx`. Confirmed by reading the live Shopify file library (not
  guessed): every one of the 35 AP CSP lessons (Big Ideas 1-5) has at least a
  Day1 deck in all 4 variant/track combinations, some have Day2.
- Those CDN URLs are public today. Nothing server-side ever checked
  entitlement before a real link could reach a page; whatever links to them
  today links to the real thing outright. A client-side show/hide of a URL
  that already shipped in the page HTML would not be a real gate.

## What shipped

- `config/csp-slide-manifest.js`: the day-count-per-lesson manifest (all 35
  lessons, read from Shopify Files on 2026-08-18) plus a deterministic
  filename/URL builder. Same "one place to edit" convention as
  `config/shopify-skus.js`, not a live Shopify query on every page view.
- `routes/slides.js`: `GET /api/slides/:course/:lessonId`, role-agnostic
  (same verify-then-branch-on-role-claim pattern as `routes/gate.js`).
  Always returns the free overview (day count, available tracks/variants,
  `locked` flag). Real deck URLs appear in the response ONLY when the caller
  is entitled:
  - Entitled teacher -> every deck, both TEACHER and Student variants.
  - Entitled student -> Student-variant decks only, never TEACHER (answer
    keys / teaching notes stay teacher-only even for a paid class).
  - Anonymous, unauthenticated, wrong course, or unentitled -> `decks: null`,
    nothing that looks like a CDN URL anywhere in the response.
  Only `ap-csp` is wired; any other course 404s honestly instead of
  pretending to have content.
- `smoke/csp-slide-gate.js` (`npm run smoke:cspslides`), picked up
  automatically by the offline-smoke CI job (suite list is derived from
  `package.json`, no workflow edit needed). 26 assertions: 404 behavior,
  free-overview shape and non-leakage (scans the raw response text for the
  CDN host, not just the `decks` field), full teacher unlock, student-variant
  filtering, and day-count correctness for both a 1-day and a 2-day lesson.

## Verified

```
$ npm run smoke:cspslides
  26 passed, 0 failed
```

Full server boot with the new route mounted: no crash, no tracked file
touched (confirmed with `git status` before/after).

## Still open

- Only AP CSP has by-day decks in Shopify today. CSA, Cybersecurity, and
  Networking have no by-day deck files yet, so `SUPPORTED_COURSES` in
  `routes/slides.js` deliberately only lists `ap-csp`. Adding a course later
  is: seed its manifest module, add it to `SUPPORTED_COURSES`.
- This route is API-only. Wiring the actual lesson pages in the theme repo to
  call it (and render the overview vs. the real download links) is a
  separate, theme-repo change; out of scope for this session by the same
  boundary CLAUDE.md already draws around Shopify page-body work.
- The manifest is a hand-read snapshot, not a live query. If the Shopify file
  library changes (a lesson's deck re-uploaded under a new token, a lesson
  gains a day), `config/csp-slide-manifest.js` needs a matching edit. Nothing
  here checks that it stays in sync with Shopify; that is the same tradeoff
  `config/shopify-skus.js` already makes.
