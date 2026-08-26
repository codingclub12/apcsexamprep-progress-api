'use strict';
// -----------------------------------------------------------------------------
//  AP CYBERSECURITY UNIT 1 LESSON QUIZZES - authoritative server-owned bank.
//
//  WHY THIS FILE REPLACES seed/cyber-quiz-bank.js
//  That file carried a "representative placeholder set" labelled lesson 1.1 whose
//  questions were CIA triad and denial of service, which is Unit 2 material. It
//  was never seeded to production (GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz
//  answered "No server-scored quiz for this location" on 2026-08-26), so nothing
//  downstream depends on those qids.
//
//  WHERE THIS CONTENT COMES FROM
//  The shipped teacher bundle, which is the artifact teachers grade from and the
//  one a teacher reported as correct:
//
//    Unit 1 Course Preview / Lesson_1.1_Understanding_Social_Engineering / Quiz /
//      Quiz_KEY.docx   9 items, 15 minutes, key 1-A 2-C 3-B 4-D 5-A 6-B 7-C 8-B 9-D
//    Unit 1 Course Preview / Lesson_1.2_Suspicious_Website_Logins / Quiz /
//      Quiz_KEY.docx   12 items, 25 minutes, key 1-C 2-A 3-D 4-B 5-A 6-A 7-C 8-C
//                                                 9-B 10-D 11-B 12-D
//
//  The KEY copy is the source rather than the STUDENT copy on purpose. The
//  STUDENT copies drop the CED reference out of several stems, leaving text that
//  reads "According to, social engineering attacks..." (1.1 Q2) and "Lists the
//  common patterns..." (1.2 Q11). The KEY copies carry the full stem. That defect
//  is recorded separately; it is a bundle bug, not a reason to seed broken stems.
//
//  WHOLE POOL, NOT N-of-M. serve_count is 0 for both locations. A teacher using
//  this as a graded assessment needs every student to sit the same instrument as
//  the paper quiz they already hand out. N-of-M sampling is right for practice
//  and wrong for a common assessment, so it stays off here.
//
//  Zero PII: author content only. ASCII only, and no em-dashes, per repo
//  convention. Curly quotes in the source documents are normalized to ASCII.
// -----------------------------------------------------------------------------

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const ACTIVITY = 'quiz';

function qid(lesson, n) { return `${COURSE}:${UNIT}:${lesson}:${ACTIVITY}#${n}`; }

