'use strict';
// -----------------------------------------------------------------------------
//  RE-DERIVE THE ANSWER BY RUNNING THE QUESTION.
//
//      node scripts/csa-qotd-key-rederive.js <bodies-dir> [--json out.json] [--handle H]
//
//  Board 332. The nine articles repaired on 2026-09-15 were found because their
//  author thought out loud. This is the check that does not need them to.
//
//  ── WHY THE CHEAP CHECKS ARE NOT ENOUGH, MEASURED ──────────────────────────
//  lib/csa-qotd-items.js can ask whether a page contradicts ITSELF: does the
//  grader key an option that exists, does the explanation's own heading name the
//  same letter, does the Why Not block argue against the keyed answer. Those are
//  exact and they are cheap.
//
//  Run them against the nine known-broken bodies and they catch TWO. Day 22
//  keyed (A), its heading said "Answer: (A) I only", and its Why Not block
//  explained why (C) was wrong. Perfectly consistent. Also wrong: the answer was
//  (C). A silently wrong key is consistent BY DEFINITION, which is the whole
//  reason board 332 exists and the reason this file compiles Java.
//
//  ── WHAT IT WILL AND WILL NOT CLAIM ────────────────────────────────────────
//  It reports a MISMATCH only when all of this holds:
//
//      the snippet compiled
//      it ran to completion inside the timeout, exit 0, nothing thrown
//      its output matches exactly ONE option after whitespace normalisation
//      that option is not the one the page keys
//
//  Anything short of that is reported as its own state and never as a defect:
//  `no-match` when the output is on no option (which is how day 15 was broken,
//  so it is a lead worth a human), `ambiguous` when two options both match,
//  and `not-runnable` when the snippet needs context the page does not print.
//  An audit that guesses is worse than no audit, because a false accusation
//  sends somebody to rewrite a correct item.
//
//  ── THE 48 THAT ARE NOT RUNNABLE, AND WHY THAT IS HONEST ───────────────────
//  48 of the 250 print questions post a class with no driver: a Player class and
//  no main. The answer depends on a call the page makes in prose. Those are
//  counted and named, never quietly dropped, because the failure this file is
//  written against is a checker that reads 400 of 429 and reports the bank clean.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const I = require('../lib/csa-qotd-items.js');

const RUN_TIMEOUT_MS = 6000;

