# Site Assistant: specification v2

Supersedes `SiteAssistantClaudeCodeHandoff.md`. The review of that document is
`docs/site-assistant-review.md`; this is the rewrite it argued for.

Written 2026-08-28 against `9814bbf`.

---

## 1. What this is, in one paragraph

A support desk that answers "why is this happening to me" by reading live
account state, captures a reproducible report when it cannot, and logs what
people are stuck on so the content roadmap writes itself. It is not a chatbot
and it is not a tutor. It never touches graded content in any direction: not
teaching, not hinting, not confirming, not restating, not summarizing the page
it is sitting on.

## 2. Why the shape changed from v1

The v1 handoff was a general chat widget with a knowledge base behind it. Three
facts about this business make that the wrong shape.

**The support volume is state, not prose.** The clusters that actually generate
mail are ordering and visibility problems: an entitlement that has not appeared,
a quiz that is locked, a student who cannot join, scores that are missing. Every
one of those has a deterministic answer sitting in the database, and none of
them can be answered by an article. A knowledge base assistant meets those
tickets with confident prose and no facts, which is worse than escalating,
because a wrong answer costs the ticket plus the trust.

**The product is assessment, so an LLM is an exfiltration tool by default.**
`quiz_bank.correct_index` and `quiz_bank.explanation` sit in the same SQLite
file every route in this repo opens, annotated `NEVER sent before submit`. The
board records the same failure mode arriving from three unrelated directions:
task 137, the 1.1 lesson leaking all 10 CFU answers on load; task 130, three
Cyber quizzes sharing the answer key ABCDB; open decision 12, answer review in
the locked quiz view as a key exposure route. A model with a database handle is
the most efficient version of that leak anyone could build, and prompting it not
to is not a control.

**Students are minors and this repo stores no free text from them.** One
exception exists, `sandbox_programs`, and its bounds are the reason it was
granted. A chat log is a second exception unless it is designed not to be.

So: typed reads over live state, an isolated corpus, and shape-only logging on
the student path.

## 3. What it does, in value order

1. **Explain live state.** Read the caller's own account facts through typed
   tools and say what is true and why. "Your class has teacher-opened quizzes
   turned on, so exercises are open and the quiz is not."
2. **Take a reproducible report.** When it cannot resolve something, capture
   URL, user agent, buffered console errors, role, course, and a structured
   description, then escalate with everything a fix needs.
3. **Deflect from the knowledge base.** Pre-sale, pricing, procurement, W-9, PO,
   TPT, licensing. Adults, no account needed, no state reads.
4. **Log the taxonomy.** Every conversation is classified. The "no good answer"
   bucket is the content roadmap.

## 3.5 The strongest version: a diagnostic panel before a chat bubble

The single highest-value thing this system can do needs no model at all.

Every question in the top support clusters is answerable by reading state the
teacher already owns. So the first surface is not a chat bubble, it is one
button in the teacher portal: **Check my account**. Pressing it runs the typed
reads in section 5 and renders what is true.

```
Entitlement    ap-cybersecurity, redeemed 2026-08-12, active
Class          CYBER-4471, 28 students, 3 never signed in
Quizzes        teacher-opened (quiz_lock_default = 1)
               1.1 quiz CLOSED, 1.1 exercises open, 1.2 quiz CLOSED
Scores         117 attempts recorded in the last 24h
Mastery        80 percent, retries allowed
```

That panel answers "why is the quiz greyed out", "why does my course not show",
"are my students' scores landing", and "why did nothing record" without a
sentence of generated text. It cannot hallucinate, it cannot leak an answer key
because it has no path to one, it stores nothing a student typed, and it costs
nothing per use. It is also the fastest thing here to build, because the reads
are the same ones chat would need and the endpoints mostly exist.

Chat is then the long tail on top of that, not the front door. The order this
implies:

- **Teacher portal**: diagnostic panel first, chat second.
- **Commerce and marketing pages**: chat over the knowledge base. Adults, no
  account, no state, low risk, and the one place conversational phrasing genuinely
  beats a page of links.
