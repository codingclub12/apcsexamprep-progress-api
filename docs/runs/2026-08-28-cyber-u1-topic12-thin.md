# Topic 1.2: stop saying "the CED" to students

**Agent:** Claude Code
**Branch:** `claude/ap-cyber-unit1-handoff-b10iwk`
**Page:** `ap-cybersecurity-unit-1-password-attacks` (id 132157374679)
**Sheet:** `out/topic12-thin.csv`, one row, Command MERGE. Built, not imported.

## The rule this implements

Tanner's words: mention where a topic fits when it starts, do not lean on it in
the middle of the content.

Eleven uses were painted on this page and not one of them was doing framing
work. Every one was a qualifier that could be deleted without changing what was
being asked, which is the tell:

- an adjective in the objectives bullet, "all three CED signs"
- two Bellringer lines, including "Name every CED sign of a password attack"
- three cells of the Common Mistakes table, each ending on a citation instead of
  an explanation
- five Exit Ticket lines, which are the worst of them because a student is
  graded on them. "How would the CED describe what the adversary does next?"
  asks a fifteen-year-old to guess at the wording of a document they have never
  been handed and never will be.

## Nothing was added

The framing mention already exists and is already in the right place: the
accordion header **College Board Essential Knowledge Coverage / Topic 1.2 - What
Is Testable**, sitting four screens above the first lesson section. A student who
wants to know where the topic fits opens it and reads the coverage table. That
is the surface the house rule keeps, and it needed no help, so this sheet only
removes.

## What replaced each one

Never a deletion that leaves a shorter sentence saying less. Where the reference
was carrying meaning by proxy, the replacement says the thing directly:

| was | is |
|---|---|
| The CED lists all three. | There are three signs, not two. |
| CED says: long, random, unique. | Long, random, unique. A passphrase is a perfectly good way to get all three at once. |
| How would the CED describe what the adversary does next? | Describe what the adversary does next, and name which of the three kinds of guess it is. |
| Explain why it fails the CED criteria. | Explain which of long, random and unique it fails. |
| What happened? Map it to CED concepts. | What happened, and which signs give it away? |

Twelve sentences changed in total, all read.

## A count would have got this wrong

Two occurrences must SURVIVE: the `CED Ref` column header and the
`Source: AP Cybersecurity CED Effective Fall 2026` footnote. Both live inside
`ek12-body`, which ships `display:none`. A gate that counted occurrences would
have demanded their removal and taken the teacher's coverage table with them.

So the gate states the rule the way the house rule states it: **zero in what a
reader sees, any number in what only a teacher opens.** That distinction cannot
be made by reading markup, so the gate loads the body in Chromium and reads
`document.body.innerText`. This page has already taught that lesson once: an
earlier probe walked the DOM, filtered to leaf elements, and reported a painted
EK code as hidden because it sat in a div that also held a `<strong>`.

The gate also asserts the framing mention survives. Removing every reference
would satisfy "no CED in content" too, and would be wrong.

## Evidence

```
11 splices resolved, 275515 -> 275613 bytes
gate     "CED" in painted text: 11 -> 0
         "CED" in source: 13 -> 2 (both inside the collapsed coverage table)
         framing mention intact: the coverage accordion header
         MCQ keys unchanged: cfu-2=C cfu-4=D cfu-6=B cfu-8=B cfu-10=D
         sequence, match, dtb keys and chips all unchanged
         feedback boxes painted on load: 0
render   EK codes in painted text 0; answer-key phrases none; table collapsed
grade    9 items driven in Chromium, every keyed answer grades correct
sabotage 10 of 10 caught
```

## Two mistakes of my own

`painted()` returned the `page.evaluate` promise from inside a `try` whose
`finally` closed the browser, so the first run died with "Target page, context
or browser has been closed". That reads like a Playwright problem and is an
ordinary try/finally bug: the promise has to be awaited before the block exits.

The last sabotage typed "signes" to test the non-ASCII check. "signes" is pure
ASCII, so it tested nothing and reported the gate as broken. A suite has to be
wrong loudly, not quietly; fixed to a real non-ASCII byte.

