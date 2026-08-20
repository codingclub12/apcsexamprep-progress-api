# 2026-08-20 - Six AP Networking study games

## What was asked

"I think now is the time to build. Do we need to create more activities,
interactive lessons, lets get creative and do some fun stuff that students will
like and fill up a full year for this networking course."

## The finding that set the shape

The whole game pipeline already existed in this repo and had never been pointed
at AP Networking: 17 CSP games in `shopify/games/`, a server-side leaderboard
registry in `routes/game.js`, a Matrixify CSV builder, and a 242-check smoke
suite. AP Networking had zero games.

That mattered because it means interactive work for this course is NOT blocked on
the chat-side Matrixify pipeline. It is buildable end to end here, and the output
is a CSV Tanner imports.

So the pass ported the pattern rather than inventing one, and reused rather than
copied: `checkPage` is imported from the CSP builder, because those hazard rules
were each written after something broke on a live page and a second copy would
drift the moment either was edited.

## What shipped

Six games, all four units covered, each on a topic that also carries a hands-on
`.C` or `.D` sub-skill:

| Game | Topic | Mechanic |
|---|---|---|
| Harden First | 1.4 | Six weaknesses, three changes, then the attack runs |
| Address Autopsy | 2.2 | Rapid-fire classification against a clock |
| Subnet Sprint | 3.4 | Smallest block that fits |
| Rule Order | 3.5 | Reorder correct rules until traffic behaves |
| Packet Path | 4.4 | Route a packet hop by hop from a routing table |
| Log Hunt | 4.5 | Threat, fault or routine |

Plus `scripts/networking-game-pages-csv.js`, `smoke/networking-game-pages.js`
(90 checks, registered as `smoke:netgames`), `docs/ap-networking-games.md`, six
registry entries, and one edit to `smoke/csp-game-pages.js`.

## The design rule

**Compute the answer, never store it.** Subnet Sprint derives the correct prefix
as the smallest offered option that fits. Packet Path runs real 32-bit
longest-prefix matching with a metric tie-break. Rule Order simulates the
firewall against the order the student built, so any ordering that genuinely
works is accepted rather than one blessed sequence.

An answer key sitting beside the question lets the data drift away from the rule
the game claims to teach. Both defects below were exactly that.

## Two defects found before shipping, and how

**Subnet Sprint had a round whose explanation contradicted its answer key.** The
"room to double" brief with 50 hosts derived `/26` while the prose argued `/25`.
Found by a script that recomputed every round's answer and checked the
explanation mentioned it. Replaced with 63 hosts, where `/26` gives 62 usable and
misses by one, which teaches the same point without the ambiguity.

**Rule Order had its specificity comparison inverted.** `broadness()` returned
`rules.length - want.indexOf(id)`, ranking the most specific rule as the
broadest. Every case rendered, every board looked plausible, and every intended
answer was scored wrong. Found by walking all six permutations of all five cases,
not by playing one.

Fixing that exposed a second, deeper problem: the simulation inferred "which rule
is broader" from a stored ideal order, and accepted an ordering a real firewall
would have blocked. Replaced with an exact model where every rule declares which
traffic it matches. Case 3 now correctly rejects `['c','a','b']`.

## Evidence

```
npm run smoke:netgames        90 passed, 0 failed
npm run smoke:cspgames       242 passed, 0 failed
full offline suite            ALL 76 SUITES PASS
node scripts/networking-game-pages-csv.js out.csv
                              6 pages, 24 to 30 KB each, all hazard checks clean
```

Negative-tested rather than trusted. An explanation contradicting its answer key
and a firewall case dealt already solved were each injected; the suite went red
on the right check both times and returned to 90 green after restoring.

## One edit outside this work

`smoke/csp-game-pages.js` reported all six new files as orphans, correctly: its
orphan check sweeps the whole shared directory. It now reads the networking id
list from the networking builder instead of a hardcoded skip list, so adding a
game here cannot make it start reporting a real orphan as expected.

## Still open

- **Nothing is imported yet.** The CSV is built and validated but no Shopify page
  exists. That import is Tanner's, one at a time, per the house Matrixify rules.
- **No hub page.** The CSP games have one. Six networking games are enough to
  want a landing page, and there is none.
- **Guest Gate (topic 3.3) is the obvious seventh**, on the verify verb: the
  proof of a guest network is the thing that must NOT work. Topics 2.4, 2.6 and
  4.3 also carry hands-on sub-skills and have no game.
- These are leaderboard games and remain deliberately separate from the graded
  hands-on activities in `config/networking-hands-on.json`, which are still
  unbuilt and still behind `NET_HANDS_ON_LIVE = false`.

## Learned

The permutation test is the one that earned its keep. Rule Order was inverted in
a way that produced a completely plausible-looking game, and any amount of
looking at it would not have found it. Checking that a puzzle is solvable AND
that it does not start solved is cheap, and it is now section 5 of the suite so
the next game has to answer the same question.
