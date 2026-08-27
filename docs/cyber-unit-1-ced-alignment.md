# AP Cybersecurity Unit 1: CED alignment audit

Audited 2026-08-27 against the live storefront, every page body pulled from the
Admin API. Covers all five lessons and all of their activities: lesson page,
exercise 1, exercise 2, lab and quiz.

## What "CED aligned" was checked against

`docs/ced-snapshot/` is empty. `apcentral.collegeboard.org` is not on the agent
proxy allowed-domains list, so a session cannot read College Board directly, and
the first `ced-watch.js` run on an Actions runner has not seeded a baseline.

So the Essential Knowledge text used here is the text quoted verbatim in the
teacher bundle rationales, which cite each EK by code and restate it. That covers
every EK in Unit 1: 1.1.A.1 to C.3, 1.2.A.1 to C.3, 1.3.A.1 to C.3, 1.4.A.1 to
A.6 and B.1 to B.4, and 1.5.A.1 to A.3 and B.1 to B.4. It is second-hand and
should be re-checked against the CED itself once the watcher has a baseline, but
it is internally consistent and it is what the graded bundle instruments were
written from.

## Headline: Topic 1.4 has no practice content at all

Every activity the unit nav offers for 1.4 is wireless security, which is Topic
1.3. Not a quiz, not an exercise, not a lab covers AI-based cybersecurity
attacks.

| Nav slot | Handle | Title says | Content is |
|---|---|---|---|
| 1.4 Ex 1 | `...wireless-security-exercise-1` | Topic 1.4 | Wireless Threat Classification |
| 1.4 Ex 2 | `...wireless-security-exercise-2` | Topic 1.4 | Wireless Security Advisor |
| 1.4 Lab | `...wireless-security-lab` | Topic 1.4 | Operation HotSpot, wireless investigation |
| 1.4 Quiz | `...wireless-security-quiz` | Topic 1.4 | 5 wireless questions |

Two of those H1s state the contradiction in a single line: "1.4 Exercise 1:
Wireless Threat Classification". The number and the subject disagree with each
other inside the same heading.

**These are not duplicates of the real 1.3 set.** Only the quiz was byte-identical
to `ap-cyber-unit-1-lesson-3-quiz`. The exercises and the lab are different
wireless activities from the ones in the 1.3 slot, so Unit 1 currently ships
eight wireless practice activities and zero on AI-based attacks:

| | 1.3 slot | 1.4 slot |
|---|---|---|
| Ex 1 | Public Wi-Fi Risk Classification | Wireless Threat Classification |
| Ex 2 | Applied Wireless Security Analysis | Wireless Security Advisor |
| Lab | Wireless Attack Specimen Dissection | Operation HotSpot |

That matters for what to do next. The 1.4-titled set is not junk to delete; it is
a second set of usable 1.3 practice that was filed under the wrong lesson.

## The unit nav swaps 1.3 and 1.4

In the `ucnav` rail, the 1.3 lesson link points at
`ap-cybersecurity-unit-1-ai-driven-threats`, which is the 1.4 lesson, and the 1.4
lesson link points at `ap-cybersecurity-unit-1-wireless-security`, which is the
1.3 lesson. The `title` attributes are swapped to match, so the rail is
internally consistent and consistently wrong.

This is the root cause of the mislabeled activity set rather than a separate bug:
the 1.4 slot was populated from whatever sat under the `wireless-security-*`
handles, and those hold 1.3.

## Per lesson

| Lesson | Lesson page | Ex 1 | Ex 2 | Lab | Quiz |
|---|---|---|---|---|---|
| 1.1 | on topic, all 8 EKs | on topic | on topic, all 8 EKs | on topic | server-scored, 5 items |
| 1.2 | on topic, all 8 EKs | on topic | on topic | on topic | server-scored, 5 items |
| 1.3 | on topic | on topic | on topic | on topic | client-scored, sheet pending |
| 1.4 | on topic | **1.3 content** | **1.3 content** | **1.3 content** | **1.3 content** |
| 1.5 | on topic | on topic | on topic | on topic | client-scored, off-CED |

### Answer keys still in page bodies

The lesson pages carry their check-for-understanding keys as `data-correct`, and
one lab carries an `ANSWERS` object:

