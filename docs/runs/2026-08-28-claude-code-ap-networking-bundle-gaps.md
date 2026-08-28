# 2026-08-28 claude code: AP Networking Teacher Bundle, what is actually missing

## The ask

Tanner, in session: scan the AP Networking Teacher bundle for holes, prompted by
a question about a purchaser.

## The finding that matters

**The bundle has exactly one purchaser and they have received nothing.**

Order #1219, placed 2026-08-06, $249, PAID and captured, payout landed 2026-08-07.
Twenty-two days later it is still UNFULFILLED, with no fulfillment record and no
digital delivery event of any kind on the order timeline. The buyer got an order
confirmation email and that is all. Buyer identity is on the order in Shopify
Admin and is deliberately not copied into this repo.

The product page promises "Download the full bundle right after checkout."

The comparison that proves it is a setup gap rather than a platform gap: AP
Cybersecurity Founding Teacher Bundle order #1255 was fulfilled and emailed
**eight seconds** after checkout, by the Shopify Digital Products app:

```
15:23:49  order placed
15:23:57  Digital Products marked 1 item as fulfilled
15:23:59  Digital product email delivered to <buyer>
```

Order #1219 has no equivalent line. The APNET-TEACHER-BUNDLE variant has no file
attached in the Digital Downloads app, so checkout completes and nothing ships.

### It is not only networking

Same fault on CSA-TSP-COMPLETE. Every AP CSA Teacher Course Bundle order ever
placed is unfulfilled: #1218, #1239, #1252.

**Four paid teacher-bundle orders, $996, delivered nothing.** Cybersecurity is
the only bundle whose delivery works.

## The second delivery gap: the in-site slides gate does not know this course

Even for a buyer who registers a teacher account, the platform cannot hand over
the decks.

```
$ curl https://progress.apcsexamprep.com/api/slides/ap-networking/1.1
{"error":"Slides are not available for this course yet"}     # 404

$ curl https://progress.apcsexamprep.com/api/slides/ap-csp/1.1
{"error":"Unknown lesson"}                                    # course is wired
```

