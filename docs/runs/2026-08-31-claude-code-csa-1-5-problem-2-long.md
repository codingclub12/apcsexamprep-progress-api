# CSA 1.5 editor: the problem whose answer was off-syllabus, and the Enter key that fought itself

**What was asked.** Change the AP CSA 1.5 editor problem 2, the one whose answer
is a `long`. Then: Enter double-spaces in all of these problems.

Two separate defects, on two different surfaces. Neither lives in this repo.

## Where the four editor problems actually live

Not here. Lesson 1.5 has three code items this repo owns (`exercise-1` in
`seed/csa-exercises/unit1.js`, `debug` in `seed/csa-debug-unit1.js`, `exercise-3`
in `seed/csa-frq/unit1.js`) and **none of them is the thing being reported.** The
four numbered problems are a `CSACE_PROBLEMS` array inlined in the Shopify page
body of `ap-csa-lesson-1-5-casting-range`, driving CodeMirror against
`/api/judge0/run`. Grep for `long` in this repo and you land on 1.9, which is a
different lesson and is correct.

Worth remembering next time: "the 1.5 exercise" is ambiguous across four
different systems, and three of them are the wrong answer.

## 1. Problem 2 required a type the exam does not have

```java
int big = 3000000000;   // expected output: 3000000000
```

The only way to pass it is `long big = 3000000000L;`. The same page says twice,
in its own prose, that `long` is outside the scope of the AP exam. So the one
problem framed as "spot the compile error" made an off-syllabus type the
required answer.

Replaced with the narrowing conversion, which is the compile error topic 1.5
exists to teach and whose fix is the topic's own skill:

```java
double price = 19.99;
int dollars = price;    // expected output: 19
```

Range and overflow are not lost from the lesson. They are already carried by
`1.5-cfu-4` (`Integer.MAX_VALUE + 1`) and `1.5-cfu-7` (three statements about
integer overflow), both of which stay in scope because they only ask the student
to recognise the wrap, never to reach for a wider type.

Verified against real `javac`/`java` 21, per the house rule that nothing states
an expected output it has not run:

- starter fails, and fails with the error the prompt promises:
  `incompatible types: possible lossy conversion from double to int`
- `int dollars = (int) price;` compiles and prints `19`

The other three problems are untouched. The whole-body diff is 11 lines, all
inside the `p2` object.

## 2. Enter inserted two lines, in every CodeMirror editor on the site

Not a 1.5 problem and not a page-body problem: `layout/theme.liquid` section 8
("TAB INDENTATION FOR CODE TEXTAREAS") binds a second indenter to CodeMirror's
own input textarea, so every keystroke was applied twice. Enter wrote a newline
through `execCommand`, CodeMirror read that as input, and then CodeMirror's own
keydown handler added a second one.

The interesting part is how it selected the editor. `isCodeTextarea` ends with a
monospace font sniff, and **a textarea's UA stylesheet `font-family` is
`monospace`**. So the sniff is true of every textarea CodeMirror builds, on every
page, without any page doing anything. The `MutationObserver` that rescans on
every DOM insertion then guarantees it is reached, because CodeMirror inserts its
wrapper after the theme script has already run.

`preventDefault` was never going to help. Both handlers are on the same element,
so canceling the default still leaves the other handler to run. The fix is for
`isCodeTextarea` to reject a textarea CodeMirror manages, which is two elements
per editor: the hidden input textarea inside `.CodeMirror`, and the original
textarea it replaced. Plain textareas keep the helper.

Measured in Chromium against CodeMirror 5.65.16 with the live lesson-page editor
CSS, one keystroke on a two line document:

| keystroke | before | after |
| --- | --- | --- |
| Enter at end of line 1 | `int a = 1;\n\n\nint b = 2;` | `int a = 1;\n\nint b = 2;` |
| Tab at start of line 1 | `\t    int a = 1;` | `\tint a = 1;` |

Tab was doubled too. Nobody had reported that one.

## Evidence

- Page body read from the Shopify Admin API, page `134538461399`, `updatedAt`
  `2026-08-21T19:08:49Z`. Handle and title come from that read, never guessed, so
  the import cannot create a page or rename one.
