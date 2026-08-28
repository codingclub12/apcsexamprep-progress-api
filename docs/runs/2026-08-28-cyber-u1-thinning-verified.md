# AP Cyber Unit 1: the four thinning sheets, verified live

Date: 2026-08-28
Agent: Claude Code
Branch: `claude/ap-cyber-unit1-handoff-b10iwk`

## What this records

The four thinning sheets from PR #395 (1.1, 1.3, 1.4, 1.5) were imported by
Tanner at 09:38-09:39 CDT. This is the verification against live, plus a sweep
of every Unit 1 page so the unit's end state is a measurement rather than an
inference.

## Byte comparison against what was sent

Each sheet's Body HTML was compared to `GET /pages/<handle>.json` fetched after
the import. The body each sheet carried is `out/topicNN-thin-preview.html`, the
exact string written into the CSV's Body HTML column.

```
page  handle                                       updated_at              result
1.1   ap-cybersecurity-unit-1-social-engineering   2026-08-28T09:38:25-05  IDENTICAL
1.3   ap-cybersecurity-unit-1-wireless-security    2026-08-28T09:38:43-05  IDENTICAL
1.4   ap-cybersecurity-unit-1-ai-driven-threats    2026-08-28T09:39:04-05  IDENTICAL
1.5   ap-cybersecurity-unit-1-ai-cyber-defense     2026-08-28T09:39:20-05  IDENTICAL
```

Byte-identical, with no `<td>` newline delta this time. The seven claim sheets
had one page (1.4) come back four bytes longer because Shopify's markup
normalizer inserts a newline after `<td>` when a tag follows; the comparison
here still normalizes that transformation before declaring a divergence, so a
newline insertion would have been reported as such rather than as a difference.
It simply did not happen on this set.

## The gate, re-run against the live bodies

Not the build-time result restated. The bodies were pulled back down and run
through a one-sided form of `lib/cyber-thin-gate.js`: the assertions that
describe an end state, evaluated on what is actually being served. Painted text
is `document.body.innerText` from Chromium, which is the only thing that can
tell a collapsed teacher table from content a student reads.

```
page  CED painted  EK painted  CED in source  feedback painted  keys
1.1        0            0            14              0          mcq 4
1.3        0            0             8              0          mcq 7
1.4        0            0             2              0          mcq 6 seq 1 match 5 blanks 4 chips 6
1.5        0            0             2              0          mcq 10
```

All four pass. The framing header `College Board Essential Knowledge Coverage`
survives on every page, the coverage table is still collapsed on every page, and
`CED in source` is non-zero everywhere, which is the check that stops a thinner
satisfying "no CED in content" by deleting the teacher's audit surface.

## Whole-unit sweep, and a correction to it

The first version of this note reported "every Unit 1 page, live" over a list of
ten handles: the five lesson pages, the four 1.4 artifacts and the 1.1 exercise.
Unit 1 has THIRTY-TWO pages. The ten were the ones this work had touched, so the
sweep could only ever confirm the work it had just done, and it was written up as
a statement about the unit. Seventeen pages were carrying exam claims or painted
EK codes at the moment the unit was called clean.

The page set now comes from the store's sitemap and nothing else, via
`scripts/cyber-unit-sweep.js`, which is the fix: a hand-written list is written
by whoever already knows which pages they touched, so it cannot catch the pages
they forgot.

```
node scripts/cyber-unit-sweep.js cyber unit-1
32 pages, 17 carrying something a student should not see
```

### Clean, 15 of 32

The five lesson pages and the four 1.4 artifacts, which is exactly the set the
sheets covered, plus six pages that were already clean:

```
ap-cybersecurity-unit-1-social-engineering    (1.1 lesson)
ap-cybersecurity-unit-1-password-attacks      (1.2 lesson)
ap-cybersecurity-unit-1-wireless-security     (1.3 lesson)
ap-cybersecurity-unit-1-ai-driven-threats     (1.4 lesson)
ap-cybersecurity-unit-1-ai-cyber-defense      (1.5 lesson)
ap-cyber-unit-1-lesson-4-exercise-1
ap-cyber-unit-1-lesson-4-exercise-2
ap-cyber-unit-1-lesson-4-lab
ap-cyber-unit-1-lesson-4-quiz
ap-cyber-unit-1-frq-practice
ap-cyber-unit-1-project
ap-cyber-unit-1-lesson-1-quiz
ap-cyber-unit-1-lesson-2-quiz
ap-cyber-unit-1-lesson-2-terminal-lab
ap-cyber-unit-1-lesson-5-quiz
```

### Not clean, 17 of 32

```
page                                          CED   EK   claims
ap-cyber-unit-1-exam                            0    0     21
ap-cyber-unit-1-scenario-practice               0    0     15
ap-cyber-unit-1-lesson-1-lab                    0   39      1
ap-cyber-unit-1-lesson-1-exercise-2             7   23      0
ap-cyber-unit-1-case-file-1                     5    9      0
ap-cybersecurity-unit-1-introduction-to-security 0   0      3
ap-cyber-unit-1-lesson-1-exercise-1             0    0      1
ap-cyber-unit-1-lesson-2-exercise-1             0    1      1
ap-cyber-unit-1-lesson-2-exercise-2             0    0      1
ap-cyber-unit-1-lesson-2-lab                    0    0      1
ap-cyber-unit-1-lesson-3-exercise-1             0    0      1
ap-cyber-unit-1-lesson-3-exercise-2             0    0      1
ap-cyber-unit-1-lesson-3-lab                    0    0      1
ap-cyber-unit-1-lesson-3-quiz                   1    0      0
ap-cyber-unit-1-lesson-5-exercise-1             1    0      1
ap-cyber-unit-1-lesson-5-exercise-2             1    0      1
ap-cyber-unit-1-lesson-5-lab                    0    0      1
```

The claims are the same construct the lesson pages carried, in the same wrapper:
an "AP Exam Tip" box asserting what the exam does. `ap-cyber-unit-1-lesson-3-lab`
says "The hardest Topic 1.3 AP exam questions combine two attack types in one
scenario"; `ap-cyber-unit-1-lesson-3-exercise-1` says "AP exam wireless questions
always give you a scenario". Nothing here is a regex artifact: every excerpt in
the sweep output is centred on the phrase that tripped the check, because an
excerpt sliced from the start of the match window shows a hundred characters of
unrelated text and reads as a false positive.

`ap-cybersecurity-unit-1-introduction-to-security` is a sixth lesson-shaped page
that no sheet in this project has ever touched.

### What the sweep does NOT answer

Presentation, not curriculum. Zero "CED", zero EK codes and zero exam claims in
what a student reads is the house rule about CITING the course description. It is
not the same question as whether the unit TEACHES what the course description
requires. Board task #136 (WO-7) says the Unit 1 Exam tests thirteen off-CED
terms, is still open, and is routed to chat. No page-level regex sweep can close
it, and this note does not claim to.

## Method worth keeping

The comparison normalizes `<td>\n` before calling a difference real. The naive
version of this check compares a prefix and a suffix and reports the gap, which
detects exactly one contiguous insertion and silently mis-describes four of
them. That is how 1.4's earlier import first read as DIVERGES when it was
correct.
