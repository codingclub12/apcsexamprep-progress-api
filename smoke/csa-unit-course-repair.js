'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the four AP CSA unit course pages.
//
//  That page is how a teacher walks the course, and it is the ONLY place every
//  activity is reachable from: the lesson pages do not link their own Exercise,
//  Debug or FRQ. So an omission there is invisible rather than inconvenient,
//  which is how 32 Exercise 2 pages came to be published and unreachable.
//
//  Section 2 is the one to read. The Exercise 2 pill is not authored, it is the
//  row's own Exercise 1 pill with two substitutions, so it cannot introduce a
//  style, a word or an attribute the page did not already have. Section 3 is
//  the other half: the title a row shows comes from the lesson page it opens,
//  never from this program.
//
//  Fixtures are the four live unit pages in full, and each lesson page's h1
//  verbatim. The lesson bodies run to 100 KB and only the heading is evidence.
//
//  Run: npm run smoke:unitcourse
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const m = require('../scripts/csa-unit-course-repair');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const DIR = path.join(__dirname, 'fixtures', 'csa-unit-course');
const readBodies = () => Object.fromEntries(fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))
  .map((f) => [f.slice(0, -5), fs.readFileSync(path.join(DIR, f), 'utf8')]));
const LIVE = new Set(fs.readFileSync(path.join(__dirname, 'fixtures', 'live-page-handles.txt'), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean));

console.log('\n1. A lesson page states its own number and title, and that is the authority');
{
  ok('the ordinary heading is read',
    JSON.stringify(m.lessonTitle('<h1>Lesson 4.7: Wrapper Classes</h1>'))
      === JSON.stringify({ num: '4.7', title: 'Wrapper Classes' }));
  //  3.1, 3.3 and 3.4 head themselves differently. Both shapes state the same
  //  two facts, so both are accepted.
  ok('and so is the "AP CSA N.M:" heading three Unit 3 lessons use',
    m.lessonTitle('<h1>AP CSA 3.3: Anatomy of a Class</h1>').title === 'Anatomy of a Class');
  ok('an entity in the title is decoded', m.lessonTitle('<h1>Lesson 2.2: A &amp; B</h1>').title === 'A & B');
  for (const bad of ['<h1>Wrapper Classes</h1>', '<h1>Unit 4</h1>', '<p>Lesson 4.7: x</p>', '']) {
    ok(`  refused: ${JSON.stringify(bad).slice(0, 34)}`, m.lessonTitle(bad) === null);
  }
}

