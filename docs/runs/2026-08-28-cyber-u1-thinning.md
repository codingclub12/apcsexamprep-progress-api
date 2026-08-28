# Unit 1 thinning: "the CED" out of the content, on all four remaining pages

**Agent:** Claude Code
**Branch:** `claude/ap-cyber-unit1-handoff-b10iwk`
**Sheets:** four, all built against the CURRENT live bodies. Built, not imported.

## The rule

Tanner's words: mention where a topic fits when it starts, do not lean on it in
the middle of the content. Topic 1.2 had this pass already. These are the other
four.

```
page   "CED" painted    EK codes painted   splices
1.1        75 -> 0           28 -> 0          84
1.3        17 -> 0            9 -> 0          24
1.4         9 -> 0           16 -> 0           9 + the EK thinner
1.5        23 -> 0            8 -> 0          26
```

**Nothing is added on any of them.** The framing mention already exists in the
right place on all four: the accordion header "College Board Essential
Knowledge Coverage", above the first lesson section, with the coverage table
collapsed behind it. Every sheet only removes.

## 1.1 was a different problem from the other three

On 1.3, 1.4 and 1.5 the citations were decoration on top of the teaching. On 1.1
the course description IS the teaching device: "the CED defines", "the CED
names", "the CED lists", "The Topic 1.1 vocabulary, straight from the CED",
"Read it the CED way", seventy-five times in what a reader sees.

It is still a thinning pass rather than a rewrite, because every one of the
seventy-five is formulaic and every one stands in for a fact the page can simply
state. "The CED says adversaries often use intimidation and urgency" becomes
"Adversaries use intimidation and urgency often, not always". Shorter, same
claim, and it stops leaning on a document a fifteen-year-old has never been
handed. Not one claim changed.

Two places needed a decision rather than a substitution. The Unit 2 preview
lists five tactics with their codes; the point of that box is that they belong
to a later unit, and the codes add nothing to that point, so the names stay and
the codes go. The tactic and impact cards carry a code chip under the heading;
with the code gone the chip has nothing left to say that the heading does not,
so the chip goes rather than being filled with a synonym.

## Three exam claims removed as well

The gate refuses a body carrying a claim about what the exam does, and 1.1 still
had three: two "Exam signal:" labels and an "AP exam tip" table column. They
were the last three in Unit 1; every other page had been cleared in the previous
pass. Both "Exam signal" boxes describe a real tell in the message itself, which
is the useful half and the half that survives.

## Two mistakes the tooling caught rather than shipped

**An overlap between two global splices.** "CED definition." is a substring of
"under the CED definition", so the card-label splice and the prose splice both
claimed the same bytes. The overlap check refused the build instead of letting
one silently eat the other's region. Fixed by anchoring the card label on its
markup, `<strong>CED definition.</strong>`.

**A second overlap**, where the exit ticket's question 4 anchor contained
"under the CED definition" that the global splice also rewrites. Trimmed to
start after it.

Both are the check doing exactly what it exists for. Neither would have been
visible in the output: one splice would simply have won.

## What moved into shared code

`lib/cyber-splice.js` now holds the splice machinery. Five modules had grown
their own byte-identical copy of `indexOfUnique` and `applySplices` and a sixth
was about to. The repo's history says what comes next: the checks that drifted
silently were all copies of something that worked somewhere else.

`lib/cyber-thin-gate.js` holds the gate, and `scripts/cyber-thin-csv.js` is one
parameterised build script rather than four.

`all: true` is deliberately narrow. 1.5 carries its exit ticket twice byte for
byte, and 1.1 repeats "under the CED definition" eight times where one
replacement is right everywhere. A unique anchor cannot reach the second copy of
an identical string, and loosening uniqueness for every splice would throw away
the guarantee for the sake of two pages. So a splice has to say `all: true` out
loud, and an ambiguous anchor without it is still an error.

## On 1.3, a protection that was never a decision

Six of 1.3's nine painted codes are chips on the attack and protection cards and
the other three are in the exit ticket's answer block, and
`cyber-ek-density.protectedSpans` marks all of them protected. That protection
was added on purpose, to stop an earlier version of the thinner stripping the
chips by matching them on a prefix. It stops the tool mangling them. It was
never a decision that a student should see them.

So they are handled as page-level splices rather than by loosening a shared
protection that four other pages also run.

## 1.5 carries its Exit Ticket twice

Both copies are painted: a student sees the same five questions and the same
answer key one after the other. The two differ slightly, in a way that reads
like an older copy left behind by an edit.

Both are thinned so the rule holds either way. **Neither is deleted.** Choosing
which of two nearly identical cards to remove is a content decision, and this is
a thinning pass. It is recorded here and in the PR so it is a decision on the
record rather than something a sheet did quietly while doing something else.

## Evidence

```
render   1.1, 1.3, 1.4 and 1.5 render checks all pass
keys     MCQ, sequence order, match rows, dtb blanks and chips, quiz answer
         keys: unchanged on every page
answers  0 feedback boxes painted on load, on every page
claims   0 claims about what the exam does, on every page
suites   apclaimgate ekprotect gatesabotage exsabotage exgate cyberquizgate
         encoding assertions, all pass
```

## Import

Each sheet is MERGE and writes the whole body, so one page at a time, and
nothing else may be built against a page between its build and its import. The
four are independent of each other and can go in any order.

## After these land, Unit 1 is done

Zero claims about what the exam does, zero EK codes and zero uses of "CED" in
what a student reads, on all five lesson pages and all four 1.4 artifacts, with
the framing mention preserved at the top of every topic.

What remains is not thinning:

- `updateTracker` is scoped inside the `cfuSubmit` IIFE on 1.2 and 1.4, so four
  submit handlers throw after setting the verdict. Grading, verdict and feedback
  are correct; the score display and the scroll are not.
- 1.5's duplicated Exit Ticket, above.
- The 1.1 exercise page still carries one claim about what the exam does.
- WO-7, the Unit 1 exam, is routed to chat rather than here.
