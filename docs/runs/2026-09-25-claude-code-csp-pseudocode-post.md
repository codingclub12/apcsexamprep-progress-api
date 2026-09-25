# The pseudocode post said 40 questions, and graded 7 of its 8 practice questions wrong

Board 425. Claude Code, 2026-09-25.

## What was asked

Tanner flagged one box on the AP CSP pseudocode blog post:

> The AP CSP exam contains approximately 40 MCQ questions in Section I. A
> significant portion, usually 10 to 15 questions, require you to read or trace
> through College Board pseudocode.

He called it very incorrect. It is: Section I is 70 questions.

## Which post

`/blogs/news/ap-csp-pseudocode-complete-guide-2026`, Shopify article
`594445926615`, published 2026-02-28, last updated `2026-04-02T22:46:30Z` before
this change. It was written outside the repo's blog pipeline, so the sentence is
in no file here. The repo's own pseudocode post is a different article,
`/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide`, and does not carry it.
The excerpt and both SEO fields were read through the Admin API and carry no exam
numbers, so only Body HTML changes.

## What else was wrong on the same page

Reading the whole post against College Board's own text found three more kinds of
error. The third is the one a student actually feels.

**The exam.** `docs/ced-snapshot/csp-exam.txt` and the CED's exam page agree: 70
multiple-choice questions, 120 minutes, 70% of the score. College Board publishes
no count of "pseudocode questions", so the 10 to 15 had no source. What it does
publish is the Big Idea weighting on the multiple-choice section, Big Idea 3 at 30
to 35%, and that questions from Big Ideas 1, 2 and 3 can all be written as code.
The box now says that.

**REPEAT UNTIL.** The post said four times that the condition is checked at the END
of each pass, so the body always runs at least once. The CED says the opposite at
AAP-2.K.5:

> In REPEAT UNTIL(condition) iteration, if the conditional evaluates to true
> initially, the loop body is not executed at all, due to the condition being
> checked before the loop.

That is a tested rule, and the site's own CSP course already teaches it correctly
(`seed/csp-exercise-source.json`: "test the condition BEFORE each pass"). Fixed in
the cheat sheet row, the Loops paragraph, the Q1 explanation (twice), the Q4
explanation and the common-mistakes list. None of the eight keyed answers moves under
the correct rule, because no question starts a loop on a true condition, which is
probably how it went unnoticed.

**The keys.** Each option calls `checkQ(q, selected, correct)` and the inline script
marks index `correct` as right. Measured on the live page:

| Q | printed | graded | actually |
|---|---|---|---|
| 1 | C | C | C |
| 2 | B | D | A |
| 3 | A | D | A |
| 4 | A | B | A |
| 5 | B | none (index 4 of 4) | B |
| 6 | C | C | D |
| 7 | D | B | D |
| 8 | B | C | B |

In Chromium, clicking the right answer on all eight, the page accepts one. The page
has no `script-src` in its CSP, so that grader runs for every visitor. Q2 and Q6
also argued with their own printed key in the published text ("Wait... WAIT.
Re-read", "Correction verified: ... Answer is D" under a label reading C). Those
explanations are rewritten to state the answer once.

**Syntax.** "angle brackets for list indexing" (the reference sheet uses `aList[i]`;
the sentence now names what actually differs, that lists start at 1), "two Boolean
operators" (NOT, AND, OR), an AND row claiming a short-circuit rule the CED never
mentions (zero matches for "short-circuit" in the whole document), a CAN_MOVE row
missing "relative to where the robot is facing", and a table titled Complete
Reference with no `RANDOM(a, b)`, which is on the sheet.

Left alone on purpose: the byline and tutoring numbers, the em-dashes already in the
post (carried, not authored), the heading "IF / ELSE IF / ELSE" (the paragraph under
it correctly says there is no ELSE IF keyword), and a marketing popup that covers the
questions after the first one.

## How the CED was read

The PDF is not in the repo. `config/ced-sources.json` watches it under `csp-ced-pdf`
and stores only its hash. It was downloaded from that URL; its sha256 is
`144e1af475c01ced6d068356d5494e09d8ed8136d397872ce03c448a4886b1f5`, which matches
`docs/ced-snapshot/index.json`, so this is the exact document on record. It opens
with `%PDF`. `pypdf` fails in this container on a broken system `cryptography`
module; PyMuPDF worked. Quotes above are from PDF pages 84 (AAP-2.K.5), 170 and 171
(exam format and weighting) and 220 to 222 (the Exam Reference Sheet appendix).

## What shipped

- `imports/2026-09-25-csp-pseudocode-post/csp-pseudocode-post-repair-blog-posts.csv`,
  one MERGE row, Body HTML only. Body sha256 `084cb4c6...89ca8`, 52,529 to 53,240
  characters.
- `csp-pseudocode-post-ROLLBACK-blog-posts.csv` beside it, carrying the live body as
  of today, and `before-body.json`, the snapshot both are built from.
- `scripts/csp-pseudocode-post-repair.js`: 44 anchored edits, 16 text and 28 key
  attributes built from two tables, on `lib/matrixify-body-edit.js`. Every anchor must
  match once and the reverse must give the live body back byte for byte.
- `smoke/csp-pseudocode-post-repair.js`, `npm run smoke:csppseudo`, 56 assertions.
- `scripts/verify-csp-pseudocode-post-live.js`, and
  `deploy-gates/2026-09-25-csp-pseudocode-post.json`.
- A fix to `scripts/matrixify-preflight.js`, below.

## The suite re-derives the key by running the page's code

The generator's key table was traced by hand, and hand tracing is how the page got
seven wrong keys. So the suite does not agree with the table. It runs each question's
pseudocode, as printed on the page, through a small interpreter for the reference
sheet subset the post uses, decides each option's claim from what the code does (for
the "what is the error" questions, by applying the fix an option implies and seeing
whether the output comes right), and only then compares.

