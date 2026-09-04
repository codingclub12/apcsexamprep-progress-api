# Site assistant Phase 2: chat on the teacher portal

Built 2026-09-04. Spec: `docs/site-assistant-spec.md` section 5 and phase 2 of
section 14. Phases 0, 0.5 and 1 are live.

## What shipped

```
POST /api/assistant/chat          teacher auth, behind ASSISTANT_ENABLED
GET  /api/assistant/chat/status   booleans and counters, teacher auth
/teacher/diagnostics              the panel, now with the desk under it
```

Six modules, and the split between them is the design rather than file tidiness:

| file | job |
|---|---|
| `lib/assistant/prefilter.js` | layer 5. Refuse coursework for zero tokens |
| `lib/assistant/output-filter.js` | layer 6. The tripwire, shape rules |
| `lib/assistant/reads.js` | layer 2, plus `scanForSecrets`, the tripwire's corpus |
| `lib/assistant/provider.js` | the only place that calls Anthropic |
| `lib/assistant/store.js` | sessions, messages, tool calls, token accounting |
| `lib/assistant/chat.js` | the order of operations |

`smoke/assistant-exfiltration.js`, 159 assertions, offline, no tokens spent.

## The thing worth reading twice

The suite asserts on the **assembled context**, not only on the reply.

A model that never receives an answer key cannot be jailbroken into producing
one. Asserting on the reply proves that one model, on one day, declined.
Asserting on the context proves there was nothing to decline. Every hostile
prompt that gets past the pre-filter has its full request scanned for four
sentinels seeded into `quiz_bank` and `access_codes`, and the sweep at the end of
the suite rescans every context assembled during the run.

The prompt in `chat.js` tells the model not to leak answer keys. That line is
**not** a control and the file says so. It is there for the case the other layers
do not cover, which is the model answering coursework from its own training.

## Three places this departs from the spec, and why

Each of these is a narrowing made with the reason stated, not a shortcut.

### 1. The reads are pre-fetched, not model-chosen

Spec section 5 layer 2 describes the typed reads as tools the model calls.
`chat.js` calls them itself, before the model, and puts the results in the
context.

The safety property is identical: either way the only thing the model ever sees
is a DTO with no field an answer could sit in. What changes is that the model
cannot choose, which is strictly safer, and that a reply is one API round trip
instead of three, which on a 1 vCPU box with a $169 incident on record is the
difference that decides whether this ships.

The reads it runs are exactly the ones behind `/api/assistant/diagnostics`, so
chat can never tell a teacher something the panel does not also show. Section 3.5
wants that non-drift property; pre-fetching makes it structural rather than a
convention.

### 2. The output filter's letter rule is narrowed to A-E

Spec section 5 layer 6 says to flag "a bare letter sequence of length 3 or more".
Taken literally that blocks CSA, CSP, PIN, FAQ, API and PDF, which is to say it
blocks nearly every correct answer this assistant will ever give.

A tripwire with a 90 percent false positive rate is turned off in a week, so the
rule is narrowed to runs drawn from A-E, which is the option alphabet on every
activity in this repo and therefore the alphabet a leaked key is written in. CSA
fails that test on the S. ACBD does not. The length 3 threshold is kept.

The compact form carries a further narrowing: length 4, not 3. At 3 it fires on
`ABC` and `ADA`, which blocks a correct answer and pages a human, and spec
section 9's own warning about a pager that fires on ambiguity applies to this
rule as much as to the classifier. What it gives up is a compact three question
key, `ACB`, which layers 1 to 5 mean the model never has to emit.

Asserted in both directions: `CSA`, `CSP`, `PIN`, `ABC order`, `ADA compliance`,
a class somebody named ABC, `Units A, B and C`, `A or B or C`, a letter grading
scale, and a set of ordinary support answers must all pass, while eight flavours
of leak must be caught.

### 2a. The separator character class, which is where the rule was actually wrong

Worth its own heading because the first version passed every test it had and was
blind to the commonest shape of the thing it exists to catch.

The spaced rule matches single letters separated by punctuation. Written the
obvious way, the separator excludes letters **and digits**, which means

```
1. A   2. C   3. B      the numbered form. NOT matched: the gap holds a digit
Q1 A, Q2 C, Q3 B        the labelled form. NOT matched: the gap holds a Q
```

