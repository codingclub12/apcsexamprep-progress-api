# 2026-09-11 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the Routine procedure in
`docs/content-engine.md`. `node scripts/blog.js validate` passed clean: 144
posts, all pass.

`node scripts/blog.js due 2026-09-11` returned 48 handles, since due is
cumulative (`publishOn <= on`), not this-week-only. Cross-referenced the four
course blogs' live articles (fetched via the Shopify connector's
`graphql_query`, one query per course blog, `articlesCount` and full article
list read back and diffed against the due list with `comm`, not eyeballed) and
found 43 of the 48 already live from prior weekly runs. A first pass by a
research subagent misreported the ap-networking blog's article count as 12
against a list of 11 names; re-ran the query directly against that one blog
before trusting it, confirmed the actual count is 11 and the list was correct,
so nothing was skipped or double-published on the strength of that mismatch.

Four were genuinely new, one per course:

- `ap-csa-frq-practice-laptop-closed` (ap-csa)
- `ap-csp-written-response-practice-prompts` (ap-csp)
- `ap-cybersecurity-mcq-pacing-eighty-seconds` (ap-cybersecurity)
- `ap-networking-network-diagram-first` (ap-networking)

One older due handle, `ap-csa-variable-table-tracing-method` (`publishOn`
2026-08-21), initially looked like it might be an unpublished backlog item
from three weeks ago, since its `publishOn` predates every run since. Checked
directly: it is live (article `595611287767`, created in the 2026-08-21 run
per that run's own note) and was correctly excluded once the live-article diff
was done precisely instead of by eye.

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON piped
verbatim (read from the emit output, never retyped or edited) into an
`articleCreate` mutation with the looked-up `blogId` added. Blog GIDs:
`ap-csa` `107086348503`, `ap-csp` `107086381271`, `ap-cybersecurity`
`104159314135`, `ap-networking` `107086414039`. All four mutations returned
`userErrors: []` on the first attempt.

Live article IDs:

- `gid://shopify/Article/595889324247` - ap-csa-frq-practice-laptop-closed
- `gid://shopify/Article/595889357015` - ap-csp-written-response-practice-prompts
- `gid://shopify/Article/595889389783` - ap-cybersecurity-mcq-pacing-eighty-seconds
- `gid://shopify/Article/595889422551` - ap-networking-network-diagram-first

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csa-frq-practice-laptop-closed: **ok**, 97/97 chunks, 1 h1, FAQ JSON-LD present.
- ap-csp-written-response-practice-prompts: **ok**, 84/84 chunks, 1 h1, FAQ present.
- ap-cybersecurity-mcq-pacing-eighty-seconds: **ok**, 96/96 chunks, 1 h1, FAQ present.
- ap-networking-network-diagram-first: **ok**, 119/119 chunks, 1 h1, FAQ present.

All four clean. No repeat of the bare-`<`-in-prose false negative that hit
`ap-csa-for-while-loops-which-one` on 2026-09-09 (that post is already live
and was correctly skipped this run, not re-emitted).

## Skipped / not applicable

None of the four remaining handles were skipped. No connector unavailability.

## Open items

None new. The `ap-csa-for-while-loops-which-one` verify-tooling false
negative flagged on 2026-09-09 (bare `<` in FAQ prose breaking
`lib/blog-verify.js`'s tag-stripping regex) is still open and unrelated to
this run, since that post did not need re-verifying here.
