'use strict';
// -----------------------------------------------------------------------------
//  BOARD 429: FOUR NEWS POSTS WHOSE PRACTICE QUESTIONS MARK THE RIGHT ANSWER WRONG.
//
//      node scripts/news-wrong-keys-repair.js <out-dir>
//      node scripts/news-wrong-keys-repair.js <out-dir> --from <before-bodies.json>
//
//  Found by the board 425 sweep of /blogs/news/ and checked on the live pages
//  before anything was written. Tanner asked for these fixed on 2026-09-25.
//
//  -- ap-csa-recursion-complete-guide ----------------------------------------
//  The sweep found Q3. Running all five questions on the JVM found two more:
//
//    Q3  compute(5, 0) returns 12, which is C. The grader keys B, the header
//        says "Why B (11) is correct", and the trace under it ends "12...
//        wait!" before a paragraph that works out C.
//    Q2  NO OPTION IS RIGHT. The base case is `return s;`, so
//        mystery("hello", 0) returns "hellohello" and all three statements are
//        false. The explanation says the method "is effectively
//        s.substring(k)", which is true only if the base case returns "". That
//        one token is the fix: it makes the key (C) and the explanation true.
//    Q4  The key is the best answer but its option ends "so it may produce a
//        wrong answer for some non-palindromes". Across all 1,093 strings over
//        {a, b, c} up to length 6 the method is wrong on 60 palindromes and on
//        no non-palindrome, which its own explanation shows with "abba" after
//        "Actually this example works." Both are rewritten.
//    Q1  The key is right; its option says 7s above the ones place are "never
//        counted", and countSevens(70) counts one. Reworded to what the method
//        actually does.
//
//  -- ap-csp-day-29-list-mutation-and-aliasing, and its twin ----------------
//  Keyed D (99) and taught that list assignment makes an alias. The CSP Exam
//  Reference Sheet: "aList <- bList: Assigns a copy of the list bList to the
//  list aList." So listA[2] is still 20, B. Every paragraph taught the
//  opposite, so the explanation, the three distractor notes, the common
//  mistake and the exam tip are all rewritten. Two handles, identical bodies.
//
//  -- unit-2-cycle-2-day-20 --------------------------------------------------
//  The loop prints 10; the options were 11, 9, 14 and 8, keyed B (9), and the
//  published explanation said "I think the answer key might be wrong". B now
//  reads 10, so the key is unchanged. The distractor notes were false too ("11
//  would be the count if you forgot to exclude..." is 13), so the distractors
//  are replaced with values that come from real mistakes, the way board 344
//  did it: 13 drops the % 5 filter, 3 reads != as ==, and 9 misses 48, the
//  last multiple of 3 before 50, which is the slip the page's own tip warns
//  about.
//
//  Same shape as board 425: lib/matrixify-body-edit.js, every anchor matched
//  exactly once against the live body, a byte-exact reverse, find-or-refuse.
//  smoke/news-wrong-keys-repair.js re-derives every key by running the
//  repaired page's code: javac for the Java, lib/csp-pseudocode.js for the
//  pseudocode.
//
//  No em-dashes; non-ASCII anchor characters are escapes. Zero PII.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const E = require('../lib/matrixify-body-edit.js');

const BLOG = 'news';
const COLS = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];
const SHEET = 'news-wrong-keys-repair-blog-posts.csv';
const ROLLBACK = 'news-wrong-keys-ROLLBACK-blog-posts.csv';
const BEFORE = 'before-bodies.json';

