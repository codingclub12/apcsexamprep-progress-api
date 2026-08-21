# Sandbox entry points: nav, the retired free play, and the two course hubs

Follow-up to the sandbox build earlier today (PR #249). That shipped the page;
this is how students actually reach it.

## What shipped

**Theme (PR #62, merged, LIVE).** One "Code Sandbox" row in the AP CSA and AP CSP
nav dropdowns, desktop and mobile. Four links, all to
`https://progress.apcsexamprep.com/sandbox`.

**Free play is retired.** `/pages/sandbox` was running a second, weaker
scratchpad at a URL students reach from the nav: one file, no stdin, nothing
saved. It now redirects to the full sandbox when given no id, an unknown id, or
the retired `?id=free-play`, and the free-play entry is deleted from the
challenge table. The 13 lesson challenges linked by id are untouched.

**Hub pages.** `content/hub-sandbox-links/hub-sandbox-links.csv`, a Matrixify
MERGE of the two hub bodies, NOT yet applied. Waiting on a human to import.

## The thing worth remembering: the Admin API could not do this

The chosen plan was to edit both hub pages through the Shopify Admin API.
That is not possible from a session. `pageUpdate` replaces the whole body, and
the bodies are 79KB (CSA) and 106KB (CSP). The mutation takes its variables
inline, so applying it means reproducing 185KB of live page HTML by hand, which
would corrupt it. There is no partial-body patch.

The way out: the fetched bodies land on disk as tool-result files, so a script
can do the insertion and write the CSV without the HTML ever passing through a
model's output. That is the general pattern for editing any large live page from
here.

Verified byte for byte rather than by eye: removing the inserted markup from each
generated body restores the original exactly. On CSA, a difflib pass confirms the
only two operations are inserts (336 and 153 bytes). Before-snapshots of both
bodies sit next to the CSV.

## Live verification, against the running thing

- `GET /sandbox` 200, `/api/health` reporting commit `3eb46b1`.
- Two-file Java starter, through the real path: `POST /api/sandbox/assemble`
  then `POST /api/judge0/run`. Three class declarations, exactly one left
  `public`, `Accepted`, printed `Rex says woof!` / `Rex (3)`.
- Multi-class Java with Scanner and stdin `7`: `Accepted`, `counted 7`.
- Python and JavaScript starters with stdin `5`: both `Accepted`.
- `GET` and `POST /api/sandbox/programs` both 401 without a token.
- The page loads nothing from a third-party origin.
- Theme confirmed against Shopify, not GitHub: `templates/page.sandbox.liquid`
  and `snippets/apcs-nav-source.liquid` on the MAIN theme, `updatedAt`
  2026-08-20T19:33:54Z.
- Theme suites: page 13/13, component 45/45, csp-migration 12/12.

## What went wrong, and the window it opened

The theme merge synced to the live storefront at 19:33:55. The Railway deploy of
the API merge did not land until 19:37:43, about 22 minutes after that merge and
inside the 30-minute grace window in `deploy-drift.yml`. For roughly four
minutes the live nav pointed at a 404 and free play redirected to one.

Nothing here caused it and nothing here could have prevented it except ordering:
the storefront link should land AFTER the page it points at is serving, not
alongside it. Two merges were queued behind the same stalled build, so this was
the platform's usual lag rather than anything about this change. Worth stating
plainly because the repo has been bitten by exactly this before, twice.

## Still open

- Import the CSV. Nothing on either hub page has changed yet.
- On the live CSA hub, the Study Guides card uses `hub-quick-c-teal`, which has
  no CSS rule anywhere in the body, so that card renders unstyled. Pre-existing,
  unrelated to this work, deliberately NOT fixed in the CSV to keep the import to
  the one thing that was asked for. One rule next to the other six fixes it.
- The theme repo's `main` is still not the connected branch. Live is
  `claude/site-linking-audit-yhufjk`. PR #62 targeted the connected branch on
  purpose, so it did deploy, but the underlying trap is unchanged and still
  needs a person in Shopify Admin.

## Follow-up, 2026-08-21: sign out now clears the draft

Tanner deleted the Dog file, signed out, and found it still deleted. That is the
localStorage draft, working as designed, and the design was wrong.

The draft is written on every edit so the editor survives a reload. `signOut()`
removed only the token and the display name, so the draft outlived the SESSION
by design and the STUDENT by accident: the next person to open the page on that
machine got the previous student's code restored, because `loadDraft()` runs at
boot and knows nothing about who is signed in. One shared computer used all day
by different classes is the ordinary case in a school.

Not a hole. Nothing in a sandbox program is secret, and the server already
refuses a save against another student's program id, so the worst case was
seeing the code rather than taking it over. But `sandbox_programs` is the ONE
approved exception to "no student-typed text", and handing that text to the next
person by default is the wrong posture for the exception to sit behind.

Sign out now resets the editor and clears all three keys, behind the existing
unsaved-changes confirm since clearing discards unsaved work.

**Order matters and is the easy thing to get wrong.** `setLanguage()` ends in
`saveDraft()`, so clearing the keys BEFORE resetting the editor writes the
starters straight back under the same key and leaves a draft behind. Reset
first, clear second.

Tested by running the shipped functions, not by reading them. There is no jsdom
here and adding one for this is disproportionate, so `smoke/sandbox.js` pulls
`signOut` and `confirmDiscard` out of the rendered page and executes them under
`vm` against stubs, where the `setLanguage` stub reproduces the write-back trap.
The assertions are on the end state of the fake storage.

Both failure modes were reintroduced to confirm the tests catch them: clearing
before the reset fails 3 assertions, and dropping the `DRAFT_KEY` removal
entirely fails the same 3. smoke:sandbox 53/53, and all 90 CI suites pass.

Unchanged and still true: a signed-out student can still use the sandbox, and
their draft still persists across reloads. Only signing out clears it.
