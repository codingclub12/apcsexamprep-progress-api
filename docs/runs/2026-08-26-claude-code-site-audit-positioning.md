# Site audit: positioning, architecture and hub-page SEO

2026-08-26, Claude Code. Planning pass only. No storefront change, no theme
change, no ledger write.

## What was asked

Audit the site from the top down: bring the pages in line with current
positioning and offerings, work out what is best for SEO on the hub pages, and
propose how the architecture should fit together. Research-backed, planning phase.

## What changed in this repo

- `docs/site-audit-2026-08-positioning.md`, the full write-up.
- This run note.

Nothing else. The audit proposes work; it does not perform it.

## Evidence

Crawled the live storefront at roughly one request per second with backoff, per
`docs/site-crawl.md`. About 80 requests. No credential sent to the storefront.

Inventory from the sitemaps: 1,326 pages, 654 blog posts, 51 products, 10
collections, 2,041 URLs total.

Findings that carry the argument:

- **robots.txt is a 1-byte body** (HTTP 200, single newline) on both `www` and
  the apex. Shopify's default rules and its `Sitemap:` directive have been
  overridden by an empty `robots.txt.liquid`.
- **29 of 32 fetched pages carry a duplicate `<h1>Get in Touch</h1>`** from a
  contact section in the shared page template. One theme edit reaches ~1,300
  pages. Several pages additionally render a full title string, brand suffix and
  pipes included, as an H1; `/pages/ap-csa-topics` has five H1s.
- **AP Cybersecurity has eight live URLs on one overview intent**, two on exam
  format, three on practice. `/pages/ap-cybersecurity-curriculum` and
  `/pages/ap-cybersecurity-practice-questions` serve a byte-identical meta
  description. `/pages/ap-cybersecurity-complete-course-guide` has the brand
  suffix appended twice. A live SERP for AP Cybersecurity teacher curriculum
  returned five separate apcsexamprep.com URLs.
- **CSA and CSP hubs advertise 2025-2026** in title, H1 and description, on
  26 August 2026. The newer pages (`ap-csa-course`, `ap-cybersecurity`) carry the
  correct year, so this is drift on the established pages rather than a
  convention problem.
- **Course schema exists only on `ap-csa-course` and `ap-networking`.**
  `ap-csp-course`, `ap-cybersecurity` and all four Command Centers have
  BreadcrumbList only.
- **Collections are two years behind the products.** No collection for
  Cybersecurity, Networking, Intro Java or teacher bundles, though all four
  teacher bundle products exist. Every collection checked has no meta
  description and an H1 of `Collection: X`.
- **Blog output is inverted:** 430 CSA daily-practice posts against 10 for AP
  Cybersecurity, the course going nationwide this year.

## Corrections made during the pass

Recorded because both would have shipped as false findings.

- An initial single-line grep reported missing `<title>` tags and an H1 of
  "Get in Touch" on several hubs. Both were parsing artifacts on multiline tags.
  Re-ran with a real parser: titles exist, and the H1 issue is a *duplicate*
  second H1, not a wrong one. Materially less severe than the first read.
- The 53 `-debug` lesson pages looked like near-duplicates of the canonical
  lessons. Spot-checked `ap-csa-lesson-2-7-while-loops-debug`: it is a distinct
  debugging exercise with its own authored title and description. Not a
  duplicate. Left alone.

Related inversion worth keeping: the newer generated pages (exercise, FRQ, debug)
all had properly authored 94-to-128 character descriptions, while the canonical
lesson pages were the ones falling back to scraped body text.

## What is still open

**GSC and Ahrefs were both unavailable.** The Ahrefs workspace is a trial with
`units_limit_workspace: 0`, so every Site Explorer call returns
`API units limit reached`. GSC is not connected to either Ahrefs project
(9205271, 9205272) and `gsc-keywords` returns no data.

This blocks one specific thing and it is written into the plan as a gate: the
proposed consolidation of the cannibalised clusters must not be executed until
GSC is connected, because picking which URL to keep without click data is
guessing, and a wrong 301 redirects away the page that was earning the traffic.

Phase 1 of the plan (robots.txt, the template H1, homepage copy, the year
rollover, title fixes, noindex on tooling) has no data dependency and is safe to
ship now.

## Artifact

https://claude.ai/code/artifact/0202cbe8-64cd-4e2f-b688-ef9b0074e205