- Sheet round-trips: parsed back out of the CSV, the body is byte identical to
  the intended body.
- Guards run against the new body: no `U+FFFD`, no mojibake, em-dash count
  unchanged at 26 (all pre-existing, none added), and **no HTML entities left
  inside any `<script>`**.

That last one is free here, and worth saying why. `docs/shopify-page-imports.md`
warns that Shopify decodes entities on save, inside `<script>` too, which once
turned an escape function into an identity map on a live page. Building the sheet
from the **stored** body rather than from a repo mirror means the decode has
already happened; there is nothing left to decode, so the trap cannot bite on a
round trip. A repo mirror of this page would reintroduce the hazard.

## The theme deploy recipe in CLAUDE.md is currently backwards

Found while opening the theme pull request, which reported 41 commits and 23
files for a one file change. The cause is worth writing down, because a session
that follows CLAUDE.md literally right now damages the live site.

The theme repository's **default branch is `claude/site-linking-audit-yhufjk`**,
the connected branch, not `main`. So a plain `git clone` checks out the connected
branch, and a branch cut from it looks enormous when compared against `main`.

Measured, not assumed:

```
connected branch ahead of main:  40 commits
main ahead of connected branch:   0 commits
git merge-base --is-ancestor origin/claude/site-linking-audit-yhufjk origin/main  ->  false
```

`main` is strictly behind. CLAUDE.md says to deploy with
`git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk`. Today
that is **not a fast-forward**, and running it would rewind the live theme by 40
commits. The guard the same doc tells you to run first correctly refuses it,
which is the only reason this is a note rather than an incident.

This is the 2026-08-16 drift inverted. Then, `main` was 103 commits ahead and
four merged pull requests had shipped nothing. Now the connected branch is ahead
and `main` is the stale one, so the failure mode has flipped from "your change
never deployed" to "your deploy reverts everyone else's". Both come from the same
root cause: the theme is not pointed at `main`, and only a person can repoint it
in Shopify Admin.

Until somebody does, two things follow. A theme pull request should be opened
against the connected branch, where it is reviewable and where merging actually
ships. And `main` can be fast-forwarded to the connected branch, since it is
strictly an ancestor, which ends the drift in the safe direction.

## The theme half is live, verified against the storefront

Theme pull request 90 merged into the connected branch at 20:06Z on 2026-08-31,
which is the deploy. Confirmed against the live page rather than against GitHub,
per the rule that repo learned the hard way in August: a merged pull request is
not evidence.

`https://apcsexamprep.com/pages/ap-csa-lesson-1-5-casting-range` now serves the
guard. The script was extracted from that live response and driven in Chromium
against CodeMirror 5.65.16:

| check | result |
| --- | --- |
| theme indenter attached to `.CodeMirror textarea` | false |
| one Enter at end of line 1 of a two line document | `int a = 1;\n\nint b = 2;` |
| one Tab at the start of a line | `\tint a = 1;` |

One newline per Enter, one indent per Tab, on the real deployed script. Before
the fix the same probe returned `int a = 1;\n\n\nint b = 2;` and
`\t    int a = 1;`.

Two other pull requests landed on the same bases while this was open, and neither
conflicted: theme 91 (`snippets/apcs-grade-reporter.liquid`) and api 410
(`docs/runs/2026-08-31-weekly-blog-publish.md`). Each time the base moved, GitHub
reported `mergeable_state: unknown` for a while, so mergeability was re-checked
with `git merge-tree` rather than read off that field.

## Still open

- **The 1.5 page change is not live.** The sheet needs one Matrixify import
  (Pages, MERGE, one at a time). Only the theme half has shipped.
- **`verified` is not the agent's to set**, so both need a human to close the loop
  against the live page.
- The four problem titles carry em-dashes (`Problem 2 of 4 - spot the compile
  error` uses one), against the repo convention. Pre-existing, left alone rather
  than widened into unasked scope. Fixing all four is a one line change to the
  same sheet whenever somebody wants it.
- This page is still not represented in the repo, so the next edit to it starts
  by pulling the body from the Admin API again. That is the correct posture per
  CLAUDE.md, not a gap to close.
