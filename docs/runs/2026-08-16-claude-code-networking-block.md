# 2026-08-16 - AP Networking, read off the shipped configuration

Agent: Claude Code. Branch: `claude/networking-rules-vaw0hu`, off `main`.

## What was asked, and what that can honestly mean

"Match networking rules to the best combo of the others."

The other four blocks contain two different kinds of rule, and only one kind can
be transferred without knowing AP Networking's curriculum:

**Curriculum** - source-of-truth filenames, unit counts, lesson titles, notation
conventions. Course-specific by definition. Unknowable to me, and the brief is
explicit that inventing them is worse than an empty block, because a wrong lesson
title is then injected verbatim into every future prompt.

**Production and posture** - how Tanner's courses are made and what the product
may never do. Speaker notes in student-addressed voice, single-sourced for both
the teacher bundle and the video narration. Teacher Bundle decks free of
prescriptive teacher instructions. Answer keys server-side. Never store student
free text. Never import another course's unit numbering. These hold for AP
Networking because they hold for every course in the product.

So the block is the second kind, in full, with the first kind explicitly absent
and saying so in its opening line.

## What it does now

`surface: content, course: networking` was compiling a whole-task STOP with no
rules in it. It now compiles a real block that:

- opens with THE CURRICULUM SPECIFICS ARE NOT RECORDED HERE YET, forbids
  authoring or renumbering lesson content, and forbids inferring the missing half
  from AP Cybersecurity or from general networking knowledge
- carries the cross-course production rules and the zero-PII posture, which apply
  to any networking work done meanwhile

The stop is narrower than before and the useful rules now land. Previously a
networking task got a stop and nothing else; a session that pressed on anyway had
no guardrails at all.

## Deliberately not written

**No source-of-truth filename.** AP Networking is the sibling pilot to AP
Cybersecurity, so `ap-networking-course-and-exam-description.pdf` is the obvious
guess by analogy with the cyber block. It is not in the block, and an assertion
now fails the suite if anyone puts a filename there while the curriculum row is
still flagged for review. A plausible-looking document name is worse than an
admitted gap: an agent will cite it and nobody checks whether it exists.

Confirm or correct these and they go straight in:

1. The source-of-truth document, and any superseded document that must never be cited.
2. Unit structure and lesson titles, particularly the ones that get gotten wrong.
3. Notation and terminology conventions.
4. Anything that has already bitten in production.

## Evidence

```
npm run smoke:hazards    140 passed, 0 failed   (was 134)
npm run smoke:command     58 passed, 0 failed
npm run smoke:checks      25 passed, 0 failed
npm run smoke:dispatch    31 passed, 0 failed
```

Two existing assertions broke on purpose and were rewritten to defend the same
property rather than to pass:

- **4.2** asserted `contentCoverageFor('networking') === 'pending'`. The property
  it defended was "networking is shipped, so it must not be exempt, and an
  unguarded task must stop". It now asserts not-exempt, plus that the block still
  stops lesson authoring, plus that it names no source document, plus that each
  transferred rule is present. Eight assertions where there was one.
- **5.2** exercised the `pending` machinery *through* networking. Networking is no
  longer pending, and no course is today, so that assertion would have quietly
  stopped testing anything. It now tests `pendingBlock()` directly, so the
  mechanism stays covered for whichever course is uncovered next.

That second one is the more useful lesson: a test bound to whichever example
happens to be in a state today stops testing the moment that example moves.


---

# Addendum: most of it was already in the repo

"Can you find those?" - largely yes, and not by inference. AP Networking is
SHIPPED, so its structure exists as DATA in this repo even though nobody had
written it down as rules. The block no longer composes anything from the other
courses' shapes; it quotes the configuration that actually drives the product.

## Found, with sources

| Fact | Source |
|---|---|
| 4 units, 22 topics, and the four unit titles | `COURSES` in `utils.js` |
| Activities are `lesson`/`cfu`/`quiz` only, no `gap`, no `code` | same |
| One cfu per topic, item id ends `-cfu-2` not `-cfu-1` | `scripts/seed-manifest.js` |
| Topic quiz worth 8, uniform across all 22 | same, verified row by row |
| Unit tests `{n}-test`, lesson_id `test-{n}`, 16 for Unit 1 and 24 for Units 2-4 | same |
| Four browser labs `lab-1`..`lab-4`, 8 checkpoints each | same |
| Exams: midterm 40, practice-pilot 40, final 50 | same |
| MC is the only auto-graded section; free response scored offline | same |
| Authored content lives in the COURSE REPO: `labs/labs.yaml`, `exams/blueprints.yaml` | same |
| Teacher bundle SKU `APNET-TEACHER-BUNDLE`, Units 1-4 | `config/shopify-skus.js` |

## The two hazards that were sitting in comments

Both are the "silent failure" shape, and neither was in any rulebook:

**lesson_id is a contract, not a label.** `POST /api/progress/attempt` 400s a
submission whose lesson_id disagrees with its manifest row. For labs and exams
lesson_id EQUALS item_id, which is why the widget derives one from the other.
Change one side and every lab grade is silently dropped: rejected submission,
nothing shown to the student, empty cell.

**Never add an ungraded thing to the manifest.** The baseline diagnostic is
deliberately absent - week 1, before instruction, not graded for marks - because
seeding it would put 20 unearnable points into every denominator on every
dashboard. And visit denominators list all 22 topics on purpose, including
unshipped ones, so they cannot move under students who already started.

## Still not found, still not guessed

Terminology and notation conventions, which titles get gotten wrong in practice,
and whether a College Board document governs this course the way a CED governs
CSA and CSP. The block says so explicitly and forbids importing AP
Cybersecurity's structure to fill the gap. Assertion 4.2c still fails the suite
if anyone writes a source-document filename while that stays true.

## The guard that keeps the quote honest

Quoting shipped config is only worth something while the quote stays true. Six
new assertions read `utils.js` as text and check the block agrees on the unit
count, the topic count, and each of the four unit titles. Renaming Unit 3 in
`utils.js` and leaving the block alone:

```
[FAIL] 4.2k the block carries the shipped title: Managing Multiple Connections
148 passed, 1 failed
```

Restored: 149 passed, 0 failed. Without that, a rename would leave the compiled
prompt telling every future agent a unit title that no longer exists.

Two assertions I wrote earlier today failed on this rewrite because their wording
changed, and were updated to defend the property rather than the old string. That
is the third time in two days a test bound to a specific phrasing has needed
rewording; the drift guard above is bound to the DATA instead, which is why it is
the more durable of the two.

`smoke:hazards` 149 passed (was 140). All 57 offline suites pass.
