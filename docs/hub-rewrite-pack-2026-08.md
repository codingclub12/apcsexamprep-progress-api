# Hub page rewrite pack

Written 2026-08-26, the specific layer under `docs/site-audit-2026-08-positioning.md`.
Planning document. Nothing here has shipped.

The audit made the architectural case. This file is the copy: for every priority
hub, what the page serves today and what it should serve instead. Titles and
descriptions below have had their lengths checked programmatically, not
estimated. Every title is 60 characters or fewer and every description is
between 140 and 160.

Anchor dates: the school year is **2026-27** and the next exam is **May 2027**.

## Coverage of the measurement

Fifty hub and near-hub pages were fetched from the live storefront and parsed.
That is up from the 32 in the first pass, and it changes three of the numbers in
the original audit. Corrected figures:

| Measure | First pass | Full pass |
|---|---|---|
| Pages analysed | 32 | **50** |
| Pages with more than one H1 | 29 | **47** |
| Pages carrying a `Get in Touch` H1 | 29 | **47** |
| Pages advertising the stale 2025-2026 year | 5 named | **13** |
| Pages rendering the title string as a visible H1 | 2 noticed | **11** |

The direction of every finding held. The magnitude was understated.

## Three defects found in the second pass

These were not in the original audit.

### 1. A nav-level CSP hub describes the wrong course

`/pages/ap-computer-science-principles-resources` is linked from the main
navigation. Its title and its description disagree about which course it is
about.

```
TITLE: AP Computer Science Principles Resources | 2025-2026 | AP Exam Prep
DESC:  AP CSA practice questions, study guides, and exam tips covering this
       topic. Aligned to the 2025-2026 4-unit curriculum. Free resources on
       APCSExamPrep.com.
```

The description is wrong twice over: it names **AP CSA** on a CSP page, and it
claims the **4-unit** structure, which is CSA's. CSP has 5 Big Ideas. This is the
snippet Google shows for a page the site links from every header render.

### 2. The main navigation links to a redirect

`/pages/ap-cybersecurity-study-guides` (plural) returns **301** to
`/pages/ap-cybersecurity-study-guide` (singular). The plural URL is what the
header menu links to. Every crawl of the nav pays an extra hop, and internal link
equity passes through a redirect on a course being launched nationally this year.

Fix the nav target, not the redirect. The redirect should stay for any external
links already pointing at the plural.

### 3. The score calculators are a year behind, except the new one

| Page | Year in title and H1 | Correct? |
|---|---|---|
| `ap-csa-score-calculator` | 2026 | No, next exam is May 2027 |
| `ap-csp-score-calculator` | 2026 | No |
| `ap-cybersecurity-score-calculator` | 2027 | Yes |

Same pattern as everywhere else in this audit: the newest page is right and the
established ones drifted. A score calculator advertising the wrong exam year is a
particularly costly version of the problem, because the year is the query.

## The title-as-H1 template bug

Eleven of the fifty pages render the **literal title tag, pipes and brand suffix
included**, as a visible `<h1>`. The pattern is consistent enough to be a
template rather than a series of accidents:

```
H1 #1  the SEO title string        <- should not exist
H1 #2  the real page heading       <- this is the only H1 that should remain
H1 #3  Get in Touch                <- from the shared contact section
```

Worst examples, verbatim from the live pages:

```
AP Cybersecurity Practice Exam | Full Practice Test | APCSExamPrep.com
AP Cybersecurity Course Guide | All 5 Units Live | APCSExamPrep.com
AP CSP Complete Course | 2025-2026 | APCSExamPrep.com
AP Cybersecurity Curriculum | All 5 Units | APCSExamPrep.com
```

Four of the eleven carry the brand suffix into the H1. Two carry the stale year
into it as well, which is why the year fix and the H1 fix should be done in one
pass rather than two.

## The thirteen stale pages, and where the year lives

Fixing these means editing every location listed, not just the description.

| Page | Stale year appears in |
|---|---|
| `ap-computer-science-principles-resources` | title + H1 + description |
| `ap-csa-exam-prep-hub` | title + H1 + description |
| `ap-csa-study-guides` | title + H1 |
| `ap-csp-course` | title + H1 |
| `ap-csp-topics` | H1 |
| `ap-csa-flashcards` | description |
| `ap-csa-practice-exams` | description |
| `ap-csa-test-builder` | description |
| `ap-csa-topics` | description |
| `ap-csp` | description |
| `ap-csp-info` | description |
| `ap-csp-practice-exams` | description |
| `ap-csp-test-builder` | description |

## The rewrites

Format: current state, then proposed. `T` is the title tag, `D` the meta
description, `H` the single H1. Character counts are exact.

### Homepage

