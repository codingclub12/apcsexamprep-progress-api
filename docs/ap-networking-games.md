# AP Networking study games

Six playable games, one per file in `shopify/games/`, covering all four units of
the published course framework. They ship as their own Shopify pages through the
same three-part pipeline the CSP games use.

```
node scripts/networking-game-pages-csv.js out.csv        # all six
node scripts/networking-game-pages-csv.js out.csv --only subnet-sprint
npm run smoke:netgames                                   # 90 checks
```

## What they are, and what they are not

**Leaderboard games, never gradebook items.** Scores go to `game_scores` through
`POST /api/game/score`. Nothing here touches `attempts`, `progress` or
`course_manifest`, no denominator moves because a student played one, and the
smoke suite asserts all of that rather than trusting it.

That is deliberate. The graded hands-on work for these same topics is a separate
thing with a separate design, specified in `config/networking-hands-on.json`. The
split matters: a game a student replays for a better score cannot be an
assessment, and an assessment a student replays freely is not measuring what the
gradebook says it is.

## The six

| Game | Topic | Unit | The mechanic | What it actually teaches |
|---|---|---|---|---|
| Harden First | 1.4 | 1 | Six weaknesses, only three changes, then the attack plays out | Security is triage. Everything on the list is worth doing; only some of it blocks tonight. |
| Address Autopsy | 2.2 | 2 | Rapid-fire classification against a clock | An address is often already a diagnosis. `169.254` means DHCP never answered. |
| Subnet Sprint | 3.4 | 3 | Pick the smallest block that fits | Fitting is easy. Fitting exactly is the skill, and every subnet loses two addresses before anything plugs in. |
| Rule Order | 3.5 | 3 | Reorder correct rules until traffic behaves | Not one rule is wrong. Sequence alone decides who gets in. |
| Packet Path | 4.4 | 4 | Route a packet hop by hop from a routing table | Specificity outranks metric. A `/24` with a bad metric beats a `/16` with a good one. |
| Log Hunt | 4.5 | 4 | Sort IDS lines into threat, fault or routine | Half of what an IDS reports is the network being unwell, and no firewall rule fixes a bad cable. |

Each game covers a topic that also carries a hands-on `.C` or `.D` sub-skill, so
the fun front door and the graded work point at the same place.

## The design rule these follow

**Compute the answer, never store it.** Subnet Sprint derives the correct prefix
as the smallest offered option that fits. Packet Path runs real 32-bit
longest-prefix matching. Rule Order simulates the firewall against the order the
student built, so any ordering that genuinely works is accepted.

The alternative, an answer key sitting next to the question, lets the data drift
away from the rule the game claims to teach, and nothing notices. Both defects
found while building these were exactly that kind of drift.

## What went wrong while building them

Worth reading before adding a seventh, because neither defect is visible to a
parser, a linter or a screenshot.

**Subnet Sprint shipped a round whose explanation contradicted its own answer.**
A "room to double" brief with 50 hosts derived `/26`, while the explanation
argued for `/25`. Both sentences were defensible. Together they told a student
they were wrong when they were right. Replaced with a clean off-by-one: 63 hosts,
where `/26` gives 62 usable and misses by one.

**Rule Order had its specificity comparison inverted.** `broadness()` subtracted
the index from the array length, which ranked the most specific rule as the
broadest. Every case still rendered. Every board still looked plausible. Every
intended answer scored WRONG. A spot check of one case would have found it; what
found it was walking all six permutations of all five cases.

The first version of that simulation also used a heuristic rather than exact
matching, and accepted an ordering a real firewall would have blocked. Rules now
declare exactly which traffic they match.

Both classes of defect are now permanent checks in `smoke/networking-game-pages.js`,
and both were re-injected to confirm the suite goes red before this shipped.

## Adding a seventh

1. Write `shopify/games/<id>.html`. One `<h1>`, pure ASCII, no em-dash, ends by
   dispatching `apcsGameScore`, and includes `<div id="apcs-lb"></div>`.
2. Add the id to the registry in `routes/game.js`, or the server rejects every
   score the page posts and the builder refuses to build the page.
3. Add a `GAMES` entry in `scripts/networking-game-pages-csv.js` with a topic
   that exists in the framework and an SEO description of 70 to 160 characters.
4. Add a section 5 check asserting the new game is winnable and that its
   explanations agree with its answers. Structural checks come free; this one
   does not, and it is the one that catches the defects that matter.
5. `npm run smoke:netgames`, then build the CSV and import it.

Do not put a networking game in `course_manifest`. Section 6 exists to stop that.

## Note on the shared directory

`shopify/games/` holds both courses. `smoke/csp-game-pages.js` reads the
networking id list from the networking builder rather than carrying a skip list,
so adding a game here cannot make that suite report a real orphan as expected.
