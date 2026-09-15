'use strict';
// -----------------------------------------------------------------------------
//  AFTER THE IMPORT: ask the storefront, not the sheet.
//
//      node scripts/verify-csa-qotd-authoring-live.js
//
//  Reads each of the nine repaired articles off the live site and asserts the
//  things the repair made true, one per article, plus the thing it made true
//  everywhere: no strict tell survives.
//
//  EVERY ASSERTION HERE WAS FALSE BEFORE THE IMPORT. That is the rule from
//  CLAUDE.md and it is worth restating, because the easy version of this file
//  would check that the page still says "Math.random()" and pass whether or not
//  anything shipped. The key assertions are the sharp ones: day 22 has to serve
//  var correct = 'C', which it did not this morning.
//
//  ── THE BYTE COMPARISON IS THE REAL CHECK, AND THE NEEDLES ARE THE SECOND ──
//  Needles assert MEANING and they are easy to get wrong in a way that looks
//  right. On 2026-09-15 this file shipped with
//
//      ['trace is the i++ trace', 'size stays exactly 3 ahead of i forever']
//
//  which could never match anything, because the repaired body breaks that
//  sentence across a </span> and a newline. It read as a sensible assertion, it
//  sat in the list, and on a correct import it reported day 19 as "not live
//  yet". A wrong verifier is worse than no verifier: it sends somebody to
//  re-import a page that is already right.
//
//  So the primary assertion is now byte for byte against the sheet that was
//  imported, which cannot be phrased wrongly. The needles stay because they say
//  WHY each body changed in a way a person can read, and
//  smoke/csa-qotd-authoring-repair.js now requires every one of them to be
//  findable in the repaired body it describes, so an unmatchable needle fails
//  offline instead of on the storefront.
//
//  ── ONE TOLERANCE, NAMED, AND NOTHING ELSE ─────────────────────────────────
//  Matrixify converts a literal U+00A0 to an ordinary space on import. That is
//  board 292 and it is not caused by anything here: the four non-breaking
//  spaces per article sat between the option letter and its text in the LIVE
//  body before any of this, and the sheets carried them through unchanged.
//  So exactly that substitution is tolerated and counted. Any other differing
//  byte fails, because a tolerance wide enough to be convenient is a tolerance
//  that hides the next real defect.
//
//  No User-Agent, through lib/storefront-fetch.js, and smoke:storefront scans
//  this file to keep it that way.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const { extractArticle } = require('./csa-article-body-extract.js');
const { parseCsv } = require('./csa-qotd-authoring-repair.js');
const tells = require('../lib/authoring-tells.js');

const BLOG = 'ap-csa-daily-practice';

//  { handle, must: [[label, needle]], mustNot: [[label, needle]] }
//  Needles are strings, matched against the stored body.
const EXPECT = [
  { handle: 'ap-csa-u1-c1-day-22-math-random-range',
    must: [
      ['key is C', "var correct = 'C';"],
      ['answer heading names C', '<h3>Answer: (C) I and III only</h3>'],
      ['III is marked correct', '<strong>III: CORRECT.</strong>'],
    ],
    mustNot: [['old key A', "var correct = 'A';"], ['old heading', 'Answer: (A) I only']] },

  { handle: 'ap-csa-u2-c2-day-4-iii-loop-equivalence',
    must: [['option B now stops at 12', 'for (int i = 0; i &lt;= 12; i += 3)']],
    mustNot: [['option B still duplicates A', 'for (int i = 0; i &lt;= 10; i += 3)']] },

  { handle: 'ap-csa-u1-c2-day-7-error-method-calls',
    must: [['option B compiles now', 'c.display("Sum: " + c.add(3, 4));']],
    mustNot: [['option B still a second error', 'c.display(c.add(3, 4));']] },

  { handle: 'ap-csa-u1-c1-day-15-chained-string-methods',
    must: [
      ['option B is the string Java prints', '>VA PRA6</span>'],
      ['heading names it', '<h3>Answer: (B) VA PRA6</h3>'],
    ],
    mustNot: [['old five-character answer', 'VA PR5']] },

  { handle: 'ap-csa-u1-c2-day-20-iii-expression-evaluation',
    must: [['statement I explained without the digression', 'the identity that rebuilds <code>x</code>']],
    mustNot: [['old digression', 'we proved earlier']] },

  { handle: 'ap-csa-u1-c2-day-28-comprehensive-final-review',
    must: [['index listing reads space(4)', 'n(3) space(4) S(5)']],
    mustNot: [['stray entity', '&amp;blank;']] },

  { handle: 'unit-4-day-19-arraylist-shifting',
    must: [
      ['stem now uses i++', 'i &lt; list.size(); i++)'],
      ['trace is the i++ trace', 'add("X" at 1) -&gt; [X, X, A, B, C], size = 5'],
    ],
    mustNot: [['old stem', 'i &lt; list.size(); i += 2)'], ['old trace', 'NOT infinite']] },
];

