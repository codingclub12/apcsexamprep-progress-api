'use strict';
// Weekly course post: AP Cybersecurity. Exam-day LOGISTICS specifically: what
// to bring, what is provided, and the actual sitting. Deliberately distinct
// from 2026-10-27-ap-cybersecurity-practice-test.js (individual practice
// strategy) and 2026-10-20-ap-cybersecurity-teacher.js (classroom
// calibration): this post is about the physical mechanics of the room. The
// standard AP-wide rules (photo ID, Bluebook device policy, prohibited
// items) are the same rules 2026-10-27-ap-csp-exam-day.js already verified
// and cites, since those are College Board policies that apply across every
// AP exam rather than something specific to this course, so this post
// references that verification rather than re-deriving it from scratch. The
// genuinely course-specific angle is Section II: a live, in-exam Device
// Security Analysis free response built from provided artifacts (firewall
// rules, logs, a device policy), not a pre-submitted project the way AP CSP's
// Create task works, so there is no separate project defense or portfolio
// step to plan around.
//
// Verified via WebSearch against College Board's own AP Students and AP
// Central pages: Section I is 60 multiple-choice questions in 80 minutes
// (70 percent of score), Section II is one Device Security Analysis free
// response built from firewall rules, system and application logs, a file
// permissions list, and a device policy (30 percent of score, suggested 50
// minutes), and the first national administration is May 2027. The general
// AP exam-day rules (photo ID conditions, Bluebook device requirements, the
// prohibited items list) were re-checked against the same College Board
// pages the CSP exam-day post cites and match exactly, confirming they are
// College Board-wide policy rather than course-specific.
const H = require('../../lib/blog-house');

const SRC = {
  bring: { source: 'College Board, What to Bring on AP Exam Day', url: 'https://apstudents.collegeboard.org/exam-policies-guidelines/what-to-bring-on-exam-day', asOf: 'November 2026' },
  digitalModes: { source: 'College Board, How Are AP Exams Administered', url: 'https://apstudents.collegeboard.org/ap-exams-what-to-know/digital-testing-exam-modes', asOf: 'November 2026' },
  bluebook: { source: 'College Board, AP Exams: Bluebook for Students', url: 'https://bluebook.collegeboard.org/students/ap-exams', asOf: 'November 2026' },
  ced: { source: 'College Board, AP Cybersecurity Course and Exam Description', url: 'https://apcentral.collegeboard.org/media/pdf/ap-cybersecurity-course-and-exam-description.pdf', asOf: 'November 2026' },
  examPage: { source: 'College Board, AP Cybersecurity Exam Overview (AP Central)', url: 'https://apcentral.collegeboard.org/courses/ap-cybersecurity/exam', asOf: 'November 2026' },
  assessment: { source: 'College Board, AP Cybersecurity Exam (AP Students)', url: 'https://apstudents.collegeboard.org/courses/ap-cybersecurity/assessment', asOf: 'November 2026' },
};

const SECTIONS = [
  'AP Cybersecurity exam day: what the first cohort is actually walking into',
  'The standard AP rules: photo ID, Bluebook, and what stays home',
  'Section II is not a project defense: the Device Security Analysis free response',
  'You are the first cohort ever. Here is how to prepare for that honestly',
  'Your night before and morning of checklist',
];

