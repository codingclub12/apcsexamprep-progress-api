# 2026-09-03: Sitemap diff for Session D (24 cyber topic pages, practice hubs, internal linking)

## What this is

Session D (`SESSIONDtopicpagesandhub.md`, handed to this session directly) requires,
as a hard prerequisite, a real sitemap diff against the architecture handoff's Part 0
inventory before generating any of the 24 topic pages, because the handoff's audit
"could not retrieve" `sitemap.xml` and worked from a nav/search lower bound instead.

No prior sitemap diff or "Session C" artifact exists anywhere in either repo (checked
`docs/`, `content/`, root markdown, `docs/runs/*`, git log/history in both repos via a
dedicated search pass). This note is that diff, produced live against
`https://www.apcsexamprep.com/sitemap.xml` on 2026-09-03.

**Note on scope: the sitemap fetch worked cleanly this session** (HTTP 200, all five
child sitemaps reachable, 1,362 page URLs enumerated from `sitemap_pages_1.xml`). The
prior audit's inability to retrieve it does not reproduce here; treat that as resolved
rather than still-open.

## The two questions Session D asked to be resolved

### 1. Do Unit 4 and Unit 5 Cyber exams exist?

**Yes, both.** Confirmed live in the sitemap:
- `/pages/ap-cyber-unit-4-exam`
- `/pages/ap-cyber-unit-5-exam` (plus `/pages/ap-cyber-unit-5-practice-exam`)

Units 1-3 exams also present (`ap-cyber-unit-1-exam`, `ap-cyber-unit-2-exam`,
`ap-cyber-unit-3-exam`). The hub's assertion that they exist was correct.

### 2. What are the legacy topic-name handles?

`ap-cybersecurity-unit-1-social-engineering`, `ap-cybersecurity-unit-2-cyber-foundations`,
and similar are live (200) and **are not orphaned/legacy** in the sense Session D assumed.
Per board task **#81** (open, owner=tanner): Units 1-2 never got numbered base lesson
pages (`ap-cyber-unit-N-lesson-M`) the way Units 3-5 did — content for Units 1-2 lives
directly at these topic-slug URLs instead. They are the primary Unit 1-2 lesson content,
confirmed still linked from the live course hub's unit-by-unit list. This is a bigger,
already-tracked architecture question (naming scheme for Units 1-2), not a dead-link
cleanup, and #81 already routes it to Tanner as a decision. T-1.9's "resolve legacy
handles, redirect what 404s" doesn't apply to these — none of them 404.

## The bigger finding: T-1.3's premise does not match live state

Session D assumes 24 topic overview pages need to be **created**. Live state disagrees:

- `/pages/ap-cybersecurity-topics` already exists and is exactly the topic-index/hub
  page T-1.3 implies doesn't exist yet: H1 "AP Cybersecurity Topics Index | All 5 Units
  & Every Concept," organized by unit, linking ~39 individual topic pages.
- Those 39 pages (e.g. `/pages/ap-cybersecurity-xss`, `-sql-injection`,
  `-man-in-the-middle`, `-firewalls`, `-mfa`, ...) are confirmed live, full topic-overview
  pages, not stubs: `ap-cybersecurity-xss` alone runs ~2,000-2,500 words with vocabulary,
  worked scenarios with reveal-answer interactions, skill-category breakdown, and
  comprehension-check questions — i.e., they already match T-1.3's spec ("what the topic
  covers... vocabulary... two or three worked scenarios... skill categories").
- These 39 pages are NOT yet linked from the main course hub's unit-by-unit list (that
  list still points at the Unit 1-2 topic-slug pages and Unit 3-5 numbered lesson pages
  covered under #81), only from `/pages/ap-cybersecurity-topics`.

So the live count of standalone cyber concept/topic pages is closer to 39 than 24, and a
real, well-built index page already exists. Generating "24 new" topic pages now, without
reconciling against these 39, is the exact duplicate-page mistake Session D itself warns
is "the most expensive available mistake in this program."

## T-1.4 / T-1.5: confirmed genuinely missing (no premise problem)

- `/pages/ap-cybersecurity-practice-tests-by-topic` (T-1.4 target handle): **does not
  exist**. CSA and CSP mirrors do (`ap-csa-practice-tests-by-topic`,
  `ap-csp-practice-tests-by-topic`). This part of Session D is real, open work.
- `/pages/ap-cybersecurity-practice-exams` (T-1.5 target handle, plural/hub): **does not
  exist**. `ap-cybersecurity-practice-exam` (singular) does and is a different page. CSA
  and CSP hub mirrors exist (`ap-csa-practice-exams`, `ap-csp-practice-exams`). Real, open
  work.

## T-1.9: confirmed accurate

Fetched `/pages/ap-cybersecurity-complete-course-guide` live. Confirmed: Practice section
(practice questions, practice exam, study guides, topics index) sits **after** the full
unit-by-unit list, not above it, matching T-1.9's described problem exactly. This part of
Session D's premise holds and is real, open work — restructuring is safe to do
independent of the T-1.3 question above.

## Session C prerequisite: unresolved, not found

Session D's other hard prerequisite is "Session C complete, with a green-per-rule
mutation report" (the content validator these 24 pages would generate through). No file,
commit, doc, or run note in either repo uses a lettered "Session A/B/C/D" naming scheme,
and no content validator + mutation report artifact exists. This cannot be verified as
satisfied and is not something this session can produce standing in for a prior session
it has no record of.

