# Topic 1.4 Lab: one credited answer, and two bugs in my own gate

Page `ap-cyber-unit-1-lesson-4-lab`, id 132673700055, 64,853 chars.

## The page

One credited answer, worth two points, named a taxonomy the CED does not
contain:

```
if(t==='spear'){pts+=2; ... Correct. AI-personalized spear phishing referenced
                             a specific invoice number, date, and relationship.
```

Specimen 1 is a supplier invoice fraud email: a lookalike domain
(`medica1-supply-group.net`), a real invoice number, a reference to a
conversation last Tuesday, and changed banking details. Against the CED that is
AI phishing standing on AI reconnaissance. The research is what makes the invoice
number right.

The other five credited answers are clean. Six splices in total: the credited
option, both directions of its scoring branch, two free-text model answers, and
two distractor labels.

### One answer deliberately left alone

`s1-control='policy'` credits out-of-band verification: calling the supplier back
on a number you already had. On the lesson page's cfu-5 and on Exercise 1 that
same control was demoted to a distractor in favour of a pre-arranged shared
secret, so leaving it credited here looks inconsistent.

It is not. Those two were person-impersonation-over-a-phone-call scenarios, which
is exactly what the CED's shared-secret defense describes: agree a phrase with a
trusted contact in advance. This is a written invoice from a supplier with
changed bank details, where verifying through a channel you chose is the control
that answers it, and a pre-arranged phrase with an accounts-receivable clerk is
not a real practice. Consistency means applying the same standard to every
scenario, not the same answer.

## Three bugs the lab found in my own tooling

This page was the first one the shared exercise gate had not been written
against, and it broke three things. All three were tools crying wolf on a sound
page, which is the failure mode that gets a gate ignored.

**1. Variable bindings were resolved globally.** These pages declare a fresh
`var t` inside each `if(n===N){...}` block. The lab binds `t` to `s1-technique`,
then `s2-technique`, then `s4-techniques`, which is a TEXTAREA. A name-to-element
map keeps only the last, so the gate attributed `t==='spear'` and
`t==='deepfake'` to that textarea and reported two perfectly good keys as
ungettable. Bindings are now resolved by position: a comparison reads whatever
that name was most recently bound to above it.

**2. Keyword lists were matched by helper name.** The check looked for `tMatch`
and `tCount`, which is what two of these pages call the helper. The lab calls it
`tc`. So all twelve of its rubrics were invisible to the protection that stops an
accepted answer being silently dropped, and the gate reported zero keyword lists,
which reads exactly like a page that has none. Now matched by SHAPE: an
identifier called with a variable and an array of string literals. That does not
depend on what anyone named it.

**3. The browser grade check hardcoded `checkPart` and `totalScore`.** The lab
calls its handler `checkSpecimen` and its score element `labTotal`, and the
checker reported the page broken when the page was fine. Handler, parts and score
element are now all read out of the page.

That third one had a second layer. `labTotal` is only written once all four
specimens are done: `if(!all)return;` guards the update. Checking one part left
the total at 0, which looked identical to a page where nothing scores. The check
now runs every part the page offers a Check button for, which is also what a
student does, so it is the more honest test.

```
lab          12 correct vs  0 wrong   (checkSpecimen, parts 1-4, #labTotal)
exercise 1   14 correct vs  0 wrong   (checkPart, parts 1-3, #totalScore)
exercise 2   19 correct vs  5 wrong   (checkPart, parts 1-3, #totalScore)
```

Exercise 2's non-zero wrong score is pre-existing and not a defect introduced
here: several of its free-text branches award one point unconditionally.

## The sabotage suite is generic now

`scripts/cyber-exercise-gate-sabotage.js` replaces the Exercise 1 specific one.
It runs the same sabotages against every committed before/after snapshot pair,
describing each by what it breaks rather than by a literal string, so it applies
to whichever page has that shape. 38 sabotages across 3 pages, all caught.

It also had to compose both gate layers. First run, "script broken" and "new
non-ASCII" showed MISSED on all three pages, and both checks were fine: they live
in the page gate, and the suite was only calling the exercise gate. A sabotage
aimed at a layer nobody asked about reads as a blind spot.

## Still open

- Sheet built, not imported: `out/l4lab.csv`, 65,805 bytes, one row, MERGE.
- The Topic 1.4 quiz is the last artifact carrying this.
