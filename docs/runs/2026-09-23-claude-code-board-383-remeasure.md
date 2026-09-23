# Board 383, re-measured: both defects are already gone from the live site

Board 383, claims 333 and 334. Branch `claude/board-383-remeasure`.

The task asked for sheets. It gets none, because there is nothing left for a
sheet to fix. Both halves were measured live on 2026-09-23 before anything was
generated, following the rule that a sheet whose defect is already gone is a
sheet to delete. The artifact here is the measurement, plus a sweep that finds
the pages from the storefront rather than from the registry.

## What the board said, and what is live

| | board 383 / the brief | live, 2026-09-23 |
|---|---|---|
| game pages carrying the leaderboard | "the other 37" | **38**, all `ap-csp-game-*` (28) and `ap-networking-game-*` (10) |
| of those, identity-map `esc()` | 5 confirmed broken, rest unknown | **0 of 38** |
| of those, name reaching `innerHTML` | not stated | **0 of 38**; all 38 build the row with `createElement` and `textContent` |
| Big Idea 3 lesson pages showing "undefined questions" | 13 (board) or 14 (sheet) | **0 of 18** |
| any published page showing "undefined questions" | not asked | **0 of 1364 fetched** |

The four sheets in `imports/2026-09-21/` were imported. Every long line of every
row in all four is present in the live page it targets. The one exception is a
single line on `two-sides` whose sheet copy has a non-breaking space where the
live page has a plain space, which is Shopify normalizing on save rather than a
later edit. The three leaderboard steps and the BI3 step all read exactly the
end state their runbook predicted. A banner now says so at the top of
`imports/2026-09-21/README.md`, because that runbook still reads as a to-do list
and following it would MERGE two-day-old bodies over the live ones.

The brief's "5 confirmed broken as of 2026-09-22" was true of the page bodies
when the board 389 run note was written, and was no longer true by the time
anyone came back to it.

## 13 or 14

Both numbers were estimates of one set, made at different times. Big Idea 3 has
18 lesson pages. PR #128 fixed four by hand. The board title's 13 assumed 17
lesson pages, which is how the triage counted them; the 2026-09-21 sweep fetched
all 18 and found 14 still broken, which is what the sheet covers. Today the
number is 0, and all 18 state 6 questions, each matched against a count of the
graded items on the exercise page the card links (`verify-csp-bi3-undefined-live.js`).

## The handle pattern on the claim does not exist

The lock was taken on `shopify:pages/ap-csp-course-*-game-*`. No published
handle matches it. The pages sitemap has 1365 handles and 60 contain "game";
the leaderboard pages are `ap-csp-game-<id>` and `ap-networking-game-<id>`, which
is the rule `handleFor()` in `sweep-game-esc-live.js` already encodes. A sweep
written from the board's wording would have fetched nothing and reported a
clean site.

## What was added

`scripts/verify-game-leaderboard-sitemap-live.js`. The existing sweep builds its
list from the `routes/game.js` registry, so it cannot see a pasted leaderboard
the registry does not name. This one starts from the storefront's own pages
sitemap, keeps every page that calls `/api/game/leaderboard`, and judges each
with two witnesses that must agree: `classify()`, which parses the map, and the
served `esc()` source extracted and executed against a hostile string, which
does not read the map at all. It also requires the name to go in through
`textContent` with no `+ esc(e.name` left, and counts "undefined questions" on
every page it fetched. `--all` fetches the whole site.

`smoke/game-leaderboard-sitemap.js`, registered as
`smoke:gameleaderboardsitemap`: takes the repaired `two-sides` body from the
committed 2026-09-21 sheet, breaks it one way at a time, and requires the
verdict to change. 13 assertions.

## Evidence

- `node scripts/sweep-game-esc-live.js`: `0 BROKEN (0 with the innerHTML sink), 38 safe, 9 other, of 47 swept.`
- `node scripts/verify-game-leaderboard-sitemap-live.js`: 1365 pages in the
  sitemap, 60 game handles fetched, `38 pages carry the leaderboard: 38 SAFE, 0 BROKEN, 0 DISAGREE.`,
  0 pages stating "undefined questions", no leaderboard page the registry does
  not name, the same 9 registry ids with no page.
