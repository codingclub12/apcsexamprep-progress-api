# The full 144-post editorial calendar, built and validated

## What changed

Built the entire content engine (`lib/blog-house.js`, `lib/blog-validate.js`,
`lib/blog-publish.js`, `lib/blog-verify.js`, `content/editorial-calendar.js`,
`scripts/blog.js`) and then authored, independently re-validated, and committed
all twelve weeks of the 144-post calendar it drives: three posts a week
(brief/concept/drill) across all four courses (`ap-csa`, `ap-csp`,
`ap-cybersecurity`, `ap-networking`), spanning 2026-08-18 through 2026-11-03.

Final state, verified this session:

```
node scripts/blog.js validate   -> 144 posts, all pass
node smoke/blog-content.js      -> OK, all 588 checks passed
```

Every week's `weekStatus()` reports 12/12, missing: 0. `content/blog/*.js`
holds all 144 files. `content/editorial-calendar.js`'s `STREAMS` records every
post's handle against its planned slot.

## How the batch was produced

Each post was written by a separate background agent, briefed with: the house
component API, the validator's rules, an existing post as structural/voice
template, an explicit file path and `meta` block, and — critically, once the
corpus grew past a couple dozen posts — an instruction to grep every existing
post on the same course for topic/scenario/MCQ-stem overlap before writing,
and explicit differentiation notes wherever I could see a real collision risk
in advance (e.g. two posts both wanting the "college credit" angle, or a new
"common mistakes" post landing on ground six existing posts already owned).

Never trusted an agent's own validate run as sufficient. Every post was
independently re-run through `node scripts/blog.js validate` after its agent
reported done, and only confirmed-passing, confirmed-complete files were
committed — including holding files back mid-week when they were present on
disk and even passing validation, but had not yet sent an explicit completion
notification (a passing snapshot can still be mid-edit by a concurrent agent).

## What the agents caught that a single pass would have missed

- The AP CSA "common mistakes" and AP CSP "common mistakes" briefs both risked
  duplicating several already-published posts. Both writing agents grepped the
  existing ground first, explicitly linked out to it, and reported back exactly
  which existing posts they'd read and how many genuinely new items they found
  — one landed on 3 new mistakes instead of the working title's 9, and retitled
  honestly rather than padding.
- The AP CSA inheritance brief's own working title ("Inheritance Lost Its Unit.
  It Did Not Leave the Exam.") assumed a premise the writing agent then
  falsified by research: inheritance mechanics are explicitly marked *not*
  tested in the current 4-unit CED, not merely de-emphasized. The agent flagged
  the discrepancy and retitled rather than writing to the wrong premise.
- The AP CSP written-response format post's brief assumed a fixed month count
  ("Nine Months to the AP CSA Exam") copied from an earlier, different publish
  date. The writing agent recalculated against its actual publish date and
  retitled to the correct figure (seven months), sourcing the real exam date.
- A units/topics brief for AP Networking initially linked to an invented page
  path (`/pages/ap-networking-unit-1`) that didn't match any convention used
  elsewhere in the repo. Caught during my own pre-commit review (grepped for
  the pattern across all posts, found nothing), fixed by removing the link
  before committing — the one case this session where I edited a file myself
  rather than just gating on an agent's report.
- An indexing bug on my own part: I briefed one week's AP Cybersecurity concept
  slot using the wrong array index, so "application security" got written and
  published under the wrong week while the correct slot ("encryption
  explained") sat unwritten. Found while recording handles (`weekStatus`
  reported 11/12 instead of 12/12), fixed by swapping the two STREAMS entries
  rather than discarding the already-good content — no post was lost or
  duplicated, and the correct topic landed the following week instead.
- Several writing agents independently verified facts I'd assumed were shared
  across sibling courses and found they weren't: AP Cybersecurity and AP
  Networking are on different pilot timelines (Cybersecurity's first national
  exam is May 2027; Networking's is a full pilot cycle behind, first national
  exam May 2028), so their "college credit," "practice test," and "exam day"
  posts each needed independently verified, non-identical claims rather than
  copy-pasted structure with course names swapped.

## Evidence

- `git log --oneline` on `main` shows the full sequence of per-batch commits
  from this session, each naming which handles it added and why, plus the
  weekly "record N handles" commits and the two bug-fix commits (the invented
  link, the off-by-one week index).
- `node scripts/blog.js queue` reports the queue empty (`every planned slot has
  a post`).

## Still open

- **The Shopify connector still needs to be attached to the weekly publish
  Routine** (`trig_01SQ1u5W29s4jUJNbsVj39tc`) via the claude.ai Routines UI —
  unchanged since it was first identified, and the one step in this whole
  pipeline that requires a human. Until that happens, none of these 144 posts
  have gone anywhere near Shopify; they are all sitting validated in the repo.
  See `docs/content-engine.md`'s "Status" callout for the mechanics.
- No post in this batch has been through `scripts/blog.js verify` against a
  live page, because nothing has published yet. That check only becomes
  meaningful once the connector is attached and the Routine fires for real.
- The direct-to-`main` push pattern used for every content commit this session
  (as opposed to branch+PR) was not explicitly re-confirmed with the user
  mid-session; it followed the pattern already established for prior weeks'
  batches, which the user had seen many of via stop-hook-triggered pushes
  without objecting. Worth a direct confirmation if it comes up.
- Two courses (`ap-csa`, `ap-cybersecurity`) now each have a capstone
  "half-year review" post; `ap-networking`'s equivalent doubles as that
  course's first-ever study-guide/index post since no dedicated vocabulary
  post existed for it yet. If a future batch adds an AP Networking glossary
  post, the study-guide post should get a pass to link to it the way the CSA
  and Cybersecurity review posts already link to their courses' vocabulary
  posts.
