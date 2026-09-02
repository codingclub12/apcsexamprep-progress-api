# The architecture reports, checked against live state, and 141 dead links fixed

2026-09-02, Claude Code. Branch `claude/ceo-agent-setup-sv4e61`.

## What was asked

Look through the architecture reports from previous days and solve some issues.

## What the reports said, and what is actually true today

`docs/runs/2026-08-27-claude-code-internal-linking.md` closes with a "Still open"
list. Every item on it was re-checked against the live site rather than believed:

| claim, 2026-08-27 | today |
|---|---|
| `/pages/ap-csa` and `/pages/ap-csp` store no body at all | still empty, and five more with them |
| `/pages/intro-java`, `/pages/ap-csp-exam-prep-hub`, `/pages/ap-csp-create-task`, `/pages/for-teachers`, `/pages/for-students` do not exist | all still 404 |
| two hrefs carry a percent-encoded newline inside the handle | both still live on the page |
| `/pages/ap-csa-study-games` 301s | still 301s, to `ap-csa-exam-prep-hub` |
| 480 pages with no inbound content link | not re-measured, see below |

Seven pages store an empty body: `ap-csa`, `ap-csp`, `quick-reference`,
`practice-exams`, `flashcards`, `bundles`, `ap-csa-premium-frq-solutions`. The
first two are the head-term URLs, are indexed, and carry authored meta
descriptions promising "all 4 units, 400+ exercises, a built-in Java editor and
FRQ solutions from 2004 to 2025". They are blank.

`docs/roadmap-gap-report.md` is a 2026-07-10 snapshot and is stale on two of the
things it flags. The mastery threshold clamp it calls 0 to 100 is now
`clampThreshold` with a 50 to 100 range, used at all three call sites. Phase 2,
which it calls the biggest gap, now has `lib/choice-grader.js`,
`lib/gap-grader.js`, `lib/quiz-order.js` and `routes/quiz.js` behind it. Neither
is work that still needs doing.

## The measurement

Every `/pages/` href in the stored body of all 1,311 readable pages, checked
against the 1,344 handles the sitemap advertises. Bodies come off the storefront
so this is authored content, never theme chrome.

**516 dead internal links across 163 targets.**

The 2026-08-27 report says 3. That number came from a different question, "did
the target return a non-200 during the crawl", and it undercounts by two orders
of magnitude. The question here is cheaper and stricter: is the target handle in
the sitemap at all.

The clusters worth a decision, all listed with their sources in
`docs/dead-internal-links-2026-09-02.md`:

| target | links | what it is |
|---|---|---|
| `/pages/tutoring`, `/pages/ap-computer-science-tutor`, `/pages/tutoring-packages` | 58 | the tutoring pages are gone. Board 76 asks whether the tutoring products are in the discontinue scope, so these 58 links are waiting on that answer. |
| `/pages/ap-computer-science-a` | 20 | the head term, 404. The live URLs are `ap-csa`, which is blank, and `ap-csa-exam-prep-hub`, which is the real hub. Which one to point at IS the consolidation decision, still blocked on Search Console. |
| `/pages/'+prev.handle+'`, `/pages/'+next.handle+'` | 28 | a JavaScript template literal written into stored HTML unrendered. Fourteen practice-test pages have prev and next buttons whose href is source code. |
| `/pages/ap-csa-qotd-hub`, `/pages/ap-csp-qotd-hub` | 19 | neither exists. CSP and Cyber have a question-of-the-day page; CSA does not. |
| `ap-cybersecurity-unit-1-*-exercise-1/2/lab/quiz` | 40 | eight Unit 1 activity pages linked from the cyber lesson pages and never built. This is the cyber practice hub not being architected, measured. |
| `/pages/ap-csp-full-practice-exam-70-mcq` | 4 | the highest-earning page on the domain is `ap-computer-science-principles-full-practice-exam-70-mcq`, at 34,857 clicks. Four links point at a handle it does not have. |

## What shipped

`imports/2026-09-02/dead-link-repair-pages.csv`, 45 pages, **141 links**, under
three grounds and no fourth:

| rule | links | grounds |
|---|---|---|
| typo | 2 | a character that cannot legally be in a handle, deleted, and the result is live |
| retarget, by hand | 26 | two entries read off the live site, each carrying its evidence |
| retarget, unique extension | 113 | the target is the ONLY live handle that extends the dead one |

The 379 that remain are enumerated and left alone. A dead link whose repair
cannot be proved must never be invented, because inventing one hides a page that
was never built.

## Two things this got wrong first

**A rule that was provable and still wrong.** The generator had a second rule: a
correctly spelled handle that is not a page but IS a live blog only has the wrong
section, so `/pages/ap-csa-daily-practice` becomes `/blogs/ap-csa-daily-practice`.
That is provable. It is also the wrong destination. The button says "Start daily
practice" under a heading offering the question by email, and `/pages/daily-practice`
is live with `<h1>AP CSA Daily Practice</h1>`. The handle was not right with the
wrong section in front of it; the handle was simply wrong. A rule that moves a
URL between sections is deciding what KIND of thing the reader lands on, which is
a content decision wearing a typo's clothes. The rule is gone and those two links
are now a named map entry with the evidence beside them.

**A mutation that survived, and was right to.** The battery broke
`stripIllegal`'s character class from `[^a-z0-9-]` to `[^a-zA-Z0-9-]` and the
suite stayed green, because `toLowerCase` runs first and no uppercase letter ever
reaches it. The guard that does the work is the case fold, so that is what the
mutation breaks now, and there is a test for an uppercase handle folding to its
live lowercase target.

There was a third, caught before it shipped: the `live` check first asserted that
the repaired pages link `/pages/daily-practice`. The rendered page already links
it eight times from the theme chrome, so that assertion was true before the
import, during it, and if it never happened. The check now asserts the ABSENCE of
`/pages/ap-csa-daily-practice` and of `%0A`, which is false today on all three
pages.

## Evidence

- **suite**, 83 assertions, offline, `npm run smoke:deadlinks`. The live handle
  list and the 45 before-bodies are checked in, so the evidence survives the
  change that removes it.
- **mutation**, 5 of 5, each tripping the assertion it targets.
- **rederive**, `scripts/verify-dead-link-sheet.py`. It blanks every href out of
  the before body and out of the after body and requires what is left to be
  identical, which is one statement that nothing outside a link attribute moved
  and does not care how the edit was made. It does not import the retarget map;
  it re-derives the uniqueness property and keeps a two-entry by-hand list.
  Mutation-tested against a byte changed outside a href, an invented target, an
  unmapped retarget, a plausible but wrong typo repair, a wrong Command and a
  no-op row.
- **rederive**, the preflight over the finished file, with the live bodies passed
  as `--carrying` so that an emoji this sheet ADDED is separated from one it
  round-tripped. Without it the sheet is refused, which is the correct default.
- **live**, deferred until the import.

## Still open

- The import. One sheet, handed over; I do not import.
- 379 dead links, 142 targets, the six clusters above. Board 156.
- Seven pages with an empty body, two of them the head-term course hubs.
- The `'+prev.handle+'` template literal on 14 pages. Board 157.
