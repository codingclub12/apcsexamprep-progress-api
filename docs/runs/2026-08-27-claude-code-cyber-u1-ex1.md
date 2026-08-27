# The audit said clean, the page was teaching Unit 2

2026-08-27, Claude Code. Follow-on from WO-3. The question asked was narrow,
whether red flag #1 on Topic 1.1 Exercise 1 was correct. It is. Two of the other
six were not, and the reason nobody had noticed is worth more than the fix.

## The tooling was measuring the wrong region

`ced_audit.py` reported Exercise 1 **clean**. The handoff's damage table rated it
"low", 3 off-CED hits. Both were wrong, and in the same way: the audit stripped
`<script>` before counting, the way you strip markup, and this page renders all
seven of its red flags out of a JavaScript array. Every word a student reads on
it lives inside a script block.

What was hiding there:

| Flag | What it said | Problem |
|---|---|---|
| #5 | `principle: 'Psychological Tactic: Authority + Urgency combined'` | Authority is EK 2.1.A.3, Unit 2. Labelled a psychological tactic, so a student who read the 1.1 lesson (two tactics, named) and then did this exercise was handed a third. |
| #3 | "what distinguishes generic phishing from spear phishing, which does use your name" | Neither term is in the CED, and the lesson two clicks away now carries a banner saying spear phishing is not assessed. The exercise contradicted it. |

The JSON-LD description also advertised the page as covering "phishing emails,
vishing calls, and smishing messages".

Five of the seven flags were already right and are untouched. #2 names urgency
and #4 names intimidation, both accurately. #1, #6 and #7 describe observable
properties of the specimen rather than making a tactic claim, which is what a CED
scenario does. #1 names typosquatting, which is not CED vocabulary, but as an
*indicator* rather than something to classify, and impersonation is genuine
1.1.C.1 language. Left alone on purpose: the job was the two flags teaching
off-CED material as content, not a rewrite of a page that is mostly right.

## The audit now reads three regions

BODY is prose outside script and style. JS is text inside non-JSON-LD script
blocks, which on these pages is student-facing content that happens to be
rendered by code and counts exactly as much as BODY does. META is JSON-LD, which
is search metadata and never the urgent hit. A count prints as `12+3`, meaning 12
in BODY and 3 in JS, and any page with a JS number gets an explicit line saying
it was invisible to earlier runs.

**The first run of that change produced a false positive, and it is the reason
every term now matches on a word boundary.** `mitm` fired on three clean pages,
including the lesson that had just shipped. The grading engine defines
`cfuSubmitMCQ` and `cfuSubmitMatch`; "subMITMatch" lowercases to contain "mitm".
Terms that are deliberate prefixes, like `dumpster div` catching "dumpster
diving", are listed in `PREFIX` and get a leading boundary only.

## Across Unit 1, after the fix

Four pages carry hits that only appear inside JS. Only one of them is a defect.

| Page | JS-only hits | Verdict |
|---|---|---|
| lesson-1-exercise-1 | spear phishing, authority | **the defect.** Fixed here. |
| lesson-1-exercise-2 | authority, scarcity | fine. Both are labelled Unit 2 with their EK codes, which is the sanctioned use. WO-1 did this deliberately. |
| lesson-1-lab | authority | fine, same pattern. |
| lesson-5-exercise-2 | spear phishing | marginal. Incidental use in feedback copy, describing a scenario rather than teaching a taxonomy. The handoff calls this page clean; it is not literally clean, but it is not teaching the term either. |

So the blind spot was real and the alarm it raised was mostly false. Worth saying
plainly: three of the four pages were already doing the right thing, and only
Exercise 1 needed work.

## A red gate that meant two different things

`validate_csv.py` failed the new sheet on `has_lesson_id`. That is a real defect
and it is not this sheet's: Exercise 1 carries no `data-lesson-id`, never has, and
so reports no progress at all. It is one of four Unit 1 pages in that state, with
the quiz, the exam and the hub. Every other activity page has the attribute.
Injecting it is chat-side work per CLAUDE.md, not this repo's.

Every check in that script is absolute. It asks whether the sheet is in a good
state, not whether the sheet makes anything worse, and those are different
questions. Shipping past a red gate is the habit gates exist to prevent, and
weakening the check would have lost a real signal.

So `--baseline <dir-of-live-json>` was added. A check that fails on the sheet
**and** on what is already live is reported as PRE-EXISTING and does not block. A
check that passes live and fails on the sheet is a regression this import would
cause, and still fails. Without `--baseline` nothing changes. Tested both
directions: the sheet passes with the pre-existing line shown, and a severed
`</div>` still fails while that line still shows.

## The gate for a page that is its own JavaScript

Balanced tags prove nothing about whether a JS-driven widget runs. A splice that
lands one character wrong inside a string literal produces perfectly valid HTML
and a blank exercise. So `scripts/cyber-u1-ex1-ced-csv.js` compiles every script
block with `new Function`, parses the JSON-LD, re-parses the seven-flag array and
checks ids and order are unchanged, requires the five untouched flags to be byte
identical, and checks the two rewritten ones on what they say rather than on
bytes. Negative-tested by corrupting a string literal: HTML stays valid, the gate
rejects it.

## Evidence

Off-CED in the flag copy goes to zero. The one surviving `authority` is the
labelled Unit 2 disclaimer, matching what Exercise 2 and Lab 1 already do, and
the gate requires 2.1.A.3 to be cited alongside it. Both script blocks compile.
`smoke:encoding` and `smoke:filegate` pass.

`MISSING EK` still lists elicitation, one-time password and challenge question.
That is the heuristic doing its job badly on a single-specimen exercise: this
page dissects one email and was never going to cover OTPs. Not chased.

## Imported and verified live

Imported 2026-08-27. `updated_at` moved to `2026-08-27T12:31:06-05:00`. Verified
against the live page JSON and the rendered storefront, not against the sheet.

43 of 43 post-import assertions pass. The seven-flag array still parses from the
live body with its ids and order unchanged and no empty fields. Flag #5's
principle now reads `Psychological Tactic: Urgency (1.1.A.2, mechanism 1.1.B.3)`
and its body cites 2.1.A.3 for authority. Flag #3 no longer mentions spear
phishing and ties the missing detail to EK 1.1.C.1. Both CED tactics are still
named. No off-CED term appears anywhere in the student-facing flag copy, and the
single surviving "authority" is the labelled disclaimer. The JSON-LD parses and
no longer advertises vishing or smishing. Activity nav and the sticky rail are
intact, tags balance with comments stripped, and there is no double-encoded text.

Both JavaScript blocks compile from the live body and the JSON-LD parses, which
is the check that actually matters here: the widget IS the page, and valid HTML
would prove nothing about whether it runs.

The stored body is 30 bytes shorter than the sheet, which is the same Shopify
entity decode documented in the WO-3 note, at a smaller scale because this page
has fewer entities. `verify_import.py` normalises it and passes.

Snapshots for both states are in `shopify/page-snapshots/`, and this time the
before copy went on disk before the sheet was built.

## Still open

- **Four Unit 1 pages report no progress at all**: exercise-1, lesson-1-quiz, the
  unit exam and the hub carry no `data-lesson-id`. Chat-side work, but somebody
  should own it.
- **lesson-5-exercise-2** has one incidental "spear phishing" in feedback copy.
- WO-2's lab sheet is still unimported. WO-4 through WO-8 untouched.
