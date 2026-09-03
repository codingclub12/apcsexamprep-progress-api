'use strict';
//      node scripts/survey-undefined-css-vars.js [--out detail.json]
//
//  Second pass. The first one scoped the search to style blocks carrying a
//  #cyber-* wrapper and therefore saw 18 of 108 pages: only Unit 1 names its
//  wrapper that way. A survey that silently skips 83% of its population and
//  reports one defect is worse than no survey, so this one makes no assumption
//  about the wrapper at all.
//
//  It compares every custom property USED anywhere on the page against every
//  one DEFINED anywhere on the page. A property in the difference is definitely
//  unresolvable: nothing on the page can supply it. The reverse is not proven
//  (a definition could sit in a scope that does not reach the use), so a page
//  that passes here gets the narrower scope check afterwards. This is a screen
//  that cannot produce a false positive, which is the property worth having.
const sf = require('../lib/storefront-fetch.js');
const fs = require('fs');

//  Where the per-page detail lands. Override with --out.
const argOut = process.argv.indexOf('--out');
const OUT = argOut === -1 ? null : process.argv[argOut + 1];

const LESSONS = { 1: 5, 2: 5, 3: 6, 4: 5, 5: 6 };
const KINDS = ['lab', 'exercise-1', 'exercise-2', 'quiz'];
const handles = [];
for (const u of Object.keys(LESSONS)) {
  for (let l = 1; l <= LESSONS[u]; l++) {
    for (const k of KINDS) handles.push(`ap-cyber-unit-${u}-lesson-${l}-${k}`);
  }
}

function analyse(body) {
  const used = new Set();
  let m;
  const useRe = /var\(\s*(--[A-Za-z0-9_-]+)/g;
  while ((m = useRe.exec(body))) used.add(m[1]);
  const defined = new Set();
  //  A definition has the property on its own left-hand side. The leading
  //  boundary keeps var(--x) from reading as a definition of --x.
  const defRe = /(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g;
  while ((m = defRe.exec(body))) defined.add(m[2]);
  return { used: used.size, defined: defined.size, undef: [...used].filter((u) => !defined.has(u)).sort() };
}

(async () => {
  const rows = [];
  for (const h of handles) {
    let r;
    try { r = sf.page('/pages/' + h, { timeout: 30 }); }
    catch (e) { rows.push({ handle: h, status: 'unfetchable', why: String(e.message).slice(0, 90) }); process.stdout.write('?'); continue; }
    const a = analyse(r.body);
    rows.push({ handle: h, status: a.undef.length ? 'BROKEN' : 'ok', ...a });
    process.stdout.write(a.undef.length ? 'X' : '.');
  }
  process.stdout.write('\n');
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(rows, null, 2)); console.log('\ndetail written to ' + OUT); }

  const broken = rows.filter((r) => r.status === 'BROKEN');
  console.log('\npages fetched : %d', rows.length);
  console.log('ok            : %d', rows.filter((r) => r.status === 'ok').length);
  console.log('BROKEN        : %d', broken.length);
  console.log('unfetchable   : %d', rows.filter((r) => r.status === 'unfetchable').length);
  console.log('\nBROKEN:');
  for (const b of broken) console.log('  %s\n      %s', b.handle, b.undef.join(' '));
  //  Non-zero when a page is broken, so this is usable as a check and not only
  //  as a report. Board #203 is about moving the comparison into the crawl.
  process.exit(broken.length ? 1 : 0);
})();
