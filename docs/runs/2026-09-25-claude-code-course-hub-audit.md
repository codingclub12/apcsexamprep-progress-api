# 2026-09-25: the four course hub pages, audited

Board #426 (this audit), #428 (the live fact fixes it found), related #419 and #151.

Tanner asked whether the hero on each course hub should span the screen, whether the
hubs need updating, and whether there is a smarter way to set them up. The four hubs are
`/pages/ap-csa-course`, `/pages/ap-csp-course`, `/pages/ap-cybersecurity-complete-course-guide`
and `/pages/ap-networking`, the "Course" door for each course in the homepage spec.

## What was produced

- `docs/audits/2026-09-25-course-hub-pages.html`: the report, screenshots embedded, so it
  opens on a phone with nothing else.
- `docs/audits/2026-09-25-course-hub-mockup.html`: static mockup of one shared hub layout,
  CSA facts corrected, plus the same hero drawn for all four courses.

Nothing on the storefront or in the theme was changed.

## The answers

1. Full width: the navy band yes, the text no. Band edge to edge like the nav and the
   homepage, content in the nav's 1200px column. Shorter hero: it is 440 to 660px tall at
   1440px today, and on a 390px phone no button is on the first screen for CSA, CSP or
   Cyber.
2. Update: yes. Wrong facts are live (list below).
3. Smarter setup: one `page.course-hub` theme template with the course facts in one
   snippet, instead of four hand-built bodies. The page body keeps the per-course writing.

## Findings worth keeping

- CSA unit cards: Unit 3 "14 lessons, ~30%" and Unit 4 "12 lessons, ~25%". The manifest
  header in `seed/csa-course-manifest.js` says 15 / 12 / 9 / 17, and
  `docs/csa-ced-course-at-a-glance.txt` gives 15-25, 25-35, 10-18 and 30-40%.
- CSA still carries "54.5%" in 4 visible places, 3 JSON-LD strings and the meta description.
  Theme PR #132 removed it from the theme this morning; the page body was never touched.
- Cyber `<title>` is `... | APCSExamPrep.com | APCSExamPrep.com` (86 chars) because the page
  has no SEO title set and `layout/theme.liquid` appends the suffix to `page_title`. It has
  no SEO description either, so Shopify serves the first 320 characters of body text.
- Networking body text renders in Times New Roman: `#apnet-hub { all: initial !important }`
  and no paragraph font set afterwards. CONVENTIONS asks for the reset; the reset needs a
  font after it.
- All four print a hidden `h1.main-page-title` from `sections/main-page.liquid`, and
  `templates/page.json` puts a contact form section (about 1,350px tall) under every page
  that uses the default template, hubs included.
- Links: 238 unique internal links across the four bodies. 234 answer 200, three are 301s
  on CSA (Java Quick Reference lands on the exam prep hub rather than the reference sheet),
  one 404 is Cloudflare's email-protection rewrite. Networking links none of its three prep
  pages. The CSP prep hub is the only prep hub that does not link back to its course. 107
  of Cyber's 152 unique links point at single activities.

## Traffic, and why it changes the priority

Shopify sessions by landing page, 90 days: 4,727 landings on the four hubs. 78% direct,
14% search, 80% desktop. Cyber 2,886, CSA 1,242, CSP 406, Networking 193. These are
navigation pages for classes first. The SEO work on them is mostly about passing
authority down and presenting well in results, not about the hubs ranking.

## Why a template and not four body edits

The theme caps `.content-for-layout` at 1500px and the page body sits in a 1000px column.
The homepage escaped at the section level with `:has(#apcs-home)`. A body can only fake
full width with `100vw`, which adds a horizontal scrollbar where scrollbars take space
(Windows). A template also gives one source for unit counts and dates, which is the drift
behind the CSA error, and drops the hidden H1 and the contact form on four pages without
touching the default template the other pages use.

## Still open

- Tanner's call: template or body edits; whether hubs carry ads (CSA, CSP and Cyber are on
  the theme's no-ads list, Networking is not, and #419 assumes rails); timing.
- #428 should not wait on the redesign for the CSA facts.
- Not measured: rankings and queries (the Ahrefs account returned "API units limit
  reached" and there is no Search Console connection), visitors' real screen widths.

## Method notes for the next session

- Headless Chromium here fails TLS against the storefront (`ERR_CERT_AUTHORITY_INVALID`)
  even with the NSS store populated. What worked without turning verification off: route
  every request through Node `fetch` inside `page.route`, run with `NODE_USE_ENV_PROXY=1`
  so it uses the proxy and `NODE_EXTRA_CA_CERTS`.
- Parallel `curl` link checks against the storefront hit 429 on about a quarter of URLs at
  six at a time. Sequential with a short sleep cleared every one.
- `pageBody()` refuses the CSA body because Cloudflare rewrote an email address in the
  `.json` response. For reading that is fine to bypass with `raw()`; for a sheet it is
  not, and the body has to come from the Admin API.
