# Big Idea 3 games, and cleaning up the duplicate I shipped

2026-08-18, Claude Code. Unattended run, standing authorization to use judgement.

## Judgement calls made without asking

1. **Deleted the standalone Parallel Scheduler from #194** rather than trying to
   reconcile it. A Parallel Scheduler already ships embedded in the Topic 4.3
   lesson page. Two implementations posting to one leaderboard id on different
   scales makes the board meaningless, and the embedded one is the shipped
   design.
2. **Kept the builder and the leaderboard component.** Both are correct and
   reusable; only the duplicated game content was the mistake.
3. **Added a guard rather than a note.** `EMBEDDED_IN_LESSON` in the builder
   refuses to generate a standalone page for any topic whose game already lives
   in its lesson page. A comment would not have stopped me an hour ago.
4. **Built the two games the live hub already advertises as coming** for Big
   Idea 3, rather than inventing new ones: Big-O Race (3.17) and Halving Hunter
   (3.11). Neither topic has a game embedded in its lesson page, so both are
   legitimately standalone.
5. **Did not touch any live page.** The bridge fix is written up as an exact
   patch in `docs/csp-game-bridge-fix.md` instead, because a safe edit needs the
   authoritative page body and my extraction of one came out unbalanced.

## What shipped

| File | |
|---|---|
| `shopify/games/halving-hunter.html` | Topic 3.11, binary search |
| `shopify/games/big-o-race.html` | Topic 3.17, reasonable vs unreasonable time |
| `routes/game.js` | two additive registry entries |
| `scripts/csp-game-pages-csv.js` | duplicate removed, embedded-game guard added |
| `docs/csp-game-bridge-fix.md` | the two-page defect and its patch |
| `shopify/games/parallel-scheduler.html` | **deleted** |

Both handles confirmed free via the Admin API. Nothing imported; nothing live.

## The bug worth reading about

Halving Hunter set par at `ceil(log2(n))`. That is wrong. The last comparison
still has to happen when a single value remains, so the worst case is
`ceil(log2(n + 1))`.

The effect was not cosmetic. Par was unreachable on four of the five rounds, so
a student playing *perfect binary search* would have missed par four times and
learned that binary search is worse than it is. The game would have taught the
opposite of its own lesson.

It surfaced because a browser run scored 460 where the previous run scored 500,
and a randomized target is not a good enough reason for a score to move. Rather
than adjust the formula until it looked right, I simulated perfect midpoint play
against every possible target for each round size:

```
size   my par   true worst case
16      4        5
32      5        6
64      6        7
128     7        8
1000   10       10
```

`ceil(log2(n + 1))` matches all five. Perfect play now scores 500 on three
consecutive runs with randomized targets.

The closing panel's prose now derives its numbers from `par()` rather than
hardcoding them, so the explanation cannot drift from the behaviour again.

## Evidence

Played through in a browser against the body from the shipped CSV:

```
Halving Hunter  500 / 500, pars 5 6 7 8 10, three consecutive runs, no errors
Big-O Race      700 / 700, seven cases, no errors
apcsGameScore   dispatched by both
POST /api/game/score  {"game":"halving-hunter","value":500}
                      {"game":"big-o-race","value":700}
```

Big-O Race's step anchors were also rewritten mid-build: the first version
reported 1.1 x 10^15 steps as "about 18765.0 minutes", which is correct and
useless. It now scales the unit and says "about 13 days".

## Coverage after this

| Big Idea | Topics with a game |
|---|---|
| 1, 2, 4, 5 | every topic, embedded in the lesson page |
| 3 | 2 embedded (3.9, 3.13) plus 2 standalone (3.11, 3.17) |

Big Idea 3 still has 14 topics with no game: 3.1 to 3.8, 3.10, 3.12, 3.14, 3.15,
3.16, 3.18. It is 30 to 35 percent of the exam and the whole remaining gap.

## Still open

1. **Neither game is imported.** After import each needs a card on
   `/pages/ap-csp-study-games-hub` (both are already listed there as coming, so
   it is a promotion, not an addition) and a link from its lesson page.
2. **The two-page bridge defect** in `docs/csp-game-bridge-fix.md`.
3. **`shopify/games/parallel-scheduler.html` is deleted here but its commit is
   in main's history**, and PR #194's CSV must not be imported.
4. **The paid bundle's 780 files, including 222 answer keys, are downloadable
   with no authentication.** Flagged repeatedly this session and still the
   largest open item on the CSP surface.

---

# Continued: a game for every Big Idea 3 topic

