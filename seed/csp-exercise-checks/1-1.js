'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GRADED CHECKS: Topic 1.1, Collaboration.  PILOT.
//
//  WHAT THESE ARE, AND WHAT THEY ARE NOT
//  The handout's own items are constructed response and are mirrored verbatim
//  on the page. They cannot be auto-graded and are not scored: the student
//  writes them locally and they never leave the browser.
//
//  These MCQs are the auto-graded half. Each one is DERIVED from a specific
//  sentence in the teacher answer KEY, and that sentence is quoted in `keyCite`
//  so the claim is checkable rather than trusted. scripts/... verifies every
//  keyCite actually appears in the KEY document it names, so an invented
//  "correct" answer fails the build instead of reaching a student.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  'ap-csp-topic-1-1-exercise-1': {
    keyDoc: 'AP-CSP_1-1_Exercise1_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-1.A.3 / CRD-1.A.4',
        keyCite: 'they still share the same blind spots, so the bias that locked out students without data plans survives intact',
        stem: 'A classmate says CampusNight would have succeeded with four stronger programmers from the same coding club. What does the CED say four stronger copies of the same perspective still fail to produce?',
        options: [
          'A program with fewer syntax errors',
          'An innovation reflecting diverse perspectives, so the same blind spots and the same bias survive',
          'A faster launch schedule',
          'A larger number of features',
        ],
        correct: 'B',
        why: {
          A: 'Code quality was never the failure. The app worked; it excluded people.',
          B: 'Effective collaboration produces an innovation reflecting the diversity of talents and perspectives of its designers. More skill in one perspective leaves the blind spot, and the bias, exactly where it was.',
          C: 'Schedule is not what the CED ties to collaboration quality here.',
          D: 'Feature count does not address who the product excluded.',
        },
      },
      {
        ek: 'CRD-1.A.6',
        keyCite: 'Gather information from POTENTIAL users, not just current fans',
        stem: 'For CampusNight 2.0, whom does the CED say the team should gather information from?',
        options: [
          'Only the students who used version 1 most',
          'Potential users, including the students version 1 locked out',
          'Only the four developers, working faster',
          'Only the teachers who approve school events',
        ],
        correct: 'B',
        why: {
          A: 'Surveying the people the app already served reproduces the original blind spot.',
          B: 'The CED asks for information from potential users, which is precisely the group version 1 designed around and excluded.',
          C: 'The team asking itself again is what caused the failure.',
          D: 'Staff are one useful group, but limiting it to them repeats the mistake of consulting a narrow slice.',
        },
      },
      {
        ek: 'CRD-1.A.5',
        keyCite: 'consultation and communication with users are important aspects of DEVELOPMENT',
        stem: 'When should that user consultation happen?',
        options: [
          'Once, as a survey before any code is written',
          'Once, as a review after the app ships',
          'Throughout development, from before design through prototype feedback',
          'Only if testers report a problem',
        ],
        correct: 'C',
        why: {
          A: 'A single survey at the start is better than none, and it still misses everything learned once a prototype exists.',
          B: 'Consulting after shipping is how version 1 found out, at the users\' expense.',
          C: 'The CED treats consultation and communication as aspects of development itself, which means recurring check-ins rather than one event.',
          D: 'Waiting for a complaint makes the excluded user the bug report.',
        },
      },
      {
        ek: 'CRD-1.A.6',
        keyCite: 'the information is used to understand the purpose of the program from diverse perspectives and to develop a program that fully incorporates those perspectives',
        stem: 'What does the CED say the information gathered from users is actually used FOR?',
        options: [
          'To market the program to a wider audience',
          'To understand the program\'s purpose from diverse perspectives and build a program that incorporates them',
          'To decide which programming language to use',
          'To estimate how long development will take',
        ],
        correct: 'B',
        why: {
          A: 'Marketing uses audience research too, but that is not the development purpose the CED names.',
          B: 'The information shapes what gets built: it reveals the purpose from perspectives the team does not hold, and the program is meant to incorporate them.',
          C: 'Language choice is an implementation decision, unrelated to user consultation.',
          D: 'Scheduling is not what the CED ties this information to.',
        },
      },
      {
        ek: 'CRD-1.B.1',
        keyCite: 'an online tool that lets programmers SHARE (the proposed change is posted publicly for anyone to inspect) and PROVIDE FEEDBACK',
        stem: 'A pull request satisfies the CED\'s description of what online collaboration tools do because it supports which two things?',
        options: [
          'Compiling and testing',
          'Sharing work and providing feedback on it',
          'Version numbering and release dates',
          'Writing documentation and comments',
        ],
        correct: 'B',
        why: {
          A: 'Continuous integration may run alongside a pull request, but that is not the pairing the CED names.',
          B: 'The CED describes online tools as supporting collaboration by letting programmers share AND provide feedback on ideas and documents. A pull request is both: the change is posted, and reviewers comment on it before anything merges.',
          C: 'Release bookkeeping is not collaboration in the sense the CED describes.',
          D: 'Documentation matters and is a separate idea from the share-and-feedback pairing.',
        },
      },
    ],
  },

  'ap-csp-topic-1-1-exercise-2': {
    keyDoc: 'AP-CSP_1-1_Exercise2_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-1.A.4 / CRD-1.A.5',
        keyCite: 'every developer shares one perspective (same friend group, same athletic background, same hardware), and nobody outside that circle was consulted',
        stem: 'Case 1: four seniors from one friend group, all athletes with new phones, build a school fitness app and skip interviews because "we ARE the users." Which principle is at risk?',
        options: [
          'The team needs a faster version-control workflow',
          'Bias, from a team with one shared perspective and no outside consultation',
          'The team is using pair programming incorrectly',
          'The team needs a written project schedule',
        ],
        correct: 'B',
        why: {
          A: 'Nothing in this case describes a file-sharing or versioning problem.',
          B: 'One shared perspective plus nobody consulted outside it are the two warning signs the CED gives for bias entering an innovation. "We ARE the users" is the giveaway.',
          C: 'No pair programming appears in this case at all.',
          D: 'Scheduling is not what produced an app that excluded non-athletes.',
        },
      },
      {
        ek: 'CRD-1.A.2',
        keyCite: 'the fitness-challenge app is nonphysical computing software',
        stem: 'Case 1: how is the fitness-challenge app classified?',
        options: [
          'A physical computing innovation',
          'Nonphysical computing software',
          'A nonphysical computing concept',
          'Not a computing innovation at all',
        ],
        correct: 'B',
        why: {
          A: 'Physical innovations are hardware whose function depends on an integral program, like a self-driving car.',
          B: 'The app IS the program, which is what the CED means by nonphysical computing software.',
          C: 'A concept is an idea that exists because programs enable it, like e-commerce. This is the software itself.',
          D: 'A program is an integral part of its function, so it passes the test.',
        },
      },
      {
        ek: 'CRD-1.B.2',
        keyCite: 'the navigator actively reviews and questions every line, and the roles ROTATE on a fixed schedule',
        stem: 'Case 2: the stronger coder always drives while the partner watches in silence, privately spotting bugs. What is the prescription?',
        options: [
          'Split the work so each student codes alone',
          'Restore the model: the navigator actively reviews and questions each line, and the roles rotate',
          'Have the stronger coder work faster to cover both roles',
          'Move the pair onto separate machines',
        ],
        correct: 'B',
        why: {
          A: 'Working alone abandons pair programming rather than repairing it.',
          B: 'Pair programming needs an active navigator reviewing in real time, with rotation so both perspectives shape the code. A silent watcher is not a navigator.',
          C: 'One person cannot be both driver and reviewer; that is solo programming with an audience.',
          D: 'Separate machines removes the shared review the model depends on.',
        },
      },
      {
        ek: 'CRD-1.B.1 / CRD-1.A.2',
        keyCite: 'the sensor kit is a PHYSICAL computing innovation',
        stem: 'Case 3: six students across three schools mail a USB drive back and forth to build a soil-moisture probe that texts volunteers. What is the fix, and what type of innovation is it?',
        options: [
          'Meet more often in person; nonphysical software',
          'Online tools that let the team share and give feedback continuously; a physical computing innovation',
          'A stricter deadline; a nonphysical concept',
          'One member owning all the code; nonphysical software',
        ],
        correct: 'B',
        why: {
          A: 'More meetings does not solve the between-meetings bottleneck, and the probe is hardware.',
          B: 'One "real version" on a drive serializes the work and blocks feedback entirely. Online tools exist to allow sharing AND feedback continuously. The probe is hardware whose function depends on an integral program, so it is physical.',
          C: 'A deadline does not restore anyone\'s ability to contribute between meetings.',
          D: 'Concentrating ownership makes the bottleneck permanent.',
        },
      },
      {
        ek: 'CRD-1.C.1',
        keyCite: 'Most-needed interpersonal skill, if only one can be chosen: consensus building',
        stem: 'Case 4: a team is deadlocked 3-2 on credit rules and the majority plans to outvote the minority. Which single interpersonal skill does the team most need?',
        options: [
          'Communication',
          'Consensus building',
          'Time management',
          'Technical documentation',
        ],
        correct: 'B',
        why: {
          A: 'Communication is genuinely damaged here too, but the specific failure is settling a deadlock by force instead of agreement.',
          B: 'Outvoting ends the argument without resolving the disagreement, and the outvoted perspectives leave the product. Consensus building is what finds the shared goal both proposals serve.',
          C: 'Time management is not among the interpersonal skills the CED names.',
          D: 'Documentation is not an interpersonal skill in this list.',
        },
      },
    ],
  },
};
