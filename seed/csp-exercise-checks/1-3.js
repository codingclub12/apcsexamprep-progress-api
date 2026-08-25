'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GRADED CHECKS: Topic 1.3, Program Design and Development.
//
//  Same contract as 1-1.js and 1-2.js. The handout's own items are constructed
//  response, mirrored verbatim on the page, unscored and never transmitted.
//  These MCQs are the auto-graded half, and each is DERIVED from a specific
//  sentence in the teacher answer KEY, quoted in `keyCite` so the claim is
//  checkable rather than trusted. scripts/verify-csp-exercise-checks.js confirms
//  every quotation really appears in the KEY document it names.
//
//  WHY SEVEN AND SIX.
//  Exercise 1 audits a six-week development log, and each week carries its own
//  distinct ruling: the skipped phase, the rejected approach, design timing,
//  the refused iteration, the uncredited segment, the end-loaded documentation.
//  Seven, because the difference between "they never tested" and "they tested
//  and ignored it" is the single most confusable pair in this topic and earns a
//  question of its own.
//
//  Exercise 2 diagnoses four projects, so its floor is four. Six, because two
//  of the four hide a second-layer issue the key treats as separately gradeable:
//  the missing specification behind a skipped investigation, and the difference
//  between crediting borrowed code and being able to explain it.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  'ap-csp-topic-1-3-exercise-1': {
    keyDoc: 'AP-CSP_1-3_Exercise1_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.E.2',
        keyCite: 'The team skipped INVESTIGATING AND REFLECTING',
        stem: 'Week 1: the team voted in a group chat and started coding that afternoon, reasoning "we know what students want, we ARE students." Which phase did they skip?',
        options: [
          'Designing, because no sketch existed yet',
          'Investigating and reflecting, the first of the four commonly used phases',
          'Testing, because no user had tried the app',
          'No phase was skipped; a group-chat vote is a valid investigation',
        ],
        correct: 'B',
        why: {
          A: 'Design was skipped too, but not in Week 1. The sketch arrives in Week 3, and its problem is timing rather than absence.',
          B: 'Investigating and reflecting is where requirements get determined. Voting among themselves determined nothing about future users.',
          C: 'Testing does fail later, in Week 4, and it fails in a more interesting way: they tested and then ignored the result.',
          D: 'A vote records preferences the team already held. It collects no data from the people who will use the program.',
        },
      },
      {
        ek: 'CRD-2.F.3',
        keyCite: 'investigation can be performed by collecting data through surveys, user testing, interviews, and direct observations',
        stem: 'What would have replaced the team\'s "we ARE students" assumption with something defensible?',
        options: [
          'Collecting data through surveys, user testing, interviews, or direct observations',
          'A longer group chat with more members voting',
          'Reading the documentation of similar flashcard apps',
          'Building a prototype first and seeing whether it felt right',
        ],
        correct: 'A',
        why: {
          A: 'These are the CED\'s named investigation methods. Each one puts data from users where the team had only beliefs about users.',
          B: 'More voters inside the same team is a larger sample of exactly the same assumption.',
          C: 'Studying competitors can inform a design, but it is not one of the methods the CED names, and it still never contacts a user.',
          D: 'Prototyping belongs to a later phase and cannot supply the requirements the prototype is meant to satisfy.',
        },
      },
      {
        ek: 'CRD-2.E.4',
        keyCite: 'a process that breaks the problem into smaller pieces and makes sure each piece works before adding it to the whole',
        stem: 'Week 2: the team built login, decks, quiz mode, streaks and sharing in one push, planning to "test at the end." Which development approach did they reject, and what is it?',
        options: [
          'Iterative development: revising the program after each round of feedback',
          'Collaborative development: dividing the work among team members',
          'Incremental development: breaking the problem into smaller pieces and making sure each piece works before adding it to the whole',
          'Agile development: shipping a working version every week',
        ],
        correct: 'C',
        why: {
          A: 'Iteration is a different failure, and the team commits it separately in Week 4. Iteration is about responding to feedback, not about build order.',
          B: 'The work was in fact divided badly, but collaboration is not the approach this week\'s decision rejected.',
          C: 'Five separately confirmed pieces would have replaced one 900 line unknown. That verification step is the definition.',
          D: 'Agile is not the vocabulary the CED uses here, and naming it would not earn the point.',
        },
      },
      {
        ek: 'CRD-2.F.6',
        keyCite: 'the design phase OUTLINES HOW TO ACCOMPLISH A GIVEN PROGRAM SPECIFICATION',
        stem: 'Week 3: the team drew a paper sketch of all the screens after the code was already written and called it "our design doc." What is wrong with the timing?',
        options: [
          'Nothing is wrong; documenting the finished screens is a legitimate design record',
          'The sketch should have been digital rather than on paper',
          'Design outlines how to accomplish a specification, so it has to precede and guide the build',
          'The sketch should have been approved by the teacher before the demo',
        ],
        correct: 'C',
        why: {
          A: 'A drawing of what already exists is a portrait, not a blueprint. It cannot guide a build that is finished.',
          B: 'The medium is irrelevant. A paper storyboard drawn in Week 1 would have done the job perfectly.',
          C: 'Design is forward looking by definition. Worse here, no investigation ever happened, so there was no specification for a design to accomplish.',
          D: 'Approval is not what the design phase is for, and the teacher request is why the sketch exists at all.',
        },
      },
      {
        ek: 'CRD-2.E.3',
        keyCite: 'an iterative process REQUIRES refinement and revision based on feedback, testing, or reflection throughout the process',
        stem: 'Week 4: four of five testers could not find the quiz button. The team logged this and changed nothing, saying "they are just not good with apps." What did an iterative process require here?',
        options: [
          'Recruiting five better testers and running the test again',
          'Refinement and revision based on that feedback, which meant revisiting the designing phase',
          'Nothing, because the testing phase had already been completed as planned',
          'Adding a tutorial screen explaining where the quiz button is',
        ],
        correct: 'B',
        why: {
          A: 'Replacing the testers discards the finding. The feedback was consistent, which is what makes it a requirement discovery.',
          B: 'Iteration is the willingness to let test results send you backward. The layout, not the testers, was the thing to revise.',
          C: 'The testing phase did run. What failed is the loop that makes testing worth anything.',
          D: 'A tutorial explaining an unfindable button treats the symptom and leaves the design defect in place.',
        },
      },
      {
        ek: 'CRD-2.H.2',
        keyCite: "should include the ORIGIN or the ORIGINAL AUTHOR'S NAME",
        stem: 'Week 5: a streak-counter segment was pasted from a coding forum and its variables renamed. What does the CED require?',
        options: [
          'Nothing further, because renaming the variables makes the segment the team\'s own work',
          'Removing the segment entirely, since borrowed code is not permitted',
          'An acknowledgement in the program documentation, including the origin or the original author\'s name',
          'A note in the demo presentation mentioning that some code came from online',
        ],
        correct: 'C',
        why: {
          A: 'Renaming variables changes the spelling, not the source. This is the exact reasoning the case exists to reject.',
          B: 'Borrowed code is allowed. The requirement is acknowledgement, not abstinence.',
          C: 'A comment above the streak counter naming the forum satisfies both halves: it lives in the documentation and it names the origin.',
          D: 'A spoken mention is not the program documentation, and it does not travel with the code.',
        },
      },
      {
        ek: 'CRD-2.G.3',
        keyCite: 'programmers should document a program THROUGHOUT its development',
        stem: 'Week 6: one member added comments to all 900 lines the night before the demo, from memory. Why is this still a documentation failure?',
        options: [
          'Because comments alone never count as documentation',
          'Because documentation should happen throughout development, so end-loaded comments forfeit the job documentation does during the build',
          'Because one person cannot document a team project',
          'Because 900 lines is too many to document in a single night',
        ],
        correct: 'B',
        why: {
          A: 'Comments are documentation. The problem is when they were written, not what form they took.',
          B: 'Documentation written after development is over cannot catch wrong assumptions or let teammates build on each other\'s work. Those jobs were already lost.',
          C: 'Solo documentation is permitted. The CED describes documenting individually or collaboratively.',
          D: 'The volume is a symptom. Even 90 lines reconstructed from memory at the end would fail the same way.',
        },
      },
    ],
  },

  'ap-csp-topic-1-3-exercise-2': {
    keyDoc: 'AP-CSP_1-3_Exercise2_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.F.2',
        keyCite: 'investigation exists precisely to surface program constraints and the concerns and interests of the people who will use the program',
        stem: 'Scenario 1: a locker-organizer app assumes lockers are assigned alphabetically, but this school assigns them by grade and hallway. No teacher was consulted. Which process problem is this?',
        options: [
          'A skipped investigating-and-reflecting phase',
          'A documentation failure, since the assumption was never written down',
          'A logic error in the sorting code',
          'A build that was not incremental',
        ],
        correct: 'A',
        why: {
          A: 'Investigation is the CED\'s named tool for replacing beliefs about users with data from users. It never ran.',
          B: 'Writing the wrong assumption down more clearly would not have made it right.',
          C: 'The code does what it was designed to do. This is a correct build of the wrong program, not a defect in the build.',
          D: 'Nothing in the scenario says pieces went unverified. The month of building may have gone fine; it went toward the wrong target.',
        },
      },
      {
        ek: 'CRD-2.F.6',
        keyCite: 'there was also no specification for the design phase to accomplish',
        stem: 'Scenario 1, second layer: what follows from the fact that requirements were never determined?',
        options: [
          'The program could still be judged complete once every planned feature worked',
          'There was no specification for the design phase to accomplish, so the build had no target to be measured against',
          'The requirements can be written afterward and applied retroactively',
          'The problem is confined to the investigation phase and does not affect design',
        ],
        correct: 'B',
        why: {
          A: '"Every planned feature" begs the question, since the plan itself was guessed. Done was undefined from day one.',
          B: 'Requirements feed the specification, and the specification is what design exists to accomplish. Losing the first collapses the chain.',
          C: 'Requirements written now can guide future work, but they cannot retroactively justify the month already spent.',
          D: 'A missing investigation propagates. Design had nothing to design toward.',
        },
      },
      {
        ek: 'CRD-2.E.4',
        keyCite: 'they cannot say which parts have ever worked',
        stem: 'Scenario 2: one partner wrote a 700-line escape-room game in four days, ran it for the first time, and after a week of fixes cannot say which parts have ever worked. Which sentence gives the diagnosis away?',
        options: [
          'That the game is 700 lines long',
          'That it crashed instantly on the first run',
          'That they cannot say which parts have ever worked, which is impossible in a verified-pieces build',
          'That the work was split between only two people',
        ],
        correct: 'C',
        why: {
          A: 'Length alone is not a process problem. A 700-line program built in verified pieces would be fine.',
          B: 'An instant crash is a symptom shared by many causes and does not by itself name the process disease.',
          C: 'Incremental development confirms each piece at the moment it joins, so that sentence could never be true.',
          D: 'Team size is not the issue. One partner building alone incrementally would have avoided this.',
        },
      },
      {
        ek: 'CRD-2.F.7',
        keyCite: 'EK CRD-2.F.7 places development of a testing strategy inside the DESIGN phase',
        stem: 'Scenario 2, second layer: the pair\'s testing strategy was "run it once at the end." Where should a testing strategy have been developed?',
        options: [
          'In the design phase',
          'In the testing phase, immediately before the first run',
          'In the investigation phase, alongside the requirements',
          'After the first failure, once the failure modes are known',
        ],
        correct: 'A',
        why: {
          A: 'The CED places the testing strategy inside design, which is why a project that skips design usually discovers it has no strategy either.',
          B: 'Deciding how to test at the moment of testing is what produced "run it once at the end."',
          C: 'Investigation determines requirements. Those requirements later supply expected outcomes, but the strategy itself is a design product.',
          D: 'A strategy written after the failure cannot have prevented it, and the pair are still guessing which pieces work.',
        },
      },
      {
        ek: 'CRD-2.E.3',
        keyCite: 'phases are commonly used stages, not one-way gates',
        stem: 'Scenario 3: users tap the poster image expecting a button. The team logs every comment and ships unchanged, because "the design phase ended in October and we are in the testing phase now." What is wrong with that reasoning?',
        options: [
          'Nothing; phases must be completed in order to keep a project on schedule',
          'The team should have collected the feedback in writing before acting on it',
          'Phases are commonly used stages, not one-way gates, and iteration builds the return trip into the process',
          'The feedback came from fair visitors rather than the intended users, so it does not apply',
        ],
        correct: 'C',
        why: {
          A: 'This is the misreading the scenario is built on. A phase label cannot veto a revision the process definition requires.',
          B: 'They did log every comment. Collecting feedback and then discarding it is exactly the failure.',
          C: 'Revisiting earlier phases is part of what iteration means, so "we are past design" misreads the process model itself.',
          D: 'These were the first real users. Their confusion is a requirements discovery, not a sampling error.',
        },
      },
      {
        ek: 'CRD-2.G.5',
        keyCite: 'not all programming environments support comments, so OTHER methods of documentation may be required',
        stem: 'Scenario 4: a student in a block-based environment with no comment feature keeps no documentation at all, calling it "not possible in this language." Rule on the excuse.',
        options: [
          'Correct: documentation requires comment support, so none is expected here',
          'Incorrect: when an environment does not support comments, other methods of documentation may be required',
          'Correct, provided the student explains the program verbally at submission',
          'Incorrect, but only because the Create Performance Task has its own separate requirement',
        ],
        correct: 'B',
        why: {
          A: 'The CED anticipates exactly this environment and answers it directly. No comment support never becomes no documentation needed.',
          B: 'A written design log describing each procedure\'s function and history is the other method the CED calls for.',
          C: 'A verbal explanation is not a written description of function and development, and it does not persist.',
          D: 'The Create PT requirement exists, but the documentation rule stands on its own regardless of the task.',
        },
      },
    ],
  },
};
