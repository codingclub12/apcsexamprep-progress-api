// ─────────────────────────────────────────────────────────────────────────────
//  REPAIR THE SEO TITLE ON EVERY CSA DAILY-PRACTICE ARTICLE.
//
//  429 articles live in the ap-csa-daily-practice blog. 420 carry a title_tag
//  and every one of them is malformed. The generator that wrote them did this:
//
//      "AP CSA" + unitPart + "Day " + d + ": " + titleCase(topicSlug)
//                                            + " | Daily Practice"
//      sliced to 70 characters
//
//  and four things went wrong in it.
//
//   1  unitPart was "Unit 1 " with no leading space, so 336 titles read
//      "AP CSAUnit 1 Day 10:" with CSA and Unit run together.
//   2  the unit regex missed the handles written without dashes
//      (unit2-cycle2-... rather than unit-2-cycle-2-...), so 84 titles lost the
//      unit number entirely and read "AP CSA Day 10:".
//   3  the 70-character slice cut the brand suffix mid word on 14 of them:
//      "| Daily Practi", "| Daily Pr", "| Daily P". The topic itself was never
//      cut, which is checked below rather than assumed.
//   4  titleCase() on a slug erases the internal capitals of a Java name and the
//      symbols a slug cannot hold: Compareto, Indexof, Arraylist, Iii, Andand.
//
//  The remaining 9 articles have NO title_tag at all, so the storefront falls
//  back to the article title and serves "Unit 4 Day 16 Arraylist Algorithms",
//  with no course keyword in front of it. Those are written as a SEPARATE sheet:
//  giving a page an SEO title it never had is a different act from repairing one
//  that is wrong, and the two should be importable independently.
//
//  WHERE THE REPLACEMENTS COME FROM, AND WHY NOT FROM ME
//  Every entry in PHRASES was read off the live article, not inferred from the
//  slug. The cycle-2 template prints a "Topic:" line and the foundation template
//  prints a heading, and both carry the un-mangled string. So "Iii" is not a
//  guess at a roman numeral: /ap-csa-u1-c2-day-13-iii-wrapper-behavior renders
//  "Advanced I/II/III: Wrapper Class Behavior" and I/II/III is the AP
//  multiple-choice question format the slug destroyed. Each entry names its
//  page.
//
//  WHAT THIS DELIBERATELY DOES NOT TOUCH
//  Titles whose words are ordinary English are left alone even where a Java
//  programmer would write them differently. "Math Random Analysis" stays;
//  "Substring Indexof" becomes "Substring indexOf" and not "substring indexOf".
//  The line is title-casing that ERASED AN INTERNAL CAPITAL, which is a defect
//  with a single correct repair, versus a lowercase-versus-capitalised style
//  choice, which is an opinion. The site itself is inconsistent on the opinion:
//  one page heading writes "compareTo() for String Ordering" and another writes
//  "substring and indexOf". A repair pass is not the place to pick a side.
//
//  Also untouched: the article Title, which has its own separate problems (it
//  leaks the internal "Cycle 2" on 245 articles), and the duplicate article
//  pairs the enumeration turned up. Both are their own tasks.
//
//  THE 70-CHARACTER CAP IS NOT KEPT
//  It was never a convention. It is where the buggy generator's slice landed,
//  and it is the direct cause of defect 3. Restoring the suffix under a 70 cap
//  would mean dropping " | Daily Practice" from 14 titles instead of cutting it,
//  which trades one inconsistency for another. The stored value has no length
//  limit that matters here, and the rendered <title> already runs past 70 on
//  nearly every article because the theme appends " | APCSExamPrep.com". So the
//  repaired titles are complete, and uniform, and some are 80 characters.
//
//  Input is one TSV line per article, handle then the LIVE <title>, which is
//  read off the storefront rather than from any report. No em-dashes, per repo
//  convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');

const THEME_SUFFIX = ' | APCSExamPrep.com';
const BRAND = ' | Daily Practice';
const BLOG = 'ap-csa-daily-practice';

