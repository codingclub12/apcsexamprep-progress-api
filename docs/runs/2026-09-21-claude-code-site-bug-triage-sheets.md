# Site bug triage, 2026-09-21: building the sheets the morning run specified

Board 378, 379, 380. Follow-up to the automated morning bug-triage email sent
2026-09-21 15:04 ("Site bug triage 2026-09-21 - 3 reports audited, all 3
real, fixes specified (not yet applied)"). That run confirmed three feedback
reports were legitimate and wrote an exact patch for each, plus flagged one
separate finding, but saved its prompt as `claude/Site-Bug-Triage-2026-09-21.md`
in the Claude chat project rather than committing it to either repo. That
file was not reachable from this session (per CLAUDE.md, the chat project is
not a source and this session has no memory of it either), so the three
patches below were independently re-derived against the live Admin API
bodies rather than trusted from the email's description.

## What changed

Nothing is live. `APCSExamPrep-theme` PR #128 carries three validated
Matrixify sheets, built and parsed back against source, not imported.
Matrixify import stays a human step per this repo's convention; every run
note referenced in that convention says "I do not import" for the same
reason, and this one does not either.

## 1. Stored XSS in the shared leaderboard component, all 10 AP Networking games

Confirmed against the live Admin API body of all 10 `ap-networking-game-*`
pages, not a storefront render and not an artifact of how the body was read
back. `APCSLeaderboard`'s `esc()` reads:

    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&','<':'<','>':'>','"':'"'}[c]; }); }

Every character maps to itself. It is byte-for-byte identical across all 10
pages fetched (`ap-networking-game-harden-first`, `-subnet-sprint`,
`-rule-order`, `-address-autopsy`, `-packet-path`, `-log-hunt`,
`-guest-gate`, `-segment-sort`, `-shell-hop`, `-ai-audit`).

The sink: `renderRows()` builds the leaderboard's name cell with
`'<div class="nm">'+esc(e.name||'anon')+'</div>'` and assigns the joined
string to `rows.innerHTML`. `e.name` is read from
`GET /api/game/leaderboard`, which serves rows written by
`POST /api/game/score`, whose `name` field is whatever the player typed into
a `window.prompt()` and stored in `localStorage`. A player who sets their
name to `<img src=x onerror=...>` (or worse) has that markup rendered,
unescaped, in every other visitor's browser who opens that game page and
loads the leaderboard. No authentication is required to submit a score, and
`routes/game.js` bounds only `value`, never `name`, beyond a client-side
16-character trim that a direct POST bypasses entirely.

**Fix:** `renderRows()` no longer builds the name cell by string
concatenation into `innerHTML`. It builds the row with `document.createElement`
and sets the name via `.textContent`, which the browser escapes
unconditionally regardless of what `esc()` does. This matches
`APCSExamPrep-theme/CONVENTIONS.md` verbatim: "Escape untrusted values with
`element.textContent`, never string interpolation." It was also the
deliberate reason NOT to just repair `esc()`'s entity table in place: doing
that would put literal HTML entity text (`&amp;`, `&lt;`, ...) inside a
`<script>` block, which the same CONVENTIONS.md separately forbids ("No HTML
entities inside `<script>` blocks... entities are fine outside them"),
because Shopify has previously been observed decoding entity literals in a
page body on import. `esc()` itself is left in place, still used only for
`renderName()`'s self-referential display of the player's own locally-set
name and `renderBest()`'s developer-supplied `cfg.label`, neither of which
is attacker-reachable across visitors; fixing those too was judged out of
scope for this pass (see Not covered, below) since the actual cross-visitor
sink is the one that mattered.

## 2. Harden First: picking the first three buttons wins every round

Confirmed in the same fetch. `render()`'s own comment claims "The list is
dealt in the authored order, which alternates key and non-key entries rather
than grouping them, so position is never a hint." It does not alternate.
Every one of the five scripted `SITES` is authored
`key: true, key: true, key: true, key: false, key: false, key: false`, in
that exact order, and `render()` deals `s.fixes` via a plain `.forEach` with
no shuffle. The three correct picks are always positions 1, 2 and 3.

**Fix:** display order is shuffled per round (Fisher-Yates over an index
array), while `data-i` and the click handler's `toggle(idx, b)` stay indexed
into the ORIGINAL authored array. This is safe because everything downstream
already reads by index rather than DOM position: `go()` re-derives `keyIdx`
from `s.fixes` directly, and the reveal-styling loop reads `data-i` off each
DOM node rather than assuming a position. No CSS or markup changed.

## 3. CSP Big Idea 3: "undefined questions" on the Applied Challenge card

Confirmed on 4 of the 17 Big Idea 3 lesson pages: `boolean-expressions`
(the one originally reported), plus `variables`, `conditionals` and
`undecidable-problems` as an early/middle/late spot check. All four carry
the identical broken string:

    Applied Challenge<span>undefined questions, and every answer is
    recorded for your teacher</span>

A template variable for the question count was never substituted when these
pages were generated. Each linked `*-exercise-2` page states its own count
in its `mcq-section-sub` ("N questions - scenario driven..."); all four
checked are 6. Fixed to `6 questions, and every answer is recorded for your
teacher` on those four pages only. **The other 13 Big Idea 3 lesson pages
were not fetched this pass** and are very likely affected by the same
defect (same generator, same exact byte pattern on 4/4 checked); they need
the same read-and-confirm before a sheet is built for them, in case any of
the 18 Applied Challenge exercises is not 6 questions.

## 4. CSP Day 18: packet switching explanation reads as though B were wrong

The stem and the answer key (B) are correct and untouched; this is a
presentation bug only. The live "Why Not the Others?" paragraph ran three
options together as one sentence, with "B is correct." sitting in the
middle of option A's rationale:

    A) A key advantage of packet switching is that packets can
    independently find the best available route. B is correct. C) Multiple
    packets can travel simultaneously through different paths - this
    parallelism improves efficiency. D) All digital data, regardless of
    size, can be divided into packets for transmission.

