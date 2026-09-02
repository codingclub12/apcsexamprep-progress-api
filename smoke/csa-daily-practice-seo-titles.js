'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the CSA daily-practice SEO title repair.
//
//  The fixture beside this file is the LIVE before-state: one row per article,
//  the handle and the <title> the storefront actually served on 2026-09-02. It
//  is checked in rather than fetched, so the suite is offline and so that the
//  before-state survives the change that removes it.
//
//  Two things are being defended here and they pull in opposite directions.
//  The repair must reach every malformed title, and it must not touch anything
//  else. Section 2 is the second one, and it is the section to read first: this
//  pass is allowed to restore an internal capital that title-casing erased, and
//  is NOT allowed to have an opinion about whether "Substring" should be
//  lowercase. A pass that starts editing prose is a pass nobody can review.
//
//  Run: npm run smoke:seotitles
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const m = require('../scripts/csa-daily-practice-seo-titles');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const THEME = ' | APCSExamPrep.com';
const row = (handle, stored) => ({ handle, live: stored + THEME });
const one = (handle, stored) => {
  const r = m.build([row(handle, stored)]);
  return { after: (r.repairs[0] || r.additions[0] || {}).after, problems: r.problems };
};

console.log('\n1. Each of the four defects is repaired');
{
  //  Defect 1: unitPart carried no leading space, so CSA and Unit ran together.
  const a = one('ap-csa-u1-c1-day-1-declaring-variables',
    'AP CSAUnit 1 Day 1: Declaring Variables | Daily Practice');
  ok('AP CSAUnit becomes AP CSA Unit',
    a.after === 'AP CSA Unit 1 Day 1: Declaring Variables | Daily Practice', a);

  //  Defect 2: the generator's unit regex missed the undashed handles, so these
  //  84 lost the unit entirely. It is recovered from the handle.
  const b = one('unit2-cycle2-day-10-iteration-accumulation',
    'AP CSA Day 10: Iteration Accumulation | Daily Practice');
  ok('a missing unit number is recovered from the handle',
    b.after === 'AP CSA Unit 2 Day 10: Iteration Accumulation | Daily Practice', b);

  //  Defect 3: the 70-character slice landed inside the brand suffix.
  const c = one('unit-1-cycle-2-day-14-indexof-substring-computed-indices',
    'AP CSAUnit 1 Day 14: Indexof Substring Computed Indices | Daily Practi');
  ok('a suffix cut mid word is restored whole, and the topic is untouched',
    c.after === 'AP CSA Unit 1 Day 14: indexOf Substring Computed Indices | Daily Practice', c);
  for (const cut of [' | Daily', ' | Daily P', ' | Daily Pr', ' | Daily Prac', ' | Daily Practic']) {
    const r = one('ap-csa-u1-c1-day-1-declaring-variables',
      'AP CSAUnit 1 Day 1: Declaring Variables' + cut);
    ok('  restored from ' + JSON.stringify(cut),
      r.after === 'AP CSA Unit 1 Day 1: Declaring Variables | Daily Practice', r);
  }

  //  Defect 4: title-casing a slug erases a Java name's internal capital.
  for (const [before, after] of [
    ['Compareto Ordering', 'compareTo Ordering'],
    ['Substring Indexof', 'Substring indexOf'],
    ['Tostring Override', 'toString Override'],
    ['String Touppercase', 'String toUpperCase'],
    ['Arraylist Basics', 'ArrayList Basics'],
  ]) {
    ok('  ' + before + ' -> ' + after, m.repairTopic(before) === after, m.repairTopic(before));
  }
}

console.log('\n2. THE BOUNDARY: what the pass is not allowed to touch');
{
  //  A word that title-cases without losing a capital is a style opinion, not a
  //  defect, and the site itself is inconsistent about it: one page heading
  //  writes "compareTo() for String Ordering" and another writes "substring and
  //  indexOf". Leave the opinion alone; repair only the lost capital.
  for (const keep of ['Substring Pieces Concatenation', 'Math Random Analysis',
    'Equals Vs Sequential', 'String Length String Concatenation',
    'Static Method Calling', 'Object Class', 'Super Call', 'This Keyword',
    'Array Vs Array', 'Set Get', 'Add With Index']) {
    ok('  untouched: ' + keep, m.repairTopic(keep) === keep, m.repairTopic(keep));
  }
  //  substring, equals, length, add, remove, get, set and size are deliberately
  //  absent from JAVA_NAMES for exactly this reason.
  for (const absent of ['substring', 'equals', 'length', 'add', 'remove', 'get', 'set', 'size']) {
    ok('  ' + absent + ' is not in JAVA_NAMES',
      !m.JAVA_NAMES.some((j) => j.toLowerCase() === absent), absent);
  }
}

