# The 222 answer keys, and the gate that stops publishing them

Date: 2026-08-20
Agent: Claude Code
Branch: `claude/csp-create-task-bridge`

## What was actually wrong

`csp-command-center` printed every Teacher Bundle file URL into its public HTML.
Not a link behind a login: the URLs themselves, in the markup, served to anyone
who loaded the page.

- 780 unique file URLs, of which **222 are answer keys, rubrics or solutions**
- **196 of those 222 belong to Big Ideas 2 through 5**, which are the paid tiers
- the only gate is `FREE_BI: [1]`, a client-side array in the page's own script

An anonymous `HEAD` on `AP-CSP_BigIdea1_Exam_KEY_k7q2m9.docx` returns HTTP 200,
`content-length: 20848`, no auth, no referrer check. Verified against the live
site rather than reasoned about. The `_k7q2m9` suffix is obscurity, and
obscurity buys nothing once the URL is printed in public HTML.

This had been raised in this session repeatedly without being actioned. It is
the largest known problem on the board and it is a revenue problem, not a
theoretical one: the bundle is the paid product.

## The fix, in two steps that must land in order

**Step 1, `routes/files.js`.** `GET /api/files/:id` resolves an opaque id
against a server-side manifest and hands back the URL only to a caller holding a
teacher token with a live entitlement for the course. It reuses
`lib/entitlements.js` rather than inventing a second notion of who has paid,
which is the same reason `routes/gate.js` exists in the shape it does.

**Step 2, `scripts/csp-command-center-gate-files.js`.** Every teacher-file href
in the page becomes `api:<id>`. Zero answer key URLs remain in the HTML.

**The order is not optional.** Import the page before the API is live and every
teacher file 404s on a paying teacher's screen. Deploy, repoint, verify a real
download, and only then rotate the file suffix.

## Decisions worth keeping

**Teacher files only.** The page keeps `studentFiles` and `teacherFiles` apart
and the split is clean: 334 student handouts with zero answer keys among them,
439 teacher files holding all 222. Gating teacher files removes the leak and
cannot break a student, who never requests one. Gating both would have widened
the blast radius while protecting nothing more.

**Big Idea 1 stays free.** It is the published free sample. Quietly converting
the free tier to paid under cover of a security fix would be a different change
than this one, and not one anybody asked for.

**One refusal for every reason.** Unknown id, missing token, invalid token,
student token, and unentitled teacher all get the same 403 with the same body.
Otherwise the endpoint becomes a way to confirm which files the bundle contains.

**Two ways out, because there are two callers.** A 302 suits direct navigation,
but a plain `<a href>` click cannot carry an Authorization header and a
cross-origin fetch cannot read `Location` off a manual redirect. So `?as=json`
returns the URL for the page to navigate itself. A second way in is a second way
to get it wrong, so the suite checks it against the same four callers.

**One delegated click listener, not one per link.** The lesson list is rebuilt on
every render, so per-link handlers would accumulate. That is the shape of the
leak that produced a $169 bill once.

## Two mistakes this pass made, and what caught them

**The manifest was incomplete and the count hid it.** The first builder walked
`bigIdeas -> topics -> teacherFiles` and missed `bigIdeas -> exam -> teacherFiles`,
so it held 434 of 439 files and 217 of 222 keys. The five it missed were the Big
Idea exam keys, including the exact file used to demonstrate the leak. The test
asserted `ids.length > 400`, which passed happily. Both are fixed: the builder
walks the whole structure recursively, and the suite asserts exact counts. A
threshold on a number you are trying to prove is complete is not a test.

**An assertion that could never fail.** `ok('every sampled manifest path is a
bare storefront file path', true)` went into the first draft of the test file.
The repo's own `smoke:assertions` suite caught it, which is exactly what that
suite is for. Replaced with a real check across all 439 entries plus a check
that a poisoned path would still be refused at request time.

## What this does not fix

Shopify CDN files are public by construction. This stops the URLs being
**published**, which stops new exposure. It does not revoke a URL somebody has
already copied. Those die only when the files are re-uploaded under a fresh
suffix, which is a Shopify operation this repo cannot perform. Anyone who
scraped the page before the fix keeps what they took.

## Evidence

- Anonymous HEAD on a paid exam key: 200 before the fix. Recorded above.
- 439 manifest entries, 222 keys, including all five Big Idea exam keys.
- 44 assertions in `smoke:filegate`, covering anonymous, student, unentitled
  teacher, tampered token, entitled teacher, the free tier, the JSON mode, the
  indistinguishable refusal, open-redirect resistance, and the page rewrite.
- The rewritten page exercised in a real browser both ways: an entitled teacher
  gets the file opened with `Authorization: Bearer ...` on the wire, a refused
  one gets a message naming the bundle, zero page errors either way.
- Zero answer-key URLs remain in the rewritten HTML; all 334 student handout
  URLs are still present.
- Full offline suite: 78 suites green.

The first browser run reported no auth header and no open call. That was the
harness, not the page: `about:blank` has no usable localStorage, so the token
was never there to send. Re-run against a real origin, both work. Worth writing
down because the failure looked exactly like the bug it was not.

## Still open

- **Nothing is deployed and nothing is imported.** Both halves sit in PR #231.
- **Rotation.** Until the files are re-uploaded under a new suffix, every URL
  scraped before today still resolves.
- **Rotation is still the only thing that kills the copied URLs.**

## The second page, which is why sweeping beat reasoning

The run note above originally ended by noting that the other command centers had
not been checked. They were, and they are clean: cyber, CSA and networking
command centers carry no file URLs and no DATA blob at all. They are lesson hubs,
not distribution pages.

But sweeping the sitemap turned up `ap-csp-teacher-resources`, titled "AP CSP
Teacher Resources (Premium)", which publishes **the same 222 answer keys** and is
worse than the Command Center in every way that matters:

- 556 file URLs in plain static HTML, as `<a href>` links
- **no gate of any kind**, not even a client-side `FREE_BI` array
- no JavaScript on the page at all, so nothing was ever hiding anything

Fixing the Command Center alone would have closed nothing. Anyone following the
teacher-resources link would still have had every key. All 222 were already in
the manifest built from the Command Center, so the same endpoint covers both;
327 links on that page are gated and 229 student handouts are untouched.

Membership of the manifest decides what gets gated, not the link's CSS class or
the section heading it sits under. The manifest is already the single definition
of "teacher only" and a second definition would eventually disagree with it.

## A rule this repo held that turns out not to be true

The standing instruction is that a live body must come from the Admin API and
never from a rendered page, because a scrape was believed to drop the page's own
`<style>` block and its leading HTML comment. That is testable, and it is false
for this theme: `page.content` is dropped verbatim inside
`<div class="rte scroll-trigger animate--slide-in">` and both survive.

`scripts/extract-live-body.js` does it, and proves it on the hardest page
available. `csp-command-center` was rebuilt from its rendered HTML and compared
against cc3.csv, which holds the byte-exact body that was imported into it:
138,154 bytes, identical, once three characters of trailing whitespace the theme
adds are removed. That page opens with a managed HTML comment, carries its own
`<style>`, and holds a 103 KB minified JSON blob.

The Admin API is still the authority and should still be the check before an
import. What this removes is the transcription step needed to get an 88 KB body
onto disk, which was its own source of error.
