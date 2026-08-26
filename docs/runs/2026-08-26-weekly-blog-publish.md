# Weekly blog publish: 4 posts live, 1 verify failure (broken table row)

Date: 2026-08-26
Agent: Claude Code (scheduled weekly blog-publish routine)

## What published

`git pull` brought in `597a224` (already the tip of `origin/main`; the working
branch tracked `origin/main` freshly since it had no prior push). `node
scripts/blog.js validate` passed cleanly (144 posts, all pass).

`node scripts/blog.js due 2026-08-26` returned 20 handles. Sixteen were
already live (cross-referenced against each course blog's articles via the
Shopify connector's `graphql_query`) and were skipped to avoid duplicating.

The remaining 4 were emitted via `blog.js emit` and created via the Shopify
connector's `articleCreate` mutation, payload passed through verbatim with
only `blogId` added:

| Handle | Blog | Article ID |
|---|---|---|
| `ap-csa-java-vs-python` | ap-csa | `595676594391` |
| `ap-csp-binary-bits-overflow` | ap-csp | `595676627159` |
| `ap-cybersecurity-social-engineering` | ap-cybersecurity | `595676659927` |
| `ap-networking-dns-explained` | ap-networking | `595676692695` |

All 4 mutations returned `userErrors: []`.

## Verify results

Fetched each live URL's rendered HTML and piped it to `blog.js verify`.

- `ap-csp-binary-bits-overflow` — ok, 115/115 chunks
- `ap-cybersecurity-social-engineering` — ok, 97/97 chunks
- `ap-networking-dns-explained` — ok, 90/90 chunks
- `ap-csa-java-vs-python` — **FAILED**, 99/100 chunks, 1 missing

## What is still open: broken table row on the live CSA post

`ap-csa-java-vs-python` is live but rendering with a corrupted comparison
table row. The missing chunk starts mid-way through the "For loop" row and
swallows the rest of that table cell plus the next one ("Boolean operators").

Root cause, found in the source: `content/blog/2026-08-25-ap-csa-java-vs-python.js`
line 54 has an unescaped `<` inside a `<code>` sample:

```
"<code>for (int i = 0; i < 5; i++) {</code>, three separate parts: ..."
```

That `<` is not HTML-entity-escaped (`&lt;`), so when the string is embedded
directly into the article body HTML, the live page's rendering strips or
truncates starting at `i < 5; i++) {`, corrupting the rest of the row and the
row after it. `validate` does not currently catch this class of bug (it
checks prose/word-count structure, not literal `<`/`>` inside authored HTML
fragments).

This routine's mandate is emit-then-mutate for **new, unpublished** posts
only — it has no authorized path to edit or re-publish an already-live
article, so the fix was not applied here. Fixing this needs:

1. Escaping the `<` (and checking for any other unescaped `<`/`>` in code
   samples) in `content/blog/2026-08-25-ap-csa-java-vs-python.js`.
2. Some human- or separately-authorized path to update the already-created
   Shopify article `595676594391` (`articleUpdate`, not `articleCreate`,
   since the handle is already live) with the corrected body.
3. A follow-up `blog.js verify` run against the corrected live page.

Flagging this now rather than treating the mutation's `userErrors: []` as
proof the page is correct, per the standing instruction for this routine.

## Summary

3 of 4 due posts published clean. 1 published but is live with visibly
broken content and needs a manual content fix + republish.
