'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SEO REWRITE TABLE.
//
//  One row per record whose stored SEO title or description is wrong, with the
//  replacement. `scripts/seo-metadata-csv.js` turns this into Matrixify sheets.
//
//  ── WHY THE BRAND IS NOT APPENDED BY ANYTHING ───────────────────────────────
//  Worth writing down, because a comment in lib/site-crawl.js reads the other
//  way and cost this pass an hour. Shopify's DEFAULT <title>, used when the
//  `global.title_tag` metafield is unset, is "<page title> | <store name>". When
//  the metafield IS set it is served verbatim, brand and all.
//
//  The proof is on the live site: /pages/ap-csa serves
//  "AP Computer Science A | Exam Prep Hub" with no brand anywhere, while
//  /pages/ap-csp serves "AP CSP | APCSExamPrep.com". If a theme were gluing the
//  suffix on, the first of those could not exist.
//
//  So the brand is typed into the field by hand, record by record, and it is
//  ours to control. Every title below therefore omits it: on a page or product
//  the brand is not what wins the click, and it costs 19 characters of the ~60
//  that get rendered. This is also the whole of the 'brand-doubled' defect, in
//  which three teacher bundles carry the domain twice in two different casings.
//
//  ── THE RULES EVERY ROW HERE OBEYS ──────────────────────────────────────────
//    title       1 to 60 characters, no pipe-delimited brand, no em-dash
//    description 140 to 160 characters, authored, no em-dash
//    year        the school year is 2026-27 and the next exam is May 2027
//
//  scripts/seo-metadata-csv.js asserts all of that and refuses to write a sheet
//  if any row breaks it, so a bad row cannot reach an import.
// ─────────────────────────────────────────────────────────────────────────────

