'use strict';
// Weekly course post: AP Cybersecurity. A section-by-section mechanics piece:
// what Section I and Section II actually look like, timing, weighting, and
// what is and is not yet published by College Board. Deliberately goes deeper
// on format mechanics than the launch guide, which only summarizes it in one
// table; this post is the canonical exam-format reference the launch guide
// and the MCQ pacing post both point students toward.
const H = require('../../lib/blog-house');

const SRC = {
  examPage: {
    source: 'College Board, AP Cybersecurity Exam Overview (AP Central)',
    url: 'https://apcentral.collegeboard.org/courses/ap-cybersecurity/exam',
    asOf: 'August 2026',
  },
  ced: {
    source: 'College Board, AP Cybersecurity Course and Exam Description',
    url: 'https://apcentral.collegeboard.org/media/pdf/ap-cybersecurity-course-and-exam-description.pdf',
    asOf: 'August 2026',
  },
  credential: {
    source: 'College Board, AP Cybersecurity Credential (AP Career Kickstart)',
    url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials/ap-cybersecurity',
    asOf: 'August 2026',
  },
};

const SECTIONS = [
  "What's actually confirmed about the AP Cybersecurity exam format",
  'Section I: the multiple-choice section, question by question',
  'Section II: the free-response section, artifact by artifact',
  'Total time and how the two sections weigh on your score',
  'What is different about this exam format compared to other APs',
  'Two practice questions in the scenario-first format',
];

const meta = {
  title: 'The AP Cybersecurity Exam Format, Section by Section',
  handle: 'ap-cybersecurity-exam-format-section-by-section',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity exam',
  publishOn: '2026-09-22',
  seoTitle: 'AP Cybersecurity Exam Format, Section by Section',
  seoDescription: 'A section by section breakdown of the AP Cybersecurity exam format: multiple choice timing, the free response artifacts, total time, and score weighting.',
  summary: 'A mechanics-first walkthrough of the AP Cybersecurity exam format: what Section I actually asks question by question, what the artifacts in the Section II free response look like, total exam time, how the two sections weigh on the final score, what remains unpublished by College Board as of this writing, and how this exam differs structurally from AP CSP and AP CSA.',
  tags: ['AP Cybersecurity', 'Exam Format', 'Course Guide', 'College Board', 'Test Prep'],
  allowedInlineNumbers: ['70 percent', '30 percent', '25 to 40 percent', '25-40 percent'],
};

