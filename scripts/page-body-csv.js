'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MATRIXIFY PAGES SHEET, BUILT FROM THE REPO MIRRORS
//
//  WHAT THIS IS FOR
//  The storefront pages in shopify/ are edited here and shipped to Shopify as a
//  Matrixify Pages import. This builds that sheet: one row per page, Handle plus
//  Command plus Title plus Body HTML, UTF-8 with a BOM so Excel does not mangle
//  the copy.
//
//  WHY IT IS A SCRIPT AND NOT A COPY AND PASTE
//  An import REPLACES the whole Body HTML of the page it names. Hand-assembling
//  that sheet is the one step where a stale file or a wrong handle silently
//  overwrites a live page, so the checks below run first and the file is not
//  written if any of them fails:
//
//    1. Every handle named must be a page that exists (checked against a live
//       dump when one is supplied) and the title in the sheet must match the
//       live title, so an import never renames a page as a side effect.
//    2. A page whose live body already matches the repo is DROPPED from the
//       sheet. An import that changes nothing is pure risk: it can clobber an
//       edit made since the dump was pulled.
//    3. No replacement characters and no raw mojibake in the body, the defect
//       the encoding guard exists for.
//    4. No em-dashes, per repo convention.
//    5. Nothing the LIVE body has that the repo file does not. See the block
//       above contentLoss() for what this catches and why the other four
//       checks all passed while a live page lost its self-study tab.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run:
//    node scripts/page-body-csv.js <out.csv> [--only handle,handle] [--live <pages.json>] [--accept-loss]
//
//  <pages.json> is the raw result of a Shopify Admin API pages query; both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// The pages this repo is the source for, with the live handle and title each
// one must import against. A page is listed here only once its handle and title
// have been read back from the store: a guessed handle creates a NEW page, and a
// guessed title renames a real one.
const PAGES = [
  { handle: 'cyber-dashboard', title: 'Teacher Dashboard', file: 'shopify/cyber-dashboard.html' },
  { handle: 'my-progress',     title: 'My Progress',       file: 'shopify/my-progress.html' },
  { handle: 'cyber-class',     title: 'Teacher Portal',    file: 'shopify/cyber-class.html' },
  // Handle and title read back from the store before being listed here, per the
  // rule above: a guessed handle creates a NEW page and a guessed title renames
  // a real one. Confirmed as page 134976110807, "Join a Class".
  { handle: 'join',            title: 'Join a Class',      file: 'shopify/join.html' },
];

// Shopify DECODES entities when it stores a body: `&#9662;` comes back as the
// character itself. A raw comparison against the repo file therefore never
// matches after an import, which quietly defeated the already-matches check and
// would have re-shipped every page on every run. Both sides are normalised to
// the characters before comparing, so the check compares what a browser renders
// rather than how it was spelled.
// The named entities this store's pages actually use. The list used to be just
// ndash and mdash, which meant a page carrying any OTHER entity (join.html ships
// a &rarr; in a button) could never compare equal to its live copy: the repo
// side kept the spelling, the live side had the character, and the
// already-matches check therefore reported that page as needing an import on
// every single run. A check that always says yes is the same as no check.
//
// &amp; is decoded LAST and separately, because decoding it first would turn a
// literal &amp;lt; into &lt; and then into <, which is a different string than
// the one that was stored.
const NAMED = {
  ndash: '–', mdash: '—', rarr: '→', larr: '←', nbsp: ' ',
  hellip: '…', times: '×', check: '✓', lt: '<', gt: '>', quot: '"',
};

function renderable(s) {
  return String(s == null ? '' : s)
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&(ndash|mdash|rarr|larr|nbsp|hellip|times|check|lt|gt|quot);/g, (m, n) => NAMED[n])
    .replace(/&amp;/g, '&')
    // Shopify also REFLOWS the markup a little on save: it inserted a newline
    // before a closing div in join.html, which is not a change to the page by
    // any measure that matters and yet left the body one byte from its source
    // forever. Whitespace BETWEEN tags is collapsed on both sides so that kind
    // of reflow stops counting as a difference.
    //
    // Both sides get the identical treatment, so this can only ever hide a
    // difference that is purely whitespace between tags, which by definition
    // renders the same. It cannot invent a match: any real edit still differs.
    .replace(/>\s+</g, '><')
    .split('&ndash;').join('–')
    .split('&mdash;').join('—')
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/, '');
}

