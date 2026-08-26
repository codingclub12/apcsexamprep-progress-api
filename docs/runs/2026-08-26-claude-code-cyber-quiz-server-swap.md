# Swapping the AP Cyber 1.1 and 1.2 quizzes onto the server

**Date:** 2026-08-26
**Agent:** claude_code
**Follows:** docs/runs/2026-08-26-claude-code-cyber-quiz-audit-locking.md and PR #354
**Ledger:** #123 (live pages still serve the wrong questions)

The audit run note covers what was wrong and why. This one covers the delivery
path built afterwards, and the four things it taught that are not obvious from
the diff.

## What exists now

| piece | where | state |
|---|---|---|
| corrected banks, 1.1 nine items and 1.2 twelve | `seed/cyber-unit-1-quizzes.js` | merged in #354, NOT seeded in production |
| availability gate | `lib/activity-gate.js` + `activity_gates` | merged in #354, default off |
| browser renderer | theme `assets/apcs-quiz-mount.js` | PR #83, and uploaded to Shopify Files |
| Matrixify sheet generator | `scripts/cyber-quiz-mount-csv.js` | PR #357 |
| denominator re-price | `scripts/seed-cyber-denominators.js` | PR #357 |
| the sheet itself | generated, handed to Tanner | NOT imported |

Two manual steps remain and they are ordered. `node scripts/seed-quiz-bank.js`
on production first, because importing the sheet before the bank exists leaves
both pages rendering an empty mount. Then the import, MERGE, one at a time.

## 1. Shopify minifies javascript uploaded to Files

`apcs-quiz-mount.js` is 14986 bytes in the repo and 8436 on the CDN, with a
sourcemap alongside it. The deployed artifact is therefore never byte-identical
to the source, and the first thing a checksum between them does is look like
corruption.

So verification of that file has to be behavioural, not a hash.
`scripts/verify-quiz-mount.js` takes `QUIZ_MOUNT_ASSET` for exactly this: point
it at the downloaded CDN copy and the same 15 assertions run against the file
students actually load. They pass.

Re-syncing after an edit means re-uploading and re-checking the CDN URL, since
the `?v=` changes.

## 2. Two harness bugs that made tests lie

Both were caught only because a test failed loudly for an unrelated reason.

**`setContent` leaves the page on an opaque origin.** `localStorage` throws
there, so the mount's `token()` returned null, every request went out anonymous,
and the locked-state test was silently a self-study test that could not fail. It
surfaced when the locked case failed once a token was genuinely being sent.

**`127.0.0.1` is not on the API's CORS allowlist; `localhost:3000` is.** Binding
the harness to the wrong loopback name failed preflight in a way that looked
exactly like a broken renderer. The real storefront origins are allowlisted, so
production was never affected.

The lesson both share: a browser test that never exercises the authenticated
path will pass on the anonymous one and tell you nothing.

## 3. A page-body splice needs assertions, not care

`scripts/cyber-quiz-mount-csv.js` bounds its edit by two landmarks, the score bar
and the end of the quiz script, and copies everything outside them byte for byte.
That is what lets one transform handle two different markup generations, 1.1 on
`q-block` and 1.2 on `section`/`mcq-opt`, without understanding either.

Eight assertions run before a row is written. Two of them caught real bugs on
their first execution:

- the hero check refused 1.2 outright, because that generation calls its hero
  `ex-header` rather than `qhero` and the first version only knew `qhero`
- the badge check exists because the same generation repeats the count in a badge
  strip the first pass left reading "5 Questions" under a twelve question quiz

Neither would have been visible in a diff review of a 57 KB body.

## 4. Re-pricing a column does not regrade anyone

`course_denominators` moves 1.1|quiz from 5 to 9 and 1.2|quiz from 5 to 12. That
does not touch a saved grade, and the protection predates this work:
`lib/gradebook-contract.js` SOURCE B prices an attempted cell from the ledger's
own earned/max_points pair and ignores the authored table for that cell.

`smoke/denominator-safety.js` pins it in both directions. Writing it corrected
two of my own assumptions: the row total DOES change, because `possible` moves
5 to 9 while `earned`, `graded` and `pct` hold, and that is right. The grade is
`earned / graded` over attempted work; `possible` is pace, and pace genuinely
should grow when the course gains a bigger quiz.

The re-price and the sheet have to land together. Alone, the denominator prices a
column at 9 while the page still asks 5.

## Open

1. **Seed and import**, in that order. Both need a human.
2. **PR #83** wants merging so the mount asset has a home in version control.
   That repo's default branch IS the connected published branch, so merging it
   deploys; the asset is inert until a page references it.
3. **The other 25 cyber quiz pages** are unaudited. 1.1 being a unit sampler
   suggests the pattern is not isolated, and 1.3 uses a third markup generation
   with no question classes at all.
4. **`smoke:admindenoms` fails on main**, independent of any of this work. Left
   alone rather than widening a branch, but main's CI is red because of it.
5. **Jukka has not been replied to** (ledger #126).
