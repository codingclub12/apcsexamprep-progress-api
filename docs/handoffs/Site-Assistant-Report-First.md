# Site Assistant: Report-First Rescope (Claude Code Handoff)

Status as of 2026-09-17. This amends the original Site Assistant handoff (Aug 28). Phase 0 is partly shipped; this doc re-scopes what comes next.

Repos: `codingclub12/apcsexamprep-progress-api` (API, has CI), `codingclub12/APCSExamPrep-theme` (no CI, merging deploys live).

## 0. What is already live (verified by HTTP probe, 2026-09-17)

- `POST /api/assistant/report` exists. It validates `category` against an enum, creates an escalation, and files a TODO. The Sept 4 test report became TODO #215 with URL, UA, and console errors captured. **Close #215; it is a test row.**
- `POST /api/assistant/chat` exists and returns 401 without a teacher session. Leave it behind its flag. Do not delete it.
- CORS allows `authorization, content-type` from the storefront origin.
- No assistant loader was found on the homepage, `/pages/pricing`, or any command center page. The widget is not on the storefront yet.
- **Unknown:** whether the API can send outbound email. Check this first (see section 2).

Read the existing report handler and its category enum before changing anything. Do not trust the category names listed below over what is in the code.

## 1. New scope in one paragraph

The widget stops being a chatbot. It is one corner button that opens three choices: **Report a problem**, **Suggest something**, **Help me find a page**. Reports and suggestions are forms, with AI used only after submit (triage, summary, junk filter, one optional clarifying question). Navigation returns links from a page index and nothing else. Every report and suggestion is **emailed** to Tanner and stored in the DB. Reports no longer create TODOs. A morning stage in the existing Daily site audit reproduces yesterday's reports and fixes a small whitelist of issue types.

## 2. Outbound email (do this first)

1. Check whether the API already has a mailer. If yes, reuse it.
2. If not, add one. Recommended: Resend (simplest API). Env vars: `MAIL_PROVIDER_KEY`, `REPORTS_FROM=reports@apcsexamprep.com`, `REPORTS_TO=tanner@apcsexamprep.com`.
3. Sending domain verification requires DNS records (SPF/DKIM). **Tanner must add these by hand.** Output the exact records in the PR description. Do not ship the sending path until verification passes.
4. The Microsoft 365 connector is read-only and cannot send. Do not try to use it.

## 3. Report routing

### 3.1 Everything is email, everything is stored

- Every accepted report or suggestion writes a row to the reports table **and** sends one email.
- Stop calling the TODO API from the report path. Leave the code behind a flag `REPORTS_FILE_TODOS=false` so it can come back.
- Add a config flag `REPORT_EMAIL_MODE=each|digest`. Default `each`. In `digest` mode, non-urgent reports are held and sent in one email at 7:00 America/Chicago. Urgent reports always send immediately in both modes.

### 3.2 Subject prefixes (exact strings; Tanner's Outlook rules match on these)

| Type | Subject format | Outlook result |
|---|---|---|
| Urgent | `[APCS Urgent] <category>: <page path>` | Red label, high importance, stays in Inbox |
| Bug / problem | `[APCS Bug] <category>: <page path>` | Orange label, moved to Site Feedback |
| Suggestion | `[APCS Suggestion] <page path>: <first 60 chars>` | Blue label, moved to Site Feedback |

Do not change these prefixes without telling Tanner. The rules break silently.

### 3.3 Urgent triggers (send immediately regardless of mode)

- A report says students can see tests, quizzes, answer keys, or teacher materials.
- A report says a whole class cannot join or cannot access purchased content.
- Any report from a verified teacher session with severity classified `high`.

Keep whatever urgent rules already exist in the Phase 0 handler and add these.

### 3.4 Threading duplicates

Same `page path + category` within 24 hours goes into the **same email thread**: reuse the subject exactly and set `In-Reply-To` / `References` to the first message's `Message-ID`. Store the first `Message-ID` on the report row. The body of the follow-up says "Report 3 of 3 for this page today" plus the new text.

