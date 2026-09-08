'use strict';
// -----------------------------------------------------------------------------
//  MATRIXIFY SHEET: point the AP Cyber 1.1 and 1.2 quiz pages at the server.
//
//  WHAT IT DOES
//  Each page keeps its schema block, its stylesheet, its unit nav rail, its hero
//  and its activity nav. What comes out is the quiz itself: the score bar, the
//  questions, the results panel, and the trailing script that carries the answer
//  key. In its place goes one mount container plus the script tag that renders
//  it, so the questions arrive from
//  GET /api/quiz/<course>/<unit>/<lesson>/quiz instead of from the page body.
//
//  WHY THE PAGES HAVE TO CHANGE AT ALL
//  The 1.1 page ends with a plaintext ANSWERS object mapping every question to
//  its letter. The 1.2 page carries its key as data-val on each option. Either
//  way the browser has the key before any code runs, which is why those pages
//  cannot be graded assessments and why a lock on them would be theatre.
//
//  THE SPLICE IS BOUNDED BY TWO LANDMARKS, not by parsing:
//    start  <div class="score-bar"       the first thing that belongs to the quiz
//    end    the end of the <script> block that carries the quiz logic
//  Everything before the first and after the second is copied byte for byte.
//  The two pages are different markup generations (1.1 uses q-block, 1.2 uses
//  section/mcq-opt), and bounding the edit this way is what lets one transform
//  handle both without understanding either.
//
//  THE CLOSING </div> OF THE WRAPPER IS INSIDE THE REGION, so it is re-emitted
//  along with the nav-links block where the page had one. Assertion 6 checks div
//  balance against the original rather than trusting that.
//
//  ASSERTIONS, all of which must hold before a row is written:
//    1 no answer key survives: ANSWERS, data-answer, data-val, data-correct
//    2 no question markup survives: q-block, mcq-opt, option-label, section-label
//    3 exactly one mount container, carrying the right course/unit/lesson
//    4 the mount script tag is present exactly once
//    5 the unit nav rail and the activity nav are byte-identical to the original
//    6 div open/close counts balance, and match the original's balance
//    7 the schema block and the hero survive
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  THIS WRITES A FILE AND NOTHING ELSE. It calls no Shopify mutation. Importing
//  the sheet is a human action, and MERGE overwrites a live body with no undo,
//  so read the diff it prints before importing.
//
//  Run: node scripts/cyber-quiz-mount-csv.js <bodies-dir> <out.csv>
//    bodies-dir holds <handle>.body.html pulled from the Admin API.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const MOUNT_SRC = 'https://cdn.shopify.com/s/files/1/0778/8403/1191/files/apcs-quiz-mount.js?v=1787764736';
//  2026-03-01, which is what scripts/matrixify-preflight.js accepts and what
//  csp-lesson-exercise-links.js has written since August on imports that are
//  live. This said 2026-01-01, and the one sheet built with it was never
//  imported: the 1.3 page still serves its own answer key, so that date has no
//  live precedent to preserve. Any FIXED date satisfies the rule the preflight
//  is really enforcing, which is that a live server time scrambles sort order;
//  matching the repo's value keeps one convention rather than two.
const PUBLISHED_AT = '2026-03-01 12:00:00';
const COURSE = 'ap-cybersecurity';
//  Was a module-level 'unit-1'. Units 2 to 5 arrived on 2026-09-08 and a global
//  would have written data-unit="unit-1" onto seventeen pages, so every mount
//  would have asked the server for a lesson in the wrong unit and rendered
//  nothing. Each target names its own, derived from the page rather than typed:
//  see lib/cyber-quiz-lesson.js for why the handle digits are not the answer.

