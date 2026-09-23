'use strict';
//  After importing imports/2026-09-23f/confirm-role-pages.csv: both role pages
//  must serve the committed body. Also used after the 2026-09-23g copy sheet:
//  the text check compares the live words with shopify/<handle>.html, so it
//  fails until the current copy is live.
//  Also re-checks the two pages that already worked, so a fix to one pair of
//  buttons is not read as a fix to all four.
//
//  Run: node scripts/verify-confirm-role-pages-live.js
const sf = require('../lib/storefront-fetch');
const b = require('./build-confirm-role-pages-sheet');

let bad = 0;
const say = (pass, msg) => { console.log((pass ? '  ok    ' : '  FAIL  ') + msg); if (!pass) bad++; };

for (const p of b.PAGES) {
  const r = sf.raw('/pages/' + p.handle + '.json');
  if (String(r.code) !== '200') { say(false, p.handle + ' answers ' + r.code); continue; }
  const live = JSON.parse(r.body).page;
  say(live.body_html.indexOf('id="apcs-' + p.handle + '"') !== -1, p.handle + ' serves the new body');
  say(b.visibleText(live.body_html) === b.visibleText(b.bodyOf(p.handle)), p.handle + ' text matches shopify/' + p.handle + '.html');
  const links = b.internalLinks(b.bodyOf(p.handle));
  say(links.every((l) => live.body_html.indexOf('href="' + l + '"') !== -1), p.handle + ' carries all ' + links.length + ' links');
  for (const l of links) { const c = String(sf.raw(l).code); say(c === '200', p.handle + ' -> ' + l + ' ' + c); }
}
for (const h of ['confirm-csa', 'confirm-csp']) {
  const c = String(sf.raw('/pages/' + h).code);
  say(c === '200', h + ' still ' + c);
}
console.log(bad ? '\n  ' + bad + ' failure(s)' : '\n  all clear');
process.exit(bad ? 1 : 0);
