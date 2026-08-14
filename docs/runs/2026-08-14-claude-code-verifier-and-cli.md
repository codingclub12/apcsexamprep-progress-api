# 2026-08-14 - verifier and CLI (Phase 0.2 and 1.1)

Agent: Claude Code. Branch: `claude/verifier-and-cli-vaw0hu`, off `main`. PR only, nothing merged.

Separate from the Phase 0.1 branch on purpose, so the hazard patch can merge on its own.

## What landed

| File | Source |
|---|---|
| `scripts/verify-artifact.js` | `verifier-agent.zip`, with the mojibake detector rewritten |
| `smoke/verify-artifact.js` | same zip, section 5 replaced and section 6 added |
| `.claude/agents/verifier.md` | same zip, verbatim. Creates `.claude/agents/` |
| `scripts/apcs.js` | `apcs-cli.zip`, with three defects fixed |
| `smoke/apcs-cli.js` | new. The CLI shipped with no tests |
| `package.json` | `smoke:verify`, `smoke:apcs`, `bin.apcs` |

## Evidence

```
npm run smoke:verify    21 passed, 0 failed   (was 17 in the zip)
npm run smoke:apcs      37 passed, 0 failed   (new)
npm run smoke:command   58 passed, 0 failed   (untouched)
npm run smoke:checks    25 passed, 0 failed   (untouched)
```

Both new suites were run against the ORIGINAL code to prove they fail on the
bugs they describe, then against the fixed code. That is the whole point of
adding them, so it is worth recording what each caught.

## 1. The verifier: mojibake detection was dead in half the cases

`checkMojibake` enumerated cp1252 renderings only. The same damage renders two
ways: the bullet U+2022 is UTF-8 `E2 80 A2`, and byte `0x80` is a control
character under latin1 but the Euro sign under cp1252. The pattern list looked
for the cp1252 form, so latin1-flavoured mojibake produced no finding at all.

Measured, before the fix:

```
cp1252-flavoured:  [P0] mojibake on 1 line(s)
latin1-flavoured:  (no mojibake finding)
```

The check's own comment claimed it was "shape-based, not a pattern list ...
so enumerate neither", and then enumerated one of the two.

**Why it survived:** smoke section 5 was titled "Mojibake, headings, missing
meta" and asserted nothing about mojibake. Its fixture is built with
`.toString('latin1')`, which is precisely the input the detector missed, and the
section only checked the `h1` count and the meta description.

**The fix** matches the shape instead: a UTF-8 lead byte (`0xC2-0xF4`) followed
by one to three continuation bytes, with the continuation class covering both
`U+0080-U+00BF` (latin1) and the cp1252 punctuation block. Both encodings pass
`0xA0-0xFF` through unchanged, so one lead class covers both. Written as `\u`
escapes because half those code points are control characters.

**The test now covers it.** Section 6 asserts both flavours are caught, that a
clean ASCII page stays quiet, and that correctly-decoded accented text is not a
false positive. That last one matters: several accented Latin-1 letters sit in
the lead class, so the detector has to distinguish `caf` + `e-acute` from real
damage. Verified against `café`, `coûte 5€`, `¿Qué tal?`,
`año`, guillemets, degree and plus-minus signs.

Run against the old detector, the new suite goes `20 passed, 1 failed` on
"catches latin1-flavoured mojibake". Restored, `21 passed, 0 failed`.

## 2. The CLI: a task id was being used as a claim id

`POST /api/command/task/:id/claim` takes a TASK id and returns a CLAIM id.
`POST /api/command/claim/:id/heartbeat` and `/claim/:id/release` take the CLAIM
id. The CLI discarded `claim_id` from the claim response and printed
`heartbeat with: apcs heartbeat <task id>`.

Best case that 404s. Worst case a claim carrying that number belongs to a
different task, and the wrong lock is released with a 200 and no error.

Running the new suite against the original CLI:

```
[FAIL] 2.1 release names the claim it actually released   "released #2 - lock given up"
[FAIL] 2.2 task 2 has no live claim left
[FAIL] 2.3 NO OTHER TASK was touched: task 3 still holds its claim  {"task3_live":0,"before":1}
[FAIL] 2.5 heartbeat resolves the claim and succeeds      "alive #3"
[FAIL] 2.6 heartbeat on an unclaimed task fails loudly    "alive #1"
[FAIL] 3.5 the conflicting claim was NOT created
[FAIL] 4.3 done on a claimed task reports it as returned  "done #1"
[FAIL] 4.4 THE CLAIM IS RELEASED, not left to rot         {"before":1,"after":1}
29 passed, 8 failed
```

Read 2.3 carefully: `apcs release 2` left task 3 with **zero** live claims. It
destroyed a different task's lock and reported success. 2.6 is the same failure
from the other side: heartbeating a task that holds no claim "succeeded",
because it renewed a stranger's.

Three fixes:

1. **Claim resolution.** Every command still takes the task id an operator
   already knows, and resolves the claim id from the digest, which is the only
   place that mapping is published (`in_flight[].claim_id` and `stale[]`). Stale
   claims are searched too, since releasing one is most of the reason to release
   anything. `--claim <id>` skips the lookup. No claim found is a loud error
   naming the next step, never a request against a number that means something
   else.
2. **`done` returns the claim.** It now posts to `/claim/:id/return`, which
   records the artifact AND releases the lock in one call, falling back to the
   bare `PATCH /api/todo/:id` only when no claim is held, which is the correct
   path for chat-routed work the router refuses to give a lock to.
3. **`claim` can express locks.** Repeatable `--lock repo:path`, plus `--label`,
   `--ttl` and `--force`. A 409 is now printed as the protocol working: it names
   the holder, the session label, the conflicting files, and how long it has been
   held, and exits 3 rather than dying with a generic error.

## 3. Note on the new suite itself

`smoke/apcs-cli.js` spawns the real CLI as a child process against real routers
on an ephemeral port. The first version used `spawnSync` and deadlocked: the
express server under test lives in the same process, and `spawnSync` blocks the
event loop, so the parent could never answer the child. It uses async `spawn`
and is commented to say why, since the mistake is an easy one to repeat.

## Not done

- **Nothing was run against production.** This session has no `TODO_KEY`, so
  every measurement here is offline against throwaway databases. The CLI's real
  first run against `progress.apcsexamprep.com` is still worth doing by hand.
- **`checkStaleDates` layer attribution is approximate.** It classifies a hit by
  slicing 40 characters either side of the match and asking which layer contains
  that slice. A date near the opening of a `<script>` block produces a window
  that straddles the boundary and gets attributed to `body`, which would read as
  a P1 rather than as noise. Not fixed: it needs an index-based layer map rather
  than a substring search, and that is a larger change than this pass warrants.
  Flagged rather than silently carried.
- **No agent definitions beyond `verifier`.** The roster in the brief is
  deliberately one at a time.
