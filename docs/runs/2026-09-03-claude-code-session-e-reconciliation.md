# Session E reconciled against the board and live state

Date: 2026-09-03
Agent: Claude Code
Brief: "Session E: full-length exam, Device Security Analysis FRQ, QOTD" (T-1.6, T-1.7, T-1.8)

## Summary

Two of the three tasks in this brief should not be executed as written, and the
third asks for a convention that does not exist. The brief says "board wins on
conflict", and on all three points the board and live state disagree with it.
No content was shipped. What landed is the independent verification the FRQ work
has been waiting on, and this note.

## T-1.7 Device Security Analysis FRQ: already built, now verified

The brief says "Nobody else is building this. It is the single most defensible
page on the list." It is already built, five times over, and has been for a
while. Board 113, 114 and 115 shipped it and all three have sat in
needs_verification since.

Live now, all returning 200:

    /pages/ap-cybersecurity-frq-athletics-laptop
    /pages/ap-cybersecurity-frq-bluebird-studio
    /pages/ap-cybersecurity-frq-greenhouse-controller
    /pages/ap-cybersecurity-frq-library-kiosk
    /pages/ap-cybersecurity-frq-print-server
    /pages/ap-cybersecurity-frq-practice   (hub, linked from the practice umbrella)

Building to the brief would have duplicated five live pages and cannibalised
their own search results.

The brief's spec is also thinner than what shipped. It names four artifact types;
the live sets carry six sources (firewall rules, authorization log, application
log, file-and-permissions listing, listening services, device policy), parts A
through E, 14 subparts, 50 minutes.

`scripts/verify-cyber-frq.js` is the independent re-check rule 4 allows. It was
written against the raw API payload rather than against anything the builder
asserted, and it passes on all five sets.

### The brief's evidence recipe would have failed a correct page

T-1.7's stated evidence is "page returns 200 and contains the four required
artifact types, each independently asserted". Run that against the live pages and
it fails, because the sources are injected client side: a curl of the kiosk page
finds "Loading the practice question..." and no firewall rules, no logs, no
chmod, no policy text. The content is real and arrives from
`/api/frq/:course/:set_id`. A page-body grep here is a false-negative generator,
which is why the verifier asserts against the API payload by source `kind` and
fetches the page for its status code only.

### Mutation results

Five guards, each broken on purpose and required to go red:

    mut-artifact      demand a source kind that does not exist   RED
    mut-sources       require 7 sources instead of 6             RED
    mut-parts         require parts A-F instead of A-E           RED
    mut-page          request a handle that 404s                 RED
    mut-rubric-strip  delete one subpart's credit array          RED (names A1)

One earlier mutant, replacing the rubric predicate with `true`, came back green
and is recorded here because it looks like a hollow guard and is not. Loosening a
check that already passes on correct data cannot fail; the mutation has to be
inverted so that correct data is forced to fail. `mut-rubric-inv` does that and
goes red on all 14 subparts. A mutation that only widens an already-passing
assertion proves nothing, and reporting it as a hollow guard would have been a
false alarm.

## T-1.6 Full-length exam: the premise is corrected, and the spend is Tanner's call

Board 176 measured this on 2026-09-03 and I re-derived it independently the same
day. `/pages/ap-cybersecurity-practice-exam` renders 40 `data-qid` blocks, and
the page already tells students the real format, in its body:

> The real AP Cybersecurity Exam is built differently: 60 multiple choice
> questions in Section I, and a single free-response question in Section II
> called Device Security Analysis, with a suggested time of 50 minutes.

and again in its FAQ schema. It also says, in its own words, that the set is
"deliberately shaped for study rather than as a replica", and of the three FRQs
that "They are not a replica of the single question you will sit."

So nobody is being told the wrong exam shape. Board 171's symptom was real and its
framing was not, and 176 supersedes it.

Two conflicts with the brief, both material:

