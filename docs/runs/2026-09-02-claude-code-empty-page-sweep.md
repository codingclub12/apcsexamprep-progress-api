# Board 158: the seven pages that store nothing

## What was asked

Enumerate the seven empty Shopify pages rather than trusting the number, find
where each one's content actually lives, classify each, and build a Matrixify
redirects sheet for the redirect rows only. Do not import. Do not decide the SEO
question on `/pages/ap-csa`.

## What was measured

All 1,344 published pages from `sitemap_pages_1.xml`, single threaded at 800 ms
with a browser User-Agent. 1,344 fetched, zero 429s, zero non-200s, one page on
a template the instrument cannot read. The stored body came out through
`scripts/extract-live-body.js`, which is the function whose job this already is.

Seven pages store zero characters, and the number is exactly seven:

    ap-csa   ap-csp   ap-csa-premium-frq-solutions
    bundles  flashcards  practice-exams  quick-reference

## The convention that resolves it

Seven of the store's TEN collection handles are exactly these seven page
handles. The store has `ap-csa`, `ap-csp`, `ap-csa-premium-frq-solutions`,
`bundles`, `flashcards`, `practice-exams`, `quick-reference`, plus `frq`,
`tutoring` and `live-events`. These pages shadow the shop's collection
structure, which is why five of the seven have two plausible destinations
rather than one, and why only two of them are a repair.

Finding that BEFORE writing the sheet is the difference between two rows and
seven.

## Instruments that were wrong before they were right

Three, and the second list is the one worth keeping.

**1. The emptiness threshold measured the wrong thing.** The first version asked
whether the stored body held under 40 characters of authored TEXT.
`/pages/ap-csp-test-builder` stores 496,715 characters, measures ZERO authored
text because its entire body is one `<script>`, and renders 1,561 characters of
main text against the 1,448 character empty shell. A text measure and a rendered
measure BOTH call a working half-megabyte application empty. Only the size of
the stored body does not. The threshold is now exactly zero, and
`ap-csp-test-builder` and `java-editor-test` are checked-in controls in the
suite: real rows from the same sweep, so the threshold is tested against the
store rather than against a story about the store.

**2. Counting UTF-16 units instead of code points.** The JS assertion for the
1,448 character shell first read 1,450. The contact widget carries two astral
emoji, a school and a book, each one character to Python and two to JavaScript.
The fix was to count code points, not to adjust the number: 1,448 is what the
board carried and what the Python rederive measures, and a number that has to be
edited to pass is a number that is measuring the tool.

**3. A page on another template is UNRESOLVED, not empty.** `java-sandbox-embed`
renders 108 characters of main text, less than the empty shell, and has no rte
wrapper because it is an embed target. The sweep reports it as `template` and
never as a finding.

## The correction to the board's own premise

The board said `/pages/ap-csa` appears as a dead internal link target in
`docs/dead-internal-links-2026-09-02.md`. It does not. Its only appearance there
is in the exclusions preamble, illustrating a different rule.

Going through `classify()` in `scripts/dead-internal-link-repair.js` says why:
it returns `{ kind: 'ok' }` for any href whose handle is in the live handle
list, and `ap-csa` is line 11 of that file. A page that resolves is not a dead
link, however empty it is.

So the redirect resolves no link rot. It PREVENTS 13 new dead links at the
moment the page is deleted.

## The precondition that makes the sheet a no-op on its own

Shopify's own documentation: "You can redirect only from broken URLs" and "If
the URL still loads a valid webpage, then the URL redirect won't work." All
seven answer 200 today, so importing this sheet by itself creates redirects that
never fire while Matrixify logs every one as created.

The generator raises that as a note per row and prints the import order, and a
mutation in the gate proves the note is not decoration.

## Artifact

`imports/2026-09-02/empty-course-head-redirects.csv`, md5
`705182f3782aa092bcc89f0fd4a7a8ff`, two rows, Command/Path/Target only, BOM +
CRLF + QUOTE_ALL, preflight clear. NOT IMPORTED.

    MERGE  /pages/ap-csa  ->  /pages/ap-csa-course
    MERGE  /pages/ap-csp  ->  /pages/ap-csp-course

Both targets verified HTTP 200 at 2026-09-02T17:48:01Z, recorded in
`smoke/fixtures/empty-page-redirects/verification.json`.

## Still open, and needing a human

- **The SEO call on `/pages/ap-csa`.** Consolidate onto the hub, or author a
  body onto the head term and keep both. The sheet is ready for the first. It is
  a real head term with a hand-written 2026-27 title and a self-canonical.
- **The target on that same row is contested.** The page describes itself as the
  course, pointing at `/pages/ap-csa-course`. The 13 pages linking into it call
  it the "hub", pointing at `/pages/ap-csa-exam-prep-hub`. Two witnesses,
  disagreeing.
- **Step 1 of the import.** Deleting or unpublishing the two pages is NEVER_AUTO.
- **The other five.** `bundles` and `ap-csa-premium-frq-solutions` are money.
  `flashcards`, `practice-exams` and `quick-reference` each need a choice
  between a paid collection and free course-specific twins, and the free twins
  are two pages, not one.
