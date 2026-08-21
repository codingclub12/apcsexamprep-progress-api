# Cyber pages: the pills that were not buttons, and the Unit 3 crosswalk

2026-08-21. Task #103, claim #10.

## What was wrong

**The pacing pills.** Each unit on `cyber-command-center` ends with three chips
(free-response days, lab days, test days). They are `<span class="wp">` and
navigate nowhere, but `.wp` carried a background, a border, a 9px radius and 8px
padding: the same visual language as the `.mat` buttons in the teacher-materials
row directly above them. Teachers were clicking them. The page was making a
promise its markup could not keep.

**Unit 3 is numbered two ways at once.** The site teaches six lessons; the CED
has five topics in a different order. The Command Center already handled this
(a unit note plus a `ced:` tag on every lesson). The complete course guide did
neither, and was worse than silent: its unit description is numbered BY CED
("3.4 Protecting Networks: Firewalls") while the lesson list below it is numbered
by teaching order ("Lesson 3: Firewalls & ACLs"), with nothing saying these are
two different numbering systems.

**A stale title, found on the way.** The guide called lesson 6 "Incident
Response". The live page `ap-cyber-unit-3-lesson-6` is "Network Security Policies
& Wireless", and the Command Center agrees with the page. The guide was the odd
one out, so the guide changed. A crosswalk that restated the stale title would
have published the error in a second place.

## What changed

`scripts/cyber-cc-clarity.js`, one sheet, two pages.

- Pills render as plain muted text behind a "Days set aside in this unit" label.
  They are NOT made into buttons: there is nowhere to send a teacher yet, and a
  chip that navigates to a thin page is worse than one that does not navigate.
  Wiring them is the change that lands with the FRQ and Labs hubs.
- The guide gains a six-row Unit 3 crosswalk (taught lesson -> CED topic), and
  lesson 6 is corrected.
- The Unit 3 note on the Command Center loses an em-dash, per repo convention.

## Evidence

`npm run smoke:cyberclarity`: 19 passed, 0 failed. Both patchers are idempotent,
both refuse a foreign body, and a drifted chip style is refused rather than
half-patched. `smoke:labs` still 47/0.

Against the live bodies (`cyber-command-center` updatedAt 2026-08-21T01:10:10Z,
guide 2026-08-20T22:41:39Z):

```
cyber-command-center                    +392 bytes, 1/1 script blocks parse
ap-cybersecurity-complete-course-guide  +2243 bytes, 1 h1, 6 crosswalk rows
```

The terminal lab link and the answer key panel both survive the command center
edit, checked explicitly because this sheet rewrites the whole body.

## Still open

- The pills stay inert until the FRQ hub and the Labs hub exist. That is the
  next build, and it is what turns them into buttons.
- The Unit 3 lesson list on the guide uses "Lesson N" while the Command Center
  uses "3.N" for the same six lessons. The crosswalk explains it, but the two
  pages still label the same thing differently.
- Whether any class has reached Unit 2 is UNVERIFIED. `ADMIN_KEY` is not in the
  Claude Code environment by design, so gradebook reads fail closed here. The
  Unit 2+ lab re-pricing plan rests on that fact and it needs a human to read it
  off `/admin`.
