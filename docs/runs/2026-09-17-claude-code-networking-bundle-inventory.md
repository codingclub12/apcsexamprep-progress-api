# 2026-09-17 claude code: what the AP Networking teacher bundle actually contains

## The ask

Tanner, in session: what does the AP Networking teacher bundle have, and what
should I send a teacher about what they are getting.

## The short version

The bundle is real and complete: **100 documents**, counted by walking all 26
Drive folders today rather than reading an index. The delivery path that was
broken on 2026-09-04 now works end to end, and the answer to "should I be
providing an access code" is yes, because the automatic path was never connected
at the Shopify end.

Two sentences on the live product page are still false, and one of them is what
cost order #1219 six weeks.

## The inventory, counted rather than restated

All 26 folder ids in `seed/networking-teacher-files.json` were walked through the
Drive API today. Every folder matched its expected shape exactly, with no
stragglers and no missing files.

**22 topic folders, four files each, 88 files.** Topics 1.1 to 1.4, 2.1 to 2.6,
3.1 to 3.6, 4.1 to 4.6.

    AP-Networking-<topic>-Teacher-Deck.pptx     speaker notes, answer reveals
    AP-Networking-<topic>-Student-Deck.pptx     same slides, notes stripped
    AP-Networking-<topic>-Teacher-Guide.docx    answer key, timing, misconceptions
    AP-Networking-<topic>-Student-Guide.docx    un-keyed guided notes

**4 unit assessment folders, three files each, 12 files.**

    AP-Networking-Unit-N-Test.docx
    AP-Networking-Unit-N-Test-Answer-Key.docx
    AP-Networking-Unit-N-Performance-Task.docx

That is 100 files, and it matches the product page's "44 slide decks, 44 lesson
guides, 4 unit tests with answer keys, 4 performance tasks" exactly. The decks
and guides claim is right; it is the delivery claim that is wrong.

**The question counts are right too, and they were re-derived rather than
copied.** `scripts/seed-manifest.js` carries `NET_UNIT_TESTS` at 16, 24, 24, 24,
and its comment states these are the `mc_points` from each unit's own
`unit-test.yaml`, which is the multiple-choice item count. That sums to the 88
multiple choice the page advertises. The same comment records two free response
prompts per test, deliberately not manifest items because they are scored offline
against the rubric, which is the page's 8 free response.

## The online half, verified live today

`node scripts/verify-networking-reporting.js`:

    67 pages in the sitemap, 67 read, 0 unreachable
    26 pages report a grade and need ap-networking-reporter.js
    4 pages load it without needing it (inert, self-gated on the wrapper)
    Every page that reports a grade loads the reporter.

The 26 are the 22 topic pages and the 4 browser labs.

## The delivery path now works, and that is new since 2026-09-04

`docs/runs/2026-09-04-claude-code-ap-networking-status.md` found two halves of one
defect: a paying buyer could not get in and everyone else could. Both halves are
closed.

**Board 234 shipped**, so the slides route is wired.
`config/slide-manifests.js:46` requires `./networking-slide-manifest`, and live
`/api/slides/ap-networking/1.1` answers `{"error":"Unknown lesson"}`, which is the
wired-course response. On 2026-09-04 it answered "Slides are not available for
this course yet", which is the unwired one. `ap-cybersecurity` returns the same
"Unknown lesson" beside it.

**Board 232 steps 1 and 2 shipped.** Checked live today through
`lib/storefront-fetch.js`:

    /pages/ap-networking-command-center   407,535 bytes
    teacher folder links                  0   (was 22)
    unit test folder links                0   (was 4)
    drive references remaining            44  (student deck and guide only)

And the gate itself refuses:

    GET /api/files?course=ap-networking       -> {"course":"ap-networking","entitled":false,"files":[]}
    GET /api/files/e771cddbd4cd2809           -> 403 {"error":"Not available."}

**The whole teacher flow lives on one page.** The networking Command Center source
carries `/api/teacher/register`, `/api/teacher/login` and `/api/teacher/redeem`,
so a teacher creates an account, redeems a code, and the 26 folders render on the
same page. This took a while to establish because the obvious candidates do not
have it: `/pages/cyber-dashboard` is the multi-course teacher dashboard despite
the handle, and it and `/pages/cyber-class` both contain zero occurrences of
"redeem" or "access code". Both pages are fully inline JavaScript with no
apcs-named external assets, so the absence is real rather than something that
renders after sign-in. The four Command Center pages are the only pages on the
store whose bodies match "redeem".

