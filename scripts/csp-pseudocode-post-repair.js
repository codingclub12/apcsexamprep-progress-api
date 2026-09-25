'use strict';
// -----------------------------------------------------------------------------
//  BOARD 425: THE AP CSP PSEUDOCODE POST GETS THE EXAM, THE LOOP AND THE KEY WRONG.
//
//      node scripts/csp-pseudocode-post-repair.js <out-dir>
//      node scripts/csp-pseudocode-post-repair.js <out-dir> --from <before-body.json>
//
//  /blogs/news/ap-csp-pseudocode-complete-guide-2026, written in February and
//  outside the repo's blog pipeline. Tanner reported one box on 2026-09-25:
//
//      "The AP CSP exam contains approximately 40 MCQ questions in Section I."
//
//  College Board says 70. Reading the rest of the post against the CED turned up
//  three more things of the same kind, and the third is the one a student feels:
//
//    THE EXAM. 70 multiple-choice questions, 120 minutes, 70% of the score:
//    docs/ced-snapshot/csp-exam.txt, and the CED's own exam page. The box also
//    said "usually 10 to 15 questions" need pseudocode. College Board publishes
//    no such count; what it does publish is Big Idea 3 at 30 to 35% of the
//    multiple-choice section, so that is what the box says now.
//
//    REPEAT UNTIL. The post says four times that the condition is checked at
//    the END of each pass, so the body "always runs at least once". The CED says
//    the opposite, in so many words, at AAP-2.K.5:
//
//        "if the conditional evaluates to true initially, the loop body is not
//         executed at all, due to the condition being checked before the loop."
//
//    That is a rule the exam tests, and the site's own CSP course teaches it
//    correctly (seed/csp-exercise-source.json: "test the condition BEFORE each
//    pass"). This post was teaching the opposite beside it.
//
//    THE KEYS. Each option calls checkQ(q, selected, correct) and the inline
//    script marks index `correct` as right. On 7 of the 8 questions that index
//    is wrong, and on Q5 it is 4, on a four-option list, so no answer can ever
//    be marked right. Measured in Chromium against the live body on 2026-09-25:
//    click the right answer on all eight and the page accepts one. Two printed
//    labels are wrong as well, and those two explanations argue with their own
//    label in the published text ("Wait... WAIT. Re-read", "Correction
//    verified"), which is how a student can tell nobody checked it.
//
//    SYNTAX. "angle brackets for list indexing" (the reference sheet uses
//    aList[i]), "two Boolean operators" (NOT, AND, OR), an AND row claiming a
//    short-circuit rule the reference sheet never states, a CAN_MOVE row that
//    drops "relative to where the robot is facing", and a "Complete Reference"
//    with no RANDOM(a, b), which is on the sheet.
//
//  WHAT THIS DOES NOT TOUCH, on purpose: the byline, the tutoring numbers, the
//  em-dashes already in the post (carried, not authored), the heading "IF / ELSE
//  IF / ELSE" (the text beneath it is right that there is no ELSE IF keyword),
//  and the SEO fields, which carry no exam numbers. Those are not facts this
//  repair can re-derive, or they are not wrong.
//
//  THE SHAPE is lib/matrixify-body-edit.js: every anchor must match the live
//  body exactly once, the edits splice in one pass against the original, and
//  putting the captured originals back must give the live body byte for byte.
//  So nothing outside a declared span can change. The keys are BUILT from two
//  tables rather than typed as 28 edits, and WAS is itself an anchor: if the
//  live page no longer encodes what it encoded on 2026-09-25, the build refuses.
//
//  FIND-OR-REFUSE. Once this is live, every anchor matches zero times and the
//  build throws. That is the stale-sheet guard the CLAUDE.md asks for: rebuild
//  before importing, and a sheet whose defect is already gone refuses to build.
//
//  Sources, all first party and all re-derivable:
//    docs/ced-snapshot/csp-exam.txt       the exam format, captured 2026-09-18
//    the CSP CED, sha256 144e1af4...      AAP-2.K.5, exam weighting, and the
//                                         Exam Reference Sheet in its appendix
//
//  No em-dashes, per repo convention: every non-ASCII anchor character below is
//  written as an escape. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const E = require('../lib/matrixify-body-edit.js');

