# Answer key audit: Cyber Unit 1 findings

Produced by `scripts/one-off/verify-exam-key.js`. Every item below is live on the
storefront as of 2026-08-13 and is a content fix, not a code fix.

Grading is correct on both pages. The Q8 mis-key that started this audit is fixed
and published. What remains is feedback that is mislabeled or missing, so a student
who answers wrong is shown the wrong explanation or none at all.

## How to re-run

Offline, against saved bodies:

```
node scripts/one-off/verify-exam-key.js backup/*.html
```

Against the live store, which is the only way to reach all 71 pages:

```
SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... \
  node scripts/one-off/verify-exam-key.js --fetch "fb-distractors"
```

`--fetch` takes a Shopify page search query, pulls every match with cursor
pagination, caches each body under `.work/page-cache/` (already gitignored) and
audits the lot, printing a summary ranked by defect count. Re-run with `--cached`
to audit that cache without touching the API, and `--verbose` for per-question
detail. Read scope is enough; the script never writes to Shopify.

It understands the `var ANSWERS = {...}` radio widget and skips drag-and-drop
exercises, which use `var ANSWERS = [` and have no letter to audit. A page it
cannot parse is a FAIL, never a silent pass.

Run against the three exam snapshots kept in this repo, the checker reports
`correct-letter-as-distractor: 1` for the two pre-fix states and `0` for
`current-live`, which is an independent confirmation that the Q8 correction
landed and that this defect class is detected rather than assumed.

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

## Not covered by this audit, and what finishing it needs

Only two pages were audited, because only two are saved in this repo. The
storefront is blocked by the environment network policy, so the sole route to a
page body here is the Shopify MCP tool, which costs roughly 75 KB of context per
page.

The audit universe is much larger than those two. A full-text page search for
`fb-distractors` returns 71 pages with `hasNextPage: false`, so this is the
complete set of pages carrying the widget:

| Course and unit | Pages |
|---|---|
| Cyber unit 3 | 27 |
| Cyber unit 2 | 21 |
| Cyber unit 1 | 8 |
| Cyber unit 4 | 5 |
| CSP big ideas 2, 4, 5 | 5 |
| Cyber unit 5 | 3 |
| CSA lessons 1.1 and 1.2 | 2 |

Seventy-one bodies is roughly 5 MB, which is not auditable through the MCP tool at
any sensible cost. Setting `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN` in the
environment (read scope is enough for the audit itself) would let the verifier
fetch and check all 71 in one offline pass, the same way
`tools/cyber-unit1-nav-repair/apply.js` already expects those two variables.

That matters more than a coverage gap, because the one defect found so far is
plausibly a template defect rather than a typo. The boilerplate `A,C,D` label set
on the scenario practice page is not something a human types per question, and
`ap-cyber-unit-3-scenario-practice` is built from the same template. Whether the
other 70 pages share it is unknown and is the first thing the swept run would
answer.

The full handle list is in the audit output; regenerate it with:

```
pages(first: 250, query: "fb-distractors") { edges { node { handle } } }
```
