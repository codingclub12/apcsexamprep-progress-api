'use strict';
// -----------------------------------------------------------------------------
//  AP CYBERSECURITY UNIT 1 - SHORT WEB QUIZZES.
//
//  THE RULE THIS FILE EXISTS TO ENFORCE
//  Never seed a teacher bundle question into an online quiz bank.
//
//  The bundle instruments (Quiz_KEY.docx, 9 to 24 items) are what a teacher hands
//  out and grades. Their security comes from NOT being published: a question a
//  student cannot find online is a question they cannot look up in advance. The
//  moment a bundle item is served from a public page, that property is gone for
//  every teacher using the bundle, not just the one whose class we were fixing.
//
//  So the online quiz is a DIFFERENT, SHORTER instrument covering the same EKs.
//  Divergence between the web quiz and the paper quiz is the intended design, not
//  a defect, and a report that the two "do not match" is expected behaviour.
//
//  This rule was learned the expensive way. On 2026-08-26 the 1.1 and 1.2 banks
//  were transcribed straight from the bundle, to fix a real defect: those live
//  pages were serving another lesson's questions. It fixed the defect and created
//  a worse one, because for one day a student could browse the exact 9 and 12 item
//  instruments their teacher grades from. seed/cyber-unit-1-quizzes.js held those
//  banks and was deleted on 2026-08-27; its rows retire (active = 0) rather than
//  being dropped, so anything that referenced them still resolves.
//
//  PROVENANCE OF WHAT IS HERE
//  1.3 is the quiz already live at /pages/ap-cyber-unit-1-lesson-3-quiz, moved
//  server-side unchanged. It was audited question by question on 2026-08-26: all
//  five map to Unit 1 Topic 1.3 EKs, and the stored key was verified against the
//  option text rather than trusted. Nothing about the content needed fixing. What
//  needed fixing was that the page shipped its own answer key in the body
//  (ANSWERS={1:'C',...}), which server scoring removes.
//
//  Options are stored in their authored order. routes/quiz.js reshuffles them per
//  render, so the stored order is never what a student sees and a patterned key
//  cannot exist here.
//
//  Zero PII: author content only. ASCII only, no em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const ACTIVITY = 'quiz';

// Web-authored items use a #wN series. The bundle-derived banks used #N, and
// reusing those ids would have rewritten the text of a question in place while
// leaving every score_event that referenced it pointing at content it was never
// asked. A separate series lets the old rows retire (active = 0) intact.
function qid(lesson, n) { return `${COURSE}:${UNIT}:${lesson}:${ACTIVITY}#w${n}`; }

