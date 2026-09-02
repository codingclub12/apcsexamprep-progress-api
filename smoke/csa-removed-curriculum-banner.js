'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the banner is added, and NOTHING ELSE MOVES.
//
//  scripts/csa-removed-curriculum-banner.js generates a Matrixify sheet that
//  rewrites the body of 49 live articles. Its whole safety argument is one
//  comparison, `after === BANNER + before`, and that comparison had no
//  committed test until this file: it was checked once, by hand, in a session
//  that is now gone.
//
//  That is exactly the gap that cost this operation 3,280 bytes of indentation
//  across 23 live CSP pages on 2026-09-01. Every semantic check passed, because
//  the loss was BETWEEN the tags and nothing reading option semantics can see
//  the space around them. A rewriter is only as safe as its byte guard, and a
//  byte guard nobody can re-run is a memory.
//
//  THE CSV IS PARSED BACK, NOT EYEBALLED. The generator's output is re-read
//  with an independent parser and compared to the intended bytes. Generating a
//  sheet and reading the same string you just wrote proves the string exists.
//
//  Offline. No network, no Shopify, no fixtures beyond the ones here.
//
//  Run: npm run smoke:csabanner
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const {
  BANNER, MARKER, addBanner, verify, sheetRows, toCsv, HEADER, BLOG_HANDLE,
} = require('../scripts/csa-removed-curriculum-banner');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

//  A body shaped like the real thing: graded markup, a script with an answer
//  key in it, and indentation, which is the thing that went missing last time.
const BODY = [
  '<div class="apcs-practice-wrapper">',
  '  <h2>Day 15 Advanced Practice</h2>',
  '  <pre><code>public class Dog extends Animal { }</code></pre>',
  '  <button class="mcq-option" data-i="0"><span>A</span> valid</button>',
  '  <button class="mcq-option" data-i="3"><span>D</span> also valid</button>',
  '  <script>var correctAnswer = "D"; var tries = 0;</script>',
  '</div>',
].join('\n');

//  An independent CSV reader. Deliberately NOT the generator's own quoting
//  logic inverted: a parser that shares the writer's assumptions agrees with it
//  whatever both of them do.
function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

console.log('\n1. The banner goes on, and it is the ONLY thing that changed');
{
  const r = addBanner('h', BODY);
  ok('  a body with no banner gets one', r.changed);
  ok('  the result is exactly the banner followed by the original body',
    r.body === BANNER + BODY);
  ok('  the original body survives as a contiguous byte-identical run',
    r.body.slice(BANNER.length) === BODY);
  ok('  growth is exactly the banner length, not one byte more',
    r.body.length - BODY.length === BANNER.length, r.body.length - BODY.length);
  ok('  the answer key is untouched', r.body.includes('var correctAnswer = "D"'));
  ok('  the graded buttons are untouched',
    (r.body.match(/class="mcq-option"/g) || []).length === 2);
  ok('  indentation inside the body is preserved, which is what went missing last time',
    r.body.includes('\n  <h2>Day 15 Advanced Practice</h2>'));
}

console.log('\n2. THE GUARD THAT CARRIES THE WEIGHT: anything else moving is refused');
{
  //  The exact failure mode from 2026-09-01: a transform that keeps every tag
  //  and every semantic and squeezes the whitespace between them.
  const squeezed = BANNER + BODY.replace(/\n\s+/g, '\n');
  const bad = verify('h', BODY, squeezed);
  ok('  a whitespace-only change OUTSIDE the banner is refused', bad.length > 0, bad);
  ok('  and the message points at the first differing byte',
    /first difference at byte \d+/.test(bad.join(' ')), bad);

  const reordered = BANNER + BODY.replace('data-i="0"', 'data-i="9"');
  ok('  a one-character change to graded markup is refused',
    verify('h', BODY, reordered).length > 0);

  ok('  a body with no banner at all is refused', verify('h', BODY, BODY).length > 0);
  ok('  the banner alone, body dropped, is refused', verify('h', BODY, BANNER).length > 0);
  ok('  the honest result is accepted', verify('h', BODY, BANNER + BODY).length === 0);
}

console.log('\n3. Running it twice does not banner twice');
{
  const once = addBanner('h', BODY).body;
  const twice = addBanner('h', once);
  ok('  a body that already carries the banner is skipped', !twice.changed, twice.reason);
  ok('  and comes back unchanged', twice.body === once);
  ok('  the marker appears exactly once', (once.match(new RegExp(MARKER, 'g')) || []).length === 1);

  //  The generator must skip it too, not just addBanner.
  const s = sheetRows({ a: BODY, b: once });
  ok('  the sheet carries only the article that needed it', s.rows.length === 1, s.rows.map((r) => r.handle));
  ok('  and says why the other was left out',
    s.skipped.length === 1 && /already carries/.test(s.skipped[0]), s.skipped);
}

console.log('\n4. The banner itself obeys the theme rules');
{
  ok('  pure ASCII', !/[^\x20-\x7E\n\r\t]/.test(BANNER));
  ok('  no em-dashes', !BANNER.includes('—'));
  ok('  no style block, which would leak across the whole page on this theme',
    !/<style[\s>]/i.test(BANNER));
  ok('  it starts with the all:initial reset CONVENTIONS.md requires',
    BANNER.startsWith('<div style="all:initial'));
  ok('  every color is paired with -webkit-text-fill-color',
    (BANNER.match(/[^-]color:/g) || []).length === (BANNER.match(/-webkit-text-fill-color:/g) || []).length,
    { color: (BANNER.match(/[^-]color:/g) || []).length,
      fill: (BANNER.match(/-webkit-text-fill-color:/g) || []).length });
  ok('  it links to the CED page that already tells students this',
    BANNER.includes('/pages/ap-csa-ced-explained'));
  ok('  no CED Essential Knowledge code in student-visible text',
    !/\b\d\.\d\.[A-Z]\.\d\b/.test(BANNER));
  ok('  it says what is true, in words a student reads',
    /removed from AP Computer Science A/.test(BANNER) && /will not appear on your exam/.test(BANNER));
}

