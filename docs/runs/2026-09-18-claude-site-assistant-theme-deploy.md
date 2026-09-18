# The Site Assistant is live: theme PR 121 merged and verified

2026-09-18. Board 350. The theme half of PR 2 for
`docs/handoffs/Site-Assistant-Report-First.md` section 4.

The API half shipped on 2026-09-17 as #705, #711, #713 and #715. The theme
snippet sat open for a day because merging it deploys to the live storefront
with nothing in between, and that click was Tanner's to make.

## What happened

Tanner said he had merged 121 and asked for the five pages to be verified.
He had not: three separate checks said so, and they are worth listing in that
order because only the third is about the site rather than about GitHub.

    GitHub          #121 state open, merged false
    the branch      snippets/apcs-site-assistant.liquid absent from
                    claude/site-linking-audit-yhufjk, and from main
    the storefront  zero assistant markers on four live pages: no
                    apcs-widget.js, no apcs-flag.js, no APCS_ERRORS buffer

What had merged into the connected branch that afternoon was #122 at 15:01
and #123 at 15:26, both AP CSA Unit 4 test retagging from another session.
Easy to mistake for this one from the merge queue.

He then said to merge it, and it went in as `2045e18`. Shopify picked it up
in under the time it took to run the next command.

## Two of the five pages I told him to check did not exist

`/pages/pricing` and `/pages/ap-csa-unit-2-quiz` both 404, and neither is in
`sitemap_pages_1.xml`. Both came out of PR 121's body, which I wrote. I
invented them from the SHAPE of a handle rather than reading the sitemap,
which is the one thing the conventions in this repo say not to do, and it is
the same failure the handoff drafts keep making: a plausible identifier
carries the same confidence as a real one.

There are 28 handles ending in `-quiz` on the site and every one of them is
cyber, which is why a CSA one read as obviously correct and was not.

The corrected set, every handle fetched before it was written down:

    /pages/ap-csa-course                             widget present
    /pages/ap-csa-lesson-2-7-while-loops             widget present
    /pages/ap-cyber-unit-1-lesson-1-quiz             widget absent, -quiz tail
    /pages/ap-csa-practice-test-2d-arrays            widget absent, hyphen class
    /blogs/ap-csa-daily-practice/
      unit-4-day-17-arraylist-remove-traversal       flag script present

## Evidence

    live      5 of 5 pass, fetched through lib/storefront-fetch.js with no
              User-Agent, asserting the exact version tokens the snippet
              emits: /apcs-widget.js?v=3a8e5d8a0f18 and
              /apcs-flag.js?v=edabaafcf02d, plus the inline APCS_ERRORS
              buffer. All five 200, all five carrying both storefront
              markers, so none of this was read off a challenge page.
    mutation  the same assertion against a wrong version token returns
              false, so the check is not passing on the mere presence of the
              string apcs-widget.js somewhere in 449KB of markup.
    api       /apcs-widget.js 200, 19971 bytes; /apcs-flag.js 200, 8203
              bytes; /api/assistant/widget-version 200.

The live assertion was FALSE an hour before the merge and is true now, which
is the point of it. The same script run before the merge returned
widget=false flag=false errbuf=false on all four pages it could reach.

## What I could not verify

**Nothing rendered was checked.** The five checks above assert that the
Liquid guard put the right SCRIPT TAG on the right page. They do not assert
that the pill paints, because the pill is built by JS into a shadow root and
a server-side fetch cannot see it.

I tried to close that with Playwright against the pre-installed Chromium and
got `ERR_CERT_AUTHORITY_INVALID` on every page: this container reaches the
internet through a TLS-intercepting proxy whose CA Chromium does not trust.
Adding the CA to the NSS store and disabling the Chrome Root Store both
failed, and the remaining move would have been to turn certificate
verification off, which this environment forbids and which would have been a
bad trade for a nicer report.

So the residual risk is narrow and real: if `apcs-widget.js` throws on load,
every check above still passes. The suite in #711 covers the script itself,
and a human opening any lesson page settles it in five seconds.

## Also worth a line

The snippet's own comment says 62 pages carry `practice-test`,
`practice-exam` or `unit-test` after a hyphen. Counted against
`sitemap_pages_1.xml` today it is 56. The guard uses `contains` and is
deliberately generous, so nothing behaves differently, but the number is
wrong where it is written down. Not worth its own storefront deploy; it
should ride along with the next theme change that touches this file.

## Open

- `REPORTS_TO` is still not set in Railway, so every report is stored and
  mailed nowhere. Unchanged since PR 1, and it is the last thing standing
  between this feature and a working inbox.
- `ADMIN_READ_KEY` is still not on the Claude Code environment, so the
  morning review stage still cannot run. Today's audit handled that exactly
  as designed and said so in four lines.