**Now**
```
T (89) AP CS Exam Prep - CSA, CSP, Cybersecurity, and Networking Full Courses | APCSExamPrep.com
D (151) Free AP Computer Science A and CSP exam prep including practice tests, FRQs,
        study guides, and create task resources. Built to help you score a 4 or 5.
H       AP CS Exam Prep  /  AP Computer Science Exam Prep  /  Get in Touch   (3 H1s)
```

**Proposed**
```
T (58) Free AP CS Curriculum & Gradebook: CSA, CSP, Cybersecurity
D (160) Four free full-year AP computer science courses with a built-in class
        gradebook: CSA, CSP, Cybersecurity and Networking. Built by a teacher with
        a 54.5% 5-rate.
H       Free full-year AP computer science courses
```

The title drops 31 characters of truncated brand and leads with what is
genuinely differentiated. The description stops promising a score and starts
describing the product, and it names all four courses instead of two.

### /pages/for-teachers  (new page)

The missing page in the architecture. Nothing on the site currently sells the
platform to the person who adopts it.

```
T (60) AP CS Teacher Resources 2026-27: Free Curriculum + Gradebook
D (158) Run your AP CS course free: full-year curriculum for CSA, CSP and
        Cybersecurity, pacing guides, class codes and a gradebook that tracks every
        student attempt.
H       Everything you need to run an AP CS course
```

Sections it should carry: the four courses and their status; how class codes
work; what the gradebook records; the pacing guides (linking the Command
Centers); the teacher bundles; and the credential, which is a real trust signal
and is currently buried on the tutoring page.

### /pages/ap-cybersecurity

The head-term hub for the course going nationwide this year.

```
Now      T (35) AP Cybersecurity | APCSExamPrep.com
         D (148) AP Cybersecurity exam prep for 2026-2027. Free lessons, practice
                 questions, unit study guides, and teacher resources for the new
                 national AP course.
         H       AP Cybersecurity  /  Get in Touch   (2 H1s)
         Schema  BreadcrumbList only

Proposed T (54) AP Cybersecurity 2026-27: Free Course, Labs & Practice
         D (158) Free AP Cybersecurity course for 2026-27: all 5 units, hands-on
                 terminal labs, Device Security Analysis practice and a teacher
                 gradebook. First exam May 2027.
         H       AP Cybersecurity
         Schema  Course + CourseInstance + FAQPage + Person
```

The current title spends 17 of its 35 characters on the brand. The description is
accurate but generic; the proposed one names the two things no competitor has,
terminal labs and Device Security Analysis practice.

### /pages/ap-cybersecurity-curriculum

The teacher spoke, and the consolidation target for the overview cluster.

```
Now      T (42) AP Cybersecurity Curriculum | AP Exam Prep
         D (146) AP Cybersecurity study guide covering security concepts, attack
                 classification, and defense strategies. Part of the complete AP
                 Cyber course on...
         H       AP Cybersecurity Curriculum | All 5 Units | APCSExamPrep.com  (+2 more)

Proposed T (57) AP Cybersecurity Curriculum 2026-27: All 5 Units & Pacing
         D (156) Complete AP Cybersecurity curriculum for 2026-27: all 5 College Board
                 units, a full-year pacing calendar, labs and assessments. Free, no
                 license, no signup.
         H       AP Cybersecurity curriculum and pacing
```

Note the current description is the one that is **byte-identical** to
`/pages/ap-cybersecurity-practice-questions`, and it trails off in an ellipsis.

### The remaining fourteen

