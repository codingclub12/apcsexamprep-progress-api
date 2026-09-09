# The retry panel now changes what students can do, not just what the page shows

**Board:** 302. Follows 289, where the panel was diagnosed and left alone because
which way to fix it was a decision. Tanner picked the small one: wire it to the
policy the server already has.

## What it was

Four switches, Lesson CFUs, Exercises, Quizzes and Unit tests, tagged
`SAVING SOON`. `bindRetry` wrote them to `state.retryTypes` and called
`renderAll()`. No request, anywhere on the page.

The thing that makes this worse than a dead control is that it was not dead.
`state.retryTypes` feeds `retryOn()`, which feeds the grade the page DISPLAYS.
Turn Quizzes off and every quiz column recomputes on first-attempt instead of
best-attempt, so the numbers move. That is exactly the feedback a working
setting gives. A teacher turns it off, watches the grades change, and their
students go on retaking quizzes.

Its default was `{lesson:true, exercise:true, quiz:true, exam:false}`, which is
not a state the server can hold at all: `retry-policy.js` treats quiz and exam
alike as assessments. The grid was drawn under a policy that does not exist.

## Three, not four

`classes.retry_mode` has three modes and no per-type dimension. Four switches is
sixteen combinations of which the server can hold three, so wiring four toggles
to three modes would refuse the teacher thirteen times out of sixteen. That is a
worse control than the one being replaced, just honest about it.

So the panel is a three-way choice, and every state it can reach is one the
server has. The labels and the blurbs are `retry-policy.js`'s own `MODE_LABELS`
and `MODE_DESCRIPTIONS`, copied verbatim, because two surfaces describing the
same rule in their own words is how they come to describe different rules.

    Everything      redo practice and retake quizzes, best attempt counts
    Practice only   practice redoable, a quiz or exam is one attempt
    Off             one attempt at everything

## What it does now

- reads `retry_mode` off the class row on every load, with the same legacy
  fallback `buildCanonicalGradebook` applies, so the page and the server cannot
  form two opinions
- `PATCH /api/teacher/classes/:code/retry` on a pick, then reloads and redraws
  from the server's answer rather than from the click. A refused save leaves the
  panel showing what is actually in force, which is the whole point
- `SAVING SOON` is gone, and so are the four dead switch ids and the 629 bytes of
  CSS that had nothing left to style

The grid follows for free: `retryTypes` is derived from the mode now, so the
displayed grade is computed under the policy the server enforces.

## What did NOT change

The per-student rows on the By Student tab still do not save, and still say so on
the card. Writing one is a single call; reading it back is not, because the
teacher progress payload carries no `retry_override` field, so a wired toggle
would show "Default" on the next load while an override was live. That is a
payload change and its own piece of work.

## The sheet carries something else, and it should be said out loud

`shopify/cyber-dashboard.html` was already ahead of the live page. Diffing the
live body against the sheet, fifteen hunks: six are this change, four are entity
round-trip noise (the repo writes `&ndash;` and `&#9662;` where the live body
holds the decoded characters, and Shopify decodes them again on import), and
**three are board 260's unenforceable-lock disclosure**, which adds a warning
glyph beside the padlock and moves the reason into `aria-label`. Measured: the
glyph is absent from the live body and present in the repo.

That is finished work from 2026-09-07 whose own run note says the sheet needed a
human to import it, and nobody did. Importing this sheet ships it. Stripping it
back out by hand to keep this change pure would be the worse choice, so it rides
along, named here and in the gate manifest rather than discovered later.

## Evidence

- `smoke:tchdashpage` 72 of 72, up from 50. Section 11 is new and it compares
  the page's mapping against `retry-policy.js` ITSELF across all twelve
  mode-and-type combinations, rather than against a second copy of the rule
  written by the same hand that wrote the first.
- `smoke:retrymodes` 64 of 64. That is what proves the endpoint the panel now
  calls accepts what it sends; the page suite stubs fetch, so on its own it would
  only prove the page is internally consistent.
- `smoke:dashassign` 39 of 39, `smoke:dashassignmutation` 67 of 67: the padlocks
  beside the panel are undisturbed.
- `deploy-gates/2026-09-09-retry-panel-wired.json` passes `--pre`: three suites
  and four mutations, each mutation tripping its own assertion, including the
  reported bug itself (the panel stops saving and only moves the numbers) and the
  subtle one (it paints the click instead of re-reading the class).
- Sheet parsed back: 110005 bytes, md5 `387470fe4e1a2a1ff61b50d3d25ac264` on both
  sides, byte identical to the page file. Preflight clear to import.

## Two things the tooling caught that I would have shipped

**The generator refused the first sheet.** Its loss guard noticed the import
would delete four element ids the live page has and the repo file does not, and
named all four: `rt-lesson`, `rt-ex`, `rt-quiz`, `rt-exam`. They were exactly the
switches I meant to remove, so `--accept-loss` is the right answer, but the guard
is asking the correct question and I would rather it asked than not.

**My own diff was lying to me.** I wrote a character scan to enumerate what the
import changes, and on an INSERTION it re-finds the same offset over and over: it
reported eight change runs that were all the same CSS rule. A line-aligned diff
reported fifteen real hunks, three of which were the board 260 work I would
otherwise have shipped without noticing. Use an alignment, not a scan.

## Still open

- **The sheet needs a human to import it.** One page, `cyber-dashboard`,
  `matrixify/cyber-dashboard-retry-panel-pages.csv`. Until it lands the live
  panel is still the mock, and the gate's live check is deferred until then.
- **Existing classes are not migrated and should not be.** Michelle's is on
  `all`, which is why her students retake quizzes. The panel lets her change it
  in one click now; changing it for her would be regrading her class mid-course.
- **`smoke:tchdashpage` printed no failure count** until this branch, so
  `gate-suite-floor.js` could not read a verdict off a green suite and refused
  it. It prints the standard `N passed, M failed` now, which is what every other
  suite here does and what that script documents.
- I cannot verify my own work. 302 goes to `needs_verification`, and the check is
  a teacher's: pick a mode, reload the page, and see it still say what you picked.
