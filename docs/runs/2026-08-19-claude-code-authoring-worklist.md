# 2026-08-19 - From "118 missing" to a worklist you can author against

Agent: Claude Code. Branch: `claude/course-networking-strategy-8chhni`, off `main`.

## What this adds

The previous pass established that 118 of 284 Essential Knowledge statements are
uncited. That is a number to worry about, not a thing to do. This extracts the
actual TEXT of all 284 statements from the framework PDF, so a missing code can be
authored against what it says rather than what its number suggests.

`node scripts/networking-missing-ek.js` now prints the worklist: 118 statements
across 20 topics, worst coverage first, each with its framework page number.
Coverage is measured live against the pages on every run, so the list shrinks as
work lands instead of reporting a stale snapshot.

## The extraction was harder than it looked, and that is the point

A naive text extraction of this PDF is wrong in three separate ways, each of which
silently attributes the WRONG text to a code. All three were found by checking
rather than assumed away:

1. **Text before code.** On some pages the statement is emitted before its own
   code, so "read forward from the code" mis-assigns. Caught because 2.1.B.1 came
   out empty.
2. **Doubled rendering.** Topic-start pages render their first row twice, so a box
   arrives as `4.2.A.1 4.2.A.1` and an exact-match rejects it. Caught because 11
   codes went missing, all of them `.A.1`.
3. **Inconstant page geometry.** Most pages put objectives at x0~70 and knowledge
   at x0~225. Others use x0~201 and x0~355, so one hardcoded split puts both
   columns on the same side and swallows the first statement of a topic. Caught
   because 12 more `.A.1` codes came out too short.

A fourth, smaller one: two boxes merged a code with the first word of its
statement (`4.3.A.6 cd`, `4.4.C.1 traceroute`). Worth noting because it also
confirmed the 284 denominator is right rather than an over-count from an index.

The fix reads each page column-aware and derives the split from where the codes
actually sit on that page.

## Validation

- 284 of 284 EK and 60 of 60 LO. None missing, none extra, none under 73 chars.
- **Zero cross-page contamination**: every word of every statement was confirmed
  present in the raw text of that statement's own page. That is the check that
  would catch text stolen from a neighbouring topic, which is the failure mode
  that matters here.
- Ground truth via poppler was not available (`pdftoppm` and `pdftotext` are not
  installed and apt could not fetch them), so validation is the word-level
  cross-check above rather than a visual read of the rendered page.

## Known limitation, recorded rather than hidden

Five statements, all in the CLI-heavy topics 4.3 and 4.4, contain every one of
their words but in a scrambled order, because inline monospace command names sit
in their own text boxes and get pulled ahead of the sentence. They are flagged
`verbatim: false` in the data, the worklist prints a warning next to them, and
every statement carries its PDF page number so the source can be read directly.

## Also

Punctuation in the statements is verbatim, including the 25 that contain en or em
dashes. The repo's no-em-dash rule governs prose this project authors, not
quotations of someone else's document.

## Still open

- The 118 statements themselves. 1.4 and 2.1 are worst at 33 percent, then 1.2 at
  38. Authoring lands in Shopify page bodies through Matrixify, a human step.
- Whether the CED watcher works on an Actions runner. Still zero runs; first
  scheduled 2026-08-24 09:30 UTC.
- CCST sub-objectives for the cert crosswalk. `cisco.com` returns 403 to
  automated clients even with open egress.
