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

// ── 7. the LIVE check, which has to be able to say "stale" ───────────────────
//  scripts/verify-csa-u2c2-live.js is what gets run before the import, not only
//  after it. Its whole value is the `drifted` verdict: a sheet generated against
//  a body that has since changed would MERGE the old body back over the new one,
//  and MERGE has no undo. A classifier that cannot tell a changed page from an
//  unimported one would call every stale sheet "safe to import".
//
//  So the mutation that matters is the one that leaves the anchor intact and
//  changes the page anyway. That is the 2026-09-08 shape exactly: the sheet
//  still applied cleanly, and applying it would still have reverted a fix.
{
  const V = require('../scripts/verify-csa-u2c2-live.js');

  //  One classify per article, not two. classify hands back the repaired body it
  //  already built, so the `imported` direction costs no second JVM run.
  let pend = 0; let imp = 0;
  rows.forEach((r) => {
    const c = V.classify(live(r.handle), r);
    if (c.state === 'pending') pend++;
    else { bad(r.handle + ': the pre-import body does not classify as ' + c.state + ', not pending'); return; }

    if (V.classify(c.repaired, r).state === 'imported') imp++;
    else bad(r.handle + ': the repaired body does not classify as imported');
  });
  eq(pend, 19, 'all nineteen pre-import bodies read as pending');
  eq(imp, 19, 'all nineteen repaired bodies read as imported');

  const drifts = (label, mutate) => {
    const r = rows.find((x) => x.handle === H);
    const got = V.classify(mutate(live(H)), r).state;
    if (got !== 'drifted') bad('the live check called a changed page ' + got + ', not drifted: ' + label);
  };
  //  THE ONE THAT CARRIES THE POINT: the anchor still matches, the repair still
  //  applies, and the page is not the one the sheet was built from.
  drifts('a change outside the code block, anchor still intact',
    (b) => b + '\n<!-- somebody edited this page after the sheet was generated -->');
  drifts('a reworded explanation', (b) => b.replace('Why This Answer', 'Why this answer'));
  drifts('a posted code block the anchor no longer finds',
    (b) => b.replace('<div class="apcs-code-block">', '<div class="apcs-code-block" data-x="1">'));

  //  Board 292's NBSP stripping is tolerated, and that tolerance must not be a
  //  blanket one. Asserted on synthetic strings ON PURPOSE: the first cut of
  //  this block only ran `if (wantBody.indexOf('\u00a0') !== -1)`, and NONE of
  //  the 19 sheet bodies contains a non-breaking space, so it never executed. It
  //  read like coverage of the tolerance and tested nothing. A guard conditioned
  //  on data that does not exist is the hollow-guard failure this repo keeps
  //  paying for, so the cases are constructed rather than hoped for.
  const nb = '\u00a0';
  //  Named sheet/served rather than want/live: `live` is the fixture reader a few
  //  lines up, and shadowing it here would read like a call to it.
  const tol = (sheet, served, expect, what) => {
    const got = V.sameAsSheet(sheet, served).same;
    if (got !== expect) bad('sameAsSheet(' + JSON.stringify(sheet) + ', ' + JSON.stringify(served)
      + ') returned ' + got + ', expected ' + expect + ': ' + what);
  };
  tol('a' + nb + 'b', 'a b', true, 'a sheet NBSP served as a plain space IS the sheet, board 292');
  tol('a' + nb + nb + 'b', 'a  b', true, 'more than one of them is still the sheet');
  tol('a' + nb + 'b', 'a' + nb + 'b', true, 'an untouched body is the sheet');
  tol('a b', 'a' + nb + 'b', false, 'the tolerance is one-directional: import strips them, it does not add them');
  tol('ab', 'ac', false, 'an ordinary character difference is not the sheet');
  tol('ab', 'ab ', false, 'a trailing addition is not the sheet');
  tol('ab', 'a', false, 'a truncated body is not the sheet');
  //  And the note has to name the count, because that is what a human reads to
  //  decide whether a difference was benign.
  {
    const r = V.sameAsSheet('a' + nb + 'b' + nb + 'c', 'a b c');
    if (!r.same || !/2 non-breaking space/.test(r.note || '')) {
      bad('sameAsSheet did not report the NBSP count it tolerated, got ' + JSON.stringify(r));
    }
  }

  //  The sheet on disk is the one this check compares against, so a missing or
  //  multi-row sheet must be a refusal rather than a quiet pass.
  try { V.sheetBody('unit-2-cycle-2-day-does-not-exist'); bad('sheetBody accepted a handle with no sheet'); }
  catch (e) { /* expected */ }
}

console.log(failed === 0
  ? '\ncsa-qotd-u2c2-repair: 19 articles, each proved broken before and agreeing after on a real '
    + 'JVM, only the code block moved, 5 guard mutations, 2 combined-sheet mutations, the live '
    + 'check proved able to call a changed page stale on 3 mutations, 9 assertions on the board 292 '
    + 'NBSP tolerance, and the day 10 case pinned '
    + 'as the evidence that the code was the drifted half. All pass.'
  : '\ncsa-qotd-u2c2-repair: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