### 3.5 Junk filter (three layers, cheapest first)

1. **Turnstile + rate limit** on anonymous submits. Rate limit per IP and per session.
2. **Rules:** reject if the message is under 8 words and has no category-specific fields filled, contains 2+ external links, repeats a prior message from the same IP within 24h, or the UA is not a browser. Allow CI to bypass the UA rule with an `x-admin-key` header so smoke tests still pass.
3. **Model check** (cheapest Claude model, JSON only): label `real | vague | junk`. `junk` is stored with `status=dismissed` and **not emailed**. `vague` is emailed with `(vague)` appended to the subject **after** the prefix, so rules still match.

Never drop a report silently without storing it. The morning email lists the count of dismissed junk.

### 3.6 Email body

Plain and scannable:

- Category, severity, AI one-line summary
- The user's words, verbatim
- Page URL (clickable), role (anonymous / student / teacher), browser, captured console errors
- Reporter email if given
- Report ID and a link to the admin view

## 4. Widget

### 4.1 Mechanics (carry over from the original spec)

- Shadow DOM for all widget UI. This isolates it from the Shopify theme color reverts.
- Liquid snippet uses HTML entities only. No raw Unicode above ASCII 127.
- **Do not load on quiz or test pages.** Reuse the existing exclusion list if Phase 0 has one.
- Loader served from the API. Note TODO #241: Cloudflare serves API JS for 4 hours regardless of Cache-Control. Version the loader URL (`widget.js?v=<hash>`) so fixes are not stuck behind the cache.

### 4.2 Report a problem

A form, not a conversation. User-facing choices map to the existing enum:

| User sees | Maps to |
|---|---|
| Something's broken | `bug_report` |
| A question or answer looks wrong | `content_error` |
| I can't get into what I bought | `access_not_showing` (show purchase-channel fields) |
| My students can't join | `student_join_failure` |
| Scores look wrong | `gradebook_missing_scores` |

Auto-capture: URL, UA, role, console errors. Optional email field labeled "Want to know when it's fixed?"

After submit, if the model labels the report `vague`, show **one** follow-up question in the widget. Never more than one. Then submit whatever the user gives.

### 4.3 Suggest something

A plain text box plus optional email. Add `suggestion` to the category enum. Suggestions are never urgent.

### 4.4 Help me find a page

- Build a page index from the sitemap: URL, title, course (CSA / CSP / Cyber / Networking), unit, page type. Rebuild nightly.
- User types a question. Match against the index. A cheap model call may re-rank to the top 3.
- **Output is links from the index only.** No prose answers, no invented URLs, no tutoring. Validate every returned URL against the index before rendering.
- If nothing matches, show "Couldn't find it. Want to report that?" which opens the report form prefilled.

### 4.5 Flag this question

- Add a small "Flag this question" link to each question block on QOTD and practice pages.
- It posts `category=content_error` with the question ID and page URL. No widget needed.
- On graded quiz pages, show it only after submission.
- This targets TODO #343 (19 QOTD articles where the correct answer is not among the options).

## 5. Closing the loop

When a report row moves to `status=fixed` and the reporter left an email, send one short thank-you: "You flagged a problem on <page>. It's fixed now. Thanks for telling us." Send once per report, never for dismissed or duplicate rows. For threaded duplicates, notify every reporter in the thread who left an email.

## 6. Morning verify/fix routine

### 6.1 Where it runs

Add a new stage to the existing **Daily site audit** scheduled task (environment `env_01QKjyPPpNKwqcjzhm9TPkkd`). Do not create a new trigger. The Morning brief trigger has no environment and cannot write to the repo.

Needed API additions (admin-key protected):
- `GET /api/assistant/reports?since=<iso>&status=open`
- `PATCH /api/assistant/reports/:id` with `status` (`confirmed | cannot_reproduce | needs_tanner | fixed | dismissed`) and `resolution_note`

### 6.2 Steps each morning

