# Weekly blog publish: 4 posts live, 1 verify failure

Date: 2026-08-31
Agent: Claude Code (scheduled weekly blog-publish routine)

## What published

`git pull` (via `git fetch origin main`) confirmed the working branch was
already at the tip of `origin/main` (`10ba9e1`), no divergence. `node
scripts/blog.js validate` passed cleanly (144 posts, all pass).

`node scripts/blog.js due 2026-08-31` returned 28 handles. Twenty-four were
already live (cross-referenced against each course blog's articles via the
Shopify connector's `graphql_query` against all four course blogs: `ap-csa`,
`ap-csp`, `ap-cybersecurity`, `ap-networking`) and were skipped to avoid
duplicating.

The remaining 4 were emitted via `blog.js emit` and created via the Shopify
connector's `articleCreate` mutation, payload passed through with `blogId`
added:

| Handle | Blog | Article ID |
|---|---|---|
| `ap-csa-vs-ap-csp-college-recognition` | ap-csa | `595736625367` |
| `ap-csp-create-task-project-ideas` | ap-csp | `595736658135` |
| `ap-cybersecurity-five-units-ranked` | ap-cybersecurity | `595736690903` |
| `ap-networking-vs-ap-cybersecurity-overlap` | ap-networking | `595736887511` |

All 4 mutations returned `userErrors: []`.

## Verify results

Fetched each live URL's rendered HTML with `curl` (the apex domain
redirects to `www.apcsexamprep.com`; one fetch also hit a transient
Cloudflare JS challenge page and needed a retry with a browser user agent
before it returned real content) and piped it to `blog.js verify`.

- `ap-csa-vs-ap-csp-college-recognition` — ok, 93/93 chunks
- `ap-csp-create-task-project-ideas` — ok, 82/82 chunks
- `ap-cybersecurity-five-units-ranked` — ok, 97/97 chunks
- `ap-networking-vs-ap-cybersecurity-overlap` — **FAILED**, 3 of 102 prose
  chunks missing

## What is still open

`ap-networking-vs-ap-cybersecurity-overlap` is live but incomplete. The
paragraph beginning "Put the two side by side and the difference in
reasoning is obvious even though both are scenario-first, evidence-based
questions..." (the closing paragraph of the "Two Questions, Two Different
Kinds of Reasoning" section, between the second practice-question block and
the FAQ heading) is present in `blog.js emit`'s output but absent from the
article body actually stored in Shopify. Confirmed by querying the live
article's `body` field directly via `graphql_query`: the paragraph is not
there.

Root cause: this run had to pass the emitted JSON to `graphql_mutation` as
an inline tool-call parameter rather than a verbatim file handoff, and the
paragraph was almost certainly dropped while that payload was being
transcribed for this one article. That is exactly the failure mode the
routine's own instructions warn against ("do not edit, retype, or
reconstruct this JSON by hand"), and it happened here despite following the
emit-then-mutate flow as closely as the available tooling allows.

Not fixed in this run. The routine's mandate is emit-then-mutate for new,
unpublished posts only, and correcting a live article's body is an
`articleUpdate`, outside that flow. Fixing it needs an `articleUpdate` on
Shopify article `595736887511` restoring the missing paragraph after the
second `apcs-post-mcq` block and before `<h2 id="frequently-asked-questions">`,
which is a manual or separately-authorized follow-up.

The previously flagged broken table row on `ap-csa-java-vs-python` (Shopify
article `595676594391`, noted in `docs/runs/2026-08-26-weekly-blog-publish.md`
and `docs/runs/2026-08-28-weekly-blog-publish.md`) is still unresolved and
still outside this routine's mandate. Flagging again here so it does not
get lost.
