'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the Python port and the JavaScript detector must agree.
//
//  tools/ap-cyber-ced/mojibake.py is a port of lib/mojibake.js, and a port is a
//  copy, and copies drift. This repo already paid for that once: lib/site-crawl.js
//  worked out that the cp1252 flavour exists and added it locally, and the
//  finding never travelled to smoke/encoding-guard.js, which stayed blind for a
//  month while reporting clean.
//
//  A comment saying "keep these in sync" would not have prevented it. This does:
//  both implementations run over the same generated corpus and must return the
//  same hits, the same recovered characters and the same codec attribution. A
//  change to one that is not made in the other goes red here.
//
//  IT MUST NOT SKIP. If python3 is missing this suite FAILS rather than passing
//  quietly. A check that reports success when it did not run is the exact defect
//  this whole change is about, and ubuntu-latest ships python3.
//
//  Run: npm run smoke:mojibakeparity
// -----------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const mojibake = require('../lib/mojibake.js');

const PY_DIR = path.join(__dirname, '..', 'tools', 'ap-cyber-ced');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// -- python3 must exist --------------------------------------------------------
console.log('\nPython availability');
const probe = spawnSync('python3', ['-c', 'print(1)'], { encoding: 'utf8' });
ok('python3 is available, so this suite actually ran',
  probe.status === 0, { status: probe.status, error: probe.error && probe.error.message });
if (probe.status !== 0) {
  console.log('\n  python3 is required. This suite fails rather than skipping, because a');
  console.log('  check that reports success without running is worse than no check.\n');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(1);
}

// -- The shared corpus ---------------------------------------------------------
//  Generated from bytes here, then handed to BOTH implementations as data, so
//  neither side chooses its own test cases.
const CP1252_HIGH = {
  0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030,
  0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D,
  0x8F: 0x008F, 0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
  0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x009D,
  0x9E: 0x017E, 0x9F: 0x0178,
};
const misread = (s, codec) => Array.from(Buffer.from(s, 'utf8'))
  .map((b) => String.fromCodePoint(codec === 'cp1252' && CP1252_HIGH[b] !== undefined ? CP1252_HIGH[b] : b))
  .join('');
const corrupt = (s, codec, depth) => {
  let cur = s;
  for (let n = 0; n < depth; n++) cur = misread(cur, codec);
  return cur;
};

const CODEPOINTS = [
  0x2022, 0x2014, 0x2013, 0x2026, 0x201C, 0x201D, 0x2018, 0x2019, 0x20AC,
  0x2122, 0x2192, 0x2190, 0x25B2, 0x25BC, 0x2500, 0x2713, 0x2605, 0x00B7,
  0x00E9, 0x00F1, 0x00FC, 0x00DF, 0x00B0, 0x00A3, 0x00A9, 0x4E16, 0x00A7,
  0x1F3AF, 0x1F512, 0x1F680, 0x1F4D8,
];

const cases = [];
for (const cp of CODEPOINTS) {
  const original = String.fromCodePoint(cp);
  for (const codec of ['cp1252', 'latin1']) {
    for (const depth of [1, 2]) {
      const damaged = corrupt(original, codec, depth);
      if (damaged === original) continue;
      cases.push({ label: 'U+' + cp.toString(16).toUpperCase() + '/' + codec + '/d' + depth,
        text: 'lead ' + damaged + ' trail' });
    }
  }
}
// Clean text must come back clean from BOTH, or a port that flags everything
// would "agree" on the corrupt cases and look fine.
const clean = [
  'the quick brown fox, 60 MCQ + 1 FRQ',
  'caf' + String.fromCodePoint(0x00E9) + ' na' + String.fromCodePoint(0x00EF) + 've stra'
    + String.fromCodePoint(0x00DF) + 'e se' + String.fromCodePoint(0x00F1) + 'or a'
    + String.fromCodePoint(0x00E7) + String.fromCodePoint(0x00E3) + 'o',
  String.fromCodePoint(0x1F680) + ' ' + String.fromCodePoint(0x2022) + ' '
    + String.fromCodePoint(0x2014) + ' ' + String.fromCodePoint(0x4E16),
];
for (let i = 0; i < clean.length; i++) cases.push({ label: 'clean/' + i, text: clean[i] });

console.log('\nCross language agreement');
ok('the corpus is big enough to mean something', cases.length >= 100, cases.length);

// -- Run both ------------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mojibake-parity-'));
const inFile = path.join(tmp, 'cases.json');
fs.writeFileSync(inFile, JSON.stringify(cases));

const driver = [
  'import json, sys',
  'sys.path.insert(0, sys.argv[1])',
  'import mojibake',
  'cases = json.load(open(sys.argv[2], encoding="utf-8"))',
  'out = []',
  'for c in cases:',
  '    hits = mojibake.analyze(c["text"])',
  '    out.append([[h["index"], h["fixed"], h["codec"], h["width"]] for h in hits])',
  'sys.stdout.write(json.dumps(out))',
].join('\n');

const res = spawnSync('python3', ['-c', driver, PY_DIR, inFile], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
ok('the python port ran without error', res.status === 0, (res.stderr || '').trim().split('\n').slice(-3));

let pyOut = null;
if (res.status === 0) {
  try { pyOut = JSON.parse(res.stdout); } catch (e) { pyOut = null; }
}
ok('the python port returned parseable results', Array.isArray(pyOut) && pyOut.length === cases.length,
  pyOut ? pyOut.length : null);

if (Array.isArray(pyOut) && pyOut.length === cases.length) {
  const mismatches = [];
  let firedBoth = 0;
  for (let i = 0; i < cases.length; i++) {
    const js = mojibake.analyze(cases[i].text).map((h) => [h.index, h.fixed, h.codec, h.width]);
    const py = pyOut[i];
    if (JSON.stringify(js) !== JSON.stringify(py)) {
      mismatches.push({ case: cases[i].label, js, py });
    } else if (js.length) firedBoth += 1;
  }
  ok('every case agrees on index, character, codec and width', mismatches.length === 0, mismatches.slice(0, 6));
  // Agreement on nothing is not agreement.
  ok('and they agreed while BOTH FIRING on the corrupt cases', firedBoth >= 100, firedBoth);
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
