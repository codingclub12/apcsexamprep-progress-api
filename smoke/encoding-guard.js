'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: text encoding guard.
//
//  WHY THIS EXISTS: on 2026-08-07 every non-ASCII character in five admin pages
//  was silently rewritten with its UTF-8 bytes read as a single-byte codec and
//  re-encoded. 2202 characters became mojibake. The dashboard delta badges
//  rendered a box and two digits instead of a triangle for hours, and nothing
//  caught it, because re-encoded text is still perfectly valid UTF-8. It parses,
//  it lints, it serves, every other suite passes. The only thing wrong with it
//  is that it means the wrong character, which no other check looks at.
//
//  WHAT CHANGED ON 2026-09-03, and why this suite grew a derivation section.
//  It used to carry its own detector: leads {U+00C2, U+00C3, U+00E2}, widths 3
//  and 2, reversed through latin-1 only. It was green, and it was blind to both
//  halves of the corruption reported on a live page:
//
//    the cp1252 bullet   U+00E2 U+20AC U+00A2      MISSED. Two of those three
//                                                  code points are above 0xFF,
//                                                  so a latin-1 reversal cannot
//                                                  produce them and the round
//                                                  trip rejected the run.
//    the cp1252 emoji    U+00F0 U+0178 U+017D      MISSED. A 4-byte character
//                        U+00AF                    corrupts into FOUR, widths
//                                                  stopped at 3, and U+00F0 was
//                                                  not even in the lead set.
//
//  Both are the first two assertions below. The detector moved to
//  lib/mojibake.js, now the only place in this repo with an opinion about what
//  mojibake looks like. There were three, and lib/site-crawl.js had already
//  worked out the cp1252 half without it ever reaching this file.
//
//  HOW THE FIXTURES ARE BUILT, because it is the reason the mutation checks in
//  deploy-gates/2026-09-03-mojibake-detector.json mean anything. Each corrupted
//  sample is assembled HERE from the real UTF-8 bytes of the character it stands
//  for, through a cp1252 table written in this file in the opposite direction
//  from the module's. Nothing in a fixture comes from the code under test, so
//  mutating the module's table cannot corrupt the fixture and the detector
//  together and leave the suite green. Every non-ASCII character in this file is
//  written as an escape, so the file cannot itself be mojibaked.
//
//  Run: npm run smoke:encoding
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const moji = require('../lib/mojibake.js');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', 'build']);

//  .txt and .py were added on 2026-09-03 and were not a formality: the first
//  scan that included them found 65 corrupted runs in the AP Cybersecurity CED
//  extract, the document docs/ap-cyber-unit1-ced-realignment.md names as the
//  authority for Unit 1, and 3 more in the importer that checks it.
const SCAN_EXT = new Set(['.html', '.js', '.md', '.json', '.css', '.yml', '.yaml',
  '.txt', '.py', '.csv', '.liquid']);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};
const cps = (s) => Array.from(s)
  .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
const ch = (cp) => String.fromCodePoint(cp);

//  The corrupter lives in smoke/mojibake-fixtures.js, written in the opposite
//  direction from lib/mojibake.js so a fixture never comes from the code under
//  test. See that file for why there is exactly one copy of it.
const fx = require('./mojibake-fixtures.js');
const { CP1252_DECODE, utf8, cp1252Once, latin1Once, corruptAgain } = fx;

// -- 1. The rules are DERIVED, so assert the derivation ----------------------
//  A detector built from a list of observed patterns is only ever as good as the
//  samples somebody happened to see. The drafts for this work carried a rule
//  built from a DOUBLY corrupted sample, which would have shipped a guard blind
//  to the single-pass form actually reported. These assertions keep the range
//  derived from UTF-8 rather than drifting back into a list of samples.
console.log('\nDerivation: the lead range comes from UTF-8, not from samples');
ok('the lead range is 0xC2 to 0xF4, the legal UTF-8 lead bytes',
  moji.LEAD_MIN === 0xC2 && moji.LEAD_MAX === 0xF4, [moji.LEAD_MIN, moji.LEAD_MAX]);
