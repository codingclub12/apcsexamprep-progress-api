# The widget host could be hidden by anything outside the shadow root

2026-09-18, hours after the Site Assistant mount went live in
APCSExamPrep-theme#121. Tanner reported the pill was not showing up.

## The shape of it

Everything the theme snippet is responsible for was correct, and I had already
verified that: 5 of 5 pages served the right script tags, the right pages
excluded, all measured against the live storefront. The pill still did not
appear. Measured in his browser:

    tag on page: true | mounted: true | errors: []

    btnCss   display:block visibility:visible opacity:1 zIndex:2147483000
             position:fixed right:18px bottom:18px background:rgb(29,78,216)
    hostCss  display:none
    rect     0 x 0 at 0,0

The button inside the shadow root was in perfect health. The HOST was
display:none, so the whole subtree collapsed to nothing.

## Ruling out the obvious things, which is most of the work

Walked every readable stylesheet for a rule matching `#apcs-assistant-root`:
`[]`. Checked the host for an inline style: none. Two sheets were cross-origin
and therefore unreadable from the console, so I fetched both directly. Google
Fonts does not hide divs. AdThrive's is 829 bytes, has no `display:none`
anywhere in it, and carries no selector that matches. Forcing
`display:block !important` put the pill at x=1215 y=852 instantly.

So the source is invisible to the page itself, which leaves an extension
cosmetic filter or an adopted stylesheet (my diagnostic walked
`document.styleSheets` and `adoptedStyleSheets` is a separate list, so it would
have missed one). On his machine it is most likely an ad blocker.

**That is a reason to fix it, not to wave it off.** Students run ad blockers.
A support widget any of them can silently delete is not a support widget.

## Why ':host { all: initial }' was never going to hold

It sets the host's INITIAL VALUES, and any author rule beats an initial value.
The comment at the top of the file was right that the shadow root isolates the
widget's own CSS from the page; it just never covered the host's own box, which
is the one part of this that lives in the page's tree.

The fix states the host's box the one way that outranks an author rule:

    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    host.style.setProperty('opacity', '1', 'important');

Before the appendChild, so it is never even momentarily hideable. Only the three
properties that HIDE a box. Position, size and stacking stay in the shadow CSS,
because this is armour and not a second opinion about layout.

## The test is behavioural, and the mutation battery earned its keep

The suite runs `boot()` against a DOM shim rather than grepping for those three
lines. The claim worth testing is "the host ends up unhideable", not "the source
contains a string": a regex still passes if somebody moves the calls after the
append, drops an `!important`, or pins the wrong element.

Six mutations, each caught by the assertion aimed at it:

    drop the display pin entirely             CAUGHT
    drop !important from display              CAUGHT
    drop !important from visibility           CAUGHT
    drop !important from opacity              CAUGHT
    arm the host AFTER it enters the document CAUGHT
    pin the wrong element                     CAUGHT

The fifth was GREEN on the first run, and that is the useful part. My ordering
assertion checked the end state, which is byte-identical whether the pins run
before or after `appendChild`, so the mutation sailed through a check written
specifically to catch it. The shim now snapshots the style at append time. That
is the third hollow guard this project has found by mutation rather than by
review, and every one of them read as correct.

## Two PRs, in an order that is not cosmetic

    apcsexamprep-progress-api#730   261fb0e   the fix
    APCSExamPrep-theme#124          f5bb80b   the version token

The token is the served file's sha256 prefix. Cloudflare returns JS with
max-age=14400 whatever the route asks, so without the bump the fix would be
correct on the server and invisible in every browser that had already asked.

The API had to land FIRST. Merging the theme first would have had the storefront
request `?v=9bc7cac7acde` before the server had that file, caching the OLD bytes
under the NEW token and restarting the four hour window on the wrong content.

## Evidence

    suite     smoke:assistantwidget          71 passed, 0 failed (was 61)
              smoke:assistantrouting 87, smoke:assistantreport 95,
              smoke:assistantmorning 59, smoke:encoding 54, all green
    mutation  6 mutations, each caught by the assertion it targets
    live      production commit a04c40e -> 261fb0e
              /api/assistant/widget-version 3a8e5d8a0f18 -> 9bc7cac7acde
              both live pages serve /apcs-widget.js?v=9bc7cac7acde and no
              longer serve 3a8e5d8a0f18
              the file served AT the new token is byte-identical to the repo
              and contains all three setProperty lines, cf-cache-status MISS

Every live assertion there was false before the merge, which is the whole point
of running them.

## What is still not verified

Nothing rendered, in the same sense as yesterday. The live checks assert what the
storefront SERVES; they cannot watch a pixel. Chromium in this container will not
trust the agent proxy's CA, and the only way past that was to disable certificate
verification, which is not a trade worth making for a nicer report. A person
opening a lesson page settles it in five seconds, and that is the check I asked
Tanner for.

## Open

- `REPORTS_TO` is still unset in Railway. Every report is stored and mailed
  nowhere. That has been true since PR 1 and it is now the only thing between
  this feature and a working inbox.
- `ADMIN_READ_KEY` is still not on the Claude Code environment, so the morning
  review stage still exits 2 every day. Today's audit handled that correctly.
- The snippet comment still claims 62 pages carry a test word after a hyphen.
  Counted against the sitemap it is 56. The guard uses `contains` and behaves
  identically either way, so it is not worth a storefront deploy on its own and
  should ride along with the next change to that file.
