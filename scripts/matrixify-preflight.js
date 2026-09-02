'use strict';
// ---------------------------------------------------------------------------
//  MATRIXIFY PREFLIGHT: check the FILE, not the intention.
//
//      node scripts/matrixify-preflight.js <sheet.csv> [--expect-command MERGE]
//
//  Every other check in this repo runs on the rows a generator BUILT. This one
//  parses the file that will actually be uploaded, with a reader that did not
//  write it. The distinction is not academic: the first CSA banner sheet was
//  rejected by Matrixify in one second with every row-level assertion green,
//  because both defects were in the envelope and nothing looked at the envelope.
//
//  The rules come from the store's own handoff doc, and each one is here because
//  breaking it has damaged live content on this store:
//
//    Body HTML present and BLANK        does not mean "leave it alone", it means
//                                       "set the body to empty". One SEO-only
//                                       sheet with a stray Body HTML column
//                                       wipes every page in it.
//    Published At = server time         scrambles sort order and feed behaviour.
//                                       Omit it, or use the store's fixed date.
//    utf-8 without a BOM                the consuming tool guesses Latin-1 and
//                                       a bullet arrives as three characters.
//    not QUOTE_ALL                      one comma inside 60K of HTML splits a row.
//    a cell over 32,767 characters      silently truncated.
//
//  NON-ASCII IS REPORTED, NOT REFUSED. The handoff says to write entities in
//  authored content, and that is right for authored content. These sheets
//  round-trip bodies that are ALREADY LIVE and already contain bullets, arrows
//  and non-breaking spaces. Converting them would break the byte-preservation
//  guarantee that makes a body rewrite safe, so they are carried through as-is
//  and counted here so nobody mistakes them for something this tool introduced.
//  The BOM is what keeps them intact, which is why its check is a hard failure.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');

const CELL_LIMIT = 32767;
const PUBLISHED_AT_OK = ['', '2026-03-01'];
//  Built from code points so this file stays pure ASCII. These are the byte
//  sequences a UTF-8 bullet, dash or emoji turns into when read as Latin-1.
const MOJIBAKE = [[0xE2, 0x80], [0xC3, 0xA2], [0xF0, 0x9F]]
  .map((p) => String.fromCharCode(p[0]) + String.fromCharCode(p[1]));
const EMOJI = /[\u{1F300}-\u{1FAFF}]/u;
const SHEET_NAMES = /(page|product|blog[-_ ]?post|article|collection|customer|order|smart[-_ ]?collection|redirect|metafield)/i;

