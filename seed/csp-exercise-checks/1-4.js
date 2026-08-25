'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GRADED CHECKS: Topic 1.4, Identifying and Correcting Errors.
//
//  Same contract as the other topics in this directory. The handout's own items
//  are constructed response, mirrored verbatim on the page, unscored and never
//  transmitted. These MCQs are the auto-graded half, and each is DERIVED from a
//  specific sentence in the teacher answer KEY, quoted in `keyCite`.
//  scripts/verify-csp-exercise-checks.js confirms every quotation really appears
//  in the KEY document it names.
//
//  WHY EIGHT AND SIX.
//  Exercise 1 triages five bug reports against a four-name taxonomy (logic,
//  syntax, run-time, overflow) AND the five discovery methods. That is two
//  independent skills over five cases, and the classification traps are the
//  point of the topic: a run-time error that ran cleanly for weeks, and an
//  overflow that looks like a logic error because the number displayed wrong.
//  Eight covers each report plus the two distinctions that survive to the exam.
//
//  Exercise 2 patrols four programs for boundaries. Six, because two scenarios
//  hide a second boundary on a DIFFERENT input than the one under test (the
//  count of ratings rather than the star value, the accumulated total rather
//  than the nightly value), and the key grades those separately.
//
//  Topic 2.1 supplies the fixed-bit arithmetic behind overflow. These questions
//  stay inside 1.4's taxonomy, as the key does.
//
//  ASCII throughout, with one exception: the keyCite on the gradebook boundary
//  question quotes the key's own 'score >= 0' using the character the key
//  actually prints. A citation is verbatim or it is not a citation, and the
//  verifier matches on the real document. No em-dashes. Zero PII: author
//  content only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  'ap-csp-topic-1-4-exercise-1': {
    keyDoc: 'AP-CSP_1-4_Exercise1_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.I.2',
        keyCite: 'the rules of the programming language are not followed',
        stem: 'Report 2: the field-trip signup form will not start, and the language reports it cannot understand line 4, which reads "IF permission THEN" with nothing after it. Classify the error.',
        options: [
          'A logic error, because the condition is incomplete',
          'A run-time error, because the failure happens when the program is launched',
          'A syntax error: the rules of the programming language are not followed',
          'An overflow error, because the statement has no value to store',
        ],
        correct: 'C',
        why: {
          A: 'A logic error runs. This program never starts, which rules the category out immediately.',
          B: 'A run-time error occurs during execution. Execution never began here, because the language could not read the statement.',
          C: 'The tell is in the report itself: the language cannot understand the line. That is the definition of a broken language rule.',
          D: 'Overflow is about a number outside a defined range. No number is involved.',
        },
      },
      {
        ek: 'CRD-2.I.1',
        keyCite: 'the program runs but behaves incorrectly or unexpectedly',
        stem: 'Report 1: GradePro averages print too high for every student, no error message has ever appeared, and the formula reads "avg <- (q1 + q2 + q3) / 2". Which phrase in the report gives the classification away?',
        options: [
          'That six students were sampled',
          'That no error message has ever appeared, paired with consistently wrong output',
          'That the averages are too high rather than too low',
          'That the formula involves division',
        ],
        correct: 'B',
        why: {
          A: 'Sample size tells you the bug is consistent, not what kind of bug it is.',
          B: 'Running cleanly while producing wrong output is the signature of a logic error. Silence plus wrongness is the pair to look for.',
          C: 'The direction of the error helps you find the cause, but the same classification would hold if averages printed too low.',
          D: 'Division appears in Report 3 as well, where it causes a completely different error type.',
        },
      },
      {
        ek: 'CRD-2.I.3',
        keyCite: 'a mistake that occurs during the execution of a program',
        stem: 'Report 3: the bill-splitter worked every lunch period for weeks, then halted mid-run when a user entered 0 diners. Why do weeks of clean runs not contradict the classification?',
        options: [
          'Because the error was introduced by a recent change to the program',
          'Because run-time errors only appear after a program has run many times',
          'Because a run-time error occurs during execution and sleeps until execution meets an input it cannot survive',
          'Because the earlier runs were not really testing the same code path',
        ],
        correct: 'C',
        why: {
          A: 'Nothing in the report describes a change. The same legal code sat there the whole time.',
          B: 'Repetition does not age code into failure. The trigger is a particular input, not a run count.',
          C: 'Weeks of clean runs prove only that diners was never 0. The defect was present and dormant throughout.',
          D: 'The same path ran every time. What differed was the value flowing through it.',
        },
      },
      {
        ek: 'CRD-2.J.2',
        keyCite: 'an input at the extreme of the input data',
        stem: 'Which test case would have exposed the bill-splitter defect before launch?',
        options: [
          'A defined input of 0 diners, an input at the extreme of the input data',
          'A defined input of 4 diners, the most common party size',
          'Running the program a hundred times with typical inputs',
          'Reading the formula aloud to a second developer',
        ],
        correct: 'A',
        why: {
          A: 'Zero is the minimum possible party, and the extreme is exactly where the CED\'s testing rule says to look.',
          B: 'Typical values are what already ran cleanly for weeks. They cannot find this.',
          C: 'A hundred typical runs is the situation the report describes. Volume without extremes finds nothing.',
          D: 'A second reader might spot it, but that is not one of the CED\'s named discovery methods and it is not a test case.',
        },
      },
      {
        ek: 'CRD-2.I.4',
        keyCite: 'it occurs when a computer attempts to handle a number that is outside of the defined range of values',
        stem: 'Report 4: a step-count badge reset to 0 exactly as the count passed the counter\'s defined maximum. Classify the error.',
        options: [
          'A logic error, because the badge displayed a wrong number',
          'An overflow error: a number outside the defined range of values',
          'A run-time error, because it happened partway through the day',
          'A syntax error in the counter increment',
        ],
        correct: 'B',
        why: {
          A: 'The wrong display is what makes this tempting, but the algorithm was correct. Add one step per step is exactly right.',
          B: 'The value outgrew the range the computer could represent, which is a separately named failure on the taxonomy.',
          C: 'The timing looks like a run-time error, but the CED gives this specific cause its own name.',
          D: 'Nothing failed to parse. The program ran all day.',
        },
      },
      {
        ek: 'CRD-2.I.4',
        keyCite: 'Nothing about the DESIGN misbehaved',
        stem: 'Why is Report 4 not classified as a logic error, given that the badge showed a wrong number?',
        options: [
          'Because logic errors always produce an error message',
          'Because the algorithm was correct and it was the value, not the design, that left the range the computer could handle',
          'Because the wrong number was displayed rather than stored',
          'Because logic errors cannot involve counters',
        ],
        correct: 'B',
        why: {
          A: 'Logic errors are silent. Report 1 is silent too, and it is a logic error.',
          B: 'This is the distinction the taxonomy turns on. A correct algorithm can still meet a number the storage cannot hold.',
          C: 'Where the wrong number appears does not change what caused it.',
          D: 'Counters can absolutely carry logic errors. This one does not.',
        },
      },
      {
        ek: 'CRD-2.I.5',
        keyCite: 'HAND TRACING the answer-checking segment',
        stem: 'Report 5: the "streak!" celebration sometimes fires after wrong answers, the streak number itself displays correctly, and the check reads "IF streak > 0" instead of testing the newest answer. Which method pins down the guilty line?',
        options: [
          'Hand tracing the answer-checking segment with a wrong answer while streak is positive',
          'Waiting for the program to crash and reading the error message',
          'Increasing the streak threshold from 0 to 3',
          'Rewriting the animation in a different programming language',
        ],
        correct: 'A',
        why: {
          A: 'The trace shows the condition firing with no test of the newest answer, which localizes the defect to that line.',
          B: 'The report says there is no crash, ever. Waiting for one is waiting forever.',
          C: 'Changing the threshold makes the celebration rarer without ever testing the answer. The defect survives.',
          D: 'A rewrite carries the same wrong condition unless you first find it.',
        },
      },
      {
        ek: 'CRD-2.J.1',
        keyCite: 'test results exist to drive revision, not to be explained away',
        stem: 'GradePro\'s formula is fixed to divide by 3 and a test case of q1 = 90, q2 = 80, q3 = 70 expecting 80 is run. It fails anyway. What does the CED\'s testing loop require next?',
        options: [
          'Accepting the result, since one failing test among many passes is normal',
          'Adjusting the expected output to match what the program produced',
          'Using the result to revise the algorithm or program, then re-testing',
          'Reclassifying the defect as a run-time error',
        ],
        correct: 'C',
        why: {
          A: 'A failing test on a hand-computed expected value is a finding, not noise.',
          B: 'Rewriting the expectation to match the behaviour is how a wrong program passes its own tests forever.',
          C: 'Test results exist to drive revision. Revise, then re-test, and repeat until the defined input produces the expected outcome.',
          D: 'Reclassifying changes the label, not the wrong average.',
        },
      },
    ],
  },

  'ap-csp-topic-1-4-exercise-2': {
    keyDoc: 'AP-CSP_1-4_Exercise2_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.J.2',
        keyCite: 'defined inputs should demonstrate the different expected outcomes at or just beyond the extremes',
        stem: 'Scenario 1: a gradebook accepts whole-number scores from 0 to 100. The developer tested 85, 92 and 74, all correct, and wants to ship. What is the red flag?',
        options: [
          'Three tests are too few regardless of which values are chosen',
          'All three are comfortable middle values, and none goes anywhere near an extreme',
          'The tests should have been run by someone other than the developer',
          'Letter grades cannot be verified by testing numeric inputs',
        ],
        correct: 'B',
        why: {
          A: 'Count is not the issue. Four well-chosen boundary tests beat fifty middle values.',
          B: 'The CED asks for inputs at or just beyond the extremes, and 74 to 92 is the safe middle of a 0 to 100 range.',
          C: 'Independent testing is good practice but is not what the CED faults here.',
          D: 'They can, provided the requirements define which score maps to which letter.',
        },
      },
      {
        ek: 'CRD-2.J.1',
        keyCite: 'a comparison written \'score > 0\' instead of \'score ≥ 0\' fails only the 0 test',
        stem: 'Which test set defends the gradebook, and against what?',
        options: [
          '0 and 100 expecting correct grades, plus -1 and 101 expecting rejection',
          '50 and 51, to check the middle of the range carefully',
          '0, 25, 50, 75 and 100, evenly spaced across the range',
          '100 and 101 only, since the maximum is where programs usually fail',
        ],
        correct: 'A',
        why: {
          A: 'At the extremes, both are legal and must grade correctly. Just beyond, both must be rejected. An off-by-one comparison fails only the 0 test.',
          B: 'Nothing interesting happens at 50. The requirements draw no line there.',
          C: 'Even spacing feels thorough but tests the interior. It includes the extremes only by accident and never goes beyond them.',
          D: 'Testing one end leaves the other unguarded, and a program that grades 101 without complaint never crashes to tell you.',
        },
      },
      {
        ek: 'CRD-2.J.2',
        keyCite: 'that is precisely the input EK CRD-2.J.2 orders you to test',
        stem: 'Scenario 2: the star rating box is free-type, and the lead developer says the 1 to 5 range "is obvious, so nobody will type anything else." How should a tester treat that claim?',
        options: [
          'As a reason to skip those inputs and focus on realistic ratings',
          'As a documentation gap to be fixed by labelling the box more clearly',
          'As a signal to test exactly those inputs, since a developer calling an input unreal marks it as the one to try',
          'As correct, provided the interface shows only five stars',
        ],
        correct: 'C',
        why: {
          A: 'Skipping the input the developer swears cannot happen is how the defect ships.',
          B: 'A clearer label may reduce mistakes, but a free-type box still accepts every number.',
          C: 'Nobody will type it is a hope, not a defence. The testing rule points straight at the values just beyond the extremes.',
          D: 'The display constrains the picture, not the field. The box accepts what the box accepts.',
        },
      },
      {
        ek: 'CRD-2.I.3',
        keyCite: 'is legal code that becomes division by zero at the minimum of a DIFFERENT input',
        stem: 'Scenario 2, second layer: a film with zero ratings. Why do star-value tests never meet this defect?',
        options: [
          'Because the boundary sits on a different input, the count of ratings rather than the star value, and dividing by that count when it is 0 is a run-time error',
          'Because a film with no ratings is not displayed at all',
          'Because averages are only computed once a film is popular',
          'Because zero is already covered by testing the value just below 1',
        ],
        correct: 'A',
        why: {
          A: 'Sum divided by count is legal code that fails at the minimum of an input nobody was testing. The requirements never define behaviour for that case.',
          B: 'The scenario says the average shows on every film page, which is what makes the empty case reachable.',
          C: 'Nothing in the requirements delays the calculation until some popularity threshold.',
          D: 'Testing a star value of 0 exercises the rating input. It never produces a film with no ratings at all.',
        },
      },
      {
        ek: 'CRD-2.J.3',
        keyCite: 'the extremes are LENGTHS, not values',
        stem: 'Scenario 3: passwords must be 8 to 16 characters, and the intern tested "sunshine12" at ten characters. What must a tester name before building the test set?',
        options: [
          'The character set the password is allowed to draw from',
          'That the extremes are lengths rather than values, so the boundary lives on a property of the input',
          'The number of users expected to sign up',
          'The maximum value a password can represent numerically',
        ],
        correct: 'B',
        why: {
          A: 'The allowed characters matter for a different rule. The stated requirement is a length range.',
          B: 'Naming what is measured is the whole game here. Testing password values instead of password lengths tests the wrong axis entirely.',
          C: 'Load is unrelated to a boundary defined by the requirements.',
          D: 'Passwords are not numbers, and the requirement says nothing about a numeric range.',
        },
      },
      {
        ek: 'CRD-2.I.4',
        keyCite: 'The nightly value can never overflow',
        stem: 'Scenario 4: a wellness app logs nightly sleep from 0 to 1440 minutes and keeps a lifetime running total in the same size of storage. Where is the overflow risk?',
        options: [
          'In the nightly value, since 1440 is the largest number the app handles',
          'In the lifetime running total, which grows every night while the nightly value stays small',
          'In both equally, since they share the same storage size',
          'Nowhere, because the requirements define the range as 0 to 1440',
        ],
        correct: 'B',
        why: {
          A: '1440 is tiny. A nightly value can never approach the limit of the storage.',
          B: 'A semester at roughly 480 minutes a night approaches 87,000, and the requirements never define a ceiling for the accumulated value at all.',
          C: 'Sharing a storage size is what makes the comparison interesting, but only one of the two grows without bound.',
          D: 'That range governs the nightly input. It says nothing about the total built from it, which is the boundary the requirements forgot.',
        },
      },
    ],
  },
};
