# 2026-08-25 claude code: the slide gate learns a second course

Ports the AP CSP Teacher Bundle slide gate to AP Cybersecurity, following
`docs/next-session-cyber-slide-gate.md` and the CSP build note from earlier the
same day. Scoped to Units 1 and 2 at Tanner's direction; he is building the
per-day decks for Units 3-5 in a separate pass.

## What shipped

- **`assets/apcs-slides-gate.js`** (theme, PRs #79 and #81, both merged and
  live): renders a deck that has an embed and no download, and says the right
  thing on a cyber page. Verified against Shopify rather than GitHub: the live
  theme's copy is 33533 bytes with `updatedAt` 2026-08-25T23:51:17Z, matching
  the connected branch byte for byte.
- **`config/cyber-slide-manifest.js`**, **`config/cyber-slide-embeds.js`**,
  **`config/slide-manifests.js`**: the cyber manifest, its (still empty) id map,
  and a registry so the route selects a manifest instead of branching.
- **`routes/slides.js`**: serves `ap-cybersecurity` through the same gate.
- **`scripts/cyber-slide-embeds-from-csv.js`**: sheet to config, with the
  refusals that matter.
- **`scripts/cyber-slides-conversion.gs`**: the Apps Script Tanner runs.
- Suites: `smoke:cyberslides` 39, `smoke:cyberembeds` 33, `smoke:cyberconv` 16,
  theme `deck-shape-test.js` 15, theme `course-copy-test.js` 23.

## The bug the brief predicted, and the one it did not

The brief said to fix `renderDecks` before anything else, because it opened
with `var url = safeDeckUrl(d.url); if (!url) continue;` and cyber decks have
no `.pptx`. That was right, and it was worse than "the panel renders empty":
`renderError` calls `renderLocked` first, so an entitled, paying cyber teacher
would have been shown the **AP CSP** upsell on a cyber page. Not a blank box,
an accusation that they had not paid, naming a bundle that would not have
unlocked the page anyway.

Fixing it surfaced the same shape twice more, both invisible on CSP:

- The dispatch had two branches. Entitled-with-decks rendered decks; everything
  else rendered the upsell, which silently included **entitled with zero
  decks**. On CSP that state cannot occur, because every deck always carries a
  `.pptx` so the list is never empty. On cyber it is the state of every lesson
  until its decks are converted, which today is all of them. There is now a
  third branch that says the decks are being prepared and offers no bundle link.
- The bundle name and link were a single constant. Cyber's bundle is a
  **product** (`/products/ap-cybersecurity-founding-teacher-bundle`,
  `AP-CYBER-FOUNDER-2026`), not a page, so the link shape differs too.

The pattern worth keeping: **a course difference does not announce itself.**
Each of these renders cleanly, logs nothing, and returns a correct API
response. The only thing that catches them is an assertion written from the
second course's point of view.

## Units 3, 4 and 5 are not "missing decks"

Every one of their 15 lessons has exactly one deck, named `Day1_Deck_*`. That
reads as 15 lessons missing their later days, and converting on that assumption
would have been wrong.

Lesson 3.1's deck says **"DAY 1 OF 1"** on its title slide, runs to **"Slide 22
of 22"**, and covers all three of the topic's learning objectives. Its
`Teacher_Guide.docx` says **six class periods**.

So for those units the deck is a whole-lesson deck.

> **Corrected 2026-08-26.** This section originally went on to say the guide
> "paces those same 22 slides across them: Day 1 is slides 1-7, Day 6 is slides
> 21-22", which reads as though the guide were a usable split plan. It is not.
> `docs/runs/2026-08-26-claude-code-cyber-unit3-slide-day-map.md` checked all
> five Unit 3 guides against all five decks slide by slide: the numbers run 1 to
> 22, but the content at those numbers is not what the guide says is there, and
> two different numbering conventions are in use within the one unit. The
> conclusion below (do not wire these lessons) is unchanged and that note
> confirms it. What was wrong was treating a day count as a plan. I had read one
> guide and one deck and generalised from them; the correction came from reading
> all ten. Also from that note: 3.4's title slide reads DAY 1 OF 2, so the badges
> are not uniform either. Listing one would report `days: 1` for a topic that runs six
periods and label a 22-slide deck "Day 1". They stay out of the manifest until
real per-day decks exist, which is one line per lesson and no code change. The
generator refuses a row naming one, with its own message rather than a generic
bad-key error, because the fix is to widen the manifest deliberately.

