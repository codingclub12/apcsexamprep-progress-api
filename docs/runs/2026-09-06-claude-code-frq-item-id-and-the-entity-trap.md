# One attribute off one page, three guards that could not see their subject

Board 249. Started as a one line ask, "do the matrixify sheet for that attribute
fix", and cost a live student page on the way through. The attribute half was
easy and is not the interesting part of this note.

## What changed

| | |
|---|---|
| `#567` `478268f` | strip `data-item-id` from `ap-cyber-unit-1-frq-practice`, plus the preflight near-miss rule |
| `#572` `620147e` | repair the phishing address that import destroyed |
| `#572` `b47a791` | stop a cached read reporting a successful import as failed |
| merged | `9d39ae0`, production confirmed at 22:05:42Z |

Live now, re-derived while writing this:

```
stored body      40825 chars
data-item-id     0
&lt;             1
rivertonl1b      4      (the lookalike, all four back)
```

## Why the reporter was the wrong fix

The nightly audit had called this page a P0 since 2026-08-28: it carries
`data-item-id` and loads no `apcs-score-reporter.js`. The obvious repair is to
load the reporter. The obvious repair was wrong.

```
trailingActivity('ap-cyber-unit-1-frq-practice')  ->  lesson
trailingActivity('ap-csa-lesson-1-2-frq')         ->  exercise-3
pageFromHandle('ap-cyber-unit-1-frq-practice')    ->  null
```

`utils.js` maps `frq` to `exercise-3`, but `trailingActivity` fires on
`h.endsWith('-frq')` and this handle ends `-practice`. The alias never applies and
the server resolves the handle to nothing: no manifest row, no denominator
column, no lesson to file under. The page is self-scored free response anyway
("reveal the model answers and self-score out of 14"), so there is no machine
score to send. A reporter would have had nothing to post to, and would have
traded silence for a silent 4xx.

Worth recording that I got this wrong in the middle, in the other direction. I
read `docs/runs/2026-09-02-claude-reporter-gap-eleven.md`, saw its cause B about
CSA `-frq` handles, and concluded the page WAS a priced column, correcting a
conclusion that had been right. Running the resolver settled it in one command.
The note was accurate; my generalisation from it was not. A run note is a report,
and the rule about verifying against source rather than a report does not stop
applying because the report lives in this repo.

## The page I broke

The sheet round-tripped the body unchanged except for the removed attribute, and
still destroyed content:

```
sent   : IT Help Desk &lt;helpdesk@rivertonl1b.org&gt;
stored : IT Help Desk <helpdesk></helpdesk>
```

Not cosmetic. It is a phishing exercise and the lookalike domain IS the question:
`rivertonl1b.org`, a 1 for the l, against the real `rivertonlib.org` three lines
above it. For about twenty minutes a student asked to spot the sender could not.

One import is a measured input/output pair over 40825 characters, so diffing it
gives the transform exactly. Shopify DECODES ONCE, PARSES AS HTML, RE-SERIALIZES:

```
&amp;  ->  &  ->  text node  ->  &amp;     10 of 10 survived
&lt;   ->  <  ->  TAG START  ->  <helpdesk></helpdesk>
```

`&lt;` does not decode to a character, it decodes to SYNTAX. Send `&amp;lt;`,
which survives the one decode as `&lt;` and stores as `&lt;`.

`docs/shopify-page-imports.md` already carried the decode half of this and cost a
live page in August. Its wording said "entities in ordinary markup are fine: a
`&rarr;` in a button decodes to the arrow that was meant", true of `&rarr;` and
false of `&lt;`. I read it after shipping, while hunting the cause. Corrected
there with the measurement.

## Three failures, one shape

Every one was a check whose condition was satisfied by something other than what
it was checking. This is the same class the 2026-09-05 note recorded twice, and I
wrote that note yesterday.

**The gate passed on the damaged page.** Its live leg asserted zero
`data-item-id` and `data-lesson-id` still present. Both true. It printed
`LIVE CLEAN` and the gate reported four independent kinds agreeing, while the
address was already gone. A marker check cannot see damage it was not told to
look for, and a body rewrite can damage anything. The fix is a full body
equality against a prediction committed BEFORE the import, which is what makes it
a prediction rather than a description.

