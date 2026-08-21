# Weekly blog publish: 8 posts live, 2 flagged by verify

Date: 2026-08-21
Agent: Claude Code (scheduled weekly blog-publish routine)

## What published

`node scripts/blog.js validate` passed cleanly first (144 posts, all pass).
`node scripts/blog.js due 2026-08-21` returned 12 handles. Four were already
live (cross-referenced against each course blog's articles via the Shopify
connector) and were skipped to avoid duplicating:

- `ap-csa-score-distribution-2026-analysis`
- `ap-csp-create-performance-task-what-changed`
- `ap-cybersecurity-launch-2026-27-guide`
- `ap-networking-2026-27-pilot-year-guide`

The remaining 8 were emitted via `blog.js emit` and created via the Shopify
connector's `articleCreate` mutation, payload passed through verbatim:

| Handle | Blog | Article ID |
|---|---|---|
| `ap-csa-objects-references-explained` | ap-csa | `595611254999` |
| `ap-csa-variable-table-tracing-method` | ap-csa | `595611287767` |
| `ap-csp-practice-exam-common-mistakes` | ap-csp | `595611320535` |
| `ap-csp-pseudocode-complete-syntax-guide` | ap-csp | `595611353303` |
| `ap-cybersecurity-cia-triad-explained` | ap-cybersecurity | `595611386071` |
| `ap-cybersecurity-device-security-frq-guide` | ap-cybersecurity | `595611418839` |
| `ap-networking-ip-address-explained` | ap-networking | `595611451607` |
| `ap-networking-troubleshooting-method` | ap-networking | `595611484375` |

All 8 mutations returned `userErrors: []`.

## Verify results

Fetched each live URL's rendered HTML and piped it to `blog.js verify`.
6 of 8 passed clean. 2 failed, and neither is a "the post didn't actually
publish" problem — both are worth a follow-up fix.

**Passed clean:** `ap-csa-objects-references-explained`,
`ap-csa-variable-table-tracing-method`, `ap-cybersecurity-cia-triad-explained`,
`ap-cybersecurity-device-security-frq-guide`, `ap-networking-ip-address-explained`,
`ap-networking-troubleshooting-method`.

**`ap-csp-practice-exam-common-mistakes` — 1 of 99 chunks missing.**
Shopify silently rewrote the literal ASCII pseudocode assignment operator
`<-` inside a `<pre>` code block (the `countPassing` MCQ) into the Unicode
arrow character `←`. Confirmed by diffing the exact emitted payload (which
correctly had `count &lt;- 0`) against the live page (`count ← 0`). Cosmetically
this is arguably closer to the College Board reference-sheet notation, but it
is a genuine platform-side content mutation, not something this repo sent.
No text is missing; one character changed.

**`ap-csp-pseudocode-complete-syntax-guide` — 4 of 92 chunks missing, mixed causes.**
- **Real bug, worth fixing:** `content/blog/2026-08-18-ap-csp-pseudocode-guide.js:149`
  has a FAQ answer with raw, unescaped `<-` and `>=` in the prose text (not
  `&lt;-` / `&gt;=`). The visible `<details>` answer on the page renders fine
  (a separately-built copy exists there), but the same raw string also feeds
  the page's `FAQPage` JSON-LD block, where the sequence `<- ... >=` gets
  parsed as a bogus HTML tag and everything between `<` and the next `>` is
  silently dropped. Live result: the JSON-LD answer for that FAQ item reads
  "...a clearly written approximation such as = for greater than or equal is
  accepted..." — missing "for the assignment arrow or". `blog.js validate`
  does not currently catch raw unescaped `<`/`>` in FAQ prose; it should.
- **False positive in the verify tool itself:** the other 3 missing chunks are
  all `blog-verify.js`'s own `ENTITIES` decode table (line 19) not knowing
  `&ne;`, `&ge;`, `&le;` — the math-symbol comparison table and reference text
  in this post. Source-side chunks keep the literal entity text while the live
  page (correctly) renders the decoded Unicode symbol, so the substring check
  flags a false miss. Spot-checked every one of these by hand against the live
  HTML: the ≠/≥/≤ symbols, the pseudocode↔Python table, and the array/loop
  examples are all present and correct on the page.

## What is still open

Two small, separate fixes, neither urgent, both worth a follow-up task on the
board rather than a same-run patch:

1. Escape `<`/`>` (or route through the same escaping helper used elsewhere)
   in FAQ answer strings before they reach the JSON-LD builder — starting
   with `2026-08-18-ap-csp-pseudocode-guide.js:149`, and ideally a
   `blog-validate.js` rule that catches raw angle brackets in FAQ prose so
   this class of bug can't ship again.
2. Add `&ne;`, `&ge;`, `&le;` (and any other named math entities this house
   style uses) to `lib/blog-verify.js`'s `ENTITIES` table so verify stops
   flagging correctly-published content as missing.

Both posts are live, readable, and complete for a human visitor; the defects
are confined to the JSON-LD structured-data payload of one FAQ entry on one
post, plus a diagnostic-tool blind spot.

## What was learned

Shopify's article-body storage does more than store bytes: it re-decodes
named HTML entities into literal Unicode text, and in at least one case
inside a `<pre>` block it substitutes an ASCII sequence for a similar-looking
Unicode character. It also sanitizes/parses the *entire* body, including
`<script type="application/ld+json">` contents, as if it were ordinary
markup — a raw `<...>` sequence inside a JSON-LD script tag is not safe from
Shopify's tag-stripping the way it would be in a spec-compliant HTML parser.
Any prose that will end up in a JSON-LD field needs the same escaping
discipline as prose that will end up in visible HTML, not just the display
copy.
