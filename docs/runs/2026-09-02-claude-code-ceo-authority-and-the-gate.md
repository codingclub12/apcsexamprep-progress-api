# The CEO got authority, and the gate that makes it survivable

2026-09-02. Tanner moved the CEO agent to act-then-report including deploys, then
immediately added the condition that makes it work: any automatic deploy is
checked three different ways first, automatically. This note records both, and
the six defects found along the way, because the defects are the argument.

## What shipped

    a9ffe04  Unit 3 drift pinned, stale reporter mirror flagged
    74b4750  the deploy gate, standing authority in CLAUDE.md
    ecaccc7  a live check that was already true verifies nothing
    2e5c4ba  derive the deploy sha, and say what failed
    fb320f2  verify-by-evidence, wired and proven

Plus theme PR #93, which is the one a student would notice.

## THE ONE THAT WAS HURTING STUDENTS

Every AP Cyber Unit 3 activity was filing under a lesson the student never
opened, and four handles filed under `3.6`, which is not a CED topic and has no
gradebook column at all.

Unit 3 was renumbered to the Fall 2026 CED on 2026-08-27 and the handles were
deliberately left alone. `utils.js`, the denominator seed and
`smoke/cyber-unit3-lessons.js` all learned the new map. The STOREFRONT did not:
`quiz-tracker-wiring` and `apcs-grade-reporter` each derived the lesson as
`unit + '.' + handleOrdinal`.

    lesson-1  filed 3.1  should be 3.1a      lesson-4  filed 3.4  should be 3.3
    lesson-2  filed 3.2  should be 3.1b      lesson-5  filed 3.5  should be 3.4
    lesson-3  filed 3.3  should be 3.2       lesson-6  filed 3.6  should be 3.5

The header of `smoke/cyber-unit3-lessons.js` predicted it in so many words:
"lesson-3 files under 3.3 while the page teaches 3.2. Nothing throws, no request
fails, and a student's work lands on a lesson they never opened." That suite
pinned the server. Nobody pinned the storefront.

Fixed by `snippets/apcs-cyber-lesson-map.liquid`, one place a handle becomes a
lesson id, rendered before both consumers. 104 activity handles compared against
`pageFromHandle`, 104 agree, where before it was 80 and 24. Verified on six live
pages including two controls in other units.

## THE HANDOFF THAT SENT ME THE WRONG WAY

`docs/reporter-gap-handoff.md` said seven cyber pages had no score reporter,
counted by grepping `apcseReportScore` out of the fetched HTML. On that measure
103 of 104 pages look broken.

The reporter is a THEME ASSET. All 104 load it. The count measured whether a page
had been hand-patched, not whether it can report.

What made that measurement look sound was `shopify/apcs-score-reporter.js`, a
mirror carrying no note that it was one. The served asset is a materially
different program: it gates on an allowed-activity list, refuses to start without
`window.APCS_PAGE`, hands off through `APCS_saveLessonScore` rather than posting
itself, tiers its score elements, and adds a settle timer. None of that is in the
repo copy. It now says so at the top.

**The cause of the eleven reporter-gap records is still not established.** What is
ruled out is "no reporter present". Saying so is the finding.

I had a per-page inline reporter written, verified and mutation tested to seven
guards and 32 assertions before the theme asset turned up, and deleted it. It
would have worked and it was still wrong: the gradebook sums one kept row per
distinct item, so two reporters posting the same run under different items would
have made a 24 point activity worth 48.

## SIX THINGS THAT WERE GREEN AND WRONG

The gate exists because of this list. Every one was caught by a kind of check
DIFFERENT from the ones passing at the time.

**1. A key that repeats inside itself.** `CDACDA` shipped into the CSP sheet.
Distinct, per-column balance and overall balance all held, because every one of
those properties compares keys to EACH OTHER and none looks inside a single key.
Same failure as the pass it was fixing, one level in: pass two optimised a
histogram and produced 25 quizzes on two keys; pass three optimised the
relationships between keys and produced a key that is its own giveaway.