## Why the sabotage suite is not a smoke:* script

Its checks read what a browser paints, and CI never runs `npm run smoke:install`,
so `smoke/node_modules` and the Playwright inside it do not exist there.
`.github/workflows/tests.yml` auto-discovers every `smoke:*` script, so wiring
this in would add a check that is red on every PR for a reason unrelated to the
PR. It runs by hand before the sheet ships, in the same category as
`cyber-u1-topic14-render-check.cjs` and `cyber-u1-topic12-grade-check.cjs`.

## Still open

- **The sheet is built and not imported.** Matrixify MERGE writes the whole
  body, so it must land before any other sheet is built against this page.
- `updateTracker` is still scoped inside the `cfuSubmit` IIFE, so the four
  non-MCQ submit handlers throw after setting the verdict. Untouched here, and
  Topic 1.4 has the same block.
- The other four lesson pages still say "the CED" in student prose. This sheet
  fixes 1.2 only. The same module shape ports to each; 1.3 and 1.5 already have
  thinning modules from an earlier pass, and what they do NOT yet do is the
  painted-text check this gate introduced.

---

## Verified live, 2026-08-28

Tanner imported the sheet. Checked against the live body, not the sheet.

```
GET https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-password-attacks.json
updated_at  2026-08-27T22:06:49-05:00
live bytes  275613        built 275613
live md5    3dc33ee743fc2424c65c4b908d19a79b
built md5   3dc33ee743fc2424c65c4b908d19a79b
IDENTICAL   true
```

**Byte-identical, with no normalizer delta this time.** The previous import
picked up one inserted newline from Shopify's markup normalizer. This one did
not, and the reason is worth recording rather than being surprised by twice:
that sheet was built against the pre-import body, so the normalizer still had
work to do on save. This one was built against the body Shopify had already
normalized, so there was nothing left to change. The rule that falls out of it:
**always build the next sheet against the CURRENT live body**, which is what the
build script does by fetching rather than reading a snapshot.

### The gate, the render check and the grade check, all against the live body

```
gate     0 failures
         "CED" in painted text: 11 -> 0
         "CED" in source: 13 -> 2 (both inside the collapsed coverage table)
         framing mention intact: the coverage accordion header
         MCQ keys unchanged: cfu-2=C cfu-4=D cfu-6=B cfu-8=B cfu-10=D
         sequence, match, dtb keys and chips all unchanged
         feedback boxes painted on load: 0
render   EK codes in painted text 0; answer-key phrases none; table collapsed
grade    9 items driven in Chromium, every keyed answer grades correct
```

And the replacement copy is on the page, checked one line at a time: "There are
three signs, not two", "Long, random, unique", "which of the three kinds of
guess it is", "which signs give it away", "Identify all three signs".

Live snapshot committed as
`shopify/page-snapshots/ap-cybersecurity-unit-1-password-attacks.live-after-thin.html`.

### Topic 1.2 is now closed

Both sheets are live and verified. What a student sees on this page:

- zero claims about what the exam does
- zero EK codes
- zero uses of "CED", with the framing mention preserved as the coverage
  accordion header at the top of the topic
- every graded item keyed to the seven Essential Knowledge statements, and every
  key unchanged since before the realignment began

### Still open, and not on this page

- `updateTracker` is scoped inside the `cfuSubmit` IIFE, so `matchSubmit`,
  `dtbSubmit`, `seqSubmit` and `crSubmit` throw after setting the verdict.
  Grading, verdict and feedback are correct; the running score display and the
  scroll are lost. Reproduces on Topic 1.4, which carries the same widget block.
  Deliberately untouched by both 1.2 sheets.
- Fourteen claims about what the exam does survive on 1.1, 1.4, 1.5 and three of
  the 1.4 artifacts. 1.3 and the 1.4 quiz are clean.
- The other four lesson pages still say "the CED" in student prose. 1.3 and 1.5
  have thinning modules from an earlier pass; none of them does the painted-text
  check this gate introduced.
