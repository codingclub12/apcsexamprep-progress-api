# Site assistant Phase 3: the anonymous path

Built 2026-09-04. Spec: `docs/site-assistant-spec.md` sections 3.5, 6, 7 and
phase 3 of section 14. Phases 0, 0.5, 1 and 2 are live.

## What shipped

```
POST /api/assistant/chat          now accepts anonymous, behind ASSISTANT_ANON_ENABLED
GET  /api/assistant/chat/config   public: switches and the Turnstile SITE key
GET  /apcs-chat.js                the commerce widget
```

| file | job |
|---|---|
| `lib/assistant/turnstile.js` | the challenge, and its four failure modes |
| `lib/assistant/reads.js` | adds `getPageStatus`, the only read anonymous gets |
| `lib/assistant/kb.js` | adds `bestMatch`, the free path |
| `lib/assistant/chat.js` | adds `respondAnonymous`, a separate path by design |
| `public/apcs-chat.js` | Shadow DOM widget, commerce pages only |

`smoke/assistant-anonymous.js`, 100 assertions, offline, no tokens, no network.

## Nothing changes until you turn it on

`ASSISTANT_ANON_ENABLED` is off by default, and with it off this endpoint
behaves **exactly** as Phase 2 did: teacher token or 401. That is asserted, not
described. Merging must not open a public POST endpoint on the day it deploys.

A student token is refused on both settings. Phase 4 is not built, and the
anonymous path is not a side door into it: a signed-in minor must not reach chat
by having their token ignored.

## The anonymous path is four subtractions

It shares the session store, the pre-filter and the output tripwire with the
teacher path, because a weaker surface carrying its own copy of the safety layers
is how the weaker surface becomes the way in. Everything else is taken away.

**1. It reads no account state, ever.** Not a class, not a roster, not an
entitlement. There is no caller id to scope a read to, so there is nothing to
scope, so the whole category of "leaked somebody else's data" cannot arise. The
suite seeds a teacher, a class, a roster, an entitlement and an access code
specifically so their absence from every anonymous context is asserted rather
than assumed. A suite with no teacher data in it would pass against a build that
leaked all of it.

**2. It is scope gated.** Chat renders on commerce and general pages. On a
lesson, lab, assessment or teacher page an anonymous caller is refused before
anything else happens, because the likeliest such caller is a signed-out student
standing next to a quiz. The refusal stores no typed text either, since
`scope.retainsBodies` already treats an anonymous caller on coursework as a
student.

**3. Turnstile gates spending, never access.** See below.

**4. The free path runs first**, and answers from the article with no model call.

## Turnstile: every failure mode lands on the knowledge base

This is the part worth reading. There are four ways the challenge does not
produce a valid token, and all four have the same outcome: the caller gets the
knowledge base and no model call.

```
not configured   ->  KB, no model
token missing    ->  KB, no model
token rejected   ->  KB, no model
Cloudflare down  ->  KB, no model
```

Failing **closed** on the last one would mean a Cloudflare outage takes the whole
anonymous surface down. Failing **open** would mean an attacker who can cause a
timeout gets free model calls. Degrading to the KB is neither: the site keeps
answering and nobody gets a free call out of a timeout.

There is also no 403 to probe. A bot gets the same answer a person gets, minus
the expensive half, and learns nothing from being refused.

The reason this is safe is that the free path is a database lookup on a corpus
Tanner wrote, already public at `/api/assistant/help` and already rate limited.
It needs no bot protection. What Turnstile gates is the part that spends.

## The free path, and why it is not bm25

Spec section 6: "a high-confidence KB match on a known category answers from the
article with no model call. Most pre-sale traffic should cost nothing."

fts5 exposes `rank`, a bm25 score, and the obvious move is to threshold it. That
is the wrong instrument. bm25 is unnormalised and corpus-relative, so a threshold
tuned against thirteen articles silently changes meaning at fifty, and nobody
notices because the failure is a worse answer rather than an error.

