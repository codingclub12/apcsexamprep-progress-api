# Site assistant Phase 4: students

Built 2026-09-04. Spec: `docs/site-assistant-spec.md` sections 3.5, 5, 7, 8 and
phase 4 of section 14. Phases 0 through 3 are live.

## What shipped

```
POST /api/assistant/chat     now accepts students, behind ASSISTANT_STUDENT_ENABLED
GET  /apcs-chat.js           gains a second mode: the student help desk
```

| file | what it gained |
|---|---|
| `lib/assistant/scope.js` | the `student_portal` scope |
| `lib/assistant/reads.js` | `getMyProgress`, `getMyGates`, `getMyScoreVisibility` |
| `lib/assistant/store.js` | `deleteForStudent` |
| `lib/assistant/chat.js` | `respondStudent` |
| `lib/assistant/prefilter.js` | three rules for how a student actually phrases it |
| `public/apcs-chat.js` | student mode, signed in, no challenge |

`smoke/assistant-student.js`, 94 assertions. Off by default: with
`ASSISTANT_STUDENT_ENABLED` unset a student token is refused exactly as it was
in Phases 2 and 3.

## Where student chat lives, since the spec does not say

Section 3.5 gives lesson and lab pages the report affordance **only** and
assessment pages **nothing at all**. That rules out every coursework page. The
three tools section 5 gives a student, their gates, their progress, and whether
a score recorded, are dashboard questions.

So student chat lives on `/pages/my-progress` and nowhere else. That is the
`student_portal` scope, and every other scope refuses before anything else
happens.

A chat box next to a quiz is the single thing this design exists to avoid. It is
not on the lesson page, it is not on the lab page, and on an assessment page
there is not even a script tag.

## The privacy guarantee, and where it is actually tested

**No message body is stored on any path.** Not by policy, by construction:
`scope.retainsBodies` returns false for role `student` on every scope, so
`store.addMessage` writes NULL into `content` whatever it is handed.

The suite asserts that on **every branch a student message can take**, including
the ones nobody thinks about:

```
answered by the model      no body
off-scope refusal          no body
pre-filter refusal         no body
provider failure           no body
model unconfigured         no body
session cap reached        no body
output tripwire blocked    no body
```

Plus the blanket version: zero rows in the whole database where a student
session has a non-null `content`. A privacy guarantee that holds on the happy
path and leaks on the error path is not a guarantee, and the error paths are the
ones that get added later without thinking.

What is kept is the shape: a hash, a classification, a flagged reason, token
counts. That is everything the taxonomy needs and none of what carries the risk.

## getMyProgress has no field a score could occupy

The spec's shape is `{lesson, item_type, attempted, passed}`. There is no score
field, and that is not an oversight in the spec or here.

The obvious implementation returns the score and gates it on `key_releases`.
That is worse in both directions. It makes the return type able to carry a number
that then has to be correctly withheld on every future edit, which is the class
of guarantee this whole module exists to avoid. And it puts the assistant in the
business of deciding what a student may see about their own marks, which is the
dashboard's job and the teacher's setting.

So the assistant can say "you have attempted 1.2 and passed it" and can never say
a number, because it was never handed one. A student who wants their score has it
on the same page, rendered by the route that owns that decision.

`passed` is recomputed at read time against the class's **current** mastery
threshold, the same rule the gradebook follows. The suite proves it: the seeded
attempt is 80.2 percent, it passes at a threshold of 80, and raising the class to
85 flips it to failed with no migration and no second write.

## The pre-filter had a hole shaped like a fourteen year old

Every rule in the pre-filter was written while thinking about a teacher typing.
A teacher asks *"what is the correct answer for 1.1 question 3"*, and there were
four separate patterns catching that.

A student asks **"is the answer B"**. Four words, straight through.

Found by the student suite, not by review, and it is the most useful thing this
phase produced: the filter looked complete because it was complete for the
population it had been imagined against. Three rules added, with a lookahead
that keeps `is the answer B` while dropping `is the answer a good one`, since a
bare `[A-E]` otherwise matches the article "a".

## deleteForStudent exists and has no caller

Spec section 8: *"`DELETE FROM chat_sessions WHERE user_ref = ?`, wired into the
same path that deletes a student."*

**There is no such path.** CLAUDE.md says students are deactivated, never
hard-deleted, because attempt history is gradebook data and always survives. So
the function is built and tested, and nothing calls it.

Building it anyway is the point. The day somebody does need to erase a student,
at a parent's request or a district's, that must not be the moment anyone
discovers a year of chat rows keyed to them was never considered. The suite also
asserts the other half: erasing the chat rows leaves the `attempts` rows alone,
because those are the gradebook.

## One scope fix that was a live gap

`/pages/my-progress` used to classify as `general`, and `general` retains bodies
for an anonymous caller. An unauthenticated caller on the student progress page
is almost certainly a **signed-out student**, which is the exact case spec
section 8 says to downgrade.

Naming the scope fixes it by construction rather than by remembering. The suite
asserts `retainsBodies('anonymous', 'student_portal') === false`.

## Environment

```
ASSISTANT_STUDENT_ENABLED   off   off means a student token is refused
```

Three separate switches now, one per audience, rather than one master. The three
populations carry different risk and whoever turns one on should have to say
which one they mean.

## What is not built

- **The widget is not on the page yet.** `apcs-chat.js` has student mode, but
  `shopify/my-progress.html` does not carry the script tag. That is a Shopify
  page change and ships as its own reviewable step through
  `scripts/publish-student-pages.js`, not folded into this one.
- **`/api/assistant/sessions` and the digest.** The operator log now has rows
  from three roles and still has no view. This is the phase after which that
  starts to matter: the "no good answer" bucket is the content roadmap and
  nobody can read it.
- **The 90 day body sweep.** Student rows have no bodies to sweep, so the
  retention pass is still only about teacher and anonymous rows.
