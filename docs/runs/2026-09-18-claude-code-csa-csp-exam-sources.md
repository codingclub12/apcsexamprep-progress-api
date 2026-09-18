# The 42 MCQ claim is true, and nothing in the repo could say so

2026-09-18. Board #367.

## The question

Four live pages print "42 MCQ" and "55% / 45%" for AP CSA as fact. A run note on
2026-09-17 flagged that no first-party source in this repo confirmed it, and the
year rewrites moved the year beside that number twice without ever checking it.

## The answer

It is correct. College Board's own AP Computer Science A exam page:

    Section I: Multiple Choice
    42 Questions | 1 Hour 30 Minutes | 55% of Exam Score

    Section II: Free Response
    4 Questions | 1 Hour 30 Minutes | 45% of Exam Score

Every structural claim on `/pages/ap-csa-exam-format` matches: 42 questions, 90
minutes, 55%; 4 free-response, 90 minutes, 45%; three hours total across two
sections. Nothing needed fixing.

AP CSP checks out too, and was never asked about: 70 multiple-choice, 120
minutes, 70% of score, with the Create performance task and two written
responses at 30%.

## The actual defect, which was not the number

`config/ced-sources.json` watched fifteen sources and one of them was
`cyber-exam`, College Board's exam page for AP Cybersecurity. There was no
equivalent for CSA or CSP. So the two courses that carry most of the traffic had
their exam structure printed as fact across the site with nothing watching the
page it came from.

That is the shape worth naming: the claim was RIGHT and UNCHECKABLE at the same
time, and those two facts are independent. A session asked to verify it had to
go and fetch a page by hand, which is how a number gets re-derived every six
months and eventually re-derived wrong.

## What changed

- `csa-exam` and `csp-exam` added to `config/ced-sources.json`, each placed
  after its course page so the file reads course then exam
- `docs/ced-snapshot/csa-exam.txt` and `csp-exam.txt` captured, with sha256 and
  byte length recorded in `index.json`, so `npm run ced:watch` now reports a
  diff when College Board edits either
- a CLAUDE.md section carrying both tables, so the next session reads rather than
  fetches

## One trap worth recording

The CSP page lists its 70 questions as three lines: 57 single-select, 5
single-select with a reading passage, 8 multiple-select. A first pass that
matches only the obvious two reads 57 plus 8 and gets 65, then concludes the
live page overstates the count. It does not. The middle line is easy to miss and
the wrong conclusion looks like a finding.

## Evidence

- both pages fetched live, 200, 40,684 and 55,787 bytes
- normalized text captured and diffed into `docs/ced-snapshot/`, first run
  reported both as "recorded for the first time"
- `index.json` carries `checked_at: 2026-09-18` with a sha for each
- live page claims compared line by line against the capture, no mismatch
- `npm run smoke:encoding` 54 passed 0 failed

## Still open

Unchanged: the 19 product and collection SEO records, the `ap-csa-topics` h1
sheet, the `(2026-2027)` in the exam-prep-hub Title field, and the SEO comment
scaffolding on both practice-exam pages.
