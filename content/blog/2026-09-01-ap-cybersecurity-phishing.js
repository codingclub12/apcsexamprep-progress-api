'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, deep dive on phishing.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'You have already gotten one of these',
  'Broad phishing: the volume game',
  'Spear phishing: the same attack, aimed',
  'Smishing and vishing: same trick, different channel',
  'How to actually spot a phishing attempt',
  'Why urgency works, and the one habit that beats it',
];

const meta = {
  title: 'Phishing: The Attack Every Student Has Already Survived',
  handle: 'ap-cybersecurity-phishing-deep-dive',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'phishing',
  publishOn: '2026-09-01',
  seoTitle: 'Phishing Explained: How to Spot It, AP Cybersecurity Guide',
  seoDescription: 'What phishing actually is, the difference between broad and spear phishing, and the concrete signals that identify an attempt before you click.',
  summary: 'Nearly every reader has already received a phishing message, whether they recognized it as an attack or not. This guide goes deep on phishing specifically: the difference between broad phishing and spear phishing, the channel variants the exam names separately, and the concrete signals, mismatched sender addresses, urgency language, mismatched links, that identify an attempt before anyone clicks.',
  tags: ['AP Cybersecurity', 'Phishing', 'Unit 2', 'Exam Strategy', 'Concept Guide'],
};

