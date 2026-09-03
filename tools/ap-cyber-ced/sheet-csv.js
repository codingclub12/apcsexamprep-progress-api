'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE MATRIXIFY DIALECT, WRITTEN AND READ BACK.
//
//  ── WHY THE READER MATTERS AS MUCH AS THE WRITER ────────────────────────────
//  On 2026-09-01 a CSP sheet lost 90 bytes a page. Every semantic check passed:
//  the HTML was well formed, the widgets were wired, the answer keys matched. A
//  CSV parse-back diff is what caught it, because the loss happened in the
//  QUOTING, after every check had already looked at the body and approved it.
//
//  So a sheet is never trusted as written. It is written, parsed back, and the
//  parsed body is compared byte for byte with the body that went in. That check
//  is only as good as the reader, which is why the reader here is a full
//  quoted-CSV parser rather than a split on commas.
//
//  ── THE DIALECT, AND WHY EXACTLY THIS ONE ───────────────────────────────────
//    utf-8 with a BOM     Matrixify reads utf-8-sig
//    CRLF line endings    what the sheets that already import cleanly use
//    every cell quoted    QUOTE_ALL; a body full of commas and quotes is the
//                         normal case here, not the exception
//    MERGE command        MERGE writes the WHOLE body, which is why an empty
//                         Body HTML cell wipes a live page
//    past-dated Published At
//
//  Byte for byte the dialect of scripts/csa-exercise-pages-csv.js and
//  scripts/csa-frq-pages-csv.js. A sheet in a subtly different dialect from the
//  ones that already import is a problem discovered during an import.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  Past-dated on purpose: `now()` has published pages into the future, where
//  the storefront will not serve them.
const PUBLISHED_AT = '2026-03-01';

const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
  'SEO Title', 'SEO Description'];

const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

/**
 * Rows to a Matrixify CSV.
 * @param {Array<object>} rows objects keyed by HEADER names
 * @param {string[]} [header]
 * @returns {string} the whole file, BOM included
 */
function writeCsv(rows, header = HEADER) {
  const lines = [header.map(cell).join(',')];
  for (const r of rows) lines.push(header.map((h) => cell(r[h])).join(','));
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

/**
 * A Matrixify CSV back to rows. Written independently of writeCsv above: a
 * reader that shares the writer's assumptions cannot catch the writer's bugs.
 * @param {string} text
 * @returns {{header: string[], rows: Array<object>, raw: string[][]}}
 */
function parseCsv(text) {
  const s = text.replace(/^\ufeff/, '');
  const raw = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(field); raw.push(row); row = []; field = ''; i++; continue; }
    if (c === '\n') { row.push(field); raw.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); raw.push(row); }

  const header = raw.length ? raw[0] : [];
  const rows = raw.slice(1).map((cells) => {
    const o = {};
    header.forEach((h, i) => { o[h] = cells[i] === undefined ? '' : cells[i]; });
    return o;
  });
  return { header, rows, raw };
}

/**
 * Write, read back, and report every field that did not survive the round trip.
 *
 * This is the check that catches a quoting bug, a stray newline, a lost cell,
 * and the 90-bytes-a-page class of loss. Byte length is compared as well as
 * text, because "looks the same" and "is the same" have already differed once.
 *
 * @param {Array<object>} rows
 * @param {string[]} [header]
 * @returns {{csv: string, drift: string[], bytes: number}}
 */
function roundTrip(rows, header = HEADER) {
  const csv = writeCsv(rows, header);
  const back = parseCsv(csv);
  const drift = [];

  if (back.header.join(',') !== header.join(',')) {
    drift.push(`header changed: ${JSON.stringify(back.header)}`);
  }
  if (back.rows.length !== rows.length) {
    drift.push(`row count changed: wrote ${rows.length}, read ${back.rows.length}`);
  }

  rows.forEach((sent, i) => {
    const got = back.rows[i];
    if (!got) { drift.push(`row ${i + 1} (${sent.Handle}) is missing after parse-back`); return; }
    for (const h of header) {
      const a = sent[h] == null ? '' : String(sent[h]);
      const b = got[h] == null ? '' : String(got[h]);
      if (a === b) continue;
      const ab = Buffer.byteLength(a);
      const bb = Buffer.byteLength(b);
      drift.push(`row ${i + 1} (${sent.Handle}) column ${JSON.stringify(h)} changed:`
        + ` ${ab} bytes in, ${bb} bytes out${ab === bb ? '' : `, ${ab - bb} lost`}`
        + `, first difference at ${firstDiff(a, b)}`);
    }
  });

  return { csv, drift, bytes: Buffer.byteLength(csv) };
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

module.exports = { HEADER, PUBLISHED_AT, writeCsv, parseCsv, roundTrip, cell };
