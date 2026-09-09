# The last three cyber quizzes: two decisions, then it ships

22 of 25 cyber quiz pages are server-scored. The remaining three are
`2.3`, `3.5` (unit-3 lesson-6) and `4.1`, and until they are mounted a teacher
lock on them is decorative: the questions and the answer key sit in page source.

They were not skipped by accident. `scripts/extract-cyber-quizzes.js` refused all
three, for two different reasons, and both refusals are the tool doing its job.
Neither is a bug to fix in code. Both need a person.

## Decision A: five stems name the CED to a student

`lib/quiz-citation.js` refuses a prompt carrying teacher register (an EK or LO
code, the word CED or CB, or a numbered code). Its own note says why it refuses
rather than strips:

> Deleting "according to the AP CED" from a stem changes what the stem claims
> while looking like a migration. Rewording is a content decision and belongs to
> a human.

So here are the five, with the smallest change that clears the rule. Four are
deletions. One is a real rewrite and is marked.

**2.3 Q4** (Prioritizing Mitigations)

    now  Exactly one row is ranked wrongly under EK 2.3.B.8, which prioritizes
         mitigations by the severity of the risk and the cost of the mitigation.
    ->   Exactly one row is ranked wrongly. Mitigations are prioritized by the
         severity of the risk and the cost of the mitigation.

The code is doing no work. The sentence already states the rule it points at.

**4.1 Q2**

    now  Which of the following statements about malware are TRUE according to
         the AP CED?
    ->   Which of the following statements about malware are TRUE?

**4.1 Q3**

    now  Each pairing below matches a device exploitation vector with a valid CED
         defense EXCEPT:
    ->   Each pairing below matches a device exploitation vector with a valid
         defense EXCEPT:

**4.1 Q5**

    now  Using the CED High/Moderate/Low device-risk framework, which assessment
         is MOST defensible?
    ->   Using the High/Moderate/Low device-risk framework, which assessment is
         MOST defensible?

**4.1 Q6** REWRITE, not a deletion

    now  ...Which malware type is this, and which CIA principle does the CED most
         directly associate with it?
    ->   ...Which malware type is this, and which CIA principle is most directly
         affected?

Dropping "the CED" alone leaves "which CIA principle does most directly associate
with it", which is not a sentence. This is the one where the wording genuinely
changes, so it is the one worth reading twice. If "affected" is wrong for the
intended answer, name the verb you want and it goes in.

None of these touches an option or an answer. The key does not move.

## Decision B: 3.5 has ten questions, and ten is bundle-sized

The other two refusals are about wording. This one is about what the page IS.

`ap-cyber-unit-3-lesson-6-quiz` carries **10 questions**. It says so itself:
"Question 1 of 10". Every other cyber lesson quiz on the site measures five.
The extractor refuses anything over six, and says why:

> A teacher bundle instrument is 9 to 24 items, so this needs a human to confirm
> what it is before it is seeded.

Ten sits inside that range. Seeding a bundle instrument into the public
server-side bank is the 2026-08-26 incident with the arrow reversed, and the
disjoint-banks rule exists because a gated unit test built from public items is
not gated.

What can be established from here:

- The page is in the ordinary lesson-quiz slot and the lesson rail links it as
  "Quiz", like the other five.
- Its questions and key are ALREADY public, in page source, served to anyone.
- Unit 3 lesson 3.5 carries its own separate teacher Drive quiz doc, id starting
  `1z52y1IaKzvL`, distinct from every other lesson's.

That last point is the one that probably settles it, and it takes a minute: open
that Drive doc and see whether its items are the same ten. If they are different
instruments, this is just a long web quiz and it can be seeded. If they are the
same, the web page is publishing the bundle instrument and mounting is the wrong
fix, because the items would need re-authoring instead.

The `.docx` files are not in this repo, so no diff is possible from here. That is
why this is a question rather than a measurement.

## What happens after each answer

**Decision A approved.** The five stems ship as a Matrixify sheet against 2.3 and
4.1. Then the extractor stops refusing them, the questions go into
`seed/cyber-units-2-5-web-quizzes.js`, a deploy converges `quiz_bank`, and a
second sheet mounts the two pages. Two imports, checked between.

**Decision B answered "it is a web quiz".** 3.5 needs one more thing than the
other two: `extract-cyber-quizzes.js` knows three markup generations and this
page is a fourth. Its shape, read off the live page:

    <div class="q-block" id="qblock-N">
      <div class="q-stem">          the prompt
      <div class="opt" id="opt-N-A" onclick="selectOpt(N,'A')">
        <span class="opt-letter">A.</span><span>option text</span>
      <button class="check-btn" onclick="checkQ(N,'A')">   the key, second argument

That is a parser plus the ceiling raised for this one page, both mechanical, and
both mine once the answer is "web quiz".

**Decision B answered "it is the bundle instrument".** Mounting is off the table
and the real fix is to take the items off the public page and author replacements,
which is a bigger content job than the other two combined.

## The cost of leaving them

2.3 is the worst of the three and worth naming separately. Besides shipping its
key, it renders **21 CED Essential Knowledge codes in student-visible text**,
measured through `lib/cyber-ek-density.js` as `{"total":21,"kept":0,"cut":21}`.
Its per-option explanations read like "(A) Incorrect, EK 2.3.A.1 training tells
employees not to badge others in". A student reads the answer and the CED codes
in the same breath. Mounting it fixes both at once, and Decision A is the only
thing in the way.