const body = H.article([
  H.dek('You have almost certainly received a phishing message already, probably this year, maybe this week. A fake delivery notice. A bank alert that was not from your bank. A prize you did not enter to win. Most people scroll past these without ever naming what they were looking at. This guide names it, teaches the variants the AP Cybersecurity exam expects you to tell apart, and gives you a concrete, repeatable way to spot the next one before you click.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Think back through your last month of texts and email, and there is a very good chance one of them does not hold up under a second look. A shipping update for a package you were not actually tracking that day. An alert claiming your bank account was locked, with a button to "verify your identity" sitting right there in the message. A message announcing you have won a gift card, a prize, a giveaway you have no memory of entering. Most of these get deleted or ignored on instinct, and that instinct is doing real work even when nobody involved could explain why the message felt off.'),
  H.p('That instinct is worth turning into an actual skill, because phishing is not one message you might see once. It is a category of attack that keeps working, at scale, precisely because it does not need to fool everyone. It only needs to fool some fraction of a very large number of people, and the internet makes sending a very large number of people a message essentially free.'),
  H.box('key', 'The definition that matters', '<p>Phishing is a message, usually email or text, designed to trick the recipient into clicking a malicious link, opening a malicious attachment, or handing over sensitive information like a password or a credit card number, by impersonating a trustworthy sender. The message pretends to be something routine and safe. The whole attack lives in whether the reader believes that pretense long enough to act on it.</p>'),
  H.p('This guide goes further than naming the category. It was written as a companion to a broader look at <a href="/blogs/ap-cybersecurity/ap-cybersecurity-social-engineering">social engineering as a whole</a>, where phishing appears as one technique among several, compared briefly against pretexting, baiting, and tailgating. Here, phishing gets the depth: the variants, the channels, and a concrete, exam ready checklist for recognizing an attempt in the moment it lands in an inbox.'),

  H.h2(SECTIONS[1]),
  H.p('The version of phishing most people picture first is broad phishing, sometimes called mass phishing. It is impersonal by design. The same message, or something close to it, gets sent to a huge number of recipients at once, with no attempt to research or personalize any single one of them. The delivery notice from the opening of this guide is a textbook example: it was not written for you specifically. It was written to be plausible enough that a meaningful fraction of everyone who receives it, across thousands or millions of inboxes, happens to be expecting a package that week, or clicks out of habit anyway.'),
  H.p('That impersonal quality is also the tell, and it is worth sitting with why the attack still works despite it. Broad phishing does not need a high success rate. If a campaign reaches a huge number of inboxes and only a tiny sliver of recipients click, hand over a password, or open an attachment, the attacker still comes out ahead, because sending the message again to another huge batch costs almost nothing. Volume is the entire strategy. The message is built to be generic enough to apply to almost anyone, which is exactly what makes it recognizable once you know to look: real correspondence about your actual accounts almost always includes some detail that a mass mailed lure cannot fake, your real name spelled correctly, an actual order number, a reference to something you actually did.'),

  H.h2(SECTIONS[2]),
  H.p('Spear phishing takes the same basic mechanism, a message impersonating a trustworthy sender, and narrows it to one specific target, built around real, researched details about that person or organization. Where broad phishing is a net cast wide, spear phishing is a single, aimed cast built to look unmistakably legitimate to exactly one recipient.'),
  H.p('Picture an email that lands in a school\'s finance office, addressed correctly to the finance director by name, referencing an actual vendor the school actually works with, mentioning a purchase order number that looks consistent with ones already in the system, and asking for a wire transfer to an updated bank account because the vendor "switched banks last month." Nothing about the message is generic. It was built using details an attacker gathered specifically about this target, likely from a school website staff directory, a LinkedIn profile, or a previous data breach, and every one of those details exists to make the ask feel like ordinary business rather than an attack in progress.'),
  H.p('That research is exactly why spear phishing succeeds far more often than broad phishing, and it is the distinction the exam most wants you to be able to apply to a scenario, not just recite. A generic message asking for a password reset is easy to be suspicious of. A message that already knows your manager\'s name, your current project, and the vendor you actually use has removed most of the obvious red flags, and the recipient has to work harder, and use different signals, to catch it. The mechanism, impersonating a trustworthy sender to get a click or a disclosure, is identical in both cases. What changes is targeting, research, and the resulting success rate.'),
  H.box('warn', 'A trap in how these get tested', '<p>Do not assume a scenario is spear phishing just because it names a real seeming person or company. Broad phishing messages routinely spoof real, well known brands, a real bank\'s logo, a real courier\'s name, without knowing anything specific about the recipient. What makes a scenario spear phishing is personalized detail about the target: their actual name, actual role, actual coworkers, or an actual transaction, not just a familiar brand name slapped on a generic template.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Phishing is most associated with email, but the same underlying trick shows up under different names depending on the channel it travels through, and the exam expects you to recognize both terms. Smishing is phishing delivered by SMS text message rather than email, the fake delivery notice or the "your account was locked" text being classic examples. Vishing is phishing conducted by voice, typically a phone call, where an attacker impersonates a bank, a government agency, or a company\'s support line to talk a target into reading back a password, a one time code, or account details out loud.'),
  H.p('The channel changes what the attack looks like on the surface, a link in a text instead of a link in an email, a live voice instead of written words, but the mechanism underneath is the same one this whole guide is about: impersonating a trustworthy sender to get the target to act before they verify. If a scenario on the exam describes a phone call rather than an email, do not assume that rules out the phishing family entirely. Check whether the underlying mechanism is impersonation through a message asking for information or action, which is vishing, versus a fabricated identity and story built specifically to extract information in a live conversation, which drifts toward pretexting instead. The two overlap in practice more than the vocabulary suggests, and a careful read of what the attacker is actually doing, not just which channel they used, is what separates them.'),

  H.h2(SECTIONS[4]),
  H.p('Naming phishing after the fact is the easy half. The useful skill is catching it in the moment, before a click happens, and that comes down to a short list of concrete signals rather than a vague sense that something feels off. Here is an invented example message, built for teaching purposes and not copied from any real sender, that packs several signals into one short paragraph:'),
  H.code('From: "Account Security" <support[at]secure-yourbank-verify.com>\nSubject: URGENT: Your account will be suspended in 24 hours\n\nDear Valued Customer,\n\nWe detected unusual activity on your account. Your access\nwill be permanently suspended within 24 hours unless you\nverify your identity immediately.\n\nClick here to verify now: yourbank.com/secure-login\n(links to: bit.ly/4kXpQz2)\n\nFailure to act will result in permanent account closure.\n\nYourBank Security Team'),
  H.p('Read slowly, that short message is doing several distinct things at once, and each one is a signal worth naming on its own.'),
  H.ul([
    'A mismatched sender address. The display name says "Account Security," but the actual address, <code>support[at]secure-yourbank-verify.com</code>, is not the bank\'s real domain. A legitimate bank sends mail from its own domain, not from a lookalike registered to sound reassuring.',
    'Urgency and fear based language, deployed on purpose. "Suspended in 24 hours," "immediately," "permanent account closure" are all doing the same job: pushing the reader to act fast instead of pausing to check anything.',
    'A generic greeting. "Dear Valued Customer" is what a message sent to a huge, unpersonalized list looks like, since a real bank\'s system already knows the account holder\'s actual name.',
    'A link that does not match its displayed text. The visible text reads <code>yourbank.com/secure-login</code>, but the actual destination, visible by hovering or checking the underlying href, is an unrelated shortened link. The words on the page and the place the link actually goes are two different things, and that gap is the single most reliable technical tell in a phishing message.',
    'A request pushing toward an unusual channel or action for something sensitive. Being asked to "verify your identity" by clicking a link in an unsolicited message, rather than logging in directly through a browser bookmark or the bank\'s app, is itself a red flag regardless of how convincing the surrounding message looks.',
  ]),
  H.p('None of these signals require special technical tools to catch. They require slowing down enough to actually look at the sender address, hover over the link before clicking it, and notice when a message is leaning unusually hard on urgency. That habit, checking rather than trusting the surface presentation, is the entire skill this section is teaching.'),

  H.h2(SECTIONS[5]),
  H.p('It is worth pausing on why urgency and fear specifically are such a common ingredient across phishing messages, because it is not an accident of writing style. It is a deliberate psychological tactic, and understanding why it works makes it easier to resist. Under perceived time pressure, people skip the verification steps they would normally take. A message that gives a reader all the time in the world to think it over gives them all the time in the world to notice something is wrong, check the sender, or ask a coworker. A message that claims the account will be suspended in the next twenty four hours removes that window on purpose, short circuiting the careful, skeptical thinking a person would otherwise apply.'),
  H.p('That is precisely the mechanism this deep dive\'s companion guide on social engineering names as the reason verification through a known, separate channel is the control that actually works: instead of clicking the link in the message, or calling the number the message itself provides, the safe move is to go find the organization\'s real number or real website independently, the same way you would look it up if the message had never arrived, and check from there. A genuine account problem will still be there, and still real, five minutes later after that check. An attacker\'s fabricated deadline will not survive it.'),
  H.box('key', 'Why technical only answers are often wrong here', '<p>On a scenario question describing a successful phishing attempt, an answer choice proposing only a technical fix, stronger encryption, a firewall change, a new antivirus program, is frequently a distractor. None of those change whether a person under time pressure clicks a link before checking where it actually goes. The vulnerability in a phishing scenario is a human decision made under manufactured urgency, so the strongest control usually targets that decision directly: training on recognition signals, or a verification procedure that removes the rushed decision entirely.</p>'),
  H.p('None of this means technical controls are useless against phishing. Spam filtering blocks a meaningful share of these messages before they ever reach an inbox, and multi factor authentication limits the damage even when a password does get handed over. But those are a backstop for the messages that get through and the credentials that do get stolen, not a substitute for a reader who can recognize a mismatched sender address, an urgent deadline, and a link that goes somewhere other than where it claims.'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written the way the exam writes them: scenario first, decision second. Read the stem twice, and separate what the scenario actually establishes from what it merely sounds like.'),
  H.mcq({
    n: 1,
    stem: 'A company\'s payroll department receives an email addressed generically to "Dear Employee," claiming to be from a well known software company\'s support team and asking every recipient to reset their password through a link before their license expires. The same email was sent, with no changes, to every employee at the company. Separately, the payroll director receives a different email addressed to her by name, referencing the actual outside accounting firm the company uses and an invoice number that matches a real invoice already in progress, asking her to update the firm\'s banking details for an upcoming payment. Which statement correctly identifies the two attacks?',
    options: [
      'Both emails are spear phishing, because both ask the recipient to take a specific action',
      'The generic employee email is spear phishing and the payroll director email is broad phishing, because the director is a more senior target',
      'The generic employee email is broad phishing, sent identically to a large group with no personalization, and the payroll director email is spear phishing, built around specific, real details about her and the company',
      'Neither email is phishing, since no malware or malicious attachment is described in either scenario',
    ],
    correct: 2,
    why: 'The employee wide email is broad phishing: it is sent unchanged to a large group, uses a generic greeting, and relies on volume rather than any personalization to succeed with some fraction of recipients. The payroll director email is spear phishing: it is addressed to her specifically and built around real, researched details, an actual vendor and a matching invoice number, that only someone who researched this target and organization would know, which is exactly what makes spear phishing more convincing and more dangerous than a broad, generic attempt. Phishing does not require malware or an attachment; a link asking for credentials or a request to change payment details is enough to qualify.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student receives a text message that reads: "Your school portal password expires in 2 hours. Update now to avoid losing access: schoolportal-update.net/login." The student notices the link\'s domain does not match the actual school portal\'s real web address, which is a different domain entirely. Which recognition signal is most directly present in this scenario?',
    options: [
      'A request for payment through gift cards, which is a common phishing demand',
      'A mismatched or suspicious sender address or destination, since the link domain does not match the organization it claims to represent',
      'An attachment containing malicious code',
      'A phone call impersonating a company\'s support team',
    ],
    correct: 1,
    why: 'The scenario is a text message, so it has no attachment and no phone call, ruling out those two options immediately, and there is no mention of a payment demand of any kind, ruling out the first option. What the scenario does describe clearly is a link whose actual destination domain, <code>schoolportal-update.net</code>, does not match the real school portal\'s actual domain. That mismatch between where a link claims to lead and where it actually leads is precisely the mismatched address or destination signal, and it is present here even though the urgency language, "expires in 2 hours," is also worth noticing separately.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is phishing in simple terms?', a: 'Phishing is a message, most often an email or text, that impersonates a trustworthy sender to trick the recipient into clicking a malicious link, opening a malicious attachment, or handing over sensitive information like a password. It works by making a fake request look routine and safe enough that the recipient acts on it without checking.' },
    { q: 'What is the difference between phishing and spear phishing?', a: 'Broad phishing is impersonal and sent to a large number of people at once with no research behind it, relying on volume for some fraction of recipients to fall for it. Spear phishing narrows the same mechanism to one specific target using real, researched details about that person or organization, which makes it far more convincing and generally far more successful than a broad attempt.' },
    { q: 'What are smishing and vishing?', a: 'Smishing is phishing carried out over SMS text message, and vishing is phishing carried out over voice, typically a phone call. Both use the same underlying mechanism as email phishing, impersonating a trustworthy sender to get the target to act or disclose information, just delivered through a different channel.' },
    { q: 'How can you tell if a message is a phishing attempt?', a: 'Look for a sender address that does not actually match the organization it claims to be from, urgency or fear based language pushing you to act immediately, a link whose actual destination does not match its displayed text, and a request for credentials or payment through an unusual channel. Any one of these is worth pausing on, and a message with several of them together is a strong signal.' },
    { q: 'Why does urgent or fear based language work so well in phishing messages?', a: 'Because people under perceived time pressure tend to skip the verification steps they would normally take. A manufactured deadline is designed to make acting immediately feel safer than pausing to check, which is exactly backwards, and it is why verifying a request through a separate, already trusted channel, discussed in more depth in the guide to social engineering, is the control that actually defeats it.' },
  ]),

  H.cta({
    heading: 'Practice recognizing phishing in the exam format',
    body: 'The full AP Cybersecurity curriculum covers phishing alongside the rest of Unit 2, and the practice exam mixes scenario questions written the way the real exam asks them.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study Unit 2' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