//  Rule A. A Java name whose internal capital title-casing erased. Membership is
//  the whole test: lowercase the token, and if it lowercase-matches one of these
//  but is spelled differently, it is defective and this is the spelling.
//
//  Names that title-case WITHOUT losing a capital are deliberately absent, and
//  that is why substring, equals, length, add, remove, get, set and size are not
//  here. "Substring" is not a defect. "Arraylist" is.
const JAVA_NAMES = [
  'compareTo', 'indexOf', 'toString', 'toUpperCase', 'toLowerCase', 'charAt',
  'nextInt', 'parseInt', 'valueOf', 'equalsIgnoreCase', 'ArrayList',
  'StringBuilder', 'IndexOutOfBoundsException', 'NullPointerException',
  'ArrayIndexOutOfBoundsException',
];

//  Rule B. Title-casing erased a symbol, a slash or a space, so no casing rule
//  can recover it. Every replacement below was read off the live article named
//  beside it. Longest key first: the list is applied in order.
const PHRASES = [
  //  /blogs/ap-csa-daily-practice/ap-csa-u1-c1-day-17-equals-vs-doubleequals
  //  renders "Foundation equals() vs == for Strings".
  ['Equals Vs Doubleequals', 'equals vs =='],
  //  ...ap-csa-u1-c2-day-11-equals-ignorecase-traps renders
  //  "Advanced equals() vs equalsIgnoreCase() Traps".
  ['Equals Ignorecase', 'equals vs equalsIgnoreCase'],
  //  ...unit-1-cycle-2-day-9-substringlength-3-last-3-chars prints
  //  Topic: substring(length-3) last 3 chars
  ['Substringlength 3', 'substring(length-3)'],
  //  ...unit-2-cycle-2-day-17-... prints Topic: Boolean Precedence (&& with ||)
  ['Andand With', '(&& with ||)'],
  //  ...unit-2-cycle-2-day-5-... prints Topic: Boolean Precedence (&& before ||)
  ['Andand Before', '(&& before ||)'],
  //  ...unit-1-cycle-2-day-2-substringstartend-indexing prints
  //  Topic: substring(start,end) indexing
  ['Substringstartend', 'substring(start,end)'],
  //  ...unit-1-cycle-2-day-3-indexofstring-first-occurrence prints
  //  Topic: indexOf(String) first occurrence
  ['Indexofstring', 'indexOf(String)'],
  //  ...ap-csa-u2-c2-day-6-elseif-vs-sequential renders
  //  "Advanced Tricky Else-If vs Sequential If".
  ['Elseif', 'Else-If'],
  //  ...ap-csa-u2-c1-day-26-demorgans-applied renders "De Morgan's Applied to
  //  Code"; ...day-9-de-morgans-laws renders "De Morgan's Laws". A surname, so
  //  both spacings collapse to the same repair.
  ['De Morgans', "De Morgan's"],
  ['Demorgans', "De Morgan's"],
  //  ...ap-csa-u1-c2-day-13-iii-wrapper-behavior renders "Advanced I/II/III:
  //  Wrapper Class Behavior" and explains it in the body: an I/II/III question
  //  asks which of three numbered statements are correct. Confirmed again on
  //  ...ap-csa-u4-c2-day-19-iii-search-sort. The slug ate the slashes.
  ['Iii', 'I/II/III'],
];

const stripTheme = (liveTitle) => (liveTitle.endsWith(THEME_SUFFIX)
  ? liveTitle.slice(0, -THEME_SUFFIX.length) : null);