// -- Lesson 1.1, Understanding Social Engineering -----------------------------
const L11 = [
  {
    prompt: 'A student gets a text: "This is IT Support. Your account will be permanently deleted in 5 minutes unless you reply with the 6-digit code we just sent." Per EK 1.1.A.2, which two tactics does this message use?',
    options: [
      'Intimidation, the threat of permanent deletion, and urgency, the 5-minute deadline',
      'Reciprocity and authority bias, two named CED social-engineering tactics',
      'Urgency only, because the message contains no threatened negative consequence',
      'Intimidation only, because the deadline is informational rather than pressure to act fast',
    ],
    correct_index: 0,
    explanation: 'EK 1.1.A.2 names exactly two tactics. Intimidation is threatening a target with negative consequences if they do not comply, here permanent account deletion. Urgency is creating a reason to act quickly, here the 5-minute deadline. The message uses both. Option B invents tactics the CED does not list for this EK, and options C and D each ignore one of the two tactics that are plainly present.',
  },
  {
    prompt: 'According to EK 1.1.A.1, social engineering attacks use psychological tactics to manipulate users into doing which of the following?',
    options: [
      'Patching software, rotating passwords, or enabling multifactor authentication',
      'Encrypting a hard drive, wiping a device, or disabling a firewall setting',
      'Revealing sensitive information, downloading a malicious file, or clicking a malicious link',
      'Resetting a router, clearing browser history, or updating an operating system',
    ],
    correct_index: 2,
    explanation: 'EK 1.1.A.1 states the goals precisely: manipulate users into revealing sensitive information (elicitation), downloading a malicious file, or clicking a malicious link. The other options list defensive or unrelated technical actions that are not the manipulated behaviors named in the EK.',
  },
  {
    prompt: "A teacher asks which channels social engineering can arrive through, per EK 1.1.A.1. Which option best matches the CED's list?",
    options: [
      'Only through email attachments scanned by a mail server before delivery',
      'In person, or by email, text message, or social media messages',
      'Only through automated network scans that need no human interaction',
      'Exclusively in person, since the tactics require face-to-face contact',
    ],
    correct_index: 1,
    explanation: 'EK 1.1.A.1 says social engineering can be performed in person but is often done by email, by text message, or through social media messages. Options A and C wrongly narrow it to a single technical channel, and option D contradicts the EK by excluding the remote channels it explicitly names.',
  },
  {
    prompt: 'A message warns, "If you do not verify now, your paycheck will be withheld." Per EK 1.1.B.2, explain how intimidation works on the reader.',
    options: [
      'It offers a reward, exploiting the human tendency to reciprocate a favor',
      'It builds slow rapport over time so the reader lowers their guard gradually',
      "It proves the sender's identity, so the reader trusts the request automatically",
      'It leverages a natural aversion to negative consequences, using fear to incite action',
    ],
    correct_index: 3,
    explanation: 'EK 1.1.B.2 states intimidation leverages a natural human aversion to negative consequences: by drawing attention to a possible bad outcome, adversaries use fear to incite targets to act. The withheld paycheck is the negative consequence and fear of it drives the action. The other options describe mechanisms the CED does not attribute to intimidation.',
  },
  {
    prompt: 'Per EK 1.1.B.3, why is a sense of urgency effective at getting a target to comply?',
    options: [
      'Pressure to act quickly can stop the target from considering whether the action is reasonable or safe',
      "It permanently changes the target's long-term beliefs about the sender's trustworthiness",
      'It guarantees the target will report the message to their IT department immediately',
      'It removes the negative consequence so the target no longer feels any fear at all',
    ],
    correct_index: 0,
    explanation: 'EK 1.1.B.3 says urgency leverages a natural human response to time-sensitive needs: feeling pressured to act quickly can prevent targets from taking time to consider whether an action is reasonable or safe. Options B and C describe outcomes the EK does not claim, and option D confuses urgency with intimidation and misstates the effect.',
  },
  {
    prompt: 'Per EK 1.1.B.1, what do social engineering tactics fundamentally rely on?',
    options: [
      "Software vulnerabilities in the target's email client or web browser",
      'Common psychological principles that influence human behavior',
      'Stolen encryption keys obtained from a breached certificate authority',
      'Misconfigured firewalls that allow malicious traffic into a network',
    ],
    correct_index: 1,
    explanation: 'EK 1.1.B.1 states that social engineering tactics rely on common psychological principles that influence human behavior. The other options describe technical weaknesses, but the defining feature of social engineering in the CED is that it targets human behavior rather than technology.',
  },
  {
    prompt: "A victim is tricked into revealing a pet's name, birthdate, and former workplace. Per EK 1.1.C.1, why is this information valuable to an adversary?",
    options: [
      "It encrypts the victim's files, letting the adversary demand a ransom payment",
      'It disables multifactor authentication on every account the victim owns',
      "It is often used as challenge-question answers that verify a user's identity",
      "It directly grants administrator rights over the victim's employer network",
    ],
    correct_index: 2,
    explanation: "EK 1.1.C.1 says victims may give an adversary personal information that could lead to impersonation, such as name, phone number, address, workplace, pets' names, or birthdate, and that such information is often used on websites as challenge questions to verify a user's identity. The other options describe impacts the CED does not tie to this kind of personal information.",
  },
  {
    prompt: 'An adversary convinces a victim to read back the one-time password (OTP) texted to their phone. Per EK 1.1.C.2, what is the direct impact?',
    options: [
      "The adversary permanently deletes the victim's account from the service",
      'The adversary can log in to the service as the victim',
      "The adversary gains physical access to the victim's mobile device",
      "The adversary installs malware that steals data from the victim's browser",
    ],
    correct_index: 1,
    explanation: 'EK 1.1.C.2 says victims may give an adversary secure information such as a one-time password or authentication login code, which could allow an adversary to log in to a service as the victim. Options A and C are not stated impacts of handing over an OTP, and option D describes EK 1.1.C.3 (malware) rather than the OTP impact.',
  },
  {
    prompt: 'Per EK 1.1.C.3, clicking a malicious link or downloading malware can lead to which outcomes? I. Malware installed on the device. II. Information stolen from the web browser. III. Being directed to a site that captures login credentials.',
    options: [
      'Outcome I only of the three',
      'Outcomes I and II only',
      'Outcomes II and III only',
      'Outcomes I, II, and III',
    ],
    correct_index: 3,
    explanation: 'EK 1.1.C.3 says victims may download malware or click a link that installs malware on their device, steals information from their web browser, or directs them to a website where their login credentials can be captured. All three outcomes are listed in the EK. The narrower options each omit at least one outcome the EK explicitly names.',
  },
];

