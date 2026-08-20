'use strict';
// Weekly course post: AP Cybersecurity. Strategy piece: a unit by unit study
// priority ranking across the whole five unit course, since no released exams
// exist yet to rank against real frequency data. Companion to the Unit 1
// vocabulary post, but at a different altitude: whole-course triage, not a
// single unit's vocabulary list.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, AP Cybersecurity Course and Exam Description', url: 'https://apcentral.collegeboard.org/courses/ap-cybersecurity', asOf: 'August 2026' },
  examFormat: { source: 'AP Cybersecurity exam format, apcsexamprep.com course reference', url: '/pages/ap-cybersecurity-course', asOf: 'August 2026' },
};

const SECTIONS = [
  'What "ranked" can honestly mean before a single exam has been given',
  'How the five AP Cybersecurity units actually build on each other',
  'Unit by unit: the strategic take',
  'If you can only deeply master three of the five units',
];

const meta = {
  title: 'AP Cybersecurity Units, All Five Ranked by What the Exam Asks For',
  handle: 'ap-cybersecurity-five-units-ranked',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity units',
  publishOn: '2026-09-01',
  seoTitle: 'AP Cybersecurity Units Ranked: Study Priority Guide',
  seoDescription: 'There are no released AP Cybersecurity exams yet. This teacher guide ranks all five units by difficulty, dependency, and study time payoff instead.',
  summary: 'AP Cybersecurity has no released exams to rank units against, so this guide reasons from the course framework instead: how conceptually hard each of the five units is, how much it depends on the units before it in a genuinely cumulative course, and roughly how much study time it deserves relative to the others. Includes a summary table, an honest three-of-five triage recommendation, and two worked practice questions from Securing Networks and Securing Applications and Data.',
  tags: ['AP Cybersecurity', 'Study Strategy', 'Unit Priority', 'Exam Prep', 'Course Framework'],
  // Restates the FRQ weighting from the sourced exam-format stat/table above,
  // inside the FAQ answer text, same pattern as the 2026-08-18 launch post.
  allowedInlineNumbers: ['30 percent'],
};