ok('a lead byte states the run length, and 2, 3 and 4 are all reachable',
  moji.runLength(0xC3) === 2 && moji.runLength(0xDF) === 2
  && moji.runLength(0xE0) === 3 && moji.runLength(0xEF) === 3
  && moji.runLength(0xF0) === 4 && moji.runLength(0xF4) === 4);
ok('width 4 is reachable, which is the entire emoji case', moji.runLength(0xF0) === 4);
ok('cp1252 contributes exactly its 27 defined high positions',
  Object.keys(moji.CP1252_HIGH).length === 27, Object.keys(moji.CP1252_HIGH).length);
ok('this suite and the module agree on all 27, read in opposite directions',
  Object.keys(CP1252_DECODE).length === 27
  && Object.entries(CP1252_DECODE).every(([b, cp]) => moji.byteOf(cp) === Number(b)),
  Object.entries(CP1252_DECODE).filter(([b, cp]) => moji.byteOf(cp) !== Number(b)));
ok('every cp1252 high character sits above 0xFF, so it cannot collide with latin-1',
  Object.values(CP1252_DECODE).every((cp) => cp > 0xFF));
ok('the euro sign maps back to 0x80, which a latin-1 reversal cannot express',
  moji.byteOf(0x20AC) === 0x80, moji.byteOf(0x20AC));
ok('latin-1 identity still holds for the bytes cp1252 leaves alone',
  moji.byteOf(0x00E2) === 0xE2 && moji.byteOf(0x00C3) === 0xC3 && moji.byteOf(0x00F0) === 0xF0);
ok('a character neither codec can produce has no byte at all',
  moji.byteOf(0x25B2) === -1 && moji.byteOf(0x1F3AF) === -1);
ok('a cp1252 high character can never START a run, so a real bullet is safe',
  moji.byteOf(0x2022) === 0x95 && moji.byteOf(0x2022) < moji.LEAD_MIN);

// -- 2. The detector must fire on known-bad input ----------------------------
//  A guard that cannot fail on a corrupted fixture is decoration. The first two
//  are the forms reported on a live page, and the two the previous detector
//  missed. Each fixture is built from the bytes of the character it stands for,
//  so the derivation is executed rather than asserted in a comment.
console.log('\nDetector self-test: the reported live failures first');
const CASES = [
  ['THE cp1252 BULLET, reported live',                  cp1252Once(0x2022), 0x2022],
  ['THE cp1252 EMOJI, reported live',                   cp1252Once(0x1F3AF), 0x1F3AF],
  ['the cp1252 right single quote',                     cp1252Once(0x2019), 0x2019],
  ['the cp1252 em dash',                                cp1252Once(0x2014), 0x2014],
  ['the cp1252 ellipsis',                               cp1252Once(0x2026), 0x2026],
  ['the cp1252 left double quote',                      cp1252Once(0x201C), 0x201C],
  ['the latin-1 bullet',                                latin1Once(0x2022), 0x2022],
  ['the latin-1 emoji',                                 latin1Once(0x1F3AF), 0x1F3AF],
  ['the latin-1 up triangle, the 2026-08-07 incident',  latin1Once(0x25B2), 0x25B2],
  ['the latin-1 down triangle',                         latin1Once(0x25BC), 0x25BC],
  ['the latin-1 right arrow',                           latin1Once(0x2192), 0x2192],
  ['the latin-1 box drawing dash',                      latin1Once(0x2500), 0x2500],
  ['the latin-1 check mark',                            latin1Once(0x2713), 0x2713],
  ['the right quote, 10 of them in the CED extract',    latin1Once(0x2019), 0x2019],
  ['the en space, 28 of them in the CED extract',       latin1Once(0x2002), 0x2002],
  ['the section sign, 12 of them in the CED extract',   latin1Once(0x00A7), 0x00A7],
  ['the middle dot, 13 of them in the CED extract',     latin1Once(0x00B7), 0x00B7],
  ['the em dash, 2 of them in the CED extract',         latin1Once(0x2014), 0x2014],
  ['the no-break space',                                latin1Once(0x00A0), 0x00A0],
  ['an accented letter',                                latin1Once(0x00E9), 0x00E9],
];
for (const [label, corrupted, wantCp] of CASES) {
  const hits = moji.detect('prefix ' + corrupted + ' suffix');
  ok('detects ' + label, hits.length === 1 && hits[0].fixed === ch(wantCp),
    { corrupted: cps(corrupted), got: hits.map((h) => cps(h.fixed)), want: cps(ch(wantCp)) });
}