const BLOG = 'news';
const HANDLE = 'ap-csp-pseudocode-complete-guide-2026';
const URL_PATH = '/blogs/' + BLOG + '/' + HANDLE;
const COLS = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];
const SHEET = 'csp-pseudocode-post-repair-blog-posts.csv';
const ROLLBACK = 'csp-pseudocode-post-ROLLBACK-blog-posts.csv';
const BEFORE = 'before-body.json';
const LETTERS = 'ABCD';

//  The answer to each question, traced by hand. smoke/csp-pseudocode-post-repair.js
//  re-derives all eight a second way, by running the pseudocode transliterated
//  into JavaScript with 1-indexed lists, and refuses if the two disagree.
const KEY = { q1: 'C', q2: 'A', q3: 'A', q4: 'A', q5: 'B', q6: 'D', q7: 'D', q8: 'B' };

//  What the live page hands checkQ as the correct index, measured 2026-09-25.
//  Only Q1 is right. Q5 is out of range.
const WAS = { q1: 2, q2: 3, q3: 3, q4: 1, q5: 4, q6: 2, q7: 1, q8: 2 };

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//  28 attribute edits, four per wrong question, each anchored on the whole
//  onclick value so it cannot match a neighbouring question.
function keyEdits() {
  const out = [];
  Object.keys(KEY).forEach((q) => {
    const want = LETTERS.indexOf(KEY[q]);
    if (WAS[q] === want) return;
    for (let sel = 0; sel < 4; sel++) {
      out.push({
        id: q + '-key-' + LETTERS[sel],
        find: new RegExp(esc('onclick="checkQ(\'' + q + '\',' + sel + ',' + WAS[q] + ')"')),
        to: 'onclick="checkQ(\'' + q + '\',' + sel + ',' + want + ')"',
      });
    }
  });
  return out;
}

