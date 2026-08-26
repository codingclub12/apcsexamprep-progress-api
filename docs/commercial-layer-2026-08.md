# The commercial layer: product catalogue, and the page that does not exist

Written 2026-08-26. Third document in the site audit, after
`docs/site-audit-2026-08-positioning.md` and `docs/hub-rewrite-pack-2026-08.md`.
Planning only. Nothing here has shipped.

The first two passes looked at pages. Neither looked at products, and no page on
the site sells the platform to the person who adopts it. Both gaps are here.

## Part 1: the product catalogue

All 51 product URLs were taken from the live sitemap; 50 resolved to product
pages and were fetched and parsed. This catalogue had not been examined in either
earlier pass.

### 45 of 50 product titles exceed 60 characters

Ninety percent. The longest is **109 characters**. Google renders roughly 60,
so the tail of most of these never appears in a result.

```
109  AP CSA 2024 FRQ Year Pack - Complete Solutions | Feeder, Scoreboard,
     WordChecker, GridPath | APCSExamPrep.com
 96  AP CSA Unit 1 Teacher Course Bundle (Free Preview) | Lessons, Quizzes,
     Pacing | APCSExamPrep.com
 95  AP CSP Pseudocode Reference Sheet PDF | Complete Exam Syntax Guide
     2025-2026 | APCSExamPrep.com
```

The pattern is a stacked-modifier title: a name, then a pipe, then a feature
list, then another pipe, then the brand. The feature list is the part that gets
cut, and it is the part carrying the keywords.

### Three titles append the brand twice

All three are teacher bundles, which is to say the highest-value SKUs on the
site and the ones the new positioning depends on.

```
102  AP Networking Teacher Course Bundle - Complete 4-Unit Curriculum
     | apcsexamprep.com | APCSExamPrep.com
 90  AP Cybersecurity Founding Teacher Bundle - Units 1-5
     | apcsexamprep.com | APCSExamPrep.com
 66  AP CSP Teacher Course Bundle | APCSExamPrep.com | APCSExamPrep.com
```

Note the casing differs between the two occurrences, `apcsexamprep.com` then
`APCSExamPrep.com`. That means the domain was typed into the product's SEO title
field by hand and the template then appended the real brand. It is a data
problem in three product records, not a template bug.

The same defect was found once on a page (`ap-cybersecurity-complete-course-guide`)
in the first pass. Four occurrences total, all fixable by editing the stored
title.

### Two titles are cut off mid-word

```
ap-csa-reference-sheet-pdf
  AP CSA Exam Prep PDF Bundle - Cheat Sheet, FRQ Patterns & Practice Que
                                                                    ^^^ "Questions"

ap-csa-complete-quick-reference-guide
  AP CSA Complete Quick Reference Guide - All 4 Units | 2025-2026 Curric
                                                                  ^^^^^^ "Curriculum"
```

Both stems are **exactly 70 characters** before the ` | APCSExamPrep.com` suffix.

Worth being precise about what this is and is not. Other titles in the catalogue
have stems of 71, 76, 77, 83 and 90 characters, so there is **no live 70-character
cap in the template**. Whatever wrote these two truncated them at 70 and the
brand was appended afterwards. That points at a generation script or a one-off
paste, not at the storefront. Two records to fix, and worth a look at whatever
produced them in case it is still in use.

### Seven product titles still advertise 2025-2026

These are on the shelf and being sold today.

```
AP CSP Complete Study Bundle - 6 PDFs | Save $12.94 | 2025-2026 Exam
AP CSA Complete Quick Reference Guide - All 4 Units | 2025-2026 Curric
AP CSP Quick Reference Guide - 5 Big Ideas | 2025-2026 Exam Prep
AP CSP Pseudocode Reference Sheet PDF | Complete Exam Syntax Guide 2025-2026
AP CSP Create Task Guide PDF - Score 6/6 Strategy | 2025-2026 Exam
AP CSA 4-Week Cram Kit 2025-2026 | Day-by-Day Study Plan
AP CSA 2-Week Cram Kit | 14-Day Study Plan | 2025-2026 Exam
```

This extends the staleness finding out of the content pages and into the
commercial catalogue. A cram kit labelled with last year's exam is a harder sell
than one labelled 2026-27, and the year is frequently the query.

Running total for the year rollover: **13 pages plus 7 products, 20 records**.

### Recommended title pattern for products

```
<Product name> <year if it dates> | <one differentiator>
```

Drop the second and third modifier and drop the brand. Shopify appends the store
name in most themes anyway, and on a product page the brand is not what wins the
click. Examples:

```
AP CSA Teacher Course Bundle 2026-27 | All 4 Units            (58)
AP Cybersecurity Founding Teacher Bundle | All 5 Units        (53)
AP CSA Quick Reference Guide 2026-27 | All 4 Units            (49)
AP CSA 4-Week Cram Kit 2026-27 | Day-by-Day Plan              (47)
```

## Part 2: /pages/for-teachers

The missing page. The audit named it as the single biggest content gap; this is
what should be on it.