`kb.bestMatch` uses **term coverage** instead: what fraction of the content words
in the question actually appear in the matched article, requiring 60 percent and
a clear margin over the runner-up. Interpretable, stable as the corpus grows, and
testable with a sentence rather than a tuning run.

Erring toward *not* answering is deliberate. A miss costs a model call. A false
hit hands somebody an article that does not answer their question and reads as
though the assistant did not listen.

The answer itself is the article **verbatim**, plus a link to `/help#slug`.
Nothing is generated, so nothing can be invented. On a page where the wrong
answer is a price or a licence term somebody will hold us to, that matters more
than fluency.

### The tokenizer bug worth keeping

The first tokenizer took words of three or more letters. On this site that drops
the single term that decides which article answers a procurement question: `W-9`
splits into `w` and `9` and keeps neither, and `PO` is two characters. Both are
exactly what a purchasing office asks about.

Two passes now, raw and de-hyphenated, unioned: `W-9` yields `w9`, `PO` yields
`po`, and `sign-in` still matches an article that writes `sign in`.

## getPageStatus answers what is observable and says the rest is unknown

The spec's shape is `{exists, published, template, has_widgets}`. Two of those
four are **Shopify** state this server cannot observe. Returning a confident
`published: true` derived from "we have a row about it" would be the
confidently-wrong answer about site mechanics that section 4 forbids, and wrong
in the direction that sends somebody hunting for a page that is not there.

So `published` and `template` are `null`, meaning *not observable from here*,
never *no*. The system prompt says so in as many words, and the suite asserts the
context carries that line. If a Shopify read is ever added, this is the one
function that changes.

## The widget

Shadow DOM, pure ASCII, bottom right, clear of the Raptive ad slot on mobile.
Hides itself if the API is unreachable or the switch is off; a store page is
never broken by a support widget.

It sends five fields and there is no sixth: message, pageUrl, pageTitle,
sessionId, turnstileToken. It never reads the DOM. The suite asserts that as a
property of the file (no `.innerText`, no `.outerHTML`, no `getSelection(`, and
`document.body` appears exactly once, appending the host) and then **mutates the
file to read the page and requires the guard to go red**, because a guard that
has never been shown to fail is not evidence.

It also refuses to render on coursework paths itself. The script tag is supposed
to be absent from those templates (layer 4); this is the second lock on that
door, and the server refuses those scopes independently. Agreeing in two places
is the point.

## Testability changed one piece of production code

`respondAnonymous` takes `verifyTurnstile` as an injected parameter, defaulting
to the real one, exactly as it takes `provider`.

That was not premature generality. The first version of the suite reached in and
reassigned `turnstile.verify` on the module, and the module tests further down
then asserted against that stub while appearing to test the real thing. Three
assertions passed for the wrong reason before the stub was noticed. Both seams
are parameters now, so no test mutates a real module.

## Environment

```
ASSISTANT_ANON_ENABLED   off      the anonymous path. Off means Phase 2 exactly
TURNSTILE_SECRET_KEY     unset    server side, never leaves this process
TURNSTILE_SITE_KEY       unset    public, served to the browser by /chat/config
```

Everything from Phase 2 still applies: `ASSISTANT_ENABLED`, `ANTHROPIC_API_KEY`,
the session and daily caps, and the same two rate-limit windows.

## What is not built

- **Phase 4, students.** The privacy machinery is built and tested; the reduced
  tool set and the student surface are not.
- **Streaming.** One call, one reply, same as Phase 2.
- **`/api/assistant/sessions` and the digest.** The operator log has rows in it
  now from two roles and still has no view.
- **The 90 day body sweep.** Anonymous commerce sessions retain bodies, so this
  is the first phase that will accumulate text needing the retention pass.
  Nothing is old enough to delete yet, which is exactly when it is easy to
  forget.
