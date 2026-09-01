# AP Cyber 2.1 and 2.2 bundle quizzes: the key was patterned, and the student copy was broken

Tanner asked for the answer-letter patterns in the teacher bundle to be fixed.
The patterns were real. Underneath them sat a worse defect that nobody had
reported, in the copy students actually read.

## What was wrong

**The keys were cycled, not merely skewed.**

```
2.1   ACBD ABCD BCDA BCDA        4/4/4/4, perfectly even
2.2   CADB CADB CADB CADB CABD BCDA DACD    16 of 28 on one repeating block
```

Both were even enough to pass `answer-key-audit.js`. That is the interesting part
and is dealt with below.

**The 2.2 STUDENT copy had 18 broken strings.** An earlier pass removed the EK
citations from the student file with what looks like a plain find-and-replace.
Where the citation was a grammatical constituent, the sentence did not survive:

```
"According to, a vulnerability is best defined as which of the following?"
"Which statement(s) correctly describe shoulder surfing as defined in?"
"Lists the common ways an asset can be compromised."
"— manipulating an authorized person into granting access"     (all four of Q12)
```

Ten stems and eight options. This is ledger #125, filed as "drops the EK citation
out of several stems"; the count is higher than the ticket suggests and the Q12
and Q14 option sets were left with no subject at all.

**Q25 was a verbatim duplicate of Q7.** Same EK, same three I/II/III statements,
same answer, different only in that one said "Statement I only" and the other
"I only". 28 questions, 27 of them distinct.

**Q26's rationale argued against its own key.** Correct answer A, and the
rationale read "Options A, B, and C name attacks that do not involve cutting
power."

**2.1 leaked teacher-facing sourcing into student stems.** Q5 asked "Per the CED,
which factors...", Q4 "In CED terms...". Same defect class Tanner had already
called out for the online quizzes.

## What changed

```
2.1   ACBD ABCD BCDA BCDA          ->  DADB ACBC ABCB DACD
2.2   CADB CADB CADB CADB CABD...  ->  BADD ACDA DCAC BDBC ABCB ACAD BDCB
```

Both keys are 25 percent per letter, contain no repeated three-block, no cyclic
run, no three-in-a-row, and no block that alternates or leans three-to-one.

The correct ANSWER never moved. Only the letter it sits on. That property is
asserted per question rather than trusted.

Q25 is re-authored on EK 2.2.B.1 from the misconception side (a flood is a threat
to physical security even with no adversary), which keeps this quiz at exactly two
questions per EK. Q26's rationale now names the three distractors. The 18 broken
student strings are rewritten as sentences rather than patched. 2.1's CED
references are gone from both copies, so the two do not drift.

Q12 and Q14 also had the teacher copy asking "Which EK describes this?" while the
student copy asked "What describes this?". Both now ask the same question and the
KEY carries its citation as a trailing parenthetical, which is what Q20, Q21 and
Q24 in the same quiz already did.

## Three questions are deliberately NOT re-lettered

2.2 Q2, Q7 and Q22 have options ordered by cardinality: `I only`, `I and II only`,
`I, II, and III`. Permuting those strands `I, II, and III` at option A, which reads
as a mistake to any teacher scanning the page. They are pinned at A, D and C and
the rest of the key is designed around them.

## Why the audit did not catch this, and what now does

`answer-key-audit.js` had two detectors, `allSame` and `maxShare >= 0.6`. Both read
the distribution, and **a distribution has no order in it**. `CADB CADB CADB CADB`
is 25 percent on every letter and zero skew. It passed cleanly while being the most
guessable key a quiz can carry: read four answers and you have the other twelve.

This is the second time in one day this tool was found blind. The earlier run note,
`2026-09-01-claude-code-cyber-unit5-answer-keys.md`, fixed it being blind to a
markup shape. This is a blindness of a different kind: it read the right numbers
and the numbers do not contain the defect.

A second session reached the same conclusion from the other end at almost exactly
the same time. `5427309`, merged into main at 19:20 while this branch was open,
added two order-sensitive checks off the back of the unit 5 keys: identical keys
shared by two or more activities, and a question index locked to one letter
across every activity. Both are checks this branch had also written, and theirs
landed first.

Theirs win. Their POSITION_MIN of 4 is better reasoned than the 3 used here, and
it was arrived at by mutation testing rather than by taste: three activities
agreeing on a position is 1 in 16 and flagging it teaches people to skip the
check. This branch's duplicates are dropped.

What survives is the one thing neither of their checks can see, because both
compare activities to EACH OTHER:

