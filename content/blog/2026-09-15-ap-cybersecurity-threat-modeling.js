'use strict';
// Weekly course post: AP Cybersecurity. Drill track: a study method, not a
// single topic. Threat modeling a personal device is used here as a hands-on
// rehearsal for the asset, threat, CIA property, control reasoning chain the
// exam's scenario questions score. Companion to the scenario reading post,
// which teaches the reading discipline this exercise gives you something
// concrete to practice it on. One short reference back, no re-teaching.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why threat modeling your own phone works as exam prep',
  'Step one: list what is actually worth protecting',
  'Step two: list the realistic threats against those assets',
  'Step three: match each threat to a CIA property and a control',
  'Why this is exactly the reasoning AP Cybersecurity scenario questions score',
  'Two practice questions in the scenario format',
  'Frequently asked questions',
];

const meta = {
  title: 'Threat Modeling Your Own Phone: An AP Cybersecurity Practice Drill',
  handle: 'ap-cybersecurity-threat-modeling-your-phone',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'threat modeling',
  publishOn: '2026-09-18',
  seoTitle: 'Threat Modeling Your Phone: AP Cybersecurity Practice',
  seoDescription: 'Threat modeling your own phone is a ten minute exercise that turns CIA triad vocabulary into reasoning practice for AP Cybersecurity scenario questions.',
  summary: 'Threat modeling sounds like a term you memorize for a multiple choice question, but it works far better as something you actually do, on a device you already own. This guide walks through modeling threats to your own phone: naming what is actually worth protecting, listing the realistic ways it could be attacked, and for each threat, reasoning through which CIA property is at risk and what control closes the gap. That asset, threat, property, control chain is the exact reasoning AP Cybersecurity scenario questions are built to score, so practicing it on your own phone is rehearsal for the real exam, not a detour from it.',
  tags: ['AP Cybersecurity', 'Threat Modeling', 'CIA Triad', 'Study Strategy', 'Exam Strategy'],
};

