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

## The sheet, and the two things that decide whether it imports

The banner ships as a Matrixify Blog Posts import, which needs each article's RAW
body. A rendered page cannot be used: it carries theme nav, popups and Klaviyo
that are not in the article body, so uploading one injects the nav INTO the
content.

`scripts/csa-article-body-extract.js` anchors on the THEME rather than on the
article. Both content templates render into the same element:

    <div class="article-template__content ... rte ...">{{ article.content }}</div>

so the body is exactly that element's children, and counting div nesting finds
the close without knowing anything about the article's own markup. All 49
extract. Against the one article whose raw body was pulled from the Admin API as
a control:

    13,023 bytes, first and last bytes identical to the Admin API body

An earlier extractor keyed on the article's own opening token, handled 22 of 49
and REFUSED the other 27. Refusing was right; guessing a second anchor across 27
live pages was not.

### The first upload was rejected in one second, and the bodies were fine

    Import Failed
    Cannot understand the uploaded file.
    Duration: 1 sec

Every body in that file was correct byte for byte, and all 38 assertions covering
them were green. Both defects were in the ENVELOPE, which nothing checked.

**The post's own columns are not prefixed.** The header said `Article: Handle`,
`Article: Command`, `Article: Body HTML`. Matrixify names the sheet's own entity
columns bare and prefixes only RELATED entities:

    Blog: Handle | Handle | Command | Body HTML

The evidence was already in this repo. `scripts/frq-pages-csv.js` and
`scripts/lab-pages-csv.js` write `Handle, Command, Title, Body HTML` and import
fine, and comparing against them also ruled out the mechanics: both quote the
header and emit a BOM, exactly as this generator does.

**A CSV has no tab name, so the FILE NAME is the sheet name.** Matrixify decides
what a file contains from the tab name, and for a CSV that falls to the filename.
`csa-banner-canary.csv` told it nothing, so the whole file was rejected before a
single row was read. That is why the failure carried no per-row detail. The name
must contain something like `blog-posts`, and `assertSheetName` now refuses to
WRITE a file Matrixify would reject: a generator whose output cannot be imported
is not a generator, and this is the one defect class the per-row checks
structurally cannot see, because they all run inside a file that never gets
opened.

Confirmed against matrixify.app/documentation/blog-posts/ rather than inferred.

**Command is UPDATE, not the repo's usual MERGE.** MERGE creates a row it cannot
find, so one typo'd handle would publish a blank article to a live blog. There is
nothing to create here, only 49 articles that already exist.

**The canary is the whole reason this cost one row.** A format guess verified by
one page costs a minute; the same guess applied to 49 pages does not.

## Not verified

Whether Cycle 1 and Cycle 2 are both still linked from the QOTD hub, and whether
any of these 49 rank. Neither changes the fix, but both change how urgent the
duplicate-slug consolidation is.
