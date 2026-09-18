# The Unit 4 test was tagged on the retired map, and no structural check could see it

2026-09-18. Board 364. Theme PR #123, the follow-on to #122 and board 356.

## Why this ran

Tanner: "Fix the unit test too." Board 356 found the Unit 4 unit test carrying
the same retired topic map the six lesson specs had, measured it, and left it,
because retagging alone leaves four topics with no questions and the
replacements cannot come from the public bank.

## The finding

Eight of the 25 questions named a topic that now teaches something else. A
question about passing an array to a method was tagged 4.6, which is Using Text
Files. One counting comparisons in a nested loop was tagged 4.17 while really
being Unit 2's topic 2.12.

**No structural check could ever have caught this, and that is the part worth
keeping.** The codes still parsed. 4.6.A existed before the renumbering and
exists after it; only its meaning changed. The first thing I wrote was a
validator comparing every tag against the specs, and it reported zero findings
on a file where eight of twenty-five questions were wrong. Checking that a tag
is well formed cannot catch a tag that is well formed and wrong.

Classifying the eight was a reading job, so it is recorded here:

    mcq  was    tests                              now
      6  4.6    passing an array to a method       no 2025 CED topic, replaced
      7  4.6    returning an array from a method   no 2025 CED topic, replaced
      8  4.7    ArrayList properties               4.8
     18  4.13   linear search by hand              4.14
     19  4.13   binary search worst case           4.14
     20  4.14   a file read into a list            4.6
     21  4.15   filter and average over an array   4.5
     24  4.17   comparison count, nested loop      Unit 2's 2.12, replaced

## What shipped

Five retagged. Three replaced, with new questions on Wrapper Classes,
Implementing 2D Array Algorithms and Recursive Searching and Sorting. Retagging
left 4.15 with nothing and 4.8 with three, so a new sorting question took the
place of 4.8's weakest: a definitional not-except item whose real content, that
a list is read with get(0) rather than [0], is already carried by the two trace
items beside it.

The builder pins the paper at 25 items against 35 minutes. Changing a premium
assessment's length is a product decision and not a rider on a retag, so the
count held and something had to go.

Every topic 4.1 to 4.17 now has at least one question. Answer letters land
A 6, B 8, C 7, D 4 with no run longer than two, which the builder enforces at a
floor of four per letter. All three new trace items had their key at A, which is
its own tell, so two were reordered and their rationales moved with the letters.

## What is checked now

    check-unit-tests.js     every tag resolves against the spec at that number,
                            every topic in the unit has a question, and every
                            trace question's program is COMPILED AND RUN, with
                            its output having to be the option the answer letter
                            names. 35 programs across the three units.
    check-tier-overlap.js   the gated test against the public lesson-page bank,
                            because a unit test built from public items is not
                            gated. 25 against 60, nothing above 0.6, highest
                            0.233, which is two questions that both say "binary
                            search".

The overlap check is deliberately NOT in npm test. The public bank lives in this
repo, in seed/csa-lesson-content-unit4.js, and a copy committed to the theme
would go stale the moment a lesson page gains a question. A stale copy of the
thing you are checking against is worse than running it by hand when both trees
are present.

Running the trace programs is what the tag check cannot do, and it is the rule
with a real chance of catching the next mistagging: a question moved to the
wrong topic usually keeps printing what it printed before, but a question whose
answer was never run can be wrong in either place.

## The lesson that repeated

Rule 3 needed the same correction javacheck.js needed a day earlier, and needing
it twice is the point. An option may DESCRIBE output rather than transcribe it.
"true then false", "5 12 then 5" and "1 2 3 on the first line and 2 4 6 on the
second" are all correct answers that no string comparison matches, and the first
version reported four of them as failures. It compares value tokens in order now,
with the connectives dropped from both sides, which still fails a wrong value or
a wrong order.

Both times the instinct was to compare strings, and both times prose is not a
transcript. Worth remembering before writing the third one.

## Still open

- **Nothing checks that a correctly tagged question assesses its topic.** The
  eight were classified by reading, and the table above is the record. A
  per-topic marker list was considered and left out: it would pass on any
  question sharing a topic's vocabulary, which is most wrong tags.
- **Four retired lessons still have no home**, unchanged from board 356 and
  recorded in the theme's specs/retired/README.md.
