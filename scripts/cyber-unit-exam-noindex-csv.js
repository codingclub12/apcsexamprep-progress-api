'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  NOINDEX SHEET FOR THE PAGES THAT MUST NOT BE IN SEARCH.
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
//  ── WHAT IS IN THE SET AND WHAT IS DELIBERATELY NOT ─────────────────────────
//  The five AP Cybersecurity end-of-unit exams. Each served all 20 questions,
//  all four options and a full rationale per option as crawlable HTML, which is
//  the assessment and its key in public. CLAUDE.md tier 3 says unit tests plus
//  keys are gated, noindex, premium only.
//
//  The CSA unit exams are NOT here and must not be added without Tanner saying
//  so for that change. snippets/ap-csa-megamenu.liquid links four of them from
//  the public navigation under "Practice Exams", which makes them tier 1, the
//  SEO engine, where CLAUDE.md calls gating a strategic error rather than a
//  security improvement. The two families look alike in a sitemap grep and are
//  opposite in intent, so the split lives in config/noindex-pages.json with its
//  reasoning attached rather than in a regex here.
//
//  ── SHEET RULES THIS FILE OBEYS ────────────────────────────────────────────
//  docs/matrixify-import-rules.md, every one of which cost live content once:
//  only the columns being changed plus the identifiers, because a blank cell is
//  an erase in EVERY column and not only in Body HTML; MERGE; UTF-8 with BOM;
//  QUOTE_ALL; CRLF. There is no Body HTML column, no Title, no Published At.
//  Every row sets the one metafield, so no cell in it is ever blank.
//
//  Generation is not evidence that generation worked, so --check parses the
//  emitted file back with a real quoted-CSV reader and diffs it against the
//  config. The CSP sheet lost 90 bytes a page while every semantic check passed
//  and a parse-back diff is what caught it.
//
//    node scripts/cyber-unit-exam-noindex-csv.js            write the sheet
//    node scripts/cyber-unit-exam-noindex-csv.js --check    parse back and diff
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const CONFIG = path.join(__dirname, '..', 'config', 'noindex-pages.json');
const OUT = path.join(__dirname, '..', 'matrixify', 'cyber-unit-exam-noindex-pages.csv');
const GROUP = 'cyber-unit-exams';

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function spec() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const mf = cfg.metafield;
  const group = cfg.groups.find((g) => g.id === GROUP);
  if (!group) throw new Error(`config/noindex-pages.json has no group ${GROUP}`);
  if (!group.handles.length) throw new Error(`group ${GROUP} is empty`);
  //  The column name follows the convention already established by ten
  //  generators in this repo (Metafield: <namespace>.<key> [<type>]), not a
  //  header typed from memory, which the import rules forbid for good reason.
  const column = `Metafield: ${mf.namespace}.${mf.key} [${mf.type}]`;
  return { column, value: mf.value, handles: group.handles };
}

function build({ column, value, handles }) {
  const lines = [['Handle', 'Command', column].map(cell).join(',')];
  for (const h of handles) lines.push([h, 'MERGE', value].map(cell).join(','));
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

function check({ column, value, handles }) {
  const raw = fs.readFileSync(OUT, 'utf8');
  const problems = [];

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
  const missing = handles.filter((h) => !got.includes(h));
  const extra = got.filter((h) => !handles.includes(h));
  if (missing.length) problems.push(`handles in config but not in the sheet: ${missing.join(', ')}`);
  if (extra.length) problems.push(`handles in the sheet but not in config: ${extra.join(', ')}`);
  if (new Set(got).size !== got.length) problems.push('a handle appears twice');

  return { problems, rows: rows.length, got };
}

function main() {
  const s = spec();
  if (!process.argv.includes('--check')) {
    fs.writeFileSync(OUT, build(s));
    console.log(`wrote ${path.relative(process.cwd(), OUT)}  ${s.handles.length} rows, column ${s.column}`);
  }
  const { problems, rows, got } = check(s);
  if (problems.length) {
    console.error(`\nPARSE-BACK FAILED, ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`parse-back clean: ${rows} rows, every one MERGE with ${s.column} = ${s.value}`);
  for (const h of got) console.log(`  ${h}`);
}

main();