- 1.1 lesson: `data-correct` x15
- 1.2 lesson: `data-correct` x12
- 1.5 lesson: `data-correct` x1
- 1.3 lab: `ANSWERS` x2

For 1.2, 1.5 and the 1.3 lab this is the view-source exposure of audit finding 1:
formative rather than graded, so lower stakes than the quizzes were, but worth
knowing before any of them is used for a grade.

**1.1 is worse than that and should not be filed alongside them.** Its answers
are not merely readable in the source, they are rendered on the page at load.
The lesson has ten `cfu-feedback` blocks, each holding a verdict and a written
explanation. Only `cfu-7` and `cfu-8` carry `style="display:none!important;"`.
The other eight carry no inline hide, and no rule in the page stylesheet hides
`.cfu-feedback` either: every rule that names it sets margin, padding, border or
background and none sets `display`. So eight of the ten checks show their answer
and their explanation before the student has read the question.

This is ledger task 137, a regression from the WO-3 rewrite rather than an
original defect, and it is owned by Tanner on the Shopify surface. Recorded here
because this document is what the rest of the alignment work reads from, and the
sentence it replaced understated a live leak on the free preview unit.

### EK citations are uneven

The 1.1 exercises and lab cite EKs explicitly and thoroughly: exercise 2 names
all eight of 1.1's, and the lab scores against A.2, B, and C.1 to C.3. No
exercise or lab in 1.2, 1.3, 1.4 or 1.5 cites a single EK. They are on topic, but
nothing in them ties a task to the knowledge statement it assesses, so a teacher
cannot tell from the page what an activity is meant to cover.

### Smaller notes

- The 1.5 lesson page teaches EK 1.4.A.4 and 1.4.A.6 alongside its own. Defensible
  as context for why defenders need AI, worth a look rather than a fix.
- 1.1 lesson CFU 8 sorts defense measures into technical and human controls. Topic
  1.1 has no protective-measures EK; defenses live in 1.2.C, 1.3.C and 1.4.B.
- 1.1 exercise 1 teaches typosquatting, homoglyph substitution and domain
  spoofing. None is named in 1.1, so it is untested enrichment.
- The 1.1 and 1.2 quiz page heroes advertise 9 and 12 questions while the server
  serves 5. Those counts were correct on 2026-08-26 against the bundle-derived
  banks and went stale when those were retired the next day.

## What this audit did not cover

The unit-level exam page, `ap-cyber-unit-1-exam`, is out of scope here: this pass
walked the five lessons and their four activities each. That page is its own
graded artifact, it sits at the end of the free preview unit, and ledger task 136
reports it tests thirteen off-CED terms. Anyone reading this document for a
complete picture of Unit 1 alignment needs that task as well as this file.

## What is already fixed

`seed/cyber-unit-1-web-quizzes.js` now holds a five-item, framework-anchored,
web-authored pool for every lesson in Unit 1, sharing no question with the
bundle. 1.4 and 1.5 were authored on 2026-08-27; 1.5 replaces a bank that asked
about SIEM versus IDS products and adversarial machine learning, neither of which
is in Topic 1.5.

Those rows are inert until a page mounts them. 1.1 and 1.2 are mounted. 1.3 has a
sheet waiting in `imports/2026-08-27/`. 1.4 and 1.5 have neither.

## What needs a decision before it can ship

1. **Where does the 1.4 quiz live?** The page the nav offers is
   `...wireless-security-quiz`, whose title already says 1.4. Pointing its body at
   the new 1.4 bank makes title, nav and content agree and retires the duplicate
   1.3 quiz in one move. The handle would still read `wireless-security`, which is
   cosmetic but permanent. The alternative is a new `ap-cyber-unit-1-lesson-4-quiz`
   plus a nav edit.
2. **What happens to the mislabeled wireless exercises and lab?** They are usable
   1.3 practice. Refiling them as 1.3 Exercise 3, Exercise 4 and Lab 2 keeps the
   work and empties the 1.4 slot honestly. Retiring them throws away three
   authored activities.
3. **Who authors 1.4's exercises and lab?** Three activities on AI-based attacks
   do not exist in any form. The quiz bank is written; the rest is not.
4. **Fix the nav swap in the same pass**, since every page carrying `ucnav` has
   it and it is what put 1.3 content in the 1.4 slot to begin with.
