'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  NOINDEX SHEETS FOR THE PAGES THAT MUST NOT BE IN SEARCH.
//
//  One Matrixify Pages sheet per group in config/noindex-pages.json. Renamed
//  from cyber-unit-exam-noindex-csv.js on 2026-09-04 when the second group
//  landed; the cyber sheet keeps its filename, so nothing that references it
//  breaks.
//
//  ── WHY A METAFIELD AND NOT THEME CODE ─────────────────────────────────────
//  Shopify reads the metafield namespace `seo`, key `hidden`, value 1 and emits
//  BOTH the noindex/nofollow meta tags and the sitemap.xml exclusion itself. No
//  theme conditional, no handle list compiled into layout/theme.liquid, and
//  deleting the metafield reverses both halves at once.
//  https://shopify.dev/docs/apps/build/marketing/optimize-storefront-seo
//
//  That matters here beyond convenience. layout/theme.liquid wraps its own
//  canonical in `if disabled_by_yoast_seo`, a variable this theme never assigns,
//  so it is nil, so it is falsy, so anything added inside that block would never
//  render. snippets/meta-tags.liquid documents the same trap and the day it cost
//  the storefront every og: tag. A robots meta added to the head by hand would
//  be one edit away from landing inside that block. The metafield cannot.
//
//  ── THE SET IS NOT THE LIST IN THE AUDIT ───────────────────────────────────
//  docs/meta-description-gaps.md files 17 handles under one heading, "Internal,
//  gated, or test pages". Measured live on 2026-09-04, that heading is wrong
//  about nine of them: they carry custom global.title_tag values such as "AP CSA
//  Pacing Guide 2026-27" and "Free Class Gradebook", which is deliberate SEO
//  investment rather than an oversight. A tenth is a 301, and a MERGE on a
//  handle Shopify cannot find CREATES a blank page there, which would publish an
//  empty record over a working redirect.
//
//  So the config names what is EXCLUDED and why, not just what is included. A
//  future session will find that list of 17 again, and "these ten are missing"
//  is a question it should be able to answer without re-measuring the site.
//
//  ── SHEET RULES THIS FILE OBEYS ────────────────────────────────────────────
//  docs/matrixify-import-rules.md, every one of which cost live content once:
//  only the columns being changed plus the identifiers, because a blank cell is
//  an erase in EVERY column and not only in Body HTML; MERGE; UTF-8 with BOM;
//  QUOTE_ALL; CRLF. There is no Body HTML column, no Title, no Published At.
//  Every row sets the one metafield, so no cell in it is ever blank.
//
//  The absent Body HTML column is load-bearing for one handle in particular: an
//  import deleted the entire self-study tab from /pages/join on 2026-08-22 while
//  every guard in the generator reported green (board 112, docs/availability.md).
//  These sheets cannot do that, because they carry no body to write.
//
//  Generation is not evidence that generation worked, so --check parses every
//  emitted file back with a real quoted-CSV reader and diffs it against the
//  config. The CSP sheet lost 90 bytes a page while every semantic check passed
//  and a parse-back diff is what caught it.
//
//    node scripts/noindex-sheets.js            write every group's sheet
//    node scripts/noindex-sheets.js --check    parse back and diff, write nothing
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const CONFIG = path.join(__dirname, '..', 'config', 'noindex-pages.json');
const SHEET_DIR = path.join(__dirname, '..', 'matrixify');

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function spec() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const mf = cfg.metafield;
  //  The column name follows the convention already established by ten
  //  generators in this repo (Metafield: <namespace>.<key> [<type>]), not a
  //  header typed from memory, which the import rules forbid for good reason.
  const column = `Metafield: ${mf.namespace}.${mf.key} [${mf.type}]`;

  if (!cfg.groups.length) throw new Error('config/noindex-pages.json has no groups');
  const seen = new Map();
  for (const g of cfg.groups) {
    if (!g.sheet) throw new Error(`group ${g.id} names no sheet file`);
    if (!g.handles || !g.handles.length) throw new Error(`group ${g.id} is empty`);
    //  A handle in two groups would be written twice by two sheets. Harmless in
    //  MERGE, but it means the config disagrees with itself about who owns it.
    for (const h of g.handles) {
      if (seen.has(h)) throw new Error(`${h} appears in both ${seen.get(h)} and ${g.id}`);
      seen.set(h, g.id);
    }
  }

  //  A handle the config both hides and excludes is a contradiction that would
  //  otherwise ship as a live page change.
  const excluded = Object.values(cfg.excluded || {})
    .filter((e) => e && e.handles)
    .flatMap((e) => Object.keys(e.handles));
  for (const h of excluded) {
    if (seen.has(h)) throw new Error(`${h} is in group ${seen.get(h)} AND in the excluded list`);
  }

  return { column, value: mf.value, groups: cfg.groups };
}

