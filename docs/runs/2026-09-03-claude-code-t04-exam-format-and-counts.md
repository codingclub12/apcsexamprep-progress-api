# 2026-09-03: T-0.4, the stale exam FAQ and the question count that cannot be counted

Two halves. One is done and gated. The other turned out not to be a copy edit,
and this note says why rather than shipping a number nobody can re-derive.

## Half one, done: the exam format page said the format was unreleased

Board 195, filed this session because no board task existed for it.

`/pages/ap-cybersecurity-exam-format` carried this, in two places:

    The College Board has not yet released the exact number of questions,
    time limits, or section weightings for the AP Cybersecurity Exam.

Measured on the stored body: the page contains ZERO occurrences of "60
multiple", "one free-response", "80 minutes", "50 minutes", "Device Security
Analysis" or the 25 to 40% band. Its only two "70%" strings are CSS gradient
stops. So the page whose entire job is stating the exam format stated none of
it, and had not been touched since 2026-06-05.

The replacement uses only numbers CLAUDE.md carries with a first-party source
IN this repo, so the next session can re-derive them with no network call:

    Section I    60 multiple choice   70% of the score   80 minutes
    Section II   1 free response      30% of the score   50 minutes
    total        2 hours 10 minutes, fully digital in Bluebook
    FRQ          Device Security Analysis, skill categories 2 and 3 only
    MCQ          25 to 40% per skill category, CED verbatim

**No per-unit weightings were added, and a guard refuses the write if one
appears.** Every per-unit percentage circulating online is fabricated.

### Evidence

    npm run smoke:examformatced       OK - all 19 checks passed
    matrixify-preflight --carrying    clear to import
    deploy-gate --pre                 11 checks, suite + mutation
    171 offline smoke suites          all pass

Nine mutations, each killed on the assertion naming the guard it targets. Three
things the gate caught in my own work, which is the reason to run it:

- **Two mutations passed while their guard was broken.** Both facts appear in
  BOTH new blocks, so removing one left the page still stating it and the guard
  correctly stayed quiet. The mutation was too weak to violate the property.
  Moved to the sheet layer, where a literal edit isolates the fact cleanly.
- **A generator mutation left the committed sheet mutated.** The gate restores
  the file it mutated, but a generator mutation rewrites the CSV as a side
  effect, so the next run failed on stale output. Both this gate and T-0.3's now
  REGENERATE before asserting. T-0.3's had the same latent defect and was fixed
  in the same pass.
- **The first draft slipped two curly apostrophes into authored text.** The
  preflight reports non-ASCII only in aggregate with the 175 characters
  legitimately carried through, so they would not have stood out. There is now a
  per-character before/after guard and a mutation proving it.

The live check fails 6 of 7 today. Those six are false until the sheet is
imported; the seventh is the per-unit invariant, which must never be true.

## Half two, NOT done: there is no single question count to publish

The handoff says to pick one accurate bank count and use it in nav, the course
hub and the practice pages. That assumes a countable number exists. It does not,
yet, and inventing one would be the exact failure this repo has a validator for.

What IS established:

- **`/pages/ap-cybersecurity-practice-questions` serves exactly 15 questions.**
  15 `pq-card`, 15 `pq-stem`, 15 `pq-opts`, 60 `pq-opt`, which is 15 times 4.
- **The nav sub-label under that link says "250+ MCQs across all 5 units".** It
  is wrong about its own target by a factor of 16. `snippets/apcs-nav-source.liquid:1126`.
- **"15 Free" in three nav places is accurate** and should be kept, not changed.
- "250+" also appears at `sections/custom-liquid.liquid:299` and `:399`, and
  `templates/page.homepage-custom.liquid:585`.
- The other numbers on those pages are about OTHER courses and are not cyber
  counts: 586 is the Test Builder bank, 42 MCQ is the CSA exam, 70 MCQ is the
  CSP exam, "Top 100 questions" is a CSP product.

What could NOT be established, and why:

- **The site uses at least four different question markups.** `pq-card`;
  `cfu-item`; `l-q`; and inline-styled divs with `onclick="selectOpt(n,'A')"`
  and `id="qN-A"` carrying no class at all.
- **Stored and rendered disagree.** Counting the rendered HTML across 37
  assessment pages gives 233 questions on 23 pages. Counting the STORED body
  leaves 22 pages unreadable, because some question content is injected by the
  theme rather than stored on the page.
- So 233 is a floor derived from one instrument, not a total. Publishing "250+"
  on the strength of it would be putting a number on a page because it is near a
  number I measured, which is how the fabricated per-unit weightings got onto
  other sites.

Filed as board 197 rather than guessed. The fix is a counter that knows all four
families and reconciles stored against rendered, and then one number everywhere.

## A third thing, found on the way

**Two quiz pages store no quiz.** `ap-cyber-unit-1-lesson-1-quiz` stores 32,002
characters of which 617 are authored text, and `-lesson-2-quiz` 35,727 of which
638. Both are navigation shells. Cross-checked against the committed sweep at
`smoke/fixtures/empty-page-sweep-2026-09-02.jsonl`, which agrees, so this is not
an artifact of today's instrument. Board 196.

That also means any bank total must exclude them, which is a second reason the
count needs a real pass rather than an estimate.

## Method notes

- Claimed #195 as claim #83 with lock `sheet:matrixify/cyber-count-reconcile`.
- Body taken from the Shopify Admin API, the authority, and committed at
  `shopify/page-snapshots/ap-cybersecurity-exam-format.before-ced-format.json`
  so the generator, suite and every mutation run offline and reproducibly.
- Nothing imported. The import is the approval point, and after it the gate must
  be run WITHOUT `--pre` so the live check can observe something.
