'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.1 EXERCISE 2: THE PAGE THAT TEACHES IN CODES.
//
//  Thirteen mentions of the course description and forty-eight codes, and unlike
//  every other page in this pass they are not asides: five question stems ASK
//  the student "Which CED impact category does this fall under?", and the three
//  options they choose between are the codes themselves.
//
//  ── WHY THIS IS STILL A THINNING PASS AND NOT A REWRITE ────────────────────
//  Because every code here is a prefix on a phrase that already carries the
//  meaning. "1.1.C.1 - personal information" becomes "Personal information" and
//  the question is unchanged: the student still has to decide whether what was
//  taken was personal information, a one-time code, or captured credentials.
//  Nothing about the task gets easier or harder. What goes is the label a
//  fifteen-year-old cannot look up.
//
//  ── THE KEYS ARE INDICES, WHICH IS WHY THIS IS SAFE ────────────────────────
//  Each question is {"opts": [...], "key": N} and N indexes the array. Rewriting
//  the strings inside opts cannot move an index. The option block is identical
//  across five questions, so it is one `all: true` splice rather than five that
//  would each have to be unique.
//
//  ── THE UNIT 2 AND OFF-TOPIC ANSWERS KEEP THEIR POINT ──────────────────────
//  Several feedback strings do the most valuable work on the page: they explain
//  that authority, scarcity and vishing are not Topic 1.1 answers. Every one of
//  those survives as a claim. Only its citation goes, because "a tactic named in
//  Unit 2" tells a student exactly as much as "a tactic the CED names at
//  2.1.A.3" and does not ask them to take a document's word for it.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-1-exercise-2';
const PAGE_ID = '131899031767';
const TITLE = 'AP Cybersecurity 1.1 Exercise 2: Tactics and Impacts';

