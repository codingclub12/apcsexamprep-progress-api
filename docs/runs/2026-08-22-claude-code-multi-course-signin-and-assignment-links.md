# Multi-course sign-in, and clicking a score back to its assignment

Task #107. Branch `claude/multi-course-signin-navigation-ypmjzk`.

## What was asked

Two things, from Tanner:

1. Students should be able to sign in to multiple courses with the same account,
   same name and PIN. If they sign up for one that is already taken, ask them for
   a new PIN or name so there is no sign-in confusion.
2. A signed-in student should be able to click an assignment, or the place their
   score sits, and land on that assignment.

## What changed

### One account across courses

`students` is per class and stays that way. `student_accounts` is the identity
above it, keyed on (name, PIN), with `students.account_id` pointing up. Full
model and reasoning in `docs/student-accounts.md`.

- `POST /join` refuses a name+PIN pair that already answers to an account
  (`409 name_pin_taken`), asking for a different name or PIN, and offers the
  signed-in route instead. It names nothing about the other account.
- `POST /login` links the row to its account at the moment the PIN is verified,
  and returns the whole enrollment list.
- `GET /enrollments`, `POST /switch`, `POST /enroll` are new.
- `/solo-init` and `/solo-login` follow the same rules; a solo class is one more
  class the identity reaches.
- `shopify/my-progress.html` gets a course switcher (hidden when there is only
  one course) and an "Add a class" control. `shopify/join.html` turns the
  refusal into "Already have an account? Sign in and we will add this class for
  you", and adds the class after the sign-in succeeds.

**The tension, and how it was resolved.** Rules 1 and 2 pull against each other:
if the same name and PIN always signs you in, then joining with a taken name and
PIN should just work, and the "pick a new PIN" prompt never fires. `/join` cannot
tell "the same kid adding a course" from "a different kid who picked the same
four digits", and quietly merging the second case puts two students in one
gradebook with no error anywhere. So the tie goes to refusing, and the same-kid
case gets the one-click door (`/enroll`) instead of a guess.

### Clicking a score back to its page

`lib/lesson-links.js` inverts `pageFromHandle`. Learned handles (recorded by
`/track`, which already receives them) beat derived ones; derived handles are
round-tripped through the parser before being trusted; a miss falls back to the
unit hub and says so. `GET /api/student/progress` now returns `url` and
`url_kind` per row, and My Progress wraps each cell and each lesson name in the
link. Details in `docs/assignment-links.md`.

`scripts/seed-page-links.js` harvests the 318 authored CSA page handles already
in this repo, insert-only, on boot and by hand. CSA is the course that needs it:
its handles carry a title slug the lesson id does not hold.

## Evidence

- `npm run smoke:accounts` (new, `smoke/student-accounts.js`): 35 assertions,
  all passing. It covers the two silent failure modes on purpose: merging two
  different students who share a name and PIN, and minting a token for a class
  the caller is not in.
- `npm run smoke:myprogress`: 25 passing, after updating its cell-text extractor.
  It read the first `>...<` out of the rendered cell, which is now the gap
  between the anchor and the span. Added an assertion that the cell IS linked.
- `npm run smoke:classroom`: 40 passing, after rewriting section 3. It modelled
  one student in three courses by joining three times with the same name and PIN,
  which is exactly the ambiguity now refused; it uses `/enroll` for the second
  and third, which is the flow a real classroom now takes.
- Full offline suite run: see the PR checks.

## What is still open

- ~~**The Shopify pages are not deployed by this PR.**~~ RESOLVED 2026-08-22,
  see the addendum at the end of this note. `shopify/my-progress.html`
  and `shopify/join.html` are canonical here, but the live storefront copies ship
  separately, and the auth smoke suite already notes the deployed
  `/pages/my-progress` has drifted from this repo. The API half works the moment
  it deploys; the switcher and the clickable cells do not appear to students
  until those two pages are pushed.
- **Link coverage outside CSA and the derivable courses.** AP Networking and
  Intro to Java have no derivable handle form and no seeded handles, so their
  cells link to nothing until a student visits the page and `/track` learns it.
  Adding their authored handles to the harvest is a small follow-up.
- **`GET /api/student/attempts`** (the CSA per-item grid) does not carry links
  yet. Only `/progress` does. Worth doing when the CSA per-item grid becomes the
  primary student view.
- The dashboard-side teacher view is untouched.

## What was learned

`pageFromHandle` was written as a one-way parser and is now load-bearing in both
directions. Round-tripping every derived handle through it (rather than writing a
second builder) means the two can never disagree: a drifted rule loses the link
instead of pointing at the wrong lesson.

---

## Addendum, 2026-08-22: it shipped, and what the last mile cost

Both pages are live and verified byte-exact. Students now get the course
switcher, the clickable scores, and the sign-in-and-add-a-class flow.

Getting there took three tries at a delivery mechanism, and the failures are
the useful part:

1. **No admin token.** The one Shopify variable in Railway returns 401 against
   the Admin API; by elimination it is the webhook secret, not an admin token.
   `npm run publish:studentpages` is written, tested as far as it can be without
   a credential, and unused.
2. **The connector cannot write.** Page writes through the Shopify MCP are
   denied here, including a no-op title write. Read-only in practice.
3. **Matrixify.** The path that worked, and the one CLAUDE.md already named. It
   needs no write access at all: the repo builds a CSV, a human imports it.

The mechanism existed already (`scripts/page-body-csv.js`) but `join` was never
registered in it, so there had never been a way to ship that page.

### The defect that shipped, and why nothing caught it

Shopify decodes HTML entities in the body it stores, including inside `<script>`.
The join page's escape table went in as entity literals and came out as an
identity map: `esc()` returned its input unchanged, on a page that writes student
and class names into `innerHTML`.

It is invisible in the repo, in the sheet, and in review. It exists only after
the round trip. `my-progress.html` was immune because its `esc()` builds
entities from parts, which is clearly scar tissue from someone hitting this
before; that knowledge lived in the shape of the code and nowhere else, so it
did not transfer. It is written down now: `docs/shopify-page-imports.md`.

Worse than the bug: the check that should have caught it was structurally
incapable of it. `renderable()` knew only two named entities, so `join.html`
(shipping a `&rarr;`) could never compare equal to its live copy. It would have
reported "needs import" forever. **A check that always says differs is the same
as no check**, and it was the check being quoted as evidence the pages were safe.

### What was learned

- **Verify the round trip, not the artefact.** A byte-exact CSV proves the file
  is right, not that the store holds it. The verification that mattered read the
  body back out of the rendered page and compared. Do that every time, including
  when the import "obviously" worked, because that is the case that shipped a
  broken escaper.
- **A credential you lack is not always a blocker.** Reading the live body needs
  no token at all (`scripts/live-pages-dump.js` plus `extract-live-body.js`),
  which is what made an unverifiable publish verifiable.
- **Ask what a passing check would look like if it were broken.** Both defects
  here were checks that could only ever return one answer.