1. Pull open reports from the last 24 hours (plus any still `confirmed` from earlier).
2. **Reproduce** each against the live site with real HTTP fetches. Mark it `confirmed`, `cannot_reproduce`, or `needs_tanner`.
3. **Fix** only whitelisted types (6.3).
4. **Re-verify** each fix against the live page body. A fix counts only if the live page now shows the corrected content. A 200 from the write call is not proof.
5. Send one email: subject `[APCS Morning] <date>: <n> fixed, <n> need you`. Sections: Fixed (before/after, revert link), Needs you, Couldn't reproduce, Junk dismissed (count only).
6. Send reporter thank-yous for confirmed fixes (section 5).

The morning email subject deliberately does not match the three rule prefixes, so it stays in the Inbox.

### 6.3 Fix tiers

| Tier | Issue types |
|---|---|
| **Auto-fix** (after the dry-run period) | Broken internal link: add a Shopify redirect. Mojibake (a bullet arriving as U+00E2 U+20AC U+00A2, an emoji arriving as U+00F0 U+0178, and similar): replace with the correct HTML entity. Dead nav link. QOTD item where the Java runner output matches exactly one option but the key marks a different one: correct the key. |
| **Propose only** (draft PR or Matrixify MERGE CSV, Tanner approves) | QOTD item whose output matches no option (needs a rewrite). Wrong explanation text. Lesson content errors. **Any theme-repo change** (no CI; merging deploys live). |
| **Never touch** | Access codes and entitlements. Gradebook and score data. Pricing and discounts. Deletes, unpublishes, handle renames (handles are gradebook keys). Graded quiz and test content. Any report of students seeing assessments: email Tanner, do nothing else. |

Page body edits follow the Matrixify rules: MERGE only, Published At in the past, never include an empty Body HTML column.

### 6.4 Guardrails

