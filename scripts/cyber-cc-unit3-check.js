'use strict';
// -----------------------------------------------------------------------------
//  DOES EVERY CYBER COMMAND CENTER ROW OPEN THE LESSON IT NAMES?
//
//  ── WHY THIS REPLACED A SHEET ──────────────────────────────────────────────
//  Board 283: three Unit 3 rows opened a page about something else, because the
//  Command Center keyed its rows on the RETIRED SITE numbers and built every
//  handle as lesson-<row number>. That identity held until Unit 3 was renumbered
//  onto the CED as a three-cycle over lessons 3, 5 and 6.
//
//  A generator here rewrote those handles, leaving the old row numbers in place.
//  On 2026-09-08 the page was renumbered instead: the rows now carry the CED
//  lesson ids themselves (3.1a, 3.1b, 3.2 through 3.5), which is the deeper fix
//  and retires both the generator and its sheet. Importing that sheet afterwards
//  would have MERGED the pre-renumbering body back over the live page.
//
//  What survives is the QUESTION, which is worth asking on every future change
//  to that page and is not answerable by reading it: a row can name one topic
//  and link another, and both halves look fine on their own.
//
//  ── HOW IT ANSWERS ─────────────────────────────────────────────────────────
//  The row id is a lesson id. utils.pageFromHandle is the resolver PRODUCTION
//  keys on, the same one /track and the gradebook use. So the check is: resolve
//  the handle each row links, and require it to equal that row's own id. Two
//  independent statements about one fact, and neither is a mapping written here.
//
//  Topic 3.1 is taught over two pages and keys two columns, so a row reading
//  3.1a must resolve to 3.1a and not merely to something in topic 3.1.
//
//  Read only, no credential, fetched through lib/storefront-fetch.js.
//
//  Run: node scripts/cyber-cc-unit3-check.js [body.html]
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const { pageFromHandle } = require('../utils');

const CC_HANDLE = 'cyber-command-center';

//  Rows and links are read separately and joined on the row id, because that is
//  exactly where the defect lived: the two halves disagreed while each looked
//  well formed on its own.
function readRows(body) {
  const rows = [];
  for (const m of body.matchAll(/\{ id:"(\d\.[0-9a-z]+)", title:"([^"]*)"/g)) {
    rows.push({ id: m[1], title: m[2] });
  }
  return rows;
}
function readLinks(body) {
  const map = {};
  for (const m of body.matchAll(/"(\d\.[0-9a-z]+)":\{page:"\/pages\/([a-z0-9-]+)"/g)) map[m[1]] = m[2];
  return map;
}

function main() {
  const src = process.argv[2];
  const body = src ? fs.readFileSync(src, 'utf8') : sf.pageBody(CC_HANDLE).body_html;

  const rows = readRows(body).filter((r) => r.id.startsWith('3.'));
  const links = readLinks(body);
  if (!rows.length) {
    console.error('  no Unit 3 rows parsed. The page structure changed; read it before trusting this.');
    console.log('rows=0 correct=0');
    process.exit(1);
  }

  let correct = 0;
  const bad = [];
  for (const r of rows) {
    const handle = links[r.id];
    const res = handle ? pageFromHandle(handle) : null;
    const lesson = res ? res.lesson : null;
    if (lesson === r.id) correct++;
    else bad.push(`${r.id} "${r.title}" links ${handle || '(nothing)'}, which resolves to ${lesson || 'no lesson'}`);
  }
  for (const b of bad) console.error('  ' + b);
  console.log(`rows=${rows.length} correct=${correct}`);
  process.exit(correct === rows.length ? 0 : 1);
}

if (require.main === module) main();
module.exports = { readRows, readLinks };