// -- the recursion guide -----------------------------------------------------
const RECURSION = [
  {
    id: 'q1-option-b',
    find: /Line A makes a recursive call but discards its return value, so digits of 7 above the ones place are never counted\./,
    to: 'Line A makes a recursive call but discards its return value, so once the method finds a 7 it returns 1, and any other 7 further left is never counted.',
  },
  {
    id: 'q2-base-case',
    find: /\(s\.<span class="fn">length<\/span>\(\) &lt;= k\) \{\n        <span class="kw">return<\/span> s;/,
    to: '(s.<span class="fn">length</span>() &lt;= k) {\n        <span class="kw">return</span> "";',
  },
  {
    id: 'q2-statement-iii',
    find: /so it returns <code>s<\/code> \(\u201chello\u201d\) directly\. No overflow occurs\. FALSE\./,
    to: 'so it returns <code>""</code>, the empty string, directly. No overflow occurs. FALSE.',
  },
  {
    id: 'q3-key',
    find: /onclick="checkAnswer\('q3','B'\)"/,
    to: 'onclick="checkAnswer(\'q3\',\'C\')"',
  },
  {
    id: 'q3-header',
    find: /<p><strong>Why B \(11\) is correct:<\/strong> Trace the call stack carefully:<\/p>/,
    to: '<p><strong>Why C (12) is correct:</strong> Trace the call stack carefully:</p>',
  },
  {
    id: 'q3-trace',
    find: /11 \+ 1 = 12\.\.\. wait!<\/span>/,
    to: '11 + 1 = 12</span>',
  },
  {
    id: 'q3-recheck',
    find: /<p>Re-check: <code>compute\(5,0\)<\/code>[\s\S]*?counting 3 unwinding steps gives 9 \+ 3 = 12\.<\/p>/,
    to: '<p>Count the calls: <code>a</code> goes 5, 3, 1, -1, so there are three recursive calls before the base case, and by then <code>b</code> is 9. Each of the three adds 1 on the way back, so the result is 9 + 3 = 12.</p>',
  },
  {
    id: 'q4-option-c',
    find: /so it may produce a wrong answer for some non-palindromes\./,
    to: 'so it returns false for some palindromes, such as "abba".',
  },
  {
    id: 'q4-explanation',
    find: /The recursion does terminate \(the string eventually reaches length 1\), but for a non-palindrome like[\s\S]*?The correct substring should be <code>"bb"<\/code>\.<\/p>/,
    to: 'The recursion does terminate, but it checks the wrong thing. Take <code>"abba"</code>: the first and last characters match, so the method checks <code>"abb"</code>, where \'a\' and \'b\' differ, and it returns false for a palindrome. It only ever returns true when every character equals the first one, so it never accepts a non-palindrome; what it gets wrong is palindromes like <code>"abba"</code> and <code>"aba"</code>. The recursive call should be on <code>s.substring(1, s.length() - 1)</code>, which for <code>"abba"</code> is <code>"bb"</code>.</p>',
  },
];

// -- CSP day 29, both handles ------------------------------------------------
const DAY29 = [
  {
    id: 'key',
    find: /var correctAnswer = 'D';/,
    to: "var correctAnswer = 'B';",
  },
  {
    id: 'why-this-answer',
    find: /<p>When listB is assigned to listA, both variables reference the SAME list in memory \(aliasing\)\. Modifying listB\[2\] changes the shared list, so listA\[2\] also becomes 99\.<\/p>/,
    to: '<p>In AP CSP pseudocode, <code>listB &larr; listA</code> gives listB its own copy of the list. The Exam Reference Sheet says so directly. For <code>aList &larr; bList</code> it reads: &ldquo;Assigns a copy of the list bList to the list aList.&rdquo; So <code>listB[2] &larr; 99</code> changes listB only. listA is still [10, 20, 30], and listA[2] is 20.</p>',
  },
  {
    id: 'why-not-the-others',
    find: /<p><strong>B\)<\/strong> 20 is the original but the list was modified\.<\/p>\n<p><strong>C\)<\/strong> 30 was original before modification through listB\.<\/p>/,
    to: '<p><strong>C)</strong> 30 is listA[3]. Lists on the AP CSP exam start at index 1, so listA[2] is the second element.</p>\n'
      + '<p><strong>D)</strong> 99 is what Python or JavaScript would print, because there both names share one list. In AP CSP pseudocode the assignment made a copy, so the change to listB never reaches listA.</p>',
  },
  {
    id: 'common-mistake',
    find: /<p>Assuming listB gets a copy\. List assignment creates an alias \(reference\), not a copy\.<\/p>/,
    to: '<p>Bringing Python or JavaScript habits to the exam. In those languages <code>listB = listA</code> makes two names for one list. In AP CSP pseudocode, <code>listB &larr; listA</code> makes a copy.</p>',
  },
  {
    id: 'exam-tip',
    find: /<p>Watch for list assignments - they create references\. Changes through one variable affect all aliases\.<\/p>/,
    to: '<p>When a question assigns one list to another, apply the Exam Reference Sheet rule: the new variable gets a copy. After that, a change made through one name does not show up through the other.</p>',
  },
];

