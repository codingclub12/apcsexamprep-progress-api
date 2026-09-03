# CSP "free BI1 preview" investigation: root cause, fix, blast radius

Agent: read-only investigator. Verified nothing, edited nothing, merged nothing,
created nothing, touched no price. Every claim below is either a live storefront
observation made today (2026-09-03, single-threaded, browser User-Agent, no
Cloudflare interstitials encountered) or a citation of an existing file in this
repo, named explicitly. Board task 160 is the ticket this closes out
diagnostically; it is not closed here because no fix has been applied.

**Instrument gap, stated up front.** This session had no Shopify Admin API
credential (`SHOPIFY_ADMIN_TOKEN`/`SHOPIFY_SHOP` are unset in this environment)
and the Shopify MCP tools described in this environment's system instructions
were not actually registered as callable tools (`graphql_query` returned "No
such tool available"). Everything below was therefore gathered from the public,
unauthenticated storefront: response headers, the real-time sitemap, and the
public `/products.json` catalog feed. That instrument cannot see DRAFT or
ARCHIVED products (anything not published to the Online Store sales channel is
invisible to it, same as a real customer), cannot see who created a redirect or
when, and cannot see Shopify's admin-side change history. Where that blind spot
matters to a conclusion below, it is called out again inline.

## 1. Root cause

**Proven live, 2026-09-03:** `/products/ap-csp-big-idea-1-superpack-free`
returns `HTTP/2 301` with `location: /products/ap-csp-teacher-superpack` and
the response header `x-redirect-reason: shop_redirect`. That header is
Shopify's own signal that this response was produced by a shop-level URL
Redirect record, not a theme script, not a coincidental live product, not a
CDN/proxy hop. The same response's `server-timing` header carries
`pageType;desc="404"`, meaning Shopify's router first resolved the path to
nothing before applying the redirect. Full header dump captured in this
session's scratchpad.

**Proven live, 2026-09-03, via three independent catalog reads:**
- The real-time product sitemap (`sitemap_products_1.xml`, whose own XML
  comment says it is "kept up to date in real time") lists 51 live product
  URLs. None is `ap-csp-big-idea-1-superpack-free`. None contains `free`,
  `preview`, `big-idea-1`, or `bi1` in combination with `csp`, except
  `ap-csp-big-idea-1-flashcards` (a $-priced flashcard SKU, unrelated).
- The public `/products.json?limit=250` feed (50 products returned) has
  exactly one `$0.00` product on the entire site: `ap-csa-teacher-superpack-free-preview`.
  There is no second free product, CSP or otherwise, and no handle/title
  anywhere in the catalog combines "csp" with "free" or "preview".
- A direct handle-count grep against both feeds for the exact dead handle
  returns 0.

**Conclusion: none of the three hypotheses in the brief fits cleanly, and the
actual mechanism is closer to a fourth one.** It is not (b) - there is no
existing CSP free/BI1 product living under a different, correct handle; the
catalog has been enumerated and it is not there. It is not a clean instance of
(a) "the free product was deleted/unpublished and now forwards to the paid
product" in the usual sense either, and it is not (c) as the brief frames it -
nothing in this repo's docs, run notes, or the board task's own event log
(`created` only, zero other events, zero claims) describes a past CSP free-BI1
product that was ever sunset or merged. What is actually demonstrable:

- **2026-09-02, 14:08 UTC (board task 160 filed):** the URL was a plain 404.
  Confirmed independently by that day's site-wide dead-link sweep
  (`docs/dead-internal-links-2026-09-02.md` line 69 and
  `docs/runs/2026-09-02-claude-code-dead-internal-links.md`, "round two,"
  which states in full: *"There is no CSP free-preview product on the store at
  all, so there is nothing to point them at. CSA has one; CSP does not."*).
- **2026-09-03 (today, both this session and the independent
  `docs/runs/2026-09-03-auditor-csp-slides.md` sweep earlier today):** the same
  URL now 301s to the $249 paid bundle.
- **Nobody on the progress-api/theme side did this.** Task 160's event log is
  exactly one row (`created`, agent, 2026-09-02 14:08:37) with zero claims and
  zero further events, so the change did not come through this repo's normal
  claim/fix/artifact loop.

The most defensible read: **somebody (very plausibly a human working directly
in Shopify Admin, though this instrument cannot prove who) added a Shopify URL
Redirect that silences the 404 symptom by forwarding it to the nearest existing
page, without creating the free product the copy promises.** That is worse than
the 404 it replaced, not better: a 404 tells a teacher the link is broken; a 200
that lands on a "Get the Superpack - $249" page after they clicked "no purchase
needed" reads as a bait-and-switch. This is a distinct defect from the one board
task 160 was filed against (dead link) and should probably be tracked as an
update to 160 rather than a new ticket, since it is the same underlying absence
(no CSP free product exists) with a worse-shaped symptom on top of it.

**What would resolve the "who/why" question and this instrument cannot:**
Shopify Admin's URL Redirects list (Online Store > Navigation) or the
`urlRedirects` Admin GraphQL query, either of which needs the credential this
session does not have. That query would also settle definitively whether a
DRAFT/ARCHIVED CSP free-preview product exists in the backend (invisible to
the sitemap/`products.json` check above) - the one scenario this investigation
cannot rule out.

## 2. The fix

**There is no href to swap.** CSA's version of this exact defect (board
history: `docs/runs/2026-09-02-claude-code-dead-internal-links.md`, "round
two") was a pure page-copy fix, because CSA's free product already existed
live under a different handle. Confirmed by reading the actual Matrixify sheet
that shipped it, `imports/2026-09-02/dead-link-repair-round-2-pages.csv`: the
three occurrences on `ap-csa-teacher-superpack` were rewritten from
`/products/ap-csa-unit-1-superpack-free` (dead) to
`/products/ap-csa-teacher-superpack-free-preview` (live, $0, real content) with
every other byte of the banner/button markup untouched. CSP cannot take this
path: there is nothing live to retarget to. **This is root cause (b)'s fix
pattern, and CSP's defect is not root cause (b).**

**CSA's live free product, read directly off `/products.json`, as the spec
for what CSP would need to match:**

| field | CSA (`ap-csa-teacher-superpack-free-preview`) |
|---|---|
| title | AP CSA Unit 1 Teacher Course Bundle - Free Preview \| 2025-2026 CED |
| SEO title | Free AP CSA Teacher Bundle: Unit 1 Lessons & Quizzes \| APCSExamPrep.com |
| price | $0.00, single "Default Title" variant |
| SKU | CSA-TSP-U1-FREE |
| requires_shipping / taxable | false / false |
| product_type | Teacher Resources |
| tags | 2025-2026 CED, AP CSA, Free, Lead Magnet, Teacher Course Bundle, Teacher Resources, Unit 1 |
| published_at | 2026-03-01 (past-dated, per the Matrixify convention) |
| body | ~5KB scoped/self-contained HTML (`#csa-tsp-free`, `all:initial`, hardcoded colors with `-webkit-text-fill-color`, matching this theme's CSS-scoping convention), describing real Unit 1 teacher content: lessons, quizzes, answer keys with a "distribution audit and predicted miss patterns," a pointer to the free gradebook ("No student email required"), and cross-links to the full bundle and the AP CSA hub |
| images | 0 |

That body is real, unit-specific marketing/content copy, not a template with
the unit number swapped. **Recreating this for CSP is a content-authoring task
(write genuine Big-Idea-1-specific teacher-preview copy), not a five-minute
clone-and-rename**, even though the product-record shape (price, tags, SKU
pattern, scoping convention) can be copied mechanically.

## 3. Blast radius

**Confirmed live today: 3 occurrences, 1 page.** Fetched
`/pages/ap-csp-teacher-superpack` fresh just now; it is 374,348 bytes and
contains exactly 3 instances of `ap-csp-big-idea-1-superpack-free`:

```
Free Big Idea 1 Superpack — no purchase needed.
  <a href="/products/ap-csp-big-idea-1-superpack-free">Download free -></a>

<a href="/products/ap-csp-big-idea-1-superpack-free" class="btn-ghost">
  Free BI1 Preview — no purchase needed</a>

<a href="/products/ap-csp-big-idea-1-superpack-free" class="btn-cta-outline">
  Free BI1 Preview</a>
```

This matches exactly what the 2026-09-02 site-wide sweep found across the
**entire** corpus (1,311 pages + 50 product descriptions, per
`docs/dead-internal-links-2026-09-02.md`): all 3 links to this handle trace
back to this one page. Spot-checked live today against 6 more plausible CSP
cross-sell/hub pages for the same string (none found it):

| page | live today | occurrences |
|---|---|---|
| ap-computer-science-principles-resources | 200 | 0 |
| ap-csp-study-games-hub | 200 | 0 |
| ap-csp-teacher-resources | 200 | 0 |
| ap-csp-4-week-cram-kit | 404 (page doesn't exist; separate, unrelated issue) | - |
| ap-csp-exam-bootcamp-2026 | 404 (product handle, not a page) | - |
| ap-csp-complete-study-bundle | 404 (product handle, not a page) | - |

**What this blast-radius check cannot see:** it did not re-run the full
1,311-page corpus crawl (that is yesterday's sweep, re-cited, not repeated);
it re-verified the one known page and spot-checked six adjacent ones. If a
seventh CSP page picked up this link between 2026-09-02 and today outside the
ones checked, it would not show up here.

## 4. Recommendation - not executed, needs a human decision first

Two honest paths, presented without picking one:

**Option A - build real parity with CSA.** Author a genuine CSP Big Idea 1
teacher-preview product mirroring the CSA spec in section 2 (own SKU, own
Big-Idea-1-specific body copy, `$0.00`, `Teacher Resources` type, tags
following the same pattern), give it a stable handle (recommend following the
CSA naming convention, e.g. `ap-csp-teacher-superpack-free-preview`, rather
than reusing the currently-redirected dead handle), then ship the 3-link page
retarget as a normal Matrixify MERGE sheet exactly like CSA's round-two repair.
**This creates a new product record.** Even at $0.00, creating a new SKU is
adjacent to the money/pricing `NEVER_AUTO` rule and is content-authoring work
(real BI1-specific copy, not a clone) - flagging explicitly for Tanner's
go-ahead before anyone creates it, per this task's instructions. It is not
something to execute here.

**Option B - stop promising it until it exists.** Pull the banner and the two
buttons (or repoint them somewhere true, such as the CSP course hub) via the
normal Matrixify page-copy path, with no new product involved. This does not
touch price or create a SKU, but it does change what a live monetization page
promises a buyer, which is a content/marketing call - flagging for a quick
human nod rather than treating it as obviously auto-executable.

**Either way, the current state should not be left as-is.** A redirect that
converts "free, no purchase needed" into a 200 landing on a $249 buy page is
strictly worse than the 404 board task 160 was filed against, and is worth a
one-line addition to task 160 saying so.

## Sources cited

- `docs/dead-internal-links-2026-09-02.md` (line 69: the 3-link count, full corpus)
- `docs/runs/2026-09-02-claude-code-dead-internal-links.md` ("round two": CSA's
  actual fix mechanism, and the sentence establishing CSP had no free product
  as of that date)
- `docs/runs/2026-09-03-auditor-csp-slides.md` (finding #2: today's independent
  confirmation that the dead link is now a 200-via-301, filed before this
  investigation started)
- `imports/2026-09-02/dead-link-repair-round-2-pages.csv` (the actual Matrixify
  sheet that fixed CSA, read directly for the before/after href)
- Board task 160, `GET /api/todo/160` (status `open`, one `created` event,
  zero claims, zero artifact - filed 2026-09-02 14:08:37)
- Live storefront, 2026-09-03: `sitemap_products_1.xml`, `/products.json?limit=250`,
  header dump of `/products/ap-csp-big-idea-1-superpack-free`, full body fetch
  of `/pages/ap-csp-teacher-superpack`, and the 6 spot-checked CSP pages above
