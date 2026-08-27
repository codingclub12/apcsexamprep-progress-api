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

One thing: **the role gate is deleted.** Both auth doors show for every visitor.
That is the entire user-visible change, and it is about four lines of CSS.

An earlier commit in this branch also hardened the role classifier (JWT decode,
expiry check, junk-string filter, storage/pageshow listeners). A code review
killed it and it has been reverted. The reasoning is worth keeping:

- The classifier's ONLY consumer was the gate this change deletes. Verified by
  grepping both repos for `apcs-is-student|apcs-is-teacher|apcs-is-anon`,
  including the 69 exported page bodies and snapshots under `shopify/`. Zero
  readers. The justification written into the first commit, that off-repo
  Shopify page bodies "may read them", was checkable and false.
- So the hardening was ~90 lines of render-blocking synchronous JS added to
  every storefront page to keep a signal accurate for nobody, plus 13 pinned
  test scenarios to maintain forever.
- It also carried real bugs of its own, none of which mattered because nothing
  read the output: `payload()` returned non-objects (`JSON.parse("123")`) that
  then classified as a live student, `expired()` failed open on a missing or
  string-typed `exp`, and the `catch` dereferenced a variable declared outside
  its `try`.

The classifier is back to its original twelve lines, with a Liquid comment
recording why it must not be "improved" without a consumer, and the one
invariant that matters if a consumer ever appears: the student key may be
validated, but the teacher key must stay a bare presence test, because a
teacher JWT lives 30 days against the student JWT's 180 and an expiry check
there relabels a teacher as a student.

Prose was moved into `{%- comment -%}` blocks, which Liquid strips server-side.
Net effect on the page: **289 bytes fewer** shipped per view than the base
branch, against +2,174 gzipped for the reverted version.

## Evidence

`scripts/verify-nav-role-classifier.js`, wired to `npm run verify:nav-role` and
now run by `.github/workflows/verify-nav.yml` on every push and pull request.
Verbatim output on the current tree, exit 0:

```
check 1  css: 118 source(s), 4855 rule(s) inspected, no role gating and no hidden doors
check 2  markup: 4/4 auth doors present

PASS: no role gating, no hidden auth doors, all four doors present.
Note: CSS and markup only. A gate written in JavaScript or Liquid is not visible here.
```

Check 1 collects every stylesheet the theme can serve - `assets/*.css` plus
every `<style>` (attributes and all) and `{% style %}` block in `snippets/`,
`sections/`, `layout/` and `templates/` - strips Liquid and CSS comments,
flattens at-rules, and inspects whole rule blocks. It fails on any selector
keying off a role class and on any rule hiding an auth door, with one
allowlisted exception (the sub-900px `.nav-item-auth` rule, where the hamburger
drawer takes over). Check 2 asserts all four door IDs still exist in the markup.

Mutation-checked. Eleven mutations that the FIRST version of this guard passed
with a green banner now all exit 1:

| mutation | old | new |
| --- | --- | --- |
| the old rule, reformatted across lines | pass | fail |
| `.nav-item-auth:first-of-type` hide | pass | fail |
| `visibility: hidden` | pass | fail |
| `opacity: 0` + `pointer-events: none` | pass | fail |
| `DISPLAY: NONE` (uppercase) | pass | fail |
| same rule in `assets/base.css` | pass | fail |
| `<style type="text/css">` block | pass | fail |
| `{% style %}` block | pass | fail |
| door `id` renamed | pass | fail |
| inline `<style>` in `layout/theme.liquid` | pass | fail |
| multi-line rule inside `@media` | pass | fail |

The first version scanned one file, line by line, for `display:none` on the same
physical line as a door ID. On the shipped tree that matched zero lines, so half
of it was vacuous while printing a confident pass. It is recorded here because
the first run note claimed it was "mutation-checked both ways" on the strength
of a single mutation.

**What the guard cannot see:** CSS and markup only. A gate reimplemented in
JavaScript (read a role class, set `style.display`) or in Liquid (`{% unless %}`
around a door) passes clean. Those need a human. The script says so on every run.

## Resolved: only one Teachers dropdown renders

The first run note left this open. It is decidable and now checked:
`assets/base.css:4136-4146` hides `.header`, `.shopify-section-group-header-group`
and friends with `display: none !important`. `#apcse-navauth`, rendered from
`sections/header.liquid:866`, sits inside that header and never paints. So there
is one visible Teachers dropdown, not two, and the "dead end" premise holds: a
teacher who lost `#ni-teacher` genuinely had no visible route back to sign in.