const TEXT_EDITS = [
  // -- the exam ----------------------------------------------------------------
  {
    id: 'reality-check',
    why: 'Tanner, 2026-09-25. Section I is 70 questions, not about 40. The 10 to 15 count has no source.',
    find: /The AP CSP exam contains approximately 40 MCQ questions in Section I\. A significant portion \u2014 usually 10 to 15 questions \u2014 require you to read or trace through College Board pseudocode\. You cannot afford to decode syntax on the fly\./,
    to: 'Section I of the AP CSP exam is 70 multiple-choice questions in 120 minutes, and it counts for 70% of your score. That is under two minutes a question. Big Idea 3, Algorithms and Programming, is 30 to 35% of that section on College Board&rsquo;s own weighting, and questions from Big Ideas 1 and 2 can be written in pseudocode too. You cannot afford to decode syntax on the fly.',
  },

  // -- syntax ------------------------------------------------------------------
  {
    id: 'list-indexing',
    why: 'The reference sheet indexes with square brackets, aList[i]. What differs from most languages is that the first index is 1.',
    find: /angle brackets for list indexing/,
    to: 'lists that start at index 1 rather than 0',
  },
  {
    id: 'boolean-count',
    why: 'NOT, AND and OR. The cheat sheet two sections down lists all three.',
    find: /two Boolean operators/,
    to: 'three Boolean operators',
  },
  {
    id: 'and-row',
    why: 'The reference sheet defines AND by its truth value only. It says nothing about evaluation order.',
    find: /<span class="cs-desc">True only when BOTH are true\. Short-circuits left to right\.<\/span>/,
    to: '<span class="cs-desc">True only when BOTH are true.</span>',
  },
  {
    id: 'random-row',
    why: 'RANDOM(a, b) is on the Exam Reference Sheet and was missing from a table titled Complete Reference.',
    find: /<span class="cs-syntax">a MOD b<\/span><span class="cs-desc">Remainder after dividing a by b\. Example: 17 MOD 5 = 2\. Critical for even\/odd checks\.<\/span>\n<\/div>\n/,
    to: '<span class="cs-syntax">a MOD b</span><span class="cs-desc">Remainder after dividing a by b. Example: 17 MOD 5 = 2. Critical for even/odd checks.</span>\n</div>\n'
      + '  <div class="cs-item">\n'
      + '<span class="cs-syntax">RANDOM(a, b)</span><span class="cs-desc">Returns a random integer from a to b, including both a and b. Each value is equally likely: RANDOM(1, 3) can return 1, 2, or 3.</span>\n'
      + '</div>\n',
  },
  {
    id: 'can-move-row',
    why: 'The reference sheet measures direction relative to where the robot is facing, and checks for an open square.',
    find: /Returns true if robot can move in <em>direction<\/em> \(forward, backward, left, right\) without hitting a wall\./,
    to: 'Returns true if the square one step away in <em>direction</em>, measured from the way the robot is facing, is open. <em>direction</em> is forward, backward, left, or right.',
  },

  // -- REPEAT UNTIL checks BEFORE each pass (CED AAP-2.K.5) --------------------
  {
    id: 'repeat-until-row',
    why: 'CED AAP-2.K.5: the condition is checked before the loop, so a true condition means zero passes.',
    find: /Checks condition AFTER each iteration\. Loops while condition is FALSE; exits when condition becomes TRUE\./,
    to: 'Checks condition BEFORE each iteration, starting with the first. Loops while condition is FALSE and stops when it is TRUE. If it is already TRUE, the block never runs.',
  },
  {
    id: 'repeat-until-loops',
    why: 'Same rule, in the paragraph that teaches it. The old text said the body always runs at least once.',
    find: /checks its condition at the END of each iteration\. This means the loop body always runs at least once, even if the condition starts out true\. The loop continues while the condition is false and exits the moment the condition becomes true\./,
    to: 'checks its condition BEFORE each pass through the body, including the first. If the condition is already true when the loop is reached, the body never runs at all. Otherwise it keeps looping while the condition is false and stops at the first check where it is true. The check only happens between passes, so if the condition turns true halfway through the body, the rest of that pass still runs.',
  },
  {
    id: 'q1-timing',
    why: 'C is right under the real rule too; only the reasoning named the wrong one.',
    find: /The loop checks this condition at the END of each iteration\. After displaying 8 and adding 2, num becomes 10\. The condition is now true, so the loop exits WITHOUT executing the body again \u2014 10 is never displayed\./,
    to: 'The loop checks this condition before each pass through the body. After displaying 8 and adding 2, num becomes 10. At the next check the condition is true, so the loop exits without running the body again, and 10 is never displayed.',
  },
  {
    id: 'q1-choice-d',
    why: 'D is wrong because the body runs while the condition is false, not because of an at-least-once rule.',
    find: /Choice D is wrong because REPEAT UNTIL checks the condition at the END, so the body always runs at least once\./,
    to: 'Choice D has the rule backwards: REPEAT UNTIL runs its body while the condition is false, and <code>num = 10</code> is false at the start, so the body does run.',
  },
  {
    id: 'q4-choice-b',
    why: 'x does reach 6. What never happens is a pass through the body with x = 6.',
    find: /<p>Choice B is wrong because the loop exits before x reaches 6 \u2014 6 is never inside the loop body when x=6 because the condition is checked and exits immediately\. This is the REPEAT UNTIL timing trap\.<\/p>/,
    to: '<p>Choice B is wrong because 6 is never displayed. When x becomes 6, the next check of <code>x &gt; 5</code> is true, so the loop stops before the body can run with x = 6. This is the REPEAT UNTIL timing trap.</p>',
  },
  {
    id: 'common-error-repeat-until',
    why: 'The mistakes list repeated the wrong rule as advice.',
    find: /<p><strong>Misreading REPEAT UNTIL exit timing\.<\/strong> The condition is checked AFTER the block runs\. If you need to know whether a value is displayed, trace through the entire body before checking the exit condition for that iteration\.<\/p>/,
    to: '<p><strong>Misreading REPEAT UNTIL exit timing.</strong> The condition is checked BEFORE each pass through the block, including the first, so a condition that starts out true means the block never runs. The check only happens between passes: if the condition becomes true partway through the body, the rest of that pass still runs, and the loop stops at the next check.</p>',
  },

  // -- the two printed keys, and the explanations that argued with them --------
  {
    id: 'q2-label',
    why: 'Only Statement I is true, which the explanation itself concludes.',
    find: /<div class="correct-label">Correct Answer: B<\/div>\n    <p><strong>Evaluate each independently:<\/strong><\/p>/,
    to: '<div class="correct-label">Correct Answer: A</div>\n    <p><strong>Evaluate each independently:</strong></p>',
  },
  {
    id: 'q2-statement-ii',
    why: 'Published text read "Wait... WAIT. Re-read" and then re-derived the same sum a second time.',
    find: /<p><strong>Statement II:<\/strong> <code>mystery\(\[1, 2, 3\]\)<\/code> \u2014 val=1: 1 MOD 2 = 1 \u2260 0, so result \u2190 0\+1=1\. val=2: even, skip\. val=3: 3 MOD 2 = 1 \u2260 0, so result \u2190 1\+3=4\. Wait \u2014 result is 4, not 6\. WAIT\. Re-read: 1\+3=4, not 6\. Statement II claims the return is 6\. FALSE\.<\/p>\n    <p><strong>Wait \u2014 re-check:<\/strong> 1 MOD 2 = 1 \u2260 0 \u21D2 add 1\. 3 MOD 2 = 1 \u2260 0 \u21D2 add 3\. Total = 1 \+ 3 = 4\. Return is 4, not 6\. Statement II is FALSE\.<\/p>/,
    to: '<p><strong>Statement II:</strong> <code>mystery([1, 2, 3])</code>. val=1: 1 MOD 2 = 1 &ne; 0, so result &larr; 0+1 = 1. val=2: even, skip. val=3: 3 MOD 2 = 1 &ne; 0, so result &larr; 1+3 = 4. The procedure returns 4, and Statement II claims 6, which is the sum of every value rather than the odd ones. FALSE.</p>',
  },
  {
    id: 'q6-label',
    why: 'All three statements are true, which the explanation itself concludes.',
    find: /<div class="correct-label">Correct Answer: C<\/div>\n    <p>Start: \[5, 10, 15, 20, 25\] \(length 5\)\.<\/p>/,
    to: '<div class="correct-label">Correct Answer: D</div>\n    <p>Start: [5, 10, 15, 20, 25] (length 5).</p>',
  },
  {
    id: 'q6-verdict',
    why: 'Published text read "Wait" and "Correction verified" under a label that said C.',
    find: /<p><strong>I:<\/strong> Length = 6\. TRUE\. <strong>II:<\/strong> data\[1\] = 10\. TRUE\. <strong>III:<\/strong> data\[3\] = 15\. TRUE\. Wait \u2014 data is \[10, 99, 15, 20, 25, 0\], so data\[3\] = 15\. TRUE\. All three are true \u2014 answer is D\.<\/p>\n    <p><em>Correction verified: I \(length 6 = TRUE\), II \(data\[1\]=10 = TRUE\), III \(data\[3\]=15 = TRUE\)\. Answer is D\.<\/em><\/p>/,
    to: '<p><strong>I:</strong> Length = 6. TRUE. <strong>II:</strong> data[1] = 10. TRUE. <strong>III:</strong> data[3] = 15. TRUE. The 99 went in at index 3, but REMOVE(data, 1) shifted everything left, so 99 is now at index 2 and 15 is back at index 3.</p>\n    <p>All three statements are true. <strong>Correct answer: D.</strong></p>',
  },
];