// -- Lesson 1.2, Suspicious Website Logins ------------------------------------
const L12 = [
  {
    prompt: 'Three log entries are flagged for review. I. 23 failed logins from a single IP over 4 minutes. II. A successful login at 3:17 a.m. from a country where the user has never logged in. III. One failed login from the user\'s usual IP followed immediately by a success from that same IP. Which entries show CB-specified signs of a password attack?',
    options: ['I only', 'II and III only', 'I and II only', 'I, II, and III'],
    correct_index: 2,
    explanation: 'Entry I is Sign 1, many failed attempts in a short duration, because 23 in 4 minutes is an automated rate. Entry II shows Sign 2, an unusual time, and Sign 3, a never-visited country meaning an unknown device or location. Entry III is a legitimate user mistyping once and then succeeding from their own IP: Sign 1 requires volume plus speed, and one mistype has neither.',
  },
  {
    prompt: 'Which password most directly reflects the EK 1.2.B.1 pattern of one or two words plus a two-digit year plus a special character at the end?',
    options: ['P@ssword2024!', 'correct-horse-battery-staple', 'qwerty123', 'Xk#9mQpLv2'],
    correct_index: 0,
    explanation: 'P@ssword2024! is the textbook EK 1.2.B.1 formula: word plus year plus trailing special character, and the @-for-a substitution is itself a predictable variation. correct-horse-battery-staple is a passphrase, which is an EK 1.2.C.1 recommendation rather than a weak pattern. Xk#9mQpLv2 is effectively random. qwerty123 is weak but lacks the year and trailing special character, so it is not the CB-specified pattern the stem asks for.',
  },
  {
    prompt: "A target's public Instagram shows a dog named Biscuit, a birthday of March 15, and a favorite team, the Chiefs. An adversary builds a targeted dictionary from this gathered information. Which password would that dictionary be LEAST likely to contain?",
    options: ['Biscuit2015', 'Chiefs0315!', 'March15Biscuit', 'Xm7#kR9vLq2p'],
    correct_index: 3,
    explanation: 'The dictionary is constructed from the gathered personal information, Biscuit, March 15, and Chiefs, combined with common patterns, so the first three options are all direct hits. Xm7#kR9vLq2p has no connection to any harvested personal information, and a purely random string cannot be derived from open-source intelligence, so it is the least likely entry. Watch the inversion: the question asks least likely, not most vulnerable.',
  },
  {
    prompt: 'A company implements three controls. I. A password manager that generates unique, random, 16-character passwords for every account. II. Multifactor authentication on all accounts. III. Mandatory password changes every 45 days with character-complexity rules. Which of these directly implement the CED-specified methods for making authentication stronger?',
    options: ['I, II, and III', 'I and II only', 'II and III only', 'I and III only'],
    correct_index: 1,
    explanation: 'Control I is EK 1.2.C.1 exactly, a password manager generating long, random, unique passwords, and control II is EK 1.2.C.3 exactly, multifactor authentication. Control III, forced rotation with complexity rules, is not in EK 1.2.C: the CED specifies long, random, and unique passwords, avoiding personal information, and MFA. As enrichment, NIST SP 800-63B discourages forced rotation because users respond with predictable increments.',
  },
  {
    prompt: 'In CB Scenario 1B, entries 4 and 7 are suspicious sign-ins on school days from an unknown IP. A student recommends: "Change the account password immediately." Per EK 1.2.C, which CB-recommended control is MISSING from this response?',
    options: [
      'Enabling multifactor authentication on the account',
      'Nothing, because the recommendation is already complete',
      'Switching the account to a different web browser',
      'Forcing the new password to rotate every 45 days',
    ],
    correct_index: 0,
    explanation: 'Changing the password addresses EK 1.2.C.1 and C.2 by replacing the compromised credential, but the CED lists MFA (EK 1.2.C.3) as a separate, distinct control that blocks the adversary even if they obtain the new password. Option B is wrong because one control is not a complete EK 1.2.C response. Browser choice has no CB basis, and forced rotation is not an EK 1.2.C method.',
  },
  {
    prompt: 'According to EK 1.2.A.1, what does an adversary attempt during an online password attack?',
    options: [
      'Logging in to a device or service using common passwords, common password patterns, or stolen passwords',
      'Intercepting network traffic to read passwords as they travel between the user and the server',
      "Installing keylogging malware on the victim's device to record every keystroke they type",
      'Tricking the victim into revealing a one-time code through a fraudulent phone call',
    ],
    correct_index: 0,
    explanation: 'EK 1.2.A.1 defines an online password attack as adversaries trying to log in to a device or service using common passwords, common password patterns, or stolen passwords. The other options describe sniffing, keylogging, and vishing, which are real techniques but none is the CED definition of an online password attack.',
  },
  {
    prompt: "A help-desk log shows a user's account with steady, successful logins every weekday at 8 a.m. from one office laptop. Overnight, the same account logs 3,000 failed attempts in 20 minutes from an IP in another country. Which EK 1.2.A.2 sign is MOST clearly evidenced by the overnight activity?",
    options: [
      'No sign is present, because the daytime logins were all successful',
      'Login attempts from a known device the owner uses daily',
      'Many failed attempts to log in over a short duration',
      "A password reset request sent to the owner's email inbox",
    ],
    correct_index: 2,
    explanation: 'EK 1.2.A.2 lists many failed attempts to log in over a short duration as a sign, and 3,000 failures in 20 minutes is exactly that volume-plus-speed pattern. The overnight foreign IP also hints at unusual time and unknown device, but the clearest directly-counted sign is the failed-attempt volume. The daytime success pattern is the legitimate baseline, and a password reset is not one of the three CED signs.',
  },
  {
    prompt: 'A user wants a password that follows EK 1.2.C.1 and EK 1.2.C.2. Which choice best satisfies both?',
    options: [
      "Their dog's name followed by their birth year and an exclamation point",
      'A short word repeated three times so it is easy to remember and retype',
      'A long, random string generated and stored by a password manager',
      'Their street address with the vowels replaced by matching numbers',
    ],
    correct_index: 2,
    explanation: 'EK 1.2.C.1 says passwords should be long, random, and unique and names a password manager as the tool to generate and store them. EK 1.2.C.2 says to avoid names, dates, or other personally meaningful words. A long, random manager-generated string satisfies both. The dog name plus year, the repeated word, and the street address all rely on personal or predictable information the CED tells users to avoid.',
  },
  {
    prompt: "An adversary scrolls a target's public profiles and records the names of their two children, their wedding anniversary, and their cat's name. They feed these into a tool that auto-submits combinations against the login form. Which EK best describes this method?",
    options: [
      'EK 1.2.A.1, trying stolen passwords leaked from an unrelated breach',
      'EK 1.2.B.2, building a dictionary from gathered personal information',
      'EK 1.2.C.3, enabling multifactor authentication on the account',
      'EK 1.2.A.2, logging in successfully from a known device',
    ],
    correct_index: 1,
    explanation: "EK 1.2.B.2 describes adversaries constructing a dictionary of possible passwords from personal information gathered about a target, such as birthdays, anniversaries, and names of pets and family, and using an automated tool to submit them. That is exactly the children's names, anniversary, and cat's name being auto-submitted. EK 1.2.A.1 is stolen-password reuse, EK 1.2.C.3 is a defense, and EK 1.2.A.2 lists attack signs rather than this construction method.",
  },
  {
    prompt: "An account's history shows logins only from a home laptop on weekday evenings. A security review flags four new events on the same account. Per EK 1.2.A.2, which single event most clearly matches the 'login attempts from unknown devices' sign?",
    options: [
      "A failed login at the user's normal evening hour from the home laptop",
      "A successful login during the user's usual weekday evening window",
      "A password change confirmed from the user's own registered laptop",
      'A login from a phone and IP address the account has never used before',
    ],
    correct_index: 3,
    explanation: "EK 1.2.A.2 lists login attempts from unknown devices as a sign of an online password attack, and a device and IP the account has never used is exactly that unknown-device indicator. The other three events all originate from the user's known laptop during normal hours, so they match the legitimate baseline rather than any of the three CED-specified signs.",
  },
  {
    prompt: 'EK 1.2.B.1 lists the common patterns people use when creating passwords. Which choice is NOT one of those CED-listed patterns?',
    options: [
      'Including the names of family members or pets inside the password',
      'Generating the password as a long, random string with no personal meaning',
      'Including a personally significant date such as a birthday or anniversary',
      'Adding a two-digit year and a special character to the end of a word',
    ],
    correct_index: 1,
    explanation: 'EK 1.2.B.1 names three common patterns: a word plus a two-digit year plus a trailing special character, family or pet names in the password, and personally significant dates. Options A, C, and D are those three patterns. A long, random string with no personal meaning is the opposite and follows the EK 1.2.C.1 guidance for strong passwords, so it is not an EK 1.2.B.1 pattern.',
  },
  {
    prompt: "A user's password is stolen in a breach. With multifactor authentication enabled on the account, the adversary types the correct password into the login form. Per EK 1.2.C.3, what happens next?",
    options: [
      'The stolen password alone grants access since it is the correct one',
      'The account locks permanently and can never be recovered by the user',
      "The breach is automatically reported to the adversary's email provider",
      'The login still requires extra proof of identity, such as a one-time code',
    ],
    correct_index: 3,
    explanation: 'EK 1.2.C.3 states that MFA requires the user to provide extra proof of identity, such as a one-time code, in addition to the password as an extra layer of security. A correct but stolen password is therefore not enough, and the second factor is still demanded. The CED makes no claim about permanent lockout or any automatic breach report, and the whole point of MFA is that the password alone does not grant access.',
  },
];

function pack(lesson, questions) {
  return {
    location: { course: COURSE, unit: UNIT, lesson, activity_type: ACTIVITY, serve_count: 0 },
    questions: questions.map((q, i) => ({ qid: qid(lesson, i + 1), points: 1, ...q })),
  };
}

module.exports = [pack('1.1', L11), pack('1.2', L12)];
