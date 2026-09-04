#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  MUTATION BATTERY for scripts/cyber-qotd-sheet-check.js.
//
//  A green gate proves nothing until each rule has been broken on purpose and
//  seen to fire. Every mutation here names the SUBSTRING it expects in the
//  failure output: "the gate went red" and "this rule works" are different
//  claims, and where guards overlap the strong one masks the weak one. A
//  mutation caught by some other check is reported as a miss, not a pass.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const POOL_PATH = path.join(ROOT, 'config/cyber-qotd-pool.json');
const SHEETS = [
  path.join(ROOT, 'matrixify/cyber-qotd-unit-pages.csv'),
  path.join(ROOT, 'matrixify/cyber-qotd-links-pages.csv'),
];
const GEN = path.join(ROOT, 'scripts/cyber-qotd-page-csv.js');
const CHECK = path.join(ROOT, 'scripts/cyber-qotd-sheet-check.js');

// Mutations act on the canonical pool, then the sheet is regenerated from it,
// so each one travels the real path from data to sheet to gate.
const MUTANTS = [
  { name: 'an EK code in a question stem',
    expect: 'R1',
    apply: (p) => { p.pool[0].stem = 'Under EK 3.1.A.1, ' + p.pool[0].stem; } },
  { name: 'a fabricated per-unit exam weighting',
    expect: 'R2',
    apply: (p) => { p.pool[1].explanation = 'Unit 3 is 22% of the exam. ' + p.pool[1].explanation; } },
  { name: 'an em-dash in an explanation',
    expect: 'R3',
    apply: (p) => { const EM = '\u2014';
      p.pool[2].explanation = `The key point ${EM} the only one ${EM} is scope.`; } },
  { name: 'mojibake in a stem',
    expect: 'R7',
    apply: (p) => {
      // Single-pass cp1252 mojibake of a right single quote: U+00E2 U+20AC U+2122.
      // Written as escapes so this file carries no real mojibake of its own.
      const MOJI = '\u00e2\u20ac\u2122';
      p.pool[3].stem = `A user clicked ${MOJI}continue${MOJI} on the banner.`; } },
  { name: 'a non-ASCII character in an option',
    expect: 'not pure ASCII',
    apply: (p) => { p.pool[4].options[0] = 'Caf\u00e9 wifi'; } },
  { name: 'a question with an empty stem',
    expect: 'empty stem',
    apply: (p) => { p.pool[5].stem = '   '; } },
  { name: 'an answer index pointing past the options',
    expect: 'out-of-range answer',
    apply: (p) => { p.pool[6].answer = 9; } },
];

// These two break the GENERATOR rather than the data, because the checks they
// target are about the renderer keeping faith with the pool. Removing a question
// from canonical data is a legitimate edit and moves both counts together, so
// mutating the pool could never test them.
const GENERATOR_MUTANTS = [
  ...MUTANTS.filter((m) => m.generator),
  { name: 'the renderer silently drops questions',
    expect: 'rendered',
    find: 'for (const q of list) parts.push(renderQuestion(q));',
    replace: 'for (const q of list.slice(0, 1)) parts.push(renderQuestion(q));' },
  { name: 'the schema carries a question the page does not render',
    expect: 'not rendered in the page HTML',
    find: 'text: q.stem,',
    replace: 'text: q.stem + " (schema only)",' },
  { name: 'the QOTD page stops linking the unit pages',
    expect: 'does not link unit',
    find: "out.push(`      <p class=\"cy-bank-stem\"><a href=\"/pages/${unitHandle(u)}\">Unit ${u}: `",
    replace: "out.push(`      <p class=\"cy-bank-stem\">Unit ${u}: `" },
  { name: 'the umbrella card is dropped',
    expect: 'umbrella does not link',
    find: "  return { body: src.slice(0, at) + card + src.slice(at), changed: true };",
    replace: "  return { body: src, changed: true };" },
  { name: 'an SEO column creeps onto the existing-pages sheet',
    expect: 'carries an SEO column',
    find: "const LINKS_HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];",
    replace: "const LINKS_HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At', 'SEO Title'];" },
  { name: 'code blocks escaped once, so Shopify eats the domain',
    expect: 'Escape code blocks twice',
    find: '${escCode(q.code)}',
    replace: '${esc(q.code)}' },
  { name: 'multi-line stems rendered as one collapsed paragraph',
    expect: 'collapse into one paragraph',
    find: "rows.push(`        <p class=\"cy-bank-stem\">${lines.join('<br>')}</p>`);",
    replace: "rows.push(`        <p class=\"cy-bank-stem\">${lines.join(' ')}</p>`);" },
  { name: 'unit-page headings fall back to the pool copy',
    expect: 'the CED says',
    find: '${esc(topicTitle(topic))}</h2>',
    replace: '${esc(POOL.TOPIC_TITLES[topic])}</h2>',
    generator: true },
  { name: 'the QOTD browse UI keeps its own drifted titles',
    expect: 'TOPIC_TITLES',
    find: 'const src = canonicalTopicTitlesJs(SNAP(QOTD_HANDLE));',
    replace: 'const src = SNAP(QOTD_HANDLE);',
    generator: true },
  { name: 'an eduQuestionType other than Flashcard',
    expect: 'eduQuestionType other than',
    find: "eduQuestionType: 'Flashcard',",
    replace: "eduQuestionType: 'Multiple choice'," },
];

