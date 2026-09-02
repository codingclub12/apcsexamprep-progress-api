# The site tells students to skip inheritance, then drills it as "Hard"

Measured 2026-09-02 against live bodies, not titles and not a report.

## The contradiction

`/pages/ap-csa-ced-explained` says, in these words:

> Inheritance, polymorphism, extends, super, interfaces, and writing recursive
> methods were all removed.
> Not tested on the 2025-2026 exam. Trap: Skip entirely.

`/blogs/ap-csa-daily-practice/unit3-cycle2-day-15-polymorphism` serves this, with
no caveat anywhere on the page:

    Day 15 Advanced Practice - Harder Difficulty
    Focus: Polymorphism        [Hard]  [Polymorphism]

    Advanced Practice Question
    Format: Polymorphism
    Which method call is valid?

        public class Animal { public void eat() { } }
        public class Dog extends Animal { public void bark() { } }
        Animal a = new Dog();

A teacher who reads both pages catches the site contradicting itself, on the one
subject they are paying to be right about.

## Scope: 49 articles, not 22

An audit that classified by TITLE reported 22 URLs. Titles are a guess:
"Inheritance Access" contains no `extends` and is still removed content, and
"Object Class" could be either. Measured off live bodies, with scripts and styles
stripped, the real number is 49, across FOUR naming schemes rather than two:

    ap-csa-u3-c1-*        11    Unit 3 Cycle 1
    ap-csa-u3-c2-*        16    Unit 3 Cycle 2
    unit3-cycle2-*        11    compact duplicate slugs
    unit-3-cycle-2-*      11    hyphenated duplicate slugs

    49 checked, 49 affected, 0 already carrying a caveat

The last two sets are the same 11 topics published at two handles each, both
self-canonical, which is a separate defect in its own right.

## The trap in measuring this

The word "removed" appears seven times on one of these pages. Not one is caveat
text: they are cart strings (`itemsRemoved`), a code-editor indent routine
(`var removed = 0`), and a comment in the ad loader. Counting the word without
stripping `<script>` first reads a page as already-caveated when it is not.

That mistake was made and caught on the same day, on this exact page, which is
why `scripts/csa-removed-curriculum-scan.js` strips scripts and styles before it
counts anything.

## The fix, and what it must not be

**A caveat banner on each affected article.** Non-destructive, reversible, keeps
49 pages of accumulated SEO, and resolves the contradiction by telling the
student what the CED page already tells them.

**NOT unpublishing.** It is on the `NEVER_AUTO` list, and it would throw away the
traffic that makes these pages worth having.

**NOT rewriting the questions.** They are correct Java. They are simply not on
this exam, and a student tracing them is not harmed as long as the page says so.

## Where the sheet build stopped, and why

The banner ships as a Matrixify Blogs/Articles import, which needs each article's
RAW body. A rendered page cannot be used: it carries theme nav, popups and
Klaviyo that are not in the article body, so uploading one injects the nav INTO
the content.

`extract_article.js` takes a byte-exact slice bounded by tokens the body itself
starts and ends with, and refuses anything that does not match. Against the one
article whose raw body was pulled from the Admin API as a control:

    13,023 bytes, first and last bytes identical to the Admin API body
    Dog extends Animal present, correctAnswer 'D' present, no theme markup

It extracts 22 of the 49 cleanly and **refuses the other 27**, which use an older
content template with no `apcs-practice-wrapper` block at all. Refusing is the
correct behaviour; guessing a second anchor across 27 live pages is not.

Those 27 need their bodies from the Admin API `body` field rather than a rendered
slice. That is the next step, and it is bounded work, not a research problem.

## Not verified

Whether Cycle 1 and Cycle 2 are both still linked from the QOTD hub, and whether
any of these 49 rank. Neither changes the fix, but both change how urgent the
duplicate-slug consolidation is.