// -- Lesson 1.1, Understanding Social Engineering ----------------------------
//    Authored for the web 2026-08-27. Shares no question with the bundle's
//    9-item Quiz_KEY.docx; covers EK 1.1.A.1, B.1, B.2, B.3, C.1, C.2 and C.3.
const L11 = [
  {
    prompt: 'Two messages arrive on the same day. Message A: "This form must be submitted within the next 10 minutes or the enrollment window closes." Message B: "Failure to respond will result in your account being permanently suspended and referred to your supervisor." Which psychological tactic does each message rely on?',
    options: [
      'A relies on intimidation and B relies on urgency',
      'A relies on urgency and B relies on intimidation',
      'Both rely on intimidation, because both describe an unwanted outcome',
      'Both rely on urgency, because both demand that the reader respond',
    ],
    correct_index: 1,
    explanation: 'EK 1.1.B.3 describes urgency as leveraging a natural response to time-sensitive needs: message A supplies a deadline and nothing else. EK 1.1.B.2 describes intimidation as leveraging a natural aversion to negative consequences, using fear to incite action: message B supplies a threatened consequence and no deadline. Reading both as the same tactic misses that the CED names them separately because they work on different instincts.',
  },
  {
    prompt: 'A post circulating on social media invites people to reply with the name of their first pet, the street they grew up on, and the make of their first car, framed as a harmless nostalgia game. Thousands reply publicly. Why is this thread valuable to an adversary?',
    options: [
      'It reveals which of the repliers are currently using weak passwords',
      'It silently installs tracking software on the device of every person who replies',
      'Those three answers are among the details commonly used as account-recovery challenge questions',
      'It captures the one-time authentication codes sent to each replier during login',
    ],
    correct_index: 2,
    explanation: 'EK 1.1.C.1 says victims may give an adversary personal information that could lead to impersonation, such as name, phone number, address, workplace, pets names or birthdate, and that such information is often used on websites as challenge questions to verify a user identity. The thread collects exactly that class of detail, volunteered rather than stolen. Replying reveals nothing about a password, installs nothing, and captures no codes.',
  },
  {
    prompt: 'An adversary already knows an employee password and triggers a login with it. The employee phone displays an "Approve this sign-in?" prompt. The adversary then calls, claiming to be IT running a scheduled security test, and asks the employee to tap Approve. The employee does. What has the adversary gained?',
    options: [
      'Completion of the second authentication step, which lets them sign in to the service as the employee',
      'The employee password, which they did not have before the call',
      'Permanent administrator rights across the company network',
      'The ability to read the employee previously sent encrypted messages',
    ],
    correct_index: 0,
    explanation: 'EK 1.1.C.2 says victims may give an adversary secure information such as a one-time password or authentication login code, which could allow an adversary to log in to a service as the victim. Tapping Approve hands over the second factor just as surely as reading a code aloud does; the form differs, the handover does not. The adversary already had the password, and nothing here grants network-wide rights or decrypts past messages.',
  },
  {
    prompt: 'An employee clicks a link in a message that appears to come from a delivery company. The page that opens is a pixel-perfect copy of their company sign-in portal and asks for their username and password. Nothing is downloaded to the device. Which outcome does this describe?',
    options: [
      'Malware has been installed on the device and is now running in the background',
      'The device browsing history has been permanently erased by the linked page',
      'The employee one-time authentication code has been regenerated by the service',
      'The employee has been directed to a website built to capture their login credentials',
    ],
    correct_index: 3,
    explanation: 'EK 1.1.C.3 lists three outcomes of clicking a malicious link or downloading malware: malware installed on the device, information stolen from the web browser, or being directed to a website where login credentials can be captured. The stem rules the first two out by saying nothing was downloaded, which leaves the credential-capture page. A convincing copy of a familiar portal is the whole mechanism.',
  },
  {
    prompt: 'A company keeps every system patched, runs a correctly configured firewall, and encrypts all of its traffic. An adversary still gains access by phoning the help desk, sounding convincing, and persuading a technician to reset an employee password. What does this outcome best illustrate?',
    options: [
      'That the company encryption must have been implemented incorrectly',
      'That social engineering targets human behavior rather than technical weaknesses, so technical controls alone do not prevent it',
      'That help desks operate outside an organization security policy and cannot be secured',
      'That password resets are inherently unsafe and should never be permitted by any organization',
    ],
    correct_index: 1,
    explanation: 'EK 1.1.B.1 states that social engineering tactics rely on common psychological principles that influence human behavior. That is why a fully patched, firewalled, encrypted organization is still reachable: none of those controls act on the technician decision to trust the caller. The other options blame a technical failure, an entire job function, or a routine and necessary process, none of which is what went wrong.',
  },
];

