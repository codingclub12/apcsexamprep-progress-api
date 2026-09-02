'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: roll the school year, and ONLY where it is a school year.
//
//  "2025-2026" means two things on this site and only one is stale. The nightly
//  crawl flags both, because it reads a year and cannot read intent. Getting it
//  wrong in the refusing direction leaves a stale year up; getting it wrong in
//  the rolling direction puts a FALSE STATEMENT in front of a teacher, which is
//  worse, so the fixtures below are real strings read off the live store.
//
//  Run: npm run smoke:schoolyear
//  Pure ASCII source: the en dash is a code point. No em-dashes.
// ---------------------------------------------------------------------------
const { rollString, verify, build, sheet } = require('../scripts/school-year-rollover');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const EN = String.fromCharCode(0x2013);

console.log('\n1. Real school-year labels roll');
{
  for (const [before, after] of [
    ['AP Computer Science A Exam Prep (2025-2026)', 'AP Computer Science A Exam Prep (2026-2027)'],
    ['AP CSA Study Guides | All 4 Units (2025-2026)', 'AP CSA Study Guides | All 4 Units (2026-2027)'],
    ['AP CSA Practice Questions by Unit and Topic | 2025-2026',
      'AP CSA Practice Questions by Unit and Topic | 2026-2027'],
    ['Unit 4 Data Collections Practice Exam - 50 Questions | AP CSA 2025-26',
      'Unit 4 Data Collections Practice Exam - 50 Questions | AP CSA 2026-27'],
    ['AP CSA 7-Day Emergency Cram Kit | 2025-2026 Exam Prep',
      'AP CSA 7-Day Emergency Cram Kit | 2026-2027 Exam Prep'],
  ]) {
    const r = rollString(before);
    ok(`  ${before.slice(0, 52)}`, !r.error && r.after === after, r.error || r.after);
  }
  //  Both dash forms are in use on this store.
  const en = rollString('AP CSA Exam Prep (2025' + EN + '2026)');
  ok('  an en dash year rolls and KEEPS its en dash',
    !en.error && en.after === 'AP CSA Exam Prep (2026' + EN + '2027)', en);
}

console.log('\n2. THE ONE THAT MATTERS: curriculum and exam-spec references are REFUSED');
{
  //  Every string here is live on the store right now.
  for (const s of [
    'Aligned to the 2025-2026 4-unit curriculum. Free resources on APCSExamPrep.com.',
    'AP CSP CED Explained | 2025-2026 Curriculum Guide',
    'Plain-English breakdown of the AP CSP Course and Exam Description for 2025-2026.',
    'removed from AP Computer Science A in the 2025-2026 course redesign',
    'Not on the 2025-2026 exam',
  ]) {
    const r = rollString(s);
    ok(`  refused: ${s.slice(0, 56)}`, !!r.error, r.after);
  }

  //  THE HARD PAIR, and the reason the rule is the definite article rather than
  //  "followed by a noun": both put the year in front of the word exam.
  ok('  "the 2025-2026 exam" is the SPEC and is refused',
    !!rollString('Not on the 2025-2026 exam').error);
  ok('  "2025-2026 Exam Prep" is a SCHOOL YEAR and rolls',
    !rollString('AP CSA 2025-2026 Exam Prep').error);
}

console.log('\n3. Only the year moves');
{
  const r = rollString('AP CSA Unit 1 Study Guide (2025-2026) ' + EN + ' Objects Methods & Practice');
  ok('  verify accepts an honest roll', verify(r.before, r.after).length === 0, verify(r.before, r.after));
  ok('  length is unchanged, because the roll is same-length',
    r.before.length === r.after.length);
  ok('  the en dash SEPARATOR survives untouched', r.after.includes(') ' + EN + ' Objects'));
  //  A SAME-LENGTH edit, deliberately. The first version of this dropped a
  //  letter, so the LENGTH check caught it and the byte-comparison guard never
  //  had to fire: the mutation battery reported it as a survivor, which is
  //  exactly what a survivor is for. Only the comparison can catch this one.
  const sameLength = r.after.replace('Objects', 'Objectz');
  ok('  a same-length edit elsewhere is still refused',
    sameLength.length === r.after.length && verify(r.before, sameLength).length > 0,
    verify(r.before, sameLength));
  ok('  and a shorter edit is refused too, by the length check',
    verify(r.before, r.after.replace('Objects', 'Object')).length > 0);
  ok('  no 2025 survives', !/2025/.test(r.after));
  ok('  a string with no year at all is refused', !!rollString('AP CSA Study Guide').error);
}

