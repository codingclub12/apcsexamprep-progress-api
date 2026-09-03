# CLAUDE.md additions: the cyber exam facts, the mojibake rule, and two corrections

Session: Claude Code, 2026-09-03. Branch `claude/new-session-7mdtt2`.
Input: an uploaded proposal, "Proposed additions to CLAUDE.md (corrected 2026-09-03)",
which itself superseded an earlier draft. Committing it is what "memorize this" means,
so the whole of it landed in `CLAUDE.md` rather than as a docs file nothing reads.

Nothing in the proposal targeted the theme repo, so `APCSExamPrep-theme` is untouched.

## What changed

Five insertions, placed where a reader forms the belief rather than in a corrections
appendix at the bottom, because a correction filed away from the claim it corrects
does not get read.

| Where | What |
|---|---|
| `Read before starting work`, after the token paragraph | This repository is PUBLIC, stated plainly for the first time |
| `What this repo is`, before `Current mission` | The AP Cybersecurity exam facts, and where the CED actually lives |
| Section 1b, after the contract | Status of the gradebook rollup, and that board task 85 is stale as written |
| `Conventions` | Generator plus validator plus parse-back; the mojibake rule; mutation testing |
| End of file | Two new sections: item-bank disjointness, and the exercise design standard |

454 lines to 706. Still pure ASCII: `LC_ALL=C grep -c '[^ -~]' CLAUDE.md` returns 0,
as it did before.

## Four things in the proposal were wrong, and were corrected before landing

The proposal was already a correction of an earlier draft. It was still wrong in four
places, and three of the four are the same failure: naming an authority without
opening it.

**1. `data/cyber-topics.json` does not exist and never has.** The proposal named it as
"the only authority" for the 24 topic titles. `find . -iname '*cyber-topics*'` returns
nothing in either repo; there is no `data/` directory. The real authority is the CED
text under `tools/ap-cyber-ced/`, `CED-UNIT1-EXTRACT.txt` and
`CED-UNITS-2-5-EXTRACT.txt`, both greppable by `TOPIC N.N`, with the enumeration
recorded in `docs/ap-cyber-units-2-5-ced-audit.md`. This is the same defect
`validate_csv.py` was for the EK convention one day earlier: a named check that comes
back clean because it is not the check you think it is. The landed text says so
explicitly, so the next draft cannot reintroduce it quietly.

**2. The swapped topics are 3.3 and 3.4, not 1.3 and 1.4.** The proposal attributed the
swap to Unit 1. `docs/ap-cyber-units-2-5-ced-audit.md` records it in Unit 3: site 3.3
and 3.4 are each other's CED topics, so a teacher assigning "3.4 Firewalls" from the
CED sent the class to Network Segmentation. `lib/cyber-unit3-renumber.js` carries the
fix. Nothing in `docs/ap-cyber-unit1-ced-realignment.md` describes a 1.3/1.4 swap.

**3. The CED PDF is not in this repo at all**, so "the CED file in this repo is not a
PDF" could not be landed as written. `config/ced-sources.json` watches
`ap-cybersecurity-course-and-exam-description.pdf` at its College Board URL as
`cyber-ced-pdf` and stores only a sha256 and a length. The proposal's filename,
`ap-cybersecurity-course-and-exam-description__1_.pdf`, is a browser download artifact.
The useful form of the warning survived: a session will not find a PDF and must not
conclude the CED is unavailable, plus the practical check (look for `%PDF`, then for
`/Root`) before reaching for a PDF library.

**4. The proposed "general test" for mojibake is worse than what it replaces.** This is
the substantive one and it has its own section below.

## The mojibake finding

The proposal's central claim was that its own predecessor had the byte patterns wrong,
and that the fix was a general test: any `U+00C3` followed by a codepoint in
`U+0080-U+00BF`, "preferred over the substring list" because it "catches both
corruption depths".

Re-derived from first principles rather than from the table, in a second
implementation that produces the corruption itself (`singlePass` = UTF-8 bytes decoded
as cp1252) instead of trusting anyone's transcription:

| intended | single pass | double pass |
|---|---|---|
| `U+2022` bullet | U+00E2 U+20AC U+00A2 | U+00C3 U+00A2 U+00E2 U+201A U+00AC U+00C2 U+00A2 |
| `U+1F3AF` target | U+00F0 U+0178 U+017D U+00AF | U+00C3 U+00B0 U+00C5 U+00B8 U+00C5 U+00BD U+00C2 U+00AF |
| `U+00E9` e-acute | U+00C3 U+00A9 | U+00C3 U+0192 U+00C2 U+00A9 |

The proposal's two-column table is correct. Its rule is not. Measured coverage:

| detector | single-pass bullet / emoji / triangle | double-pass e-acute / nbsp |
|---|---|---|
| proposed rule (`U+00C3` + `U+0080-U+00BF`) | MISS | MISS |
| `smoke/encoding-guard.js` as shipped | MISS | catches |
| round trip, lead set widened to C2-F4, cp1252 encoder added | catches | catches |

