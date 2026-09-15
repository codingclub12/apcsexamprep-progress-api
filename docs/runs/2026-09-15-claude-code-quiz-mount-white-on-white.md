# Quiz mount answer choices were white on white, on one live page

2026-09-15, claude-code, board task 326.

## What came in

A student, AP CSA, through the site contact form:

> The tier 3 AP Mastery Challenge for 1.1 (may be for others as well), is
> displaying white text for the answer choices, making it hard to see.

He is right, the cause is one line of CSS meeting another, and the answer to his
parenthesis is no: one live page has it, and it is the one he was on.

## The mechanism

`assets/apcs-quiz-mount.js` in the theme repo renders each answer as

    <label class="qz-opt"><input type="radio"><span>A. ...</span></label>

and colours it from `.apcs-qz .qz-opt{color:#374151}`, a class-only selector
with no `!important`. The body of `ap-csa-lesson-1-1-intro-algorithms` carries,
for its dark Tier 3 panel:

    #apcsa-lesson .apcsa-mastery span{color:#f1f5f9!important;
                                      -webkit-text-fill-color:#f1f5f9!important}

An id, two classes and an `!important`. Specificity is compared before source
order and no number of classes outranks one id, so the page rule wins and paints
the option text near-white. The widget's own card behind it is `#fff`. Measured
on the live body with the live minified asset: **1.1:1**, where 4.5 is the floor
for body text. Invisible, exactly as reported.

Neither file is wrong on its own. The defect exists only in the value that
resolves once both apply, which is why no check in either repo could see it:
every one of them reads source.

The page reached this state on 2026-09-06 (`scripts/csa-11-quiz-mount-csv.js`),
when 1.1's two hand-written MCQ blocks were replaced by the server-scored mount
so the answer key would stop shipping in the page. That was the right change.
The blocks it replaced used `.apcs-ex-options .apcs-opt`, which the mastery CSS
styles deliberately and darkly; the widget's own markup was never in that
conversation.

## What shipped

[PR #115](https://github.com/codingclub12/APCSExamPrep-theme/pull/115), against
the connected branch.

No stylesheet fix is possible from inside the widget, for the reason above. The
one declaration a host stylesheet cannot outrank is an `!important` one in the
style attribute, so every colour that decides whether text is legible now comes
from two tables, `INK` and `PAPER`, and is applied inline. `injectStyle()` is
built from the same two tables, so the CSS and the inline values cannot drift.

Anything a STATE changes stays in the stylesheet, because an inline `!important`
would freeze it: the option hover, and the disabled button, whose two
backgrounds are painted as it flips.

The option text also got a class, `qz-opt-text`, so a future failure names
itself instead of reading as `span.(none)`.

## Evidence

Option text on the live 1.1 body: **1.1:1 to 10.31:1**, `rgb(241,245,249)` to
`rgb(55,65,81)`, both on `rgb(255,255,255)`.

All 23 live pages that mount a quiz, each measured with its own real page body
as the host, against the pre-fix asset and the fixed one:

| | below 4.5:1 |
|---|---|
| before | 1, `ap-csa-lesson-1-1-intro-algorithms` |
| after | 0 |
| worse after the change | 0 |

The other 22 are the AP Cyber quiz pages. They mount outside any section, were
already at 10.31:1, and resolve identically before and after.

The survey behind that table: 1,360 page handles from the storefront sitemap,
fetched through `lib/storefront-fetch.js`, plus the 13 noindex exam and unit
test pages the sitemap omits, plus the two whose bodies Cloudflare rewrites,
checked directly. 23 carry `data-apcs-quiz`. Exactly one sits inside an
`.apcsa-mastery` section. No snippet or template mounts one, so the page bodies
are the whole surface.

`scripts/verify-quiz-mount.js`, the existing functional harness, reports 11
passed and 4 failed on the fixed asset and on the pre-fix asset alike. Those
four are stale expectations in that script, not a regression: it asks for 9
questions and an `EK 1.1.A.2` stem, and the seeded bank now serves 5 with
different stems. Worth fixing, not in this pass.

## The guard

`npm run verify:quiz-contrast` in the theme repo, wired into CI as
`.github/workflows/verify-quiz-contrast.yml`. It renders the mount in Chromium
and measures the resolved colour and the real backdrop of every text element it
draws, before the submit and after it.

It is a browser check on purpose. Only an engine resolves a cascade, so a jsdom
version would pass on the broken file and read like proof.

Two hosts:

- **live**, the `<style>` block and the mastery section of the 1.1 page,
  verbatim, committed as `tests/fixtures/csa-1-1-mastery-host.json`
- **hostile**, a synthetic page forcing every generic tag these bodies style to
  near-white under an id-scoped `!important`

Mutation, per rule rather than in aggregate:

| mutant | live | hostile |
|---|---|---|
| pre-fix source | red | red |
| the live minified CDN build | red | red |
| drop only the option paint | red | red |
| drop only the stem paint | green | red |

The last line is the one worth having. It proves the synthetic host catches
something the live fixture cannot see, so the second case is not a copy of the
first.

## Still open, and it is the half that reaches students

**Merging PR #115 does not change what a student loads.** The 23 live pages do
not load the mount from the theme. They load it from Shopify Files:

    https://cdn.shopify.com/s/files/1/0778/8403/1191/files/apcs-quiz-mount.js?v=1787764736

That object is `gid://shopify/GenericFile/38250791960791`, uploaded 2026-08-26,
`originalFileSize` 14,986 bytes, which is the pre-fix theme source byte for
byte. The CDN serves an 8,436 byte minified render of it, and that is the file
the 1.1:1 measurement above was taken against.

So the theme repo is the source of truth for the FILE and the deploy is a
separate act: replace the Files object with the new build. `fileUpdate` with
`originalSource` is the way, and Shopify's own documentation for it says it
updates the content "while maintaining the same file ID and URL structure", so
no page body needs to change.

    stagedUploadsCreate  resource FILE, filename apcs-quiz-mount.js,
                         mimeType application/javascript, httpMethod POST
    POST the new bytes to the staged target
    fileUpdate(files: [{ id: "gid://shopify/GenericFile/38250791960791",
                         originalSource: "<the staged resourceUrl>" }])

This session could not run it: the Shopify mutation is blocked here as a
production deploy. Saying so rather than appearing to have shipped it.

**After the replace, check the URL the pages actually name**, with its stale
`?v=1787764736`, not just the canonical one. If that exact URL still serves the
old 8,436 byte build once the CDN has caught up, then `v` is part of the cache
key and the 23 script tags need repointing, which is a Matrixify pass split per
unit. Check it before assuming either way.

The re-check is one command, against the file students load:

    cd APCSExamPrep-theme
    curl -sS -o /tmp/cdn.js "https://cdn.shopify.com/s/files/1/0778/8403/1191/files/apcs-quiz-mount.js?v=1787764736"
    QUIZ_MOUNT_ASSET=/tmp/cdn.js npm run verify:quiz-contrast

Red today. Green is the deploy.

## What this is worth remembering for

A widget that renders into somebody else's page owns half a contrast ratio and
borrows the other half. This one owned the ink in a stylesheet, which is the
half it could lose, and the paper in the same stylesheet, which is the half it
happened to keep. The fix is not "add `!important`": the widget already had a
colour and could not win, because no class-scoped selector outranks an id. It is
that the colour has to leave the stylesheet entirely.

The second thing: this was found by a student with an email address, not
by the suite, and the suite could not have found it. Both repos check
source, and a cascade defect has no source to check. That is what the browser
gate is for, and why it measures a resolved value rather than asserting a rule.
