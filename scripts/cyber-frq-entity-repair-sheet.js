'use strict';
// ---------------------------------------------------------------------------
//  REPAIR THE ADDRESS MY OWN IMPORT DESTROYED, AND SAY WHY IT HAPPENED.
//
//      node scripts/cyber-frq-entity-repair-sheet.js [--out <path>]
//
//  ---- WHAT BROKE -----------------------------------------------------------
//  imports/2026-09-06/cyber-unit1-frq-item-id-pages.csv shipped the page body
//  carrying &lt;helpdesk@rivertonl1b.org&gt;, exactly as the store already held
//  it. After the import the live body reads <helpdesk></helpdesk> and the
//  address is gone. On a phishing exercise the lookalike domain IS the question:
//  rivertonl1b.org, with a 1 for the l, against the real rivertonlib.org three
//  lines above it. A student asked to spot the sender cannot.
//
//  ---- THE MECHANISM, MEASURED RATHER THAN ASSUMED --------------------------
//  One import is a measured input/output pair over 40825 characters, and
//  diffing it gives the transform exactly. Shopify DECODES ENTITIES ONCE, THEN
//  PARSES AS HTML, THEN RE-SERIALIZES:
//
//      &amp;   -> &        -> text node   -> &amp;    10 of 10 survived
//      &lt;    -> <        -> TAG START   -> the element helpdesk, with
//                                           @rivertonl1b.org read as an
//                                           attribute and dropped, closed as
//                                           <helpdesk></helpdesk>
//
//  docs/shopify-page-imports.md has the decode half of this and cost a live page
//  in August. Its rule is written for entities a <script> needs to still BE
//  entities, and it says in as many words that "entities in ordinary markup are
//  fine: a &rarr; in a button decodes to the arrow that was meant". That is true
//  of &rarr; and false of &lt;, because &lt; does not decode to a character, it
//  decodes to SYNTAX. I read the doc after shipping rather than before.
//
//  ---- THE FIX ---------------------------------------------------------------
//  Send &amp;lt;, which survives the one decode as &lt;, parses as a text "<",
//  and re-serializes as &lt;. That is the byte the store held before.
//
//  Built from the LIVE body rather than from the pre-import snapshot, so it
//  repairs one span and cannot silently revert anything else that has changed.
//
//  ---- WHAT THIS DELIBERATELY DOES NOT REPAIR --------------------------------
//  The same import turned one U+00A0 into a plain space, at the gap between
//  "Displayed text: <code>..</code>" and "Actual target: <code>..</code>". There
//  are ordinary spaces on both sides of it, so it renders identically and only
//  the wrap point can move. Chasing it means another live import to fix a
//  character nobody can see. Recorded here instead.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sf = require('../lib/storefront-fetch.js');

const HANDLE = 'ap-cyber-unit-1-frq-practice';
//  What the import left behind, and what belongs there.
const DAMAGED = '<helpdesk></helpdesk>';
const ADDRESS = 'helpdesk@rivertonl1b.org';
//  Double encoded ON PURPOSE. See the mechanism above: one decode is applied
//  before parsing, so this reaches the parser as &lt; and is stored as &lt;.
const REPAIR = '&amp;lt;' + ADDRESS + '&amp;gt;';
//  What the store should hold once it has decoded and re-serialized.
const EXPECT_STORED = '&lt;' + ADDRESS + '&gt;';

const COLUMNS = ['Handle', 'Command', 'Body HTML'];
const BOM = '﻿';
const DEFAULT_OUT = path.join(__dirname, '..', 'imports', '2026-09-06',
  'cyber-unit1-frq-entity-repair-pages.csv');

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function toCsv(header, rows) {
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const line = (arr) => arr.map(cell).join(',');
  return BOM + [line(header)].concat(rows.map(line)).join('\r\n') + '\r\n';
}

function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
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

function main() {
  const argv = process.argv.slice(2);
  const oi = argv.indexOf('--out');
  const out = oi === -1 ? DEFAULT_OUT : argv[oi + 1];
  const fail = (m) => { console.error('REFUSED: ' + m); process.exit(1); };

  const live = sf.pageBody(HANDLE).body_html;
  console.log('live body    ' + live.length + ' chars, sha256 ' + sha(live));

  //  If the page is already repaired, this must not ship a no-op sheet that
  //  reads as a fix.
  if (live.indexOf(ADDRESS) !== -1) {
    fail('the live body already carries ' + ADDRESS + '. Nothing to repair; do not import.');
  }
  const hits = live.split(DAMAGED).length - 1;
  if (hits !== 1) fail('expected exactly 1 ' + DAMAGED + ' in the live body, found ' + hits);

  const sent = live.replace(DAMAGED, REPAIR);

  if (sent.length !== live.length - DAMAGED.length + REPAIR.length) {
    fail('length delta is wrong: ' + (sent.length - live.length));
  }
  const idx = live.indexOf(DAMAGED);
  if (live.slice(0, idx) !== sent.slice(0, idx)
      || live.slice(idx + DAMAGED.length) !== sent.slice(idx + REPAIR.length)) {
    fail('the bodies differ somewhere other than the repaired span');
  }

  //  What the store is predicted to hold afterwards, stated here so the live
  //  check has something to compare against instead of a marker count.
  const predicted = live.replace(DAMAGED, EXPECT_STORED);
  console.log('sent         ' + sent.length + ' chars, sha256 ' + sha(sent));
  console.log('predicted    ' + predicted.length + ' chars, sha256 ' + sha(predicted));
  console.log('repairs      ' + JSON.stringify(DAMAGED) + ' -> ' + JSON.stringify(EXPECT_STORED)
    + ' at offset ' + idx);

  const csv = toCsv(COLUMNS, [[HANDLE, 'MERGE', sent]]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv, 'utf8');
  console.log('wrote        ' + out + ' (' + Buffer.byteLength(csv, 'utf8') + ' bytes)');

  const reread = parseCsv(fs.readFileSync(out, 'utf8'));
  if (reread.length !== 2) fail('read back ' + reread.length + ' rows, expected 2');
  const EXPECTED_HEADER = 'Handle,Command,Body HTML';
  if (reread[0].join(',') !== EXPECTED_HEADER) {
    fail('header is ' + JSON.stringify(reread[0].join(',')) + ' rather than ' + EXPECTED_HEADER);
  }
  if (reread[1][0] !== HANDLE) fail('handle did not survive the round trip');
  if (reread[1][1] !== 'MERGE') fail('command did not survive the round trip');
  if (reread[1][2] !== sent) fail('the body read back is not the body meant to ship');
  console.log('parse back   2 rows, body sha256 matches');

  //  The predicted stored body, committed, so the post-import check is a FULL
  //  BODY EQUALITY rather than the two-marker check that passed on a damaged
  //  page last time.
  const predFile = out.replace(/\.csv$/, '.predicted.json');
  fs.writeFileSync(predFile, JSON.stringify({ [HANDLE]: predicted }), 'utf8');
  console.log('predicted    ' + predFile);
  console.log('');
  console.log('after import: node scripts/verify-frq-entity-repair.js');
}

main();
