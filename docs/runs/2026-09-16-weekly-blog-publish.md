# 2026-09-16 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the Routine procedure. Local HEAD
was already at `49adfc9`, the same commit as `origin/main`, so no pull was
needed beyond the fetch (the session branch `claude/confident-euler-riny44`
had no upstream yet; set it to track `origin/main`). `node scripts/blog.js
validate` passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-16` returned 56 handles, since due is
cumulative (`publishOn <= on`), not this-week-only. Cross-referenced the
four course blogs' live articles (fetched via the Shopify connector's
`graphql_query`, one query across all four blogs at once, full article list
per blog read back and diffed against the due list by hand) and found 52 of
the 56 already live from prior weekly runs.

Four were genuinely new, one per course:

- `ap-csa-string-methods-off-by-one` (ap-csa)
- `ap-csp-lossy-lossless-compression` (ap-csp)
- `ap-cybersecurity-network-segmentation` (ap-cybersecurity)
- `ap-networking-mac-address-arp` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON
piped verbatim (read from the emit output, never retyped or edited) into an
`articleCreate` mutation with the looked-up `blogId` added. Blog GIDs:
`ap-csa` `gid://shopify/Blog/107086348503`, `ap-csp`
`gid://shopify/Blog/107086381271`, `ap-cybersecurity`
`gid://shopify/Blog/104159314135`, `ap-networking`
`gid://shopify/Blog/107086414039`. All four mutations returned
`userErrors: []` on the first attempt.

Live article IDs:

- `gid://shopify/Article/595952337111` - ap-csa-string-methods-off-by-one
- `gid://shopify/Article/595952402647` - ap-csp-lossy-lossless-compression
- `gid://shopify/Article/595952435415` - ap-cybersecurity-network-segmentation
- `gid://shopify/Article/595952468183` - ap-networking-mac-address-arp

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csa-string-methods-off-by-one: **ok**, 97/97 chunks, 1 h1, FAQ JSON-LD present.
- ap-csp-lossy-lossless-compression: **ok**, 91/91 chunks, 1 h1, FAQ present.
- ap-cybersecurity-network-segmentation: **ok**, 128/128 chunks, 1 h1, FAQ present.
- ap-networking-mac-address-arp: **ok**, 81/81 chunks, 1 h1, FAQ present.

All four clean.

## Skipped / not applicable

None of the four remaining handles were skipped. No connector unavailability.

## Open items

None new.
