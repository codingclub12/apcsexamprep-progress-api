'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE TREE MUST NOT BE CARRYING A MUTATION.
//
//  Board 369. On 2026-09-18 commit 7d6ed5c shipped lib/assistant/report.js with
//  In-Reply-To renamed to X-Not-In-Reply-To, which is what
//  smoke/assistant-report-routing-mutation.js writes in on purpose. A full suite
//  run was going in the background and `git add -A` took the file mid-flight.
//
//  Section 1 is the check itself. Sections 2 onward are this guard's own
//  mutation tests, because a guard with no mutation behind it may be green
//  because it tests nothing, and that is the failure this whole file is about.
//
//  Run: npm run smoke:mutationleak
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const M = require('../lib/mutation-leak');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log(`  [PASS] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}${extra !== undefined ? '\n           ' + JSON.stringify(extra) : ''}`); }
}

//  ── 1. THE TREE AS IT STANDS ───────────────────────────────────────────────
console.log('\n  The tree is not carrying a live mutation\n');
const r = M.scan();

ok(`every harness was read: ${r.harnesses} found, ${r.counts.pairs} find/repl pair(s)`,
  r.harnesses >= 10 && r.counts.pairs >= 140);
ok(`${r.counts.targets} target file(s) resolved and readable`, r.counts.targets >= 25);
ok('every target a harness names exists', r.counts.missing.length === 0, r.counts.missing);
ok('NO LEAK: no target holds a repl without its find', r.leaks.length === 0,
  r.leaks.map((l) => `${l.file} <- ${l.harness}: ${JSON.stringify(l.repl.slice(0, 70))}`));
ok('NO ORPHAN: every find still appears in one of its own targets', r.orphans.length === 0,
  r.orphans.map((o) => `${o.harness} (${o.kind}): ${JSON.stringify(o.find.slice(0, 70))}`));

console.log(`\n  checkable ${r.counts.checkable}   interpolated ${r.counts.interpolated}`
  + `   deletion ${r.counts.deletion}`);
console.log('  interpolated pairs cannot be matched literally and are reported, not hidden.');
console.log('  deletion pairs are caught by the orphan rule rather than the leak rule.\n');

//  ── 2. THE TWO REAL INCIDENTS, REPLAYED ────────────────────────────────────
//  In memory. Nothing here writes to the tree, which would be an excellent way
//  for this suite to cause the thing it exists to prevent.
console.log('  The two mutations actually loose on 2026-09-18\n');
const onDisk = (p) => { try { return fs.readFileSync(path.join(M.ROOT, p), 'utf8'); } catch (e) { return null; } };
const withDamage = (file, from, to) => (p) => {
  const body = onDisk(p);
  return p === file && body ? body.split(from).join(to) : body;
};

const incident1 = M.scan({ read: withDamage('lib/assistant/report.js',
  "    headers['In-Reply-To'] = head.thread_message_id;",
  "    headers['X-Not-In-Reply-To'] = head.thread_message_id;") });
ok('THE INCIDENT: report.js carrying X-Not-In-Reply-To is caught',
  incident1.leaks.length === 1 && incident1.leaks[0].file === 'lib/assistant/report.js');
ok('and it names the harness that declares it',
  incident1.leaks[0] && incident1.leaks[0].harness === 'smoke/assistant-report-routing-mutation.js');

//  The second one is why the interpolation rule had to be about the QUOTE and
//  not about the characters. Its literals carry ${issueType} inside DOUBLE
//  quotes, so they are plain text and match the file exactly. A draft of this
//  module called them interpolated, skipped them, and passed a damaged tree.
const incident2 = M.scan({ read: withDamage('lib/assistant/morning.js',
  "  return {\n    tier: 'needs_tanner',",
  "  return {\n    tier: 'auto_fix',") });
ok('THE SECOND ONE: morning.js tier needs_tanner to auto_fix is caught',
  incident2.leaks.length === 1 && incident2.leaks[0].file === 'lib/assistant/morning.js');

//  ── 3. THE LEAK RULE IS NOT HOLLOW ─────────────────────────────────────────
console.log('\n  What the leak rule does and does not fire on\n');
const fake = (pairs, targets, bodies) => M.scan({
  harnesses: [{ harness: 'smoke/fake-mutation.js', pairs, targets }],
  read: (p) => (p in bodies ? bodies[p] : null),
});

const PAIR = { find: 'const limit = 10;', repl: 'const limit = 99999;', kind: 'checkable', harness: 'smoke/fake-mutation.js' };
ok('repl present and find absent is a leak',
  fake([PAIR], ['a.js'], { 'a.js': 'x\nconst limit = 99999;\ny' }).leaks.length === 1);
