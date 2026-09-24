'use strict';
// After importing imports/2026-09-24-new-pages/new-pages.csv (board #409).
//
// Every assertion here was FALSE before the import, so a pass cannot be an
// accident of the old state:
//   ap-csp-exam-format and ap-networking-labs answered 404;
//   /pages/about answered 301 to the tutor page.
//
// Run it BEFORE importing too: if a page already passes, somebody built it in
// the meantime, and the sheet should be read against it before a MERGE.
//
// Each page must answer 200 as a real rendered page (lib/storefront-fetch
// refuses a bot challenge), carry its own wrapper and H1, show none of the old
// homepage claims it was written to replace, and, for about, not redirect.
// No User-Agent is sent; the module handles that. No em-dashes.
const sf = require('../lib/storefront-fetch');

const CHECKS = [
  { handle: 'ap-csp-exam-format', wrapper: 'apcs-cspfmt', h1: 'AP Computer Science Principles Exam Format (2027)',
    must: ['70 questions', 'Fri, Apr 30, 2027', 'Written Response 2(c)'] },
  { handle: 'ap-networking-labs', wrapper: 'apcs-netlabs', h1: 'AP Networking Labs',
    must: ['/pages/ap-networking-lab-1-device-triage-bench', '/pages/ap-networking-lab-4-capture-and-trace'] },
  { handle: 'about', wrapper: 'apcs-about', h1: 'About Tanner Crow',
    must: ['Blue Valley North'], mustNot: ['54.5%', '$125'] },
];

let failed = 0;
const say = (good, msg) => { console.log((good ? 'PASS  ' : 'FAIL  ') + msg); if (!good) failed++; };
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);

for (const c of CHECKS) {
  const st = sf.status('/pages/' + c.handle);
  say(st.code === '200', c.handle + ' answers ' + st.code + (st.location ? ' -> ' + st.location : ''));
  pause();
  if (st.code !== '200') continue;
  let body = '';
  try { body = sf.page('/pages/' + c.handle).body; } catch (e) { say(false, c.handle + ': ' + e.message); continue; }
  pause();
  say(body.includes('id="' + c.wrapper + '"'), c.handle + ' carries #' + c.wrapper);
  say(body.includes(c.h1), c.handle + ' shows its H1');
  for (const m of c.must || []) say(body.includes(m), c.handle + ' contains ' + JSON.stringify(m));
  for (const m of c.mustNot || []) say(!body.includes(m), c.handle + ' does not contain ' + JSON.stringify(m));
}
console.log('\n' + (failed ? failed + ' check(s) failed' : 'all checks passed'));
process.exit(failed ? 1 : 0);
