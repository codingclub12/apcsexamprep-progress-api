'use strict';
// Weekly course post: AP Cybersecurity. News peg is the national launch.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, Introducing AP Cybersecurity', url: 'https://allaccess.collegeboard.org/introducing-ap-cybersecurity', asOf: 'August 2026' },
  cisco: { source: 'Cisco Newsroom, College Board partnership announcement', url: 'https://blogs.cisco.com/learning/cisco-partners-with-college-board-to-launch-ap-cybersecurity', asOf: 'August 2026' },
};

const SECTIONS = [
  'What College Board actually announced',
  'Is AP Cybersecurity worth taking in its first year',
  'The five units, and what each one really asks of you',
  'The exam format, and the section that decides your score',
  'AP Cybersecurity vs AP CSP vs AP CSA',
  'Your month by month plan to May 2027',
  'The first year risk nobody is naming',
];

const meta = {
  title: 'AP Cybersecurity Launches This Fall: The Complete 2026-27 Guide',
  handle: 'ap-cybersecurity-launch-2026-27-guide',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity',
  publishOn: '2026-08-17',
  seoTitle: 'AP Cybersecurity 2026-27: Course, Exam and Prep Guide',
  seoDescription: 'AP Cybersecurity launches nationally this fall, first exam May 2027. The five units, the exam format, who should take it, and how to prepare.',
  summary: 'AP Cybersecurity goes national in 2026-27 and the first exam is May 2027. A teacher breakdown of the five units, the 60 question multiple choice section, the device security free response, and an honest look at what taking an AP in its first year actually costs you.',
  tags: ['AP Cybersecurity', 'Course Guide', 'Career Kickstart', '2026-27', 'Exam Format'],
  // The two exam weightings restate the format table directly above them, which
  // carries its own sourceNote. Allowed so the FAQ can answer in plain words.
  allowedInlineNumbers: ['70 percent', '30 percent'],
};