// ── WHAT THIS IMPORT WOULD DELETE ────────────────────────────────────────────
//  The check that was missing on 2026-08-22, and the reason the other four were
//  all green while /pages/join lost its entire self-study tab.
//
//  Those four ask whether the handle exists, whether the title matches, and
//  whether the live body ALREADY matches the file. Not one of them asks the
//  question that decides whether an import is safe: what does the live page
//  have that the file does not? An import REPLACES a body outright, so anything
//  only the live copy holds is deleted, and Shopify keeps no page history to
//  recover it from. shopify/join.html had never contained the string 'solo' in
//  any revision, because that tab was authored in the Shopify admin. The repo
//  copy was not a stale version of the live page; it was a different page that
//  happened to share a handle, and nothing in this script could tell.
//
//  Three inventories, because they are what a page is made of and what a
//  reviewer would actually miss: the element ids, the script's own function
//  names, and the API paths it calls. Byte diffing cannot do this job: every
//  import differs from the live body by design, which is the whole point of
//  running one.
//
//  Deliberately removing something is still possible, it just has to be said
//  out loud with --accept-loss rather than happening in silence.
const INVENTORY = [
  { key: 'id', label: 'element id', re: /id="([A-Za-z0-9_-]+)"/g },
  // Method declarations inside an object literal (`  completeSolo() {`,
  // `  async doLogin() {`) plus plain function declarations. The prefix allows
  // a newline, a brace or a comma so a method still counts on a page whose
  // script is not indented the way these two happen to be.
  //
  // KEYWORDS are excluded because `if (x) {` and `for (;;) {` match the same
  // shape. They cancel out when both sides are real pages, which is the only
  // way this is ever called, but a check that reports "function if" as deleted
  // is a check nobody reads twice.
  { key: 'fn', label: 'function',
    re: /(?:[\n{,]\s*(?:async\s+)?|function\s+)([a-zA-Z_]\w*)\s*\([^()]*\)\s*\{/g,
    skip: new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'do', 'else', 'with']) },
  { key: 'api', label: 'API path', re: /(\/api\/[A-Za-z0-9_\-\/]+)/g },
];

function inventory(html) {
  const out = new Map();
  for (const spec of INVENTORY) {
    const found = new Set();
    let m;
    spec.re.lastIndex = 0;
    while ((m = spec.re.exec(html)) !== null) {
      if (spec.skip && spec.skip.has(m[1])) continue;
      found.add(m[1]);
    }
    out.set(spec.key, found);
  }
  return out;
}

