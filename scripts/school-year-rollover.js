'use strict';
// ---------------------------------------------------------------------------
//  ROLL THE SCHOOL YEAR FORWARD, AND ONLY WHERE IT IS A SCHOOL YEAR
//
//      node scripts/school-year-rollover.js <targets.json> [--out <directory>]
//
//  "2025-2026" means two different things on this site and only one of them is
//  stale. Getting that wrong in either direction is a real cost:
//
//    THE SCHOOL YEAR      "AP CSA Exam Prep (2025-2026)". A teacher choosing a
//                         curriculum in September reads the year and moves on.
//                         This is what rolls to 2026-2027.
//
//    THE CED VERSION      "Aligned to the 2025-2026 4-unit curriculum",
//                         "removed in the 2025-2026 course redesign". That is
//                         the name of the curriculum, not a school year, and
//                         CLAUDE.md says AP CSA references use the 2025-2026
//                         4-unit structure EXCLUSIVELY. Rolling it forward makes
//                         the sentence false.
//
//  The nightly crawl flags both as `stale-year`, because it reads a year and
//  cannot read intent. So this refuses to touch any string carrying a curriculum
//  marker, and the refusal is a hard error rather than a skip: a silent skip in
//  a rollover looks exactly like a string that had no year in it.
//
//  WHAT IT WILL NOT DO. It never touches a handle. One article handle ends in
//  `-2025-2026`, and renaming a handle is on the NEVER_AUTO list: it breaks
//  every inbound link and needs a redirect somebody decided on. It never emits a
//  Body HTML column either, because this is a title change and a stray blank
//  Body HTML empties the page.
//
//  Pure ASCII source: the en dash is a code point. No em-dashes, per convention.
// ---------------------------------------------------------------------------
const fs = require('fs');

//  Both dash forms, because the store uses both. The crawl saw 2025-2026 with an
//  ASCII hyphen, and 2025 EN DASH 2026 on three surfaces.
const DASH = '[-' + String.fromCharCode(0x2013) + String.fromCharCode(0x2014) + ']';
const LONG = new RegExp('2025' + DASH + '2026', 'g');
const SHORT = new RegExp('2025' + DASH + '26(?!\\d)', 'g');

//  A year next to any of these is naming the CURRICULUM, not the school year.
//  Deliberately generous: a false refusal costs a look, a false rewrite puts a
//  wrong fact in front of a teacher.
const CURRICULUM = /\b(CED|curriculum|course redesign|4-unit|four-unit|Course and Exam Description|framework)\b/i;

//  The harder half, and it was found by pointing this at strings already live.
//  "Not on the 2025-2026 exam" is the banner now on 49 articles, and the year
//  there names the EXAM SPECIFICATION. But "2025-2026 Exam Prep" is a school
//  year, and both put the year in front of the word exam, so "followed by a
//  noun" is not the rule.
//
//  What separates them is the definite article. "THE 2025-2026 exam" is the one
//  particular exam; "2025-2026 Exam Prep" is a service named after a year. The
//  same holds for the course and the redesign.
const SPEC_PHRASE = new RegExp(
  '\\b(the|this|that)\\s+2025' + DASH + '2026\\s+(exam|course|redesign|test|CED|framework)\\b'
  + '|2025' + DASH + '2026\\s+(course\\s+redesign|curriculum|CED|framework|Course and Exam)', 'i');

function rollString(s) {
  const before = String(s == null ? '' : s);
  if (!LONG.test(before) && !SHORT.test(before)) {
    LONG.lastIndex = 0; SHORT.lastIndex = 0;
    return { error: 'no school year found to roll' };
  }
  LONG.lastIndex = 0; SHORT.lastIndex = 0;
  if (CURRICULUM.test(before) || SPEC_PHRASE.test(before)) {
    return { error: 'names the curriculum or the exam specification, not a school year, '
      + 'so the year must stay: ' + JSON.stringify(before.slice(0, 80)) };
  }
  const after = before
    .replace(LONG, (m) => '2026' + m[4] + '2027')
    .replace(SHORT, (m) => '2026' + m[4] + '27');
  LONG.lastIndex = 0; SHORT.lastIndex = 0;
  return { before, after };
}

