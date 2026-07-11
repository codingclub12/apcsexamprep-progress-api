'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER QUIZ BANK — Phase 2 server-side scoring vertical slice.
//
//  One AP Cybersecurity Unit 1 lesson quiz, kept server-side so its answer key
//  never ships to the browser. This is the seed for the vertical slice described
//  in the Phase 2 kickoff: prove the render/score/release/shuffle path end to end
//  on cyber (already wired), then generalize.
//
//  IMPORTANT: these questions are a representative placeholder set. The
//  authoritative Unit 1 questions and keys currently live in the Shopify page
//  HTML (data-correct), which is theme-repo / Matrixify territory. Importing the
//  real keys is the same shape as this file: one object per question, keyed by a
//  stable qid, loaded by scripts/seed-quiz-bank.js. Replace the entries below
//  with the authoritative set when it is exported, then re-run the seed.
//
//  Zero PII: this is author content only. No student data lives here.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const LESSON = '1.1';
const ACTIVITY = 'quiz';

// qid is stable and location-scoped so a reorder in this file never collides and
// score_events line up across a student's attempts.
function qid(n) { return `${COURSE}:${UNIT}:${LESSON}:${ACTIVITY}#${n}`; }

const QUESTIONS = [
  {
    qid: qid(1),
    prompt: 'Which three goals make up the CIA triad in cybersecurity?',
    options: [
      'Confidentiality, Integrity, Availability',
      'Control, Identity, Access',
      'Confidentiality, Identity, Authentication',
      'Cryptography, Integrity, Authorization',
    ],
    correct_index: 0,
    explanation: 'The CIA triad is Confidentiality (keeping data secret), Integrity (keeping data accurate and unaltered), and Availability (keeping data and systems accessible when needed).',
  },
  {
    qid: qid(2),
    prompt: 'A hospital database is changed by an attacker so a patient record shows the wrong blood type. Which CIA goal has been violated?',
    options: ['Availability', 'Integrity', 'Confidentiality', 'Non-repudiation'],
    correct_index: 1,
    explanation: 'Altering data so it is no longer accurate is an integrity violation. The data is still available and may still be secret, but it can no longer be trusted.',
  },
  {
    qid: qid(3),
    prompt: 'What is the primary goal of a denial-of-service (DoS) attack?',
    options: [
      'To steal and read confidential files',
      'To silently modify data over time',
      'To make a system or service unavailable to its users',
      'To impersonate a legitimate user',
    ],
    correct_index: 2,
    explanation: 'A DoS attack floods or crashes a system so legitimate users cannot reach it, directly targeting the Availability goal of the CIA triad.',
  },
  {
    qid: qid(4),
    prompt: 'Which of these is the best example of protecting confidentiality?',
    options: [
      'Keeping daily backups of a server',
      'Encrypting a file so only the intended recipient can read it',
      'Using a checksum to detect file tampering',
      'Adding more servers so a site stays online under load',
    ],
    correct_index: 1,
    explanation: 'Encryption keeps information secret from anyone without the key, which is the definition of confidentiality. Backups and load balancing protect availability; checksums protect integrity.',
  },
  {
    qid: qid(5),
    prompt: 'A "white hat" hacker is best described as someone who:',
    options: [
      'Breaks into systems for personal financial gain',
      'Tests systems for weaknesses with the owner\'s permission to help fix them',
      'Attacks systems purely to cause disruption',
      'Only studies attacks but never tests any system',
    ],
    correct_index: 1,
    explanation: 'White hat (ethical) hackers have authorization from the system owner and report the weaknesses they find so they can be fixed, unlike black hat attackers who act without permission and for harm or gain.',
  },
];

module.exports = {
  // serve_count drives N-of-M: serve 3 random questions of the 5-question pool
  // per attempt. Set to 0 (or omit) to serve the whole pool. Chosen server-side
  // and carried in the order_token, so two loads draw different subsets and a
  // student cannot ask for fewer.
  location: { course: COURSE, unit: UNIT, lesson: LESSON, activity_type: ACTIVITY, serve_count: 3 },
  questions: QUESTIONS,
};