both slip through, and those are how a key is usually written out. Allowing
letters generally is the opposite error and matches `A or B or C`. The rule now
excludes letters with one narrow alternation for a question label:

```js
const SEP = '(?:[^A-Za-z]|[Qq]\d){1,8}';
```

The finding is not the regex. It is that the gap was found by probing the
finished rule against the shapes a key actually takes, rather than against the
shapes it was written for, and that a mutation built only from the author's own
example would have gone green over it. Both forms are now cases in the suite and
the numbered one has its own mutation.

### 3. The daily ceiling is counted in tokens, and the dollars are derived

Spec section 6 asks for a daily USD ceiling. The server can only observe tokens,
so tokens are what `ASSISTANT_DAILY_TOKEN_CAP` limits. The dollar figure comes
from `ASSISTANT_USD_PER_MTOK_IN` and `_OUT`, and with neither set the endpoint
reports `usd_today: null` rather than a guess. A price baked into a deploy is a
number that quietly becomes wrong.

## The invariant that was stated wrongly, and now is not

`reads.js` used to open with "the only module in the assistant tree permitted to
touch the database", which is the spec's own wording. It was already untrue the
day it was written: `report.js` has to insert an escalation row, and Phase 2 adds
`store.js`.

The property that actually protects the answer keys is about what goes **in** to
a prompt, not about who holds a handle. It is stated that way now in both files.
An invariant the code visibly breaks teaches the next session to stop reading the
header, which costs more than the tidier sentence was worth.

The tripwire is the interesting case. Layer 6 has to compare a candidate response
against `quiz_bank.prompt`, `options` and `explanation`, so it needs those
columns, and `reads.js` is where the database handle lives. `scanForSecrets`
therefore sits in `reads.js` and **returns a verdict, never the strings**:

```js
scanForSecrets(text, { course }) -> { hit: true, kind: 'quiz_option' }
```

The comparison happens inside SQLite with `instr()`. No secret ever becomes a
JavaScript value, so no log line, error message or caller anywhere in this repo
can end up holding one. It also means no per-response array of every option
string on the site, which is exactly the unbounded per-request growth CLAUDE.md's
performance section is written against.

Measured rather than assumed, because it runs on every reply. Against a synthetic
`quiz_bank` of 6000 questions and 2000 access codes, which is larger than
production is likely to get:

```
course scoped scan     6.5 ms per response
all courses scan      16.4 ms per response
```

Both are noise next to a model round trip, and the memory cost is one integer.
The all-courses figure is the one that matters for the default, because the scan
falls back to every course when the page does not name one, and it stays there
on purpose: a response quoting another course's key is still a leak.

`smoke/assistant-diagnostics.js` had a source guard that grepped `reads.js` for
the words `prompt`, `options` and `explanation`. That guard went red on this
change, correctly, and the fix was to make it sharper rather than to delete it:
the file is split at the tripwire's heading, the DTO half may not name those
columns at all, and the tripwire half is held to a rule a grep can check, which is
that every `SELECT` in it returns `COUNT(*)` and nothing else. Then both halves
are checked behaviourally, because a source rule proves what was written and only
a behaviour test proves what it does.

## What the pre-filter is tuned against

The failure mode to design against is the **false positive**, not the miss.
Teachers talk about their classes constantly, and a filter that trips on "class",
"quiz" or "question 3" refuses the exact traffic the assistant exists to serve.

So every pattern is syntactic rather than lexical. `class` is not a Java keyword
here; `public class Foo` is. The suite carries thirteen coursework requests that
must all be stopped and twelve real support questions that must all get through,
because a filter tested only on the attacks it was written for reports success at
any threshold, including "refuse everything".

Mutation, per CLAUDE.md, is per rule and never in aggregate: each rule is spliced
out of `prefilter.RULES` in turn and the probe only it catches must then get
through. A probe still caught with its own rule removed was being caught by
something else, and the rule under test is hollow. Same for the tripwire kinds:
the access code row is deleted and the probe must pass.

## Cost

Nothing here spends a token until `ANTHROPIC_API_KEY` **and** `ASSISTANT_ENABLED`
are both set. The suite runs with the model path enabled and a recording provider
injected, so the whole assembly path is exercised offline.