### Why this page and not a better homepage

The homepage has to serve students and teachers at once and will always
compromise. A teacher arriving from a search for "AP Cybersecurity curriculum"
in late August has one question, which is whether they can run their course on
this, and the answer is spread across a course hub, a Command Center, a teacher
dashboard and four product pages. None of those pages answers it.

The four teacher bundle products also have no non-commercial parent. They sit in
`/collections/bundles` alongside student flashcards, which is a category error:
one is a $10 impulse buy for a teenager in April, the other is a curriculum
adoption decision by an adult in August.

### What the platform actually does

Taken from `routes/teacher.js` rather than from marketing copy, so the page can
promise only what exists:

| Capability | Route |
|---|---|
| Teacher accounts with password reset | `POST /register`, `/login`, `/forgot-password` |
| Create and list classes | `POST /classes`, `GET /classes` |
| Live class progress | `GET /classes/:code/progress` |
| Gradebook | `GET /classes/:code/gradebook` |
| CSV export | `GET /classes/:code/export` |
| **Canvas course export** | `GET /classes/:code/canvas-course` |
| Set mastery threshold per class | `PATCH /classes/:code/threshold` |
| Set retry policy per class | `PATCH /classes/:code/retry` |
| Override retry for one student | `PATCH /classes/:code/students/:studentId/retry` |
| Unlock a single item for a student | `PATCH /classes/:code/progress/:progressId/unlock` |
| Release content on a schedule | `POST /classes/:code/release` |
| Manual score entry | `POST /classes/:code/scores` |
| Redeem a purchased bundle | `POST /redeem` |

Two of these are stronger selling points than anything currently on the site and
neither is mentioned on any hub page. **Canvas export** removes the objection
that adopting this means leaving the school's LMS. **Per-student retry and unlock
overrides** are what a teacher actually needs in week three when one student was
absent, and they are the difference between a demo and something usable in a real
classroom.

The zero-PII posture is also a selling point and is currently invisible.
Students join with a name and a PIN. No emails, no free-text stored anywhere
outside the sandbox. For a district asking about student data, that is the whole
conversation, and it should be on this page in one sentence.

### Page outline

```
H1   Everything you need to run an AP CS course

1  The offer, above the fold
   Four full-year courses, free, with a gradebook. Class code in under a minute.
   Proof: 393 active classes, 940 students. Two buttons: Create a class /
   See a course.

2  The four courses, with honest status
   CSA        all 4 units, 2025-26 CED          exam May 2027
   CSP        all 5 Big Ideas                   exam May 2027
   Cyber      all 5 units live                  first exam May 2027, national this year
   Networking pilot only in 2026-27             national 2027-28
   Each links to its course hub and its Command Center pacing guide.

3  How a class works
   Three steps: create a class code, students join with a name and a PIN,
   work reports into the gradebook automatically. One line on zero PII.

4  What the gradebook records
   Every attempt, not just the last. Grade of record follows the class's own
   retry policy. Mastery threshold is the teacher's setting and applies
   retroactively. CSV and Canvas export.

5  Pacing
   The four Command Centers, retitled as pacing guides, linked here.

6  Classroom materials
   The four teacher bundles, with the free CSA Unit 1 preview as the entry
   point. Links to the new per-course collections.

7  Who built it
   11+ years teaching AP CS, 54.5% 5-rate against 25.5% nationally, 1,845+
   verified tutoring hours. Person schema.

8  FAQ
   Is it really free. Do I need a licence. Does it work with Canvas. What
   student data is stored. Can I use it for one unit. What if my school
   blocks sites. FAQPage schema.
```

### Metadata

```
T (60) AP CS Teacher Resources 2026-27: Free Curriculum + Gradebook
D (158) Run your AP CS course free: full-year curriculum for CSA, CSP and
        Cybersecurity, pacing guides, class codes and a gradebook that tracks
        every student attempt.
H       Everything you need to run an AP CS course
Schema  Organization + Person + FAQPage + ItemList (the four courses)
```

### Internal linking

This page should be reachable from the primary nav, from every course hub, from
every Command Center, and from all four teacher bundle product pages. It is the
hub the teacher bundles currently lack.

Outbound: the four course hubs, the four Command Centers, `/pages/cyber-class`
(the teacher portal), and the new per-course collections.

### The free preview is the funnel and it is buried

`ap-csa-teacher-superpack-free-preview` exists, is free, and is a complete AP CSA
Unit 1 teacher bundle. It is a genuinely strong lead magnet and it currently sits
in the product list with a 96-character title and no parent page pointing at it.
It belongs above the fold in section 6, and an equivalent should exist for
Cybersecurity, where the audience is largest and least committed this autumn.

## Sequencing

All of Part 1 and all of Part 2 are Phase 1 from the original audit: they need no
Search Console, because nothing here redirects an existing URL.

Product titles ship the same way page titles do, as a Matrixify sheet.
`/pages/for-teachers` is a new page and therefore a new row, not an edit, which
makes it the lowest-risk item in this document and the highest-value one.
