# 2026-08-16 - the first live reconcile run, and the two bugs it found in itself

## What happened

`Reconcile the board` ran for the first time against production (run 2,
`31968773822`, dispatched by Tanner). It worked: 14 tasks in
`needs_verification`, 5 checked, 9 correctly routed to a human, nothing written.

Then the report was read rather than filed, and two of its four "look at these
first" findings turned out to be the verifier being wrong.

## Bug 1: fail-closed auth reported as a P0

```
#16  artifact https://progress.apcsexamprep.com/api/student/history
     [P0] status 401, not 200
```

`report()` special-cased 429 and nothing else:

```js
if (x.status === 429) P(`[P1] still 429 ... rate limited, NOT broken.`);
else if (x.status !== 200) P(`[P0] status is ${x.status}, not 200`);
```

`/api/student/history` is a JWT student endpoint and this script carries no
student token, so 401 is the endpoint working correctly. A 200 there would have
been the emergency.

This is the worst possible false positive **for this repo specifically**. The
whole auth posture here is fail-closed. A verifier that reports correct
fail-closed behaviour as P0 trains its reader to skim past P0s, which is the
capability the tool exists to provide.

Fixed by routing 401/403 to `[needs-human]` with both readings named:

```
[needs-human] responded 401. This script holds no credential, so
       that is CORRECT for an endpoint meant to require auth, and a real
       fault only if it is meant to be public. No severity is claimed.
```

The script cannot tell those apart, and saying so beats picking one. Same
principle already used for note-artifacts.

## Bug 2: a file artifact that was never read

```
#28  artifact https://github.com/.../blob/main/.env.example
     [P1] 2 <h1> tags (expected 1)
```

A `github.com/.../blob/...` URL is GitHub's HTML **viewer**, not the file. There
was no blob-to-raw rewrite anywhere, so the `<h1>` count described GitHub's own
page chrome, and `.env.example` itself was never opened. The task's actual claim
(are those five keys present?) went unexamined.

Note the shape: a **pass** here would have been worse than the false flag. It
would have meant "verified" on a file nobody read.

Fixed with `toRawUrl()`, plus `looksHtml()` so page-shaped checks (meta,
headings, duplicate blocks) do not run against a text file and invent findings
about a document that has no head.

## What was NOT changed

`#71` and `#82` were left alone. Both are storefront pages reporting duplicated
comment blocks and extra `<h1>`s, and both look like real signals. One thing to
chase later: both report exactly 3 duplicated blocks, which suggests something
pasted twice in `theme.liquid` shipping on **every** page rather than anything
specific to those two. That would be a real finding, just a different one than
either task claims. Not investigated here; this repo is not canonical for the
theme.

## Testing

`smoke/verify-artifact.js` section 10, 14 new assertions, 27 -> 41.

The assertions were run against the old behaviour to prove they bite:

```
new tests vs OLD behaviour    33 passed, 8 failed
new tests vs the fix          41 passed, 0 failed
all 60 offline suites         pass
```

`10a a 500 is STILL a P0` passes under **both**, which is the guard that the fix
narrowed the severity rule rather than blanket-suppressing non-200s.

## A deadlock, met for the second time

Section 10 needs a real non-200, so it binds a loopback server. The first
version used `execFileSync` and hung: sync spawn blocks this process's event
loop, so the server can never answer the child it is waiting on. The child times
out and the failure reads as "the verifier cannot fetch", which is a lie about
the verifier.

This is the identical bug already fixed in `smoke/apcs-cli.js` earlier the same
day. The comment above `runAsync` now says so, because knowing it once clearly
was not enough.

## Still open

- Nobody has re-run the board since the fix. The numbers above describe the
  verifier, not the board.
- `#71`/`#82` duplicated-block cause is unconfirmed.
- The theme-wide-vs-page-specific question needs a page that is neither, as a
  control.