console.log('\n2. THE PILL IS COPIED, NOT WRITTEN');
{
  const bodies = readBodies();
  const { rows, problems } = m.build(bodies, LIVE);
  ok('nothing is refused', problems.length === 0, problems.slice(0, 3));
  const pills = rows.flatMap((r) => r.spans.filter((s) => s.kind === 'pill'));
  ok('32 Exercise 2 pills, matching the 32 pages nothing linked', pills.length === 32, pills.length);
  //  Every pill has to be its own row's Exercise 1 anchor with exactly two
  //  substitutions. Anything else means this program authored markup.
  const before = bodies['ap-csa-unit-2-course'];
  let derived = 0;
  for (const s of rows.find((r) => r.handle === 'ap-csa-unit-2-course').spans.filter((x) => x.kind === 'pill')) {
    const one = new RegExp('<a href="/pages/' + s.base + '-exercise-1"[^>]*>[^<]*</a>').exec(before);
    if (one && s.to === one[0].replace('-exercise-1"', '-exercise-2"').replace('Exercise 1', 'Exercise 2')) derived += 1;
  }
  ok('every Unit 2 pill is its own row\'s Exercise 1 anchor, twice substituted',
    derived === 12, derived);
  ok('the pill carries no attribute the Exercise 1 pill did not',
    pills.every((s) => {
      const attrs = (x) => (x.match(/\s[a-z-]+="/g) || []).sort().join();
      return attrs(s.to) === attrs(s.to.replace('-exercise-2"', '-exercise-1"'));
    }));
  ok('the pill reads "Exercise 2", the label the site already uses',
    pills.every((s) => /Exercise 2/.test(s.to)));
  ok('and it points at the exercise-2 page of its own row',
    pills.every((s) => s.to.includes(`href="/pages/${s.base}-exercise-2"`)));
  ok('every pill target is a live page', pills.every((s) => LIVE.has(s.target)));
  //  Placement: directly after Exercise 1, so the strip stays
  //  Exercise 1, Exercise 2, Debug, FRQ.
  const after2 = rows.find((r) => r.handle === 'ap-csa-unit-2-course').after;
  const order = (h) => ['exercise-1', 'exercise-2', 'debug', 'frq']
    .map((s) => after2.indexOf(`/pages/${h}-${s}"`));
  const o = order('ap-csa-lesson-2-3-if-statements');
  ok('the strip reads Exercise 1, Exercise 2, Debug, FRQ',
    o.every((n, i) => n > 0 && (i === 0 || n > o[i - 1])), o);
  //  A row that already has one gets none: Unit 4 has six.
  const u4 = rows.find((r) => r.handle === 'ap-csa-unit-4-course');
  ok('a row that already links Exercise 2 gets no second pill',
    u4.added === 11 && !/exercise-2"[\s\S]{0,400}?exercise-2"/.test(
      u4.after.slice(u4.after.indexOf('ap-csa-lesson-4-6-using-text-files-exercise-1'),
        u4.after.indexOf('ap-csa-lesson-4-6-using-text-files-exercise-1') + 1200)), u4.added);
}

console.log('\n3. The title a row shows comes from the page it opens');
{
  const { rows } = m.build(readBodies(), LIVE);
  const titles = rows.flatMap((r) => r.spans.filter((s) => s.kind === 'title'));
  ok('9 rows disagree with the lesson they link', titles.length === 9, titles.length);
  //  The six that name a different lesson entirely. A teacher planning from
  //  this page would write the wrong lesson into their calendar.
  const want = {
    4.6: ['Arrays as Parameters and Return Values', 'Using Text Files'],
    4.7: ['ArrayList Introduction', 'Wrapper Classes'],
    4.13: ['Searching and Sorting', 'Implementing 2D Array Algorithms'],
    4.14: ['Reading Data from Files', 'Searching Algorithms'],
    4.15: ['Using Data Sets with Arrays and ArrayLists', 'Sorting Algorithms'],
    4.17: ['Informal Code Analysis', 'Recursive Searching and Sorting'],
  };
  for (const [num, [was, now]] of Object.entries(want)) {
    const s = titles.find((t) => t.num === num);
    ok(`  row ${num}: ${JSON.stringify(was)} -> ${JSON.stringify(now)}`,
      s && s.was === was && s.now === now, s && [s.was, s.now]);
  }
  //  Two of the six name a topic the 2025-2026 CED removed. They must not
  //  survive this pass.
  const after4 = rows.find((r) => r.handle === 'ap-csa-unit-4-course').after;
  //  A unit page says each title more than once, in a different shape per
  //  unit, so "repaired" has to mean gone from the whole page.
  //  Gone as a TITLE. "Searching and Sorting" survives as a substring of
  //  "Recursive Searching and Sorting", which is row 4.17's correct title, and
  //  that is why the replace matches whole text nodes rather than substrings.
  for (const stale of Object.values(want).map((p2) => p2[0])) {
    ok(`  ${JSON.stringify(stale)} is no longer a title on Unit 4`,
      !after4.includes('>' + stale + '<'));
  }
  ok('a stale title that is a substring of a correct one is not half-eaten',
    after4.includes('>Recursive Searching and Sorting<'));
  ok('two of them named a topic the 2025-2026 CED removed, and both are gone',
    !after4.includes('Arrays as Parameters and Return Values')
    && !after4.includes('Informal Code Analysis'));
  ok('each corrected title now appears as many times as the stale one did',
    Object.values(want).every(([, now]) => after4.includes(now)));
  //  9 rows and 9 cards: every mismatch was written twice.
  ok('18 replacements for 9 disagreements, because each is on the page twice',
    rows.reduce((n, r) => n + r.retitled + r.recarded, 0) === 18,
    rows.map((r) => [r.retitled, r.recarded]));
}

console.log('\n3b. A title is a whole text node, never a substring of a longer one');
{
  //  Row 4.13's stale title, "Searching and Sorting", sits inside row 4.17's
  //  correct title, "Recursive Searching and Sorting". Matching substrings
  //  would eat half of that one the moment both are on the page at once, which
  //  is exactly what this repair makes happen. The live fixture does not
  //  contain the collision yet, so it is built here rather than waited for.
  const page = '<a href="/pages/L13"><span>Searching and Sorting</span></a>'
    + '<a href="/pages/L17"><span>Recursive Searching and Sorting</span></a>';
  const hits = m.titleOccurrences(page, 'L13', 'Searching and Sorting');
  ok('only the whole text node matches, not the one inside a longer title',
    hits.length === 1 && hits[0].at === page.indexOf('>Searching and Sorting<') + 1, hits);
  ok('and it is tied to a link to its own lesson', hits[0] && hits[0].tied);
  //  Untied is reported, not replaced: the same words somewhere unrelated.
  const loose = '<p>Searching and Sorting</p>' + 'x'.repeat(900) + '<a href="/pages/L13">x</a>';
  ok('the same words far from any link to that lesson are NOT tied',
    m.titleOccurrences(loose, 'L13', 'Searching and Sorting').every((h) => !h.tied));
}

console.log('\n4. A row this cannot trust is REFUSED, not guessed');
{
  const base = readBodies();
  const noH1 = { ...base, 'ap-csa-lesson-4-7-wrapper-classes': '<p>no heading here</p>' };
  const a = m.build(noH1, LIVE);
  ok('a lesson whose h1 does not state its title is REFUSED',
    a.problems.some((p) => /does not head itself/.test(p)), a.problems.slice(0, 2));
  //  ONE bad row stops the WHOLE page. A sheet that rewrites a body while part
  //  of it is unaccounted for is the half-written state this repo refuses.
  ok('and its whole unit page ships nothing',
    a.rows.every((r) => r.handle !== 'ap-csa-unit-4-course'),
    a.rows.map((r) => r.handle));
  ok('the other three unit pages still ship', a.rows.length === 3, a.rows.length);
  const wrongNum = { ...base, 'ap-csa-lesson-4-7-wrapper-classes': '<h1>Lesson 9.9: Wrapper Classes</h1>' };
  const b = m.build(wrongNum, LIVE);
  ok('a lesson that calls itself a different number is REFUSED',
    b.problems.some((p) => /calls itself 9\.9/.test(p)), b.problems.slice(0, 2));
  //  A pill is only ever added for a page the sitemap says is live, so taking
  //  one out of the live set has to remove the pill rather than write a 404.
  const notLive = new Set([...LIVE].filter((h) => h !== 'ap-csa-lesson-2-3-if-statements-exercise-2'));
  const c = m.build(base, notLive);
  const u2 = c.rows.find((r) => r.handle === 'ap-csa-unit-2-course');
  ok('a pill is not added for a page that is not live', u2 && u2.added === 11, u2 && u2.added);
  ok('and no pill anywhere points at it',
    !c.rows.some((r) => r.after.includes('ap-csa-lesson-2-3-if-statements-exercise-2')));
  const noUnit = { ...base };
  delete noUnit['ap-csa-unit-3-course'];
  ok('a missing unit page is REFUSED rather than skipped quietly',
    m.build(noUnit, LIVE).problems.some((p) => /no stored body/.test(p)));
}

console.log('\n5. Nothing else on the page moves');
{
  const bodies = readBodies();
  const { rows } = m.build(bodies, LIVE);
  for (const r of rows) {
    const v = m.verify(r.before, r.after, r.spans);
    ok(`  ${r.handle}: reversing the edit gives the original back`, v.roundTrip);
    ok(`  ${r.handle}: links grew by exactly the pills added`, v.anchorsOk);
    ok(`  ${r.handle}: the page's <style> block is untouched`,
      (r.before.match(/<style/g) || []).length === (r.after.match(/<style/g) || []).length);
    ok(`  ${r.handle}: div balance is unchanged`,
      (r.before.match(/<div/g) || []).length === (r.after.match(/<div/g) || []).length
      && (r.before.match(/<\/div>/g) || []).length === (r.after.match(/<\/div>/g) || []).length);
    ok(`  ${r.handle}: it grew, and by less than 8 KB`,
      r.after.length > r.before.length && r.after.length - r.before.length < 8192,
      r.after.length - r.before.length);
  }
  //  verify() has to reject an edit it did not record.
  const r0 = rows[0];
  ok('an edit outside the recorded spans is REJECTED',
    !m.verify(r0.before, r0.after.replace('</div>', '</div><b>x</b>'), r0.spans).roundTrip);
}

console.log('\n6. The sheet is one Matrixify cannot misread');
{
  const { rows } = m.build(readBodies(), LIVE);
  const sh = m.sheet(rows);
  ok('four unit pages, one row each', sh.rows === 4, sh.rows);
  ok('starts with a UTF-8 BOM', sh.csv.codePointAt(0) === 0xFEFF);
  ok('rows are CRLF terminated', /\r\n$/.test(sh.csv));
  const lines = sh.csv.slice(1).split('\r\n').filter(Boolean);
  ok('the columns are Handle, Command and Body HTML',
    lines[0] === '"Handle","Command","Body HTML"', lines[0]);
  ok('every row is MERGE', lines.slice(1).every((l) => l.includes('"MERGE"')));
  ok('no cell is blank, because a blank cell is an erase',
    lines.every((l) => !/(^|,)""(,|$)/.test(l)));
  ok('an empty row set writes no sheet at all', m.sheet([]) === null);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
