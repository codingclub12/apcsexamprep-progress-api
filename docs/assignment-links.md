# Clicking a score back to its assignment

My Progress could always say "CSA 1.4 quiz, 4/6" and never say where that quiz
is, so a student read a number and then went hunting through the course hub.
Every cell now carries the link to the page it was earned on.

## Where the link comes from

`lib/lesson-links.js` answers the inverse of `pageFromHandle`: given
`(course, unit, lesson, activity_type)`, which page? Two sources, in this order.

1. **Learned.** `page_links` records the handle every time `/track` parses one.
   This is ground truth: the page exists, because a student was standing on it.
   It is also the only possible answer for CSA, AP Networking, and Intro to Java,
   whose handles carry a title slug the lesson id does not contain
   (`ap-csa-lesson-1-2-{slug}`). No string building recovers a slug nobody
   stored.

2. **Derived.** CSP lesson ids ARE the handle slug, and the numbered cyber pages
   encode unit and lesson as digits, so those two compute with no row needed.

Every derived handle is round-tripped back through `pageFromHandle` before it is
returned. That keeps the parser the single authority in both directions: a rule
that drifts produces no link instead of a wrong one, and a wrong link is worse
than none, because the student does the wrong work and the grade never moves.

A miss falls back to the unit hub, then the course hub, then nothing. The caller
is told which it got (`url_kind`: `page` | `unit` | `course`) so a hub link can be
labelled as one rather than sold as the assignment. Cyber has no hub fallback on
purpose: no evidence of one in this repo, and a guessed hub is a 404 with a
confident link on it.

## Seeding

`scripts/seed-page-links.js` harvests the authored page handles already in this
repo (318 CSA pages today) so a fresh database links CSA before anyone has
browsed. It scans the seed and content trees for handle-shaped strings and keeps
only the ones `pageFromHandle` parses, so it needs no updating when a new seed
module lands.

It runs on boot and by hand (`npm run seed:pagelinks`), and it is **insert-only**.
A handle harvested from source is an authored guess; a handle a student was
standing on is a fact, and the boot seed runs on every restart, so an upsert
would replace the fact with the guess every time the service came back up.

## The API

`GET /api/student/progress` adds two fields per record:

```json
{ "url": "https://apcsexamprep.com/pages/ap-csa-lesson-1-4-calling-methods-quiz",
  "url_kind": "page" }
```

`url` is null when nothing is known, and the page renders that cell exactly as it
did before: an unclickable link that goes nowhere is worse than no link at all.
One read builds the map for the whole grid, never one query per cell.

Origin comes from `STORE_ORIGIN` (default `https://apcsexamprep.com`).

## PII

A handle is a public URL slug, identical for every student who opens the page.
`page_links` holds no student column and never will.
