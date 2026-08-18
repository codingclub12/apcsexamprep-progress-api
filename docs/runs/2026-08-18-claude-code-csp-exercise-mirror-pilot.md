# CSP exercise pages: the pilot, and two corrections to the last run

2026-08-18, Claude Code, task #91.

## Correction 1: task #91 was right and I said it was wrong

PR #182 and `docs/runs/2026-08-17-claude-code-csp-course-pages.md` both assert that
task #91's premise was wrong, that there was no field of dead exercise links. That
is false and should not be trusted.

The links are not on any web page. They are printed inside the `.docx` student
handouts the Teacher Course Bundle delivers:

> Also available online (auto-graded): apcsexamprep.com/pages/ap-csp-topic-1-1-exercise-1

All 70 student exercise documents carry that line. **All 70 of those URLs return
404.** Every CSP teacher who bought the bundle handed students a worksheet
pointing at a page that has never existed.

I crawled web pages, found 211 of 212 links healthy, and concluded absence. The
links lived in a link space I never looked at.

## Correction 2: Big Idea 3 guided notes already existed

The same run claims Big Idea 3 has zero guided notes pages. It has all 18, at
`ap-csp-topic-3-{N}-guided-notes`, created in the same 2026-07-24 batch as the
other 17. I queried `handle:ap-csp-course*` and reported absence from a
prefix-filtered slice. CSP uses two notes naming schemes and Big Idea 3 uses the
other one.

Consequence: the 18 notes pages in `seed/csp-bi3-notes*` from PR #182 are
DUPLICATES and must not be imported. The exercise-2 half of that PR is also
superseded by this work, since it used the wrong handle scheme.

Both mistakes share one shape: scoping a search to one naming convention and
reporting the absence as a fact about the world.

## What the handouts actually promise

Measured across all 70 student documents, parsed from the source:

| | Count |
|---|---|
| Exercise 1 point-bearing written questions | 262 |
| Exercise 2 scenarios | 157 |
| Exercise 2 write-in prompts | 468 |
| Multiple-choice items anywhere | **0** |

Nothing in the handouts is auto-gradable. "Also available online (auto-graded)"
is a promise the source material cannot support as written.

**But the handouts define their own online scope.** All 35 Exercise 1 documents
say, of Part B specifically: *"These are the same items available on the site
exercise."* So the online Exercise 1 is Part B (122 items across the 35), and
Part A stays paper. Exercise 2 carries no such pointer, so its scope is the whole
activity.

## The design, chosen by Tanner

Each page has two halves, labelled differently on purpose:

1. **Mirror, not recorded.** The handout's own items reproduced verbatim from the
   source document, each with a writing box. Local only: drafts persist in the
   browser's own storage and nothing typed is ever transmitted. This is what
   keeps the zero-PII posture intact.
2. **Graded check, recorded.** Author-written multiple choice derived from the
   teacher answer key, auto-graded, posting to the gradebook.

The page states which half counts. A student is never shown a score for work
nobody read.

## The accuracy mechanism

Every check question carries `keyCite`, the exact sentence in the teacher answer
key it was derived from. A verifier fetches the KEY document and confirms the
quote appears in it, so a question with an invented correct answer fails rather
than reaching a student.

**Pilot result: 10 of 10 citations verified against the real answer keys.**

The keys are NOT committed. `seed/csp-exercise-source.json` is parsed from
Student documents only (verified: no KEY doc among the 70 sources). The checks
file contains 962 characters of key text across 10 cited sentences; if even that
is unwanted in a public repo, the citations can be stored as hashes instead.

## Evidence

Browser test against the DEPLOYED `assets/ap-csp-reporter.js`, both pilot pages,
with a canary string typed into every writing box:

```
exercise-1 page: posts activity_type "exercise-1", unit bi-1, lesson collaboration
exercise-2 page: posts activity_type "exercise-2", unit bi-1, lesson collaboration
canary leaked in any request: false      <- the zero-PII claim, tested
draft restored after reload: true
page errors: none
```

Also verified: all 780 bundle files on the CDN return 200, and the 70 promised
URLs return 404, each checked individually.

## Open, and one of them is urgent

1. **The bundle's contents are publicly readable.** `/pages/ap-csp-teacher-resources`
   gates with `localStorage` and `apcse_token` client-side, but ships all 780
   file links in the HTML, and the CDN serves every file unauthenticated. I
   downloaded 70 student documents and 2 answer keys with plain curl and no
   credentials. That includes 222 KEY files. This is the same shape as task #70:
   the markup ships and the JS only hides it. Bigger than the dead links.
2. **69 exercises still need check questions.** The pilot covers topic 1.1 only,
   deliberately, for review before scaling.
3. **Handle routing.** `ap-csp-topic-{U}-{L}-exercise-{N}` does not match
   `pageFromHandle`, so these pages do not register a VISIT. Grading is
   unaffected because the page dispatches course, unit and lesson explicitly and
   the reporter prefers the detail. Adding the pattern to `utils.js` is additive.
4. **Score bar resets on reload.** Answers already posted, but the bar reads
   "0 answered" after a refresh because answered state is not persisted locally.
   Honest, mildly confusing, easy to fix if wanted.
5. **The printed wording.** Whatever ships, the line in the next bundle build
   should match it. The 70 handouts already distributed cannot be recalled.
6. **PR #182's run note and description are wrong** on both counts above and
   should be corrected or annotated.

## Deliberate non-actions

- Did not import anything. Nothing is live.
- Did not build a student-to-teacher inbox. That means storing minors' free text,
  which CLAUDE.md forbids outright, and it deserves its own decision.
- Did not use keyword matching to grade written answers. It cannot distinguish
  "diverse perspectives avoid bias" from "diverse perspectives cause bias".