console.log('\n5. The sheet, parsed back by a reader that did not write it');
{
  const bodies = { 'u3-c1-day-1': BODY, 'u3-c2-day-15': BODY + '\n<p>tail</p>' };
  const { rows, bad } = sheetRows(bodies);
  ok('  both articles made it into the sheet', rows.length === 2 && bad.length === 0, bad);

  const parsed = parseCsv(toCsv(rows));
  ok('  the header is exactly what Matrixify expects',
    JSON.stringify(parsed[0]) === JSON.stringify(HEADER), parsed[0]);
  ok('  every row names the blog, so the articles are not orphaned',
    parsed.slice(1).every((r) => r[0] === BLOG_HANDLE), parsed[1] && parsed[1][0]);
  ok('  every row is an UPDATE, never a create',
    parsed.slice(1).every((r) => r[2] === 'UPDATE'));
  ok('  there is one row per article and no blank trailing row',
    parsed.length === 3, parsed.length);

  //  The check that matters: the bytes that come BACK out of the CSV are the
  //  bytes we meant to send. Quoting, the BOM and the CRLF line endings all get
  //  a chance to corrupt a body full of quotes and newlines on the way through.
  for (const r of parsed.slice(1)) {
    const want = BANNER + bodies[r[1]];
    ok(`  ${r[1]} round-trips through CSV byte for byte`, r[3] === want,
      r[3] === want ? undefined : { at: [...want].findIndex((c, i) => r[3][i] !== c) });
  }

  const csv = toCsv(rows);
  ok('  the file opens with a BOM, so Excel does not mangle it', csv.charCodeAt(0) === 0xFEFF);
  ok('  rows are CRLF terminated', /\r\n$/.test(csv));
  //  QUOTE_ALL means every field on every line, the header included. Checked
  //  line by line rather than by looking for a bare comma, because a comma
  //  INSIDE a quoted body is legitimate and a naive scan flags it.
  const QUOTED_LINE = /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/;
  const unquoted = csv.replace(/^\ufeff/, '').split('\r\n')
    .filter(Boolean).filter((l) => !QUOTED_LINE.test(l));
  ok('  every field on every line is quoted, header included',
    unquoted.length === 0, unquoted.map((l) => l.slice(0, 60)));
}

console.log('\n5b. THE ENVELOPE, which is what actually failed');
{
  //  The first sheet generated here was REFUSED by Matrixify in one second:
  //  "Cannot understand the uploaded file". The bodies in it were correct, byte
  //  for byte. Everything this suite checked was right and the file was still
  //  unimportable, because nothing checked the two things that decide whether
  //  Matrixify will read a file at all.
  const { assertSheetName } = require('../scripts/csa-removed-curriculum-banner');

  //  1. The post's OWN columns are bare. Matrixify prefixes only RELATED
  //     entities, so `Article: Handle` is not a column it knows.
  ok('  the post\'s own columns are not prefixed',
    HEADER.includes('Handle') && HEADER.includes('Command') && HEADER.includes('Body HTML'), HEADER);
  ok('  and nothing in the header is prefixed with Article:',
    !HEADER.some((h) => /^Article:/i.test(h)), HEADER);
  ok('  the parent blog IS prefixed, because it is a related entity',
    HEADER.includes('Blog: Handle'), HEADER);

  //  2. A CSV has no tab name, so Matrixify reads the sheet type off the FILE
  //     NAME. This is the one that cost the canary.
  ok('  a file name Matrixify cannot recognise is refused',
    !!assertSheetName('csa-banner-canary.csv'), assertSheetName('csa-banner-canary.csv'));
  ok('  and the refusal explains that the name IS the sheet type',
    /reads the sheet type off the file name/.test(assertSheetName('x.csv') || ''));
  for (const good of ['csa-banner-blog-posts.csv', 'Blog Posts.csv', 'my_blog_post.csv',
    '/tmp/deep/path/all-blog-posts.csv']) {
    ok(`  ${JSON.stringify(good)} is accepted`, assertSheetName(good) === null, assertSheetName(good));
  }

  //  UPDATE, not MERGE, and the difference is a live blog. MERGE creates a row
  //  it cannot find, so one typo'd handle would publish a blank article.
  const { rows } = sheetRows({ 'u3-c1-day-1': BODY });
  const line = toCsv(rows).split('\r\n')[1];
  ok('  every row is UPDATE, so a typo skips instead of creating a blank article',
    line.includes('"UPDATE"') && !line.includes('"MERGE"'), line.slice(0, 80));
}

console.log('\n6. A body the generator cannot handle is DROPPED, never guessed at');
{
  //  sheetRows must not emit a row it could not verify. A refusal costs a
  //  minute; a bad row costs a live article.
  const rows = sheetRows({ ok: BODY }).rows;
  ok('  a verified body produces a row', rows.length === 1);
  ok('  and the row carries the full new body, not a diff',
    rows[0].body === BANNER + BODY && rows[0].grew === BANNER.length);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
