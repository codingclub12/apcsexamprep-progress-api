# First-time customer walkthrough of apcsexamprep.com

2026-09-11, Claude Code, board task 311.

Walked the live storefront the way somebody who has never been here would: land
on the homepage, try to work out what this is, follow the nav, try to buy
something, try to sign up. Every fetch went through `lib/storefront-fetch.js`,
so nothing below is a bot challenge being read as content.

## What I could not check, up front

I could not run a real browser. Chromium and Playwright are both installed here,
but this container's TLS relay drops the browser's handshake for every host,
google.com included, so `page.goto` returns ERR_CONNECTION_RESET every time.
That costs the rendered-layout half of the audit: no horizontal-overflow test at
390px, no tap-target measurement, no LCP or CLS. Everything I say about mobile
below comes from markup and CSS, which can tell you the drawer is wired
correctly and cannot tell you whether a table pokes off the right edge of a
phone. Somebody should open the site on an actual phone and look.

Timing numbers include the agent proxy hop, so read them as upper bounds.

## The friction, worst first

### 1. The homepage tells CSP students a course structure that was retired, and two links land on the wrong topic

The study guide block is labelled **"Principles (6 Units)"**. AP CSP has five Big
Ideas. Five of the six links under that label now 301 somewhere else, and the
numbering does not survive the trip:

| Link text on the homepage | Where you actually land |
|---|---|
| Unit 1: Digital Information | Big Idea 1 Creative Development |
| Unit 2: The Internet | Big Idea 4 Computer Systems Networks |
| Unit 3: Algorithms | Big Idea 3 Algorithms Programming |
| Unit 4: Data and Simulations | Big Idea 2 Data |
| Unit 5: Cybersecurity | no redirect, still the old page |
| Unit 6: Global Impact | Big Idea 5 Impact of Computing |

Row one is the bad one. A student clicking "Digital Information" gets a page
titled "Big Idea 1 Creative Development", which is a different topic, not a
renamed one. Rows two, four and six change number under the reader.

The site already disagrees with itself about this on one screen. The CSP
dropdown in the nav says "Study Guides, All 5 Big Ideas". The footer links Big
Idea 1 through 5 by their correct handles. Only this homepage block still
carries the old scheme.

**Fix:** rewrite the CSP tile to the five Big Ideas, reusing the URLs the footer
already has right, and change the label from "Principles (6 Units)" to
"Principles (5 Big Ideas)". Ships as a Matrixify sheet for the one page. The
lone "Unit 5: Cybersecurity" page is a separate question: it is the last page
still live under the retired numbering and somebody has to decide whether it
redirects into Big Idea 5 or stays.

### 2. On a desktop there is no way to reach the shop

There are 50 published products across four pages of `/collections/all`. The
string `/collections/all` appears exactly once in the homepage HTML, at byte
127380, inside the mobile drawer, as an "All Products" button. Desktop gets
nothing. The only commerce links in the desktop nav are one "Teacher Bundle"
entry buried as the first item inside each course dropdown, and a cart icon that
reads 0.

So a teacher on a laptop, the exact person with the budget, can browse this
whole site and never find that it sells 50 things.

**Fix:** put a "Shop" link in the desktop nav-right next to the cart, pointing at
`/collections/all`. One line in the theme's nav snippet. This is the cheapest
item in this list and probably the one worth the most.

### 3. The homepage opens with a link directory and hides the reason to trust it

Everything a visitor reads before the first tile:

> AP CS Exam Prep. Daily Practice. Question of the Day. Build consistent study
> habits with daily practice.

That is the whole of it. No sentence saying what this is or who it is for, no
call to action, no price.

The material that would actually convince somebody is all on the page, just
underneath a wall of links. Measured against the page's visible text:

- the credibility block (54.5% of CSA students scoring 5s, 34.8% for CSP, 1,845
  tutoring hours, 451 five-star reviews, the Wyzant 5.0 rating, a named
  testimonial) sits 46% of the way down
- the paragraph explaining what is free and what costs money sits 70% down
- a visitor scrolls past 273 of the page's 325 links before reaching any of it

The free/paid paragraph is the single most common question a first-time visitor
has, and it is below almost the entire page.

**Fix:** hoist a short hero above the first tile. One sentence on what the site
is and who it serves, the stat row that already exists, and two buttons: start
free, and teacher bundles. Nothing new has to be written. It is all further down
the same page already.

### 4. The tutoring prices on the homepage do not match the store

Homepage, in two places: "$150/hr single session, $125/hr (5-pack)".

The catalog:

| Product | Price | Per hour |
|---|---|---|
| ap-cs-tutoring-single-session | $150.00 | $150 |
| ap-cs-tutoring-3-hour-package | $375.00 | $125 |
| ap-cs-tutoring-5-session-package | $550.00 | $110 |

The $125 figure is the three-hour package, not the five-pack. The five-pack is
$110/hr, so the homepage is charging more for it in the copy than the store
charges at checkout.

Pricing is on the NEVER_AUTO list, so I have not touched it. Tanner has to say
which number is the intended one before anybody edits either side.

### 5. A catalog landing page is published as a buyable $0.00 product that demands a shipping address

