# 2026-08-21 - Cyber course resources, the 2.4 badge log lab, and the wiring that generalises

Two shipped things and one broken thing found on the way. Everything below is
live and verified unless it says otherwise.

## 1. The five premium course documents

`/pages/cyber-command-center` linked twenty five lesson folders and nothing at
course level. The pacing guides, the capstone rubric and the two orientation docs
existed in Drive, finished and shared, with no route to them from the hub a
teacher actually opens. The page showed a Pacing stat tile reading a day count
and offered nothing to click.

`scripts/cyber-command-center-resources.js` inserts one Course resources card
between the stat blocks and the unit accordions:

| document | Drive id |
|---|---|
| Start Here | `1AS8EqcG...` |
| How To Use This Course | `1m7Wi6aR...` |
| Pacing Guide: Full Year | `1ycmbdAI...` |
| Pacing Guide: Block and Semester | `1qR_b07Z...` |
| Threat Defense Report Rubric | `1nCqSjlh...` |

Premium, all five, including on the free Unit 1 preview: these cover the whole
year, and Unit 1 being a free sample is not a reason to hand out the full-year
pacing guide.

**Worth stating plainly, because it will be rediscovered otherwise:** this is
presentation gating, not access control. All five Drive files are shared
"anyone with the link", which is how every one of the twenty five lesson
materials on that page already works. This change published five more such
links into public HTML. That is the same exposure shape `routes/files.js` was
built to close on `csp-command-center`. Closing it here means moving Cyber onto
the file-gate pattern, which is a larger change than this was.

## 2. The Unit 2 lab: read the badge log

`config/labs/ap-cybersecurity-2.4-lab.json`. Eight checks, three questions,
twenty minutes. A week of badge swipes worked with `ls`, `cd`, `cat` and `grep`.

Three findings are real: an exit with no matching entry (tailgating), a 02:47
entry that never exits (after hours), one badge in two buildings eight minutes
apart when the walk is twenty five (cloned credential). Two more look wrong and
are not: a facilities lead who works an evening and badges out cleanly, and a
double tap at reception. **The decoys are the lab.** Finding an anomaly in a log
is the easy half; deciding which anomalies are attacks is the CED skill.

### Why 2.4 and not 4.2 hashing

I recommended 4.2 first and was wrong. `public/lab-player.js` implements
`cat cd ls find grep head tail wc tree sftp` and **no `sha256sum`**. Hashing needs
a new command in the shell, which is engine work. 2.4 runs entirely on commands
that already exist, which is why it went first.

Anyone picking up 4.2 starts by adding `sha256sum` to the player.

### graded:false, and it must stay in step with 1.2

`scripts/seed-manifest.js` deliberately does not seed `ap-cybersecurity`: that
course carries its own denominators. A manifest row here would add points to
every cyber student's denominator through a second path, which is exactly what
`smoke/manifest-prune.js` exists to prevent. Playable and self-checking today,
records nothing. Flipping it is one field per spec plus a seed run, once
`docs/cyber-denominator-gaps.md` closes.

**A teacher who assigns this lab and looks for scores in the gradebook will not
find them.** That is the current, deliberate state, not a bug.

## 3. The wiring scripts assumed exactly one cyber lab

Authoring the second one exposed it. Neither script would have failed loudly;
both would have shipped a lab nobody could reach.