//  Independent of every generator in this repo, on purpose.
function parseCsv(text) {
  const s = text.replace(/^\uFEFF/, '');
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

//  A <script> that does not compile is a page that does not work, and valid HTML
//  proves nothing about it. Compiled, never run.
function scriptsCompile(html) {
  const bad = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (!src.trim()) continue;
    if (/type\s*=\s*["'](application\/(ld\+)?json|text\/template)["']/i.test(m[0])) {
      n++;
      try { JSON.parse(src); } catch (e) { bad.push(`JSON block ${n}: ${e.message}`); }
      continue;
    }
    n++;
    // eslint-disable-next-line no-new-func
    try { new Function(src); } catch (e) { bad.push(`script block ${n}: ${e.message}`); }
  }
  return { checked: n, bad };
}

function preflight(path, opts) {
  opts = opts || {};
  const expectCommand = opts.expectCommand || 'MERGE';
  const raw = fs.readFileSync(path, 'utf8');
  const name = path.split(/[\\/]/).pop();
  const problems = [], notes = [];

  if (raw.charCodeAt(0) !== 0xFEFF) {
    problems.push('no BOM. Written as plain utf-8, a bullet arrives on the live page as '
      + 'three characters, because the consuming tool guesses Latin-1.');
  }
  if (!SHEET_NAMES.test(name)) {
    problems.push(`${name} names no sheet Matrixify recognises. A CSV has no tab name, so the `
      + 'FILE NAME carries the sheet type and the whole file is rejected in one second.');
  }

  const rows = parseCsv(raw);
  if (rows.length < 2) { problems.push('no data rows'); return { problems, notes, rows: 0 }; }
  const header = rows[0];
  const body = rows.slice(1);
  const col = (n) => header.indexOf(n);

  const QUOTED = /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/;
  const lines = raw.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
  if (lines.length !== rows.length) {
    notes.push(`${rows.length} rows across ${lines.length} CRLF lines: a body contains a bare newline, `
      + 'which is fine inside quotes and is why QUOTE_ALL is not optional.');
  }
  const unquoted = raw.replace(/^\uFEFF/, '').split('\r\n')
    .filter(Boolean).filter((l) => !QUOTED.test(l) && !/^"/.test(l));
  if (unquoted.length) problems.push(`${unquoted.length} line(s) are not fully quoted`);
  if (!/\r\n/.test(raw)) notes.push('line terminator is not CRLF');

  const bi = col('Body HTML');
  if (bi !== -1) {
    const blank = body.filter((r) => !String(r[bi] || '').trim());
    if (blank.length) {
      problems.push(`${blank.length} row(s) carry a BLANK Body HTML. That does not mean leave it `
        + 'alone, it means set the body to empty, and it would wipe those pages.');
    }
    const over = body.filter((r) => String(r[bi] || '').length > CELL_LIMIT);
    if (over.length) problems.push(`${over.length} row(s) exceed the ${CELL_LIMIT} character cell limit`);
  }

  const pi = col('Published At');
  if (pi !== -1) {
    const bad = body.filter((r) => PUBLISHED_AT_OK.indexOf(String(r[pi] || '').trim()) === -1);
    if (bad.length) problems.push(`${bad.length} row(s) set Published At to something other than `
      + `${JSON.stringify(PUBLISHED_AT_OK[1])}. A live server time scrambles sort order.`);
  }

  const ci = col('Command');
  if (ci === -1) problems.push('no Command column');
  else {
    const bad = body.filter((r) => String(r[ci]).trim().toUpperCase() !== expectCommand);
    if (bad.length) problems.push(`${bad.length} row(s) are not ${expectCommand}`);
  }

  let nonAscii = 0, scriptsChecked = 0;
  for (const r of body) {
    const cellText = bi === -1 ? '' : String(r[bi] || '');
    for (const sig of MOJIBAKE) {
      if (cellText.indexOf(sig) !== -1) { problems.push('mojibake sequence present in a body'); break; }
    }
    if (EMOJI.test(cellText)) problems.push('raw emoji present in a body');
    nonAscii += (cellText.match(/[^\x00-\x7F]/g) || []).length;
    const sc = scriptsCompile(cellText);
    scriptsChecked += sc.checked;
    sc.bad.forEach((b) => problems.push(b));
  }
  if (nonAscii) {
    notes.push(`${nonAscii} non-ASCII characters carried through from the live bodies `
      + '(bullets, arrows, non-breaking spaces). Not introduced here, and the BOM is what keeps '
      + 'them intact.');
  }

  return { problems, notes, rows: body.length, header, scriptsChecked, nonAscii };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0];
  if (!file) {
    console.error('usage: node scripts/matrixify-preflight.js <sheet.csv> [--expect-command MERGE]');
    process.exit(2);
  }
  const ec = args.indexOf('--expect-command');
  const r = preflight(file, { expectCommand: ec === -1 ? 'MERGE' : args[ec + 1] });
  console.log(`\nPREFLIGHT ${file}`);
  console.log(`  rows              : ${r.rows}`);
  console.log(`  columns           : ${(r.header || []).join(' | ')}`);
  console.log(`  script blocks ok  : ${r.scriptsChecked}`);
  r.notes.forEach((n) => console.log(`  note              : ${n}`));
  if (r.problems.length) {
    console.error(`\n  ${r.problems.length} PROBLEM(S). Do not import.\n`);
    [...new Set(r.problems)].slice(0, 8).forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }
  console.log('\n  clear to import.\n');
}

module.exports = { preflight, parseCsv, scriptsCompile, CELL_LIMIT, PUBLISHED_AT_OK };
