# 2026-09-03, claude-code: the 1.1 lab's Check buttons were invisible

Board #202. Follows #198 and #201.

## What was wrong

`ap-cyber-unit-1-lesson-1-lab` reads ten CSS custom properties and declares none
of them. Not one. The page has two `<style>` blocks and 118 custom properties
defined by Shopify's own theme, and not a single one of the ten the widget wants.

An undefined `var()` is invalid at computed-value time, and the part people get
wrong is what that does: it drops the WHOLE declaration, not just the colour. So

    .check-btn{ background:var(--purple); color:#ffffff;
                -webkit-text-fill-color:#ffffff; }

keeps both white text declarations and loses its background, and the card behind
it is `.lab-section{background:#ffffff}`. White text on a white card. Chromium
computes the button's background as `rgba(0, 0, 0, 0)` and its box as 196x36, so
it is there, it is clickable, and you cannot see it.

Five of the six `.check-btn` elements on the page were invisible: the four
"Check Email #N Analysis" buttons and "Continue to Quiz". The sixth, "Back to
Exercise 2", survived only because `.nav-btn-back` sets its own background.

The same mechanism took out things nobody had reported, because a dropped
declaration is silent:

    .analysis-field select, textarea   border:1px solid var(--purple-border)
                                       the shorthand is invalid, so border:none.
                                       Six answer fields with no visible edges.
    .exam-tip                          background and the 4px left accent, gone
    .email-specimen                    its grey fill and 2px border, gone
    .feedback.correct                  green background and border, gone
    .score-bar .score-num              the purple pill behind "0 / 24 pts", gone

Screenshots of both states are in the session; the before is a form with six
unmarked fields and a blank gap where the button should be.

## Why it matters more than a cosmetic bug

Michelle's class (CYBER-T5KR) had 27 of 32 students blank in the 1.1 Lab column.
That was already established as "they have not finished all four emails", since
the widget only reports once all four are checked. This is why they had not: the
button that checks an email could not be seen, and neither could the link out of
the lab. Five students scored, which fits: the button still takes a click and
still shows a pointer cursor, so a determined student finds it.

That last step is inference, not measurement. What is measured is the invisible
button and the 27 blanks. Nobody asked the students.

## The fix

One rule inserted at the top of the widget's own style block, declaring the ten
properties on `#cyber-lab-11`. 623 characters. Nothing else in the body moves,
and the generator proves that by stripping the inserted block back out and
requiring the original bytes.

The values were recovered, not chosen. Two sources agree independently:

1. The sibling Unit 1 activity pages declare the same palette on their own
   wrapper (`#cyber-ex1-12`) and are live and correct today. The 1.1 lab's own
   header comment says "Purple theme matching course hub + all lesson pages",
   so a palette was always the intent.
2. This page's surviving `rgba()` literals, written beside the `var()`
   references and never dependent on them: `rgba(107,33,168,0.15)` is the focus
   ring sitting next to `border-color:var(--purple)`, and 107,33,168 is #6B21A8.
   Same for #7C3AED, #A855F7 and #1E1B4B.

Note the theme repo's `sections/custom-liquid.liquid` defines `--purple:#3b0764`
for something else entirely. That is a different component's palette and it is
the wrong value here, which is the reason the corroboration was worth doing
rather than grepping for the name and taking the first hit.

## Evidence

- **suite**: `npm run smoke:lab11palette`, 13 assertions, green. Picked up by
  the Tests workflow automatically, since it enumerates `smoke:*`.
- **mutation**: seven cases, each required to refuse for its OWN message.
  Two were real finds and both are recorded in the test file. The first
  "is there a `<style>` block" guard passed a body whose widget block had been
  deleted, because a second block was still present and the generator wrote the
  palette into the activity nav instead. And the first mutation written for that
  case swapped `<style>` for `<stylex>`, which `/<style[^>]*>/` matches, so it
  read like a hollow guard when it was a hollow mutation.
- **rederive**: the body was pulled two ways, from the Admin API and by
  `scripts/extract-live-body.js` off the rendered page, and diffed. See below.
- **live**: pending the import. The assertion is that
  `/pages/ap-cyber-unit-1-lesson-1-lab` serves `#cyber-lab-11{--purple:#6B21A8`,
  which is false today.
- Chromium, headless, on the exact cell the sheet will import:
  `button.background` `rgba(0, 0, 0, 0)` before and `rgb(107, 33, 168)` after;
  `textarea.border` `0px none` before and `1px solid rgb(221, 214, 254)` after.
- `matrixify-preflight` on the file that will be uploaded: clear to import,
  1 emoji and 63 non-ASCII characters carried through from the live body and
  none added.

## The thing worth remembering

**Do not build a Matrixify sheet for this page from a scrape.** Cloudflare's
email obfuscation rewrites the page at serve time, and this is a phishing lab, so
the four specimens are made of email addresses. Every `From:` and `To:` comes
down the wire as

    <a href="/cdn-cgi/l/email-protection" class="__cf_email__" ...>[email&#160;protected]</a>

A sheet built from the rendered page imports that and destroys the content the
lab teaches from. The rendered body is 60,869 bytes against the Admin API's
59,734, and the entire difference is those eight addresses plus Cloudflare's
decoder script.

`extract-live-body.js` is honest about being a convenience and says the Admin
API is still the authority. This is the case that shows why, and it is not
covered by the checks the generators run: the scraped body is valid HTML, passes
mojibake, passes the em-dash rule, and looks fine.

## Scope

All 108 cyber activity pages were fetched and checked for custom properties used
but never defined. One is affected. The other 107 declare their palette.

The first pass of that survey reported the same answer for the wrong reason: it
looked only inside style blocks carrying a `#cyber-*` wrapper, which is a Unit 1
naming convention, so it examined 18 pages and skipped 90. It happened to
contain the defect. The second pass compares used against defined across the
whole page and assumes nothing about wrappers.

## Still open

- The sheet is generated and preflighted. It has not been imported, and the live
  check cannot run until it has.
- Nothing in CI or the sweeps looks for an unresolvable custom property, so this
  class of defect would come back silently. Filed as a board task; the check is
  about fifteen lines and the survey script is the prototype.
- A teacher filtering the gradebook to Quizzes still sees Lab columns. Both
  surfaces agree with each other, so it is a UI decision rather than a bug.
