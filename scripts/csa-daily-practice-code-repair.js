// ─────────────────────────────────────────────────────────────────────────────
//  REPAIR THE MANGLED CODE BLOCKS ON THE CSA DAILY-PRACTICE ARTICLES.
//
//  25 of the 429 articles in ap-csa-daily-practice serve a code block a student
//  cannot read. Every one of them is in the unit2-cycle2-* family. What the
//  storefront actually renders today:
//
//      "apcs-keyword" >int total = "apcs-number" >0;
//
//      "apcs-keyword" >for ("apcs-keyword" >int i = "apcs-number" >1; ...
//
//  and the markup behind it, verbatim off the live page:
//
//      <span class="&lt;span">"apcs-keyword"</span>&gt;int total =
//
//  Read that as a template and the bug is legible: something applied a rewrite
//  of the shape (\S+) class=("[^"]+")  ->  <span class="$1">$2</span> to markup
//  whose angle brackets had ALREADY been escaped. The token that should have
//  been the class name became the span's CONTENT, the escaped "&lt;span" became
//  its class, and the original "&gt;" was left stranded in front of the Java.
//
//  So a student opening Unit 2 Cycle 2 Day 10 reads a class attribute where the
//  first line of the program should be. On 25 articles. In the unit a teacher
//  reaches in about week four.
//
//  THE REPAIR IS A DELETION, NOT A REWRITE
//  Inside a code block, and only there:
//    1  every  <span class="&lt;span">"apcs-CLASS"</span>&gt;  is deleted whole
//    2  every well-formed  <span class="apcs-CLASS">...</span>  is unwrapped
//  Nothing else in the body is touched, and no character of Java is written by
//  this script. What is left is the program the article always meant to show.
//
//  WHY THE COLOUR IS NOT PUT BACK
//  It cannot be, and guessing is worse than plain. The mangling destroyed each
//  span's CLOSING tag along with its class, so where a highlight ended is not
//  recoverable from the live body: <span class="apcs-keyword">int</span> and
//  <span class="apcs-keyword">int total</span> mangle to the same bytes. Any
//  colour restored here would be my inference about token boundaries dressed up
//  as the author's markup.
//
//  Plain is also what the site itself already serves. The hyphenated twin family
//  (unit-2-cycle-2-*) uses the same template and the same dark code block, and
//  its code is plain:  "int sum = 0;\nfor (int i = 1; i &lt;= 5; i++) {"  with no
//  highlight spans at all. The repaired articles land on that convention rather
//  than inventing a third one.
//
//  Rule 2 exists for the same reason. On these pages a handful of spans survived
//  the mangling well-formed, always on a fragment of an identifier:
//  System.<span class="apcs-function">out</span>.<span class="apcs-function">print</span>ln
//  which renders println with "print" blue and "ln" not. Leaving those behind
//  would keep the very artifact the board reported, on a page that otherwise now
//  has no colour anywhere. They are unwrapped, and unwrapping cannot change what
//  a reader sees: it removes tags and no text.
//
//  THE TWIN IS A REFERENCE FOR THE CONVENTION AND NOT FOR THE CODE
//  unit-2-cycle-2-day-10 and unit2-cycle2-day-10 share a slug tail and are
//  DIFFERENT QUESTIONS: the twin sums 1..5 and prints 15, the mangled article
//  sums 1..4 and prints 10. Copying a body across would have shipped the wrong
//  answer to 25 pages. The repair therefore reads only the mangled article.
//
//  WHAT IS PROVED BEFORE ANYTHING IS WRITTEN
//  onlyDeclaredDeletions() strips tags from the body before and after, decodes
//  entities in that order (so an escaped "&lt;span" is seen as a reader sees it,
//  as text), removes exactly the artifacts from the BEFORE text, and requires
//  what remains to equal the AFTER text byte for byte. A repair that alters one
//  character of Java fails it. One unverifiable article refuses the whole sheet.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const { trace } = require('./mini-java-trace');

