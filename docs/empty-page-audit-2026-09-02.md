# The seven pages that store nothing, measured 2026-09-02

Every one of the 1,344 published pages the sitemap advertises, fetched
single threaded with a browser User-Agent, and its STORED body recovered from
the rendered HTML by `scripts/extract-live-body.js`. Zero throttling, zero
non-200s, one page on a template this instrument cannot read.

```
node scripts/empty-page-sweep.js \
  --handles smoke/fixtures/live-page-handles.txt --out sweep.jsonl --delay 800
```

The evidence is checked in at `smoke/fixtures/empty-page-sweep-2026-09-02.jsonl`,
one row a page. Findings decay: re-run the command rather than trusting the
table.

## Why a rendered measurement cannot answer this question

`/pages/ap-csa` serves 354,518 bytes. It has an `<h1>`, a contact form, a nav
and a footer, and it returns 200. Measuring what it SERVES therefore measures
the theme and calls it content. The only honest question is what the page
itself stores, and the answer is zero characters.

## The threshold, and the two pages that corrected it

The first threshold was authored TEXT inside the stored body, under 40
characters. It is wrong, and the store says so:

| handle | stored | authored text | rendered main text |
|---|---|---|---|
| `ap-csp-test-builder` | 496,715 | 0 | 1,561 |
| `java-editor-test` | 497 | 0 | 1,537 |
| `ap-csa` | **0** | 0 | 1,448 |

`ap-csp-test-builder` is a half-megabyte client-side application. Its whole body
is one `<script>`, so every text extractor in this repo strips it before
counting, and it builds its DOM in the browser, so its rendered main text lands
within 120 characters of the empty shell. A text measure calls it empty. A
rendered measure calls it empty. It is a working page linked from the site
navigation.

So the threshold is the stored body itself, and it is **exactly zero**. The
distribution supports no other choice: the seven store 0, the next smallest
stores 497, and there is nothing in between.

`java-sandbox-embed` renders 108 characters of main text and is reported
UNRESOLVED, not empty: it is on a template with no rte wrapper, and a page this
instrument cannot read is not a page proved empty.

## The seven

| # | handle | rendered main text | same-handle collection | products in it |
|---|---|---|---|---|
| 1 | `ap-csa` | 1,448 | `/collections/ap-csa` | 16 |
| 2 | `ap-csp` | 1,448 | `/collections/ap-csp` | 16 |
| 3 | `ap-csa-premium-frq-solutions` | 1,549 | `/collections/ap-csa-premium-frq-solutions` | **0** |
| 4 | `bundles` | 1,528 | `/collections/bundles` | 5 |
| 5 | `flashcards` | 1,531 | `/collections/flashcards` | 11 |
| 6 | `practice-exams` | 1,535 | `/collections/practice-exams` | 3 |
| 7 | `quick-reference` | 1,536 | `/collections/quick-reference` | 2 |

**Seven of this store's TEN collection handles are exactly these seven page
handles.** The store has ten collections: the seven above plus `frq`,
`tutoring` and `live-events`. That is not a coincidence and it is the first
thing to understand about this set: these pages shadow the shop's collection
structure.

They are not app droppings, though. All seven carry a hand-written SEO title
and meta description, and two of them have been rolled to 2026-27 by hand. The
1,448 character shell is the page title plus the store's global contact widget,
which is 1,441 characters and identical on every page.

## Where the content actually lives

`/pages/ap-csa` and `/pages/ap-csp` are the only two where a single populated
page makes the same promise the empty page makes:

| | the empty page says | the populated page says |
|---|---|---|
| `ap-csa` | "Free full-year AP CSA course for 2026-27: all 4 units, 400+ exercises, a built-in Java editor" | `ap-csa-course`: "400+ practice exercises, built-in Java code editor on 39 skill lessons" |
| `ap-csp` | "all 5 Big Ideas, Python labs, Create Task guidance and exam practice" | `ap-csp-course`: "all 5 Big Ideas with Python labs, Create Task prep and exam practice" |

