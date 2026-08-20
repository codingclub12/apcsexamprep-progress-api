'use strict';
// Weekly course post: AP CSP. Logistics piece, not format. The exam format
// post (2026-08-25-ap-csp-exam-format.js) already covers section structure
// and Big Idea weighting, so this post deliberately stays out of that lane:
// what a student physically brings, what is handed to them, what gets a
// device confiscated, and the one misconception worth killing directly,
// which is that exam day involves defending the Create project out loud.
// It does not. The project and the Personalized Project Reference are both
// long since submitted by exam day.
const H = require('../../lib/blog-house');

const SRC = {
  bring: { source: 'College Board, What to Bring on AP Exam Day', url: 'https://apstudents.collegeboard.org/exam-policies-guidelines/what-to-bring-on-exam-day', asOf: 'October 2026' },
  digitalModes: { source: 'College Board, How Are AP Exams Administered', url: 'https://apstudents.collegeboard.org/ap-exams-what-to-know/digital-testing-exam-modes', asOf: 'October 2026' },
  bluebook: { source: 'College Board, AP Exams: Bluebook for Students', url: 'https://bluebook.collegeboard.org/students/ap-exams', asOf: 'October 2026' },
  ppr: { source: 'College Board, Providing the PPR to AP CSP Exam Takers', url: 'https://apcentral.collegeboard.org/help-center/providing-ppr-to-ap-csp-exam-takers', asOf: 'October 2026' },
  deadline: { source: 'College Board, Submit AP Computer Science Principles Work in the AP Digital Portfolio', url: 'https://apstudents.collegeboard.org/digital-portfolios/submit-ap-csp-work', asOf: 'October 2026' },
  examPage: { source: 'College Board, AP Computer Science Principles Exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'October 2026' },
  assessment: { source: 'College Board, AP Computer Science Principles Assessment', url: 'https://apstudents.collegeboard.org/courses/ap-computer-science-principles/assessment', asOf: 'October 2026' },
};

const SECTIONS = [
  'AP CSP exam day: what changes now that your project is already submitted',
  'What to bring to the AP CSP exam',
  'What Bluebook, your school, and the proctor provide',
  'What is prohibited on AP CSP exam day',
  'Exam day is not a project defense',
  'Your night before and morning of checklist',
];

const meta = {
  title: 'AP CSP Exam Day: What You Bring and What You Are Given',
  handle: 'ap-csp-exam-day-what-to-bring',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp exam day',
  publishOn: '2026-10-27',
  seoTitle: 'AP CSP Exam Day: What to Bring and What Is Given',
  seoDescription: 'A verified AP CSP exam day checklist: photo ID rules, the Bluebook device policy, what is prohibited, and why exam day is not a project defense.',
  summary: 'What an AP CSP student actually needs on exam day: the photo ID rule, the Bluebook device and connectivity policy, what the school and proctor provide including the printed Personalized Project Reference, the full list of prohibited items, and a plain answer to the most common exam day misconception, that there is no live defense of the Create project. Closes with a night before and morning of checklist.',
  tags: ['AP CSP', 'Exam Day', 'Bluebook', 'Exam Logistics', 'Personalized Project Reference'],
  allowedInlineNumbers: ['180 minutes', '120 minutes', '60 minutes'],
};

const body = H.article([
  H.dek('AP CSP exam day itself is simpler than most students expect, precisely because the hardest part is already behind you. Your Create performance task and your Personalized Project Reference were submitted weeks earlier, so the only thing happening in the testing room is two Bluebook sections. Here is exactly what you bring, what your school and College Board provide, what gets a device confiscated, and a checklist for the night before and the morning of.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 27, 2026', updated: 'October 27, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you want the section by section breakdown of how AP CSP is scored, timed, and weighted across the five Big Ideas, read our <a href="/blogs/ap-csp/ap-csp-exam-format-every-section">full exam format guide</a> first. This post does not repeat that content. It answers a narrower, more urgent question: on the actual morning of the exam, what do you carry into the room, what is waiting for you when you get there, and what will get you sent home with a canceled score if you bring it by accident.'),

  H.h2(SECTIONS[0]),
  H.p('AP CSP exam day works differently from a lot of other AP exams because the biggest deliverable of the course, the Create performance task, is not part of it. You already finished that. Your program, your video, and your Personalized Project Reference, the two annotated code segments you chose yourself, were all submitted as final in the AP Digital Portfolio weeks before the exam date. Our <a href="/blogs/ap-csp/ap-csp-project-reference-deadline-how-students-miss-it">deadline guide</a> covers that submission window in detail, including the date colleges and CSP teachers actually treat as the real cutoff.'),
  H.p(`What is left for exam day is the end of course exam, administered entirely inside the Bluebook testing app: a multiple choice section and a written response section, taken back to back in one sitting of ${H.stat('180 minutes', SRC.examPage)}. Nothing about the Create task recurs on exam day. Nobody asks you to run your program, explain your code out loud, or defend a design decision to a human. The written response section asks you to answer specific prompts about your own already submitted code, in writing, inside Bluebook, using a printed reference sheet handed to you at your seat.`),
  H.box('key', 'The one sentence version', '<p>By exam day, your project work is finished and graded material. What remains is a timed, digital, written exam about that project, not a demonstration of it.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Start with identification, because it is the item students most often assume they do not need. A photo ID is not automatically required for every AP test taker.'),
  H.p(H.stat('A government issued or school issued photo ID is required only if you are testing at a school you do not normally attend, for example a home schooled student testing at a local public school', SRC.bring)),
  H.p('If you are sitting for the exam at your own school, check with your AP coordinator about that school\'s specific policy rather than assuming either way. Coordinators are allowed to require ID more broadly than College Board\'s minimum, and plenty do.'),
  H.p('Beyond identification, what you bring depends heavily on whether you are using a school managed device or your own.'),
  H.ul([
    'Your College Board account sign in information, since you will need it to access your exam inside Bluebook.',
    'A fully charged personal laptop, Chromebook, or iPad if your school is not providing a testing device for you, plus the charging cord and adapter that actually fits it, not a similar looking one you found in a drawer.',
    'Sharpened pencils or a pen for taking notes on school provided scratch paper, since a digital exam still allows scratch work on paper.',
    'Up to two approved calculators only if your specific exam allows them. AP CSP does not require a calculator, so this line does not apply to most CSP students, but double check with your coordinator if your class integrated one into coursework.',
    'A watch is fine only if it is a plain analog or basic digital watch with no smart features, no internet connection, and no ability to store or receive data.',
  ]),
  H.p(H.stat('For digital AP Exams you need a fully charged testing device with Bluebook already installed, unless your school is providing one for you, along with a compatible charging cord or AC adapter', SRC.bring)),
  H.p('Bring less rather than more. A backpack full of unrelated electronics is a backpack a proctor has to inspect, and that inspection eats into time you would rather spend settling in.'),

  H.h2(SECTIONS[2]),
  H.p('AP CSP is a fully digital, end of course exam, which shifts a meaningful share of the logistics from you to your school and to Bluebook itself.'),
  H.p(H.stat('The AP CSP end of course exam runs entirely in the Bluebook testing app, and it includes both the multiple choice questions and the two written response questions', SRC.assessment)),
  H.p('That single fact answers a question a lot of students ask about the written response section specifically: no, you are not handed a paper free response booklet to write in. You type your answers directly into Bluebook, on whatever device you are using, during the timed written response block.'),
  H.p('What is provided rather than typed is the reference material your written responses depend on.'),
  H.p(H.stat('Your Personalized Project Reference, the printed version of the two code segments you submitted, is printed from the AP Digital Portfolio by your AP coordinator and provided to the proctor along with your other exam materials, so it is on your desk when the written response section begins', SRC.ppr)),
  H.p('That detail matters because it means you never need to remember, recreate, or bring your own copy of your PPR. If you submitted it correctly and on time, it is waiting for you. If you did not submit it, or missed the deadline, there is nothing to hand you, and no version of exam day fixes that gap after the fact.'),
  H.box('tip', 'A connectivity detail worth knowing in advance', '<p>' + H.stat('You only need an active internet connection at the start and the end of the exam. If your connection drops in the middle of testing, you can keep working without losing your place, and Bluebook syncs once the connection returns', SRC.digitalModes) + ' A brief wifi hiccup mid exam is not the crisis it would have been on an older, fully connected system, so do not panic if a proctor announces a network blip.</p>'),
  H.p('School managed devices arrive with Bluebook preinstalled and configured, and most coordinators run a full technology check with students in the days before the exam specifically to catch problems while there is still time to fix them. If your school offered that check and you skipped it, go find your coordinator this week rather than exam morning.'),

  H.h2(SECTIONS[3]),
  H.p('The prohibited items list exists because a rule that only some students follow is not a fair rule, so College Board enforces it with real consequences rather than a warning.'),
  H.p(H.stat('A student found with a prohibited item during testing or during a break can be dismissed from the exam, have the device confiscated, and have their score canceled, with no retest permitted', SRC.bring)),
  H.p('The categories that trip students up most are the ones that feel like accessories rather than electronics.'),
  H.ul([
    'Phones and any other mobile device. Smartphones must be powered off and stored outside the testing room entirely, not just silenced in a bag under the desk.',
    'Smartwatches and fitness trackers of any kind, including an Apple Watch, Fitbit, or Garmin. This is a frequent, honest mistake, since a lot of students simply forget they are wearing one.',
    'Any other wearable technology, smart glasses included, and any unauthorized Bluetooth device.',
    'Unauthorized reference material: notes, textbooks, highlighters, or any printed material that is not the specific reference College Board or your coordinator provided for the exam itself.',
    'Electronic writing instruments, including a stylus, an Apple Pencil, or a smart pen, even when they are used with an approved testing device.',
    'Cameras, recording devices, separate timers, and anything else that can capture, transmit, or receive information.',
    'Head coverings that are not worn for a documented religious or medical reason, since a proctor needs a clear view of your face and ears throughout testing.',
  ]),
  H.p('Notice how many of those are things people wear without thinking about them, a smartwatch above all. Take it off before you leave the house, not when a proctor points at your wrist.'),

  H.h2(SECTIONS[4]),
  H.p('This is the misconception worth addressing head on, because it causes real, avoidable anxiety in the weeks before the exam: AP CSP exam day is not a defense of your project.'),
  H.p('Some students picture a moment where they sit across from an examiner, open their code, and explain their design choices out loud while being questioned about it, the way a thesis defense or a coding interview might work. That moment does not exist anywhere in the AP CSP exam. It never has.'),
  H.box('warn', 'Where this idea comes from, and why it is wrong', '<p>The confusion is understandable: your Create task genuinely does get evaluated against your own code, and the written response section genuinely does ask you specific questions about it. But that evaluation is written, silent, and already scoped to prompts College Board wrote in advance. Nobody sees your screen live. Nobody asks a follow up question. Nobody is in the room judging your code choices in real time.</p>'),
  H.p('What actually happens is this. Your Create performance task, meaning your program, your video, and your Personalized Project Reference, was scored as a submitted artifact well before exam day, using the same rubric every other student\'s submission is scored against. Separately, during the written response section on exam day, you answer written prompts about the two code segments in your PPR, using the printed copy sitting on your desk. You type your answers. You do not present, narrate, or defend anything to anyone. When the written response block ends, your involvement with the Create task is finished for good.'),
  H.p('Our <a href="/blogs/ap-csp/ap-csp-personalized-project-reference-segments">guide to choosing your PPR segments</a> and our <a href="/pages/ap-csp-written-response-guide">written response guide</a> cover what those prompts actually ask and how the rubric reads your answers, if you want the deeper version of this once the exam day logistics are settled.'),

  H.h2(SECTIONS[5]),
  H.p('Most exam day mistakes are not knowledge mistakes. They are logistics mistakes made the night before, when nobody double checks the boring things. Work through this list the evening before, not the morning of, so anything broken has time to get fixed.'),
  H.h3('Night before'),
  H.ol([
    'Charge your testing device fully, and pack the correct charging cord, tested and working, even if your school is providing the device.',
    'Confirm your College Board account username and password work by signing in once, rather than discovering a forgotten password at your seat.',
    'Set aside your photo ID if your coordinator requires one, even if you think you will not need it.',
    'Take off any smartwatch or fitness tracker and leave it at home rather than trusting yourself to remember to remove it later.',
    'Pack sharpened pencils or a pen for scratch paper notes, plus a bag to hold your phone if your school collects them at the door rather than having you leave them at home.',
    'Check the exam start time and your school\'s reporting time separately. Arriving when the exam starts is already late.',
  ]),
  H.h3('Morning of'),
  H.ol([
    'Eat something before you leave. A three hour combined testing block is a long stretch to sit through on an empty stomach.',
    'Leave your phone at home or hand it in wherever your coordinator collects devices, before you reach the testing room door.',
    'Bring a layer of clothing you can add or remove, since testing room temperature is outside your control.',
    'Arrive with time to spare rather than exactly on time, since seating, device checks, and ID checks all happen before the clock actually starts.',
    'Trust that your Personalized Project Reference will be on your desk for the written response section. You do not need to bring your own copy, and you cannot, since only the coordinator\'s printed copy from the Digital Portfolio counts.',
  ]),
  H.p('None of this list requires last minute studying. That is the point. Exam day performance depends on decisions you can finish the night before, which frees the morning of for the one thing that actually needs a clear head: the exam itself.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do I need a photo ID for the AP CSP exam?', a: 'Only if you are testing at a school you do not normally attend, for example as a home schooled student or a student testing outside your regular school. Check with your AP coordinator either way, since some schools require ID more broadly than College Board\'s baseline rule.' },
    { q: 'Is the AP CSP exam fully digital?', a: 'Yes. The end of course exam runs entirely inside the Bluebook testing app, including both the multiple choice section and the two written response questions. You type your written response answers directly into Bluebook rather than writing them in a paper booklet.' },
    { q: 'Will I get my Personalized Project Reference on exam day?', a: 'Yes, if you submitted it correctly and on time. Your AP coordinator prints it from the AP Digital Portfolio and provides it to the proctor along with your other exam materials, so it is on your desk when the written response section begins. There is nothing for you to print or bring yourself.' },
    { q: 'Do I have to defend my Create project on exam day?', a: 'No. This is a common misconception. Your Create performance task is scored as a submitted artifact before exam day. On exam day, you only answer written prompts about your own code in the Bluebook written response section. There is no live presentation, demonstration, or question and answer session with an examiner.' },
    { q: 'Can I bring my phone or smartwatch into the AP CSP exam?', a: 'No. Phones must be off and stored outside the testing room, and smartwatches or fitness trackers of any kind, including an Apple Watch, Fitbit, or Garmin, are prohibited even if worn passively. Being found with either during testing can result in dismissal from the exam and a canceled score.' },
    { q: 'What device do I need for the AP CSP exam?', a: 'A Mac, Windows computer, iPad, or school managed Chromebook capable of running Bluebook, either your own fully charged device with its correct charger or one your school provides. Confirm with your coordinator ahead of time which situation applies to you.' },
  ]),

  H.cta({
    heading: 'Get the format details, not just the logistics',
    body: 'Read the full section by section breakdown of how AP CSP is scored and weighted, then work through written response prompts in the current exam format.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-exam-format-every-section', text: 'AP CSP exam format guide' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Exam day logistics verified against College Board\'s current AP Exam policies and Bluebook guidance for the current exam cycle. Confirm device and ID requirements with your own AP coordinator, since some schools apply stricter local rules. Last reviewed October 27, 2026.'),
]);

module.exports = { meta, body };
