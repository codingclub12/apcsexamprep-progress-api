# The lab lock was defeated by a cache, twice

**Board:** 256 (instance of 241). Follows 246, which shipped the lock itself.

Tanner relayed a teacher: labs were opening for students after she had closed
them. The gate had shipped the day before and the gradebook showed the lab shut.

Four things were wrong. The first three were found and fixed on 2026-09-06 and
are in the previous run note: `routes/labs.js` never read `activity_gates`, the
gradebook counted only `quiz_bank` when deciding whether a lock was enforceable
so it drew every lab lock as decorative, and the gate was asked about an activity
called `lab` while the spec calls itself `terminal-lab`.

The fourth was `public/lab-player.js` fetching the spec with no `Authorization`
header. That is the one that made the other three moot: a per-class gate cannot
be applied to a request the server cannot attribute to a student, so a correct
route and a correct gradebook still handed out the lab.

Then that fix shipped, and the lab still did not lock. This note is about why.

## The deploy was correct and the students got the old file

After PR #581 merged, `/api/health` reported the new commit. The player served to
a browser was byte-identical to the broken build.

```
                     bytes   last-modified              conf.getToken
edge (HIT, age 351)  40475   Mon, 07 Sep 12:11:55 GMT   absent
origin (cache-bust)  41848   Mon, 07 Sep 12:15:45 GMT   present
```

The origin copy's md5 matched the repo file exactly. So the deploy worked and the
CDN was serving the previous player, which is a file whose entire job in this
story is deciding whether the token gets sent. **A stale player silently turns
the gate off**, which makes the cache part of the enforcement path rather than a
performance detail sitting beside it.

## The fix I nearly shipped does nothing

PR #582 set `Cache-Control: public, max-age=0, must-revalidate` on the player. It
was written, reviewed, and passed CI green on `1230c67`. It is a no-op.

Measured before merging it, four paths on this origin, cache key busted so every
response came from us:

| path | route asks for | client receives |
|---|---|---|
| `/lab-player.js` | `max-age=3600` | **`max-age=14400`** |
| `/practice-hub.js` | `max-age=3600` | **`max-age=14400`** |
| `/api/intro-java/player.js` | `max-age=86400, immutable` | unchanged |
| `/lab/:course/:item` | `no-store` | unchanged |

It is not rewriting every header. It **raises a short `max-age` on a cacheable
asset to its own four hour browser TTL and leaves a longer one alone.** So
`max-age=0, must-revalidate` is below the floor exactly as the `3600` it replaced
was, gets inflated to 14400 the same way, and the route reads as fixed while
nothing changes.

`no-store` is the only value in that table that arrived intact, because it takes
the response out of the cacheable class rather than competing on TTL. That is
what shipped.

Board **241** had already recorded this behaviour from a different asset:
`posthog-init.js` asks 300 and is served 14400. Two sessions, two assets, one
rule. I did not know 241 existed when I measured, which is the good version of
that accident: it is a re-derivation rather than a repeat.

## The same bug one hop out, found on the way

`GET /api/labs/:course/:item_id` answers with the spec for one student and
`locked: true` for another whose class has closed it, and it inherited
`public, max-age=300` from the `cors()` helper **on the open branch only**. True
when every answer was the same; false the moment the gate landed. Any shared
cache on the path, and a school proxy is exactly that, could have handed one
class's open spec to a student whose teacher had shut it.

`no-store` and `Vary: Authorization` on both branches now. Both branches is the
point: marking only the locked answer `no-store` leaves the open spec cacheable,
and a cache never holds the lock, it holds the thing the lock was meant to
withhold. That is a mutation in the battery.

## What the mutation battery caught in my own work

Two of the five new assertions were hollow, and both passed until broken on
purpose:

- "the spec route sets no-store" was satisfied by the **404 branch's** `no-store`
  further up the same route, so it passed on code where the open spec was fully
  cacheable. Re-anchored to slice from `const gate = labGate` rather than from the
  route start.
- The positional check compared the `no-store` index against `'locked: true'`. A
  `no-store` moved *inside* the locked branch still precedes that string, so the
  check could never fail. Compared against `if (!gate.open)` now.

17 mutations, 88 assertions, each required to go red for its own assertion.

## Evidence

- `npm run smoke:labplayertoken` 13/13, `smoke:labgate` 18/18,
  `smoke:labgatemutation` 88/88.
- `deploy-gates/2026-09-07-lab-cache-lock.json` passed `--pre`: suite and
  mutation agreeing, live deferred.
- `bash scripts/verify-lab-player-live.sh` failed **5 of 6** against the build
  live at 12:40, which is the property that makes it worth running after the
  deploy. It reads the header the edge **delivered**, not the header the route
  asked for, because the table above is exactly the gap between those two.

## Still open

- **A purge does not reach a browser.** The delivered header was `max-age=14400`,
  so every student who opened a lab page in the four hours before this deploy
  holds the old player locally. Clearing the CDN does not touch them. They get the
  fix when their copy expires or on a hard reload.
- **Versioning the URL is the better answer and is not taken yet.** `no-store`
  fixes staleness by refusing to cache; `/lab-player.js?v=<build>` fixes it by
  changing the key, which defeats the browser cache too. The `<script src>` is
  baked into seven lab page bodies by `scripts/lab-pages-csv.js`, so it is a
  Matrixify sheet rather than a deploy. Worth doing next time those pages are
  regenerated anyway.
- **`/api/intro-java/player.js` has the same latent bug, worse.**
  `max-age=86400, immutable`, unversioned. `immutable` tells a browser not to
  revalidate at all, so a change to `greenfoot-player.js` can take a day to reach
  a student and cannot be purged out of a browser. Nothing has broken there
  because that file changes rarely. Folded into 241.
- I cannot verify my own work. 256 goes to `needs_verification`.