console.log('\n3. Every declared substitution has a live article behind it, and is reached');
{
  const corpus = readFixture();
  const built = m.build(corpus);
  const after = built.repairs.concat(built.additions).map((r) => r.after).join('\n');
  const before = corpus.map((r) => r.live).join('\n');
  for (const [from, to] of m.PHRASES) {
    ok(`  ${JSON.stringify(from)} occurs in the live corpus`, before.includes(from), from);
    ok(`  ${JSON.stringify(to)} reaches the repaired corpus`, after.includes(to), to);
  }
  for (const j of m.JAVA_NAMES) {
    const used = new RegExp('\\b' + j + '\\b', 'i').test(before);
    if (used) ok(`  ${j} is repaired everywhere it occurs`, after.includes(j), j);
  }
}

console.log('\n4. The guards refuse rather than guessing');
{
  //  The topic must rederive from the handle by a SECOND implementation. That
  //  is what proves the 70-character slice took only the brand suffix, and it
  //  is what catches a handle and a title that have drifted apart.
  const drift = m.build([row('ap-csa-u1-c1-day-1-declaring-variables',
    'AP CSAUnit 1 Day 1: Declaring Something Else | Daily Practice')]);
  ok('a topic that does not rederive from the handle is REFUSED',
    drift.repairs.length === 0 && drift.problems.length === 1
    && /does not rederive/.test(drift.problems[0]), drift.problems);

  //  A truncated TOPIC, rather than a truncated suffix, must also be refused:
  //  restoring the brand onto a cut topic would publish a cut topic.
  const cutTopic = m.build([row('unit-1-cycle-2-day-16-repeated-method-calls-mutate-object-state',
    'AP CSAUnit 1 Day 16: Repeated Method Calls Mutate Object Sta | Daily')]);
  ok('a topic cut short of the handle is REFUSED, not brand-restored',
    cutTopic.repairs.length === 0 && /does not rederive/.test(cutTopic.problems[0] || ''),
    cutTopic.problems);

  const shape = m.build([row('ap-csa-u1-c1-day-1-declaring-variables', 'Declaring Variables')]);
  ok('an unrecognised title shape is REFUSED',
    shape.repairs.length === 0 && shape.problems.length === 1, shape.problems);

  const day = m.build([row('ap-csa-u1-c1-day-1-declaring-variables',
    'AP CSAUnit 1 Day 2: Declaring Variables | Daily Practice')]);
  ok('a day number that disagrees with the handle is REFUSED',
    day.repairs.length === 0 && /says day 2, handle says 1/.test(day.problems[0] || ''), day.problems);

  const noUnit = m.build([row('csa-day-10-iteration-accumulation',
    'AP CSA Day 10: Iteration Accumulation | Daily Practice')]);
  ok('a missing unit with nothing in the handle to recover it is REFUSED',
    noUnit.repairs.length === 0 && /no unit/.test(noUnit.problems[0] || ''), noUnit.problems);

  const noTheme = m.build([{ handle: 'ap-csa-u1-c1-day-1-declaring-variables', live: 'whatever' }]);
  ok('a live title without the theme suffix is REFUSED',
    noTheme.repairs.length === 0 && /theme suffix/.test(noTheme.problems[0] || ''), noTheme.problems);
}

console.log('\n5. The two guards that would go hollow first, tested directly');
{
  //  onlyDeclaredEdits is what stops a future map entry from quietly rewriting
  //  prose. Mutating it to always agree has to turn this red.
  ok('onlyDeclaredEdits accepts a declared substitution',
    m.onlyDeclaredEdits('Compareto Ordering', 'compareTo Ordering'));
  ok('onlyDeclaredEdits accepts a declared phrase',
    m.onlyDeclaredEdits('Iii Wrapper Behavior', 'I/II/III Wrapper Behavior'));
  ok('onlyDeclaredEdits REJECTS a word that merely changed',
    !m.onlyDeclaredEdits('Array Basics', 'Array Basic'));
  ok('onlyDeclaredEdits REJECTS a word that was dropped',
    !m.onlyDeclaredEdits('Nested Loop Pattern', 'Nested Pattern'));
  ok('onlyDeclaredEdits REJECTS a word that was added',
    !m.onlyDeclaredEdits('Linear Search', 'Fast Linear Search'));

  //  manglings is the last line: it reads the OUTPUT and fails if a Java name
  //  is still title-cased there.
  ok('manglings finds a title-cased Java name',
    m.manglings('AP CSA Unit 4 Day 10: Arraylist Basics').join() === 'Arraylist');
  ok('manglings finds nothing in a repaired title',
    m.manglings('AP CSA Unit 4 Day 10: ArrayList Basics').length === 0);
  ok('manglings does not fire on an ordinary word',
    m.manglings('AP CSA Unit 1 Day 14: Substring Pieces Concatenation').length === 0);
}