## What is still open

- Whether to proceed with T-1.3 at all in its current form, given the 39 existing pages,
  or reframe it as "audit the 39 against the 24 CED topics, add anything missing, wire
  the hub to point at them instead of the Unit 1-2 topic-slug pages" — this last piece
  overlaps board #81, which is explicitly owner=tanner.
- Where "Session C" and its validator live, if anywhere, before generating any new topic
  page content.

T-1.4, T-1.5, and T-1.9 (independent of the #81 slug-scheme question) do not depend on
either open item above and are safe to execute now.

## 2026-09-03, later: sample verification, and two live blockers found

Tanner's reply confirmed the reframe (T-1.3 becomes reconciliation, T-1.1 is the
arbiter, Session C gates any shipped sheet) and asked for a 3-page sample check before
trusting "these 39 pages match the spec" as anything more than a look-alike claim. Two
things surfaced while doing that.

### T-1.1 (#181) and T-1.2 (#182, this is Session C) are already claimed

Both show `in_progress`, both were claimed by `claude_code` within the last 15-25
minutes when checked, both routed the way this file's own routing table would route
them (T-1.1 sonnet, T-1.2 opus). `apcs claim 181 --lock api:data/cyber-topics.json`
returned a 409 naming `claude_code` as holder on claim #66. A probe claim on #182 with
a different lock path succeeded (its 4 existing locks are on other files), so it was
released immediately rather than compounding a partial claim on a task someone else is
mid-flight on. **Not duplicating this work.** If this sibling session has stalled by the
time anyone reads this, `apcs release` and re-claim is the way in, not `--force` while
it might still be running.

### Sample verification: 3 pages, checked against the actual T-1.3 content contract

Fetched raw HTML (not summarized) for `ap-cybersecurity-mfa`, `ap-cybersecurity-firewalls`,
`ap-cybersecurity-sql-injection` and checked each element of T-1.3's spec directly:

| Page | Self-labeled topic | Worked scenarios | Explicit "skill category" label | Resolving practice-set link | EK code in visible text |
|---|---|---|---|---|---|
| ap-cybersecurity-mfa | Topic 1.2 | yes (`cyc-scn` blocks) | no | no (can't - T-1.4 doesn't exist) | **yes: "(EK 1.1.C.2)" inline in a `<p>`** |
| ap-cybersecurity-firewalls | Topic 3.4 | yes | no | no (can't - T-1.4 doesn't exist) | no |
| ap-cybersecurity-sql-injection | Topic 5.1 | yes | no | no (can't - T-1.4 doesn't exist) | no |

The EK-code hit was confirmed with the canonical tool, not a hand grep:
`lib/cyber-ek-density.js`'s `summary()` against the fetched body reports
`{"total":1,"kept":0,"cut":1}` for the mfa page (one citation, zero protected by any of
the three allowed structural exceptions) and `{"total":0}` for the other two. So this is
a real, live violation of the CLAUDE.md rule, not a false positive: "(EK 1.1.C.2)" sits in
plain body prose, not inside the coverage table, a not-assessed claim, or an answer key.

Net: **"matches the spec" was too generous.** None of the 3 sampled pages carries an
explicit skill-category mapping (may be a real gap or may be implicit in a way a human
should judge, not something a script should decide). None can satisfy the practice-link
leg of the spec today regardless of content quality, because the target doesn't exist
yet - which argues for building T-1.4 before finishing any ADOPT/RETITLE decision, so
that leg of the check is even assessable. And at least one of 39 has a genuine,
CED-rule-violating leak that has nothing to do with taxonomy alignment.

### The bigger complication: the underlying lesson content is not stable ground either

`docs/ap-cyber-units-2-5-ced-audit.md` and `docs/cyber-unit-1-ced-alignment.md` (both
dated 2026-08-27, already in this repo, not previously connected to Session D) found,
independent of any topic-index work:

- Unit 3's numbered lessons 3.3 and 3.4 are swapped against the CED (site 3.4 teaches
  Segmentation, CED 3.4 is Firewalls) - and the standalone `ap-cybersecurity-firewalls`
  page sampled above self-labels "Topic 3.4" and is *actually* about firewalls, meaning
  the standalone topic page and the numbered lesson page that nominally share a topic
  number teach different content.
- Three site lessons (2.5, 3.6, 4.5) are taught as full graded lessons with no CED
  counterpart at all.
- Unit 2 carries five orphaned legacy pages that write to the same `lesson_id` as their
  CED-aligned replacements.
- Board #99 and #98 were filed against a stale reading of the CED and should be closed
  or re-read, not worked as filed.

None of this blocks the reconciliation audit once T-1.1 lands (the audit can and should
use the true CED topic numbers regardless of what the numbered lesson pages currently
claim). But it does mean T-1.9's "resolve the legacy handles" step and any hub link that
points at a numbered lesson page by number are picking a side in an unresolved,
already-documented, tanner-owned fix list (the audit's own "Suggested order," items 1
and 5) - not a clean redirect decision. Flagging this so it isn't rediscovered as a
surprise mid-sheet.

### Still needed from Tanner

- The Session A document/brief (the corrected CLAUDE.md mojibake-pattern fix). No board
  task or file under that name exists in either repo; nothing to run without it.
- Whether to proceed drafting T-1.5 and the practice-block half of T-1.9 now (unblocked,
  hold-for-Session-C on shipping) while T-1.1/T-1.2 finish elsewhere.