// startMark bounds the top of the quiz region and defaults to the score bar.
// heroMark is the string assertion 7 requires to survive; it defaults to the
// class check that fits the 1.1 and 1.2 generations.
//
// 1.3 is a THIRD markup generation and needed both of those to become per-target
// rather than global. It has no score bar, no qhero and no ex-header: its hero is
// a bare inline-styled banner, and its questions live in #quizBody. Loosening the
// two global checks to admit it would have retired the protection they give 1.1
// and 1.2, so the page names its own landmarks instead and every other assertion
// still applies to all three.
const TARGETS = [
  { handle: 'ap-cyber-unit-1-lesson-1-quiz', unit: 'unit-1', lesson: '1.1',
    title: 'AP Cybersecurity Unit 1 Lesson 1 Quiz',
    h1: 'Topic 1.1 Quiz: Understanding Social Engineering', count: 9, minutes: 15 },
  { handle: 'ap-cyber-unit-1-lesson-2-quiz', unit: 'unit-1', lesson: '1.2',
    title: 'AP Cybersecurity Unit 1 Lesson 2 Quiz',
    h1: 'Topic 1.2 Quiz: Suspicious Website Logins', count: 12, minutes: 25 },
  // The five questions this page grades client-side are the same five already in
  // quiz_bank for 1.3, seeded from this page unchanged, so the mount serves the
  // identical instrument and no student sees different content. What leaves is
  // the ANSWERS object that shipped the key alongside them.
  { handle: 'ap-cyber-unit-1-lesson-3-quiz', unit: 'unit-1', lesson: '1.3',
    title: 'AP Cybersecurity Unit 1 Lesson 3 Quiz',
    h1: 'Topic 1.3 Quiz: The Dangers of Public Wi-Fi', count: 5, minutes: 15,
    startMark: '<div id="quizBody"',
    heroMark: 'Topic 1.3 Quiz: The Dangers of Public Wi-Fi',
    // Audit finding 5: this page carries a copy-pasted authoring header naming
    // 1.2 Exercise 1. It sits inside an HTML comment, so it is inert now and
    // stays inert after the mount lands (querySelector does not read comments).
    // Corrected anyway, because the next person to read this header to find out
    // what the page reports as would be told the wrong activity.
    commentFix: [
      'AP CYBERSECURITY | Unit 1 Topic 1.2 | Exercise 1: Password Autopsy\n  Shopify Handle: ap-cyber-unit-1-lesson-2-exercise-1\n  data-lesson-id="1.2-ex1"',
      'AP CYBERSECURITY | Unit 1 Topic 1.3 | Quiz: The Dangers of Public Wi-Fi\n  Shopify Handle: ap-cyber-unit-1-lesson-3-quiz\n  server-scored: GET /api/quiz/ap-cybersecurity/unit-1/1.3/quiz',
    ] },

  //  1.4 AND 1.5, added 2026-09-08. Same third markup generation as 1.3: no
  //  score bar, questions in #quizBody, key in a trailing ANSWERS object. Their
  //  banks have been in production since 2026-08-27 with pool=5 each, confirmed
  //  live rather than read off the seed file, and only the page was never
  //  mounted. So this ships no new questions; it stops two pages publishing
  //  their own answer key.
  //
  //  MOUNTING THESE TWO CHANGES WHAT A STUDENT SEES, and that is the point.
  //  seed/cyber-unit-1-web-quizzes.js records why: the page the unit nav offers
  //  as the 1.4 quiz is a second copy of 1.3 and serves wireless questions under
  //  a 1.4 title, and the 1.5 page asked about SIEM versus IDS products and
  //  adversarial machine learning, neither of which is in Topic 1.5. The server
  //  banks are framework-anchored. The mount replaces wrong content with right
  //  content, which is a fix rather than a side effect.
  { handle: 'ap-cyber-unit-1-lesson-4-quiz', unit: 'unit-1', lesson: '1.4',
    title: 'AP Cybersecurity Unit 1 Lesson 4 Quiz',
    h1: 'Topic 1.4 Quiz: AI-Based Cybersecurity Attacks', count: 5, minutes: 15,
    startMark: '<div id="quizBody"',
    heroMark: 'Topic 1.4 Quiz: AI-Based Cybersecurity Attacks' },

  { handle: 'ap-cyber-unit-1-lesson-5-quiz', unit: 'unit-1', lesson: '1.5',
    title: 'AP Cybersecurity Unit 1 Lesson 5 Quiz',
    h1: 'Topic 1.5 Quiz: Leveraging AI in Cyber Defense', count: 5, minutes: 15,
    startMark: '<div id="quizBody"',
    heroMark: 'Topic 1.5 Quiz: Leveraging AI in Cyber Defense' },

  //  ── UNITS 2 TO 5, added 2026-09-08 ────────────────────────────────────────
  //  Seventeen pages that still ship their own answer key, across three more
  //  markup generations. Every field here is DERIVED, not typed:
  //
  //    lesson    lib/cyber-quiz-lesson.js, which makes the CED topic taxonomy
  //              and the page's own h1 agree. NOT the handle digits: Unit 3 was
  //              renumbered in the bodies and not in the URLs, so every Unit 3
  //              handle is one lesson higher than the page it names.
  //    title     the page's existing Shopify title, read from the Admin API.
  //    startMark the landmark this generation puts above its questions.
  //    keep      content that sits INSIDE the spliced region and has to come
  //              out the other side. The Unit 2 and 3 pages put a scenario card
  //              between the score bar and the first question, and the
  //              questions refer to it by name.
  //
  //  No h1, count or minutes: these pages state their own counts correctly and
  //  their intro lines carry real content. See the rewrite guard in transform.
  //
  //  The em-dashes in two keep strings are the LIVE PAGE's punctuation, quoted
  //  so the assertion can find it again. The no-em-dash rule governs text this
  //  repo authors; flattening a quoted source would make the check miss.
  { handle: "ap-cyber-unit-2-lesson-1-quiz", unit: "unit-2", lesson: "2.1",
    title: "AP Cybersecurity Unit 2 Lesson 1 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 2.1 Quiz: Cyber Foundations",
    keep: ["Topic 2.1 — Cyber Foundations"], },
  { handle: "ap-cyber-unit-2-lesson-2-quiz", unit: "unit-2", lesson: "2.2",
    title: "AP Cybersecurity 2.2 Quiz: Physical Vulnerabilities and Attacks",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 2.2 Quiz: Physical Vulnerabilities and Attacks",
    keep: ["Xtensr Research Labs — Scenario 2A"], },
  { handle: "ap-cyber-unit-2-lesson-4-quiz", unit: "unit-2", lesson: "2.4",
    title: "AP Cybersecurity Unit 2 Lesson 4 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 2.4 Quiz: Detecting Physical Attacks",
    keep: ["Xtensr Research Labs · Delmar Applied Optics"], },
  { handle: "ap-cyber-unit-3-lesson-1-quiz", unit: "unit-3", lesson: "3.1a",
    title: "Topic 3.1 Quiz: Network Fundamentals | AP Cybersecurity",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 3.1 Quiz: Network Fundamentals",
    keep: ["Meridian Energy Grid"], },
  { handle: "ap-cyber-unit-3-lesson-2-quiz", unit: "unit-3", lesson: "3.1b",
    title: "AP Cybersecurity Unit 3 Lesson 2 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 3.1 Quiz: Network Attacks",
    keep: ["Crossroads Logistics"], },
  { handle: "ap-cyber-unit-3-lesson-3-quiz", unit: "unit-3", lesson: "3.2",
    title: "AP Cybersecurity Unit 3 Lesson 3 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 3.2 Quiz: Secure Network Protocols",
    keep: ["Crossroads Logistics"], },
  { handle: "ap-cyber-unit-3-lesson-4-quiz", unit: "unit-3", lesson: "3.3",
    title: "AP Cybersecurity Unit 3 Lesson 4 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 3.3 Quiz: Network Segmentation &amp; VLANs",
    keep: ["Brightpath University"], },
  { handle: "ap-cyber-unit-3-lesson-5-quiz", unit: "unit-3", lesson: "3.4",
    title: "AP Cybersecurity Unit 3 Lesson 5 Quiz",
    startMark: "<div class=\"score-bar\"",
    preserve: ['<div class="scenario-card"'],
    heroMark: "Lesson 3.4 Quiz: Firewalls &amp; Packet Filtering",
    keep: ["NovaTech Solutions"], },
  { handle: "ap-cyber-unit-4-lesson-2-quiz", unit: "unit-4", lesson: "4.2",
    title: "4.2 Quiz: Authentication",
    startMark: "<div class=\"l-q\"",
    heroMark: "Lesson 4.2 Quiz", },
  { handle: "ap-cyber-unit-4-lesson-3-quiz", unit: "unit-4", lesson: "4.3",
    title: "4.3 Quiz: Protecting Devices",
    startMark: "<div class=\"l-q\"",
    heroMark: "Lesson 4.3 Quiz: Protecting Devices", },
  { handle: "ap-cyber-unit-4-lesson-4-quiz", unit: "unit-4", lesson: "4.4",
    title: "4.4 Quiz: Detecting Attacks on Devices",
    startMark: "<div class=\"l-q\"",
    heroMark: "4.4 Quiz: Detecting Attacks on Devices", },
  { handle: "ap-cyber-unit-5-lesson-1-quiz", unit: "unit-5", lesson: "5.1",
    title: "5.1 Quiz: Application & Data Vulnerabilities",
    startMark: "<div class=\"score-panel\"",
    heroMark: "5.1 Checkpoint: Application &amp; Data Vulnerabilities", },
  { handle: "ap-cyber-unit-5-lesson-2-quiz", unit: "unit-5", lesson: "5.2",
    title: "5.2 Quiz: Symmetric Cryptography",
    startMark: "<div class=\"score-panel\"",
    heroMark: "5.2 Checkpoint: Symmetric Cryptography", },
  { handle: "ap-cyber-unit-5-lesson-3-quiz", unit: "unit-5", lesson: "5.3",
    title: "5.3 Quiz: Hashing for Data Integrity",
    startMark: "<div class=\"score-panel\"",
    heroMark: "5.3 Checkpoint: Hashing for Data Integrity", },
  { handle: "ap-cyber-unit-5-lesson-4-quiz", unit: "unit-5", lesson: "5.4",
    title: "5.4 Quiz: Asymmetric Cryptography & PKI",
    startMark: "<div class=\"score-panel\"",
    heroMark: "5.4 Checkpoint: Asymmetric Cryptography &amp; PKI", },
  { handle: "ap-cyber-unit-5-lesson-5-quiz", unit: "unit-5", lesson: "5.5",
    title: "5.5 Exam-Style Quiz",
    startMark: "<div class=\"score-panel\"",
    heroMark: "L5.5 Exam-Style Quiz", },
  { handle: "ap-cyber-unit-5-lesson-6-quiz", unit: "unit-5", lesson: "5.6",
    title: "Quiz: Exam-Style Detection MCQs",
    startMark: "<div class=\"score-tracker\"",
    heroMark: "Detection &amp; IR Quiz", },
];

