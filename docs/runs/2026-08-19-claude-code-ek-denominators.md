# 2026-08-19 - Real EK denominators, and the watcher premise was wrong

Agent: Claude Code. Branch: `claude/course-networking-strategy-8chhni`, off `main`.

## What changed

Egress opened. `apcentral.collegeboard.org` became reachable, so the AP Networking
course framework PDF could finally be read: 102 pages, 284 Essential Knowledge
codes, 60 learning objectives.

That converted the depth audit from floors to measurement.

- Coverage is **166 of 284, 58.5 percent**. 118 codes uncited.
- The original audit inferred **53** missing codes from breaks in cited sequences.
  The floor was a genuine floor and it was **less than half** the truth.
- Unit coverage rises monotonically: 42, 54, 63, 70 percent. Unit 1 is the floor
  and is where a teacher evaluating the course starts.
- The A-group finding held exactly: 1.1 missing all 7 A codes, 1.2 all 4, 1.3 all
  4. Every other topic reaches its A group.
- 3.6 and 4.5 are at 100 percent. They are the template.
- **Zero invented identifiers.** Nothing cited on any page is absent from the
  framework. The problem is omission only, never fabrication.

## The watcher premise was wrong, and running it is what found that

`scripts/ced-watch.js` had never run. Running it now returned NOTHING WAS READ,
16 of 16 HTTP 403.

The 403 body is the giveaway: `Host not in allowlist: apcentral.collegeboard.org`.
That is the agent proxy talking, not College Board. `curl` reaches the host fine;
Node's `fetch` still goes through the proxy and is denied.

Two things follow, and the second one is the important one:

1. It is NOT a User-Agent problem. Tested the bot UA, a browser UA, and no UA at
   all through Node: all three 403. Through curl, the same URL returns 200 with
   any non-empty UA. So the earlier hypothesis that College Board blocks
   bot-identifying agents is wrong, and the script's own diagnostic message, which
   offered "egress or user-agent", was right to hedge.
2. **The Actions premise is still unproven.** The workflow was merged on the claim
   that Actions runners reach apcentral where sessions cannot. That claim was never
   tested and still has not been. The workflow has zero runs; the first scheduled
   one is 2026-08-24 09:30 UTC. If it reports NOTHING WAS READ, the watcher is
   broken as built.

Not fixed here on purpose. Making `ced-watch.js` shell out to curl would make it
work in a session and is the wrong shape for a job whose home is a runner with
open egress. The right next step is to see what the first scheduled run does, or
to add `apcentral.collegeboard.org` to the environment's Custom allowed domains,
which the proxy's own 403 message instructs.

## What shipped

- `config/networking-framework-ek.json` - the 284 codes, pinned by sha256 to the
  exact PDF, so a framework revision is detectable rather than silently moving the
  denominator.
- `scripts/networking-ek-coverage.js` - fetches the 22 live pages and reports
  coverage per topic, per unit, and overall. Flags any cited code absent from the
  framework separately, because inventing an identifier is a correctness problem
  rather than a gap.
- `docs/ap-networking-depth-audit.md` - rewritten against real denominators.

## Evidence

`node scripts/networking-ek-coverage.js` against the live site: 22 of 22 pages
read, 166/284, unit gradient 42/54/63/70, zero stray identifiers.

## Still open

- The 118 uncited codes. 1.4 at 33 percent is the worst single topic, then 2.1 at
  33, 1.2 at 38, 3.3 with the largest absolute gap at 13 codes.
- Whether the CED watcher works on a runner.
- The cert crosswalk is still domain level. `comptia.org` now answers; `cisco.com`
  returns 403 to automated clients, so CCST sub-objectives remain unsourced.