The interpreter is held to the post first: all five worked examples that print an
"Output:" come out right, and a REPEAT UNTIL on a condition that starts true runs zero
times. The sixth mutation makes that loop post-test and the suite goes red on the
AAP-2.K.5 assertion, so the self-check is load-bearing.

## The preflight was refusing every Blog Posts sheet

The first preflight run refused the sheet: "NEW page with no home". The rule added on
2026-09-18 (a29aed0) looks a handle up in `config/site-architecture.json`, which maps
PAGES. An article handle is never in it, so every course-prefixed article read as a
new page. Run against the nine-article QOTD repair imported on 2026-09-15, all of which
exist, it returned six of the same refusal.

Its suite missed this because the Blog Posts fixture uses the handle `day-11`, which
has no course prefix and never reaches the rule. The fix keys on the sheet carrying a
`Blog:` column, which Matrixify needs to place an article, and says out loud that the
handles were not checked. Four new assertions, one of them the Pages control with the
same handle shape; the mutation turns exactly the three article assertions red.

## One rule was hollow, and the suite said so

`checkBody` first refused an authored em-dash by comparing counts. The suite's own
injection passed straight through it: the repair removes nine of the post's dashes (44
to 35), so one more stayed under the old total. It now requires every dash in the
result to sit in text the page already had.

## Evidence

Live, before any import, `node scripts/verify-csp-pseudocode-post-live.js --browser`:

    1 ok, 15 failed
    in Chromium, the page accepts the right answer on 8 of 8 ... accepted 1 of 8

The one ok is Q1, which was already right.

`--simulate-import --browser`, the sheet body spliced into the live page, exits 3 by
design and never prints the "is live" line:

    16 ok, 0 failed
    SIMULATED ONLY - every check can pass on the sheet body. Nothing has been imported.

`node scripts/deploy-gate.js deploy-gates/2026-09-25-csp-pseudocode-post.json --pre`:
two suites (56 and 73 passed), the rederive from the live article, and six mutations,
each red on the assertion it names. Also green: `smoke:storefront`, `smoke:encoding`,
`smoke:volumepaths`, `smoke:mutationleak`, `smoke:deploygate`, `smoke:gatescope`,
`smoke:gatescopemutation`.

## Import runbook

1. Run `node scripts/verify-csp-pseudocode-post-live.js` first. It must be RED. If it
   passes before anyone has imported, the page was fixed some other way and the sheet
   is stale: delete it.
2. Import `csp-pseudocode-post-repair-blog-posts.csv` in Matrixify. One row, MERGE,
   Body HTML only.
3. Run `node scripts/verify-csp-pseudocode-post-live.js --browser`. Expected: 16 ok and
   "OK - the pseudocode post repair is live".
4. Run the gate without `--pre`.
5. The article's `updatedAt` must be later than `2026-04-02T22:46:30Z`.

If the import damages the page, the ROLLBACK sheet puts back the body as it was today.

## Still open

- Other posts from the same batch. A read-only sweep of all 86 news articles is in
  `docs/reports/2026-09-25-news-blog-sweep.md`. By its account, no other post
  repeats the REPEAT UNTIL or list-index errors, and every CSP exam number printed
  elsewhere in the blog is right. It did find other defects, each checked on the live
  page by this session before filing:
  - **Board 429.** Wrong keys: the recursion guide's q3, the CSP day 29 aliasing post
    on two handles (it teaches aliasing where the reference sheet says a copy), and a
    unit 2 question with no correct option at all.
  - **Board 430.** Two posts whose practice scripts do not parse.
  - **Board 431.** Three CSA posts that say FRQs are 50% (45%), plus FRQ numbering
    that is wrong throughout the FRQ tips post.
- Two posts now compete for "ap csp pseudocode": this one and the repo's own
  `/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide`. Whether to merge or redirect
  one is Tanner's decision, and a redirect is a handle change.

## Learned

- The Write tool turned `\u2014` escapes into literal characters in all three new files.
  They were re-escaped with perl and checked with `grep -P '[^\x00-\x7F]'`.
  `lib/matrixify-body-edit.js` line 82 has the same literal dashes in the regex its
  comment says is written as escapes, which suggests the same thing happened there.
- A fixture that cannot reach a rule tests nothing about it. `day-11` looked like a
  realistic article handle and was not one.
