# 2026-08-20 - The remaining four AP Networking games, and the hub

Continues the same day's first pass, which shipped six games and left four
topics and the hub open.

## What was asked

"keep going, build the rest of the games and the hub. Just imported the csv"

## First: the import was verified, not assumed

Before building anything, the six pages from the earlier pass were checked
against the live site rather than taken on report.

```
200 harden-first     init=1 mount=1 h1='Harden First'
200 address-autopsy  init=1 mount=1 h1='Address Autopsy'
200 subnet-sprint    init=1 mount=1 h1='Subnet Sprint'
200 rule-order       init=1 mount=1 h1='Rule Order'
200 packet-path      init=1 mount=1 h1='Packet Path'
200 log-hunt         init=1 mount=1 h1='Log Hunt'

GET /api/game/leaderboard?game=subnet-sprint  ->  {"entries":[]}
GET /api/game/leaderboard?game=not-a-real-game -> {"error":"Unknown game id"}
```

The apex host answers 301 to www, which is why a first check against
`apcsexamprep.com` reported all six as not live. They were live. Following the
redirect is the whole difference, and it is worth knowing before someone else
runs the same check and files a bug.

## The four new games

| Game | Topic | Mechanic | The idea |
|---|---|---|---|
| AI Audit | 2.4 | Click the lines you would not sign off | Most of every AI design is correct, which is what makes the rest hard to see |
| Segment Sort | 2.6 | Twelve devices into four zones | Ownership is the wrong axis and the one everybody reaches for |
| Guest Gate | 3.3 | Configure, then choose the test that proves it | Every wrong test in the game passes, which is what makes it wrong |
| Shell Hop | 4.3 | One SFTP transfer, one command per step | No error message is not evidence |

With the earlier six that is ten games, and the ten topics are not a taste
judgement: they are **exactly** the ten whose framework skills carry a `.C`
(implement and document) or `.D` (verify) sub-skill. The suite derives that list
from `config/networking-framework-skills.json` and fails if the two ever
disagree, so the claim cannot rot.

## The hub

`shopify/games/_networking-hub.html` is a template with a `<!--UNITS-->` marker.
The cards are GENERATED from the `GAMES` table in the builder, so:

- adding a game puts it on the hub with no second edit
- the hub cannot link to a handle that `build()` does not produce
- the suite asserts every game is linked exactly once, and that no link points at
  a page nobody builds

`checkHub` is separate from `checkPage` on purpose. The game hazard rules
require a leaderboard mount, a score dispatch and an `APCSLeaderboard.init`, and
a page of links correctly has none of those. Running the game rules against the
hub would have meant either three false failures or weakening the rules for
everything.

A `--only` run deliberately does not emit the hub. Rebuilding it from one game
would publish a hub listing one game.

## Zero PII, structurally

Shell Hop is a terminal, and a terminal is the obvious place to collect a typed
string. A typed string is free text and this site never stores free text from a
student. Every step is a CHOICE between fixed commands; there is no text input on
the page, and the suite asserts there is none rather than trusting the author to
remember.

## Evidence

```
npm run smoke:netgames    161 passed, 0 failed   (was 90 with six games)
full offline suite        ALL 82 SUITES PASS
node scripts/networking-game-pages-csv.js out.csv
                          11 pages: 10 games at 24 to 30 KB, hub at 7 KB
```

Both new structural checks were injected with a defect to confirm they go red:

- a game moved to a unit the hub does not render lost its card, and five checks
  fired including `never links to ap-networking-game-shell-hop`
- a game retargeted at topic 1.1, which carries no hands-on sub-skill, failed the
  derived-coverage check with both lists printed side by side

## Still open

- **Nothing new is imported.** The v2 sheet carries all 11 pages. The six already
  live are MERGE rows and will update in place; the five new handles are creates.
- **The hub is not linked from anywhere yet.** It exists as a page. A link from
  the AP Networking course page or the main nav is a theme or page-body edit, not
  a thing this repo owns.
- **Twelve topics still have no game**, and that is deliberate. They carry only
  `.A` and `.B` sub-skills, which a page and a quiz assess fairly.

## Learned

The hub was the piece most likely to rot, because a hub is a copy of a list that
lives somewhere else. Generating it from the same table the pages are built from
removes the copy entirely. The check that would have caught a stale hand-written
hub is worth having anyway, and it is what caught the injected defect above.