// ── PAGES ────────────────────────────────────────────────────────────────────
//  The hub rewrites from docs/hub-rewrite-pack-2026-08.md, plus every page the
//  crawl found carrying a school year that has ended.
const PAGES = [
  {
    handle: 'ap-cybersecurity',
    title: 'AP Cybersecurity 2026-27: Free Course, Labs & Practice',
    description: 'Free AP Cybersecurity course for 2026-27: all 5 units, hands-on terminal labs, Device Security Analysis practice and a teacher gradebook. First exam May 2027.',
    why: 'head term for the course going nationwide this year; 17 of 35 title chars were brand',
  },
  {
    handle: 'ap-cybersecurity-curriculum',
    title: 'AP Cybersecurity Curriculum 2026-27: All 5 Units & Pacing',
    description: 'Complete AP Cybersecurity curriculum for 2026-27: all 5 College Board units, a full-year pacing calendar, labs and assessments. Free, no license, no signup.',
    why: 'description was byte-identical to ap-cybersecurity-practice-questions and trailed off mid-sentence',
  },
  {
    handle: 'ap-csa',
    title: 'AP Computer Science A 2026-27: Free Full-Year Course',
    description: 'Free full-year AP CSA course for 2026-27: all 4 units, 400+ exercises, a built-in Java editor and FRQ solutions from 2004 to 2025. Exam May 2027.',
    why: 'course head term',
  },
  {
    handle: 'ap-csp',
    title: 'AP Computer Science Principles 2026-27: Free Course',
    description: 'Free full-year AP CSP course for 2026-27: all 5 Big Ideas, Python labs, Create Task guidance and exam practice. Built by an AP CS teacher. Exam May 2027.',
    why: 'title was 25 chars of which 17 were brand; description carried 2025-2026',
  },
  {
    handle: 'ap-networking',
    title: 'AP Networking: Course Guide, Units, Skills & Exam Format',
    description: 'The complete AP Networking guide: all 4 units and 22 topics, the four skills, exam format and the credential. Pilot in 2026-27, nationwide 2027-28.',
    why: 'states pilot vs nationwide status, which no other page does',
  },
  {
    handle: 'ap-computer-science-principles-resources',
    title: 'AP CSP Resources 2026-27: Study Guides, Practice & Labs',
    description: 'Free AP Computer Science Principles resources for 2026-27: study guides for all 5 Big Ideas, practice questions, Python labs and Create Task help.',
    why: 'WRONG COURSE: a nav-linked CSP page whose description described AP CSA and the 4-unit structure',
  },
  {
    handle: 'ap-csa-exam-prep-hub',
    title: 'AP CSA Exam Prep 2026-27: Practice, FRQs & Study Guides',
    description: 'AP CSA exam prep for the May 2027 exam: full practice exams, every FRQ from 2004 to 2025 with rubrics, and unit study guides. Free, from a 54.5% 5-rate teacher.',
    why: 'carried 2025-2026 in title, H1 and description at once',
  },
  {
    handle: 'ap-csa-study-guides',
    title: 'AP CSA Study Guides 2026-27: All 4 Units, Free',
    description: 'Free AP Computer Science A study guides for all 4 units of the 2026-27 curriculum: primitive types, selection and iteration, class creation, data collections.',
    why: 'stale year in title and H1',
  },
  {
    handle: 'ap-csp-study-guides',
    title: 'AP CSP Study Guides 2026-27: All 5 Big Ideas, Free',
    description: 'Free AP Computer Science Principles study guides for all 5 Big Ideas: creative development, data, algorithms, computing systems and the impact of computing.',
    why: 'title string was rendered as a visible H1',
  },
  {
    handle: 'ap-csp-course',
    title: 'AP CSP Full Course 2026-27: All 5 Big Ideas, Free',
    description: 'Learn AP Computer Science Principles from scratch. Full 2026-27 course covering all 5 Big Ideas with Python labs, Create Task prep and exam practice.',
    why: 'stale year in title and in the title-as-H1',
  },
  {
    handle: 'ap-csa-score-calculator',
    title: 'AP CSA Score Calculator 2027: Predict Your Exam Score',
    description: 'Free AP CSA score calculator for the May 2027 exam. Enter your MCQ and FRQ scores to predict your 1 to 5, based on real released College Board exam data.',
    why: 'said 2026; on a score calculator the year is the query',
  },
  {
    handle: 'ap-csp-score-calculator',
    title: 'AP CSP Score Calculator 2027: Predict Your Exam Score',
    description: 'Free AP CSP score calculator for the May 2027 exam. Enter your MCQ score and Create Task points to predict your 1 to 5, based on real released exam data.',
    why: 'said 2026 in title and H1; the next exam is May 2027 and the year is the query',
  },
  {
    handle: 'cyber-class',
    title: 'AP CS Teacher Portal: Free Class Codes & Gradebook',
    description: 'Create a free class code, track every student attempt and export your gradebook. Works across AP CSA, CSP, Cybersecurity and Networking. No license required.',
    why: 'titled "Teacher Portal" with a scraped nav description',
  },
  {
    handle: 'cyber-command-center',
    title: 'AP Cybersecurity Pacing Guide 2026-27: Full-Year Map',
    description: 'A full-year AP Cybersecurity pacing guide in 45-minute periods, with every lesson, lab and assessment mapped by unit. Adjust it to your own calendar. Free.',
    why: 'scraped nav description; retitled to what a teacher searches for',
  },
  {
    handle: 'csa-command-center',
    title: 'AP CSA Pacing Guide 2026-27: Full-Year Course Map',
    description: 'A full-year AP Computer Science A pacing guide in 60-minute periods, with every lesson, exercise and assessment mapped by unit. Free for teachers.',
    why: 'scraped nav description',
  },
  {
    handle: 'csp-command-center',
    title: 'AP CSP Pacing Guide 2026-27: Full-Year Course Map',
    description: 'A full-year AP CSP pacing guide in 50-minute periods, with every Big Idea, lesson and assessment mapped. Adjust it to your own calendar. Free for teachers.',
    why: 'scraped nav description that still reads "CSA soon" when the CSA centre is live',
  },
  {
    handle: 'ap-networking-command-center',
    title: 'AP Networking Pacing Guide: Full-Year Course Map',
    description: 'A full-year AP Networking pacing guide in 45-minute periods, with every unit, lesson and assessment mapped. For pilot schools in 2026-27. Free for teachers.',
    why: 'scraped nav description',
  },
  {
    handle: 'ap-csa-topics',
    title: 'AP CSA Topics 2026-27: Every Exam Topic by Unit',
    description: 'Every AP Computer Science A exam topic organised by unit for 2026-27. All 4 units: primitive types, selection and iteration, class creation, data collections.',
    why: 'stale year in the description; five separate H1s',
  },
  {
    handle: 'ap-csp-topics',
    title: 'AP CSP Topics 2026-27: Index of All 5 Big Ideas',
    description: 'Complete index of AP Computer Science Principles topics by Big Idea for 2026-27: creative development, data, algorithms, computing systems, impact of computing.',
    why: 'stale year in the H1',
  },
  {
    handle: 'ap-csp-info',
    title: 'AP Computer Science Principles 2026-27: Exam Info',
    description: 'What AP Computer Science Principles covers in 2026-27: the 5 Big Ideas, the Create Performance Task, exam format and scoring. Free study guides for each topic.',
    why: 'stale year, and a boilerplate description reused across pages',
  },
  {
    handle: 'ap-csa-practice-exams',
    title: 'AP CSA Practice Exams 2026-27: Full MCQ + FRQ',
    description: 'Free AP CSA practice exams for 2026-27: a full 42-question MCQ section plus all 4 FRQ types, with Java solutions and the College Board scoring rubrics.',
    why: 'stale year in the description',
  },
  {
    handle: 'ap-csp-practice-exams',
    title: 'AP CSP Practice Exams 2026-27: Full MCQ Practice',
    description: 'Free AP CSP practice exams for 2026-27 with answer explanations for every question. Build speed and accuracy on all 5 Big Ideas before the May 2027 exam.',
    why: 'stale year in the description',
  },
  {
    handle: 'ap-csa-flashcards',
    title: 'AP CSA Flashcards 2026-27: 200 Cards, All 4 Units',
    description: '200 free AP Computer Science A flashcards covering all 4 units for 2026-27: Java syntax, key vocabulary, method signatures and the concepts the exam repeats.',
    why: 'stale year in the description',
  },
  {
    handle: 'ap-csa-test-builder',
    title: 'AP CSA Test Builder: 586 Practice Questions',
    description: 'Build custom AP CSA practice tests from a bank of 586 questions. Filter by unit, topic and difficulty. Aligned to the 4-unit curriculum for the May 2027 exam.',
    why: 'stale year in the description',
  },
  {
    handle: 'ap-csp-test-builder',
    title: 'AP CSP Test Builder: Custom Practice Tests',
    description: 'Build custom AP Computer Science Principles practice tests by Big Idea and topic, from a full question bank aligned to the May 2027 exam. Free, no signup.',
    why: 'stale year in the description',
  },

  // Found by the 2026-09-05 daily crawl, shard 4/7. Descriptions were scraped
  // page furniture (breadcrumbs, nav labels) rather than authored text; three
  // CSP games also carried the brand twice in the title.
  {
    handle: 'ap-csa-lesson-2-7-while-loops',
    title: 'AP CSA Lesson 2.7: while Loops',
    description: 'AP CSA Lesson 2.7 teaches while loops: correct initialization, condition and update, tracing execution, and spotting infinite loops and off by one errors.',
    why: 'description was scraped breadcrumb and nav text',
  },
  {
    handle: 'ap-csa-lesson-2-9-implementing-selection-iteration-algorithms',
    title: 'AP CSA Lesson 2.9: Selection and Iteration Algorithms',
    description: 'AP CSA Lesson 2.9 builds standard algorithms from loops and conditionals: divisibility, digit extraction, frequency counts, min and max, and running sums.',
    why: 'description was scraped breadcrumb and nav text',
  },
  {
    handle: 'ap-csp-course-bi3-unit-test-part-b',
    title: 'AP CSP Big Idea 3 Unit Test, Part B',
    description: 'A 14 question, auto scored AP CSP practice test on Big Idea 3 topics 3.10 through 3.18: lists, procedures, and abstraction. Retakes allowed, 70 percent to pass.',
    why: 'description was scraped breadcrumb and nav text',
  },
  {
    handle: 'ap-cybersecurity-unit-2-detecting-physical-attacks',
    title: 'AP Cybersecurity 2.4: Detecting Physical Attacks',
    description: 'AP Cybersecurity 2.4 covers detecting physical attacks: cameras, guards, motion sensors, entry point placement, false alarm prevention, and reading entry logs.',
    why: 'description was scraped Command Center nav furniture',
  },
  {
    handle: 'ap-csp-game-binary-conversion-race',
    title: 'Binary Conversion Race, an AP CSP Game',
    description: 'A 60 second AP CSP game on binary place value: build numbers by toggling bits or read a bit pattern and type its value. Streak bonuses reward correct answers.',
    why: 'title carried the brand twice; description was scraped',
  },
  {
    handle: 'ap-csp-game-spot-the-bias',
    title: 'Spot the Bias, an AP CSP Game',
    description: 'An AP CSP game on algorithmic bias: read how a system works, predict where bias entered its data or design, then pick the flaw. Keep a streak going.',
    why: 'title carried the brand twice',
  },
  {
    handle: 'ap-csp-game-two-sides',
    title: 'Two Sides, an AP CSP Game',
    description: 'An AP CSP game on the impact of computing: sort real innovations by their effects as beneficial, harmful, or it depends, since some effects are unintended.',
    why: 'title carried the brand twice',
  },

  // Same 2026-09-05 crawl, persisting rather than fresh: these four CSA course
  // hub pages have carried a scraped description for 9 to 10 nights with no
  // board task. ap-csa-unit-1-course also had its title mismatched to the
  // page content (Primitive Types instead of the actual Unit 1 topic,
  // Objects and Methods), and ap-csa-unit-4-course carried an em dash.
  {
    handle: 'ap-csa-unit-1-course',
    title: 'AP CSA Unit 1: Using Objects and Methods',
    description: 'AP CSA Unit 1 covers the foundational building blocks of Java: variables, data types, expressions, method calls, and the String class, in 15 lessons.',
    why: 'description was scraped breadcrumb text, and the title said Primitive Types while the page itself is Using Objects and Methods',
  },
  {
    handle: 'ap-csa-unit-2-course',
    title: 'AP CSA Unit 2: Selection and Iteration',
    description: 'AP CSA Unit 2 covers conditional statements and loops, the control structures behind every algorithm you write, across 12 lessons and 96 plus questions.',
    why: 'description was scraped breadcrumb text',
  },
  {
    handle: 'ap-csa-unit-3-course',
    title: 'AP CSA Unit 3: Class Creation',
    description: 'AP CSA Unit 3 covers class creation: designing Java classes, constructors, accessors and mutators, static versus instance members, scope, and the this keyword.',
    why: 'description was scraped breadcrumb and nav text and carried an em dash, found 2026-09-12: the same fix already shipped for the sibling unit-1, unit-2 and unit-4 course pages had never covered this one',
  },
  {
    handle: 'ap-csa-unit-3-practice-exam-part-2',
    title: 'AP CSA Unit 3 Practice Exam, Part 2: Class Creation',
    description: 'Part 2 of the AP CSA Unit 3 practice exam, questions 26 to 50: methods, static versus instance, scope, the this keyword, toString, equals, and class design.',
    why: 'description was scraped and carried the stale year 2025-2026',
  },
  {
    handle: 'ap-csa-unit-4-course',
    title: 'AP CSA Unit 4: Data Collections',
    description: 'AP CSA Unit 4, the largest and most heavily tested unit on the exam, covers arrays, ArrayLists, 2D arrays, searching, sorting, and recursion.',
    why: 'description was scraped breadcrumb text, and the title carried an em dash',
  },
  //  ── THE PAGES GOOGLE ALREADY RANKS, 2026-09-17 ─────────────────────────────
  //  Search Console for 2026-09-16 shows eight queries taking heavy impressions
  //  at positions 4 to 9 and converting at 0 to 1.7%, against 12 to 17% on the
  //  action pages. Every ZERO-click page below had a broken snippet; the two
  //  that earned clicks (ap-cybersecurity-curriculum, ap-csp-score-calculator)
  //  had already been rewritten in the pass above. That is the whole pattern.
  //
  //  The exam dates are first-party, from docs/ced-snapshot/exam-dates.txt
  //  captured 2026-09-01: CSA is Wednesday May 12 2027, CSP is Friday May 14
  //  2027. Bluebook is deliberately NOT claimed anywhere below: the live copy
  //  asserts it and no source in this repo confirms it for CSA or CSP.
  {
    handle: 'ap-csa-exam-format',
    title: 'AP CSA Exam Format 2027: Sections, Timing and Scoring',
    description: 'The AP CSA exam is Wednesday, May 12, 2027. What each section asks, how the two are weighted, what the Java Quick Reference gives you, and how to pace both.',
    why: '237 impressions and 2 clicks at position 5.67; title said 2026 and the description trailed off mid-sentence',
  },
  {
    handle: 'ap-csa-reference-sheet',
    title: 'AP CSA Java Quick Reference: Every Method, All 4 Units',
    description: 'The full Java Quick Reference you get in the AP CSA free response section, unit by unit: String, Math, Integer, Double, ArrayList, arrays, plus exam traps.',
    why: '214 impressions and ZERO clicks at position 4.44; title said 2026 and the body still reads Exam: May 2026',
  },
  {
    handle: 'ap-csp-reference-sheet',
    title: 'AP CSP Reference Sheet: Pseudocode and Exam Formulas',
    description: 'The AP CSP exam reference sheet explained line by line: pseudocode blocks, list and procedure syntax, and the robot grid, with worked examples of each.',
    why: '142 impressions and ZERO clicks at position 6.88; the description was the untouched template default',
  },
  {
    handle: 'ap-networking-curriculum',
    title: 'AP Networking Curriculum: All 4 Units and Every Topic',
    description: 'The full AP Networking pilot curriculum, all four units from Managing My Connections to Managing Our Global Connections, with every topic and a pacing plan.',
    why: '201 impressions and ZERO clicks at position 8.62; title was 62 chars and the description 180, so both were cut',
  },
  {
    handle: 'ap-csp-bi2-overflow-roundoff',
    title: 'AP CSP Overflow and Roundoff Errors: Big Idea 2',
    description: 'Why integers overflow and decimals round off, the difference the AP CSP exam tests, and how to spot each in a question. Worked examples and practice items.',
    why: '141 impressions and ZERO clicks at position 4.87; the description trailed off mid-sentence',
  },
  {
    handle: 'ap-computer-science-principles-full-practice-exam-70-mcq',
    title: 'AP CSP Practice Exam 2027: Full 70 Question Test',
    description: 'A free full-length AP CSP practice exam, 70 questions across all 5 Big Ideas, with timed mode, answer explanations and a score estimate for the May 2027 exam.',
    why: 'title said 2026 and the description trailed off mid-sentence',
  },
  {
    handle: 'ap-computer-science-principles-practice-exam-2025',
    title: 'AP CSP Practice Exam: 30 Question Condensed Test',
    description: 'A short AP CSP practice exam, 30 questions with answer explanations across all 5 Big Ideas. Built to find weak spots fast before the May 2027 exam.',
    why: 'the description advertised a CSA practice exam on a CSP page, and the title carried a machine ellipsis',
  },
  {
    handle: 'ap-csa-java-errors-hub',
    title: 'AP CSA Java Errors: Every Compiler and Runtime Error',
    description: 'Every Java error AP CSA students hit, each with broken and fixed code, the MCQ trap it sets, and where it sits in the course. Compiler and runtime covered.',
    why: 'title said 2026 and carried the brand; description was 162 chars',
  },
  {
    handle: 'ap-csa-unit-2-complete-study-guide',
    title: 'AP CSA Unit 2 Study Guide: Selection and Iteration',
    description: 'AP CSA Unit 2 in full: boolean expressions, if and nested if, compound conditions, while and for loops, string algorithms and run time. Examples and practice.',
    why: 'the description read AP CSAUnit 2 with no space, and the title carried a machine ellipsis',
  },
  {
    handle: 'ap-csa-unit-3-complete-study-guide',
    title: 'AP CSA Unit 3 Study Guide: Class Creation',
    description: 'AP CSA Unit 3 in full: writing classes, constructors, instance versus static, scope, the this keyword, toString and equals. Worked examples and practice sets.',
    why: 'the description read AP CSAUnit 3 with no space, and the title carried a machine ellipsis',
  },
  {
    handle: 'ap-csp-practice-exam-bootcamp',
    title: 'AP CSP Practice Exam Bootcamp: Full Walkthrough',
    description: 'A recorded AP CSP bootcamp working a full practice exam question by question, with scoring strategy and the mistakes that cost the most points in May 2027.',
    why: 'title said 2026 and the description trailed off mid-sentence',
  },
  {
    handle: 'ap-csp-unit-5-cybersecurity-complete-2025-study-guide',
    title: 'AP CSP Unit 5 Study Guide: Cybersecurity and Impact',
    description: 'AP CSP Unit 5 in full: cybersecurity risks, safe computing, and the legal and ethical impact of computing. Examples, practice questions and exam strategy.',
    why: 'title carried an en dash, a machine ellipsis and the year 2025; description was the template default. The handle keeps 2025 because renaming a handle is never automatic',
  },
  {
    handle: 'ap-networking-practice-exam',
    title: 'AP Networking Practice Exam: Free Scenario Questions',
    description: 'Free AP Networking practice questions with answer explanations, built on the four pilot skills: Connect, Secure, Troubleshoot and Collaborate. Scenario based.',
    why: 'title was 62 chars and the description 186, so both were cut in the SERP',
  },
  {
    handle: 'ap-networking-practice-exam-full',
    title: 'AP Networking Practice Exam: 20 Interactive Questions',
    description: 'Twenty scenario-based AP Networking questions with instant feedback, answer explanations and a live score, across all four skills of the pilot framework.',
    why: 'title was 64 chars and the description 202, the longest on the site',
  },
  {
    handle: 'ap-networking-study-guide',
    title: 'AP Networking Study Guide: Unit by Unit Exam Review',
    description: 'A free AP Networking study guide covering all four units and skills, from Managing My Connections to Managing Our Global Connections, from the pilot framework.',
    why: 'title was 62 chars and the description 182, so both were cut in the SERP',
  },
  {
    handle: 'ap-csa-ultimate-practice-exam',
    title: 'AP CSA Full Practice Exam: MCQ and FRQ with Answers',
    description: 'A full-length AP CSA practice exam, multiple choice plus every free response type, with Java solutions and scoring rubrics. Built for the May 12, 2027 exam.',
    why: 'description trailed off mid-sentence and the body advertises the 2026 exam',
  },
];

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
//  Only records with a hard defect: the store name twice, a title cut off
//  mid-word, or a school year that has ended. The remaining overlong titles are
//  handled mechanically by the generator, which strips the brand and reports
//  anything still over budget rather than truncating it.
const PRODUCTS = [
  {
    handle: 'ap-networking-teacher-bundle',
    title: 'AP Networking Teacher Bundle: Complete 4-Unit Curriculum',
    why: 'store name twice, 102 characters',
  },
  {
    handle: 'ap-cybersecurity-founding-teacher-bundle',
    title: 'AP Cybersecurity Founding Teacher Bundle: All 5 Units',
    why: 'store name twice, 90 characters',
  },
  {
    handle: 'ap-csp-teacher-superpack',
    title: 'AP CSP Teacher Bundle: All 5 Big Ideas, Full Course',
    why: 'store name twice',
  },
  {
    handle: 'ap-csa-reference-sheet-pdf',
    title: 'AP CSA Reference Sheet PDF: Cheat Sheet & FRQ Patterns',
    why: 'title was cut off mid-word at "Practice Que"',
  },
  {
    handle: 'ap-csa-complete-quick-reference-guide',
    title: 'AP CSA Quick Reference Guide 2026-27: All 4 Units',
    why: 'title was cut off mid-word at "2025-2026 Curric"',
  },
  {
    handle: 'ap-csp-complete-study-bundle',
    title: 'AP CSP Complete Study Bundle 2026-27: 6 PDFs',
    why: 'title advertised the 2025-2026 exam while on sale, and ran to 87 characters',
  },
  {
    handle: 'ap-csp-5-big-ideas-quick-reference',
    title: 'AP CSP Quick Reference Guide 2026-27: 5 Big Ideas',
    why: 'title advertised the 2025-2026 exam while on sale',
  },
  {
    handle: 'ap-csp-pseudocode-reference-sheet',
    title: 'AP CSP Pseudocode Reference Sheet 2026-27: Exam Syntax',
    why: 'stale year, 95 characters',
  },
  {
    handle: 'ap-csp-create-task-complete-guide',
    title: 'AP CSP Create Task Guide 2026-27: Score 6/6 Strategy',
    why: 'title advertised the 2025-2026 exam while on sale, and ran to 85 characters',
  },
  {
    handle: 'ap-csa-4-week-cram-kit',
    title: 'AP CSA 4-Week Cram Kit 2026-27: Day-by-Day Plan',
    why: 'a cram kit named for last year is a harder sell than one named for this year',
  },
  {
    handle: 'ap-csa-2-week-cram-kit',
    title: 'AP CSA 2-Week Cram Kit 2026-27: 14-Day Study Plan',
    why: 'a cram kit named for last year is a harder sell than one named for this year',
  },
  {
    handle: 'ap-csa-teacher-superpack',
    title: 'AP CSA Teacher Bundle 2026-27: All 4 Units',
    why: 'consistency with the other three teacher bundles',
  },
  {
    handle: 'ap-csa-teacher-superpack-free-preview',
    title: 'Free AP CSA Teacher Bundle: Unit 1 Lessons & Quizzes',
    why: 'the lead magnet, at 96 characters, with the word Free buried',
  },
];

