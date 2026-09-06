'use strict';
// -----------------------------------------------------------------------------
//  AP CSA UNIT 1 - SHORT WEB QUIZZES, MOVED ONTO THE SERVER RENDER PATH.
//
//  WHY THIS FILE EXISTS
//  A lock is only real where the SERVER hands out the questions. Every AP CSA
//  lesson page today carries its own questions AND its own answers: the live
//  body of ap-csa-lesson-1-1-intro-algorithms ships ten `data-answer` attributes,
//  so View Source is the whole answer key for that lesson. A gate row can be
//  written against `1.1-quiz` right now and it protects nothing, because the
//  browser has the instrument before any code of ours runs.
//
//  docs/quiz-locking.md sets out the three steps. This file is step 1 for lesson
//  1.1. Step 2, the page body dropping its questions and mounting a container
//  that calls GET /api/quiz/ap-csa/unit-1/1.1/quiz, is a Matrixify page change in
//  the same migration and is what actually removes the leak. Until step 2 lands,
//  this bank is served by the API and the page still has its own copy: the lock
//  is still decoration, and nobody should be told otherwise.
//
//  CSA SCORES THROUGH A DIFFERENT SYSTEM, WHICH IS THE REAL SIZE OF THIS JOB
//  CSA quizzes report through POST /api/student/score against quiz_answer_bank,
//  which owns ANSWERS but not QUESTIONS. Lock enforcement lives in routes/quiz.js
//  against quiz_bank, which owns both. So migrating a CSA quiz is not a content
//  move, it is moving that quiz onto the other scoring system. That is why this
//  starts with one lesson rather than all fourteen.
//
//  PROVENANCE, AND THE RULE IT OBEYS
//  These two questions are the Parts A and B already published in the Tier 3 AP
//  Mastery Challenge on the live 1.1 lesson page, moved server-side with their
//  options, their keys and their feedback unchanged. Nothing here comes from the
//  CSA teacher bundle. seed/cyber-unit-1-web-quizzes.js explains why that rule
//  exists: a bundle question is worth something precisely because it is not
//  published, and publishing one spends that for every teacher using the bundle,
//  not just the class being fixed. The bundle's own Bell Ringer and Quiz for this
//  lesson stay where they are.
//
//  WHAT WAS LEFT BEHIND ON PURPOSE
//  Part C is a structured response with a self-scoring rubric. Its textarea is
//  never submitted anywhere, so it is not a graded column and there is nothing to
//  serve. It also must not become one: this repo stores no free-text student
//  input outside the sandbox exception, and a server-scored written answer would
//  be a second exception rather than a feature.
//
//  THE SHARED SCENARIO
//  quiz_bank rows are flat: prompt, options, correct_index. There is no column
//  for a stem shared by several questions, and adding one to carry a single
//  lesson's scenario would be schema for a formatting problem. Each prompt below
//  therefore carries the part of the scenario its own question needs. The options
//  and the keys are byte-for-byte what the page serves today.
// -----------------------------------------------------------------------------
const COURSE = 'ap-csa';
const UNIT = 'unit-1';
const ACTIVITY = 'quiz';

//  Web-authored series, matching the cyber convention: a #wN id never collides
//  with whatever a future bundle-derived import might use, so retiring one bank
//  cannot rewrite the text a stored score_event was actually asked.
function qid(lesson, n) { return `${COURSE}:${UNIT}:${lesson}:${ACTIVITY}#w${n}`; }

// -- Lesson 1.1, Introduction to Algorithms and Programming -------------------
//    Moved from the live page 2026-09-06. Covers the three error classifications
//    the lesson teaches: syntax, run-time (including exceptions), and logic.
const L11 = [
  {
    prompt: 'Sara writes a Java program in IntelliJ that reads student names from a text file and prints them. She clicks Run, and IntelliJ refuses to start the program: it underlines the second-to-last line in red. When IntelliJ refused to start the program and underlined a line in red, what kind of error was Sara hitting?',
    options: [
      'A logic error, because the program is producing the wrong result.',
      'A syntax error, because the compiler refused to compile the code and flagged a specific line.',
      'A run-time error, because the IDE detected it before execution.',
      'An exception, because the IDE handled it before the program ran.',
    ],
    correct_index: 1,
    explanation: 'The defining feature is that the program never ran. The IDE underlined a line in red and refused to compile, which is what happens with a syntax error. A is wrong because logic errors only show up after the program runs and produces wrong output. C is wrong because run-time errors happen during execution, not before it starts. D is wrong because exceptions are a specific kind of run-time error, again something that surfaces while the program is executing.',
  },
  {
    prompt: 'Sara fixes the line IntelliJ flagged and runs the program again. This time it starts, prints six names, and then terminates abnormally with a message about NullPointerException. Which classification best describes this second error?',
    options: [
      'An exception, which is a type of run-time error caused by an unexpected condition the compiler could not detect.',
      'A logic error, because the program ran for a while and then stopped.',
      'A syntax error, because the compiler should have caught it before execution.',
      'A compilation warning, because the IDE permitted the program to start but then halted it.',
    ],
    correct_index: 0,
    explanation: 'The program compiled and started, so it is not a syntax error, and it stopped abnormally rather than finishing with wrong output, so it is not a logic error. A NullPointerException is thrown while the program is executing, which is what makes it a run-time error, and an exception is the specific kind of run-time error Java raises for an unexpected condition at that moment.',
  },
];

function pack(lesson, questions, serve_count) {
  return {
    location: { course: COURSE, unit: UNIT, lesson, activity_type: ACTIVITY, serve_count: serve_count || 0 },
    questions: questions.map((q, i) => ({ qid: qid(lesson, i + 1), points: 1, ...q })),
  };
}

//  serve_count 0 serves the whole pool. Two items is already the whole
//  instrument, so there is nothing to sample down to.
//
//  Lessons 1.2 through 1.15 are deliberately absent. Each one needs its page
//  read and its questions moved the same way, and each needs its own step 2, so
//  they land as they are migrated rather than as an empty promise here.
module.exports = [
  pack('1.1', L11, 0),
];
