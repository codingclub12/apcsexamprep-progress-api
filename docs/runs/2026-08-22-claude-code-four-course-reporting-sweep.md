# The other four courses: does graded work actually reach the gradebook?

Date: 2026-08-22
Agent: Claude Code (progress-api)
Ledger: filed #108. Follows #102, #104, #105.
Scope: AP CSA, AP CSP, AP Networking, Intro to Java. Cyber was swept separately
in `2026-08-21-claude-code-cyber-tracker-sweep.md` and is fixed.

## Why this ran

The cyber sweep found 13 broken pages nobody had reported, and the root cause
turned out to be a writer function that was called by two consumers and defined
by nobody. The obvious question was whether the other four courses carry the
same class of failure. They do not, and this records the evidence so the
question does not have to be re-opened from scratch.

## Headline

**No second cyber-scale failure.** Every course's reporter loads on the pages it
is gated to, and every writer that is called is also defined. One concrete
content gap was found (CSA 1.2) and is filed as #108.

The four courses do NOT share cyber's architecture, which is why cyber's failure
modes mostly do not apply:

| course | reporter | how it learns a result | endpoint |
|---|---|---|---|
| AP CSA | `apcs-reporter.js` | `.apcs-ex` widgets carrying `data-item-id` | `/api/progress/attempt`, manifest gated |
| AP CSP | `ap-csp-reporter.js` | the page's own `_activity()` document event | `/api/student/score` |
| AP Networking | `ap-networking-reporter.js` | `apnet:attempt` CustomEvent | `/api/progress/attempt`, manifest gated |
| Intro to Java | `intro-java-reporter.js` | cfu / gap blocks, key held server side | attempt path |
| AP Cyber | `apcs-score-reporter.js` | SCRAPES the score element the page renders | via `APCS_saveLessonScore` |

Cyber is the only one that reads a rendered number out of the DOM. That is why
it was the one that could silently misread a score, and why the other four
cannot fail the same way.

## No second dead writer

The cyber bug was `window.APCS_saveLessonScore`: called, never defined. Every
`window.*` writer called anywhere in `assets/` or `snippets/` was checked
against every writer defined in `assets/`:

    APCS_reportAttempt      defined assets/apcs-reporter.js
    APNET_reportAttempt     defined assets/ap-networking-reporter.js
    INTROJAVA_reportGap     defined assets/intro-java-reporter.js
    APCS_saveQuizScore      defined assets/apcs-tracker.js
    APCS_finalizeQuiz       defined assets/apcs-tracker.js
    APCS_renderHubProgress  defined assets/apcs-tracker.js
    APCS_saveConfidence     defined assets/apcs-tracker.js
    APCS_saveLessonScore    defined assets/apcs-tracker.js   (theme PR #68, today)

Each of the first three is defined in the same file that calls it, so there is
no cross-file handoff to break. `APCS_saveLessonScore` was the only writer
handed across files, and it is the only one that was missing.

## AP CSA: healthy for its pilot scope, one gap

All 53 live lesson pages fetched. **All 53 load `apcs-reporter.js`.**

- 14 pages carry graded widgets, 127 `data-item-id` items between them.
- **All 127 are present in `course_manifest`.** `/api/progress/attempt` rejects
  an unknown `(course, item_id)`, so a typo there is a silently dropped grade.
  There are none. (Checked against the seeded manifest this repo boots with,
  200 ap-csa rows; production seeds from the same script.)
- 39 pages carry no graded widget at all. For Units 2 to 4 that is expected:
  Unit 1 is the pilot and the later units' attributes ship later through
  Matrixify. Those pages are not broken, they are not yet wired.

### The gap: CSA 1.2 has no graded practice at all

Fourteen of the fifteen Unit 1 lessons carry 7 to 10 CFU items. **1.2 Variables
and Data Types carries zero**, measured against 1.3 as a control:

| | 1.2 | 1.3 |
|---|---|---|
| `apcs-ex` | **0** | 77 |
| `apcsa-mastery` | **0** | 34 |
| `cfu` | **0** | 9 |
| `data-item-id` | **0** | 10 |
| page size | 350 KB | 474 KB |

It is a real, full lesson page that simply has no widget block. The reporter
loads and finds nothing to report, so the lesson records a visit and no grade.

`CLAUDE.md` records that "the broken check-answer flows on CSA 1.2 and 1.3
pages" were to be fixed before the pilot. 1.3 was fixed. 1.2 appears never to
have been, or was rebuilt without its widgets. Filed as ledger #108. It is page
Body HTML, so it ships through the Matrixify pipeline, not from this repo.

## AP Networking: fully wired

All 22 lesson pages fetched. **22 of 22 load `ap-networking-reporter.js`, and
22 of 22 carry the `apnet:attempt` signal it listens for.**

`course_manifest` holds 22 visit, 22 cfu, 33 quiz and 4 lab rows for the course:
exactly one cfu per lesson, named `{lesson}-cfu-2`, which matches the reporter's
design of accumulating a whole scenario set into ONE cumulative attempt per
pass. Nothing here is orphaned.

Item ids are built at runtime rather than written into the markup, so a static
scan cannot enumerate them the way it can for CSA. That is a limit of the
method, not a finding: the signal and the manifest rows line up.

## AP CSP and Intro to Java: reporters present and fed

Sampled rather than swept exhaustively.

- `ap-csp-course-bi1-collaboration`, `bi2-binary-numbers`: reporter loaded,
  8 `mcq-item`, 6 `data-activity`, 3 `_activity(` each. Wired.
- `ap-csp-topic-1-1-exercise-1`: reporter loaded, 9 `mcq-item`, 6
  `data-activity`, but **zero `_activity(`**. The CSP reporter observes that
  helper. This sits next to ledger #63, the CSP exercise reporter gate, which
  another session owns, so it is noted and NOT acted on here. Worth confirming
  those exercise pages actually grade once #63 settles.
- Intro to Java `1-1`, `4-2` and a `-code` page: reporter loaded, cfu and gap
  blocks present, `data-item` attributes present.

## What this sweep did not do

- It did not simulate a student on CSP, Networking or Intro to Java the way the
  cyber sweep did. It establishes that the reporter is present and the signal it
  needs exists, not that a full submission lands as points.
- It did not read stored rows for any course. No credential in this session can
  read a gradebook.
- CSP and Intro to Java were sampled, not swept. CSA and Networking were swept
  in full.

The honest summary: cyber was broken and is fixed; the other four look correctly
wired, with one content gap at CSA 1.2. That is a weaker statement than the
cyber one, and deliberately so.