//  The fixtures are only worth something if each really is a corrupted form of
//  the character it claims. Three things to rule out: a fixture identical to its
//  own answer proves nothing, a fixture whose byte round trip does not close was
//  mistyped, and a fixture that did not GROW is not mojibake at all.
console.log('\nEvery fixture really is a corrupted form of its own answer');
for (const [label, corrupted, wantCp] of CASES) {
  const bytes = Array.from(corrupted).map((c) => moji.byteOf(c.codePointAt(0)));
  const closes = Buffer.from(bytes).toString('utf8') === ch(wantCp);
  const differs = corrupted !== ch(wantCp);
  const grew = Array.from(corrupted).length === utf8(wantCp).length;
  ok('  ' + label, closes && differs && grew,
    { corrupted: cps(corrupted), bytes: bytes.map((b) => b.toString(16)) });
}

// -- 3. Depth: a rule written from a doubly corrupted sample sees neither -----
//  This is the finding that prompted the rewrite. The drafts for this work
//  contained the DOUBLY corrupted bullet and emoji, and a rule matching those
//  literally is blind to the single-pass form on the live page. Reversibility
//  makes depth a non-question: both are detected, and repair says which is which.
console.log('\nCorruption depth, both directions');
{
  const bullet1 = cp1252Once(0x2022);
  const emoji1 = cp1252Once(0x1F3AF);
  const bullet2 = corruptAgain(bullet1);
  const emoji2 = corruptAgain(emoji1);
  ok('the doubly corrupted bullet is 7 characters, not 3',
    Array.from(bullet2).length === 7, cps(bullet2));
  ok('the doubly corrupted emoji is 8 characters, not 4',
    Array.from(emoji2).length === 8, cps(emoji2));
  ok('the doubly corrupted bullet is detected', moji.detect(bullet2).length > 0);
  ok('the doubly corrupted emoji is detected', moji.detect(emoji2).length > 0);
  ok('repair reports the bullet as depth 2 and recovers it',
    moji.repair(bullet2).passes === 2 && moji.repair(bullet2).text === ch(0x2022),
    { passes: moji.repair(bullet2).passes, text: cps(moji.repair(bullet2).text) });
  ok('repair reports the emoji as depth 2 and recovers it',
    moji.repair(emoji2).passes === 2 && moji.repair(emoji2).text === ch(0x1F3AF),
    { passes: moji.repair(emoji2).passes, text: cps(moji.repair(emoji2).text) });
  ok('single-pass text reports depth 1, so the two are told apart',
    moji.repair(bullet1).passes === 1);
  ok('clean text reports depth 0', moji.repair('a clean line').passes === 0);
  //  THE POINT OF THE WHOLE EXERCISE, stated as an assertion: the two depths do
  //  not even share a first character, so a rule written from one cannot match
  //  the other. That is what would have shipped.
  ok('the two depths share no leading character, which is why a literal rule fails',
    Array.from(bullet1)[0] !== Array.from(bullet2)[0]
    && Array.from(emoji1)[0] !== Array.from(emoji2)[0],
    { depth1: cps(bullet1).split(' ')[0], depth2: cps(bullet2).split(' ')[0] });
}

