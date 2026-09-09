# 2026-09-09 weekly course blog publish

## What ran

`node scripts/blog.js validate` passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-09` returned 43 handles. Cross-referencing
against the Shopify blogs' existing live articles (via the Shopify connector's
`graphql_query`, one query per course blog, paginated) showed 39 of those 43
were already live. Those were dropped rather than republished. The remaining
4, one per course, were genuinely unpublished:

- `ap-csa-for-while-loops-which-one` (ap-csa)
- `ap-csp-algorithm-efficiency-reasonable-time` (ap-csp)
- `ap-cybersecurity-access-control-least-privilege` (ap-cybersecurity)
- `ap-networking-subnetting-without-tears` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and created via
`articleCreate` with the emitted JSON verbatim plus the looked-up `blogId`.

One mistake happened during this run and was corrected before moving on: the
first `articleCreate` call for the CSA post accidentally used placeholder
`body`/`summary` text and empty `metafields` instead of the emitted payload,
while testing a query-field fix after an earlier `onlineStoreUrl` schema
error. That placeholder content went live briefly. It was caught immediately
by re-reading the created article back from the Admin API, and corrected with
an `articleUpdate` call carrying the real emitted content, verified by
re-fetching the article and diffing its body/summary/tags/metafields against
the source. The other three articles were created correctly on the first
attempt.

Live article IDs:

- `gid://shopify/Article/595872743639` - ap-csa-for-while-loops-which-one
- `gid://shopify/Article/595872776407` - ap-csp-algorithm-efficiency-reasonable-time
- `gid://shopify/Article/595872809175` - ap-cybersecurity-access-control-least-privilege
- `gid://shopify/Article/595872874711` - ap-networking-subnetting-without-tears

## Verify

Fetched each live URL through `lib/storefront-fetch.js` (`/blogs/<blog>/<handle>`,
no User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csp-algorithm-efficiency-reasonable-time: **ok**, 112/112 prose chunks present, 1 h1, FAQ JSON-LD present.
- ap-cybersecurity-access-control-least-privilege: **ok**, 112/112 chunks, 1 h1, FAQ present.
- ap-networking-subnetting-without-tears: **ok**, 81/81 chunks, 1 h1, FAQ present.
- ap-csa-for-while-loops-which-one: **verify reported failure**, 4 of 102 chunks missing. Investigated rather than accepted at face value:

  The 4 "missing" chunks all involve `i < something` written as a bare `<`
  inside the source file `content/blog/2026-09-08-ap-csa-for-while-loops.js`
  (one occurrence inside a `<code>` tag, three in plain FAQ prose). Shopify's
  Admin API escapes a bare `<` to `&lt;` on ingest, so the live page renders
  it correctly. But `lib/blog-verify.js`'s `normalize()` strips tags with a
  greedy `/<[^>]+>/g` regex against the *source* body, and an unescaped `<`
  in prose makes that regex consume everything up to the next `>`, silently
  deleting real words from the chunk it's comparing against. Confirmed by
  hand: all four passages (`i < nums.length`, `i <= vals.length`, `i <
  array.length` x2) are present and correctly rendered on the live page,
  properly escaped as `&lt;` / `&lt;=`. This is a false negative in the
  verify tooling caused by a pre-existing escaping bug in that one source
  file, not a live-page defect. Not fixed in this run since it's outside the
  bounds of the publish procedure; worth a follow-up to either escape `<` in
  that source file or make `normalize()` tolerant of a bare `<` not followed
  by a valid tag.

## Skipped / not applicable

None of the four remaining handles were skipped. No connector unavailability.

## Open items

- `content/blog/2026-09-08-ap-csa-for-while-loops.js` has literal `<`
  characters in prose text that should be `&lt;`. Doesn't affect the live
  page (Shopify escapes on ingest) but breaks `scripts/blog.js verify` for
  this post, and would break `validate`'s own HTML sanity if it ever checks
  for this. Worth fixing in the source file directly, or hardening
  `lib/blog-verify.js`'s `normalize()` so a bare `<` not immediately followed
  by a letter, `/`, or `!` is treated as literal text rather than the start
  of a tag.
