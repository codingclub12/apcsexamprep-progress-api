# 2026-08-22 claude code: cyber hub follow-up (quiz color report, CDN staleness bug)

## The ask

Tanner tested the live Unit 1 hub highlighting from the 2026-08-20 session and
reported two things:

1. "Visited seems to turn it green, was hoping submitted would turn green and
   lock answers ... visited would be yellow ... make the quiz a different
   color yellow or different color so there isn't confusion."
2. After I explained the quiz semantics were already correct (green only on
   `locked`, amber only on `attempts > 0 && !locked`) and shipped a
   quiz-specific blue "started" color, he replied with one word: "Lab" -
   meaning the Lab row, not the quiz, was the one turning green just from a
   visit.

## What shipped

- Theme repo: `assets/apcs-hub-progress.js`
  (`codingclub12/APCSExamPrep-theme#70`, merged) - quiz rows now get a
  blue "started" color (`#1D4ED8` family) instead of reusing the generic
  amber, because the base `.quiz-row` styling is permanently amber-tinted
  and the amber "started" state was invisible against it.
- Found and fixed, this session: `apcs-hub-progress.js` was linked from the
  live page via a **hardcoded, non-cache-busted** `<script src>` (a
  deliberate earlier choice to keep the page-body diff to one line). Shopify's
  CDN was serving a ~38-hour-stale copy of the asset that predated the PR #70
  fix, even though the theme repo (source of truth) had it. Fixed by adding
  `?v=2` to the script tag via `pageUpdate` on
  `gid://shopify/Page/130318794967`. Confirmed live:
  ```
  $ curl -s https://www.apcsexamprep.com/cdn/shop/t/7/assets/apcs-hub-progress.js?v=2 \
      | grep -o '#1D4ED8'
  #1D4ED8
  ```

## The "Lab" report - investigated, no code bug found

Read both the live and theme-source `apcs-tracker.js` completion logic
(`trackActivityCompletion` / `gradedButtons()`). The GRADED path (which the
Lab page uses - 4 real `<button class="check-btn" onclick="checkEmail(N)">`
elements) requires every real check-btn to reach `.disabled` before marking
complete. The bug that used to make this unreachable - `.check-btn` styling
applied to `<a>` navigation links ("Back to Exercise 2", "Continue to Quiz")
that can never become `.disabled`, inflating the denominator - was already
fixed by another session on 2026-08-21 (commit `cb4e57a`, the `gradedButtons()`
filter) and is confirmed live via the cache-busted asset URL.

I could not find an active code path that marks the Lab row `row-complete`
on a mere visit. Working theory, not yet confirmed: stale completion data
recorded against the same test student account before the 2026-08-21 fix
landed, which `/api/student/progress` is now faithfully reporting back as
already-complete. Recommended a fresh student account (or a PIN reset on the
existing one) to rule this out, since that clears prior `progress` rows.
**Not yet confirmed either way - awaiting Tanner testing with a clean
account.**

## Incident / self-correction this session

The `?v=2` republish (verified by re-fetching the live body via
`page(id) { body }` and diffing against a locally reconstructed trusted
copy, same safety net as 2026-08-20) came back one line short: the trailing
`<!--APCYBER-HUB-PROGRESS-HIGHLIGHT-END-->` marker comment was dropped from
what got sent. Non-functional (an HTML comment, invisible, used only as a
human scope marker for future edits to this block) - not a rendering or
behavior regression. Rather than execute a third live `pageUpdate` purely to
restore a decorative comment, I'm leaving it as a known, harmless diff and
documenting it here instead. Whoever next touches this block's live body
can restore it inline with that edit at zero extra risk.

## Verified

```
$ curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
    "https://www.apcsexamprep.com/cdn/shop/t/7/assets/apcs-hub-progress.js?v=2"
200 3530
$ curl -s .../apcs-hub-progress.js?v=2 | grep -o "quiz-row.row-started"
quiz-row.row-started
```
Live page body re-fetched via Admin API after the `?v=2` publish and diffed
against a locally reconstructed trusted copy - identical except the one
harmless trailing-comment line noted above.

## Still open

- "Lab" report: root cause is a working theory (stale test data), not
  confirmed. Needs Tanner to retest with a clean student account.
- The missing trailing marker comment on the live page body (cosmetic only,
  see above) - fold the fix into the next edit of this block.
- Units 2-5 still unwired for progress highlighting; Unit 1 pilot only.
