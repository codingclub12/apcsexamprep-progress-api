# Weekly blog publish: 4 posts live, verify clean on all

Date: 2026-08-28
Agent: Claude Code (scheduled weekly blog-publish routine)

## What published

`git pull` (via `git fetch origin main`) confirmed the working branch was
already at the tip of `origin/main` (`3e64bb8`), no divergence. `node
scripts/blog.js validate` passed cleanly (144 posts, all pass).

`node scripts/blog.js due 2026-08-28` returned 24 handles. Twenty were
already live (cross-referenced against each course blog's articles via the
Shopify connector's `graphql_query` against all four course blogs: `ap-csa`,
`ap-csp`, `ap-cybersecurity`, `ap-networking`) and were skipped to avoid
duplicating:

- `ap-csa-score-distribution-2026-analysis`
- `ap-csa-objects-references-explained`
- `ap-csa-variable-table-tracing-method`
- `ap-csp-create-performance-task-what-changed`
- `ap-csp-practice-exam-common-mistakes`
- `ap-csp-pseudocode-complete-syntax-guide`
- `ap-cybersecurity-cia-triad-explained`
- `ap-cybersecurity-device-security-frq-guide`
- `ap-cybersecurity-launch-2026-27-guide`
- `ap-networking-ip-address-explained`
- `ap-networking-2026-27-pilot-year-guide`
- `ap-networking-troubleshooting-method`
- `ap-career-kickstart-explained`
- `ap-csa-2025-redesign-what-changed`
- `ap-csa-java-vs-python`
- `ap-csp-binary-bits-overflow`
- `ap-csp-exam-format-every-section`
- `ap-cybersecurity-social-engineering`
- `ap-networking-dns-explained`
- `ap-networking-four-skills-explained`

The remaining 4 were emitted via `blog.js emit` and created via the Shopify
connector's `articleCreate` mutation, payload passed through verbatim with
only `blogId` added:

| Handle | Blog | Article ID |
|---|---|---|
| `ap-csa-practice-test-september-guide` | ap-csa | `595701596375` |
| `ap-csp-mcq-pacing-strategy` | ap-csp | `595701629143` |
| `ap-cybersecurity-unit-1-vocabulary-ranked` | ap-cybersecurity | `595701661911` |
| `ap-networking-ping-traceroute-tools` | ap-networking | `595701694679` |

All 4 mutations returned `userErrors: []`.

## Verify results

Fetched each live URL's rendered HTML with `curl` and piped it to
`blog.js verify`. All 4 passed clean, no missing chunks, FAQ JSON-LD present
on every post.

- `ap-csa-practice-test-september-guide` — ok, 91/91 chunks
- `ap-csp-mcq-pacing-strategy` — ok, 114/114 chunks
- `ap-cybersecurity-unit-1-vocabulary-ranked` — ok, 144/144 chunks
- `ap-networking-ping-traceroute-tools` — ok, 114/114 chunks

## What is still open

Nothing from this run. No follow-up fixes needed; all four posts are live,
complete, and verified against the repo source.

The known broken table row on `ap-csa-java-vs-python` (flagged in
`docs/runs/2026-08-26-weekly-blog-publish.md`) is still unresolved and still
outside this routine's mandate, which is emit-then-mutate for new,
unpublished posts only. Flagging again here so it does not get lost: fixing
it needs an `articleUpdate` on Shopify article `595676594391` with the
`content/blog/2026-08-25-ap-csa-java-vs-python.js` `<` escaping fixed first,
which is a manual or separately-authorized follow-up.