function fail(handle, msg) {
  console.error(`REFUSED  ${handle}: ${msg}`);
  process.exitCode = 1;
  return null;
}

function countDivs(s) {
  return {
    open: (s.match(/<div\b/gi) || []).length,
    close: (s.match(/<\/div>/gi) || []).length,
  };
}

//  What makes a <script> THE quiz script rather than the nav or the schema.
//  Named per generation, because each one grades differently and a list that
//  only knew the first two silently refused eleven pages as "no quiz script".
const QUIZ_SCRIPT = /ANSWERS|checkQ|checkMCQ|selectOpt|data-val|data-correct|grade/i;

//  Balanced-div extraction. grab() takes an end MARK, which works when the
//  block ends in a distinctive string and does not when it nests: the Unit 2
//  scenario card is four divs deep and any literal end mark either stops early
//  or runs past. This counts depth instead, the same way
//  scripts/extract-live-body.js recovers a page body.
function grabBalanced(s, startMark) {
  const i = s.indexOf(startMark);
  if (i < 0) return null;
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(s))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return s.slice(i, m.index + m[0].length);
  }
  return null;
}

function grab(s, startMark, endMark) {
  const i = s.indexOf(startMark);
  if (i < 0) return null;
  const j = s.indexOf(endMark, i);
  if (j < 0) return null;
  return s.slice(i, j + endMark.length);
}