// Everything the live body carries that the file about to replace it does not.
function contentLoss(liveBody, fileBody) {
  const a = inventory(String(liveBody || ''));
  const b = inventory(fileBody);
  const lost = [];
  for (const spec of INVENTORY) {
    for (const name of a.get(spec.key)) {
      if (!b.get(spec.key).has(name)) lost.push(`${spec.label} ${name}`);
    }
  }
  return lost;
}

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/page-body-csv.js <out.csv> [--only handle,handle] [--live <pages.json>]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt === -1 ? null : new Set(argv[onlyAt + 1].split(','));
  const liveAt = argv.indexOf('--live');
  const live = liveAt === -1 ? null : readLive(argv[liveAt + 1]);
  const acceptLoss = argv.includes('--accept-loss');

  const chosen = PAGES.filter((p) => !only || only.has(p.handle));
  if (!chosen.length) { console.error('no pages selected'); process.exit(2); }

  const rows = [], problems = [], unchanged = [];
  for (const p of chosen) {
    const full = path.join(ROOT, p.file);
    if (!fs.existsSync(full)) { problems.push(`${p.handle}: ${p.file} does not exist`); continue; }
    const body = fs.readFileSync(full, 'utf8');
    if (body.trim().length < 200) { problems.push(`${p.handle}: ${p.file} is suspiciously short`); continue; }
    if (body.includes('�')) problems.push(`${p.handle}: body contains a replacement character`);
    if (/Ã[-¿]|â€|Â[ -¿]/.test(body)) problems.push(`${p.handle}: body contains mojibake`);
    if (body.includes('—')) problems.push(`${p.handle}: body contains an em-dash`);
    // An HTML entity written as a LITERAL inside a JavaScript string does not
    // survive an import. Shopify decodes entities when it stores a body, so
    //     {'&':'&amp;','<':'&lt;'}
    // comes back as {'&':'&','<':'<'} and an escape function built from that
    // table silently becomes an identity function. join.html shipped exactly
    // that on 2026-08-22 and the defect is invisible in the repo, in the sheet
    // and in review: it appears only after the round trip.
    //
    // Entities in ordinary markup are fine and common (&rarr; in a link,
    // &ndash; in a legend): decoding those just yields the character that was
    // meant. The hazard is only an entity a script needs to STILL be an entity
    // afterwards, so this looks for one inside a quoted JS string. Build them
    // from parts instead, the way both shipped pages now do:
    //     var A = '&'; ... A + 'amp;'
    const entityInJs = body.match(/(['`])&(amp|lt|gt|quot|#\d+);\1/g);
    if (entityInJs) {
      const shown = [...new Set(entityInJs)].slice(0, 4).join(' ');
      problems.push(`${p.handle}: ${entityInJs.length} HTML entit${entityInJs.length === 1 ? 'y' : 'ies'} `
        + `written as a JavaScript string literal (${shown}). Shopify decodes these on import, which turns `
        + `an escape table into an identity map. Build the entity from parts instead.`);
    }
    if (live) {
      const n = live.get(p.handle);
      if (!n) { problems.push(`${p.handle}: no live page with that handle`); continue; }
      if (n.title !== p.title) {
        problems.push(`${p.handle}: live title is ${JSON.stringify(n.title)}, sheet would set ${JSON.stringify(p.title)}`);
        continue;
      }
      if (renderable(n.body) === renderable(body)) {
        unchanged.push(p.handle);
        continue;
      }
      const lost = contentLoss(n.body, body);
      if (lost.length && !acceptLoss) {
        const shown = lost.slice(0, 12).join(', ') + (lost.length > 12 ? `, and ${lost.length - 12} more` : '');
        problems.push(`${p.handle}: this import would DELETE ${lost.length} thing(s) the live page has and `
          + `${p.file} does not (${shown}). An import replaces the body outright and Shopify keeps no page `
          + `history. Either the file is missing work that was authored live, or the removal is intended and `
          + `you can say so with --accept-loss.`);
        continue;
      }
      if (lost.length && acceptLoss) {
        console.log(`\n  --accept-loss: ${p.handle} drops ${lost.length} live item(s): ${lost.join(', ')}`);
      }
    }
    rows.push({ handle: p.handle, title: p.title, body, bytes: Buffer.byteLength(body) });
  }

  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }
  if (!rows.length) {
    console.log('\n  every selected page already matches the live body. Nothing to import.\n');
    return;
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].join(',')]
    .concat(rows.map((r) => [cell(r.handle), cell('UPDATE'), cell(r.title), cell(r.body)].join(',')))
    .join('\r\n') + '\r\n';
  fs.writeFileSync(out, '﻿' + csv);

  for (const r of rows) console.log(`    ${r.handle.padEnd(18)} ${r.title.padEnd(20)} ${(r.bytes / 1024).toFixed(0)} KB`);
  if (unchanged.length) console.log(`\n  ${unchanged.length} page(s) already match the live body, left out of the sheet: ${unchanged.join(', ')}`);
  console.log(`\n  wrote ${out}  (${rows.length} page(s), ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PAGES, contentLoss, inventory, renderable };
