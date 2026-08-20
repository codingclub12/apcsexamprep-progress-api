'use strict';
// Weekly course post: AP Cybersecurity. Drill piece: how to write the device
// security analysis free response, since no released exams exist to study yet.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, AP Cybersecurity Course and Exam Description', url: 'https://apcentral.collegeboard.org/courses/ap-cybersecurity', asOf: 'August 2026' },
};

const SECTIONS = [
  'Why the AP Cybersecurity FRQ is harder than it looks',
  'The four paragraph structure to write under a 50 minute clock',
  'A full worked example: a school issued laptop',
  'Time management for the 50 minute window',
  'Two scenarios to practice on your own',
];

const meta = {
  title: 'How to Write the AP Cybersecurity FRQ, Paragraph by Paragraph',
  handle: 'ap-cybersecurity-device-security-frq-guide',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity frq',
  publishOn: '2026-08-18',
  seoTitle: 'AP Cybersecurity FRQ: How to Write It Step by Step',
  seoDescription: 'A paragraph by paragraph method for the AP Cybersecurity FRQ, the device security analysis, with a full worked example and a 50 minute time plan.',
  summary: 'The AP Cybersecurity FRQ is a device security analysis with no released exams to study from. A teacher breakdown of the four paragraph structure that earns reasoning marks, a full worked example on a school issued laptop, a 50 minute time budget, and two scenarios to practice writing on your own.',
  tags: ['AP Cybersecurity', 'Free Response', 'FRQ', 'Exam Prep', 'Device Security'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The AP Cybersecurity FRQ is the single free response question on the exam: a device security analysis you build from a scenario, not a definition you recall. Most students have been taught what security terms mean and never taught how to structure an answer under a timed clock. This is the paragraph by paragraph method, plus a full worked example, for writing an AP Cybersecurity FRQ that actually earns the reasoning marks.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Here is the thing nobody tells students about the AP Cybersecurity FRQ before they sit down to write one for the first time: it is not a knowledge test. You are handed a scenario, a device or a small system with some specific details attached, and asked to analyze its security posture and justify what you would do about it. There is no definition to recall that gets you full credit. There is no formula to plug numbers into. It is closer to writing a short structured argument than answering a quiz question, and almost nobody teaches students how to write structured arguments under exam conditions before their senior year of English, if then.'),
  H.p('That gap matters more here than it would in most courses, because AP Cybersecurity does not currently have a bank of released free response questions for students to study from the way AP Computer Science A does. There is no decade of graded samples to look at and reverse engineer what the readers reward. Every practice scenario a student works through, including the ones in this guide, is an informed reconstruction from the course framework rather than a released item with real scoring notes attached. That makes structure the single highest leverage thing to teach, because structure is portable across scenarios in a way that memorized facts about any one device are not.'),
  H.p('Students who study only vocabulary walk into this task knowing what confidentiality means and freezing anyway, because knowing what a term means and knowing how to apply it inside a four part argument, in fifty minutes, are different skills. The good news is that the second skill is teachable and drillable in a way the first one already is. That is what the rest of this guide is for.'),
  H.box('warn', 'The mistake this guide exists to fix', '<p>Students who prepare for this course by making flashcards of security terms are preparing for the multiple choice section. The free response rewards something else entirely: reasoning about a specific scenario, in a specific order, with a specific eye toward trade-offs. A student who has never practiced writing that reasoning out loud will not discover how in the exam room.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Give yourself a structure you can rely on before you have even finished reading the prompt, so the fifty minutes go toward applying it rather than inventing one from scratch. Four paragraphs, in this order, each answering one question and only one question.'),

  H.h3('Paragraph 1: what is actually worth protecting here'),
  H.p('Name the specific assets the scenario describes, not a generic list you memorized. A prompt about a point of sale system is not protecting "data" in the abstract. It is protecting customer card numbers during a transaction, the register\'s access to the store network, and maybe the owner\'s ability to process any sale at all if the system goes down. Vague answers here cost credit even when every word in them is technically true, because the task is asking you to read the scenario, not recite a category.'),

  H.h3('Paragraph 2: how an attacker would most plausibly reach it'),
  H.p('Reason from the specific details in the prompt, not from a list of attack types you learned in Unit 3. If the scenario tells you the device connects over public guest wifi, that is your entry point, not a generic mention of network attacks in the abstract. If the scenario tells you an employee has admin rights they rarely use, that is your entry point instead. The scenario is giving you evidence on purpose. The strongest answers use nearly every specific detail the prompt hands you, and the weakest answers use none of them and describe a threat that could apply to any device anywhere.'),

  H.h3('Paragraph 3: the one control you would apply first, and why that one'),
  H.p('Pick a single control and defend picking it over the alternatives you are not choosing. This is the paragraph where students often name three controls and hope one of them sticks. Do the opposite. Name one, and explicitly say why it addresses the specific attack path from paragraph two better than another control would. "I would apply multi factor authentication rather than a longer password policy, because the attack path here is a phished credential, and a longer password does nothing once the attacker already has the correct one" is a paragraph that earns credit. A list of four plausible controls with no ranking is a paragraph that does not.'),

  H.h3('Paragraph 4: what you gave up by applying it'),
  H.box('key', 'This is the paragraph students skip, and where the reasoning marks live', '<p>Every real control costs something: usability, speed, money, staff time, or convenience. Naming that cost, and naming it honestly rather than hand waving it, is what shows a reader you understand security as a set of trade-offs rather than a set of fixes. A student who writes three strong paragraphs and skips this one has demonstrated recall dressed up as analysis. A student who writes a shorter version of paragraphs one through three but nails this one has demonstrated the actual skill the course is trying to teach.</p>'),
  H.p('Under time pressure, paragraph four is the first thing students cut, because paragraphs one through three feel like the "real" answer and four feels optional. It is not optional. It is frequently the paragraph that separates a response that names the right fix from a response that understands security. Budget for it on purpose, which the next section covers directly.'),

  H.h2(SECTIONS[2]),
  H.p('Structure is easier to hold onto with a full example in front of you, so here is one complete scenario and a full four paragraph response written to the structure above.'),
  H.box('tip', 'The scenario', '<p>Lincoln High issues a Windows laptop to every incoming ninth grader through a device management program. Students use the laptop for classwork, state testing during a fixed testing week each spring, and personal browsing at home in the evenings. The laptop\'s browser is set to save usernames and passwords by default, and the school\'s IT policy currently sets the screen to lock after fifteen minutes of inactivity. Laptops travel home on a bus every night and are not collected over weekends.</p>'),

  H.h3('Sample response'),
  H.p('<strong>What is worth protecting.</strong> The laptop holds more than the student\'s own schoolwork. Its browser stores saved login credentials, which likely include the student\'s school email and possibly personal accounts they logged into out of habit. During the fixed testing week each spring, it also temporarily caches secure testing content that the school is contractually obligated to keep confidential until the exam window closes. Beyond stored data, the laptop is a trusted, already authenticated device on the school network, so whoever controls it can reach whatever that network reaches, not just the files physically stored on the machine.'),
  H.p('<strong>How an attacker would most plausibly reach it.</strong> The most realistic path here is not a remote hacking attempt, it is physical access to an unattended device. The laptop travels home on a bus daily and sits uncollected over weekends, which means it spends most of its life outside adult supervision. Combined with saved browser credentials and a fifteen minute lock window, a lost or briefly unattended laptop hands over an already logged in browser session to whoever picks it up, with no password required at all. The threat here is opportunistic physical access, not a sophisticated remote attacker, and the scenario is telling us that directly through the details about travel and storage.'),
  H.p('<strong>The control I would apply first, and why.</strong> I would shorten the auto lock timeout to roughly two minutes and enforce full disk encryption through the existing device management profile, before adding anything else. I am choosing this over, for example, a stronger password policy, because the attack path identified above does not depend on guessing a password at all. It depends on physical access to a device that is already unlocked or whose contents are readable without the login screen ever being challenged. A short lock timeout closes the unattended session window, and disk encryption makes the stored data unreadable even if the device is removed entirely, which directly answers the specific way this laptop is exposed rather than a way it merely could be exposed in general.'),
  H.p('<strong>What this control costs.</strong> A two minute timeout is a real usability cost for ninth graders who are still learning to manage their own devices, and it will generate a measurable rise in help desk tickets for forgotten passwords and re-logins during class, particularly in the first weeks after the change. Full disk encryption also adds a small but real performance cost on older hardware, which could matter during the timed state testing week specifically, the one week the scenario tells us the stakes are highest. A responsible rollout would test the performance impact on the oldest devices in the fleet before the testing window arrives, and pair the shorter timeout with staff training so students are not simply frustrated by it with no explanation. None of that erases the benefit, but it is a real cost, and naming it honestly is part of the analysis, not a footnote to it.'),

  H.h2(SECTIONS[3]),
  H.p('Fifty minutes disappears fast once you are actually writing, so budget it before the clock starts rather than while it is running.'),
  H.ol([
    '<strong>First five to seven minutes, read and plan.</strong> Read the scenario twice. The first pass is for the story, the second pass is for underlining the specific details you will use in paragraphs one and two. Jot the control you plan to name in paragraph three before you write a single sentence of prose, so you are not still deciding while the clock runs.',
    '<strong>Roughly ten minutes on paragraph one.</strong> Identify the assets, specifically, and stop. This is the paragraph students most often over-write, because it feels safe and concrete compared to the reasoning-heavy paragraphs that follow. A long, thorough asset list is not worth more than a focused one that names the two or three assets that actually matter to the scenario.',
    '<strong>Roughly twelve minutes each on paragraphs two and three.</strong> This is where the scenario-specific reasoning lives, and it is worth protecting the time for it. Reference the prompt\'s own details rather than general knowledge, and pick one control rather than a list.',
    '<strong>Protect at least ten minutes for paragraph four, no matter what.</strong> This is the instruction worth writing at the top of your scratch paper before the exam even starts. If time is short anywhere, shorten paragraph one, not paragraph four. A brief but honest trade-off paragraph earns more than a padded asset list and a rushed, one sentence afterthought about cost.',
    '<strong>Final few minutes, reread against the four questions.</strong> Does each paragraph actually answer the question it is supposed to answer, or does it drift into repeating the paragraph before it? A fast check against the four part structure catches more lost credit than a grammar pass does.',
  ]),
  H.box('warn', 'The single most common time mistake', '<p>Students who have not practiced this structure consistently spend too long on paragraph one, describing assets in loving detail, and then discover with ten minutes left that they have not yet reasoned about the attack path, the control, or the trade-off. Paragraph one is the easiest paragraph and the one that rewards elaboration the least. Write it lean on purpose so paragraph four, the hardest and highest value paragraph, gets the time it needs.</p>'),
  H.p('One more thing worth knowing before you sit for the real exam: read our <a href="/pages/ap-cybersecurity-course">AP Cybersecurity course overview</a> for how this single free response fits against the multiple choice section, since the two sections are not weighted the way most students first assume.'),

  H.h2(SECTIONS[4]),
  H.p('The only way this structure becomes automatic is repetition, and repetition needs new scenarios, not the same one memorized twice. Work through both of these on your own paper, four paragraphs each, under a timer if you can manage it. No answer key follows on purpose. Writing your own response, cold, is the entire point of the drill.'),
  H.box('key', 'Practice scenario A: the small business point of sale system', '<p>A neighborhood coffee shop uses a single tablet based point of sale system connected to the shop\'s wifi network, which is the same network customers use for free guest access. The tablet stores the last thirty days of transaction history locally for the owner\'s bookkeeping, and staff log into it with one shared PIN that has not been changed since the shop opened two years ago. Write a four paragraph analysis: what is worth protecting, how an attacker most plausibly reaches it, the one control you would apply first and why, and what applying it costs.</p>'),
  H.box('key', 'Practice scenario B: the home security camera', '<p>A family installs an internet connected camera at their front door, controlled through a phone app, and set up in about ten minutes using the manufacturer\'s default settings straight out of the box. The camera streams video to the cloud continuously and can be viewed remotely from anywhere. The household has never changed the device\'s default admin password because nobody was ever prompted to. Write a four paragraph analysis: what is worth protecting, how an attacker most plausibly reaches it, the one control you would apply first and why, and what applying it costs.</p>'),
  H.p('If you want more scenarios built to the same shape as the exam, our <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> covers the unit content each scenario draws on, and the <a href="/pages/ap-cybersecurity-practice-exam">practice exam</a> pairs multiple choice practice with the same free response method taught here.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'How long is the AP Cybersecurity free response?', a: 'The free response section is a single device security analysis question, and students have fifty minutes to complete it. There is only one task in the section, unlike courses that split the free response time across several shorter questions.' },
    { q: 'Is there a released AP Cybersecurity FRQ to practice with?', a: 'Not yet. The course launched nationally in 2026-27 with the first official exam administered in May 2027, so no released free response questions exist. Practicing with well built original scenarios, using a consistent structure, is the available alternative until released items exist.' },
    { q: 'Do I need to memorize a lot of vocabulary to write a strong device security analysis?', a: 'Vocabulary helps you name the control you are recommending precisely, but it does not substitute for structure. A student who knows every term but never practiced organizing an answer into assets, attack path, control, and trade-off will still struggle to write a complete response under fifty minutes.' },
    { q: 'What is the biggest reason students lose credit on this free response?', a: 'Two patterns show up most often. The first is describing threats in generic terms instead of reasoning from the scenario\'s specific details. The second is skipping or rushing the trade-off paragraph, which is where reasoning about a control\'s cost, not just its benefit, is most directly rewarded.' },
    { q: 'Should I name more than one control in paragraph three?', a: 'No. Naming one control and defending it against the alternatives you are not choosing demonstrates a clearer judgment call than listing several plausible controls with no ranking between them. A focused answer reads as a decision. A list reads as a shrug.' },
  ]),

  H.cta({
    heading: 'Practice the full AP Cybersecurity exam format free',
    body: 'Multiple choice questions built to the real exam style, plus free response scenarios that follow the structure taught in this guide.',
    links: [
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam' },
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study the full curriculum', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is updated as College Board publishes further detail on the AP Cybersecurity free response and any released scoring guidance. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
