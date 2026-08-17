# Pages missing a meta description

Complete sweep of the Shopify page catalogue, 2026-08-17. Every `/pages/` object
was read through the Admin API and checked for the `global.description_tag`
metafield, which is what Shopify renders as `<meta name="description">`.

**1,121 pages swept. 151 have no meta description.**

Task #77 records this as "12 pages missing meta description". That number is
stale by an order of magnitude. The task should be reopened and rescoped against
this list rather than verified.

## How to re-run

```
{
  pages(first: 250, after: "<cursor>") {
    edges { node { handle metafield(namespace: "global", key: "description_tag") { id } } }
    pageInfo { hasNextPage endCursor }
  }
}
```

Ask for the metafield `id`, not its `value`. The values are long prose and a
250-page window of them is large enough to be unwieldy; the id is a short gid and
null means the same thing either way. Five windows cover the catalogue.

## What this is not

A missing meta description is not automatically a defect. Roughly a third of the
list is internal: dashboards, command centers, editor test pages, and teacher
tooling that should not be indexed at all. For those the correct fix is usually
`noindex`, not a description. Sorting the list into "wants a description" and
"wants noindex" is the actual work, and it is a judgement call per group, which
is why this document groups rather than dumps.

The groups below are ordered by how clearly they are student-facing.

## Student-facing course content (96)

These are the ones that cost traffic. Every one is a real lesson page.

### AP CSA Unit 2 and 3 lesson pages (21)

Note the duplicate pairs: `2-9`, `2-10` and `2-12` each appear twice under two
different handles. Worth resolving which is canonical before writing copy for
both.

```
ap-csa-lesson-2-1-algorithms-selection-repetition
ap-csa-lesson-2-2-boolean-expressions
ap-csa-lesson-2-3-if-statements
ap-csa-lesson-2-4-nested-if-statements
ap-csa-lesson-2-5-compound-boolean-expressions
ap-csa-lesson-2-6-comparing-boolean-expressions
ap-csa-lesson-2-7-while-loops
ap-csa-lesson-2-8-for-loops
ap-csa-lesson-2-9-implementing-algorithms
ap-csa-lesson-2-9-implementing-selection-iteration-algorithms
ap-csa-lesson-2-10-string-algorithms
ap-csa-lesson-2-10-implementing-string-algorithms
ap-csa-lesson-2-11-nested-iteration
ap-csa-lesson-2-12-run-time-analysis
ap-csa-lesson-2-12-informal-run-time-analysis
ap-csa-lesson-3-2-impact-of-program-design
ap-csa-lesson-3-5-methods-how-to-write-them
```

Plus the rest of Unit 3:

```
ap-csa-lesson-3-6-methods-passing-returning-object-references
ap-csa-lesson-3-7-class-variables-and-methods
ap-csa-lesson-3-8-scope-and-access
ap-csa-lesson-3-9-this-keyword
```

### AP CSA Unit 4 lesson pages (17)

The entire unit. Not one of these has a description.

```
ap-csa-lesson-4-1-ethical-social-issues-data-collection
ap-csa-lesson-4-2-introduction-to-using-data-sets
ap-csa-lesson-4-3-array-creation-and-access
ap-csa-lesson-4-4-traversing-arrays
ap-csa-lesson-4-5-algorithms-with-arrays
ap-csa-lesson-4-6-arrays-as-parameters-and-return-values
ap-csa-lesson-4-7-arraylist-introduction
ap-csa-lesson-4-8-arraylist-methods
ap-csa-lesson-4-9-traversing-arraylists
ap-csa-lesson-4-10-algorithms-with-arraylists
ap-csa-lesson-4-11-2d-array-creation-and-access
ap-csa-lesson-4-12-traversing-2d-arrays
ap-csa-lesson-4-13-searching-and-sorting
ap-csa-lesson-4-14-reading-data-from-files
ap-csa-lesson-4-15-using-data-sets-with-arrays-and-arraylists
ap-csa-lesson-4-16-recursion
ap-csa-lesson-4-17-informal-code-analysis
```

### AP CSA unit hubs and course pages (9)

```
ap-csa-unit-1-course
ap-csa-unit-2-course
ap-csa-unit-3-course
ap-csa-unit-4-course
ap-csa-course-2-9-for-loops
ap-csa-course-2-10-loop-algorithms
ap-csa-course-4-2-traversing-arrays
ap-csa-course-4-12-traversing-2d-arrays
ap-csa-course-array-references-aliasing
```

### AP CSP guided notes (18)

```
ap-csp-topic-3-1-guided-notes   ap-csp-topic-3-10-guided-notes
ap-csp-topic-3-2-guided-notes   ap-csp-topic-3-11-guided-notes
ap-csp-topic-3-3-guided-notes   ap-csp-topic-3-12-guided-notes
ap-csp-topic-3-4-guided-notes   ap-csp-topic-3-13-guided-notes
ap-csp-topic-3-5-guided-notes   ap-csp-topic-3-14-guided-notes
ap-csp-topic-3-6-guided-notes   ap-csp-topic-3-15-guided-notes
ap-csp-topic-3-7-guided-notes   ap-csp-topic-3-16-guided-notes
ap-csp-topic-3-8-guided-notes   ap-csp-topic-3-17-guided-notes
ap-csp-topic-3-9-guided-notes   ap-csp-topic-3-18-guided-notes
```

