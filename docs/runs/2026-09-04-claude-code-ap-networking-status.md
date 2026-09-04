# 2026-09-04 claude code: where AP Networking actually stands

## The ask

Tanner, in session: analyse where AP Networking stands, on the website and in the
Google Drive folder.

## The short version

The course is built. Both halves of it are built. What is broken is the wall
between them, and it is broken in both directions at once:

- **The one person who paid $249 for the teacher bundle has received nothing in
  29 days.** Order #1219 is still UNFULFILLED.
- **Everyone who has not paid can read the whole thing right now**, from a
  published storefront page, with no account.

Those are the same defect seen from two sides. There is no gate, so the buyer
cannot be let in and the non-buyer cannot be kept out.

## The exposure, which is new and is not on the board

`/pages/ap-networking-command-center` is published. Fetched anonymously today
through `lib/storefront-fetch.js`, 407,265 bytes, its source carries a per topic
materials map:

```
all folder-link keys: {"tests":4,"tf":22}
all file-link keys:   {"sd":22,"sg":22}
```

`sd` and `sg` are the Student Deck and Student Guide. Those are meant to be
reachable and they are fine.

`tf` is the teacher folder, one per topic, 22 of them. Topic 1.1's is
`1pO_oWdliBsjesCvcsw8UCWrw9hw9A8B6`, and the Drive API says it holds four files:

```
AP-Networking-1.1-Student-Guide.docx
AP-Networking-1.1-Student-Deck.pptx
AP-Networking-1.1-Teacher-Deck.pptx      <- speaker notes and answer reveals
AP-Networking-1.1-Teacher-Guide.docx     <- answer keys, facilitation notes
```

`tests` is the unit assessment folder, one per unit, 4 of them. Unit 1's is
`1sYQCyvZyYbTBy1YrCsEthyGEPWkizx2Z`:

```
AP-Networking-Unit-1-Test.docx
AP-Networking-Unit-1-Test-Answer-Key.docx
AP-Networking-Unit-1-Performance-Task.docx
```

Every one of those, and the `AP Networking Course Materials` root folder itself,
returns the same thing from the Drive permissions API:

```json
[{"role":"reader","type":"anyone"},{"role":"owner","type":"user"}]
```

So the links are public and the targets are public. That is the entire bundle:
22 teacher decks, 22 teacher guides, 4 unit tests, 4 answer keys, 4 performance
tasks.

The page does carry `entitlement` and `teacher_token` in its source, so somebody
did intend to gate it. It does not work, and the repo already has the sentence
for why: visual locking is not gating, and a link whose URL sits in the page body
is public no matter what the CSS does to it. My fetch sent no credential of any
kind and got all 70 references.

This is the same defect as board task 211, which is open and describes the cyber
Command Center leaking 120 Drive references. Nothing tracked it for networking.
It is task **232** now.

**Do not just unpublish the page.** That is the trap. `/api/slides/ap-networking/1.1`
returns `{"error":"Slides are not available for this course yet"}`, checked live
today, because `config/slide-manifests.js` wires `ap-csp`, `ap-cybersecurity` and
`ap-csa` and has no networking entry. The route gates on the manifest *before* it
looks at auth, so an entitled teacher gets the same 404 an anonymous one does.
The leaking page is currently the only way any networking teacher reaches a deck.
Close the leak first and the paying customer goes from badly served to served
nothing at all. The order is: build the delivery path, then close the hole.

## The delivery failure, unchanged in the week since it was written up

`docs/runs/2026-08-28-claude-code-ap-networking-bundle-gaps.md` found order #1219
unfulfilled. Re-read from the Shopify Admin API today, and it is worth being
precise that this is a fresh read and not a restatement:

| Order | SKU | Placed | Financial | Fulfillment |
|---|---|---|---|---|
| #1218 | CSA-TSP-COMPLETE | 2026-08-05 | PAID | UNFULFILLED |
| #1219 | APNET-TEACHER-BUNDLE | 2026-08-06 | PAID | UNFULFILLED |
| #1239 | CSA-TSP-COMPLETE | 2026-08-18 | PAID | UNFULFILLED |
| #1252 | CSA-TSP-COMPLETE | 2026-08-26 | PAID | UNFULFILLED |

Four paid teacher bundle orders, $996, nothing delivered by the platform. The
product is still ACTIVE and published at $249, so it can still be bought today,
and the description still says "Download the full bundle right after checkout."
That sentence was last edited 2026-08-28 21:50, which is after the previous run
note, so the page was touched and the claim was left standing.

A manual workaround did happen. The `AP Networking Access Codes` sheet has row 1
filled in on 08/28: access code assigned, noted against Shopify #1219. So
somebody was let in by hand. It is worth knowing that this does not reach the
decks either, for the slides gate reason above. 1 of 30 codes is assigned; the
other 29 are unused.

## What is genuinely finished, because most of it is

Worth saying plainly, since the two findings above are both about plumbing.

