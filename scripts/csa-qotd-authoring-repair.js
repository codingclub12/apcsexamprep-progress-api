'use strict';
// -----------------------------------------------------------------------------
//  REPAIR THE CSA DAILY-PRACTICE ARTICLES THAT PUBLISHED THEIR AUTHOR'S THINKING.
//
//      node scripts/csa-qotd-authoring-repair.js <bodies-dir> <out-dir>
//
//  <bodies-dir> holds one <handle>.html per article, the LIVE stored body,
//  pulled through lib/storefront-fetch.js and scripts/csa-article-body-extract.js
//  by scripts/csa-qotd-authoring-sweep.js.
//
//  ── WHAT WAS FOUND, AND WHY THE LEAK IS NOT THE POINT ──────────────────────
//  Reported 2026-09-15: the AP CSA question of the day, global day 22, showed
//  the author arguing with themselves as soon as a student pressed Check Answer.
//  lib/authoring-tells.js found nine articles in that state out of 429.
//
//  The leaked sentences turned out to be a map of where the bank is BROKEN, not
//  a cosmetic problem. Seven of the nine are defective items:
//
//    day 22 math-random-range     keys (A). III is also correct, so (C).
//    day 4 loop-equivalence       (A) and (B) both print 0 3 6 9.
//    day 7 error-method-calls     (B) and (C) are both compile errors.
//    day 15 chained-string        keys "VA PR5". Java prints "VA PRA6", which
//                                 is not any of the four options.
//    day 19 arraylist-shifting    keys "infinite loop". The posted code works
//                                 for every n; the stem's premise is false.
//    day 25 selection-sort x2     the stem was sliced apart by some earlier
//                                 pipeline: option (A) is a markdown code
//                                 fence holding the array the question is
//                                 about, and the grader compares the radio
//                                 VALUE ("A".."D") against the string
//                                 "[1, 5, 8, 2, 9]", so every answer is marked
//                                 wrong and the student is told the correct
//                                 answer is a fifth thing that is not on the
//                                 page and is not right either.
//
//  Two are cosmetic: day 20 keys correctly and only leaked a digression, and
//  day 28 carries a stray &blank; in an index listing.
//
//  ── EVERY KEY HERE WAS RE-DERIVED BY RUNNING JAVA ──────────────────────────
//  Not by reading the explanation, which is the thing that was wrong. See
//  smoke/csa-qotd-authoring-repair.js, which compiles and runs each item and
//  requires the repaired key to equal what the JVM did. An answer key fixed
//  from an argument about an answer key is the defect, repeated.
//
//  ── HOW AN EDIT IS BOUNDED ─────────────────────────────────────────────────
//  Each edit is a regex that must match EXACTLY ONCE in the live body. Zero
//  matches means the live page changed under us and the run refuses; two means
//  the anchor is not specific enough and the run refuses. After the edits,
//  reverse() puts every captured original back and the result must equal the
//  live body byte for byte, so an edit cannot quietly touch anything it did not
//  declare.
//
//  ── WHAT A HUMAN STILL HAS TO LOOK AT ──────────────────────────────────────
//  Four repairs AUTHOR something rather than correct it: a new distractor on
//  day 4 and day 7, a changed loop update on day 19, and a rebuilt option (A)
//  on the two day 25 twins. Those are marked `authored: true` and listed in the
//  runbook so they get read before they are imported. Fixing a wrong key is a
//  fact. Choosing a replacement distractor is a judgement, and this repo puts
//  judgements in front of a person.
//
//  Pure ASCII, no em-dashes, per repo convention, and the generator refuses its
//  own output if that slips.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const tells = require('../lib/authoring-tells.js');

const BLOG = 'ap-csa-daily-practice';

