# Teachers nav dropdown disappears intermittently

Date: 2026-08-27
Agent: Claude Code
Repo changed: APCSExamPrep-theme (this repo unchanged, note only)

## Report

"Teacher drop down sometimes disappears from the nav bar."

## What actually hides it

One rule, and only one:

```css
html.apcs-is-student #apcs-nav #ni-teacher,
html.apcs-is-student #mob-teacher { display: none !important; }
```

`snippets/apcs-nav-source.liquid`. It hides the desktop Teachers door and the
mobile drawer's Teachers section together. `apcs-is-student` is set by the role
classifier in the same file and is read nowhere else in the theme, so the
classifier is the entire surface for this bug.

Ruled out on the way: the 900px breakpoint. `.nav-item-auth` hides and
`.nav-hamburger` appears at the same `max-width: 900px`, so there is no width
band where both the desktop door and the drawer are gone.

## Root cause

The classifier decided "this is a student" on the bare presence of a string at
`localStorage.apcse_token`. Three ways that goes wrong:

1. **Stale token, the main one.** Nothing in the theme ever clears `apcse_token`,
   and the two tokens have very different lifetimes: `signStudentToken` issues
   180 days, `signTeacherToken` issues 30 (`utils.js:34-53`). Any browser that
   signed in as a student once - a teacher previewing their own class, a shared
   classroom machine - keeps a live student token long after the teacher token
   is gone, and reads as a student from then on.
2. **Expired token.** Presence, not validity. A student JWT six months dead,
   which the API 401s, still hid the door.
3. **Truthy junk.** `setItem` coerces, so a sign-out path storing an undefined
   value leaves the string `"null"`, which is truthy.

That is the "sometimes": it appears roughly a month after a teacher last signed
in, only on browsers carrying both tokens, so it never reproduced on demand.

The sharp edge is what goes with it. The hidden dropdown contains the
"Join / Class Setup" row pointing at `/pages/cyber-class`, which is the route
back to teacher sign in. Losing the door loses the way to fix it.

## Fix

`snippets/apcs-nav-source.liquid`, role classifier. The gate now fails open:
hide only when `apcse_token` reads as an unexpired student JWT. Expired,
malformed, or `"null"` proves nothing, so the door stays.

Asymmetric on purpose. The teacher key stays a bare presence test, junk strings
included. **Do not tighten it.** Adding an expiry check there re-breaks the
original bug, because the teacher JWT lapses six times sooner than the student
one, so a lapsed teacher token plus a live student token would hide the door
from exactly the teachers this fixes. I wrote that check, the differential
caught it, and the guard below now asserts against it.

Also re-runs on `storage` and on a bfcache `pageshow`, so signing in or out in
another tab restores the door without a hard reload. Both listeners bind once
behind a flag.

No signature verification. That is the API's job; the nav needs `exp` and `role`.

## Evidence

`scripts/verify-nav-role-classifier.js` in the theme repo, wired to
`npm run verify:nav-role`. Runs the old and new rules over 13 token
combinations and asserts no scenario moves SHOW to HIDE.

```
13 scenarios, 5 newly reveal the door, 0 regressions
listeners: ["storage","pageshow"] ok
PASS: every scenario matches, and nothing that used to show is now hidden.
```

The five that change: expired student token; `"null"`; `"undefined"`; junk that
is not a JWT; a teacher JWT stored under the student key. The intended gate
still fires - a live student token alone still hides the door.

Mutation-checked: re-adding the teacher expiry check makes the script exit 1
with "a scenario moved SHOW -> HIDE", so the guard bites.

That repo has no CI and its connected branch deploys live, so this script is
the gate. It matches the differential style of `verify-tracker-fix.js`.

## Still open, needs a decision not a patch

A teacher whose browser holds a **genuinely live** student token and no teacher
token is still read as a student, still loses the Teachers door, and still has
no route back to teacher sign in from that nav. By the gate's own rule that
browser is a signed-in student, so this fix does not touch it.

Closing it means picking one:

- drop the role gate and show Teachers to everyone (simplest, costs a little
  student-facing clutter);
- keep the gate but always leave a sign-in row reachable;
- have the teacher sign-out path clear `apcse_token` as well.

Tanner's call. Not built.

Second, smaller: there are **two** Teachers dropdowns on the page.
`#ni-teacher` from `apcs-nav-source.liquid` (gated, via `theme.liquid`) and
`#apcse-navauth` from `apcse-nav-auth.liquid` (ungated, via
`sections/header.liquid:866`). Whether both are visible at once was not
verified against the live storefront. Worth a look; not in scope here.

## Deploy

Theme PR is a draft against `claude/site-linking-audit-yhufjk`, the connected
branch. Merging it deploys to the live site, so it wants a human review of the
blast radius first - this is sitewide nav. Verify against the live URL after
merge, not against GitHub.