Defaults, all environment-tunable:

```
ASSISTANT_ENABLED             off      the master switch
ASSISTANT_MODEL               claude-opus-5
ASSISTANT_MAX_TOKENS          1024     a support reply is short
ASSISTANT_EFFORT              low
ASSISTANT_THINKING            off      see below
ASSISTANT_SESSION_MSG_CAP     20
ASSISTANT_SESSION_TOKEN_CAP   60000
ASSISTANT_DAILY_TOKEN_CAP     400000
ASSISTANT_CHAT_MAX_PER_WINDOW 10 per minute, per TEACHER
ASSISTANT_CHAT_IP_MAX         120 per minute, per IP
```

### A school is one IP address

`lib/rate-limit.js` keys on the client IP, and spec section 6 says to use it and
not to write a second limiter. Applied literally to a signed-in route that gives
the wrong answer: thirty teachers in one building share a NAT address, so an IP
window means one teacher's busy afternoon throttles the department. That is an
outage with a 429 on it.

The limiter now takes an optional `keyFn`, defaulting to the IP so every existing
caller is unchanged, and the chat route mounts two windows of the same module: a
generous one on the IP **in front of** the auth check, which is the flood brake
and stops an unauthenticated caller burning JWT verifications, and a tight one on
the teacher id behind it, which is the fairness rule. A falsy key falls back to
the IP, so a `keyFn` that runs before its data exists degrades to the old
behaviour rather than pooling every caller into one bucket named `undefined`.

The thinking default is deliberate and is the one that would have cost money
quietly. On Claude Opus 5, thinking is **on by default**, so omitting the field
buys extended thinking on every support reply. It is explicitly disabled, and the
provider validates that against the effort level because disabling is rejected at
`xhigh` and `max`.

The system prompt carries `cache_control: {type:'ephemeral'}`. It is the same
bytes on every call and the largest stable block in the request.

## Degradation is the failure mode, never an error

No API key, a bad key, a rate limit, a session cap, the daily ceiling, the master
switch off: every one of those returns the live account state and the matching
help articles, in a fixed format, with a note saying the model is not answering.
There is no path in `chat.js` where a provider problem becomes a 500.

That is not politeness. The state block is the thing most tickets actually
needed, so the degraded answer resolves a decent share of them on its own, and a
support desk that goes down when its model does is a support desk that goes down.

## Privacy

Phase 2 is teachers only, who are adults with accounts, so every session written
today retains bodies. The shape-only path is built and tested now rather than
when students arrive, because that is the moment the second PII exception gets
granted by accident.

`chat_messages.content` is nullable. `chat_sessions.bodies_retained` is decided
once, server-side, by `scope.retainsBodies`. A student session stores a hash, a
classification and token counts and no words. `store.downgrade()` handles the
anonymous session that turns out to be a student: it flips the posture and
**deletes** what was already written. All four are asserted.

## Also in this change

`scripts/seed-kb.js` is wired into boot as `runBootSeed('kb_articles', ...)`.
There is no shell on the Railway box, so a seed that only runs by hand is a seed
that runs on a laptop against a laptop database. Its counts land on `/api/health`
under `seed`, which is the whole point of `lib/boot-seed.js`: a seed that threw
and a seed with nothing to do look identical from outside the container.

## What is not built

- **Students and anonymous callers.** Phases 3 and 4. The privacy machinery is
  in place; Turnstile and the anonymous spend posture are not.
- **Streaming.** One call, one reply. Spec section 6 warns that an open
  connection per chat is exactly the per-request growth that caused the $169
  bill, and a support answer of two sentences does not need it.
- **`/api/assistant/sessions` and `/digest`.** The operator log reads out of
  `chat_sessions` and `chat_messages` and there is no view on it yet.
- **The 90 day body sweep.** Spec section 8 wants a bounded deletion pass.
  Nothing has bodies older than today, so it is not urgent, but it is real work
  that is not done.
- **`ASSISTANT_ALERT_EMAIL`.** Still unset. Chat escalations file to the board
  and store correctly; the mail step logs `no_recipient` and returns. Visible on
  `/api/health` under `assistant`.