const body = H.article([
  H.dek("Two sections, one free response, and a scoring split that surprises most students who assume the essay-style question carries more weight than it does. Here is what College Board has actually published about the AP Cybersecurity exam format, section by section, and what it honestly has not published yet."),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you searched for the AP Cybersecurity exam format expecting a released exam to study alongside this guide, you will not find one, and that is worth saying plainly before anything else. This is the first national year of the course, the first administration is in May 2027, and the format details below come from what College Board itself has published about the exam structure rather than from a bank of past questions. That is a genuinely different starting point than a student researching the AP Computer Science A exam format has, and this guide treats that difference honestly instead of glossing over it.'),
  H.p("What follows is a section by section walkthrough: how many questions Section I actually contains and how they are grouped, what the Section II free response asks you to do with the artifacts it hands you, how much time each section gets, and how the two sections combine into your final score. Where College Board has not published a specific figure, this guide says so directly instead of guessing at a number that sounds plausible."),

  H.h2(SECTIONS[0]),
  H.p('Start with the shape of the whole exam, because the two sections are structured very differently from each other and students often assume they mirror one another when they do not.'),
  H.table(
    ['Section', 'Content', 'Time', 'Weight'],
    [
      ['I', '60 multiple-choice questions, individual items and short scenario sets', '80 minutes', '70 percent'],
      ['II', '1 free-response question, built around a single device\'s security artifacts', '50 minutes', '30 percent'],
    ]
  ),
  H.sourceNote(SRC.examPage.source, SRC.examPage.url, SRC.examPage.asOf),
  H.p('That table is the entire skeleton of the exam. Everything else in this guide is filling in what each of those two rows actually asks a student to do, because "60 multiple-choice questions" and "1 free-response question" describe the shape of the test without describing what sitting through it actually feels like.'),
  H.box('key', 'What is confirmed versus what is not', "<p>Confirmed, directly from College Board: question count, section timing, section weighting, the general question style in each section, and the fact that the exam is administered digitally. Not yet confirmed anywhere this guide could verify: an exact published split of how many of the 60 multiple-choice questions are standalone items versus how many sit inside a shared scenario set, and a public point-by-point scoring rubric for the free response. Both of those get updated here the moment College Board publishes them.</p>"),

  H.h2(SECTIONS[1]),
  H.p("Section I is where most of your score lives, so it is worth understanding its structure in more than the one-line summary most guides give it. The section is not sixty unrelated trivia questions in a row. College Board has described the multiple-choice section as a mix of individual, standalone questions and small clusters of two, three, or four questions that share a single scenario, meaning you read one setup, such as a short description of a company's network or a device configuration, and then answer several questions that each probe a different piece of reasoning about that same setup."),
  H.p("This matters for how you should practice, not just for how you should picture the section. A standalone item tests one fact or one piece of reasoning in isolation. A scenario set tests whether you can hold a slightly more complex situation in your head and reason about it from several angles in a row, which is a genuinely different skill than fast recall. Both styles are described in the course materials as scenario-first rather than definition-first, which tracks with how College Board has talked about the course generally: the exam is built to test whether a student can look at a described situation and reason about the security implications, not just recite a term."),
  H.p('The three skill categories the multiple-choice section draws from are published with weight ranges rather than fixed percentages:'),
  H.table(
    ['Skill category', "What it's actually asking you to do", 'Exam weight'],
    [
      ['Analyze Risk', 'Read a scenario and correctly identify the actual vulnerability, threat, or risk it describes', '25 to 40 percent'],
      ['Mitigate Risk', 'Choose or evaluate the control that would actually address the risk described, not just a plausible-sounding one', '25 to 40 percent'],
      ['Detect Attacks', 'Read evidence such as logs or traffic patterns and identify whether an attack is actually occurring', '25 to 40 percent'],
    ]
  ),
  H.sourceNote(SRC.ced.source, SRC.ced.url, SRC.ced.asOf),
  H.p("Notice that those three ranges are weights by skill, not by unit. That is a deliberate design choice worth understanding on its own: the exam is not asking how much of the test comes from Unit 3 the way a student might expect from a more traditional AP course. It is asking how much of the test asks you to analyze a risk, versus mitigate one, versus detect one, and all five units feed into each of those three skills rather than mapping cleanly onto one skill apiece. A device hardening question from Unit 4 might test Mitigate Risk. A network traffic question from Unit 3 might test Detect Attacks. The skill being tested and the unit the content came from are two separate axes, and only the skill axis has a published weighting."),
  H.box('warn', 'A specific gap worth naming', "<p>Because the exam weights by skill rather than by unit, there is currently no published breakdown of exactly what percentage of the 60 questions draws from each of the five units. Some informed sources have noted that Unit 3, Securing Networks, appears to carry substantial weight because its content connects most directly to the free response, but that is an inference from how the course is structured, not a College Board published figure. Treat any specific unit-by-unit percentage you see elsewhere as an estimate, not a confirmed number, until College Board publishes one.</p>"),

  H.h2(SECTIONS[2]),
  H.p("Section II is a single free-response question, and understanding what that one question actually contains matters more here than in almost any other AP exam, because there is no second or third question to balance out a rough start. College Board has described the free response as built around a single device's worth of security artifacts rather than a written essay prompt: things like a set of firewall rules, system and application logs, a list of files with their permissions, and a written device security policy, all describing one device or one small system."),
  H.p("From those artifacts, the question asks you to do several distinct things in sequence rather than one open-ended task. Based on what College Board has described, the work generally includes finding evidence within the logs and configuration that something is wrong, explaining what the stated device policy actually requires, adjusting permissions or firewall rules so the device matches that policy, and recommending further steps to harden the device against the kind of issue the evidence pointed to. That is closer to a structured technical investigation with several checkpoints than to a single essay question, even though it is graded as one free response worth 30 percent of the exam."),
  H.box('tip', 'Why this changes how you should practice', "<p>Because the free response works from artifacts rather than from a written prompt alone, practicing it by only reading about security concepts will not prepare you for the actual task. The useful practice is reading a small set of logs, permissions, and firewall rules and asking yourself what looks wrong, what the policy actually says, and what you would change first. Our <a href=\"/blogs/ap-cybersecurity/ap-cybersecurity-scenario-question-evidence\">guide to reading scenario evidence</a> walks through exactly that habit in more depth.</p>"),
  H.p("What has not been published, as of this writing, is a point-by-point public scoring rubric showing how credit is distributed across those sub-tasks: whether finding the evidence of an attack is worth as much as correctly reconfiguring the permissions, for instance. AP CSA has a decade of released free responses with scoring guidelines a student can study line by line. AP Cybersecurity does not have that history yet, and this guide will not pretend otherwise by inventing a plausible-sounding point breakdown that nobody has actually confirmed."),

  H.h2(SECTIONS[3]),
  H.p("Put the two sections back together and the arithmetic is straightforward, but it is worth stating directly because students often misjudge it."),
  H.p(H.stat('130 minutes total exam time, 80 minutes for Section I plus 50 minutes for Section II', SRC.examPage)),
  H.p("The exam is administered digitally through College Board's Bluebook testing application, the same platform used for the digital SAT and several other AP exams, with responses submitted automatically at the end of the allotted time rather than collected on paper."),
  H.sourceNote(SRC.examPage.source, SRC.examPage.url, SRC.examPage.asOf),
  H.p('The weighting is the part that trips students up most. Section I, the multiple-choice section, is worth 70 percent of your score. Section II, the single free response, is worth 30 percent. Students coming from courses where a big free response question feels like the main event often assume the free response counts for close to half the score, or even more, since it is the section that feels the hardest and takes the most sustained thinking. It does not. The multiple-choice section carries more than twice the weight of the free response, which means a strong Section I performance, built on fast, accurate scenario reasoning across sixty questions, protects your score even if the free response goes rougher than you hoped. The reverse is also true: a brilliant free response cannot rescue a score if the multiple-choice section went badly, because there is simply more of the exam sitting in that first section.'),
  H.box('key', 'The practical takeaway', "<p>Study time should roughly track exam weight. If you have limited time before May, spending it on fast, accurate multiple-choice reasoning across all five units returns more score than spending an equivalent hour polishing free-response writing style. That is not a reason to skip free-response practice, since 30 percent of your score is still a real fraction of a real exam. It is a reason not to let it crowd out the section carrying more than twice its weight.</p>"),

  H.h2(SECTIONS[4]),
  H.p("Students researching this course usually already have one or two other APs in mind for comparison, and the format differences are genuinely useful context rather than trivia, because they change how you should prepare."),
  H.p("The most significant structural difference is that AP Cybersecurity has no through-course project component. AP Computer Science Principles builds roughly the same 70/30 weighting between its multiple-choice exam and a separate piece, but that separate 30 percent in CSP is a Create Performance Task, a programming project students build over weeks during the course and submit before the exam even happens. AP Cybersecurity's 30 percent is not a project submitted in advance. It is a free response answered live, during the same sitting as the multiple-choice section, under the same 50-minute clock as everything else in Section II. If you have heard that AP Cybersecurity and AP CSP share a similar score split and assumed that meant a similar structure, that assumption is the one place this comparison actually matters: the number is similar, the mechanism behind it is not."),
  H.p("The comparison to <a href=\"/pages/ap-csa-score-calculator\">AP Computer Science A</a> runs the other direction. AP CSA's free-response section has four separate questions covering different programming skills, so a rough answer on one question is diluted by three others. AP Cybersecurity has exactly one free-response question carrying its entire 30 percent, which means there is no averaging out a bad start the way there is on AP CSA. That single-question structure is also why the artifact-based format described above matters so much: there is only one shot at Section II, and it is built from a specific set of evidence rather than an open essay prompt you can improvise around if you are unsure."),
  H.p("There is also a broader Career Kickstart point worth naming plainly. AP Cybersecurity sits in College Board's newer Career Kickstart category, and the AP Cybersecurity Credential that comes with a qualifying exam score is based on the AP exam score alone."),
  H.sourceNote(SRC.credential.source, SRC.credential.url, SRC.credential.asOf),
  H.p("That is worth stating because some career-oriented programs bolt an external proctored industry certification exam onto the coursework as a requirement for the credential. AP Cybersecurity does not. It is exam-only in the same structural sense as AP CSA and AP CSP: one exam, sat once, in the format this guide has just walked through, no separate industry test folded into how the credential is earned. A free voucher toward the CompTIA Security+ exam is offered to students who pass, but that is a bonus opportunity attached to a strong score, not a second required assessment sitting inside the format itself."),

  H.h2(SECTIONS[5]),
  H.p("Since the multiple-choice section carries most of the exam and is built around individual items plus small scenario sets, here are two practice questions written to that same scenario-first style. Work each one before checking the answer."),
  H.mcq({
    n: 1,
    stem: 'A retail company\'s Section I style multiple-choice question describes the following: an employee accesses the company\'s customer database from a coffee shop\'s public wifi network using a company laptop with a VPN client installed but currently disabled. The employee successfully logs in and downloads a report. Which statement best evaluates this situation?',
    options: [
      'The situation is fully secure, because the employee successfully authenticated with valid credentials',
      'The situation is fully insecure, because public wifi networks never permit any secure activity',
      'The login itself may be secure, but the data is exposed in transit because the VPN, which would have protected traffic on an untrusted network, was not active',
      'The situation cannot be evaluated without knowing the employee\'s password strength',
    ],
    correct: 2,
    why: 'This is a scenario-set style question: it gives you several true-sounding facts and asks you to isolate the one that actually matters. Successful authentication tells you the login credentials worked, not that the data in transit is protected. A public wifi network is genuinely untrusted, which is exactly why the company issued a VPN client in the first place, and the scenario tells you directly that the VPN was disabled. That means traffic between the laptop and the company network, including the downloaded report, traveled across an untrusted network unprotected by the one control designed for this exact situation. Password strength is a real concern in general but is not the vulnerability this specific scenario is describing. Correctly separating "the control that exists" from "the control that was actually active" is exactly the kind of reasoning the Analyze Risk skill category tests.',
  }),
  H.mcq({
    n: 2,
    stem: 'A short excerpt from a firewall log, of the kind that might accompany a Section II free-response artifact set, shows dozens of connection attempts from a single external IP address to port 22 (SSH) on a company server within a two-minute window, all denied by the firewall. Which conclusion is best supported by this evidence alone?',
    options: [
      'The server has already been compromised, since the log shows so many attempts',
      'The firewall is misconfigured, since it should not be logging denied connections at all',
      'This pattern is consistent with an external attempt to gain unauthorized remote access, and the firewall\'s denial rule is functioning as intended',
      'The evidence shows a normal, expected volume of legitimate remote administration traffic',
    ],
    correct: 2,
    why: 'A high volume of rapid, denied connection attempts to a remote-access port like SSH from a single external address is a recognizable pattern of an attempted intrusion, most likely automated password guessing or scanning, rather than normal administrative traffic, which would not look like dozens of attempts in two minutes. The word "denied" is the detail that changes the correct conclusion: the server was not compromised by this evidence, because the firewall blocked every attempt shown. That also means the firewall is doing exactly what a firewall should do here, not misbehaving. This is the same reasoning chain the actual free response asks for: read the evidence closely, identify what it does and does not show, and draw the conclusion the evidence actually supports rather than the most dramatic-sounding one.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'How many multiple-choice questions are on the AP Cybersecurity exam?', a: 'Section I has 60 multiple-choice questions in 80 minutes, made up of individual standalone items and small sets of two to four questions built around a shared scenario.' },
    { q: 'How many free-response questions are on the AP Cybersecurity exam?', a: 'Just one. Section II is a single free-response question in 50 minutes, built from a set of security artifacts for one device, such as firewall rules, logs, file permissions, and a device policy, rather than a written essay prompt.' },
    { q: 'How is the AP Cybersecurity exam weighted?', a: 'Section I, the multiple-choice section, is worth 70 percent of the score. Section II, the single free response, is worth 30 percent. That is a larger share on multiple choice than many students expect.' },
    { q: 'Does AP Cybersecurity have a project component like AP CSP does?', a: 'No. That is the biggest structural difference between the two exams. AP CSP\'s 30 percent comes from a Create Performance Task built over weeks before the exam. AP Cybersecurity\'s 30 percent is a free response answered live during the same exam sitting as the multiple-choice section.' },
    { q: 'Is the exact scoring rubric for the AP Cybersecurity free response published?', a: 'Not as a detailed, point-by-point public breakdown, as of this writing. College Board has described what the free response asks you to do with the artifacts it provides, but a released scoring guideline of the kind AP CSA has built up over a decade does not yet exist for this course, since the first exam has not been administered.' },
  ]),

  H.cta({
    heading: 'Practice the real exam format before May',
    body: 'Our AP Cybersecurity practice exam is built to the 60 question, two section format this guide just walked through, with scenario sets and a device security free response.',
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
  H.updatedNote('This guide reflects the AP Cybersecurity exam format as published by College Board as of September 2026 and will be updated as further scoring and format detail becomes available. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