- **Lesson and lab pages**: the report affordance only. No chat.
- **Assessment pages**: nothing at all.

Building the panel first also de-risks chat. If the reads are wrong, a panel
shows it plainly, where a chat reply hides it inside prose that sounds fine.

## 4. What it must never do

- Teach, tutor, hint, trace code, evaluate an answer, or confirm correctness.
- Restate, paraphrase, translate or summarize any question, stem, option,
  exercise, lab or exam item.
- Emit an access code in any form.
- Read or receive page body content.
- Write to any student or teacher record.

On refusal it names what it can do instead and links the lesson. A refusal that
just says no generates a second ticket.

---

## 5. Anti-cheating architecture

The rule is that the assistant cannot leak what it was never given. Six layers,
each independently sufficient to prevent the worst case, because a single layer
is a single bug away from nothing.

### Layer 1: corpus isolation

Retrieval reads `kb_articles` and nothing else. The corpus never contains
`quiz_bank` rows, answer keys, explanations, lesson body HTML, exercise
solutions, or lab keys. KB articles are written by hand and are about site
mechanics.

### Layer 2: typed read tools, not query access

The assistant never issues SQL and never receives a row. It calls named tools
whose return types have no field capable of carrying a question or an answer.

| Tool | Roles | Returns |
|---|---|---|
| `getEntitlementState()` | teacher | `{course, status, source, redeemed_at}` per grant |
| `getGateState(lesson?)` | teacher, student | `{activity, open, reason}` per activity |
| `getClassSettings()` | teacher | `{mastery_threshold, retry_allowed, quiz_lock_default, active}` |
| `getRosterHealth()` | teacher | `{student_count, active_count, joined_24h, never_logged_in}` |
| `getMyProgress()` | student | `{lesson, item_type, attempted, passed}` per item, no scores from unreleased items |
| `getScoreVisibility(lesson)` | teacher, student | `{recorded, counted, why_not_counted}` |
| `getPageStatus(url)` | all | `{exists, published, template, has_widgets}` |

Implement each as an explicit DTO mapping in one module, `lib/assistant/reads.js`.
That module is the only assistant-side code permitted to touch the database, and
it selects named columns, never `SELECT *`. Nothing else in the assistant tree
imports `db`.

`getGateState` is the one that pays for the whole build: it resolves through the
same `resolveGate` students hit, so the operator answer can never drift from the
student reality. The endpoints it wraps already exist, `GET /api/teacher/classes/:code/gates`
and `GET /api/admin/class/:id/gates`.

### Layer 3: no page content, ever

The widget posts `pageUrl` and `pageTitle` only. It never reads the DOM, never
sends selected text, never sends `innerText`, and there is no field in the
request schema that could carry it. Any design that ships page content defeats
every other layer, because the questions are on the page.

### Layer 4: hard exclusion on assessment templates

The script tag is absent from quiz, unit test, practice exam and exercise
templates. Not disabled, absent. There is no endpoint to reach from a page that
never loaded the client.

### Layer 5: pre-filter before any token spend

On any page, reject before calling a model when the message contains a fenced
code block, Java or Python keywords, multiple-choice stem patterns
(`which of the following`, `I only`, `II and III`, `what is the output`,
`all of the above`), or four or more consecutive capitalized single-letter
tokens. Fixed refusal string, link to the lesson, logged as `content_request`,
zero cost.

### Layer 6: output filter

Before a single token reaches the client, scan the assembled response against:

- every `unused` and `redeemed` code in `access_codes`,
- answer-key shapes: a bare letter sequence of length 3 or more, and any exact
  option string drawn from `quiz_bank` for the course in scope.

A hit blocks the whole response, substitutes a refusal, and logs
`flagged_reason='key_leak_blocked'` at high severity. This is a tripwire, not a
filter: if it ever fires, something upstream is broken and Tanner should hear
about it.

### The test that makes this real

