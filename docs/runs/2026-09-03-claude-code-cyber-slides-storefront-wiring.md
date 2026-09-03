# 2026-09-03 - Wire the built AP Cybersecurity slide-deck backend (Units 1-2) to the storefront

Board task 184. Reference: `docs/runs/2026-09-03-auditor-csp-slides.md`, item 3
("ITEM 3: SLIDES, MECHANISM AND COVERAGE"), which found the backend fully
built and fully converted for Cyber Units 1-2 with nothing on the storefront
calling it.

## What was verified before touching anything (do not trust the audit blindly)

- `config/cyber-slide-manifest.js`: `LESSON_IDS` is exactly the 9 lessons
  `1-1, 1-2, 1-3, 1-4, 1-5, 2-1, 2-2, 2-3, 2-4`, matching `COURSES['ap-cybersecurity']`
  in `utils.js` (Unit 1 lessons 1.1-1.5, Unit 2 lessons 2.1-2.4). Day counts
  sum to 35 (2+4+4+2+2+8+5+4+4).
- `config/cyber-slide-embeds.js`: 70 entries (`count()` = 70), 9 lessons x
  their day counts x 2 variants (teacher/student) = 70. `GENERATED_AT: 2026-08-27`.
- `config/slide-manifests.js` selects `cyber-slide-manifest` for
  `ap-cybersecurity`, confirmed by reading the file, not inferred.
- `routes/slides.js` already re-verifies the JWT itself and checks
  `entitlements.evaluateTeacherGate` / `evaluateStudentGate` before disclosing
  a deck. No code change was needed here or anywhere else in this repo.
- `npm run smoke:cyberslides` (pre-existing, not written this session): 39/39
  pass against the real route, real manifest, real entitlements code (only
  the embeds map is stubbed, for a deterministic partial-conversion state).
  This already covers the Unit 3-5 404 boundary server-side.
- Live curl against the deployed route (needed no deploy, already live):
  - `GET /api/slides/ap-cybersecurity/1-1` through `2-4`: 200, `locked:true`,
    correct `days` for all 9 (2,4,4,2,2,8,5,4,4).
  - `GET /api/slides/ap-cybersecurity/3-1a`, `4-1`, `5-6`: 404 `Unknown lesson`.
  - Garbage bearer token: still 200 `locked:true`, not a 500.

## The real 9 handles (fetched live, not guessed)

`pageFromHandle` in `utils.js` already carries the canonical Unit 1/2 slug map
(`CYBER_SLUGS`) with a documented warning that Unit 2 has a **second,
competing** page family (`cia-triad`, `defense-in-depth`, `physical-security`,
`risk-assessment`, `access-controls`) claiming the same lesson numbers. Rather
than trust that comment, the live Unit 1 and Unit 2 hub pages
(`ap-cybersecurity-unit-1-introduction-to-security`,
`ap-cybersecurity-unit-2-securing-spaces`) were fetched and their outbound
links extracted. The canonical slug set is what both hubs actually link to;
the competing Unit 2 set does not appear in either hub's links at all.

All 9 fetched directly, 200, each carrying `id="apcyber-wrapper"
data-lesson-id="U.L"` matching the expected lesson exactly:

| handle | lesson | days |
|---|---|---|
| ap-cybersecurity-unit-1-social-engineering | 1.1 | 2 |
| ap-cybersecurity-unit-1-password-attacks | 1.2 | 4 |
| ap-cybersecurity-unit-1-wireless-security | 1.3 | 4 |
| ap-cybersecurity-unit-1-ai-driven-threats | 1.4 | 2 |
| ap-cybersecurity-unit-1-ai-cyber-defense | 1.5 | 2 |
| ap-cybersecurity-unit-2-cyber-foundations | 2.1 | 8 |
| ap-cybersecurity-unit-2-physical-vulnerabilities | 2.2 | 5 |
| ap-cybersecurity-unit-2-protecting-physical-spaces | 2.3 | 4 |
| ap-cybersecurity-unit-2-detecting-physical-attacks | 2.4 | 4 |

Also fetched and confirmed to carry **no** `#apcyber-wrapper` (so the broader
theme.liquid prefix match mounts nothing on them): both unit hubs,
`ap-cybersecurity-unit-1-project`, `ap-cybersecurity-unit-1-exam`. An old
alias handle, `ap-cyber-unit-1-lesson-1`, is also live (200, byte-identical to
`...-social-engineering`) but is not linked from current navigation and is
outside the `ap-cybersecurity-unit-` prefix the theme condition matches, same
as CSP never wired any legacy alias handles either.

## The change (theme repo only, no API repo code change)

- `layout/theme.liquid`: extended the existing CSP/CSA slide-gate
  `{% if %}` with two more `contains` clauses,
  `/pages/ap-cybersecurity-unit-1-` and `/pages/ap-cybersecurity-unit-2-`.
  Never a bare `ap-cybersecurity-unit-` prefix, which would also reach Units
  3-5 (no by-day manifest, whole-lesson-deck format not yet decided per
  `config/cyber-slide-manifest.js`'s own header).
- `assets/apcs-slides-gate.js`: added `mountCyberLessonPage`, which reads
  `data-lesson-id` directly off the page's own `#apcyber-wrapper` (dot form,
  e.g. `"1.2"`) and checks it against a hardcoded `CYBER_KNOWN_LESSONS`
  allowlist that both restricts to the 9 covered lessons and translates dot
  form to the manifest's hyphen form (`"1.2"` -> `"1-2"`). No slug-order table
  needed, unlike CSP: the page already states its own lesson number. The
  `COURSES['ap-cybersecurity']` bundle name/link entry already existed from
  the original cyber slide-gate port; nothing to add there.