- **`scripts/cyber-lab-links.js`** hardcoded 1.2 in three places: the spec
  lookup, the course guide anchor, and the `STU` row matched as a string
  literal. It now walks every `ap-cybersecurity` spec, derives each lesson's
  existing non-terminal lab handle from its `lesson_id` (2.4 has its own
  pre-existing Lab row, exactly like 1.2's Password Attack Simulation), locates
  the `STU` row rather than matching a literal, and patches the shared `dests`
  list only when missing. `--item` narrows it to one lab.
- **`scripts/cyber-lab-key-panel.js`** returned early whenever the panel marker
  was present. **Installed is not current.** A lab authored after the panel
  shipped left `LABKEY` naming only the older labs, so its lesson row rendered no
  answer key button at all, silently. It now refreshes the map in place rather
  than reinstalling the panel and doubling its listeners.

3.2, 4.2 and 5.6 need no further script work.

## The teacher answer key needed no authoring

This was the part expected to be a build. It already existed:
`GET /api/labs/:course/:item/key`, teacher gated, derived by
`lib/lab-answer-key.js` from the spec. For 2.4 that is eight rubric rows, a ten
step walkthrough and three explained questions, none of it written twice. See
`docs/lab-key.md`.

## Evidence

- `smoke/labs.js`: **130 passed, 0 failed**, including replaying 2.4's reference
  solution through the real player to prove all eight checks tick, and that junk
  input ticks nothing.
- **The lab played to 8 of 8 in a browser** against the live page, the live
  `lab-player.js` and the live spec from the API. Not repo copies.
- The deployed player is byte identical to `public/lab-player.js`.
- The live spec does **not** ship `solution`, so the walkthrough stays teacher only.
- Selecting a radio ticks nothing until the answer is submitted. Verified, not
  assumed: I got 5 of 8 until I submitted properly.
- Command Center rendered in both entitlement states after the wiring import:

  | state | key buttons | terminal lab links | page errors |
  |---|---|---|---|
  | locked | `1.2-lab` | 1.2 | none |
  | unlocked | `1.2-lab`, `2.4-lab` | 1.2, 2.4 | none |

  Locked correctly hides 2.4: Unit 2 is paid.
- Tag balance after patching: guide `div 380/380`, `a 246/246`; command center
  `div 69/69`, `a 15/15`.

Merged: **#255** (2.4 spec and page copy), **#265** (both wiring scripts).
Imported: the lab page sheet, and the guide plus command center wiring sheet.

## The thing that broke, and what it should teach

Between the resources import and the wiring import, `/pages/cyber-command-center`
went blank below the intro paragraph for every visitor.

Cause: a stray `end` token on the line `/* apcs-lab-key panel */ end`, left by a
concurrent edit that landed in the same body as the resources card. A bare
identifier throws `ReferenceError: end is not defined` at script evaluation,
which killed the whole IIFE before anything rendered. Blocks, units, progress,
resources: all dead. Fix was deleting four characters.

Two lessons, both cheap and both learned the expensive way:

1. **A byte-level diff would not have caught this.** The body was valid HTML and
   the script parsed under `new Function`. Only rendering it found the fault. Every
   Command Center body edit in this session after that point was verified by
   rendering in a browser, in both entitlement states, before the sheet was sent.
2. **Two agents editing one page body is the hazard.** The resources card and the
   lab key panel were authored independently and met in the same 68 KB body. The
   surgical-anchor discipline these scripts use is what made the collision
   survivable; it did not prevent it.

## Also found: the deploy pipeline was stuck for hours

Railway served `5f8ad2c` (PR #250) while `main` sat eight commits and roughly
seven and a half hours ahead. **No failed deploys. No deploys at all.** Three
merges produced no deployment record, including two that were not mine, so
another session's CSA exercise pages were undeployed the whole time.

The service read Online throughout, because Railway keeps the last healthy
deployment serving. `main` booted clean locally, which ruled out the code.

It resolved during the session and I never saw which action fixed it. **If it
recurs, the diagnosis is: an Online service is not evidence of a recent deploy,
and the commit in `/api/health` is the only thing that is.** Check the service's
Deployments tab for absent versus failed entries; they point at different causes.

## Open

- `graded:false` on both cyber labs until `docs/cyber-denominator-gaps.md` closes.
- 3.2, 4.2 and 5.6 unauthored. 4.2 blocked on `sha256sum` in the player.
- Cyber has never been moved onto the `routes/files.js` gate. Every Drive link on
  the Command Center, including the five added today, opens for anyone holding
  the URL. No answer keys are among them, so nothing got worse; the pattern is
  still open.
- The unexplained Railway deploy gap.
