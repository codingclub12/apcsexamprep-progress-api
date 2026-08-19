# AP Networking: the hands-on work and the collaborative task

Companion to `docs/ap-networking-full-year-readiness.md`, which measured the gap.
This is the build order for closing it.

The readiness audit found the course is not short of pages. It is short of things
students do. Sub-skills ending `.C` ("implement and document") and `.D` ("verify")
are 13 of the framework's 55 skill assignments, or 24%, and appear in 10 of the 22
topics,
and the course answered them with four browser labs worth 32 of 448 points, or 7%.
Skill category 4, Collaborate, is required in topics 1.4 and 2.4 and had no asset
at all.

The machine-readable version of everything below is `config/networking-hands-on.json`.
`npm run smoke:nethandson` checks that every framework code cited here exists,
that the coverage matches what the framework actually demands, and that the
arithmetic in the design section is the arithmetic of the items.

## The design rule

Weight the gradebook the way the framework weights its verbs.

Not "add more labs", which has no stopping condition. The framework's own
distribution is the target:

| | framework demand | before | after |
|---|---:|---:|---:|
| implement and verify (`.C` + `.D`) | 23.6% | 7.1% | 23.6% |
| collaborate (category 4) | 5% | 0% | 4.2% |
| total course points | | 448 | 576 |

That is 10 configuration activities at 8 points, 4 unit documentation records at
6, and one team task at 24. The smoke suite asserts the hands-on share lands
within five points of the framework share, so this cannot quietly drift back.

## The constraint that shapes every activity

The framework verb is "implement **and document**". Documentation is free text,
and this API never stores free text from a student. So each activity is cut in
two along that seam:

- **implement** goes in a structured widget, graded in the browser, POSTed to
  `/api/progress/attempt` with `detail` of `[{q,sel,ok}]` and nothing else.
- **document** is a student artefact a teacher reads and scores through
  `POST /api/teacher/classes/:code/scores`.

That route already exists, already validates the item against `course_manifest`,
already replaces rather than stacks, and already refuses `visit` items. **No new
write surface is needed for any of this.** What is needed is manifest rows and
pages.

One activity will be got wrong if this is not said plainly. **4.3 is a terminal
emulator, and a terminal collects typed strings.** Typed strings are free text.
Grade every check client-side and report the check index and its boolean. The
command line the student typed must never leave the page.

## The collaborative task: the household network build

One task, three students, scheduled after topic 2.4. It carries all four
category-4 sub-skills rather than splitting them across four thin activities.

Worth noting: only `4.A` and `4.B` are named in any topic's Suggested Skills rail,
and only in 1.4 and 2.4. But 2.4's own objective is "evaluate an AI-generated
network design", which is `4.C` in all but name, and no team task is real without
`4.D`.

### The roles are the framework's own skill categories

That is the whole trick. A student holding the Security role is doing skill
category 2 for a week, and rotating the roles on a second run is how every
student reaches every category.

| Role | Skill category | Owns |
|---|---|---|
| Connectivity lead | 1 Connect and Configure | Device inventory, addressing plan, DHCP pool and static reservations, the media server host and its static address (EK 2.4.B.2, 2.4.B.5) |
| Security lead | 2 Secure | Password and lockout policy stated as rules (EK 1.4.A.1, 1.4.A.3), replacing every default credential (EK 1.4.B.5), wireless SSID and encryption with the rejected option named (EK 1.4.C.2, 1.4.C.3), media server access control (EK 2.4.B.3) |
| Verification lead | 3 Troubleshoot | A test per control **written before the control is applied**, the results with evidence, the availability cost, and connecting from a second device to prove the media server works (EK 2.4.B.6) |

The Verification lead's hardest deliverable is the one that matters most: **name
one thing that legitimately stopped working, and say whether that cost is worth
paying.** That is the entirety of sub-skill `2.D`, which asks students to verify a
control "mitigates the intended vulnerability *while maintaining access and
availability*". A security control with no cost has almost certainly not been
applied.

### The AI step

EK 2.4.A.2 says AI suggestions "may include unrealistic device recommendations,
overcomplicated setups, and incorrect configurations". A team that only reads
that sentence has not done `4.C`.

1. Each member independently asks an AI tool for a design meeting the brief, and keeps the response.
2. The team compares the three and marks every point where they disagree.
3. For each disagreement, decide which is right and record how you checked, citing the course pages rather than a fourth AI answer.
4. Name at least two specific defects and give the correct configuration instead.

The AI output is raw material to be criticised, not the deliverable. A team that
submits an unedited AI design has demonstrated the exact failure mode 2.4.A.2
describes.

### Rubric, 24 points

Four criteria at 6 each, deliberately weighted so **a strong technical build with
no team structure cannot score full marks**: category 4 is the thing being
assessed.

| Criterion | Sub-skills | Full marks |
|---|---|---|
| Shared objective and roles | 4.A, 4.B | The objective is specific enough to fail against, was written before the build, and every deliverable traces to a named role |
| Configuration quality | 1.C, 2.C | Addressing plan internally consistent, every default credential replaced, strongest encryption the scenario's devices support, media server reachable by hostname or static address |
| Verification and the availability cost | 2.D | Tests written before the controls were applied, every control has a result, and the team names something that legitimately broke and argues about the cost |
| AI critique | 4.C | Two or more specific defects named, each with the correct configuration and how the team established it |

### Solo students

