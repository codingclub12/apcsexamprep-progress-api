# 2026-09-04, claude-code: a 429 is not an answer, and a decimal sentinel is not safe in hex

Two commits on `claude/new-session-jy7gi0`, PR #551. Board #240 and #242. Both
are the same shape of bug, found an hour apart: a signal about the machinery read
as a fact about the thing being measured.

## 1. `lib/storefront-fetch.js` retries a 429

`refusal()` treated every non-200 alike. That is right for a 404 and wrong for a
429: one says the page is not there, the other says ask again.

`verify-cyber-qotd-live` walks 14 storefront requests. It was throttled on the
sixth and reported

```
RESULT: FAIL - 1 problem(s)
  unit-2: rendered page unreadable: answered 429 rather than 200
```

for `ap-cybersecurity-practice-questions-unit-2`, which was fine. Fetched on its
own a moment later the same page answered 200 with all 27 questions and its
schema intact.

That is the bot-challenge failure this module already exists to prevent, with a
different status code. The 403 case produced three verifiers reporting confident
and entirely false regressions on live pages that were correct.

The retry lives in the module rather than in the verifier because being the one
door is what the module is for. Each consumer reinventing it is how the
User-Agent workaround got copied into 28 scripts.

Narrow on purpose: 429 only, four attempts, growing wait, and after they are
spent the 429 comes back like any other code so `refusal()` still rejects it. It
can hide nothing. A 404 retried three times is still a 404 and waiting on one
only makes a red check slower.

Evidence:

| case | result |
|---|---|
| `429, 429, 200` | returns 200, transport called 3 times |
| `404` | returns 404, transport called once |
| persistent `429` | gives up after 4, returns 429, `refusal()` rejects |

`smoke:storefront` 36 passed 0 failed. A live 404 still returns in 649ms rather
than sitting through a backoff, which is the check that the narrowing holds.

Then `npm run cyberqotd:live` passed against the completed import: 152 of 152
questions in served HTML, 198,005 crawlable characters across 6 URLs.

## 2. `smoke/assistant-student.js` masks opaque handles before it scans

That push went red on a suite it does not touch:

```
[FAIL] and it carries no sentinel anywhere  ["8021"]
93 passed, 1 failed
```

Nothing leaked. `8021` is the distinctive mark the suite seeds so it can require
that number to be absent from every DTO, context and audit row. The assertion
scans `JSON.stringify` of a `chat_escalations` row, and that row carries two
opaque handles: `esc_` plus 24 hex from `report.js` and `cs_` plus 24 hex from
`store.js`. Hex draws from 0-9 and a-f, so it contains every decimal digit. The
mark came up inside a random id.

The file had already corrected this once, from two digits to four, after `73`
turned up inside a session id. Four narrowed it and did not close it. Length is
not what makes a decimal sentinel safe when the alphabet it collides with holds
all ten digits, so six would only move the number again.

So the scan masks a run of 16 or more hex characters first. That is an
identifier and never a place a mark can be read.

Evidence, four kinds:

```
suite      94 passed, 0 failed
collision  3605 false positives in 2,000,000 draws before the mask, 0 after
mutation   report.store() made to write the mark into detail_json:
           the assertion goes RED with ["8021","9999"]
mirror     every random handle forced to contain 8021: still 94 and 0
```

The mutation is the one that matters. Masking is a narrowing, and a narrowing
that goes too far leaves a guard that passes because it looks at nothing.

`smoke/assistant-anonymous.js` runs the same scan and is not exposed: its
sentinels are all strings carrying uppercase letters, which cannot appear inside
a lowercase hex run. Left alone.

## Still open

- Board #240 and #242 both need someone who is not this session to look at the
  evidence. Neither can be self-verified.
- 28 scripts still spoof a browser User-Agent and will report the whole site
  broken until they move to `lib/storefront-fetch.js`. Board #172.
- The Cloudflare Email Address Obfuscation toggle in Scrape Shield is still on,
  which rewrites the phishing address in the C1-102 header and ten instances on
  the 1.1 lab. Tanner's, at a browser.
- Unit 3 still has no lesson teaching CED 3.2. That is a content gap and not a
  titling problem, which is why the SEO sheet renumbered titles and relabelled
  nothing.

## What was learned

A guard that cries wolf is not a smaller problem than a guard that sleeps. The
comment above the marks in that suite says so in as many words, and says it
because the same collision had already cost somebody a red build once. What it
got wrong was the remedy: it treated the collision as a matter of degree, and
picked a longer number. Degree was never the issue. The two alphabets overlap
completely, so the only fix that ends it is to stop scanning the handles.

The general version, which is worth carrying: when a check compares a value
against text, ask what else could produce that byte string. If the answer is
"a random identifier", no amount of making the value more distinctive helps,
because the identifier is drawn from a set that already contains every value
you could pick.
