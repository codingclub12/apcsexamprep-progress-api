'use strict';
// Weekly course post: AP Networking. Test-taking mechanics piece, deliberately
// NOT a third version of the elimination-reasoning method already covered in
// depth by 2026-08-18-ap-networking-troubleshooting-method.js and
// 2026-08-25-ap-networking-ping-traceroute.js. Those two teach how to reason
// about the network problem once you know what is being asked. This post
// teaches how to correctly parse what is actually being asked in the first
// place, which is a separate failure mode from reasoning about it wrong.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'A reading failure is a different mistake than a reasoning failure',
  'How AP Networking scenarios are structured',
  'The trap: FIRST, MOST LIKELY, and BEST are not the same question as "what is wrong"',
  'Matching the phrasing to one of the four skills',
  'Worked example one: a wireless connectivity report',
  'Worked example two: a slow point of sale system',
];

const meta = {
  title: 'The Anatomy of AP Networking Scenarios',
  handle: 'ap-networking-scenario-question-anatomy',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking scenarios',
  publishOn: '2026-09-01',
  seoTitle: 'AP Networking Scenarios: How to Read the Question',
  seoDescription: 'How AP Networking scenarios are built: the setup, the evidence, and the actual question, so you stop losing points to misreading rather than misunderstanding.',
  summary: 'Two earlier posts on this blog taught how to reason about a network problem once you understand what is being asked. This one teaches how to correctly parse what is actually being asked in the first place. A breakdown of scenario structure, a common reading trap around FIRST and MOST LIKELY questions, how to spot which of the four skills a question is testing from its phrasing, and two fully worked examples.',
  tags: ['AP Networking', 'Study Skills', 'Course Guide', 'Test Taking', 'Exam Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Two earlier posts on this blog taught you how to reason about a network problem once you understand what is being asked. This post is about the step before that: correctly parsing what is actually being asked in the first place. Misreading the question is its own way to lose points, separate from misunderstanding the network.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('We have already covered how to reason through <a href="/pages/ap-networking">AP Networking</a> scenarios in depth: use what still works to eliminate causes, and reach for ping and traceroute when you need more evidence than what you already have lying around. Both of those pieces assume you have correctly understood what a scenario is asking before you start reasoning about it. That assumption is worth checking, because it is not always true.'),
  H.p('This piece fills a different gap. AP Networking scenarios are not written the way a textbook question is written, with the thing being asked stated plainly in the first sentence. They are written the way a real workplace report arrives: a person, a device, something that happened, some surrounding detail, and then, often buried near the end and often narrower than it first appears, the actual question. A student who reasons perfectly about the network but reads the question loosely will pick a technically defensible answer to a question nobody asked, and lose the point anyway. That is a separate, and genuinely common, failure mode from getting the networking content wrong, and it deserves its own study time rather than getting folded into general troubleshooting practice.'),

  H.h2(SECTIONS[0]),
  H.p('It is worth being precise about the difference between these two kinds of mistakes, because they feel similar from the inside and they are fixed in completely different ways.'),
  H.ul([
    '<strong>A reasoning failure</strong> is not knowing which cause the evidence actually supports. You understood the question correctly, but you eliminated the wrong candidate, or failed to eliminate any of them, or picked the dramatic explanation the evidence was there to rule out. This is what the elimination method fixes, and it is what the two earlier posts on this blog are about.',
    '<strong>A reading failure</strong> is answering a different question than the one that was asked. You understood the network problem correctly. Your answer would be right if the question had asked something slightly different than it did. You did not misjudge the evidence, you misjudged the target.',
  ]),
  H.p('A reading failure is more frustrating than a reasoning failure precisely because the student was not wrong about anything technical. On review, they can usually explain the network problem correctly out loud. What went wrong is invisible unless you go back and read the actual question stem word for word, which is exactly the habit this post is trying to build.'),
  H.box('key', 'Two separate skills, two separate fixes', '<p>Reasoning about a network problem and parsing what a question is asking about that problem are two different abilities. You can be strong at one and still lose points to the other. Practising the elimination method builds the first. This post is entirely about building the second.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Once you start reading AP Networking scenarios with this in mind, a consistent structure appears underneath almost every one of them, even though the surface wording varies a lot. There are four parts, and they arrive in roughly this order.'),
  H.ul([
    '<strong>The setup.</strong> Who or what this is about, and where. A student, a small business owner, a remote employee, a school IT department. A laptop, a printer, a point of sale terminal, a whole office network. This part is establishing the scene and rarely contains the answer by itself, but it often matters for later parts, especially anything about who has to act on the answer.',
    '<strong>The symptom or event.</strong> What happened, or what is being reported. A connection dropped, a page will not load, an account still has access it should not, a video call keeps freezing. This is usually the sentence that feels like the heart of the question, and it is the part students read most carefully. It is also, on its own, almost never enough to answer anything.',
    '<strong>The additional evidence.</strong> What does or does not work, what changed recently, what a technician already checked and ruled out. This is the part the elimination method from the earlier posts is built to use. It is also the part students skim fastest, because it often reads like scene-setting detail rather than information, and on this exam it almost never is.',
    '<strong>The actual question being asked.</strong> The last sentence, usually, and the one place a scenario tells you exactly what kind of answer earns the point. This is the part this post is specifically about, because it is the part most likely to be narrower than the rest of the scenario made it feel.',
  ]),
  H.p('That fourth part deserves its own emphasis, because it is where a well-understood scenario most often goes wrong. A question can spend three sentences describing a genuinely serious underlying problem and then ask something much more specific and much more measured than "what is ultimately wrong here." It might ask what the technician should check first, or what explains the pattern of evidence given, or what to tell someone who is not technical. Every one of those is a different task than diagnosing the root cause, even when the root cause is sitting right there in the scenario and is obvious to you.'),
  H.box('tip', 'A fast way to check yourself', '<p>Before you look at any option, cover them and answer this in one sentence: what, specifically, is this question asking me to produce? A diagnosis? A next step? An explanation for someone else? If you cannot state that in one sentence, you have not finished reading the question yet, no matter how well you understood the scenario.</p>'),

  H.h2(SECTIONS[2]),
  H.p('This is the single most common way a student who understands the networking content still loses a point on a scenario question. A question does not ask what is wrong. It asks what should be checked first, what is the most likely cause given the evidence, or what is the best next action. Those three phrasings sound close to "what is wrong," and they are not the same question at all.'),
  H.p('"What should be checked first" is asking for the smallest, cheapest, most immediate step that makes sense given what is already known, not the eventual fix and not the most thorough possible investigation. "Most likely cause" is asking you to weigh the evidence given and pick the explanation it best supports, not every explanation that is technically possible. "Best next action" is asking for a measured, appropriate step given where the situation currently stands, not the most drastic action that would definitely solve the underlying issue if it turned out to be the actual cause.'),
  H.p('The trap answer on questions like these is almost always technically true in isolation. Replacing a piece of hardware would, in fact, solve a hardware failure. Rebuilding an entire configuration from scratch would, in fact, eliminate a misconfiguration wherever it happened to be hiding. Escalating immediately to the most senior available person would, in fact, get the problem in front of someone who could fix it. None of those are wrong as facts. They are wrong as answers, because the question asked for something more measured than that, and picking the drastic, technically-correct-sounding option instead of the one the question actually asked for is a real and recurring way to lose points despite understanding the networking content correctly.'),
  H.box('warn', 'The tell to watch for', '<p>If an option would only make sense after everything smaller and cheaper had already failed, and the question asked for a first step, that option is not describing the wrong network fact, it is answering the wrong question. Reread the question stem, not the scenario, before choosing it.</p>'),

  H.h2(SECTIONS[3]),
  H.p('AP Networking scenarios are built to test one of four skills: Connect and Configure, Secure, Troubleshoot, or Collaborate. Recognizing which one a question is actually testing, before you evaluate a single option, tells you what kind of answer is being rewarded, and that turns out to be readable directly from the question\'s phrasing, not from the topic the scenario happens to be about.'),
  H.table(
    ['Skill', 'What the phrasing usually looks like', 'What kind of answer wins'],
    [
      ['Connect and Configure', 'Asks what setting, configuration, or setup accomplishes a stated requirement', 'The setting that actually produces the required outcome, not one that merely sounds related'],
      ['Secure', 'Asks what protects against, prevents, or restricts a described risk or exposure', 'The protection aimed at the specific risk described, not a real protection aimed at the wrong layer'],
      ['Troubleshoot', 'Asks what is the cause, what should be checked, or what the evidence points to', 'A diagnostic answer built from the evidence given, appropriately scoped to what was actually asked'],
      ['Collaborate', 'Asks what to tell, explain, or communicate to a specific person or audience', 'The explanation that actually lands with that audience, not the most technically complete one'],
    ]
  ),
  H.p('That last row is the one students most often misjudge, because a Collaborate question can be built on top of a completely correct technical diagnosis and still reward a different kind of answer than the diagnosis itself. If a question names an audience, a manager, a customer, a coworker without the same background, and asks what to tell them, it is testing whether your answer fits that audience, not whether you can restate the technical finding accurately. A dense, jargon-correct explanation is the exact trap answer on a Collaborate question, in the same way a drastic overcorrection is the trap answer on a narrowly scoped Troubleshoot question.'),
  H.p('Learning to spot the skill from the phrasing, before reading the options, does real work. It tells you in advance what a correct answer has to accomplish, so you are evaluating each option against the actual target instead of against a vague sense of which one sounds most correct.'),

  H.h2(SECTIONS[4]),
  H.p('Read the scenario below the way this post has been describing, part by part, before looking at the breakdown underneath it.'),
  H.box('tip', 'Scenario', '<p>A remote employee\'s laptop connects to their home wifi normally and can browse the internet without any trouble, but the employee cannot reach their company\'s internal file server, which they were able to reach yesterday from the same laptop and the same network. The employee has not changed any settings. A coworker working from the same company office, on the company\'s own internal network, reaches the file server without any issue at the same time. What should the employee check first?</p>'),
  H.p('Broken into its parts:'),
  H.ul([
    '<strong>Setup:</strong> a remote employee, their laptop, their home wifi network.',
    '<strong>Symptom:</strong> the internal file server was reachable yesterday and is not reachable today, from the same device and network.',
    '<strong>Evidence:</strong> general internet browsing works fine on the same laptop and network right now, which rules out the home wifi and the employee\'s general internet connection as the cause. A coworker on the company\'s own internal network reaches the file server with no issue, which rules out the file server itself being down for everyone.',
    '<strong>Actual question asked:</strong> not "what is wrong," and not "how should this be permanently fixed." Specifically, what should be checked first.',
  ]),
  H.p('The evidence narrows this a great deal. General browsing working rules out the wifi and the broader internet path. The file server being reachable from inside the office rules out the server itself. What is left is something specific to how this one remote device reaches an internal company resource over the internet, which almost always means whatever secure connection method, such as a VPN, the employee is supposed to be using to reach internal resources from outside the office. Given that this is a "check first" question rather than a "diagnose and fix everything" question, the right answer is confirming whether the employee\'s VPN connection is active and connected, since that is the single cheapest check that directly targets what the evidence points to, before escalating to anything larger. An answer that jumps straight to reconfiguring the company\'s internal network, or replacing the employee\'s laptop, would be aimed at the wrong scale of problem even though the underlying category, a broken path to internal resources, was correctly identified.'),

  H.h2(SECTIONS[5]),
  H.p('A second scenario, same method.'),
  H.box('tip', 'Scenario', '<p>A small retail store\'s point of sale system has started freezing for a few seconds several times an hour, only during the store\'s busiest afternoon period, and only on the two registers nearest the store\'s public wifi access point. The store manager, who has no technical background, asks the technician what happened and whether it will happen again. What should the technician tell the manager?</p>'),
  H.p('Broken into its parts:'),
  H.ul([
    '<strong>Setup:</strong> a small retail store, a point of sale system, a non-technical store manager.',
    '<strong>Symptom:</strong> intermittent freezing on two specific registers, limited to the busiest part of the day.',
    '<strong>Evidence:</strong> the freezing is scoped to the busiest period, which points at contention rather than a hard failure, and it is scoped to the two registers nearest the public wifi access point, which points at wireless traffic competing for the same shared bandwidth during peak customer traffic rather than a problem with the point of sale system itself.',
    '<strong>Actual question asked:</strong> not what is technically causing the freezing, and not what configuration change to make. Specifically, what the technician should say to a non-technical manager who wants to know what happened and whether it will recur.',
  ]),
  H.p('The evidence does real diagnostic work here, timing and location together point at wireless contention during peak store traffic as the cause, and a student who has practiced the elimination method will find that part straightforward. The part worth slowing down for is the actual question. It is not asking for the diagnosis in technical language, it is asking what the technician should tell the manager, which is a Collaborate question wearing a Troubleshoot scenario\'s clothing. The correct answer explains the cause in plain terms the manager can actually use, something like the registers slow down when too many wireless devices compete for the same connection during the busiest hour, and states plainly that it is expected to recur under the same conditions until addressed. An answer that is technically flawless but stated in networking vocabulary the manager has no way to evaluate answers a question that was never asked, even though it correctly identifies the exact same cause.'),

  H.h2('Two questions in the exam style'),
  H.p('Read the question stem twice before opening either answer. In both of these, the trap option is technically defensible and wrong specifically because it does not match what was actually asked.'),
  H.mcq({
    n: 1,
    stem: 'A company discovers that a former employee, who left the company three weeks ago, still has an active account with access to the shared file storage system. The company\'s IT technician confirms the account has not been deactivated. What should the technician do first?',
    options: [
      'Redesign the company\'s account deactivation policy so this cannot happen again',
      'Immediately revoke the former employee\'s account access',
      'Audit every other employee account for similar unauthorized access',
      'Replace the file storage system with one that has stronger access controls',
    ],
    correct: 1,
    why: 'This is a Secure question asking specifically for the first step, not the best long-term fix. Redesigning the deactivation policy, auditing every other account, and replacing the storage system are all reasonable things to eventually do, and none of them is wrong as a fact. But the question asked what to do first, and every one of those three is a larger, slower action that makes sense only after the immediate exposure is closed. Revoking the one account that is actually still open is the smallest, most direct step that addresses the specific risk in front of the technician right now. Picking one of the larger options answers "how should this never happen again" instead of "what should be checked first," which is the exact reading trap this post describes.',
  }),
  H.mcq({
    n: 2,
    stem: 'A technician has just determined that a small office\'s internet slowdown is caused by an employee\'s personal streaming device connected to the same wireless network as the office\'s work computers, consuming a large share of the available bandwidth. The office manager, who has no technical background, asks what is going on. Which response should the technician give?',
    options: [
      '"A single device is saturating available bandwidth on the shared wireless segment, degrading throughput for other connected clients."',
      '"One of the personal devices on our wifi is using a lot of the connection for streaming, which is slowing everyone else down. I will move it to a separate network so it does not affect work devices."',
      '"The router needs to be replaced with a higher capacity model to handle this kind of traffic."',
      '"This is a temporary issue and should resolve itself without any changes."',
    ],
    correct: 1,
    why: 'This is a Collaborate question, and the diagnosis itself is not in dispute, the scenario already tells you the technician correctly identified the cause. The first option states that same correct diagnosis in technical vocabulary a non-technical manager cannot evaluate, which fails what the question actually asked for: a response the manager can understand. The third option proposes an unnecessary, more drastic fix than the evidence supports, since the problem is one device, not the router\'s overall capacity, and the fourth option is inaccurate, since nothing about the situation suggests it resolves on its own. The second option states the cause in plain language and gives a specific, correct next step, which is what "what is going on" is actually asking for when it is asked by someone without a technical background.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the difference between a reasoning mistake and a reading mistake on AP Networking scenarios?', a: 'A reasoning mistake means you understood the question correctly but drew the wrong conclusion from the evidence given. A reading mistake means you understood the network problem correctly but answered a different question than the one actually asked, often because a question asking for a first step or a most likely cause was answered as if it asked what is ultimately wrong.' },
    { q: 'Why do questions ask what to check first instead of what is wrong?', a: 'Because Troubleshoot and Secure questions are testing whether you can respond appropriately given where a situation currently stands, not only whether you can eventually identify a root cause. A measured first step is often a different answer than the most complete eventual fix, even when both are aimed at the same underlying problem.' },
    { q: 'How can I tell which of the four AP Networking skills a question is testing?', a: 'Look at the verb in the actual question, not the topic of the scenario. A question asking what setting or configuration to apply is testing Connect and Configure. One asking what protects against a described risk is testing Secure. One asking for a cause or a diagnostic next step is testing Troubleshoot. One asking what to tell or explain to a specific person is testing Collaborate.' },
    { q: 'Why is a technically correct answer sometimes still wrong on this exam?', a: 'Because the option can be true as a fact about networking while still failing to match what the question specifically asked for, such as answering with the ultimate fix when the question asked for the first step, or answering with a technical explanation when the question asked what to tell a non-technical audience.' },
    { q: 'How is this different from the troubleshooting method covered elsewhere on this blog?', a: 'The elimination method teaches how to reason correctly about a network problem once you know what is being asked. This post is about correctly identifying what is being asked in the first place, which is a separate step that comes before that reasoning and can go wrong on its own, even when the reasoning itself would have been sound.' },
  ]),

  H.cta({
    heading: 'Practice reading the question, not just the network',
    body: 'AP Networking scenarios reward precise reading as much as sound diagnosis. Work through the full course with both skills built into the practice.',
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
  H.updatedNote('Reviewed against the AP Networking course framework current in September 2026. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