// -- Lesson 1.2, Suspicious Website Logins ------------------------------------
//    Authored for the web 2026-08-27. Shares no question with the bundle's
//    12-item Quiz_KEY.docx; covers EK 1.2.A.2, B.1, B.2, C.1, C.2 and C.3.
const L12 = [
  {
    prompt: 'One account sign-in log for a week reads: Monday 8:02 a.m., success from the usual office laptop. Tuesday 8:05 a.m., success from the same laptop. Wednesday 2:14 a.m., 412 failed attempts over 6 minutes from an IP address in a country the account has never been used from. Wednesday 2:21 a.m., one success from that same foreign IP address. Which signs of an online password attack appear in this log? I. Many failed attempts over a short duration. II. A login attempt at an unusual time. III. A login attempt from an unknown device or location.',
    options: [
      'Sign I only',
      'Signs I and II only',
      'Signs II and III only',
      'Signs I, II, and III',
    ],
    correct_index: 3,
    explanation: 'EK 1.2.A.2 names three signs and this log contains all of them: 412 failures in 6 minutes is volume plus speed, 2:14 a.m. is well outside the established 8 a.m. pattern, and an IP in a country never used before is an unknown location. The Monday and Tuesday entries are the legitimate baseline that makes the Wednesday activity legible as an anomaly.',
  },
  {
    prompt: 'Four passwords are all weak for different reasons. Which one follows one of the common patterns people fall into when they create a password from something meaningful to them?',
    options: [
      'Marbles2011',
      'aaaaaaaa',
      '12345678',
      'qwertyui',
    ],
    correct_index: 0,
    explanation: 'EK 1.2.B.1 names the specific patterns: one or two words plus a two-digit year plus a special character, the names of family members or pets, and personally significant dates such as a birthday or anniversary. Marbles2011 is a pet name plus a significant year, so it fits. The other three are genuinely weak, but they are weak through repetition, sequence and keyboard position, none of which is a personally meaningful pattern. The distinction matters because a targeted dictionary is built from the meaningful ones.',
  },
  {
    prompt: 'A school IT team runs an authorized simulated attack against its own accounts. Using only publicly visible sources, they collect each student sports team, graduation year, and sibling names, then feed those details into a tool that generates likely password combinations and submits them to the login page. Which technique is this simulation reproducing?',
    options: [
      'Trying passwords stolen from an unrelated breach at another company',
      'Building a targeted dictionary from gathered personal information and submitting it automatically',
      'Intercepting passwords as they travel across the network in transit',
      'Exploiting an unpatched software flaw in the login server itself',
    ],
    correct_index: 1,
    explanation: 'EK 1.2.B.2 describes adversaries constructing a dictionary of possible passwords from personal information gathered about a target, such as birthdays, anniversaries, and the names of pets and family, then using a tool to submit them automatically. Everything the team gathered is personal and public, which is what makes it a dictionary attack rather than credential reuse, interception, or exploitation of a software flaw.',
  },
  {
    prompt: 'A user password turns up in a public breach dump from a site they used years ago. The account they care about has multifactor authentication switched on. Which statement about their situation is accurate?',
    options: [
      'The exposure is harmless, because multifactor authentication makes the password irrelevant and it no longer needs changing',
      'Multifactor authentication would have prevented the password from appearing in the breach dump at all',
      'An adversary holding that password still has to supply the second factor, so the password on its own does not grant access',
      'Multifactor authentication detects breach exposure and rotates the password automatically',
    ],
    correct_index: 2,
    explanation: 'EK 1.2.C.3 says multifactor authentication requires the user to provide extra proof of identity, such as a one-time code, in addition to the password. That is precisely the value here: a correct but stolen password stops short of access. Note what MFA does not do. It does not reach back into another company breach, it does not rotate credentials on its own, and it does not make a leaked password safe to keep using.',
  },
  {
    prompt: 'A user needs passwords for 40 different accounts and wants to follow recommended practice: long, random and unique, with nothing personally meaningful in them. Which approach satisfies all of that?',
    options: [
      'Choose one very strong passphrase and use it for all 40 accounts, since its strength protects every one',
      'Use a password manager to generate and store a different long random string for each account',
      'Pick a strong base word and append each site name to it, so all 40 are technically different',
      'Use their childhood street address, adding a different digit to the end for each site',
    ],
    correct_index: 1,
    explanation: 'EK 1.2.C.1 calls for passwords that are long, random and unique and names a password manager as the tool to generate and store them, and EK 1.2.C.2 says to avoid names, dates and other personally meaningful words. Only the manager satisfies all four properties at 40 accounts. The single passphrase fails uniqueness, so one breach exposes everything. The base word and the street address are both predictable variations of a fixed stem, which is the pattern EK 1.2.B.1 warns about.',
  },
];

