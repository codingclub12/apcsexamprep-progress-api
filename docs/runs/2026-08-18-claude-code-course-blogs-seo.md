# Weekly course blog: engine, calendar, first four posts

2026-08-18, Claude Code. Branch `claude/course-blogs-seo-czg61u`, PR #204.

## What was asked

A blog post per course, informed by current events, aimed at real keywords, at
a high quality bar. Mid-task the ask became **one post per course per week**,
publishing **live automatically**, and AP Networking was added as a fourth
course. So the deliverable stopped being three posts and became a publishing
engine plus this week's batch.

## What is live

Four posts, all in `/blogs/news/`, published and verified:

| Course | Handle | Peg |
|---|---|---|
| ap-csa | `ap-csa-score-distribution-2026-analysis` | 2026 scores, first 4-unit cohort |
| ap-csp | `ap-csp-create-performance-task-what-changed` | Written responses moved into the exam |
| ap-cybersecurity | `ap-cybersecurity-launch-2026-27-guide` | National launch, Cisco partnership |
| ap-networking | `ap-networking-2026-27-pilot-year-guide` | Third and final pilot year |

## Evidence

Each live page was fetched and diffed against the repo source. Per post: exactly
one h1, FAQPage JSON-LD present, meta description applied, and every prose chunk
over 60 characters found in the rendered page. 320 chunks checked across the
four, 0 missing.

Verification command lives in the PR; re-runnable at any time.

## Two findings worth keeping

**1. Article pages render one h1, from the theme, and it is easy to measure
wrong.** The Dawn article template emits `<h1 class="article-template__title">`
across several lines of Liquid output. A single-line `grep -o '<h1[^>]*>'`
therefore matches nothing and reports zero h1 tags on an article that has one.

I got this wrong first, built the validator to require an h1 in the body, and
published the AP Cybersecurity post with two. Corrected in the same session:
the `h1()` helper is deleted rather than deprecated, the validator now requires
zero, and the live post was updated and re-verified.

The measurement lesson generalises. When checking rendered HTML for a tag,
match across newlines or parse it. Attribute-carrying tags in Liquid output are
routinely wrapped.

**2. Shopify preserves article body HTML byte for byte**, including
`<script type="application/ld+json">`, `<style>`, and `<details>`. Confirmed
with a throwaway probe article before committing to the component design, then
deleted. This is what makes FAQ rich results possible from the body, and it is
worth knowing before designing anything that depends on it.

## The design decision

Posts are JS modules built from components in `lib/blog-house.js` rather than
Markdown, and the reason is the auto-publish requirement. In Markdown a number
is just characters and nothing separates a verified figure from a confidently
remembered one. With components a number can only reach a reader through
`stat()` or `sourceNote()`, which demand a source and an as-of date, and
`lib/blog-validate.js` scans finished prose for figures that arrived any other
way and fails the batch.

The gate caught nine real problems across the four posts during authoring: five
unsourced figures and four meta descriptions over the SERP truncation limit.
That is nine things a reviewer would have had to catch by hand, every week,
forever.

## Still open

- **`SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN` are not set as Actions secrets**,
  so `.github/workflows/weekly-blog.yml` cannot publish yet. This week's four
  were published through the authenticated Shopify connector in-session instead.
  Until the secrets exist the weekly cadence does not run by itself. The token
  needs `write_content`; the analytics connector token only reads.
- **44 of the 48 calendar slots have no post written.** `node scripts/blog.js
  queue` lists them. Next Tuesday needs four.
- **The other 632 articles have never been checked for the duplicate-h1
  pattern.** The pillar guides in particular look likely to carry a body h1 on
  top of the theme's. Worth a sweep, and it is a separate task from this one.
- No post has a featured image. Shopify supports `image` on article create and
  it matters for social sharing.
