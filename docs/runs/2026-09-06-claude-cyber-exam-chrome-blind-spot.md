# 2026-09-06 - The verifier said 17 of 17 on a page serving two contradicting h1s

Board 247. Found by accident, chasing a duplicate "imported it" message.

## What was wrong

`ap-cybersecurity-practice-exam` has been the 60 MCQ plus Device Security Analysis
replica since 2026-09-04, and `npm run verify:cyberexamreplica` reported 17 passed
and 0 failed. It was serving this:

```html
<h1 class="...">AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ | APCSExamPrep.com</h1>
...
<h1>AP Cybersecurity Practice Exam</h1>
```

Two h1s, contradicting each other, on the page that ranks 1.6 with a 40.6 percent
click-through. The first is the theme printing the Shopify `Title` field, which
the replica sheet deliberately did not carry. The same stale string also feeds the
theme's own BreadcrumbList, and the nav sub-label on every page of the site read
`40 MCQ + 3 FRQ • Study set`.

## Why every guard missed it

`countClaims` and the live verifier both read the **body zone**, through
`scripts/extract-live-body.js`.

That split exists for a real reason, recorded on 2026-09-04: a check asserting
that a page links something can be satisfied by an anchor the theme puts on all
400 pages, so `ap-cybersecurity-study-guides` "could never be removed" no matter
what a sheet did. For LINKS, chrome is noise.

For COUNTS it is the opposite. Chrome is where a stale count reaches the most
readers, because it is on every page. I inherited the zone restriction from the
link work without asking whether it held for the new rule, and it did not.

The reasoning that left `Title` out of the sheet was also wrong, and wrong in a way
worth naming rather than smoothing over. The stated reason was Tanner's constraint:
do not churn the SERP package. But `Title` is not the SERP title. `<title>`, and
`og:title`, and `twitter:title`, all come from the **SEO Title** field, which the
sheet did carry and did update. The proof is that the two differed for two days:

```
Title field   AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ | APCSExamPrep.com
<title> tag   AP Cybersecurity Practice Exam | 60 MCQ + Device Security Analysis
```

So `Title` drives the visible h1 and the breadcrumb, not the SERP result. Leaving
it alone protected nothing and cost the page a contradictory heading. Tanner's own
instruction had covered this case explicitly, and I read it as being about the
wrong field: *"keep them initially unless the old question count is literally
embedded in them."* It was literally embedded.

## What shipped

- `imports/2026-09-06/cyber-exam-title-pages.csv`. One row, MERGE, columns
  `Handle, Command, Title` and nothing else. Sets the Title to
  **AP Cybersecurity Practice Exam**, matching the body's own h1 and matching what
  `ap-cybersecurity-practice` and `ap-cybersecurity` already do. There is no
  `Body HTML` column at all: a column absent from a sheet is left alone, whereas a
  blank cell in a column that is present sets the field to empty, and the body was
  verified 17 of 17 two days ago.
- Theme PR #108 against the connected branch: the nav sub-label becomes
  `60 MCQ + Device Security Analysis`. "Study set" goes rather than reverting to
  "Full-length", because that label was changed *to* "Study set" in PR #105,
  correctly, when the page really was a study set.
- Two chrome checks in `scripts/verify-cyber-exam-replica-live.js`, reading the
  whole rendered document: the old shape appears nowhere, and every h1 names the
  exam the same way.

The chrome checks are narrow on purpose. Running the full `countClaims` over the
rendered document reports 16 findings on every cyber page, and they are false: the
nav legitimately carries counts for other pages (42 MCQ, 70 MCQ, 586 questions,
100 questions) that the exam bank's allowed set knows nothing about. A guard that
cries wolf 16 times gets switched off within a day, so the check names this page's
own old shape and nothing else.

## Evidence

`deploy-gates/2026-09-04-cyber-exam-replica.json`, `--pre`:

```
suite     smoke:cyberexamreplica   40 checks, 17 mutations
rederive  cyber-exam-replica       31 checks
suite     preflight                clear to import
mutation  five, each red on its own rule
```

The new mutation is the one that matters: soften the chrome check and the suite
goes red on "a correct body under a stale page Title still fails". That assertion
is the offline form of the whole defect, and it cannot be satisfied by a correct
body, which is what makes it worth having.

The gate itself caught a second-order slip while this was being written. Renaming
an assertion left an older mutation's `expect_failure` pointing at a string that no
longer existed, so the suite went red for a different rule. The gate refused with
"another guard caught this mutation, so the one it targets is still unproven",
which is exactly the discipline working: a mutation that goes red for the wrong
reason proves nothing.

The live check now reports **17 passed, 2 failed**, and the 2 are the defect.

## Open

- **The Title sheet is not imported.** After importing, run
  `npm run verify:cyberexamreplica`; it must be 19 of 19.
- **Theme PR #108 is not merged.** Merging it deploys to the storefront
  immediately, since the theme has no CI.
- **The nav carries counts for other pages that nothing checks.** "Practice
  Questions: 250+ MCQs across all 5 units" was already flagged in PR #105 as
  unverified, and board 197 reports the link target serving 15. The nav is a
  content surface with no validator at all, and this pass only fixed the one claim
  it could prove wrong.
