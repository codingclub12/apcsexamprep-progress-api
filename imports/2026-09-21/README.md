# 2026-09-21 import runbook: leaderboard XSS, and the "undefined questions" cards

**This directory is shared.** Several changes landed sheets here on the same
day, each with its own runbook, and more may arrive. This one covers exactly
these four files and no others:

    leaderboard-xss-fix-csp-games.csv
    leaderboard-xss-fix-bi3-games.csv
    leaderboard-xss-fix-networking-games-escmap-only.csv
    csp-bi3-applied-challenge-undefined-fix-remaining.csv

Anything else in this directory belongs to a different change. The
`csp-notes-cfu-fix-bi*.csv` sheets are covered by `RUNBOOK.md` beside this file;
those 17 handles and these 52 do not overlap, so the two can be imported in
either order. Check any later arrival the same way before assuming the same,
rather than importing on the strength of this paragraph.

Four sheets, imported one at a time, in this order. Every step has a command that
reads the live site and a stated end state, including the parts that are meant to
look wrong.

Matrixify settings for all four: **MERGE, QUOTE_ALL, utf-8-sig, one import at a
time.** Every row carries the page's own current `Published At` read back from
Shopify, so nothing is republished or re-dated.

## What this fixes

**1. A live stored XSS on 28 game pages.** Each game page carries its own pasted
copy of the leaderboard component. In the copy those 28 pages run, the escaper
had collapsed to the identity map:

    function esc(s){ return String(s).replace(/[&<>"]/g,
      function(c){ return {'&':'&','<':'<','>':'>','"':'"'}[c]; }); }

Every branch returns the character it was handed. The name then reaches
`innerHTML` as markup:

    rows.innerHTML = entries.map(function(e,i){
      return '...<div class="nm">'+esc(e.name||'anon')+'</div>...';
    }).join('');

`e.name` is another player's name, read back from `/api/game/leaderboard`. The
server trims a submitted name to 16 characters but strips no markup, and the rows
are concatenated into one assignment, so two adjacent names span a payload across
the markup between them. One player's name runs in every later visitor's browser.

This is the same defect reported on the AP Networking pages and fixed there
earlier today. The fix here is **lifted verbatim from a live networking page**,
not rewritten: the row is built from DOM nodes and the name goes in through
`textContent`.

**2. "undefined questions" on 14 Big Idea 3 lesson pages.** The Applied Challenge
card, the one activity on the page whose answers reach the gradebook, tells the
student it has `undefined questions`. Four of the 18 pages were repaired earlier
today; these are the other 14. Each card's stated count was **measured against its
own linked exercise page**, not assumed: all 14 targets serve exactly 6 graded
items.

## Order

### Step 1: `leaderboard-xss-fix-csp-games.csv` (10 rows)

The 10 AP CSP topic game pages, including `two-sides`, the page the component was
originally copied from.

    node scripts/sweep-game-esc-live.js

**Expected after this step:** those 10 handles read `safe`. Everything else still
reads `BROKEN`, which is correct, because their sheets have not been imported yet.

### Step 2: `leaderboard-xss-fix-bi3-games.csv` (18 rows)

The 18 Big Idea 3 study game pages.

    node scripts/sweep-game-esc-live.js

**Expected after this step:** 28 handles read `safe`. The 10
`ap-networking-game-*` handles still read `BROKEN`, with `sink=no`. That is not a
failure and not a regression of this morning's work: their row builder is already
repaired, so no name reaches `innerHTML`, and what is left is the dead escaper
feeding the "Playing as ..." line. Step 3 clears it.

### Step 3: `leaderboard-xss-fix-networking-games-escmap-only.csv` (10 rows)

Escaper only. The row builder on these pages is already correct and is not
touched.

    node scripts/sweep-game-esc-live.js

**Expected after this step, and this is the end state to check against.** The
summary line reads, verbatim:

    0 BROKEN (0 with the innerHTML sink), 38 safe, 9 other, of 47 swept.

The 9 are registry ids with no live page at all, and they are expected to stay
that way. They are listed under "Left alone" below.

### Step 4: `csp-bi3-applied-challenge-undefined-fix-remaining.csv` (14 rows)

    node scripts/verify-csp-bi3-undefined-live.js

**Expected after this step:** `0 showing "undefined questions", 18 stating a
correct count, 0 other, of 18 pages.` All 18 state 6.

## Left alone, on purpose

- **Nine registry ids answer 404 and get no row**: `parallel-scheduler`,
  `packet-assembler`, `compression-challenge`, `trend-hunter`,
  `filter-sort-detective`, `team-roles`, `guess-the-purpose`, `design-sprint`,
  `bug-squasher`. They are in `routes/game.js` and have no page on the storefront,
  so a leaderboard can be posted to them that nobody can see. Worth its own board
  item; it is not this import.
- **Pre-existing non-ASCII on 10 of the game pages.** Arrows, bullets and emoji
  sit in the authored prose of the older CSP game pages, against the pure-ASCII
  rule. Repairing that on a security fix would widen the diff into content nobody
  asked about. The generator asserts only that this patch adds none, and it
  removes one per page (a trophy emoji inside the old row builder).
- **The four Big Idea 3 lesson pages already stating a count**:
  `boolean-expressions`, `conditionals`, `undecidable-problems`, `variables`.

## How each sheet was checked before it was written

Per page, and the run refuses to write a file if any of it fails:

- the broken text appears exactly once, asserted before the replacement
- the replacement is verbatim from a live page already running it
- the finished body is re-read by `classify()`, the same detector that found the
  bug, and must come back `SAFE` with no concatenation sink
- the patch introduces no non-ASCII and no em-dash
- the sheet is **parsed back out of the finished CSV** and diffed against the
  body that went in, because generation is not evidence that generation worked
- no handle appears in two sheets

Offline, `npm run smoke:gameesc` breaks each detector rule on purpose and requires
it to be caught independently, and `npm run smoke:leaderboardxss` runs both row
builders against a split hostile name in a DOM shim and requires the old one to
fail.
