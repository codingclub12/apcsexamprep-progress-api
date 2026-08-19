# CodeHS Cortado export: what it can and cannot tell us

2026-08-19, Claude Code, follow-on to the CSA exercise-per-lesson mapping work.

## What happened

Tanner uploaded his CodeHS Cortado AP CSA course as a Canvas Common Cartridge
export (`.imscc`, 707KB) and asked whether the actual CodeHS problem
instructions were readable from it, and separately whether a public site
mirrors CodeHS's Cortado question content.

## What was checked, and what came of it

Unzipped and read `imsmanifest.xml` plus all 502 `assignment.html` and
`assignment_settings.xml` files, not a sample. Every assignment body is empty
and every one is `submission_types: external_tool`, pointing to
`https://codehs.com/lti/assignment/<id>`, an LTI launch requiring an
authenticated CodeHS session. No problem text, starter code, or rubric
survived the export, and a whole-archive search for instructional prose
signatures (`"Write a program"`, `"public class"`, etc.) found nothing.

Declined to search for a public mirror of CodeHS's actual question content.
That content is CodeHS's proprietary curriculum, licensed to Tanner's
classroom seats specifically; a site hosting it would itself be an
unauthorized copy, and using one would launder the copyright problem rather
than solve it. Said so plainly rather than quietly searching anyway.

What the manifest does carry cleanly: titles, point values, and order for all
502 activities, extracted and written up as `docs/csa-codehs-exercise-reference.md`.
That is real, useful signal (a title alone is not proprietary content the same
way a problem statement is) for the exercise-count decision already in
progress, distinct from and complementary to the per-lesson mapping
spreadsheet sent directly to Tanner in the prior session.

## The Unit 4 finding

CodeHS's own lesson numbering (61 lessons across Units 1-4, including two
assessment checkpoints per unit) resolves cleanly against this platform's 53
for Units 1-3 and Unit 4 lessons 4.1-4.4 plus 4.16, same titles, same order.
Past that, CodeHS's topic at a given lesson number stops matching this
platform's topic at that number: this platform's 4.13 "Searching and Sorting"
sits where CodeHS has "Implementing 2D Array Algorithms", and CodeHS has a
standalone "Wrapper Classes" lesson and a split Searching/Sorting pair that
appear nowhere on this platform's Unit 4 list. Left those 12 lessons (4.5
through 4.15, 4.17) unjoined in the reference doc rather than guess a mapping.

This surfaced a live-CED check as the next real step, which was already
underway in a separate session by the time this doc was written (that session
verified egress to `apcentral.collegeboard.org` after the environment's
network policy was switched to full internet access, mid-session, and started
running `scripts/ced-watch.js` directly). Did not duplicate that check here:
confirmed via `mcp__github__actions_list` that `ced-watch.yml` has never run
(zero executions, ever) and via `git ls-remote` that no `ced-watch/snapshot`
branch exists yet, so nothing had landed as of this writing. This session's own
egress is still on the environment's OLD policy; a live retry from here still
returns `EGRESS_BLOCKED` on both `apcentral.collegeboard.org` and a neutral
control domain (`example.com`), confirming the policy change did not hot-reload
into an already-running container. Whichever session lands the CED result
first should update `docs/csa-codehs-exercise-reference.md`'s Unit 4 section
rather than leave two answers standing.

## What is still open

- The Unit 4 CED-alignment question itself: not resolved here, resolving
  elsewhere.
- `config/ced-sources.json` has no CSA CED PDF source (Cyber and CSP each have
  one; CSA only has two HTML pages that watch for revision announcements, not
  the topic outline). Worth adding regardless of how the live check comes
  back, so this isn't a blind spot again next time.
- The exercise-count decision itself: still Tanner's call, via the
  `final_count` column on the spreadsheet from the prior session.
