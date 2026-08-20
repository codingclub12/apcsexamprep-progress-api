# 2026-08-20 - Linking the study games from the AP Networking course page

## What was asked

"imported them all, now link the hub from the course page"

## First, the import was verified

All ten games and the hub answer 200 on the live site, each game mounts its
leaderboard and dispatches a score, and the hub links all ten.

```
200 harden-first     init=1  h1='Harden First'
200 address-autopsy  init=1  h1='Address Autopsy'
200 ai-audit         init=1  h1='AI Audit'
200 segment-sort     init=1  h1='Segment Sort'
200 guest-gate       init=1  h1='Guest Gate'
200 subnet-sprint    init=1  h1='Subnet Sprint'
200 rule-order       init=1  h1='Rule Order'
200 shell-hop        init=1  h1='Shell Hop'
200 packet-path      init=1  h1='Packet Path'
200 log-hunt         init=1  h1='Log Hunt'
200 hub  cards=10   h1='AP Networking Study Games'
```

## The page, and how its body was obtained

The course page is `/pages/ap-networking`, "AP Networking Course Guide: All 4
Units and 22 Topics", Page/135440007383, last edited 2026-08-07.

Its stored Body HTML came from the Shopify Admin API, not from a hand-retype and
not from the rendered page. The extraction was then PROVED faithful rather than
assumed:

- 22 lesson links and 4 unit-overview links, matching the API response
- div opens and closes balanced at 18 each
- four `-&gt;` entities preserved and zero bare `->`, so entity encoding survived
- three long strings spot-checked byte-for-byte against the API response
- starts with the stored `<style>` tag and the `#apnet-hub` wrapper, which is the
  tell that separates a stored body from one scraped off the rendered page

That last point matters: a scraped body usually begins at the wrapper div and
drops the page's own stylesheet, which imports cleanly and renders unstyled.

## The change

`scripts/networking-course-games-link.js`, modelled on `csp-games-hub-patch.js`
because that script was written after this exact problem on the CSP side.

It adds one contents entry and one section, immediately before the exam heading,
so the games land after the units they draw on. Eleven new internal links: ten
games plus the hub.

The section uses ONLY classes the page already defines (`.unit`, `.u-eyebrow`,
`.u-focus`, `.badge`). A section that needs no new CSS is the smallest possible
change to a live page and it cannot render unstyled. The suite asserts it invents
no class, so that stays true.

**The topic labels are deliberately plain text and not badges.** The green badge
on that page currently means "this unit is live". Spending that signal on a topic
number would dilute the one thing it tells a reader today.

## What the script refuses to do

Every one of these is a way a live page gets damaged, and each is a test:

- the anchor appearing zero times, or more than once
- a body that already has a games section, so the patch is never applied twice
- a body missing the stored style tag, meaning somebody scraped the rendered page
- a body that is not this page at all
- any existing `/pages/` link disappearing
- div balance changing by anything other than the two the section adds
- output smaller than input, or under 4 KB

A Matrixify import with an empty Body HTML wipes the page and reports success,
which is why the size floor is a hard stop rather than a warning.

## Evidence

```
node scripts/networking-course-games-link.js body.html out.csv
  ap-networking: 20516 -> 22517 bytes
  added a contents entry, one section, and 11 links
  every check passed: div balance, no lost links, structured data intact

npm run smoke:netgames    185 passed, 0 failed   (was 161)
full offline suite        ALL 82 SUITES PASS
```

The suite fixture is synthetic on purpose. Committing a copy of the live body
would go stale the first time anyone edits the page in Shopify, and a stale copy
in a repo gets mistaken for the source of truth. What is tested is that the
script behaves correctly on a body with the right shape.

One test initially failed on the 4 KB floor because the fixture was unrealistically
small. The floor is real protection, so the fixture was padded rather than the
floor lowered.

## Still open

- **The sheet is not imported.** `course-page-patch.csv` is one MERGE row for
  `ap-networking`. It carries the full patched body, so it replaces the page body
  in place.
- **Re-running the script against the patched body will refuse**, by design. If
  the page needs re-patching later, fetch a clean body or remove the games
  section first.
- The games are not linked from the four unit pages or the nav. The course page
  is the highest-value single link; the rest can follow if it is worth it.
