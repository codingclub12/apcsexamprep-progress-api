'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBER UNIT 1 EXAM: THE CED REBUILD  (WO-7)
//
//  WHY THIS ONE MATTERS MOST
//  It is the graded artifact at the end of the free preview unit. A prospective
//  teacher evaluates Unit 1, reaches this, and decides. It tested 13 terms that
//  appear ZERO times in the CED effective Fall 2026 (spear phishing, vishing,
//  smishing, whaling, tailgating, shoulder surfing, dumpster diving, credential
//  stuffing, rainbow tables, deepfakes, man-in-the-middle, packet sniffing,
//  rogue access points) plus pretexting and authority from Unit 2 and "defense
//  in depth", which is not Unit 1 either.
//
//  ── WHY THIS IS A REBUILD AND NOT A SPLICE TABLE ────────────────────────────
//  Topic 1.1 and Topic 1.1 Exercise 1 were surgical: most of those pages were
//  right and the fix was the parts that were not. This exam is different. The
//  contamination was not in a section, it was in the blueprint. Coverage ran
//  6 / 4 / 4 / 2 / 2 across Topics 1.1 to 1.5 while the CED's own EK counts are
//  8 / 7 / 8 / 10 / 7, so Topic 1.4 carried ten Essential Knowledge statements
//  and two questions. Rewriting individual stems would have left that intact.
//
//  So the twenty questions are authored here as data and rendered into the
//  page's existing markup. The chrome, the CSS, the sticky rail, the grading
//  engine, the score bar and the results panel are spliced around and survive
//  byte for byte.
//
//  BLUEPRINT, proportional to the CED's own EK counts:
//      Topic 1.1  Understanding Social Engineering        4   (8 EKs)
//      Topic 1.2  Suspicious Website Logins               4   (7 EKs)
//      Topic 1.3  Best Practices for Public Networks      4   (8 EKs)
//      Topic 1.4  AI-Based Cybersecurity Attacks          5   (10 EKs)
//      Topic 1.5  Leveraging AI in Cyber Defense          3   (7 EKs)
//
//  HOUSE RULES APPLIED TO EVERY ITEM
//    - harder only: spot-the-error and I/II/III multi-correct are the priority
//    - no giveaway names or entities that reveal the key
//    - options parallel in length, complexity and grammatical structure
//    - NOT and EXCEPT bolded in stems via the page's own .kw class
//    - no "all of the above" or "none of the above"; "none of the three" is a
//      real 1.1.C classification and appears once, deliberately NOT placed last
//    - keys are exactly 5 A, 5 B, 5 C, 5 D with no three consecutive the same;
//      scripts/cyber-u1-exam-ced-csv.js recomputes that and refuses to write a
//      sheet that violates it, so the balance cannot rot through an edit
//    - pure ASCII, HTML entities for anything else, no em-dashes, no emoji
//
//  Regenerate the sheet, never hand-edit it:
//    node scripts/cyber-u1-exam-ced-csv.js out/wo7-exam.csv
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-exam';
const PAGE_ID = '132079550679';
const TITLE = 'AP Cybersecurity Unit 1 Exam';

const PARTS = {
  '1.1': 'Part 1: Topic 1.1 Understanding Social Engineering',
  '1.2': 'Part 2: Topic 1.2 Suspicious Website Logins',
  '1.3': 'Part 3: Topic 1.3 Best Practices for Public Networks',
  '1.4': 'Part 4: Topic 1.4 AI-Based Cybersecurity Attacks',
  '1.5': 'Part 5: Topic 1.5 Leveraging AI in Cyber Defense',
};

