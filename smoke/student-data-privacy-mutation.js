'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION: prove the privacy page validator is not hollow
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Each case below breaks exactly one
//  rule on purpose and requires THAT RULE, by name, to go red. Requiring "the
//  suite went red" is the mistake this repo has already found three guards with:
//  a suite that fails for a different reason is telling you the rule you meant
//  to test does nothing.
//
//  THE MOJIBAKE CASES ARE SINGLE-PASS AS WELL AS DOUBLE. CLAUDE.md is explicit
//  about this and the reason is that the double-pass form is the one every naive
//  detector catches; a harness built only from it goes green against a guard
//  blind to the corruption actually seen on live pages. Both depths are asserted
//  separately below. The corrupted strings are written as \u escapes so this
//  file does not itself contain mojibake and turn the repo scan red.
//
//  Offline, zero PII, no network. No em-dashes.
//  Run: npm run smoke:privacypagemutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const val = require('./student-data-privacy.js');
const gen = require('../scripts/build-student-data-privacy.js');

//  U+2022 bullet, corrupted once and twice, and U+1F3AF target corrupted once.
//  BUILT FROM CODE POINTS, never written as characters. Writing them literally
//  puts real mojibake in this file, and smoke:encoding scans the repository and
//  goes red on it. That is not a hypothetical: the first cut of this file did
//  exactly that and failed the guard it exists to defend.
const cp = (...codes) => String.fromCharCode(...codes);
const BULLET_SINGLE = cp(0x00e2, 0x20ac, 0x00a2);
const BULLET_DOUBLE = cp(0x00c3, 0x00a2, 0x20ac, 0x009a, 0x00c2, 0x00a2);
//  A 4-byte character, which is the case a latin-1-only reverser cannot reach.
const TARGET_SINGLE = cp(0x00f0, 0x0178, 0x017d, 0x00af);

function baseline() {
  const data = JSON.parse(fs.readFileSync(gen.DATA, 'utf8'));
  return { data, body: gen.render(data), csv: gen.sheet(data) };
}

//  Each case returns a doctored context. `rule` is the rule number that MUST
//  fail; anything else failing too is allowed and reported.
const CASES = [
  {
    name: 'em-dash in a paragraph',
    rule: '1',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', '—</p>') }),
  },
  {
    name: 'mojibake, SINGLE pass, 3-byte bullet',
    rule: '2',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', BULLET_SINGLE + '</p>') }),
  },
  {
    name: 'mojibake, SINGLE pass, 4-byte emoji',
    rule: '2',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', TARGET_SINGLE + '</p>') }),
  },
  {
    name: 'mojibake, DOUBLE pass, bullet',
    rule: '2',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', BULLET_DOUBLE + '</p>') }),
  },
  {
    name: 'CED EK code in student-visible text',
    rule: '3',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', ' (1.1.C.2)</p>') }),
  },
  {
    name: 'CSV cell no longer holds the rendered body',
    rule: '4',
    mutate: (c) => ({ ...c, csv: c.csv.replace('Last checked against', 'Last checkd against') }),
  },
  {
    name: 'absolute claim: nothing is shared',
    rule: '5',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', ' Nothing is shared.</p>') }),
  },
  {
    name: 'absolute claim: 100% private',
    rule: '5',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', ' Your data is 100% private.</p>') }),
  },
  {
    name: 'a named subprocessor never reaches the page',
    rule: '6',
    mutate: (c) => ({ ...c, body: c.body.split('Judge0').join('SomeRunner') }),
  },
  {
    name: 'flag claims ad-free while the body says ads run on student pages',
    rule: '7',
    mutate: (c) => ({ ...c, data: { ...c.data, student_pages_ad_free: true } }),
  },
  {
    name: 'unresolvable relative link',
    rule: '8',
    mutate: (c) => ({ ...c, body: c.body.replace('</p>', ' <a href="somewhere-else">x</a></p>') }),
  },
];

function main() {
  const base = baseline();
  const clean = val.runAll(base);
  console.log('MUTATION: student data privacy validator\n');

  //  A harness whose baseline is already red proves nothing about the rules.
  const dirty = clean.filter((r) => !r.ok);
  if (dirty.length) {
    console.log('  [ABORT] baseline is not green, so no mutation result means anything:');
    dirty.forEach((r) => console.log(`          ${r.name}: ${r.detail}`));
    process.exit(1);
  }
  console.log('  baseline green, all 8 rules pass\n');

  let fail = 0;
  for (const c of CASES) {
    const results = val.runAll(c.mutate(base));
    const target = results.find((r) => r.name.startsWith(c.rule + ' '));
    const others = results.filter((r) => !r.ok && r !== target).map((r) => r.name.split(' ')[0]);
    const caught = target && !target.ok;
    if (!caught) fail++;
    console.log(`  [${caught ? 'PASS' : 'FAIL'}] rule ${c.rule} catches: ${c.name}`);
    if (caught) {
      console.log(`         -> ${target.detail}`.slice(0, 160));
      if (others.length) console.log(`         (also red, allowed: ${others.join(', ')})`);
    } else {
      console.log(`         rule ${c.rule} STAYED GREEN. It is hollow.`);
    }
  }

  console.log(fail
    ? `\n${fail} of ${CASES.length} mutations were not caught. The validator is not trustworthy.`
    : `\nall ${CASES.length} mutations caught by the intended rule`);
  process.exit(fail ? 1 : 0);
}

if (require.main === module) main();
