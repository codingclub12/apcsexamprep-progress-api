# 2026-08-27 claude code: ads off for signed-in teachers (task #138)

Asked for: "make ads off for teachers signed in."

## The first finding is that it already shipped

Worth saying plainly, because it changes what the work was. The site-wide gate
in the theme's `snippets/apcs-entitlement.liquid` has said "TEACHERS -- any
authenticated teacher is ad-free EVERYWHERE" since it was written, and it does
work in the plain case. Confirmed against the live storefront, not against the
file:

```
curl -sSL https://www.apcsexamprep.com/pages/ap-csa-unit-3-class-creation-study-guide
```

The gate script is in the served HTML, and `layout/theme.liquid:2740` renders it
once, sitewide, with no inline copy anywhere else.

So this run was not "build teacher ad-free." It was "find out why it is not
reliably true," which turned out to have two answers pointing in opposite
directions.

## How the two defects were found

The deployed IIFE was extracted from the live page and replayed in a sandbox
with `localStorage`, `fetch` and the AdThrive command queue stubbed, so the
thing under test was the real script's decision rather than a reading of it.
Against the pre-fix gate:

```
ADS OFF  teacher only, course page
ADS OFF  teacher only, non-course page
ADS OFF  teacher + student token, fast API (80ms)
ADS ON   teacher + student token, SLOW API (3s)          <- defect 1
ADS ON   teacher + student token, API HANGS              <- defect 1
ADS OFF  the literal string "null"                       <- defect 2
ADS OFF  expired / forged / garbage token                <- defect 2
```

**Defect 1, the teacher waited on a call that cannot change the answer.**

```js
Promise.all([apcsEntitlement(), apcsTeacherSuppress(ctx)]).then(...)
```

A teacher is ad-free on every page, so `/api/student/entitlement` has nothing to
say that alters the outcome, but the teacher was held behind it regardless. Slow
response, ads render first. Response that never settles, ads for the whole
visit. It only bites a teacher who also holds an `apcse_token`, which is any
teacher who has previewed their own class, plus every shared classroom machine.

**Defect 2, bare presence let everyone else ride along.** Suppression turned on
the mere existence of `apcse_teacher_token`. An empty write, a stringified
`"null"`, non-JWT garbage, or a token that expired months ago each bought a
permanently ad-free site. Nothing clears that key, and
`POST /api/teacher/register` is open self-service, so a student who registers as
a teacher gets an ad-free site. This was already written down as an open item in
`docs/runs/2026-08-27-claude-code-teacher-nav-dropdown.md` and is closed now.

The two defects are worth holding together: one kept ads on for real teachers,
the other kept them off for people who are not teachers. Only the first is what
was asked for, but fixing one without the other would have been half a job.

## What shipped

Theme PR: https://github.com/codingclub12/APCSExamPrep-theme/pull/88 (draft)

- The teacher check reads `localStorage` and nothing else, so it runs first and
  short-circuits. A signed-in teacher skips the student call entirely: one fewer
  request per page, and no way for the API's health to put ads back.
- A token counts as live when it is JWT-shaped and its `exp`, if it carries a
  readable one, is still ahead. The unreadable cases stay ad-free deliberately:
  an undecodable payload, or no `exp` at all, still suppresses. If the token
  format changes, a real teacher keeps their ad-free site. That is the failure
  worth having.
- `window.apcsTeacherSuppress` keeps its promise-returning shape because it is
  on `window`. `window.apcsTeacherIsSignedIn` is the new synchronous form.
- `scripts/verify-ad-gate.js` plus `npm run verify:ad-gate`, and a CI workflow
  that runs it on every push. No dependencies and no network, the same bar
  `verify:nav-role` clears, so it cannot go red for unrelated reasons.

Nothing in this repo changed. The gate is client-side and the fix deliberately
adds no network call, since a network call is what caused defect 1.

## Evidence

17 cases green on the branch. The same guard run against the pre-fix gate fails
6 and exits 1:

```
6 of 17 ad-gate cases wrong. Not deployable.
```

That red run is the artifact that matters. A guard that has never failed is not
known to be a guard.

Not yet evidence: the storefront itself. The PR is a draft and the base is the
connected branch, so merging is the deploy. Verify against the Shopify Admin API
afterwards, never against GitHub.

## Still open

- **Free vs paid teachers is undecided.** Any authenticated teacher is ad-free,
  which is what the policy says today. With self-registration open, a student
  who registers still gets ads off until that token expires. Restricting to paid
  means reading `/api/gate/check` in the gate. That is a business call and was
  deliberately not made.
- **`TODO_KEY` is set on this Claude Code environment.** `CLAUDE.md` says the
  read-only `COMMAND_READ_TOKEN` belongs here and the write-capable `TODO_KEY`
  belongs in Railway and the Actions secret only, because any session can echo
  an environment variable into its own transcript. Both are currently set. It
  was used this run only to `apcs add` and `apcs claim` task #138. Worth
  rotating and removing.