// -- CSA unit 2 cycle 2 day 20 -----------------------------------------------
const option = (letter, from, to) => ({
  id: 'option-' + letter,
  find: new RegExp('value="' + letter + '">\\n<span class="apcs-option-letter">' + letter + '\\)<\\/span>\\n<span class="apcs-option-content">' + from + '<\\/span>'),
  to: 'value="' + letter + '">\n<span class="apcs-option-letter">' + letter + ')</span>\n<span class="apcs-option-content">' + to + '</span>',
});

const DAY20 = [
  option('A', '11', '13'),
  option('B', '9', '10'),
  option('C', '14', '3'),
  option('D', '8', '9'),
  {
    id: 'why-this-answer',
    find: /<p>The correct answer is <strong>B\) 9<\/strong><\/p>[\s\S]*?<p>Let me list more carefully from 10 to 50:<\/p>/,
    to: [
      '<p>The correct answer is <strong>B) 10</strong></p>',
      '<p>The condition requires numbers divisible by 3 BUT NOT divisible by 5 (numbers divisible by both 3 and 5 are divisible by 15, so we exclude those).</p>',
      '<p><strong>Multiples of 3 from 10 to 50:</strong> 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48. That is 13 numbers.</p>',
      '<p><strong>Among these, the ones also divisible by 5:</strong> 15, 30, 45. Those 3 are excluded.</p>',
      '<p><strong>Final count:</strong> 13 - 3 = 10. Tracing the loop one value at a time gives the same count:</p>',
    ].join('\n'),
  },
  {
    id: 'monologue',
    find: /\n<p>Hmm, I'm getting 10, not 9\. Let me reconsider\.\.\.<\/p>[\s\S]*?<p>I'll go with the intended answer of 9, assuming one of my calculations above has an error\.<\/p>/,
    to: '',
  },
  {
    id: 'why-not-the-others',
    find: /<p><strong>A\) 11<\/strong> - This would be the count if you forgot to exclude numbers divisible by both 3 AND 5\.<\/p>\n<p><strong>C\) 14<\/strong> - This is the total count of all multiples of 3 from 10 to 50, without filtering out those divisible by 5\.<\/p>\n<p><strong>D\) 8<\/strong> - This might result from miscounting or using wrong loop bounds\.<\/p>/,
    to: [
      '<p><strong>A) 13</strong> - This is every multiple of 3 from 12 to 48. It is the count you get if you drop the <code>k % 5 != 0</code> half of the condition.</p>',
      '<p><strong>C) 3</strong> - This counts 15, 30 and 45, the three values the condition throws away. It comes from reading <code>!=</code> as <code>==</code>.</p>',
      '<p><strong>D) 9</strong> - This misses 48, the last multiple of 3 before 50. Listing the values by hand and stopping at 45 is an easy slip at the top of the range.</p>',
    ].join('\n'),
  },
];

// -- what each finished body must say ----------------------------------------
const letters = (s, re) => [...s.matchAll(re)].map((m) => m[1]);

