'use strict';
/*
 *  BOARD 344, AND THE TWO BUGS THIS REPAIR FOUND IN ITS OWN TOOLING.
 *
 *  Eight articles: one wrong key, three questions published at two handles each
 *  with two options reading the same text, and one heading misquote.
 *
 *  THE ANSWER IS RE-DERIVED ON THE JVM, not read off the explanation, because
 *  on the one that matters the explanation is what was wrong. The casting item
 *  knew about the floating point and talked itself out of it:
 *
 *      "floating-point imprecision COULD make 19.99 * 100 evaluate to
 *       1998.9999..., but the AP exam typically assumes exact arithmetic"
 *
 *  It is not "could". It is 1998.9999999999998, every time, and this suite
 *  asserts that number rather than quoting the sentence.
 *
 *  TWO GUARDS EARNED THEIR PLACE HERE BY FIRING DURING THE BUILD:
 *
 *    the option-count check caught backreferences. practiceOption() first wrote
 *    its replacement as "$1[10, 20, 30]$2", which works with String.replace and
 *    not with applyEdits, which splices LITERALLY. Four options became three
 *    because the surrounding spans were eaten by the two characters "$1".
 *
 *    the duplicate check is the whole point of the repair, so it is asserted on
 *    the repaired body rather than assumed from the edit.
 *
 *  And the anchors must carry their radio value: the duplicate option TEXT is
 *  the defect, so an anchor written on text alone matches both copies and
 *  applyEdits refuses it. That refusal is asserted below.
 *
 *  No JDK is a FAILURE here, not a skip. CI pins one.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const R = require('../scripts/csa-qotd-distractor-repair.js');
const E = require('../lib/matrixify-body-edit.js');
const I = require('../lib/csa-qotd-items.js');
const D = require('../scripts/csa-qotd-key-rederive.js');
const A = require('../scripts/csa-qotd-item-audit.js');

const FIX = path.join(__dirname, 'fixtures', 'csa-qotd-344-2026-09-17');
let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };
const eq = (got, want, what) => { if (got !== want) bad(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };
const live = (h) => fs.readFileSync(path.join(FIX, h + '.html'), 'utf8');

// ── 1. every repair applies, and the result is a sound item ──────────────────
const repaired = {};
eq(R.REPAIRS.length, 8, 'board 344 covers eight articles');
R.REPAIRS.forEach((r) => {
  try {
    const { out, after } = R.repairOne(live(r.handle), r);
    repaired[r.handle] = out;
    const texts = after.options.map((o) => o.text.trim());
    if (new Set(texts).size !== texts.length) bad(r.handle + ': the repaired item still has two options with the same text');
    eq(after.options.length, 4, r.handle + ' still has four options');
    if (!after.options.some((o) => o.letter === after.key.value)) bad(r.handle + ': the repaired key names no option');
  } catch (e) { bad('clean run refused ' + r.handle + ': ' + e.message); }
});

// ── 2. no in-page contradiction survives ─────────────────────────────────────
Object.entries(repaired).forEach(([h, body]) => {
  const found = A.auditItem(I.parse(h, body));
  if (found.length) bad(h + ': repaired body still contradicts itself (' + found.map((f) => f.id).join(', ') + ')');
});

// ── 3. the guards, broken on purpose ─────────────────────────────────────────
const clone = (r) => JSON.parse(JSON.stringify(r, (k, v) => (v instanceof RegExp ? { __re: v.source, __f: v.flags } : v)),
  (k, v) => (v && v.__re ? new RegExp(v.__re, v.__f) : v));
function refuses(label, handle, mutate) {
  const r = clone(R.REPAIRS.find((x) => x.handle === handle));
  mutate(r);
  try { R.repairOne(live(handle), r); } catch (e) { return; }
  bad('guard did not refuse: ' + label);
}
const DUP = 'unit-4-cycle-2-day-20-arraylist-remove-with-wrapper';

//  An anchor on the duplicate TEXT alone matches both copies. This is the guard
//  that makes a duplicate-option repair safe to write at all.
refuses('an option anchor that does not carry its radio value', DUP, (r) => {
  r.edits = [{ id: 'loose', find: /\[10, 30, 20\]/, to: '[10, 20, 30]' }];
});
//  Backreferences, the bug this repair actually shipped once.
refuses('a replacement using $1 backreferences, which applyEdits splices literally', DUP, (r) => {
  r.edits[0].to = '$1[10, 20, 30]$2';
});
refuses('a replacement that leaves the duplicate in place', DUP, (r) => {
  r.edits[0].to = r.edits[0].find.source.replace(/\\/g, '');
});
refuses('an anchor that matches nothing', DUP, (r) => { r.edits[0].find = /not in this body anywhere/; });
refuses('authored text with an em-dash', DUP, (r) => { r.edits[0].to = r.edits[0].to + '—'; });
refuses('a key that does not reach its declared value', 'ap-csa-u1-c2-day-16-casting-precision-loss', (r) => { r.key.to = 'C'; });
refuses('a live key that is not what the repair was written against', 'ap-csa-u1-c2-day-16-casting-precision-loss', (r) => { r.key.from = 'D'; });

// ── 4. the CSV round trip, and the combined sheet against its singles ────────
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qotd344-'));
  const log = console.log; console.log = () => {};
  let manifest = null;
  try { manifest = R.main([FIX, dir]); } finally { console.log = log; }
  const combined = path.join(dir, 'csa-qotd-344-ALL-EIGHT-blog-posts.csv');
  if (!fs.existsSync(combined)) bad('main() wrote no combined sheet');
  else {
    const singles = new Map(manifest.map((m) => [m.handle, E.parseCsv(fs.readFileSync(path.join(dir, m.sheet), 'utf8'))[1][3]]));
    const rows = E.parseCsv(fs.readFileSync(combined, 'utf8'));
    eq(rows.length - 1, 8, 'the combined sheet carries eight rows');
    rows.slice(1).forEach((row) => {
      if (singles.get(row[1]) !== row[3]) bad('combined row for ' + row[1] + ' is not byte-identical to its own sheet');
      if (row[2] !== 'MERGE') bad('combined row for ' + row[1] + ' is not MERGE');
    });
    //  and the mutations on checkCombined itself
    const text = fs.readFileSync(combined, 'utf8');
    const mut = (label, t) => { try { E.checkCombined(t, singles, R.COLS, { label: 'm' }); } catch (e) { return; } bad('combined guard did not refuse: ' + label); };
    mut('a dropped row', (() => { const l = text.split('\r\n'); l.splice(1, 1); return l.join('\r\n'); })());
    mut('a repeated row', (() => { const l = text.split('\r\n'); l.splice(1, 0, l[1]); return l.join('\r\n'); })());
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── 5. the JVM ───────────────────────────────────────────────────────────────
if (spawnSync('javac', ['-version'], { encoding: 'utf8' }).error) {
  bad('no javac on PATH. This repair re-derives every answer by running it and CI pins a JDK. It does not skip.');
} else {
  //  Every repaired item that asks what a program prints must now agree.
  Object.entries(repaired).forEach(([h, body]) => {
    const st = D.audit(I.parse(h, body)).state;
    if (!['agrees', 'agrees-flattened', 'not-applicable'].includes(st)) {
      bad(h + ': the repaired item re-derives as ' + st + ', not agreement');
    }
  });

  //  The two numbers this whole repair turns on, asserted rather than quoted.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cast-'));
  fs.writeFileSync(path.join(dir, 'C.java'),
    'public class C { public static void main(String[] a) {\n'
    + '  double price = 19.99;\n'
    + '  System.out.println(price * 100);\n'
    + '  int cents = (int)(price * 100);\n'
    + '  System.out.println("$" + cents / 100 + "." + cents % 100);\n'
    + '} }\n');
  execFileSync('javac', ['-nowarn', 'C.java'], { cwd: dir, stdio: 'pipe' });
  const out = execFileSync('java', ['C'], { cwd: dir, encoding: 'utf8' }).trim().split('\n');
  eq(out[0], '1998.9999999999998', '19.99 * 100 really is 1998.9999999999998');
  eq(out[1], '$19.98', 'the casting item really prints $19.98');
  fs.rmSync(dir, { recursive: true, force: true });

  //  day 26 asks for a SIZE, which the re-deriver cannot classify, so it is
  //  proved here instead of being left unjudged.
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'size-'));
  fs.writeFileSync(path.join(d2, 'S.java'),
    'import java.util.*;\npublic class S { public static void main(String[] a) {\n'
    + '  ArrayList<Integer> list = new ArrayList<>();\n  list.add(1); list.add(2); list.add(3);\n'
    + '  for (int i = 0; i < 3; i++) { list.add(list.get(i) * 2); }\n'
    + '  System.out.println(list.size());\n} }\n');
  execFileSync('javac', ['-nowarn', 'S.java'], { cwd: d2, stdio: 'pipe' });
  eq(execFileSync('java', ['S'], { cwd: d2, encoding: 'utf8' }).trim(), '6', 'day 26 final size really is 6');
  const d26 = I.parse('x', repaired['unit-4-cycle-2-day-26-arraylist-loop-adding']);
  eq((d26.options.find((o) => o.letter === d26.key.value) || {}).text, '6', 'day 26 keys the option that reads 6');
  fs.rmSync(d2, { recursive: true, force: true });
}

console.log(failed === 0
  ? '\ncsa-qotd-distractor-repair: 8 articles, 7 guard mutations, 2 combined-sheet mutations, '
    + 'no duplicate option left anywhere, and the two numbers the casting repair turns on '
    + 'asserted on the JVM. All pass.'
  : '\ncsa-qotd-distractor-repair: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
