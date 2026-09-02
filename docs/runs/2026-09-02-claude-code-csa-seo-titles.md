# Every CSA daily-practice SEO title, repaired

2026-09-02, Claude Code. Board task 147. Branch `claude/ceo-agent-setup-sv4e61`.

## What was wrong

The `ap-csa-daily-practice` blog holds 429 articles. 420 of them carry an SEO
title and **every single one was malformed**. The generator that wrote them did
this, and four things went wrong in it:

```
"AP CSA" + unitPart + "Day " + d + ": " + titleCase(topicSlug) + " | Daily Practice"
sliced to 70 characters
```

| defect | articles | what the store served |
|---|---|---|
| `unitPart` had no leading space | 336 | `AP CSAUnit 1 Day 10: Creating Objects` |
| the unit regex missed the undashed handles | 84 | `AP CSA Day 10: Iteration Accumulation` |
| the 70-character slice cut the brand suffix | 14 | `... \| Daily Practi`, `\| Daily Pr`, `\| Daily P` |
| `titleCase()` on a slug erased Java capitals | 74 | `Compareto`, `Arraylist`, `Tostring`, `Iii` |

A further **9 articles have no SEO title at all**, so the storefront falls back
to the article title and serves `Unit 4 Day 16 Arraylist Algorithms` with no
course keyword in front of it.

## What ships

Two Matrixify Blog Posts sheets, one column each, `MERGE`, BOM, QUOTE_ALL, CRLF,
no `Body HTML` column and no blank cell anywhere:

- `imports/2026-09-02/csa-seo-title-repair-blog-posts.csv`, 420 rows
- `imports/2026-09-02/csa-seo-title-missing-blog-posts.csv`, 9 rows

Both clear `scripts/matrixify-preflight.js`. Tanner imports them; nothing here
touches the store.

## The line this pass does not cross

The repair restores **an internal capital that title-casing erased**, which has a
single correct answer, and refuses to have an opinion about anything else.
`Compareto` becomes `compareTo`. `Substring` stays `Substring`, even though a
Java programmer would write `substring`, because that is a style choice and the
site is inconsistent about it: one page heading reads "compareTo() for String
Ordering" and another reads "substring and indexOf". A repair pass that starts
editing prose is a pass nobody can review.

Where a slug destroyed a symbol rather than a capital, no casing rule can
recover it, so **every replacement was read off the live article** rather than
guessed. `Iii` is the one worth naming: it is not a roman numeral. The page
`/ap-csa-u1-c2-day-13-iii-wrapper-behavior` renders "Advanced **I/II/III**:
Wrapper Class Behavior" and its body explains the format, so the slug had eaten
two slashes. Confirmed on a second article. The same reading gave
`substring(start,end)`, `substring(length-3)`, `indexOf(String)`,
`(&& with ||)`, `Else-If`, `equals vs ==`, `equals vs equalsIgnoreCase` and
`De Morgan's`, each from the article's own `Topic:` line or heading. Every one
is cited in `scripts/csa-daily-practice-seo-titles.js` beside its map entry.

The 70-character cap is **not** kept. It was never a convention, it is where the
buggy slice landed, and it is the direct cause of defect 3. The longest repaired
title is 80 characters, and the rendered `<title>` already ran past 70 on nearly
every article because the theme appends ` | APCSExamPrep.com`.

## Evidence

**Rederive, 420 of 420.** A second implementation reads the handle, title-cases
its topic slug, and has to land on the topic the store is serving. It reproduces
all 420 exactly. That is what proves the 70-character slice took only the brand
suffix rather than my assuming it, and the generator refuses any row where the
two disagree.

**A second implementation, in another language, running backwards.**
`scripts/verify-seo-title-sheets.py` reads a finished sheet row, undoes every
declared substitution, and requires what is left to be the handle's own topic
slug. It imports nothing from the generator. It earned its place immediately: it
caught that the 9 articles with no SEO title take their topic from the article
Title and not from the slug, which is why `/unit-4-day-20-arraylist-vs-array`
keeps its full stop in "ArrayList vs. Array". Mutation-tested against a changed
unit, a changed word, a blanked cell, an added `Body HTML` column and a dropped
row; it catches all five.

**Suite, 97 assertions**, `npm run smoke:seotitles`, offline. The before-state is
checked in at `smoke/fixtures/csa-daily-practice-live-titles.tsv`: one row per
article, the `<title>` the storefront actually served, so the evidence survives
the change that removes it.

**Mutation, 7 of 7**, each proven to trip the assertion it targets rather than
merely turning the suite red: the handle rederivation, the undeclared-edit
guard, a Java name dropped from the vocabulary, the output-side mangling check,
the brand-suffix strip, the unit recovery, and the BOM.

`deploy-gates/2026-09-02-csa-seo-titles.json`. The `live` check names four
articles, one per defect, and **every one of its assertions is false right now**.
It cannot pass until the import lands, and a partial import cannot pass it.

## Two findings this turned up, neither of them task 147

**84 articles are published twice.** Every `unit-2-cycle-2-day-N-topic` has a
twin at `unit2-cycle2-day-N-topic`, same unit, same day, same topic, both live.
They are not identical: the pair on day 10 asks for the sum of 1 to 5 in one and
1 to 4 in the other. 168 of the blog's 429 articles are one of these pairs.
Correcting the missing unit number makes each pair's SEO title identical, which
is why the suite pins the number at exactly 84 rather than letting it drift. The
duplication is the real defect and it needs a content decision, not a title
sheet.

**Some code blocks are double-escaped and unreadable.** On
`unit2-cycle2-day-10-iteration-accumulation` the stored body contains
`<span class="&lt;span">"apcs-keyword"</span>&gt;int total = ...`, so a student
reads `"apcs-keyword" >int total = "apcs-number" >0;` where the Java should be,
and `println` is split into `print` + `ln`. This is a student-visible content
defect and it outranks SEO titles. A scan for the signature `class="&lt;span"`
across all 429 articles is running; scope goes on the board with the count.

## Still open

- The import. Two sheets, handed over; I do not import.
- The `live` check, which runs after the import and not before.
- The article `Title` on 245 articles leaks the internal "Cycle 2". Separate.
