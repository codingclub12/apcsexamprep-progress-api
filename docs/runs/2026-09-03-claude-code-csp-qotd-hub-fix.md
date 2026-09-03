# The CSP QOTD hub was stuck on Loading, and why the tests said it was fine

Date: 2026-09-03
Agent: Claude Code
Board: task 190 (filed this session)
Artifacts: theme PR 100, theme PR 101, both merged to the connected branch and live

## What was broken

`/pages/ap-csp-qotd-hub` built its day list from
`/blogs/ap-csp-daily-practice/articles.json`. Shopify no longer serves that
endpoint. It returns 404 for all six blogs on this store, so it is a platform
change rather than a bad handle:

    /blogs/ap-csa/articles.json                404
    /blogs/ap-csa-daily-practice/articles.json 404
    /blogs/ap-csp/articles.json                404
    /blogs/ap-csp-daily-practice/articles.json 404
    /blogs/ap-cybersecurity/articles.json      404
    /blogs/ap-networking/articles.json         404

`fetchArticlesPage` threw on `!r.ok`, and the caller caught it with a comment
that read `// fail silently (don't break the page)`. So `mount()` never ran and
every visitor sat on the server-rendered placeholders: `Today's Question
Loading... Day 1 Loading...`. An indexed page, dead long enough that nobody
noticed. The silent catch is as much the cause as the dead endpoint, because it
is what made a dead source indistinguishable from a slow one.

## What replaced it

`templates/blog.qotd-json.liquid`, at `/blogs/<handle>?view=qotd-json&page=N`.
Shopify renders it from the real blog, so it cannot drift from what is
published. `?view=` was confirmed honored on this store BEFORE relying on it:
`?view=sandbox` renders a different template and an unknown view falls back
cleanly.

**Not the Atom feed, and this is the useful part.** `/blogs/<handle>.atom` is
still served and looks like the obvious replacement. It caps at 30 entries and
IGNORES `?page`: pages 1, 2 and 3 return the identical 30 articles, confirmed by
comparing day numbers across all three. There are 111 published posts. A hub
built on it would have shown 30 of them while looking perfectly healthy, which
is the same class of failure as the one being fixed. Liquid pagination does
page, and the response carries `pages` so the client stops on fact rather than
inferring the end from a short page.

## Three more defects found in the same file

- `ROTATION_LENGTH` was 121 on a hub whose highest tile is 30. `currentDay` came
  out 120, no tile ever matched, the today card silently fell back to `days[0]`,
  and the badge read `Day 120 of 121`. It is now the cycle size.
- One catch covered loading and rendering, so a broken renderer would have
  reported itself as missing data and sent the next person to the wrong system.
  Separated, with the same honest fallback and distinct console messages.
- 8 non-ASCII bytes against CONVENTIONS.md pure-ASCII, including a raw bullet
  inside a JS string. Kept as a `\u2022` escape so the output is unchanged.

## The part worth remembering: a green suite over a broken page

PR 100 deployed, the hub rendered its 30 tiles, and **every single tile linked
to a 404**. The suite was green throughout.

In this Liquid context `article.handle` renders as `<blog-handle>/<article-handle>`,
not the bare slug. The client built `"/blogs/" + BLOG_HANDLE + "/" + a.handle`,
producing `/blogs/ap-csp-daily-practice/ap-csp-daily-practice/<slug>`. It also
broke `PREFERRED_HANDLE_PREFIXES`, which scores canonical posts with
`handle.indexOf("csp-c1-day-") === 0`, so the best-post-per-day selection was
silently degraded as well.

The suite missed it because the fixture was reconstructed from sitemap slugs and
therefore invented BARE handles: a shape the platform never returns. The test
was asserting against my model of Shopify rather than against Shopify. It could
not have failed.

Two things fixed it, and both are kept because either alone suffices and the
pair is cheap: the template emits `article.handle | split: "/" | last`, and the
client prefers the platform's own `article.url` over rebuilding a link.

Two lessons, and the second is the one that generalises:

1. A fixture invented from a related source is not a fixture, it is a
   restatement of the assumption under test. Capture the real payload.
2. `real.length === 30` was the wrong assertion. Every href was non-empty and
   every href was wrong. Assert the SHAPE
   (`/^\/blogs\/ap-csp-daily-practice\/[^\/]+$/`), not the presence.

## Mutation results

The first mutation battery reported four guards live and one hollow, and the
hollow one was the guard that mattered: reverting to the dead `articles.json`
still passed, because the fetch stub answered any URL. The stub now 404s
anything but the new view, mirroring production. After that:

    revert to the dead articles.json          RED
    ignore `pages`, fetch one page            RED
    restore ROTATION_LENGTH = 121             RED
    restore the silent catch                  RED
    revert both handle fixes                  RED, on the two href-shape claims
    revert template only (client uses url)    GREEN, as intended
    revert client only (template emits bare)  GREEN, as intended

## Evidence that it is actually fixed

The final check trusts nothing local. It fetches the MINIFIED ASSET AS DEPLOYED
from the CDN, drives it against the LIVE JSON view, and renders into a fake DOM:

    badge        "Day 1 of 30 - 2026-09-03"
    today title  "Day 1: Variables And Assignment"
    tiles        30 | real hrefs 30 | correctly shaped 30

and separately, every one of the 30 cycle-1 tile URLs resolves HTTP 200 against
the storefront. The live JSON view returns 111 articles across 3 pages (50/50/11),
all handles distinct, days 1 through 30 complete with no gaps.

A note on reading a minified asset: grepping the CDN copy for `a.url ||` and
`ROTATION_LENGTH = CYCLE_SIZE` returned zero and briefly looked like the deploy
had not landed. Shopify minifies, so the source spacing is gone. Both were
present as `a.url||` and `ROTATION_LENGTH=CYCLE_SIZE`. Grep the behaviour, not
the formatting.

## Also worth knowing

- An early edit rewrote the file from CRLF to LF and the diff showed 435 changed
  lines on a 90-line change. This asset is CRLF; the theme's `.liquid` files are
  LF. Check line endings before reading a diff as blast radius.
- No other file in the theme calls `articles.json` or the Atom feed, so this was
  the only instance of the breakage.
- The accordion still carries developer-facing copy shown to students
  ("Auto-mapped to your REAL blog URLs", "no feed cap"). Left alone as out of
  scope for an outage fix, but it should be rewritten for the reader.