const body = H.article([
  H.dek('Nobody has ever taken the AP Cybersecurity exam, so nobody can hand you real numbers on which unit gets tested hardest. What a teacher can hand you is a reasoned ranking built from the course itself: how the five units depend on each other, where the conceptual walls are, and where your study hours actually pay off before May.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Be precise about what a phrase like "ranked by what the exam asks for" can honestly mean right now. It cannot mean released exam-frequency data, because none exists. AP Cybersecurity is taught nationally for the first time this school year, and the first official exam is not administered until May 2027. There is no bank of past multiple choice questions to count from, no scoring guide showing which unit\'s content shows up most often, and no score distribution to check your instincts against. Any resource, including this one, that implies otherwise is overselling what it actually knows.'),
  H.p('What this guide can honestly offer instead is informed reasoning from the structure of the course itself, ranking all five AP Cybersecurity units by three things a teacher can actually assess without a released exam: how conceptually demanding each unit is on its own terms, how much it leans on the units that came before it in a course that is genuinely cumulative rather than a set of five independent topics, and roughly how much of your limited study calendar each one is worth relative to the other four.'),
  H.p('One structural fact does real work in this ranking and is worth stating plainly before the unit breakdown. The exam has exactly one free response question, a device security analysis, and it carries ' + H.stat('30 percent', SRC.examFormat) + ' of the total score with nothing to average it against if it goes badly. A course built around a single high stakes free response rewards depth on the unit that free response draws from more than it rewards even coverage across all five units, and that asymmetry shows up directly in the ranking below.'),
  H.box('warn', 'What this ranking is not', '<p>This is not a leaked exam breakdown and it is not a claim about how often any unit is actually tested. It is a teacher\'s prioritization of the five AP Cybersecurity units based on the published course framework, on how the units build on each other, and on how the exam itself is weighted. Treat it as where to spend a limited study calendar, not as a guarantee about what will or will not appear on any specific exam.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The course framework does not organize the five AP Cybersecurity units as five separate topics you could study in any order. It spirals a small set of skills through all five units instead, so the same reasoning moves get asked again and again against progressively more technical material.'),
  H.p(H.stat('Analyze Risk, Mitigate Risk, and Detect Attacks', SRC.cb) + ' are the skills that recur in every unit, joined by a fourth skill, Collaborate, that shows up as students work through scenarios together and with course tools. That design choice is the entire reason this course rewards cumulative studying over unit by unit cramming. A student who never solidified how to analyze risk in Unit 1 is not just weaker on Unit 1 content later. They are weaker at the core move every later unit keeps asking for, on harder material, under more time pressure.'),
  H.p('That is also why the ranking below leans so heavily on dependency, not just on raw technical difficulty. A unit can be conceptually approachable on its own and still be a bad place to fall behind, because a shaky foundation there quietly taxes every unit that follows it.'),
  H.table(
    ['Unit', 'What it depends on', 'Conceptual difficulty', 'Relative study priority'],
    [
      ['1. Introduction to Security', 'Nothing before it, but everything after it depends on it', 'Low on its own, high in what it enables', 'Must master, and cheaply'],
      ['2. Securing Spaces', 'Unit 1 vocabulary, applied to the human and physical layer', 'Moderate, mostly conceptual rather than technical', 'Solid working knowledge'],
      ['3. Securing Networks', 'Units 1 and 2, plus real technical background many students lack', 'Highest of the five units', 'Must master, biggest time block'],
      ['4. Securing Devices', 'Units 1 through 3, and it directly feeds the single free response', 'Moderate to high, and high stakes', 'Must master, highest leverage'],
      ['5. Securing Applications and Data', 'All four units before it, more than any other unit', 'Moderate, but assumes fluency you should already have', 'Solid working knowledge, boosted by transfer'],
    ]
  ),
  H.box('tip', 'Read the table as a dependency chain, not five equal rows', '<p>A five row table makes the units look like five equally weighted choices. They are not. Unit 1 is cheap and foundational. Units 3 and 4 are where the technical difficulty and the exam stakes concentrate. Unit 5 is the unit most likely to feel unexpectedly hard in April if the units before it were rushed, because it is the one asking the most of what you already learned.</p>'),

  H.h2(SECTIONS[2]),
  H.p('A one line table take can only say so much. Here is the deeper reasoning behind each row, unit by unit.'),

  H.h3('Introduction to Security'),
  H.p('Unit 1 is not conceptually hard. The vocabulary, the CIA triad, the threat, vulnerability, and risk relationship, threat actor categories, none of it requires prior technical background, and most students can learn it in a few focused weeks. What makes it rank as high priority anyway is leverage rather than difficulty: every later unit reuses this vocabulary as its reasoning tool, so an hour spent solidifying Unit 1 buys you clarity in all four units that follow it. Skimming Unit 1 because it feels easy is the single most common way students quietly under-prepare for the rest of the course.'),

  H.h3('Securing Spaces'),
  H.p('Unit 2 asks you to apply Unit 1 vocabulary to the human and physical layer: locks, badges, cameras, and the social engineering tactics that target people rather than systems. It is genuinely more approachable than Units 3 and 4, since almost nothing here requires specialized technical background, and most of the reasoning is about plausibility and human behavior rather than configuration detail. That relative approachability is exactly why it does not need the largest share of your calendar. Give it a real pass, since it still shows up throughout the multiple choice section and inside free response reasoning about physical access, but do not let it crowd out time that the harder units need more.'),

  H.h3('Securing Networks'),
  H.p('This is the unit most likely to be the hardest for most students, and it is not close. Traffic, protocols, segmentation, and firewalls demand a kind of technical fluency that Units 1 and 2 do not, and a student without prior networking exposure is building real new mental models here rather than reorganizing ones they already had. It is also the unit where practice matters more than reading, since understanding why a network is segmented is a different skill from being able to recite what segmentation means. If a school offers lab access, this is where it earns its keep, and this is the unit that justifies claiming the biggest single block on a study calendar.'),

  H.h3('Securing Devices'),
  H.p('Unit 4 sits at a strange intersection: it is meaningfully technical, and it is also the unit the single free response question draws from directly. Endpoint hardening, configuration, patching, and mobile and IoT security are the raw material for the device security analysis, which means mastery here pays out in a way mastery in no other unit quite matches, because there is exactly one free response question and it is worth almost a third of the score with no second question to fall back on. A student who is merely competent in Unit 4 but has practiced writing the structured four part analysis will often outscore a student who knows more device security facts but has never written the analysis under a timer.'),

  H.h3('Securing Applications and Data'),
  H.p('Unit 5 is the one students most often underestimate, not because the content is unusually hard in isolation, but because it assumes fluency in everything before it more than any other unit does. Software vulnerabilities, encryption, and data handling all lean on the CIA triad from Unit 1, the network concepts from Unit 3, and the device concepts from Unit 4 at the same time. A student who genuinely mastered those units usually finds Unit 5 moves faster than expected, because a lot of it is transfer rather than brand new material. A student who rushed the earlier units, on the other hand, tends to discover the gap here, in April, which is the worst possible time to discover it.'),

  H.h2(SECTIONS[3]),
  H.p('Given a limited number of hours between now and May, here is the honest triage recommendation: if you can only deeply master three of the five units, make them Introduction to Security, Securing Networks, and Securing Devices.'),
  H.p('The reasoning is not that Securing Spaces and Securing Applications and Data do not matter or will not be tested. They will be, on the same multiple choice section as everything else, and skipping either one outright would cost real points. The reasoning is about where deep mastery, as opposed to solid working knowledge, actually changes your outcome the most under a real time constraint.'),
  H.ul([
    '<strong>Introduction to Security</strong> earns a spot because it is the cheapest unit to master and the most expensive one to shortcut. It does not compete for calendar time the way Units 3 and 4 do, and every hour here pays interest across the rest of the course.',
    '<strong>Securing Networks</strong> earns a spot because it is the hardest unit outright, and multiple choice weakness on the most technical material is the easiest way to quietly lose points across a wide section of the exam without any single dramatic failure to point to.',
    '<strong>Securing Devices</strong> earns a spot because it is the only unit tied directly to the single free response question, and a free response with no second question to average against rewards depth disproportionately compared with any multiple choice topic.',
  ]),
  H.p('Securing Spaces stays affordable to deprioritize slightly because it is the most self-contained of the five units. Its reasoning does not require heavy transfer from elsewhere, so a focused late review recovers most of it quickly. Securing Applications and Data is the trickier one to leave off the top three, and it deserves a caveat rather than a shrug: because it reuses so much of Units 1, 3, and 4, a student who genuinely mastered those three often finds Unit 5 arrives mostly pre-learned. That transfer effect is real, but it only works if the first three units were actually mastered and not merely covered, which is the entire point of putting them at the top of this list in the first place.'),
  H.box('key', 'This is a calendar strategy, not a coverage plan', '<p>Triage exists because study time is finite, not because two of the five units are safe to ignore. Every unit sits somewhere on the multiple choice section, and Securing Spaces and Securing Applications and Data both deserve real study passes. The claim here is narrower and more useful than "skip these two": when your calendar runs short, put the deepest hours into Units 1, 3, and 4 first, because that is where mastery, rather than familiarity, changes your score the most.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both questions are written to the scenario-first style of the multiple choice section, drawn from Securing Networks and Securing Applications and Data since those two units carry the most technical weight in this ranking. Work each one before opening the answer.'),
  H.mcq({
    n: 1,
    stem: 'A company\'s internal network places its employee workstations, its guest wifi, and its finance department servers on three separate VLANs, with a firewall rule set that blocks guest wifi traffic from reaching the finance VLAN entirely. An employee laptop on the general workstation VLAN is later compromised by malware. Which outcome does this network design most directly support?',
    options: [
      'The malware is automatically detected the moment it infects the laptop',
      'The compromised laptop is prevented from spreading to or reaching the finance servers',
      'The employee\'s password is automatically reset across all connected systems',
      'The guest wifi network becomes fully isolated from the internet',
    ],
    correct: 1,
    why: 'Network segmentation does not detect malware, reset credentials, or cut off internet access on its own, so those outcomes are not what this design is built to do. What VLANs and firewall rules between them accomplish is containment: limiting how far a compromise on one segment can spread. The scenario describes exactly that setup, workstations, guest wifi, and finance servers kept apart with rules restricting traffic between them, so the direct benefit is that a compromised workstation cannot freely reach the segment holding the most sensitive data. Segmentation is a mitigation against lateral movement, not a detection or recovery control, and the exam likes to test whether you can tell those categories apart.',
  }),
  H.mcq({
    n: 2,
    stem: 'A school\'s student portal accepts a student ID number in a web form and inserts it directly into a database query without checking that the input is actually a number or removing any special characters the user might type. A student discovers that typing certain punctuation into the ID field returns other students\' records. Which category of vulnerability does this describe?',
    options: [
      'A denial of service vulnerability, because the server could be overwhelmed with requests',
      'An injection vulnerability, because unvalidated input is being interpreted as part of a database command',
      'A physical security vulnerability, because the database server itself is unsecured',
      'A social engineering vulnerability, because a person was deceived into revealing data',
    ],
    correct: 1,
    why: 'Nothing in the scenario involves overwhelming the server, no person was deceived into acting, and the flaw has nothing to do with physical access to hardware, so those three options describe real categories that simply do not match what is being shown. What is described is user-supplied input being passed straight into a database query without validation, so specially crafted input can change what the query actually does. That is the definition of an injection vulnerability: a failure to treat untrusted input as data rather than as part of a command. The fix lives in Securing Applications and Data, validating and sanitizing input before it ever reaches the database, which is exactly the kind of application-layer control this unit is built around.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is there real data showing which AP Cybersecurity unit is tested most?', a: 'No, and be skeptical of any source that implies otherwise. AP Cybersecurity is taught nationally for the first time this school year, and the first official exam is not until May 2027, so no released questions or score data exist yet to count from. This ranking reasons from the published course framework and the exam\'s own structure instead of frequency data that does not exist.' },
    { q: 'If I can only deeply study three units, which three should they be?', a: 'Introduction to Security, Securing Networks, and Securing Devices. Introduction to Security is cheap to master and everything later depends on it. Securing Networks is the most technically demanding unit. Securing Devices feeds the single free response question directly, which carries 30 percent of the score with no second question to average against.' },
    { q: 'Does that mean Securing Spaces and Securing Applications and Data will not be tested?', a: 'No. Both units are covered on the multiple choice section along with everything else, and skipping either outright would cost real points. The three-unit recommendation is about where deep mastery pays off the most under a limited study calendar, not a claim that the other two units are safe to ignore.' },
    { q: 'Why is Securing Networks ranked as the hardest unit?', a: 'It requires technical fluency, traffic, protocols, segmentation, and firewalls, that Units 1 and 2 do not demand, so students without prior networking exposure are building genuinely new mental models rather than extending familiar ones. It is also a unit where hands on practice matters more than reading, which makes it slower to prepare for than a purely vocabulary-based unit.' },
    { q: 'Why does Securing Applications and Data depend so heavily on the earlier units?', a: 'Its content, software vulnerabilities, encryption, and data handling, leans on the CIA triad from Unit 1, network concepts from Unit 3, and device concepts from Unit 4 at the same time. Students who mastered those units tend to find Unit 5 arrives mostly through transfer, while students who rushed earlier units often discover the gap here, late in the year, which is the worst time to find it.' },
  ]),

  H.cta({
    heading: 'Turn this ranking into a study plan',
    body: 'Work through all five units in the full AP Cybersecurity curriculum, or take a practice exam built to the real 60 question multiple choice format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study all five units' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This ranking is reviewed as College Board publishes further detail on the AP Cybersecurity exam and any released items. For a deep dive on Unit 1 vocabulary specifically, see our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-unit-1-vocabulary-ranked">tiered Unit 1 vocabulary ranking</a>. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