const REPAIRS = [
  {
    handle: 'ap-csa-recursion-complete-guide',
    course: 'csa',
    wrapper: /<div class="rg-mcq-container" id="q1-container">/,
    edits: RECURSION,
    //  q1 to q5, what the grader must key. Only Q3 changes; the rest are
    //  asserted so that a slip elsewhere on the page cannot ride along.
    keys: { q1: 'B', q2: 'C', q3: 'C', q4: 'C', q5: 'B' },
    check(after) {
      const bad = [];
      Object.keys(this.keys).forEach((q) => {
        const m = after.match(new RegExp("onclick=\"checkAnswer\\('" + q + "','([A-D])'\\)\""));
        if (!m || m[1] !== this.keys[q]) bad.push('keys: ' + q + ' grades ' + (m ? m[1] : 'nothing') + ', the answer is ' + this.keys[q]);
      });
      if (!after.includes('<p><strong>Why C (12) is correct:</strong>')) bad.push('labels: q3 no longer says Why C (12)');
      if (/Why B \(11\) is correct/.test(after)) bad.push('labels: q3 still says Why B (11)');
      if (!/<span class="kw">return<\/span> "";/.test(after) || /<span class="kw">return<\/span> s;/.test(after)) bad.push('q2 code: the base case must return the empty string');
      //  Scoped to the option itself: "Why Not the Others" correctly ends a
      //  sentence with "non-palindromes." and a page-wide test refused it.
      if (/wrong answer for some non-palindromes/.test(after)
        || !after.includes('returns false for some palindromes, such as "abba".</span>')) {
        bad.push('q4 wording: the keyed option still blames non-palindromes');
      }
      if (/above the ones place are never counted/.test(after)) bad.push('q1 wording: the keyed option still overstates the defect');
      return bad;
    },
  },
  ...['ap-csp-day-29-list-mutation-and-aliasing', 'ap-csp-day-29-list-mutation-aliasing'].map((handle) => ({
    handle,
    course: 'csp',
    wrapper: /<div class="apcs-practice-wrapper">/,
    edits: DAY29,
    key: 'B',
    check(after) {
      const bad = [];
      const m = after.match(/var correctAnswer = '([A-D])';/);
      if (!m || m[1] !== 'B') bad.push('keys: the grader keys ' + (m ? m[1] : 'nothing') + ', the answer is B (20)');
      if (/alias \(reference\), not a copy|reference the SAME list|they create references/.test(after)) bad.push('copy rule: the page still teaches aliasing');
      if (!/Assigns a copy of the list bList to the list aList\./.test(after)) bad.push('copy rule: the page no longer quotes the reference sheet');
      const notes = letters(after, /<p><strong>([A-D])\)<\/strong>/g).join('');
      if (notes !== 'ACD') bad.push('distractor notes: expected A, C and D, found ' + (notes || 'none'));
      return bad;
    },
  })),
  {
    handle: 'unit-2-cycle-2-day-20',
    course: 'csa',
    wrapper: /<div class="apcs-practice-wrapper">/,
    edits: DAY20,
    //  The published monologue this removes is 1,164 characters, and the page
    //  ends at 0.876 of its length. The floor is lowered for this page only;
    //  MAX_SPAN is what stops an over-broad edit, here and everywhere.
    minRatio: 0.85,
    key: 'B',
    check(after) {
      const bad = [];
      const m = after.match(/var correctAnswer = '([A-D])';/);
      if (!m || m[1] !== 'B') bad.push('keys: the grader keys ' + (m ? m[1] : 'nothing') + ', the answer is B (10)');
      const opts = letters(after, /<span class="apcs-option-content">([^<]*)<\/span>/g).join(',');
      if (opts !== '13,10,3,9') bad.push('options: expected 13,10,3,9, found ' + opts);
      if (!after.includes('The correct answer is <strong>B) 10</strong>')) bad.push('labels: the explanation does not name B) 10');
      return bad;
    },
  },
];

// -- reading the live body -----------------------------------------------------
const WRAPPER = /<div\s+class="article-template__content[^"]*"\s*\n?\s*>/;