function edits() { return TEXT_EDITS.concat(keyEdits()); }

// -- reading the live body -----------------------------------------------------
//  The theme renders {{ article.content }} verbatim inside this wrapper
//  (sections/main-article.liquid on the connected branch), so the element's
//  children ARE the stored body, less the template's own indentation.
const WRAPPER = /<div\s+class="article-template__content[^"]*"\s*\n?\s*>/;

function extractBody(html) {
  const m = WRAPPER.exec(html);
  if (!m) throw new Error(URL_PATH + ': theme content wrapper not found');
  const start = m.index + m[0].length;
  const tok = /<div\b|<\/div>/gi;
  tok.lastIndex = start;
  let depth = 1; let t; let end = null;
  while ((t = tok.exec(html))) {
    depth += t[0].toLowerCase().startsWith('<div') ? 1 : -1;
    if (depth === 0) { end = t.index; break; }
  }
  if (end === null) throw new Error(URL_PATH + ': content wrapper never closes');
  const body = html.slice(start, end).replace(/^\n\s*/, '').replace(/\s*$/, '');
  if (!body.startsWith('<div id="ap-csp-pseudo-wrapper">')) throw new Error(URL_PATH + ': body does not open with the post wrapper');
  if (/article-template|predictive-search|<\/body>/.test(body)) throw new Error(URL_PATH + ': theme markup leaked into the slice');
  return body;
}

