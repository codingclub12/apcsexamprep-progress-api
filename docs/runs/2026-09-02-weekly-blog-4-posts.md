# 2026-09-02: Weekly course-blog publish

Automated weekly run. `git pull` (branch was already even with `origin/main`),
`node scripts/blog.js validate` (144 posts, all pass), `node scripts/blog.js due
2026-09-02` (32 handles due, publishOn <= today). The Shopify connector was
available this run.

## What published

Cross-referenced the 32 due handles against each course blog's live articles
(`graphql_query` on `blogs { articles }`). 28 of 32 were already live from prior
runs; the remaining 4, one per course, were created via `blog.js emit <handle>`
+ `articleCreate` verbatim, per the emit-then-mutate flow:

- `ap-csa-compound-booleans-short-circuit` -> `/blogs/ap-csa/ap-csa-compound-booleans-short-circuit`
- `ap-csp-abstraction-data-procedural` -> `/blogs/ap-csp/ap-csp-abstraction-data-procedural`
- `ap-cybersecurity-phishing-deep-dive` -> `/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive`
- `ap-networking-router-switch-access-point` -> `/blogs/ap-networking/ap-networking-router-switch-access-point`

All four `articleCreate` mutations returned `userErrors: []`.

## Verify results

Fetched each live URL and piped the rendered HTML to `node scripts/blog.js
verify <handle>`:

| handle | ok | chunks checked | chunks missing | h1 count | FAQ JSON-LD |
|---|---|---|---|---|---|
| ap-csp-abstraction-data-procedural | true | 100 | 0 | 1 | present |
| ap-cybersecurity-phishing-deep-dive | true | 100 | 0 | 1 | present |
| ap-networking-router-switch-access-point | true | 100 | 0 | 1 | present |
| **ap-csa-compound-booleans-short-circuit** | **false** | 101 | **6** | 1 | present |

## Failure: unescaped comparison operators on the CSA post

The CSA post's `articleCreate` succeeded and the mutation reported no errors,
but the live page does not render correctly. The source,
`content/blog/2026-09-01-ap-csa-compound-booleans.js`, had literal unescaped
`<` and `>` characters used as comparison operators inside prose fields that
`lib/blog-house.js` passes through as raw HTML (`H.p`, `H.box`'s html arg,
`H.mcq`'s `stem`/`options`/`why`, `H.faq`'s `a`) -- e.g. `<code>index <
scores.length</code>` and `!(count > 0 && flag)`. Those fields are not
auto-escaped (only `H.code()`/`codeText` is, via `esc()`), so a bare `<`
starts what HTML parses as a tag, and swallows everything up to the next `>`.
On this post that ran all the way through the second MCQ's answer choices
(`<li>` items), corrupting a chunk into `"...count count count > 0 || !flag
!count > 0 && flag Show the answer and why Answer: A."` on the live,
already-published page. This is exactly the class of defect the CLAUDE.md
verification standard is written to catch: `articleCreate`'s success was not
proof the page was correct, and only the live HTML diff caught it.

**Fixed in this run:** the source file, escaping the stray `<`/`>` to `&lt;`/
`&gt;` in every raw-HTML field of that one post. `blog.js validate` is clean
(144/144), and `proseChunks(post.body)` now produces 109 well-formed chunks
instead of 101 corrupted ones, confirming the fix.

**Not fixed in this run:** the already-published live article still serves
the broken HTML. Correcting it needs an `articleUpdate` mutation (or an
equivalent republish), which is outside this task's authorized flow --
`blog.js` only exposes `emit` for new-article creation, and the task's
instructions are explicit that no mutation may be invented outside step 5's
emit-then-mutate path. Flagging here rather than doing it. Whoever wires up
an update path for already-live posts should treat this handle as the first
test case.

## Wider risk found, not fixed

A quick heuristic scan (` < ` / ` > ` outside likely tag boundaries) across
all 144 source files in `content/blog/` turned up the same pattern in roughly
30 files, three of which (`2026-08-18-ap-csa-2026-scores.js`,
`2026-08-18-ap-csa-objects-references.js`,
`2026-08-18-ap-csa-variable-table-tracing.js`) are already live from prior
weeks' runs. The heuristic is crude (it will have false positives from
legitimate prose), so these numbers are a lead, not a confirmed defect count.
This deserves its own dedicated audit pass (ideally: teach
`lib/blog-validate.js` to catch a bare `<`/`>` outside a recognized tag or
entity, so this class of bug fails `validate` before anything publishes) --
out of scope for a single weekly-publish run, and not attempted here beyond
the one post this run actually touched.

## Summary

4 new posts published (1 per course), all `articleCreate`s clean. 3 of 4
verified correct live. 1 (`ap-csa-compound-booleans-short-circuit`) verified
**broken** live due to a pre-existing content-authoring bug, now fixed at the
source for next time but still broken on the live page pending a manual
update. A likely-systemic version of the same bug exists across ~30 other
source files, several already live; flagged for a dedicated follow-up.
