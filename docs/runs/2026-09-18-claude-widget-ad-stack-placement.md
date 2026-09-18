# The pill was where the ads live

2026-09-18, the same evening the Site Assistant went live. Tanner set
`REPORTS_TO`, filed a report, it arrived, and then: "Very difficult to click
with ads on footer banner and sticky video in bottom right corner."

## What was actually in that corner

Guessing an offset would have been quick and wrong, so the first move was to ask
his browser what occupies the bottom of the page. Headless could not answer it:
ad slots do not fill in a scripted Chromium, so the corner came back empty and
only `body.adthrive-device-desktop has-banner` was there to prove ads exist at
all. One paste into his console, at 1365x911:

    DIV#AdThrive_Footer_1_desktop   [0, 811, 1350, 100]   z 1000001      fixed
    DIV.raptive-sales               [0,   0, 1350, 911]   z 2147483645   fixed
    DIV.celtraCloseButton...        [1318, 820, 42, 42]   z 2147483647   fixed
    NAV#apcs-nav                    [0,   0, 1350,  60]   z 999999       fixed

Three things, and only one of them was the thing he described.

**The footer banner is FULL WIDTH.** So `bottom: 18px` was underneath it on the
left as much as the right, and "move it to the other corner" would have fixed
nothing. The lift was the necessary half.

**The ad's own close button sits in the bottom right corner at the maximum
z-index.** The pill was not merely near the sticky video, it was on top of the
control a person needs to dismiss an ad. Moving off that side is right
independently of clickability.

**`raptive-sales` covers the entire viewport at a z-index above ours**, which
looked like the answer and was not. Measured directly: `elementFromPoint` at the
proposed position returns `apcs-assistant-root`, so clicks reach us at the
existing z-index and raising it changes nothing. z-index orders siblings within
a stacking context, and that number is not comparable to ours.

## Why the lift is probed and not a number

120px is correct for this banner at this viewport. It is wrong on a phone, where
the same banner takes a far bigger share of a short screen, and wrong again the
next time AdThrive changes its layout, which is not a surface this repo controls.

So `placeWidget` asks the browser the question that actually matters, would a
click here reach us, and steps up until the answer is yes. It re-runs at 1.2s, 4s
and 9s because ad slots fill well after load, and on resize.

That approach also sidesteps a trap plain geometry walks into. A rectangle check
would see `raptive-sales` covering every point on the page and send the pill to
the ceiling. `elementFromPoint` knows about stacking contexts; arithmetic does
not.

The pill stays at z-index 2147483000, below the ad close button, on purpose, with
an assertion enforcing it. Winning that fight would mean covering the button
somebody needs to close an ad, which is a worse bug than the one being fixed.

## Both anchors, not one

`.btn` and `.panel` are separate `position: fixed` rules. The first attempt moved
only the button, so the pill sat bottom left and its own menu opened bottom
right, at the far end of the screen. Tanner's word for it was "weird", which it
was. The panel now follows the button and is placed relative to it.

## What the mutation battery found, which was mostly my own tests

Nine mutations, each caught by the assertion aimed at it. Getting there took
three rounds, and the two failures are the useful part.

Both hollow assertions had the same shape: a regex over the whole source file
matching MY OWN COMMENT rather than the code.

- "the lift is probed" grepped for `elementFromPoint`, which appears in the
  paragraph explaining why we probe. Replacing the probe with `bottom = 120` left
  it green.
- "does not outrank the ad close button" grepped for `2147483647`, which appears
  in the measured table above. It went red on documentation.

Making the first one behavioural exposed something worse than a weak assertion.
The DOM shim had no `getBoundingClientRect` and no `contains`, so `placeWidget`
threw on its first probe, the `try/catch` swallowed it, and **the placement had
never been exercised at all**. Every placement assertion up to that point was
reading source text and calling it behaviour.

The test now boots the widget against a shim whose `elementFromPoint` reports a
100px covered strip and requires the pill to climb out of it, with a
clear-viewport case beside it so a hardcoded lift fails the other way.

## Evidence

    suite     smoke:assistantwidget          82 passed, 0 failed (was 71)
              assistantrouting 87, assistantreport 95, assistantmorning 59,
              encoding 54, all green
    mutation  9 mutations, each caught by the assertion it targets
    live      api 0f180bc -> 91893a1, theme merged as d9b7a1b
              /api/assistant/widget-version  9bc7cac7acde -> dd9660209aff
              lesson and course pages serve ?v=dd9660209aff, old token gone
              the file served AT the new token is byte-identical to the repo,
              cf-cache-status MISS, and carries left:18px on both rules,
              placeWidget, and the resize handler

## The two-choice menu was correct

His screenshot showed "Report a problem" and "Help me find a page" with no
"Suggest something", which looked like a bug. Checked against the live context
endpoint rather than assumed:

    /pages/pricing                scope=commerce   textStored=true    suggestions=true
    /pages/ap-csa-course          scope=lesson     textStored=false   suggestions=false
    /pages/ap-csa-lesson-2-7-...  scope=lesson     textStored=false   suggestions=false
    /blogs/ap-csa-daily-practice  scope=general     textStored=true    suggestions=true

Lesson scope does not retain typed text, and a suggestion IS its text, so the
option is hidden before anybody types instead of refused after. Working as built.

Worth knowing rather than fixing: that means a teacher reading a lesson has no
way to suggest an improvement to it from that page, because lesson scope is most
of the site's content. That is the PII posture doing its job, and widening it is
a decision rather than a patch.

## Not verified

Nothing rendered, again. The live checks assert what the storefront SERVES.
Chromium here will not trust the agent proxy's CA and the only way past that is
disabling certificate verification. Whether bottom left LOOKS right is Tanner's
call and no check settles it. Phone width is unchecked: the probe should produce
a bigger lift there, which is the whole point of probing, but nobody has looked.

## Open

- `ADMIN_READ_KEY` is still not on the Claude Code environment, so the morning
  review stage exits 2 every day.
- The snippet comment still says 62 pages carry a test word after a hyphen;
  counted against the sitemap it is 56. Harmless, rides the next change to that
  file.
