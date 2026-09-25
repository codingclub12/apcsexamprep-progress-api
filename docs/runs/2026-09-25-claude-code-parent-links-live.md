# The parent that does not link the child, and the number that was nearly wrong

Board 372, claimed as claim 375. Boards 422 and 423 opened for two taxonomy
defects this run found.

## What was asked

Board 372, which this session opened a week earlier while finishing 351: having a
declared parent is not the same as being linked by it, sampled at 6 of 11.

## What shipped

    lib/site-architecture.js            linksTo, parentIndex, missesIn
    scripts/verify-architecture-live.js the run. npm run verify:architecture
    smoke/site-architecture.js          50 assertions now, 8 source mutations
    docs/architecture-link-audit-*.md   the worklist, with its JSON beside it

## The cost estimate on the board item was wrong, in the good direction

It said about 380 hub fetches and 7 minutes. The real figure is **153 fetches**
and three minutes, because although 347 pages ARE hubs, only 153 of them have any
member claiming them. `parentIndex` is both the ranking and the fetch list.

## The correction that mattered

The first full run reported **432 member pages not linked** and that was the
headline. One hand check against a live page stopped it going out that way.

`ap-csa-lesson-2-3-if-statements` genuinely does not link its own `-debug`,
`-exercise-1`, `-exercise-2` or `-frq` pages. Its stored body carries four
outbound page links in total: exam prep hub, course, unit hub, previous lesson.
So far the report was right.

Then `ap-csa-unit-2-course` was checked and it links all four activities.

So those pages are REACHABLE, and calling them unlinked without that context
would have read as 432 orphans when the real orphan count is much smaller. 81 of
the 81 TOTAL rows are that same shape: CSA lesson pages across Units 2, 3 and 4
that are dead ends for their own activities.

The fix costs nothing, which is the part worth keeping. Every `/pages/` handle in
all 153 bodies is collected during the run anyway, so each miss can be asked
whether ANY hub links it:

    distinct members missed      432
      linked by ANOTHER hub      188   reachable, own parent is a dead end
      linked by NO hub read      244   the serious case

244, not 432. CSP 167, cyber 51, CSA 16, Intro to Java 10.

The shape of that mistake is worth naming because it is not carelessness: the
measurement was correct and the INFERENCE from it was wrong. "Not linked by its
parent" and "unreachable" are different claims, and only one of them was measured.

## A plain includes() would have been wrong 52 times

`linksTo` exists because `/pages/ap-csa-lesson-4-4-traversing-arrays` is a
substring of `/pages/ap-csa-lesson-4-4-traversing-arrays-frq`. A hub that links
only the FRQ reads as linking the lesson too.

Measured on the live handle set: **52 of 712 parented pages are a strict prefix of
another live handle**, so 7.3% of every verdict depended on the boundary, and the
error runs in the quiet direction. It reports a page as reachable when it is not.
Concentrated in the CSP lesson pages, whose `-notes` and `-exercise-2` siblings
are both live.

## Two taxonomy defects, found by running it rather than reading it

Both are in `lib/link-graph.js` and both are filed rather than fixed, because that
module is shared, carries 118 offline assertions, and changing it moves clusters.

**Board 422.** `stemVariants` loops over every unit word for a number, so family
`ap-csp-bi-3` emits `ap-csp-topic-3` as a variant and the resolver crowns
`ap-csp-topic-3-1-code`. In CSP, Big Idea 3 is a unit and Topic 3.1 is a lesson
inside it. `bi3` against `big-idea-3` is genuinely one thing and that alias must
stay; `topic-3` is not. This is how one page ended up the declared parent of 41
pages it links none of, and it is the same class as the cyber 3.3/3.4 swap.

**Board 423.** `resolveClusters` applies its ACTIVITY guard in the `memberHub`
branch and not in the `stems` branch directly below it, so an activity page from
outside the family can still be crowned. `ap-csp-topic-5-1-exercise-1` is the
declared hub of 20 Big Idea 5 pages. CLAUDE.md states this rule explicitly and
names the exact failure it prevents.

Two of the four ACTIVITY-shaped parents are `ap-cybersecurity-unit-N-practice`,
which may be DELIBERATE per-unit practice hubs from boards 207, 220 and 238. That
is a judgement call and it was left in the board item rather than decided here.

## One reading of mine that was wrong, and how far

Mid-investigation this session concluded that 78.2% of parentage was
"alias-guessed" and therefore weak. That was wrong. `hubAlias` is set by THREE
different fallbacks and only the last is a guess by its own admission; the first
is the legitimate "a hub is a member of its own family" case that gives every
lesson its own activities. A second attempt, splitting by same-family against
cross-family, was also too blunt: it flagged the whole FRQ archive, where
`ap-csa-2004-frq` under `ap-csa-frq-2004` is the reversed-token-order irregularity
CLAUDE.md lists as legitimate.

The taxonomy rabbit hole was abandoned in favour of letting the measurement speak,
and it did: a parent that links none of 41 members is visibly wrong without any
classifier.

## Evidence

- `npm run verify:architecture`, full run, 153 of 153 parents read, zero
  unreadable, exit 0. Output and JSON committed as
  `docs/architecture-link-audit-2026-09-25.*`.
- Hand verification of one TOTAL row against the live page, then of its unit hub,
  which is what produced the correction above.
- `npm run smoke:architecture` 50 passed, 0 failed, including 8 source mutations.
- `npm run smoke:storefront` covers the new script for no-UA and module use.
- `scripts/site-architecture.js --check` clean after rebuilding the config, which
  the ratchet had asked for: the live site gained 6 pages in the week and
  **parentless stayed at 241**, so none of the new pages shipped orphaned. The
  fetch list stayed 153 and parented stayed 712, so the run's numbers match the
  config that ships with it.

## Still open

- **The 244.** Recorded, not fixed. The 36 PARTIAL rows are the hub-down wins;
  `ap-cyber-unit-5-lesson-1` missing 28 of 31 is the biggest single one.
- **Boards 422 and 423**, the taxonomy defects, which the 81 TOTAL rows depend on.
- "Linked by no hub" means no hub among the 153 read. An ordinary page could still
  link one of the 244. Only the full crawl settles it, and this is deliberately
  the cheap approximation rather than a replacement.
- **Board 424**, the 81 CSA lesson pages that are dead ends for their own
  activities. Not orphans, so they fit neither 351 nor 372, which is exactly why
  they needed an item of their own rather than a paragraph in a run note.