```
/pages/ap-csa
  T (52) AP Computer Science A 2026-27: Free Full-Year Course
  D (145) Free full-year AP CSA course for 2026-27: all 4 units, 400+ exercises, a
          built-in Java editor and FRQ solutions from 2004 to 2025. Exam May 2027.
  H       AP Computer Science A

/pages/ap-csp
  T (51) AP Computer Science Principles 2026-27: Free Course
  D (153) Free full-year AP CSP course for 2026-27: all 5 Big Ideas, Python labs,
          Create Task guidance and exam practice. Built by an AP CS teacher. Exam
          May 2027.
  H       AP Computer Science Principles

/pages/ap-networking
  T (56) AP Networking: Course Guide, Units, Skills & Exam Format
  D (147) The complete AP Networking guide: all 4 units and 22 topics, the four
          skills, exam format and the credential. Pilot in 2026-27, nationwide
          2027-28.
  H       AP Networking

/pages/ap-computer-science-principles-resources        <- wrong-course fix
  T (55) AP CSP Resources 2026-27: Study Guides, Practice & Labs
  D (146) Free AP Computer Science Principles resources for 2026-27: study guides
          for all 5 Big Ideas, practice questions, Python labs and Create Task help.
  H       AP Computer Science Principles resources

/pages/ap-csa-exam-prep-hub                            <- stale in all three slots
  T (55) AP CSA Exam Prep 2026-27: Practice, FRQs & Study Guides
  D (160) AP CSA exam prep for the May 2027 exam: full practice exams, every FRQ
          from 2004 to 2025 with rubrics, and unit study guides. Free, from a 54.5%
          5-rate teacher.
  H       AP Computer Science A exam prep

/pages/ap-csa-study-guides
  T (46) AP CSA Study Guides 2026-27: All 4 Units, Free
  D (158) Free AP Computer Science A study guides for all 4 units of the 2026-27
          curriculum: primitive types, selection and iteration, class creation,
          data collections.
  H       AP CSA study guides

/pages/ap-csp-study-guides
  T (50) AP CSP Study Guides 2026-27: All 5 Big Ideas, Free
  D (156) Free AP Computer Science Principles study guides for all 5 Big Ideas:
          creative development, data, algorithms, computing systems and the impact
          of computing.
  H       AP CSP study guides

/pages/ap-csp-course
  T (49) AP CSP Full Course 2026-27: All 5 Big Ideas, Free
  D (149) Learn AP Computer Science Principles from scratch. Full 2026-27 course
          covering all 5 Big Ideas with Python labs, Create Task prep and exam
          practice.
  H       AP Computer Science Principles: the full course

/pages/ap-csa-score-calculator
  T (53) AP CSA Score Calculator 2027: Predict Your Exam Score
  D (153) Free AP CSA score calculator for the May 2027 exam. Enter your MCQ and FRQ
          scores to predict your 1 to 5, based on real released College Board exam
          data.
  H       AP CSA score calculator

/pages/ap-csp-score-calculator
  T (53) AP CSP Score Calculator 2027: Predict Your Exam Score
  D (153) Free AP CSP score calculator for the May 2027 exam. Enter your MCQ score
          and Create Task points to predict your 1 to 5, based on real released exam
          data.
  H       AP CSP score calculator

/pages/cyber-class                                     <- currently "Teacher Portal"
  T (50) AP CS Teacher Portal: Free Class Codes & Gradebook
  D (157) Create a free class code, track every student attempt and export your
          gradebook. Works across AP CSA, CSP, Cybersecurity and Networking. No
          license required.
  H       Teacher class portal

/pages/cyber-command-center                            <- currently scraped nav text
  T (59) AP Cybersecurity Pacing Guide 2026-27: Full-Year Course Map
  D (155) A full-year AP Cybersecurity pacing guide in 45-minute periods, with every
          lesson, lab and assessment mapped by unit. Adjust it to your own calendar.
          Free.
  H       AP Cybersecurity Command Center

/pages/csa-command-center                              <- currently scraped nav text
  T (49) AP CSA Pacing Guide 2026-27: Full-Year Course Map
  D (146) A full-year AP Computer Science A pacing guide in 60-minute periods, with
          every lesson, exercise and assessment mapped by unit. Free for teachers.
  H       AP Computer Science A Command Center

/collections/ap-cybersecurity                          (new collection)
  T (54) AP Cybersecurity Teacher Bundles & Classroom Materials
  D (148) Classroom-ready AP Cybersecurity materials: the founding teacher bundle,
          unit superpacks and printable labs. Built alongside the free 5-unit course.
  H       AP Cybersecurity materials
```

The Command Center rewrites are worth a note. Those pages currently rank on a
scraped description that begins `HubsCyberCSPCSANetworkingGradebook`. Retitling
them around **pacing guide** rather than **command center** matters more than the
description: a teacher searches for a pacing guide, and nobody searches for a
command center. Keep the internal name in the H1, where it costs nothing and
keeps the product's own vocabulary intact.

## Sequencing note

Everything in this file is Phase 1 work from the audit, which means none of it
depends on Search Console. The one exception is the consolidation of the eight
Cybersecurity overview URLs: the `ap-cybersecurity-curriculum` rewrite above
assumes that page survives as the teacher spoke, and that assumption should be
checked against click data before anything is redirected into it.

Rewriting a page is safe without GSC. Redirecting one is not.

## How these ship

Page titles and meta descriptions are Shopify page objects, so per the repo
conventions they ship as a Matrixify sheet, generated, reviewed, imported once.
Not an Admin API mutation and not a hand edit.

The H1 problems are different and split in two:

- The `Get in Touch` H1 on 47 of 50 pages lives in the shared page template and
  is one theme edit.
- The title-string-as-H1 on 11 pages is in the page bodies and rides the same
  Matrixify sheet as the metadata.

Theme work deploys through the connected branch, not `main`.
