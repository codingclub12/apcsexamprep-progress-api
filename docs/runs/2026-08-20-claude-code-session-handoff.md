# Session handoff: CSA exercise-content work, mid-thread

2026-08-20, Claude Code. Written because this session's network egress is
stuck on the environment's OLD policy even though the environment itself was
switched to full internet access mid-session; a fresh session should pick up
the new policy cleanly. Read this first if you are that fresh session, or if
you are Tanner reading this cold days later.

## What is already durable (committed, nothing to redo)

- `docs/csa-exercise-pages.md`: the 53 CSA exercise pages, what is live, the
  three submission modes. Carries a new pointer to the Unit 4 warning below.
- `docs/csa-codehs-exercise-reference.md`: per-lesson exercise counts and
  titles pulled from Tanner's own CodeHS Cortado course export (titles and
  counts only, no CodeHS problem content, see that doc's own explanation of
  why). Units 1-3 confirmed as exact, verbatim matches against the actual
  2025-2026 CED text. **Unit 4 confirmed misaligned with the real CED at six
  lessons: 4.6, 4.7, 4.13, 4.14, 4.15, 4.17.** The exercises already authored
  in `seed/csa-exercises/unit4.js` for those six are built around the wrong
  topic for that lesson number, not just mistitled. Full detail, including
  the exact CED-correct topic for each, is in that doc and in
  `docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md`.
- The CSA go-live runbook saga (deploy stall, drift check fix, Unit 1 live
  and verified) is fully resolved and closed; see
  `docs/runs/2026-08-18-claude-code-csa-exercise-golive.md` if that history
  is ever needed, but there is nothing open there.

## What is NOT durable and will not carry over to a fresh session

- The per-lesson exercise-count mapping spreadsheet
  (`csa-exercise-map-2025-2026.xlsx`), sent directly to Tanner via file
  delivery, never committed to the repo. Tanner has the actual file in his
  own downloads. It has a `suggested_count` heuristic column (independent of
  the CodeHS data) and a `final_count` column Tanner has not yet filled in.
  If a fresh session needs it, ask Tanner to re-upload it rather than trying
  to regenerate it from scratch.
- The original CodeHS `.imscc` course export Tanner uploaded, and every
  derived scratch file (parsed JSON/CSV of the full 502-activity tree). All
  of it lived under this session's `/tmp` scratchpad. The useful output was
  already extracted into `docs/csa-codehs-exercise-reference.md`; the raw
  export itself is gone unless Tanner re-uploads it.

## The active thread, in progress when this was written

Tanner is manually pasting CodeHS exercise content into the conversation,
lesson by lesson, so it can be analyzed and used to inform NEW, originally
written exercises for this platform. This is deliberate and was discussed at
length:

- **Guardrail, non-negotiable:** never write CodeHS's problem text verbatim
  into any committed file. Any exercise this repo ships must be an original
  composition, not a paraphrase of CodeHS's specific scenario or wording.
  Titles and topic/depth signal are fine to use directly; problem statements
  are not something to copy from, only to learn from.
- **Guardrail:** no scraping CodeHS with credentials or a new account, even
  if asked. Only Tanner, using his own licensed access, choosing what to
  paste. Already declined the credentialed-scraping and free-account
  approaches once; the reasoning is in the conversation if it comes up again.
- First pasted example was CodeHS's `1.1.6 Exploration: Hello World`
  (Unit 1, already CED-correct, already has a live verified exercise on this
  platform, not urgent). Revealed a real format difference worth carrying
  forward: CodeHS's "Exploration" activities are Predict/Run/Investigate/
  Modify against given code, with a companion reflection text file, not a
  from-scratch write against hidden tests like this platform's exercise-1
  pages. Whether some new exercises should adopt that shape, versus staying
  in the existing `lib/csa-code-modes.js` empty-editor/hidden-test shape, is
  an **open question, not decided**.
- **Scope is also open.** Asked Tanner whether he is working the whole
  course in order or prioritizing the six broken Unit 4 lessons first; he
  said he is just manually posting as he goes rather than committing to an
  order up front. Treat scope as Tanner's call, made lesson by lesson.
- Tanner asked whether screenshots would work better than pasted text for
  this. Answered: text is preferable and worked well for the first example;
  a screenshot is only worth it for an editor pane's exact starter-code
  formatting, not for problem statements.

**Next step, whenever more content is pasted:** analyze topic coverage and
depth against the CED requirement for that lesson, note whether this
platform's existing exercise (if any) already covers it or needs replacing,
and either draft an original exercise or wait for more lessons before
drafting, per Tanner's lead.

## Other open items from earlier in this session, unrelated to CodeHS but still live

- Railway deploy failure notifications are still off. Not urgent (the stall
  that prompted this resolved on its own), but still the one unfinished item
  from that whole episode.
- Exercise pages have no forward navigation: the 15 live CSA Unit 1 lesson
  pages and the Unit 1 hub link nowhere to their own exercise pages. Not
  built. Recommended sequencing this AFTER the exercise-count/topic-fix work
  settles, so nav isn't built twice.
- A Cyber/CSP-style `ucnav` accordion rail was identified as the right
  pattern to port for that navigation gap, once it's time to build it.
  Lives in Shopify page Body HTML, so it ships via Matrixify, outside this
  repo, same as the `data-lesson-id`/`data-item-id` attribute work.
- Student-side "done/locked" indicator for exercises: the `locked` column
  exists on `progress` and is already used for quizzes
  (`GET /api/student/quiz/status`), but the general
  `GET /api/student/progress` feed a lesson page would read does not select
  it. Small, one-line fix when it's time. Explicitly flagged as not urgent.
- Per-lesson exercise count is still Tanner's decision, via the
  `final_count` column on the spreadsheet mentioned above, and it is now
  explicitly sequenced behind the Unit 4 content-accuracy fix rather than
  parallel to it, since counting exercises for lessons teaching the wrong
  topic isn't useful yet.

## Branch and repo conventions, for whoever picks this up

Designated branch for this work is `claude/ap-csa-exercise-pages-kxlel6`.
Every PR from it so far has been merged individually (#207, #209, #217,
#218), so **always restart the branch from `origin/main`
(`git fetch origin main && git checkout -B claude/ap-csa-exercise-pages-kxlel6 origin/main`)
before adding new commits** rather than stacking on old merged history. Docs
only so far; no code changes yet on any of this thread.