A solo (ME-) student has no team. The task still runs with the three roles held
in sequence, which exercises `4.A`, `4.B` and `4.C` but not `4.D`. Say that in the
student-facing copy rather than pretending otherwise: `4.D` is "complete assigned
work to accomplish a collaborative networking task", and there is no honest solo
substitute for it.

## The 10 per-topic configuration activities

Each is 8 points, 8 auto-graded checks, one per topic that carries a `.C` or `.D`
sub-skill. Full check lists and EK anchors are in `config/networking-hands-on.json`.

| Topic | Activity | Sub-skills | The check that carries it |
|---|---|---|---|
| 1.4 | Harden an account and a wireless network | 2.C, 2.D | After applying the settings, pick which listed outcome is the access that legitimately broke. The correct answer is a cost, not a success. |
| 2.2 | Document an existing network | 1.C | Identify the APIPA address and say what its presence means about DHCP. Reading an address as evidence. |
| 2.4 | Configure a media server, audit an AI design | 1.B, 1.C | Three planted defects, one of each kind EK 2.4.A.2 names, so the taxonomy is assessed and not just carefulness. |
| 2.6 | Group devices into segments | 2.A, 2.C | Find the single misplacement that breaks isolation in someone else's plan. |
| 3.3 | Configure a LAN and verify it | 1.C, 1.D | Two verify checks of the same shape: the proof of a security control is the thing that must **not** work. |
| 3.4 | Subnet a network to fit its groups | 2.B, 2.C | Choose the *smallest* subnet that fits, not merely one that fits. A /24 fits everything. |
| 3.5 | Build an ordered firewall rule set | 2.B, 2.C | Rule ordering is graded, because EK 3.5.C.4 says reordering changes which traffic is permitted. Shadowing is the commonest real firewall defect and cannot be assessed without ordering. |
| 4.3 | Navigate and transfer files from a CLI | 1.C, 1.D | Confirm the transfer landed by listing the destination. "No error" is the commonest false proof a student accepts. |
| 4.4 | Trace the path data takes | 1.A, 1.C | Say which of three explanations the output does **not** support. A traceroute tells you where a path stopped, not why. |
| 4.5 | Configure VLANs and read the logs | 2.B, 2.C | Separate the intrusion indicators from the performance indicators. A log reader who treats every anomaly as an attack is not doing 4.5.C. |

Subnetting (3.4) deserves a note: it is the most objectively auto-gradable work in
the entire course. Every answer is a number that is right or wrong, no rubric
required.

## The four documentation records

One per unit, teacher-scored, 6 points each. `doc-1` collects 1.4; `doc-2`
collects 2.2, 2.4 and 2.6; `doc-3` collects 3.3, 3.4 and 3.5; `doc-4` collects
4.3, 4.4 and 4.5.

Per unit and not per topic because ten teacher-scored items is 300 hand entries
for a class of thirty, which is a feature nobody uses. Four is one a teacher will
actually complete, and the documentation half of the `.C` verb is assessed either
way.

## What is not decided here

**The team project runs against a prior judgment.** `INTRO_JAVA_PROJECTS` in
`scripts/seed-manifest.js` is deliberately empty because Tanner decided on
2026-08-18 that projects are not worth grading into the gradebook. This proposes a
graded team project anyway. The difference is not a reversal: intro-java answers to
nobody, while AP Networking has to evidence skill category 4 to carry the Advanced
Placement label, and a task scored outside the gradebook leaves category 4 with no
evidence in the system of record. That is the trade, and it is a teaching call.

**The four existing unit labs are seeded as `item_type: 'quiz'`, not `'lab'`.**
So the canonical `lab` bucket is currently empty for this course, and lab points
are indistinguishable from quiz points in any rollup. The new activities are typed
`lab` from birth. Retyping `lab-1` through `lab-4` is the right end state but it is
a data change, not a content change: existing `attempts` rows carry their own
`item_type` snapshot, so retyping would split historical and new attempts across
two gradebook cells. Left alone deliberately, and flagged rather than bundled into
a content pass.

**Nothing is seeded.** `NET_HANDS_ON_LIVE` is `false` in `scripts/seed-manifest.js`,
on the `INTRO_JAVA_PAGES_LIVE` precedent. A denominator for a page nobody can open
marks every student down for work that does not exist, which is what
`smoke/manifest-prune.js` exists to prevent. Flip it in the pass that ships the
pages.

**The pages themselves.** Every activity above lands in a Shopify page body via
Matrixify, which this repo's `CLAUDE.md` puts explicitly out of scope. This
document is the build order and the gradebook is ready for it; the authoring is
not this repo's to do.

## A correction to the framework data

While anchoring these activities I found that 6 of the 60 Learning Objectives in
`config/networking-framework-statements.json` were stored with their text repeated
two or three times. The framework PDF paints every line of that column twice, once
plain and once with `\x08` between the words (a shadow text layer), and the first
extraction kept both copies for those six: 2.2.B, 3.4.B, 3.4.C, 3.5.C, 3.6.B and
4.3.A.

Repaired. Each repair was checked to be a subsequence of the damaged text, so it
collapses duplication and cannot introduce a word the extraction did not have. The
284 EK statements were unaffected, and the counts are unchanged. A re-extraction
should drop any line equal to the previous line once `\x08` is stripped, which
fixes the class of defect at source rather than these six instances.

One further statement, 3.5.A.1, is damaged in a way no rule recovers (its words
are interleaved, not merely duplicated). It is now flagged in
`word_order_disturbed` rather than guessed at.
