# Site Assistant handoff: accuracy review and counter-proposal

Reviewed 2026-08-28 against the working tree at `284c03f`. The document under
review is `SiteAssistantClaudeCodeHandoff.md`, dated the same day.

Short version: the architecture instincts are good and the fact-finding is not.
Every one of the four items in its "Known broken" section is a misdiagnosis, the
security model in section 2.1 describes a system this repo does not have, and the
one design decision that would do real damage is the one presented as the
product: storing chat transcripts typed by minors.

The handoff was written from outside the codebase, by probing production over
HTTP. That method cannot distinguish "route removed" from "route answering
correctly", and it produced four false negatives in a row.

---

## 1. Scorecard

### Wrong

**1.1 `GET /api/class/:code/exists` was not removed.** It is at `server.js:517`.
A 404 with `{"exists":false}` is its documented answer for a code that does not
exist or belongs to an inactive class. The probe used a code that is not in the
table and read the contract as an outage. No action needed.

**1.2 `/api/shopify/*` is merged and live.** Mounted at `server.js:50`, ahead of
`express.json()` so the HMAC sees raw bytes. The only route on it is
`POST /webhook/orders-paid`; a `GET` probe returns 404 because there is no `GET`.
`smoke/shopify-entitlements.js` runs against it and `npm run smoke:shopify` is
wired. The handoff twice recommends merging `claude/phase4-slice2-shopify`,
including in section 9 as the fix that "removes the Shopify-channel portion of
this cluster at the source". That merge already happened.

**1.3 Password reset is not missing.** `POST /api/teacher/forgot-password` mints
a hashed, TTL-bounded, single-use token through `lib/password-reset.js` and
`POST /api/teacher/reset-password` consumes it. The unconditional 200 is
deliberate anti-enumeration and the code says so at the top of the handler; it
even resolves two different generic bodies up front, `FORGOT_GENERIC` and
`FORGOT_NO_MAIL`, so that branching on mailer configuration cannot become an
oracle either.

What is actually broken is one environment variable. `lib/mailer.js` falls back
to `console.warn` when `RESEND_API_KEY` is unset, on purpose, so a reset link
stays recoverable from the Railway log during setup. If no email is arriving in
production, the key is unset. That is a config fix, not a rewrite, and see 3.4
for why it matters far more than it looks.

**1.4 Rate limiting is wired.** `lib/rate-limit.js` is a bounded fixed-window
limiter, and the student and teacher auth surfaces already use it: `joinLimit`
and `loginLimit` in `routes/student.js`, `forgotLimit`, `resetLimit` and
`redeemRateLimit` in `routes/teacher.js`. `files`, `labs`, `progress`, `sandbox`
and `slides` carry their own. Prerequisite 3 in section 13 is already satisfied.

**1.5 The access code is not a shared bearer credential.** This is the most
consequential error, because an entire security section is built on it.
`access_codes` (`db.js:387`) is keyed by the code itself and carries `course`,
`status` in `unused | redeemed | revoked`, `redeemed_by_teacher`, and
`order_ref`. `lib/entitlements.js` redeems inside a transaction that flips the
row to `redeemed` and stamps the teacher id, and refuses a second teacher with a
409. That is one code, one course, one teacher, revocable individually.

So section 9's roadmap note, that "a shared code cannot be revoked without
breaking every legitimate teacher" and that "per-purchaser codes bound to the
delivery email would fix that", describes work that has shipped. Revocation
exists too, in both directions: `revokeCode` for an unused code and
`revokeEntitlement` for a granted one.

The output filter in 2.1 is still worth building. Its justification changes: it
is not protecting one master key, it is preventing the assistant from reading any
customer's unredeemed code out of the database. Same control, correct threat.

**1.6 Section 9's root cause is mostly already handled.** The theory is that a
teacher who redeems before creating an account hits an unexplained wall. For the
Shopify channel that path no longer exists. `pending_entitlements` (`db.js:405`)
parks a purchase by email when the buyer has no account yet, and
`routes/teacher.js:register` calls `claimPendingSafe(teacher.id, teacher.email)`
so registering converts it automatically. A partial unique index makes a
redelivered webhook idempotent.

The ordering trap survives only for codes issued by hand, over TPT and PO. That
is a real but much smaller cluster, and it argues for a different fix than a
chatbot: make `POST /api/teacher/redeem` returning `Teacher auth required` say
so in words the buyer can act on, or accept a code at registration.

**1.7 The CORS action item is a non-issue.** `cors@2.8.6` is configured at
`server.js:41` with an origin callback and no `allowedHeaders` key, so it
reflects `Access-Control-Request-Headers` on preflight. `authorization` is
already allowed. Worth one curl to confirm in production, not worth a task.

### Right, and worth keeping