Same unattended run, later. The two games above left Big Idea 3 with sixteen
topics still uncovered. This section covers finishing them.

## What shipped in the continuation

Sixteen more standalone games, one per remaining topic. Every one was checked
offline against its own logic and then played through in a real browser on at
least two paths (a perfect run and a deliberately wrong one), with the score
event and the POST to `/api/game/score` confirmed each time.

| Topic | Game | The specific thing it punishes |
|---|---|---|
| 3.1 | Swap Shop | overwriting a value with nothing holding a copy |
| 3.2 | Name the Thing | a half-finished rename, and naming a value that merely happens to be equal |
| 3.3 | Mod Machine | a near-miss that is right on three inputs of four |
| 3.4 | String Lab | passing an end position where a length is expected |
| 3.5 | Gate Keeper | reading "not both" as one NOT over an AND |
| 3.6 | Boundary Patrol | the value sitting exactly on the line |
| 3.7 | Branch Runner | an ELSE that belongs to the outer IF, and an unreachable branch |
| 3.8 | Iteration Station | REPEAT UNTIL overshooting by one pass |
| 3.9 | Algorithm Assembler | initialising or reporting in the wrong zone |
| 3.10 | List Surgeon | removing front to back and renumbering the index you still need |
| 3.12 | Call Sheet | argument order, hidden by a tester passing equal values |
| 3.13 | Procedure Shop | a parameter every caller passes the same value to |
| 3.14 | Doc Detective | a name that reads backwards from what the call does |
| 3.15 | Odds Maker | forgetting that RANDOM(a, b) includes both ends |
| 3.16 | Sim Lab | leaving out a factor the answer depends on |
| 3.18 | Halt or Not | mistaking slow for undecidable |

Three games carry an explicit "this cannot be done" claim worth full marks
(Swap Shop, Call Sheet, Sim Lab). A round that can only ever be lost teaches
the lesson and then punishes the student for learning it.

## Two corrections to things stated earlier in this run

1. **3.9 and 3.13 did not have games.** The earlier note treated them as
   covered. Reading the live lesson pages shows both embed the SAME game, Robot
   Director, and neither mounts a leaderboard component, so the score it
   dispatches goes nowhere. Both now have a topic-specific standalone game.
2. **`shopify/games/_leaderboard.html` was an incomplete mirror.** It carried
   the component's script and not the `#apcs-lb` style block that sits above it
   on the live page, and every class the script emits is styled there and
   nowhere else. All five standalone pages that existed at that point would
   have shipped an unstyled list. The stylesheet is now in the file.

## What the checks caught, and what they did not

Worth recording, because the pattern is the useful part.

Caught by the offline checks before a browser ever ran: an unescaped apostrophe
in "De Morgan's law" that was a hard syntax error; pass labels reading
"pass 01" from a missing pair of parentheses; a String Lab cut with two correct
answers because SUBSTRING clamped instead of refusing; a Doc Detective option
that returned the right value for the wrong reason and would have scored full
marks; an Algorithm Assembler build that ran statements in declaration order
rather than placement order, making it unloseable.

Caught only by a screenshot: the Odds Maker progress bar never moved, because
the script set the fill width on every batch while the stylesheet declared
`width:0 !important` on that same element. The page was valid, the script ran,
the hazard checks passed, and the bar stayed empty. That one is now a static
check in the smoke suite, confirmed by reintroducing the bug and watching CI
go red.

Caught by the new orphan check: `doc-detective.html` sitting in the games
directory before it was registered anywhere.

## The new suite

`smoke/csp-game-pages.js`, wired into the derived CI list, now 184 assertions.
It refuses a standalone page that duplicates a game embedded in a lesson page,
a game id the server registry does not know, a game file no builder entry
builds, a script block that does not compile, and any style property a script
sets that the stylesheet locks with `!important`.

## Still open

- **Nothing has been imported to Shopify.** The CSV builds cleanly and every
  page has been played in a browser, but no import has been run. That is a
  deliberate stop: imports are one at a time and want a human watching.
- **The hub does not link any of these.** A game page nothing points at is a
  page nobody finds. That is the next piece of work.
- **The two-page bridge defect** still awaits the Shopify-side pipeline. See
  `docs/csp-game-bridge-fix.md`.
- **PR #182's 18 notes pages must not be imported.** They duplicate pages that
  already exist at `ap-csp-topic-3-{N}-guided-notes`.
- **The paid bundle's 780 files, including 222 answer keys, are still
  downloadable with no authentication.** Flagged repeatedly across this run and
  unaddressed. It is not in scope for this branch, and it is the largest open
  problem I have seen.