`smoke/assistant-exfiltration.js`, following the house sabotage pattern already
used by `scripts/cyber-exercise-gate-sabotage.js`. It seeds a throwaway database
with a known quiz bank whose answers are distinctive sentinel strings, runs a
list of hostile prompts through the real assembly path, and asserts that no
sentinel appears in the assembled context or in any response. Prompts include
role-play framings, "I am the teacher", "for my answer key", "translate this
page", base64 and reversed-string requests, and a direct "what is the correct
option for 1.1 quiz question 3".

The test asserts on the assembled context, not only the output. A model that
never receives the key cannot be jailbroken into producing it, and asserting on
context is how you prove the key was never there.

---

## 6. Abuse and cost containment

A public model endpoint on an ad-supported site is a metered resource pointed at
the open internet, and this box is 1 vCPU and 1 GB with a $169 incident on
record.

- **Turnstile on the anonymous path only.** Signed-in callers already cost
  something to create.
- **Per-IP fixed window** through the existing `lib/rate-limit.js`, which is
  already bounded against key-flood growth. Do not write a second limiter.
- **Per-session message cap** and a per-session token cap. Both enforced
  server-side against the session row, not the client.
- **Daily USD ceiling.** On breach, degrade to a static FAQ response. Never an
  error, never an uncapped call.
- **Free path first.** A high-confidence KB match on a known category answers
  from the article with no model call. Most pre-sale traffic should cost nothing.
- **Prompt caching** on the system prompt and KB block.
- **Bounded streams.** A hard cap on concurrent open responses, with a timeout.
  An open connection per chat is exactly the per-request growth that caused the
  $169 bill.
- **Token accounting written on every call**, so the spend question is answered
  by a query rather than by a provider dashboard.

Injection defense: page content never enters context (layer 3), KB articles are
authored by Tanner and are not user content, and tool results are typed DTOs
rather than free text. The remaining untrusted input is the user's own message,
which is treated as data.

---

## 7. Identity, and what each role gets

Identity is established server-side from the bearer token. A client-supplied
role or user id is ignored, always.

| | anonymous | student | teacher |
|---|---|---|---|
| KB, pre-sale, pricing, procurement | yes | yes | yes |
| Navigation, where is X | yes | yes | yes |
| `getPageStatus` | yes | yes | yes |
| `getGateState` (own class) | no | yes | yes |
| `getMyProgress` (own record) | no | yes | no |
| `getEntitlementState`, `getClassSettings`, `getRosterHealth` | no | no | yes |
| Report a problem | yes | yes | yes |
| Turnstile | yes | no | no |
| Message bodies stored | yes | **no** | yes |

The storefront has at least seven token keys in shipped assets (`apcse_token`,
`apcse_teacher_token`, `apcse_student`, `apcs_student_token`,
`apcs_teacher_token`, `student_token`, `teacher_token`). Reuse the multi-key
fallback pattern in `shopify/intro-java-reporter.js`, and read the STUDENT key
first. Reading the teacher key first is what broke quiz previews for every
signed-in teacher, recorded in `docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md`.

---

## 8. Privacy posture

`CLAUDE.md` allows exactly one table of student-typed free text. This design
does not add a second.

- **Student sessions store no message bodies.** They store classification,
  matched KB article, `flagged_reason`, page scope, resolved state, token
  counts, and a content hash for repeat detection. That is everything the
  taxonomy needs. The transcript is the part that carries risk and the part
  nothing downstream reads.
- **Teacher and anonymous sessions store bodies.** Teachers are adults with
  accounts. Anonymous commerce traffic is adults.
- **An anonymous session that resolves to a student** (a student token appears
  mid-session, or the page scope is a lesson) is downgraded to shape-only and
  previously stored bodies for that session are deleted.
- **Retention.** Bodies are deleted after 90 days by a bounded sweep. Shape rows
  are kept.
- **Deletion.** `DELETE FROM chat_sessions WHERE user_ref = ?` by student id,
  wired into the same path that deletes a student.
- **IPs are hashed** with the existing `IP_HASH_SALT`. Do not add a second salt.
- **Escalation email never contains a student transcript.** For a student-origin
  escalation it carries the classification, the state the tools read, and a link
  to the session, which is what a fix needs anyway.

