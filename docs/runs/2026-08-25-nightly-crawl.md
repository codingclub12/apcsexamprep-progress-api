# 2026-08-25 nightly site crawl

Shard 7 of 7. 316 of 2,006 sitemap URLs, 595 requests, 726 seconds, **zero 429s**,
no abort, no truncation. API build `c7cd1d2`.

**0 P0, 1 P1, 3 P2.** One new finding, and it is real.

## P1: Big Idea 3 unit test is a dead link from BI3 exercise pages

`/pages/ap-csp-course-bi3-unit-test` returns **404**. It is linked from the
"Where to go next" footer as **"Big Idea 3 unit test"**.

Verified by hand, and the shape of it is exact:

| Handle | Live |
|---|---|
| `ap-csp-course-bi1-unit-test` | 200 |
| `ap-csp-course-bi2-unit-test` | 200 |
| **`ap-csp-course-bi3-unit-test`** | **404** |
| `ap-csp-course-bi3-unit-test-part-a` | 200 |
| `ap-csp-course-bi3-unit-test-part-b` | 200 |
| `ap-csp-course-bi4-unit-test` | 200 |
| `ap-csp-course-bi5-unit-test` | 200 |

Big Idea 3 is the only one whose unit test is split across two sittings, which
`utils.js` states outright in `pageFromHandle`: "Big Idea 3 is split across two
sittings, part A and part B, and they stay SEPARATE lessons on purpose." So there
is no `bi3-unit-test` page and there was never meant to be one.

Two link builders emit the handle from a uniform `bi{N}-unit-test` template,
which is right for four Big Ideas and wrong for the fifth:

- `lib/csp-exercise-pages.js:329`
  `<a href="/pages/ap-csp-course-bi${bi}-unit-test">Big Idea ${bi} unit test</a>`
- `lib/csp-course-pages.js:357`
  `<a href="/pages/ap-csp-course-bi${bi.n}-unit-test">Sit the ... unit test</a>`

**The codebase already knows BI3 is special in three other places** and none of
that knowledge reached these two lines:

- `scripts/csp-command-center-exercises.js:78-79` lists `bi3-unit-test-part-a`
  and `-part-b` explicitly
- `lib/lesson-links.js:107-109` handles `unit-test` and `unit-test-part-a`
- `utils.js` `pageFromHandle` parses both forms

Confirmed as a rendered anchor, not script text:
`<a href="/pages/ap-csp-course-bi3-unit-test">Big Idea 3 unit test</a>` on
`/pages/ap-csp-topic-3-11-exercise-2`.

**Blast radius.** 7 of the 21 BI3 pages in this shard carry it. At a 1-in-6.3
sampling rate that is roughly **44 pages sitewide**, and 72 BI3 topic pages are
live. Treat 44 as an estimate from a sample, not a count.

**Who it hurts.** A student finishes a Big Idea 3 exercise, clicks the one link
offered for what to do next, and lands on a 404. `utils.js` calls the Big Idea
unit tests "the highest stakes assessment in CSP", six tests and 84 authored
questions. Part A and part B are both live and reachable by URL; nothing links
to them from here.

**Proposed fix**, not applied, because this job reads: make both builders ask for
the Big Idea's actual test pages rather than assuming one per Big Idea. The
mapping already exists in `scripts/csp-command-center-exercises.js`; the honest
fix is to lift it into a shared helper both builders call, so the next place that
needs it is the fourth caller and not the fourth copy. A one-line special case
for BI3 in each file would also work and would be the fourth place this fact is
written down.

**Not the same as board #91** (`CSP bundle links to exercise pages that do not
exist`, in_progress). That one is bundle to exercise page. This is exercise and
course page to unit test. Same family, different target, and worth handling
together.

## P2: three pages with no meta description

`/collections/ap-csa`, `/collections/live-events`, `/pages/java-editor-test`.

Per the playbook these are reported as a count and a pattern, not verified one by
one. Two of the three are **collections**, which are commercial pages, so this is
worth more than the tier suggests.

`/pages/java-editor-test` is at **2 nights** and is the more interesting one: it
returns 200, carries no `noindex`, and sits in the public sitemap. The missing
meta description is the smaller half. A page called Java Editor Test has a front
door.

## Board cross-reference

- **#79** "46 pages returned 429 during crawl, re-verify single-threaded". This
  run is direct evidence: **595 requests single-threaded at 1/s produced zero
  429s and zero connection errors.** The original 46 came from a 14-thread crawl.
  That supports concurrency as the cause rather than page health, though it is
  not proof for those specific 46 URLs unless they were in this shard.
- **#73** "101 pages have zero inbound internal links". Not addressed. The
  crawler records which targets are linked from crawled pages, so a `--full`
  run could produce that list directly. Sharded nights cannot.
- **#91** CSP dead links. Related, see above.

## Coverage and what tomorrow inherits

316 page fingerprints stored, up from 130. Every one is a baseline for the
regression checks, so from tomorrow a page that loses its reporter or its graded
widgets is caught by comparison rather than inference.

The delta carried `java-editor-test` forward correctly at 2 nights, which is the
first live proof that age tracking works across runs.

Nothing was written to the ledger. Nothing on the site was changed.