**Drive holds a complete course.** Verified by walking the tree through the Drive
API rather than trusting the index file:

- 22 of 22 topic folders under `APNetworkingUnit1Decks` through `Unit4Decks`,
  split 4 / 6 / 6 / 6, each with a `decks/` holding a Teacher and a Student
  edition.
- 22 of 22 under `Unit1Documents` through `Unit4Documents`, each with a `guides/`.
- All four units have `test/` (Test plus Answer Key) and `performance-task/`.

**The site is complete and reporting.** 22 lesson pages live and published on the
`ap-networking-lesson-N-M-slug` pattern, 4 unit hub pages, 4 browser labs, 4
terminal labs, 10 study games and a games hub. `node scripts/verify-networking-reporting.js`
run today against live:

```
67 pages in the sitemap, 67 read, 0 unreachable
26 pages report a grade and need ap-networking-reporter.js
Every page that reports a grade loads the reporter.
```

All 22 topics carry a CFU and an 8 point quiz in the seeded manifest, plus 4 unit
tests at 16 + 24 + 24 + 24 and 4 labs at 8. The gradebook side is done.

**Structure matches the framework exactly**, 22 of 22 topics, correct titles and
sequence, and no invented Essential Knowledge identifier anywhere on the site.

## What has not moved

Re-ran both coverage scripts against live today. Both are identical to the
2026-08-19 measurement, so nothing has been annotated in sixteen days:

```
OVERALL: 166/284 = 58.5%   (118 codes uncited)
Unit 1:  21/50  = 42%      Unit 3:  61/97  = 63%
Unit 2:  38/71  = 54%      Unit 4:  46/66  = 70%
```

`networking-gap-triage.js` still says 82 of the 118 look like annotation rather
than authoring, and only three statements are genuinely absent: 2.2.D.6, 2.3.A.3
and 2.3.A.4, all about endpoint device categories. That remains the cheapest
defensible depth available.

Unit 1 is still both the weakest unit and the first thing a September pilot class
opens. Topics 1.1, 1.2 and 1.3 still cite none of their A group codes.

`NET_HANDS_ON_LIVE` is still false, so hands-on is still 7 percent of the grade
against a framework asking about 24, and Collaborate is still 0 percent with no
asset. The product page still says every unit practices "connecting and
configuring, securing, troubleshooting, and collaborating." That sentence is
still not true.

## Smaller things, still open from 2026-08-28

- Eight live handles for four browser labs. `ap-networking-lab-1-4` sits beside
  `ap-networking-lab-1-device-triage-bench`, and the same for 2, 3 and 4.
- `AP Networking Course Materials (1)` is still there beside the real folder, a
  full duplicate tree created a day later, plus a `.DS_Store`.
- The root `Unit N - ...` folders hold loose stragglers, including two different
  files both named `AP-Networking-1.2-Teacher-Guide.docx` at 11,724 and 11,731
  bytes. Nothing says which is current.
- A dozen superseded marketing pages are unpublished but still present.

## What I would do, in order

1. **Wire `ap-networking` into `config/slide-manifests.js`.** Nothing else can be
   sequenced until a teacher has a legitimate path to a deck. This is the
   unblocker for everything below.
2. **Then gate or unpublish the Command Center**, and only then, so the leak
   closes onto a working door rather than a wall.
3. **Fulfill #1219**, and the three CSA orders with it. Outward facing on a real
   customer's purchase, so leaving it for a human, same as last time.
4. **Cut "collaborating" from the product page** or ship the team task. It is one
   word against a published framework a department head can read.
5. Annotate Unit 1's A group codes.

Steps 1 and 2 are one piece of work and should not be split across sessions, for
the reason in the exposure section.

## Evidence

Every number is a live read taken 2026-09-04, not a restatement:

- Shopify Admin API for the page inventory, the product, and the four orders.
- Google Drive API for the folder walk and for the permission records.
- `lib/storefront-fetch.js` for the anonymous Command Center fetch, which is the
  module that refuses a body it cannot prove is a rendered page.
- `scripts/verify-networking-reporting.js`, `scripts/networking-ek-coverage.js`
  and `scripts/networking-gap-triage.js`, all run against live.
- `curl https://progress.apcsexamprep.com/api/slides/ap-networking/1.1` for the
  404, with `ap-csp` and `ap-cybersecurity` returning "Unknown lesson" beside it
  to show the difference between a wired course and an unwired one.

## Not done here

Nothing was changed. No order touched, no product edited, no Drive permission
altered, no page published or unpublished. Board task 232 was created and claimed
to hold the exposure finding, because nothing on the ledger carried it.

One check I wanted and did not get: an unauthenticated download of a paid answer
key, to show the exposure end to end rather than from the permission record. The
sandbox refused the command and I did not route around it. The Drive permissions
API is the authority on sharing and it is unambiguous here, so the finding stands
on that, but the end to end fetch is the stronger artifact and somebody with a
browser and a logged out window can produce it in ten seconds.