function extractBody(html, label) {
  const m = WRAPPER.exec(html);
  if (!m) throw new Error(label + ': theme content wrapper not found');
  const start = m.index + m[0].length;
  const tok = /<div\b|<\/div>/gi;
  tok.lastIndex = start;
  let depth = 1; let t; let end = null;
  while ((t = tok.exec(html))) {
    depth += t[0].toLowerCase().startsWith('<div') ? 1 : -1;
    if (depth === 0) { end = t.index; break; }
  }
  if (end === null) throw new Error(label + ': content wrapper never closes');
  const body = html.slice(start, end).replace(/^\n\s*/, '').replace(/\s*$/, '');
  if (/article-template|predictive-search|<\/body>/.test(body)) throw new Error(label + ': theme markup leaked into the slice');
  return body;
}

// -- rules every repaired body must pass, each named first --------------------
const count = (s, re) => (s.match(new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags)) || []).length;
const block = (s, tag) => (s.match(new RegExp('<' + tag + '[\\s\\S]*?<\\/' + tag + '>', 'gi')) || []).join('\n');
//  The one script change allowed is the key line itself.
const scriptSansKey = (s) => block(s, 'script').replace(/var correctAnswer = '[A-D]';/g, 'KEY');

const MONOLOGUE = /\bwait!|\bWait\b|\bWAIT\b|Re-check|re-check|Let me |I think the answer key|I'll go with|Actually this example|Hmm,|Correction verified/;

function checkBody(repair, before, after) {
  const bad = [];
  if (!repair.wrapper.test(after)) bad.push('wrapper: the post markup is no longer there');
  const bal = (s) => count(s, /<div\b/i) - count(s, /<\/div>/i);
  if (bal(after) !== bal(before)) bad.push('div balance: was ' + bal(before) + ', now ' + bal(after));
  if (block(after, 'style') !== block(before, 'style')) bad.push('style: the post stylesheet changed');
  if (scriptSansKey(after) !== scriptSansKey(before)) bad.push('script: the grading script changed beyond its key');
  if (after.length < before.length * (repair.minRatio || 0.9) || after.length > before.length * 1.1) {
    bad.push('length: ' + before.length + ' became ' + after.length + ', outside what this repair can explain');
  }
  const mono = after.match(MONOLOGUE);
  if (mono) bad.push('self-correction: "' + mono[0] + '" is still in the published text');
  //  Every em-dash in the result must sit in text the page already had. A
  //  count cannot do this: the repair removes some, so one could be authored
  //  under the old total, which is what board 425's suite proved.
  const re = /\u2014/g; let m;
  while ((m = re.exec(after))) {
    const around = after.slice(Math.max(0, m.index - 10), m.index + 11);
    if (!before.includes(around)) { bad.push('dashes: an em-dash in new text, "' + around + '"'); break; }
  }
  return bad.concat(repair.check(after));
}

// -- build --------------------------------------------------------------------
//  Four edits here match lazily between two anchors, and a lazy match that finds
//  its end anchor further away than intended eats whatever lies between. The
//  reverse check cannot see that, because the span is declared. The largest
//  intended span is 1,164 characters (the day 20 monologue), so nothing may
//  replace more than this.
const MAX_SPAN = 1500;

function build(repair, live) {
  E.checkAuthored(repair.handle, repair.edits);
  const { out, captured } = E.applyEdits(repair.handle, live, repair.edits);
  captured.forEach((c) => {
    if (c.was.length > MAX_SPAN) throw new Error(repair.handle + ' edit ' + c.id + ': replaces ' + c.was.length + ' characters, more than ' + MAX_SPAN + ', so its anchors matched further apart than intended');
  });
  if (E.reverse(out, captured) !== live) throw new Error(repair.handle + ': putting the originals back does not give the live body');
  const bad = checkBody(repair, live, out);
  if (bad.length) throw new Error(repair.handle + ': refused\n  - ' + bad.join('\n  - '));
  return { out, captured };
}

