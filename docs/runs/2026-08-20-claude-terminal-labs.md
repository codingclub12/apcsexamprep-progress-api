# 2026-08-20 Interactive terminal labs

## What changed

An interactive terminal lab engine, and two labs on it.

- `config/labs/*.json` is the authored lab: brief, pretend filesystem, optional
  multiple choice questions, checks, and a reference solution.
- `lib/lab-spec.js` loads and validates them at boot. It refuses a spec whose
  points are not its check count, whose check matches an event the shell cannot
  emit, or whose `after` names a later check.
- `public/lab-player.js` is the shell (25 commands, sftp with a second host,
  history, tab completion), the check matcher, and the UI. Simulated filesystem,
  no container, no Judge0.
- `routes/labs.js` serves the index, the specs, the standalone page and the
  player.
- `routes/progress.js` now accepts `item_type: 'lab'` on `/attempt`. It did not,
  which meant the `lab` rows `scripts/seed-manifest.js` was already prepared to
  write had nothing that could post to them.
- `scripts/seed-manifest.js` derives the manifest row FROM the lab spec, so the
  denominator and the checkboxes cannot drift.
- `smoke/labs.js` plays every lab's own solution through the real player.

Labs shipped:

| lab | course | graded | points |
|---|---|---|---|
| `4.3-lab` Move a site survey to the file server | ap-networking | yes | 8 |
| `1.2-lab` Find the tournament code | ap-cybersecurity | no, practice | 6 |

`4.3-lab` implements the entry already authored in
`config/networking-hands-on.json`: eight checks against the EK statements it
names, check 8 being the VERIFY step.

## Evidence

`npm run smoke:labs`: **30 passed, 0 failed**. It mounts the real player under a
DOM stub and plays each spec's `solution`; both labs tick every check, both start
at zero, junk input does not crash the shell, and `cd ..` past the filesystem
root is contained rather than an error.

Live, on a local boot with the labs router mounted:

```
GET /api/labs                      200, two labs, spec_errors []
GET /api/labs/ap-networking/4.3-lab 200
GET /api/labs/ap-csa/nope           404
GET /lab/ap-networking/4.3-lab      200
GET /lab-player.js                  200, 40192 bytes
```

Boot seeding wrote exactly one lab row:
`ap-networking | unit-4 | 4.3 | 4.3-lab | lab | 8`.

Grade path, against a synthetic ap-networking class with retry on:

```
POST /attempt 8/8   -> recorded, attempt_no 1, passed true
POST /attempt 5/8   -> recorded, attempt_no 2, passed false, grade of record still 8/8
POST /attempt on the practice lab -> 400 Unknown item '1.2-lab'. Not in course_manifest.
POST /attempt score 99 -> 400 score must be between 0 and 8
POST /attempt with a "cmd":"cat /etc/passwd" key smuggled into detail
    -> stored as [{"q":1,"sel":null,"ok":true}]. The extra key is dropped by the
       sanitizer, which is the zero-PII enforcement doing its job on a hostile body.
```

Through the canonical gradebook with no view changes:

```json
{ "item_key": "unit-4/4.3/lab", "activity": "lab", "possible": 8,
  "possible_source": "manifest", "class_avg_pct": 100 }
```

## What this closes

The gap was never the gradebook. `lib/gradebook-contract.js` has mapped `lab` to
a canonical activity all along. The gap was upstream: nothing could produce a lab
attempt, because there was no environment to produce one from and `/attempt`
rejected the item type.

Also closed: **preview**. `?preview=1` runs a lab and posts nothing. Every other
reporter in this repo treats a teacher walking a page as a student attempt.

## Still open

- **Only the API side.** No lesson page embeds a lab yet. The embed snippet is in
  `docs/lab-contract.md`; shipping it is a theme repo PR.
- **`expected: false`** on the lab item in the contract. The item is observed and
  in the manifest, but no curriculum config declares 4.3 as expecting a lab, so
  pace does not count it yet. Cosmetic today, wrong the day a second lab lands.
- **Cyber is practice-only.** `1.2-lab` scores nothing until the denominator work
  in `docs/cyber-denominator-gaps.md` closes. One field plus a seed run.
- **The other nine config labs** in `config/networking-hands-on.json` have no
  spec. `NET_HANDS_ON_LIVE` stays false and the seed skips them; the lab rows now
  dedupe against it, so flipping it later cannot double-seed 4.3.
- **The score is client-computed.** Documented rather than solved. A student who
  wants to forge a lab grade POSTs a number and never opens the lab, exactly as
  they can with every CSA widget today.

## Learned

The reference implementation this was measured against (a JuiceMind cyber lab)
splits a lab in two: an ungraded real sandbox, and a separately-addressed free
response item that carries the whole grade. We cannot copy the second half, since
free response is free text. Cutting the same lab along a different seam, into
checks that are events rather than prose, gets most of the assessment value and
keeps the zero-PII posture. What it costs is the reasoning question, which is
real, and the honest answer is that reasoning belongs in a teacher-scored
documentation item, which `config/networking-hands-on.json` already anticipated.
