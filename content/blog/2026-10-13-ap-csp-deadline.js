'use strict';
// Weekly course post: AP CSP. This post owns the SUBMISSION DEADLINE angle on
// the Create performance task: the verified current-year date, and concretely
// how students miss it or scrape in with a weak submission under pressure.
// It is not about the format change itself (that is
// 2026-08-18-ap-csp-create-task-change.js) and not about which two code
// segments to choose for the Personalized Project Reference (that is
// 2026-09-15-ap-csp-project-reference.js) and not about AI attribution rules
// (that is 2026-09-08-ap-csp-ai-policy-deep-dive.js). This post links to all
// three rather than repeating them, and focuses on the calendar itself: the
// procrastination, the submission mechanics students underestimate, the
// technical failure points, and a backward-planned timeline.
const H = require('../../lib/blog-house');

const SRC = {
  deadline: { source: 'College Board, Submit AP Computer Science Principles Work in the AP Digital Portfolio', url: 'https://apstudents.collegeboard.org/digital-portfolios/submit-ap-csp-work', asOf: 'August 2026' },
  examDate: { source: 'College Board, AP Computer Science Principles Exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'August 2026' },
  access: { source: 'College Board, What is the last day for students to access the AP Digital Portfolio?', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/faq/portfolio-access-deadline-students', asOf: 'August 2026' },
  review: { source: 'College Board, Reviewing Student Work and Progress', url: 'https://apcentral.collegeboard.org/series/art-and-design-submission-guide-ap-teachers/reviewing-student-work-progress', asOf: 'August 2026' },
  videoGuide: { source: 'College Board, AP Digital Portfolio Student User Guide for AP Computer Science Principles', url: 'https://apcentral.collegeboard.org/pdf/digital-portfolio-student-user-guide-ap-csp.pdf', asOf: 'August 2026' },
};

const SECTIONS = [
  'The Real AP CSP Deadline, and Why the Date Moves Every Year',
  'How Students Actually Miss the AP CSP Deadline',
  'Why "Project Done" Is Not the Same as "Submitted"',
  'The Technical Problems That Eat Your Last Week',
  'Your Teacher\'s Deadline Is Not the Real One, and That Is a Good Thing',
  'A Backward-Planned Timeline That Leaves Buffer Days',
];

const meta = {
  title: 'The AP CSP Deadline: How Students Miss the April Project Reference Window',
  handle: 'ap-csp-project-reference-deadline-how-students-miss-it',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp deadline',
  publishOn: '2026-10-13',
  seoTitle: 'AP CSP Deadline: How Students Miss the Window',
  seoDescription: 'The AP CSP deadline is not one date but three. Here is the verified current submission window and exactly how prepared students still miss it.',
  summary: 'The AP CSP Create performance task deadline gets missed less by students who never finish their project and more by students who finish it late, then discover the submission itself, uploading files, drafting written material, and clicking submit as final, takes real time they no longer have. This guide verifies the current Digital Portfolio deadline, walks through the specific ways students lose points to the calendar rather than the content, and lays out a backward-planned timeline with buffer days built in.',
  tags: ['AP CSP', 'Create Performance Task', 'Personalized Project Reference', 'Deadlines', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The AP CSP deadline is not a mystery. It is published, it does not move once the exam calendar is set, and every teacher has said it out loud in class at least once. Students still miss it, or scrape past it with a weak submission, and almost never because they misread the date. Here is the actual date verified for the current cycle, and the specific, boring, avoidable ways students run out of time anyway.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you searched for the AP CSP deadline, you probably already know it lands somewhere near the end of April. That much is common knowledge among CSP students by February. What is far less common is knowing what the deadline actually requires you to have finished by that date, which is not the same thing as having a working program. This guide covers both: the verified date for the current cycle, and the part nobody warns you about, which is that finishing your project and finishing your submission are two separate jobs with two separate timelines.'),

  H.h2(SECTIONS[0]),
  H.p(`Students must submit all three required components of the Create performance task, meaning the program, the video, and the Personalized Project Reference, as final in the AP Digital Portfolio no later than ${H.stat('April 30, 2026, 11:59 p.m. ET', SRC.deadline)} for the current exam cycle. College Board also publishes its own recommended cutoff well ahead of that hard deadline, suggesting students aim to submit by ${H.stat('Friday, April 24, 2026', SRC.deadline)} specifically to leave room for a bad internet night or a crashed laptop.`),
  H.p(`Notice that this is deliberately not a fixed calendar date you can memorize once and reuse every year. The submission window is set against the exam administration for that specific cycle, and the AP Computer Science Principles exam itself falls on ${H.stat('May 14, 2026', SRC.examDate)}, roughly two weeks after the portfolio closes. Historically the Create task deadline has landed in the last week of April in most cycles, but the exact day and the exact hour shift slightly year to year along with the rest of the AP calendar. Do not carry last year's date in your head, and do not trust a study guide, a forum post, or a friend's older sibling who took the exam two years ago. Confirm the current date on College Board's own portfolio page or with your teacher, every single year.`),
  H.p('One more detail worth stating plainly, because it surprises students every spring: there is no late submission mechanism.'),
  H.sourceNote(SRC.access.source, SRC.access.url, SRC.access.asOf),
  H.p('Once the window closes, a component that has not been submitted as final does not get partial credit, does not get graded on what exists, and does not get a makeup date. It simply is not scored. That is the stake behind everything in the rest of this guide.'),

  H.h2(SECTIONS[1]),
  H.p('Talk to any AP CSP teacher about who actually misses the deadline and you will hear a consistent pattern. It is almost never a student who never wrote any code. It is a student who wrote most of a working program, genuinely intended to finish on time, and then lost the race to the calendar in one of a few predictable ways.'),
  H.h3('Procrastinating the project itself until the deadline is close'),
  H.p('This is the obvious one, and it still catches students every year because the Create task does not feel urgent in September or October. It has no weekly grade attached the way a quiz does, the deadline is months away, and other classes have due dates this week. By the time the deadline starts to feel real, usually sometime in March, there is far less runway left than there was in September, and everything downstream, including the parts covered below, now has to happen inside a shrinking window instead of a comfortable one.'),
  H.h3('Not realizing the submission itself takes real time'),
  H.p('This is the mistake that catches students who did not procrastinate on the coding. Finishing your program is a milestone, not the finish line. Between a working program and a submitted Create task sits recording a compliant video, capturing and formatting two Personalized Project Reference screenshots, writing the short program purpose statement that accompanies the video, and working through the Digital Portfolio\'s upload and attestation flow for three separate components. Students who treat "the code works" as "I am basically done" routinely discover on the last weekend that the remaining steps eat an entire evening they had not budgeted, because they had never actually walked through the upload process before.'),
  H.h3('Technical submission problems that show up only at the very end'),
  H.p('Covered in full in the next section, but the short version is that the Digital Portfolio has specific format and size requirements, and the failure mode is not a clean error message days in advance. It is a rejected upload at 11 p.m. on deadline night.'),
  H.h3('Assuming a draft is the same as a submission'),
  H.p('The Digital Portfolio lets you upload work well before you are finished, which is a genuinely useful feature for saving progress. It is also the source of a specific, costly misunderstanding: uploading a file is not the same action as submitting it as final. A student can have every component sitting in the portal, fully uploaded, and still receive a score of nothing if the final "submit as final" step and its accompanying attestation were never completed.'),
  H.box('warn', 'The mistake that costs the most', '<p>Believing you are done because you can see your files in the portal. Uploaded and submitted as final are two different states in the AP Digital Portfolio, and only the second one sends your work to be scored. Confirm the submitted status explicitly for all three components, not just the presence of the files.</p>'),
  H.h3('Missing a teacher deadline that arrives before the real one'),
  H.p('Covered in its own section below, because it deserves more than a bullet point: most students who think they missed the AP CSP deadline actually missed their own teacher\'s internal deadline, weeks earlier, and only found out when it was too late to fix quietly.'),

  H.h2(SECTIONS[2]),
  H.p('It is worth walking through what "submitting" actually means in the Digital Portfolio, because the phrase hides several distinct steps that each take real, separate time.'),
  H.p('First, each of the three components, the program with its supporting files, the video, and the Personalized Project Reference, has to be captured in a format the portal will accept and uploaded individually. Second, each component carries its own attestation, a statement you affirmatively check confirming the work is your own and any outside assistance is attributed, which means you cannot batch through the process on autopilot; you are reading and confirming a real statement three separate times. Third, and this is the step students skip past mentally, every component has to be explicitly submitted as final. Uploading gets a file into the system. Submitting as final is a separate, deliberate action that locks the component in for scoring, and it is the only action that matters for your score.'),
  H.p('None of that is difficult work. All of it takes time you have to actually schedule, and none of it can happen the moment you finish debugging your program at 10 p.m. the night before the deadline, because by then you are also trying to record a video for the first time, choose your two reference screenshots for the first time, and learn the upload interface for the first time, all at once, under a deadline that does not extend.'),
  H.p('If your project is already built and you are choosing which two code segments belong in your Personalized Project Reference, our <a href="/blogs/ap-csp/ap-csp-personalized-project-reference-segments">guide to choosing your two segments</a> walks through the selection criteria so that decision does not become one more thing eating your last week. And if any part of your program leaned on a generative AI tool along the way, attribute it before you attest, not while you are attesting; our <a href="/blogs/ap-csp/ap-csp-ai-policy-create-task-nuance">guide to the AP CSP AI policy</a> covers exactly what has to be documented and how.'),

  H.h2(SECTIONS[3]),
  H.p(`The video component has specific, checkable requirements, and they are exactly the kind of detail that gets skipped when a student is rushing. The video must show the program actually running, including at least one instance of user input, the program's internal processing, and the resulting output, and it has to fit inside strict limits: ${H.stat('60 seconds', SRC.videoGuide)} or less, under ${H.stat('30MB', SRC.videoGuide)} in file size, saved in one of a short list of accepted formats.`),
  H.sourceNote(SRC.videoGuide.source, SRC.videoGuide.url, SRC.videoGuide.asOf),
  H.p('A video that runs long, exceeds the size limit, or gets saved in a format the portal does not recognize will not upload cleanly, and if that discovery happens for the first time on deadline night, there is no time left to re-record, re-export, or re-compress. The fix is simple and has nothing to do with your programming ability: record and upload your video weeks before the deadline, confirm it actually accepts and plays back inside the portal, and treat that confirmation as a real milestone rather than an assumption.'),
  H.box('tip', 'Test the upload before you need it to work', '<p>The single highest-leverage thing you can do to avoid a technical scare is to upload a placeholder or an early draft of each component the first week it is possible to do so, purely to confirm the format and size requirements on your actual files. Finding out your video export settings are wrong in week two costs you nothing. Finding out on deadline night costs you the component.</p>'),
  H.p('The same logic applies to your program files and your Personalized Project Reference captures. Screenshots saved at the wrong resolution, code exported in a format the portal rejects, or a file that is simply too large are all fixable problems with two weeks of runway and unfixable problems with two hours of runway.'),

  H.h2(SECTIONS[4]),
  H.p('Almost every AP CSP teacher sets an internal classroom deadline that lands before the official College Board date, sometimes by a week, sometimes by two or three, and this is not bureaucratic caution for its own sake.'),
  H.sourceNote(SRC.review.source, SRC.review.url, SRC.review.asOf),
  H.p('A teacher managing thirty or more students cannot review every program, every video, and every Personalized Project Reference for obvious problems, like an unattributed code segment, a video that never actually shows program output, or a reference screenshot that does not clearly show list processing, in the final forty eight hours before the official deadline closes. Building in review time means setting their own deadline earlier, and it means a student who hits that earlier date with something incomplete is treated very differently than a student who discovers the same gap at 11 p.m. on April 30 with no one left to ask.'),
  H.p('Students who think they missed the AP CSP deadline have, more often than not, actually missed their teacher\'s internal deadline weeks earlier, quietly assumed the official date was the only one that mattered, and lost the review window that would have caught a fixable problem while it was still fixable. Treat your teacher\'s deadline as the real one. The official College Board date is the deadline for the version of your work that already survived review.'),

  H.h2(SECTIONS[5]),
  H.p('The specific dates below are built backward from this cycle\'s verified deadline. Adjust the exact calendar days to your own class calendar and, every year, to that year\'s confirmed date, but keep the spacing: each stage needs real days between it and the next, not the same weekend.'),
  H.table(
    ['Milestone', 'Target', 'Why the buffer matters'],
    [
      ['Program functionally complete: list processing and your chosen procedure both working and testable', 'About four weeks before the deadline', 'You cannot choose strong Personalized Project Reference segments from code that is still changing. Lock the logic first.'],
      ['Two Personalized Project Reference segments chosen, captured, and saved in an accepted format', 'About three weeks before the deadline', 'Screenshot choice is a real decision, not a formality, and retaking captures under pressure produces worse choices.'],
      ['Video recorded, checked against the format, length, and size limits, and uploaded once as a test', 'About two weeks before the deadline', 'This is the step most likely to hide a technical surprise. Finding it here still leaves time to fix it.'],
      ['All three components uploaded and attestations reviewed, though not yet submitted as final', 'About one week before the deadline', 'Separates "the files are in the portal" from "the work is submitted," and gives you a full week to catch anything wrong before it is locked in.'],
      ['Submitted as final on every component, confirmation visible in the portal', 'By your teacher\'s internal deadline, several days before the official date', 'This is the actual finish line. A file sitting uploaded but not finalized is not a submission, no matter how close to done it looks.'],
    ]
  ),
  H.box('key', 'If you are reading this already behind', '<p>Stop trying to perfect the code and start protecting the calendar. A finished, honestly attributed program with an average Personalized Project Reference, submitted as final three days early, beats an ambitious program still being polished the night the portal closes. Talk to your teacher now, not on the deadline. Most of the damage in a late scramble comes from silence, not from being behind.</p>'),
  H.p('The pattern across every section above is the same one. The AP CSP deadline rarely catches a student who has no program. It catches a student whose program was fine and whose calendar for finishing everything around the program was not. Build the calendar first.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the actual AP CSP deadline this year?', a: 'For the current exam cycle, students must submit all three Create performance task components as final in the AP Digital Portfolio by April 30, 2026, at 11:59 p.m. ET. College Board recommends aiming for Friday, April 24, 2026 instead, to leave a buffer against last minute technical problems. Always confirm the exact date on College Board\'s own portfolio page each year, since it shifts slightly with the exam calendar.' },
    { q: 'Can I submit the AP CSP Create task late if something goes wrong?', a: 'No. There is no late submission mechanism in the AP Digital Portfolio for the Create performance task. A component that is not submitted as final by the deadline is not scored, regardless of how complete it was or what caused the delay.' },
    { q: 'Is uploading my files to the Digital Portfolio the same as submitting them?', a: 'No, and this is one of the most common ways students miss the deadline without realizing it. Uploading places your files in the portal. Submitting as final is a separate, deliberate step, done individually for each of the three components, and only that step sends your work to be scored.' },
    { q: 'Why does my teacher\'s deadline come before the official College Board deadline?', a: 'Teachers build in review time so they can check for obvious, fixable problems, like a missing attribution comment or a video that does not actually show program output, while there is still time to fix them. Treat your teacher\'s deadline as the one that actually matters, since the official date is meant for work that already passed that review.' },
    { q: 'What are the format and length requirements for the AP CSP Create task video?', a: 'The video must show the program running with at least one instance of user input, its internal processing, and the resulting output, and it must be 60 seconds or less and under 30MB, saved in an accepted video format. Testing your export against these limits weeks before the deadline avoids discovering a format problem the night submissions close.' },
  ]),

  H.cta({
    heading: 'Do not let the calendar cost you the score',
    body: 'Read the full format change guide for what the deadline actually requires, then work through segment selection and AI attribution before you are racing the clock.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-create-performance-task-what-changed', text: 'Create task format change guide' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Deadline and submission details verified against College Board\'s current AP Digital Portfolio guidance for the current exam cycle. Confirm the exact date annually, since it shifts with the AP exam calendar. Last reviewed August 2026.'),
]);

module.exports = { meta, body };