- `--all` over the whole sitemap: see the result recorded below.
- `node scripts/verify-csp-bi3-undefined-live.js`: `0 showing "undefined questions", 18 stating a correct count, 0 other, of 18 pages.`
- All 35 CSP lesson pages carry `Applied Challenge<span>6 questions, and every answer is recorded for your teacher`, so the four 2026-09-22 sheets for Big Ideas 1, 2, 4 and 5 are live too.
- Mutation, five breaks of the new sweep, each required to turn one NAMED
  assertion red on its own: dropping the concatenation rule, dropping the
  textContent rule, a runner that always says safe, removing the DISAGREE
  branch, and removing the regex-literal skip. All five went red on their own
  assertion. The first run caught a hollow test: the concatenation mutation
  replaced the textContent line, so it went red through the textContent rule
  and proved nothing about its own. It now keeps that line and adds the
  concatenation beside it.

These checks were run by the session that wrote the sweep. Under rule 4 that
makes them evidence for a verifier, not a verification.

## Still open

- **Identity-map `esc()` outside the games, on 16 pages.** Executing every
  `esc()` on every fetched page found these returning markup unchanged:
  `ap-csa-4-week-cram-kit-access`, `ap-csa-course-2-9-for-loops`,
  `ap-csa-course-2-10-loop-algorithms`, `ap-csa-course-4-2-traversing-arrays`,
  `ap-csa-course-4-12-traversing-2d-arrays`,
  `ap-csa-course-array-references-aliasing`,
  `ap-csa-lesson-3-1-abstraction-and-program-design`,
  `ap-csa-lesson-3-3-anatomy-of-a-class`, `ap-csa-lesson-3-4-constructors`,
  `ap-csp-course-bi1-collaboration`, `ap-csp-course-bi1-program-function-purpose`,
  `ap-csp-course-bi5-safe-computing`, `ap-csp-course-create-task`,
  `ap-csp-top-100-questions`, `ap-cyber-unit-1-lesson-1-exercise-2` and
  `ap-cyber-unit-3-lab-log-analysis`. From reading their call sites, none takes
  another person's text: they escape authored content (`q.stem`, `m.subj`,
  `day.qotd`) or the output of the student's own program (`res.output`,
  `d.stderr`), so the worst case found is self-inflicted. That is a reading, not
  a proof. The likelier real harm is display: authored Java containing
  `List<String>` goes to `innerHTML` unescaped and the `<String>` can vanish as
  an unknown tag. Not measured. It is a separate board item, not board 383.
  The four command centers also carry an `esc()`, and all four execute as
  correct.
- **`fmt()` is still the collapsed ternary on all 38 game pages.** It is inert:
  the row writes it through `textContent`, and `renderBest()` only ever passes
  it `Number(localStorage)`. Repairing it means deciding what the non-number
  branch should return, which is authoring code rather than a repair.
- **Nine registry games have no page** (`parallel-scheduler`, `packet-assembler`,
  `compression-challenge`, `trend-hunter`, `filter-sort-detective`,
  `team-roles`, `guess-the-purpose`, `design-sprint`, `bug-squasher`). Carried
  over from 2026-09-21, still unassigned.
- `imports/2026-09-22/RUNBOOK.md` still says the BI3 sheet "has not been
  imported yet". It has. Not edited here because that file was not claimed.

## What to remember

`classify()` reads `csp-command-center`'s escaper as `unparsed` and so calls a
correct page BROKEN, because it does not expect `String(s==null?"":s)`. That is
a false alarm rather than a false clean, and it only matters off the game
pages, but it is the reason the second witness here executes the function
instead of parsing it. The first cut of that runner had its own blind spot on
the same page: `/"/g` carries a quote that is not a string, and a scanner that
read it as one ran off the end of the function. Both instruments were wrong in
the same place before they were right, and only running them against a page
nobody had tuned them for showed it.
