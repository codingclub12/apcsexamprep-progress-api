# CSA content ideas from reviewing CodeHS, lesson by lesson

Standing notes from reviewing Tanner's own CodeHS Cortado exercises, one
lesson at a time, to inform new exercises on this platform. Grows as more
lessons get reviewed. Summary and original analysis only: no CodeHS problem
text, starter code, solutions, or platform source is reproduced here or
anywhere else in this repo. See `docs/csa-codehs-exercise-reference.md` for
the exercise-title-only per-lesson counts this doc complements.

Source for each entry: Tanner pasting the page source of his own CodeHS
account viewing that exercise. Read in full, including the parts that are
not useful (page chrome, account data, session tokens, CodeHS's own
autograding harness code), and none of that is repeated here.

## Format

Each entry: lesson, what CodeHS actually tests for, and what's worth
adopting or avoiding for this platform's own exercise on that lesson.

## 1.1 Introduction to Algorithms, Programming, and Compilers

**1.1.7 Welcome Program** (CodeHS exercise, 5 pts). Two `println` lines
introducing the student, in a fixed template ("My name is ...", "My favorite
hobby is ..."). Live on this platform already as part of the Unit 1 pilot
(`ap-csa-lesson-1-1-intro-algorithms-exercise-1`); this is about the grading
technique, not a gap to fill.

**Worth adopting: line-contains grading, not full-output match.** CodeHS
does not compare the whole program's output character for character. It
checks each output line separately for a required substring (line 1 must
contain "name", line 2 must contain "favorite hobby") and leaves the rest of
the sentence free. This platform's current grader
(`routes/student.js`, `normalizeOutput(stdout) === normalizeOutput(expected)`)
only supports exact full-output match. For an early, low-stakes "introduce
yourself" style item, exact match is harsher than the task calls for: two
students who both did it correctly but phrased the sentence differently
would get different pass/fail outcomes under exact match, but the same
outcome under substring-per-line. Worth considering as a second grading mode
in `lib/csa-code-modes.js`, used selectively for early free-expression
exercises, not as a replacement for exact match on exercises where the
output is genuinely determined by the problem (most of them).

**Also worth adopting: starter code that teaches by omission.** The starter
file's only content besides the class shell is a comment block explaining
that comments are ignored by the compiler and can be deleted, which is a
light, no-cost first exposure to comment syntax two lessons before 1.8
formally covers it. Cheap to do and worth doing in new starter code broadly:
a short in-place comment explaining what's ignored, not just a `// TODO`.