### AP CSP Big Idea notes (17)

```
ap-csp-course-bi1-collaboration-notes
ap-csp-course-bi1-identifying-correcting-errors-notes
ap-csp-course-bi1-program-design-development-notes
ap-csp-course-bi1-program-function-purpose-notes
ap-csp-course-bi2-binary-numbers-notes
ap-csp-course-bi2-data-compression-notes
ap-csp-course-bi2-extracting-information-notes
ap-csp-course-bi2-using-programs-with-data-notes
ap-csp-course-bi4-fault-tolerance-notes
ap-csp-course-bi4-parallel-distributed-computing-notes
ap-csp-course-bi4-the-internet-notes
ap-csp-course-bi5-beneficial-harmful-effects-notes
ap-csp-course-bi5-computing-bias-notes
ap-csp-course-bi5-crowdsourcing-notes
ap-csp-course-bi5-digital-divide-notes
ap-csp-course-bi5-legal-ethical-concerns-notes
ap-csp-course-bi5-safe-computing-notes
```

### AP Cybersecurity content (11)

```
ap-cybersecurity-complete-course-guide
ap-cybersecurity-unit-2-cyber-foundations
ap-cybersecurity-unit-2-detecting-physical-attacks
ap-cybersecurity-unit-2-physical-vulnerabilities
ap-cybersecurity-unit-2-protecting-physical-spaces
ap-cyber-unit-1-case-file-1
ap-cyber-unit-2-case-file-2
ap-cyber-unit-3-case-file-3
ap-cyber-unit-4-case-file-4
ap-cyber-unit-5-case-file-5
ap-cyber-unit-1-frq-practice
```

### Practice and assessment (3)

```
ap-csa-2025-frq-4
ap-csa-unit-3-practice-exam-part-2
ap-cybersecurity-course-calendars
```

## Interactive and games (11)

Student-facing, so they want descriptions, but they are thin on text and may need
copy written rather than derived.

```
ap-csp-study-games-hub          ap-csp-game-license-match
ap-csp-game-binary-conversion-race  ap-csp-game-phishing-net
ap-csp-game-bridge-the-divide   ap-csp-game-redundant-routing
ap-csp-game-crowd-power         ap-csp-game-robot-director
ap-csp-game-internet-routing-simulator  ap-csp-game-spot-the-bias
ap-csp-game-two-sides
```

## Graded assessments (7)

These arguably want `noindex` rather than a description: a unit test that ranks in
search is a unit test with public answers.

```
ap-csp-course-bi1-unit-test
ap-csp-course-bi2-unit-test
ap-csp-course-bi3-unit-test-part-a
ap-csp-course-bi3-unit-test-part-b
ap-csp-course-bi4-unit-test
ap-csp-course-bi5-unit-test
ap-csp-course-bi5-summary-quiz
```

## Code and lab pages (20)

```
ap-csp-topic-3-1-code   ap-csp-topic-3-9-code
ap-csp-topic-3-2-code   ap-csp-topic-3-10-code
ap-csp-topic-3-3-code   ap-csp-topic-3-11-code
ap-csp-topic-3-4-code   ap-csp-topic-3-12-code
ap-csp-topic-3-5-code   ap-csp-topic-3-13-code
ap-csp-topic-3-6-code   ap-csp-topic-3-14-code
ap-csp-topic-3-7-code   ap-csp-topic-3-15-code
ap-csp-topic-3-8-code   ap-csp-topic-3-16-code

ap-cybersecurity-lab-units-3-4
ap-cyber-unit-3-lab-log-analysis
ap-cyber-unit-3-lab-packet-capture
ap-cyber-unit-3-lab-port-mapping
```

## Internal, gated, or test pages (17)

Almost certainly `noindex` rather than a description. Several of these should not
be reachable by a crawler at all, and `join` in particular has been a problem
before (task #82).

```
admin-tracker              cyber-class
ap-csa-code-editor-test    cyber-command-center
ap-networking-command-center  cyber-dashboard
csa-command-center         cyber-teacher-dashboard
csa-teacher-dashboard      cyber-teacher-teaching-hub
csp-command-center         join
csp-teacher-dashboard      my-progress
java-editor-test           ap-csp-teacher-resources
ap-cybersecurity-supplemental-resources
```

## Suggested split

| Group | Count | Likely action |
|---|---|---|
| CSA lessons, units, CSP notes, Cyber content | 96 | Write descriptions. Highest traffic value. |
| Games | 11 | Write descriptions. |
| Code and lab pages | 20 | Descriptions, lower priority. |
| Unit tests | 7 | `noindex`, not descriptions. |
| Internal and test pages | 17 | `noindex`, and check they are not crawlable. |
| Duplicate lesson handles | 3 pairs | Resolve canonical first, then describe once. |

The 127 in the first three rows are the real SEO task. The remaining 24 are an
indexing hygiene task that happens to have been found by the same sweep, and
bundling them together is what made "12 pages" look like a small job.