**The preflight green-lit a sheet that would have done nothing.** Found by
mutating my own generator: a sheet whose body column is spelled `Body_HTML` came
back "clear to import" with `script blocks ok: 0`. Every body rule keys on
`col('Body HTML') !== -1`, so the blank-body refusal, the size cap, the mojibake
scan and the script compile all skipped themselves at once. Matrixify ignores a
column it does not recognise, so that import is a silent no-op that reads as
shipped. A near-miss column name is a refusal now, only a near miss, checked
against all 41 sheets in the repo for false refusals: zero.

**The verifier called a successful import a failure.** `/pages/<handle>.json`
comes through Shopify's own page cache (`etag: page_cache:<id>:
PageDetailsController:<hash>`) and a query string does not bust it, because the
cache keys on the path. It served the pre-import body for about a minute. The
trap is the second half: `updated_at` rides inside the SAME stale response, so it
corroborates the stale body rather than exposing it. An old body and an old
timestamp agreeing with each other reads exactly like an import that never ran. I
reported that, and Tanner re-imported on my advice. It had landed the first time.

The two read paths have opposite defects, which is why neither alone settles it:

| | `pages/x.json` | rendered page |
|---|---|---|
| freshness | can lag about a minute | current |
| fidelity | the stored bytes | Cloudflare rewrites addresses |

So a disagreement must say WHICH it is. The verifier proves freshness against the
rendered page and exits 2 STALE rather than 1 FAILED, telling the reader not to
re-import. `lib/storefront-fetch.js` gained `pageBodySettled()` and
`decodeCfEmails()`, the latter because without it a live check on a page carrying
an address can only ever say "absent", which is the false negative that shape of
check most wants to produce.

## Evidence

```
smoke:preflight        65 passed, 0 failed
smoke:storefront       40 passed, 0 failed
offline suites         200 derived, 0 failed          (local, both PRs)
CI                     green on 478268f and on b47a791, the merged shas
generator mutations    11 passed, 0 failed, incl. a labelled negative control
preflight mutations    3, each red naming its own assertion, control restores green
verifier exits         OK(0) / STALE(2) / FAILED(1) all three driven
live after repair      8 of 8, stored body == prediction, sha256 43a92aa6
cfemail spans decode   helpdesk@rivertonl1b.org, d.alvarez@rivertonlib.org, 2x tanner@
```

The verifier mutation harness is worth one line of its own: its first run had all
three cases red for the SAME wrong reason, a path that did not resolve in the temp
dir. Three reds that prove nothing. Red for the wrong reason is not evidence, and
a harness gets the same scrutiny as the thing it tests.

## Still open

- **249 sits in `needs_verification`, `verified=0`.** Deliberate. `apcs done`
  cannot set it and neither can I. Given that I called a damaged page clean once
  and a successful import failed once in the same evening, the independent check
  is doing real work here rather than ceremony.
- **One U+00A0 became a plain space**, between two `<code>` blocks that already
  have ordinary spaces either side. Renders identically, only the wrap point can
  move. Another live import to repair an invisible character is the worse trade.
  Recorded rather than chased.
- **The other 28 scripts that still spoof a User-Agent.** Untouched here.
- **`&lt;` elsewhere on the site.** `ap-cyber-unit-5-lesson-5` currently stores 3
  of them and has not been re-imported. Any sheet that round-trips that body will
  do to it exactly what happened here. Nobody has swept for this.

## What to take from it

The damage happened on the safest looking edit there is: a body round-tripped
unchanged except one attribute, generated by a script with eleven assertions, past
a preflight, behind a deploy gate showing four independent kinds agreeing. Every
one of those was real and none of them was looking at the bytes that broke.

So the rule is not "be more careful with risky edits". It is that a body rewrite
has no safe size, and the only check that scales to that is predicting the stored
result and diffing the whole thing afterwards. Marker checks are for things you
already suspect.

And the cheaper lesson, which cost the least and would have saved the most: the
answer was in `docs/shopify-page-imports.md` the whole time, under a heading that
says "The trap". Fifteen seconds of grep before touching a page body.
