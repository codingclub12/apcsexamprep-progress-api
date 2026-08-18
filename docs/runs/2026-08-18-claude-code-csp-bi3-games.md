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
