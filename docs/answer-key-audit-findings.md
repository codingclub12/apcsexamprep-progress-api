# Answer key audit: Cyber Unit 1 findings

Produced by `scripts/one-off/verify-exam-key.js`. Every item below is live on the
storefront as of 2026-08-13 and is a content fix, not a code fix.

Grading is correct on both pages. The Q8 mis-key that started this audit is fixed
and published. What remains is feedback that is mislabeled or missing, so a student
who answers wrong is shown the wrong explanation or none at all.

## How to re-run

```
node scripts/one-off/verify-exam-key.js <file.html> [more.html ...]
```

It reads a saved page body, so it runs offline and in CI. It understands the
`var ANSWERS = {...}` radio widget and skips drag-and-drop exercises, which use
`var ANSWERS = [` and have no letter to audit. A page it cannot parse is a FAIL,
never a silent pass.

## Finding 1: scenario practice, distractor labels are boilerplate

Page: `ap-cyber-unit-1-scenario-practice` (id `132727963863`, published,
last written 2026-05-21). Saved copy: `backup/ap-cyber-unit-1-scenario-practice.html`.

The three distractor paragraphs on each question are labeled with a fixed letter
set instead of the letters they actually describe. Thirteen of fifteen questions
carry the literal set `A,C,D`.

Where the correct answer happens to be B the labels come out right by luck
(q7, q8, q12, q13), and q6 is right by luck as well. On the other ten the correct
answer's own letter is printed as a distractor, and one genuinely wrong option is
left with no explanation at all.

The paragraph text is correct. Only the letter in front of it is wrong, so the fix
is relabeling, not rewriting.

Worked example, q1. The scenario is a targeted email impersonating a vendor.

| | |
|---|---|
| Options | A vishing, B baiting, C tailgating, D spear phishing |
| Key | D, which is correct |
| Distractors shown | (A) no voice communication, (C) tailgating is physical, **(D)** baiting involves USB drives |

That third paragraph describes baiting, which is option **B**. It is labeled (D),
the correct answer. A student who picks B sees no explanation for B and instead
reads a paragraph telling them that D, the right answer, is wrong.

Ten questions need relabeling:

| Question | Key | Labels shown | Should be | Wrong option left unexplained |
|---|---|---|---|---|
| q1 | D | A, C, D | A, B, C | B |
| q2 | D | A, B, D | A, B, C | C |
| q3 | A | A, C, D | B, C, D | B |
| q4 | C | A, C, D | A, B, D | B |
| q5 | A | A, C, D | B, C, D | B |
| q9 | A | A, C, D | B, C, D | B |
| q10 | D | A, C, D | A, B, C | B |
| q11 | C | A, C, D | A, B, D | B |
| q14 | D | A, C, D | A, B, C | B |
| q15 | C | A, C, D | A, B, D | B |

Each paragraph must be matched to the option its text actually describes rather
than renumbered mechanically, because the paragraphs are not in option order.

## Finding 2: unit 1 exam, missing distractor explanations

Page: `ap-cyber-unit-1-exam` (id `132079550679`). Snapshot:
`shopify/page-snapshots/ap-cyber-unit-1-exam.current-live.html`.

No mislabeling here, and no distractor sits on a correct answer. Four questions
simply do not explain every wrong option, so a student who picks the uncovered
letter gets the verdict and nothing else. These need new prose written.

| Question | Key | Explained | Missing |
|---|---|---|---|
| e4 | A | B, D | C |
| e8 | B | A, D | C |
| e12 | D | A, C | B |
| e18 | C | D | A, B |

e8 is the question whose key was corrected from A to B. Its two existing
distractor notes are correct for the new key. C was never covered, before or after
that change.

## Not covered by this audit

The CSA and CSP exam pages have not been swept. They are not saved in this repo,
the storefront is unreachable from this environment, and pulling each body through
the Shopify MCP tool costs roughly 75 KB of context per page. Setting
`SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN` would let the verifier fetch and audit
every exam page in one offline pass.