A student who answered A, was told the answer was B, then read "A) ... best
available route. B is correct." would reasonably read the page as
contradicting itself. Split into one paragraph per wrong option (A, C, D;
B is already covered in the "Why This Answer?" block above it), and removed
the em-dash the original carried, which this repo's own no-em-dash
convention does not allow in authored prose.

## How the sheets were built and validated

Every page body was fetched fresh from the Shopify Admin API this session
(not from a report, not from a cached copy). For the three multi-row
sheets, the combined GraphQL response was large enough to trip this
session's own output-overflow guard, which writes the full JSON to a file
before truncating what is shown in the transcript; that JSON is the byte-exact
source the patches were built and diffed against, not a transcription.

Each `build_*.py` in `APCSExamPrep-theme/content/site-bug-triage-2026-09-21/`:

- Asserts the target text occurs exactly once in the live body before
  replacing it (refuses to guess at a fuzzy match).
- Asserts the patch introduces no new non-ASCII character, no HTML entity
  inside a `<script>` block, and no new CSS `transform` (the pre-existing
  `.lb-toast` self-transform, already live on all 10 pages, is untouched and
  correct per CONVENTIONS.md, which forbids a transform on an ANCESTOR of a
  `position: fixed` element, not a fixed element transforming itself).
- Writes the CSV with `csv.QUOTE_ALL`, `Command: MERGE`, and a past-dated
  `Published At`, matching the convention `build-cc2.py` already uses in
  this repo.
- Parses the finished CSV back out and re-asserts the fix is present and the
  defect string is gone, per "generate the sheet, then parse it back and
  diff against the source spec."

## Evidence

    handle                                   before    after
    ap-networking-game-address-autopsy        24596    24967
    ap-networking-game-ai-audit               30558    30929
    ap-networking-game-guest-gate             30398    30769
    ap-networking-game-harden-first           31008    31940   (extra: shuffle fix)
    ap-networking-game-log-hunt               26720    27091
    ap-networking-game-packet-path            27941    28312
    ap-networking-game-rule-order             28328    28699
    ap-networking-game-segment-sort           26035    26406
    ap-networking-game-shell-hop              29158    29529
    ap-networking-game-subnet-sprint          25911    26282

    ap-csp-course-bi3-boolean-expressions    118963   118955
    ap-csp-course-bi3-variables               118017   118009
    ap-csp-course-bi3-conditionals            130028   130020
    ap-csp-course-bi3-undecidable-problems    122522   122514

    csp-c1-day-18-packet-switching (article)   12781    12894

