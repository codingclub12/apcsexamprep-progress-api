# Locked labs: the branch was already right, the coverage was not

2026-09-08, Claude Code, branch `claude/script-nesting-code-blocks-mzo7kp`.

## What was actually wrong

Nothing in production. That is the headline, and it took a wrong turn to establish.

The locked-lab branch in `public/lab-player.js` shipped on 2026-09-07 in `ab57fa7`,
together with the real bug it was part of: the player asked for the lab spec
anonymously, so the server could not tell an enrolled student from a visitor, and
a teacher watched her closed lab open anyway. That is fixed and deployed. A
signed-out visitor on a closed lab reads "Your teacher has not opened this lab
yet." Verified in headless Chromium against the deployed player, the live gate
response and the lab page's own inline script: the offline card does not appear,
no terminal is offered, and the open AP Networking lab still mounts and is
interactive in the same harness.

What was missing is a test. `scripts/verify-lab-player-live.sh` greps the
deployed bytes for the locked message, and its own header records the first draft
of that grep looking for "Authorization" and passing against a build that still
had the bug. Nothing ran the branch.

The half a grep cannot see is the one that breaks. The lab pages wrap the mount
in their own offline fallback, attached to `.catch`, and it replaces the
container wholesale. So a locked card drawn on a REJECTED promise is drawn and
then painted over, and the student reads:

> The practice service is not responding right now. This is on our side, not
> yours, and it is usually brief. Reload in a minute, or browse the other labs,
> which keeps working while this is down.

about a lab a teacher closed on purpose. Every clause of that is false, and on
this date the last one was the worst: all three AP Cybersecurity labs were closed
to anonymous, so the link it offers leads to two more copies of the same card.
The branch as shipped returns `null`, which resolves, which is why none of that
happens. Nothing asserted it.

## The wrong turn, because it is the useful part

I read `public/lab-player.js` on a branch 76 commits behind `main`. There was no
locked branch there. I measured that stale copy in a browser, watched the false
outage card render, and wrote a fix, a smoke section and six mutations for a bug
that had been fixed the day before.

What caught it was the live verifier: written to run the DEPLOYED bytes rather
than the working copy, it came back 14 of 15, and the one failure was an
assertion about copy I had just invented. The deployed player was already
handling the case.

Two things to carry:

- Read the log before rebuilding. This is the third time it is written down in
  this repo, and each time the session had the evidence in reach and read the
  code instead.
- Point a live check at what is DEPLOYED, never at the working tree. A check that
  requires `../public/lab-player.js` would have agreed with me and confirmed a
  finding that was wrong.

The re-implementation was discarded. `public/lab-player.js` is untouched by this
branch.

## What landed

- `smoke/labs.js` gains a LOCKED LABS section that RUNS the shipped branch under
  the suite's existing DOM stub rather than reading it. Seven assertions. The
  load-bearing one is that `mountById` resolves.
- `scripts/verify-lab-lock-live.js` (`npm run verify:lablock`) pulls the deployed
  player and the live gate response and runs one against the other. It reports
  the live gate state rather than demanding one, and when no lab is closed it
  says so instead of passing quietly on a synthetic body.
- `scripts/rederive-lab-lock.py` (`npm run rederive:lablock`) reaches the same
  conclusion from the raw artifact in another language, without executing it.
- `lib/storefront-fetch.js` gains `status()`, and `smoke/storefront-fetch.js`
  gains rules 5.5 and 5.6. Separate work, same branch, described in its own
  commit.
- `deploy-gates/2026-09-08-lab-lock-coverage.json`.

## Evidence

- `npm run smoke:labs` 156 passed, 0 failed. `npm run smoke:storefront` 90/0.
- Seven mutations against the shipped branch, each red for its own assertion.
  The one that matters is M2: render the card but throw anyway. It reddens the
  two resolve assertions and leaves every wording assertion GREEN, which is the
  proof that they are independent rules rather than one rule counted twice. A
  player broken that way says all the right things and is invisible on a live
  page.
- Six further mutations against the rederive, fed broken bytes through
  `LAB_PLAYER_FILE`: throw instead of return, return `mount()`, branch removed,
  card echoes a spec field, branch renders nothing, catch stops rethrowing. Each
  red for its own rule. Plus the vacuity mutation in the gate manifest: empty the
  statement splitter and "does not throw or reject" comes back GREEN against a
  branch that throws, which is what the emptiness assertion is holding up.
- The rederive caught its own first draft. It looked for a `try`/`catch`
  statement when the handler is a promise `.catch`, and went red against a
  correct build. Same failure this whole file is about, one level up.
- Live, against production: `node scripts/verify-lab-lock-live.js` 15 passed, 0
  failed, with the gate reading `1.2-lab=anonymous-closed-for-activity`,
  `1.2-auth-lab=anonymous-closed-for-activity`,
  `2.4-lab=anonymous-closed-for-lesson`.
- Browser, against production: deployed player plus the live locked response plus
  the page's own inline script, in Chromium. Signed-out visitor reads "Your
  teacher has not opened this lab yet.", no offline card, no terminal. Open
  networking lab renders its title, chips and brief and is interactive. A 404
  still reaches the offline card, so real outages still say so.
- `node scripts/deploy-gate.js deploy-gates/2026-09-08-lab-lock-coverage.json
  --pre`: suite, rederive and mutation all agree.

There is deliberately no `live` check in that manifest. This change ships no
behaviour, so any live assertion would have passed yesterday, which this repo
calls decoration. `verify:lablock` belongs to the ongoing watch: it is what
catches the deploy where this stops being true.

## Still open

- **Whether a closed lab should be closed to the whole internet is Tanner's
  call, not a defect.** `labGate` withholds a lab from an anonymous visitor when
  ANY class has closed it, deliberately, because the public copy and the assigned
  copy are the same bytes and signing out was previously a way past every
  teacher's lock. Measured today: all three AP Cybersecurity labs closed to
  anonymous, all four AP Networking labs open. So one teacher's setting currently
  takes three labs dark for every visitor.
  The severity is lower than it first looks and the reason is worth stating: the
  lab PAGES still serve in full, 378,888 bytes with all the lesson prose intact,
  so the SEO surface is untouched. What a signed-out visitor loses is the
  interactive terminal, and what they read instead names the teacher rather than
  an error. Board #277.
- **`data-apcs-lab-locked` is set and nothing reads it.** It is the only
  machine-readable signal that a lock rendered, and a live page sweep is the
  obvious consumer. Asserted here so it does not quietly disappear, but no sweep
  uses it yet.
- The three cyber labs' locks were not traced to the `activity_gates` rows behind
  them. That needs the admin key, which this session does not hold.