// -- the finished body, inspected before it may enter a sheet -----------------
function questions(body) {
  return Object.keys(KEY).map((q) => {
    const at = body.indexOf('<ul class="options" id="' + q + '-opts">');
    const endUl = at === -1 ? -1 : body.indexOf('</ul>', at);
    const opts = at === -1 ? [] : [...body.slice(at, endUl).matchAll(/<li onclick="checkQ\('(q\d)',(\d+),(\d+)\)">/g)]
      .map((m) => ({ q: m[1], sel: Number(m[2]), correct: Number(m[3]) }));
    const exp = body.indexOf('id="' + q + '-exp"');
    const label = exp === -1 ? null : (body.slice(exp, exp + 200).match(/Correct Answer: ([A-D])</) || [])[1] || null;
    return { q, opts, label };
  });
}

const count = (s, re) => (s.match(new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags)) || []).length;
const block = (s, tag) => (s.match(new RegExp('<' + tag + '[\\s\\S]*?<\\/' + tag + '>', 'gi')) || []).join('\n');

//  Each rule names itself first, so the suite can break one and require THAT
//  rule to be the one that fires.
function checkBody(before, after) {
  const bad = [];
  if (!after.startsWith('<div id="ap-csp-pseudo-wrapper">') || !after.endsWith('</div><!-- end #ap-csp-pseudo-wrapper -->')) {
    bad.push('wrapper: the body no longer opens and closes with the post wrapper');
  }
  const bal = (s) => count(s, /<div\b/i) - count(s, /<\/div>/i);
  if (bal(after) !== bal(before)) bad.push('div balance: was ' + bal(before) + ', now ' + bal(after));
  if (block(after, 'style') !== block(before, 'style')) bad.push('style: the post stylesheet changed');
  if (block(after, 'script') !== block(before, 'script')) bad.push('script: the grading script changed');
  if (after.length < before.length * 0.97 || after.length > before.length * 1.05) {
    bad.push('length: ' + before.length + ' became ' + after.length + ', outside what this repair can explain');
  }

  questions(after).forEach(({ q, opts, label }) => {
    const want = LETTERS.indexOf(KEY[q]);
    if (opts.length !== 4 || opts.some((o, i) => o.q !== q || o.sel !== i)) {
      bad.push('options: ' + q + ' does not carry options A to D in order');
      return;
    }
    const wrong = opts.filter((o) => o.correct !== want);
    if (wrong.length) bad.push('keys: ' + q + ' grades index ' + wrong[0].correct + ' as correct, the answer is ' + KEY[q] + ' (' + want + ')');
    if (label !== KEY[q]) bad.push('labels: ' + q + ' prints Correct Answer: ' + label + ', the answer is ' + KEY[q]);
  });

  if (!after.includes('Section I of the AP CSP exam is 70 multiple-choice questions in 120 minutes')) {
    bad.push('exam facts: the Exam Reality Check no longer states 70 questions in 120 minutes');
  }
  if (/approximately 40 MCQ|\b40 MCQ|10 to 15 questions/i.test(after)) bad.push('exam facts: the retired 40-question or 10-to-15 claim is back');
  if (/angle brackets/i.test(after) || /two Boolean operators/.test(after)) bad.push('syntax: angle brackets or two Boolean operators');
  if (count(after, /<span class="cs-syntax">RANDOM\(a, b\)<\/span>/) !== 1) bad.push('random: the cheat sheet must carry RANDOM(a, b) exactly once');
  if (/at the END of each iteration|condition AFTER each iteration|checked AFTER the block|at least once|condition at the END/i.test(after)) {
    bad.push('repeat until: a post-test description of REPEAT UNTIL survives');
  }
  if (/\bWait\b|\bWAIT\b|Re-read|re-check|Correction verified/.test(after)) bad.push('self-correction: an explanation still argues with itself');
  //  NOT a count. The repair removes eight of the page's em-dashes, so a count
  //  would let an authored one through under the old total, and the suite's own
  //  injection proved exactly that on the first run. Every dash in the result
  //  must instead sit in text the live page already had.
  const re = /\u2014/g; let m;
  while ((m = re.exec(after))) {
    const around = after.slice(Math.max(0, m.index - 10), m.index + 11);
    if (!before.includes(around)) { bad.push('dashes: an em-dash in new text, "' + around + '"'); break; }
  }
  return bad;
}

