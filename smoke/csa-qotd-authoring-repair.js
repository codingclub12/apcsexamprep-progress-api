'use strict';
/*
 *  THE REPAIR, AND THE JVM AS A SECOND OPINION.
 *
 *  scripts/csa-qotd-authoring-repair.js rewrites nine live AP CSA daily-practice
 *  articles. Seven of them had a broken item and three had a key that marked the
 *  correct answer wrong. The one thing this suite must not do is check a key
 *  against the explanation next to it, because the explanation is exactly what
 *  was wrong. So every answer here is re-derived by compiling and running the
 *  question's own code, and the repaired key has to agree with what Java did.
 *
 *  THREE PARTS
 *    guards    every refusal in the generator, broken on purpose, one at a time.
 *              A guard that stays green under its own mutation is hollow.
 *    csv       the writer and a reader that did not write it, on the awkward
 *              cases: a comma inside 16KB of HTML, a doubled quote, CRLF rows
 *              around LF-bearing cells.
 *    java      javac and the JVM on each item.
 *
 *  NO JDK IS A FAILURE HERE, not a skip. CI pins one. A check that turns itself
 *  off when its dependency is missing is the failure this repo keeps finding in
 *  its own validators.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const R = require('../scripts/csa-qotd-authoring-repair.js');
const V = require('../scripts/verify-csa-qotd-authoring-live.js');
const tells = require('../lib/authoring-tells.js');

const FIXTURES = path.join(__dirname, 'fixtures', 'csa-qotd-authoring-2026-09-15');
let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };
const live = (h) => fs.readFileSync(path.join(FIXTURES, h + '.html'), 'utf8');
const clone = (r) => JSON.parse(JSON.stringify(r, (k, v) => (v instanceof RegExp ? { __re: v.source, __f: v.flags } : v)),
  (k, v) => (v && v.__re ? new RegExp(v.__re, v.__f) : v));

// ── part 1: the guards, each broken on its own ───────────────────────────────
function refuses(label, mutate) {
  const r = clone(R.REPAIRS[0]);            // day 22, the reported one
  mutate(r);
  try { R.repairOne(live(r.handle), r); }
  catch (e) { return; }
  bad('guard did not refuse: ' + label);
}

//  the happy path first, so a refusal below means the mutation and not the setup
R.REPAIRS.forEach((r) => {
  try { R.repairOne(live(r.handle), r); }
  catch (e) { bad('clean run refused ' + r.handle + ': ' + e.message); }
});

refuses('an anchor that matches nothing', (r) => { r.edits[0].find = /this string is not in the body anywhere/; });
refuses('an anchor that matches twice', (r) => { r.edits[0].find = /line-height/; });
refuses('two edits overlapping the same span', (r) => {
  r.edits.push({ id: 'overlap', find: /<h3>Answer: \(A\) I only<\/h3>/, to: '<h3>x</h3>' });
});
refuses('authored text carrying an em-dash', (r) => { r.edits[0].to = "var correct = 'C'; // fixed \u2014 see the run note"; });
refuses('authored text carrying a non-ASCII character', (r) => { r.edits[0].to = "var correct = 'C'; // fixed •"; });
refuses('a key edit that never reaches the declared key', (r) => { r.key.to = 'D'; });
refuses('a live body whose key is not what the repair was written against', (r) => { r.key.from = 'B'; });
refuses('a repair that leaves a tell behind', (r) => {
  r.edits = r.edits.filter((e) => e.id !== 'iii-para');
});
//  A repair pointed at a body with nothing wrong in it. Every other guard is
//  satisfied here, so only the "no target" one can refuse, which is what makes
//  this a per-rule mutation rather than an aggregate one.
{
  const clean = '<div><h3>Answer: (A) I only</h3><p>Nothing here talks to itself.</p></div>';
  const r = { handle: 'synthetic-clean', key: null, edits: [{ id: 'noop', find: /I only/, to: 'I only.' }] };
  let refused = false;
  try { R.repairOne(clean, r); } catch (e) { refused = true; }
  if (!refused) bad('guard did not refuse: a repair aimed at a body with no tell in it');
}

//  reverse() has to notice a byte that no edit declared
{
  const r = R.REPAIRS[0];
  const body = live(r.handle);
  const { out, captured } = R.applyEdits(r.handle, body, r.edits);
  const tampered = out.slice(0, 40) + 'X' + out.slice(40);
  if (R.reverse(tampered, captured) === body) bad('reverse() did not notice a byte inserted outside every declared span');
  if (R.reverse(out, captured) !== body) bad('reverse() failed to reproduce the body from an untampered repair');
}

// ── part 2: the CSV, written by one thing and read by another ────────────────
{
  const awkward = 'a,b "quoted" c\r\nline two\nline three, with a comma\r\n';
  const csv = R.sheet([{ handle: 'h-1', body: awkward }]);
  if (csv.charCodeAt(0) !== 0xfeff) bad('sheet() wrote no BOM, so the consumer will guess Latin-1');
  const rows = R.parseCsv(csv);
  if (rows.length !== 2) bad('sheet() round trip produced ' + rows.length + ' rows, expected 2');
  if (rows[0].join('|') !== R.COLS.join('|')) bad('sheet() header did not survive the round trip');
  if (rows[1][3] !== awkward) bad('sheet() mangled a cell carrying commas, quotes, CRLF and LF');
  if (rows[1][0] !== R.BLOG || rows[1][2] !== 'MERGE') bad('sheet() wrote the wrong blog handle or command');
  //  and a real body, at size
  const body = R.repairOne(live(R.REPAIRS[0].handle), R.REPAIRS[0]).out;
  if (R.parseCsv(R.sheet([{ handle: 'x', body }]))[1][3] !== body) bad('a 16KB repaired body did not survive the CSV round trip');
}

// ── part 2b: one file or nine, and the guard that they are the same nine ────
//  main() runs end to end into a temp dir, which is the only way to exercise the
//  real chain: nine sheets on disk, a combined sheet, and checkCombined reading
//  both back. Then each way the combination could quietly go wrong is broken on
//  its own.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qotdsheets-'));
  const log = console.log;
  console.log = () => {};
  let manifest = null;
  try { manifest = R.main([FIXTURES, dir]); } finally { console.log = log; }

  const combined = path.join(dir, 'csa-qotd-repair-ALL-NINE-blog-posts.csv');
  if (!fs.existsSync(combined)) bad('main() wrote no combined sheet');
  else {
    //  Re-derived here rather than trusting the generator's own pass: read the
    //  nine single sheets off disk and compare them to the combined file.
    const singles = new Map(manifest.map((m) => [m.handle, R.parseCsv(fs.readFileSync(path.join(dir, m.sheet), 'utf8'))[1][3]]));
    const rows = R.parseCsv(fs.readFileSync(combined, 'utf8'));
    if (rows.length - 1 !== R.REPAIRS.length) bad('combined sheet has ' + (rows.length - 1) + ' rows, expected ' + R.REPAIRS.length);
    const handles = rows.slice(1).map((r) => r[1]);
    if (new Set(handles).size !== handles.length) bad('combined sheet repeats a handle');
    R.REPAIRS.forEach((r) => { if (handles.indexOf(r.handle) === -1) bad('combined sheet dropped ' + r.handle); });
    handles.forEach((h, i) => {
      if (singles.get(h) !== rows[i + 1][3]) bad('combined sheet row for ' + h + ' is not byte-identical to its own sheet');
    });
    //  Today's question is the one a partial import must land, so it goes first.
    if (handles[0] !== 'ap-csa-u1-c1-day-22-math-random-range') {
      bad('combined sheet does not open with the day 22 row, so a partial import may not land today\'s question');
    }

    // ── mutations, one per way this can go wrong ──────────────────────────────
    const text = fs.readFileSync(combined, 'utf8');
    const refusesCombined = (label, mutateText, mutateSingles) => {
      const t = mutateText ? mutateText(text) : text;
      const sing = mutateSingles ? mutateSingles(new Map(singles)) : singles;
      try { R.checkCombined(t, sing, 'mutated'); } catch (e) { return; }
      bad('combined guard did not refuse: ' + label);
    };
    const lines = text.split('\r\n');
    refusesCombined('a dropped row', (t) => {
      const l = t.split('\r\n'); l.splice(1, 1); return l.join('\r\n');
    });
    refusesCombined('a repeated row', (t) => {
      const l = t.split('\r\n'); l.splice(1, 0, l[1]); return l.join('\r\n');
    });
    refusesCombined('a row whose body drifted from its own sheet', null, (m) => {
      m.set('ap-csa-u1-c1-day-22-math-random-range', m.get('ap-csa-u1-c1-day-22-math-random-range') + ' ');
      return m;
    });
    refusesCombined('a row for an article this repair does not cover', (t) => {
      const l = t.split('\r\n');
      l[1] = l[1].replace('"ap-csa-u1-c1-day-22-math-random-range"', '"some-other-article"');
      return l.join('\r\n');
    });
    refusesCombined('a row switched off MERGE', (t) => t.replace('"MERGE"', '"UPDATE"'));
    refusesCombined('a row pointed at another blog', (t) => t.replace('"ap-csa-daily-practice"', '"ap-csp-daily-practice"'));
    if (lines.length < 2) bad('combined sheet is not CRLF terminated between rows');
  }

  //  IMPORT_ORDER and REPAIRS naming different articles is how a repair stops
  //  shipping without anything going red.
  const realOrder = R.IMPORT_ORDER.slice();
  const tryOrder = (label, mutate) => {
    R.IMPORT_ORDER.length = 0;
    mutate(R.IMPORT_ORDER, realOrder);
    let refused = false;
    try { R.checkOrder(); } catch (e) { refused = true; }
    R.IMPORT_ORDER.length = 0;
    realOrder.forEach((h) => R.IMPORT_ORDER.push(h));
    if (!refused) bad('checkOrder did not refuse: ' + label);
  };
  tryOrder('an article missing from the import order', (o, real) => real.slice(1).forEach((h) => o.push(h)));
  tryOrder('an article in the import order that has no repair', (o, real) => { real.forEach((h) => o.push(h)); o.push('not-a-real-handle'); });
  try { R.checkOrder(); } catch (e) { bad('checkOrder refused the real order: ' + e.message); }

  fs.rmSync(dir, { recursive: true, force: true });
}

// ── part 2c: checking the check ──────────────────────────────────────────────
//  A needle that can never match reads exactly like a needle that works. On
//  2026-09-15 the live verifier shipped with
//
//      ['trace is the i++ trace', 'size stays exactly 3 ahead of i forever']
//
//  and the repaired body breaks that sentence across a </span> and a newline, so
//  it reported a correct import as "not live yet" and sent somebody to re-import
//  a page that was already right. Nothing offline could have caught it, because
//  nothing offline looked.
//
//  Now it does. Every `must` needle has to be findable in the repaired body it
//  claims to describe, and every `mustNot` needle in the PRE-import fixture: a
//  mustNot that was not there beforehand asserts nothing, the same way a live
//  check that was already true before a deploy asserts nothing.
{
  const repaired = {};
  R.REPAIRS.forEach((r) => { repaired[r.handle] = R.repairOne(live(r.handle), r).out; });

  if (V.EXPECT.length !== R.REPAIRS.length) {
    bad('the live verifier covers ' + V.EXPECT.length + ' articles and there are ' + R.REPAIRS.length + ' repairs');
  }
  R.REPAIRS.forEach((r) => {
    if (!V.EXPECT.some((e) => e.handle === r.handle)) bad('the live verifier does not cover ' + r.handle);
  });

  V.EXPECT.forEach((e) => {
    const after = repaired[e.handle];
    const before = fs.existsSync(path.join(FIXTURES, e.handle + '.html')) ? live(e.handle) : null;
    if (!after) { bad('the live verifier covers ' + e.handle + ', which is not one of the repairs'); return; }
    e.must.forEach(([label, needle]) => {
      if (after.indexOf(needle) === -1) {
        bad(e.handle + ': must-needle "' + label + '" is not in the repaired body, so it can never pass on a correct import');
      }
      if (before && before.indexOf(needle) !== -1) {
        bad(e.handle + ': must-needle "' + label + '" was already in the body before the repair, so it asserts nothing');
      }
    });
    e.mustNot.forEach(([label, needle]) => {
      if (after.indexOf(needle) !== -1) {
        bad(e.handle + ': mustNot-needle "' + label + '" is still in the repaired body, so this import can never pass');
      }
      if (before && before.indexOf(needle) === -1) {
        bad(e.handle + ': mustNot-needle "' + label + '" was not in the body before the repair either, so it asserts nothing');
      }
    });
  });
}

// ── part 3: javac and the JVM ────────────────────────────────────────────────
const JAVA = `
import java.util.ArrayList;
import java.util.Arrays;
public class QotdKeys {
  static String out = "";
  static void say(String k, String v) { out += k + "=" + v + "\\n"; }

  public static void main(String[] a) {
    // day 22
    boolean[] i1 = new boolean[40], i2 = new boolean[40], i3 = new boolean[40];
    boolean over1 = false, over2 = false, over3 = false;
    for (int t = 0; t < 4000000; t++) {
      int p = (int) (Math.random() * 8) + 5;
      int q = (int) (Math.random() * 7) + 5;
      int r = (int) (Math.random() * 8 + 5);
      i1[p] = true; i2[q] = true; i3[r] = true;
      over1 |= (p < 5 || p > 12); over2 |= (q < 5 || q > 12); over3 |= (r < 5 || r > 12);
    }
    say("d22.I", covers(i1) && !over1 ? "ok" : "no");
    say("d22.II", covers(i2) && !over2 ? "ok" : "no");
    say("d22.III", covers(i3) && !over3 ? "ok" : "no");

    // day 4
    String w = "";
    { int i = 0; while (i < 10) { w += i + " "; i += 3; } }
    String oa = "", ob = "", oc = "", od = "";
    for (int k = 0; k < 10; k += 3) oa += k + " ";
    for (int k = 0; k <= 12; k += 3) ob += k + " ";
    for (int k = 3; k < 10; k += 3) oc += k + " ";
    for (int k = 0; k < 10; k++) od += k + " ";
    say("d4.A", oa.equals(w) ? "same" : "differs");
    say("d4.B", ob.equals(w) ? "same" : "differs");
    say("d4.C", oc.equals(w) ? "same" : "differs");
    say("d4.D", od.equals(w) ? "same" : "differs");

    // day 15
    String phrase = "JAVA PRACTICE";
    String part = phrase.substring(phrase.indexOf("A") + 1, 8);
    say("d15.printed", part + part.length());

    // day 20
    int x = 14, y = 4;
    say("d20.I", (x / y + x % y == x) ? "true" : "false");
    say("d20.II", (((double) x / y) == 3.5) ? "true" : "false");
    say("d20.III", (x / y * y == x) ? "true" : "false");

    // day 19, both updates
    ArrayList<String> two = seed();
    for (int i = 0; i < two.size(); i += 2) two.add(i, "X");
    say("d19.plus2", two.toString());
    ArrayList<String> one = seed();
    int guard = 0;
    for (int i = 0; i < one.size(); i++) { one.add(i, "X"); if (++guard > 50000) break; }
    say("d19.plus1", guard > 50000 ? "never-ends" : "ends");

    // day 25
    int[] arr = {5, 2, 8, 1, 9};
    int min = 0;
    for (int j = 1; j < arr.length; j++) if (arr[j] < arr[min]) min = j;
    int t2 = arr[0]; arr[0] = arr[min]; arr[min] = t2;
    say("d25.pass1", Arrays.toString(arr));

    System.out.print(out);
  }

  static ArrayList<String> seed() {
    ArrayList<String> l = new ArrayList<String>();
    l.add("A"); l.add("B"); l.add("C");
    return l;
  }
  static boolean covers(boolean[] s) {
    for (int i = 5; i <= 12; i++) if (!s[i]) return false;
    return true;
  }
}
`;

function runJava() {
  const probe = spawnSync('javac', ['-version'], { encoding: 'utf8' });
  if (probe.error) {
    bad('no javac on PATH. This suite re-derives every answer key by running the '
      + 'question, and CI pins a JDK for exactly that. It does not skip.');
    return null;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qotdkeys-'));
  fs.writeFileSync(path.join(dir, 'QotdKeys.java'), JAVA);
  execFileSync('javac', ['-nowarn', 'QotdKeys.java'], { cwd: dir, stdio: 'pipe' });
  const stdout = execFileSync('java', ['-Xmx256m', 'QotdKeys'], { cwd: dir, encoding: 'utf8' });
  const kv = {};
  stdout.split('\n').forEach((l) => { const i = l.indexOf('='); if (i > 0) kv[l.slice(0, i)] = l.slice(i + 1); });
  return { kv, dir };
}

//  Does option <letter> of this repaired body say <text>?
function optionText(body, letter) {
  //  Both article templates in this blog, in one expression: the QOTD template
  //  puts the option in a <span> after the radio, the practice template puts it
  //  in <span class="apcs-option-content">.
  const qotd = new RegExp('value="' + letter + '">[\\s\\S]{0,40}?<span[^>]*>([\\s\\S]*?)</span>');
  const prac = new RegExp('value="' + letter + '">[\\s\\S]*?apcs-option-content">([\\s\\S]*?)</span>');
  const m = body.match(prac) || body.match(qotd);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;
}

const java = runJava();
if (java) {
  const kv = java.kv;
  const repaired = {};
  R.REPAIRS.forEach((r) => { repaired[r.handle] = R.repairOne(live(r.handle), r).out; });
  const keyOf = (h) => {
    const r = R.REPAIRS.find((x) => x.handle === h);
    return r.key ? (repaired[h].match(r.key.pattern) || [])[1] : null;
  };

  // day 22: I and III cover 5..12 and overshoot nothing, II does not
  if (kv['d22.I'] !== 'ok' || kv['d22.III'] !== 'ok' || kv['d22.II'] !== 'no') {
    bad('day 22: Java says I=' + kv['d22.I'] + ' II=' + kv['d22.II'] + ' III=' + kv['d22.III']
      + ', which is not the "I and III" the repaired key claims');
  }
  const d22 = 'ap-csa-u1-c1-day-22-math-random-range';
  if (keyOf(d22) !== 'C') bad('day 22: repaired key is ' + keyOf(d22) + ', expected C');
  if (optionText(repaired[d22], 'C') !== 'I and III only') {
    bad('day 22: option C reads ' + JSON.stringify(optionText(repaired[d22], 'C')) + ', not "I and III only"');
  }

  // day 4: exactly one option may match the while loop, and it must be the key
  const d4 = 'ap-csa-u2-c2-day-4-iii-loop-equivalence';
  const same = ['A', 'B', 'C', 'D'].filter((L) => kv['d4.' + L] === 'same');
  if (same.length !== 1) bad('day 4: ' + same.length + ' options match the while loop (' + same.join(',') + '), an item must have exactly one');
  if (same[0] !== keyOf(d4)) bad('day 4: Java says ' + same[0] + ' matches, the repaired key is ' + keyOf(d4));

  // day 15: the printed string has to BE the keyed option
  const d15 = 'ap-csa-u1-c1-day-15-chained-string-methods';
  if (optionText(repaired[d15], keyOf(d15)) !== kv['d15.printed']) {
    bad('day 15: Java prints ' + JSON.stringify(kv['d15.printed']) + ' and keyed option '
      + keyOf(d15) + ' reads ' + JSON.stringify(optionText(repaired[d15], keyOf(d15))));
  }
  ['A', 'C', 'D'].forEach((L) => {
    if (optionText(repaired[d15], L) === kv['d15.printed']) bad('day 15: distractor ' + L + ' is also the right answer');
  });

  // day 20: the three statements the item claims, checked one at a time
  if (kv['d20.I'] !== 'false' || kv['d20.II'] !== 'true' || kv['d20.III'] !== 'false') {
    bad('day 20: Java says I=' + kv['d20.I'] + ' II=' + kv['d20.II'] + ' III=' + kv['d20.III']
      + ', so "I, II and III are all correct statements" no longer holds');
  }
  const d20 = 'ap-csa-u1-c2-day-20-iii-expression-evaluation';
  if (keyOf(d20) !== 'D') bad('day 20: repaired key is ' + keyOf(d20) + ', expected D');

  // day 19: the repaired stem must be the update that never terminates
  const d19 = 'unit-4-day-19-arraylist-shifting';
  if (kv['d19.plus1'] !== 'never-ends') bad('day 19: the i++ form terminated, so "infinite loop" is not the answer');
  if (kv['d19.plus2'] !== '[X, A, X, B, X, C]') bad('day 19: the i += 2 form produced ' + kv['d19.plus2'] + ', so the note about the intended fix is wrong');
  if (!/i &lt; list\.size\(\); i\+\+\)/.test(repaired[d19])) bad('day 19: the repaired stem does not carry the i++ update the key depends on');
  if (keyOf(d19) !== 'B') bad('day 19: repaired key is ' + keyOf(d19) + ', expected B');
  if (!/infinite loop/.test(optionText(repaired[d19], 'B') || '')) bad('day 19: keyed option B is not the infinite-loop option');

  // day 25, both twins
  ['unit-4-cycle-2-day-25-selection-sort-iteration', 'unit4-cycle2-day-25-selection-sort-iteration'].forEach((h) => {
    const k = keyOf(h);
    if (k !== 'B') bad(h + ': repaired key is ' + k + ', expected B');
    if (optionText(repaired[h], k) !== kv['d25.pass1']) {
      bad(h + ': Java says one pass gives ' + kv['d25.pass1'] + ' and keyed option ' + k
        + ' reads ' + JSON.stringify(optionText(repaired[h], k)));
    }
    ['A', 'C', 'D'].forEach((L) => {
      if (optionText(repaired[h], L) === kv['d25.pass1']) bad(h + ': distractor ' + L + ' is also the right answer');
    });
    if (/```/.test(repaired[h])) bad(h + ': a markdown fence survives in the repaired body');
  });

  //  and nothing anywhere still talks to itself
  R.REPAIRS.forEach((r) => {
    const t = tells.find(repaired[r.handle], { strictOnly: true });
    if (t.length) bad(r.handle + ': ' + t.map((x) => x.id).join(', ') + ' survive');
  });

  fs.rmSync(java.dir, { recursive: true, force: true });
}

console.log(failed === 0
  ? '\ncsa-qotd-authoring-repair: 9 articles, ' + R.REPAIRS.reduce((n, r) => n + r.edits.length, 0)
    + ' declared edits, 18 guard mutations, one combined sheet proved row for row against the nine, '
    + V.EXPECT.reduce((n, e) => n + e.must.length + e.mustNot.length, 0) + ' live needles proved matchable offline, '
    + 'and every key re-derived on the JVM. All pass.'
  : '\ncsa-qotd-authoring-repair: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
