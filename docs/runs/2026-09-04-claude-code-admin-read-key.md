# 2026-09-04: a read-only admin key, and the guard I nearly shipped instead

Tanner asked for `ADMIN_KEY` in the Claude Code environment so a session could
finish the T-0.2 live gradebook check. I flagged one consequence, offered a
guard, and he said do it. **The guard I offered could not have worked, and
building it would have been the exact failure this repository keeps paying for.**
This note is mostly about that, because the code at the end is small.

Claimed #193 with locks `api:routes/admin.js` and `api:lib/admin-session.js`
before touching either. Claim 81.

## What ADMIN_KEY actually grants

Not just reads. Three steps, each one in the code rather than inferred:

1. `server.js:422` `POST /admin/login` takes `{key}`, checks it against
   `ADMIN_KEY`, and issues the dashboard session cookie.
2. `isAllowedOrigin` in `server.js` returns `true` when there is no `Origin`
   header, explicitly for curl. So a terminal session can mint that cookie.
3. `routes/todo.js:174` `POST /:id/verify` is gated on `requireCookieAuth`,
   which accepts exactly that cookie.

So a session holding `ADMIN_KEY` can mark its own work verified, and rule 4 of
CLAUDE.md, that the agent which did the work is never the one that says it is
true, stops being enforced by anything. `?reveal=1` also returns real student
names, and `routes/admin.js:433` carries a `force=1` that destroys gradebook data.

## The guard I offered, and why it is unbuildable

I proposed marking sessions as agent-minted at `/admin/login` and refusing the
verify bit for those. Then I read `lib/admin-session.js`:

    function sign(payload) {
      const mac = crypto.createHmac('sha256', secret()) ...   // secret() is ADMIN_KEY

The cookie is an HMAC signed with `ADMIN_KEY` itself, and `verify()` checks only
that HMAC. **An agent holding `ADMIN_KEY` never has to call `/admin/login` at
all.** It signs its own token, sets whatever flag the marking scheme invented,
and walks past the guard. The guard would have been defeated by the one
credential it existed to constrain, while reading in the diff like protection.

That is a hollow guard, and I had spent the same day writing three separate notes
about hollow guards. It would have passed a mutation test, too: mutating the
marking logic makes the suite go red, so the mutation report would have been
green and completely uninformative about the threat.

**The lesson worth keeping: a guard is only real if the party it constrains
cannot produce the thing it checks.** Marking is not a boundary when the marker
holds the signing key.

## What was built instead

`ADMIN_READ_KEY`, a second secret with strictly fewer powers.

- `GET` and `HEAD` only. Any other method is 403 with a reason.
- `?reveal=1` is 403. The zero-PII posture is not suspended for an agent, and
  nothing an agent needs from these endpoints wants a student's name.
- It **cannot mint a session**, because `/admin/login` checks `ADMIN_KEY`, and it
  cannot forge one, because it is not the HMAC secret.

The boundary is structural rather than declared: the holder does not possess the
thing that makes cookies. That is why this design is worth the extra env var and
the marking scheme was not.

An agent gets `ADMIN_READ_KEY`. `ADMIN_KEY` stays where it is.

## The gate caught my own dead guard

`deploy-gates/2026-09-04-admin-read-key.json`, at `--pre`: 2 suites and 5
mutations, each red on its own named assertion.

It also refused the first run twice, and the second refusal was the useful one.
I had written `if (read === full) return false;`, reasoning that setting both
keys to the same string would hand out full access under a read-only name, and a
mutation to prove it. **The gate reported that breaking the line left the suite
green.** It was right: when the keys are equal the full-key branch matches first
and returns, so the read-only branch is unreachable and the refusal cannot change
any outcome. Provably dead code with a test that could never fail.

Both are gone. The hazard is now written down in `routes/admin.js` instead, where
it belongs: the two keys must be DIFFERENT secrets, and equality is a
configuration error the API cannot detect on your behalf.

One assertion in the suite was hollow on the first draft too, in this suite about
hollow guards. It read `adminSession.sign ? adminSession.sign(...) : null` and
then asserted `forged === null || verify(forged) === null`. `sign()` is not
exported, so it passed **without ever forging a token**. It now builds the HMAC
directly, and carries a positive control asserting that a token signed with the
real key DOES verify, so the negative cannot pass because the construction was
malformed. There is a mutation proving that too.

## What is still not done

**The T-0.2 live check.** This ships the credential; it does not set it.
`ADMIN_READ_KEY` has to be generated, set in Railway, and set on the Claude Code
environment before any session can fetch the real CYBER-Z8LA gradebook. Until
then #85's live confirmation and #84's seven-denominator check are still open on
exactly the same blocker as this morning.

**Whether Tanner also wants `ADMIN_KEY` in the environment.** He asked for it and
then asked for the guard; this note is the answer to the guard half. If he wants
the full key there as well, that is his call to make with the verify-bit
consequence in front of him, and it is now written down where a session will read
it rather than living in one conversation.