const SPLICES = [
  // ── the question bank: five identical stems and five identical option sets ─
  { name: 'impact question stem', all: true,
    from: '"stem": "Which CED impact category does this fall under?"',
    html: '"stem": "Which impact category does this fall under?"' },
  { name: 'impact options', all: true,
    from: '"opts": ["1.1.C.1 &mdash; personal information", "1.1.C.2 &mdash; secure information (OTP or login code)", "1.1.C.3 &mdash; malware or captured credentials"]',
    html: '"opts": ["Personal information", "Secure information (OTP or login code)", "Malware or captured credentials"]' },

  // ── the reference box above Part 1 ───────────────────────────────────────
  { name: 'what this exercise covers',
    from: 'Topic 1.1 names exactly two psychological tactics: <b>intimidation</b> (1.1.A.2, 1.1.B.2) and <b>urgency</b> (1.1.A.2, 1.1.B.3). It names three victim impacts: personal information (1.1.C.1), secure information such as a one-time code (1.1.C.2), and malware or credential capture (1.1.C.3).',
    html: 'Topic 1.1 names exactly two psychological tactics, <b>intimidation</b> and <b>urgency</b>, and three victim impacts: personal information, secure information such as a one-time code, and malware or credential capture.' },

  { name: 'Part 2 subtitle',
    from: 'Classify the impact by CED category.',
    html: 'Classify the impact by category.' },

  { name: 'JSON-LD description',
    from: 'classify the victim impact for 15 CED-aligned scenarios.',
    html: 'classify the victim impact across 15 scenarios.' },

  // ── Part 1 feedback ──────────────────────────────────────────────────────
  { name: 'p1 intimidation-only feedback',
    from: 'but no deadline is imposed. Per 1.1.B.3 urgency requires time pressure that prevents verification.',
    html: 'but no deadline is imposed. Urgency requires time pressure that prevents verification.' },
  { name: 'p1 neither feedback, authority',
    from: 'which is a tactic the CED names at 2.1.A.3 in Unit 2. Topic 1.1 names only intimidation and urgency.',
    html: 'which is a tactic named in Unit 2. Topic 1.1 names only intimidation and urgency.' },
  { name: 'p1 both feedback',
    from: 'Permanent deletion is the threatened negative consequence (1.1.B.2), and the 30-minute window is the deadline that stops the target from checking (1.1.B.3).',
    html: 'Permanent deletion is the threatened negative consequence, and the 30-minute window is the deadline that stops the target from checking.' },
  { name: 'p1 urgency-only feedback, scarcity',
    from: 'The deadline is real time pressure (1.1.B.3). Nothing bad is threatened if the target ignores it, so there is no intimidation. Limited availability is scarcity, which is a Unit 2 tactic (2.1.A.6).',
    html: 'The deadline is real time pressure. Nothing bad is threatened if the target ignores it, so there is no intimidation. Limited availability is scarcity, which is a Unit 2 tactic.' },
  { name: 'p1 legitimate due date feedback',
    from: 'A legitimate due date is not an adversary manufacturing pressure. 1.1.A.2 describes tactics an adversary uses to manipulate a target.',
    html: 'A legitimate due date is not an adversary manufacturing pressure. Topic 1.1 describes tactics an adversary uses to manipulate a target.' },

  // ── Part 2 feedback ──────────────────────────────────────────────────────
  { name: 'p2 challenge questions feedback',
    from: '"1.1.C.1, personal information. None of this is a password or a login code, but all three are standard challenge questions used to verify identity, which is exactly what 1.1.C.1 warns about."',
    html: '"Personal information. None of this is a password or a login code, but all three are standard challenge questions used to verify identity, which is exactly what that category warns about."' },
  { name: 'p2 credential capture feedback',
    from: '"1.1.C.3. The CED text for 1.1.C.3 explicitly covers links that direct a target to a website where login credentials are captured. It is not 1.1.C.2, which is about codes the victim hands over such as a one-time password."',
    html: '"Malware or captured credentials. This category explicitly covers links that send a target to a website where login credentials are captured. It is not secure information, which is about codes the victim hands over, such as a one-time password."' },
  { name: 'p2 one-time password feedback',
    from: '"1.1.C.2, secure information. A one-time password or authentication code lets the adversary log in as the victim, which is the defining outcome in 1.1.C.2."',
    html: '"Secure information. A one-time password or authentication code lets the adversary log in as the victim, which is what defines this category."' },
  { name: 'p2 malicious file feedback',
    from: '"1.1.C.3. Downloading a malicious file that installs malware and steals browser information is named directly in 1.1.C.3."',
    html: '"Malware or captured credentials. Downloading a file that installs malware and steals browser information is exactly this category."' },
  { name: 'p2 birthdate feedback',
    from: '"1.1.C.1. Birthdate and workplace are listed in 1.1.C.1 as information that enables impersonation and answers challenge questions."',
    html: '"Personal information. Birthdate and workplace are the kind of detail that enables impersonation and answers challenge questions."' },

  // ── Part 3 feedback ──────────────────────────────────────────────────────
  { name: 'p3 vishing feedback',
    from: 'III is wrong on two counts: vishing is not a CED term at all, and the message is text, not voice.',
    html: 'III is wrong on two counts: vishing is not a term this course uses at all, and the message is text, not voice.' },
  { name: 'p3 financial loss feedback',
    from: 'Both restate 1.1.C.1 and 1.1.C.2. III is invented. The CED never conditions impact on financial loss.',
    html: 'Both restate the personal information and secure information categories. III is invented. Impact is never conditioned on financial loss.' },
  { name: 'p3 four labels feedback',
    from: 'The word phishing appears in the CED only inside sample scenarios, never as a taxonomy students must apply.',
    html: 'The word phishing turns up only inside sample scenarios, never as a taxonomy students must apply.' },
  { name: 'p3 authority defined feedback',
    from: 'Authority is the tactic and it is defined at 2.1.A.3. III is false: 1.1.A.1 defines social engineering broadly, and 1.1.A.2 says adversaries <i>often</i> use intimidation and urgency, not always.',
    html: 'Authority is the tactic, and it belongs to Unit 2. III is false: social engineering is defined broadly, and adversaries <i>often</i> use intimidation and urgency, not always.' },
  //  Found by the gate, in a note explaining why the exercise was rebuilt. The
  //  note is the most useful paragraph on the page and keeps every claim it
  //  makes; "The exam asks you to" becomes what the exercise itself asks.
  { name: 'why no type sorting note',
    from: 'Six of those eight terms do not appear anywhere in the AP Cybersecurity Course and Exam Description, and pretexting belongs to Topic 2.1, not 1.1. The exam asks you to identify the tactic and the impact.',
    html: 'Six of those eight terms are not part of this course at all, and pretexting belongs to Topic 2.1, not 1.1. What Topic 1.1 asks for is the tactic and the impact.' },

  { name: 'p3 stem, impacts in 1.1.C',
    from: '"stem": "Which statements about the impacts in 1.1.C are supported by the framework?',
    html: '"stem": "Which statements about the three victim impacts are supported by the framework?' },

  { name: 'retry message section pointers',
    from: 'Go back to the lesson sections on intimidation and urgency (1.1.B) and the three impacts (1.1.C) before retrying.',
    html: 'Go back to the lesson sections on intimidation and urgency and on the three impacts before retrying.' },

  { name: 'p3 stem, no Topic 1.1 tactic applies',
    from: 'III. Because no CED 1.1 tactic applies, no social engineering occurred.',
    html: 'III. Because no Topic 1.1 tactic applies, no social engineering occurred.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
