# CSP study game: Parallel Scheduler, and what the games already do

2026-08-18, Claude Code.

## Correction: the CSP games were never untracked

I reported earlier in this session that the ten CSP study games record nothing.
That was wrong, and it was the third instance of the same mistake: I grepped
the game pages for `.lesson-page`, `data-activity` and `apcsActivity` (the
gradebook path), found none, and reported absence.

The games use a different path, built for them. Each dispatches
`apcsGameScore`, an inline `APCSLeaderboard` component listens, and it POSTs to
`/api/game/score` with the student's bearer token. `routes/game.js` is mounted
at `server.js:69`, backed by `game_scores`, with a server-owned registry,
anti-cheat bounds and per-window dedupe. It is collecting real scores today:
two-sides 3,640; phishing-net 1,850; bridge-the-divide 2,801; redundant-routing
560; and so on.

Its header comment states the intent plainly: *"This is a FUN board, not a grade
source. Rows live in game_scores and never touch progress / attempts /
score_events or any gradebook table."* That matches what Tanner described a
teacher wanting: go play it and see how you do.

`license-match` shows zero players, but its dispatch, its init call and its
registry bounds are identical to `phishing-net`. Nobody has finished a run. Not
a bug.

## What this adds

`parallel-scheduler`, the game for Topic 4.3, parallel and distributed
computing. It completes Big Idea 4.

The server registry in `routes/game.js` already lists 19 game ids while only 10
pages exist. The nine unbuilt ones map exactly onto the coverage gaps:

| id | topic |
|---|---|
| team-roles | 1.1 collaboration |
| guess-the-purpose | 1.2 program function and purpose |
| design-sprint | 1.3 program design and development |
| bug-squasher | 1.4 identifying and correcting errors |
| compression-challenge | 2.2 data compression |
| trend-hunter | 2.3 extracting information |
| filter-sort-detective | 2.4 using programs with data |
| packet-assembler | 4.1 the internet |
| **parallel-scheduler** | **4.3 parallel and distributed computing** |

Building all nine completes Big Ideas 1, 2 and 4 and needs no API work at all,
since the registry already accepts them. Big Idea 3, 17 topics, stays the gap.

## How the game teaches the topic

Four levels. Jobs with durations are placed onto processor lanes; the schedule
packs left and honours dependencies. A live readout shows sequential time, the
student's makespan, and the speedup between them.

The arc is the point:

| Level | Processors | Speedup at par |
|---|---|---|
| 1 | 2 | 1.8x |
| 2 | 3 | 2.7x |
| 3 | 3, one dependency | 2.0x |
| 4 | **4**, a chain of four | **1.3x** |

Level 4 gives the student the most processors and the worst speedup. Sixteen
units of work, four processors, and the best possible finish is still 12,
because four jobs each waiting on the one before form a chain that no number of
processors can shorten. The closing panel says so in those terms.

## Evidence

Played through in a real browser, driven against **the body from the shipped
CSV** rather than a source file:

```
all four levels reachable at par : true
speedups                         : 1.8x, 2.7x, 2.0x, 1.3x
final score                      : 400
apcsGameScore dispatched         : { value: 400 }
POST /api/game/score             : {"game":"parallel-scheduler","metric":"score","value":400}
page errors                      : none
leaderboard renders, no mojibake : true
```

Two real bugs were found by that test and fixed, neither visible by reading:

1. **A placed job blocked its own lane.** Once a block occupied a lane, the lane
   rect could not be clicked, so a second job could never be added to it. Blocks
   now take pointer events only when nothing is selected, which is exactly when
   a tap on a block means "pull this one back".
2. **`!!placed[j.id]` treated lane 0 as unplaced.** Lane index 0 is falsy, so a
   job scheduled on the first lane stayed enabled and could be placed twice. Now
   `hasOwnProperty`, and the dependency guard had the same defect.

## The leaderboard component

`shopify/games/_leaderboard.html` is the component copied verbatim from a live
game page rather than reimplemented, so a new game behaves exactly like the ten
that already work.

One change was made to it: its five non-ASCII characters (three emoji and two
bullets, all inside JS string literals) are now Unicode escapes. That satisfies
the house rule that a script block carries escapes rather than raw characters,
removes any mojibake risk through the CSV, and renders identically. Verified in
the browser: the trophy and medal glyphs still appear and no mojibake is
present.

## Still open

1. **Not imported.** The CSV is built and validated; nothing is live.
2. **Nothing will link to it.** After import it needs a card on
   `/pages/ap-csp-study-games-hub` and a link from the Topic 4.3 lesson page, or
   it joins the pages with zero inbound links.
3. Eight more registered games remain unbuilt, plus 17 Big Idea 3 topics with no
   registered id at all.
4. The encryption game Tanner asked for has no registry entry. Safe computing
   (5.6) already has `phishing-net`, so a symmetric/asymmetric game needs either
   a new id or a decision about which topic it belongs to.
