'use strict';
// Weekly course post: AP Networking. News peg is the third and final pilot year,
// and the pilot exam being a different assessment from the 2028 national one.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, About AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/about', asOf: 'August 2026' },
  pilot: { source: 'College Board, AP Career Kickstart pilots', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/pilots', asOf: 'August 2026' },
};

const SECTIONS = [
  'AP Networking is in a pilot year, and that changes everything',
  'The four units, and the shape hiding inside them',
  'The four skills the exam is actually weighted around',
  'Who should take AP Networking, and who should not',
  'How to study a course with no released exam',
  'AP Networking and AP Cybersecurity are not the same course',
];

const meta = {
  title: 'AP Networking in 2026-27: Inside the Final Pilot Year',
  handle: 'ap-networking-2026-27-pilot-year-guide',
  blogHandle: 'news',
  course: 'ap-networking',
  targetKeyword: 'ap networking',
  publishOn: '2026-08-18',
  seoTitle: 'AP Networking 2026-27: Pilot Year, Units and Exam',
  seoDescription: 'AP Networking is in its final pilot year in 2026-27 before launching nationally. The four units, the skills tested, and how the pilot exam differs.',
  summary: 'AP Networking runs its third and final pilot in 2026-27 ahead of a national launch. The four units and 22 topics, the four skills the exam weights, how the pilot exam differs from the national exam that follows, and how to study a course with no released questions.',
  tags: ['AP Networking', 'Career Kickstart', 'Course Guide', '2026-27', 'Pilot'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.h1('AP Networking in 2026-27: Inside the Final Pilot Year'),
  H.dek('This is the year before the course goes national, which makes it the strangest year to be in it. The exam you sit is not the exam future students will sit, and almost nothing written about this course makes that distinction.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('If your school offered you AP Networking this fall, you are in a pilot. That word is doing more work than it appears to, and understanding what it means is worth more to you than any study tip in this article.'),

  H.h2(SECTIONS[0]),
  H.p('AP Networking is part of College Board\'s AP Career Kickstart programme, alongside AP Cybersecurity. The two courses are on different timelines, and conflating them is the most common error in coverage of either.'),
  H.table(
    ['', 'AP Cybersecurity', 'AP Networking'],
    [
      ['Status in 2026-27', 'National launch, open to all schools', 'Third and final pilot year, participating schools only'],
      ['Exam in May 2027', 'First official exam', 'Pilot exam, for pilot schools'],
      ['National launch', '2026-27', '2027-28'],
      ['First national exam', 'May 2027', 'May 2028'],
    ]
  ),
  H.sourceNote('College Board AP Career Kickstart course and pilot information', null, 'August 2026'),
  H.p('The practical consequence is the part worth reading twice. The pilot exam administered in May 2027 is a digital assessment containing multiple choice questions only. The course framework for the launched course describes both multiple choice questions tied to real job scenarios and free response questions built on real networking artifacts for students to analyse.'),
  H.box('key', 'What this means if you are a pilot student', '<p>You are likely sitting a multiple choice only exam, while the guides written for the launched course describe a free response section too. That is not an error in either source, it is two different assessments. Ask your teacher which one your school is administering rather than assuming, because it changes how you should spend April.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The course is four units and 22 topics, and the units are named in a deliberately non technical way that hides a very technical progression.'),
  H.table(
    ['Unit', 'Title', 'Topics', 'What it is really about'],
    [
      ['1', 'Managing My Connections', '4', 'One device. Getting your own machine on a network and troubleshooting it when it will not connect.'],
      ['2', 'Managing My Shared Connections', '6', 'A shared local network. Addressing, wireless, and the devices in a home or small office.'],
      ['3', 'Managing Many Connections', '6', 'A segmented LAN. Switching, routing between segments, and scale. The densest unit in the course.'],
      ['4', 'Managing Our Global Connections', '6', 'Wide area networks and the internet. IPv6, reliability, and how the whole thing holds together.'],
    ]
  ),
  H.p('The progression is one device, then a shared network, then many segments, then the world. That is a genuinely good teaching sequence, and it has one implication for you: this course is strictly cumulative. Unit 3 assumes you can already reason about addressing from Unit 2, which assumes you can troubleshoot a single machine from Unit 1.'),
  H.box('warn', 'Where students actually fall behind', '<p>Unit 1 looks like the easy unit because it is short and it is about your own laptop. It is also where the vocabulary is established, and Unit 3 is written in that vocabulary. Students who coast through the first four topics meet the hardest unit in the course without the words to describe what they are looking at.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The exam is weighted around four skills rather than around the units directly, which is a meaningful difference from how most AP exams are described. The skills are Connect and Configure, Secure, Troubleshoot, and Collaborate.'),
  H.p('Three of those are what you would expect from a networking course. The fourth is the one students dismiss and it is the one that reveals what kind of exam this is.'),
  H.ul([
    '<strong>Connect and Configure.</strong> Given a scenario and requirements, set something up correctly. Tests whether you know what the settings do rather than where they are.',
    '<strong>Secure.</strong> Apply appropriate protection to a network. Overlaps with AP Cybersecurity but from the network side rather than the device side.',
    '<strong>Troubleshoot.</strong> Given a symptom, find the cause. This is the skill the course is built around and the one most exam scenarios will test.',
    '<strong>Collaborate.</strong> Communicate technical findings to other people, including people who are not technical. Explaining why a network is slow to somebody who just wants it fixed is a genuine assessed skill here.',
  ]),
  H.box('tip', 'How to practise troubleshooting without a lab', '<p>Use your own home network as the lab. Every time something fails, resist restarting the router. Instead write down the symptom, list three possible causes, and work out which test would separate them. Then fix it. You will build the exact reasoning pattern the exam scenarios are testing, and you will build it on a network you actually care about.</p>'),

  H.h2(SECTIONS[3]),
  H.p('This course suits a specific student, and it is not the same student AP Computer Science A suits.'),
  H.p('Take AP Networking if you like making things work. If you are the person your family calls when the wifi is broken, if you enjoy the diagnostic process of narrowing down a fault, or if you want a career signal toward IT, network administration, or infrastructure work, this is well aimed at you. It also demands very little programming, which makes it accessible to students who bounced off a coding course.'),
  H.p('Look elsewhere if you want to build software. Networking is about configuring, securing and diagnosing systems other people built. That is skilled and well paid work, and it is a different activity from writing programs. If designing and building is what appeals to you, <a href="/pages/ap-csa-score-calculator">AP Computer Science A</a> is the better fit.'),
  H.p('Also weigh the pilot status honestly. You are taking a course whose recognition by colleges is not yet established, in a year where your teacher is teaching it for possibly the first time. If you want the subject, that is a fine trade. If you want a transcript line that admissions readers recognise instantly, it is not yet that.'),

  H.h2(SECTIONS[4]),
  H.p('There are no released AP Networking exams. Every practice question that exists anywhere, including ours, is a reconstruction from the course framework. That is a real limitation and here is how to work around it.'),
  H.ol([
    '<strong>Study the framework, not a prep book.</strong> The course framework is the only first party document describing what is assessed. Anything else is an interpretation of it.',
    '<strong>Learn to explain, not to recognise.</strong> Since you cannot drill past questions, build understanding deep enough to survive an unfamiliar question shape. Explain each topic out loud without notes.',
    '<strong>Work every lab you are offered.</strong> Pilot schools generally have access to hands on lab material. Configuration knowledge is very hard to acquire by reading and very easy to acquire by doing.',
    '<strong>Practise the Collaborate skill deliberately.</strong> After solving anything technical, write two sentences explaining it to a non technical person. Almost no student practises this and it is explicitly assessed.',
    '<strong>Keep a fault log.</strong> Every network problem you meet, its symptom, and its cause. This becomes your revision document, and it is the closest thing to a question bank you can build yourself.',
  ]),
  H.p('Our <a href="/pages/ap-networking">AP Networking course guide</a> follows the four unit structure topic by topic, and the <a href="/pages/ap-networking-exam">exam page</a> covers the format and skills in more detail.'),

  H.h2(SECTIONS[5]),
  H.p('Students ask whether to take both, and which first. They overlap at the edges and they are aimed at different work.'),
  H.p('AP Cybersecurity asks how systems get attacked and defended. AP Networking asks how systems connect and why they stop connecting. Security is a lens applied to systems; networking is one of the systems. The overlap is real in the Secure skill, and it is smaller than the names suggest.'),
  H.p('If you can take both, Networking first is the stronger sequence, because understanding how traffic moves makes network security concrete rather than abstract. If you can take only one and want the broader career signal today, <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity</a> is the more established course and launches nationally a year earlier.'),

  H.h2('Two questions in the exam style'),
  H.p('Both are scenario first, the way the framework describes. Reason it through before opening the answer.'),
  H.mcq({
    n: 1,
    stem: 'A user reports that they cannot reach any website by name, but they can successfully reach a server when they type its numeric address directly. Everything else on the network works normally. What is the most likely cause?',
    options: [
      'The network cable is faulty',
      'The device has no IP address assigned',
      'The DNS configuration on the device is incorrect or unreachable',
      'The firewall is blocking all outbound traffic',
    ],
    correct: 2,
    why: 'The scenario gives you a decisive clue: numeric addresses work, names do not. That means packets are leaving the device and reaching their destination, so the physical link, the address assignment and any blanket outbound block are all ruled out by the evidence. The only broken step is turning a name into an address, which is what DNS does. Notice the structure of this reasoning, because it is exactly the Troubleshoot skill: use what still works to eliminate causes rather than guessing from the symptom.',
  }),
  H.mcq({
    n: 2,
    stem: 'A small office network becomes noticeably slow every afternoon. A technician confirms the internet connection speed is unchanged and that no single device is transferring unusual amounts of data. Which explanation best fits the evidence?',
    options: [
      'The router has failed and needs replacing',
      'Aggregate demand from many devices is exceeding available capacity during peak hours',
      'The office is under a denial of service attack',
      'The wireless password has been compromised',
    ],
    correct: 1,
    why: 'The evidence rules out the dramatic answers. A failed router does not work well in the morning. A denial of service attack or a compromised password would typically show as unusual traffic from or to a specific source, which the technician checked for and did not find. What remains is ordinary contention: many normal devices all wanting bandwidth at the same time. Exam scenarios frequently offer an alarming cause alongside a mundane one, and the mundane one is correct whenever the evidence shows nothing anomalous.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'When does AP Networking launch nationally?', a: 'The 2027-28 school year. The 2026-27 year is the third and final pilot, open only to participating pilot schools, with the first national exam following in May 2028.' },
    { q: 'What is on the AP Networking exam?', a: 'The pilot exam is a digital assessment of multiple choice questions. The framework for the launched course describes multiple choice questions connected to real job scenarios along with free response questions analysing real networking artifacts.' },
    { q: 'How many units are in AP Networking?', a: 'Four units containing 22 topics: Managing My Connections, Managing My Shared Connections, Managing Many Connections, and Managing Our Global Connections.' },
    { q: 'Do I need programming experience for AP Networking?', a: 'No. The course focuses on configuring, securing and troubleshooting networks rather than writing software, so it is accessible without prior coding experience.' },
    { q: 'Should I take AP Networking or AP Cybersecurity first?', a: 'If you can take both, Networking first tends to work better, because understanding how traffic actually moves makes network security concrete. If you can only take one, AP Cybersecurity launches nationally a year earlier and is the more established course.' },
  ]),

  H.cta({
    heading: 'Work through AP Networking unit by unit',
    body: 'All four units and 22 topics, built to the College Board framework, with scenario practice in the exam style.',
    links: [
      { href: '/pages/ap-networking', text: 'Start Unit 1' },
      { href: '/pages/ap-networking-exam', text: 'Exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Pilot and launch timing reflect College Board Career Kickstart information current in August 2026. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