['unit-4-cycle-2-day-25-selection-sort-iteration', 'unit4-cycle2-day-25-selection-sort-iteration']
  .forEach((handle) => EXPECT.push({
    handle,
    must: [
      ['grader keys the option letter', "var correctAnswer = 'B';"],
      ['option A is an array', '<span class="apcs-option-content">[1, 2, 5, 8, 9]</span>'],
      ['the array is back in the stem', '<pre><code>int[] arr = {5, 2, 8, 1, 9};</code></pre>'],
      ['Why This Answer holds an explanation', 'the smallest value is 1, sitting at index 3'],
    ],
    mustNot: [
      ['grader compared a letter to an array', "var correctAnswer = '[1, 5, 8, 2, 9]';"],
      ['markdown fence', '```'],
    ],
  }));

// ── the byte comparison, and the one tolerance it allows ────────────────────
//  Returns null when the live body IS the sheet, a short note when the only
//  differences are the NBSP stripping of board 292, and a refusal otherwise.
const SHEETS = path.join(__dirname, '..', 'imports', '2026-09-15-csa-qotd-authoring');

function compareToSheet(handle, live) {
  const file = path.join(SHEETS, 'csa-qotd-repair-' + handle + '-blog-posts.csv');
  if (!fs.existsSync(file)) return { error: 'no sheet on disk at ' + file };
  const want = parseCsv(fs.readFileSync(file, 'utf8'))[1][3];
  if (live === want) return { note: 'byte-identical to the sheet' };

  const kinds = new Map();
  let nbsp = 0; let other = 0; let first = null;
  for (let i = 0; i < Math.max(want.length, live.length); i += 1) {
    if (want[i] === live[i]) continue;
    const w = want.codePointAt(i); const l = live.codePointAt(i);
    if (w === 0x00a0 && l === 0x20) { nbsp += 1; continue; }
    other += 1;
    if (first === null) first = i;
    const k = 'U+' + (w === undefined ? 'EOF' : w.toString(16).toUpperCase())
      + ' -> U+' + (l === undefined ? 'EOF' : l.toString(16).toUpperCase());
    kinds.set(k, (kinds.get(k) || 0) + 1);
  }
  if (other) {
    return { error: other + ' character(s) differ from the sheet beyond the known NBSP stripping ('
      + [...kinds].map(([k, n]) => k + ' x' + n).join(', ') + '), first at index ' + first
      + ': live has ' + JSON.stringify(live.slice(Math.max(0, first - 40), first + 40)) };
  }
  return { note: nbsp + ' non-breaking space(s) converted to plain spaces on import, board 292' };
}

module.exports = { EXPECT, compareToSheet };

//  Reading this file must not touch the network. smoke/csa-qotd-authoring-repair.js
//  requires it to check the checks: every `must` needle has to be findable in the
//  repaired body it describes, and every `mustNot` needle in the pre-import one.
//  That is the offline guard against the needle this file shipped with on
//  2026-09-15, which spanned a </span> and so could never match anything.
if (require.main === module) {
  let failed = 0;
  const bad = (m) => { console.log('  FAIL  ' + m); failed++; };

  EXPECT.forEach((e) => {
    const r = sf.rawOnce('/blogs/' + BLOG + '/' + e.handle, {});
    if (r.code !== '200') { bad(e.handle + ': answered ' + r.code); return; }
    if (!sf.looksReal(r.body)) { bad(e.handle + ': not a rendered page, so this read proves nothing'); return; }
    const x = extractArticle(r.body);
    if (x.error) { bad(e.handle + ': ' + x.error); return; }
    const body = x.body;

    let ok = 0;
    //  The assertion that cannot be phrased wrongly, first.
    const cmp = compareToSheet(e.handle, body);
    if (cmp.error) bad(e.handle + ': ' + cmp.error); else ok++;

    e.must.forEach(([label, needle]) => {
      if (body.indexOf(needle) === -1) bad(e.handle + ': ' + label + ' is not live yet'); else ok++;
    });
    e.mustNot.forEach(([label, needle]) => {
      if (body.indexOf(needle) !== -1) bad(e.handle + ': ' + label + ' is still live'); else ok++;
    });
    const left = tells.find(body, { strictOnly: true });
    if (left.length) bad(e.handle + ': ' + [...new Set(left.map((t) => t.id))].join(', ') + ' still live');
    else ok++;

    const total = e.must.length + e.mustNot.length + 2;
    console.log('  ' + (ok === total ? 'ok  ' : '    ') + e.handle.padEnd(48) + ok + '/' + total
      + (cmp.note ? '  ' + cmp.note : ''));
  });

  console.log(failed === 0
    ? '\nAll ' + EXPECT.length + ' repaired articles are live and none of them talks to itself.'
    : '\n' + failed + ' assertion(s) failed. Nothing here is a report; every line was read off the storefront.');
  process.exit(failed ? 1 : 0);
}