- New test, `content/csp-teacher-slides-gate/self-mount-test.js`: drives the
  real asset in Chromium. Covers the CSP self-mount path too (pre-existing,
  had NO test before this change: neither `deck-shape-test.js` nor
  `course-copy-test.js` exercises self-mount discovery, only the documented
  `[data-apcs-slides]` contract directly).

## Gate evidence

- **suite**: `deck-shape-test.js` 15/15, `course-copy-test.js` 29/29 (both
  pre-existing, unmodified, regression-clean), `self-mount-test.js` 12/12
  (new). All three re-run in a clean detached git worktree at the exact
  pushed SHA (`033c8bd`), not just the shared working checkout.
- **rederive**: a from-scratch `liquidjs`-based structural parser (registers
  stub tags for whatever Shopify-only tags it does not know, so it purely
  checks `{% if %}`/`{% endif %}`/`{%- comment -%}` balance) parses the full
  edited `layout/theme.liquid` clean, both in the working checkout and in the
  isolated worktree at the shipped SHA. Independently, the live curl sweep
  above re-derives the manifest's own 9-lesson, 35-day, 70-embed claim
  against the deployed route rather than trusting the audit's numbers.
- **mutation**: `mountCyberLessonPage`'s allowlist check was replaced with the
  exact bug class it exists to prevent (`dotId.replace('.', '-')`, naive
  arithmetic instead of an allowlist). Re-ran `self-mount-test.js`: section 3
  ("Units 3-5 ... must NOT self-mount") went RED (11 passed, 1 failed, exit
  code 1), every other section stayed green. Reverted; back to 12/12. Done
  twice: once in the shared checkout, once again in the isolated worktree at
  the shipped SHA.
- **live**: the BACKEND half (already deployed, no code change) is
  live-confirmed above. The FRONTEND half (theme.liquid + the JS self-mount)
  is **not yet live**: this ships as a draft PR, not a merge, per the task.
  The `--post` live check - fetch a real Cyber Unit 1-2 lesson page and
  confirm the response body now contains `apcs-slides-gate.js`, matching the
  auditor's own "35/35 load apcs-slides-gate.js" check for CSP - can only run
  after a human reviews and merges the PR into the connected branch
  (`claude/site-linking-audit-yhufjk`). That is the one gate component this
  session could not close itself, by construction (task said: do not merge).

## The shared-working-tree incident, reported rather than hidden

This session's `APCSExamPrep-theme` checkout was concurrently shared with
another active agent session doing board task 183 (AP CSA slide-gate pilot),
touching the exact same two files (`layout/theme.liquid`,
`assets/apcs-slides-gate.js`). `apcs claim 184 --lock theme:layout/theme.liquid
--lock theme:assets/apcs-slides-gate.js ...` correctly 409'd naming that
claim; the lock system worked as designed.

What it does not cover is a shared filesystem: that session's own cleanup of
an accidental `git commit --amend` (twice) reverted my first attempt at this
change from the working tree without either of us knowing about the other,
and its own good-faith untrack of what looked like stray content
(`self-mount-test.js`, correctly unrecognized as its own) removed it from a
commit a second time. Both are the other session behaving correctly by its
own lights; neither could see this one.

Handled by: re-deriving my exact intended diff from a saved anchor-based
patch script (not re-typing by memory) each time, re-verifying non-ASCII/
syntax/suite after every reapplication, and committing to a **new** commit
(never amending) the moment the combined state was correct and verified, then
pushing immediately rather than leaving it sitting unstaged in the shared
tree. Final state re-verified in an isolated detached worktree at the exact
pushed SHA, independent of the shared checkout's further churn.

**Memory for the next session**: a claim conflict on a file is not resolved by
waiting it out if the two sessions share a live filesystem; the working tree
itself is contested, not just the intent to edit it. Commit and push the
moment a change is correct and verified. Do not leave verified-correct work
sitting unstaged across multiple side-quests (an `npm install`, several test
runs) in a shared tree; that window is exactly when a neighboring session's
own git hygiene can discard it without either session acting in bad faith.

## STILL OPEN

- **The draft PR itself.** GitHub API access 403'd for this session
  ("GitHub access is not enabled for this session. An org admin must connect
  the Claude GitHub App for this organization."). Pushed to
  `claude/script-nesting-code-blocks-mzo7kp` in both repos; PR title/body
  saved and reported for a human to open manually against
  `claude/site-linking-audit-yhufjk` (theme repo) and `main` (this repo, docs
  only).
- **The post-merge live check.** Fetch a live Cyber Unit 1-2 lesson page after
  the PR merges and confirm the response body contains `apcs-slides-gate.js`
  (a byte string that is FALSE today, confirmed by the fetches in this note,
  and would be TRUE only after the merge). Also confirm CSP and CSA lesson
  pages are unaffected by re-fetching one of each live.
  `apcs done 184 --artifact <PR URL>` should not be called with the PR alone;
  the live re-check after merge is the artifact that actually closes it.
- **The legacy alias handle** `ap-cyber-unit-1-lesson-1` (200, duplicate
  content, not linked from navigation) is left unwired, matching the
  precedent that CSP's own condition only ever covered its canonical handle
  family. Flagging rather than silently deciding it does not matter: a human
  may want it redirected or wired too, and redirecting a handle is outside
  this session's scope regardless (handle changes are on the NEVER list).
- **Units 3-5.** Explicitly out of scope per the task and per
  `config/cyber-slide-manifest.js`'s own header: the whole-lesson-deck format
  has not been decided. Nothing in this change reaches them; the mutation
  test in `self-mount-test.js` section 3 is what proves that claim rather
  than asserting it.
