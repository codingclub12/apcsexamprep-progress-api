# The 2026-09-21 BigQuery dump: the numbers hold, two of the top recommendations do not

Board 386. A full GA4 + Search Console extract arrived from the chat project on
2026-09-21 with a ranked action list. It was handed over with the warning that it
might be speculation. It is not speculation. The arithmetic re-derives exactly.
What does not survive contact with the live systems is the causal reading on top
of the arithmetic, and two of the top three actions are built on it.

Read this before acting on that file, or on any later copy of it.

## The data layer is sound

Re-derived straight from `analytics_516510863.events_*` for 20260830 to 20260920,
one query, no reference to the dump's own SQL:

    events        241,398   dump 241,398   exact
    pageviews      96,102   dump  96,102   exact
    purchases          18   dump      18   exact
    revenue      $3,885.00  dump  $3,885   exact
    form_start      2,167   dump   2,167   exact
    form_submit       116   dump     116   exact
    users          15,317   dump  15,284   +0.2%

The user count drift is GA4 reprocessing, which the dump's own method notes
predict at 1 to 5 percent. Nothing here was invented. That matters, because it
means the errors below are not sloppiness about numbers. They are a correct
number read through a wrong mechanism, which is the harder kind to catch.

## Claim 1, the headline action, is WRONG. The forms work.

The dump ranks this first: "312 people have started a name/email capture on
`csa-form` or `csp-form` and not one has ever completed it", 22 days, and it
explicitly rules out the benign explanation: "This is **not** a measurement gap".

It is a measurement gap. Klaviyo received the leads.

`Subscribed to List` events over the same window, grouped by list:

    LIST - AP CSA     173     against 188 form_start on csa-form    92%
    LIST - AP CSP     115     against 124 form_start on csp-form    93%
    LIST - AP Cyber    99
    all lists         497

A 92 percent start-to-subscribe rate is a healthy email capture, not a broken
one. The 312 lost leads do not exist.

The mechanism is in `layout/theme.liquid`. Both forms run
`onsubmit="apcsSubmit(event,'csa')"`, and `apcsSubmit` opens with
`e.preventDefault()` and then POSTs to `a.klaviyo.com/client/subscriptions/`
with `fetch`. The native submit never happens, so GA4 enhanced measurement never
records `form_submit`. `form_start` fires on first field interaction and is
unaffected, which is why the two diverge completely.

The evidence the dump used to rule out a measurement gap is the thing that
confirms it. Every form it lists as "working" (`cart`, `acw-contact-form`,
`sdd-download-form`, `ContactFooter`, `captcha_form`) is a native browser
submit that navigates. Every form it lists as "broken" is preventDefault plus
fetch. The split is by submission mechanism, not by health.

`tform-top` is not in the theme repo at all. It lives in the Shopify page body
for `/pages/ap-cybersecurity-teacher-resources`, so it was not checkable by
grep here and is unverified. Given 11 starts, it is not worth a day either way.

There is a real and much smaller problem underneath: GA4 cannot see this
conversion, so no funnel, audience or campaign report on the property counts
these 288 leads. Fix that by firing a manual `form_submit` or a custom event in
the `res.ok` branch of `apcsSubmit`. That is a measurement fix worth an hour.
It is not the top item on the site.

## Claim 2 is RIGHT, and the diagnosis is better than "never shipped"

All four teacher bundles still charge $249, confirmed against the Shopify Admin
API on 2026-09-21. The dump reports 8 orders at $249 after the announced
effective date and about $800 uncollected. Nothing contradicts that.

What the dump could not see from GA4 is why. The Cyber bundle carries:

    price           249.00
    compareAtPrice  349.00

So $349 is set as the strikethrough price. The storefront is not failing to show
the increase, it is advertising a discount FROM $349 TO $249, on the
best-selling product, and collecting the old number. The other three have a null
compare-at and a $249 price, so they were never touched at all.

Pricing is on the NEVER_AUTO list. Not changed here. Tanner decides the number
and whether the compare-at was deliberate, and it is a two-field edit once he
says.

## Claim 3, the base64 URLs, probably points outward rather than at our code

The dump says "something is encoding a slug, truncating it to 10 chars, and
building a URL from it", and that it is live somewhere in our code.

Measured:

- There is no `btoa`, no base64 and no 10-character truncation anywhere in the
  theme's `assets`, `snippets`, `sections`, `templates` or `layout`. The only
  base64 in the API repo is JWT, Judge0 payloads and token generation, none of
  which touches a page slug.
- All 58 pageviews are `(direct)` / `(none)` with a NULL `page_referrer`. If a
  page on the site were emitting these links, the referrer would name it. The
  single non-null referrer is the same garbled URL referring to itself, which is
  a reload.
- Desktop Windows and Macintosh only. No Chrome OS, which is the platform most
  of the students are on.
- `/pages/YXAtY3liZX` answers 404 live.

Direct traffic, no referrer, desktop only, arriving as 404s, is the signature of
a URL truncated in transit by something off-site. Several LMS platforms wrap
external links in a base64-encoded redirect. That is a hypothesis and it is not
proven. What IS established is that the emitter is not in either repo, so a
session told to go find it will not find it. 58 pageviews in 22 days is noise
until someone reports a broken link from an LMS.

## Claim 4, the "cheapest experiment", is likely chasing a phantom

The dump recommends diffing `/pages/ap-cybersecurity-score-calculator` (9.36%
CTR) against the CSA and CSP calculators (0.48%, 0.57%) at the same positions,
on the theory that the cyber one is doing something the others are not.

Fetched all three live. The JSON-LD stacks are identical, down to the order:
BreadcrumbList, ListItem, FAQPage, Question, Answer, WebApplication, Person,
Offer. The titles are the same shape. There is no craft difference to find, so
the CTR gap is coming from the SERP rather than from the page, and no amount of
diffing these three will surface it.

## What held up

The cleanest item in the whole file is real. `/pages/ap-cybersecurity-exam-format`
serves the title "AP Cybersecurity Exam Format & Scoring Guide" while ranking
page one for `is ap cybersecurity hard`, `is ap cybersecurity easy` and
`how hard is ap cybersecurity`. A format reference answering a difficulty
question. That is a title and intro rewrite, it ships as a Matrixify sheet, and
it is worth doing.

Worth noting alongside it: `/pages/ap-cybersecurity-exam-format-scoring` also
exists and is also about exam format. Two pages, one intent. Whoever takes the
rewrite should decide which one survives before editing either.

## What was actually checked, and how

    numbers       one BigQuery query, written without reading the dump's SQL
    forms         Klaviyo Subscribed to List, grouped by list, same window
    price         Shopify Admin API productByHandle on all four bundles
    base64        grep across both repos, plus GA4 referrer and platform split
    live pages    lib/storefront-fetch.js, which refuses a challenge body

No files were changed outside this note. No price was touched.

## Open

- `tform-top` is unverified. It is in a Shopify page body, not the repo.
- The GA4 blind spot on popup conversions is real and unfixed. Small.
- Whether the $349 compare-at was deliberate is Tanner's call.

## The thing worth carrying forward

The dump is a good document. Its numbers are exact and its page-level SEO work
is careful. It went wrong in one specific place: it reasoned from GA4 to a
conclusion about a system GA4 cannot observe, and then wrote "this is not a
measurement gap" with no check against the system that could have answered. The
sentence reads like a finding. It was a guess wearing a finding's clothes.

Anything arriving from that surface gets opened before it gets landed. This is
the fourth time that rule has paid, and the first time it saved a week of work
on a form that was never broken.