//  A snippet is a statement sequence, a class definition, or both. Only the
//  first can be executed on its own, and `main` is how we tell.
function shape(code) {
  if (/\bstatic\s+(public\s+)?void\s+main\s*\(/.test(code)) return 'has-main';
  if (/\bclass\s+\w+\s*(\{|\n\s*\{)/.test(code)) return 'class-no-driver';
  return 'statements';
}

//  java.util for ArrayList and friends; the AP subset needs nothing else.
function wrap(code, kind) {
  if (kind === 'has-main') {
    return /\bclass\s+Main\b/.test(code) ? 'import java.util.*;\n' + code
      : 'import java.util.*;\n' + code.replace(/\bclass\s+(\w+)/, 'class Main');
  }
  return 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n'
    + code + '\n  }\n}\n';
}

function runJava(code, kind) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qotd-'));
  try {
    fs.writeFileSync(path.join(dir, 'Main.java'), wrap(code, kind));
    const c = spawnSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, encoding: 'utf8', timeout: 30000 });
    if (c.status !== 0) {
      return { state: 'not-runnable', why: 'does not compile', detail: (c.stderr || '').split('\n')[0] };
    }
    const r = spawnSync('java', ['-Xmx256m', 'Main'], { cwd: dir, encoding: 'utf8', timeout: RUN_TIMEOUT_MS });
    if (r.error && r.error.code === 'ETIMEDOUT') return { state: 'not-runnable', why: 'did not terminate inside ' + RUN_TIMEOUT_MS + 'ms' };
    if (r.status !== 0) return { state: 'not-runnable', why: 'threw at run time', detail: (r.stderr || '').split('\n')[0] };
    return { state: 'ran', stdout: r.stdout };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

//  Output and option compared as a reader would see them: whitespace collapsed,
//  surrounding quotes dropped. Nothing else, because "3.0" and "3" are different
//  answers and a looser rule would call a wrong key right.
//  A NEWLINE IS PART OF THE ANSWER. Collapsing them made a growing triangle and
//  a shrinking one compare equal on day 19 of u2-c1, which is the whole question.
//  Lines survive; spacing inside a line does not. See lib/csa-qotd-items.js.
function normOut(s) {
  return I.collapseLines(String(s == null ? '' : s)).replace(/^["'`]|["'`]$/g, '').trim();
}

//  ONLY A QUESTION THAT ASKS WHAT THE PROGRAM PRINTS CAN BE SETTLED BY PRINTING.
//  The first full run audited all 429 regardless of what was being asked, so
//  every conceptual item ("which statement about inheritance is true") compiled,
//  printed nothing, matched no option, and was reported as a lead. Sixty pages
//  of noise around the real findings is how a report gets skimmed. A stem this
//  cannot classify is `not-applicable`, counted and named, never a finding.
const ASKS_FOR_OUTPUT = /what is (printed|the output)|what does .{0,40}print|output of|printed as a result|what will be printed/i;

function audit(item) {
  if (!ASKS_FOR_OUTPUT.test(item.stem || '')) {
    return { state: 'not-applicable', why: 'the stem does not ask what the program prints' };
  }
  const code = item.code.join('\n\n').trim();
  if (!code) return { state: 'not-runnable', why: 'the question posts no code' };
  const kind = shape(code);
  if (kind === 'class-no-driver') {
    return { state: 'not-runnable', why: 'a class with no driver, so the page decides what is called' };
  }
  const run = runJava(code, kind);
  if (run.state !== 'ran') return run;

  const out = normOut(run.stdout);
  const keyed = item.options.find((o) => o.letter === item.key.value) || null;

  //  STRICT FIRST: lines preserved. Ambiguity is only ever judged here, because
  //  flattening lines makes a growing triangle and a shrinking one identical.
  const strict = item.options.filter((o) => normOut(o.text) === out);
  if (strict.length > 1) return { state: 'ambiguous', out, letters: strict.map((m) => m.letter) };
  if (strict.length === 1) {
    const answer = strict[0];
    if (answer.letter !== item.key.value) {
      return { state: 'mismatch', out, should_be: answer.letter, keys: item.key.value, keyed: keyed && keyed.text };
    }
    return { state: 'agrees', out, letter: answer.letter };
  }

  //  THEN FLATTENED, and the result is reported as a weaker thing than agreement.
  //  unit-4-cycle-2-day-24 prints "null" and "3" on two lines and its correct
  //  option writes them as "null 3". The key is right and the option renders the
  //  arrangement differently; nothing here can decide which the author meant, so
  //  it is named rather than filed under either "correct" or "broken".
  const flat = (v) => String(v).replace(/\s+/g, ' ').trim();
  const loose = item.options.filter((o) => flat(normOut(o.text)) === flat(out));
  if (loose.length === 1) {
    const answer = loose[0];
    if (answer.letter !== item.key.value) {
      return { state: 'mismatch', out, should_be: answer.letter, keys: item.key.value, keyed: keyed && keyed.text };
    }
    return { state: 'agrees-flattened', out, letter: answer.letter, option: answer.text };
  }
  return { state: 'no-match', stdout: run.stdout, out, keyed: keyed && keyed.text };
}

function main(argv) {
  const dir = argv[0];
  if (!dir) { console.error('usage: node scripts/csa-qotd-key-rederive.js <bodies-dir> [--json out] [--handle H]'); process.exit(2); }
  const only = argv.includes('--handle') ? argv[argv.indexOf('--handle') + 1] : null;
  const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

  if (spawnSync('javac', ['-version'], { encoding: 'utf8' }).error) {
    console.error('\n  REFUSED: no javac on PATH. This audit re-derives answers by running them '
      + 'and does not have a second way to do that. It does not degrade to a no-op.\n');
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).filter((f) => !only || f === only + '.html');
  const rows = [];
  const tally = {};
  files.forEach((f, i) => {
    const handle = f.replace(/\.html$/, '');
    const item = I.parse(handle, fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = audit(item);
    tally[r.state] = (tally[r.state] || 0) + 1;
    rows.push(Object.assign({ handle, key: item.key && item.key.value, stem: (item.stem || '').slice(0, 120) }, r));
    if ((i + 1) % 50 === 0) process.stderr.write('  ' + (i + 1) + '/' + files.length + '\n');
  });

  console.log('\nre-derived ' + files.length + ' items by compiling and running them\n');
  ['mismatch', 'no-match', 'ambiguous', 'agrees', 'agrees-flattened', 'not-runnable', 'not-applicable'].forEach((k) => {
    if (tally[k]) console.log('  ' + k.padEnd(14) + String(tally[k]).padStart(4));
  });

  const show = (state, title) => {
    const hits = rows.filter((r) => r.state === state);
    if (!hits.length) return;
    console.log('\n### ' + title + ' (' + hits.length + ')');
    hits.forEach((r) => {
      console.log('  ' + r.handle);
      console.log('      program prints : ' + JSON.stringify(r.out));
      if (r.should_be) console.log('      that is option : ' + r.should_be + '   page keys: ' + r.keys);
      if (r.state === 'no-match') console.log('      page keys ' + r.key + ' : ' + JSON.stringify(String(r.keyed).slice(0, 70)));
      if (r.letters) console.log('      both match     : ' + r.letters.join(', '));
    });
  };
  show('mismatch', 'THE PAGE KEYS THE WRONG OPTION');
  show('ambiguous', 'TWO OPTIONS BOTH MATCH THE OUTPUT');
  show('no-match', 'THE OUTPUT IS ON NO OPTION');

  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify({ as_of: new Date().toISOString(), tally, rows }, null, 2)); console.log('\nwrote ' + jsonOut); }
  return rows;
}

module.exports = { shape, wrap, runJava, normOut, audit, main };
if (require.main === module) main(process.argv.slice(2));