function buildAll(lives) {
  const outs = {};
  REPAIRS.forEach((r) => {
    if (typeof lives[r.handle] !== 'string') throw new Error(r.handle + ': no live body');
    outs[r.handle] = build(r, lives[r.handle]).out;
  });
  const twins = ['ap-csp-day-29-list-mutation-and-aliasing', 'ap-csp-day-29-list-mutation-aliasing'];
  if (lives[twins[0]] !== lives[twins[1]]) throw new Error('the day 29 twins no longer share a body, so one repair cannot be assumed right for both');
  if (outs[twins[0]] !== outs[twins[1]]) throw new Error('the day 29 twins were repaired differently');
  return outs;
}

function writeSheets(outDir, lives, outs) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = (bodies) => REPAIRS.map((r) => ({ 'Blog: Handle': BLOG, Handle: r.handle, Command: 'MERGE', 'Body HTML': bodies[r.handle] }));
  const files = [[SHEET, outs], [ROLLBACK, lives]];
  files.forEach(([name, bodies]) => fs.writeFileSync(path.join(outDir, name), E.sheet(COLS, rows(bodies))));
  const snapshot = {};
  REPAIRS.forEach((r) => { snapshot[r.handle] = lives[r.handle]; });
  fs.writeFileSync(path.join(outDir, BEFORE), JSON.stringify(snapshot, null, 2) + '\n');

  //  Read back what is on disk with a reader that did not write it.
  files.forEach(([name, bodies]) => {
    const parsed = E.parseCsv(fs.readFileSync(path.join(outDir, name), 'utf8'));
    if (parsed.length !== REPAIRS.length + 1) throw new Error(name + ': parsed back as ' + parsed.length + ' rows');
    if (parsed[0].join('|') !== COLS.join('|')) throw new Error(name + ': header changed in the round trip');
    parsed.slice(1).forEach((row, i) => {
      const r = REPAIRS[i];
      if (row[0] !== BLOG || row[1] !== r.handle || row[2] !== 'MERGE') throw new Error(name + ': row ' + (i + 1) + ' addresses ' + row.slice(0, 3).join(' / '));
      if (row[3] !== bodies[r.handle]) throw new Error(name + ': ' + r.handle + ' Body HTML differs after the round trip');
    });
  });
}

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function main(argv) {
  const outDir = argv[0];
  if (!outDir) {
    console.error('usage: node scripts/news-wrong-keys-repair.js <out-dir> [--from <before-bodies.json>]');
    process.exit(2);
  }
  const fi = argv.indexOf('--from');
  let lives;
  if (fi !== -1) {
    lives = JSON.parse(fs.readFileSync(argv[fi + 1], 'utf8'));
  } else {
    const sf = require('../lib/storefront-fetch.js');
    lives = {};
    REPAIRS.forEach((r) => {
      const html = sf.page('/blogs/' + BLOG + '/' + r.handle).body;
      const why = sf.cloudflareRewritten(html);
      if (why) throw new Error(r.handle + ': ' + why);
      lives[r.handle] = extractBody(html, r.handle);
    });
  }
  const outs = buildAll(lives);
  writeSheets(outDir, lives, outs);
  REPAIRS.forEach((r) => {
    console.log(r.handle + ': ' + r.edits.length + ' edits, ' + lives[r.handle].length + ' -> ' + outs[r.handle].length
      + ' characters, sha256 ' + sha(outs[r.handle]).slice(0, 12));
  });
  console.log('  wrote ' + [SHEET, ROLLBACK, BEFORE].join(', ') + ' to ' + outDir + ', every cell parsed back and diffed clean');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { BLOG, COLS, SHEET, ROLLBACK, BEFORE, MAX_SPAN, REPAIRS, RECURSION, DAY29, DAY20, MONOLOGUE, extractBody, checkBody, build, buildAll, writeSheets, sha };
