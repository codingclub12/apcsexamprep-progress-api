# 2026-08-14 - hazard coverage patch (Phase 0.1)

Agent: Claude Code. Branch: `claude/github-oauth-connect-vaw0hu`. PR only, nothing merged.

## What changed

`lib/command-hazards.js` stops being a chain of `if` gates and becomes a table with a
total function over courses. `smoke/hazard-coverage.js` is new, 105 assertions, offline.

1. **Content coverage is table-driven and total.** `CONTENT_COVERAGE` carries one row per
   course, each with exactly one disposition: `block`, `pending`, `exempt`, or `fanout`.
   The old gate was `course === 'csa' || course === 'all'`, so cyber and networking
   compiled with an empty hazard array. Now a course with no rulebook compiles a STOP
   block that names what is missing and forbids filling it from memory. A course that is
   not in the table at all compiles a louder STOP. A content task with no course set
   compiles a STOP. Nothing about content is silent any more.

2. **`SHOPIFY_THEME` gained the three rules that were only in the theme repo**, all three
   bought with production bugs: `element.textContent` rather than interpolation into
   `innerHTML` (the live XSS), no CSS `transform` on an ancestor of a `position: fixed`
   element (the collapsed overlay), and theme files stay pure ASCII.

3. **The entity contradiction is resolved.** The block still says "HTML entities only",
   which is what the storefront needs, and now also says the rule inverts inside a
   `<script>` block, which is what `CONVENTIONS.md` says. A session writing a script tag
   was previously following the hazard straight into the bug the convention exists to
   prevent.

4. **`MATRIXIFY` is a new block on `surface: shopify`.** MERGE not REPLACE, QUOTE_ALL,
   past-dated `Published At`, empty `Body HTML` wipes the page body. These rules lived only
   in the theme repo's `CLAUDE.md`, and Matrixify work routes to chat, which is not in a
   repo. Until now they reached zero prompts.

5. **MCQ signals split into strong and weak.** Strong language (distractors, question bank,
   multiple-choice, item writing) fires on any surface. The bare acronym is a weak signal,
   suppressed only when it is followed by a product noun on a surface that sells rather
   than authors. Task 70 is the "Spring 2026 MCQ Bootcamp", a storefront page, and it was
   picking up six lines of distractor-writing rules. Bare `MCQ` on a content surface still
   fires: a false negative is the expensive direction.

## Evidence

```
npm run smoke:hazards     105 passed, 0 failed
npm run smoke:command      58 passed, 0 failed   (unchanged, not edited)
npm run smoke:checks       25 passed, 0 failed
```

Offline compile of a task-70-shaped row through the real `compilePrompt`:

```
PRESENT "element.textContent"        PRESENT "MERGE"
PRESENT "innerHTML"                  PRESENT "QUOTE_ALL"
PRESENT "position: fixed"            PRESENT "Published At"
PRESENT "pure ASCII"                 PRESENT "WIPES"
PRESENT "NEVER an HTML entity inside"
MCQ block injected on this product-name task: false
```

`hazardsFor({surface:'content', course:'cyber'})` returns 1 block, titled
`AP Cybersecurity content - NO RULEBOOK YET`. It was 0 before this change.

The live check named in the brief, `GET /api/command/task/70/prompt`, was NOT run: this
session has no `TODO_KEY`. The offline compile above exercises the same
`compilePrompt` path with a task-70-shaped row and is the evidence offered in its place.
Worth re-running against production after deploy.

## What this does NOT do, and why

- **No AP Networking rules.** It is shipped and unguarded, and it is `pending`, not
  `exempt`, so a content task on it now stops instead of proceeding blind. Inventing the
  rules would inject invented curriculum verbatim into every future prompt, which is worse
  than the empty block it replaces. Open question 1.
- **No AP Cybersecurity rules.** Same posture, same reason. Nothing in the brief describes
  the cyber rulebook, so there was nothing to encode.
- **`CONTENT_CSP` is a flagged draft.** Written from the CED, not from practice. Five Big
  Ideas, and the pseudocode notation gotchas: 1-indexed lists against Java's 0-indexed
  arrays, MOD not `%`, left-arrow assignment, DISPLAY / INPUT / PROCEDURE, RANDOM inclusive
  at both ends. The injected title says `DRAFT, unreviewed` and the body's first line
  repeats it. Open question 2.
- **Greenfoot stays exempt**, with the reason written into the table where it can be
  argued with rather than assumed. Open question 3.
- **The Matrixify and theme wording is a faithful restatement, not a copy.** The theme repo
  is not in this session's GitHub scope, so the canonical text in
  `APCSExamPrep-theme/CLAUDE.md` could not be read. Reconcile the wording against that file
  before this is treated as verbatim.

## Surfaced by the new suite

`surface: klaviyo` has no hazard block at all. It is on the explicit no-block list with a
reason, next to `drive` and `ops`, but it is the one of the three that plausibly has real
constraints (list hygiene, deliverability, template rules). Worth a decision.

## Open items for Tanner

1. AP Networking rules. Source-of-truth document, superseded documents, lesson titles that
   get gotten wrong, notation conventions, anything that has bitten.
2. AP Cybersecurity rules. Same list. Largest active track.
3. Review `CONTENT_CSP` and drop the DRAFT flag, or correct it.
4. Confirm Greenfoot is correctly exempt.
5. Decide whether klaviyo needs a block.
6. Reconcile Matrixify and theme wording against the theme repo.
