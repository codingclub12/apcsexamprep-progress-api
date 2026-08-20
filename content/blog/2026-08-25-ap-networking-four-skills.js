'use strict';
// Weekly course post: AP Networking. Deep dive on the four assessed skills
// (Connect and Configure, Secure, Troubleshoot, Collaborate). Deliberately NOT
// another pilot-vs-launch piece, that ground is already covered in depth by
// 2026-08-18-ap-networking-pilot-year.js. This post's job is the skill grid
// that post only mentions briefly.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, About AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/about', asOf: 'August 2026' },
};

const SECTIONS = [
  'The AP Networking exam is built around skills, not units',
  'Connect and Configure: do you understand what a setting does',
  'Secure: protecting the network, not the device',
  'Troubleshoot: the skill the whole course is built around',
  'Collaborate: the skill almost no student practices',
  'Why the same topic can produce four different kinds of questions',
  'How to actually study for a skills-based exam',
];

const meta = {
  title: 'The Four Skills the AP Networking Exam Actually Tests',
  handle: 'ap-networking-four-skills-explained',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking exam',
  publishOn: '2026-08-25',
  seoTitle: 'AP Networking Exam: The Four Skills It Actually Tests',
  seoDescription: 'The AP Networking exam is weighted around four skills, not the four units. What Connect and Configure, Secure, Troubleshoot, and Collaborate each really test.',
  summary: 'AP Networking is weighted around four assessed skills rather than around its four units: Connect and Configure, Secure, Troubleshoot, and Collaborate. A deep look at what each one actually tests, worked examples of what a question testing each skill looks like, and why that structure should change how you study.',
  tags: ['AP Networking', 'Exam Skills', 'Course Guide', 'Study Strategy', 'Career Kickstart'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Ask most AP Networking students what unit a question is testing and they can usually tell you. Ask them what skill it is testing and most cannot, even though skill, not unit, is how the AP Networking exam is actually built.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('This is true whether the exam in front of you is the multiple-choice-only pilot exam running in participating schools through the 2026-27 year, or the launched exam that follows it with free response added, the skill structure underneath is the same in both.'),
  H.p('The rest of this piece is a genuine deep dive into what each of the four skills is actually asking of you, with a worked example of what a question testing that specific skill looks like in practice, so you can learn to recognize the skill a question is testing before you have even finished reading it.'),

  H.h2(SECTIONS[0]),
  H.p('Most AP courses organize the way people talk about them around content: this unit covers this topic, that unit covers that one, and a practice question is filed under whichever unit taught the vocabulary it uses. AP Networking does something structurally different. The course framework groups its assessed abilities into four skills that cut across every unit, and every scenario question is written to test one of those four skills first, with the unit content as the material the skill is applied to.'),
  H.sourceNote(SRC.cb.source, SRC.cb.url, SRC.cb.asOf),
  H.p('The four skills are Connect and Configure, Secure, Troubleshoot, and Collaborate. That is the entire list, and it is worth memorizing in that order because a huge amount of exam prep confusion disappears once you internalize that a question is not really asking "what do you know about wireless addressing," it is asking "can you troubleshoot, using wireless addressing as the material."'),
  H.box('key', 'The idea in one sentence', '<p>A question can be drawn from any of the four units while testing any one of the four skills. Unit tells you what the question is about. Skill tells you what the question wants you to do with it.</p>'),
  H.p('This is not a small distinction and it is not academic. A student who studies by re-reading unit content is preparing for a test that does not exist. A student who studies by practicing each of the four skills, deliberately, across whatever content happens to be in front of them, is preparing for the actual exam. The rest of this article exists to make each of those four skills concrete enough that you can recognize one on sight.'),

  H.h2(SECTIONS[1]),
  H.p('Connect and Configure sounds like the most straightforward of the four skills, and it is the one students most reliably underrate, because it looks like a memory test and it is not. A Connect and Configure question hands you a scenario and a requirement, and asks you to choose or apply the correct setting to satisfy it. The trap is that most of the wrong answers on a well written Connect and Configure question are settings that exist and that a student could locate in a real interface without any trouble. What separates the right answer from the wrong ones is not knowing where a setting lives, it is understanding what the setting actually does once it is applied.'),
  H.p('That is the whole skill, stated plainly: does this setting produce the outcome the scenario is asking for, or does it just sound like it belongs in the same menu. A student who has memorized a list of network settings without understanding their effects will get every one of these questions half right, because half the wrong answers are real settings pointed at the wrong problem.'),
  H.box('tip', 'What a Connect and Configure question looks like', '<p>A small office wants two departments on the same physical network to be unable to see each other\'s traffic, while both departments still need internet access through the same router. Which configuration change accomplishes this. The correct answer separates the departments logically, at the level the scenario actually requires, rather than reaching for a setting that sounds secure but does not address traffic visibility between two groups sharing one physical network.</p>'),
  H.p('Notice what makes that a Connect and Configure question rather than a Secure one: the goal is a working setup that meets a stated requirement, not a defense against a described threat. The line between the two skills is thinner than it looks, and it is worth learning to feel where it sits.'),

  H.h2(SECTIONS[2]),
  H.p('Secure asks you to apply appropriate protection to a network given a described risk or requirement. It sits next to AP Cybersecurity conceptually, and the overlap is real, but the angle of approach is different in a way that matters for how you prepare. AP Cybersecurity\'s device-side questions tend to ask about protecting a machine, its data, and the person using it. AP Networking\'s Secure questions ask about protecting the paths traffic takes and the boundaries between parts of a network, which is a network-side question even when the underlying vocabulary, encryption, authentication, access control, sounds similar. Our <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity course guide</a> covers the device side in full if you want to see the contrast directly.'),
  H.p('A Secure question is rarely asking you to name a security concept in the abstract. It is asking you to match a specific protection to a specific, described risk, and a common wrong answer pattern is a real protection aimed at the wrong layer of the problem, protecting something the scenario never put at risk while leaving the actual exposure untouched.'),
  H.box('tip', 'What a Secure question looks like', '<p>A school\'s guest wifi network and its staff wifi network currently share the same wireless access points and the same address range, and a staff member is concerned a guest device could reach the staff printers and file shares. Which change best addresses the concern. The right answer isolates guest traffic from staff traffic at the network level, rather than simply adding a stronger wifi password, which would raise the bar to join the network without doing anything to separate guest devices from staff resources once they are already on it.</p>'),
  H.p('The tell in that example is the same tell that shows up across most Secure questions: a plausible-sounding answer that raises a barrier somewhere, and a correct answer that raises the barrier specifically where the described risk actually lives.'),

  H.h2(SECTIONS[3]),
  H.p('Troubleshoot is explicitly the skill the course is built around, and it is the one most exam scenarios will lean on in some form, even ones that are nominally testing something else. A Troubleshoot question describes a symptom and asks you to identify the most likely cause, and the entire skill lives in one habit: using the evidence the scenario gives you to eliminate implausible causes, rather than guessing from the symptom alone.'),
  H.p('We have written a full piece on the mechanics of this reasoning pattern using real wifi problems as the vehicle, so this section will not rebuild that ground. What matters here is naming the skill precisely: Troubleshoot questions are not testing whether you can list possible causes of a network problem, most students can do that. They are testing whether you can use the specific evidence given to rule causes out, arriving at the one explanation the evidence actually supports rather than the one that merely sounds dramatic.'),
  H.box('tip', 'What a Troubleshoot question looks like', '<p>A remote employee reports their video calls freeze every day around the same time, but their file downloads and web browsing remain fast throughout. Their household internet plan and speed have not changed. What is the most likely cause. The steady download and browsing speed rules out a general connection problem, which points toward something specific to the demands of real-time video, most likely contention on the local network during a predictable daily peak rather than any single dramatic failure.</p>'),
  H.p('The exam rewards exactly the instinct that scenario is built to test: read every fact in the prompt as evidence that eliminates something, not as scene setting.'),

  H.h2(SECTIONS[4]),
  H.p('Collaborate is the skill students dismiss fastest and it is the one that most reliably costs points, precisely because almost nobody arrives at the exam having practiced it. The skill is communicating technical findings to other people, including people who are not technical, and it is an explicitly assessed part of the course rather than a soft add-on. Networking work in the real world is not solitary: a technician who correctly diagnoses a problem but cannot explain it to the person who has to approve the fix, or the person affected by the outage, has only done half the job.'),
  H.p('A Collaborate question typically asks you to choose the explanation, summary, or next step that best communicates a technical situation to a described, often non-technical, audience. The wrong answers are usually technically accurate. That is what makes this skill hard for strong technical students specifically: the trap is not a factual error, it is an explanation that is correct but useless to the person receiving it, dense with jargon a manager or a customer has no reason to know.'),
  H.box('tip', 'What a Collaborate question looks like', '<p>A network technician has determined that a store\'s point of sale system is slow because too many devices are competing for a shared wireless connection during business hours. The store manager, who has no technical background, wants to know what is wrong and whether it will keep happening. Which response best fits the situation. The correct answer explains the cause and its pattern in plain terms and states clearly what will change, rather than describing the same finding in technical vocabulary the manager has no way to evaluate.</p>'),
  H.p('That skill does not build itself by accident. It has to be practiced on purpose, on purpose being the operative phrase in the study strategy below.'),

  H.h2(SECTIONS[5]),
  H.table(
    ['Skill', 'Question is really asking', 'Common wrong-answer trap'],
    [
      ['Connect and Configure', 'Will this setting produce the required outcome', 'A real setting aimed at the wrong outcome'],
      ['Secure', 'Does this protection address the specific described risk', 'A real protection aimed at the wrong layer'],
      ['Troubleshoot', 'What does the evidence actually rule out', 'The dramatic cause the evidence does not support'],
      ['Collaborate', 'Will this explanation land with this specific audience', 'A technically correct answer full of jargon'],
    ]
  ),
  H.p('Lay it out that way and a pattern becomes visible: the same Unit 2 addressing scenario could be rewritten as a Connect and Configure question by asking what to set up, a Secure question by asking what to protect, a Troubleshoot question by asking what went wrong, or even a Collaborate question by asking how to explain the fix. The content supplying the scenario barely has to change. What changes is the verb the question is actually built around, and that verb is the skill.'),
  H.p('This is why studying unit by unit and stopping there leaves a gap. It is entirely possible to know the content of a unit cold and still miss a question drawn from it, because the question was never really testing the content. It was testing whether you could configure with it, secure with it, troubleshoot with it, or explain it, and those are four separate abilities layered on top of the same material.'),

  H.h2(SECTIONS[6]),
  H.p('If the exam tests skills rather than pure content recall, then reviewing notes is a weaker preparation method than it feels like, because reviewing notes mostly rebuilds recall and does very little to build the reasoning pattern each skill actually requires. The stronger approach is to practice each skill as its own kind of exercise, deliberately, the way you would practice a physical skill rather than memorize a fact.'),
  H.ul([
    '<strong>Practice Connect and Configure by predicting outcomes before you check them.</strong> Before changing any setting on a real device, write down what you expect to happen. Then check. The gap between your prediction and reality is exactly the gap this skill is testing.',
    '<strong>Practice Secure by naming the specific risk before naming the fix.</strong> For any protection you learn about, force yourself to state the exact risk it addresses in one sentence. If you cannot, you have memorized a term rather than understood a defense.',
    '<strong>Practice Troubleshoot on a real network you actually use.</strong> Every time something breaks at home, resist the urge to restart things at random. Write down the symptom, list a few candidate causes, and use what still works to eliminate them before you act. This builds the elimination habit directly, on a problem you have a real reason to solve.',
    '<strong>Practice Collaborate by explaining a fix to a non-technical family member.</strong> After solving anything technical, actually explain it out loud to someone who was not there for the diagnosis, in plain language, and notice which parts of your explanation lose them. That reaction is the feedback this skill has no other way to get.',
  ]),
  H.p('None of those four practices require a lab you do not have access to, and none of them require a released exam, which AP Networking does not yet have. What they require is treating study time as skill practice rather than content review, which is the single biggest adjustment worth making for a course built the way this one is.'),
  H.p('Our <a href="/pages/ap-networking">AP Networking course guide</a> works through all four units with this skill structure in mind, and the <a href="/pages/ap-networking-exam">exam page</a> covers the format both exams share in more detail.'),

  H.h2('Two questions in the exam style'),
  H.p('Both are written the way real scenario questions are built. Before opening either answer, decide which of the four skills the question is actually testing, not just what unit it draws from.'),
  H.mcq({
    n: 1,
    stem: 'A small nonprofit has one internet connection and needs its office staff computers to reach shared file storage and the internet, while a separate set of donated laptops used only for public visitor internet access must never be able to reach the staff file storage, though both groups should keep working if the other group\'s devices are all powered off. Which approach best meets these requirements?',
    options: [
      'Give every device on both groups a stronger individual password',
      'Place the staff devices and the visitor devices on separate logical networks that share the same internet connection',
      'Turn off the visitor laptops\' wifi and require an ethernet cable for those devices only',
      'Install antivirus software on every device in both groups',
    ],
    correct: 1,
    why: 'This is a Connect and Configure question, not a Secure one, because the scenario is not describing a threat to defend against, it is describing a working arrangement that has to be set up correctly: two groups that both need internet access, one of which must never reach the other\'s resources, with independence from whether the other group\'s devices are even running. Logical separation on shared infrastructure satisfies exactly that requirement. A stronger password and antivirus software are real settings that exist, but neither one separates two groups sharing one network, and requiring a cable does not address reachability between the groups at all. The skill being tested is whether you understand what network separation actually accomplishes, not whether you can name security-sounding options.',
  }),
  H.mcq({
    n: 2,
    stem: 'A network technician has just finished explaining to a small business owner, who has no technical background, that the office wifi has been slow because too many personal phones were connecting to it and using bandwidth meant for work devices. The owner asks what to tell their staff. Which response should the technician give the owner?',
    options: [
      '"I have segmented the network to enforce quality of service policies that prioritize business-critical traffic over consumer bandwidth consumption."',
      '"Just tell everyone to use less data, it should sort itself out eventually."',
      '"I have set up a separate wifi network for personal phones so work devices always get priority. Ask staff to connect personal phones to the new \'Guest\' network instead."',
      '"The router firmware was outdated and I have flashed it with the latest build, which should resolve the throughput bottleneck."',
    ],
    correct: 2,
    why: 'This is a Collaborate question. The underlying technical fix, separating personal devices from work devices onto their own network, is the same idea buried in the first and fourth options, but those two are written in language the owner has no way to evaluate or act on, which fails the actual task the scenario describes: giving the owner something to tell staff. The second option is plain language but gives no concrete instruction and does not reflect what was actually done. The third option states the fix and gives the owner a specific, actionable instruction to pass along, in language a non-technical person can use immediately. The skill being tested is not whether the technician understood the problem, the scenario already establishes that they did, it is whether the explanation is fit for the audience receiving it.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What are the four skills tested on the AP Networking exam?', a: 'Connect and Configure, Secure, Troubleshoot, and Collaborate. The exam is weighted around these four skills rather than strictly around the course\'s four units, and a single question can draw its content from any unit while testing any one of the four skills.' },
    { q: 'Which AP Networking skill is the exam most built around?', a: 'Troubleshoot. It is explicitly the skill the course is built to teach, and elements of it show up in scenario questions that are nominally testing other skills too, since most real network problems involve some diagnostic reasoning.' },
    { q: 'What does the Collaborate skill actually test on AP Networking?', a: 'Communicating a technical finding to a described audience, often a non-technical one, in a way that is actually useful to them. Questions testing this skill usually offer several technically accurate explanations and reward the one written in language the specific audience in the scenario could use.' },
    { q: 'Is the Secure skill in AP Networking the same as AP Cybersecurity?', a: 'They overlap but are not the same. AP Networking\'s Secure skill approaches protection from the network side, securing paths and boundaries between systems, while AP Cybersecurity\'s device-side questions focus more on protecting an individual machine, its data, and its user.' },
    { q: 'How should I study for a skills-based exam like AP Networking?', a: 'Practice each skill as its own kind of exercise rather than only reviewing unit content. Predict outcomes before configuring settings, name the specific risk before naming a fix, use elimination-based reasoning on a real network when something breaks, and practice explaining technical fixes to a non-technical person.' },
  ]),

  H.cta({
    heading: 'Study the skills, not just the units',
    body: 'Work through all four AP Networking units with Connect and Configure, Secure, Troubleshoot, and Collaborate built into the practice.',
    links: [
      { href: '/pages/ap-networking', text: 'Start the course guide' },
      { href: '/pages/ap-networking-exam', text: 'See the exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP Networking course framework current in August 2026. Last reviewed August 25, 2026.'),
]);

module.exports = { meta, body };