// -- build --------------------------------------------------------------------
function build(live) {
  const list = edits();
  E.checkAuthored(HANDLE, list);
  const { out, captured } = E.applyEdits(HANDLE, live, list);
  if (E.reverse(out, captured) !== live) throw new Error(HANDLE + ': putting the originals back does not give the live body');
  const bad = checkBody(live, out);
  if (bad.length) throw new Error(HANDLE + ': refused\n  - ' + bad.join('\n  - '));
  return { out, captured, edits: list };
}

function writeSheets(outDir, live, out) {
  fs.mkdirSync(outDir, { recursive: true });
  const row = (body) => ({ 'Blog: Handle': BLOG, Handle: HANDLE, Command: 'MERGE', 'Body HTML': body });
  const files = [[SHEET, out], [ROLLBACK, live]];
  files.forEach(([name, body]) => fs.writeFileSync(path.join(outDir, name), E.sheet(COLS, [row(body)])));
  fs.writeFileSync(path.join(outDir, BEFORE), JSON.stringify({ [HANDLE]: live }, null, 2) + '\n');

  //  Read back what is on disk with a reader that did not write it.
  files.forEach(([name, body]) => {
    const rows = E.parseCsv(fs.readFileSync(path.join(outDir, name), 'utf8'));
    if (rows.length !== 2) throw new Error(name + ': parsed back as ' + rows.length + ' rows, want a header and one row');
    if (rows[0].join('|') !== COLS.join('|')) throw new Error(name + ': header changed in the round trip');
    const [blog, handle, command, cell] = rows[1];
    if (blog !== BLOG || handle !== HANDLE || command !== 'MERGE') throw new Error(name + ': row addresses ' + [blog, handle, command].join(' / '));
    if (cell !== body) throw new Error(name + ': Body HTML differs from the built body after the round trip');
  });
}

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function main(argv) {
  const outDir = argv[0];
  if (!outDir) {
    console.error('usage: node scripts/csp-pseudocode-post-repair.js <out-dir> [--from <before-body.json>]');
    process.exit(2);
  }
  const fi = argv.indexOf('--from');
  let live;
  if (fi !== -1) {
    live = JSON.parse(fs.readFileSync(argv[fi + 1], 'utf8'))[HANDLE];
    if (typeof live !== 'string') throw new Error(argv[fi + 1] + ' carries no body for ' + HANDLE);
  } else {
    const sf = require('../lib/storefront-fetch.js');
    const html = sf.page(URL_PATH).body;
    const why = sf.cloudflareRewritten(html);
    if (why) throw new Error(URL_PATH + ': ' + why);
    live = extractBody(html);
  }
  const { out, edits: list } = build(live);
  writeSheets(outDir, live, out);
  console.log(HANDLE + ': ' + list.length + ' edits (' + TEXT_EDITS.length + ' text, ' + (list.length - TEXT_EDITS.length) + ' key attributes)');
  console.log('  body ' + live.length + ' -> ' + out.length + ' characters');
  console.log('  sheet body sha256 ' + sha(out));
  console.log('  wrote ' + [SHEET, ROLLBACK, BEFORE].join(', ') + ' to ' + outDir + ', every cell parsed back and diffed clean');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { BLOG, HANDLE, URL_PATH, COLS, SHEET, ROLLBACK, BEFORE, KEY, WAS, LETTERS, TEXT_EDITS, edits, keyEdits, extractBody, questions, checkBody, build, writeSheets, sha };