// -- Lesson 1.3, Best Practices for Public Networks ---------------------------
//    (the site titles this lesson "Public Wi-Fi Dangers"; the bundle calls it
//     "Best Practices for Public Networks". Same EKs, different framing. Flagged
//     separately; not this file's to reconcile.)
const L13 = [
  {
    prompt: 'A person drives through a neighborhood with a laptop running wireless network scanning software, recording the SSIDs, encryption types, and GPS locations of every Wi-Fi network detected. They do not connect to any network. Which attack type does this describe, and what is the PRIMARY risk it creates for the detected networks?',
    options: [
      'Jamming attack, because the scanning software is disrupting wireless signals in the neighborhood',
      'Evil twin attack, because the person is setting up a rogue network while scanning',
      'War driving, passive wireless reconnaissance that identifies network details enabling more targeted future attacks, such as evil twin deployment against networks with detectable SSIDs',
      'A denial-of-service attack, because continuous scanning requests overload the detected access points',
    ],
    correct_index: 2,
    explanation: 'EK 1.3.B.3 describes war driving as detecting wireless network beacons while driving or walking around a target, gathering information and finding where the signal extends outside the building. No connection is made, which is why this is reconnaissance rather than an attack in its own right: the risk is what it enables next. Jamming (EK 1.3.B.2) floods a frequency range, and an evil twin (EK 1.3.B.1) stands up a rogue access point; neither is happening here.',
  },
  {
    prompt: 'An adversary sets up a rogue wireless access point in a coffee shop with the SSID "CafeExpress_Free" while the real network is "CafeExpress-Guest". The adversary intercepts the credentials of three customers who connect to it. Which of the following MOST accurately classifies this adversary\'s skill level, and why?',
    options: [
      'High-skilled, because the adversary was able to intercept encrypted communications',
      'High-skilled, because the attack targeted three victims simultaneously',
      'Low-skilled, because the adversary relied on pre-built evil twin tools that exploit a known weakness, users connecting to deceptive SSIDs, and did not need to discover or exploit any undocumented zero-day vulnerability',
      'Low-skilled, because the adversary attacked a public location rather than a corporate network',
    ],
    correct_index: 2,
    explanation: 'EK 1.3.A.1 defines low-skilled adversaries as those who rely on malicious tools created by others that exploit known vulnerabilities, and high-skilled adversaries as those who create or modify tools and discover undocumented zero days. Running a ready-made evil twin against a known human weakness is the former. Skill level is about capability, not about how many victims were hit or where the attack happened.',
  },
  {
    prompt: 'A hospital emergency room wireless network is completely disabled for two hours during a shift change. All wireless devices, pagers, and monitoring systems in the ER stop functioning at once. Security finds no evidence of unauthorized access to patient records and no data exfiltration. Which attack type BEST explains these observations, and what was the primary impact?',
    options: [
      'Evil twin attack, where a rogue network pulled all devices off the legitimate network',
      'Jamming attack, where flooding the frequency range with a strong electromagnetic signal caused a denial of service for every wireless device in the area, with no data stolen',
      'War driving, where someone mapped the hospital wireless networks and the discovery disrupted service',
      'A credential attack, where automated login attempts overloaded the wireless authentication server',
    ],
    correct_index: 1,
    explanation: 'EK 1.3.B.2 says jamming floods an area with a strong electromagnetic signal in the network frequency range, preventing legitimate traffic, and that an attack preventing users from accessing resources is a denial-of-service attack. The absence of any data theft is the tell: jamming denies availability, it does not capture traffic. An evil twin would show connections to a rogue access point, and war driving is passive detection that disrupts nothing.',
  },
  {
    prompt: 'An employee at a hotel conference connects a laptop to "ConferenceCenter_WiFi" without verifying the name with hotel staff, then opens company email and an internal dashboard. An adversary running an evil twin intercepts their session token. The employee had a VPN client installed but did not turn it on. Which of the following BEST explains what the VPN would have prevented?',
    options: [
      'The VPN would have stopped the employee from connecting to the evil twin in the first place',
      'The VPN would have encrypted all traffic between the device and the company servers, so an adversary positioned on the evil twin would have captured only ciphertext and the session token would have been unreadable',
      'The VPN would have detected the rogue SSID and warned the employee before connection',
      'The VPN would have prevented session token theft by enforcing a stronger authentication protocol',
    ],
    correct_index: 1,
    explanation: 'EK 1.3.C.3 says a VPN encrypts all traffic to the VPN operator system. That is what defeats an adversary sitting in the middle: they still receive the packets, but cannot read them. Note what a VPN does NOT do, which is what the other options claim. It does not choose networks, it does not identify rogue access points, and it does not change how the application authenticates. EK 1.3.C.1, verifying the network name matches the intended network, is the control that would have prevented the connection itself.',
  },
  {
    prompt: 'Consider the three wireless attack types covered in this lesson. I. Evil twin, jamming, and war driving can all be carried out with pre-built tools available online, making all three accessible to low-skilled adversaries. II. All three result in credential theft, because wireless access inherently allows interception of user credentials. III. A VPN prevents the data theft impact of all three. Which statements are TRUE?',
    options: [
      'I only',
      'I and III only',
      'II and III only',
      'I, II, and III',
    ],
    correct_index: 0,
    explanation: 'Statement I follows from EK 1.3.A.1: low-skilled adversaries rely on tools created by others, and all three of these attacks have ready-made tooling. Statement II fails on jamming, which is a denial-of-service attack (EK 1.3.B.2) and steals nothing. Statement III fails for two separate reasons: a VPN cannot help against jamming, because there is no traffic to protect when the network is unusable, and war driving captures no traffic to encrypt in the first place. Only I is true.',
  },
];

function pack(lesson, questions, serve_count) {
  return {
    location: { course: COURSE, unit: UNIT, lesson, activity_type: ACTIVITY, serve_count: serve_count || 0 },
    questions: questions.map((q, i) => ({ qid: qid(lesson, i + 1), points: 1, ...q })),
  };
}

// serve_count 0 means serve the whole pool. These quizzes are already short, so
// there is nothing to sample down to; N-of-M becomes useful only if a pool grows
// past the number of items a student should sit.
module.exports = [
  pack('1.1', L11, 0),
  pack('1.2', L12, 0),
  pack('1.3', L13, 0),
];