- **Dry run for 14 days.** `MORNING_FIX_MODE=dry_run|live`, default `dry_run`. In dry run, the morning email lists what it *would* have fixed and how. Tanner grades them. A fix type moves to live only when Tanner says so.
- **Cap:** at most 10 writes per morning. Anything beyond goes to Needs you.
- **Snapshot** the before state of every page or setting before writing. The revert link restores it.
- **Kill switch:** `MORNING_FIX_ENABLED=false` skips step 3 entirely and still sends the verify email.
- **Cache delay:** JS and widget fixes may look unfixed for up to 4 hours (TODO #241). Mark those `fixed_pending_cache` and re-check the next morning instead of retrying.

## 7. Acceptance checks

1. A real browser report on a lesson page arrives in Outlook within a minute, lands in Site Feedback with the orange label, and has a DB row. No TODO is created.
2. A second report on the same page and category within 24h threads under the first email.
3. A report saying "students can see the unit test" arrives as `[APCS Urgent]`, stays in the Inbox, and sends even when `REPORT_EMAIL_MODE=digest`.
4. A junk submission (one word, or 3 external links) is stored as dismissed and not emailed.
5. The widget does not load on any quiz or test page.
6. "Where is the CSA loops lesson" returns only real links from the index.
7. Setting a report to `fixed` sends exactly one thank-you to the reporter.
8. The morning stage runs in dry-run mode and sends `[APCS Morning]` with nothing written to the site.
9. All existing CI smoke suites still pass. Add suites for items 1 through 4 and 7.

## 8. For Tanner after merge

- Add the sending-domain DNS records from the PR description.
- Submit one real test report from the storefront and confirm it lands in Site Feedback.
- Review the dry-run morning emails for two weeks, then say which fix types go live.

---

## 9. What was actually true when PR 1 was built (added 2026-09-17 by the implementing session)

Everything above this line is the handoff as it arrived, with ONE character-level
edit: section 6.3's fix-tier table gave its mojibake examples as live mojibake,
which turned `npm run smoke:encoding` red on this repository the moment the file
landed in it. Those two examples are now written as codepoints, which is what
CLAUDE.md does for the same reason and says why. Nothing else above was touched.

Everything below was measured rather than recalled, because four of the claims
above turned out to be answerable and two of them answered the other way.

### The mailer already existed, and the sending domain is already verified

Section 2 says to check first and asks for DNS records if they are needed. They
are not. Measured against public DNS on 2026-09-17:

    resend._domainkey.mail.apcsexamprep.com  TXT  p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC2Mefi...
    send.mail.apcsexamprep.com               TXT  v=spf1 include:amazonses.com ~all
    send.mail.apcsexamprep.com               MX   10 feedback-smtp.us-east-1.amazonses.com

That is the complete record set Resend asks for, on the subdomain
`mail.apcsexamprep.com`. `lib/mailer.js` has existed since the password-reset
work and already speaks to Resend. So section 2 was already done and PR 1 reused
it rather than adding a second mailer.

Two things this does NOT establish. Resend's dashboard is the only authority on
whether it considers the domain verified; what is checked here is that the three
records it asks for are present and correct. And nothing here proves a send
succeeds, because that needs the API key, which is in Railway and not in a
session.

### The apex domain is NOT a valid sender, and the old default pointed at it

`apcsexamprep.com` carries none of the Resend records, and its SPF is
`v=spf1 include:spf.protection.outlook.com include:secureserver.net -all`,
pointing at Outlook and GoDaddy and ending in a hard fail. `lib/mailer.js`
defaulted to `noreply@apcsexamprep.com`, which Resend would refuse. The default
is now `reports@mail.apcsexamprep.com`. `MAIL_FROM` or `REPORTS_FROM` still wins
where either is set, so a Railway environment that already sets one is unchanged.

### The one variable that is actually missing is the recipient

`GET /api/health` on commit f5e74eb reported:

    "assistant":{"mail_configured":true,"recipient_set":false,"can_notify":false}

So the key is set in Railway and no recipient is. Every report filed before this
PR was stored, filed on the board, and mailed nowhere, silently. `REPORTS_TO`
must be set in Railway before any of this delivers anything, and that is the one
manual step PR 1 leaves.

### Section 3.6 and the zero-PII posture disagree, and the posture wins

Section 3.6 asks the email body to carry "the user's words, verbatim". For a
student, and for an anonymous caller on a coursework page, there are no words:
`lib/assistant/scope.js` has never stored them and CLAUDE.md permits exactly one
table of student-typed free text, which is the sandbox. Mailing text the database
refuses to hold would move it from a row nobody reads into a mailbox that syncs
to a phone, which is not a smaller exposure, so the body says plainly that there
is no reporter text and why.

The same rule made one thing in section 4.3 impossible as written. A suggestion
IS its text, so on a page where typed text is not kept there is nothing to store
or send. Those are refused with a message naming the report form instead, rather
than accepted as an empty row that leaves somebody believing they were heard.
`GET /api/assistant/report/context` returns `suggestionsAllowed` so the widget
can hide the option before anybody types, rather than after.

### The subject line ambiguity in 3.5, and which reading shipped

"`vague` is emailed with `(vague)` appended to the subject **after** the prefix"
has two readings. It ships appended at the END of the subject, which is after the
prefix and cannot displace it. Immediately behind the prefix would also satisfy
that sentence and would break any Outlook rule matching the whole
`[APCS Bug] <category>` shape.

### Threading depends on a header the provider may not honour

3.4 says to store the first `Message-ID` and quote it. Resend mints its own id
and returns it after the send, which is too late to store and is not the header a
mail client threads on. So the head message's `Message-ID` is minted here, sent
in `headers`, and stored. If Resend or a relay overrides it, `In-Reply-To` points
at a message that does not exist and threading degrades to subject matching,
which Outlook's conversation view does anyway; follow-ups reuse the subject byte
for byte for that reason. This has not been observed against the live provider.

### The 7am digest has no trigger yet

3.1's digest mode holds non-urgent reports and `flushDigest()` sends them, reachable
at `POST /api/assistant/reports/digest/flush` with the admin key. Nothing calls it
on a schedule: an in-process timer in a container that restarts on every deploy
would make the send time a function of the last push. The caller is the Daily site
audit task, which is section 6 and PR 3. The default mode is `each`, so nothing is
waiting on it.
