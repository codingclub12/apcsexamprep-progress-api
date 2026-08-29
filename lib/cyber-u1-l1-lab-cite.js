'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.1 LAB: THIRTY-NINE PAINTED CODES, IN FIVE DIFFERENT PLACES.
//
//  The heaviest page in this pass, and the codes are not decoration here: they
//  are the LABELS on the thing the lab grades. A student picks an impact
//  category from a dropdown, and the dropdown reads "1.1.C.1 - personal
//  information". The code is a prefix on a phrase that already says what it
//  means, so removing the prefix costs the student nothing and removes the one
//  part they cannot look up.
//
//  ── OPTION LABELS ONLY, NEVER OPTION VALUES ────────────────────────────────
//  The values are c1, c2, c3, intimidation, urgency, none, and the grading code
//  compares those. Every splice here rewrites the text between the tags and
//  leaves value="..." alone, which is why the key check cannot notice this sheet
//  at all. Each option block appears four times, once per email specimen, so
//  those splices say `all: true` out loud.
//
//  ── THE FEEDBACK IS THE OTHER HALF ─────────────────────────────────────────
//  Grading feedback opens with the bare code ("1.1.C.3. Clicking the
//  authorization link...") and a student reads that AFTER answering, which is
//  the moment it is least useful as a label and most useful as a sentence. Each
//  becomes the words the code stands for.
//
//  ── THE UNIT 2 REFERENCES STAY, WITHOUT THEIR CODES ────────────────────────
//  Two feedback strings say impersonating someone is authority, a Unit 2 tactic.
//  That is exactly right and is the whole point of the realignment: it tells a
//  student why the tempting answer is not the answer here. "at 2.1.A.3" adds
//  nothing to it, so the sentence keeps its claim and loses its citation.
//
//  ── WHAT IS DELIBERATELY KEPT ──────────────────────────────────────────────
//  The tip box says labels like spear phishing and vishing are not assessed.
//  That is not overcleaning territory: it is the page telling a student not to
//  worry about vocabulary it has deliberately dropped, and it survives. Only its
//  claim about what "the exam gives you" and its codes go.
//
//    node scripts/cyber-cite-csv.js cyber-u1-l1-lab-cite out/cite/l1-lab.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-1-lab';
const PAGE_ID = '132187422935';
const TITLE = 'AP Cybersecurity 1.1 Lab: Tactic and Impact Analysis';

const SPLICES = [
  // ── the four specimen dropdowns, four copies of each option ──────────────
  { name: 'tactic option: intimidation', all: true,
    from: '<option value="intimidation">Intimidation only (1.1.B.2)</option>',
    html: '<option value="intimidation">Intimidation only</option>' },
  { name: 'tactic option: urgency', all: true,
    from: '<option value="urgency">Urgency only (1.1.B.3)</option>',
    html: '<option value="urgency">Urgency only</option>' },
  { name: 'impact option: personal information', all: true,
    from: '<option value="c1">1.1.C.1 &mdash; personal information</option>',
    html: '<option value="c1">Personal information</option>' },
  { name: 'impact option: secure information', all: true,
    from: '<option value="c2">1.1.C.2 &mdash; secure information (OTP or login code)</option>',
    html: '<option value="c2">Secure information (OTP or login code)</option>' },
  { name: 'impact option: malware or credentials', all: true,
    from: '<option value="c3">1.1.C.3 &mdash; malware or captured credentials</option>',
    html: '<option value="c3">Malware or captured credentials</option>' },
  { name: 'impact option: none of the three', all: true,
    from: '<option value="none">None of the three 1.1.C impacts applies</option>',
    html: '<option value="none">None of the three impacts applies</option>' },

  { name: 'impact field label', all: true,
    from: '<label>4. Victim Impact Category (1.1.C)</label>',
    html: '<label>4. Victim Impact Category</label>' },

  // ── the rubric ───────────────────────────────────────────────────────────
  { name: 'rubric row: tactic',
    from: '<td>Psychological Tactic (1.1.B)</td>',
    html: '<td>Psychological Tactic</td>' },
  { name: 'rubric row: tactic description',
    from: '<td>Identify whether the message uses intimidation, urgency, both, or neither (1.1.A.2, 1.1.B)</td>',
    html: '<td>Identify whether the message uses intimidation, urgency, both, or neither</td>' },
  { name: 'rubric row: impact',
    from: '<td>Victim Impact (1.1.C)</td>',
    html: '<td>Victim Impact</td>' },
  { name: 'rubric row: impact description',
    from: '<td>Correctly classify what the victim would give up: 1.1.C.1, 1.1.C.2, 1.1.C.3, or none of the three</td>',
    html: '<td>Correctly classify what the victim would give up: personal information, '
      + 'secure information, malware or captured credentials, or none of the three</td>' },

  // ── the grading feedback ─────────────────────────────────────────────────
  { name: 'specimen 1 impact feedback',
    from: '"1.1.C.3. Clicking the authorization link sends the target to a page that captures their Google credentials, which 1.1.C.3 names directly."',
    html: '"Captured credentials. Clicking the authorization link sends the target to a page that harvests their Google login."' },
  { name: 'specimen 2 tactic feedback',
    from: '"Both. Account suspension is the threatened negative consequence (1.1.B.2), and the two-hour window is the deadline that prevents verification (1.1.B.3)."',
    html: '"Both. Account suspension is the threatened negative consequence, and the two-hour window is the deadline that prevents verification."' },
  { name: 'specimen 2 impact feedback',
    from: '"1.1.C.3. The Reset Your Password link leads to a credential-capture page, which falls under 1.1.C.3."',
    html: '"Captured credentials. The Reset Your Password link leads to a credential-capture page."' },
  { name: 'specimen 3 tactic feedback',
    from: 'Impersonating a known vendor contact is authority, a Unit 2 tactic at 2.1.A.3."',
    html: 'Impersonating a known vendor contact is authority, which belongs to Unit 2."' },
  { name: 'specimen 3 impact feedback',
    from: '"1.1.C.3. The attached invoice is the delivery mechanism; downloading a malicious file is named in 1.1.C.3."',
    html: '"Malware. The attached invoice is the delivery mechanism; downloading the file is what installs it."' },
  { name: 'specimen 4 tactic feedback',
    from: 'Impersonating the CEO is authority (2.1.A.3), not a Topic 1.1 tactic."',
    html: 'Impersonating the CEO is authority, a Unit 2 tactic rather than a Topic 1.1 one."' },
  { name: 'specimen 4 impact feedback',
    from: 'This is a request to move money directly. 1.1.C covers personal information',
    html: 'This is a request to move money directly. Topic 1.1 covers personal information' },

  // ── the tip box ──────────────────────────────────────────────────────────
  { name: 'tip box claim and codes',
    from: 'The exam gives you a message and asks two things: which psychological tactic the adversary used, and what the victim stood to lose. Topic 1.1 names exactly two tactics, intimidation (1.1.B.2) and urgency (1.1.B.3), and three impacts (1.1.C.1 through 1.1.C.3). Labels like spear phishing, vishing, and smishing do not appear in the AP Cybersecurity Course and Exam Description and are not assessed.',
    html: 'Every message in this lab asks two things: which psychological tactic the adversary used, and what the victim stood to lose. Topic 1.1 names exactly two tactics, intimidation and urgency, and three kinds of impact. Labels like spear phishing, vishing, and smishing are not part of Topic 1.1 and are not assessed.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
