# The free Unit 1 preview stops being a checkout

Agent: Claude Code. Board task 309, created and claimed at the start of the
session because the work arrived as a chat instruction and nothing else on the
board announced it.

## What was asked

Tanner, 2026-09-10: "Can we have the free preview be redirected to the google
drive preview instead of being a product."

## What was wrong

`/products/ap-csa-teacher-superpack-free-preview` is a real Shopify product
priced 0.00, tagged Lead Magnet, with a single variant and nothing to ship.
Three CTAs on `/pages/ap-csa-teacher-superpack` point at it, and all three say
some version of "no purchase needed" before landing a teacher on a page with an
Add to cart button. The files were always the offer and the cart was in front
of them.

## What shipped

`templates/product.drive-preview.liquid` in the theme repo. A product carrying
the template suffix `drive-preview` stops rendering as a product and bounces to
the Drive folder named in the template. Then the suffix was set on the one
product.

Destination: `https://drive.google.com/drive/folders/1wLyRVqeMB0B2yn3UxMLPGoJfcD-FhrOV`,
the folder titled "AP CSA Unit 1 Course Preview".

Two halves, in this order and only this order: the theme has to carry the
template before a product's suffix names it, or Shopify is pointing a live URL
at a file that is not there.

## Why a template and not a Shopify URL redirect

A URL Redirect can target an external URL, which is the first thing worth
checking and it does not settle the question. Shopify only applies one to a
path that resolves to nothing: the CSP investigation on 2026-09-03 caught the
mechanism in a response header, `server-timing: pageType;desc="404"` on a path
that was 301ing. This product answers 200, so a redirect record on it would sit
there inert.

Making it 404 means unpublishing or archiving the product, which is a handle
change and a catalog change, and neither is an agent's call. The template does
the visible half without touching the product record beyond one field.

## Evidence

`deploy-gates/2026-09-10-free-preview-drive-redirect.json` in the theme repo,
run twice. `--pre` before the merge: suite plus eight mutations. Again without
`--pre` after the deploy and the suffix change, when the live check could
observe something.

    suite     npm run verify:drive-preview, 14 passed 0 failed
    mutation  8, each red on the assertion it targets rather than a neighbour
    live      the product URL serves the bounce and no cart, 10109 bytes

The live assertion was false before this shipped, which is the only reason it
is worth running. That URL served the product page this morning: zero
occurrences of the folder id, a working add-to-cart form. Three assertions in
order, and the order is the point:

1. `apcs-drive-redirect` is in the body. This is the positive marker. A bot
   challenge page contains neither that string nor `/cart/add`, so without this
   assertion first, "no cart form" would pass on a fetch that never reached the
   page. That is the exact false report `verify-csp-applied-cards-live` produced
   about 17 correct pages on 2026-09-03.
2. the folder id is named.
3. no `/cart/add` survives.

No User-Agent is sent.

The deploy was confirmed against Shopify rather than against GitHub, per the
theme's own convention: the MAIN theme carries
`templates/product.drive-preview.liquid` at `updatedAt 2026-09-10T14:37:55Z`,
size 3953, byte-identical in size to the file on disk. That query also settles
independently something CLAUDE.md says only Shopify Admin can answer: the
published theme is named `APCSExamPrep-theme/claude/site-linking-audit-yh...`,
so the connected branch is still `claude/site-linking-audit-yhufjk` and the PR
was opened against the right base.

Folder sharing was read off the Drive API rather than the share dialog:
`{"role":"reader","type":"anyone"}`. An anonymous fetch of the folder answers
200.

## What was NOT changed

The product is still ACTIVE, still priced 0.00, still `ap-csa-teacher-superpack-free-preview`,
still in the catalog and still in `/products.json` and the sitemap. One field
moved, `template_suffix`, from null to `drive-preview`. Nothing was
unpublished, archived, renamed or repriced.

Rollback is that one field. Clear it in Shopify admin and the product page is
back; the template can stay where it is.

## Open, and all three are Tanner's

**There are two identical folder names and only one is shared.**
`1wLyRVqeMB0B2yn3UxMLPGoJfcD-FhrOV` is anyone-with-the-link and is the one now
wired up. `1tylLppVxVyQABXe5Ho8JmLeH1OJdmFBg` has the same title and is private
to the owner. Pointing at that one would put a request-access screen where the
files should be, and nothing on the storefront would say so.

**The folder a teacher now lands in needs a tidy.** It holds two Unit 1 trees,
`Unit 1` (created 2026-09-10, 15 lesson folders) and
`Unit_1_Using_Objects_and_Methods` (2026-08-04, the same 15 plus
`Unit_1_Assessments`), plus a `.DS_Store` at the root and another one inside.
A teacher arriving cold has to guess which tree is the real one. Not touched
here: deleting files out of somebody's Drive is not an agent's call, and the
duplicate may be deliberate.

**The checkout was the lead capture and it is gone.** A 0.00 order still
collected an email address; a Drive link collects nothing. The product is
tagged Lead Magnet and this trade was not part of the ask, so it is stated
rather than solved. If the email matters more than the friction, the shape that
keeps both is a gate in front of the folder link rather than a cart.

One more, smaller: the URL still returns 200 with real content on it, so it
stays indexable, but Google reads a zero-second meta refresh as a redirect and
will over time try to pass the ranking to a Drive folder it will not rank. If
`/products/ap-csa-teacher-superpack-free-preview` is earning search traffic
today, that traffic has somewhere to go now and may not keep arriving.

## Artifacts

- theme PR: https://github.com/codingclub12/APCSExamPrep-theme/pull/113 (merged, e7c3c28)
- theme files: `templates/product.drive-preview.liquid`,
  `scripts/verify-drive-preview.js`,
  `deploy-gates/2026-09-10-free-preview-drive-redirect.json`