Shadow DOM for the widget, with the theme-save justification, is correct and
matches this repo's history of losing style fights to Dawn. ASCII only in the
Liquid snippet matches the mojibake incidents. Deriving `page_scope` server side
and never trusting a client-asserted role are both correct. Refusing to load the
script at all on assessment pages, rather than disabling it, is the strongest
call in the document. A pre-filter that rejects before token spend, a KB in the
database so a wrong answer is not a deploy, refusing to write the article bodies,
and failing closed to a static FAQ on cap breach are all right.

Teacher registration does take no access code and does no email verification.
That part is true. It is also less exploitable than it reads, because a teacher
account with no entitlement and no class sees nothing worth having.

---

## 2. The decision that has to be made before anything is built

`chat_messages.content TEXT NOT NULL`, filled from a widget that section 7 loads
on lesson and lab pages, is a second table storing free text typed by a minor.

`CLAUDE.md` names exactly one exception to the zero-PII posture and says adding
a second "is a decision, not a patch". `docs/sandbox.md` calls
`sandbox_programs` "the only table in this repo that stores free text a student
typed", and the bounds it lists are the reason the exception was granted: owner
only reads and writes, no teacher path, no admin path, capped lengths, never
logged, cascade deleted with the student.

The handoff inverts every one of those bounds. Section 11 specifies an admin
conversation browser with full transcript view. Section 8 puts the full
conversation inside an escalation email. `chat_escalations` adds
`contact_email`, `contact_name` and `school`, collected through a chat box that
minors can reach. And section 0 states the intent plainly: the log is the
product.

`lib/wire-log.js` is the house precedent and it points the other way. It records
"SHAPE, not content. Field names, value types, and numbers only. Never answer
text, never a student name, never any free text a student typed", and it reduces
the student id to an eight-character hash so repeat submissions correlate without
identifying anyone.

This is Tanner's call, not an implementer's. Three options, in the order I would
take them:

1. **Do not put the widget on the student-authenticated path in v1.** Section 16
   already says to enable for the teacher portal first and widen later. Take that
   literally and the question does not arise yet. This also resolves an internal
   contradiction: section 7 loads on lessons and labs, section 14 has two student
   acceptance criteria, and section 16 says teacher portal only.
2. **Store shape, not text, for students.** Classification, matched KB article
   id, `flagged_reason`, page scope, resolved state, token counts. The taxonomy
   is what compounds. The transcript is not, and it is the part that carries
   risk. A `content_hash` is enough to spot repeats.
3. **If transcripts are genuinely needed, branch on `user_type`.** Full bodies
   for `teacher`, shape only for `student`. Note that `anonymous` on a lesson
   page is very likely a student, so anonymous is not a safe bucket by default.

Whatever is chosen, two things are required and absent from the handoff: a hard
retention TTL, and a delete path by student. Everything else student-linked in
this repo either cascades on delete or is explicitly justified as gradebook data
that must survive. Chat is neither.

---

## 3. Where the design would produce wrong answers or new bills

### 3.1 The flagship acceptance criterion cannot be met as specified

Section 14 asks that a student on a lesson page asking "why is my quiz greyed
out" get a correct progression explanation. That exact ticket arrived from a real
teacher yesterday and is written up in
`docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md`.

The answer required per-class database state: `quiz_lock_default`, the
`activity_gates` rows, and `resolveGate`. A KB article cannot produce it. Worse,
three different causes produce the identical on-screen symptom, and the only
thing that separates them is which of three strings the mount printed. In that
ticket the answer turned out to be none of the gating theories; it was a 401 on
the render path for anyone holding a token.

A read-only, KB-only assistant answers this question confidently and wrongly,
which is worse than escalating. Two changes fix it:

- Give the assistant **read tools against endpoints that already exist**, still
  with no writes. `GET /api/teacher/classes/:code/gates` (`routes/teacher.js:1221`)
  and `GET /api/admin/class/:id/gates` (`routes/admin.js:1088`) both resolve the
  real gate through the same `resolveGate` students hit. The admin route's own
  description says it exists to answer this without database access.
- Teach it to ask which of the three messages the student sees before explaining
  anything. The run note has the table.

This is the difference between an assistant that deflects tickets and one that
generates confidently wrong support answers you then have to un-say.

### 3.2 The severity classifier fights the spend cap

Section 8 makes severity a dedicated model call on a strict enum, and section 2.4
demands a hard daily ceiling. Every escalation therefore costs two calls, and the
pager depends on the second one succeeding. Cheaper and more reliable: a keyword
pre-screen that nominates candidates, a model call only on candidates, and a
deterministic override so that `assessment_visibility` raised from a verified
teacher token pages regardless of what any model returns.

### 3.3 Schema and runtime defects

- `kb_fts` is declared as external-content FTS5 (`content='kb_articles'`) with no
  `INSERT`, `UPDATE` or `DELETE` triggers. Without them the index silently drifts
  from the table and retrieval quietly degrades. Either add the triggers or drop
  the external-content option and accept the duplication.