const body = H.article([
  H.dek('The newest AP is not a rebranded computer science course. It is a career course with a device security free response, an industry framework underneath it, and no released exams to practice on. Here is what that actually means for your fall.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('If you are reading this in August 2026, you are in an unusual position. AP Cybersecurity is being taught nationally for the first time this school year, and almost nobody has taken the exam. There is no score distribution to look up, no bank of released free response questions, no ten years of forum posts telling you which unit is the hard one. You are early.'),
  H.p('That is a real advantage and a real cost, and most of the coverage online right now is only telling you about the advantage. This guide covers both.'),

  H.h2(SECTIONS[0]),
  H.p('AP Cybersecurity launches in the 2026-27 school year as part of College Board\'s AP Career Kickstart initiative, a set of courses aimed at career readiness rather than a traditional college major pathway. The first official exam is administered in May 2027.'),
  H.p('The course did not appear from nothing. It ran as a pilot during 2025-26 across a meaningful number of schools before the national rollout:'),
  H.p(H.stat('3,100 pilot students in 183 schools across 30 states', SRC.cb)),
  H.p('The other structural fact worth knowing is who helped build it. College Board partnered with Cisco, whose Networking Academy supplies curriculum support, hands on labs, and teacher professional development. The stated motivation is workforce supply:'),
  H.p(H.stat('4.8 million unfilled cybersecurity roles globally', SRC.cisco)),
  H.box('key', 'Why the partnership matters to you', '<p>An industry partner means the course is aligned to how security work is actually done, not only to how it is taught. It also means your teacher likely has access to lab material and training that a brand new course would not normally have in year one. That is the single biggest thing separating this launch from a rocky one.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Here is the honest answer: AP Cybersecurity is worth taking if you want the subject, and it is a weak choice if you are collecting AP scores for a transcript.'),
  H.p('Take it if any of these describe you. You are curious about how systems get broken and defended. You want a career signal in IT, security, or networking before college. You are the student who enjoys configuring things, reading logs, and finding the one setting that is wrong. Or you want a fifth or sixth AP that you will actually engage with rather than endure.'),
  H.p('Think harder if you are chasing selective college admissions on rigor alone. Admissions officers recognise AP Calculus and AP Physics instantly. A course in its first national year carries less recognised weight, simply because fewer readers have seen it. That is not a permanent state, but it is the state in 2026-27.'),
  H.box('warn', 'The trap in first year AP courses', '<p>Students often assume a new AP will be graded generously because everyone is new. There is no basis for that. College Board sets standards against college level expectations, not against how the first cohort happens to perform. Plan as though the exam is fully rigorous, because it is.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The course is organised into five units that move outward from concepts to systems. The structure is genuinely well designed: each unit assumes the one before it, so falling behind early is expensive.'),
  H.table(
    ['Unit', 'Title', 'What it is really about'],
    [
      ['1', 'Introduction to Security', 'Vocabulary, the CIA triad, threat actors, and risk. The unit that feels easiest and is quietly the one the exam keeps referring back to.'],
      ['2', 'Securing Spaces', 'Physical and environmental security, access control, and the human layer. Social engineering lives here.'],
      ['3', 'Securing Networks', 'Traffic, protocols, segmentation, firewalls. The most technical unit and the one where students without networking background stall.'],
      ['4', 'Securing Devices', 'Endpoint hardening, configuration, patching, mobile and IoT. Directly relevant to the free response.'],
      ['5', 'Securing Applications and Data', 'Software vulnerabilities, encryption, data handling and recovery. Ties the whole course together.'],
    ]
  ),
  H.box('tip', 'Where to spend your effort', '<p>Unit 1 rewards memorisation, and students who skim it pay for it in every later unit because the exam phrases technical questions in Unit 1 vocabulary. Unit 3 rewards practice, not reading. If your school offers lab access, Unit 3 is where you use it.</p>'),

  H.h2(SECTIONS[3]),
  H.p('The exam has two sections, and they are weighted very differently from what most students assume:'),
  H.table(
    ['Section', 'Content', 'Time', 'Weight'],
    [
      ['I', '60 multiple choice questions', '80 minutes', '70 percent'],
      ['II', '1 free response, device security analysis', '50 minutes', '30 percent'],
    ]
  ),
  H.sourceNote('AP Cybersecurity exam format, apcsexamprep.com course reference', '/pages/ap-cybersecurity-course', 'August 2026'),
  H.p('Two things follow from that table, and both change how you should study.'),
  H.p('First, the multiple choice section carries the large majority of your score, and you get roughly eighty seconds per question. That is not a lot of time to reason from first principles. Recall speed matters more here than it does on AP CSA, where you can trace code slowly and still finish.'),
  H.p('Second, there is only one free response, and it is a device security analysis. A single long task means there is no averaging out a bad one. If you have practiced writing structured security analysis, you will do fine. If you have only read about security, you will freeze, because the task asks you to assess a scenario and justify decisions rather than recall a definition.'),
  H.box('tip', 'How to practice the free response with no released questions', '<p>Take any device you own. Write four paragraphs: what it holds that is worth stealing, how an attacker would most plausibly reach it, which control you would apply first, and what you gave up by applying it. That last paragraph is the one students skip and it is where the reasoning marks live. Do this weekly and you will have written thirty analyses before May.</p>'),

  H.h2(SECTIONS[4]),
  H.p('This is the question teachers get most, so here is the direct comparison.'),
  H.table(
    ['', 'AP Cybersecurity', 'AP CSP', 'AP CSA'],
    [
      ['Coding required', 'Minimal', 'Some, in any language', 'Heavy, Java only'],
      ['Best entry point', 'Yes, no prerequisites', 'Yes, no prerequisites', 'No, wants prior coding'],
      ['Free response style', 'One security analysis', 'Written responses about your own project', 'Four Java coding questions'],
      ['Career signal', 'Security and IT', 'Broad computing literacy', 'Software engineering'],
      ['Track record', 'First national year', 'Well established', 'Well established'],
    ]
  ),
  H.p('If you can only take one and you are unsure about coding, take AP Cybersecurity or <a href="/pages/ap-computer-science-principles-resources">AP CSP</a>. If you already know you like programming, <a href="/pages/ap-csa-score-calculator">AP CSA</a> is the stronger signal for a software pathway. If you can take two across different years, Cybersecurity into CSA is a genuinely good sequence, because security gives you a reason to care about how code fails.'),

  H.h2(SECTIONS[5]),
  H.p('Nine months is enough time to be comfortable, and it is exactly enough time to be caught out if you treat this as a course you can cram. Here is the plan I would give my own students.'),
  H.ol([
    '<strong>September to October, Units 1 and 2.</strong> Build the vocabulary properly. Make a running glossary and add every term the moment you meet it. This feels slow and it is the highest leverage month of the year.',
    '<strong>November to December, Unit 3.</strong> The hardest unit gets the most calendar. Do every lab you are offered. If you cannot explain out loud why a network is segmented, you are not done.',
    '<strong>January, Unit 4 and your first full free response.</strong> Write one device security analysis under a 50 minute timer. It will be bad. That is the point of doing it in January.',
    '<strong>February to March, Unit 5 and mixed review.</strong> Start doing multiple choice at exam pace, 80 seconds per question, so the clock stops being a surprise.',
    '<strong>April, full practice exams and weak unit repair.</strong> Take a complete timed exam, score it, and rebuild only the units that failed. Do not restudy everything evenly.',
    '<strong>Early May, taper.</strong> Review your glossary and your written analyses. Do not learn new material in the final week.',
  ]),
  H.p('If you want the unit by unit material to work through, our <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum breakdown</a> follows the same five unit structure, and the <a href="/pages/ap-cybersecurity-practice-exam">practice exam</a> is built to the 60 question format.'),

  H.h2(SECTIONS[6]),
  H.p('Every guide you will read about this course is enthusiastic. Here is the part they leave out, from someone who has taught through a curriculum change before.'),
  H.p('There are no released exams. For AP CSA, a student can work through a decade of real free response questions and know exactly what the graders reward. For AP Cybersecurity in 2026-27, nobody has that. Every practice question in existence, including ours, is an informed reconstruction from the course framework rather than a released item. Good reconstructions are genuinely useful. They are not the same thing, and any resource that implies otherwise is overselling.'),
  H.p('There is also no score distribution. You cannot look up what fraction of students earn a 5 and calibrate your effort, because the first cohort sits the exam in May 2027. You are studying without knowing where the curve lands.'),
  H.box('key', 'What to do about it', '<p>Two things. Study the course framework itself rather than any single prep resource, because the framework is the only first party document that exists. And weight your preparation toward understanding over pattern matching, since pattern matching needs past exams and you do not have any. Students who genuinely understand a subject are the ones least hurt by an unfamiliar exam.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written to the style of the multiple choice section: scenario first, then a decision. Work them before you open the answer.'),
  H.mcq({
    n: 1,
    stem: 'A small school district stores student records on a file server. During a review, an administrator finds that the backup drive is kept in the same locked server room as the file server, and that both are on the same power circuit. Which principle is most directly violated by this arrangement?',
    options: [
      'Least privilege, because too many staff can access the server room',
      'Availability, because a single local event could destroy both the primary data and its backup',
      'Confidentiality, because backups are not encrypted at rest',
      'Non repudiation, because backup access is not logged',
    ],
    correct: 1,
    why: 'The scenario tells you nothing about permissions, encryption, or logging, so the options referencing those are describing risks that may exist but are not shown. What the scenario does describe is co-location: one fire, flood, or power event takes out the data and the copy of the data at the same time. That is an availability failure, and it is the reason offsite or offline backup copies exist. Watch for questions that offer you a plausible sounding principle you were not actually given evidence for.',
  }),
  H.mcq({
    n: 2,
    stem: 'An employee receives a phone call from someone claiming to be from the IT help desk, who says they need the employee\'s password to fix an urgent mail server problem. The employee provides it. Which control would most likely have prevented this specific incident?',
    options: [
      'A stronger password complexity requirement',
      'Full disk encryption on the employee laptop',
      'Security awareness training covering pretexting and verification procedures',
      'An updated endpoint antivirus signature database',
    ],
    correct: 2,
    why: 'This is a human layer attack, so technical controls that never touch human behaviour cannot stop it. A more complex password gets disclosed just as easily. Encryption protects data at rest, not a credential the user handed over. Antivirus never sees a phone call. The attack is pretexting, and the control that addresses it is training that teaches staff to verify identity through a known channel before disclosing anything. Match the control to the layer the attack targets.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'When is the first AP Cybersecurity exam?', a: 'May 2027. The course is taught nationally for the first time during the 2026-27 school year, so the 2027 administration is the first official exam.' },
    { q: 'Do I need programming experience to take AP Cybersecurity?', a: 'No. The course has no programming prerequisite and requires only minimal coding compared with AP Computer Science A. Comfort with configuring devices and reading technical material matters more than coding fluency.' },
    { q: 'How is the AP Cybersecurity exam scored?', a: 'The exam has two sections. Section I is 60 multiple choice questions in 80 minutes and is worth 70 percent of the score. Section II is a single device security analysis free response in 50 minutes and is worth 30 percent.' },
    { q: 'Is AP Cybersecurity easier than AP Computer Science A?', a: 'It is different rather than easier. It removes the burden of writing correct Java under time pressure, but it adds a large volume of precise technical vocabulary and one long analytical free response where there is no partial credit from a second question to fall back on.' },
    { q: 'Will colleges give credit for AP Cybersecurity?', a: 'Credit policies are set by individual colleges and most will not publish a policy for a brand new exam until after the first administration. Check each college directly, and do not assume credit will match what they award for AP Computer Science A.' },
  ]),

  H.cta({
    heading: 'Study the full AP Cybersecurity course free',
    body: 'All five units, built to the College Board framework, with practice questions in the real exam format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Start Unit 1' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is updated as College Board publishes further detail on the AP Cybersecurity exam. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