//  The guarantee: the ONLY thing that differs is the year token. Same length,
//  same everything else, byte for byte.
function verify(before, after) {
  const bad = [];
  if (before === after) { bad.push('nothing changed'); return bad; }
  const neutral = (s) => s
    .replace(new RegExp('202[56]' + DASH + '202[67]', 'g'), '<YEAR>')
    .replace(new RegExp('202[56]' + DASH + '2[67](?!\\d)', 'g'), '<YEAR>');
  if (neutral(before) !== neutral(after)) {
    let i = 0;
    const nb = neutral(before), na = neutral(after);
    while (i < Math.min(nb.length, na.length) && nb[i] === na[i]) i++;
    bad.push(`something other than the year changed, first difference at ${i}: `
      + `${JSON.stringify(nb.slice(i, i + 40))} vs ${JSON.stringify(na.slice(i, i + 40))}`);
  }
  if (before.length !== after.length) {
    bad.push(`length moved ${before.length} to ${after.length}; the roll is same-length `
      + 'so a change here means something else moved');
  }
  if (/2025/.test(after)) bad.push('a 2025 school year survived the roll');
  if (CURRICULUM.test(after) || SPEC_PHRASE.test(after)) {
    bad.push('the result names the curriculum or the exam spec, which must not be rolled');
  }
  return bad;
}

function build(targets) {
  const pages = [], articles = [], problems = [];
  for (const t of targets) {
    for (const field of ['title', 'title_tag']) {
      if (!t[field]) continue;
      const r = rollString(t[field]);
      if (r.error) { problems.push(`${t.handle} ${field}: ${r.error}`); continue; }
      const bad = verify(r.before, r.after);
      if (bad.length) { problems.push(`${t.handle} ${field}: ${bad[0]}`); continue; }
      const row = { handle: t.handle, field, before: r.before, after: r.after };
      if (t.blog) { row.blog = t.blog; articles.push(row); } else { pages.push(row); }
    }
  }
  return { pages, articles, problems };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '\uFEFF';

const COLUMN = {
  title: 'Title',
  title_tag: 'Metafield: global.title_tag [single_line_text_field]',
};

//  ONE SHEET PER FIELD, and the reason is the whole of rule 2.1 generalised.
//
//  The first version put Title and title_tag in one sheet. Ten pages needed a
//  Title change and exactly ONE needed a title_tag change, so nine rows carried
//  an EMPTY title_tag cell. Matrixify writes what you give it: that sheet would
//  have CLEARED the SEO title on nine live pages, one of which had already been
//  correctly migrated to 2026-27 by hand.
//
//  The handoff says this about Body HTML. It is not about Body HTML. It is about
//  any column whose blank means "set this to nothing", which is every column.
//  A sheet may only carry a column that every one of its rows is changing.
function sheet(rows, field, isArticle) {
  const mine = rows.filter((r) => r.field === field);
  if (!mine.length) return null;
  const cols = (isArticle ? ['Blog: Handle', 'Handle', 'Command'] : ['Handle', 'Command'])
    .concat([COLUMN[field]]);
  const lines = [cols.map(cell).join(',')];
  for (const r of mine) {
    const out = isArticle ? [cell(r.blog), cell(r.handle)] : [cell(r.handle)];
    out.push(cell('MERGE'), cell(r.after));
    lines.push(out.join(','));
  }
  return { csv: BOM + lines.join('\r\n') + '\r\n', rows: mine.length };
}

if (require.main === module) {
  const [src, ...rest] = process.argv.slice(2);
  if (!src) {
    console.error('usage: node scripts/school-year-rollover.js <targets.json> '
      + '[--out <directory>]');
    process.exit(2);
  }
  const { pages, articles, problems } = build(JSON.parse(fs.readFileSync(src, 'utf8')));
  console.log('\nSCHOOL YEAR ROLLOVER 2025-2026 -> 2026-2027\n');
  [...pages, ...articles].forEach((r) => {
    console.log(`  ${r.handle}  [${r.field}]`);
    console.log(`      ${r.before}`);
    console.log(`   -> ${r.after}`);
  });
  if (problems.length) {
    console.error(`\n  ${problems.length} refused. No file written.\n`);
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  //  Written as one file per field. A sheet that mixes them would carry a blank
  //  cell for every row not changing that field, and a blank cell is an erase.
  const out = rest.indexOf('--out') === -1 ? null : rest[rest.indexOf('--out') + 1];
  if (out) {
    const written = [];
    for (const [rows, isArticle, kind] of [[pages, false, 'pages'], [articles, true, 'blog-posts']]) {
      for (const field of ['title', 'title_tag']) {
        const sh = sheet(rows, field, isArticle);
        if (!sh) continue;
        const name = `${out}/school-year-${kind}-${field.replace('_', '-')}.csv`;
        fs.writeFileSync(name, sh.csv);
        written.push(`  wrote ${name}  (${sh.rows} rows, one column, no blanks)`);
      }
    }
    console.log('');
    written.forEach((w) => console.log(w));
  }
  console.log('');
}

module.exports = { rollString, verify, build, sheet, COLUMN, CURRICULUM, SPEC_PHRASE,
  LONG, SHORT };