**Counting the files would have got this wrong. Reading one settled it.**

## Verified

- Enumeration read from Drive directly, not from any script's report:
  9 lessons, 35 days, 70 decks. Unit 1: 5/14/28. Unit 2: 4/21/42.
- Both fixes were confirmed to **fail on the code they replaced**, rather than
  passing for the wrong reason. Reverting just the `!url` guard fails 3
  assertions and the suite cannot find a deck to click; removing just the
  pending branch fails 4, with the panel reading "Sign in with the teacher
  account that holds your bundle access" to a paying teacher.
- The Apps Script's enumeration is exercised against a stubbed Drive tree
  shaped like the real one: 70 decks found, Units 3-5 skipped, `STUDENT` casing
  matched, a CSP-cased `Student` file proven not to match.
- CSP suites still green after the shared-route change: `smoke:cspslides` 26,
  `smoke:cspembeds` 49.
- **The API deploy was verified from the live endpoint, not from a report.**
  After #342 merged and Railway redeployed:

  ```
  GET /api/slides/ap-cybersecurity/1-1 -> 200
     {"days":2,"tracks":[],"locked":true,"decks":null}   0 docs.google.com
  GET /api/slides/ap-cybersecurity/3-1 -> 404   (Units 3-5 correctly unwired)
  GET /api/slides/ap-csp/1-1           -> 200   (no regression)
  ```

  The empty `tracks` array and the 404 are the two things that would have been
  wrong if the manifest registry had not taken effect, so they are the ones
  worth reading.

## The conversion, and the four runs it took

Written up here because the log line that exposed it is the only thing that did.

- **Run 1: `ReferenceError: Drive is not defined`, all 70 failed.** The
  Advanced Drive Service was not enabled, and `DriveApp` cannot convert a
  `.pptx`. The Logger said only "converted 0, failed 70"; the actual error was
  in the sheet's status column. PR #376 adds `preflight_()`, which throws with
  the enabling steps before a folder, a sheet or 70 rows of identical errors
  exist, plus `clearStaleRows_()` so a failed run does not poison the resume.
- **Runs 2, 3 and 4 each converted all 70 again.** About 209 Google Slides
  files where 70 were wanted, roughly three copies of each deck, confirmed in
  Drive at 21:52, 22:01 and 22:07 by identical sizes. Nothing errored. The only
  symptom was one line:

  ```
  work list: 70 deck(s) to convert, 70 already done, 70 total
  ```

  which cannot be true at once. Every lesson id in Units 1 and 2 is also a
  valid month-day, all nine of them, so Sheets parsed `'1-1'` on write and
  `getValues()` handed back a Date. The resume key became
  `Thu Jan 01 2026 00:00:00 GMT-0500 (EST)|1|STUDENT` and matched nothing.
  PR #381 formats column A as plain text so a new sheet never coerces, and
  `normLesson_` recovers the id from a Date so an already-written sheet
  resumes rather than having to be discarded.
- **CSP was not affected.** `config/csp-slide-embeds.js` holds 224 ids and 224
  unique ids, and the generator refuses duplicate deck slots, so it could not
  have written that file from a coerced sheet. Checked rather than assumed,
  because CSP lesson ids have the same shape.
- **Recovery.** The `AP Cyber Slides (converted)` folder was moved to Drive
  trash, taking the poisoned sheet and all ~209 copies with it. `outputFolder_`
  resolves by name via `getFoldersByName`, which excludes trashed items, so the
  next run creates a fresh folder and a fresh sheet. `start()` clears its own
  continuation triggers on completion, so nothing was queued behind it.

Nothing incorrect could have reached the site in the meantime:
`scripts/cyber-slide-embeds-from-csv.js` refuses a sheet with duplicate deck
slots outright. That guard was written for a different scenario, a shared id
across variants, and caught this one for free.

## Still open

