'use strict';
// Offline smoke for scripts/build-2026-09-25-frq-archive-stat-sheet.js (board #416).
//
// 1. A fixture shaped like the live banner patches cleanly: the stat and its
//    divider go, the other two stats, the row and the button stay.
// 2. Every refusal is proved not hollow: each fixture below breaks one thing
//    and the build must refuse for THAT reason. A refusal for a different
//    reason, or none, fails the suite.
const b = require('../scripts/build-2026-09-25-frq-archive-stat-sheet.js');

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) failed++; };

const OTHER = [
  '      <div class="frq-cta-stat">\n',
  '        <span class="frq-cta-stat-val">1,845+</span>\n',
  '        <span class="frq-cta-stat-lbl">Hours</span>\n',
  '      </div>\n',
  '      <span class="frq-cta-divider"></span>\n',
  '      <div class="frq-cta-stat">\n',
  '        <span class="frq-cta-stat-val">5.0</span>\n',
  '        <span class="frq-cta-stat-lbl">451+ reviews</span>\n',
  '      </div>\n',
].join('');
const CSS = '<style>\n#frq-top-section .frq-cta-stats-row {\n  display: flex !important;\n}\n</style>\n';
const TAIL = '    </div>\n    <a class="frq-cta-btn" href="/pages/ap-computer-science-a-tutor">Get FRQ Help</a>\n';
const LIVE = CSS + '    ' + b.ROW_OPEN + b.STAT + OTHER + TAIL;

const good = b.build(LIVE);
ok(!!good.row && good.problems.length === 0, 'the live-shaped fixture patches' + (good.problems.length ? ': ' + good.problems.join('; ') : ''));
if (good.row) {
  ok(!good.row.after.includes('54.5%'), 'the patched body has no 54.5%');
  ok(good.row.after === CSS + '    ' + b.ROW_OPEN + OTHER + TAIL, 'the patched body is exactly the fixture minus the stat');
  ok(LIVE.length - good.row.after.length === b.STAT.length, 'exactly the stat\'s bytes were removed');
}

const MUTATIONS = [
  ['stat already gone', LIVE.replace(b.STAT, ''), /appears 0 time/],
  ['stat appears twice', LIVE + b.ROW_OPEN + b.STAT, /appears 2 time/],
  ['a second 54.5% elsewhere', LIVE + '<p>54.5% of students</p>\n', /54\.5% still appears/],
  ['a second Score 5s label elsewhere', LIVE + '<span>Score 5s</span>\n', /Score 5s/],
  ['a third stat in the row', LIVE.replace(TAIL, '      <div class="frq-cta-stat"><span>x</span></div>\n' + TAIL), /exactly two stats/],
];
for (const [name, src, want] of MUTATIONS) {
  if (src === LIVE) { ok(false, 'mutation "' + name + '" did not apply; the fixture moved'); continue; }
  const out = b.build(src);
  ok(!out.row && out.problems.some((p) => want.test(p)), 'refuses: ' + name + (out.row ? ' (it built a row)' : ''));
}

console.log('\n' + (failed ? failed + ' failed' : 'all passed'));
process.exit(failed ? 1 : 0);