const BLOG = 'ap-csa-daily-practice';

//  The mangled opener, whole. The class name is captured so the artifact it
//  leaves in the visible text can be counted rather than assumed.
const MANGLE = /<span class="&lt;span">"(apcs-[a-z]+)"<\/span>&gt;/g;
//  A span the mangling did not reach. Non-greedy, and nesting is refused below,
//  so the close it finds is its own.
const WELL = /<span class="(apcs-[a-z]+)">([\s\S]*?)<\/span>/g;
const CODE_BLOCK = /<pre><code>[\s\S]*?<\/code><\/pre>/g;

//  Strip tags FIRST and decode entities SECOND. The order is the whole point:
//  decoding first would turn the escaped "&lt;span" into a tag and then delete
//  it, which is exactly the mistake being repaired.
function visible(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function repairBlock(block) {
  return block.replace(MANGLE, '').replace(WELL, (_m, _cls, inner) => inner);
}

function repairBody(body) {
  return body.replace(CODE_BLOCK, repairBlock);
}

//  The proof. Everything the repair is allowed to remove is declared here; if
//  the two sides do not match afterwards, something else moved.
function onlyDeclaredDeletions(before, after) {
  const seen = [...before.matchAll(MANGLE)].map((m) => m[1]);
  let expected = visible(before);
  for (const cls of seen) {
    const artifact = '"' + cls + '">';
    const at = expected.indexOf(artifact);
    if (at === -1) return 'the artifact ' + artifact + ' is in the markup but not in the visible text';
    expected = expected.slice(0, at) + expected.slice(at + artifact.length);
  }
  const got = visible(after);
  if (got === expected) return null;
  let i = 0;
  while (i < got.length && i < expected.length && got[i] === expected[i]) i += 1;
  return 'the repair changed text it did not declare, at offset ' + i
    + '\n      expected: ' + JSON.stringify(expected.slice(Math.max(0, i - 40), i + 60))
    + '\n      got     : ' + JSON.stringify(got.slice(Math.max(0, i - 40), i + 60));
}

//  ── the check that reads the other end of the page ──────────────────────────
//  Everything above proves the repair deleted only what it declared. It cannot
//  prove the RESULT is the program the question was written against, because a
//  deletion that ate a bound leaves a body that is still well-formed, still
//  valid, and now teaches a wrong answer.
//
//  The article answers that itself. It carries a multiple-choice key the repair
//  never touches, so: run the recovered program and require its output to be the
//  option marked correct. Two facts from opposite ends of the page.
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const codeOf = (body) => decode((body.match(CODE_BLOCK) || [])
  .map((b) => b.replace(/<\/?(pre|code)>/g, '')).join('\n'));

const questionOf = (body) => {
  const m = body.match(/<div class="apcs-question-text">([\s\S]*?)<\/div>/);
  return m ? decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
};

const optionsOf = (body) => Object.fromEntries([...body.matchAll(
  /value="([A-D])">\s*<span class="apcs-option-letter">[A-D]\)<\/span>\s*<span class="apcs-option-content">([\s\S]*?)<\/span>/g)]
  .map((m) => [m[1], decode(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()]));

const keyOf = (body) => (body.match(/correctAnswer\s*[:=]\s*['"]([A-D])['"]/) || [])[1] || null;

function crossCheckAnswerKey(body) {
  const key = keyOf(body);
  const options = optionsOf(body);
  if (!key) return { skipped: 'no answer key found in the body' };
  if (!options[key]) return { skipped: 'the key names option ' + key + ' and the body has no such option' };
  const code = codeOf(body);
  const question = questionOf(body);

  //  A debugging question's options are EDITS, not outputs, so running the
  //  program proves nothing about them. What it can still prove is that the
  //  fragment the correct edit names is present in the recovered code: the key
  //  for day 12 reads "Change `i < 5` to `i <= 5`", and if the deletion had
  //  eaten a character of that condition the fragment would not be there.
  if (!/what is printed/i.test(question)) {
    const from = (options[key].match(/`([^`]+)`/) || [])[1];
    if (!from) return { skipped: 'not an output question and its key quotes no code fragment' };
    if (!code.includes(from)) return { disagrees: 'the correct option names ' + JSON.stringify(from) + ' and the recovered code does not contain it' };
    return { agrees: 'the fragment its key edits, ' + JSON.stringify(from) + ', survives in the code' };
  }

  const r = trace(code);
  if (r.refused) return { skipped: 'not checkable: ' + r.refused };
  const printed = r.output.replace(/\s+$/, '');
  if (printed !== options[key]) {
    return { disagrees: 'the recovered program prints ' + JSON.stringify(printed)
      + ' but the article marks ' + key + ') ' + JSON.stringify(options[key]) + ' correct' };
  }
  return { agrees: 'prints ' + JSON.stringify(printed) + ', which is the keyed option ' + key };
}

//  Refusals. Each one is a way this repair could be wrong that a green run would
//  otherwise hide.
function inspect(handle, before) {
  const problems = [];
  const blocks = before.match(CODE_BLOCK) || [];
  const mangles = [...before.matchAll(MANGLE)].length;
  if (!mangles) return { problems: ['no mangled span found; this article does not belong in the sheet'] };
  if (!blocks.length) problems.push('mangled but has no <pre><code> block to scope the repair to');

  //  Mangling outside a code block would survive a repair scoped to code blocks,
  //  and the article would still read wrong with the count reading zero.
  const outside = before.replace(CODE_BLOCK, (m) => ' '.repeat(m.length));
  const loose = [...outside.matchAll(MANGLE)].length;
  if (loose) problems.push(loose + ' mangled spans sit OUTSIDE a code block; this repair would not reach them');

  //  Any other shape of escaped span markup means a second defect is present and
  //  this rule was written against only the first.
  const strayOpen = (outside.match(/&lt;span/g) || []).length;
  const strayClose = (before.match(/&lt;\/span&gt;/g) || []).length;
  if (strayOpen) problems.push(strayOpen + ' escaped "&lt;span" outside a code block');
  if (strayClose) problems.push(strayClose + ' escaped "&lt;/span&gt;" in the body; the closers are a defect this rule does not cover');

  //  Nesting would make the non-greedy unwrap pick the wrong close tag.
  for (const b of blocks) {
    const stripped = b.replace(MANGLE, '');
    const opens = (stripped.match(/<span\b/g) || []).length;
    const closes = (stripped.match(/<\/span>/g) || []).length;
    if (opens !== closes) problems.push('a code block has ' + opens + ' <span> and ' + closes + ' </span>; unbalanced');
    if (/<span[^>]*>(?:(?!<\/span>)[\s\S])*<span/.test(stripped)) problems.push('nested spans in a code block; the unwrap would pick the wrong close');
  }

  const after = repairBody(before);

  //  Nothing that names the highlighter may survive anywhere in the body outside
  //  the stylesheet, and no span may remain inside a code block.
  for (const b of after.match(CODE_BLOCK) || []) {
    if (/<span|&lt;span|apcs-/.test(b)) problems.push('a repaired code block still carries span markup: ' + JSON.stringify(b.slice(0, 120)));
  }
  //  What a reader sees, which is not what the file contains: the stylesheet
  //  defines .apcs-keyword and the page's own script selects .apcs-option, and
  //  neither is text on the page. Both are removed before asking the question.
  const vis = visible(after
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ''));
  if (/apcs-[a-z]/.test(vis)) problems.push('a highlighter class name is still readable on the page after the repair');

  const drift = onlyDeclaredDeletions(before, after);
  if (drift) problems.push(drift);

  const key = crossCheckAnswerKey(after);
  if (key.disagrees) problems.push('the repaired code disagrees with the article own answer key: ' + key.disagrees);

  return { problems, after, mangles, blocks: blocks.length, key };
}

function build(articles) {
  const rows = [];
  const problems = [];
  for (const a of articles) {
    const r = inspect(a.handle, a.body);
    if (r.problems.length) { r.problems.forEach((p) => problems.push(a.handle + ': ' + p)); continue; }
    if (r.after === a.body) { problems.push(a.handle + ': the repair changed nothing'); continue; }
    rows.push({ handle: a.handle, before: a.body, after: r.after, mangles: r.mangles, blocks: r.blocks, key: r.key });
  }
  return { rows, problems };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '﻿';

//  Body HTML is the only changing column and every row carries one. A blank cell
//  is an erase in every column, so a column no row has a value for must not be
//  in the sheet at all. Published At is absent for the same reason: writing a
//  time here would republish 25 articles at import time.
function sheet(rows) {
  if (!rows.length) return null;
  const lines = [['Blog: Handle', 'Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  for (const r of rows) lines.push([BLOG, r.handle, 'MERGE', r.after].map(cell).join(','));
  return { csv: BOM + lines.join('\r\n') + '\r\n', rows: rows.length };
}

module.exports = { MANGLE, WELL, CODE_BLOCK, visible, repairBlock, repairBody, onlyDeclaredDeletions,
  codeOf, questionOf, optionsOf, keyOf, crossCheckAnswerKey, inspect, build, sheet };

if (require.main === module) {
  const [dir, ...rest] = process.argv.slice(2);
  if (!dir) {
    console.error('usage: node scripts/csa-daily-practice-code-repair.js <bodies-dir> [--out <dir>]');
    console.error('  <bodies-dir> holds one <handle>.html per article, the live body, extracted');
    console.error('  from the storefront by scripts/csa-article-body-extract.js');
    process.exit(2);
  }
  //  A CONTROL- file is a clean article kept alongside the mangled ones so the
  //  suite can prove the repair refuses what it should not touch. It is evidence,
  //  not input, so the sheet skips it rather than refusing on it.
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html') && !f.startsWith('CONTROL-')).sort();
  const articles = files.map((f) => ({ handle: f.replace(/\.html$/, ''), body: fs.readFileSync(dir + '/' + f, 'utf8') }));
  const { rows, problems } = build(articles);

  console.log('\nCSA DAILY-PRACTICE CODE BLOCK REPAIR\n');
  console.log('  read ' + articles.length + ' live article bodies');
  console.log('  ' + rows.length + ' repaired, ' + problems.length + ' refused\n');
  const totalMangles = rows.reduce((a, r) => a + r.mangles, 0);
  console.log('  mangled spans deleted: ' + totalMangles + ' across ' + rows.reduce((a, r) => a + r.blocks, 0) + ' code blocks\n');
  for (const r of rows) {
    const code = (r.after.match(CODE_BLOCK) || []).map((b) => b.replace(/<\/?(pre|code)>/g, '')).join('\n---\n');
    const verdict = r.key.agrees ? 'KEY AGREES: ' + r.key.agrees : 'key not checked: ' + r.key.skipped;
    console.log('    ' + r.handle + '  (' + r.mangles + ' deleted)  ' + verdict);
    console.log(code.split('\n').map((l) => '      | ' + l).join('\n'));
    console.log('');
  }
  if (problems.length) {
    console.error('  ' + problems.length + ' refused. No file written.\n');
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  const out = rest.indexOf('--out') === -1 ? null : rest[rest.indexOf('--out') + 1];
  if (out) {
    const sh = sheet(rows);
    fs.writeFileSync(out + '/csa-daily-practice-code-repair-blog-posts.csv', sh.csv);
    console.log('  wrote ' + out + '/csa-daily-practice-code-repair-blog-posts.csv  (' + sh.rows + ' rows)\n');
  }
}
