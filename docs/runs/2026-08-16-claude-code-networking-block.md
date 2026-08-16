# 2026-08-16 - AP Networking, composed from the other courses

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
