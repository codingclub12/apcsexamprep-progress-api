# The night the guards got tested, and robots.txt turned out to be one byte

2026-09-02, overnight, continuing under the standing authority set earlier the
same day: act then report, deploys included, three independent kinds of check
before anything ships automatically.

## Shipped and verified live

    API   1f36828  banner byte guard tested, mutations pinned to their assertion
    THEME acf2899  robots.txt restored from 1 byte to 7,787
    THEME 5a0bc06  the robots live check stopped reading its own comment

Four kinds agreed on the API change: suite, mutation, rederive, live. Three on
the theme change: suite, mutation, live.

## ROBOTS.TXT WAS SERVING ONE BYTE

    $ curl -s https://www.apcsexamprep.com/robots.txt | wc -c
    1

`templates/robots.txt.liquid` was added on 2026-09-01 containing a single output
tag naming `content_for_robots`. That is not a Liquid object. Shopify's robots
template exposes `robots.default_groups`, and Liquid renders an undefined
variable as the empty string, so a 25 byte template served 1 byte, silently.

The arithmetic is the proof: leading newline plus an empty tag is one byte.
Predicted 1, observed 1. Confirmed against the Admin API rather than this repo,
which returned the file at exactly 25 bytes and, incidentally, the MAIN theme's
name: `APCSExamPrep-theme/claude/site-linking-audit-yh...`. That is the first
time the connected branch has been confirmed from Shopify itself rather than
inferred from merge history.

Adding the template REPLACED Shopify's defaults. For a day, crawlers had no
Disallow for /cart, /checkout, /orders or /search, and there was no Sitemap
directive at all.

Live now: 7,787 bytes, 172 directive lines, none glued, 14 groups, three Sitemap
lines.

### What the render caught that reading could not

Two bugs, both in the part written to DOCUMENT the first bug:

1. The comment explaining the failure wrote `{{ content_for_robots }}` literally,
   so Liquid evaluated it and the paragraph deleted its own subject.
2. Prose naming the wrapper tag opened a second block that never closed. That is
   a tokenization error on a PUBLISHED template, and it would have taken
   robots.txt from wrong to absent.

Neither was visible by reading the file. Both were obvious one second after
rendering it. The lesson is the same one this operation keeps paying for: a
template is not source you can proofread, it is a program you have to run.

### The one that is easy to get backwards

Answer engines that cite and link (OAI-SearchBot, ChatGPT-User, PerplexityBot,
Perplexity-User) are deliberately NOT named in the file, and it says so at
length, because the omission looks like an oversight and is the opposite. A
crawler obeys only its MOST SPECIFIC matching group, so giving PerplexityBot its
own `Allow: /` would lift it out of `User-agent: *` and hand it the cart, the
checkout and the search pages. Silence is what keeps it under the defaults.

Blocked instead: GPTBot, ClaudeBot, anthropic-ai, CCBot, Google-Extended,
Applebot-Extended, Bytespider. `Google-Extended` is the judgment call worth
revisiting: it covers Gemini training AND Gemini grounding, so blocking it
protects the content and forgoes Gemini citations. Google Search is untouched
either way. One line to reverse.

## A MUTATION THAT GOES RED FOR THE WRONG REASON PROVES NOTHING

The deploy gate's mutation kind asked only "did the suite go red". Where guards
overlap, the strong one masks the weak one, and a suite that stops at its first
failure never reaches the guard under test. The battery then reports a clean run
over a guard that cannot fire at all.

That is not hypothetical here. It is exactly how the stoplist rule in
`lib/command-verify.js` survived three separate suites yesterday.

Mutations now take `expect_failure`, a slice of the assertion that must appear in
the red output. A mutation caught by some other guard is refused.

**It earned its keep on first use.** The mutation meant to reproduce the
robots.txt regression left an unclosed tag, so the template never tokenized and
NO assertion ran. The suite was red. The old rule would have called that a proven
guard. The new rule refused it and said which assertion was missing.

## THE BANNER'S BYTE GUARD HAD NO TEST

`scripts/csa-removed-curriculum-banner.js` generates a sheet that rewrites 49
live article bodies, and its entire safety argument is one comparison. That
comparison had been checked once, by hand, in a session that no longer exists.

Same gap that cost 3,280 bytes of indentation across 23 live CSP pages on
2026-09-01. `smoke/csa-removed-curriculum-banner.js`, 38 assertions, parses the
generated CSV back with a reader that did not write it.

It found something immediately: `toCsv` quoted every data field and joined the
HEADER raw, against the QUOTE_ALL convention. Harmless today, and exactly the
kind of inconsistency that teaches the next person quoting is optional on the
line that does carry a comma. Both delivered sheets were regenerated.

## FOUR THINGS MEASURED, NOT FIXED

**1. The daily site audit has "failed" four nights running.** Aug 29, 30, 31,
Sep 1. My first read was that it was broken. The workflow's own header says
otherwise: `site-crawl.js` exits 1 when it finds a P0, and on this site P0s are
not rare, so a red X is the normal state of a working audit. The reports exist,
as artifacts, and nobody has read them for four days. That is the real problem
and it is a reporting problem, not a broken job.

**2. Every CSA daily-practice SEO title is malformed, in three separate ways.**
The `global.title_tag` metafield, not the theme:

    AP CSAUnit 1 Day 10: Concat Evaluation Order | Daily Practice
    AP CSAUnit 1 Day 14: Indexof Substring Computed Indices | Daily Practi
    AP CSAUnit 1 Day 13: Iii Wrapper Behavior | Daily Practice

  - the missing space after "AP CSA", on every `ap-csa-uN-cN-*` handle
  - truncation at 70 characters that cuts "Daily Practice" mid-word
  - title-cased Java identifiers: `compareTo` to `Compareto`, `indexOf` to
    `Indexof`, `toUpperCase` to `Touppercase`, and `III` to `Iii`

The `unitN-cycleN-*` handles are correctly spaced and carry no unit segment, so
two different generators produced these and only one is broken. Neither
generator is in this repo; every `seoTitle` here uses a template literal with
correct spacing.

Not fixed tonight on purpose: Tanner already has two Matrixify imports queued,
and a third sheet landing at the same time is how the wrong one gets imported.

**3. The theme brands article titles twice.** `layout/theme.liquid` tests
`page.metafields.global.title_tag`, and on an article page `page` is not the
article, so that branch never matches. Articles fall through to
`{{ page_title }} | APCSExamPrep.com`, and since `page_title` is already the SEO
title, the result is `... | Daily Practice | APCSExamPrep.com`. Pages take the
first branch and get no store name. The two are inconsistent and nobody chose
that.

**4. Ahrefs API units are exhausted.** Zero left, so no traffic data was
available to rank the title work by consequence. `gsc-pages` returned no data
for August either. Worth knowing before trusting any dashboard that reads them.

## Still open

- The 49-article banner sheet is DELIVERED, not imported. Canary first.
- The title_tag repair is measured and specified, not built.
- Duplicate self-canonical article slugs, spanning units 1 to 4.
- The eleven reporter-gap records: cause still unestablished.
- 40 of the closed board tasks carry a PR link as their artifact, which cannot
  be auto-verified honestly. Fetching a PR URL proves the PR exists.
