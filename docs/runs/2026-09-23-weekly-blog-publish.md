# 2026-09-23 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the routine procedure. `git pull`
had no tracking branch set for `claude/confident-euler-kq5480` (a brand new
session branch), so fetched `origin/main` directly instead and confirmed the
branch's head already matches `origin/main` (`8898a251`) with no divergence.
`node scripts/blog.js validate` passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-23` returned 66 handles, since due is
cumulative (`publishOn <= on`), not this-week-only, matching the pattern
noted in prior run notes. Queried the four course blogs' live articles in
one `graphql_query` call (`blogs(first: 10) { articles(first: 100) { ... } }`,
filtered to `ap-csa`, `ap-csp`, `ap-cybersecurity`, `ap-networking`) and
diffed the due list against the live handles with `comm -23` on saved files
rather than eyeballing 66 handles.

62 of the 66 were already live from prior runs. Four were genuinely new, one
per course:

- `ap-csa-class-creation-constructors-fields-this` (ap-csa)
- `ap-csp-how-the-internet-works` (ap-csp)
- `ap-cybersecurity-firewalls-what-they-cannot-stop` (ap-cybersecurity)
- `ap-networking-dhcp-address-assignment` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON
piped verbatim into an `articleCreate` mutation with the looked-up `blogId`
added, nothing else changed. Blog GIDs: `ap-csa`
`gid://shopify/Blog/107086348503`, `ap-csp`
`gid://shopify/Blog/107086381271`, `ap-cybersecurity`
`gid://shopify/Blog/104159314135`, `ap-networking`
`gid://shopify/Blog/107086414039`. All four mutations returned
`userErrors: []` on the first attempt.

Live article IDs:

- `gid://shopify/Article/599059726551` - ap-csa-class-creation-constructors-fields-this
- `gid://shopify/Article/599059759319` - ap-csp-how-the-internet-works
- `gid://shopify/Article/599059824855` - ap-cybersecurity-firewalls-what-they-cannot-stop
- `gid://shopify/Article/599059857623` - ap-networking-dhcp-address-assignment

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csa-class-creation-constructors-fields-this: **ok**, 115/115 chunks, 1 h1, FAQ present.
- ap-csp-how-the-internet-works: **ok**, 100/100 chunks, 1 h1, FAQ present.
- ap-cybersecurity-firewalls-what-they-cannot-stop: **ok**, 105/105 chunks, 1 h1, FAQ present.
- ap-networking-dhcp-address-assignment: **ok**, 88/88 chunks, 1 h1, FAQ present.

All four passed clean on the first attempt; nothing skipped or failed this
run.

## Open items

None from this run. The one carried-over item from 2026-09-21,
`ap-csa-frq-scoring-point-by-point`'s live rendering fix not yet pushed via
`articleUpdate`, was not touched here since it is outside this routine's
scope (publish-only, not update-already-live) and a later session or a
different task should pick it up.