This is a design that does not require the second exception to be granted. If
Tanner later wants student transcripts, that is a separate, explicit decision
with its own bounds, not a schema default.

---

## 9. Escalation

**Deterministic first, model second.** The severities that matter are decided by
rule, not by a classifier, so the pager cannot be talked out of firing or into
firing:

- `assessment_visibility` raised from a verified teacher token: `immediate`,
  always, no model call.
- More than one student implicated in a join or login failure on one class code:
  `immediate`.
- A gradebook discrepancy reported by a teacher whose class has live attempts:
  `immediate`.

Everything else gets a cheap classifier call with a strict enum, defaulting to
`normal` on ambiguity and never to `immediate`. A pager that fires on ambiguity
becomes a pager nobody reads.

Categories, unchanged from v1 because they came from real mail:
`access_not_showing`, `student_join_failure`, `gradebook_missing_scores`,
`content_error`, `progression_gate`, `password_reset`, `procurement`, `presale`,
`it_whitelisting`, `pacing_selfstudy`, `assessment_visibility`, `bug_report`,
`other`. Plus one this design adds: `key_leak_blocked`.

**Transport.** Email through the existing `lib/mailer.js` (Resend). There is no
Slack integration in this repo, so v1 is email plus a TODO board item. If a
pager channel is wanted, an incoming webhook is a small addition later; do not
spec a transport that does not exist and then fail an acceptance test on it.

**The email carries everything.** Category, severity, name, school, role,
course, page URL, the state the read tools returned, a three-line summary, and a
session link. Tanner never replies asking for details.

---

## 10. The access_not_showing flow

The largest cluster, and mostly already fixed in code, which changes the script.

`pending_entitlements` parks a Shopify purchase by email and `register` claims
it, so a Shopify buyer who registers gets their course without redeeming
anything. The ordering trap survives only for codes issued by hand over TPT and
PO.

So the flow leads with a state read, not a question:

1. If authenticated, call `getEntitlementState()` first. If a grant exists, the
   answer is a stale view, not a missing entitlement: tell them to sign out and
   back in, and file `bug_report` so the refresh path gets fixed rather than
   re-explained forever.
2. If no grant and they have a code: account first, then redeem. Link both
   pages. Never display a code.
3. If no grant and no code: collect name, school, email, purchase channel and
   order reference. Escalate `access_not_showing`. Tanner sends the code.

Before building this, trace whether a successful redeem reflects immediately in
the dashboard or whether the UI caches a stale entitlement. If it caches, fix
that. No amount of assistant explanation resolves a ticket caused by a stale
view, and this flow's step 1 exists because that bug is suspected.

---

## 11. Endpoints

