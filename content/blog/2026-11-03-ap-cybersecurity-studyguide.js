'use strict';
// Weekly course post: AP Cybersecurity. Study-plan / navigation track, matching
// the pattern set by the 2026-10-20 AP CSP study guide: a checklist of what to
// actually DO in each of the five units, linked out to the dedicated posts
// already on this blog rather than re-explaining any of their content. This is
// deliberately NOT the 2026-10-20 glossary post: the glossary defines terms,
// this post tells you what to do with the time you have left before the exam,
// unit by unit, and points to the glossary for vocabulary recall instead of
// repeating any definition here.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'How to Use This AP Cybersecurity Study Guide',
  'Unit 1, Introduction to Security: What to Do This Week',
  'Unit 2, Securing Spaces: What to Do This Week',
  'Unit 3, Securing Networks: What to Do This Week',
  'Unit 4, Securing Devices: What to Do This Week',
  'Unit 5, Securing Applications and Data: What to Do This Week',
  'The Cross-Cutting Exam Strategy Checklist',
  'Frequently Asked Questions',
];

const meta = {
  title: 'The Half Year AP Cybersecurity Study Guide',
  handle: 'ap-cybersecurity-half-year-review-guide',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity study guide',
  publishOn: '2026-11-03',
  seoTitle: 'AP Cybersecurity Study Guide: The Half Year Review',
  seoDescription: 'An AP Cybersecurity study guide organized by all five units: a checklist of what to actually do in each one, linked to the specific posts on this blog.',
  summary: 'A navigation-style AP Cybersecurity study guide built for the halfway point of the course, organized by the five units: Introduction to Security, Securing Spaces, Securing Networks, Securing Devices, and Securing Applications and Data. For each unit, a concrete checklist of review actions, linked to the specific dedicated post already on this blog rather than re-explaining any of it, plus a cross-cutting exam strategy checklist covering pacing, the free response, scenario reading, and practicing without a released exam. Distinct from the running glossary, which is a term reference, this is a planning tool.',
  tags: ['AP Cybersecurity', 'Study Guide', 'Review Checklist', 'Exam Prep', 'Five Units', 'Study Plan'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('This AP Cybersecurity study guide is a planning tool, not a reference. Every term this course tests already has a precise definition in the running glossary. What that glossary cannot give you is a plan, so this is that plan: five checklists, one per unit, each one a short list of things to actually re-do, re-trace, or re-check before the exam, with a direct link to the post on this blog built to cover that specific ground, plus a cross-cutting checklist for the exam skills that cut across every unit at once.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('If you are at the halfway point of the course and wondering where to spend your review time, this AP Cybersecurity study guide answers that with a checklist instead of a summary. It will not define social engineering or explain how a firewall works. That work already exists on this blog, unit by unit, and re-explaining it here would just be a worse copy of a page that already covers it well. What is genuinely missing from a pile of separate posts is the plan that ties them together and turns "review Unit 3" into a list of specific actions with a specific post attached to each one.'),
  H.p('Work through the five unit sections in whatever order matches your own gaps rather than top to bottom. If a unit already feels solid, skim its checklist for the one item you have not actually done yet rather than skipping the whole section. The cross-cutting section near the end is different in kind from the five unit sections: it covers exam skills, pacing, free response structure, reading a scenario for its evidence, recognizing the wrong-answer trap, and rehearsing without a released exam, that apply no matter which unit a given question happens to be drawn from.'),
  H.box('key', 'How this differs from the glossary', '<p>The <a href="/blogs/ap-cybersecurity/ap-cybersecurity-running-glossary-all-units">AP Cybersecurity glossary</a> is where you go to check a definition cold, in seconds. This guide never repeats a definition from it. When a checklist item below assumes you already know a term, that is the moment to open the glossary in a second tab, not to expect this post to define it again. Think of the glossary as the dictionary and this guide as the study plan that tells you which pages of it actually matter this week.</p>'),
  H.p('One more orientation point before the five units start. The <a href="/blogs/ap-cybersecurity/ap-cybersecurity-five-units-ranked">five units ranked post</a> is worth a quick read if you have not seen it, since it explains how the units build on each other rather than standing alone, and the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-exam-format-section-by-section">exam format post</a> is worth knowing cold so every checklist item below has a place to land on exam day rather than floating as an abstract review task.'),

  H.h2(SECTIONS[1]),
  H.p('Unit 1 gives you the reasoning tools every later unit reuses: the CIA triad and the threat, vulnerability, and risk chain. Review here means proving you can apply those tools to something new, not reciting their definitions.'),
  H.ul([
    'Re-work the threat modeling drill against your own phone from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-threat-modeling-your-phone">threat modeling post</a>, from a blank page this time, without checking the walkthrough until you have written your own threat, vulnerability, and risk chain first.',
    'Take three scenario descriptions you have already seen this semester, from a class handout or a practice set, and re-classify each one against the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">CIA triad grading rubric post</a>: confidentiality, integrity, or availability. If you cannot name which property was actually damaged in one sentence, that scenario goes back on your list.',
    'Run the top tier of the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-unit-1-vocabulary-ranked">Unit 1 vocabulary ranking</a> as a cold-recall drill, out loud, without notes. That post already sorts the terms by how much reasoning weight each one carries, so start at the top and stop once you hit a term you are not instantly confident on.',
    'Skim the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-running-glossary-all-units">glossary</a> Unit 1 section for the handful of terms you still hesitate on, then close the tab and try to use each one in a sentence about a scenario from memory, not from the definition.',
  ]),

  H.h2(SECTIONS[2]),
  H.p('Unit 2 moves the CIA and risk reasoning from Unit 1 onto the layer where most real compromises actually begin: people and physical access, not code. Review here means being able to tell closely related attack techniques apart under a timer.'),
  H.ul([
    'Re-work the tailgating and checkpoint scenario from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-matching-controls-to-layers">controls-to-layers post</a> from scratch, naming the specific physical control that was missing before you check the post\'s own answer.',
    'Rebuild the distinctions between phishing, pretexting, and baiting from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-social-engineering">social engineering post</a> on a blank page: one sentence each, no notes, then check yourself against the post. This exact trio is where scenario answers blur together most often.',
    'Re-trace the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive">phishing deep dive</a>, specifically its spear phishing, smishing, and vishing variants, and write down which channel, email, text, or voice, distinguishes each one from plain phishing.',
    'Redo the role-based access control scenario in the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">least privilege post</a> and check whether you can explain authentication versus authorization without the post open beside you.',
  ]),

  H.h2(SECTIONS[3]),
  H.p('Unit 3 carries the densest concentration of new vocabulary in the whole course, because the network itself becomes the thing being defended rather than a person or a single device. Review here rewards tracing a diagram, not just recognizing a term.'),
  H.ul([
    'Re-trace the zone diagram from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">network segmentation post</a> by hand, labeling which zones can reach which others, before checking your version against the original.',
    'Redo the firewall edge cases from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-firewalls-what-they-cannot-stop">firewalls post</a>: list the three things a firewall genuinely cannot stop from memory, then verify against the post rather than the other way around.',
    'Work through the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-unit-3-network-security-questions">Unit 3 network security question set</a> in order, hardest last, and flag any question where you got the right letter for the wrong reason, not just the ones you missed outright.',
    'If your class uses the Cisco Networking Academy content alongside this course, the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cisco-networking-academy-partnership">Cisco Networking Academy partnership post</a> is worth a skim so you know which of your lab work maps onto which Unit 3 vocabulary.',
  ]),

  H.h2(SECTIONS[4]),
  H.p('Unit 4 moves the defense down to a single device a specific person actually carries. Review here means checking whether you can name the right control for a specific failure mode, since the exam tests the boundary of each control as much as its definition.'),
  H.ul([
    'Rebuild the malware category table from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-endpoint-hardening-unit-4">endpoint hardening post</a> from memory, ransomware, spyware, and rootkit, and name which CIA property each one primarily attacks before checking your answer.',
    'Re-work the password and MFA reasoning in the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-passwords-mfa-advice-changed">passwords and MFA post</a> and be ready to explain why current guidance leans on a second factor rather than password complexity rules alone.',
    'Recite the incident response lifecycle from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-incident-response-answer-structure">incident response post</a> in order, from memory, then use it as the outline for one practice free response answer you have not yet written.',
    'Re-run the zero trust versus defense in depth versus least privilege comparison from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-zero-trust-defense-in-depth">zero trust post</a> and check that you can tell all three apart in one sentence each, since the exam is built to test exactly that confusion.',
    'Redo one worked example from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-backups-recovery-availability">backups and recovery post</a> and confirm you can explain why backups are an availability control specifically, not a confidentiality or integrity control.',
  ]),

  H.h2(SECTIONS[5]),
  H.p('Unit 5 moves up from the device to the software running on it and the data it handles. Review here means being able to explain a mechanism, not just recognize a vocabulary word attached to it.'),
  H.ul([
    'Re-trace the asymmetric key exchange walkthrough from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-symmetric-asymmetric-encryption">encryption post</a> step by step, on paper, explaining out loud why the public key can be shared openly while the private key never leaves its owner.',
    'From the same post, redo the comparison between symmetric and asymmetric encryption without notes, naming the key distribution problem each one either causes or solves.',
    'Rebuild the shared root cause behind SQL injection and cross-site scripting from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-application-security-unit-5">application security post</a>: untrusted input trusted and used without being checked first, aimed at two different destinations. Naming that shared shape is worth more than memorizing either term alone.',
    'Check that you can explain why input validation belongs on the server rather than only in the browser, since that specific framing is where the appsec post says the exam rewards precision.',
  ]),

  H.h2(SECTIONS[6]),
  H.p('These five skills apply no matter which unit a given question draws its vocabulary from, so they deserve their own pass separate from the five unit checklists above.'),
  H.ul([
    'Time yourself on a real multiple choice set using the eighty-second-per-question pace from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-mcq-pacing-eighty-seconds">MCQ pacing post</a>, and note specifically where you ran over, not just your final score.',
    'Write one full free response answer using the paragraph-by-paragraph structure from the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-device-security-frq-guide">FRQ guide</a>, then compare it against the guide\'s own worked example line by line.',
    'Take a scenario question you have already answered once and re-read it using the method in the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-scenario-question-evidence">scenario question evidence post</a>: underline only the details that are actually evidence for an answer, and cross out the ones that are just setting.',
    'Review the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-plausible-wrong-answer-pattern">plausible wrong answer pattern post</a> and go back through your own missed questions from this semester looking specifically for that pattern, an answer that sounds right but names the wrong layer or the wrong mechanism.',
    'Since no official exam has been released yet, work through the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-practicing-with-no-released-exam">practicing with no released exam post</a> for how to build genuine timed practice out of the released course materials that do exist rather than waiting on a resource that is not there yet.',
    'Reread the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-exam-format-section-by-section">exam format post</a> once more this week so the shape of the exam, not just its content, is not something you are reasoning about for the first time on test day.',
  ]),
  H.box('tip', 'Where to spend the time you actually have', '<p>If you only have time for one pass through this guide, do the cross-cutting checklist above and the checklist for whichever single unit you scored worst on most recently. A student who is strong on content but has never timed a free response answer under the actual pace loses more on exam day than a student with one weak unit and strong exam mechanics.</p>'),

  H.h2(SECTIONS[7]),
  H.faq([
    { q: 'Is this the same as the AP Cybersecurity glossary post?', a: 'No. The glossary defines terms, unit by unit, so you can look one up in seconds. This guide assumes you can already look a term up and instead tells you what to actually do with your remaining review time: which scenario to re-work, which walkthrough to re-trace, and which post covers each one in full. Use the glossary for recall and this guide for planning.' },
    { q: 'Do I need to work through the five units in order?', a: 'No. Work through them in whatever order matches your own weak spots. If you already know Unit 3 is your weakest, start there rather than working top to bottom through units you are already solid on. The order in this guide follows the course structure, not a recommended study order.' },
    { q: 'What if I have not covered all five units in class yet?', a: 'Use the checklists for the units you have already covered, and treat the rest of this guide as a preview of what review will look like once you get there. The cross-cutting exam strategy checklist is useful regardless of how far your class has progressed, since pacing and scenario reading apply to whatever content you already have.' },
    { q: 'Why is there no released practice exam to check my answers against?', a: 'AP Cybersecurity is new enough that College Board has not released a full past exam the way it has for long-running courses. The practicing with no released exam post linked in the cross-cutting section above walks through building real timed practice out of the materials that do exist rather than waiting on one that does not.' },
    { q: 'How is time best split across the five units if I only have a few weeks left?', a: 'Weight your remaining time toward Units 3 and 5, since between them they carry the densest new vocabulary and the mechanisms, network segmentation, encryption, and application vulnerabilities, that a scenario question is most likely to build a multi-step chain out of. Units 1, 2, and 4 still need a full pass, but they tend to hold up better under a lighter final review than Units 3 and 5 do.' },
  ]),

  H.cta({
    heading: 'Turn this checklist into a real study session',
    body: 'A plan only helps if you actually run it. Pick one unit checklist above, work it start to finish, then move to the next.',
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
  H.updatedNote('This guide is reviewed as more AP Cybersecurity posts publish on this blog and folded into the relevant unit checklist. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