- The brief is a REBUILD. Its evidence requires the same live page to return 60
  where it returned 40, which means overwriting a 40-question set that is
  deliberately shaped for study. Board 176 says build the replica ALONGSIDE it.
- The brief sizes this `l` and treats it as urgent. The board has it at size `m`
  in bucket `week`, and 176 says in terms: "Whether to spend that before spring is
  a call for Tanner, and so is whether the replica should be gated."

That is a pricing-and-priority judgement, so it stops here rather than shipping.

## T-1.8 Cyber QOTD: there is no gating convention to mirror, and one engine is down

The brief says "Date-gated: the next day's link must not resolve until that day,
matching the existing convention", and adds: "If gating turns out to be
error-prone in this theme, say so rather than shipping a link that leaks
tomorrow." Saying so.

There is no cyber QOTD today: `/pages/ap-cyber-qotd` and
`/pages/ap-cybersecurity-qotd` both 404. That part of the brief is real, unbuilt
work. What is not real is the convention it says to mirror.

**CSA and CSP are two different engines, and neither gates.** The CSA hub is
server rendered and states plainly: "All 224 questions, unlocked."

**The CSP gate saturated open in May and is moot anyway.** Re-deriving the shipped
arithmetic from `assets/ap-csp-qotd-hub.js` lines 21 to 72:

    START_UTC = 2026-01-06, ROTATION_LENGTH = 121
    dayIndex today (2026-09-03) = 241
    releasedDays = clamp(241, 1, 121) = 121 of 121
    days still gated = 0

A tile opens when `day <= releasedDays`, so every day has been open since roughly
2026-05-06. The clock is also `new Date()` in the browser, so even before it
saturated the gate was advisory: a student who moves their system clock forward
one day gets tomorrow's tile.

**The CSP hub is broken in production right now.** It builds its day list from
`/blogs/ap-csp-daily-practice/articles.json`. That endpoint returns 404, and so
does `articles.json` for all six blogs on the store (ap-csa, ap-csa-daily-practice,
ap-csp, ap-csp-daily-practice, ap-cybersecurity, ap-networking), so this is
store-wide rather than a bad handle. The fetch throws on `!r.ok` and the caller
catches it with a comment that says "fail silently (don't break the page)", so
`mount(days)` never runs and the server-rendered placeholder is what students are
left looking at:

    Today's Question  Loading...   Day 1  Loading...   Click to start

That is an indexed page stuck on "Loading..." for every visitor. It is not on the
board and it is the most consequential thing this session found.

Also noted while reading it: `assets/ap-csp-qotd-hub.js` carries 8 non-ASCII bytes
(em-dashes, curly quotes, en-dashes, and a `*` bullet inside a JS string assigned
to textContent), against CONVENTIONS.md "Pure ASCII files only". And its copy says
"60-day cycle" while `ROTATION_LENGTH` is 121.

Mirroring this engine would have propagated a dead data source and a decorative
gate into a third course.

## What is still open

- Tanner: 60 MCQ replica, build alongside or not, and gated or not (board 176).
- Not on the board: the CSP QOTD hub is stuck on "Loading..." in production. Its
  data source is gone platform wide, so the fix is a new source (Liquid rendering
  the article list, or an API endpoint), not a patch to the fetch.
- Board 113, 114 and 115 have their independent evidence now and need a human to
  click verify.
- Cyber QOTD itself remains unbuilt. It should be specified against what CSA and
  CSP actually do, which is serve everything unlocked, or against a real gate
  decided on purpose. Not against the convention the brief assumes.

## What was learned

An evidence recipe written from a page's intent rather than its delivery can fail
a correct page and pass a broken one. Both happened here in the same brief: T-1.7
greps a page body whose content is injected client side, and T-1.8 asserts a gated
state against an engine that has gated nothing since May and cannot render at all.
Deciding what to check is part of the work, not paperwork attached to the end of
it.
