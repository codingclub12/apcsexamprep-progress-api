'use strict';
/*
 *  BOARD 343: THE CODE BLOCK WAS THE DRIFTED HALF, AND THAT IS ASSERTED HERE.
 *
 *  19 unit-2-cycle-2-day-* articles posted a program their question was not
 *  about. The repair restores the twin's code block, one edit each.
 *
 *  THE ASSERTION THAT CARRIES THE ARGUMENT is the day 10 case, pinned below.
 *  Its Why This Answer says "the loop adds 1 + 2 + 3 + 4 = 10" and its Common
 *  Mistake warns about `<= 4`, while the code above it read `i <= 5`. If the
 *  options had been the drifted half, the explanation would have described the
 *  posted code. It describes the other one, in all 19, byte for byte.
 *
 *  BEFORE AND AFTER, on a real JVM: every one of the 19 must fail to agree
 *  before the repair and agree on its keyed letter after it. That is the whole
 *  claim and it is checked per article rather than sampled.
 *
 *  AND ONLY THE CODE MAY MOVE. The key, the options and the explanation are the
 *  question; a repair that touches them is refused. Four of the 19 carry the
 *  same options as their twin in a different ORDER, so an edit that "helpfully"
 *  reordered them would silently break four correct keys.
 *
 *  No JDK is a FAILURE here, not a skip. CI pins one.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const R = require('../scripts/csa-qotd-u2c2-repair.js');
const E = require('../lib/matrixify-body-edit.js');
const I = require('../lib/csa-qotd-items.js');
const D = require('../scripts/csa-qotd-key-rederive.js');

const FIX = path.join(__dirname, 'fixtures', 'csa-u2c2-2026-09-18');
let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };
const eq = (got, want, what) => { if (got !== want) bad(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };
const live = (h) => fs.readFileSync(path.join(FIX, h + '.html'), 'utf8');

const rows = R.load();
eq(rows.length, 19, 'board 343 covers nineteen articles');

// ── 1. the data file's own invariant ─────────────────────────────────────────
rows.forEach((r) => {
  if (!r.code_restore || !r.code_now) bad(r.handle + ': the data row is missing a code block');
  if (r.code_restore === r.code_now) bad(r.handle + ': the restore code is the same as what is posted, so the row is a no-op');
  if (I.collapseLines(r.keyed_option) !== I.collapseLines(r.expected_output)) {
    bad(r.handle + ': the data says the article keys ' + JSON.stringify(r.keyed_option)
      + ' but the twin prints ' + JSON.stringify(r.expected_output));
  }
  if (r.twin !== r.handle.replace(/^unit-2-cycle-2-day-/, 'unit2-cycle2-day-')) {
    bad(r.handle + ': twin handle ' + r.twin + ' is not the un-hyphenated form');
  }
});

// ── 2. THE PINNED CASE that decides which half drifted ───────────────────────
{
  const r = rows.find((x) => x.handle === 'unit-2-cycle-2-day-10-iteration-accumulation');
  if (!r) bad('day 10 is no longer in the data, and it is the case the argument rests on');
  else {
    const body = live(r.handle);
    if (!/1 \+ 2 \+ 3 \+ 4 = 10/.test(body)) bad('day 10 no longer explains its answer as 1 + 2 + 3 + 4 = 10');
    if (!/&lt;= 4/.test(body)) bad('day 10 no longer warns about <= 4 in its Common Mistake');
    if (!/i &lt;= 5/.test(r.code_now)) bad('day 10 posted code no longer reads i <= 5, so the drift is not what this suite describes');
    if (!/i &lt;= 4/.test(r.code_restore)) bad('day 10 restore code does not read i <= 4');
    //  the explanation describes the RESTORE code, not the posted one. That is
    //  the entire reason the code is the half being replaced.
  }
}

// ── 3. only the code may move ────────────────────────────────────────────────
const repaired = {};
rows.forEach((r) => {
  try {
    const { out, before, after } = R.repairOne(live(r.handle), r);
    repaired[r.handle] = out;
    eq(after.key.value, before.key.value, r.handle + ' key untouched');
    eq(after.options.map((o) => o.letter + '=' + o.text).join('|'),
      before.options.map((o) => o.letter + '=' + o.text).join('|'), r.handle + ' options untouched');
    const expl = (b) => { const s = b.indexOf('Why This Answer'); return s < 0 ? '' : b.slice(s, s + 600); };
    eq(expl(out), expl(live(r.handle)), r.handle + ' explanation untouched');
  } catch (e) { bad('clean run refused ' + r.handle + ': ' + e.message); }
});

// ── 4. before and after, on the JVM ──────────────────────────────────────────
if (spawnSync('javac', ['-version'], { encoding: 'utf8' }).error) {
  bad('no javac on PATH. This repair is settled by running the question and CI pins a JDK. It does not skip.');
} else {
  rows.forEach((r) => {
    const beforeRun = D.audit(I.parse(r.handle, live(r.handle)));
    if (beforeRun.state === 'agrees' || beforeRun.state === 'agrees-flattened') {
      bad(r.handle + ': was already agreeing before the repair, so it was not broken and should not be in this set');
    }
    if (!repaired[r.handle]) return;
    const afterRun = D.audit(I.parse(r.handle, repaired[r.handle]));
    if (afterRun.state !== 'agrees' && afterRun.state !== 'agrees-flattened') {
      bad(r.handle + ': still does not agree after the repair (' + afterRun.state + ')');
    } else if (afterRun.letter !== r.key) {
      bad(r.handle + ': agrees on ' + afterRun.letter + ' rather than the keyed ' + r.key);
    }
  });
}

// ── 5. the guards, broken on purpose ─────────────────────────────────────────
const H = 'unit-2-cycle-2-day-10-iteration-accumulation';
function refuses(label, mutate) {
  const r = JSON.parse(JSON.stringify(rows.find((x) => x.handle === H)));
  mutate(r);
  try { R.repairOne(live(H), r); } catch (e) { return; }
  bad('guard did not refuse: ' + label);
}
refuses('a restore code that prints something the article does not key', (r) => {
  r.code_restore = r.code_restore.replace('i &lt;= 4', 'i &lt;= 7');
});
refuses('an anchor that does not match the posted code', (r) => { r.code_now = 'int nope = 0;'; });
refuses('a declared key that is not the article key', (r) => { r.key = 'A'; });
refuses('a restore that is the posted code, so nothing changes', (r) => { r.code_restore = r.code_now; });
refuses('an expected output that disagrees with what the code prints', (r) => { r.expected_output = '999'; });

// ── 6. the sheets ────────────────────────────────────────────────────────────
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u2c2-'));
  const log = console.log; console.log = () => {};
  let manifest = null;
  try { manifest = R.main([FIX, dir]); } finally { console.log = log; }
  eq(manifest.length, 19, 'nineteen single-article sheets');
  const combined = path.join(dir, 'csa-qotd-343-ALL-NINETEEN-blog-posts.csv');
  const singles = new Map(manifest.map((m) => [m.handle, E.parseCsv(fs.readFileSync(path.join(dir, m.sheet), 'utf8'))[1][3]]));
  const text = fs.readFileSync(combined, 'utf8');
  eq(E.parseCsv(text).length - 1, 19, 'the combined sheet carries nineteen rows');
  const mut = (label, t) => { try { E.checkCombined(t, singles, R.COLS, { label: 'm' }); } catch (e) { return; } bad('combined guard did not refuse: ' + label); };
  mut('a dropped row', (() => { const l = text.split('\r\n'); l.splice(1, 1); return l.join('\r\n'); })());
  mut('a repeated row', (() => { const l = text.split('\r\n'); l.splice(1, 0, l[1]); return l.join('\r\n'); })());
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(failed === 0
  ? '\ncsa-qotd-u2c2-repair: 19 articles, each proved broken before and agreeing after on a real '
    + 'JVM, only the code block moved, 5 guard mutations, 2 combined-sheet mutations, and the '
    + 'day 10 case pinned as the evidence that the code was the drifted half. All pass.'
  : '\ncsa-qotd-u2c2-repair: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
