# bundle-quiz-relabel

Re-letters the answer key of a teacher-bundle quiz `.docx` without changing which
answer is right, and repairs the citation-strip damage in the STUDENT copies.

Built for AP Cyber 2.1 and 2.2 on 2026-09-01. Units 2.3, 2.4, the Unit 2 Test and
Units 3 to 5 have not been audited yet and are the reason this is checked in
rather than thrown away.

## Why a tool and not a careful afternoon

A bundle quiz keeps its answer text, its purple correct-answer mark, its checkmark
run, its rationale, and a rationale that names other options by letter. Moving one
answer from B to D means moving two option bodies, moving the purple and the
checkmark, rewriting `Why B:` to `Why D:`, and relabelling every `Option ...`
reference that pointed at either of them, in two files that must stay identical.
2.2 needed that 23 times. Done by hand it is a matter of when, not whether.

## The parts

| file | what it does |
|---|---|
| `parse.py` | reads `word/document.xml` into questions. Strict: raises rather than skipping anything it does not fully understand |
| `keysolve.py` | generates a key and holds `violations()`, the constraint set. The repo-side counterpart is the repeating-block check in `scripts/answer-key-audit.js`, which detects what this avoids generating |
| `keyopt.py` | backtracking search for the minimum-change key. Kept, but see the note below |
| `plan.py` | the per-lesson decisions: keys, pinned questions, replacement questions, repairs |
| `fix.py` | applies the plan and rezips |
| `verify.py` `verify2.py` `verify3.py` | structural, semantic and package checks |

## Three things worth knowing before reusing it

**Minimum churn is the wrong objective.** `keyopt.py` will find a key four changes
away from the cycled one, satisfying every constraint. It sits on the boundary of
the constraint set, right next door to the key it replaces, and the constraints are
only a proxy for "looks unpredictable". 2.1's minimum-change answer kept `ACBDAB`
identical. Generate a typical key, not a near one.

**Some option sets must not be re-lettered.** Where the options are ordered by
cardinality (`I only` / `I and II only` / `I, II, and III`), permuting them strands
`I, II, and III` at option A. Those questions go in `PINNED` and the key is designed
around them. Matching-permutation questions (`I = physical, II = technical`) have no
natural order and are free.

**A bare `A` in a rationale is usually the article.** "A hacktivist is driven by..."
sits in the same sentence space as "Option A is wrong because...". Replacement is
anchored to a marker word (`Option`, `Options`, `claims in`); an unanchored pass
corrupts four sentences in 2.1 alone.

## Running it

```
python3 fix.py            # reads x/<lesson>-<variant>/, writes out/ and final/
python3 verify.py         # archive integrity, key correctness, no content lost
python3 verify2.py        # KEY/STUDENT correspondence, rationale letters, leaks
python3 verify3.py        # OPC validity via python-docx, purple lands correctly
```

`verify3.py` needs `pip install python-docx`. It exists because LibreOffice could
not render in the container, so a PDF check was not available; an independent OPC
parser reading the colour off each run is the closest equivalent, and it is
stronger than a visual check for the specific question of whether the purple is on
the right option. It is not a substitute for opening one file and looking at it.
