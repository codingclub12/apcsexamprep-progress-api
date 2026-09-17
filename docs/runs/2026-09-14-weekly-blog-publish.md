# 2026-09-14 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the Routine procedure in
`docs/content-engine.md`. Branch `claude/confident-euler-wjs4ln` was already
at the same commit as `origin/main` (`8c63087`), so no pull was needed beyond
the fetch. `node scripts/blog.js validate` passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-14` returned 52 handles, since due is
cumulative (`publishOn <= on`), not this-week-only. Cross-referenced the four
course blogs' live articles (fetched via the Shopify connector's
`graphql_query`, one query across all four blogs at once, full article list
per blog read back and diffed against the due list with `comm`, not
eyeballed) and found 48 of the 52 already live from prior weekly runs.

Four were genuinely new, one per course:

- `ap-csa-should-you-major-in-cs` (ap-csa)
- `ap-csp-or-ap-csa-first` (ap-csp)
- `ap-cybersecurity-or-ap-csp-choosing` (ap-cybersecurity)
- `ap-networking-four-units-topics` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON piped
verbatim (read from the emit output, never retyped or edited) into an
`articleCreate` mutation with the looked-up `blogId` added. Blog GIDs:
`ap-csa` `gid://shopify/Blog/107086348503`, `ap-csp`
`gid://shopify/Blog/107086381271`, `ap-cybersecurity`
`gid://shopify/Blog/104159314135`, `ap-networking`
`gid://shopify/Blog/107086414039`. All four mutations returned
`userErrors: []` on the first attempt.

Live article IDs:

- `gid://shopify/Article/595935363287` - ap-csa-should-you-major-in-cs
- `gid://shopify/Article/595935396055` - ap-csp-or-ap-csa-first
- `gid://shopify/Article/595935428823` - ap-cybersecurity-or-ap-csp-choosing
- `gid://shopify/Article/595935461591` - ap-networking-four-units-topics

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csa-should-you-major-in-cs: **ok**, 84/84 chunks, 1 h1, FAQ JSON-LD present.
- ap-csp-or-ap-csa-first: **ok**, 89/89 chunks, 1 h1, FAQ present.
- ap-cybersecurity-or-ap-csp-choosing: **ok**, 114/114 chunks, 1 h1, FAQ present.
- ap-networking-four-units-topics: **ok**, 87/87 chunks, 1 h1, FAQ present.

All four clean.

## Skipped / not applicable

None of the four remaining handles were skipped. No connector unavailability.

## Open items

None new.
