'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UNIT 1 EXAM: TEN FABRICATED FREQUENCY CLAIMS, NOT TWENTY TIP BOXES.
//
//  ⚠ SEQUENCING. THIS PAGE IS BOARD TASK #136 (WO-7), IN PROGRESS AND ROUTED TO
//  CHAT, WHICH WILL REWRITE THE SAME BODY FOR A DIFFERENT DEFECT (thirteen
//  off-CED terms in the items). A Matrixify MERGE writes the WHOLE Body HTML, so
//  whichever of the two sheets lands second silently reverts the first. Import
//  this one BEFORE any WO-7 sheet is built, or rebuild it against the live body
//  AFTER WO-7 lands. Do not hold both at once.
//
//  ── TEN, NOT TWENTY ────────────────────────────────────────────────────────
//  A sweep counting the words "exam tip" flags all twenty boxes on this page.
//  Ten of them are a heading over a real distinction and are left exactly as
//  they are: "Deepfakes extend social engineering into audio and video", "the
//  risk equation is fundamental", "know the phishing hierarchy". Removing those
//  would be removing the study guide from a study aid.
//
//  The ten below assert how often, or how heavily, an exam tests something. AP
//  Cybersecurity is first administered in 2026 and no such exam has been sat, so
//  "most heavily tested" and "appear on almost every practice exam" are not
//  overstated, they describe nothing. Each keeps its actual content and loses
//  the frequency.
//
//  Two are worth naming because they are the reverse of overcleaning: "NIST's
//  current guidance discourages forced periodic rotation" and "Security
//  awareness training is the primary defense against social engineering" are
//  true, useful, and survive whole. Only the sentence attached to them that
//  claims the exam behaves a certain way goes.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-exam';
const PAGE_ID = '132079550679';
const TITLE = 'AP Cybersecurity Unit 1 Exam';

const SPLICES = [
  { name: 'Q1 definitions frequently tested',
    from: 'Social engineering definitions are frequently tested. The key distinguisher is',
    html: 'The key distinguisher is' },

  { name: 'Q3 high-value concept claim',
    from: ' This is a high-value AP exam concept because it contradicts older &ldquo;common sense&rdquo; advice.',
    html: ' It is worth knowing precisely, because it contradicts older &ldquo;common sense&rdquo; advice.' },

  { name: 'Q4 most heavily tested',
    from: 'Rogue access points and packet sniffing are the two wireless attack techniques most heavily tested. Know that HTTPS',
    html: 'Rogue access points and packet sniffing are the two wireless attack techniques to know cold. Note that HTTPS' },

  { name: 'Q5 AI appears on the exam',
    from: 'AI on the AP exam appears in both offensive contexts (generating personalized phishing) and defensive contexts (anomaly detection, threat intelligence). Know both sides.',
    html: 'AI turns up on both sides of this unit: offensive (generating personalized phishing) and defensive (anomaly detection, threat intelligence). Know both.' },

  { name: 'Q7 MFA categories on almost every practice exam',
    from: 'The three MFA factor categories appear on almost every practice exam: know (password, PIN)',
    html: 'The three MFA factor categories are worth memorising: know (password, PIN)' },

  { name: 'Q8 exam frequently tests matching',
    from: ' The exam frequently tests whether students can match a defense to the correct threat.',
    html: ' Matching a defense to the threat it actually addresses is the whole skill here.' },

  { name: 'Q12 exam tests this distinction',
    from: ' The AP exam tests whether you understand this distinction.',
    html: '' },

  { name: 'Q14 exam will test credential stuffing',
    from: ' The AP exam will test whether you can distinguish it from brute-force and dictionary attacks.',
    html: ' Be able to distinguish it from brute-force and dictionary attacks.' },

  { name: 'Q15 nuanced AP exam topic',
    from: 'HTTPS vs. no HTTPS on public Wi-Fi is a nuanced AP exam topic. The correct answer is almost always the qualified one:',
    html: 'HTTPS vs. no HTTPS on public Wi-Fi is a genuinely nuanced question. The qualified answer is the right one:' },

  { name: 'Q17 classic exam pairing',
    from: 'VPNs on public Wi-Fi is a classic exam pairing. Know that a VPN protects',
    html: 'VPNs and public Wi-Fi belong together. A VPN protects' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