function run() {
  const original = fs.readFileSync(POOL_PATH, 'utf8');
  const sheetsBefore = Object.fromEntries(SHEETS.map((f) =>
    [f, fs.existsSync(f) ? fs.readFileSync(f) : null]));
  let misses = 0;

  try {
    for (const m of MUTANTS.filter((x) => !x.generator)) {
      const pool = JSON.parse(original);
      m.apply(pool);
      fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 1));

      let out = '';
      let red = false;
      try {
        execFileSync('node', [GEN], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        execFileSync('node', [CHECK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        red = true;
        out = (e.stdout || '') + (e.stderr || '');
      }

      const named = red && out.includes(m.expect);
      const verdict = !red ? 'GREEN - HOLLOW'
        : named ? 'RED'
        : `RED but not for ${m.expect} - another guard caught it`;
      if (!named) misses++;
      console.log(`  ${verdict.padEnd(46)} ${m.name}`);
    }
    const genSrc = fs.readFileSync(GEN, 'utf8');
    for (const m of GENERATOR_MUTANTS) {
      if (!genSrc.includes(m.find)) {
        console.log(`  ANCHOR MISSING${' '.repeat(32)} ${m.name}`);
        misses++;
        continue;
      }
      fs.writeFileSync(GEN, genSrc.replace(m.find, m.replace));
      let out = '';
      let red = false;
      try {
        execFileSync('node', [GEN], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        execFileSync('node', [CHECK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        red = true;
        out = (e.stdout || '') + (e.stderr || '');
      }
      fs.writeFileSync(GEN, genSrc);
      const named = red && out.includes(m.expect);
      if (!named) misses++;
      const verdict = !red ? 'GREEN - HOLLOW'
        : named ? 'RED'
        : `RED but not for ${m.expect}`;
      console.log(`  ${verdict.padEnd(46)} ${m.name}`);
    }
  } finally {
    // RESTORE, THEN PROVE IT. This battery edits a TRACKED file, so a restore
    // that quietly failed would leave mutated canonical data in the working
    // tree and, worse, in someone's next commit. deploy-gate.js takes the same
    // precaution for the same reason: it is not enough to write the original
    // back, the bytes have to be checked.
    fs.writeFileSync(POOL_PATH, original);
    execFileSync('node', [GEN], { stdio: 'ignore' });

    const poolBack = fs.readFileSync(POOL_PATH, 'utf8');
    if (poolBack !== original) {
      console.error('\nFAILED TO RESTORE ' + path.relative(ROOT, POOL_PATH)
        + '. The working tree holds mutated canonical data. Restore it from git '
        + 'before committing anything.');
      process.exitCode = 1;
    }
    for (const [file, before] of Object.entries(sheetsBefore)) {
      if (before === null) continue;
      const now = fs.readFileSync(file);
      if (!now.equals(before)) {
        console.error(`\nFAILED TO RESTORE ${path.relative(ROOT, file)}: it differs from the `
          + 'pre-mutation file. Regenerate and inspect before committing.');
        process.exitCode = 1;
      }
    }
  }

  console.log('');
  if (misses) {
    console.log(`RESULT: FAIL - ${misses} of ${MUTANTS.length + GENERATOR_MUTANTS.length} mutations did not trip their own rule`);
    process.exit(1);
  }
  console.log(`RESULT: PASS - all ${MUTANTS.length + GENERATOR_MUTANTS.length} mutations tripped the rule they target`);
}

if (require.main === module) run();