const body = H.article([
  H.dek('Threat modeling your own phone is a ten minute exercise, not a vocabulary term to memorize, and it teaches the CIA triad and attack surface thinking far better than a flashcard does. This guide walks through the exercise step by step, then shows why the reasoning it builds is the exact skill AP Cybersecurity scenario questions are written to score.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Most students first meet threat modeling as a definition: a structured way to identify what could go wrong with a system and decide what to do about it. That definition is accurate and almost useless on its own, because it describes a process without giving you anywhere to run it. The fix is not a better definition. It is a system small enough to reason about completely and personal enough that you already care about the outcome: the phone in your pocket.'),
  H.p('Threat modeling your own phone means walking through the same four questions a security team asks about a network or an application, applied to a device you use every day. What is actually worth protecting on it. What could realistically go wrong. Which property of that asset, its confidentiality, its integrity, or its availability, each threat actually puts at risk. And what control would close that specific gap. Do this once, on paper, for your own phone, and the CIA triad stops being three words you look up and becomes a lens you already know how to point at a new situation.'),
  H.p('That last part is the entire reason this is worth doing as exam prep and not just as good digital hygiene. AP Cybersecurity does not ask you to recite the CIA triad. It hands you a scenario, usually about a device, a network, or an organization, and asks you to work out which property was threatened and which control would have mattered. A student who has only ever seen that reasoning chain applied to unfamiliar companies in practice questions is applying an abstract skill to an abstract situation. A student who has already run the same chain against their own phone, where the assets and the stakes are real, is applying a skill they have actually rehearsed.'),
  H.box('key', 'The reframe that makes this stick', '<p>Do not think of threat modeling as a security team\'s job that happens to appear on your exam. Think of it as the reasoning chain the exam is built around: name the asset, name the threat, name the property that threat endangers, name the control that closes the gap. Running that chain against your own phone is the cheapest, most concrete rehearsal available, because you already know exactly what is on it.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The exercise starts with a plain list, not a security concept. Open your phone and actually name what is on it that you would not want a stranger to have, lose, or change. Most students land on some version of the same five categories, and it is worth writing your own version out rather than skimming this list, because the exercise only works if the assets are specifically yours.'),
  H.ul([
    'Messages and photos: texts, chat threads, and pictures that are private by default, not because any single one is scandalous but because you did not choose to publish them.',
    'Banking and payment apps: an app that can move real money, or a card saved for one tap checkout, is worth more to an attacker than almost anything else on the device.',
    'Saved passwords and login sessions: a password manager or a browser that stays logged into email, social accounts, and school accounts is a single point that unlocks many others.',
    'Location history and current location: a phone knows where you have been and, if you are using it right now, where you are, which is a different kind of private than a photo is.',
    'The device itself, and what losing access to it costs you: two factor codes, saved boarding passes, a class schedule app, anything that assumes the phone will be there when you reach for it.',
  ]),
  H.p('Notice what this list is not. It is not a list of apps ranked by how much you use them. It is a list ranked by what an attacker, or plain bad luck, could actually do with each one. A game you play for twenty minutes a day is on your phone but is not on this list, because losing it costs you almost nothing. A banking app you open once a week is on this list, because losing control of it costs you a great deal. Threat modeling starts by sorting for consequence, not for frequency, and that sorting step is itself worth practicing, because AP Cybersecurity scenarios frequently include a detail meant to look important that turns out not to be the asset actually at risk.'),

  H.h2(SECTIONS[2]),
  H.p('With the asset list written, the next step is naming realistic threats against it, one at a time, resisting the pull toward exotic scenarios. A phone is far more likely to be lost on a bus than targeted by a state sponsored actor, and a study method that only rehearses the dramatic case is not rehearsing the case the exam and your actual life both draw from most often.'),
  H.ul([
    'Lost or stolen device: the phone leaves your hands, whether through theft or through your own carelessness, and someone else now has physical access to it.',
    'A phishing link: a text or email that looks like it is from a real service, asking you to log in, confirm a payment, or update an account, when it is actually designed to capture whatever you type.',
    'A malicious or overreaching app: something installed from outside a trusted source, or something legitimate that asks for far more access than its stated purpose requires.',
    'Interception on public wifi: logging into something sensitive on a network you do not control, where traffic between your phone and the router can potentially be observed by another device on that same network.',
    'Shoulder surfing: someone nearby simply looking at your screen while you type a passcode, read a message, or check a balance, no technical skill required at all.',
  ]),
  H.p('Five threats against five assets already gives you twenty five possible pairings, and a real threat model does not treat them as equally likely or equally severe. A lost device threatens almost everything on the list at once, which is exactly why it deserves more attention than a single row in a table would suggest. A phishing link mostly threatens whatever account the link is impersonating. Matching threats to the specific assets they actually endanger, rather than treating every threat as a blanket risk to everything, is the reasoning step most students skip, and it is the step AP Cybersecurity rewards most directly.'),

  H.h2(SECTIONS[3]),
  H.p('This is the step that actually builds exam skill, because it forces you to commit to an answer rather than gesture at a general sense that something is unsafe. For each threat against each asset it realistically endangers, name the single CIA property most directly at risk, then name one control that would close that specific gap. Vague answers like "be more careful" do not count. A control has to be something you could actually point to: a setting, a habit, a piece of software.'),
  H.p('Here is a worked version built from the assets and threats above. Treat it as a template, not a rulebook: your own version, built from your own phone, is worth more than memorizing this one.'),
  H.table(
    ['Asset', 'Threat', 'CIA property threatened', 'Mitigating control'],
    [
      ['Messages, photos, and saved passwords', 'Phone is lost or stolen and has no lock screen set', 'Confidentiality', 'A screen lock with a PIN, pattern, or biometric, combined with remote locate and remote wipe turned on ahead of time'],
      ['Banking app login and email account', 'A phishing text claims your account is locked and links to a fake login page', 'Confidentiality, and Integrity if the stolen credentials are then used to change account details', 'Never logging in through a link from a text or email; opening the real app or typing the real address directly, and turning on two factor authentication so a captured password alone is not enough'],
      ['Contacts, photos, and stored data across other apps', 'An app installed outside a trusted app store asks for access to contacts and files it does not need for its stated purpose', 'Confidentiality', 'Installing only from the official app store and reviewing requested permissions before granting them, denying anything unrelated to the app\'s actual function'],
      ['Banking app session and login credentials', 'Logging into a banking app while connected to open, unsecured wifi at a coffee shop or airport', 'Confidentiality', 'Saving sensitive logins for a trusted network or a cellular connection, or using a reputable VPN if a sensitive login cannot wait'],
      ['Messages and account balances visible on screen', 'Someone standing nearby reads a passcode or a balance directly off the screen', 'Confidentiality', 'Positioning the screen away from view when entering a passcode in public, and turning off message previews on the lock screen'],
      ['Access to two factor codes, saved passes, and daily-use accounts', 'The device itself is lost with no recent backup, so the data is not just exposed, it is gone', 'Availability', 'Regular automatic backup to a cloud account, so losing the physical device does not mean losing access to the data it held'],
    ]
  ),
  H.p('Two things in that table are worth noticing on purpose. First, most rows land on confidentiality, because most everyday phone threats are about someone unauthorized seeing or reaching data, not about that data being altered or made unavailable. That is not a coincidence and it is not universal. It reflects what phones actually hold, mostly private information rather than systems other people depend on staying online, and a different asset, like a hospital\'s patient portal, would tilt toward availability instead. Second, the phishing row threatens two properties at once, which is normal and is exactly the kind of case a scenario question likes to test: the exam wants to know whether you can name the property that is primarily at risk in a given telling of the story, not just list every property that could theoretically apply.'),
  H.box('warn', 'The mistake that undoes the whole exercise', '<p>Writing "hackers" as the threat and "be safer online" as the control. Neither one is specific enough to be useful, and neither one would earn credit on an exam scenario either. A threat is a specific event: a lost device, a fake login page, an overreaching app. A control is a specific, nameable action: a lock screen, two factor authentication, checking permissions before installing. If you cannot point to the setting or the habit, you have not actually named a control yet.</p>'),

  H.h2(SECTIONS[4]),
  H.p('The reason this exercise transfers so directly is that AP Cybersecurity scenario questions are built from the same four part chain: a paragraph establishes an asset and a threat against it, and the answer choices ask you to identify either the CIA property at stake or the control that would have addressed it. Our guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-scenario-question-evidence">reading security scenario questions for the evidence they give you</a> covers the reading discipline for pulling those facts out of an unfamiliar paragraph under exam time pressure. This exercise gives you something different but complementary: practice building that same asset, threat, property, control chain yourself, from the ground up, on a system you already understand completely.'),
  H.p('That difference matters because reading comprehension and reasoning are not the same skill, even though the exam tests them together. A student can learn to spot the facts in a scenario paragraph and still freeze on the actual judgment call: which property is really at risk here, and which control actually addresses it rather than just sounding relevant. Threat modeling your own phone practices that judgment call directly, with no reading comprehension layer in the way, because you already know every fact about the scenario before you start. Once the judgment itself is fast and confident, applying it to an unfamiliar paragraph on exam day is a smaller step than building both skills at once during the exam itself.'),
  H.p('It is also worth connecting this exercise back to the triad itself. Our guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">the CIA triad as the exam\'s grading rubric</a> makes the case that confidentiality, integrity, and availability are not vocabulary the exam checks once in Unit 1, they are the lens nearly every later scenario is graded through. Threat modeling your phone is the fastest way to make that lens automatic, because you are applying it six or eight times in a single sitting, against assets you already care about, rather than encountering it once every few practice questions spread across a study session.'),

  H.h2(SECTIONS[5]),
  H.p('Both questions below are written in the scenario format the real exam uses: a short paragraph establishing a device, an event, and what was and was not observed, followed by answer choices that test whether you can name the property or the control the paragraph actually supports.'),
  H.mcq({
    n: 1,
    stem: 'A student\'s phone is stolen out of an open backpack pocket during lunch. The phone did not have a screen lock set up, but the student had enabled remote locate and remote wipe through the manufacturer\'s account several weeks earlier. Within minutes of noticing the theft, the student uses a friend\'s laptop to trigger a remote wipe, erasing the phone\'s contents before the thief has unlocked it. Which CIA property did the remote wipe primarily protect, given that no lock screen had been set?',
    options: [
      'Availability, because the wipe restored the student\'s access to the device',
      'Confidentiality, because the wipe prevented the thief from reading the data stored on the phone',
      'Integrity, because the wipe reversed any changes the thief may have made',
      'Non-repudiation, because the wipe proved the student was not responsible for the theft',
    ],
    correct: 1,
    why: 'Work through what the remote wipe actually did and did not do. It did not restore the student\'s access to the device, since the phone itself is still gone and now erased, so it is not an availability control in this telling, and if anything it costs the student some availability of their own data unless a backup exists. It did not reverse any changes to data, because the scenario never states any changes were made, so integrity is not what is at stake. Non-repudiation is about proving who performed an action and has nothing to do with erasing a device. What the wipe actually accomplished, and the only thing it accomplished, was removing the data before an unauthorized person with physical access to the device could read it, which is a direct protection of confidentiality. The missing lock screen matters here too: it is the gap that made the wipe necessary in the first place, since a lock screen would have slowed or blocked access on its own.',
  }),
  H.mcq({
    n: 2,
    stem: 'While waiting for a flight, a student connects to the airport\'s free public wifi network and logs into a banking app to check whether a deposit has arrived, entering a username and password over that connection. A security researcher later demonstrates that anyone else connected to that same public network could have used freely available software to intercept unencrypted traffic passing between devices and the network\'s router. Which statement correctly identifies the threat and the control that would have most directly prevented it?',
    options: [
      'The threat is a malicious app, and the control is reviewing app permissions before installing',
      'The threat is interception on an untrusted network, and the control is waiting for a trusted connection or using a reputable VPN before logging into the banking app',
      'The threat is shoulder surfing, and the control is turning off lock screen notification previews',
      'The threat is a lost device, and the control is enabling remote wipe',
    ],
    correct: 1,
    why: 'Match the facts in the paragraph to each option before picking one. Nothing in the scenario describes installing an app or granting it permissions, so the malicious app option does not fit the facts given, even though it is a real threat in other situations. Nothing describes anyone physically viewing the screen, which rules out shoulder surfing. Nothing describes the device leaving the student\'s hands, which rules out a lost device and remote wipe as the relevant control. What the paragraph actually establishes is a login to a sensitive account performed over a network where traffic could be observed by another party on that same network, which is interception on an untrusted network. The control that directly addresses that specific threat is avoiding the sensitive login on that network entirely, saving it for a trusted connection, or using a reputable VPN if the login genuinely cannot wait. A well built threat model treats the network itself as part of the threat, not just the device.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'What does threat modeling actually mean in simple terms?', a: 'Threat modeling means working through a system on purpose to answer four questions: what is worth protecting, what could realistically go wrong, which property of that asset would be harmed, and what control would close the gap. Applied to a phone, it takes about ten minutes and turns an abstract security process into something concrete you have actually practiced.' },
    { q: 'Why practice threat modeling on my own phone instead of a made up company scenario?', a: 'Because you already know every fact about your own phone: what is on it, how you use it, and what losing each piece would actually cost you. That removes the reading comprehension step entirely, so the exercise isolates the judgment skill, matching a threat to the correct CIA property and the correct control, that AP Cybersecurity scenario questions are built to test.' },
    { q: 'How is this different from the scenario reading method taught elsewhere on this site?', a: 'The scenario reading method teaches how to pull facts out of an unfamiliar paragraph under exam time pressure. This exercise teaches the reasoning chain itself, asset to threat to CIA property to control, by having you build it from scratch on a system you understand completely. They are companion skills: one is about extracting the facts, the other is about knowing what to do with them once you have them.' },
    { q: 'Do most phone threats really come down to confidentiality?', a: 'For an everyday personal phone, yes, most of the time, because most of what a phone holds is private information rather than a system other people depend on staying online. That is worth noticing rather than assuming, though, since a different kind of asset, like a hospital system or a public website, tilts toward availability or integrity instead, and the exam expects you to reason about which property fits the specific scenario in front of you rather than defaulting to one answer.' },
    { q: 'Where can I practice this same reasoning chain in the real exam format?', a: 'The <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> covers the five units the exam draws its scenarios from, our guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-scenario-question-evidence">reading security scenario questions for the evidence they give you</a> covers the reading method that pairs with this exercise, and the <a href="/pages/ap-cybersecurity-practice-exam">practice exam</a> mixes both question types in the real format so you can run the full chain under actual timing.' },
  ]),

  H.cta({
    heading: 'Turn this reasoning into exam-ready practice',
    body: 'You just built an asset, threat, property, control chain from your own phone. The AP Cybersecurity practice exam hands you the same chain wrapped in unfamiliar scenarios, in the real question format, so you can rehearse recognizing it under timed conditions.',
    links: [
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam' },
      { href: '/pages/ap-cybersecurity-course', text: 'See the full course', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
