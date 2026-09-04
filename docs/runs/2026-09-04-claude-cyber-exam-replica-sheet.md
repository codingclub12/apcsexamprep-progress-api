# 2026-09-04 - The 60 question replica, rendered into the ranking page

Board 176. Follows PR #532, which authored the item bank; this is the render and
the sheet that carries it to the storefront.

## What changed

`ap-cybersecurity-practice-exam` goes from a 40 question study set with three
free-response prompts to the CED-shaped replica: 60 multiple choice in Section I
and one Device Security Analysis in Section II. Same URL, same page.

That was the decision, not a detail. The page ranks 1.6 with a 40.6 percent
click-through on "ap cybersecurity practice test" in the Search Console export
for Aug 30 to Sep 1, and the choice was between a new competing URL and an intent
upgrade on the one that already ranks. Tanner picked the upgrade, and named the
condition: do not rewrite title, meta, H1, URL, navigation and test body in one
release and then have no way to tell what moved the ranking.

So the sheet carries four columns. Handle, Command, Body HTML, SEO Title. No
Title column and no meta description column, which means one SERP variable
moves. The meta already read "60 MCQ and one Device Security Analysis", which was
aspirational before this import and is true after it.

The body is rebuilt from the live body with three kinds of edit:

- **Preserved byte for byte**: both style blocks, the BreadcrumbList, the closing
  CTA, the resources grid, the footer, and the scoring script, which is generic
  and reads `data-correct` off each card without caring how many there are.
- **Edited in place**: seventeen head strings that state a count, plus the FAQPage
  and Article schema.
- **Replaced**: the question region, from the first unit divider to the CTA.

The schema edit is a departure from "preserve the schema" and it is deliberate.
FAQPage is rich-result eligible and hard-coded "40 multiple choice questions and
3 free-response". Preserving that literally would publish structured data that
contradicts the page. The block's type, URLs and question set are untouched; only
the answers that state a count changed.

## The defect this run actually found

The first pass of the generator produced a sheet that a 32 check suite called
clean, and it carried two stale counts from the old set:

    <h2>Section 1: Multiple Choice (40 Questions)</h2>

    "The set covers all 5 units: Unit 1 (Introduction to Security, 7 questions),
     ... plus 3 FRQs spanning Units 2-5."

Both would have gone live. The section heading is the first thing under the
overview, and the FAQ answer is rich-result eligible, so the wrong count could
have surfaced in a SERP on the page whose SERP performance is the entire reason
for doing this on the existing URL.

The check that missed them was five hand-written patterns:

```js
!/\b40 (?:multiple|interactive|practice|scenario)/i.test(nb)
&& !/\b3 free-response\b/i.test(nb)
&& ...
```

`(40 Questions)` does not match the first. `3 FRQs` does not match the second.
Neither does `7 questions`. The list was not careless, it was written against the
strings someone had looked at, and nothing about a list of strings can report
that it has stopped covering the page. CLAUDE.md already says this about mojibake
detection, in those words, and the lesson did not travel to the neighbouring
check in the same file.

The replacement is derived rather than typed. `countClaims()` finds every
`<number> <question-noun>` phrase in the body and requires the number to be one
`config/cyber-exam-items.json` can justify: the bank's own length, its per-unit
and per-skill counts, and one for the single free response. Change the bank and
the guard moves with it.

The measurement is what makes it worth having. On the body this replaces it finds
**27** such phrases. On the rendered body it finds **none**. That second number
alone would be indistinguishable from a broken regex, which is exactly how the
first draft of this guard failed: it allowed every qid from 1 to 60 so that
"Question 37" would pass, which also allowed 40 and 3, and it reported the old
body perfectly clean. The card writes the number *after* the noun and never
matched the pattern at all, so the allowance was never needed. Both numbers are
asserted in the suite now.

Two things the guard does not do, and they are deliberate:

- The allowed set is per noun class, not pooled. A count in front of "FRQ" or
  "free-response" must be 1; nothing else is ever right there.
