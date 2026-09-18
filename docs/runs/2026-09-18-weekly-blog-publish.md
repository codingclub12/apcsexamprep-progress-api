# 2026-09-18 weekly course blog publish

## What ran

Scheduled weekly blog publish, following the routine procedure. `git pull origin main`
fast-forwarded local `main` by 101 commits (the session branch had no upstream
and needed to be pointed at `main` directly for this routine, since the
procedure commits run notes straight to `main`). `node scripts/blog.js validate`
passed clean: 144 posts, all pass.

`node scripts/blog.js due 2026-09-18` returned 60 handles, since due is
cumulative (`publishOn <= on`), not this-week-only. Queried the four course
blogs' live articles in one `graphql_query` call across all four blogs and
diffed the due list against the live handles by hand (saved both lists to
files and used `comm -23` rather than eyeballing, since 60 handles is easy to
miscount by hand).

56 of the 60 were already live from prior runs. Four were genuinely new, one
per course:

- `ap-csa-reading-java-error-messages` (ap-csa)
- `ap-csp-personalized-project-reference-segments` (ap-csp)
- `ap-cybersecurity-threat-modeling-your-phone` (ap-cybersecurity)
- `ap-networking-unit-1-single-device-questions` (ap-networking)

## Publish

Each was emitted with `node scripts/blog.js emit <handle>` and the JSON piped
verbatim into an `articleCreate` mutation with the looked-up `blogId` added.
Blog GIDs: `ap-csa` `gid://shopify/Blog/107086348503`, `ap-csp`
`gid://shopify/Blog/107086381271`, `ap-cybersecurity`
`gid://shopify/Blog/104159314135`, `ap-networking`
`gid://shopify/Blog/107086414039`. All four mutations returned `userErrors: []`
on the first attempt.

Live article IDs:

- `gid://shopify/Article/595970261207` - ap-csa-reading-java-error-messages
- `gid://shopify/Article/595970326743` - ap-csp-personalized-project-reference-segments
- `gid://shopify/Article/595970359511` - ap-cybersecurity-threat-modeling-your-phone
- `gid://shopify/Article/595970392279` - ap-networking-unit-1-single-device-questions

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Verify

Fetched each live URL through `lib/storefront-fetch.js`'s `page()` (no
User-Agent override, positive-marker check passed on all four fetches) and
piped the rendered HTML into `node scripts/blog.js verify <handle>`.

- ap-csp-personalized-project-reference-segments: **ok**, 102/102 chunks, 1 h1, FAQ present.
- ap-cybersecurity-threat-modeling-your-phone: **ok**, 98/98 chunks, 1 h1, FAQ present.
- ap-networking-unit-1-single-device-questions: **ok**, 111/111 chunks, 1 h1, FAQ present.
- ap-csa-reading-java-error-messages: **FAILED**, 3 of 96 chunks missing.

Per the routine's own instruction, this failure is reported rather than
papered over: the mutation succeeding is not proof the page is correct, and
here it genuinely was not.

### Root cause of the CSA failure

`content/blog/2026-09-15-ap-csa-debugging.js` had three spots where prose text
contained a literal `<` or `<=` outside of a code block: line 89 ("a loop
condition written as i <= array.length instead of i < array.length"), and the
matching MCQ option and answer explanation at lines 131 and 137. `H.p()` and
the `options`/`why` fields of `H.mcq()` in `lib/blog-house.js` pass prose
through `raw()`, which does not escape HTML (`H.code()` does escape, via
`esc()`, which is why the code blocks on this same page rendered fine). The
storefront's HTML parser read `<= array.length instead of i <` as the start of
a tag and swallowed everything up to the next `>`, which is why the missing
chunk in `blog.js verify`'s output ran across two different sentences.

Fixed by escaping the three literal `<` occurrences to `&lt;` in the source
file. Re-ran `node scripts/blog.js validate` after the fix: still 144 posts,
all pass. Re-emitted and diffed the new JSON against the one already pushed
live: the only changes are the three `&lt;` escapes, byte for byte identical
otherwise.

**The live Shopify article was not updated with this fix.** The routine's
publish step is scoped to `articleCreate` for due, not-yet-published handles,
and explicitly warns against hand-constructing any mutation outside that
emit-then-mutate flow. Updating an already-published article is a different
operation the routine does not authorize, so it is left as an open item
rather than something this run invents a fix for on its own.

## Open items

- `ap-csa-reading-java-error-messages` is live on Shopify with the
  three-sentence rendering bug described above (article id
  `gid://shopify/Article/595970261207`). The source fix is committed in this
  run; a future session needs to run `node scripts/blog.js emit
  ap-csa-reading-java-error-messages` and push the corrected body with an
  `articleUpdate` mutation, then re-verify against the live page.
- Worth a wider check, not done in this run: whether any other already-live
  post has the same unescaped-`<` pattern in an `H.p()` or `H.mcq()` call.
  This run only found and fixed the instance that this week's `verify` step
  happened to catch.
