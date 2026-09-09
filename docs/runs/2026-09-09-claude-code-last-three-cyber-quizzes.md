# The last three cyber quizzes, unblocked

22 of 25 cyber quiz pages were server-scored. The three left, 2.3, 3.5 and 4.1,
were refused by `scripts/extract-cyber-quizzes.js` for two different reasons, and
this pass clears both. Nothing here is imported yet.

## What was in the way

**Five stems named the CED to a student.** One on 2.3, four on 4.1.
`lib/quiz-citation.js` refuses those, and its own note says why it refuses rather
than strips: deleting "according to the AP CED" changes what a stem claims while
looking like a migration. The rewordings went to Tanner in
`docs/cyber-last-three-quizzes-decision.md` and came back approved.

**3.5 was a fourth markup generation, and ten items.** The extractor knew three.

## The half that was tempting to skip

The seed is GENERATED from live page bodies and `build-cyber-quiz-seed.js --check`
re-derives it, so a corrected stem has to exist in a body the extractor reads.

It would have been half the work to patch a local copy of each body, run the
extractor on that, and never ship a sheet at all. The output would have been
identical, which is exactly what makes it the wrong habit: it is routing around
a guard to obtain the thing the guard was refusing. So the five edits ship as a
MERGE sheet against the two live pages, and the extraction happens afterwards.

## 3.5, and the call that was actually a judgement

Ten items sits inside the 9-to-24 range the extractor uses to spot a teacher
bundle instrument wearing a web quiz's clothes, and it refuses rather than guess.
Three things made it answerable:

- Every one of its ten questions carries a "Predict first" prompt. That is PRIMM
  lesson scaffolding, which is how this site writes a web lesson. A gated unit
  test does not ship per-item predict prompts.
- Its ten stems share nothing with the 60-item public practice bank in
  `config/cyber-exam-items.json`. Measured as 5-gram overlap: the highest pair
  scored 5.1% and is on an unrelated topic.
- Lesson 3.5 has its own separate teacher Drive quiz doc, so the bundle
  instrument exists as a different artifact.

What none of that proves is that the Drive doc holds different items. The `.docx`
files are not in this repo. If they turn out to be the same instrument both need
re-authoring, and seeding does not make that worse: the page is public today and
serves its own key, so moving it server-side strictly reduces exposure. Dropping
a qid from the seed sets `active = 0` rather than deleting, so it is reversible.

The confirmation is recorded per page AND per COUNT, not as a raised ceiling.
An eleventh question puts it back over the line, because what was confirmed is
an instrument rather than a handle.

## Evidence

`deploy-gates/2026-09-09-cyber-last-three-quizzes.json`, green on suite, rederive
and mutation.

The check worth reading is the key re-derivation. A new parser reading an answer
key is the one thing here that can put a wrong answer in front of a class, so the
suite does not trust it: for all ten questions it reads the letter `checkQ` names,
finds the option div with that letter, and requires its text to be the option the
parser marked correct. Ten of ten. The mutation that makes the parser read option
ORDER instead of the named letter reds exactly that row.

Extraction against the corrected bodies now yields all three: 2.3 at five, 3.5 at
ten, 4.1 at six. 21 questions. Four explanations name an option letter and are
dropped, which is the documented behaviour because the server reshuffles options.

232 offline suites run locally, 229 pass; `csakitstyle`, `deckvoice` and
`exercisekeys` fail in this container for a missing `python-pptx` and
`python-docx` and have nothing to do with this.

## What the mutation battery caught, which was three times in my own fixtures

Every failure this pass was in the test, not the code, and all three were the
same mistake: asserting against markup I had assumed rather than read.

- The EK-count assertion fired on a correct edit, because it counted codes across
  the whole body while 2.3's Q4 stem legitimately loses one. The rule is not "no
  EK code moves", it is "none except the ones these five edits account for", so
  the expected delta is now derived from the edits.
- The explanation check used a 400-character window after each feedback marker,
  which on 4.1 ran past the div and into the next question's stem. A window is a
  guess about length; `[^<]*` stops where the explanation stops.
- The planted fixture targeted `id="q2"` when the real id is `q2-fb`, so the
  plant silently did not apply and the row read green while asserting nothing.
  It now fails loudly if the plant does not land.

Two mutations were withdrawn rather than fixed, and both are recorded in the gate.
Removing the stem-scope guard leaves the suite green because assertion 4, undoing
the five edits must reproduce the original byte for byte, is a total blast-radius
check that nothing gets past. And replacing the 4.1 Q6 rewording with a bare
deletion, which leaves "which CIA principle does most directly associate with
it", also leaves everything green. No automated check can judge whether a
sentence reads like English. That is not a gap; it is why the rewording was
Tanner's call, demonstrated rather than asserted.

## Still open, in order

1. **Import `imports/2026-09-09-cyber-quiz-stem-reword/`.** MERGE, two rows.
   Preflight clear, parse-back diff zero.
2. Then extract, build the seed, and merge it. A deploy converges `quiz_bank`.
3. Then a mount sheet for all three, and `npm run verify:cyberquizmounts` should
   answer 25 of 25 mounted, 0 still ship a key.

3.5 does not depend on step 1 and could be seeded on its own; it is sequenced
with the other two so there is one import round rather than two.
