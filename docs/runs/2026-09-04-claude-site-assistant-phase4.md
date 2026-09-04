# 2026-09-04, Claude Code: site assistant Phase 4, students

Branch `claude/assistant-design-feedback-n3w29v`, restarted from `main` after
#535 merged. Phases 0 through 3 are live and verified in production.

## What changed

Student chat on the student's own progress page: three typed reads that cannot
carry a mark, shape-only storage on every branch, a deletion path, and a second
mode in the widget. Full write-up in `docs/site-assistant-phase4.md`.

Off by default. `ASSISTANT_STUDENT_ENABLED` unset means a student token is
refused exactly as it was in Phases 2 and 3.

## Evidence

- `smoke:assistantstudent` 94 passed, 0 failed
- `smoke:assistantexfil` 159, `smoke:assistantanon` 100, `smoke:assistantdiag` 61,
  `smoke:assistantreport` 92, `smoke:assistantkb` 47, all green after the
  pre-filter change

## The finding worth carrying forward

**The pre-filter had a hole shaped like a fourteen year old.**

Every rule in it was written while thinking about a teacher typing. A teacher
asks "what is the correct answer for 1.1 question 3", and there were four
separate patterns catching that phrasing. A student asks "is the answer B", and
nothing matched.

Four words, straight past a filter that looked complete, on the one surface where
the person asking is a minor sitting in front of a quiz.

It was found by the student suite rather than by review, and the reason is worth
stating: the filter WAS complete, for the population it had been imagined
against. Re-reading it would not have helped, because re-reading checks whether
the code does what the author meant. What found it was writing down how the new
audience actually talks and running that list.

Three rules added. The lookahead is the fiddly part: a bare `[A-E]` matches the
article "a", so "is the answer a good one" would have fired without it. Fourteen
probes in both directions.

## Two things the spec asked for that could not be done as written

**`getMyProgress` with a gated score.** The spec's shape has no score field, and
the obvious implementation adds one and gates it on `key_releases`. That is worse
in both directions: it makes the return type able to carry a number that every
future edit then has to withhold correctly, and it puts the assistant in the
business of deciding what a student may see about their own marks, which is the
dashboard's job. Built with no score field at all, so the assistant can say "you
passed 1.2" and can never say a number because it was never handed one.

**Deletion "wired into the same path that deletes a student".** There is no such
path: CLAUDE.md says students are deactivated, never hard-deleted, because
attempt history is gradebook data. `store.deleteForStudent` is built and tested
with no caller, which is the honest version. The day somebody needs to erase a
student must not be the day anyone discovers a year of chat rows keyed to them
was never considered.

## A live gap this phase closed by accident

`/pages/my-progress` classified as `general`, and `general` retains message
bodies for an anonymous caller. An unauthenticated caller on the student progress
page is almost certainly a signed-out student, which is the exact case spec
section 8 says to downgrade.

That had been true since Phase 3 shipped. Naming the scope fixes it by
construction; the suite now asserts
`retainsBodies('anonymous', 'student_portal') === false`.

## A test bug worth recording

The first draft seeded a mark of 73 out of 91 as the sentinel, and the endpoint
assertion went red: "73" appears inside a random hex session id roughly half the
time.

A two digit sentinel is not a sentinel. It collides with ids, timestamps and
token counts, and a leak test that cries wolf gets its assertion deleted rather
than investigated, which is worse than not having written it. Four digits now,
chosen to keep the same 80.2 percent ratio so the threshold recomputation test
still works.

## Still open

- **The widget is not on the page.** `apcs-chat.js` has student mode;
  `shopify/my-progress.html` does not carry the tag. That is a Shopify page
  change and ships as its own reviewable step, not folded into this one.
- **`ASSISTANT_ALERT_EMAIL` is still unset**, unchanged since Phase 0. Three
  roles can now raise `key_leak_blocked` at `immediate` and the mail step still
  returns `no_recipient`.
- **The 13 KB article bodies are still drafts.**
- **No operator view** on `chat_sessions`. Three roles write to it now and
  nobody can read it, and spec section 3's fourth job, "the no good answer bucket
  is the content roadmap", is unreachable until somebody can.
- **The 90 day body sweep** is still not built. Student rows have no bodies, so
  it remains a teacher and anonymous concern.
