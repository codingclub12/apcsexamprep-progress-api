#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the leaderboard name and value guards. Break each rule
//  on purpose, one at a time, and require smoke/game-name-sanitize.js to go red
//  FOR THAT RULE. A green mutation run is a FAILED check, and here that is the
//  exit code.
//
//  This repo has shipped two hollow guards and a third that reported its own
//  tree clean while four tracked files were corrupted, so a suite that passes
//  is not evidence until something has watched it fail. The rules defended:
//
//   1. the write path cleans a submitted name
//   2. the read path cleans a name that was already in the table
//   3. a non-numeric value is refused rather than coerced
//   4. the cleaning is utils.sanitize's, not a private copy
//   5. the read path pins the value to a number
//
//  Rule 4 is the one worth having. The defect being fixed WAS a private copy of
//  utils.sanitize that had drifted, so a fix that quietly grows a second copy
//  has reintroduced the bug in a shape the other four mutations cannot see.
//  Breaking utils.sanitize must break this suite; if it does not, the route is
//  not actually going through the one door.
//
//  Run: npm run smoke:gamenamemutation
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILES = {
  game: path.join(ROOT, 'routes', 'game.js'),
  utils: path.join(ROOT, 'utils.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 600) : '')); }
};

const SUITE = path.join(__dirname, 'game-name-sanitize.js');
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()), out };
}

const MUTATIONS = [
  {
    //  The defect itself, restored. This is the code that was live on
    //  2026-09-22: control characters stripped, tag characters not.
    name: 'THE ORIGINAL BUG: sanitizeName goes back to stripping control characters only',
    file: 'game',
    find: '  let s = sanitize(raw.slice(0, 256), 256);',
    repl: "  let s = raw.replace(/[\\x00-\\x1f\\x7f]/g, '');",
    must: ['1.1 a self-contained 16 character payload is not stored as markup'],
  },
  {
    //  Write side fixed, read side not. Every row already in the table stays
    //  live, and section 2 is the only thing that notices.
    name: 'the read path stops cleaning, so rows written before the fix stay poisoned',
    file: 'game',
    find: '      name: cleanStoredName(r.name),',
    repl: '      name: r.name,',
    must: ['2.1 the leaderboard serves no tag character'],
  },
  {
    //  Number([]) is 0 and Number(true) is 1, so coercion silently accepts
    //  types no real client sends.
    name: 'the value guard goes back to coercing instead of refusing',
    file: 'game',
    find: `    const numeric = typeof rawValue === 'number'
      || (typeof rawValue === 'string' && rawValue.trim() !== '' && Number.isFinite(Number(rawValue)));
    const value = numeric ? Number(rawValue) : NaN;`,
    repl: '    const value = Number(rawValue);',
    must: ['3.1 every non-numeric value is refused with a 400'],
  },
  {
    //  The rule that keeps the fix from rotting. If the route has grown its own
    //  copy of the cleaning again, breaking the shared one changes nothing here.
    name: 'THE ONE DOOR: utils.sanitize stops stripping tag characters',
    file: 'utils',
    find: '    .replace(TAG_CHARS, \'\')\n',
    repl: '',
    must: [
      '1.1 a self-contained 16 character payload is not stored as markup',
      '2.1 the leaderboard serves no tag character',
    ],
  },
  {
    //  SQLite stores text it cannot convert in a REAL column, and MAX() ranks
    //  text above every number. Without Number() that string is served as a
    //  string, straight into a fmt() that returns its input on both branches.
    name: 'the read path stops pinning the value to a number',
    file: 'game',
    find: '      value: Number(r.best),',
    repl: '      value: r.best,',
    must: ['3.5 no value the leaderboard serves is a string'],
  },
];

console.log('\n  MUTATION BATTERY: leaderboard name and value guards\n');

const base = runSuite();
ok('the suite is green before anything is mutated', base.code === 0, base.failed.slice(0, 4));
const names = [...base.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim());
for (const m of MUTATIONS) for (const w of m.must) {
  ok(`the suite has an assertion "${w.slice(0, 52)}"`, names.some((n) => n.startsWith(w)), w);
}

for (const m of MUTATIONS) {
  console.log(`\n  MUTATION: ${m.name}`);
  const p = FILES[m.file];
  const src = ORIGINAL[m.file];
  const n = src.split(m.find).length - 1;
  ok('  the patch target is present exactly once', n === 1, { found: n, file: m.file });
  if (n !== 1) continue;
  fs.writeFileSync(p, src.replace(m.find, m.repl));
  const r = runSuite();
  restore();
  ok('  the suite goes RED', r.code !== 0, { code: r.code, failed: r.failed.slice(0, 4) });
  ok('  it failed an assertion rather than crashing', r.failed.length > 0, { tail: r.out.slice(-400) });
  for (const w of m.must) {
    ok(`  it breaks "${w.slice(0, 52)}"`, r.failed.some((f) => f.startsWith(w)),
      { expected: w, actually_failed: r.failed.slice(0, 6) });
  }
}

restore();
let clean = true;
for (const [k, p] of Object.entries(FILES)) if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) clean = false;
ok('every mutated file is byte-identical to how it started', clean);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
