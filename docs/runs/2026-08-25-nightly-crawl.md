# 2026-08-25 nightly site crawl (seeding run)

Not a scheduled night. This is the run that stood the job up, kept here because
it is the first baseline and because what it got wrong is the useful part.

The Routine fires nightly at 09:00 UTC (04:00 US Central) from tomorrow.

## What ran

`node scripts/site-crawl.js --budget 130 --link-budget 60 --delay 900 --shard 6`

130 of 2,006 sitemap URLs, 201 requests, 231 seconds, zero 429s, no abort. API
build `c7cd1d2`.

## Findings

**One, P2.** `/pages/java-editor-test` has no meta description.

Verified by hand: HTTP 200, 345KB, title "Java Editor Test", no `<meta
name="description">`, and **no robots noindex**. So the missing meta description
is the smaller half of it. A page called Java Editor Test is live, indexable, and
listed in the public sitemap that Google reads. Nothing is broken for a student,
but it is a scratch page with a front door.

Not filed as a task. This job reads; the board write is a human's call.

## What the run got wrong first, and what changed

The first live pass produced **22 findings and every one was a false positive**.
That is the whole story of this run and the reason the checks look the way they
do now. Each fix is pinned in `smoke/site-crawl.js` in the SILENT direction, so
none of them can quietly come back.

| What fired | Why it was wrong |
|---|---|
| Challenge detector on all 20 probe pages | A `/captcha/i` test matches every page on this storefront: Shopify's own bundled JS ships `recaptcha-v3-token` and `h-captcha-response` on every render. Size plus shape is the honest signal, because a real page here is 350KB+ and an interstitial is a few KB. |
| `placeholder-text` on `/pages/ap-csa-course` | COMING SOON is a deliberate status badge, explained in the paragraph above the list. `TBD` came off for the same reason. |
| `reporter-missing` on 7 CSA reference pages | `\bcheck-btn\b` matched inside `sp-check-btn`, because a hyphen is a word boundary. Class attributes are now split and compared as whole tokens. |
| `broken-internal-link` on `/pages/ap-csa-`, "linked from 240 pages" | The href was read out of the middle of a JavaScript string concatenation on the FRQ pages: `'<a class="fc-nav-btn" href="/pages/ap-csa-' + year + ...`. Script and style blocks now come out once and everything structural reads the stripped copy. |
| `broken-internal-link` on `/cdn-cgi/l/email-protection`, 243 pages | Cloudflare rewrites it in the browser and 404s a direct GET by design. It is on every page. |
| `liquid-leak` on two CSA algorithm pages | `{{5,3,5,8}}` is a Java 2D array literal. This site teaches Java, so doubled braces are ordinary content. The check now requires a Liquid object root or a real tag keyword. |
| 12 `reporter-missing` P0s across CSA and cyber | The big one. See below. |

## The lesson worth keeping

The twelve P0s came from asserting a widget-to-reporter matrix inferred from one
sample page per course. Measuring the live storefront found **five** widget
families, not three:

| Course | Question widget | Score reporter |
|---|---|---|
| AP CSA lessons | `data-item-id`, `apcs-ex`, `apcs-opt` | `apcs-reporter.js` |
| AP CSP lessons | `mcq-option`, no `data-item-id` | `ap-csp-reporter.js` |
| Cyber exercises | `check-btn`, no `data-item-id` | `apcs-score-reporter.js` |
| Cyber quizzes and exams | `option-label` plus `check-btn` | `apcs-quiz-wiring.js` |
| CSA scenario practice | `sp-opt`, `sp-check-btn` | none at all |
| Course hubs | none of them | none, correctly |

`cyber-check-item` (15) and `apcs-dropdown-link` (135) appear on every page on
the site. They are nav chrome, and counting them makes every page look graded.

So the grade-path check was split into what is provable and what is not.
`reporter-missing` now fires only on the `data-item-id` contract CLAUDE.md
actually specifies. Everything else is caught by comparing each page against its
own fingerprint from the previous run: a page that loaded a reporter last night
and does not tonight is a regression on any reading, and needs no matrix.

After the fixes, the same 130-URL slice returned **1 finding instead of 22**, and
nine real pages spanning all five courses plus both hubs returned zero.

## Still open

Nothing from this run.

Worth a human's eye, but deliberately NOT filed as findings because the crawl
cannot prove they are defects:

- The CSA scenario-practice pages carry 32 graded widgets and load no score
  reporter at all. That may be correct (they may be self-check only) or it may be
  a whole page family recording nothing. Someone who knows the intent can settle
  it in a minute; the crawler cannot.
- `/pages/java-editor-test` is indexable and in the sitemap.

## Coverage

Shard 7 of 7, seeded as tomorrow's baseline. The hot set is re-crawled every
night, so the regression checks have a baseline for the pages that matter most
from the first scheduled run onward. The rest of the site rotates in over the
week.