ok('find present and repl absent is clean',
  fake([PAIR], ['a.js'], { 'a.js': 'x\nconst limit = 10;\ny' }).leaks.length === 0);
ok('BOTH present is clean, which is how a harness reading its own source behaves',
  fake([PAIR], ['a.js'], { 'a.js': 'const limit = 10;\nconst limit = 99999;' }).leaks.length === 0);
ok('THE FIND HALF IS NOT DECORATION: repl alone without it would fire here',
  fake([PAIR], ['a.js'], { 'a.js': 'const limit = 10;\nconst limit = 99999;' }).leaks.length === 0
  && 'const limit = 10;\nconst limit = 99999;'.includes(PAIR.repl));
ok('a file outside the harness targets is not scanned, however damaged',
  fake([PAIR], ['a.js'], { 'a.js': 'const limit = 10;', 'b.js': 'const limit = 99999;' }).leaks.length === 0);
ok('an interpolated pair is skipped by the leak rule',
  fake([{ ...PAIR, kind: 'interpolated' }], ['a.js'], { 'a.js': 'const limit = 99999;' }).leaks.length === 0);
ok('a deletion pair is skipped by the leak rule, because the empty string is in everything',
  fake([{ find: 'const limit = 10;', repl: '', kind: 'deletion', harness: 'smoke/fake-mutation.js' }],
    ['a.js'], { 'a.js': 'const limit = 10;' }).leaks.length === 0);

//  ── 4. THE ORPHAN RULE IS NOT HOLLOW ───────────────────────────────────────
console.log('\n  The orphan rule, which is the only signal a deletion leaves\n');
const DEL = { find: 'const limit = 10;', repl: '', kind: 'deletion', harness: 'smoke/fake-mutation.js' };
ok('a deletion mutation left live is caught, since its find is gone',
  fake([DEL], ['a.js'], { 'a.js': 'x\ny' }).orphans.length === 1);
ok('the same pair with the find in place is clean',
  fake([DEL], ['a.js'], { 'a.js': 'const limit = 10;' }).orphans.length === 0);
ok('a find that matches none of its targets is caught even as a substitution',
  fake([PAIR], ['a.js'], { 'a.js': 'nothing like it' }).orphans.length === 1);
ok('an interpolated find is exempt, because its literal is not the file text',
  fake([{ ...PAIR, kind: 'interpolated' }], ['a.js'], { 'a.js': 'nothing like it' }).orphans.length === 0);

//  ── 5. THE LITERAL SCANNER ─────────────────────────────────────────────────
console.log('\n  Reading a JavaScript string literal\n');
const lit = (s) => M.readLiteral(s, 0);
ok('a double quoted literal', lit('"abc"').value === 'abc');
ok('a single quoted literal', lit("'abc'").value === 'abc');
ok('a template literal', lit('`abc`').value === 'abc');
ok('the quote style comes back with it', lit('`abc`').quote === '`');
ok('an escaped newline becomes a real one', lit('"a\\nb"').value === 'a\nb');
ok('an escaped quote of the same kind does not end it', lit('"a\\"b"').value === 'a"b');
ok('an escaped backtick inside a template does not end it', lit('`a\\`b`').value === 'a`b');
ok('a template literal may run over lines', lit('`a\nb`').value === 'a\nb');
ok('a raw newline DOES end a double quoted literal, because it does in JavaScript',
  lit('"a\nb"') === null);
ok('something that is not a quote is not a literal', lit('abc') === null);
ok('an unterminated literal is refused rather than guessed at', lit('"abc') === null);

//  ── 6. THE SELF-CHECK, WHICH IS WHAT KEEPS THIS FROM GOING QUIET ───────────
//  Fixtures on disk in a temp directory, because readHarness reads files.
console.log('\n  A harness this cannot read is an error, never a pass\n');
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutleak-'));
const fixture = (name, body) => { const p = path.join(tmp, name); fs.writeFileSync(p, body); return p; };
const threw = (fn) => { try { fn(); return false; } catch (e) { return e.message; } };

const GOOD = [
  "const FILES = { a: path.join(ROOT, 'lib', 'a.js') };",
  'const CASES = [',
  '  {',
  "    find: 'const limit = 10;',",
  "    repl: 'const limit = 99999;',",
  '  },',
  '];',
].join('\n') + '\n';

ok('a well formed harness reads', (() => {
  const h = M.readHarness(fixture('good-mutation.js', GOOD));
  return h.pairs.length === 1 && h.targets.length === 1 && h.targets[0] === 'lib/a.js';
})());

//  Each of these must throw for ITS OWN reason. A fixture that throws for a
//  different one is telling you the case you meant to write is hollow, which is
//  how the first draft of this section passed: every fixture put find and repl
//  on one line, so they all failed the pair check before reaching the rule
//  under test.
const saying = (fn, phrase) => { const m = threw(fn); return m && m.includes(phrase); };

