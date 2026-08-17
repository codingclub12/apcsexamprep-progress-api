# 2026-08-17 - claude-code - apcs CLI unusable in remote sessions

Task #89. Claim 1, locks `api:scripts/apcs.js` and `api:smoke/apcs-cli.js`.

## What was wrong

The session opened with a `DIGEST UNREACHABLE` banner, and the first guess was
the obvious one: the host is missing from the environment's egress allowlist.
That guess was half right, and the half that was wrong cost the session.

After the allowlist was updated, `curl` reached the board and `apcs` still did
not. Two independent defects were sitting on top of each other:

1. **The CLI went around the proxy.** Node's global fetch does not read
   `HTTPS_PROXY`. Automatic support landed in Node 24; this repo pins 22. Every
   `apcs` request was therefore sent direct, was transparently intercepted, and
   came back 403 from the proxy rather than from the board.
2. **The CLI and the SessionStart hook disagreed on the credential.**
   `.claude/hooks/session-start.sh` authenticates with `TODO_KEY`.
   `scripts/apcs.js` read only `APCS_TOKEN` or `~/.apcsrc`. So a remote session
   opened with a live digest in context and was then told `No credential` by
   every verb that followed it.

Together these meant the digest worked and nothing else did. `claim`, `evidence`
and `done` were all unreachable from a Claude Code environment, which is to say
rules 2 and 3 in CLAUDE.md could not be followed by the sessions most likely to
need them.

The misdirection is worth naming on its own. On the bypassed request the proxy
answered `Host not in allowlist: ... Add this host to your network egress
settings`, and the CLI printed that verbatim under its own `403 - forbidden`
heading, followed by `Agent credentials cannot touch: due_date, cost_per_day,
promised_by, verified`. Both halves point away from the real cause. The advice
could never work, because the host was already allowed.

This is not the first time. `docs/runs/2026-08-16-claude-code-intro-java-greenfoot.md`
closes with the ledger unopened for the same reason: "no `APCS_TOKEN` in the
container, so no claim was taken and no task was closed."

## What changed

`scripts/apcs.js`

- `reexecForProxy()` runs before anything else. When `HTTPS_PROXY` is set and
  the running Node supports `--use-env-proxy`, the CLI re-execs itself once with
  that flag. undici reads the flag at initialisation, which happens before the
  first line of the file, so no in-process assignment to `process.env` can work.
  Guarded against recursion with `APCS_PROXY_REEXEC`, a no-op when no proxy is
  configured, and a fall-through rather than a failure on older Node.
- The child is spawned with `--disable-warning=UNDICI-EHPA`. The experimental
  warning is emitted under that code, not under `ExperimentalWarning`, so the
  type-named form does not silence it and every ledger command would carry a
  warning.
- `token()` accepts `TODO_KEY` last, after `APCS_TOKEN` and `~/.apcsrc`. Last on
  purpose: purely additive, so nobody whose setup works today changes behaviour.
- A `403` with a text/plain body containing `not in allowlist` is now reported as
  an egress block that never reached the board, and explicitly not as a
  credential or field-permission problem. The board always answers JSON, which is
  what makes the two distinguishable.

`smoke/apcs-cli.js`

- 6.1 now clears `TODO_KEY` as well, or it is not a credential-less run.
- 6.1b asserts the failure names `TODO_KEY`.
- 6.1c asserts `TODO_KEY` alone authenticates.
- Section 7 covers the proxy: a configured proxy does not break a `NO_PROXY`
  loopback call, the recursion guard short-circuits, no experimental warning
  reaches output, and a proxy 403 is reported as an egress block without blaming
  agent field permissions. A `/proxy403` fixture route reproduces the proxy's
  exact text/plain refusal.

## Evidence

`apcs` with no manual env bridging, in this container, against the live board:

```
$ node scripts/apcs.js show 89
#89  apcs CLI unusable in remote sessions - fetch bypasses the egress proxy, ...
  now/api/-  owner=tanner  size=s  status=in_progress  verified=NO
```

Before the change the same command exited non-zero with `403 - forbidden` and
the allowlist advice.

Suites, offline:

```
apcs cli:        51 passed, 0 failed   (43 before; 44th was failing on the new contract)
command-center:  64 passed, 0 failed
command-checks:  25 passed, 0 failed
dispatch queue:  31 passed, 0 failed
verify-board:    53 passed, 0 failed
session-hook:    22 passed, 0 failed
```

## Still open

- **Not verified, and not mine to verify.** #89 goes to `needs_verification`.
- **The re-exec is not proven by the offline suite.** Test 7.1 passes with or
  without the fix, because a direct fetch to loopback also succeeds; it is a
  regression guard against proxying loopback, not proof that the proxy is used.
  The proof is the manual run above, which needs a real proxy and a real host.
- **`needs_verification` now holds 15 tasks**, the largest bucket on the board,
  and none of it is closable by an agent.
- The `.env.example` and README say nothing about `APCS_TOKEN` or `TODO_KEY` for
  the CLI. The header comment and `apcs help` now do.

## Learned

A 403 that arrives from infrastructure and a 403 that arrives from the
application mean opposite things, and a client that prints them the same way
sends people to the wrong place with confidence. The fix that mattered was not
the re-exec, it was making the two distinguishable in the output: the board
answers JSON and the proxy answers text/plain, and that was sitting in the
response the whole time.

The second lesson is cheaper. Two names for one secret is not a naming problem,
it is an outage in whichever component holds the name nobody set. The hook and
the CLI were written months apart, each internally consistent, and the seam
between them was invisible until a session opened with a digest it could not act
on.
