# Topic 1.4 Quiz: four splices, one defect reported not fixed, one mistake of mine

Page `ap-cyber-unit-1-lesson-4-quiz`, id 132673667287, 61,192 chars. The last
Topic 1.4 artifact.

## The graded content is sound

Five questions, key `{1:'B',2:'B',3:'C',4:'C',5:'C'}`, and every keyed answer
describes something the CED covers without a legacy label:

```
Q1 B  a video call impersonation, which is an AI deepfake
Q2 B  the attacker scraped social media and referenced what it found
Q3 C  AI rewrote each wave so the filter's patterns stopped matching
Q4 C  offensive and defensive AI share underlying capabilities
Q5 C  out-of-band verification, correct for a written BEC and matching the lab
```

The five explanations are clean too. So: four splices, not a rebuild.

## What changed

1. **The Exam Overview line.** It listed "spear phishing" among the techniques
   and claimed to cover "psychological tactics", which Topic 1.4 does not assess
   at all. That line is the quiz's own statement of what it tests, which a
   student reads to decide what to revise, so it is worse than a wrong
   distractor.
2. **Q1 option A** named the legacy term. A distractor, so permitted, but the
   same wrong answer now reads the same way across the lesson, both exercises
   and the lab.
3. **Q5 option D** read "All three controls are equally important and choosing
   only one would provide no meaningful protection", an all-of-the-above in
   disguise and barred by the house rules.
4. **The Q2 explanation** said "OSINT-scraped details". OSINT stays a permitted
   industry word, but an explanation is the page telling a student what the
   technique is called, so it leads with the topic's name and keeps the industry
   one alongside.

The answer key is byte-identical after all four.

### The distractor I got wrong first

Q5-D's first replacement was the right control with a wrong reason, which is
good AP style in general. It was wrong here: it opened with the same words as
option C, the credited answer, so a student scanning the list met two
near-identical choices and the item became about careful reading rather than
about the content. The shipped version names a different control and fails for
the reason this topic hammers hardest, relying on detection.

## The defect reported and not fixed

**The key is B, B, C, C, C.** No A, no D, and three of five are C, so a student
guessing C on every question scores 60%.

That is real and it is not this pass's to decide. Rebalancing means changing
which letter is correct on a live graded quiz, which is an assessment call, not
a CED-alignment one. Board task #130 already tracks the same class of problem on
the Unit 5 quizzes.

Worth knowing for whoever takes it: **this page has no reporter.** It makes no
network call, so no attempt data exists to invalidate and reordering options
costs nothing today. Once the reporter lands, stored `detail` JSON records option
indices and reordering gets expensive. Now is the cheap moment.

`lib/cyber-quiz-gate.js` reports the distribution on every build rather than
failing on it, because failing would block every unrelated edit to an existing
quiz until someone re-keys it.

## A third widget shape

Neither the exercise gate nor the page gate reaches a quiz: there are no
`<select>` elements at all, just an answer key object and clickable divs. Same
failure mode in a different costume, so `lib/cyber-quiz-gate.js` checks the key
against the options, that every option is wired to `selectOpt` and labelled,
that no option is a catch-all, and that neither the credited option nor the
explanation names a legacy term.

Written as a module rather than inline because more cyber quizzes are coming:
#130 for Unit 5, #131 for 1.1 and 1.2. Three copies is where drift starts, and
this repo has paid for that twice already.

`smoke/cyber-quiz-gate.js` (`smoke:cyberquizgate`) proves twelve behaviours,
including two the module got wrong on the real page, both of them the gate
crying wolf:

- `questions()` required a trailing `</div></div>`, which only closes the LAST
  option in a group. It found option A and nothing else, then reported all five
  keyed answers as ungettable on a page where every one works.
- the label was read as the last `<span>` after the option id. For the final
  option that window runs on, and it picked up the results panel's score display
  as option D's text.

`scripts/cyber-quiz-grade-check.cjs` drives it in Chromium: 5 of 5 marked
correct, feedback shown on all 5, 0 false positives on an all-wrong run, no page
errors. Break a key deliberately and it reports the missing element and 4 of 5.

## A mistake worth recording

I wrote my new test to `smoke/quiz-gate.js`, which **already existed**: a
152-line suite for the teacher activity gate, unrelated to any of this. The
Write tool said "updated" rather than "created" and I did not read it.

Restored from git, verified byte-identical, and its suite passes. Mine went to
`smoke/cyber-quiz-gate.js`. I then checked every other file I had touched this
session against the pre-existing tree; `package.json` was the only one, and that
was deliberate.

The lesson is the same one this whole day keeps teaching: check what is there
before writing over it. "Created" and "updated" are different words for a reason.

## Still open

- Sheet built, not imported: `out/l4quiz.csv`, 62,284 bytes, one row, MERGE.
- **All five Topic 1.4 sheets are now built and none are imported.**
- The answer-key rebalance above.
