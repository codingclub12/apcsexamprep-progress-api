# Audit of the seven cyber imports, 2026-09-09

All seven sheets were imported by Tanner between 22:09:08 and 22:10:36 local.
This is the audit of what actually landed, measured against the live storefront.

Everything below is re-derivable. None of it is a report of what a generator
intended; every number came from fetching the live page and comparing.

## The three headline checks

    node scripts/cyber-cc-unit3-ced-rederive.js        rows=6 id-matches-page=6 ced-matches-page=6
    node scripts/cyber-cc-unit3-ced-rederive.js --hub  hub-links=6 number-matches-page=6
    npm run verify:cyberquizmounts                     22 of 25 mounted, 3 still ship a key,
                                                       0 mount the wrong lesson, 0 mounted but not served

Before the imports those read 0 of 6, 1 of 6, and 2 of 25. Every one of those
assertions was FALSE beforehand, which is the property that makes them evidence
rather than decoration.

The three unmounted pages are exactly the three the runbook predicted: 2.3,
unit-3 lesson-6 (CED 3.5), and 4.1. Every mounted lesson reports `server pool 5`,
so the API will serve a five-question bank for each.

## Byte level: did the whole body land

The check that matters most, because a semantic check passes on a truncated page.
Each of the 22 rows was fetched live and compared to the bytes its sheet carried.

The two numbering pages are byte-identical, 70,495 and 21,040.

All 20 quiz pages came back **exactly 28 bytes shorter** than their sheet. That
uniformity is the tell that it is systematic rather than damage, and it is worth
naming precisely rather than waving through as "entity normalisation", because
the CSP sheet that lost 90 bytes a page also looked semantically fine.

The whole delta is one thing: the mount container ships with its five attributes
on five lines, and Shopify collapses whitespace inside a tag. Four line breaks
plus seven spaces of indent each, collapsed to one space, is 4 x 7 = 28.

    sheet   <div data-apcs-quiz\n       data-course="ap-cybersecurity"\n       data-unit=...
    live    <div data-apcs-quiz data-course="ap-cybersecurity" data-unit=...

Proof rather than argument: collapse whitespace inside `<div data-apcs-quiz ...>`
ONLY, on the sheet side, and all 20 pages become byte-identical to live. Residual
difference across all 20: zero.

## What did not happen

- **No mojibake.** All 22 live bodies through `lib/mojibake.js`: zero hits.
- **No non-breaking space loss.** Board 292 records Matrixify stripping literal
  U+00A0 from a cyber page. Counting U+00A0 and `&nbsp;` on both sides across all
  22: delta zero everywhere. That failure did not recur here.
- **No collateral.** The three deliberately skipped quiz pages still carry their
  pre-import timestamps (2026-07-29, 2026-08-28, 2026-07-29), as do the Unit 3
  landing page, the complete course guide, the practice hub and two Unit 3 lesson
  pages. Nothing outside the 22 rows moved.
- **Nothing new in `/api/health`.** `reporters.ok` is false on 11 activities and
  `prices.ok` is false on one column, and every one of them is an exercise or a
  lab rather than a quiz. Same 11 as before the import. The single mispriced
  column, unit-3 3.2 exercise-1 at authored 6 observed 5 for one student, is the
  partial-completion pattern board 273 already describes. `seed.ok` true, manifest
  933 rows, 0 changed.

## The mount actually removed the key

The verifier checks a list of known key idioms, and a pattern list cannot tell you
it has stopped working. So this was asked a second way, independent of that list:
a mounted page should contain no question content at all, because the questions
now come from the server.

    mounted page          visible text   question words   option elements   answer patterns
    u1 lesson-3 quiz          942              0                0                 0
    u2 lesson-1 quiz          924              0                0                 0
    u3 lesson-1 quiz          688              0                0                 0
    u4 lesson-2 quiz          843              0                0                 0
    u5 lesson-6 quiz          821              0                0                 0

Nothing to leak, rather than nothing matching a pattern. The remaining text is the
nav shell, the breadcrumb and the quiz description.

## Two findings, neither caused by the import

**2.3 is now the worst quiz page on the site.** It is one of the three deliberate
skips, so it is still client-scored with its key in page source, and it also
carries **21 CED Essential Knowledge codes in rendered, student-visible text**,
counted through `lib/cyber-ek-density.js` rather than a pasted pattern. They are
not in a protected placement: `{"total":21,"kept":0,"cut":21}`. The page renders
per-option explanations of the form "(A) Incorrect, EK 2.3.A.1 training tells
employees not to badge others in". So a student reads the answer key and the CED
codes at the same time. Mounting it fixes both at once.

**A false positive worth writing down so it is not rediscovered.**
`ap-cyber-unit-1-lesson-3-quiz`, which we just mounted, reports 3 EK codes. All
three sit inside an HTML authoring comment ("SHOPIFY NOTES ... CB ALIGNMENT:
1.2.A, 1.2.B, 1.2.C"), and the rendered text contains zero. Same category as the
JSON-LD codes already classified as false positives on board 223. Not a violation.

While looking: that comment claims CB alignment to 1.2, on the 1.3 quiz page,
whose rendered content is public Wi-Fi. The comment is stale. Invisible to
everyone, worth one line to whoever next edits that page.

## What this audit did NOT establish

**That a student's submission scores.** `verify:cyberquizmounts` proves the server
will SERVE a five-question pool for each mounted lesson and that the page mounts
the right course, unit and lesson. It does not exercise the submit path, because
that needs a signed-in student and this repo's rule is that a session never asks
for a credential. The first real class to take a mounted cyber quiz is still the
first end-to-end test of scoring.

**Nothing here sets `verified` on board 290.** Two of the seven sheets were built
by this session, and the agent that did the work is never the one that says it is
true. Every command above can be re-run by anyone.

## Still open

1. **Why 2.3, 3.5 and 4.1 are excluded is recorded nowhere.** Three quiz pages
   where a teacher lock is still decorative, and 2.3 additionally leaks 21 EK
   codes to students. Worth asking the session that built the mount sheets before
   treating the exclusions as permanent.
2. The three skipped pages keep their answer keys in page source until they are
   mounted.
