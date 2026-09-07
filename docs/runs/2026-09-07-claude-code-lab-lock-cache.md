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

---

# The second finding: signing out walked past every lock

**Board:** 258. Reported by Tanner an hour after the cache fix merged, in four
words: "Lab still reachable even in incognito mode."

It was not the cache. Measured against production the same minute: all seven
authored labs served their full spec to a request with no token, and an AP Cyber
Unit 1 quiz returned `locked: false` with five questions. `routes/quiz.js` line
181 says it plainly, `if (!token) { req.student = null; return { ok: true }; }`,
and a request with no student has no class, so `resolveGate` returned
`self-study` and the item went out.

So the gate was doing exactly what it said and what it said was not enough. It
answers "is this open for MY class". Incognito has no class. Every lock on the
site was one click wide, and the teacher found it by testing her own fix, which
is the test I should have run first.

## The rule, and why it is the narrow one

Tanner chose: refuse anonymous only for items a teacher has actually locked.

An item nobody has closed is still served to anyone and still indexable, because
the public practice layer is the SEO engine and gating it would be a strategic
loss rather than a security win. An item carrying an explicit closing row for at
least one class is withheld from anyone with no token, on the reasoning that the
public copy and the assigned copy are the same bytes, so leaving one open leaves
both open.

`lockedForAnyClass` reads gate ROWS ONLY and never a class default. A class
switched to locked-by-default has expressed a posture about its own students, not
a judgement that every quiz on the site should leave the public index, and
letting a default reach in there would de-index the site the first time one
teacher flipped that switch.

## Two bugs in my own implementation, and only one of them had a fixture

**The alias loop.** The first version asked about each lab alias in turn and
refused on the first close. A class holding a closing UNIT row plus an opening
`lab` row would refuse, because `terminal-lab` matched only the unit row. The
per-class path already resolved narrowest-across-aliases; my anonymous path did
not. The suite caught it once I wrote the fixture.

**The tie, which no fixture would have found.** Two rows at the same scope for
the same lesson, one closing `lab` and one opening `terminal-lab`, is a
contradiction, and both implementations resolved it by accident: mine by alias
order, the rederive by row order. The generated rederive found it in 4000 cases.

A tie now goes to the CLOSING row, in the anonymous path AND the signed-in path,
so there is one opinion about precedence rather than two that agreed by luck. It
is also the right answer on the merits: a teacher closing the Lab column while a
stale `terminal-lab` row sits open is precisely the complaint that started this
whole thread, and "open wins" would mean their click did nothing.

The rederive also went red on states the database cannot hold. `activity_gates`
is `PRIMARY KEY (class_id, course, unit, lesson, activity_type)`, so one class
cannot have the same key both open and closed; the generator was inventing that
and the two implementations broke the impossible tie differently. A generator
that ignores the schema reports bugs that do not exist, which costs more trust
than it buys.

## Evidence

- `smoke:labgate` 24/24, `smoke:gatescope` 70/70, `smoke:quizgate` 20/20
- `smoke:anongatererederive` 6/6: a SECOND implementation, set arithmetic rather
  than a ladder, agreeing on 4000 generated cases, and required to have seen both
  answers so a run where everything came out the same way cannot pass
- `smoke:labgatemutation` 108/108 across 21 mutations
- `deploy-gates/2026-09-07-anon-gate-bypass.json` passes `--pre` with THREE kinds
  agreeing: suite, rederive, mutation

## Still open

- **The live check can report UNPROVEN and does.** `verify-anon-gate-live.js`
  reads state it does not control: if no teacher has anything closed when it
  runs, there is nothing for the rule to refuse and no run of it can show the
  bypass closed. It says so rather than passing. Its four assertions are a guard
  against the worse failure, the public layer going dark, and the positive
  evidence is the rederive.
- **A member of the public who opens a locked lab now reads "Your teacher has not
  opened this lab yet."** They have no teacher. Cosmetically wrong, and the
  alternative is handing over the lab, so it stands until someone writes a second
  string for the anonymous case.
- **Until the edge cache clears, that message does not even render.** The stale
  player predates the `locked` branch, so it will try to mount a spec with no
  brief and no checks. Resolves with the cache, around 16:16 UTC.
- Board 258 goes to `needs_verification`. I cannot verify my own work, and this
  one especially: the thing to check is a teacher locking a lab and then failing
  to reach it in a private window.