//  The generator's own title-caser, rebuilt from its output rather than copied
//  from it, so that reproducing all 420 stored topics means something.
function titleCaseSlug(slug) {
  return slug.split('-')
    .map((w) => (/^\d+d$/.test(w) ? w.slice(0, -1) + 'D' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const dayAndSlug = (handle) => {
  const m = /-day-(\d+)-(.+)$/.exec(handle);
  return m ? { day: m[1], slug: m[2] } : null;
};

//  The unit, for the 84 handles the generator's regex missed. Both spellings.
const unitFromHandle = (handle) => {
  const m = /(?:^|[^a-z])unit-?(\d)(?:-|$)/.exec(handle);
  return m ? m[1] : null;
};

function repairTopic(topic) {
  let out = topic;
  for (const [from, to] of PHRASES) out = out.split(from).join(to);
  return out.split(' ')
    .map((tok) => JAVA_NAMES.find((j) => j.toLowerCase() === tok.toLowerCase()) || tok)
    .join(' ');
}

//  Nothing may change between before and after except a declared substitution.
//  Blanking every key out of the before string and every replacement out of the
//  after string must leave the same text. A repair that touched anything else
//  survives this only by coincidence, and a mutation test says it does not.
function onlyDeclaredEdits(before, after) {
  let b = before;
  let a = after;
  for (const [from, to] of PHRASES) { b = b.split(from).join(' '); a = a.split(to).join(' '); }
  for (const j of JAVA_NAMES) {
    const re = new RegExp('\\b' + j + '\\b', 'gi');
    b = b.replace(re, '');
    a = a.replace(re, '');
  }
  return b === a;
}

const manglings = (title) => title.split(' ').filter((tok) => JAVA_NAMES
  .some((j) => j.toLowerCase() === tok.toLowerCase() && j !== tok));

const SHAPE = /^AP CSA Unit [1-4] Day \d{1,2}: .+ \| Daily Practice$/;

function build(rows) {
  const repairs = [];
  const additions = [];
  const problems = [];
  for (const { handle, live } of rows) {
    const stored = stripTheme(live);
    if (stored === null) { problems.push(`${handle}: live <title> does not end with the theme suffix`); continue; }
    const parts = dayAndSlug(handle);
    if (!parts) { problems.push(`${handle}: no -day-N- segment, cannot check the topic`); continue; }

    //  The 9 with no title_tag: the theme falls back to the article Title.
    if (!stored.startsWith('AP CSA')) {
      const m = /^Unit (\d) Day (\d+) (.+)$/.exec(stored);
      if (!m) { problems.push(`${handle}: no SEO title and the article Title is an unknown shape: ${stored}`); continue; }
      if (m[2] !== parts.day) { problems.push(`${handle}: article Title says day ${m[2]}, handle says ${parts.day}`); continue; }
      const after = `AP CSA Unit ${m[1]} Day ${m[2]}: ${repairTopic(m[3])}${BRAND}`;
      additions.push({ handle, before: '', after, servedBefore: stored });
      continue;
    }

    const m = /^AP CSA(?:Unit (\d+) | )Day (\d+): (.*)$/.exec(stored);
    if (!m) { problems.push(`${handle}: SEO title is an unknown shape: ${stored}`); continue; }
    const unit = m[1] || unitFromHandle(handle);
    if (!unit) { problems.push(`${handle}: no unit in the SEO title and none in the handle`); continue; }
    if (m[2] !== parts.day) { problems.push(`${handle}: SEO title says day ${m[2]}, handle says ${parts.day}`); continue; }

    //  Defect 3. The topic is whatever precedes the brand suffix, whole or cut.
    const topic = m[3].replace(/ \| Dail.*$/, '');
    //  A SECOND implementation, reading the handle rather than the stored title,
    //  has to land on the same topic. That is what proves the 70-character slice
    //  took only the brand suffix, rather than my assuming it.
    const rederived = titleCaseSlug(parts.slug);
    if (rederived !== topic) {
      problems.push(`${handle}: topic does not rederive from the handle\n`
        + `        stored    ${JSON.stringify(topic)}\n`
        + `        rederived ${JSON.stringify(rederived)}`);
      continue;
    }

    const fixedTopic = repairTopic(topic);
    if (!onlyDeclaredEdits(topic, fixedTopic)) {
      problems.push(`${handle}: the repair changed something that is not a declared substitution\n`
        + `        before ${JSON.stringify(topic)}\n        after  ${JSON.stringify(fixedTopic)}`);
      continue;
    }
    const after = `AP CSA Unit ${unit} Day ${m[2]}: ${fixedTopic}${BRAND}`;
    if (after !== stored) repairs.push({ handle, before: stored, after });
  }

  for (const r of repairs.concat(additions)) {
    if (!SHAPE.test(r.after)) problems.push(`${r.handle}: repaired title is not the target shape: ${r.after}`);
    const left = manglings(r.after);
    if (left.length) problems.push(`${r.handle}: still title-cased after the repair: ${left.join(', ')}`);
  }
  return { repairs, additions, problems };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '﻿';
const COLUMN = 'Metafield: global.title_tag [single_line_text_field]';

//  One column, and every row is changing it. A blank cell is an erase in every
//  column and not only in Body HTML, so a sheet may only carry a column that
//  every one of its rows has a value for. Body HTML is absent on purpose: these
//  rows are not rewriting any article body.
function sheet(rows) {
  if (!rows.length) return null;
  const lines = [['Blog: Handle', 'Handle', 'Command', COLUMN].map(cell).join(',')];
  for (const r of rows) lines.push([BLOG, r.handle, 'MERGE', r.after].map(cell).join(','));
  return { csv: BOM + lines.join('\r\n') + '\r\n', rows: rows.length };
}

function readTsv(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    const i = line.indexOf('\t');
    return { handle: line.slice(0, i), live: line.slice(i + 1) };
  });
}

if (require.main === module) {
  const [src, ...rest] = process.argv.slice(2);
  if (!src) {
    console.error('usage: node scripts/csa-daily-practice-seo-titles.js <live-titles.tsv> [--out <dir>]');
    process.exit(2);
  }
  const rows = readTsv(src);
  const { repairs, additions, problems } = build(rows);
  console.log(`\nCSA DAILY-PRACTICE SEO TITLES\n\n  read ${rows.length} live titles`);
  console.log(`  ${repairs.length} to repair, ${additions.length} to add, `
    + `${rows.length - repairs.length - additions.length} already correct\n`);
  const kinds = { runTogether: 0, missingUnit: 0, truncated: 0, identifiers: 0 };
  for (const r of repairs) {
    if (r.before.startsWith('AP CSAUnit')) kinds.runTogether += 1;
    if (/^AP CSA Day /.test(r.before)) kinds.missingUnit += 1;
    if (!r.before.endsWith(BRAND)) kinds.truncated += 1;
    if (repairTopic(r.before) !== r.before) kinds.identifiers += 1;
  }
  console.log(`  AP CSAUnit run together   ${kinds.runTogether}`);
  console.log(`  unit number missing       ${kinds.missingUnit}`);
  console.log(`  brand suffix cut mid word ${kinds.truncated}`);
  console.log(`  Java name title cased     ${kinds.identifiers}`);
  const changed = repairs.filter((r) => repairTopic(r.before) !== r.before);
  console.log('\n  every title whose words change, not only its prefix:\n');
  for (const r of changed.concat(additions)) {
    console.log(`    ${r.handle}\n      ${r.before || '(no SEO title; served ' + r.servedBefore + ')'}\n   -> ${r.after}`);
  }
  if (problems.length) {
    console.error(`\n  ${problems.length} refused. No file written.\n`);
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  const out = rest.indexOf('--out') === -1 ? null : rest[rest.indexOf('--out') + 1];
  if (out) {
    for (const [rowsFor, name] of [[repairs, 'csa-seo-title-repair-blog-posts.csv'],
      [additions, 'csa-seo-title-missing-blog-posts.csv']]) {
      const sh = sheet(rowsFor);
      if (!sh) continue;
      fs.writeFileSync(`${out}/${name}`, sh.csv);
      console.log(`\n  wrote ${out}/${name}  (${sh.rows} rows, one column, no blanks)`);
    }
  }
  const longest = repairs.concat(additions).reduce((a, r) => Math.max(a, r.after.length), 0);
  console.log(`\n  longest repaired title: ${longest} characters\n`);
}

module.exports = { build, sheet, repairTopic, titleCaseSlug, stripTheme, onlyDeclaredEdits,
  manglings, unitFromHandle, dayAndSlug, JAVA_NAMES, PHRASES, COLUMN, SHAPE, BRAND, THEME_SUFFIX };