```
  identical keys   fires on 2.1 and 2.2:  no
  position lock    fires on 2.1 and 2.2:  no
  allSame          fires on 2.1 and 2.2:  no
  skew >= 0.6      fires on 2.1 and 2.2:  no
```

A single quiz whose own key cycles is invisible to all four. So the repeating
block check is added on top of theirs, and the audit now has five detectors
rather than two.

One implementation note is worth keeping, because the first version of it
silently reported nothing. Taking the longest cycle at any period and then
rejecting it for having too long a period hides the finding underneath it: 2.1's
key carries a meaningless period-7 run of 12 sitting on top of the real period-4
`BCDA BCDA`. Bounding the period inside the search rather than filtering
afterwards is the fix, and there is a named assertion for exactly that mutation.

```
smoke:answerkeys     37 passed, 0 failed   (22 before either session, 27 after theirs)
smoke:quizauthoring  39 passed, 0 failed
smoke:quizgate       20 passed, 0 failed
smoke:cyberdenoms    60 passed, 0 failed
smoke:denomsafety    11 passed, 0 failed
smoke:contract       42 passed, 0 failed
smoke:namesafety     24 passed, 0 failed
```

## Evidence on the four documents

```
archive integrity        4/4, part lists identical to the originals (26 each)
only document.xml differs in all four files
XML well-formed          22 parts per file
opens via python-docx    95 / 111 / 158 / 190 paragraphs
purple + checkmark       DADBACBCABCBDACD and BADDACDADCACBDBCABCBACADBDCB
                         read back off the runs, matching the printed summary line
one purple option per question, one checkmark, none in either STUDENT copy
176 option slots compared between KEY and STUDENT: 0 mismatches
every rationale: 'Why X' matches the purple option, and every 'Option ...'
                 reference names the same text it named before the re-lettering
```

## Not verified

**No visual render.** LibreOffice is installed in the container but cannot convert,
including a plain `.txt` file and including the untouched originals, so the PDF
check that was planned did not run. `verify3.py` substitutes an independent OPC
parser reading the colour off each run, which answers "is the purple on the right
option" more directly than a visual check would. It does not answer "does this look
right when opened". Somebody should open one file before these replace anything in
Drive.

## Still open

- The four documents are not yet in Drive. Plan is archive the originals, upload
  the replacements into the Quiz folders. The Command Center links folders rather
  than files, so new file ids are safe.
- Units 2.3, 2.4 and the Unit 2 Test are not audited. Nor are Units 3 to 5.
- The online quiz banks were not touched by any of this.

## Addendum, 23:25: merged main twice more, and one finding going the other way

Main kept moving. `6fa96a2` taught the REBALANCE path the opt-btn shape so unit 5
can actually be fixed rather than only named, and `974b2cf` replaced every CSP
target after finding 25 of 35 CSP quizzes were sharing two rotations, `ABCDAB`
thirteen times and `CDABCD` twelve. Both landed while this branch was open, both
touched the same two files, and both win on the parts that overlap. This branch
still contributes only the repeating-block check.

Pointing the check at the 41 targets afterwards found one going the other way.
The new CSP targets are all distinct, per-column balanced 9/9/9/8, and overall
A52 B52 C53 D53. One of them is `CDACDA`:

```
ap-csp-course-bi5-legal-ethical-concerns   CDACDA   = CDA twice
```

Six answers, and the second three are the first three. Learn `CDA` and the quiz
is free. It satisfies every property the generator enforces, because none of them
look at periodicity within a single key.

The first version of the repeating-block rule missed it too, needing eight
answers before it would speak. That threshold was set to avoid crying wolf on
short quizzes, and it is right for a key that merely BEGINS to repeat, such as
the old `ABCDAB`. It is wrong for a key that is fully periodic, however short: a
random six-key repeating a three-block is `(1/4)^3`, or 1 in 64, which is the
same bar `POSITION_MIN` already answers to in this file. So the rule now fires on
either "long enough to ride" or "fully periodic", and period 1 is left to
`allSame` so one defect is not reported twice.

Rescanned with that rule, exactly one of the 41 targets flags, and it is that
one.

**Not fixed here, deliberately.** Hand-editing `CDACDA` would swap two positions
and break the per-column balance the generator computed. The fix belongs in the
generator, as a fourth property alongside distinct, per-column and overall. That
is the other session's code and its own change.

```
smoke:answerkeys  48 passed, 0 failed   (22 originally, 36 on main, 48 here)
```