const QUESTIONS = [
  // ── Topic 1.1 ─────────────────────────────────────────────────────────────
  {
    part: '1.1', topic: 'Social Engineering (1.1.A.1)', key: 'B',
    stem: 'Which of the following <span class="kw">BEST</span> describes social engineering as the CED defines it?',
    opts: [
      'Exploiting an unpatched flaw in software to reach a system without valid credentials',
      'Using psychological tactics to manipulate a user into revealing sensitive information, downloading a malicious file, or clicking a malicious link',
      'Placing equipment between two parties on a shared network in order to observe what they exchange',
      'Overwhelming a service with more requests than it can answer until legitimate users are refused',
    ],
    exp: 'EK 1.1.A.1 defines social engineering by its target and its goal. The target is a person, not a system, and the goal is one of three outcomes: revealing sensitive information, which the CED calls elicitation, downloading a malicious file, or clicking a malicious link.',
    distractors: {
      A: 'This is exploitation of a technical vulnerability. No one is manipulated, so it is outside the definition.',
      C: 'This describes interception on a network. It is a technical attack against traffic rather than against a person.',
      D: 'This describes a denial of service attack, which the CED covers at 1.3.B.2 in the context of jamming.',
    },
    tip: 'The reliable test is what was attacked. If nothing was exploited but somebody was persuaded, the category is social engineering.',
  },
  {
    part: '1.1', topic: 'Tactics and Impacts (1.1.A.2, 1.1.C)', key: 'D',
    stem: 'A district employee receives this message: &ldquo;Payroll records that remain unverified past 4:00 PM today are suspended and referred to the district office. Confirm your details at the link below.&rdquo; Which of the following are true?<br><br>I. The message uses intimidation.<br>II. The message uses urgency.<br>III. Because the message uses a named tactic, it cannot also produce one of the impacts described in EK 1.1.C.',
    opts: ['I only', 'II only', 'I and III only', 'I and II only'],
    exp: 'Both tactics are present and they are separate claims. Suspension and referral to the district office are threatened negative consequences, which is intimidation (1.1.A.2, mechanism 1.1.B.2). The 4:00 PM cutoff is a created reason to act quickly, which is urgency (1.1.A.2, mechanism 1.1.B.3). Statement III invents a rule the CED does not contain: the tactic in the message and the impact on the victim are two independent questions, and a message can carry both tactics and still produce a 1.1.C impact.',
    distractors: {
      A: 'Correct that intimidation is present, but it drops the plainly stated deadline.',
      B: 'Correct that urgency is present, but it drops the threatened suspension and referral.',
      C: 'Accepts statement III, which asserts a relationship between tactic and impact that the CED never states.',
    },
    tip: 'Ask the two tactic questions separately: what happens to me if I ignore this, and how long am I being given. Then ask what the victim handed over, which is a different question again.',
  },
  {
    part: '1.1', topic: 'Scope of the Tactics (1.1.A.2)', key: 'A',
    stem: 'A caller spends ten unhurried minutes with a teacher, threatens nothing, and comes away with her birthdate and her first pet&rsquo;s name. A student concludes: &ldquo;This is not social engineering, because neither intimidation nor urgency is present.&rdquo; Which of the following <span class="kw">BEST</span> identifies the flaw in that reasoning?',
    opts: [
      'EK 1.1.A.2 says adversaries use those tactics often rather than always, so a message using neither still meets the 1.1.A.1 definition',
      'The message does use urgency, because a request for information always implies that the sender wants a prompt reply',
      'The message does use intimidation, because a caller holding personal details has leverage over the target',
      'The student consulted the wrong list, because Topic 1.1 names five tactics rather than the two he considered',
    ],
    exp: 'The word "often" in EK 1.1.A.2 is doing real work. The tactic list describes what adversaries commonly do, not a test a message must pass to count as social engineering. Under 1.1.A.1 this is social engineering: psychological manipulation aimed at eliciting sensitive information, and what was elicited is exactly the 1.1.C.1 material used to answer challenge questions.',
    distractors: {
      B: 'This inverts the CED meaning of urgency, which is a reason to act quickly that the adversary creates. An unhurried call is the opposite.',
      C: 'This stretches intimidation past its definition, which requires a threatened negative consequence, not merely an advantage held.',
      D: 'Topic 1.1 names two tactics and no others. The longer list belongs to Topic 2.1 in Unit 2.',
    },
    tip: 'Let "neither" be an available answer and choose it when both tests fail. Do not force a message into the nearest label.',
  },
  {
    part: '1.1', topic: 'Impact Classification (1.1.C)', key: 'C',
    stem: 'An employee follows a link in an email, arrives at a page that mirrors her employer&rsquo;s login portal, and types her username and password into it. Which impact category in EK 1.1.C <span class="kw">BEST</span> applies?',
    opts: [
      'Personal information, because the credentials she entered identify her to the service',
      'None of the three, because no software was installed on her device',
      'Malware or a malicious link, because she clicked a link that directed her to a site where her credentials were captured',
      'Secure information, because a password is the secret that protects the account',
    ],
    exp: 'EK 1.1.C.3 covers three outcomes, and the third is named explicitly: a clicked link that directs the victim to a website where their login credentials can be captured. No malware has to install for 1.1.C.3 to apply.',
    distractors: {
      A: 'EK 1.1.C.1 means name, phone, address, workplace, pet names and birthdate, the material that supports impersonation and answers challenge questions. A password is not in that category.',
      B: 'A tempting answer, and it is the right instinct applied to the wrong clause. 1.1.C.3 does not require an installation; a credential capture site satisfies it on its own.',
      D: 'EK 1.1.C.2 means secure information such as a one-time password or an authentication login code, which works once and works now. A standing password typed into a fake portal is not that.',
    },
    tip: 'Classify by what the victim did, not by how serious it feels. Read a code back to a caller and it is 1.1.C.2; follow a link and type into a page and it is 1.1.C.3.',
  },

  // ── Topic 1.2 ─────────────────────────────────────────────────────────────
  {
    part: '1.2', topic: 'Signs of an Attack (1.2.A.2)', key: 'D',
    stem: 'An administrator reviews an authentication log for a single account. Which of the following are signs of an online password attack as described in EK 1.2.A.2?<br><br>I. Many failed attempts to log in within a short period<br>II. A successful login at 3:14 AM from a device the account has never used before<br>III. A password that has not been changed in more than a year',
    opts: ['I only', 'III only', 'II and III only', 'I and II only'],
    opts_note: true,
    exp: 'EK 1.2.A.2 lists three signs: many failed attempts in a short duration, logins at unusual times, and logins from unknown devices. Statement II carries two of the three at once. Statement III describes a password hygiene concern rather than evidence that an attack is underway; nothing in the log changes when a password ages.',
    distractors: {
      A: 'Correct about failed attempts, but it discards an entry showing both an unusual time and an unknown device.',
      B: 'Password age is not one of the signs in 1.2.A.2 and is not visible as an attack in a log.',
      C: 'Accepts password age as a sign and discards the failed attempts, which are the first sign the CED names.',
    },
    tip: 'The signs in 1.2.A.2 are things visible in a log at the moment of the attack. A standing weakness is not a sign.',
  },
  {
    part: '1.2', topic: 'Password Patterns (1.2.B.1)', key: 'A',
    stem: 'Which of the following passwords <span class="kw">BEST</span> matches the pattern EK 1.2.B.1 identifies as common, and therefore predictable to an adversary?',
    opts: [
      'Bailey07!',
      'fern-ferry-glass-axle',
      't9#WqL4vZm2!',
      '6Rk!pN3xYc8@',
    ],
    exp: 'EK 1.2.B.1 names three overlapping habits: a word or words followed by a two-digit number, often a year, with a special character at the end; family or pet names; and personally significant dates. Option A carries all three at once, which is what makes it guessable rather than merely short.',
    distractors: {
      B: 'A passphrase of unrelated words. Long and memorable without following any of the named patterns, which is what 1.2.C.1 recommends.',
      C: 'A random string. It contains a digit and symbols but no word, name or date for an adversary to predict.',
      D: 'Also random, and structurally similar to option C. Neither follows a pattern that a dictionary could anticipate.',
    },
    tip: 'The CED frames weak passwords by predictability, not by length or character variety. Ask whether somebody who researched the target could have guessed it.',
  },
  {
    part: '1.2', topic: 'Targeted Dictionaries (1.2.B.2)', key: 'C',
    stem: 'An adversary spends a week collecting a target&rsquo;s children&rsquo;s names, her wedding anniversary, and the street where she grew up, then loads that list into an automated login tool. Which EK <span class="kw">BEST</span> describes what the adversary is doing with the collected information?',
    opts: [
      '1.2.A.2, because a run of automated attempts will produce many failed logins on the account',
      '1.1.C.2, because information gathered about a target lets an adversary log in to a service as the victim',
      '1.2.B.2, because the adversary is building a dictionary from personal information gathered about the target',
      '1.2.C.2, because the target chose a password containing names and dates that are personally meaningful',
    ],
    exp: 'EK 1.2.B.2 is precisely this: adversaries build a dictionary from personal information gathered about a target and submit it with an automated tool. Notice where the information came from. The detail collected in a 1.1.C.1 impact is the raw material for a 1.2.B.2 dictionary, which is how Topic 1.1 and Topic 1.2 join up.',
    distractors: {
      A: 'Describes a sign the defender would see, not the thing the adversary is doing with the information.',
      B: 'EK 1.1.C.2 is about secure information such as a one-time password, which grants access immediately. Names and dates do not.',
      D: 'EK 1.2.C.2 is advice to the user about what to avoid. It is not a description of adversary behaviour.',
    },
    tip: 'When a question names both what was gathered and what was done with it, the EK you want is usually the one describing the action rather than the material.',
  },
  {
    part: '1.2', topic: 'Defenses (1.2.C)', key: 'B',
    stem: 'A district publishes the password policy below. Which rule is <span class="kw">INCORRECT</span> and would actually reduce security?',
    opts: [
      'Use a password manager to generate and store a different password for every service',
      'Require every user to replace their password with a new one every thirty days',
      'Prefer a long passphrase of several unrelated words over a short, complex string',
      'Turn on multifactor authentication on every account that offers it',
    ],
    exp: 'EK 1.2.C.1 through 1.2.C.3 give three pieces of guidance: passwords should be long, random and unique, supported by a password manager or long unique passphrases; names, dates and personally meaningful words should be avoided; and multifactor authentication should be enabled. Forced monthly replacement appears nowhere in that list, and it works against it: users made to invent a new password every month reach for exactly the word plus two-digit number plus symbol pattern EK 1.2.B.1 describes, and increment it.',
    distractors: {
      A: 'Directly recommended by 1.2.C.1, and the practical way to make every password both random and unique.',
      C: 'Also 1.2.C.1, which names long unique passphrases alongside a password manager.',
      D: 'EK 1.2.C.3, which describes multifactor authentication as extra proof of identity such as a one-time code.',
    },
    tip: 'On a spot-the-error item, check each option against the EK list rather than against instinct. The wrong one here is a habit many organisations still follow.',
  },

  // ── Topic 1.3 ─────────────────────────────────────────────────────────────
  {
    part: '1.3', topic: 'Wireless Attacks (1.3.B.1)', key: 'A',
    stem: 'A coffee shop operates a network named CafeWifi. An adversary nearby runs a wireless access point that also broadcasts the name CafeWifi with a stronger signal, and several customers connect to it without noticing. Which term does the CED use for this?',
    opts: ['Evil twin', 'Jamming', 'War driving', 'Denial of service'],
    exp: 'EK 1.3.B.1 defines an evil twin as an adversary setting up a wireless access point with an SSID similar or identical to the target network, so victims connect unknowingly and the adversary captures their traffic.',
    distractors: {
      B: 'EK 1.3.B.2. Jamming floods an area with a strong signal in the network frequency range to prevent legitimate traffic.',
      C: 'EK 1.3.B.3. War driving is detecting wireless beacons while moving, to gather information about networks and see where signal reaches.',
      D: 'The category jamming belongs to, since it denies service. Nothing is being denied here; customers connect successfully, to the wrong network.',
    },
    tip: 'All three wireless attacks in 1.3.B are distinguished by what the adversary does to the signal: imitate it, drown it, or map it.',
  },
  {
    part: '1.3', topic: 'Encryption on a Hostile Network (1.3.B.1, 1.3.C.2)', key: 'D',
    stem: 'A customer connects to the adversary&rsquo;s access point in the previous scenario and signs in to her bank, which uses HTTPS throughout. Which statement <span class="kw">BEST</span> describes what the adversary can obtain?',
    opts: [
      'The full contents of the banking session, because every packet passes through equipment the adversary controls',
      'The banking password alone, because credentials are transmitted before the encrypted session is established',
      'Nothing whatever, because a site using HTTPS cannot be reached through an adversary-controlled access point',
      'Her traffic, but not the contents of the encrypted portion, because an adversary cannot read encrypted traffic such as HTTPS',
    ],
    exp: 'EK 1.3.B.1 is explicit on this point: the adversary captures the victim traffic but cannot read encrypted traffic like HTTPS. Controlling the path is not the same as being able to read what travels along it.',
    distractors: {
      A: 'The common misconception this EK exists to correct. Carrying the traffic does not decrypt it.',
      B: 'HTTPS establishes encryption before any credential is sent, so there is no window in which the password travels in the clear.',
      C: 'Overcorrects in the other direction. The connection works normally; that is what makes an evil twin effective.',
    },
    tip: 'EK 1.3.C.2 adds the useful qualifier: most protocols are encrypted, but consider how sensitive the data is before joining, because some traffic such as DNS queries is still exposed.',
  },
  {
    part: '1.3', topic: 'Adversaries and Attacks (1.3.A.1, 1.3.B)', key: 'B',
    stem: 'Which of the following statements are consistent with the CED&rsquo;s treatment of adversaries and wireless attacks?<br><br>I. Flooding an area with a strong signal in the network&rsquo;s frequency range is a denial of service attack.<br>II. Detecting wireless beacons while moving through an area, to learn what networks are present, is war driving.<br>III. A low-skilled adversary is distinguished by the ability to find vulnerabilities that have never been documented.',
    opts: ['I only', 'I and II only', 'II and III only', 'I and III only'],
    exp: 'Statement I restates EK 1.3.B.2, which names jamming and then says plainly that this is a denial of service attack. Statement II restates EK 1.3.B.3. Statement III reverses EK 1.3.A.1: creating or modifying tools and finding undocumented vulnerabilities, which the CED calls zero days, describes the high-skilled adversary. The low-skilled adversary uses tools made by others against vulnerabilities that are already known.',
    distractors: {
      A: 'Correct about jamming, but discards an accurate statement of war driving.',
      C: 'Accepts the reversed description of adversary skill in statement III.',
      D: 'Also accepts statement III, and discards war driving.',
    },
    tip: 'EK 1.3.A.2 is worth holding alongside this: motivations listed include greed, recognition, dedication to a cause, revenge, politics and beliefs. Skill and motive are separate axes.',
  },
  {
    part: '1.3', topic: 'Public Network Practices (1.3.C)', key: 'C',
    stem: 'A student writes four claims about using public Wi-Fi safely. Which claim is <span class="kw">INCORRECT</span>?',
    opts: [
      'Checking that the network name matches the intended network exactly is a reasonable precaution before connecting',
      'A VPN prevents the internet service provider from seeing the traffic that passes through it',
      'A VPN removes the need to trust any third party with the contents of the traffic',
      'Some traffic, such as DNS queries, may still be exposed when joining an unencrypted network',
    ],
    exp: 'EK 1.3.C.1 gives the VPN both ways in a single statement: it encrypts traffic to the VPN operator&rsquo;s system, which stops the internet service provider from seeing it, but the VPN provider can see it. A VPN moves the trust rather than removing it.',
    distractors: {
      A: 'EK 1.3.C.3, which says to verify the network name matches exactly. That is the defence against the evil twin in 1.3.B.1.',
      B: 'The half of EK 1.3.C.1 that is true. It is the reason people use a VPN in the first place.',
      D: 'EK 1.3.C.2 names DNS queries specifically as vulnerable on an unencrypted network.',
    },
    tip: 'When an EK states a benefit and a limitation in the same breath, the exam usually tests the limitation.',
  },

  // ── Topic 1.4 ─────────────────────────────────────────────────────────────
  {
    part: '1.4', topic: 'Digital Avatars (1.4.A.1)', key: 'C',
    stem: 'An adversary uses AI tools and publicly available recordings to build a convincing synthetic version of a chief executive&rsquo;s voice. EK 1.4.A.1 calls the result a digital avatar. Which of the following <span class="kw">BEST</span> explains why the CED identifies this as a rising risk?',
    opts: [
      'Synthetic audio has become indistinguishable from live speech under every possible playback condition',
      'Organisations increasingly discard recorded audio, removing the evidence that would expose the impersonation',
      'Organisations increasingly adopt voice-based authentication, which a convincing avatar can defeat',
      'Generative models can now produce a usable avatar without any sample of the target&rsquo;s voice at all',
    ],
    exp: 'EK 1.4.A.1 pairs the capability with the reason it matters now: AI tools use existing voice and image samples to create a digital avatar enabling impersonation by phone or video, and the risk is rising as organisations adopt voice-based authentication. The technique meets a control that was designed to trust a voice.',
    distractors: {
      A: 'Overstates the capability, and it is not the reason the CED gives.',
      B: 'A plausible sounding claim about evidence handling that the CED does not make.',
      D: 'Contradicts the EK, which says the tools work from existing voice and image samples.',
    },
    tip: 'The CED never uses the word "deepfake". The term to know for Topic 1.4 is digital avatar.',
  },
  {
    part: '1.4', topic: 'AI-Written Messages (1.4.A.2)', key: 'A',
    stem: 'Awkward phrasing and obvious grammatical errors were for years a dependable signal that a message was fraudulent. Which statement <span class="kw">BEST</span> captures the CED&rsquo;s explanation of why that signal has weakened?',
    opts: [
      'Generative AI and large language models produce fluent, convincing messages in any language, removing the unnatural language that used to give a message away',
      'Adversary groups increasingly recruit native speakers, which has raised the average quality of the messages they send',
      'Modern mail clients correct grammar as messages are composed, concealing errors a reader would otherwise notice',
      'Fraudulent messages now arrive mostly by text message, a channel where informal and clipped phrasing is expected',
    ],
    exp: 'EK 1.4.A.2 says that generative AI and large language models create convincing phishing messages in any language, and that unnatural language used to be a tell which AI removes. The defensive consequence is that readers cannot rely on how a message is written.',
    distractors: {
      B: 'A real phenomenon, but not the mechanism the CED describes, and it does not scale the way the EK does.',
      C: 'Grammar correction applies to what the reader writes, not to what arrives in the inbox.',
      D: 'Changes the channel rather than the quality of the language, which is what the EK is about.',
    },
    tip: 'Where an old detection signal has stopped working, expect the exam to ask what replaces it. The answer is verification through a separate channel, not closer reading.',
  },
  {
    part: '1.4', topic: 'Attacks on AI Systems (1.4.A.3, 1.4.A.4)', key: 'D',
    stem: 'A student compares two AI-related attacks described in the CED. Which statement is <span class="kw">INCORRECT</span>?',
    opts: [
      'An adversary can craft prompts designed to make a language model reveal secure or sensitive information',
      'Information surfaced by such a prompt may come from the model&rsquo;s training data as well as from what users have entered',
      'An adversary can publish or modify websites with false information so that it is absorbed into a model&rsquo;s training set',
      'Both of those attacks require the adversary to hold administrative access to the model or its infrastructure',
    ],
    exp: 'Neither attack requires privileged access, which is what makes them practical. EK 1.4.A.3 describes prompts that extract sensitive information, available to anyone who can type into the model. EK 1.4.A.4 describes publishing or modifying websites so false information enters training sets, available to anyone who can put a page on the internet.',
    distractors: {
      A: 'A direct statement of EK 1.4.A.3.',
      B: 'Also 1.4.A.3, which names both user input and training data as sources.',
      C: 'A direct statement of EK 1.4.A.4.',
    },
    tip: 'On a spot-the-error item with three restatements and one addition, the addition is usually the error. Read the option that generalises rather than describes.',
  },
  {
    part: '1.4', topic: 'AI in Adversary Workflows (1.4.A.5, 1.4.A.6)', key: 'B',
    stem: 'Which of the following adversary uses of AI are described in the CED?<br><br>I. Scanning social media and public websites to gather information about targets<br>II. Writing malware, modifying code maliciously, and finding vulnerabilities in large codebases<br>III. Negotiating payment with victims automatically once an intrusion has succeeded',
    opts: ['I only', 'I and II only', 'II and III only', 'I and III only'],
    exp: 'Statement I is EK 1.4.A.5, AI-powered reconnaissance across social media and public websites. Statement II is EK 1.4.A.6, AI coding tools used to write malware, modify code maliciously, or find vulnerabilities in large codebases. Statement III describes something that happens in the world but appears nowhere in the CED, and an option can be entirely realistic while still being outside the course.',
    distractors: {
      A: 'Correct about reconnaissance, but discards the coding uses that 1.4.A.6 names explicitly.',
      C: 'Accepts statement III and discards reconnaissance.',
      D: 'Accepts statement III and discards the coding uses.',
    },
    tip: 'A statement being true of the real world does not put it in the CED. On a Roman numeral item, judge each statement against the framework, not against the news.',
  },
  {
    part: '1.4', topic: 'Defending Against AI Attacks (1.4.B)', key: 'D',
    stem: 'A family wants a practical defence against a phone call from someone who sounds exactly like a relative and asks for money urgently. Which defence does EK 1.4.B.1 describe for this situation?',
    opts: [
      'Requiring the caller to send a text message from the relative&rsquo;s known number before any money moves',
      'Recording every incoming call so the audio can afterwards be analysed for signs of synthesis',
      'Declining every request for money made by telephone, whoever the caller appears to be',
      'Agreeing in advance on a shared secret that a real relative would know and an impersonator would not',
    ],
    exp: 'EK 1.4.B.1 recommends establishing shared secrets with close friends and relatives to verify identity in high-stakes situations. It works because it asks for something the avatar cannot obtain from public recordings, which is the specific weakness of a cloned voice.',
    distractors: {
      A: 'Reasonable in general, but a number can be spoofed and the EK names a different defence.',
      B: 'Analysis after the fact does not help during the call, which is when the decision is made.',
      C: 'Blanket refusal is not what the CED recommends, and it fails the moment a request is genuine.',
    },
    tip: 'The other three 1.4.B defences are worth knowing together: enable multifactor authentication, keep sensitive data out of AI tools, and verify AI output against reputable non-AI sources.',
  },

  // ── Topic 1.5 ─────────────────────────────────────────────────────────────
  {
    part: '1.5', topic: 'AI Recommendations (1.5.A)', key: 'C',
    stem: 'A vendor makes four claims about applying AI to cyber defence. Which claim is <span class="kw">INCORRECT</span> according to the CED?',
    opts: [
      'AI can review security configurations such as firewall rules and access controls and recommend improvements',
      'AI can analyse application code for vulnerabilities and recommend mitigations for what it finds',
      'Detection rules that AI generates can be deployed directly, since the model has already validated them',
      'AI can suggest rules for the automated systems that detect malicious activity',
    ],
    exp: 'The same clause appears in all three of EK 1.5.A.1, 1.5.A.2 and 1.5.A.3: the output must be checked by a knowledgeable human. Configuration review must be checked by a security technician, code analysis reviewed by a knowledgeable programmer, and detection rules reviewed by a detection engineer. Option C removes exactly the clause the CED repeats three times, which is a strong signal it is highly assessable.',
    distractors: {
      A: 'EK 1.5.A.1, and true as far as it goes. The recommendation still requires review.',
      B: 'EK 1.5.A.2, on the same terms.',
      D: 'EK 1.5.A.3. AI suggests the rules; a detection engineer reviews them.',
    },
    tip: 'When a phrase repeats across every EK in a learning objective, it is not filler. It is the assessable point.',
  },
  {
    part: '1.5', topic: 'Why AI Triage (1.5.B.1, 1.5.B.2)', key: 'A',
    stem: 'Which statement <span class="kw">BEST</span> captures the CED&rsquo;s reasoning for applying AI to security monitoring?',
    opts: [
      'Organisations generate millions of digital events each day that people cannot examine individually, so AI sorts the likely-malicious ones from the harmless ones',
      'AI evaluates security events more accurately than trained analysts, so human review of its conclusions is no longer necessary',
      'AI reduces the number of events an organisation generates, which lowers the volume that has to be monitored at all',
      'AI retains events for longer than conventional systems, which allows an investigation to reach further into the past',
    ],
    exp: 'EK 1.5.B.1 states the problem, millions of daily digital events that humans cannot examine, and EK 1.5.B.2 states the response, AI sorting likely-malicious events from harmless ones. The argument is about volume, not about accuracy.',
    distractors: {
      B: 'Contradicts the human review clause that runs through the whole of 1.5.A.',
      C: 'AI analyses the events an organisation produces; it does not reduce how many are produced.',
      D: 'Retention is a property of storage, and it is not the reasoning the CED gives.',
    },
    tip: 'Distinguish the two halves of 1.5.B: 1.5.B.1 and 1.5.B.2 explain why AI is used, while 1.5.B.3 and 1.5.B.4 describe what happens once it finds something.',
  },
  {
    part: '1.5', topic: 'Response and Intervention (1.5.B.3, 1.5.B.4)', key: 'B',
    stem: 'An AI monitoring system identifies activity it assesses as likely malicious. According to EK 1.5.B.3 and 1.5.B.4, what happens next?',
    opts: [
      'It isolates the affected accounts and closes the case, since no person needs to be involved in a decision the model has already made',
      'It alerts human personnel or takes specific corrective actions, so the team can catch the malicious activity and intervene quickly',
      'It refers the event to the software vendor, who determines whether any response is warranted',
      'It files the event for the next scheduled review, so that analysts can assess a batch of events together',
    ],
    exp: 'EK 1.5.B.3 gives two possible responses, alerting human personnel or taking specific corrective actions, and EK 1.5.B.4 gives the purpose: teams catch malicious activity and intervene quickly. Speed of human intervention is the outcome the CED is after.',
    distractors: {
      A: 'Removes the human entirely, which runs against both 1.5.B.3 and the review clause in 1.5.A.',
      C: 'Introduces an external party the CED does not mention, and it would defeat the speed 1.5.B.4 describes.',
      D: 'Batching defers exactly the quick intervention that 1.5.B.4 names as the point.',
    },
    tip: 'EK 1.5.B.3 offers alerting OR corrective action. An option that allows only one of the two is narrower than the CED.',
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

function esc(s) {
  return String(s).replace(/&(?!#?\w+;)/g, '&amp;');
}

//  Renders into the page's existing markup exactly: .q-block / .q-header /
//  .q-num / .q-topic / .q-stem / .options / .check-btn / .feedback-box with its
//  four children. The grading engine keys off id="q-eN", name="qeN", id="fb-eN"
//  and checkQ('eN'), so those are generated from the index and never typed.
function renderQuestion(q, i) {
  const id = `e${i + 1}`;
  const opts = q.opts.map((text, k) => {
    const L = LETTERS[k];
    return `<label class="option-label"><input type="radio" name="q${id}" value="${L}"> <span>(${L}) ${esc(text)}</span></label>`;
  }).join('\n');
  const distractors = LETTERS
    .filter((L) => L !== q.key)
    .map((L) => `<p><strong>(${L})</strong> ${esc(q.distractors[L] || '')}</p>`)
    .join('\n');
  return `<div class="q-block" id="q-${id}">
  <div class="q-header">
    <span class="q-num">Q${i + 1}</span>
    <span class="q-topic">${esc(q.topic)}</span>
  </div>
  <div class="q-stem">${q.stem}</div>
  <div class="options">
${opts}
</div>
  <button class="check-btn" onclick="checkQ('${id}')">Check Answer</button>
  <div class="feedback-box" id="fb-${id}">
    <div class="fb-verdict"></div>
    <div class="fb-exp">${esc(q.exp)}</div>
    <div class="fb-distractors">
${distractors}
</div>
    <div class="fb-tip">
<strong>AP Exam Tip:</strong> ${esc(q.tip)}</div>
  </div>
</div>`;
}

function renderQuestions() {
  const out = [];
  let part = null;
  QUESTIONS.forEach((q, i) => {
    if (q.part !== part) {
      part = q.part;
      out.push(`<div class="section-break">&#9135; ${PARTS[part]} &#9135;</div>`);
    }
    out.push(renderQuestion(q, i));
  });
  return out.join('\n\n') + '\n';
}

function answerKey() {
  const map = {};
  QUESTIONS.forEach((q, i) => { map[`e${i + 1}`] = q.key; });
  return map;
}

module.exports = {
  HANDLE, PAGE_ID, TITLE, PARTS, QUESTIONS, LETTERS,
  renderQuestion, renderQuestions, answerKey,
};
