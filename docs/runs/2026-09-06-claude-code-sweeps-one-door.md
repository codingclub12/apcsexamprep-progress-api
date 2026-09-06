# 2026-09-06, claude-code: the five sweeps move onto the one door, and the premise had changed

Board 172. Five site sweeps kept their own fetch and their own spoofed
User-Agent for three days after the incident that retired the practice. They go
through `lib/storefront-fetch.js` now.

The task said they "will report every page as unreachable until they move onto
the shared fetch". That is no longer true, and finding out was the first thing
worth doing.

## The premise, measured

All five of their own User-Agent strings, against three storefront paths:

```
link-graph        200  200  200
site-crawl        200  200  200
empty-page-sweep  200  200  200
cyber-unit-sweep  200  200  200
csp-ex2-status    200  200  200
```

Fifteen of fifteen. The bot management has relaxed again. So the storefront has
been in three states in four days: scripted clients challenged, browsers
challenged, neither challenged.

That is the argument FOR this change rather than against it. The header is not a
control surface this repo owns, its correct value has flipped twice in a week,
and a wrong value produces a plausible false report rather than an error. What
the module contributes is not a better User-Agent. It is `looksReal()`, a
positive marker a challenge cannot fake, which cannot go stale the way a list of
challenge phrases can.

## Which sweep actually needed it

Not the ones the task listed first. Checked one at a time:

| sweep | guard before |
|---|---|
| `site-crawl` | `looksLikeChallenge`, 5 call sites |
| `empty-page-sweep` | `looksLikeChallenge` |
| `link-graph` | `looksLikeChallenge` |
| `cyber-unit-sweep` | JSON path only, XML path unguarded |
| `csp-exercise-2-live-status` | **none** |

`lib/site-crawl.js` carries its own `looksLikeChallenge`, and my first guess was
that it had gone stale against the current challenge body. It has not. Run
against `smoke/fixtures/storefront-403-challenge.html` it returns true at status
200 as well as 403, so the three crawlers using it were already guarded. Worth
recording because the opposite is what I expected and would have written.

`csp-exercise-2-live-status` is the one that mattered. Its two assertions are
`body.includes(WRAPPER)` and a count of `mcq-item`, and both read false on an
interstitial. A challenge served with a 200 would have been reported as 35 pages
that lost their wrapper and serve zero questions, which is the same sentence
`verify-csp-applied-cards-live` produced about 17 correct pages on 2026-09-03.

`cyber-unit-sweep`'s XML path had a related hole: a challenge body also starts
with `<`, so on the sitemap it passed the only test there was, and the regex
below it would then match nothing and report a site with zero pages in it.

## What the module had to grow first

"One require and one call site each" held for three of the five. The two
crawlers follow redirects by hand, hop by hop, because the CHAIN LENGTH is what
they exist to measure, and they read `r.headers.get('location')` to do it. The
module returned no headers, so moving them as-is would have deleted the
measurement.

So `raw()` gained two things:

- `redirectUrl`, from curl's `%{redirect_url}`, which is the next hop without
  needing headers back.
- `method`, for `site-crawl`'s HEAD requests. `--head`, not `-X HEAD`: the
  latter leaves curl waiting for a body that never arrives.

`page()` now refuses `method: 'HEAD'` outright, because a HEAD body is the
response headers and every marker test would refuse it, which would read as "the
storefront is down" rather than "you asked the wrong question".

The `-w` format also had to change from space separated to TAB separated. The
old parse was `.trim().split(/\s+/)`, which works only while every field is
non-empty, and `%{redirect_url}` is empty on the common case. A trailing empty
field does not survive `trim`, so the caller would have read one field short.

## Evidence

```
suite      smoke:storefront 55 passed, 0 failed, up from 36
           sitecrawl, linkgraph, encoding all pass
mutation   3 new rules broken one at a time, each RED on its OWN row with no
           collateral, file restored byte for byte
live       csp-exercise-2 probe: 35 live, 0 dead, 0 unresolved, 6 items each
           link-graph: 2095 urls enumerated, 8 crawled, 13 requests, real byte
           counts, redirect hops counted
           site-crawl: real content findings, not unreachable reports
```

The mutation that matters most is the challenge one. A server answering every
request with the real challenge body and a **200**, with the module pointed at
it:

```
WHAT THE OLD CODE WOULD HAVE BELIEVED, from this exact body:
  status accepted   : 200
  wrapper present   : false     <- "the page lost its wrapper"
  graded items      : 0         <- "the page serves zero questions"

WHAT THE MODULE SAYS ABOUT THE SAME BODY:
  looksReal         : false
  refusal           : "served the bot challenge, not the page"
```

## Two things that cost time and will cost the next session the same

**`raw()` is synchronous, so it deadlocks against an in-process server.** The
first version of that mutation harness stood the challenge server up in the same
Node process. `execFileSync` blocks the event loop, so the server could never
answer and curl timed out at 45 seconds looking like a network fault. The server
has to be its own process.

**curl honours `HTTPS_PROXY` for localhost too.** Pointing `STORE_ORIGIN` at
`127.0.0.1` sends the request through the agent proxy, which cannot reach it.
`--noproxy` or `NO_PROXY` in the harness environment.

## Still open

- 26 scripts still send a User-Agent, mostly cyber CSV generators reading
  `/pages/<handle>.json`. They fail loudly through `extract-live-body.js` rather
  than silently, so they are a lower tier than the sweeps were, but the same
  argument applies to all of them.
- `smoke:storefront` section 6 names the five sweeps explicitly rather than
  matching a filename pattern. A sweep is not identifiable from its name, and a
  scan that cannot say what it expected to find covers nothing. The cost is that
  adding a sixth sweep means adding it to that list.