// -- 4. The detector must NOT fire on correct text ----------------------------
//  Equally important: a guard that flags healthy text gets turned off within a
//  day. The old suite checked four strings. This one checks the scripts a store
//  selling into international schools can actually receive, because the lead
//  range widened to every legal UTF-8 lead byte and that is where the cost of
//  widening shows up.
console.log('\nFalse-positive check');
const CLEAN = [
  ['plain ascii', 'the quick brown fox, 100% of it'],
  ['ascii html with entities', '<p>a &amp; b &lt; c</p>'],
  ['a java generic, because this store teaches java', 'Map<String, List<Integer>> m'],
  ['the correct characters', '\u25B2 \u25BC \u2192 \u2190 \u2500 \u00B7 \u2026 \u2713 \u2022'],
  ['correct quotes and dashes', '\u201C q \u201D \u2018 s \u2019 \u2013 \u2014'],
  ['raw uncorrupted emoji', '\u{1F3AF} \u{1F512} \u{1F4CA}'],
  ['french', 'caf\u00E9 na\u00EFve \u00E2me r\u00F4le \u00E0 l\u2019\u00E9cole o\u00F9'],
  ['french guillemets around a hard space', '\u00AB mot \u00BB'],
  ['spanish', '\u00BFQu\u00E9 a\u00F1o? \u00A1Ma\u00F1ana, se\u00F1or!'],
  ['german', 'Stra\u00DFe Gr\u00F6\u00DFe \u00DCber \u00C4pfel'],
  ['portuguese', 'S\u00E3o Paulo, cora\u00E7\u00E3o, \u00C1gua, Ol\u00E1'],
  ['turkish', '\u0130stanbul, \u00F6zg\u00FCr, \u015Fey'],
  ['icelandic', '\u00FEing, \u00F0a\u00F0, \u00C6gir, \u00D3lafur'],
  ['vietnamese', '\u0110\u00E0 N\u1EB5ng, Vi\u1EC7t Nam, ph\u1EDF'],
  ['currency and math', '\u00B15\u00B0, \u00A320, \u20AC30, \u00A9 2026, 3\u00D74'],
  ['nordic words with accented capitals', '\u00C5rhus, \u00D8sterbro, \u00C4lvsj\u00F6'],
];
for (const [label, text] of CLEAN) {
  const hits = moji.detect(text);
  ok('no false positive on ' + label, hits.length === 0,
    hits.map((h) => cps(h.run) + ' -> ' + cps(h.fixed)));
}

// -- 5. The second tier, and why detect and repair disagree on purpose -------
//  Widening the lead range to every legal UTF-8 lead byte buys the emoji case
//  and costs one class of false positive, found by scanning the theme repository
//  rather than by reasoning about it: Shopify's own Nordic locale files carry the
//  sort labels A-ring en-dash A and O-diaeresis en-dash A, which reverse cleanly
//  to U+0156 and U+0596. They are real text, and nothing structural separates
//  them from real mojibake, because structurally they ARE the same shape. So the
//  discriminator is the character recovered, and a run recovering something this
//  store's content cannot contain is a SUSPECT: reported, never fatal.
console.log('\nThe suspect tier: reported, never fatal');
{
  const nordic = 'Alfabetisk, \u00C5\u2013A';
  const swedish = 'Alfabetiskt, \u00D6\u2013A';
  ok('the Norwegian sort label does not fail a build', moji.detect(nordic).length === 0);
  ok('the Swedish sort label does not fail a build', moji.detect(swedish).length === 0);
  ok('but it is reported as a suspect rather than silently dropped',
    moji.scan(nordic).suspects.length === 1 && moji.scan(swedish).suspects.length === 1);
  ok('the suspect names the character it would have recovered',
    moji.scan(nordic).suspects[0].fixed === ch(0x0156),
    cps(moji.scan(nordic).suspects[0].fixed));
  ok('a plausible-only repair leaves the label intact',
    moji.repair(nordic, { plausibleOnly: true }).text === nordic);
  //  This asymmetry is the one thing in the module a reader is likely to call a
  //  bug, so the suite states it as intent. repair is never automatic.
  ok('an unrestricted repair WOULD damage it, which is why repair is never automatic',
    moji.repair(nordic).text !== nordic);
  ok('a bullet and an emoji are plausible, Latin Extended-A is not',
    moji.plausible(ch(0x2022)) && moji.plausible(ch(0x1F3AF)) && !moji.plausible(ch(0x0156)));
  //  And the tier must not have quietly swallowed the case this change is about.
  ok('the tier does NOT downgrade the reported live emoji to a suspect',
    moji.scan(cp1252Once(0x1F3AF)).hits.length === 1
    && moji.scan(cp1252Once(0x1F3AF)).suspects.length === 0);
}

