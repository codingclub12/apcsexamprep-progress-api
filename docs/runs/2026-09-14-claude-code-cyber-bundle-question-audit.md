# Auditing the questions after 1,490 edits to them

Board 324, continued. 2026-09-14.

Tanner, after the CED-language pass and the Predict-line pass: go back and audit
all the questions and answers to make sure they are still quality and make sense.

He was right to ask. The pipeline was green: 688 checks, 890 checks, a
re-derivation reading zero framework references, and two mutation suites at 12/12
and 10/10. **Six questions I had edited were broken anyway**, and every one of
them was broken in a way no gate in the pipeline was looking for. The audit then
turned up four more defects that were in the bundle BEFORE any of this work.

## What a grammar gate cannot see

`rules.introduces_damage()` refuses a rewrite that leaves a dangling tail, a
doubled word, a stranded comma. Every one of these passed it:

    yet the splits the CONTROLS into two categories
    which physical mitigation does the specifically recommend?
    Which statement detection method is most likely to catch this adversary?
    Which statement sign is MOST clearly evidenced by the overnight activity?
    three attacks the names. List all three
    one root cause the names. State the root cause
    (WURD). which statement captures these properties correctly?

They parse. They have no dangling preposition, no double space, no doubled word.
They are simply not sentences a person would write, and only reading them as
QUESTIONS catches that.

## The two root causes

**The framework as the SUBJECT of the sentence.** The modifier rules were built
for "the CED risk levels", where "the CED" qualifies a noun and deleting it is
free. In "the CED splits the controls" and "does the CED specifically recommend",
the CED is the subject, and deleting it strands the article on a verb. `rules.py`
already carried a VERB_AFTER guard for exactly this, and it had three holes:
`mod_the_ced` and `mod_bare_ced` did not consult it at all, an adverb between the
subject and its verb walked straight past it ("the CED **specifically** recommend"),
and the verb list was missing `splits`, `divides`, `ranks` and six others.

**A head noun replaced in front of another noun.** `which_ek` turned "Which EK"
into "Which statement" so that "Which EK best supports that position?" reads
properly. In "Which EK 2.4.A **detection method**...", EK is a modifier and the
head noun is already there, so the rule produced "Which statement detection
method". Split into two rules now: the modifier form drops the citation and keeps
the noun, the head-noun form becomes "Which statement".

## What the audit is

`audit_questions.py` parses each answer key into items (stem, options, marked
answer, rationale), diffs before against after, and flags the ways this kind of
edit actually ruins a question rather than the ways it breaks a sentence:

    orphan      a demonstrative whose antecedent went out with the citation
    count       the stem promises a number the item no longer supplies
    dangling    "both", "all three" with nothing to point at
    drift       the rationale quotes stem wording the edit changed
    register    asks for a "statement" but the options are noun phrases
    grammar     the mechanical residue

**Every flag is a question for a person, not a verdict.** Of 23 flags on 317
changed questions, 5 were real and 18 were not, and the 18 are worth knowing
because they are what a stricter gate would have "fixed" into damage:

- "What mechanism produces this result?" was flagged as an orphan because the word
  "result" appears nowhere earlier. Its antecedent is the situation the stem just
  described, which is how questions are written.
- "Which two terms best describe this computer?" was flagged for promising two and
  listing one. Each OPTION names two. The item is fine.
- Roman-numeral items ("Which statement(s) are correct?" over I/II/III with options
  "I and III only") tripped the register check, which cannot see the numbered
  statements above the options.

A checker that auto-corrected its own flags would have wrecked all three.

## The fix, and why it went into the gate

The five defects were not patched in place. `subject_stripped`, `bare_the`,
`statement_noun` and `lower_which` are now DAMAGE patterns, so the tool refuses
its own output for the whole class and the paragraph falls to a hand-written
repair. That moved 11 paragraphs out of the rules and into `repairs_author.py`,
where each is rewritten into the passive or given a real subject:

    yet the CED splits the CONTROLS   ->  yet the CONTROLS are split
    does the CED specifically recommend?  ->  is specifically recommended?
    three attacks the CED names       ->  three named attacks

The distractor in 2.1 needed care rather than deletion: "The number of employees
at the store, which the CED names as the primary driver of risk" is a WRONG
answer, and it has to stay wrong and plausible. It became "which is the primary
driver of risk" rather than losing the claim that makes it wrong.

## Four defects that were already in the bundle

Counting the damage classes the same way on the SOURCE bundle and on the output
turned up wreckage the earlier strip left behind that nothing had ever flagged,
because none of it contains a CED word for a voice detector to find:

    ; the says the feed should be recorded AND monitored      2.4 quiz, option C
    cite the law/standard or the, and justify it              5.x exercise, both copies
    Which statement(s) correctly reflect?                     2.2 quiz, stem

`voice.DANGLING` now carries `dangling_subject`, `dangling_orthe` and
`dangling_reflect`, so they are found rather than stepped over. The 2.2 stem
became "Which statement(s) are correct?", which is word for word what
`tools/bundle-quiz-relabel/plan.py` authored for that same item on 2026-09-01,
independently and eleven days earlier.

## The scorecard

Every damage class, counted identically on the bundle as it ships today and on
what goes back to Tanner:

    damage class                  in the bundle    delivered
    stripped subject                          1            0
    "or the," stranded                        2            0
    orphan EK label                           2            0
    option opens on a bare dash              12            0
    verb with no object                       6            0
    dangling "(with its)"                     4            0
    bare code tail in student text          370            0
    "Which statement <noun>"                  0            0
    lowercase sentence start                  0            0

The 37 bare code tails that remain are all in teacher-only answer-key lines,
where CLAUDE.md says a code earns its place. None is in anything a student reads.

## Evidence after the fix

    CED        688 checks, 0 failures; 1197 edits, 1042 by rule and 154 by hand
    Predict    890 checks, 0 failures; 206 lines, 47 callout boxes, 14 step rows
    rederive   1066 framework references before, 0 after, second parser
    mutation   12/12 and 10/10, each caught by the check meant to catch it
    audit      0 real defects across 317 changed questions

## What I would tell the next session

The pipeline was green on broken output twice in this job. The first time,
mutation testing found a hollow sync check. The second time, only reading the
questions found it. Both were caught by asking a DIFFERENT KIND of question than
the one the existing checks asked, which is the pattern CLAUDE.md records for
every real defect found on 2026-09-01 and 02.

A green suite means the checks you wrote pass. It has never meant the work is
right.