**2. A rewriter that reformatted 23 live pages.** The CSP import landed every key
correctly and stripped 3,280 bytes of indentation. Every test passed, because the
loss was BETWEEN the tags and no check reading option semantics can see the space
around them.

**3. A verifier wrong before the pages were.** The post-import check reported 300
semantic changes across 210 questions. More flags than questions compared is
arithmetically impossible, so the checker was broken: it compared the positional
letter label as part of the answer text. Chasing that impossible number is what
surfaced defect 2.

**4. A live check asserting something already true.** The gate's own first
manifest expected `"status":"ok"` from `/api/health`. True before the deploy, true
during, true if the deploy never happened. It would have reported a landed deploy
for one that never landed: the exact failure the gate exists to catch, inside the
gate.

**5. A pinned sha, stale the moment its own deploy landed.** The fix for 4
hardcoded the commit. Correct for exactly one deploy. Now derived from
`git rev-parse HEAD`, so the assertion is false before the deploy and true after,
permanently, with nothing to edit.

**6. A verifier that could never verify anything.** `lib/command-verify.js` read
`hit.found`. `locate()` has no such field. All 42 unit tests passed because the
stub inspector invented the same shape the code assumed.

## THE PATTERN, WHICH IS THE POINT

Four times today a passing test turned out to be decoration, and the same
mechanism produced all four:

- The stoplist mutation survived THREE separate suites. Fixtures were under the
  length floor, so the length rule refused them first and the stoplist never ran.
  Then longer fixtures were single words in the stoplist, which the
  all-generic-words rule also catches, reading the same set. Only a multi-word
  entry whose words are not all generic reaches it.
- The identity mutation survived because the fixture used two mutations with
  DIFFERENT commands, so it passed whether the rule looked at the mutation or not.
- The `found` bug survived because the stub shared the code's assumption.
- Two route assertions "passed" while testing the already-verified precondition,
  because they reused a task the previous assertion had verified.

**A test that shares an assumption with the code proves the assumption is
self-consistent, not that it is right.** Only mutation testing, or looking at
something real, can tell the difference. That is why the gate makes `mutation`
mandatory and why `suite` plus `mutation` is not enough on its own: it is still
only this repo talking to itself.

## What auto-verify actually guarantees

Less than was asked for, and the gap is written into the code.

It is NOT an independent PARTY. `lib/command-auth.js` gives every bearer caller
the actor `agent`, so the session closing a task and the session verifying it are
one identity, and a caller can hint another with a header. An actor-separation
check would read like a safeguard and enforce nothing.

What holds: there is no parameter for "it worked", and the expectation must be
non-trivial. Proven in production before use, by pointing it at a real task with
`expect: "ok"` and watching it refuse.

Three tasks verified on real evidence, 68 to 65:

    #118  deploys lagging 25-35 min     "commit":"fb320f2"                    1374 bytes
    #116  deploy stalled, old content   Device Security Analysis: the libr... 4685 bytes
    #101  student code sandbox          Code Sandbox | APCSExamPrep          35091 bytes

Every one recorded with the url, the layer, the byte count and the command to
re-run it. A verification nobody can reproduce is a claim.

## Still open

- **40 of the 68 are closed with a GitHub PR link**, which cannot be
  auto-verified honestly: fetching a PR URL proves the PR exists, not that
  anything shipped. The fix is not a better verifier, it is that an artifact
  should point at where the work is LIVE. Worth a decision.
- **A verify-only credential** with its own actor identity would make party
  separation real. Small change, and it is the difference between the guarantee
  Tanner chose and the one deliverable today.
- **The eleven reporter-gap records.** Cause unestablished, see above.
- **The 21 other cyber quiz pages** are UNMEASURED, not clean. `keysFor()` reads
  three answer shapes and not `ANSWERS={1:'C'}`, `ANSWERS={"q1":"B"}` or
  `checkQ(1,'A')`, which is units 2 and 3 entirely. A parser gap, not a detector
  gap.
