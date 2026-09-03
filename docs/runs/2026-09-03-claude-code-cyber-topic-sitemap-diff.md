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