console.log('\n6. The whole live corpus, 429 articles as the storefront served them');
{
  const corpus = readFixture();
  const { repairs, additions, problems } = m.build(corpus);
  ok('429 rows read', corpus.length === 429, corpus.length);
  ok('nothing is refused', problems.length === 0, problems.slice(0, 3));
  ok('420 titles repaired, 9 added, 0 already correct',
    repairs.length === 420 && additions.length === 9, [repairs.length, additions.length]);

  const kinds = { runTogether: 0, missingUnit: 0, truncated: 0, identifiers: 0 };
  for (const r of repairs) {
    if (r.before.startsWith('AP CSAUnit')) kinds.runTogether += 1;
    if (/^AP CSA Day /.test(r.before)) kinds.missingUnit += 1;
    if (!r.before.endsWith(m.BRAND)) kinds.truncated += 1;
    if (m.repairTopic(r.before) !== r.before) kinds.identifiers += 1;
  }
  ok('336 run together, 84 missing a unit, 14 cut mid word, 74 title-cased',
    kinds.runTogether === 336 && kinds.missingUnit === 84
    && kinds.truncated === 14 && kinds.identifiers === 74, kinds);

  const out = repairs.concat(additions);
  ok('every repaired title matches the target shape',
    out.every((r) => m.SHAPE.test(r.after)),
    out.filter((r) => !m.SHAPE.test(r.after)).slice(0, 3));
  ok('no repaired title still carries a title-cased Java name',
    out.every((r) => m.manglings(r.after).length === 0),
    out.filter((r) => m.manglings(r.after).length).slice(0, 3));
  ok('every repaired title differs from what is live now',
    out.every((r) => r.after + THEME !== corpus.find((c) => c.handle === r.handle).live));
  ok('no repaired title is longer than 90 characters',
    out.every((r) => r.after.length <= 90), Math.max(...out.map((r) => r.after.length)));

  //  A PRE-EXISTING problem this repair makes visible rather than causes: 84
  //  articles are published twice under two handle spellings, once as
  //  unit-2-cycle-2-day-10-... and once as unit2-cycle2-day-10-.... Correcting
  //  the unit number on the second copy makes the two titles identical. The
  //  duplication is the defect and it is its own board task; this assertion is
  //  here so that the number cannot move without somebody noticing.
  const byTitle = new Map();
  for (const r of out) byTitle.set(r.after, (byTitle.get(r.after) || 0) + 1);
  const shared = [...byTitle.values()].filter((n) => n > 1).length;
  ok('exactly 84 titles are shared by a duplicate article pair', shared === 84, shared);
}

console.log('\n7. The sheet is one Matrixify cannot misread');
{
  const sh = m.sheet([{ handle: 'ap-csa-u1-c1-day-1-declaring-variables',
    after: 'AP CSA Unit 1 Day 1: Declaring Variables | Daily Practice' }]);
  ok('starts with a UTF-8 BOM', sh.csv.codePointAt(0) === 0xFEFF);
  ok('rows are CRLF terminated', /\r\n$/.test(sh.csv) && sh.csv.split('\r\n').length === 3);
  const header = sh.csv.slice(1).split('\r\n')[0];
  ok('every header cell is quoted', /^"[^"]*"(,"[^"]*")*$/.test(header), header);
  ok('the columns are Blog: Handle, Handle, Command and the SEO title',
    header === `"Blog: Handle","Handle","Command","${m.COLUMN}"`, header);
  ok('there is no Body HTML column', !/Body HTML/.test(sh.csv));
  ok('there is no Published At column', !/Published At/.test(sh.csv));
  const body = sh.csv.slice(1).split('\r\n')[1];
  ok('the command is MERGE', body.includes('"MERGE"'), body);
  ok('the blog is named on the row', body.startsWith('"ap-csa-daily-practice"'), body);
  ok('no cell is blank, because a blank cell is an erase', !/(^|,)""(,|$)/.test(body), body);

  //  The sheet the store actually gets: every row of it, not a sample.
  const { repairs, additions } = m.build(readFixture());
  for (const [rows, label] of [[repairs, 'repair'], [additions, 'missing']]) {
    const s = m.sheet(rows);
    const lines = s.csv.slice(1).split('\r\n').filter(Boolean);
    ok(`  the ${label} sheet has one header and ${rows.length} rows`,
      lines.length === rows.length + 1, lines.length);
    ok(`  no row of the ${label} sheet has a blank cell`,
      lines.every((l) => !/(^|,)""(,|$)/.test(l)));
    ok(`  every row of the ${label} sheet carries exactly four quoted cells`,
      lines.every((l) => (l.match(/","/g) || []).length === 3));
  }
}

function readFixture() {
  const file = path.join(__dirname, 'fixtures', 'csa-daily-practice-live-titles.tsv');
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    const i = line.indexOf('\t');
    return { handle: line.slice(0, i), live: line.slice(i + 1) };
  });
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
