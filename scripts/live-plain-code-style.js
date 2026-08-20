'use strict';
// -----------------------------------------------------------------------------
//  Reformat one-line bodies in PLAIN code blocks on live pages.
//
//  ── THE DISTINCTION THAT MATTERS ────────────────────────────────────────────
//  A first attempt at this covered every <pre> on the page and was abandoned,
//  because some blocks are syntax highlighted and the code inside them is
//  interleaved with <span> tags. Cutting a line by text position lands inside a
//  tag and destroys the block. That is still true and this does not attempt it.
//
//  But that was only ever a property of SOME blocks. Across the whole public
//  site the split is 138 one-liners in plain blocks against 38 in highlighted
//  ones. So this handles the plain ones, where the content is text and a text
//  transform is exactly right, and refuses to touch anything containing markup.
//
//  ── IT MATCHES THE PAGE ─────────────────────────────────────────────────────
//  Brace placement and indent width are read off the page's own multi-line code.
//  A script that imposed one style would make every page it touched look like it
//  came from somewhere else, which is the complaint that started this work.
//
//  ── WHAT IS NOT A ONE-LINER ─────────────────────────────────────────────────
//  A braceless body on the NEXT line. Adding braces there is an editorial change
//  nobody asked for. Only a construct that opens and closes on one line is
//  touched.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - any block containing markup, per above
//    - a page where the code content changes rather than just its layout
//    - a page where anything outside a <pre> moves
//    - a one-liner it does not fully understand
//    - a page it cannot bound a body for
//
//  Run: node scripts/live-plain-code-style.js <dir-of-fetched-pages> <out.csv> [--limit N]
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-live-body');
const { findOneLiners } = require('../lib/beginner-style');

const PUBLISHED_AT = '2026-03-01 12:00:00';

