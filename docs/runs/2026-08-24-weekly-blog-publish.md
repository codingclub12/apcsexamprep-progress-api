# Weekly blog publish: 4 posts live, verify clean on all

Date: 2026-08-24
Agent: Claude Code (scheduled weekly blog-publish routine)

## What published

`git pull` brought in `782bef8` (already the tip of `origin/main`; the working
branch had no local divergence). `node scripts/blog.js validate` passed
cleanly (144 posts, all pass).

`node scripts/blog.js due 2026-08-24` returned 16 handles. Twelve were
already live (cross-referenced against each course blog's articles via the
Shopify connector's `graphql_query`) and were skipped to avoid duplicating:

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

The remaining 4 were emitted via `blog.js emit` and created via the Shopify
connector's `articleCreate` mutation, payload passed through verbatim with
only `blogId` added:

| Handle | Blog | Article ID |
|---|---|---|
| `ap-career-kickstart-explained` | ap-cybersecurity | `595624198359` |
| `ap-csa-2025-redesign-what-changed` | ap-csa | `595624231127` |
| `ap-csp-exam-format-every-section` | ap-csp | `595624263895` |
| `ap-networking-four-skills-explained` | ap-networking | `595624296663` |

All 4 mutations returned `userErrors: []`.

## Verify results

Fetched each live URL's rendered HTML with `curl` and piped it to
`blog.js verify`. All 4 passed clean, no missing chunks, FAQ JSON-LD present
on every post.

- `ap-career-kickstart-explained` — ok, 101/101 chunks
- `ap-csa-2025-redesign-what-changed` — ok, 82/82 chunks
- `ap-csp-exam-format-every-section` — ok, 76/76 chunks
- `ap-networking-four-skills-explained` — ok, 99/99 chunks

## What is still open

Nothing from this run. No follow-up fixes needed; all four posts are live,
complete, and verified against the repo source.
