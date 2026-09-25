# 2026-09-25 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the routine procedure. `git pull`
had no tracking branch set for `claude/confident-euler-rpekb7` (a brand new
session branch), so ran `git fetch` directly instead and confirmed the
branch's head already matches `origin/main` (`9d522d1f`) with no divergence.
`node scripts/blog.js validate` passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-25` returned 72 handles, since due is
cumulative (`publishOn <= on`), not this-week-only, matching the pattern
noted in prior run notes. Queried the four course blogs' live articles in
one `graphql_query` call (`blogs(first: 20) { articles(first: 250) { ... } }`,
filtered to `ap-csa`, `ap-csp`, `ap-cybersecurity`, `ap-networking`) and
diffed the due list against the live handles in Python rather than eyeballing
72 handles.

68 of the 72 were already live from prior runs. Four were genuinely new, one
per course:

- `ap-csa-reference-sheet-what-it-gives-you` (ap-csa)
- `ap-csp-bug-log-errors-testing-practice` (ap-csp)
- `ap-cybersecurity-incident-response-answer-structure` (ap-cybersecurity)
- `ap-networking-collaborate-explain-technical` (ap-networking)

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

- `gid://shopify/Article/599079846103` - ap-csa-reference-sheet-what-it-gives-you
- `gid://shopify/Article/599080141015` - ap-csp-bug-log-errors-testing-practice
- `gid://shopify/Article/599080337623` - ap-cybersecurity-incident-response-answer-structure
- `gid://shopify/Article/599080501463` - ap-networking-collaborate-explain-technical

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csa-reference-sheet-what-it-gives-you: **ok**, 81/81 chunks, 1 h1, FAQ present.
- ap-csp-bug-log-errors-testing-practice: **ok**, 102/102 chunks, 1 h1, FAQ present.
- ap-cybersecurity-incident-response-answer-structure: **ok**, 92/92 chunks, 1 h1, FAQ present.
- ap-networking-collaborate-explain-technical: **ok**, 118/118 chunks, 1 h1, FAQ present.

All four passed clean on the first attempt; nothing skipped or failed this
run.