So the proposed rule misses the exact single-pass bullet and emoji corruption the
proposal says is what appears on the live pages, and additionally loses two cases the
existing guard already catches. Swapping it in would have been a net regression
wearing the language of rigour.

**The real finding is about the guard, not the proposal.**
`smoke/encoding-guard.js` is right about method: mojibake is reversible, so the round
trip is the only honest discriminator, and nothing about the shape of the text proves
anything. But its lead set is `{U+00C2, U+00C3, U+00E2}` and it encodes through latin-1
only. Single-pass corruption of a 3- or 4-byte character starts at U+00E0 to U+00F4,
outside that set, and its continuation bytes land on cp1252 punctuation such as U+20AC
which latin-1 cannot represent, so the round trip is never attempted. The 2026-08-07
incident it was built for was double-pass, which is why it has always looked complete.

The guard's own comment says "BOTH CODECS MATTER" and explains that a cp1252-only first
version reported pages clean while triangles were broken. The mirror of that bug is
still live: latin-1 alone cannot express the cp1252 punctuation range, so the guard is
now blind in the opposite direction.

A widened detector was written and measured: lead set widened to every character a
UTF-8 lead byte C2 to F4 becomes, a cp1252 encoder beside latin-1, chunk widths up to
4. Against six characters at both depths and seven legitimate samples including
Portuguese and Vietnamese: recovers all six, zero false positives.

**Not shipped.** It is a guard change, it wants its own claim and its own mutation run,
and this session's job was the file. Flagged for the board.

## Evidence

`suite`: all 161 offline smoke suites, derived from `package.json` exactly as
`.github/workflows/tests.yml` derives them, run locally. All pass, `smoke:encoding`
included. Re-derivable by anyone: the loop is in the workflow.

`rederive`: the mojibake conclusions come from a second implementation written without
reference to the proposal's table, which then disagreed with it. That is what the kind
is for. Scripts are scratch, but every number above is reproducible in a few lines of
Node from the codepoints in the table.

`mutation`: `smoke/encoding-guard.js` was proven NOT hollow for double-pass and hollow
for single-pass, which is the same experiment read both ways. Its detector fires 6
times on the uploaded proposal file, which is also why the landed table is written as
codepoints: pasting the proposal's literal mojibake into `CLAUDE.md` would have turned
the repository scan red and, under the `main` ruleset, blocked its own merge.

`live`: none, and none is claimed. This change ships no behavior. There is no assertion
about production that is true after it and was false before, and CLAUDE.md is explicit
that an assertion which would have passed yesterday is decoration. No deploy-gate
manifest was written for the same reason.

## Two corrections that needed live evidence and did not get it

**The repo is public: CONFIRMED.** GitHub API, 2026-09-03:
`codingclub12/apcsexamprep-progress-api` reports `"visibility": "public"`,
`"private": false`. The proposal was right that this was written down nowhere. It is now
in the file, next to the token rules that only make sense in its light. Whether public
is the intent is Tanner's call, not a session's: flipping it touches the Railway
integration and the Actions runs.

**Board task 85 is stale as written, but this session cannot close it.**
`lib/admin-gradebook.js` already computes `pct(earnedSum, possibleSum)` and reports
`basis: 'points'`; the mean of percentages survives only as a labelled `basis:
'percent'` fallback for a class with nothing priced. The comment describes the old
behavior in the past tense with the worked example (38% operator vs 60% teacher). Task
85 nonetheless reads "replace percentage-averaging with points-based" and sits in
`bleeding`.

That is a code read, not an observation of production, and the resolution the
discrepancy actually calls for is a live gradebook response. It was attempted:
`GET /api/admin/class/e57aa18d.../gradebook` answered
`403 {"error":"Invalid or missing admin key."}`. Fail-closed, working as designed. The
live check needs the admin key and a session that is not the one that would do the
rebuild.

## A token leak, and the idiom that caused it

Both `COMMAND_READ_TOKEN` and `TODO_KEY` went into this session's transcript on the
first command, from a line meant to print whether they were set:

    echo "COMMAND_READ_TOKEN set: ${COMMAND_READ_TOKEN:+yes}${COMMAND_READ_TOKEN:-no}"

`${VAR:-no}` expands to the VALUE when the variable is set. The line reads as a
presence check and is a disclosure. `[ -n "$VAR" ] && echo set` is the check.

CLAUDE.md said this had happened once. It now says twice, and names the idiom, because
"be careful with secrets" is not a thing a future session can act on and "this
expansion prints the value" is.

Neither token could be rotated from here. `POST /api/command/read-token/rotate` answers
`403 {"error":"This action requires the browser session. An agent credential cannot
perform it."}`, which is the right design and worth knowing: a session that leaks the
read token cannot clean up after itself and has to say so loudly. Both rotations are
Tanner's, at a browser. Flagged in the session report, not buried here.

