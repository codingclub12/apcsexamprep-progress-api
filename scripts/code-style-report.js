'use strict';
// -----------------------------------------------------------------------------
//  Report every one-line body in code a student reads, across a directory of
//  fetched pages.
//
//  ── WHY THIS REPORTS RATHER THAN FIXES ──────────────────────────────────────
//  Everything this repo generates was fixed at source, and the four live CSP
//  pages with no seed were fixed by surgical patch. Sweeping the sitemap then
//  turned up a third category: hand-authored CSA study guides carrying Java in
//  SYNTAX HIGHLIGHTED <pre> blocks, where the code is interleaved with <span>
//  tags.
//
//  An automated rewrite of those was attempted and abandoned. Four iterations
//  in, it still destroyed spans and altered code content on three blocks of one
//  page, caught each time by its own equivalence guards. The failure mode is a
//  cut landing inside a tag, and the blast radius is somebody else's page
//  rendering as broken or unstyled code. A transform nobody trusts is worse than
//  a list somebody can act on, so this produces the list.
//
//  ── WHAT COUNTS ─────────────────────────────────────────────────────────────
//  Code that opens and closes a body on one line, in a <pre>, a <textarea>, or
//  an embedded starter blob. A braceless body on the NEXT line is not a
//  one-liner and is not reported: adding braces there is an editorial change
//  nobody asked for. Metasyntax like `IF(condition){ block }` is grammar being
//  named, not code to copy, and is not reported either.
//
//  Run: node scripts/code-style-report.js <dir-of-fetched-pages> [--json out.json]
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-live-body');
const { findOneLiners } = require('../lib/beginner-style');

function unent(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function guess(code) {
  if (/\bpublic\s+(class|static|void)|System\s*\.\s*out\s*\.\s*print|\bint\s+\w+\s*[=;[]/.test(code)) return 'java';
  if (/\bdef\s+\w+\s*\(|\bprint\s*\(|\belif\b/.test(code)) return 'python';
  if (/^\s*(IF|REPEAT|FOR EACH|PROCEDURE|DISPLAY)\b/m.test(code)) return 'pseudo';
  return 'javascript';
}

// Grammar being named rather than code to copy.
const PLACEHOLDER = /^\s*(first |second )?(block|statement|expression|\.\.\.)\s*$/;

function scan(body) {
  const hits = [];
  const starters = body.match(/var STARTERS = (\[[\s\S]*?\]);\n/);
  if (starters) {
    try {
      const arr = JSON.parse(starters[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
        .replace(/\\u([0-9a-f]{4})/g, (x, h) => String.fromCharCode(parseInt(h, 16))));
      arr.forEach((o, i) => Object.keys(o).forEach((lang) =>
        findOneLiners(o[lang], lang).forEach((h) =>
          hits.push({ where: `starter[${i}].${lang}`, line: h.line, text: h.text }))));
    } catch (e) { /* not a blob this understands */ }
  }
  [...body.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/g)].forEach((t, i) => {
    const code = unent(t[1]);
    findOneLiners(code, guess(code)).forEach((h) =>
      hits.push({ where: `textarea[${i}]`, line: h.line, text: h.text }));
  });
  [...body.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)].forEach((t, i) => {
    const code = unent(t[1].replace(/<[^>]+>/g, ''));
    const lang = guess(code);
    findOneLiners(code, lang).forEach((h) =>
      hits.push({ where: `pre[${i}].${lang}`, line: h.line, text: h.text, highlighted: /<span/.test(t[1]) }));
  });
  const outside = body.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, '').replace(/<textarea[\s\S]*?<\/textarea>/g, '');
  [...outside.matchAll(/IF\s*\([^)]*\)\s*\{([^{}]*)\}/g)]
    .filter((m) => !PLACEHOLDER.test(unent(m[1])))
    .forEach((m) => hits.push({ where: 'prose', text: unent(m[0]).slice(0, 90) }));
  return hits;
}

function main(argv) {
  const dir = argv[0];
  if (!dir) {
    console.error('usage: node scripts/code-style-report.js <dir> [--json out.json]');
    process.exit(2);
  }
  const jsonAt = argv.indexOf('--json');
  const rows = [];
  let scanned = 0, skipped = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    let body;
    try { body = extract(fs.readFileSync(path.join(dir, f), 'utf8')); scanned++; }
    catch (e) { skipped++; continue; }
    const hits = scan(body);
    if (hits.length) rows.push({ handle: f.replace(/\.html$/, ''), hits });
  }
  rows.sort((a, b) => b.hits.length - a.hits.length);

  let total = 0, highlighted = 0;
  for (const r of rows) {
    total += r.hits.length;
    highlighted += r.hits.filter((h) => h.highlighted).length;
    console.log(`\n${String(r.hits.length).padStart(4)}  ${r.handle}`);
    for (const h of r.hits.slice(0, 6)) {
      console.log(`        ${h.where}${h.line ? ':' + h.line : ''}  ${h.text}`);
    }
    if (r.hits.length > 6) console.log(`        ... and ${r.hits.length - 6} more`);
  }
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`pages scanned: ${scanned}   not a standard page template: ${skipped}`);
  console.log(`pages with findings: ${rows.length}   one-liners: ${total}`);
  console.log(`of those, inside syntax-highlighted blocks: ${highlighted}`);
  if (jsonAt !== -1 && argv[jsonAt + 1]) {
    fs.writeFileSync(argv[jsonAt + 1], JSON.stringify(rows, null, 2) + '\n');
    console.log(`\nwrote ${argv[jsonAt + 1]}`);
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { scan, guess };
