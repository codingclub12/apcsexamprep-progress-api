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
//  seed/cyber-unit-1-quizzes.js currently violates this for 1.1 and 1.2: those
//  banks were transcribed from the bundle on 2026-08-26 to fix a real defect
//  (the live pages served another lesson's questions), before this rule existed.
//  They are queued to be re-authored as short web quizzes, which returns the
//  bundle's 9 and 12 item instruments to offline-only.
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

function qid(lesson, n) { return `${COURSE}:${UNIT}:${lesson}:${ACTIVITY}#${n}`; }

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
module.exports = [pack('1.3', L13, 0)];