## Still open

- ~~**Rotate both tokens.**~~ CLOSED, not done. Tanner decided the same day that
  neither token is rotated, permanently, and asked to stop being asked. CLAUDE.md
  carries the decision so a later session does not rediscover the leak and raise
  it again.
- **Widen `smoke/encoding-guard.js`.** The gap is measured and the fix is measured. Not
  shipped. Wants a claim, a mutation run naming `expect_failure`, and its own PR.
- **Task 85 needs a live gradebook response** from a session with the admin key that is
  not the rebuilder.
- **Is public visibility intentional?** A decision, not a patch.
- No board task was claimed. There is no board item for "commit the CLAUDE.md
  additions", and a claim needs an id. The lock rule protected nothing here because
  nothing else was touching `CLAUDE.md`, but the absence is worth noting rather than
  glossing.

## What was learned

A file whose job is to stop the next session from rediscovering things is exactly the
file where an unchecked claim does the most damage, because it will be trusted instead
of checked. Three of the four errors in the proposal were confident references to
things that do not exist. The one that took work to find, the mojibake rule, was wrong
in the direction that is hardest to catch: it read as more rigorous than what it
replaced, and it was written by someone who had just corrected the same paragraph once
and therefore had reason to feel done.

---

## Postscript: the merge, and three collisions

PR #480 merged as `f3226c6`. Production reported `fc19ce1` before and `f3226c6`
after, which is an assertion that was false beforehand, so the deploy is
confirmed rather than assumed. `status: ok`, `integrity.ok: true`.

Two claims in this note were wrong when written, and then most of the work that
followed was done twice.

**The exercise-design section was wrong.** It said bigger exercises need the
sandbox, that Judge0 therefore closes the area, and that a second PII exception
was in the way. `docs/exercise-design-proposal.md`, authored hours earlier and
landed via PR #478, establishes the opposite on each count. Rewritten as a fork
of SHAPE rather than a blocker.

**The mojibake work was done three times over, by three sessions, on the same
afternoon.** Recording the sequence because the pattern matters more than any of
the fixes:

    this session   measured the gap in smoke/encoding-guard.js, built a fix
    PR #482, #486  had already landed lib/mojibake.js, a rederive, a Python
                   port, a parity suite, a deploy gate, and repair of 65 real
                   corrupted characters in CED-UNIT1-EXTRACT.txt
    this session   discarded its detector work, kept the one caller #482 missed
    PR #484        had already fixed that caller too, and merged first

So this session shipped almost nothing of what it spent the afternoon on, and
the discarding was correct both times. Its widened lead set would have
reintroduced a false positive #482 had already solved: an isolated exotic lead
is real text, because the Finnish sort label "Aakkosjarjestyksessa O-A" is a
capital O-diaeresis followed by an en dash, bytes D6 96, valid UTF-8 for a
Hebrew combining accent. Arithmetically perfect, completely wrong.

**The root cause is not the duplicated reasoning, it is that nothing was
claimed.** Rule 2 of this file exists for exactly this and says so: claim before
you touch a file, locks are `(repo, file)` pairs, a conflict is a 409 naming the
holder. There was no board task for "land the CLAUDE.md additions", so no claim
was made, so three sessions rediscovered the same bug in parallel and two of
them wrote the same module. A claim on `api:smoke/encoding-guard.js` would have
returned a 409 and saved most of an afternoon.

The lesson is narrower than "read before writing", which this note already says
twice. It is that a session doing work with no board item should CREATE one and
claim it, rather than treating the claim step as inapplicable because the work
arrived from somewhere other than the board.

## What actually shipped from this branch

Two conventions, which is all that was left once `main` had the rest.

**Content from the Claude chat project is a proposal, not a source**, because
that surface does not have the repo and states a recollection as confidently as
a reading. Three of the four errors corrected earlier in this note are that
shape, and it cuts the same way against a session's own output, twice today.

**Nothing shipped may read as machine-written.** An acceptance criterion that was
written down nowhere, alongside "as long as it does not come up as an error". The
em-dash rule was one instance of it, not the whole. The tells are listed under
Conventions and the test is reading it aloud.

Plus one two-line deletion: `scripts/matrixify-preflight.js` still declared the
old three-pair signature list after PR #484 moved it onto `lib/mojibake.js`.
Unused, but it is exactly the thing a future session would copy, and the rule
directly above it now says never to.

## Still open

- ~~Rotate the two tokens.~~ CLOSED, not done: Tanner decided on 2026-09-03 that
  neither token is being rotated, permanently. Recorded in CLAUDE.md so no fifth
  session raises it. The rule against printing a token matters more now, not
  less, because a leaked value stays valid.
- Task 85 needs a live gradebook response from a session with the admin key.
- Teacher visibility into sandbox work, and whether public visibility is
  intentional. Both are decisions.