- **The conversion is being re-run** from a clean folder with the PR #381
  script. Until it lands and the generator writes
  `config/cyber-slide-embeds.js`, every cyber lesson reports zero decks to an
  entitled teacher. That is a working state by design, and it is what the
  pending branch renders.
- **No screenshots yet**, at either width. The CSP build found two real defects
  that passed every DOM assertion and were only visible in a picture. Nothing
  here has been photographed, because there is nothing to photograph until
  decks exist. Do not call this done without it.
- **Cyber pages carry no `[data-apcs-slides]` container.** The gate self-mounts
  on CSP lesson pages via `CSP_TOPICS`; cyber has no equivalent, and cyber page
  slugs are inconsistent across units (ledger #81). Adding containers is a
  Matrixify page-body change and is out of scope for these repos by convention.
- **Theme deploy direction is still inverted.** The connected branch
  `claude/site-linking-audit-yhufjk` is 15 commits AHEAD of `main`, up from 2 at
  the CSP run. `CLAUDE.md`'s merge-to-main-then-fast-forward would rewind the
  live theme. Both theme PRs targeted the connected branch directly, so both
  deployed on merge. The real fix is repointing the theme at `main` in Shopify
  Admin, which needs a person.

## Learned

**"Missing" and "shaped differently" look identical in a folder listing.** The
only thing that separated them was opening a deck and a teacher guide. One read
changed the scope of the build.

**A bug's blast radius is not always where the guard is.** The `!url` guard
dropped decks; the damage was done three functions away, where the empty result
fell into a branch that renders an upsell. Worth asking, of any silent-failure
fix, where the empty case actually lands.

**A second course is a test oracle.** Every defect found here was a
single-course assumption that had been sitting in shipped, working code. None
of them were introduced by this port; all of them were revealed by it.

**A PR captures the commits that exist when it is merged, and no others.**
This happened twice in one evening, which is why it is written down rather than
noted.

The theme work was two commits. #79 merged at 20:44Z; the second was pushed at
20:47Z. It landed on the branch, the branch was that PR's head branch, and it
shipped nothing, because the PR had already closed. The fix was a second PR
(#81) for the remainder, since a merged PR cannot track new work.

Then it repeated on the API side, and the stranded commit was THIS SECTION: the
note recording the first occurrence was pushed seconds before #342 merged, and
the merge captured everything except it.

Nothing warns you in either direction. The push succeeds, the branch looks
correct, `git status` is clean, and the merged PR reads as done. Both times it
surfaced only from asking a different question than "did my push work":

- for the theme, comparing the LIVE asset byte for byte against the MERGED
  commit rather than against the branch;
- for the API, running `git merge-base --is-ancestor <sha> origin/main` per
  commit rather than trusting that the branch had been merged.

Two habits fall out. Push everything before asking for a review, not after. And
after any merge, verify per commit against the merged result, because the branch
and what actually shipped are exactly the two things that silently diverge.

**Commit the handover script.** The CSP Apps Script was pasted into a chat and
is gone, so this one was rewritten from its description. `scripts/
cyber-slides-conversion.gs` is in the repo, and its enumeration has a suite.

**An impossible log line is worth more than a correct one.** "70 to convert, 70
already done, 70 total" is self-contradictory, and it was the entire diagnosis.
That line exists because a pasted CSP log once claimed a completion whose
timestamps could not have been real, and it was added so such a log would be
checkable. It earned its place a second time on a bug nobody anticipated. When
a run has a resume step, print both sides of the comparison, not the verdict.

**A spreadsheet is a typed store pretending not to be one.** `appendRow('1-1')`
does not store `'1-1'`. Every id in scope here happened to be a valid month-day,
so the coercion was total rather than partial, which is the only reason it was
ever noticed; one id in nine converting would have looked like a flake. Any key
that round-trips through Sheets needs the column formatted as text on write AND
a normaliser on read, because the first protects new sheets and only the second
rescues the ones already written.

**A guard built for one scenario is worth checking against the new one.** The
generator's duplicate-slot refusal was written for a shared id across variants.
It is the reason a triple-converted sheet could not produce a config, so the
blast radius of four bad runs was some wasted Drive quota and no site impact.
Worth asking, after any incident, which existing guard held and why, because
that is what tells you where the next one should go.