// ── the repairs ──────────────────────────────────────────────────────────────
const REPAIRS = [

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u1-c1-day-22-math-random-range',
    why: 'Keys (A) I only. Java: I gives 5..12 and III gives 5..12, so (C).',
    key: { from: 'A', to: 'C', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'key', find: /var correct = 'A';/, to: "var correct = 'C';" },

      { id: 'heading', find: /<h3>Answer: \(A\) I only<\/h3>/,
        to: '<h3>Answer: (C) I and III only</h3>' },

      { id: 'iii-para',
        find: /<p style="line-height: 1\.7;"><strong>III: INCORRECT\.<\/strong>[\s\S]*?The answer should evaluate III more carefully\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>III: CORRECT.</strong> The <code>+ 5</code> sits inside the cast here, so the shift happens before the truncation rather than after. <code>Math.random() * 8 + 5</code> gives [5.0, 13.0), and truncating that gives 5 through 12. Adding a whole number before truncating lands on the same integer as adding it after, so III produces the same 5 through 12 that I does.</p>' },

      { id: 'why-not',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(B\)<\/strong> The multiplier must be 8[\s\S]*?<strong>\(D\)<\/strong> Expression II is incorrect because it uses 7 as the multiplier, missing the value 12\.<\/p>/,
        to: [
          '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(A)</strong> Everything about I is right, and this is the answer to pick if you never checked III. Most people rule III out on the shape of the parentheses rather than on the arithmetic.</p>',
          '  <p style="line-height: 1.7; margin-bottom: 8px;"><strong>(B)</strong> The multiplier must be 8, the count of values from 5 to 12, not 7. Using 7 produces only 5-11.</p>',
          '  <p style="line-height: 1.7; margin-bottom: 8px;"><strong>(D)</strong> This includes II, which stops at 11 and never produces 12.</p>',
        ].join('\n') },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u2-c2-day-4-iii-loop-equivalence',
    why: 'Options (A) and (B) both print 0 3 6 9, so the item had two right answers.',
    key: { from: 'A', to: 'A', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'option-b', authored: true,
        find: /for \(int i = 0; i &lt;= 10; i \+= 3\) \{ System\.out\.print\(i \+ " "\); \}/,
        to: 'for (int i = 0; i &lt;= 12; i += 3) { System.out.print(i + " "); }' },

      { id: 'why-not-b',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(B\)<\/strong> <code>i &lt;= 10<\/code> would include i=9[\s\S]*?but A is the direct translation\.<\/p>/,
        to: '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(B)</strong> <code>i &lt;= 12</code> lets i reach 12, so this prints <code>0 3 6 9 12</code>. The while loop stops as soon as i reaches 10, so 12 is never printed.</p>' },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u1-c2-day-7-error-method-calls',
    why: 'Options (B) and (C) are both compile errors. javac confirms both.',
    key: { from: 'C', to: 'C', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'option-b', authored: true,
        find: /c\.display\(c\.add\(3, 4\)\);<\/span>/,
        to: 'c.display("Sum: " + c.add(3, 4));</span>' },

      { id: 'b-analysis',
        find: /<p style="line-height: 1\.7;"><strong>\(B\):<\/strong> Error\? <code>add\(3,4\)<\/code> returns <code>int<\/code> \(7\), but <code>display<\/code> expects <code>String<\/code>\. An <code>int<\/code> is not a <code>String<\/code>\. This also causes an error\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>(B):</strong> Valid. <code>"Sum: " + c.add(3, 4)</code> is string concatenation, so the <code>int</code> becomes part of a <code>String</code> before <code>display</code> ever sees it.</p>' },

      { id: 'trailing-deliberation',
        find: /\n  <p style="line-height: 1\.7;">Wait - both \(B\) and \(C\) have errors\.[\s\S]*?the clearest narrowing conversion error\.<\/p>/,
        to: '' },

      { id: 'why-not-b',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(B\)<\/strong> This also causes a compile error since <code>int<\/code> cannot be passed as a <code>String<\/code> parameter\. However, the narrowing error in \(C\) is the more commonly tested pattern on the AP exam\.<\/p>/,
        to: '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(B)</strong> Concatenating with <code>"Sum: "</code> turns the whole expression into a <code>String</code>, which is what <code>display</code> takes. Pass <code>c.add(3, 4)</code> on its own and it would be an error.</p>' },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u1-c1-day-15-chained-string-methods',
    why: 'Keys "VA PR5". Java prints "VA PRA6", which was not on the page at all.',
    key: { from: 'B', to: 'B', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'option-b',
        find: /<span style="font-family: Courier New, Courier, monospace; font-size: 14px;">VA PR5<\/span>/,
        to: '<span style="font-family: Courier New, Courier, monospace; font-size: 14px;">VA PRA6</span>' },

      { id: 'heading', find: /<h3>Answer: \(B\) VA PR5<\/h3>/, to: '<h3>Answer: (B) VA PRA6</h3>' },

      { id: 'substring-trace',
        find: /<p style="line-height: 1\.7;"><strong>substring\(2, 8\):<\/strong> Characters at indices 2-7[\s\S]*?That is 5 characters: <code>"VA PR"<\/code>\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>substring(2, 8):</strong> Number the string first: J(0) A(1) V(2) A(3) space(4) P(5) R(6) A(7) C(8) T(9) I(10) C(11) E(12). The end index is exclusive, so you take indices 2 through 7: V, A, space, P, R, A. That is <code>"VA PRA"</code>.</p>' },

      { id: 'length',
        find: /<p style="line-height: 1\.7;"><strong>part\.length\(\):<\/strong> <code>"VA PR"<\/code> has 5 characters\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>part.length():</strong> <code>"VA PRA"</code> has 6 characters. The shortcut worth learning: the length of <code>substring(a, b)</code> is <code>b - a</code>, here <code>8 - 2 = 6</code>.</p>' },

      { id: 'concat',
        find: /<p style="line-height: 1\.7;"><strong>Concatenation:<\/strong> <code>"VA PR" \+ 5 = "VA PR5"<\/code>\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>Concatenation:</strong> <code>"VA PRA" + 6 = "VA PRA6"</code>. The <code>int</code> is converted to text because the left side is a <code>String</code>.</p>' },

      { id: 'why-not-a',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(A\)<\/strong> This assumes <code>substring\(2, 8\)<\/code> includes index 8 and gets 7 characters\. The end index is exclusive, so only indices 2-7 are included \(5 characters\)\.<\/p>/,
        to: '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(A)</strong> The substring is right and the count is not. <code>8 - 2 = 6</code>, not 7. Counting <code>8 - 1</code> is the usual slip.</p>' },

      { id: 'why-not-c',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(C\)<\/strong> This starts at index 1 \(<code>indexOf\("A"\)<\/code>\) instead of index 2 \(<code>indexOf\("A"\) \+ 1<\/code>\)\. The <code>\+ 1<\/code> shifts the start forward\.<\/p>/,
        to: '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(C)</strong> Two errors at once: it starts at index 1, dropping the <code>+ 1</code>, and it treats the end index as inclusive. Indices 1 through 8 give <code>"AVA PRAC"</code>, which is 8 characters.</p>' },

      { id: 'why-not-d',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(D\)<\/strong> Same start error as \(C\), beginning at index 1 instead of 2\.<\/p>/,
        to: '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(D)</strong> Same start error, beginning at index 1 instead of 2. Indices 1 through 7 give <code>"AVA PRA"</code>, which is 7 characters.</p>' },

      //  The same index listing appears twice, once in the trace paragraph
      //  above and once here, so this anchor carries the tip's own lead-in.
      { id: 'tip-blank',
        find: /Write out the string with index numbers: J\(0\) A\(1\) V\(2\) A\(3\) &amp;blank;\(4\) P\(5\)/,
        to: 'Write out the string with index numbers: J(0) A(1) V(2) A(3) space(4) P(5)' },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u1-c2-day-20-iii-expression-evaluation',
    why: 'Key (D) is right. Only the digression in statement I had to go.',
    key: { from: 'D', to: 'D', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'statement-i',
        find: /<p style="line-height: 1\.7;"><strong>I:<\/strong> <code>14 \/ 4 \+ 14 % 4 = 3 \+ 2 = 5<\/code>\.[\s\S]*?Statement says this is false\. CORRECT\.<\/p>/,
        to: '<p style="line-height: 1.7;"><strong>I:</strong> <code>14 / 4 + 14 % 4 = 3 + 2 = 5</code>, and <code>5 == 14</code> is <code>false</code>. Statement I says it is false, so statement I is correct. Watch the shape of it: the identity that rebuilds <code>x</code> is <code>(x / y) * y + x % y</code>, with the multiply. Drop the multiply and you are left with <code>3 + 2</code>.</p>' },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'ap-csa-u1-c2-day-28-comprehensive-final-review',
    why: 'A stray &blank; renders as literal text in the index listing.',
    key: null,
    edits: [
      { id: 'blank-entity', find: /n\(3\) &amp;blank;\(4\) S\(5\)/, to: 'n(3) space(4) S(5)' },
    ] },

  // ───────────────────────────────────────────────────────────────────────────
  { handle: 'unit-4-day-19-arraylist-shifting',
    why: 'Keys "infinite loop". The posted i += 2 loop works for every n, so the '
       + 'stem premise was false. The update is the error the item is about.',
    key: { from: 'B', to: 'B', pattern: /var defined_answer = '([A-E])';/ },
    edits: [
      { id: 'loop-update', authored: true,
        find: /<span class="apcs-keyword">for<\/span> \(<span class="apcs-type">int<\/span> i = 0; i &lt; list\.size\(\); i \+= 2\)/,
        to: '<span class="apcs-keyword">for</span> (<span class="apcs-type">int</span> i = 0; i &lt; list.size(); i++)' },

      { id: 'trace',
        find: /<span class="apcs-comment">\/\/ Initial: \[A, B, C\], size = 3<\/span>[\s\S]*?<span class="apcs-comment">\/\/ The key bug: list keeps growing, loop runs longer than expected<\/span>/,
        to: [
          '<span class="apcs-comment">// Initial: [A, B, C], size = 3</span>',
          '',
          '<span class="apcs-comment">// i=0: 0 &lt; 3? YES. add("X" at 0) -&gt; [X, A, B, C], size = 4</span>',
          '<span class="apcs-comment">// i=1: 1 &lt; 4? YES. add("X" at 1) -&gt; [X, X, A, B, C], size = 5</span>',
          '<span class="apcs-comment">// i=2: 2 &lt; 5? YES. add("X" at 2) -&gt; [X, X, X, A, B, C], size = 6</span>',
          '<span class="apcs-comment">// i=3: 3 &lt; 6? YES. ...</span>',
          '',
          '<span class="apcs-comment">// Each pass adds one element and advances i by one, so size</span>',
          '<span class="apcs-comment">// stays exactly 3 ahead of i forever and the condition is never</span>',
          '<span class="apcs-comment">// false. The loop runs until the program runs out of memory.</span>',
          '',
          '<span class="apcs-comment">// The update the author wanted is i += 2. Then i gains on size</span>',
          '<span class="apcs-comment">// by 1 each pass, the gap closes, and the loop stops after one</span>',
          '<span class="apcs-comment">// insertion per original element: [X, A, X, B, X, C].</span>',
        ].join('\n') },

      { id: 'key-concept',
        find: /<p><strong>This specific case:<\/strong> Since i increases by 2 but size only increases by 1, the loop eventually terminates but with wrong results\. If i \+= 1, it would be truly infinite\.<\/p>/,
        to: '<p><strong>This specific case:</strong> i and size both grow by 1 on every pass, so the gap between them never closes and the loop never ends. With <code>i += 2</code> the gap closes by 1 each pass, which is what makes the intended version stop.</p>' },

      { id: 'mistake-a',
        find: /<div class="apcs-mistake-title">Mistake: Answer A - Not recognizing the shifting<\/div>\n<p>Each insertion shifts elements AND increases size\. The loop condition i &lt; list\.size\(\) uses the NEW size each iteration, causing more iterations than intended\.<\/p>/,
        to: '<div class="apcs-mistake-title">Mistake: Answer A - reading the intent instead of the code</div>\n<p>That is what the method was meant to produce, and it is what <code>i += 2</code> would produce. The code in front of you says <code>i++</code>, and size grows exactly as fast as i does.</p>' },

      { id: 'mistake-cd',
        find: /<div class="apcs-mistake-title">Mistake: Answer C or D - Miscounting insertions<\/div>\n<p>Trace through carefully: after inserting at 0, element "A" moves to index 1\. After inserting at 2, the original "B" \(now at index 3\) shifts further\. The final positions are wrong\.<\/p>/,
        to: '<div class="apcs-mistake-title">Mistake: Answer C or D - assuming the loop stops</div>\n<p>Both answers describe a finished list. There is no finished list here, because <code>i &lt; list.size()</code> is true on every pass no matter how far i gets.</p>' },
    ] },
];

// ── the two day 25 twins, same defect, same repair ───────────────────────────
//  Built rather than typed twice: the only difference between the twins is the
//  tail of the sliced question text, and typing the repair out twice is how the
//  two copies drift.
['unit-4-cycle-2-day-25-selection-sort-iteration', 'unit4-cycle2-day-25-selection-sort-iteration']
  .forEach((handle, i) => {
    const tail = i === 0 ? 'what is the val?' : 'what is the result?';
    REPAIRS.push({
      handle,
      why: 'The stem was sliced apart: option (A) holds the array as a markdown '
         + 'fence and the grader compares a radio value to an array string, so '
         + 'every answer is marked wrong against a fifth answer that is not on '
         + 'the page and is not right.',
      key: { from: '[1, 5, 8, 2, 9]', to: 'B', pattern: /var correctAnswer = '([^']*)';/ },
      edits: [
        { id: 'stem-text',
          find: /After ONE pass of selection sort on this array\n<\/div>/,
          to: 'After ONE pass of selection sort, what is the array?\n</div>' },

        { id: 'code-block',
          find: new RegExp('<pre><code>' + tail.replace(/\?/g, '\\?') + '</code></pre>'),
          to: '<pre><code>int[] arr = {5, 2, 8, 1, 9};</code></pre>' },

        { id: 'option-a', authored: true,
          find: /<span class="apcs-option-content">```java\nint\[\] arr = \{5, 2, 8, 1, 9\};\n\/\/ After first pass of selection sort\n```<\/span>/,
          to: '<span class="apcs-option-content">[1, 2, 5, 8, 9]</span>' },

        { id: 'grader',
          find: /var correctAnswer = '\[1, 5, 8, 2, 9\]';/,
          to: "var correctAnswer = 'B';" },

        { id: 'grader-message',
          find: /header\.textContent = 'Not quite\. The correct answer is ' \+ correctAnswer \+ '\. Review the explanation\.';/,
          to: "header.textContent = 'Not quite. The correct answer is (' + correctAnswer + '). Review the explanation.';" },

        //  The same slicing rotated three boxes out of place: the explanation
        //  is sitting under Common Mistake, the mistake is sitting under AP
        //  Exam Strategy, and Why This Answer holds a bare letter A. Put each
        //  back where its heading says it belongs.
        { id: 'why-this-answer',
          find: /<div class="apcs-section-title">Why This Answer\?<\/div>\n<div class="apcs-section-content">\n<p>A<\/p>\n<\/div>/,
          to: '<div class="apcs-section-title">Why This Answer?</div>\n<div class="apcs-section-content">\n<p>Selection sort scans the whole unsorted part of the array for the smallest value and swaps it to the front. On the first pass the smallest value is 1, sitting at index 3, so 1 and 5 trade places. Nothing else moves, which leaves [1, 2, 8, 5, 9].</p>\n</div>' },

        { id: 'common-mistake',
          find: /<div class="apcs-mistake-title">Watch Out!<\/div>\n<p>First pass finds minimum \(1\) and swaps it with first element \(5\)\. Result after one pass: \[1, 2, 8, 5, 9\]\. Rest of array unchanged\.<\/p>/,
          to: '<div class="apcs-mistake-title">Watch Out!</div>\n<p>Assuming one pass sorts more than one element into place. [1, 2, 5, 8, 9] is where selection sort finishes, not where it is after a single pass.</p>' },

        { id: 'exam-strategy',
          find: /<div class="apcs-tip-title">AP Exam Strategy<\/div>\n<p>Thinking one pass sorts multiple elements into position\.<\/p>/,
          to: '<div class="apcs-tip-title">AP Exam Strategy</div>\n<p>Selection sort settles exactly one position per pass. After k passes the first k entries are final and the rest of the array is untouched, so you can answer these without tracing the inner loop.</p>' },
      ],
    });
  });

// ── applying an edit, and proving it touched nothing else ────────────────────
//  Every anchor is matched against the LIVE body, never against a
//  partly-edited one, and the spans are spliced in one pass. Two reasons, both
//  learned the hard way in this file: an anchor validated against a body an
//  earlier edit already changed is not validated against anything real, and a
//  reverse pass that searches for its own replacement text finds the WRONG copy
//  when one replacement happens to contain another. Day 15 has exactly that
//  pair: the rewritten trace paragraph contains the same index listing the
//  tip-box edit produces.
function applyEdits(handle, live, edits) {
  const spans = edits.map((e) => {
    const re = new RegExp(e.find.source, e.find.flags.indexOf('g') === -1 ? e.find.flags + 'g' : e.find.flags);
    const hits = [];
    let m;
    while ((m = re.exec(live))) {
      hits.push({ start: m.index, end: m.index + m[0].length, was: m[0] });
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
    if (hits.length === 0) throw new Error(handle + ' edit ' + e.id + ': anchor matched 0 times, so the live body is not what this repair was written against');
    if (hits.length > 1) throw new Error(handle + ' edit ' + e.id + ': anchor matched ' + hits.length + ' times, so it is not specific enough to be safe');
    return { id: e.id, start: hits[0].start, end: hits[0].end, was: hits[0].was, now: e.to };
  }).sort((a, b) => a.start - b.start);

  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) {
      throw new Error(handle + ': edits ' + spans[i - 1].id + ' and ' + spans[i].id + ' overlap in the live body');
    }
  }

  let out = ''; let at = 0;
  spans.forEach((sp) => { out += live.slice(at, sp.start) + sp.now; at = sp.end; });
  out += live.slice(at);
  return { out, captured: spans };
}

//  Rebuild the live body from the repaired one using the recorded spans. Any
//  byte the run touched outside a declared span shows up here as a mismatch.
function reverse(repaired, captured) {
  let back = ''; let at = 0;
  let shift = 0;
  for (const sp of captured) {
    const startInOut = sp.start + shift;
    back += repaired.slice(at, startInOut) + sp.was;
    at = startInOut + sp.now.length;
    shift += sp.now.length - sp.was.length;
  }
  back += repaired.slice(at);
  return back;
}

// ── authored text has to obey the repo's own rules ───────────────────────────
//  The dash class is written as escapes rather than as characters, the same way
//  lib/mojibake.js writes its examples as codepoints: a guard that hunts a
//  character must not be the reason that character is in this repository.
function checkAuthored(handle, edits) {
  edits.forEach((e) => {
    if (/[\u2014\u2013]/.test(e.to)) throw new Error(handle + ' edit ' + e.id + ': authored text contains an em-dash or en-dash');
    const nonAscii = e.to.match(/[^\x09\x0a\x0d\x20-\x7e]/g);
    if (nonAscii) throw new Error(handle + ' edit ' + e.id + ': authored text is not ASCII (' + [...new Set(nonAscii)].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ') + ')');
  });
}

// ── CSV, the way Matrixify wants it ──────────────────────────────────────────
const BOM = '﻿';
const COLS = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function sheet(rows) {
  const lines = [COLS.map(q).join(',')];
  rows.forEach((r) => lines.push([BLOG, r.handle, 'MERGE', r.body].map(q).join(',')));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  A reader that did not write the file. Deliberately from scratch rather than
//  the writer's own escaping run backwards.
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = []; let row = []; let cell = ''; let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; i++; }
    else if (c === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ── one article, and every guard it has to clear ─────────────────────────────
//  Exported so the smoke suite can call it with a deliberately broken repair and
//  require a refusal. A guard that is only reachable through main() is a guard
//  that can only be mutation tested by writing files.
function repairOne(live, r) {
  checkAuthored(r.handle, r.edits);
  const { out, captured } = applyEdits(r.handle, live, r.edits);

  //  1. nothing outside the declared edits moved
  if (reverse(out, captured) !== live) {
    throw new Error(r.handle + ': reversing the declared edits did not reproduce the live body, so something else changed');
  }

  //  2. the key is what it is supposed to be, read out of the repaired body
  if (r.key) {
    const was = (live.match(r.key.pattern) || [])[1];
    const now = (out.match(r.key.pattern) || [])[1];
    if (was !== r.key.from) throw new Error(r.handle + ': live key reads ' + JSON.stringify(was) + ', expected ' + JSON.stringify(r.key.from));
    if (now !== r.key.to) throw new Error(r.handle + ': repaired key reads ' + JSON.stringify(now) + ', expected ' + JSON.stringify(r.key.to));
  }

  //  3. no strict tell survives
  const left = tells.find(out, { strictOnly: true });
  if (left.length) throw new Error(r.handle + ': ' + left.length + ' authoring tell(s) survive the repair: ' + left.map((x) => x.id + ' "' + x.match + '"').join(', '));

  //  4. and the live body really did have one, or this repair is aimed at nothing
  const had = tells.find(live, { strictOnly: true });
  if (!had.length) throw new Error(r.handle + ': the live body has no strict tell, so this repair has no target');

  return { out, captured, had };
}

// ── main ─────────────────────────────────────────────────────────────────────
function main(argv) {
  const [bodiesDir, outDir] = argv;
  if (!bodiesDir || !outDir) {
    console.error('usage: node scripts/csa-qotd-authoring-repair.js <bodies-dir> <out-dir>');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];

  REPAIRS.forEach((r) => {
    const src = path.join(bodiesDir, r.handle + '.html');
    if (!fs.existsSync(src)) throw new Error(r.handle + ': no live body at ' + src);
    const live = fs.readFileSync(src, 'utf8');

    const { out, captured, had } = repairOne(live, r);

    const name = 'csa-qotd-repair-' + r.handle + '-blog-posts.csv';
    const csv = sheet([{ handle: r.handle, body: out }]);
    fs.writeFileSync(path.join(outDir, name), csv, 'utf8');

    //  5. parse the file back and require the cell to be the body, exactly
    const rows = parseCsv(fs.readFileSync(path.join(outDir, name), 'utf8'));
    if (rows.length !== 2) throw new Error(name + ': parsed back as ' + rows.length + ' rows, expected 2');
    if (rows[0].join(',') !== COLS.join(',')) throw new Error(name + ': header changed in the round trip');
    if (rows[1][1] !== r.handle) throw new Error(name + ': handle changed in the round trip');
    if (rows[1][3] !== out) throw new Error(name + ': Body HTML did not survive the round trip byte for byte');

    manifest.push({
      handle: r.handle, sheet: name, why: r.why,
      key_from: r.key ? r.key.from : null, key_to: r.key ? r.key.to : null,
      edits: r.edits.map((e) => ({ id: e.id, authored: !!e.authored, bytes_was: (captured.find((c) => c.id === e.id) || {}).was.length, bytes_now: e.to.length })),
      authored: r.edits.some((e) => e.authored),
      tells_before: [...new Set(had.map((x) => x.id))],
      bytes_before: live.length, bytes_after: out.length,
    });
    console.log('  ' + r.handle.padEnd(48) + ' ' + String(live.length).padStart(6) + ' -> ' + String(out.length).padStart(6)
      + '  edits ' + r.edits.length + (r.key && r.key.from !== r.key.to ? '  KEY ' + r.key.from + ' -> ' + r.key.to : '')
      + (r.edits.some((e) => e.authored) ? '  AUTHORED' : ''));
  });

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ blog: BLOG, built_at: new Date().toISOString(), articles: manifest }, null, 2));
  console.log('\n' + manifest.length + ' sheets in ' + outDir);
  return manifest;
}

module.exports = { REPAIRS, applyEdits, reverse, checkAuthored, repairOne, sheet, parseCsv, main, BLOG, COLS };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error('\n  REFUSED: ' + e.message + '\n'); process.exit(1); }
}
