'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA CODE TEST BANK — hidden test cases for server-side code grading.
//
//  Each graded code item (a lesson's exercise-1 / exercise-2 / frq) carries a set
//  of test cases: an stdin, the expected stdout, and a hidden flag. The grader
//  (POST /api/student/code-grade) runs the student's source against every case
//  through the Judge0 proxy and scores cases-passed / total. Cases NEVER reach the
//  client, so the page source cannot double as an answer key.
//
//  Integrity rule enforced by the loader: at least three cases per item and at
//  least one hidden. The visible expected output can leak into the page (it is the
//  worked example), but a hardcoded System.out.println of it fails the hidden
//  cases, which use different inputs. That is the same fix applied to the quizzes:
//  the correct answers live server-side, not in the page.
//
//  These are representative PILOT cases for the CSA Unit 1 slice, the code-grading
//  counterpart to the placeholder cyber quiz bank. The authoritative per-lesson
//  cases are added the same way as content ships, then loaded with
//  `node scripts/seed-code-tests.js --update`. Author content only; zero student
//  PII. No student source is ever stored. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

// item is the graded code item, which is also its activity_type: 'exercise-1'
// (the code exercise), 'exercise-2', or 'frq'. The manifest points for that
// (course, lesson, activity_type) are the denominator the ratio scales into.
const ITEMS = [
  {
    course: 'ap-csa',
    lesson: '1.1',
    item: 'exercise-1',
    // Pilot spec: read one integer from stdin and print double its value. The page
    // shows the 5 -> 10 example; the hidden cases use inputs the page never shows,
    // so printing a constant "10" cannot pass them.
    cases: [
      { stdin: '5\n',  expected_stdout: '10', hidden: 0 },
      { stdin: '7\n',  expected_stdout: '14', hidden: 1 },
      { stdin: '3\n',  expected_stdout: '6',  hidden: 1 },
      { stdin: '-4\n', expected_stdout: '-8', hidden: 1 },
    ],
  },
];

module.exports = { items: ITEMS };
