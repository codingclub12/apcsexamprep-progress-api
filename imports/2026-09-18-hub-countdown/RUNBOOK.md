# The CSA hub countdown, 2026-09-18

One sheet, one page, one attribute, seven characters.

## What the page says right now

`/pages/ap-csa-exam-prep-hub` carries its own countdown:

    <span class="hub-section-head">Quick Access —
      <span id="hub-countdown" data-exam-iso="2026-05-15T12:00:00">Exam coming up</span>
    </span>

and, further down, the script that fills it in:

    if(diffMs<=0){ text = (-diffMs/36e5 < 6) ? 'Exam in progress — good luck!'
                                             : 'Exam complete — great work!'; }

The target passed on 15 May. Rendered in Chromium on 2026-09-18 against the
live stored body, that header reads:

    Quick Access — Exam complete — great work!

to every student landing on the CSA hub, eight months out from their exam. It
has read that way since mid-May.

## Why the September pass missed it

That pass rewrote eleven visible strings on this page and never looked inside an
attribute value. The generator's own stale-year check could not have told me
either: `2026-05` matched its school-year span rule, expanded to `2005`, failed
the "two consecutive years" test, and was then STRIPPED as a span, so the bare
`2026` never reached the standalone scan. The page came back clean. Every ISO
date on every page was invisible the same way.

`scripts/body-year-csv.js` now judges ISO dates first and against the clock,
with the schema.org authored-date keys as the only exemption. Eight mutations
sit behind that rule, none of them hollow.

## What the sheet does

Exactly one thing:

    data-exam-iso="2026-05-15T12:00:00"  ->  data-exam-iso="2027-05-12T12:00:00"

Parsed back as CSV and diffed against the live body character by character: one
differing run of seven characters at offset 36339, `6-05-15` to `7-05-12`. The
body is 79,814 characters before and after. Nothing else moved.

Wednesday, May 12, 2027, Session 2, which is noon local for most schools. Both
halves are first-party and in this repo:

    docs/ced-snapshot/csa-exam.txt:62    Wed, May 12, 2027 | Session 2
    docs/ced-snapshot/exam-dates.txt     Session 1 and Session 2 ... morning and
                                         afternoon ... 8 a.m. ... and 12 p.m.

`npm run smoke:bodyyear` rebuilds the target from those two files rather than
trusting the constant, so the two cannot drift again.

## Import and check

    node scripts/body-year-csv.js /tmp/recheck     # expect: nothing to import

Run that FIRST. A sheet is worth the bytes that were validated, and if somebody
has already fixed this page the generator will say so and there is nothing to
import. Then import the one sheet, then:

    node scripts/verify-body-year-live.js ap-csa-exam-prep-hub

Expected end state: the Quick Access header reads **Exam in 33w 5d** on
2026-09-18, counting down rather than congratulating. That number shrinks by a
day per day, so the check is "a countdown, and the right day", not the literal
string.

## Not in this sheet, on purpose

- **`ap-csa-topics` is still waiting**, from `imports/2026-09-18-topics-h1/`.
  Regenerated today against the current live body and byte-identical to the
  sheet already handed over, so that one is still good to import as it stands.
- **The Title field still reads `AP Computer Science A Exam Prep (2026-2027)`.**
  That span is current and true, so it is not stale; it is only inconsistent
  with the other five hub pages, which had their year dropped. A rename is a
  separate one-row title sheet and a separate decision.
- **The visible copy does not gain a start time.** The seed's header explains
  why the September pass dropped it and records that the session IS now
  sourceable. Re-opening copy on a page imported today to add a sentence is a
  different change from fixing a countdown.
