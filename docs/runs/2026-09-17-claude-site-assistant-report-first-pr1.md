# Site Assistant report-first rescope, PR 1: mail routing

2026-09-17. Board 350. Sections 2 and 3 of
`docs/handoffs/Site-Assistant-Report-First.md`, which this PR also commits: the
handoff arrived as an upload and was not in the repo, so nothing in a future
session could have read it.

## What changed

Reports stop going to the command board and start going to a mailbox.

- `lib/mailer.js` grew threading headers and a `Message-ID` that is minted before
  the send rather than read back after it. Its default From moved off the apex
  domain (see below), and it now reports its own from-domain for `/api/health`.
- `lib/assistant/report.js` is the routing: the three exact Outlook subject
  prefixes, the 24 hour `(page path, category)` thread, the urgency triggers, the
  email body, and digest mode.
- `lib/assistant/junk-filter.js` is new: three layers, cheapest first, failing
  open at every uncertain step.
- `routes/assistant.js` wires them in order, and the order is the design: the row
  is durable before any model is asked anything.
- `db.js` adds eleven nullable columns to `chat_escalations` and two indexes. No
  backfill, because a report filed before this shipped was never threaded and
  never triaged, and inventing verdicts for old rows would put fiction in the
  history.

## What was found on the way, which matters more than the diff

**The mailer already existed and the sending domain is already verified.** The
handoff's section 2 says to check first and to stop for DNS records if they are
needed. They are not. All three records Resend asks for are live on
`mail.apcsexamprep.com`: the `resend._domainkey` DKIM TXT, `v=spf1
include:amazonses.com ~all` on `send.`, and an MX to
`feedback-smtp.us-east-1.amazonses.com`. So there is nothing for Tanner to add,
and no reason to stop after this PR.

**The old default From address would have been refused.** `lib/mailer.js`
defaulted to `noreply@apcsexamprep.com`. The apex carries none of the Resend
records and its SPF ends in `-all`, pointing at Outlook and GoDaddy. Nothing had
caught it because `MAIL_FROM` is presumably set in Railway and the default is
never reached there. It is now `reports@mail.apcsexamprep.com`, and
`/api/health` reports the resolved domain so the next session can check rather
than assume.

**The thing that is actually missing is one variable.** `/api/health` on commit
f5e74eb answered `"assistant":{"mail_configured":true,"recipient_set":false,
"can_notify":false}`. The key is set; no recipient is. Every report filed since
Phase 0 shipped was stored, filed on the board, and mailed nowhere. `REPORTS_TO`
in Railway is the one manual step this PR leaves.

**Section 3.6 and the zero-PII posture disagree, and the posture won.** The
handoff asks the body to carry "the user's words, verbatim". For a student, and
for an anonymous caller on a coursework page, there are none: this repo has never
stored them. Mailing text the database refuses to hold would move it from a row
nobody reads into a mailbox that syncs to a phone. The body says there is no
reporter text and why. Suggestions, which ARE their text, are refused on those
pages with a message naming the report form, rather than accepted as an empty row
that leaves somebody believing they were heard.

## Evidence

    suite     smoke:assistantreport           95 passed, 0 failed
              smoke:assistantrouting          87 passed, 0 failed   (new)
              smoke:assistantkb               47 passed, 0 failed
              assistantdiag, exfil, anon, student, reset, encoding, volumepaths: green
    mutation  smoke:assistantroutingmutation  53 passed, 0 failed
              24 mutations, each caught by the assertion it was aimed at
    live      the DNS lookups above, and GET /api/health before the change

`live` is deferred to after the merge, which is where it can observe something.
The assertion to make then is `assistant.from_domain`, which does not exist in
the current response at all, so it cannot pass against yesterday's build.

## What mutation testing found, which is the part worth reading

The battery was green on the first run for 19 of 24 mutations and that was the
useful result, because the other five were all the suite lying rather than the
code being wrong.

- **Two assertions were hollow.** "The subject names the page PATH" posted a bare
  path, so a build that put the whole URL in the subject passed it. "A reporter
  email is dropped for a student" never sent one, so a NULL column proved
  nothing. Both now post the thing they claim to test.
- **Two mutations were no-ops, and both times the code was right.** The junk
  status is written twice, by `store` and again by `recordVerdict`, so breaking
  one changes nothing. `headerSafe` strips CR and LF twice, once as whitespace
  and once as a control character. Defense in depth reads exactly like a hollow
  guard from the outside, and the only way to tell them apart is to break both
  halves and watch.
- **One header assertion is protected by something else entirely.** `pagePath`
  runs the URL through the WHATWG parser, which strips CR and LF on its own, so
  that assertion passes with `headerSafe` deleted. The value `headerSafe` is
  actually the only guard for is the reporter's own text in a suggestion subject,
  and that assertion is new.
- **One mutation crashed the suite instead of failing it.** Making everything junk
  left `sent[0]` undefined and the suite threw, so the later sections reported
  nothing and the battery blamed the wrong rule. Every read of a captured message
  is guarded now.

## One thing I broke and fixed

Writing `lib/assistant/report.js` put literal NUL, 0x1f and 0x7f bytes into a
regex character class, because the `backslash-u0000` escapes in the source I
handed the editor were interpreted rather than written. The regex still worked.
The file read as binary to `grep`, which is how it was noticed, and only because
a mutation could not find its target inside it. `npm run smoke:encoding` does NOT
catch this: it looks for reversible mojibake, and a NUL byte is not that. A guard
for stray control bytes in tracked source would have caught it in a second, and
there is not one.

## Open

- `REPORTS_TO` is not set in Railway. Nothing delivers until it is.
- Threading depends on Resend honouring a `Message-ID` we supply. Not observed
  against the live provider; if it strips it, `In-Reply-To` points at nothing and
  threading falls back to subject matching, which is why follow-ups reuse the
  subject byte for byte.
- Digest mode has no 7am trigger. `flushDigest()` exists and is reachable at
  `POST /api/assistant/reports/digest/flush` with the admin key. The caller is the
  Daily site audit stage, which is PR 3. Default mode is `each`, so nothing waits.
- Turnstile is not configured, so layer 1 on anonymous submits is the rate limiter
  alone. `REPORTS_TURNSTILE_REQUIRED` makes it mandatory once keys exist.
- TODO #215 closed. It was the Sept 4 test row and said so on the row itself.
