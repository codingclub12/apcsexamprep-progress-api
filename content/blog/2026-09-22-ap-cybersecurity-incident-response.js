'use strict';
// Weekly course post: AP Cybersecurity. Drill piece: the incident response
// lifecycle taught as a reusable answer structure for scenario and FRQ prompts.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The five stages of incident response',
  'Why this is an answer structure, not just a vocabulary list',
  'Worked scenario: a phishing email leads to a compromised staff account',
  'A structure for any "what do you do next" prompt, not one scenario type',
];

const meta = {
  title: 'Incident Response as an Answer Structure',
  handle: 'ap-cybersecurity-incident-response-answer-structure',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'incident response',
  publishOn: '2026-09-25',
  seoTitle: 'Incident Response: The AP Cybersecurity Answer Structure',
  seoDescription: 'Learn the incident response lifecycle as a real security process and a reusable structure for AP Cybersecurity scenario questions, with a worked example.',
  summary: 'Incident response is a five stage lifecycle, identify, contain, eradicate, recover, and document, that security teams actually use, and it doubles as a ready made structure for answering any AP Cybersecurity scenario question that asks what should happen next. This guide teaches both halves at once: the real meaning of each stage, and how to use that same order to organize a written answer. A full worked scenario walks a phishing email through every stage to a compromised staff account, and two practice questions ask students to identify which stage a described action belongs to.',
  tags: ['AP Cybersecurity', 'Incident Response', 'Scenario Questions', 'Answer Structure', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Incident response is a real process security teams follow when something goes wrong, and it is also a ready made answer structure for AP Cybersecurity scenario questions. This guide teaches the five stage lifecycle, identify, contain, eradicate, recover, and document, and shows how to use that same order to organize a written answer to almost any prompt that asks what should be done about a described security problem.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Something goes wrong on a network. Maybe an employee clicks a link they should not have, maybe a server starts behaving strangely at three in the morning, maybe a laptop goes missing from an unlocked office. Security teams do not react to that moment by improvising. They follow a known sequence of stages, in a known order, because reacting to a live incident with no plan is exactly how a small problem becomes a large one. That sequence is called incident response, and it breaks into five stages.'),
  H.p('The first stage is identification: figuring out that something has actually happened, and what it is. This sounds obvious until you notice how much of a real incident is spent here. Unusual login activity, a slow server, a user reporting a strange email, none of these announce themselves as "this is an incident." Identification is the work of recognizing a signal as a real problem and figuring out roughly what kind of problem it is, before deciding what to do about it.'),
  H.p('The second stage is containment: stopping the problem from spreading or getting worse, right now, before anything else. Containment is deliberately narrow. It is not fixing the underlying cause and it is not restoring anything to normal. It is closing the door that is currently open, disconnecting the affected device from the network, disabling the compromised account, blocking the malicious sender, so that whatever is already wrong stops getting more wrong while the next stages happen.'),
  H.p('The third stage is eradication: removing the actual cause, not just the symptom. If containment is closing the door, eradication is figuring out how the door got opened and fixing that. This might mean deleting malware from an infected device, resetting every credential an attacker may have touched, or patching the specific vulnerability that let the incident happen at all. Skipping straight from containment to recovery without eradication is one of the most common real world mistakes, because it puts a cleaned up looking system back into service with the actual cause still sitting inside it.'),
  H.p('The fourth stage is recovery: bringing affected systems and accounts back to normal, safe operation. Recovery happens only after eradication, on purpose. Restoring a system to service before the cause has actually been removed just reintroduces the same incident a second time, often faster than the first, because now the attacker already knows the way in.'),
  H.p('The fifth stage is documentation and review, sometimes called the lessons learned stage: writing down what happened, what allowed it to happen, and what should change so it either cannot happen the same way again or gets caught faster next time. This stage is the one students most often skip when they are thinking about incident response casually, and it is frequently the stage an AP Cybersecurity prompt is most directly testing, because it asks for the kind of forward looking reasoning that separates a fix from an improvement.'),
  H.box('key', 'The five stages, in order', '<p>Identify the incident. Contain it so it stops spreading. Eradicate the actual cause. Recover normal operation. Document and review what happened and what should change. Each stage depends on the one before it, which is exactly why the order matters as much as the content of each stage.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Here is the part that makes this lifecycle worth memorizing beyond its own unit: the same five stage order is a complete outline for answering almost any scenario question that ends with some version of "what should be done about this." A prompt does not have to use the words incident response for the structure to apply. Any time a scenario describes a security problem and asks what happens next, walking through identify, contain, eradicate, recover, and document gives a complete, ordered answer instead of a scattered list of things that sound relevant.'),
  H.p('This matters because the alternative, without a structure, is what most students actually do under time pressure: name a fix that occurred to them first, describe it in some detail, and stop. That answer might name a correct control, but it usually reads as a single idea rather than a complete response, because it skips the ordering logic a real security team would actually follow. A prompt asking what should be done about a compromised account is not really asking for one action. It is asking whether the student understands that different actions belong at different points in time, and that doing them in the wrong order causes new problems.'),
  H.p('The incident response lifecycle fixes that by giving every answer the same skeleton. Before writing a single sentence, a student can ask five questions in order: what actually happened here, what stops it from getting worse right now, what removes the actual cause, what restores normal operation safely, and what should change afterward. Answering those five questions in that order, using the specific details the scenario provides, is a complete response to almost any "what do you do" prompt the course could ask, whether or not the word incident ever appears in the stem.'),
  H.box('tip', 'Turn the lifecycle into five questions', '<p>Identify: what actually happened, and how do we know? Contain: what stops this from spreading right now? Eradicate: what is the actual root cause, and how is it removed? Recover: what does safely returning to normal operation look like? Document: what should change so this either cannot happen again the same way, or gets caught faster next time? A scenario answer that hits all five, using the scenario\'s own details, is a structured answer rather than a guess.</p>'),
  H.p('It is worth being precise about what this structure is not. It is not a substitute for reading the scenario carefully, and it does not hand you the right action for each stage automatically. A generic answer that names something plausible at each stage without reasoning from the specific details the prompt gives you still loses credit, the same way it would in any other scenario based question on this exam. What the structure buys you is organization: it guarantees you do not forget an entire phase of the response, and it keeps you from describing recovery before you have actually eradicated the cause, which is a sequencing mistake that undercuts an otherwise reasonable answer.'),

  H.h2(SECTIONS[2]),
  H.p('The clearest way to see the lifecycle working as an answer structure is to walk one scenario through all five stages, the way a written response actually would.'),
  H.box('warn', 'The scenario', '<p>A high school\'s front office staff receive an email that appears to come from the district\'s IT department, asking them to verify their login credentials through a linked page. One staff member enters her username and password on that page. Two days later, the school\'s IT administrator notices that her email account has been sending messages to other staff at unusual hours, including several containing the same suspicious verification link that was originally sent to her.</p>'),
  H.table(
    ['Stage', 'What happens at this stage', 'Concrete action in this scenario'],
    [
      ['Identify', 'Recognize that something is actually wrong, and characterize it', 'The IT administrator notices outbound messages sent at unusual hours and confirms the account is sending the same phishing link that originally targeted it, establishing that the account itself is now compromised, not just that a suspicious email arrived'],
      ['Contain', 'Stop the problem from spreading further, immediately', 'Disable or lock the staff member\'s account so it can no longer send mail, and alert other staff who received messages from that account not to click the link, before doing anything else'],
      ['Eradicate', 'Remove the actual cause, not just the visible symptom', 'Force a password reset on the affected account through a channel the attacker does not control, review the account for any mail forwarding rules or app passwords the attacker may have added, and confirm no other systems were reached using that staff member\'s credentials'],
      ['Recover', 'Restore safe, normal operation once the cause is actually gone', 'Re-enable the account once the password has been reset and the account has been checked clean, and confirm the staff member can send and receive mail normally again with the new credentials'],
      ['Document', 'Record what happened and what should change going forward', 'Log the incident, including how the credentials were entered and how long the account was compromised before detection, and use it to justify a specific follow up, such as enabling multi factor authentication on staff accounts so a stolen password alone is no longer enough to take one over'],
    ],
  ),
  H.p('Notice what the order is doing here. Containment happens before eradication because a spreading incident gets worse every minute it is not stopped, even if the underlying fix is not ready yet. Eradication happens before recovery because putting the account back into normal use before the attacker\'s access is actually removed would let the same incident happen again immediately, using the same still valid password. And documentation happens last, not because it matters least, but because it depends on knowing the whole story, which is only available once the incident is actually over.'),
  H.box('key', 'The reasoning the exam is actually grading', '<p>A strong answer to this kind of prompt does not just name five actions. It explains why an action belongs at its stage and not another one, the way containing the account before resetting the password matters because the account is still actively sending mail at that moment. That explanation, tied to the scenario\'s own details, is what separates a structured response from a list that happens to be in the right order by coincidence.</p>'),

  H.h2(SECTIONS[3]),
  H.p('This scenario happened to involve a compromised staff email account, but nothing about the five stage structure is specific to email, or to phishing, or to any one kind of device. The same five questions apply just as cleanly to a stolen laptop, a server that starts behaving strangely, a database that was accessed by someone outside their normal role, or a vulnerability discovered before anyone has actually exploited it. What changes from scenario to scenario is the specific action that fills each stage. What does not change is the order, or the fact that all five stages need an answer.'),
  H.p('That generality is exactly what separates this guide from a guide built around one specific FRQ format. The <a href="/blogs/ap-cybersecurity/ap-cybersecurity-device-security-frq-guide">device security FRQ guide</a> teaches a four paragraph structure, assets, attack path, control, and trade-off, purpose built for the specific free response task the course currently asks, which is a device security analysis. That structure is the right tool for that one task, and it is worth learning on its own terms. The incident response lifecycle taught here is a different, broader structure: it is not tied to one question format, and it applies any time a scenario describes something that already happened, or is actively happening, and asks what response follows. Some prompts will fit one structure better than the other. Recognizing which kind of question you are looking at, before you start writing, is itself part of the skill.'),
  H.p('The two structures also combine well rather than compete. A device security analysis prompt might describe a laptop that is already compromised, in which case the fourth paragraph of that structure, the trade-off of the chosen control, sits comfortably inside what the incident response lifecycle would call eradication or recovery. Thinking in both structures at once is not double work. It is having more than one lens for the same underlying skill: reasoning about a security scenario in a specific, defensible order instead of a scattered list of things that sound relevant.'),
  H.box('tip', 'A quick test for which structure fits', '<p>If the prompt describes a device or system and asks you to evaluate its security posture and recommend a control, the four paragraph device security structure fits directly. If the prompt describes something that has already gone wrong, or is actively going wrong, and asks what should happen in response, the five stage incident response lifecycle is the better fit, because it is built specifically around a timeline of stopping, fixing, and reviewing an incident rather than analyzing a device in the abstract.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both questions describe one action from a larger incident and ask which stage of the lifecycle that action belongs to. Read the stem for what is actually happening in that moment, not just which words sound familiar from a specific stage\'s name.'),
  H.mcq({
    n: 1,
    stem: 'A company\'s security team discovers that an internal server has been infected with malware. Before doing anything else, they disconnect that server from the network so the malware cannot spread to other systems, even though they have not yet determined exactly how the malware got onto the server in the first place. Which stage of the incident response lifecycle does disconnecting the server represent?',
    options: [
      'Identification, because the team is still trying to understand what happened',
      'Containment, because the goal is stopping the problem from spreading further before the cause is fully understood',
      'Eradication, because disconnecting the server removes the malware from the network',
      'Recovery, because the server is being returned to a safe state',
    ],
    correct: 1,
    why: 'Disconnecting the server is a containment action specifically because it happens before the team knows exactly how the malware got in, and its entire purpose is stopping the spread right now rather than fixing the underlying cause. Identification already happened, since the team already knows the server is infected. Eradication would be removing the malware and the vulnerability that let it in, which has not happened yet. Recovery would be putting the server back into service, which is the opposite of disconnecting it. Containment is the stage that buys time without claiming the problem is solved.',
  }),
  H.mcq({
    n: 2,
    stem: 'After a security incident involving a stolen employee laptop has been fully resolved, the affected employee is back to work on a replacement device, and all compromised accounts have new credentials, the IT team holds a meeting to review exactly what allowed the laptop to be stolen and updates the company\'s device policy to require laptops be stored in a locked cabinet overnight instead of left on a desk. Which stage of the incident response lifecycle does this meeting and policy update represent?',
    options: [
      'Containment, because the new policy prevents future theft',
      'Recovery, because normal operation has already been restored by this point',
      'Documentation and review, because the team is recording what happened and using it to change future practice',
      'Identification, because the team is identifying a weakness in the current policy',
    ],
    correct: 2,
    why: 'This action happens after recovery is already complete, which is the clearest signal that it belongs to the final stage. The team is not stopping an active spread, which would be containment, and they are not restoring a system to normal operation, which already happened. They are reviewing what allowed the incident to occur and using that review to change a policy going forward, which is exactly what documentation and review means: turning a resolved incident into a lesson that reduces the chance of the same thing happening again. Recognizing that this stage comes last, after everything else is already settled, is the detail this question is testing.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What are the five stages of incident response?', a: 'Identification, containment, eradication, recovery, and documentation and review. Each stage depends on the one before it: containment happens before eradication because the spread has to be stopped before the cause can be safely removed, and eradication happens before recovery because restoring a system before the cause is gone just reintroduces the same problem.' },
    { q: 'Why is containment separate from eradication if they both involve stopping a problem?', a: 'Containment stops the problem from getting worse right now, often before the full cause is even understood, like disconnecting an infected device from the network. Eradication is the slower, more deliberate work of actually finding and removing the root cause, like deleting malware or resetting stolen credentials. Treating them as the same step is one of the most common mistakes on scenario questions, because a strong containment action can happen well before the cause is fully known.' },
    { q: 'Can the incident response lifecycle be used for any AP Cybersecurity scenario question?', a: 'It fits any prompt that describes something that has already happened or is actively happening and asks what response should follow. It is not the right tool for every scenario, a prompt asking you to evaluate a device\'s security posture and recommend one control, like the one taught in the device security FRQ guide, uses a different four part structure built for that specific task. Recognizing which kind of question is in front of you is part of choosing the right structure.' },
    { q: 'Where does documentation fit if the incident is already over by the time it happens?', a: 'Documentation and review is deliberately the last stage, and that placement is not an accident. It depends on knowing the full story of the incident, which is only available once identification, containment, eradication, and recovery have all actually happened. Its value is forward looking: turning one resolved incident into a specific change, like requiring multi factor authentication or changing a storage policy, that makes the next one either less likely or easier to catch sooner.' },
    { q: 'What is the most common mistake students make when applying this structure to a scenario question?', a: 'Skipping straight to a fix without separating containment from eradication, or skipping documentation entirely because the incident already feels resolved by the end of the story. Both mistakes come from treating incident response as a single action instead of an ordered sequence of five distinct questions that each deserve their own answer.' },
  ]),

  H.p('The account compromise in the worked scenario above starts the same way a lot of real incidents do, with a convincing email; the reasoning skills for spotting that email before it succeeds are covered in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive">this guide on phishing recognition</a>, and the access control decisions that limit how far a compromised account can reach in the first place are covered in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">this guide on least privilege</a>.'),
  H.cta({
    heading: 'Practice applying the incident response structure',
    body: 'Unit content across the AP Cybersecurity curriculum builds this exact skill, walking a described incident through identification, containment, eradication, recovery, and review, and the practice exam mixes scenario questions in the real format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study the curriculum' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