// -- 6. The repository itself must be clean ----------------------------------
console.log('\nRepository scan');
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

//  THERE IS NO SKIP LIST ANY MORE. The old one exempted this file, because its
//  fixtures were literal corrupted characters. Building them from bytes instead
//  costs nothing and lets the guard police the file that polices everything
//  else. tools/ap-cyber-ced/verify_import.py carried the same exemption in a
//  comment that was not true: its "escapes" were literal characters, and it went
//  unflagged only because .py was not scanned.
const files = walk(ROOT, []);
const offenders = [];
const suspected = [];
let scanned = 0;
for (const file of files) {
  let text;
  try {
    const raw = fs.readFileSync(file);
    //  Anything that is not valid UTF-8 is a different problem; skip it here
    //  rather than report a misleading mojibake hit.
    text = raw.toString('utf8');
    if (Buffer.compare(Buffer.from(text, 'utf8'), raw) !== 0) continue;
  } catch (e) {
    continue;
  }
  scanned += 1;
  const found = moji.scan(text);
  const rel = path.relative(ROOT, file);
  if (found.hits.length) {
    offenders.push({ file: rel, hits: found.hits, depth: moji.repair(text).passes,
      line: moji.lineOf(text, found.hits[0].index) });
  }
  if (found.suspects.length) {
    suspected.push({ file: rel, suspects: found.suspects,
      line: moji.lineOf(text, found.suspects[0].index) });
  }
}

ok('scanned a meaningful number of files', scanned > 20, scanned);
ok('this file is itself in the scan, so the guard polices its own source',
  files.some((f) => path.basename(f) === 'encoding-guard.js'));
ok('the CED extract is in the scan, which is how its 65 runs were found',
  files.some((f) => f.endsWith('CED-UNIT1-EXTRACT.txt')));
ok('no mojibake anywhere in the repository', offenders.length === 0);

if (offenders.length) {
  console.log('\n  Mojibake found. These characters mean something other than what');
  console.log('  they render as. Repair them rather than deleting them:\n');
  for (const o of offenders) {
    console.log('    ' + o.file + ':' + o.line + '  ' + o.hits.length
      + ' run(s), depth ' + o.depth + '  -> ' + moji.summarize(o.hits));
  }
  console.log('\n  Each is a character whose UTF-8 bytes were read as cp1252 or latin-1');
  console.log('  and re-encoded. Reverse it with lib/mojibake.js repair. Do not');
  console.log('  retype the file and do not delete the character.\n');
}

//  Suspects print whether or not the suite passes. They are the runs the second
//  tier declined to fail a build on, and reading them is the only way anyone
//  finds out the tier is wrong.
if (suspected.length) {
  console.log('\n  NOTE, not a failure: ' + suspected.length + ' file(s) hold a run that');
  console.log('  reverses cleanly but recovers a character this store should not have.');
  console.log('  Legitimate Nordic sort labels look exactly like this. Widen PLAUSIBLE');
  console.log('  in lib/mojibake.js if one of these turns out to be real corruption:\n');
  for (const s of suspected.slice(0, 10)) {
    console.log('    ' + s.file + ':' + s.line + '  ' + s.suspects.length
      + ' run(s) -> ' + moji.summarize(s.suspects));
  }
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
