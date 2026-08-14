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

---

# Addendum: reconciliation with the canonical zips

The three zips arrived after the first pass. All three were audited; the hazard
patch was reconciled and landed, the other two were tested but not landed (they
are Phase 0.2 and 1.1).

## hazard-patch.zip: adopted, with three fixes

Adopted wholesale, because it could not have been regenerated from description:
the cyber block (verified Unit 1 lesson titles, the single-source speaker-notes
rule, the Teacher Bundle rule), the Matrixify block (`utf-8-sig`, one import at a
time, redirects targets verified 200), the connected-branch-is-a-deploy and
sitewide-flag rules, and the source-of-truth PDF filename in every course block.

Three defects fixed rather than carried:

1. **It broke `smoke:command` criterion 22 while its own suite stayed green.**
   `APPLY.md` states the criterion still holds. Measured: `44 passed, 0 failed`
   on its own suite, `57 passed, 1 failed` on the existing one. The criterion
   greps for the literal `HTML entities only`; the patch reworded that phrase
   while scoping it. The rule is now scoped without rewording, and assertion 2.3
   guards the literal phrase directly.

2. **networking was listed exempt.** The brief is explicit that networking is
   shipped and must not be exempt. Exempt asserts nothing is being authored
   against a course. It is now `pending`, which compiles a STOP. Greenfoot stays
   exempt.

3. **`MCQ_SIGNALS` was left matching bare `MCQ`**, so task 70, the Spring 2026
   MCQ Bootcamp, still collected six lines of distractor-writing rules. The brief
   names this defect; the patch did not address it.

Also kept from the first pass: coverage is total at RUNTIME, not only in the
suite. The zip checks its exempt list from the test, which cannot see a typo'd or
brand new course value, because such a value is in nobody's list. Matrixify now
fires on `surface: shopify` as well as on text signals, since page bodies ship
through Matrixify and that work is tagged shopify.

`smoke:hazards` 129/0. `smoke:command` 58/0 and `smoke:checks` 25/0, both unedited.

## verifier-agent.zip: works, and one untested check is broken

`17 passed, 0 failed`, exactly as claimed. The layer separation is sound and the
two fixture shapes are the two real mis-closures.

**`checkMojibake` does not detect latin1-flavoured mojibake.** Its second gate
enumerates cp1252 renderings. The bullet character U+2022 is UTF-8 `E2 80 A2`;
decoded as cp1252 the middle byte `0x80` becomes the Euro sign, which is what the
pattern looks for, but decoded as latin1 it becomes control character U+0080,
which the pattern does not match. Same story for the target emoji, where the
pattern expects the cp1252 rendering of byte `0x9F`. Measured against fixtures
containing real mojibake of each flavour:

```
cp1252-flavoured:  [P0] mojibake on 1 line(s)
latin1-flavoured:  (no mojibake finding)
```

The code comment says the check is "shape-based, not a pattern list" because the
same source text produces different garbage under the two encodings, and then
enumerates patterns for only one of them.

This survived because **smoke section 5 is titled "Mojibake, headings, missing
meta" and asserts nothing about mojibake.** Its fixture is built with
`.toString('latin1')`, so it is precisely the input the detector misses, and the
suite only checks the `h1` count and the meta description.

Real-world impact is limited: Shopify mojibake in this repo is cp1252-flavoured
(the hazard block's own mojibake example is cp1252), so the detector does fire on
the case that actually occurs. But the check is weaker than advertised and its
test does not cover it.

## apcs-cli.zip: a real bug, and it corrupts silently

Every endpoint the CLI calls exists, and `?format=text` is real.

**`heartbeat` and `release` pass a TASK id to routes that take a CLAIM id.**
`POST /api/command/task/:id/claim` takes a task id and returns `claim_id`.
`POST /api/command/claim/:id/heartbeat` and `/claim/:id/release` take that
`claim_id`. The CLI discards `claim_id` and prints
`heartbeat with: apcs heartbeat <task id>`.

Best case it 404s. Worst case a claim with that number exists and belongs to a
different task, and the wrong lock is released with a 200. Reproduced offline
against the real routers:

```
claimed task #3 -> claim_id 1
claimed task #2 -> claim_id 2
claimed task #1 -> claim_id 3

"apcs release 3"  ->  POST /api/command/claim/3/release  ->  200 {"ok":true}

live claims now: [{"claim":1,"task":3},{"claim":2,"task":2}]
task #3's claim is #1, still held. The released claim belonged to task #1.
```

Two smaller gaps:

- **`apcs done` never releases the claim.** It PATCHes `/api/todo/:id` and skips
  `POST /api/command/claim/:id/return`, which is the route that records the
  artifact AND releases the lock in one call. A claimed task closed with
  `apcs done` leaves its lock to rot into stale.
- **`apcs claim` cannot express locks.** It sends no `locks` array, so the
  `(repo, file)` pairs and the 409-on-conflict protocol are never exercised. The
  session protocol says claim before touching a file; the CLI claims the task
  without naming a file.

The fix for all three is small and local to `scripts/apcs.js`: keep the
`claim_id` from the claim response, address the claim routes with it, route
`done` through `/claim/:id/return`, and accept `--lock <repo:path>` repeatedly.
Not applied here, because the CLI is Phase 1.1 and this branch is Phase 0.1.
