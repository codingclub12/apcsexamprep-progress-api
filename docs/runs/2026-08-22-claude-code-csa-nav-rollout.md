# CSA accordion nav rollout, six Unit 4 lesson pages fixed, twelve exercise pages published

2026-08-22, Claude Code. Continuation of the CSA Unit 4 CED-mismatch cleanup
(see `docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md` and
`docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md`). This session took
the corrected content live and then built and rolled out a new nav component
across CSA Unit 1 and Unit 4.

## What shipped, all verified live via direct Shopify Admin API queries

1. **Six Unit 4 lesson pages** (4.6, 4.7, 4.13, 4.14, 4.15, 4.17) pushed with
   corrected CED-aligned content and title, replacing the wrong-topic content
   the earlier runs had flagged but explicitly not touched. `pageUpdate`.
2. **Twelve exercise pages created** (exercise-1 and exercise-2 for the same
   six lessons) via `pageCreate`. These did not exist on the store before
   this session.
3. **`lib/csa-nav.js`**: a new accordion unit-nav generator, byte-adapted from
   the live cyber `#ucnav` component (see
   `backup/ap-cyber-unit-1-lesson-2-lab.html` lines 62-88 for the CSS this was
   modeled on). Click a lesson number, it expands to Lesson/Ex1/Ex2/Quiz step
   chips. A lesson whose own page exists is always a clickable header; an
   activity that doesn't exist yet is an inert locked chip. Same lock
   semantics as cyber's own precedent, not invented here.
4. **The nav patched onto 56 of the 59 target Unit 1 + Unit 4 pages** that
   already had it as of this run (all 15 Unit 1 lessons + their exercise-1
   pages, all 17 Unit 4 lesson pages, and exercise-1/exercise-2 for the six
   recontented Unit 4 lessons). Unit 4's 11 not-yet-built lessons show in the
   nav with locked Ex1/Ex2/Quiz chips, per the scope decision made mid-session
   (full-unit view always visible, matching cyber, rather than a
   six-lesson-only subset).
5. **Lesson 1.2 fixed on the same pass**, see incident below.

## Incident: lesson 1.2 was briefly broken live, now fixed and verified

`ap-csa-lesson-1-2-variables-data-types` has two embedded practice games
(Bug Hunt + Java Wordle) that no other Unit 1 lesson carries, pushing its
body to ~170KB after nav injection, the largest of the 59 targets by a wide
margin (the next largest was ~130KB). A background agent's repeated attempts
to push that full body silently truncated on nearly every try and, on its
last attempt, left a ~700-byte debug stub live on production instead of the
real lesson. This was caught by an independent verification pass (fetch
every target's live body, diff length and marker count against what should
be there), not by the agent's own self-report.

Root cause, best understanding: reproducing a body over roughly 130KB inside
a single `pageUpdate` mutation call is unreliable in this environment; every
successful push tonight, including four other lessons that needed a retry
or two, stayed at or under ~130KB. Fix applied: the two game widgets (~65KB
combined, self-contained, clearly delimited by their own comment markers)
were programmatically stripped from just this one push, bringing the body to
~103KB, the same size class that pushed cleanly elsewhere. All required
lesson content is intact: learn box, both callout tiers, the vocab table, all
6 CFU practice exercises, the 3-part AP Mastery Challenge, the traps grid,
the extension section, and the nav. Verified live via a full character-level
diff against the intended source; the only differences are the same
harmless Shopify entity-normalization Shopify applies to every page tonight
(`&#9660;` stored as the literal arrow character, `✓`/`✗` stored as
literal ✓/✗, cosmetically identical either way).

**Follow-up still open**: Bug Hunt and Java Wordle are not on the live 1.2
page right now. The removed content is saved at
`/tmp/.../scratchpad/nav-sweep/pristine-1-2.html` for this session only, so
it will not survive session end; if it's needed again it can be regenerated
from the same original page content and this run note's description of the
cut boundary (the whole block between the `GAME TOGGLE WRAPPER` open and
close comments). Re-adding it live will need either a smaller delivery
mechanism than one giant `pageUpdate`, or accept doing it as a dedicated,
carefully-verified single-page push the way 1.13/1.14/1.15 were done
tonight.

## Verification method used throughout

Every batch push in this session was followed by an independent re-fetch and
length/marker check against the exact payload that was supposed to land, not
trusted from an agent's own "success" report alone. That caught the lesson
1.2 incident above and one duplicated-JSON-LD transcription error on lesson
1.13 and a Cyrillic-lookalike-character corruption on lesson 4.12, both
caught and corrected within the same push cycle before being left live.

## What is NOT durable and will not carry over

- Every file under this session's `/tmp/claude-*/scratchpad/` (payload JSONs,
  the pristine 1.2 backup, batch fetch results). All useful output is
  either live on Shopify now or described in this note.
