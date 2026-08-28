# AP Cyber Unit 1: the four thinning sheets, verified live

Date: 2026-08-28
Agent: Claude Code
Branch: `claude/ap-cyber-unit1-handoff-b10iwk`

## What this records

The four thinning sheets from PR #395 (1.1, 1.3, 1.4, 1.5) were imported by
Tanner at 09:38-09:39 CDT. This is the verification against live, plus a sweep
of every Unit 1 page so the unit's end state is a measurement rather than an
inference.

## Byte comparison against what was sent

Each sheet's Body HTML was compared to `GET /pages/<handle>.json` fetched after
the import. The body each sheet carried is `out/topicNN-thin-preview.html`, the
exact string written into the CSV's Body HTML column.

```
page  handle                                       updated_at              result
1.1   ap-cybersecurity-unit-1-social-engineering   2026-08-28T09:38:25-05  IDENTICAL
1.3   ap-cybersecurity-unit-1-wireless-security    2026-08-28T09:38:43-05  IDENTICAL
1.4   ap-cybersecurity-unit-1-ai-driven-threats    2026-08-28T09:39:04-05  IDENTICAL
1.5   ap-cybersecurity-unit-1-ai-cyber-defense     2026-08-28T09:39:20-05  IDENTICAL
```

Byte-identical, with no `<td>` newline delta this time. The seven claim sheets
had one page (1.4) come back four bytes longer because Shopify's markup
normalizer inserts a newline after `<td>` when a tag follows; the comparison
here still normalizes that transformation before declaring a divergence, so a
newline insertion would have been reported as such rather than as a difference.
It simply did not happen on this set.

## The gate, re-run against the live bodies

Not the build-time result restated. The bodies were pulled back down and run
through a one-sided form of `lib/cyber-thin-gate.js`: the assertions that
describe an end state, evaluated on what is actually being served. Painted text
is `document.body.innerText` from Chromium, which is the only thing that can
tell a collapsed teacher table from content a student reads.

```
page  CED painted  EK painted  CED in source  feedback painted  keys
1.1        0            0            14              0          mcq 4
1.3        0            0             8              0          mcq 7
1.4        0            0             2              0          mcq 6 seq 1 match 5 blanks 4 chips 6
1.5        0            0             2              0          mcq 10
```

All four pass. The framing header `College Board Essential Knowledge Coverage`
survives on every page, the coverage table is still collapsed on every page, and
`CED in source` is non-zero everywhere, which is the check that stops a thinner
satisfying "no CED in content" by deleting the teacher's audit surface.

## Whole-unit sweep

Every Unit 1 page, live, same three measurements:

```
1.1 lesson      CED 0   EK 0   claims 0   feedback painted 0
1.2 lesson      CED 0   EK 0   claims 0   feedback painted 0
1.3 lesson      CED 0   EK 0   claims 0   feedback painted 0
1.4 lesson      CED 0   EK 0   claims 0   feedback painted 0
1.5 lesson      CED 0   EK 0   claims 0   feedback painted 0
1.4 exercise 1  CED 0   EK 0   claims 0   feedback painted 0
1.4 exercise 2  CED 0   EK 0   claims 0   feedback painted 0
1.4 lab         CED 0   EK 0   claims 0   feedback painted 0
1.4 quiz        CED 0   EK 0   claims 0   feedback painted 0
1.1 exercise 1  CED 0   EK 0   claims 1   feedback painted 0
```

## The one thing still failing

`ap-cyber-unit-1-lesson-1-exercise-1` carries one claim about what the exam does:

> spotting social engineering red flags in a real phishing email, one of the most
> frequently tested skills on the AP Cybersecurity exam

It is the last one in Unit 1. It was reported in the claims sweep and was never
in a sheet, because the seven claim sheets covered the lesson pages and the four
1.4 artifacts and this page is neither. No sheet has been built for it: building
one puts a page under the MERGE ordering constraint, and that is a decision to
take deliberately rather than as a side effect of a verification pass.

## Still open, and not thinning

- `updateTracker` is scoped inside the `cfuSubmit` IIFE on 1.2 and 1.4, so
  `matchSubmit`, `dtbSubmit`, `seqSubmit` and `crSubmit` all throw a
  `ReferenceError` after setting the verdict. Grading, verdict and feedback are
  all correct; the score display and the scroll are lost.
- 1.5 carries its Exit Ticket twice, both copies painted. Both were thinned so
  the rule holds either way. Deleting one is a content decision.
- WO-7 (board #136, the Unit 1 exam) is routed to chat/opus, not here.

## Method worth keeping

The comparison normalizes `<td>\n` before calling a difference real. The naive
version of this check compares a prefix and a suffix and reports the gap, which
detects exactly one contiguous insertion and silently mis-describes four of
them. That is how 1.4's earlier import first read as DIVERGES when it was
correct.
