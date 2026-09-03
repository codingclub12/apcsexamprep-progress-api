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

//  32,767 is EXCEL's per-cell limit, so it binds an .xlsx and not a .csv. Taking
//  it as a CSV rule was wrong and would have rejected every real Pages sheet on
//  this store: the handoff says in one breath that page bodies here run 60K to
//  270K characters, and in another that cells cap at 32,767. Both are true of
//  different formats. The Cyber Command Center body is 68,654 characters and
//  imports fine as CSV.
const XLSX_CELL_LIMIT = 32767;
//  The handoff's own threshold for "check this one by hand" on a CSV.
const CSV_LARGE_CELL = 250000;
//  The rule is that Published At must not be a LIVE SERVER TIME, because that
//  scrambles sort order and feed behaviour. It is not that the cell must be
//  bare. The store's own fixed date is 2026-03-01, and a fixed time on that
//  date is the same fixed value with more precision:
//  scripts/csp-lesson-exercise-links.js has written "2026-03-01 12:00:00" since
//  August and its imports are live. This first refused that sheet, which was the
//  check being narrower than the rule it enforces rather than the sheet being
//  wrong. Anything on another date, or carrying today's date, still fails.
const PUBLISHED_AT_DATE = '2026-03-01';
const PUBLISHED_AT_OK = ['', PUBLISHED_AT_DATE];
const publishedAtOk = (v) => {
  const t = String(v || '').trim();
  if (PUBLISHED_AT_OK.indexOf(t) !== -1) return true;
  //  <date> then a time, and nothing else.
  return new RegExp('^' + PUBLISHED_AT_DATE + '[ T]\\d{2}:\\d{2}(:\\d{2})?Z?$').test(t);
};
//  MOJIBAKE IS NOT A PATTERN MATCH ANY MORE, and the three byte pairs that used
//  to live here are why. They were the LATIN-1 lead sequences for a bullet, a
//  doubly corrupted bullet and an emoji:
//
//    U+00E2 U+0080    a 3-byte character, latin-1
//    U+00C3 U+00A2    the same, corrupted a second time
//    U+00F0 U+009F    a 4-byte character, latin-1
//
//  A Matrixify sheet comes out of Excel or a CSV pipeline, so the flavor it
//  actually carries is CP1252, where those leads read U+00E2 U+20AC and
//  U+00F0 U+0178 instead. Neither is in that list, so a sheet carrying the
//  bullet reported on a live page passed this gate. smoke/matrixify-preflight.js
//  passed too, because its fixture was built in the latin-1 flavor as well: the
//  guard and its test shared one blind spot and agreed with each other.
//
//  lib/mojibake.js finds these by REVERSING them, which needs no list and covers
//  both codecs, all three widths and any corruption depth.
const mojibake = require('../lib/mojibake.js');
const EMOJI = /[\u{1F300}-\u{1FAFF}]/gu;
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

  //  A BLANK CELL IS AN ERASE, IN EVERY COLUMN, NOT JUST Body HTML.
  //
  //  The handoff states this about Body HTML and that is where it hurts most, but
  //  the mechanism is general: Matrixify writes what you give it. A sheet built
  //  to roll ten page Titles carried a title_tag column because ONE of the ten
  //  also needed that, so nine rows had an empty title_tag cell. It would have
  //  cleared the SEO title on nine live pages, one of which had already been
  //  migrated correctly by hand.
  //
  //  IDENTIFIER columns are exempt: they address the row rather than set it.
  //  Body HTML keeps its OWN message and is checked first, because it is the
  //  costliest instance and "it would wipe those pages" is what makes somebody
  //  stop. Folding it into the general rule made the general rule shadow it,
  //  which the suite caught by asserting on the message rather than the refusal.
  const IDENTIFIER = /^(ID|Handle|Command|Blog: Handle|Blog: ID|Blog: Title)$/i;
  const bodyIdx = col('Body HTML');
  if (bodyIdx !== -1) {
    const blankBody = body.filter((r) => !String(r[bodyIdx] || '').trim());
    if (blankBody.length) {
      problems.push(`${blankBody.length} row(s) carry a BLANK Body HTML. That does not mean leave `
        + 'it alone, it means set the body to empty, and it would wipe those pages.');
    }
  }
  for (let i = 0; i < header.length; i++) {
    if (IDENTIFIER.test(String(header[i]).trim())) continue;
    if (i === bodyIdx) continue;
    const blank = body.filter((r) => !String(r[i] || '').trim());
    if (!blank.length) continue;
    problems.push(`${blank.length} of ${body.length} row(s) carry a BLANK `
      + `${JSON.stringify(header[i])}. A blank cell does not mean leave it alone, it means set `
      + 'it to empty. Split the sheet so every column is one every row is changing.');
  }

  const bi = bodyIdx;
  if (bi !== -1) {
    const isXlsx = /\.xlsx$/i.test(name);
    const cap = isXlsx ? XLSX_CELL_LIMIT : CSV_LARGE_CELL;
    const over = body.filter((r) => String(r[bi] || '').length > cap);
    if (over.length) {
      problems.push(`${over.length} row(s) exceed the ${cap} character cell limit for `
        + `${isXlsx ? 'xlsx' : 'csv'}`);
    }
    if (!isXlsx) {
      const big = body.filter((r) => String(r[bi] || '').length > XLSX_CELL_LIMIT);
      if (big.length) {
        notes.push(`${big.length} row(s) are over ${XLSX_CELL_LIMIT} characters, which is fine `
          + 'for CSV and would not survive xlsx. Do not re-save this file as a spreadsheet.');
      }
    }
  }

  const pi = col('Published At');
  if (pi !== -1) {
    const bad = body.filter((r) => !publishedAtOk(r[pi]));
    if (bad.length) problems.push(`${bad.length} row(s) set Published At to something that is not `
      + `${JSON.stringify(PUBLISHED_AT_DATE)}, with or without a fixed time. `
      + 'A live server time scrambles sort order.');
  }

  const ci = col('Command');
  if (ci === -1) problems.push('no Command column');
  else {
    const bad = body.filter((r) => String(r[ci]).trim().toUpperCase() !== expectCommand);
    if (bad.length) problems.push(`${bad.length} row(s) are not ${expectCommand}`);
  }

  const hi = col('Handle');
  let nonAscii = 0, scriptsChecked = 0, carriedEmoji = 0, mojiSuspects = 0;
  for (const r of body) {
    const cellText = bi === -1 ? '' : String(r[bi] || '');
    //  cap 5: a body is up to 270K characters and one is enough to refuse the
    //  sheet, so there is no reason to walk a corrupted megabyte to the end.
    const moji = mojibake.scan(cellText, 5);
    if (moji.hits.length) {
      problems.push('mojibake sequence present in a body: '
        + mojibake.summarize(moji.hits) + '. Reverse it, do not retype the body.');
    }
    //  A suspect is a run that reverses cleanly but recovers a character this
    //  store's content should not contain. Reported, never fatal: refusing a
    //  sheet on one would block a real import over a Nordic sort label. See the
    //  second-tier note in lib/mojibake.js.
    mojiSuspects += moji.suspects.length;
    //  CARRIED vs INTRODUCED, the same distinction the non-ASCII note makes.
    //  The handoff says emoji are not used in this store's page content, and the
    //  live Cyber Command Center body carries 27 of them in its resource rows.
    //  Refusing them would mean a round-trip of that page can never be written,
    //  and stripping them would change live content well beyond the edit. So an
    //  emoji the sheet ADDS is refused, and one that was already there is
    //  counted. Proving the difference needs the original, which is what
    //  --carrying supplies; with no original, the safe reading is "introduced".
    const found = cellText.match(EMOJI) || [];
    if (found.length) {
      const handle = hi === -1 ? null : String(r[hi] || '');
      const original = (opts.carrying && handle) ? opts.carrying[handle] : undefined;
      if (original === undefined) {
        problems.push('raw emoji present in a body, and no original was supplied to show '
          + 'it was already there. Pass --carrying <handle-to-body.json> for a round-trip.');
      } else {
        //  THE RULE IS THE GLYPH SET, NOT THE COUNT, and the difference is not a
        //  convenience. Counting instances forbids ADDING A ROW to a list where
        //  every row carries an icon: the Cyber Command Center resource rows all
        //  have one, so a new row either invents an icon or renders an empty
        //  icon slot. Neither is what the handoff is protecting against.
        //
        //  What it IS protecting against is an emoji turning up in content where
        //  none belongs, and the mojibake that follows a bad encoding. A glyph
        //  the page did not already use is exactly that, and is still refused.
        //  More of a glyph it already uses, in the slot it already uses it in,
        //  is not, and is reported so it is never silent.
        const glyphs = (t) => new Set(String(t).match(EMOJI) || []);
        const had = glyphs(original);
        const now = glyphs(cellText);
        const introduced = [...now].filter((g) => !had.has(g));
        if (introduced.length) {
          problems.push(`a body introduces ${introduced.length} emoji the live page does not use `
            + `(${introduced.map((g) => 'U+' + g.codePointAt(0).toString(16).toUpperCase()).join(', ')})`);
        } else {
          carriedEmoji += found.length;
          const extra = found.length - (String(original).match(EMOJI) || []).length;
          if (extra > 0) {
            notes.push(`${extra} more instance(s) of emoji the page already uses, no new glyph.`);
          }
        }
      }
    }
    nonAscii += (cellText.match(/[^\x00-\x7F]/g) || []).length;
    const sc = scriptsCompile(cellText);
    scriptsChecked += sc.checked;
    sc.bad.forEach((b) => problems.push(b));
  }
  if (carriedEmoji) {
    notes.push(`${carriedEmoji} emoji carried through from the live bodies, none added.`);
  }
  if (mojiSuspects) {
    notes.push(`${mojiSuspects} run(s) reverse cleanly but recover a character this store `
      + 'should not have. Not refused, because a Nordic sort label looks exactly like this. '
      + 'Check them by hand if a page looks wrong.');
  }
  if (nonAscii) {
    notes.push(`${nonAscii} non-ASCII characters carried through from the live bodies `
      + '(bullets, arrows, non-breaking spaces). Not introduced here, and the BOM is what keeps '
      + 'them intact.');
  }

  return { problems, notes, rows: body.length, header, scriptsChecked, nonAscii, mojiSuspects };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0];
  if (!file) {
    console.error('usage: node scripts/matrixify-preflight.js <sheet.csv> '
      + '[--expect-command MERGE] [--carrying <handle-to-body.json>]');
    process.exit(2);
  }
  const ec = args.indexOf('--expect-command');
  const cy = args.indexOf('--carrying');
  const carrying = cy === -1 ? null
    : JSON.parse(fs.readFileSync(args[cy + 1], 'utf8'));
  const r = preflight(file, {
    expectCommand: ec === -1 ? 'MERGE' : args[ec + 1],
    carrying,
  });
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

module.exports = { preflight, parseCsv, scriptsCompile, XLSX_CELL_LIMIT, CSV_LARGE_CELL,
  PUBLISHED_AT_OK };
