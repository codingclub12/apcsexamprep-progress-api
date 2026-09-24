'use strict';
// Offline smoke for scripts/build-2026-09-24-new-pages-sheet.js (board #409).
//
// 1. The three committed bodies pass every rule, so a later edit that breaks
//    one (an em-dash, an unscoped selector, a CED code) goes red here before
//    anyone builds a sheet from it.
// 2. Every rule is proved not hollow: each is broken on purpose, on its own,
//    and the run must report THAT rule. A mutation that turns up a different
//    rule, or nothing, fails the suite.
const fs = require('fs');
const path = require('path');
const b = require('../scripts/build-2026-09-24-new-pages-sheet.js');

const ROOT = path.join(__dirname, '..');
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) failed++; };

for (const page of b.PAGES) {
  const html = fs.readFileSync(path.join(ROOT, 'shopify', page.handle + '.html'), 'utf8');
  const p = b.checkBody(page, html);
  ok(p.length === 0, page.handle + ' passes every rule' + (p.length ? ': ' + p.join('; ') : ''));
  ok(b.cssRules(html).length > 10, page.handle + ' has a style block the scoping rule can see');
}

const page = b.PAGES.find((p) => p.handle === 'ap-csp-exam-format');
const html = fs.readFileSync(path.join(ROOT, 'shopify', page.handle + '.html'), 'utf8');
const lede = '#apcs-cspfmt .lede{font-size:19px !important;color:#334155 !important;-webkit-text-fill-color:#334155 !important;';
const MUTATIONS = [
  ['non-ASCII', (h) => h.replace('The AP CSP score', 'The AP CSP scöre'), /non-ASCII/],
  ['em-dash', (h) => h.replace('two places:', 'two places &mdash;'), /em-dash/],
  ['script', (h) => h + '<script>x()</script>', /<script>/],
  ['unscoped CSS', (h) => h.replace('<style>', '<style>\n.page-title{display:none !important}'), /not scoped/],
  ['color without text-fill', (h) => h.replace(lede, '#apcs-cspfmt .lede{font-size:19px !important;color:#334155 !important;'), /webkit-text-fill-color/],
  ['CED objective code', (h) => h.replace('Program design, function and purpose', 'Program design (CRD-2.A)'), /CED code/],
  ['EK code', (h) => h.replace('Algorithm development', 'Algorithm development 1.2.A.3'), /Essential Knowledge/],
  ['no internal links', (h) => h.replace(/href="\//g, 'href="https://x.test/'), /dead end/],
  ['missing wrapper', (h) => h.replace('id="apcs-cspfmt"', 'id="other"'), /wrapper/],
];
for (const [name, mutate, want] of MUTATIONS) {
  const m = mutate(html);
  if (m === html) { ok(false, 'mutation "' + name + '" did not apply; the fixture moved'); continue; }
  const p = b.checkBody(page, m);
  ok(p.some((x) => want.test(x)), 'rule catches: ' + name);
}
ok(b.checkBody(Object.assign({}, page, { seo_title: 'x'.repeat(61) }), html).some((x) => /SEO title/.test(x)), 'rule catches: SEO title over 60');
ok(b.checkBody(Object.assign({}, page, { seo_description: 'short' }), html).some((x) => /SEO description/.test(x)), 'rule catches: SEO description too short');

console.log('\n' + (failed ? failed + ' failed' : 'all passed'));
process.exit(failed ? 1 : 0);