function build(group, { column, value }) {
  const lines = [['Handle', 'Command', column].map(cell).join(',')];
  for (const h of group.handles) lines.push([h, 'MERGE', value].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  A second reader rather than a split on commas: the point of a parse-back is
//  that it does not share the writer's assumptions.
function parse(text) {
  const t = text.startsWith(BOM) ? text.slice(1) : text;
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  while (i < t.length) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && t[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n' || c === '\r') throw new Error('bare newline outside a quoted field: the file is not CRLF');
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function check(group, { column, value }) {
  const file = path.join(SHEET_DIR, group.sheet);
  const problems = [];
  if (!fs.existsSync(file)) return { problems: [`${group.sheet} does not exist`], rows: 0, got: [] };
  const raw = fs.readFileSync(file, 'utf8');

  if (!raw.startsWith(BOM)) problems.push('missing UTF-8 BOM: the importer will guess Latin-1');
  if (/[^\r]\n/.test(raw.replace(/\r\n/g, ''))) problems.push('line endings are not all CRLF');
  //  QUOTE_ALL: every field on every line is wrapped, so no line may contain a
  //  comma that is not between a closing and an opening quote.
  const body = raw.startsWith(BOM) ? raw.slice(1) : raw;
  for (const line of body.split('\r\n').filter(Boolean)) {
    if (!/^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/.test(line)) problems.push(`not QUOTE_ALL: ${line.slice(0, 60)}`);
  }

  const rows = parse(raw);
  const header = rows.shift();
  const want = ['Handle', 'Command', column];
  if (String(header) !== String(want)) problems.push(`header is ${JSON.stringify(header)}, expected ${JSON.stringify(want)}`);

  //  A column every row is not setting would erase that field on a live page.
  for (const [n, r] of rows.entries()) {
    if (r.length !== want.length) problems.push(`row ${n + 1} has ${r.length} cells, expected ${want.length}`);
    if (r.some((c) => c === '')) problems.push(`row ${n + 1} has a blank cell, which is an erase: ${JSON.stringify(r)}`);
    if (r[1] !== 'MERGE') problems.push(`row ${n + 1} command is ${r[1]}, expected MERGE`);
    if (r[2] !== value) problems.push(`row ${n + 1} value is ${r[2]}, expected ${value}`);
  }

  const got = rows.map((r) => r[0]);
  const missing = group.handles.filter((h) => !got.includes(h));
  const extra = got.filter((h) => !group.handles.includes(h));
  if (missing.length) problems.push(`handles in config but not in the sheet: ${missing.join(', ')}`);
  if (extra.length) problems.push(`handles in the sheet but not in config: ${extra.join(', ')}`);
  if (new Set(got).size !== got.length) problems.push('a handle appears twice');

  return { problems, rows: rows.length, got };
}

function main() {
  const s = spec();
  const writing = !process.argv.includes('--check');
  let failed = 0;

  for (const group of s.groups) {
    if (writing) {
      fs.writeFileSync(path.join(SHEET_DIR, group.sheet), build(group, s));
      console.log(`wrote matrixify/${group.sheet}  ${group.handles.length} rows`);
    }
    const { problems, rows, got } = check(group, s);
    if (problems.length) {
      console.error(`\nPARSE-BACK FAILED for ${group.id}, ${problems.length} problem(s):`);
      for (const p of problems) console.error(`  ${p}`);
      failed += problems.length;
      continue;
    }
    console.log(`  ${group.id}: parse-back clean, ${rows} rows, every one MERGE with ${s.column} = ${s.value}`);
    for (const h of got) console.log(`    ${h}`);
  }

  if (failed) process.exit(1);
  const total = s.groups.reduce((n, g) => n + g.handles.length, 0);
  console.log(`\n${s.groups.length} sheets, ${total} handles, all clean`);
}

main();
