# 2026-09-03 claude code: the AP CSA slide-gate pipe (Unit 1 pilot)

Board task 183. Builds the ENGINEERING PIPE for `ap-csa` slides, mirroring the
live `ap-csp` mechanism the 2026-09-03 auditor sweep mapped in
`docs/runs/2026-09-03-auditor-csp-slides.md`, ITEM 3. Piloted on the 15 Unit 1
lessons only. No real slide content: every lesson resolves zero decks on
purpose, so this proves the pipe, not the content.

## What was verified, not assumed

- **`routes/slides.js` needed zero changes.** Read it in full: it selects a
  manifest via `config/slide-manifests.js.forCourse(course)` and never
  branches on a course string. Confirmed by running the route unmodified
  against `ap-csa` once it was registered.
- **`lib/entitlements.js` needed zero changes.** `VALID_COURSES` already
  included `'ap-csa'` (one of "the five paid courses"), and
  `evaluateTeacherGate`/`evaluateStudentGate` are course-agnostic, driven
  entirely by the `entitlements` table. Independently corroborated:
  `smoke/csp-slide-gate.js` already granted a teacher `'ap-csa'` as its
  "entitled for a different course" test fixture, before this task touched
  anything.
- **The live AP CSA lesson-page wrapper markup**, fetched directly (not
  assumed from the CSP pattern): `/pages/ap-csa-lesson-1-1-intro-algorithms`,
  `-1-8-documentation-comments` and `-1-15-string-manipulation` all carry
  `<div id="apcsa-lesson" data-course="ap-csa" data-lesson-id="1.1">` with an
  `<h1>` shortly after inside `header.apcsa-header`. This is NOT the
  `.lesson-page[data-course="ap-csp"]` shape the task brief expected by
  analogy, and it does not need CSP's slug-order table at all: the page
  already states its own lesson number. A CSA exercise-1 page carries
  `data-course="ap-csa"` too, but on a different wrapper id, so the
  `#apcsa-lesson` selector alone keeps the gate off support pages.
- **`ap-csa-lesson-1-` as a theme.liquid prefix match is exact to Unit 1.**
  Checked against `lib/csa-nav.js`'s Unit 4 handles (which carry a different
  unit digit, e.g. `ap-csa-lesson-4-13-...`): none contain the Unit 1 prefix.
  Asserted by `scripts/verify-csa-slide-pilot-scope.js`, not just reasoned
  about.
- **`ap-csa-teacher-resources` is a 301 redirect** to the bundle sales page,
  confirmed by the auditor's sweep, so no explicit-container surface exists
  for CSA the way `ap-csp-teacher-resources` does. No theme.liquid clause was
  added for it; there is nothing there for the script to find.

## What shipped

API repo (`codingclub12/apcsexamprep-progress-api`,
`claude/script-nesting-code-blocks-mzo7kp`, commit `b24143d`):

- `config/csa-slide-manifest.js`, `config/csa-slide-embeds.js`: the manifest
  and its (empty) embed-id map, shaped identically to
  `config/cyber-slide-manifest.js` (embed-only, no track dimension), since
  CSA has no Shopify `.pptx` assets either. 15 keys, `1-1` through `1-15`.
- `config/slide-manifests.js`: registered `'ap-csa'`.
- `smoke/csa-slide-gate.js` (28 assertions) and a one-line fix to
  `smoke/csp-slide-gate.js`, whose "unsupported course" example was
  `'ap-csa'` and stopped being true the moment this landed (caught by
  actually re-running the suite, not by inspection).
- `scripts/verify-csa-slide-pilot-scope.js`: the rederive check, reads
  `lib/csa-nav.js`, the manifest, and both theme files as raw text with fresh
  regexes, never calling the code under test.
- `deploy-gates/2026-09-03-csa-slides-pipe.json`: the gate manifest.

Theme repo (`codingclub12/APCSExamPrep-theme`,
`claude/script-nesting-code-blocks-mzo7kp`, commits `c07ab37` + `e6eca11`):

- `assets/apcs-slides-gate.js`: `'ap-csa'` added to the `COURSES` bundle-copy
  table (name "AP CSA Teacher Bundle", href `/pages/ap-csa-teacher-superpack`,
  no tracks); `csaLessonIdFromWrapper` + `mountCsaLessonPage`, wired into
  `mountAll`.
- `layout/theme.liquid`: the slide-gate script's path condition gained
  `or request.path contains '/pages/ap-csa-lesson-1-'`.
- `content/csa-teacher-slides-gate/course-copy-test.js` (20 assertions):
  locked-state bundle copy, the pending state (the actual live state for
  every lesson today), the free overview, self-mount from the real live
  wrapper shape, the Unit 1 boundary, and a CSP-noninterference check.

## What the "no deck yet" state actually shows a user