`/products/products`, title "AP CSA & AP CSP Exam Prep Products", is a Page
built as a Product. It renders a full product template with a live Add to cart
button and a $0.00 price, and it is listed on page 1 of `/collections/all`,
which is where the mobile drawer's "All Products" button sends people.

It is the only variant in the store that requires shipping. Every one of the
other 53 is correctly digital.

Proved rather than inferred. Added variant 48480468336855 to a cart:

```
POST /cart/add.js   200
GET  /cart.js       item_count 1, total_price 0, requires_shipping true
```

So a shopper who clicks it gets a free line item that then asks for a postal
address on a store that ships nothing. That is also why there is a shipping
policy link in the footer of an all-digital shop.

**Fix:** the content belongs on a Page, not a Product. Unpublishing the product
and moving the body is the clean version, but that is a handle decision and
handles are NEVER_AUTO, so it is Tanner's call. If it has to stay a product, the
one-field version is to untick "This is a physical product" on the variant,
which kills the shipping prompt and leaves everything else alone.

### 6. The Teachers menu was built for Cybersecurity and the site now has five courses

All four entries point at cyber handles, and two of them point at the same URL:

```
Go to my hub        -> /pages/cyber-command-center
Gradebook           -> /pages/cyber-dashboard
Command Center      -> /pages/cyber-command-center
Join / Class Setup  -> /pages/cyber-class
```

This is less bad than it looks, and it is worth knowing why before anyone
"fixes" it. Two of those pages have already been generalised: `cyber-dashboard`
serves a page titled "Teacher Dashboard" and `cyber-class` serves "AP CS Teacher
Portal: Free Class Codes & Gradebook". Both cover CSA, CSP, Cyber and
Networking. The handles lie; the pages do not.

`cyber-command-center` is the real one. It is titled "AP Cybersecurity Pacing
Guide 2026-27", and it is where "Go to my hub" sends a CSA teacher.

**Fix:** two menu edits, no handle changes. Drop the duplicate "Command Center"
entry, and repoint "Go to my hub" at the dashboard. Renaming the handles would
be the tidy version and would also break every inbound link and every teacher's
bookmark, so do not.

### 7. Every page ships 240KB of styling and scripting that no other page can reuse

The homepage is 400,514 bytes of HTML. Of that, 113,735 bytes is inline CSS
across 18 `<style>` blocks and 128,033 bytes is inline JavaScript across 53
`<script>` blocks. The visible text is 21,656 characters.

So 60% of the document is code pasted into the page body, which means the
browser cannot cache any of it and pays for it again on the next page. Gzip
takes the wire cost down to about 94KB, and TTFB measured between 0.57s and
1.24s on repeat fetches, so this is not an emergency. It is a tax on every
navigation on a site built around clicking between lessons.

The external scripts are handled properly: 20 of the 22 are async or defer. Only
Cloudflare's email-decode shim and Shopify's standard-actions block.

**Fix:** not a quick one, and not urgent. When a page set gets regenerated
anyway, move its `<style>` block into a theme asset. Worth doing on the lesson
template first, since that is where students navigate repeatedly.

### 8. The join page speaks Cybersecurity to every student

The class code field's placeholder is `CYBER-XXXX` on the create tab and
`CYBER-XXXX or ME-XXXX` on sign-in. Real codes are CSA-, CSP-, CYBER- and ME-.
A CSA student is shown an example in a format that is not theirs, on the one
screen where getting the format wrong stops them.

**Fix:** placeholder `CSA-1234`, and hint text naming all four prefixes.

## What is working, and worth not breaking

Not everything is friction, and two of these are better than they had to be.

**No broken links.** All 161 unique internal links on the homepage answer. 149
are straight 200s and 12 are clean 301s, and no 404s at all. For a site this
size that is genuinely unusual.

**Checkout is correctly digital.** 53 of 54 variants have requires_shipping
false, so buyers go straight to payment with no address form. The one exception
is the fake product in item 5.

**The mobile nav is properly built.** Real hamburger button with aria-label,
aria-expanded and aria-controls, a drawer that mirrors the desktop links, and a
breakpoint that hides the desktop list. I could not watch it open, but the
markup is right.

**The join flow reads like a person wrote it.** Three clear tabs, and the
microcopy does real work: "Use your first name and last initial so your teacher
recognizes you", and the warning that the personal code is the only way back in
because accounts have no email. It also already fails over between two API hosts
so a school content filter blocking one does not lock a class out.

## What I would do first

Items 2 and 1, in that order, and they are both small.

Item 2 is one nav link and it unblocks the only path to revenue on the device
teachers actually shop on. Item 1 is one Matrixify sheet against one page and it
stops the CSP section of the homepage from sending students to the wrong topic.

Item 3 is the one with the most upside and the most judgement in it, so it wants
Tanner rather than an agent: the words matter more than the layout.

Item 4 is blocked on a decision about what the five-pack costs.

## Open

- Nobody has looked at this site on a real phone as part of this pass. The
  browser route is unavailable in this container and the finding I most want and
  do not have is whether anything overflows horizontally at 390px.
- Item 4 needs Tanner to say which tutoring number is right.
- Item 5 needs a decision on whether `/products/products` becomes a Page.
- This audit is a read. Nothing here has been verified by a second session, and
  under rule 4 I cannot verify it myself. The live evidence above is
  re-derivable: refetch the URLs and the cart call and the same numbers come
  back.
