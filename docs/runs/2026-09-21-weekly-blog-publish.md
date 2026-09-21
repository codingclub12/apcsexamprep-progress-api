# 2026-09-21 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the routine procedure. `git pull` was
already up to date with `main`. `node scripts/blog.js validate` passed clean:
144 posts, all pass.

`node scripts/blog.js due 2026-09-21` returned 62 handles, since due is
cumulative (`publishOn <= on`), not this-week-only, matching the pattern noted
in prior run notes. Queried the four course blogs' live articles in one
`graphql_query` call (`blogs(first: 10) { articles(first: 100) { ... } }`,
filtered to `ap-csa`, `ap-csp`, `ap-cybersecurity`, `ap-networking`) and
diffed the due list against the live handles with `comm -23` on saved files
rather than eyeballing 62 handles.

58 of the 62 were already live from prior runs. Four were genuinely new, one
per course:

- `ap-csa-frq-scoring-point-by-point` (ap-csa)
- `ap-csp-college-credit-what-colleges-give` (ap-csp)
- `ap-cybersecurity-exam-format-section-by-section` (ap-cybersecurity)
- `ap-networking-salary-progression` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON piped
verbatim into an `articleCreate` mutation with the looked-up `blogId` added.
Blog GIDs: `ap-csa` `gid://shopify/Blog/107086348503`, `ap-csp`
`gid://shopify/Blog/107086381271`, `ap-cybersecurity`
`gid://shopify/Blog/104159314135`, `ap-networking`
`gid://shopify/Blog/107086414039`. All four mutations returned `userErrors: []`
on the first attempt.

Live article IDs:

- `gid://shopify/Article/599008575703` - ap-csa-frq-scoring-point-by-point
- `gid://shopify/Article/599008608471` - ap-csp-college-credit-what-colleges-give
- `gid://shopify/Article/599008641239` - ap-cybersecurity-exam-format-section-by-section
- `gid://shopify/Article/599008674007` - ap-networking-salary-progression

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csp-college-credit-what-colleges-give: **ok**, 82/82 chunks, 1 h1, FAQ present.
- ap-cybersecurity-exam-format-section-by-section: **ok**, 96/96 chunks, 1 h1, FAQ present.
- ap-networking-salary-progression: **ok**, 87/87 chunks, 1 h1, FAQ present.
- ap-csa-frq-scoring-point-by-point: **FAILED**, 1 of 106 chunks missing.

Per the routine's own instruction, this failure is reported rather than
papered over: the mutation succeeding is not proof the page is correct, and
here it genuinely was not.

### Root cause of the CSA failure

Same class of bug documented in `docs/runs/2026-09-18-weekly-blog-publish.md`.
`content/blog/2026-09-22-ap-csa-frq-scoring.js` line 64 had a literal
`k <= wrds.size() instead of k < wrds.size()` inside an `H.ul()` list item.
`H.ul()`'s items pass through as raw HTML (the same items already carry inline
`<strong>` tags), so the literal `<` characters read as the start of new tags
to the storefront's HTML parser rather than as prose, and everything between
the first `<` and the next `>` was swallowed. That is why `blog.js verify`
reported one missing chunk rather than something more visibly broken: the
surrounding sentence still rendered, just with the loop-bound comparison text
eaten. The matching code block at line 58 (`H.code(...)`) rendered fine
because `H.code()` escapes via `esc()`.

Fixed by escaping the two literal `<` occurrences to `&lt;` in the source
file. Re-ran `node scripts/blog.js validate` after the fix: still 144 posts,
all pass. Re-emitted and diffed the new JSON against the one already pushed
live: the only change is the two `&lt;` escapes (31218 to 31224 bytes), byte
for byte identical otherwise.

**The live Shopify article was not updated with this fix.** The routine's
publish step is scoped to `articleCreate` for due, not-yet-published handles,
and explicitly warns against hand-constructing any mutation outside that
emit-then-mutate flow. Updating an already-published article is a different
operation the routine does not authorize, so it is left as an open item
rather than something this run invents a fix for on its own, matching how the
2026-09-18 run handled the same situation.

## Open items

- `ap-csa-frq-scoring-point-by-point` is live on Shopify with the one-chunk
  rendering bug described above (article id
  `gid://shopify/Article/599008575703`). The source fix is committed in this
  run; a future session needs to run `node scripts/blog.js emit
  ap-csa-frq-scoring-point-by-point` and push the corrected body with an
  `articleUpdate` mutation, then re-verify against the live page.
- This is now the second time an unescaped `<`/`<=` in prose passed through
  `H.ul()` or `H.mcq()` and broke a live page while `validate` stayed green.
  `validate` checks content rules, not HTML-parser safety, so it will not
  catch this class of bug by itself. Worth a wider one-time sweep of
  `content/blog/*.js` for literal `<` or `<=` outside `H.code()` calls, not
  done in this run since it is outside the weekly routine's scope.
