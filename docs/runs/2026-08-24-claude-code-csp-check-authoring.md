# Authoring the CSP check questions: the verifier first, then topic 1.2

2026-08-24, Claude Code.

## The decision this run implements

Check counts are authored to CONTENT, not to a template. Topic 1.1 carries five
questions per exercise; topic 1.2 carries six and seven, because it teaches more
distinct testable ideas. Nothing in the system ever required uniformity: the
renderer, the page copy, the denominator seed and the smoke assertions all read
`check.questions.length`. The flat 5/5 was a sample size of one, not a policy.

Weight follows count, deliberately. The gradebook is points over attempted
points, so a seven-question check counts more toward a grade than a five. A
topic that teaches more should weigh more.

## The verifier had to come first

Every check question carries `keyCite`, the sentence in the teacher answer key it
was derived from. The pilot verified those by hand and reported 10 of 10. **That
script was never committed**, so the guarantee lasted exactly as long as that
session, and the next 69 exercises would have been authored with nothing
checking them.

`scripts/verify-csp-exercise-checks.js` is that check, committed. It reads the
cached key document and fails if the quoted sentence is not in it.

Matching is loose in exactly one way and no more: a .docx round trip stores curly
quotes, en dashes and non-breaking spaces where an author typed ASCII, so both
sides are normalised for those and for whitespace and case. The WORDS must match
in order. A paraphrase fails. A summary fails. A citation lifted from a different
topic's key fails.

**The failure path is proved, not asserted.** Fed a fabricated sentence, a
cross-document `keyDoc`, and a missing rationale, it caught all three. Two of my
first four sabotages were caught and two were bad tests on my part: one quoted a
sentence that really is in the key, and one set a per-question field where the
schema puts it page-level. Those were fixed rather than counted as passes, and
`verify()` now takes an injectable checks source so the failure path stays
testable.

## Where the keys come from

`scripts/fetch-csp-keys.js` downloads the 70 exercise KEY documents into a
gitignored `.keys-cache/` and extracts their text. Paths come from
`seed/csp-teacher-files.json`, never guessed from a filename pattern: a guessed
path that 404s is indistinguishable from a key that does not exist, and both
would silently skip verification.

The keys are NOT committed and must not be. `seed/csp-exercise-source.json` is
parsed from STUDENT documents only, which is the line the pilot drew.

Worth stating plainly: these documents download over plain HTTPS with no
credential. That is the exposure the pilot flagged as its most urgent open item
and it is still open. This script depends on it. When the CDN is gated, the
script needs the same credential the gate issues and will fail loudly rather than
quietly verifying nothing.

## Authoring gate, not CI gate

Verifying needs the keys, and the keys are the answers to the whole course.
Caching them into a CI runner to satisfy a check would put every answer into
build logs, which is worse than the problem it solves. So the citation check runs
where an author already has the keys, and CI proves the half that needs no key:
that every question is structurally complete and carries a citation at all. Seven
new assertions in `smoke/csp-exercise-pages.js` cover the key document name, the
citation, four options, a valid correct letter, a rationale for every option
including the wrong ones, an EK reference, and a floor of three questions.

## What landed

| | |
|---|---|
| Verified citations | **23 across 4 pages**, every one really in its key |
| New this run | topic 1.2, 13 questions (6 + 7) |
| Graded exercise pages | 4 of 70 |
| Remaining to author | 66 |

`allChecks()` now reads the whole `seed/csp-exercise-checks` directory, so adding
a topic is dropping in a file. A file that exists but was forgotten in a
hand-maintained index cannot happen any more.

Two smoke assertions were rewritten from hardcoded counts to derived ones, since
both move every time a topic is authored: the denominator row count, and the
graded/not-graded split on the discoverability suite. Neither was weakened; both
now assert the relationship rather than a frozen number.

All 101 offline suites pass on exit code.

## Still open

1. **66 exercises still need checks.** This run proved the pipeline end to end on
   one topic. The rest is authoring against the keys, batch by batch.
2. **exercise-2 stays unpriced.** Topic 1.2's exercise-2 is graded and carries
   seven questions, but every mirror slug is also a gated `seed/csp-exercise-2`
   slug, so the `{lesson}|exercise-2` key is contested and the column falls back
   to the count the page paints. Settling that needs the mirror activity to get
   its own activity_type in the COURSES config.
3. **The CDN exposure** above, unchanged since the pilot.
