# 2026-09-21, Claude Code: the other 37 game pages and the other 13 lesson pages

Two threads were left open by the morning triage and PR #128: "the other 36 games
in the registry almost certainly share the same broken `esc()`" and "13 more Big
Idea 3 lesson pages likely carrying the same undefined questions card." Neither
had been fetched. Both are now measured, and both counts were wrong.

## What was measured

Sweeping all 47 registry ids and all 18 Big Idea 3 lesson pages, live:

| | estimated | measured |
|---|---|---|
| game pages sharing the collapsed escaper | 36 | **38 of 38 live pages**, 0 safe |
| of those, exploitable as stored XSS | not stated | **28** |
| registry ids with no live page at all | not noticed | **9** |
| lesson pages showing "undefined questions" | 13 | **14 of 18** |

The estimate of 36 was low on the defect and high on the page count at the same
time: 9 of the 37 ids it counted answer 404, and the 10 networking pages it
excluded still carry the collapsed escaper. The 13 was low because Big Idea 3 has
18 lesson pages, not 17.

## The correction worth carrying forward

**PR #128's sheets were imported, and its own body says they were not.** That is
not a contradiction to resolve on paper: the four handles in its Big Idea 3 sheet
are exactly the four pages that now read correctly live, and the 10 networking
pages now run the repaired row builder. So the PR's description is a snapshot from
before the import and reads as current.

This matters beyond bookkeeping, because it changes what the networking pages are.
PR #128 named them as carrying the stored XSS. Today they do not: their row is
built from DOM nodes and the name goes in through `textContent`. Acting on the PR
body rather than on the live page would have meant re-shipping a fix that was
already serving.

That already-live fix became the best asset in the pass. The repair shipped here
is **lifted verbatim from a live networking page** rather than written, and the
generator refuses to run if that reference page stops containing it. A fix
running on 10 pages is stronger evidence than a fix that reads correctly.

## Why the detector is a parse and not a grep

The obvious check is to grep for the collapsed literal. Three things found during
the sweep say that check would have been worth less than it looks:

- **`phishing-net` carries two escapers**, one on a single line and one across
  five. A replacement anchored on the whole function repaired the copy it
  recognised, reported every post-condition green, and left the other collapsed.
  The fix was to replace the map literal, which is identical in both, and to make
  `classify()` the post-condition rather than the strings the generator happens to
  know about.
- **`shell-hop` carries a different shape entirely**, a chain of replaces rather
  than a lookup table, collapsed the same way. The detector read it as `unparsed`,
  which was honest and useless. It reads the chain now.
- **The repair itself would have been condemned by a naive detector.** The map is
  rebuilt with Unicode escapes, `'&lt;'`, because HTML entities inside a
  `<script>` block are decoded by the parser before JavaScript sees them, which is
  how these maps flattened in the first place. A detector comparing raw source
  text calls that broken forever. It decodes JavaScript escapes before judging,
  and a Unicode escape that decodes back to the bare character is still reported.

## The near-miss

The first generator run filed `two-sides` under "no live page" and wrote a sheet
without it. `two-sides` is the page the whole finding is named after. Its
`/pages/<handle>.json` had answered 200 with HTML that run, and the code treated
any unparseable response as absence.

A genuinely missing page answers 404 with an empty body; a 200 carrying anything
else is a failed fetch. Those now take different paths: 404 is skipped and named,
a bad 200 is retried three times and then raised. This is the same shape as the
bot-challenge incident the storefront module was built for, arriving through a
different door: the failure did not look like a failure, it looked like a page
that did not need fixing.

## What shipped

Four sheets in `imports/2026-09-21/`, split one per section because MERGE
overwrites a live body with no undo, with an ordered runbook in that directory
carrying the expected end state per step, deliberate exceptions included.

- `leaderboard-xss-fix-csp-games.csv`, 10 rows
- `leaderboard-xss-fix-bi3-games.csv`, 18 rows
- `leaderboard-xss-fix-networking-games-escmap-only.csv`, 10 rows
- `csp-bi3-applied-challenge-undefined-fix-remaining.csv`, 14 rows

Nothing is imported. Matrixify import is a human step here.

Tooling, all of it re-runnable:

- `scripts/sweep-game-esc-live.js`, the detector and the live sweep
- `scripts/verify-csp-bi3-undefined-live.js`, which reads each card and counts the
  graded items on the page it links
- `scripts/build-leaderboard-xss-sheets.js` and
  `scripts/build-bi3-undefined-sheet.js`
- `smoke/game-esc-detector.js` and `smoke/leaderboard-xss.js`, registered as
  `smoke:gameesc` and `smoke:leaderboardxss`, picked up by the offline suite
  automatically because that list is derived from package.json

## Evidence

- 38 patched bodies re-read by the same detector that found the bug: 38 SAFE,
  0 with a concatenation sink, across 40 escaper copies. 38 distinct handles, no
  page in two sheets.
- Every sheet parsed back out of the finished CSV and diffed against the body that
  went in.
- The stated question count on all 14 lesson pages was measured against the page
  the card links, not assumed. All 14 serve 6.
- `smoke:gameesc` breaks each detector rule on purpose, 15 assertions, each rule
  caught independently.
- `smoke:leaderboardxss` runs both row builders in a DOM shim against a name split
  across two rows the way the 16 character server cap forces, and asserts the old
  one emits a live tag and the new one does not. One of its six assertions exists
  only to prove the harness can tell them apart.

## Still open

- **Nine registry ids have no live page**: `parallel-scheduler`,
  `packet-assembler`, `compression-challenge`, `trend-hunter`,
  `filter-sort-detective`, `team-roles`, `guess-the-purpose`, `design-sprint`,
  `bug-squasher`. Scores can be posted to a board nobody can see. Not diagnosed
  here: they may be unpublished, renamed, or never built.
- **Ten game pages carry non-ASCII in their authored prose**, against the
  pure-ASCII rule. Deliberately not repaired in a security sheet.
- **The component is pasted per page, so this recurs.** 47 copies of one
  leaderboard, at least two authored shapes, and no shared asset. The sweep now
  catches a collapsed copy, which is a guard rather than a fix.
- **PR #128 targets `main`**, which is not the deploy path. Its files are under
  `content/`, which does not sync to the theme, so nothing was mis-deployed, but
  the PR is still open and draft while its sheets are already live.
