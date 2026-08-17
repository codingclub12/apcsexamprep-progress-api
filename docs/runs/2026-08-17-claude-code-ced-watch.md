# 2026-08-17 - CED watch, and why more pages was the wrong answer

Agent: Claude Code. Branch: `claude/course-networking-strategy-8chhni`, off `main`.

## What was asked

Two questions. AP Networking has one purchaser and the goal is to be the primary
course for teachers next year, so should we publish more pages speculatively in
case they happen to match College Board's eventual topics. And separately, would
a weekly internet scan for course updates be worth having.

## The first answer is no, and the reason is not taste

College Board has already published the AP Networking course framework at
`apcentral.collegeboard.org/media/pdf/ap-networking-course-framework.pdf`, and
the four units are named: Managing My Connections, Managing My Shared
Connections, Managing Many Connections, Managing Our Global Connections. The
live `/pages/ap-networking` already runs 4 units and 22 topics against that same
structure. There is nothing to guess at, so speculative pages buy no coverage
and cost real crawl budget, on a site that already has 101 pages with zero
inbound internal links (task 73) and 46 pages that returned 429 during a crawl
(task 79).

`lib/command-hazards.js` already encodes the general form of this rule for the
networking block: inventing curriculum is worse than an empty block, because a
wrong lesson title is then injected verbatim into every future prompt.

## The one purchaser is a market ceiling, not a content gap

The 2026-27 AP Networking pilot is the third and final pilot, and eligibility is
restricted to schools that already participated in a prior AP Networking or AP
Cybersecurity pilot. National launch is 2027-28 and the pilot exam is
multiple-choice only, May 2027. So the set of schools permitted to teach the
course this year is small and closed, and no amount of new content moves it.

The consequence for sequencing: AP Cybersecurity reached national launch in
2026-27, which is now. It is the course with an open national market this year,
it is the course that already has working grade reporting into this API, and its
pilot schools are the only other pool eligible for AP Networking. Tasks 92 and
93 therefore do more for AP Networking than any new AP Networking page would.

## What shipped

A weekly change detector over sixteen first-party College Board URLs.

- `config/ced-sources.json` - the watch list. First-party only. Every URL was
  opened before it was added, because a permanently 404ing source reports
  UNREACHABLE every week and a weekly alarm that is always wrong gets muted.
  Seven are marked critical, including both live CED PDFs.
- `scripts/ced-watch.js` - fetch, normalize, hash, diff, report. Exit 0 nothing
  changed, 10 something changed, 1 the run compared nothing.
- `.github/workflows/ced-watch.yml` - Mondays 09:30 UTC, clear of the three jobs
  already on the clock. Opens or updates one long-lived draft PR.
- `docs/ced-snapshot/` - the committed baseline, empty until the first run.

### Why it runs in Actions and not as a Routine

`apcentral.collegeboard.org` is not on the agent proxy's allowed-domains list.
Measured, not assumed: the real watch list scored 16 of 16 HTTP 403 from this
session. Actions runners do not use that proxy, so the workflow works today and
a scheduled session would not. Adding the domain to Custom allowed domains would
only be needed to let a session read College Board directly.

### The failure mode this is actually built against

Hashing raw bytes would flag all sixteen sources every week, because AP Central
serves rotating script nonces and build fingerprints. A watcher that cries wolf
weekly gets ignored, and then a real CED revision lands silently. So the script
strips scripts, styles and comments, erases known-volatile tokens, and hashes
visible text only. It also refuses to store a page that normalizes to under 500
characters, since a bot wall served as HTTP 200 would otherwise wipe a good
baseline and produce a spectacular fake diff next week.

## Evidence

Verified against reachable pages, since the real sources are egress-blocked here:

- Baseline creation on first run, exit 0.
- Second run against the same live pages: "nothing changed", exit 0. No false
  positive on a real Shopify page between two fetches, which was the risk.
- Simulated last-week state: readable line diff, critical source sorted first,
  exit 10.
- A baselined source that starts failing: reported as unreachable, and its
  previous hash and stored text both survived untouched. An unreachable source
  must never overwrite a good baseline with a failure, which is the same shape
  of bug as caching the wrong filename in `nightly-sweep.yml`.
- The real sixteen-source config from this session: all 403, fail-loud, exit 1,
  with the diagnostic naming the allowed-domains fix.

One display bug was found and fixed during testing: the stored snapshot's
trailing newline appeared as a phantom removed blank line in every diff.

## What is still open

- The baseline does not exist yet. The first scheduled Actions run creates it
  and opens the first PR. Until then there is nothing to compare against.
- The watcher detects change. It does not decide what a change means for the
  published pages, and deliberately does not write to the ledger.
- The depth question is unanswered by this pass. The 22 published AP Networking
  topics have not been audited against the framework's own learning objectives
  or against the CompTIA Network+, Cisco CCNA and CCST overlap, which is where
  non-speculative depth actually lives.
- Decision task 15 is the right home for the distribution strategy above.
