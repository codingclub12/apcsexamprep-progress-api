# 2026-08-25 claude code: the CSP Teacher Bundle decks become inline Google Slides

Follows `2026-08-19-claude-code-csp-slide-gate.md`, which built the gate and
listed this conversion as queued. It is now done.

## What was asked

Embed the by-day decks in the lesson pages instead of making a teacher download
a .pptx, with the lock unchanged: only a paying teacher or their students can
reach them.

## What shipped

- **224 decks converted** to Google Slides, from the copies already in Drive.
- **`config/csp-slide-embeds.js`** (this repo, PR #305): the generated id map.
- **`scripts/csp-slide-embeds-from-csv.js`** (PR #262): turns the conversion's
  output sheet into that config, and refuses when the sheet is wrong.
- **`assets/apcs-slides-gate.js`** (theme, PR #74): renders a deck inline.
- **One legibility fix** (theme, PR #75, open at time of writing).

## The conversion could not be done by Claude, and that is worth recording

Two limits, both tested rather than assumed, because both look like things an
assistant should be able to do:

- The Drive connector's `share_file` takes an email address and a
  reader/writer role. The `anyone` permission type is unreachable through it:
  `share_file(emailAddress:"anyone")` returns "Request contains an invalid
  argument" and leaves permissions unchanged.
- Uploads travel as base64 inside tool calls. 72.4 MB of decks is roughly 25M
  tokens.

So the work was handed over as an Apps Script that runs in Tanner's own
account, where both operations are ordinary. It writes an `AP CSP Slides Map`
sheet, which Claude then reads back out of Drive directly. That split is the
reusable part: **the agent does the parts that need judgement, the script does
the parts that need the user's own credentials.**

## Why a file id is treated as a credential

The converted decks are shared "anyone with the link". That is not laziness. A
paying teacher is gated on their APCSExamPrep teacher token, not on a Google
account, so Google itself cannot do the gating; restricted sharing would lock
out exactly the people who paid.

The consequence is that **holding the id is holding access**, precisely as much
as the .pptx URL it replaces. Everything the gate already guaranteed for those
URLs applies unchanged: `routes/slides.js` is the only thing that may disclose
one, never page HTML, and the locked path is asserted against the raw response
text rather than a parsed field.

This got sharper once the decks were readable. A teacher deck carries per-slide
speaker notes, timing cues, cold-call prompts and misconception alerts that the
student deck does not. As a .pptx, leaking one leaked a file somebody still had
to open. As Slides, it is one click from rendering. **The gate is worth more
after this change than before it.**

## The failure mode the generator exists to stop

Most bad spreadsheet input is boring. One shape is not: a file id landing on
the wrong deck slot. If a student-labelled row carries the teacher deck's id,
the variant filter in `routes/slides.js` is still running *and* still bypassed,
because it is correctly filtering to student rows and handing over a teacher
deck anyway. Nothing downstream catches it, since everything downstream trusts
the label.

So the generator splits its checks by consequence. Duplicate ids, duplicate
slots, unknown lessons, days beyond a lesson's day count and malformed ids all
refuse to write. A missing row only warns: that deck stays download-only, which
is the pre-existing behaviour, so **an interrupted conversion is a working
state rather than a broken one**. It defaults to dry-run; `--write` is opt-in.

The day-count guard earned its place conceptually: it means Drive holding a
deck the manifest has never heard of is a hard failure rather than something
that quietly appears on the site.

## Verified

Not by the script's own report. `report()` said 224 OK; that was checked
against primary sources instead:

- The converted files exist in Drive, and the last CSV row's id resolves to the
  file actually titled `AP-CSP_5-6_Day2_Deck_TEACHER_DeepDive`.
- **Sharing genuinely took**: embed URLs return HTTP 200 from a container
  holding no Google credentials. An unshared file would 404 there regardless of
  what the sheet claimed.
- **Content survived**, not just structure: `1-1 Day1 Student CB` has all 18
  slides with text, tables and CED citations. A deck converted to blank slides
  would pass every structural check in the pipeline.
- **Teacher and student decks are genuinely different content**, confirmed by
  reading both.

Suites: `smoke:cspembeds` 47, `smoke:cspslides` 26, plus 60 browser assertions
in the theme (`content/csp-teacher-slides-gate/viewer-test.js`) run against the
**live minified asset** on the **live page HTML**, not just against source.

## Learned

**A script's own summary is not evidence, and its timestamps can lie.** A
pasted log read `converted OK: 224` one minute after `nothing recorded yet`.
224 conversions cannot happen in 61 seconds, and the log had no `work list:`
line, which `run()` always emits first. Drive settled it: the output folder was
created at 18:21Z and the last deck written at 18:41Z. The run was real and the
pasted line was simply out of order. Reading Drive took less time than
reasoning about the log.

**One iframe, not eight.** A lesson can have eight decks. Eight Slides iframes
per page is real weight for a component almost nobody opens all of, on school
wifi. There is a single viewer, built on first click and re-pointed after.

**`all:initial!important` silently voids the rest of its own rule.** The gate
panel had been rendering with no background, padding or border since it
shipped, so its dark heading sat invisibly on a dark lesson page. Importance
beats source order, so every plain declaration in that block lost to the reset
above it. `display` already carried `!important`, which suggests somebody hit
this once and fixed only the property in front of them. Found by screenshotting
rather than by reading, and confirmed pre-existing by measuring
`getComputedStyle` on the old asset too, which is what ruled out the new work
as the cause.

**The theme deploy branch has flipped direction.** `CLAUDE.md` says merge to
`main`, then fast-forward the connected branch. As of this run the connected
branch is 2 commits AHEAD of `main` and `main` has nothing it lacks, so that
command would rewind the live theme and drop PR #72. Both theme PRs here
targeted `claude/site-linking-audit-yhufjk` directly. **Check the direction
before trusting the documented procedure.**

**Railway lag looks like breakage and usually is not.** The API sat ~96 minutes
behind main after the ids merged. Deploy-drift had already failed at 18:41Z and
19:07Z, both before that merge, and the merged code booted cleanly when run
locally. It caught up on its own. Establishing that the stall predated the
merge took one check and prevented a pointless "fix".

## Still open

- **The 556 `.docx` files remain ungated**, including 222 `_KEY_` links.
  `AP-CSP_1-1_Quiz_KEY_k7q2m9.docx` still returns 200 to anyone. Decks are now
  gated twice over while the answer keys stay public, which is the more
  sensitive half. Raised repeatedly across runs; no decision.
- **Old .pptx URLs still resolve.** Removing a link does not unpublish a
  Shopify file. Revoking means re-uploading under new names.
- **`main` and the theme's connected branch need reconciling**, deliberately
  and not as a side effect of a feature. The real fix is repointing the theme
  at `main` in Shopify Admin, which needs a person.
- **PR #75 is unmerged** at time of writing. Until it lands the panel is
  functional but hard to read on lesson pages.
- **Only AP CSP.** No other course has by-day decks.
