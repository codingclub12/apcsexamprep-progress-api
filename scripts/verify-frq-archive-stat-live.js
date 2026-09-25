'use strict';
// Live check for imports/2026-09-25-frq-archive-stat/frq-archive-stat-pages.csv
// (board #416).
//
// Reads the page BODY through /pages/<handle>.json rather than the rendered
// page, so a theme widget cannot make the answer wrong in either direction.
// That is the mistake the 2026-09-24 about-page check made: it scanned the
// whole rendered page and reported the sitewide popup's copy as the body's.
//
//   --before  run it before importing. It must find the stat still there; if
//             the stat is already gone, the sheet is stale and must not be
//             imported, because a MERGE would overwrite whatever changed.
//   (none)    run it after importing. The stat must be gone, the rest of the
//             banner must survive, and the rendered page must still serve.
//
// Every "after" assertion was false before the import. No User-Agent is sent;
// lib/storefront-fetch handles that. No em-dashes.
const sf = require('../lib/storefront-fetch');
const { HANDLE, ROW_OPEN } = require('./build-2026-09-25-frq-archive-stat-sheet');

const before = process.argv.includes('--before');
let failed = 0;
const say = (good, msg) => { console.log((good ? 'PASS  ' : 'FAIL  ') + msg); if (!good) failed++; };

const r = sf.raw('/pages/' + HANDLE + '.json?cb=' + Date.now());
say(String(r.code) === '200', '/pages/' + HANDLE + '.json answers ' + r.code);
let body = '';
try { body = JSON.parse(r.body).page.body_html || ''; } catch (e) { say(false, 'page JSON parses'); }

if (before) {
  say(body.includes('54.5%'), 'the stat is still in the body, so the sheet is not stale');
} else {
  say(body.length > 0 && !body.includes('54.5%'), 'the body no longer carries 54.5%');
  say(!/score 5s/i.test(body), 'the body no longer carries a "Score 5s" label');
  say(body.includes(ROW_OPEN), 'the stats row survives');
  say((body.match(/class="frq-cta-stat"/g) || []).length === 2, 'the stats row keeps two stats');
  say(body.includes('1,845+') && body.includes('451+ reviews'), 'the hours and reviews stats survive');
  say(body.includes('/pages/ap-computer-science-a-tutor'), 'the banner button survives');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2500);
  let page = null;
  try { page = sf.page('/pages/' + HANDLE + '?cb=' + Date.now()); } catch (e) { say(false, 'rendered page: ' + e.message); }
  if (page) say(page.body.includes('frq-cta-banner'), 'the rendered page still shows the tutoring banner');
}
console.log('\n' + (failed ? failed + ' check(s) failed' : 'all checks passed'));
process.exit(failed ? 1 : 0);
