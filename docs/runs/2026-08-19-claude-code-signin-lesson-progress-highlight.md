# 2026-08-19 claude code: signed-in badge and started/complete highlight

## The ask

Tanner asked directly in session (no board task filed) for two UI
identifiers on lesson/exercise pages: a global signal that a
teacher/student is signed in to the course, and a yellow highlight when a
lesson or exercise is started, upgrading to a green highlight when it is
completed or submitted.

## What existed before this

- `GET /api/student/me`, `GET /api/student/progress`, and
  `GET /api/student/attempts` already exposed everything needed: visited
  vs. completed state per lesson/activity, and quiz lock/attempt status.
  No backend change was required.
- `apcs-tracker.js` already had a session bar (`renderSessionBar`) showing
  class code and student name, and a hub-page badge system
  (`APCS_renderHubProgress`) that color-coded lesson cards gray/amber/green
  by completion. Neither existed on the lesson/exercise page itself.
- The mirror of this file at `shopify/apcs-tracker.js` in this repo had
  drifted badly out of sync with the theme repo's live asset: missing the
  entire activity-completion tracking section, pointing at a stale Railway
  URL instead of the custom domain, and using ASCII-only comment dividers
  where the live asset had since moved on. Pre-existing drift, not caused
  by this session.

## What shipped

- Theme repo (`codingclub12/APCSExamPrep-theme`, source of truth): a
  green "SIGNED IN" badge added to the existing session bar, plus a new
  state pill (`#apcs-bar-state`) that shows amber "IN PROGRESS" once a
  lesson/exercise/quiz is visited or attempted, and green "COMPLETE" (or
  "SUBMITTED" for a finalized quiz) once the work is actually done.
  Wired into the existing visit-post, `markComplete()`, and quiz
  lock/finalize lifecycle already in the file. No new endpoint; reuses
  `/api/student/progress` and `/api/student/quiz/status`.
  Shipped as `codingclub12/APCSExamPrep-theme#58`, targeted at the
  connected/live branch (`claude/site-linking-audit-yhufjk`, not `main`
  per that repo's CLAUDE.md), merged 2026-08-19.
- This repo: `shopify/apcs-tracker.js` re-synced byte-for-byte with the
  now-updated theme asset, both the new feature and the pre-existing
  drift. Shipped as `codingclub12/apcsexamprep-progress-api#221`, merged
  to `main` 2026-08-19.

## Verified

```
$ node --check assets/apcs-tracker.js   # theme repo
SYNTAX OK
$ diff shopify/apcs-tracker.js <theme-repo>/assets/apcs-tracker.js
IDENTICAL
```

Offline smoke suites green on PR #221 before merge. Live API responded
401 (expected, unauthenticated) on `/api/command/digest` immediately
after the `main` merge, confirming the Railway deploy came back up rather
than crash-looping. No server route/schema code changed in either PR, so
this was a static-asset-only deploy.

## Still open

- Not yet verified against a real rendered lesson page in a browser
  (`apcs verify` still needed) - only syntax-checked and diffed locally.
  Someone with cookie auth needs to load a live lesson page, confirm the
  SIGNED IN badge and the amber -> green transition actually render
  without layout shift or CSS bleed, and flip `verified` per CLAUDE.md's
  rule 4 (the agent that did the work cannot be the one that closes the
  loop on it).
- The pre-existing mirror drift this run fixed suggests the mirror can
  silently rot between sessions since nothing enforces the "re-sync in
  the same pass" rule automatically. Worth a smoke check later that diffs
  the mirror against the theme repo's live asset, if that becomes a
  repeat problem.
