# Site assistant, Phase 0.5: the diagnostic panel

The highest-value thing this system does, and it needs no model.

```
GET /teacher/diagnostics             the panel
GET /api/assistant/diagnostics       teacher auth, the state behind it
```

## Why this before chat

Every question in the top support clusters is answerable by reading state the
teacher already owns. An entitlement that has not appeared, a quiz that is
locked, students who cannot sign in, scores that are missing: each has a
deterministic answer sitting in the database, and none can be answered by an
article or improved by prose.

So the panel cannot hallucinate, because nothing on it is generated. It cannot
leak an answer key, because the read layer has no return field one could occupy.
It stores nothing a student typed. It costs nothing per use.

It also de-risks the chat phases. If these reads are wrong, a panel shows it
plainly; a chat reply hides the same error inside a sentence that sounds fine.

## What it answers, and the ticket each one came from

**"Why is the quiz greyed out when the exercises work?"** The panel says
`teacher-opened` and explains that with that setting exercises and labs stay
open and only quizzes and exams shut. That is the class behaving as configured.
This is the ticket in `docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md`,
where the expensive part was three plausible theories about reporters and
network filtering for a symptom the class setting already explained.

**"I paid and my course is not showing."** Grants are listed with status and
source, and any purchase parked against the teacher's email but not yet claimed
is called out by name. An unclaimed row is itself the answer, and it points at
signing out and back in rather than at a support ticket.

**"My students cannot get in."** Three different problems look identical from
the teacher's side: nobody joined, they joined and never returned, or they are
deactivated. Roster counts separate them in one read.

**"Are their scores landing?"** Totals for the last day, week and all time, plus
when the last one arrived. A class that never recorded anything and a class that
stopped yesterday are different problems.

## The read layer

`lib/assistant/reads.js` is the only module in the assistant tree permitted to
touch the database. The assistant never issues SQL and never receives a row; it
calls named functions whose return shapes have **no field capable of carrying a
question, an option, an explanation or a correct index**. You cannot prompt your
way to a value the return type has no room for.

`quiz_bank.correct_index` and `quiz_bank.explanation` sit in the same SQLite
file every route here opens. This module reads `quiz_bank` for **counts and
locations only**: unit, lesson, activity type, and how many questions exist.
That is the line to keep when adding a function.

| Function | Returns |
| --- | --- |
| `getEntitlementState` | grants, and purchases parked but unclaimed |
| `getGateState` | per activity: open, reason, pool count, explicit row |
| `getClassSettings` | mastery threshold, retries, quiz lock default, active |
| `getRosterHealth` | four counts, no names and no ids |
| `getScoreVisibility` | attempt counts and the last timestamp, never a score |
| `listClasses` | the caller's own classes |

**Ownership** is enforced in one place. Every function takes the caller's id and
every query joins on it. There is no function that takes a class id without also
taking the teacher it must belong to, and a class the caller does not own is
answered identically to one that does not exist, so the endpoint cannot be used
to discover class codes.

**Drift** is prevented by calling `lib/activity-gate.resolveGate`, the same
function the render path and the submit path call. An operator view that
reimplements the rule eventually disagrees with what students get, and disagrees
silently.

## Tests

`npm run smoke:assistantdiag`, 48 assertions, offline and secret-free.

The two that matter most:

- **The panel agrees with the render path.** The gate answers are cross-checked
  against what `routes/quiz.js` actually serves a student, rather than asserted
  separately. A panel that quietly disagrees with the render path is worse than
  no panel.
- **No read can carry an answer key.** `quiz_bank` is seeded with sentinel
  prompts, options and explanations, and every endpoint response and every direct
  call is scanned for them. The suite also asserts the module never names
  `correct_index`, `explanation`, `prompt` or `options`, and never uses
  `SELECT *`, so a column added later "just for context" fails the suite rather
  than shipping.

## What this is not

No model, no chat, no knowledge base, no transcripts. Chat on the teacher portal
is the next phase and sits on top of these same reads, which is the point of
building them first.
