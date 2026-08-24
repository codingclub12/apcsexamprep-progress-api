# Device Security Analysis practice sets

2026-08-24. Task #113, claim #20.

## Why this exists

The AP Cybersecurity exam has exactly ONE free-response question. It is always
called Device Security Analysis, it always gives several sources from a single
device, and it always asks parts A to E. Fifty minutes, Skill Categories 2 and
3. That is from the CED, recorded in `docs/cyber-exam-format.md`.

Nothing on the site practised it. The practice exam page carried three
free-response questions in a prose-scenario style that the exam does not use,
and the course budgeted ten FRQ days against material that did not exist.

Two full sets now exist, in the exam's own shape.

## The two sets, and why they are different on purpose

| | `dsa-library-kiosk` | `dsa-athletics-laptop` |
|---|---|---|
| device | public catalogue kiosk | school athletics laptop |
| part B attack | username enumeration, one failure each across ten usernames | brute force, nine failures against ONE account, then success |
| part D block | inbound RDP, denied by rule 8 | outbound FTP, denied by rule 6 |
| part E attack | persistence: backdoor appended to a cron-run script | exfiltration: archive uploaded over HTTPS, then history cleared |
| part C file | world-WRITABLE executable | world-READABLE credentials |

A student who did the kiosk set must not be able to pattern match through the
laptop set. Telling enumeration from brute force, and reading the direction
column rather than assuming inbound, IS the skill.

Each set: 6 sources, 5 parts, 14 subparts, every subpart carrying a sample
response and its credit points.

## Zero PII shaped the whole design

A free-response question asks a student to write. Free text typed by a student
is exactly what this repo does not store, with one named exception that is not
this. So these are self-scored: the student writes wherever they like, reveals
the sample, and marks themselves against the credit points.

`public/frq-player.js` makes exactly one network call, a GET for the spec. No
POST, no PUT, no XHR, no sendBeacon, no form submit. `smoke/frq.js` fails the
build if any appears, checking the code with comments stripped rather than the
file as text, because the header comment mentions the very APIs it forbids.

The self-assessed tally stays in the page and reaches no gradebook. A number a
student chose for themselves is not evidence, and the cyber denominators in
`docs/cyber-denominator-gaps.md` are not a place to put one.

## Evidence

`npm run smoke:frq`: 51 passed, 0 failed. Includes mounting the real player
under a DOM stub and rendering both sets, and seven checks that the validator
actually refuses a malformed set rather than merely claiming to.

Content is cross-checked, not asserted: the row range Part B cites must exist in
that set's auth log, the adversary IP in B(ii) must appear in the log, and the
file named in the Part C chmod answer must exist in the file listing.

Full suite: 93 offline suites, none failing.

Local boot:

```
GET /api/frq                                    200, two sets, spec_errors []
GET /api/frq/ap-cybersecurity/dsa-library-kiosk 200, 19498 bytes
GET /api/frq/ap-cybersecurity/nope              404
GET /frq/ap-cybersecurity/dsa-library-kiosk     200
GET /frq-player.js                              200
```

## Still open

- **The theme injector will vandalise these pages.** `layout/theme.liquid`
  injects AP CSA Java navigation and CTAs into ANY page whose URL contains
  "frq". Both handles do. `scripts/frq-pages-csv.js` prints a warning rather
  than shipping silently, and the fix is a theme change to the injector's
  skipPages list. Do that BEFORE importing the sheet.
- The practice exam page still carries its three prose-scenario FRQs. They are
  not wrong as practice, but they are not this format. Whether to reshape or
  retire them is a content call.
- Two sets is a start, not a library. The format is now a spec file, so a third
  is authoring plus a regenerate.