- No indexes on `chat_messages(session_id)`, `chat_sessions(started_at)` or
  `chat_escalations(status)`. Every screen in section 11 scans.
- No retention or vacuum policy on two tables that grow per message, on a 1 GB
  box with a $169 incident already on the record. Section 2.4 is about cost and
  then the schema has no ceiling.
- Streaming responses hold an open connection per active chat. That is exactly
  the "grows per request" shape `CLAUDE.md` warns about. Cap concurrent streams
  explicitly and time them out.
- Section 6 calls `GET /api/teacher/me` and `GET /api/student/me` "server-side".
  Do not make the API issue HTTP requests to itself on 1 vCPU. Verify the JWT in
  process and read the row.
- `IP_HASH_SALT` already exists in `.env.example` and is used in
  `routes/game.js:164`. Reuse it. Do not introduce a second salt.

### 3.4 The escalation channel does not exist yet

Section 14 wants an email and a Slack DM within 60 seconds. There is no Slack
integration anywhere in this repo; the only hits are prose in blog content. And
`RESEND_API_KEY` is very likely unset, which is the actual cause of item 1.3.

So today both transports of the assistant's most important feature are dead, and
one missing key explains both that and the support cluster the handoff blames on
broken code. Configuring mail is prerequisite zero. It retires a ticket category
and lights up the escalation path in the same move.

### 3.5 There is no single JWT storage key to find

Section 13 item 6 says to locate the storefront's key and not to invent a new
one. There are at least seven in use across the shipped assets: `apcse_token`,
`apcse_teacher_token`, `apcse_student`, `apcs_student_token`, `apcs_teacher_token`,
`student_token`, `teacher_token`.

`shopify/intro-java-reporter.js:67` already carries the multi-key fallback
pattern to use. Read order matters and has already cost a deploy: the run note
above records that `apcs-quiz-mount.js` reading `apcse_teacher_token` first is
precisely what broke quiz previews for every signed-in teacher.

---

## 4. Process gaps

- The handoff never mentions the command ledger. `CLAUDE.md` rule 2 requires a
  claim with a `--lock repo:path` before touching a file, and this build touches
  `server.js`, which is hot. It also requires an artifact on close and a run note
  in `docs/runs/`.
- The widget reaches the storefront through the theme repo, whose connected
  branch is `claude/site-linking-audit-yhufjk`, not `main`. A `theme.liquid` edit
  merged to theme `main` deploys nothing and reads as shipped.
- The suggested branch `claude/site-assistant` conflicts with the branch this
  session was assigned. Not important, but it indicates the handoff was not
  written against the session contract.
- `npm run smoke:assistant` matches the existing convention well. There are 40 or
  so sibling scripts to copy from; `smoke/admin-gates.js` is the closest in shape.

---

## 5. Sequencing objection

Today is 2026-08-28. The digest shows 11 tasks in `now`, task 137 is an open
regression in which the AP Cyber 1.1 lesson leaks all 10 CFU answers on load, and
`CLAUDE.md` names a September 1 Cyber offer deadline that is four days out. The
current mission in `CLAUDE.md` is attempt-level progress saves, whose own
deadline anchor of early August has already passed.

Starting a new subsystem with its own model spend, its own PII decision and its
own storefront surface, in that window, is the wrong order. The assistant's own
KB would have to ship a draft article documenting the answer leak as a known
issue, which is a fair description of the problem.

---

## 6. Counter-proposal

Same destination, reordered so that each phase is useful alone and none of them
requires the PII decision before it has been made.

**Phase 0, no model, this week.** Set `RESEND_API_KEY` and `MAIL_FROM` in
Railway and confirm a reset email lands. Then ship
`POST /api/assistant/report` only: the structured "report a problem with this
page" from section 5, capturing URL, user agent, buffered `window.onerror`, and a
description, filing a `bug_report` escalation into the existing TODO board and
sending the mail. No LLM, no chat, no transcript storage, no token spend. This is
the half of the handoff that is genuinely the product, and it works without any
of the other half.

**Phase 1, KB without chat.** `kb_articles`, `kb_article_versions`, FTS with
correct triggers, and the editor inside `/admin/command`. Serve it as a searchable
help page. Tanner writes the bodies. The "no good answer" bucket starts filling
from Phase 0 reports rather than from guesses.

**Phase 2, chat on the teacher portal only.** Teachers are adults with accounts
and emails, so transcript storage raises none of section 2. This is where the
read tools from 3.1 earn their keep, because teacher questions are the ones that
need class state. Section 16 already specifies this rollout order.

**Phase 3, widen to anonymous commerce pages.** Turnstile, spend cap, output
filter, all as specified.

**Phase 4, students, only if the section 2 decision is made explicitly**, and
with shape-only logging unless Tanner decides otherwise in writing.

Phases 0 and 1 deliver most of the compounding value, carry no model cost, and
touch none of the constraints that make Phase 4 a decision rather than a task.
