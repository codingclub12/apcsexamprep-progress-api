# 2026-08-19 - AP Networking: the collaborative task and the per-topic configuration work

Follow-on to the same day's full-year readiness audit, which measured the gap.
This pass closes it on the repo side.

## What was asked

"Give me the collaborative task plus per topic configuration work."

## What shipped

| File | What it is |
|---|---|
| `config/networking-hands-on.json` | The authored spec: 10 configuration activities, 4 unit documentation records, 1 team task. Every activity carries its framework sub-skills, learning objectives, EK anchors, 8 auto-graded checks, and which half is teacher-scored. |
| `docs/ap-networking-hands-on-spec.md` | The readable version, with the rubric and the role structure. |
| `scripts/seed-manifest.js` | `NET_CONFIG_LABS`, `NET_UNIT_DOCS`, `NET_TEAM_PROJECT` behind `NET_HANDS_ON_LIVE = false`. |
| `lib/gradebook-contract.js` | `project` added to `ACTIVITY_MAP` as a deliberate extension. |
| `smoke/networking-hands-on.js` | 24 checks. Registered as `smoke:nethandson`, picked up by CI automatically. |
| `scripts/networking-skill-coverage.js` | Now reports the proposed delta and labels it PROPOSED or LIVE. |
| `config/networking-framework-statements.json` | 6 learning objectives repaired. See below. |

## The finding that changed the shape of the work

**The write surface already exists.** `POST /api/teacher/classes/:code/scores`
(`routes/teacher.js:1376`) takes teacher-entered scores, validates the item
against `course_manifest`, rejects `visit` items, replaces rather than stacks, and
writes the whole class in one transaction.

That matters because the framework verb is "implement **and document**", and
documentation is free text, which this API never stores from a student. Before
finding that route the obvious conclusion was that collaborative and documentation
work could not be held in the gradebook at all without new API surface. It can.
What is missing is manifest rows and pages, not endpoints.

So every activity is cut along that seam: **implement** goes in a structured
browser widget reporting `[{q,sel,ok}]`, **document** is teacher-scored through the
existing route.

## Design rule

Weight the gradebook the way the framework weights its verbs, rather than "add
more labs", which has no stopping condition.

```
                    framework    before    after
implement + verify     23.6%       7.1%    23.6%
collaborate             5.5%         0%     4.2%
total points                        448      576
```

The smoke suite asserts the hands-on share stays within five points of the
framework share, so this cannot drift back silently.

## Evidence

```
$ npm run smoke:nethandson
  24 passed, 0 failed

$ full offline suite, derived the way tests.yml derives it
  ALL 75 OFFLINE SUITES PASS
```

The suite was negative-tested rather than trusted: a typo'd EK anchor
(`1.4.A.9`) and a points change on one activity were each injected, and the suite
went red on the right checks both times (`23 passed, 1 failed` and
`21 passed, 3 failed`, the latter correctly catching the spec/manifest divergence
as well as the arithmetic). Restored to green afterwards.

## A correction to what PR #219 shipped

6 of the 60 Learning Objectives in `config/networking-framework-statements.json`
were stored with their text repeated two or three times: 2.2.B, 3.4.B, 3.4.C,
3.5.C, 3.6.B, 4.3.A.

Cause: the framework PDF paints every line of that column twice, once plain and
once with `\x08` between the words, a shadow text layer. The extractor kept both
copies for those six. Confirmed by reading the raw extraction around each one
rather than inferred.

Repaired. Each repair is asserted to be a subsequence of the damaged text, so it
can only collapse duplication and can never introduce a word the extraction did
not have. The 284 EK statements were unaffected; counts unchanged at 284 and 60.
A re-extraction should drop any line equal to the previous line once `\x08` is
stripped, which fixes the class of defect rather than these six instances. The
smoke suite now fails if any objective repeats itself.

One further statement, 3.5.A.1, is damaged in a way no rule recovers (words
interleaved, not duplicated). Flagged in `word_order_disturbed` rather than
guessed at.

## Still open, and deliberately not done

- **Nothing is seeded.** `NET_HANDS_ON_LIVE` is `false`. Flip it in the pass that
  ships the pages; a denominator for a page nobody can open marks every student
  down for work that does not exist.
- **The pages.** Every activity lands in a Shopify page body via Matrixify, which
  `CLAUDE.md` puts out of scope for this repo.
- **The 4 existing unit labs are seeded as `item_type: 'quiz'`, not `'lab'`.** So
  the canonical `lab` bucket is empty for this course and lab points are
  indistinguishable from quiz points in a rollup. The new activities are typed
  `lab` from birth. Retyping `lab-1`..`lab-4` is the right end state but it is a
  data change: existing `attempts` rows carry their own `item_type` snapshot, so
  retyping would split historical and new attempts across two gradebook cells.
  Flagged, not bundled into a content pass.
- **The team project runs against a prior judgment.** `INTRO_JAVA_PROJECTS` is
  deliberately empty because Tanner decided on 2026-08-18 that projects are not
  worth grading into the gradebook. The distinction claimed here is that AP
  Networking has to evidence skill category 4 to carry the AP label while
  intro-java answers to nobody. That is a teaching call, not mine, and it is
  written into the spec where it will be seen rather than left in a commit
  message.

## Learned

A passing smoke suite is worth nothing until it has been made to fail. The
points-drift injection caught a check I had not intended to write: the
spec-versus-manifest comparison went red too, which is the check that will
actually matter the day someone edits one and not the other.