## Why an access code is still required

The automatic path is fully built and is not connected.

`config/shopify-skus.js` maps `APNET-TEACHER-BUNDLE` to `ap-networking`, and
`routes/shopify.js` turns a verified `orders/paid` webhook into either a grant, if
the buyer's email matches a `teachers` row, or a `pending_entitlements` row they
claim on sign-up. The endpoint is mounted and answers 401 to an unsigned POST.

`webhookSubscriptions` on the Admin API returns an **empty list**. No webhook of
any topic is registered on the store.

That query is scoped to the app making it, so a webhook registered by a different
custom app would not appear, and this is not proof on its own. It is corroborated:
order #1219 was placed 2026-08-06, is PAID, is still UNFULFILLED today at 42 days,
and somebody had to assign an access code by hand on 08/28 to let that buyer in.
If the webhook were delivering, none of that happens.

There is also no admin route that grants an entitlement directly. `routes/admin.js`
exposes `POST /api/admin/access-codes` to mint codes, and `GET` and revoke for both
codes and entitlements, but nothing to grant one. So the code really is the only
lever short of registering the webhook.

## The two false sentences on the product page

Both were reported on 2026-09-04 and both are still there. The page was last
edited 2026-08-28 21:50, so it has been touched since the first report.

1. **"Download the full bundle right after checkout."** There is no download at
   checkout. This is the sentence that made #1219 look served when it was not.
2. **"Every unit practices the AP Career Kickstart skills of connecting and
   configuring, securing, troubleshooting, and collaborating."** Collaborate is
   skill category 4, it is required in topics 1.4 and 2.4, and it has no asset.
   `NET_HANDS_ON_LIVE` is still `false` in `scripts/seed-manifest.js:304`, so none
   of the authored hands-on or collaborative work in `config/networking-hands-on.json`
   is seeded. Hands-on remains about 7% of graded points against a framework
   asking for roughly 24%.

A third claim is not on the product page but would be easy to repeat by accident:
there is no cumulative midterm or final live. `NET_EXAMS` carries midterm 40,
practice pilot 40 and final 50, but `/pages/ap-networking-exam-midterm` and
`/pages/ap-networking-midterm-exam` both 404. The letter says so.

## What shipped here

`docs/outbound/2026-09-17-networking-teacher-welcome.md`, a sendable letter that
describes the bundle from the counted inventory, gives the two-step Command Center
path, and names the Collaborate gap and the missing exams rather than waiting for
a teacher to find them. It carries send notes that are not part of the letter.

## Open, and not mine to close

- **Order #1219 is still unfulfilled at 42 days.** Outward facing on a real
  customer, so it stays with Tanner, same as the last two run notes said.
- **Register the `orders/paid` webhook**, or every future buyer needs the same
  manual code. This is a Shopify admin action.
- **Fix the two product page sentences.** Board 232's step 3 is a separate thing
  and still not started: the 26 Drive folders are still shared anyone-with-link,
  so a URL copied before 2026-09-04 still works. Suggested order in the 232 prompt
  is to fulfil #1219 through the gate, confirm that buyer reaches their files, and
  only then restrict the folders.
- **AP Networking is not in `config/drive-bundles.json`.** The two CSA bundles are
  watched and snapshotted under `docs/drive-snapshot/`; networking is not, so
  today's count is a point reading rather than a tracked baseline. Adding it would
  make the next "what is in the bundle" question answerable without 26 API calls.

## What I would not conclude from this

Nothing here was verified by a session holding teacher credentials. I did not sign
in, and by the rule about never inviting a credential into a transcript I did not
ask for one. So the redeem flow is established from the page source and the route
behaviour, not from watching a code turn into 26 visible folders. That last mile
is ten seconds for somebody with a teacher account, and it is worth doing once
before this letter goes to a paying customer.

I also did not read the access code sheet. It exists, it was last modified
2026-08-31, and it is deliberately unopened here so no code lands in a transcript.