Chosen deliberately over inventing a placeholder deck (the brief offered
both options; this is the one that reuses proven behavior instead of adding
a new one). Every Unit 1 lesson is `isKnownLesson: true` with zero embed ids,
so `decksForLesson` always returns `[]`. That is the exact
entitled-with-zero-decks state `config/cyber-slide-manifest.js`'s unconverted
lessons already exercise, proven correct in `smoke/cyber-slide-gate.js`
section 5 before this task touched anything:

- **Entitled caller** (teacher or student whose class/account holds a live
  `ap-csa` entitlement): "Your access is active. The slide decks for this
  lesson are still being prepared and will appear here as soon as they are
  published." No upsell, no bundle link.
- **Unentitled caller**: the ordinary locked panel, now correctly naming "AP
  CSA Teacher Bundle" and linking `/pages/ap-csa-teacher-superpack` instead of
  falling into the generic "an unrecognised course" branch.
- **Anonymous caller**: same locked panel; the free overview (rendered before
  any network call) never claims a specific day count on a self-mounted page,
  matching CSP's existing behavior.

Nobody, including this session, authored placeholder slide content. The
option to point every entry at one controlled "coming soon" asset was
available and not taken, because it would have meant creating and hosting an
actual file (Shopify upload or a Google Slides doc), which is a content
action, not an engineering one, and outside what this pass was asked to do.

## Evidence: the gate, all four kinds

`node scripts/deploy-gate.js deploy-gates/2026-09-03-csa-slides-pipe.json --pre`,
run twice: once against the shared checkout, once again in throwaway detached
worktrees at the exact committed SHAs (API `b24143d`, theme `e6eca11`), per
the rule that a gate run against a branch that later gets merged elsewhere is
not evidence about the SHA that ships. Both runs:

```
[PASS] suite     new: csa slide gate (API)                    28 passed, 0 failed
[PASS] suite     regression: csp slide gate (API)              26 passed, 0 failed
[PASS] suite     regression: cyber slide gate (API)            39 passed, 0 failed
[PASS] suite     regression: csp slide embeds (API)            49 passed, 0 failed
[PASS] suite     regression: cyber slide embeds (API)          33 passed, 0 failed
[PASS] suite     new: csa course-copy and self-mount (theme)   20 passed, 0 failed
[PASS] suite     regression: csp course-copy (theme)           29 passed, 0 failed
[PASS] suite     regression: csp deck-shape (theme)            15 passed, 0 failed
[PASS] rederive  scope agrees with the raw artifact            16 passed, 0 failed
[PASS] mutation  the ap-csa manifest registration is load-bearing
       broke config/slide-manifests.js, suite went red on "[FAIL]   anonymous: 200"
[PASS] mutation  the theme's Unit 1 self-mount boundary is load-bearing
       broke assets/apcs-slides-gate.js, suite went red on
       "[FAIL]   no panel mounts for a lesson outside Unit 1"

3 kinds agree: suite, rederive, mutation.
```

`live` is deferred by design (`--pre`): nothing has merged or deployed. Both
mutations were probed by hand first to capture their exact `[FAIL]` text
before being wired in, and both restore cleanly (`runMutation`'s own
restore-on-finally, plus a manual `git diff`/`grep` check after each gate run
found no leftover mutated text).

**No `live` check exists for this pass, and that is correct, not missing.**
Nothing has merged. Whoever merges either PR must re-run this manifest without
`--pre` afterward and add a live assertion (e.g. `GET
/api/slides/ap-csa/1-1` on production answering `{"days":...}` rather than
404, and the live lesson page loading `apcs-slides-gate.js`), per the repo's
own rule that a live check must assert something FALSE before the deploy.

## The collision, because it very nearly produced a bad commit

