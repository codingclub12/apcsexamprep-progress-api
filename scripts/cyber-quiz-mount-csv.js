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
const PUBLISHED_AT = '2026-01-01 08:00:00';
const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';

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
  { handle: 'ap-cyber-unit-1-lesson-1-quiz', lesson: '1.1',
    title: 'AP Cybersecurity Unit 1 Lesson 1 Quiz',
    h1: 'Topic 1.1 Quiz: Understanding Social Engineering', count: 9, minutes: 15 },
  { handle: 'ap-cyber-unit-1-lesson-2-quiz', lesson: '1.2',
    title: 'AP Cybersecurity Unit 1 Lesson 2 Quiz',
    h1: 'Topic 1.2 Quiz: Suspicious Website Logins', count: 12, minutes: 25 },
  // The five questions this page grades client-side are the same five already in
  // quiz_bank for 1.3, seeded from this page unchanged, so the mount serves the
  // identical instrument and no student sees different content. What leaves is
  // the ANSWERS object that shipped the key alongside them.
  { handle: 'ap-cyber-unit-1-lesson-3-quiz', lesson: '1.3',
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

function grab(s, startMark, endMark) {
  const i = s.indexOf(startMark);
  if (i < 0) return null;
  const j = s.indexOf(endMark, i);
  if (j < 0) return null;
  return s.slice(i, j + endMark.length);
}

function transform(body, t) {
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
    if (/ANSWERS|checkQ|data-val|grade/i.test(blk)) { qs = m.index; qe = end + 9; break; }
  }
  if (qs < 0) return fail(t.handle, 'no quiz script found after the score bar');

  let head = body.slice(0, start);
  const region = body.slice(start, qe);
  const tail = body.slice(qe);

  // The wrapper's closing </div> lives inside the region, and so does the
  // nav-links block on the pages that have one. Both are re-emitted.
  const navLinks = grab(region, '<div class="nav-links"', '</div>\n  </div>')
                || grab(region, '<div class="nav-links"', '</div>');

  const mount =
    '\n  <div data-apcs-quiz\n' +
    `       data-course="${COURSE}"\n` +
    `       data-unit="${UNIT}"\n` +
    `       data-lesson="${t.lesson}"\n` +
    '       data-activity="quiz"></div>\n' +
    (navLinks ? '  ' + navLinks + '\n' : '') +
    '</div>\n' +
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

  let out = head
    .replace(/<h1>[^<]*<\/h1>/, `<h1>${t.h1}</h1>`)
    .replace(/<p>[^<]*questions[^<]*<\/p>/i,
      `<p>${t.count} questions, about ${t.minutes} minutes. Your teacher opens this quiz when the class is ready.</p>`)
    // 1.2's generation repeats the count and the timing in its badge strip.
    .replace(/<span class="ex-badge">\s*\d+\s+Questions?\s*<\/span>/i,
      `<span class="ex-badge">${t.count} Questions</span>`)
    .replace(/<span class="ex-badge">\s*~\s*\d+\s*min\s*<\/span>/i,
      `<span class="ex-badge">~${t.minutes} min</span>`);
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
  const tags = (out.match(/apcs-quiz-mount\.js/g) || []).length;
  if (tags !== 1) return fail(t.handle, `assertion 4: expected 1 mount script tag, found ${tags}`);

  for (const [label, mark] of [['unit nav', '<div id="ucnav"'], ['activity nav', '<!--APCYBER-ACTIVITY-NAV-START-->']]) {
    const a = grab(body, mark, mark === '<div id="ucnav"' ? '</div>\n</div>' : '<!--APCYBER-ACTIVITY-NAV-END-->');
    const b = grab(out, mark, mark === '<div id="ucnav"' ? '</div>\n</div>' : '<!--APCYBER-ACTIVITY-NAV-END-->');
    if (!a || !b || a !== b) return fail(t.handle, `assertion 5: the ${label} block changed`);
  }

  const before = countDivs(body), after = countDivs(out);
  if (before.open - before.close !== after.open - after.close) {
    return fail(t.handle, `assertion 6: div balance changed (${before.open}/${before.close} -> ${after.open}/${after.close})`);
  }
  if (!out.includes('application/ld+json')) return fail(t.handle, 'assertion 7: schema block lost');
  // The two generations name the hero differently: 1.1 uses qhero, 1.2 uses
  // ex-header. Accepting either is not a loosened check; requiring only qhero
  // was simply wrong about 1.2, and the assertion caught that rather than
  // letting a gutted hero through.
  const heroOk = t.heroMark ? out.includes(t.heroMark) : /class="qhero"|class="ex-header"/.test(out);
  if (!heroOk) return fail(t.handle, 'assertion 7: hero lost');
  if (new RegExp(`>\\s*5\\s+Questions?\\s*<`, 'i').test(out) && t.count !== 5) {
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
