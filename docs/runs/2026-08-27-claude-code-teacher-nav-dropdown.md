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

Two commits. The second is the one that settles it.

**1. Token validation** (`snippets/apcs-nav-source.liquid`, role classifier).
Stopped the wrong readings: hide only when `apcse_token` reads as an unexpired
student JWT, so expired tokens and the `"null"` string no longer count.

**2. Gate dropped** (same file, stylesheet). The rule that hid the Teachers door
by role is removed outright. Both doors now show for everyone. See the decision
below.

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
`npm run verify:nav-role`. Two checks.

```
check 1  no role gating: 3 classes absent from active CSS, 0 door rule(s) inspected, none hide by role
check 2  role labels: 13 scenarios          (all pass)
         listeners: ["storage","pageshow"] ok
PASS: no role gating in CSS, and every role label is correct.
```

Check 1 is the one that matters now: it strips CSS comments, then asserts no
active rule references `apcs-is-student` / `apcs-is-teacher` / `apcs-is-anon`
and no active rule hides an auth door. Reinstating the old gate makes it exit 1
with both the class reference and the `display:none` named. Restoring exits 0.

Check 2 pins the published labels across 13 token combinations, including the
one that drove the original bug: an expired teacher token plus a live student
token must still label TEACHER. An expiry check on the teacher key makes that
row fail, which is the guard against re-breaking it.

That repo has no CI and its connected branch deploys live, so this script is the
gate. It matches the differential style of `verify-tracker-fix.js`.

## Decision: gate dropped

Tanner, 2026-08-27: "drop the gate and just always have teacher and student
option for ease."

So the CSS rule is gone and both doors are in the nav for every visitor. That
closes the case the token fix could not reach - a teacher on a browser holding a
genuinely live student token is a signed-in student by the gate's own rule, so
the gate still took their Teachers door and the route back to sign in with it.

The classifier stays and still publishes `apcs-is-teacher` / `apcs-is-student` /
`apcs-is-anon`. Nothing in the theme reads them now, but Shopify page bodies ship
outside that repo and may, so the signal stays published and stays accurate. It
just no longer decides what the nav shows. Keeping it is also why removing the
gate is safe: any off-repo page body that reads these classes is unaffected.

The verify script is reframed. Check 1 strips CSS comments and asserts no active
rule references a role class or hides an auth door, so the gate cannot come back
by accident. Check 2 keeps the 13 token scenarios, now asserting the published
label rather than door visibility. Mutation-checked both ways: reinstating the
gate exits 1, restoring exits 0.

Not taken, for the record: keeping the gate with a sign-in row always reachable,
or having the teacher sign-out path clear `apcse_token`. The second would have
been this repo's work. Neither is needed now.

## Also noticed, not fixed

`snippets/apcs-nav-source.liquid:1558` builds `innerHTML` from a string
containing `&#8594;` inside a `<script>` block, which CONVENTIONS.md forbids
(Shopify decodes entities in script tags). It predates this work and is on the
base branch, and the string is static with no untrusted data, so the XSS rule is
not violated in substance. Left alone rather than widening the PR. Worth a
separate sweep.

Second, unverified: there are two Teachers dropdowns on the page. `#ni-teacher`
from `apcs-nav-source.liquid` (via `theme.liquid`) and `#apcse-navauth` from
`apcse-nav-auth.liquid` (via `sections/header.liquid:866`). Whether both render
at once was not checked against the live storefront. With the gate gone this
matters slightly more, since neither is now suppressed by role.

## Deploy

Theme PR is a draft against `claude/site-linking-audit-yhufjk`, the connected
branch. Merging it deploys to the live site, so it wants a human review of the
blast radius first - this is sitewide nav. Verify against the live URL after
merge, not against GitHub.