This checkout is shared with other concurrent sessions, confirmed the hard
way. Mid-task, board task 184 (AP Cybersecurity self-mount, a closely parallel
piece of work) was editing `assets/apcs-slides-gate.js` and
`layout/theme.liquid` directly in this same working tree, without a lock,
while this task held the lock on both files (claim #67). Caught by re-reading
the files before staging rather than trusting an earlier read: task 184's
cyber self-mount code was interleaved into this task's `mountAll` function,
and one function
(`mountCyberLessonPage`) was caught mid a deliberate mutation-test state of
its own (`dotId.replace('.', '-')` in place of an allowlist, commented
"MUTATION FOR THE DEPLOY GATE"). Committing that snapshot would have shipped
someone else's transient, intentionally-broken scratch state as if it were
finished code.

Recovery: both files were backed up as found (scratchpad), reset to git HEAD,
and only this task's two changes were reapplied via an exact-match patch
script. It happened TWICE (the files were rewritten again by the other
session between the first fix and `git add`), which is what moved the final
sequencing to one uninterrupted restore-patch-add-commit shell chain to
shrink the race window, plus a verification pass in a detached worktree
immune to the shared checkout entirely. A note was left on task 184
explaining what happened and that nothing of its work was lost (its own
session recovered and committed its cyber changes cleanly afterward, visible
now as theme commit `033c8bd`, sequential and non-conflicting with this
task's two commits).

Separately, and lower-stakes: a `git commit` mid-recovery picked up
`content/csp-teacher-slides-gate/self-mount-test.js` (task 184's new file)
because a shared working tree means a shared git INDEX, and something staged
it between this session's own `git add` calls. `git commit` commits the whole
index, not just what was just added. Caught by diffing the actual commit
against the declared file list immediately after, not by assuming the `add`
command's argument list was authoritative; fixed with a same-branch follow-up
commit (`git rm --cached`), not an amend, so the mistake and the correction
are both visible in history. A plain `package.json` name-casing drift in the
theme repo (no code content) was reverted the same way, unstaged, before it
could ride along.

**The instrument that was wrong before it was right:** trusting `git status
--short` as sufficient evidence a file was still clean immediately before
`git add`. It reports presence of a diff, not its content or its staged
scope. The fix used going forward: read the actual diff (or the actual
committed blob via `git show`) immediately before the action that makes it
permanent, and treat any gap between check and action as long enough for
another process to have written to the same path.

## Still open, and this is the part that matters most

**The pipe is real. The content is not, and those are two different facts.**

- **No AP CSA slide deck exists anywhere**, gated or not, for any of the 15
  Unit 1 lessons, let alone the other 38. This pass did not create, draft, or
  fabricate any. `config/csa-slide-embeds.js`'s id map is empty on purpose.
- **What would make it real**: either (a) existing slide decks Tanner already
  has, in whatever format (Google Slides, PowerPoint, Keynote export), handed
  over lesson by lesson or as a batch, converted through the same pipeline
  `scripts/cyber-slide-embeds-from-csv.js` already proves out, or (b)
  AI-drafted content Tanner reviews and approves lesson by lesson before
  anything reaches a student, since this repo's own rule is that writing a
  line of content nobody reviewed is not a repair, it is authorship, and
  belongs to a human. Neither path was started here.
- **The CSA Teacher Superpack sales page's promise** ("Slides + Resources for
  All 4 Units") is still not backed by anything real, for any unit. This pass
  was explicitly told to make that promise true rather than remove it, and it
  has made the ENGINEERING half of that true for 15 of 53 lessons. The
  promise itself is still false today, live, and stays false until real
  content lands. That is not this pass's to fix further; it is Tanner's
  content decision, named explicitly rather than left implicit.
- **Both PRs are drafts, unopened.** GitHub REST API access returned "GitHub
  access is not enabled for this session. An org admin must connect the
  Claude GitHub App for this organization" for every repo/PR-scoped call
  (confirmed across two auth header styles; `/user` succeeds, `/repos/...`
  and `/pulls` do not, so this is a scoping block rather than a bad token).
  Both branches are pushed. Compare URLs and the intended title/body are in
  the session's final report for a human to open by hand.
- **Units 2-4 (38 more CSA lessons)** are untouched, as scoped. Extending the
  manifest is "a manifest edit, not a code change" once real content exists,
  per the header comments left in `config/csa-slide-manifest.js` for exactly
  that reason.
- **`assets/apcs-slides-gate.js`'s day-count placeholder** (every Unit 1
  lesson reports `1`) is explicitly not a sourced pacing plan, unlike CSP's
  and cyber's Drive/Shopify-derived counts. It has zero live effect today
  (self-mounted pages never read `data.days` from the API response; the
  free-overview text only uses the page's own `data-days` attribute, which is
  never set for a self-mounted CSA page), but it should not be trusted or
  copied anywhere before a real pacing decision replaces it.

## Memory for the next session

- **A "mirror the same pattern" brief can still be wrong about the mechanism
  underneath it**, and finding that out by fetching the live page beats
  guessing from the sibling course's shape. The brief expected a CSP-style
  slug-order table; the live CSA markup already carries the lesson number
  directly, which is simpler AND more robust, and shipping the guessed
  version would have meant maintaining a table that duplicates data already
  on the page.
- **A shared, unlocked checkout is not a hypothetical risk in this
  environment.** It happened twice to the same two files in one session, and
  a lock claimed correctly on this task's side did not stop the other side
  from writing, because the other session never claimed a conflicting lock to
  be blocked by. The defense that actually worked was re-reading and
  re-verifying immediately before every commit, not the claim itself.
- **`git status --short` is presence, not content.** Use `git diff` /
  `git show` immediately before any `git add` or `git commit` in a checkout
  that might be shared, and check the committed result afterward against the
  declared file list, not just the command that was typed.