All parse-back diffs: OK. PR: https://github.com/codingclub12/APCSExamPrep-theme/pull/128

## What this is NOT

- **Not live.** All three board tasks (378, 379, 380) are marked done with
  the PR as artifact because the task scope was building and validating the
  sheets, which is complete. None of the underlying defects are fixed on the
  live site until Tanner imports the sheets through Matrixify. This session
  does not import; see CLAUDE.md and every prior run note that touches a
  page body.
- **Not a full sweep.** `routes/game.js` registers 46 games total (19 CSP
  topic games, 18 "Big Idea 3" games, these 10 AP Networking games). The
  leaderboard component's own comment says it was "copied verbatim from the
  live Two Sides game page," which is a CSP game, so the other 36 are the
  likely origin of the same defect and were not checked this pass.
  `two-sides` is the highest-value single page to check next. 13 more Big
  Idea 3 lesson pages likely carry the same "undefined questions" card.
- **Two items from the original triage were not acted on**, deliberately:
  the Truth Tracer off-by-one score message on the boolean-expressions page,
  and the exercise-2 gradebook identity collision on the same page, which
  the original triage correctly flagged as needing Tanner's call on the
  reporter's dedup rules before anyone touches it.

## A separate flag, unrelated to the bug triage

`APCSExamPrep-theme/CLAUDE.md` changed on disk partway through this session
to reinstate the fast-forward push
(`git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk`)
that the version loaded at session start documented as backwards and capable
of rewinding the live theme by 46 commits (checked against the Shopify
Admin API 2026-09-01: `main` was an ancestor of the connected branch, not
ahead of it). This session did not run that command and did not need to
(nothing here touches the theme's synced directories). Worth a look before
anyone acts on the current file.

## Live verification, after Tanner's import

All three sheets imported (Tanner confirmed "All 3 imported", 2026-09-21). Re-fetched
all 15 changed rows fresh from the Admin API and diffed against the expected fixed
pattern; this is a live check, not a re-report of the build-time validation above.

    handle                                   updatedAt              fixed
    ap-networking-game-harden-first          2026-09-21T16:54:00Z   yes (shuffle + XSS sink both gone)
    ap-networking-game-subnet-sprint         2026-09-21T16:54:02Z   yes
    ap-networking-game-rule-order            2026-09-21T16:54:01Z   yes
    ap-networking-game-address-autopsy       2026-09-21T16:54:00Z   yes
    ap-networking-game-packet-path           2026-09-21T16:54:01Z   yes
    ap-networking-game-log-hunt              2026-09-21T16:54:01Z   yes
    ap-networking-game-guest-gate            2026-09-21T16:54:00Z   yes
    ap-networking-game-segment-sort          2026-09-21T16:54:01Z   yes
    ap-networking-game-shell-hop             2026-09-21T16:54:01Z   yes
    ap-networking-game-ai-audit              2026-09-21T16:54:00Z   yes
    ap-csp-course-bi3-boolean-expressions    2026-09-21T16:52:22Z   yes
    ap-csp-course-bi3-variables              2026-09-21T16:52:22Z   yes
    ap-csp-course-bi3-conditionals           2026-09-21T16:52:22Z   yes
    ap-csp-course-bi3-undecidable-problems   2026-09-21T16:52:22Z   yes
    csp-c1-day-18-packet-switching (article) 2026-09-21T16:51:58Z   yes

10 of 10 networking pages confirmed clear of `esc(e.name` (the actual XSS sink)
and carrying the textContent-based `renderRows()`. `esc()` itself is still a
no-op on all 10, which is expected and was the deliberate minimal-scope
decision: it is not called on attacker-reachable data anywhere in the fixed
code path. 4 of 4 CSP lesson pages confirmed clear of "undefined questions"
and carrying "6 questions". The Day 18 article confirmed split into three
per-option paragraphs with no "B is correct." embedded mid-sentence.

**This is NOT the independent re-check this repo's `verified` flag requires.**
Same session, same run as the one that built the sheets. It is real,
re-derivable live evidence (anyone can rerun the same query and get the same
bytes), which is why it belongs in this run note, but board 378/379/380 stay
in `needs_verification` until Tanner or a separate process confirms it.