const meta = {
  title: 'AP Cybersecurity Exam Day: What the First Cohort Should Know',
  handle: 'ap-cybersecurity-exam-day-first-cohort',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity exam day',
  publishOn: '2026-11-03',
  seoTitle: 'AP Cybersecurity Exam Day: The First Cohort Guide',
  seoDescription: 'A verified AP Cybersecurity exam day guide: photo ID, the Bluebook device policy, the in-exam Device Security Analysis FRQ, and a first cohort checklist.',
  summary: 'What an AP Cybersecurity student actually needs on exam day: the same photo ID, Bluebook device, and prohibited items rules that apply across every AP exam, the course-specific fact that Section II is a live, in-exam Device Security Analysis free response built from provided artifacts rather than a pre-submitted project, honest guidance for sitting an exam with no prior test-takers to learn from, and a night before and morning of checklist.',
  tags: ['AP Cybersecurity', 'Exam Day', 'Bluebook', 'Exam Logistics', 'First Cohort'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The first national AP Cybersecurity exam happens in May 2027, which means every student who sits it is, by definition, part of a cohort with no prior test-taker to ask. The room itself is less mysterious than that fact makes it feel. Here is the standard AP exam day machinery you already share with every other AP course, the one piece of Section II that is genuinely different about this exam, and a plain checklist for the night before and the morning of.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-exam-format-section-by-section">full exam format guide</a> covers how AP Cybersecurity is scored, timed, and weighted section by section. This post does not repeat that breakdown. It answers the narrower question you actually have the week of the exam: what do you carry into the room, what is waiting for you when you get there, and what is different about this specific course compared to the AP exam day machinery you have already heard about from friends taking other APs.'),

  H.h2(SECTIONS[0]),
  H.p('Most of AP Cybersecurity exam day is not new. It runs on the same College Board infrastructure, the same Bluebook testing app, and the same room rules that govern every other AP exam given that morning in your building. Our companion guide on <a href="/blogs/ap-csp/ap-csp-exam-day-what-to-bring">AP CSP exam day</a> already verified those shared rules in detail, and they check out exactly the same way for AP Cybersecurity, because photo ID policy, device requirements, and the prohibited items list are College Board-wide rules rather than something written separately for each course. There is no reason to re-derive them from scratch here, so the section below states them plainly and points back to that verification rather than pretending this course invented its own version of exam security.'),
  H.p('What is genuinely new, and worth planning around specifically, is Section II. Instead of a pre-submitted project you defend or explain, you will be handed a set of artifacts, firewall rules, system and application logs, a file permissions list, and a device policy, and asked to analyze them live, in the room, during the timed exam. That is the one piece of this exam day that has no analog in AP CSP, and it is covered in its own section below.'),

  H.h2(SECTIONS[1]),
  H.p('Start with identification, since it trips up more students than anything else on this list because the answer is conditional rather than a flat yes or no.'),
  H.p(H.stat('A government issued or school issued photo ID is required only if you are testing at a school you do not normally attend, for example a home schooled student testing at a local public school', SRC.bring)),
  H.p('If you are testing at your own school, check with your AP coordinator about that building\'s specific policy instead of assuming either way. A coordinator is allowed to require ID more broadly than College Board\'s minimum rule, and plenty do, so do not skip this check just because you technically qualify for the exemption.'),
  H.p('What else you bring depends heavily on whether your school is providing a testing device or you are bringing your own.'),
  H.ul([
    'Your College Board account sign in information, since Bluebook needs it to load your exam.',
    'A fully charged personal laptop, Chromebook, or iPad if your school is not providing a testing device, along with the correct charging cord and adapter, tested in advance rather than a similar looking one you grabbed on the way out the door.',
    'Sharpened pencils or a pen for scratch paper notes, since the digital exam still allows paper scratch work provided by the room.',
    'A watch is fine only if it is a plain analog or basic digital watch with no smart features, no internet connection, and no ability to store or receive data.',
    'A calculator is not part of this exam. AP Cybersecurity does not test math computation, so leave it home unless a coordinator specifically tells you otherwise for a different exam that same day.',
  ]),
  H.p(H.stat('For digital AP Exams you need a fully charged testing device with Bluebook already installed, unless your school is providing one for you, along with a compatible charging cord or AC adapter', SRC.bring)),
  H.p('Bring less rather than more. Every extra device in your bag is one more thing a proctor has to look at before you can sit down, and that inspection eats into time you would rather spend settling in before the clock starts.'),
  H.h3('What is prohibited'),
  H.p(H.stat('A student found with a prohibited item during testing or during a break can be dismissed from the exam, have the device confiscated, and have their score canceled, with no retest permitted', SRC.bring)),
  H.ul([
    'Phones and any other mobile device. A smartphone has to be powered off and stored outside the testing room, not just silenced in a bag under your desk.',
    'Smartwatches and fitness trackers of any kind, an Apple Watch, Fitbit, or Garmin included. This is a frequent, honest mistake, since plenty of students simply forget they are wearing one.',
    'Any other wearable technology, smart glasses included, and any unauthorized Bluetooth device.',
    'Unauthorized reference material: notes, textbooks, highlighters, or any printed page that is not the specific artifact set College Board or your coordinator hands you for the exam itself.',
    'Electronic writing instruments, a stylus, an Apple Pencil, or a smart pen, even when paired with an approved testing device.',
    'Cameras, recording devices, separate timers, and anything else that can capture, transmit, or receive information.',
    'Head coverings that are not worn for a documented religious or medical reason, since a proctor needs a clear view of your face and ears throughout testing.',
  ]),
  H.p('Take the smartwatch off before you leave the house, not when a proctor points at your wrist.'),
  H.h3('What Bluebook and your school provide'),
  H.p(H.stat('The AP Cybersecurity exam runs entirely in the Bluebook testing app, and it includes both the multiple-choice section and the free-response question', SRC.assessment)),
  H.p('School managed devices arrive with Bluebook preinstalled and configured, and most coordinators run a full technology check with students in the days before the exam specifically to catch problems while there is still time to fix them. If your school offered that check and you skipped it, go find your coordinator this week rather than exam morning.'),
  H.box('tip', 'A connectivity detail worth knowing in advance', '<p>' + H.stat('You only need an active internet connection at the start and the end of the exam. If your connection drops in the middle of testing, you can keep working without losing your place, and Bluebook syncs once the connection returns', SRC.digitalModes) + ' A brief wifi hiccup mid exam is not the crisis it would have been on an older, fully connected system, so do not panic if a proctor announces a network blip.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Here is the part of exam day that is actually different about this course, and it is worth understanding well before you walk in, because the wrong mental model here causes real, avoidable anxiety.'),
  H.p('AP CSP students spend a whole unit finishing a Create performance task and a Personalized Project Reference, submit both weeks before the exam, and then never touch that project again on exam day itself. AP Cybersecurity does not work that way. There is no separate project, no digital portfolio submission window, and no earlier deadline to have already cleared before you sit down. Everything that counts toward Section II happens live, inside the timed exam, on exam day itself.'),
  H.p('Specifically, Section II hands you a set of source material about one single device rather than a blank essay prompt.'),
  H.p(H.stat('Section II presents several sources of information about a single device, including a set of firewall rules, system and application logs, a list of files with their permissions, and a device policy, and asks you to identify security issues, detect evidence of attacks, and describe how a configuration or permission change would affect the device', SRC.examPage)),
  H.box('key', 'The one sentence version', '<p>You are not defending work you already submitted. You are handed a device\'s logs, rules, and policy for the first time when the exam starts, and everything you write about them happens inside that sitting, using only what the exam itself gives you.</p>'),
  H.p('That difference reshapes how you should think about your Section II prep. There is no "finish the project early and relax" phase the way there is for a CSP student who has already cleared their Digital Portfolio deadline. Instead, the skill you are building all year is reading an unfamiliar artifact set quickly and correctly under time pressure, since that is the exact task waiting for you in the room. If that reading skill is new to you, our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-device-security-frq-guide">Device Security Analysis FRQ guide</a> breaks down how to work through firewall rules, logs, and a device policy methodically rather than skimming them under pressure.'),
  H.p(H.stat('Section I is 60 multiple-choice questions in 80 minutes, worth 70 percent of your score, and Section II is the single Device Security Analysis free response worth 30 percent of your score with a suggested 50 minutes', SRC.examPage)),
  H.p('Notice what that timing implies about the room itself. You will move from the multiple-choice section directly into the artifact packet, with no earlier submission to fall back on and no separate sitting weeks apart the way CSP splits its Create task from its end of course exam. Plan your exam day energy and focus with that single, continuous sitting in mind rather than assuming a break in the middle to reset.'),

  H.h2(SECTIONS[3]),
  H.p('It is worth naming the first cohort problem honestly rather than talking around it, because pretending it does not exist is not actually reassuring. If you are sitting AP Cybersecurity in its first national administration, there is no returning student to ask what surprised them, no years-deep forum thread full of "here is what I wish I had known," and no released past exam to sit down and take under real timing. That gap is real, and no amount of confident-sounding advice, ours included, can manufacture the precedent that simply does not exist yet.'),
  H.p('What that gap does not mean is that you are walking in unprepared or that your preparation is somehow lesser for lacking precedent. The Course and Exam Description is written and published directly by the organization that writes the actual exam, and it includes sample multiple-choice questions and a sample free-response scenario with an official scoring guideline.'),
  H.sourceNote(SRC.ced.source, SRC.ced.url, SRC.ced.asOf),
  H.p('That document, not a forum thread from a prior test-taker, is the real anchor every student sitting this exam is working from this year, including you. Our companion piece on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-practicing-with-no-released-exam">building AP Cybersecurity practice with no released exam</a> covers the full method for turning that CED material, plus self-written scenario practice in the same pattern, into a real calibrated study routine. The short version for exam day itself: working the CED\'s own sample items and scenario-first practice built to that same structure is a normal and sufficient way to prepare for a first-ever administration, not a consolation prize for lacking something better.'),
  H.box('warn', 'A comparison worth resisting', '<p>Do not measure your own preparation against an imagined version of what a fifth-year AP Chemistry student gets to do, with a decade of released free responses to drill against. That comparison is not available to you, and it was never going to be, no matter how far in advance you started studying. Measure your preparation against what is actually possible this year: working every CED sample item closely, building scenario practice in that same pattern, and treating the timing structure above as real information you can plan around even without a released full exam to rehearse on.</p>'),
  H.p('One more piece of honest calibration: your teacher is in the same position you are. Nobody in your building has proctored this exact exam before either, so a slightly uncertain moment from the adult running your testing room is not a sign that something has gone wrong. It is the accurate texture of being early, and it applies to every single person in that room at once, not just to you.'),

  H.h2(SECTIONS[4]),
  H.p('Most exam day mistakes are not knowledge mistakes. They are logistics mistakes made the night before, when nobody double checks the boring things. Work through this list the evening before, not the morning of, so anything broken has time to actually get fixed.'),
  H.h3('Night before'),
  H.ol([
    'Charge your testing device fully, and pack the correct charging cord, tested and working, even if your school is providing the device.',
    'Confirm your College Board account username and password work by signing in once, rather than discovering a forgotten password at your seat.',
    'Set aside your photo ID if your coordinator requires one, even if you think you will not need it.',
    'Take off any smartwatch or fitness tracker and leave it at home rather than trusting yourself to remember to remove it later.',
    'Pack sharpened pencils or a pen for scratch paper notes, plus a bag to hold your phone if your school collects them at the door rather than having you leave them at home.',
    'Reread the CED\'s sample free-response scenario one more time, specifically to remind yourself what the source material for a Device Security Analysis question actually looks like: firewall rules, logs, a file permissions list, and a device policy, all at once.',
    'Check the exam start time and your school\'s reporting time separately. Arriving when the exam starts is already late.',
  ]),
  H.h3('Morning of'),
  H.ol([
    'Eat something before you leave. A combined multiple-choice and artifact-analysis sitting is a long stretch to sit through on an empty stomach.',
    'Leave your phone at home or hand it in wherever your coordinator collects devices, before you reach the testing room door.',
    'Bring a layer of clothing you can add or remove, since testing room temperature is outside your control.',
    'Arrive with time to spare rather than exactly on time, since seating, device checks, and ID checks all happen before the clock actually starts.',
    'When Section II starts, read every artifact once before you start writing anything. The device policy, the firewall rules, and the logs are meant to be read together, not solved one at a time as they scroll by.',
  ]),
  H.p('None of this list requires last minute studying. That is the point. Exam day performance depends on decisions you can finish the night before, which frees the morning of for the one thing that actually needs a clear head: reading the device in front of you carefully and working the room\'s actual clock, the same clock every AP Cybersecurity student after you will eventually inherit some precedent for, but that you are setting today.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do I need a photo ID for the AP Cybersecurity exam?', a: 'Only if you are testing at a school you do not normally attend, for example as a home schooled student or a student testing outside your regular school. Check with your AP coordinator either way, since some schools require ID more broadly than College Board\'s baseline rule.' },
    { q: 'Is the AP Cybersecurity exam fully digital?', a: 'Yes. The exam runs entirely inside the Bluebook testing app, including the multiple-choice section and the Device Security Analysis free response. You type your free-response answer directly into Bluebook rather than writing in a paper booklet.' },
    { q: 'Do I submit a project before AP Cybersecurity exam day, the way AP CSP students submit their Create task?', a: 'No. AP Cybersecurity has no pre-submitted project and no separate portfolio deadline to clear beforehand. The entire Device Security Analysis free response happens live, inside the timed exam, using an artifact set of firewall rules, logs, a file permissions list, and a device policy that you see for the first time when the exam starts.' },
    { q: 'What exactly is the Device Security Analysis free response?', a: 'It is the single free-response question in Section II. You are given several sources of information about one device, firewall rules, system and application logs, a list of files with their permissions, and a device policy, and you have to identify security issues, detect evidence of attacks, and describe how a configuration or permission change would affect that device.' },
    { q: 'How should I prepare for an exam that has never been given before?', a: 'By treating the Course and Exam Description as your real anchor rather than waiting for a released past exam or a prior test-taker\'s advice that does not exist yet. The CED includes official sample questions and a sample free-response scenario with a scoring guideline, and building scenario practice in that same pattern is a genuinely sufficient way to prepare, not a fallback for lacking something better.' },
    { q: 'Can I bring my phone or smartwatch into the AP Cybersecurity exam?', a: 'No. Phones must be off and stored outside the testing room, and smartwatches or fitness trackers of any kind, an Apple Watch, Fitbit, or Garmin included, are prohibited even if worn passively. Being found with either during testing can result in dismissal from the exam and a canceled score.' },
  ]),

  H.cta({
    heading: 'Build the reading skill Section II actually tests',
    body: 'Work through artifact-based practice built to the CED\'s published Device Security Analysis structure, then check your pacing against the real section clock.',
    links: [
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Try a practice exam' },
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study all five units', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Exam day logistics verified against College Board\'s current AP Exam policies, Bluebook guidance, and the AP Cybersecurity exam overview for the current exam cycle. Confirm device and ID requirements with your own AP coordinator, since some schools apply stricter local rules. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
