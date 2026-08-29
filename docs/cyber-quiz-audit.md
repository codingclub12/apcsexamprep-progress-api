# AP Cybersecurity quiz page audit

Ledger #124. Audited 2026-08-26 against the live storefront, every page body
pulled from the public render and extracted with `scripts/extract-live-body.js`
(byte-identical to the stored body; see that file's header for the proof).

The task asked whether the 1.1 unit-sampler defect repeats across the other quiz
pages. **It largely does not.** The audit found a different and more serious
systemic defect instead, plus four localized ones.

## Scope

`pages(query:"title:*quiz*")` returned 30 AP Cyber pages:

- 2 already migrated to server scoring (1.1, 1.2)
- 1 is not a quiz at all: `ap-cybersecurity-unit-1-password-attacks-quiz` is the
  1.2 LESSON page (H1 "Topic 1.2: Suspicious Website Logins", 20 CFU options, 25
  glossary terms). Its title and handle say quiz. Nothing else about it does.
- 27 live quiz pages still on client-side scoring

## Finding 1: the answer key ships inside the page body. 27 of 27 pages.

Severity: high. This is the defect that made 1.1 and 1.2 unusable as graded
assessments, and it is on every unmigrated cyber quiz. Any student can read the
key from view-source before answering.

Five distinct markup generations, all of which expose it:

| generation | pages | how the key is exposed |
| --- | --- | --- |
| `answers-num` | 1.3, 1.4, 1.5 (+2 dup URLs) | `ANSWERS={1:'C',2:'C',...}` |
| `answers-str` | 2.1-2.5, 3.1-3.4, 3.6 | `ANSWERS = {"q1":"B",...}` |
| `checkQ` | 3.5 | `checkQ(1,'A')` call sites |
| `checkMCQ` | 4.1-4.5 | `checkMCQ('q1','B',...)` call sites |
| `opt-btn` | 5.1-5.6 | `data-correct="1"` on the right option |

This is the single finding that blocks the founding-cohort teacher's request to
use the quizzes as graded assessments. Locking a page does not help while the
key is in the body of the page being locked.

## Finding 2: the unit-sampler defect does NOT repeat. Units 2 and 3 are aligned.

Units 2 and 3 carry per-question `q-topic` labels, which is what exposed the 1.1
defect. Read back, they are on-topic:

- 2.2 Physical Vulnerabilities: attack identification, risk assessment,
  compromise type, threat sources
- 2.4 Detecting Physical Attacks: camera placement, recorded vs monitored,
  motion sensors, guard placement
- 3.3 Firewalls: architecture, stateful inspection, rule misconfiguration,
  evasion, defense in depth

One case is worth a human call rather than a fix: **2.1 "Cyber Foundations"**
opens with Q1 "Social Engineering Tactics" and Q2 "Phases of a Cyberattack".
Social engineering is 1.1 material. For a lesson explicitly named Foundations
that may be deliberate survey content. Tanner decides.

1.3, 1.4, 1.5 and units 4 and 5 carry no topic labels, so they were checked a
different way: each has a correct lesson H1 ("Topic 1.4 Quiz: AI-Based
Cybersecurity Attacks") and a distinct answer key, so they are distinct
instruments rather than copies of one another. Question-by-question content was
NOT verified against the teacher bundle. See "Not verified" below.

## Finding 3: one page serves a different lesson than its title claims

`ap-cybersecurity-unit-1-wireless-security-quiz` carries three different lesson
identities at once:

- handle says wireless security
- Shopify title says "Topic 1.4: AI-Based Cybersecurity Attacks - Quiz"
- the body is **byte-identical** (md5 `90b21327...`) to
  `ap-cyber-unit-1-lesson-3-quiz`, and its breadcrumb reads Lesson 1.3

A student sent to the 1.4 quiz sits the 1.3 quiz. This is the only page-identity
mismatch of the 30.

## Finding 4: duplicate quiz URLs

`ap-cybersecurity-unit-1-ai-cyber-defense-quiz` is byte-identical to
`ap-cyber-unit-1-lesson-5-quiz` (md5 `93bb618d...`). That one at least agrees
with itself. With finding 3, two of the three topic-named Unit 1 quiz URLs are
redundant and one is actively wrong.

## Finding 5: stale tracking attribute on 1.3, 1.4 and 1.5

All three carry a copy-pasted authoring header from a different activity:

    AP CYBERSECURITY | Unit 1 Topic 1.2 | Exercise 1: Password Autopsy
    Shopify Handle: ap-cyber-unit-1-lesson-2-exercise-1
    data-lesson-id="1.2-ex1"

`data-lesson-id` is what `assets/apcs-reporter.js` reads to decide which activity
a score belongs to (line 64-69). On these three pages it names 1.2 Exercise 1.

**Currently inert, and the report should not overstate it:** those pages load no
reporter and no tracker, and `snippets/apcs-csa-reporter.liquid` scopes the
reporter to `/pages/ap-csa-lesson-1-*`. Nothing reads the attribute today.

It becomes a live mis-grading bug the moment those pages are migrated, which is
exactly what the 1.1/1.2 work sets up. Fix it in the same pass, not after.

## Finding 6: stale schema on the two migrated pages

1.1 and 1.2 now serve 9 and 12 questions. Their JSON-LD still declares
`"description": "5-question ..."`. Cosmetic, but it is the machine-readable
description of a page whose content changed underneath it.

## Finding 7: every online quiz is a 5-question sampler

Every cyber quiz is 5 questions except 3.5 (10) and 4.1 (6). The teacher bundle
instruments for 1.1 and 1.2 were 9 and 12. So the online quizzes are
systematically shorter than the documents teachers grade from. That is the
mechanism behind the original report that the online and offline quizzes differ,
and it is a content decision rather than a defect.

## Not verified

Question-level correctness against the teacher bundle for the 27 unmigrated
pages. The bundle's `Quiz_KEY.docx` files are all identically named across
per-lesson Drive folders, so mapping them to lessons is its own pass. What this
audit establishes is structural: which pages leak the key, which serve the wrong
lesson, and which carry the wrong tracking id.

**Closed for Unit 1 on 2026-08-29.** All six Unit 1 instruments were compared
item by item against their bundle counterparts and none shares an item with the
paper version. See `docs/cyber-unit1-bundle-vs-online.md` for the numbers and the
limits of the method. Units 2 through 5 remain unverified.

## Suggested order

1. Finding 1 for the units a teacher is actually teaching now. Migrating a page
   to server scoring removes the key from the body, which is the same fix that
   already landed for 1.1 and 1.2.
2. Finding 3, a title or content correction, whichever matches intent.
3. Finding 5, before those three pages are migrated.
4. Findings 4 and 6, cleanup.
5. Finding 2's single open question (2.1) and finding 7 both need Tanner.

## Appendix: per-page evidence

Generated from the live bodies. `n` is the parsed question count, cross-checked
against the number of question stems the page actually renders.

| lesson | generation | n | key in body | page handle |
| --- | --- | --- | --- | --- |
| 1.1 | `server` | - | no | `ap-cyber-unit-1-lesson-1-quiz` |
| 1.2 | `server` | - | no | `ap-cyber-unit-1-lesson-2-quiz` |
| 1.2-dup | `lesson-page-not-a-quiz` | - | n/a | `ap-cybersecurity-unit-1-password-attacks-quiz` |
| 1.3 | `answers-num` | 5 | **yes** | `ap-cyber-unit-1-lesson-3-quiz` |
| 1.4 | `answers-num` | 5 | **yes** | `ap-cyber-unit-1-lesson-4-quiz` |
| 1.4-dup | `answers-num` | 5 | **yes** | `ap-cybersecurity-unit-1-wireless-security-quiz` |
| 1.5 | `answers-num` | 5 | **yes** | `ap-cyber-unit-1-lesson-5-quiz` |
| 1.5-dup | `answers-num` | 5 | **yes** | `ap-cybersecurity-unit-1-ai-cyber-defense-quiz` |
| 2.1 | `answers-str` | 5 | **yes** | `ap-cyber-unit-2-lesson-1-quiz` |
| 2.2 | `answers-str` | 5 | **yes** | `ap-cyber-unit-2-lesson-2-quiz` |
| 2.3 | `answers-str` | 5 | **yes** | `ap-cyber-unit-2-lesson-3-quiz` |
| 2.4 | `answers-str` | 5 | **yes** | `ap-cyber-unit-2-lesson-4-quiz` |
| 2.5 | `answers-str` | 5 | **yes** | `ap-cyber-unit-2-lesson-5-quiz` |
| 3.1 | `answers-str` | 5 | **yes** | `ap-cyber-unit-3-lesson-1-quiz` |
| 3.2 | `answers-str` | 5 | **yes** | `ap-cyber-unit-3-lesson-2-quiz` |
| 3.3 | `answers-str` | 5 | **yes** | `ap-cyber-unit-3-lesson-3-quiz` |
| 3.4 | `answers-str` | 5 | **yes** | `ap-cyber-unit-3-lesson-4-quiz` |
| 3.5 | `checkQ` | 10 | **yes** | `ap-cyber-unit-3-lesson-5-quiz` |
| 3.6 | `answers-str` | 5 | **yes** | `ap-cyber-unit-3-lesson-6-quiz` |
| 4.1 | `checkMCQ` | 6 | **yes** | `ap-cyber-unit-4-lesson-1-quiz` |
| 4.2 | `checkMCQ` | 5 | **yes** | `ap-cyber-unit-4-lesson-2-quiz` |
| 4.3 | `checkMCQ` | 5 | **yes** | `ap-cyber-unit-4-lesson-3-quiz` |
| 4.4 | `checkMCQ` | 5 | **yes** | `ap-cyber-unit-4-lesson-4-quiz` |
| 4.5 | `checkMCQ` | 5 | **yes** | `ap-cyber-unit-4-lesson-5-quiz` |
| 5.1 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-1-quiz` |
| 5.2 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-2-quiz` |
| 5.3 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-3-quiz` |
| 5.4 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-4-quiz` |
| 5.5 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-5-quiz` |
| 5.6 | `opt-btn` | 5 | **yes** | `ap-cyber-unit-5-lesson-6-quiz` |