## Corrections to the first version of this note

- "Nothing in the theme ever clears `apcse_token`" was too broad. Student sign
  out DOES clear it (`shopify/join.html:581-582`, `shopify/my-progress.html:501`).
  The real gap is **teacher** sign out at `shopify/cyber-class.html:332-333`,
  which clears `apcse_teacher_token` and `apcse_teacher` but not `apcse_token`.
- The "truthy junk" root cause (a sign-out path storing the string `"null"`) was
  reasoned about, not observed. Every sign-out path in both repos uses
  `removeItem`. The one path that could produce it is
  `shopify/join.html:562`, `saveSession(d.token, ...)` storing an undefined
  `token` with no guard, where the sibling `my-progress.html:492` does guard.
  Inferred, not seen in the wild.
- The Evidence block in the first version contained the annotation `(all pass)`
  on a line the script does not print, inside a fenced block presented as tool
  output. That is exactly the "agent reports are not evidence" failure CLAUDE.md
  names. The block above is pasted verbatim from a real run.

## Still open, NOT fixed here

**1. The stale-token defect survives in every other reader.** Deleting the gate
removed one consumer. Roughly a dozen remain on bare truthiness with no expiry
check and no teacher precedence: `layout/theme.liquid:2726` and `:1863`,
`assets/apcs-tracker.js:37`, `apcs-reporter.js:52`, `ap-csp-reporter.js:50`,
`ap-networking-reporter.js:59`, `ap-csa-usage-bridge.js:37`,
`apcs-hub-progress.js:49`, `snippets/apcs-entitlement.liquid:47`,
`apcs-grade-reporter.liquid:77`.

The sharp one: `layout/theme.liquid:2726` POSTs `/api/student/track` with a bare
`apcse_token` and no teacher precedence. A teacher auditing lesson pages on a
browser holding a live 180-day student JWT **writes visit rows into that
student's gradebook**, and the API accepts them because the JWT is genuinely
valid. That is exactly the teacher this bug report came from. It violates this
repo's own contract that not-attempted and scored-zero are different facts, and
it is invisible from the teacher dashboard.

`assets/apcs-quiz-mount.js:67-75` and `apcs-slides-gate.js` already implement
teacher-token-wins precedence, so the correct pattern exists in-repo and was
never generalized. The two-line fix at `shopify/cyber-class.html:332-333` (clear
`apcse_token` on teacher sign out) is this repo's, and belongs in the chat-side
Matrixify pipeline.

**2. Teacher self-registration is now one tap from every student.** The
now-always-visible Teachers menu ends in "Join / Class Setup" ->
`/pages/cyber-class`, and `POST /api/teacher/register` (`routes/teacher.js:55`)
is open self-service: email, password, name, with a 409 on duplicate email as
the only rejection. Two consequences the gate used to mask:

- `snippets/apcs-entitlement.liquid:119` `apcsTeacherSuppress()` disables ads
  sitewide on the BARE PRESENCE of `apcse_teacher_token`. A student who
  registers gets an ad-free site permanently, since nothing clears that key.
- Students are minors on name + PIN under this repo's zero-PII posture, and the
  teachers table stores an email.

Dropping the gate was the right call for the nav. This consequence of it is a
separate decision: the door's copy, and `apcsTeacherSuppress`'s bare-presence
test, both want a second look. Not built.

**3. `apcse_teacher_token` holding the string `"null"`** would make
`revalidate()` at `snippets/apcs-nav-source.liquid:1710` fire
`Authorization: Bearer null` at `/api/teacher/classes` on every page view. Only
reachable if some path writes that string; none observed. Noted, not chased.

## Deploy

Theme PR: https://github.com/codingclub12/APCSExamPrep-theme/pull/85 (draft)
Run note PR: https://github.com/codingclub12/apcsexamprep-progress-api/pull/366 (draft)

The theme PR's base is `claude/site-linking-audit-yhufjk`, the connected branch,
so merging it deploys to the live site. Draft on purpose: sitewide nav wants a
human on the blast radius. Verify against the live URL after merge, not against
GitHub.

One visual check worth doing before merge, not doable from this container:
between roughly 901px and 1200px the nav bar carries logo + six top-level items
+ Teachers + Students + cart in a `max-width: 1200px` flex row with no wrap.
Anon and teacher visitors already carried both doors, so if it overflows it
overflowed before this change; students are simply now in the same population.