// ── COLLECTIONS ──────────────────────────────────────────────────────────────
//  Every collection checked had no meta description at all and an H1 reading
//  "Collection: X". Descriptions cannot fix the H1, which is a theme template,
//  but they do decide the search snippet.
const COLLECTIONS = [
  {
    handle: 'ap-csa',
    title: 'AP CSA Study Materials: Flashcards, FRQs & Cram Kits',
    description: 'AP Computer Science A study materials for the May 2027 exam: flashcards for all 4 units, FRQ solution packs, quick reference guides and day-by-day cram kits.',
    why: 'no meta description at all',
  },
  {
    handle: 'ap-csp',
    title: 'AP CSP Study Materials: Big Ideas, Create Task & Cram Kits',
    description: 'AP Computer Science Principles study materials for the May 2027 exam: Big Idea flashcards, Create Task guides, pseudocode reference sheets and cram kits.',
    why: 'no meta description at all',
  },
  {
    handle: 'bundles',
    title: 'AP CS Bundles: Save on Study Packs & Teacher Kits',
    description: 'Bundled AP Computer Science materials at a lower price than buying separately: student study packs for CSA and CSP, and complete teacher course bundles.',
    why: 'no meta description at all',
  },
  {
    handle: 'frq',
    title: 'AP CSA FRQ Solutions: Every Year, Full Rubrics',
    description: 'Complete AP CSA free response solutions with 9-point scoring rubrics and common mistake analysis, covering every released FRQ from 2004 to 2025.',
    why: 'no meta description at all',
  },
  {
    handle: 'flashcards',
    title: 'AP CS Flashcards: CSA Units and CSP Big Ideas',
    description: 'Digital and printable AP Computer Science flashcards: all 4 AP CSA units and all 5 AP CSP Big Ideas, covering syntax, vocabulary and the concepts exams repeat.',
    why: 'no meta description at all',
  },
  {
    handle: 'practice-exams',
    title: 'AP CS Practice Exams: Full MCQ and FRQ Sections',
    description: 'Full-length AP Computer Science practice exams for CSA and CSP, with answer explanations, scoring rubrics and the real exam timing. For the May 2027 exams.',
    why: 'no meta description at all',
  },
  {
    handle: 'quick-reference',
    title: 'AP CS Quick Reference Guides: CSA and CSP',
    description: 'One-page AP Computer Science reference guides: Java syntax and methods for AP CSA, pseudocode and the 5 Big Ideas for AP CSP. Printable, for the May 2027 exams.',
    why: 'no meta description at all',
  },
];

module.exports = { PAGES, PRODUCTS, COLLECTIONS };