`config/slide-manifests.js` wires `ap-csp` and `ap-cybersecurity` only. There is
no `ap-networking` manifest, so the route 404s the whole course by design ("a
course absent from this map 404s rather than pretending to have content").

CSP and cyber teachers reach their decks through that gate. Networking has no
equivalent path, in or out of the site.

## The content is built. That is the good news and it is worth saying first

Nothing below is a content-authoring hole. Checked against Drive, the live
sitemap and the seeded manifest:

- **Decks exist.** `AP Networking Course Materials` holds `APNetworkingUnit1Decks`
  through `Unit4Decks`, each with per-topic folders, each holding Teacher and
  Student editions. Consistent with the advertised 44.
- **Documents exist.** `Unit1Documents` through `Unit4Documents`, each with
  per-topic folders plus `test` and `performance-task` folders. The four named
  performance tasks have a home.
- **The four browser labs are live**, under exactly the advertised names:
  `ap-networking-lab-1-device-triage-bench`, `-2-soho-documentation`,
  `-3-segmented-lan-build`, `-4-capture-and-trace`.
- **Every topic is graded and reporting.** All 22 topics carry a cfu and an
  8-point quiz in `scripts/seed-manifest.js`. `node scripts/verify-networking-reporting.js`
  reports 67 pages read, 0 unreachable, and every page that reports a grade loads
  the reporter.
- **Unit tests match the copy.** 16 + 24 + 24 + 24 = 88 multiple choice, and two
  free-response prompts per test is the advertised 8.
- **Structure matches the framework exactly.** 22 of 22 topics, 4 units, correct
  titles and sequence, and no invented EK identifier anywhere on the site.

So this is a distribution failure sitting on top of a finished course.

## Claims on the product page that the repo's own audits contradict

### 1. "Every unit practices the AP Career Kickstart skills of connecting and configuring, securing, troubleshooting, and collaborating"

`docs/ap-networking-full-year-readiness.md` measured collaborate at **0 percent
of the grade, with no asset at all**. The framework asks about 5 percent and
requires skill category 4 in topics 1.4 and 2.4.

This is the single indefensible sentence on the page. A department head reading
the published framework alongside the product finds it in an afternoon.

### 2. Hands-on is 7 percent of the grade against a framework that asks 24

Ten of 22 topics carry an implement-and-document or verify sub-skill. The course
answers with four labs worth 32 of 448 points.

`config/networking-hands-on.json` already specs the fix (+10 configuration
activities, +4 unit documentation records, +1 team task, 448 to 576 points, which
lands hands-on at 23.6 percent and collaborate at 4.2). None of it is seeded:
`NET_HANDS_ON_LIVE` is false. Flipping it needs the pages to exist first.

### 3. "Authored to the official course framework" is true of structure, thin on depth

`node scripts/networking-ek-coverage.js`, run today, unchanged since 2026-08-19:

```
OVERALL: 166/284 = 58.5%   (118 codes uncited)
Unit 1:  21/50  = 42%      Unit 3:  61/97  = 63%
Unit 2:  38/71  = 54%      Unit 4:  46/66  = 70%
```

Topics 1.1, 1.2 and 1.3 cite **none** of their A-group Essential Knowledge, the
objective College Board leads with for each topic. Unit 1 is both the weakest
unit and the first thing a September pilot class touches.

The good news from `scripts/networking-gap-triage.js`: about 69 percent of the
118 is annotation rather than authoring, and only **three** statements are
genuinely absent, all about endpoint device categories (2.2.D.6, 2.3.A.3,
2.3.A.4). That is one afternoon of writing plus a citing pass.

### 4. "Four full browser labs fill 26 periods of lab time"

College Board has not published pacing. The framework carries a literal unfilled
`[X-Y] class periods` placeholder. The 26 is an in-house estimate and is fine as
one, but it cannot be defended as AP pacing if a buyer asks where it comes from.

## Smaller things found on the way

- **Duplicate lab handles live.** `ap-networking-lab-1-4` sits alongside
  `ap-networking-lab-1-device-triage-bench`, and the same for labs 2, 3 and 4.
  Eight handles for four labs.
- **Duplicate Drive folder.** `AP Networking Course Materials (1)` alongside the
  real one, created a day later.
- **No storefront collection for networking**, per `docs/site-audit-2026-08-positioning.md`.
- **No Shopify webhook subscriptions are visible to the Admin API client.**
  `webhookSubscriptions` returns empty. That query only sees webhooks owned by the
  querying app, so this is not proof the orders/paid webhook is unregistered, but
  it is worth confirming in Admin that entitlement grants are firing at all.
  The SKU map is not the problem: `APNET-TEACHER-BUNDLE` was mapped 2026-07-31,
  six days before order #1219.
- **Nothing on the ledger tracks any of this.** Both networking board items are
  closed and done.

## Suggested order

1. Attach the bundle files to the APNET-TEACHER-BUNDLE variant in Digital
   Downloads, then fulfill #1219 to trigger delivery. Do the same for
   CSA-TSP-COMPLETE and its three orders.
2. Confirm the orders/paid webhook is registered and that #1219 produced an
   entitlement or a pending entitlement. If pending, the buyer must register with
   the same email, and nothing in the purchase flow currently tells them that.
3. Cut the word "collaborating" from the product page, or ship the team task that
   makes it true.
4. Annotate Unit 1's A-group EK. Cheapest defensible-depth gain available.

## Evidence

Everything above is a live read taken 2026-08-28, not a restatement of a prior
report: Shopify Admin API for the orders, product and variants, the Google Drive
API for the deck and document inventory, the live sitemap for the page handles,
and the two coverage scripts run against the live pages.

## Not done here

No content was changed and no product or order was touched. Fulfilling an order
and attaching files to a variant are outward-facing actions on a real customer's
purchase, so they are left for a human.