ok('a declaration this cannot parse throws, and says so, rather than skipping the line',
  saying(() => M.readHarness(fixture('unreadable-mutation.js', [
    "const FILES = { a: path.join(ROOT, 'lib', 'a.js') };",
    'const CASES = [',
    '  {',
    '    find: SOME_CONSTANT,',
    "    repl: 'x',",
    '  },',
    '];',
  ].join('\n'))), 'could not read the literal'));

ok('a harness with no find/repl pair throws, rather than contributing nothing',
  saying(() => M.readHarness(fixture('nopairs-mutation.js', [
    "const FILES = { a: path.join(ROOT, 'lib', 'a.js') };",
    'const CASES = [];',
  ].join('\n'))), 'no find/repl pair'));

ok('a harness naming no target throws, since an unscoped scan invents leaks',
  saying(() => M.readHarness(fixture('notarget-mutation.js', [
    'const CASES = [',
    '  {',
    "    find: 'const limit = 10;',",
    "    repl: 'const limit = 99999;',",
    '  },',
    '];',
  ].join('\n'))), 'no target file'));

ok('a sibling suite path is not mistaken for a target', (() => {
  const h = M.readHarness(fixture('sibling-mutation.js', [
    "const FILES = { a: path.join(ROOT, 'lib', 'a.js') };",
    "const SUITE = path.join(__dirname, 'a-gate.js');",
    'const CASES = [',
    '  {',
    "    find: 'const limit = 10;',",
    "    repl: 'const limit = 99999;',",
    '  },',
    '];',
  ].join('\n')));
  return h.targets.length === 1 && h.targets[0] === 'lib/a.js';
})());

ok('the ../ form IS a target, which is how css-vars names its one file', (() => {
  const h = M.readHarness(fixture('parent-mutation.js', [
    "const SRC = path.join(__dirname, '..', 'lib', 'css-vars.js');",
    'const CASES = [',
    '  {',
    "    find: 'const limit = 10;',",
    "    repl: 'const limit = 99999;',",
    '  },',
    '];',
  ].join('\n')));
  return h.targets.length === 1 && h.targets[0] === 'lib/css-vars.js';
})());

//  The count check, its own case because it is the thing standing between this
//  suite and a scanner that has quietly stopped working. A TEMPLATE literal is
//  what it takes: it parses cleanly and runs over the two declaration lines
//  below it, so the line count sees four sites and the scanner reads two. The
//  first draft used an unterminated single quoted literal instead, which throws
//  at the read rather than at the count, and the saying() helper caught that
//  the case was testing the wrong rule.
ok('THE TWO DERIVATIONS MUST AGREE: a literal that swallows a declaration is caught',
  saying(() => M.readHarness(fixture('count-mutation.js', [
    "const FILES = { a: path.join(ROOT, 'lib', 'a.js') };",
    'const CASES = [',
    '  {',
    "    find: 'one',",
    '    repl: `two',
    "    find: 'three',",
    "    repl: 'four',`",
    '  },',
    '];',
  ].join('\n'))), 'must agree'));

//  And the floor, which only means anything on the real corpus.
ok('THE FLOOR IS NOT DECORATION: a corpus gone mostly unreadable is refused',
  saying(() => M.scan({
    floor: true,
    harnesses: [{ harness: 'smoke/fake-mutation.js', targets: ['a.js'],
      pairs: [{ ...PAIR, kind: 'interpolated' }, { ...PAIR, kind: 'interpolated' }, PAIR] }],
    read: () => 'nothing',
  }), 'checkable by literal match'));
ok('and it does not fire on a healthy ratio',
  !threw(() => M.scan({
    floor: true,
    harnesses: [{ harness: 'smoke/fake-mutation.js', targets: ['a.js'],
      pairs: [PAIR, PAIR, { ...PAIR, kind: 'interpolated' }] }],
    read: () => 'const limit = 10;',
  })));

ok('classify calls a backtick literal holding a placeholder interpolated',
  M.classify({ value: 'a ${x} b', quote: '`' }, { value: 'c', quote: "'" }) === 'interpolated');
ok('and a DOUBLE quoted one holding the same characters checkable, which the first draft got wrong',
  M.classify({ value: 'a ${x} b', quote: '"' }, { value: 'c', quote: "'" }) === 'checkable');
ok('an empty repl is a deletion',
  M.classify({ value: 'a', quote: "'" }, { value: '', quote: "'" }) === 'deletion');

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* best effort */ }

console.log(`\n  ${fail === 0 ? 'OK' : 'FAILED'} - ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
