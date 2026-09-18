# Unit 4's six retired specs, and the answer that was wrong on the item that mattered

2026-09-18. Board 356. Theme PR #122. Follows board 355 and the 2026-08-19 CED audit.

## Why this ran

Tanner: "Fix the six Unit 4 specs too." Board 355 excluded them from the teacher
guide repair because their theme specs describe retired lessons, and this is that
exclusion closed.

## What was actually wrong, and how far back it goes

The site renumbered Unit 4 onto the 2025 CED. `docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md`
found it a month ago and `docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md`
fixed the exercise seeds. The theme's lesson specs were the layer nobody came
back to:

    4.6   Arrays as Parameters and Return Values   ->  Using Text Files
    4.7   ArrayList Introduction                   ->  Wrapper Classes
    4.13  Searching and Sorting, three days        ->  Implementing 2D Array Algorithms
    4.14  Reading Data from Files                  ->  Searching Algorithms
    4.15  Using Data Sets with Arrays/ArrayLists   ->  Sorting Algorithms
    4.17  Informal Code Analysis                   ->  Recursive Searching and Sorting

4.17 shows the size of the drift: Informal Code Analysis is Unit 2's topic 2.12,
so Unit 4 shipped a Unit 2 lesson under a number that should have been recursion.

Three of the six needed moving rather than writing, and the mapping is not a
guess. Retired 4.14 IS Using Text Files under the wrong number, and retired
4.13's three days split cleanly into the two searches and the two sorts. That is
the same split the exercise seeds took on 2026-08-20, so taking a different one
here would have put the printed bundle and the graded exercise back out of step.

## The finding worth keeping

**An answer was wrong on the one item the lesson turns on.** Retired 4.13's
binary-search-on-unsorted-data item searched `{9, 4, 15, 2}` for 4 and claimed
it returns -1. It returns 1. The first midpoint is index 1, which is exactly
where the 4 is, so the single item demonstrating that binary search lies on
unsorted data was the case where it tells the truth. The prose gives it away:
it breaks off mid-sentence, "the whole right half including index 1 is... no:",
which is what a hand trace looks like when nobody runs the program.

Nothing had ever run these programs. The spec validator checks that an item HAS
an answer. It cannot check that the answer is right, and for eleven months
nothing did.

`tools/javacheck.js` does now: it compiles and runs every self-contained program
in every spec and refuses one whose stated value is not what it produces. 191
programs across all 38 specs, 0 refused after the fix.

Getting it to 0 took three passes, and the two failed ones are the useful part.
A prose answer is not a transcript. "0 then 4", "1 through 4" and "7, 0, 5" all
describe their output correctly and none of them equals it, so a string
comparison against prose produced twelve confident false positives, which is
worse than no check. The rule that survived compares ONLY where the claimed
value is bare, with no prose around it, which is the case a machine can settle
and is exactly the shape the wrong answer had.

It then caught one of mine. My selection-sort bug item claimed 10 29 14 37 and
the program produces 29 14 10 37, because I traced a deliberately broken inner
loop by hand and got it wrong in the same way the original author had. Every one
of the twenty programs I wrote was run before it went in.

## The check that would have caught the whole thing

`tools/check-unit4-ced.js` holds the CED's seventeen titles next to the specs
and refuses a handle that names a different lesson from its title. Every other
check in that repo reads a spec against itself, which is why the six were
consistent and wrong for months: the titles agreed with their handles, the
handles were well formed, the Java compiled. Nothing compared the list against
the course it claims to teach.

The handle rule is containment rather than equality, and 4.1 is why: its live
handle drops two words from its title and is perfectly correct. A handle may be
shorter than its title. What it may not do is name a different lesson.

## Evidence

    live      all six retired handles answer 301, and 4.13's redirects to
              4.14's lesson. All six new handles answer 200. Through
              lib/storefront-fetch.js, no User-Agent.
    suite     lib/spec.js validates all six; the whole bundle builds, 38
              lessons and 602 files, Unit 4 17 and 257
    rederive  all six titles found verbatim in docs/csa-ced-course-at-a-glance.txt,
              which is the CED's own table
    mutation  check-unit4-ced.js broken both ways, retired handle restored and
              title drifted, red for its own reason each time; javacheck run
              against the pre-fix content, where it reports the one wrong answer

## Still open

- **The Unit 4 unit test is tagged on the same retired map**, board 364. Eight of
  24 questions name the wrong topic and their LO codes drift with them. Not fixed
  here on purpose: retagging alone leaves 4.7, 4.13, 4.15 and 4.17 with no
  questions at all, and the replacements cannot be drawn from the lesson practice
  blocks, because those are public and the tier rule forbids the overlap.
- **Four retired lessons have no home.** Array parameters, ArrayList
  introduction, the data-set workflow and informal code analysis are real
  lessons the 2025 CED has no Unit 4 slot for. They are preserved under
  `specs/retired/` rather than deleted, and folding any of them into a
  neighbouring topic is a curriculum decision.
- **The objectives in every spec are house-authored under CED codes**, not CED
  verbatim. That is the existing convention across all 38 and the six now match
  it, so this pass introduces nothing new. Whether the convention is right is
  worth asking separately, because it is the same shape as the defect board 355
  fixed in the guides.
