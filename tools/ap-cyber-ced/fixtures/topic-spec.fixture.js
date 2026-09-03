'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE FIXTURE SPEC. Two pages of content that exist ONLY to exercise the
//  generator and the validator.
//
//  ── WHY A FIXTURE AND NOT ONE REAL PAGE ─────────────────────────────────────
//  "Generate one real page just to test the generator" is the proposal that
//  keeps coming up, and it is the one that puts fixture prose on a live URL.
//  Every spec here sets `fixture: true`, which forces the handle to start with
//  "fixture-" and makes tools/ap-cyber-ced/generate-sheet.js refuse to write an
//  importable sheet at all. The safety is structural, not a note in a comment.
//
//  ── WHAT IT HAS TO CONTAIN, AND WHY ─────────────────────────────────────────
//  A clean fixture that avoids everything difficult proves nothing. So it
//  carries, on purpose:
//
//    LEGITIMATE EK CODES, in all three protected places. The collapsed coverage
//    table a teacher audits, one orientation tag per concept card, and the exit
//    ticket answer key. Rule 1 has to PASS on these; a validator that refused
//    them would push every author back to hand-editing.
//
//    THE CED'S REAL EXAM WEIGHTING, "25% to 40%", attributed to a skill
//    category. Rule 2 has to pass this and refuse a per-unit number, and the
//    only way to know it does both is to feed it both.
//
//    AN INTERNAL LINK TO A LIVE PAGE and a link to the OTHER fixture page in the
//    same sheet, because a batch that cross-links its own pages is correct and a
//    rule that refused it would be in the way.
//
//    APOSTROPHES, COMMAS AND QUOTATION MARKS in the prose, which is what the CSV
//    parse-back diff is for: this is the text that a quoting bug eats.
//
//  Content is deliberately plain and short. It is not teaching material and
//  must never be mistaken for it.
//
//  Pure ASCII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [
  {
    fixture: true,
    topic: '1.1',
    handle: 'fixture-cyber-topic-1-1',
    lede: 'This is fixture text, not a lesson. It exists so the generator has something to build and the validator has something to judge, including the commas, the "quotation marks" and the apostrophes that a CSV quoting bug eats first.',
    concepts: [
      {
        term: 'Elicitation',
        tag: '1.1.A.1',
        body: 'Fixture prose about drawing information out of a target in conversation, phrased so no Essential Knowledge code appears in the part a student reads.',
      },
      {
        term: 'Intimidation and urgency',
        tag: '1.1.A.2',
        body: 'Fixture prose about pressure tactics: a threat of consequences, or a reason the target must act right now.',
      },
    ],
    checks: [
      {
        q: 'Fixture check: a message says an account will be closed within the hour unless the user confirms a password. Which tactic is that?',
        options: ['Elicitation', 'Urgency', 'Segmentation', 'Hashing'],
        answer_index: 1,
        explain: 'Fixture feedback. The deadline is the tactic; nothing here cites a code, because this text is what a student reads.',
      },
    ],
    links: [
      { handle: 'ap-cybersecurity-unit-1-password-attacks', label: 'A live page this fixture links to' },
      { handle: 'fixture-cyber-topic-1-2', label: 'The other page in this same sheet' },
    ],
    ek_coverage: [
      { code: '1.1.A.1', note: 'Covered by the first concept card and the fixture check.' },
      { code: '1.1.A.2', note: 'Covered by the second concept card.' },
    ],
    exit_ticket: {
      prompt: 'Fixture exit ticket: name one tactic from this page and one thing a target can do about it.',
      answer_key: 'Teacher key, not student-visible: accept elicitation (1.1.A.1) or intimidation and urgency (1.1.A.2).',
    },
  },
  {
    fixture: true,
    topic: '1.2',
    handle: 'fixture-cyber-topic-1-2',
    //  The CED's own weighting, attributed to a skill category, so rule 2 is
    //  exercised in the direction where it must NOT fire.
    lede: 'Fixture text. Each skill category is 25% to 40% of the AP Cybersecurity exam, which is the only weighting the CED states, and this sentence is here so the validator has to tell it apart from an invented one.',
    concepts: [
      {
        term: 'Suspicious login prompt',
        tag: '1.2.A.1',
        body: 'Fixture prose about a login page that is not the site it claims to be.',
      },
    ],
    checks: [
      {
        q: 'Fixture check: a login page arrives by text message and asks for a one-time code. What is the first thing to check?',
        options: ['The address it is really served from', 'The colour of the button'],
        answer_index: 0,
        explain: 'Fixture feedback about checking where a page is actually served from.',
      },
    ],
    links: [
      { handle: 'fixture-cyber-topic-1-1', label: 'Back to the first page in this sheet' },
    ],
    ek_coverage: [
      { code: '1.2.A.1', note: 'Covered by the concept card and the fixture check.' },
    ],
    exit_ticket: {
      prompt: 'Fixture exit ticket: how would you tell a real login page from a copy?',
      answer_key: 'Teacher key: accept anything about the served address (1.2.A.1).',
    },
  },
];