function transform(body, t) {
  if (!t.unit) return fail(t.handle, 'target names no unit, so the mount would ask the server for the wrong one');
  const startMark = t.startMark || '<div class="score-bar"';
  const start = body.indexOf(startMark);
  if (start < 0) return fail(t.handle, `no ${startMark} landmark, so the quiz region cannot be bounded`);

  // The quiz script is the <script> block carrying the grading logic. Bound the
  // search to after the score bar so an earlier schema or nav script is never
  // mistaken for it.
  let qs = -1, qe = -1;
  const re = /<script>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(body))) {
    const end = body.indexOf('</script>', m.index);
    if (end < 0) break;
    const blk = body.slice(m.index, end + 9);
    if (QUIZ_SCRIPT.test(blk)) { qs = m.index; qe = end + 9; break; }
  }
  if (qs < 0) return fail(t.handle, 'no quiz script found after the score bar');

  let head = body.slice(0, start);
  const region = body.slice(start, qe);
  const tail = body.slice(qe);

  // The wrapper's closing </div> lives inside the region, and so does the
  // nav-links block on the pages that have one. Both are re-emitted.
  const navLinks = grab(region, '<div class="nav-links"', '</div>\n  </div>')
                || grab(region, '<div class="nav-links"', '</div>');

  //  CONTENT INSIDE THE REGION THAT HAS TO SURVIVE. The Unit 2 and 3 pages put
  //  a "Before You Begin" scenario card between the score bar and the first
  //  question, and their questions name the company in it, so splicing from the
  //  score bar deletes the premise of the quiz. Re-emitted ahead of the mount,
  //  which keeps the reading order it had: scenario, then questions.
  const preserved = [];
  for (const mark of t.preserve || []) {
    const blk = grabBalanced(region, mark);
    if (!blk) return fail(t.handle, `preserve: no balanced block at ${mark}`);
    preserved.push('  ' + blk + '\n');
  }

  const mountCore = preserved.join('') +
    '\n  <div data-apcs-quiz\n' +
    `       data-course="${COURSE}"\n` +
    `       data-unit="${t.unit}"\n` +
    `       data-lesson="${t.lesson}"\n` +
    '       data-activity="quiz"></div>\n' +
    (navLinks ? '  ' + navLinks + '\n' : '');

  //  HOW MANY </div> THE SPLICE OWES, counted rather than assumed.
  //  This was a hardcoded single '</div>', which is right for the Unit 1 shape
  //  and only that one. The region runs from a landmark to the end of the quiz
  //  script, so it carries every container close that happens to fall inside
  //  it, and that number is a property of the page: Unit 4 wraps its questions
  //  in an l-cfu block, Unit 5 opens a strategy panel first, and 4.3 has no
  //  wrapper at all. Emitting one closer on a page that owed two leaves the
  //  body unbalanced, and Shopify will happily store that.
  //
  //  Assertion 6 still checks the result. This is not a replacement for it: the
  //  arithmetic decides how many to write, the assertion decides whether the
  //  page came out the way it went in.
  const b0 = countDivs(body);
  const probe = countDivs(head + mountCore + tail);
  const owed = (probe.open - probe.close) - (b0.open - b0.close);
  if (owed < 0) return fail(t.handle, `the splice would ADD ${-owed} unclosed div(s), which means the region is bounded wrong`);
  const mount = mountCore + '</div>\n'.repeat(owed) +
    `<script src="${MOUNT_SRC}" defer></script>\n`;

  // The hero states a question count and a title that were both wrong: the count
  // described the old five item quiz, and 1.1's h1 carried the UNIT name rather
  // than the topic's. The two generations word this differently, so every place
  // a count appears is rewritten, not just the first.
  if (t.commentFix) {
    const [from, to] = t.commentFix;
    if (!head.includes(from)) return fail(t.handle, 'commentFix: the stale authoring header is not present as written');
    head = head.replace(from, to);
  }

  //  REWRITING THE HERO IS OPT IN, and it was unconditional. Unit 1 asked for it
  //  because its counts and one h1 were factually wrong. Units 2 to 5 are
  //  correct as written and their intro line carries real content ("Social
  //  engineering, adversaries, attack phases, risk, and controls"), which the
  //  canned replacement would have deleted. A migration that also rewrites copy
  //  cannot be reviewed as a migration, so a target with no h1 keeps its own.
  let out = head;
  if (t.h1) out = out.replace(/<h1>[^<]*<\/h1>/, `<h1>${t.h1}</h1>`);
  if (t.count != null) {
    out = out
      .replace(/<p>[^<]*questions[^<]*<\/p>/i,
        `<p>${t.count} questions, about ${t.minutes} minutes. Your teacher opens this quiz when the class is ready.</p>`)
      // 1.2's generation repeats the count and the timing in its badge strip.
      .replace(/<span class="ex-badge">\s*\d+\s+Questions?\s*<\/span>/i,
        `<span class="ex-badge">${t.count} Questions</span>`)
      .replace(/<span class="ex-badge">\s*~\s*\d+\s*min\s*<\/span>/i,
        `<span class="ex-badge">~${t.minutes} min</span>`);
  }
  out = out + mount + tail;

  // ── assertions ────────────────────────────────────────────────────────────
  const banned = [
    ['ANSWERS', /var\s+ANSWERS|ANSWERS\s*=/],
    ['data-answer', /data-answer=/],
    ['data-val', /data-val=/],
    ['data-correct', /data-correct=/],
    ['q-block', /class="q-block"/],
    ['mcq-opt', /class="mcq-opt"/],
    ['option-label', /class="option-label"/],
    ['section-label', /class="section-label"/],
  ];
  for (const [name, rx] of banned) {
    if (rx.test(out)) return fail(t.handle, `assertion 1/2: ${name} survived the splice`);
  }
  const mounts = (out.match(/data-apcs-quiz/g) || []).length;
  if (mounts !== 1) return fail(t.handle, `assertion 3: expected 1 mount container, found ${mounts}`);
  if (!out.includes(`data-lesson="${t.lesson}"`)) return fail(t.handle, 'assertion 3: wrong lesson on the mount');
  //  The unit was checked only by reading the source, and a mutation that wrote
  //  data-unit="unit-1" onto all seventeen pages produced a clean sheet. Those
  //  pages would have asked /api/quiz/ap-cybersecurity/unit-1/3.3/quiz, got a
  //  404, and rendered nothing where the quiz used to be.
  if (!out.includes(`data-unit="${t.unit}"`)) return fail(t.handle, 'assertion 3: wrong unit on the mount');
  if (!out.includes(`data-course="${COURSE}"`)) return fail(t.handle, 'assertion 3: wrong course on the mount');
  const tags = (out.match(/apcs-quiz-mount\.js/g) || []).length;
  if (tags !== 1) return fail(t.handle, `assertion 4: expected 1 mount script tag, found ${tags}`);

  //  SURVIVAL, not existence, for the same reason assertion 7 had to be fixed.
  //  Unit 2 and 3 quiz pages carry no #ucnav at all, and requiring one refused
  //  them for something the transform never touched. Absent before and absent
  //  after is fine; present before and changed after is not.
  for (const [label, mark] of [['unit nav', '<div id="ucnav"'], ['activity nav', '<!--APCYBER-ACTIVITY-NAV-START-->']]) {
    const end = mark === '<div id="ucnav"' ? '</div>\n</div>' : '<!--APCYBER-ACTIVITY-NAV-END-->';
    const a = grab(body, mark, end);
    if (!a) continue;
    const b = grab(out, mark, end);
    if (!b || a !== b) return fail(t.handle, `assertion 5: the ${label} block changed`);
  }
  //  CONTENT THE SPLICE MUST NOT EAT. The region runs from a landmark to the
  //  quiz script, and on some generations real content sits inside it: the Unit
  //  2 pages put a "Before You Begin" scenario card between the score bar and
  //  the first question, and the questions refer to it. A page names the
  //  strings that have to come out the other side.
  for (const k of t.keep || []) {
    if (!out.includes(k)) return fail(t.handle, `assertion 5b: the splice removed ${JSON.stringify(k.slice(0, 60))}`);
  }

  const before = countDivs(body), after = countDivs(out);
  if (before.open - before.close !== after.open - after.close) {
    return fail(t.handle, `assertion 6: div balance changed (${before.open}/${before.close} -> ${after.open}/${after.close})`);
  }
  //  SURVIVAL, not existence. This asked whether the OUTPUT has a schema block,
  //  which refuses a page that never had one: 1.4 and 1.5 carry no ld+json at
  //  all, so the transform was blamed for losing something that was not there.
  //  A check that cannot tell "removed" from "absent" reports the wrong page.
  const schemaIn = (body.match(/application\/ld\+json/g) || []).length;
  const schemaOut = (out.match(/application\/ld\+json/g) || []).length;
  if (schemaOut < schemaIn) {
    return fail(t.handle, `assertion 7: schema block lost (${schemaIn} in, ${schemaOut} out)`);
  }
  // The two generations name the hero differently: 1.1 uses qhero, 1.2 uses
  // ex-header. Accepting either is not a loosened check; requiring only qhero
  // was simply wrong about 1.2, and the assertion caught that rather than
  // letting a gutted hero through.
  const heroOk = t.heroMark ? out.includes(t.heroMark) : /class="qhero"|class="ex-header"/.test(out);
  if (!heroOk) return fail(t.handle, 'assertion 7: hero lost');
  if (t.count != null && new RegExp(`>\\s*5\\s+Questions?\\s*<`, 'i').test(out) && t.count !== 5) {
    return fail(t.handle, 'assertion 8: a stale "5 Questions" badge survived');
  }

  return out;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main() {
  const [dir, out, ...only] = process.argv.slice(2);
  if (!dir || !out) {
    console.error('usage: node scripts/cyber-quiz-mount-csv.js <bodies-dir> <out.csv> [handle...]');
    process.exit(2);
  }
  // Naming handles restricts the sheet to those pages. A missing body is still a
  // REFUSED, never a silent skip: an import that quietly covered fewer pages than
  // asked for is the failure mode this whole script exists to avoid.
  const targets = only.length ? TARGETS.filter((t) => only.includes(t.handle)) : TARGETS;
  for (const h of only) {
    if (!TARGETS.some((t) => t.handle === h)) fail(h, 'not a known target handle');
  }
  const rows = [];
  for (const t of targets) {
    const p = path.join(dir, t.handle + '.body.html');
    if (!fs.existsSync(p)) { fail(t.handle, `no body at ${p}`); continue; }
    const body = fs.readFileSync(p, 'utf8');
    const next = transform(body, t);
    if (!next) continue;
    rows.push({ ...t, bodyHtml: next, wasBytes: body.length, nowBytes: next.length });
  }
  if (process.exitCode) { console.error('\nNo sheet written: at least one page refused.'); return; }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([r.handle, 'MERGE', r.title, r.bodyHtml, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${rows.length} page(s) to ${out}`);
  for (const r of rows) {
    console.log(`  ${r.handle}  ${r.wasBytes} -> ${r.nowBytes} bytes  (removed ${r.wasBytes - r.nowBytes})`);
  }
  console.log('\nMERGE overwrites the live body and Shopify keeps no undo.');
  console.log('Import mode MERGE, quoting QUOTE_ALL, one import at a time.');
}

main();
