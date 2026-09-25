# The news blog, swept for the defects found on the CSP pseudocode post

Board 425, 2026-09-25. The pseudocode post turned out to be wrong in four ways
(exam format, REPEAT UNTIL taught backwards, wrong answer keys, syntax). It came
from an older batch in `/blogs/news/`, so a read-only sweep checked every article
in that blog for the same classes. Per-article detail is in
`2026-09-25-news-blog-sweep.json` beside this file.

## How it was swept, as the sweep reports it

All 86 articles, fetched through `lib/storefront-fetch.js` with no User-Agent,
300 ms apart. All answered 200; none were challenged; none are UNCHECKED. The
sitemap lists 87 entries under news, and the 87th is the blog index. The
pseudocode post was the positive control and was flagged on all four checks.
The sweep planted a defect in a real page body for each of its 20 checks, and
reports that every one went red.

## Verified on the live page by this session, not only reported

| Post | What is wrong | Board |
|---|---|---|
| `ap-csp-pseudocode-complete-guide-2026` | All four classes | 425, fixed by sheet |
| `ap-csa-recursion-complete-guide`, q3 | `compute(5, 0)` returns 12 (C); keyed `checkAnswer('q3','B')`; explanation says "wait! Re-check" | 429 |
| `ap-csp-day-29-list-mutation-and-aliasing` and its twin `ap-csp-day-29-list-mutation-aliasing` | Keyed D (99) and teaches aliasing. The Exam Reference Sheet: "Assigns a copy of the list bList to the list aList", so the answer is B (20) | 429 |
| `unit-2-cycle-2-day-20` | The loop counts 10; the options are 11, 9, 14, 8; keyed B. Published text: "I think the answer key might be wrong" | 429 |
| `ap-csa-searching-sorting` | 3 of 4 inline scripts fail to parse (`Unexpected token '-'`, hyphens in handler names), so Run and both questions do nothing | 430 |
| `getters-setters-ap-csa` | Its one script fails to parse (`Unexpected identifier 'q2'`), so all 8 questions are dead | 430 |
| `ap-computer-science-a-frq-tips-...-2025-2026` | "FRQs account for 50%" (45%); numbers the FRQs Q1 Class Design ... Q4 Methods and Control, and advises starting with "Question 4 (Methods and Control)" | 431 |
| `ap-csa-2025-practice-mcq` | Tiles read 50% for Section I and Section II (55% and 45%) | 431 |
| `top-10-mistakes-new-ap-computer-science-a-students-...` | "FRQs are 50% of your AP CSA score" (45%) | 431 |

The CSA numbers are from `docs/ced-snapshot/csa-exam.txt`: Section I 55%,
Section II 45%, FRQs in the order Methods and Control Structures, Class Design,
Data Analysis with ArrayList, 2D Array.

## Reported by the sweep, not independently checked

- `ap-csa-searching-sorting` Q1 is keyed B ("12, 25, 19"), but binary search
  finds 19 on its first probe, so C ("19 only") is right. The page's own feedback
  says "The sequence is just arr[3]=19". This is latent while the script is dead.
- `ap-csa-practice-exam-2`: every key matches its label, but 27 of the 42 answers
  are B, ten of them in a row at q20 to q29. A student bubbling all B scores 64%.
- `ap-csa-if-else-chains` carries structured data with single-quoted strings, so
  search engines ignore it.
- 13 CSP daily posts are published twice under two handles with identical bodies.
  They are listed in the JSON.

## Correct wherever printed, as the sweep reports it

- **CSP:** 70 MCQ, 2 hours, 70%.
- **Cyber:** 60 MCQ in 80 minutes, 70%; 1 FRQ in 50 minutes, 30%.
- **CSA:** 42 MCQ in 90 minutes.

No Cyber per-unit weighting appears anywhere in the blog. The only mention of
REPEAT UNTIL in the whole news blog is the pseudocode post.

## What each check cannot see

- **The key check** tests whether the grader, the printed label and the
  explanation agree. It does not test whether the key is TRUE. A consistent wrong
  key gets through, and so does one contradicted only by a value rather than a
  letter. Every wrong key above was found by running or tracing the code. Of the
  226 keyed questions in 67 posts, only the ones named here were run.
- **The exam-format check** misses a claim with no number in it. The FRQ order
  was found by reading, not by the check. It also missed stat tiles that render
  one number per line, which is how the practice-exam tiles were found.
- **Dead** means the script fails to parse in V8. Browser clicks were not tried
  on these posts. A grammar error fails in every browser.
- Exam dates were not checked.
- The other six blogs (551 URLs) were not swept. Three look-alikes were fetched
  to size the problem, and none repeated these defects.

## False positives the sweep withdrew before reporting

- "Why Not the Others omits B, C, D" on the ten csp-c3 day 61 to 70 posts. That
  template writes the letters as plain text, not bold.
- An "inconsistent key" on `ap-csa-practice-exam-2`. A parser read
  one-button-per-question calls as a single question.
- Year strings such as "2025 FRQs", read as FRQ counts. Each is marked in the JSON.