console.log('\n4. THE SHEET SHAPE: one field per file, never a blank cell');
{
  //  The bug this pins. Ten titles needed rolling and one of the ten also needed
  //  its title_tag rolled. One sheet carrying both columns leaves nine title_tag
  //  cells EMPTY, and Matrixify writes what you give it: nine live pages would
  //  have lost their SEO title, one of them already correctly migrated by hand.
  const targets = [
    { handle: 'a', title: 'AP CSA Exam Prep (2025-2026)' },
    { handle: 'b', title: 'AP CSA Vocab (2025-2026)', title_tag: 'AP CSA Vocab (2025-2026) | Prep' },
    { handle: 'c', blog: 'news', title: 'Guide (2025-2026)' },
  ];
  const { pages, articles, problems } = build(targets);
  ok('  nothing refused', problems.length === 0, problems);
  ok('  two page fields and one article field', pages.length === 3 && articles.length === 1,
    { pages: pages.length, articles: articles.length });

  const t = sheet(pages, 'title', false);
  const tag = sheet(pages, 'title_tag', false);
  ok('  the title sheet holds both pages', t.rows === 2, t.rows);
  ok('  the title_tag sheet holds only the one that needed it', tag.rows === 1, tag.rows);
  ok('  the title sheet has NO metafield column', !/Metafield/.test(t.csv.split('\r\n')[0]));
  ok('  the metafield sheet has NO Title column', !/"Title"/.test(tag.csv.split('\r\n')[0]));

  const cells = (csv) => csv.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean).slice(1)
    .flatMap((l) => l.split('","').map((c) => c.replace(/^"|"$/g, '')));
  ok('  no blank cell in the title sheet', cells(t.csv).every((c) => c.trim()), cells(t.csv));
  ok('  no blank cell in the metafield sheet', cells(tag.csv).every((c) => c.trim()));

  const a = sheet(articles, 'title', true);
  //  The BOM is the first character of every sheet, so the header does not start
  //  at index 0. Asserting on startsWith without stripping it tests the BOM.
  ok('  an article sheet names its blog',
    a.csv.replace(/^\uFEFF/, '').split('\r\n')[0].startsWith('"Blog: Handle"'),
    a.csv.slice(0, 60));
  ok('  every row is MERGE', /"MERGE"/.test(t.csv) && /"MERGE"/.test(a.csv));
  ok('  no sheet carries Body HTML', !/Body HTML/.test(t.csv + tag.csv + a.csv));
  ok('  no sheet carries Published At', !/Published At/.test(t.csv + tag.csv + a.csv));
  ok('  a field nobody is changing produces no sheet at all',
    sheet(articles, 'title_tag', true) === null);
}

console.log('\n5. Handles are never touched');
{
  //  One article handle ends in -2025-2026. Renaming a handle is on the
  //  NEVER_AUTO list: it breaks every inbound link and needs a redirect somebody
  //  decided on. The sheet changes its Title and leaves the handle alone.
  const h = 'ap-computer-science-a-frq-tips-...-2025-2026';
  const { pages } = build([{ handle: h, title: 'FRQ Tips (2025-2026)' }]);
  const s = sheet(pages, 'title', false);
  ok('  the handle is carried through unchanged', s.csv.includes('"' + h + '"'), s.csv.slice(0, 200));
  ok('  and no rolled handle appears anywhere', !s.csv.includes('2026-2027-frq'));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