All under `/api/assistant`, mounted after `express.json()`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/chat` | optional bearer | Send a message, stream a reply |
| POST | `/report` | optional | Structured problem report, no model |
| POST | `/feedback` | optional | Thumbs on a message |
| GET | `/kb` | admin | List and search articles |
| POST | `/kb` | admin | Create or update, versioned |
| GET | `/sessions` | admin | Conversation log with filters |
| GET | `/digest` | admin | Rolling digest |

Admin auth uses the existing fail-closed `ADMIN_KEY` cookie pattern from
`lib/admin-session.js`. It is not `TODO_KEY`.

Verify the JWT in process. Do not have the API make HTTP calls to itself for
`/api/teacher/me`; read the row.

---

## 12. Schema

Corrections to the v1 tables, not a redesign.

- `kb_fts` as external-content FTS5 **requires** `INSERT`, `UPDATE` and `DELETE`
  triggers against `kb_articles`, or the index silently drifts. Add them, or
  drop the external-content option.
- Indexes: `chat_messages(session_id)`, `chat_sessions(started_at)`,
  `chat_sessions(user_ref)`, `chat_escalations(status, created_at)`.
- `chat_messages.content` becomes nullable, because student rows carry no body.
  Add `content_hash TEXT` and `classification TEXT`.
- `chat_sessions` adds `bodies_retained INTEGER NOT NULL DEFAULT 1` so the
  privacy posture of a row is readable from the row.
- `chat_tool_calls` replaces stuffing tool output into `chat_messages.tool_calls`:
  `{id, session_id, tool, params_json, result_json, created_at}`. Tool results
  are typed DTOs and are safe to keep; they are the audit trail for what the
  assistant told someone about their own account.
- Keep `chat_actions` unused with a working reversal path, as v1 specified. It
  is the right place for automated remediation later and the wrong thing to add
  under time pressure.

---

## 13. Widget

Unchanged from v1 where v1 was right, which is most of it.

Shadow DOM, all styles inside the root, because the theme rewrites button and
heading colors on save and this project has lost that fight repeatedly. HTML
entities only in the Liquid snippet, nothing above ASCII 127, `\XXXX` escapes in
CSS `content:`. Streams. Keyboard accessible, focus trap, `aria-live`, respects
`prefers-reduced-motion`. Hides itself if the API is unreachable and never
breaks a lesson page.

Additions:

- Sends `pageUrl` and `pageTitle` only. No DOM reading. This is a hard rule, not
  a default.
- `sessionId` in sessionStorage.
- The report affordance buffers `window.onerror` from page load, so a bug report
  arrives with the console output that caused it.
- Bottom right, clear of the Raptive ad slot on mobile.

---

## 14. Build order

Each phase is useful alone and none depends on a decision that has not been made.

**Phase 0, no model.** Set `RESEND_API_KEY` and `MAIL_FROM` and confirm a reset
email lands, which also retires the password-reset support cluster. Ship
`POST /api/assistant/report` and the report affordance: structured bug reports
into the TODO board plus mail. Zero token spend, zero transcript storage, and it
is the piece that makes every later phase debuggable.

**Phase 0.5, the diagnostic panel.** `lib/assistant/reads.js` plus one teacher
portal view, per section 3.5. No model, no chat, no transcripts. This is the
highest ratio of tickets deflected to risk taken in the whole plan, and it
builds the read layer every later phase depends on.

**Phase 1, KB without chat.** `kb_articles`, versions, FTS with correct
triggers, editor in `/admin/command`. Serve it as a searchable help page. Tanner
writes the bodies; the assistant must not invent site mechanics. Seed the
thirteen categories as drafts, and document known-broken items honestly rather
than pretending they work.

**Phase 2, chat on the teacher portal.** The six layers, the exfiltration smoke
test, and chat behind `ASSISTANT_ENABLED`, reusing the Phase 0.5 reads. Teachers
are adults, so the privacy question does not gate this phase, and by now the read
layer has been proved correct in a surface that cannot hide a wrong answer in
prose.

**Phase 3, anonymous on commerce pages.** Turnstile, spend cap, output filter.

**Phase 4, students.** Shape-only logging, the reduced tool set, and the widget
still absent from every assessment template.

## 15. Acceptance criteria

- A hostile prompt list, including role-play and encoding framings, produces no
  sentinel answer-key string in the assembled context or any response.
- A student-scope message containing a multiple-choice stem is refused with no
  model call, and logged `content_request`.
- No access code from `access_codes` can appear in a response, including for a
  caller claiming to be a verified purchaser.
- A teacher asking why a quiz is greyed out gets the resolved gate and the
  reason, matching what `GET /api/teacher/classes/:code/gates` returns for that
  class, and is asked which of the three on-screen messages they see when the
  gate is open.
- A teacher reporting students can see tests produces an `immediate` escalation
  by rule, with no classifier call in the path.
- A student session stores no message body, and a session that starts anonymous
  and becomes student has its stored bodies deleted.
- Daily cap breach degrades to a static FAQ reply.
- The widget renders identically after a theme save with modified colors, and is
  absent from the DOM on every assessment template.
- The diagnostic panel reports the same gate state that
  `GET /api/teacher/classes/:code/gates` returns, with no model call in the path.
- A KB edit takes effect on the next message with no deploy.
- API unreachable, widget hides, page unaffected.

## 16. Out of scope

Entitlement grants. Password reset execution. Any write to student or teacher
records. Content edits. Refunds. Voice. Multilingual. Co-teacher access. A
public "make changes on the fly" mode.