function unent(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
function ent(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function guess(code) {
  if (/\bpublic\s+(class|static|void)|System\s*\.\s*out\s*\.\s*print|\bint\s+\w+\s*[=;[]/.test(code)) return 'java';
  if (/\bdef\s+\w+\s*\(|\bprint\s*\(|\belif\b/.test(code)) return 'python';
  if (/^\s*(IF|REPEAT|FOR EACH|PROCEDURE|DISPLAY)\b/m.test(code)) return 'pseudo';
  return 'javascript';
}

function styleOf(code) {
  const allman = (code.match(/\)\s*\r?\n\s*\{/g) || []).length;
  const knr = (code.match(/\)\s*\{\s*\r?\n/g) || []).length;
  const widths = {};
  code.split('\n').forEach((l) => {
    const m = l.match(/^( +)\S/);
    if (m && m[1].length <= 16) widths[m[1].length] = (widths[m[1].length] || 0) + 1;
  });
  const ranked = Object.entries(widths).map(([w, n]) => [Number(w), n])
    .filter(([w]) => w >= 2).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return { allman: allman > knr, indent: ' '.repeat(ranked.length ? ranked[0][0] : 4) };
}

function statements(body) {
  const out = [];
  let depth = 0, cur = '', str = null;
  for (const ch of body) {
    if (str) { cur += ch; if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'") { str = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    cur += ch;
    if ((ch === ';' || ch === '}') && depth === 0) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

function block(head, body, indent, style, comment) {
  const headLine = indent + head.trim() + (comment ? '  ' + comment : '');
  const lines = style.allman ? [headLine, indent + '{'] : [indent + head.trim() + ' {' + (comment ? '  ' + comment : '')];
  for (const s of statements(body)) lines.push(indent + style.indent + s);
  lines.push(indent + '}');
  return lines;
}

function expand(line, style) {
  const indent = (line.match(/^\s*/) || [''])[0];
  const t = line.slice(indent.length);
  let m = t.match(/^(if\s*\(.*?\))\s*\{(.*)\}\s*else\s*\{(.*)\}\s*(\/\/.*)?$/);
  if (m) return [...block(m[1], m[2], indent, style, m[4]), ...block('else', m[3], indent, style, null)];
  m = t.match(/^((?:\}\s*)?(?:else\s+if|if|for|while)\s*\(.*?\)|(?:\}\s*)?else)\s*\{(.*)\}\s*(\/\/.*)?$/);
  if (m) return block(m[1], m[2], indent, style, m[3]);
  m = t.match(/^((?:public|private|protected|static|final|\s)*[\w<>[\].]+\s+\w+\s*\(.*?\))\s*\{(.*)\}\s*(\/\/.*)?$/);
  if (m) return block(m[1], m[2], indent, style, m[3]);
  m = t.match(/^((?:\}\s*)?(?:else\s+if|if|for|while)\s*\(.*?\)|(?:\}\s*)?else)\s+([^{].*;)\s*(\/\/.*)?$/);
  if (m) return block(m[1], m[2], indent, style, m[3]);
  return null;
}

function reformat(code, lang, style) {
  let lines = code.split('\n');
  let n = 0, refused = 0;
  for (let pass = 0; pass < 6; pass++) {
    const out = [];
    let did = 0;
    refused = 0;
    for (const line of lines) {
      if (findOneLiners(line, lang).length) {
        const rep = expand(line, style);
        if (rep) { out.push(...rep); did++; continue; }
        refused++;
      }
      out.push(line);
    }
    lines = out; n += did;
    if (!did) break;
  }
  return { text: lines.join('\n'), n, refused };
}

function codeOf(body) {
  return [...body.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)]
    .map((m) => unent(m[1].replace(/<[^>]+>/g, ''))).join('\n');
}

function patch(body) {
  const style = styleOf(codeOf(body));
  let changed = 0, refused = 0, skippedHighlighted = 0;
  const out = body.replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/g, (m, open, inner, close) => {
    // Markup means highlighting. A text cut would land inside a tag.
    if (/<[a-z/]/i.test(inner)) { if (findOneLiners(unent(inner.replace(/<[^>]+>/g, '')), 'java').length) skippedHighlighted++; return m; }
    const code = unent(inner);
    const lang = guess(code);
    if (lang === 'pseudo') return m;
    const r = reformat(code, lang, style);
    changed += r.n; refused += r.refused;
    return r.n ? open + ent(r.text) + close : m;
  });
  return { body: out, changed, refused, skippedHighlighted, style };
}

function check(before, after) {
  const problems = [];
  const strip = (b) => b.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, 'PRE');
  if (strip(before) !== strip(after)) problems.push('changed outside a pre block');
  // Three things are allowed to move and nothing else: whitespace, braces (a
  // braceless body legitimately gains a pair), and a trailing // comment, which
  // moves up onto the head line where it labels the construct it belongs to. So
  // the comparison runs twice, once on the code with comments stripped and once
  // on the comments alone. Comparing them together reports a false difference
  // for every comment that moved, which is most of them.
  const codeOnly = (b) => codeOf(b).replace(/\/\/[^\n]*/g, '').replace(/[\s{}]+/g, '');
  const comments = (b) => (codeOf(b).match(/\/\/[^\n]*/g) || []).map((c) => c.trim()).sort().join('|');
  if (codeOnly(before) !== codeOnly(after)) problems.push('code content changed, not just layout');
  if (comments(before) !== comments(after)) problems.push('a comment was lost or altered');
  const tags = (b) => (b.match(/<[a-z][^>]*>/gi) || []).length;
  if (tags(before) !== tags(after)) problems.push(`tag count changed: ${tags(before)} -> ${tags(after)}`);
  return problems;
}

function main(argv) {
  const [dir, out] = argv;
  if (!dir || !out) {
    console.error('usage: node scripts/live-plain-code-style.js <dir> <out.csv> [--limit N]');
    process.exit(2);
  }
  const li = argv.indexOf('--limit');
  const limit = li !== -1 ? Number(argv[li + 1]) : Infinity;

  const pages = [];
  const skipped = [];
  let totalChanged = 0, totalHighlighted = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    if (pages.length >= limit) break;
    const handle = f.replace(/\.html$/, '');
    let body;
    try { body = extract(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { continue; }
    const r = patch(body);
    totalHighlighted += r.skippedHighlighted;
    if (!r.changed) continue;
    if (r.refused) { skipped.push(`${handle}: ${r.refused} one-liner(s) not understood`); continue; }
    const problems = check(body, r.body);
    if (problems.length) { skipped.push(`${handle}: ${problems.join('; ')}`); continue; }
    pages.push({ handle, body: r.body, changed: r.changed, style: r.style });
    totalChanged += r.changed;
  }

  if (!pages.length) {
    console.error('\n  Refused: no page could be safely reformatted\n');
    skipped.slice(0, 10).forEach((s) => console.error('    ' + s));
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const p of pages) lines.push([p.handle, 'MERGE', p.body, PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  console.log(`    ${pages.length} pages, ${totalChanged} one-liner(s) reformatted`);
  console.log(`    ${totalHighlighted} left alone inside syntax-highlighted blocks`);
  if (skipped.length) {
    console.log(`    ${skipped.length} page(s) skipped rather than risked:`);
    skipped.slice(0, 8).forEach((s) => console.log('        ' + s));
  }
  console.log(`\n  wrote ${out}  (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { patch, check, expand, styleOf, guess };