The other five have TWO plausible destinations each, and choosing between them
is a commercial decision rather than a repair:

- `flashcards`, `practice-exams`, `quick-reference` each shadow a paid
  collection AND have free course-specific twins. `/pages/flashcards` promises
  "AP CSA and AP CSP digital flashcards"; the free twins are
  `ap-csa-flashcards` and `ap-csp-flashcards`, which are two pages, not one.
  Sending a course-generic URL to one course picks a course for the reader.
- `bundles` promises "a bundle discount". Routing a discount landing page is
  money, which is on the NEVER_AUTO list.
- `ap-csa-premium-frq-solutions` has nowhere to go at all: the collection it
  shadows holds zero products, and the nearest populated page,
  `ap-csa-frq-archive`, is the FREE archive. Redirecting a premium landing page
  onto free content is a pricing decision.

## Nothing here is in the navigation

The theme header and footer carry 261 internal links across 154 distinct
targets. None of the seven is among them. The nav links `/pages/ap-csa-course`
(3 references) and `/pages/ap-csa-exam-prep-hub` (4) for CSA, and
`/pages/ap-csp-course` (2) for CSP.

## Inbound authored links

Counted from the stored body of all 1,344 pages, with `<script>` and `<style>`
excluded for the reason `docs/dead-internal-links-2026-09-02.md` records.

| page | inbound |
|---|---|
| `/pages/ap-csa` | **13** |
| the other six | 0 each |

## `/pages/ap-csa` is NOT a dead internal link, and that matters

The board carried the belief that it appears in
`docs/dead-internal-links-2026-09-02.md`. It does not. Its only mention there is
in the EXCLUSIONS preamble, illustrating a different rule: that `/pages/ap-csa`
and `/blogs/ap-csa` are different things and moving between them is a content
decision.

The reason it is absent is `classify()` in
`scripts/dead-internal-link-repair.js`. It returns `{ kind: 'ok' }` for any href
whose handle is in the live handle list, and `ap-csa` is line 11 of that file.
A page that resolves is not a dead link, however empty it is.

**So a redirect resolves no existing link rot.** It does the opposite: it is
what PREVENTS 13 new dead links at the moment the page is deleted. Those 13
links are on FRQ pages and read "Return to the AP CSA hub" and "AP CSA exam prep
hub".

## The decision this measurement does not make

`/pages/ap-csa` is an indexed head-term URL with a hand-written, 2026-27-rolled
title and meta description and a self-referencing canonical. There are two
defensible answers and this document does not choose between them.

**Consolidate.** 301 it onto `/pages/ap-csa-course`, which already holds the
content the empty page's own description promises. One URL for the head term,
all of its authority pointing at 29,584 characters of course.

**Author.** Keep both, and write a body onto `/pages/ap-csa`. It has the shorter,
cleaner URL and a title that reads better in a result than the hub's does. That
is authoring and belongs to a person.

And a third thing neither answer settles, which the sheet's own row records:
if the answer is consolidate, the TARGET is contested. The page describes itself
as the course, which points at `/pages/ap-csa-course`. The 13 pages linking into
it call it the "hub", which points at `/pages/ap-csa-exam-prep-hub` (79,847
stored, 133 inbound authored links, 4 nav references). Those two witnesses
disagree and only a person can settle it.

## The precondition, from Shopify's own documentation

> "You can redirect only from broken URLs. Broken URLs display error messages,
> such as Page not found or 404."
> "If the URL still loads a valid webpage, then the URL redirect won't work."

All seven answer 200 today. Importing a redirects sheet against them creates
seven redirects that never fire, and Matrixify logs every one as created. The
order is:

1. a human DELETES or UNPUBLISHES the empty pages. Deleting or unpublishing a
   handle is on the NEVER_AUTO list.
2. confirm each path now 404s
3. import `imports/2026-09-02/empty-course-head-redirects.csv`
4. confirm each path now 301s to its target

Run 3 before 1 and the result looks exactly like success.