- The one number allowed that the bank cannot justify is 15, for the sampler page
  this one links to, and it is **anchored**: accepted only within 260 characters
  of that page's handle. An unanchored exemption would re-admit any stale count
  that happened to be 15, which is how exemptions rot.

## Evidence

`deploy-gates/2026-09-04-cyber-exam-replica.json`, run with `--pre`:

    suite     smoke:cyberexamreplica        39 checks, 17 mutations
    suite     smoke:cybersheet              the shared validator did not regress
    suite     smoke:cybersheetmutation      15 mutations, all still red per rule
    rederive  cyber-exam-replica-rederive   31 checks, second implementation
    suite     preflight-exam-replica        clear to import
    mutation  four, each red on its own rule

The rederive is Python and shares no code with the generator. It parses the CSV
back from bytes, re-derives the 24 topic numbers from the College Board CED text
extracts rather than from `config/cyber-topics.json`, diffs every rendered stem,
option set and key letter against the item bank, and re-implements the count
guard independently. The two implementations agree on both numbers, 27 and 0.

The four mutations, each verified red on the rule that claims it:

| mutation | goes red on |
|---|---|
| admit every number 1 to 60, the state the first draft shipped in | the guard finds 27 on the old body |
| stop refusing on an unjustifiable count | the generator refuses a dropped edit |
| unanchor the cross-page exemption | 15 is accepted only next to its handle |
| soften one live assertion | 13 of 17 fail on the body being replaced |

Full offline suite: 188 of 189 pass. The one failure is `smoke:csakitstyle`,
which fails identically on an unmodified tree in this container because
`python-pptx` is not installed. Not a regression and not this branch's.

## The live check, and why it cannot have run yet

`scripts/verify-cyber-exam-replica-live.js`, run through `lib/storefront-fetch.js`
with no User-Agent. Against the served page today, before any import:

    4 passed, 13 failed

That is the proof it is not decoration. The page serves 40 cards and not 60, its
h1 reads "Practice Set", its title reads "40 MCQ + 3 FRQ", and its body states 27
counts the new bank cannot justify. Every one of those becomes true only if the
import lands.

The four assertions that already pass are preservation checks, and they are meant
to hold on both sides: a MERGE republishes the whole body, so a generator bug
takes the breadcrumb and the scoring script with it. Sixty questions shipped
without the breadcrumb is not a success.

The verifier's assertion set is exported and the suite runs the same function
offline against the generated body: 17 of 17 pass there, 4 of 17 on the body it
replaces. One assertion set run twice rather than two that can drift. This repo
has already paid for that drift once, when three verifiers reported a confident
and entirely false regression.

One assertion was wrong on the first pass and is worth recording. The resources
grid check looked for `class="pq-rc"`, which appears zero times; the cards carry
`pq-rc-title`. A preservation assertion that fails *before* the change is testing
the wrong string rather than testing the page, and the pre-import run is what
surfaced it.

## Open

- **The sheet is not imported.** `imports/2026-09-04c/cyber-practice-exam-replica-pages.csv`,
  one row, MERGE, 135,089 bytes. Import it once through Shopify admin, then run
  `npm run verify:cyberexamreplica`. The gate is not satisfied until that passes.
- **Do not re-save the CSV as a spreadsheet.** The Body HTML cell is over 32,767
  characters, which is fine for CSV and would be truncated by xlsx.
- **Whether the items are good items** is a teacher read, not a check. The suite
  proves they are CED-shaped, disjoint from the existing set, inside the skill
  band, and free of the length tell in the correct option. It cannot prove a
  question teaches well.
- **Re-measure the ranking in about three weeks.** Position and click-through for
  "ap cybersecurity practice test". The sheet moves one SERP variable precisely so
  the answer is attributable when it arrives.
- **"Link it at the top of the course"** from the nav request is still not done.
  The nav dropdown shipped; the course-page link did not.
