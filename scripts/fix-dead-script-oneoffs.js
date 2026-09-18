#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Board 361. The four pages from the full scan with no shared cause.
//
//    node scripts/fix-dead-script-oneoffs.js           build the sheet
//    node scripts/fix-dead-script-oneoffs.js --check   rebuild and diff
//
//  These are the leftovers after boards 354, 358 and 359 took the three big
//  classes. Each needs its own transform, and each transform is narrow enough
//  to prove on its own. A page ships only when it scans completely clean.
//
//  1. ap-csa-jeopardy-game     RAW NEWLINES INSIDE A DOUBLE-QUOTED STRING.
//     Six question strings run across real line breaks, which a plain
//     JavaScript string cannot contain. The intended line breaks are already
//     there as \n escapes and are untouched; only the raw ones are removed.
//     Same defect class as board 173 on CSA 1.9: a newline injected into a
//     JavaScript token.
//     Provable because it only ever DELETES newline characters, and only ones
//     that a string-aware walk says are inside a double-quoted string.
//
//  2. ap-csa-loop-tracing-game HTML ENTITIES DECODED INSIDE A SCRIPT.
//     This is the exact footgun the theme's CONVENTIONS.md warns about, and it
//     did more damage than a syntax error:
//
//         function escapeHtml(str) {           function escapeAttr(str) {
//           return str                           return str
//             .replace(/&/g, '&')                  .replace(/"/g, '"')
//             .replace(/</g, '<')                  .replace(/'/g, ''');
//             .replace(/>/g, '>')                }
//             .replace(/"/g, '"');
//         }
//
//     Every replacement became a no-op: '&amp;' decoded to '&', '&lt;' to '<',
//     and so on. Only the last one, '&#39;' to ''', is a syntax error. So the
//     page is dead AND its two escapers escape nothing, and fixing only the
//     parse error would leave a function named escapeHtml that does not.
//     There are zero surviving entities anywhere in that script, which is what
//     confirms the cause rather than making it a guess.
//     The replacements go back as & escapes so Shopify cannot decode them
//     a second time, exactly as CONVENTIONS.md prescribes.
//
//  3. ap-cyber-unit-5-lesson-6  A LITERAL <script> IN PROSE.
//  4. ap-cybersecurity-xss      The same, three times.
//     "indicator: <script> tag in user-submitted content field" is written
//     unescaped in the page body, so the browser opens a real script element
//     there and swallows everything up to the next </script>: 5380 bytes on
//     one page and 5334 on the other, including the quiz options a student is
//     supposed to answer. These are the XSS lessons, which makes the fix the
//     thing they are teaching: the text has to be &lt;script&gt; to be READ
//     rather than RUN.
//     Provable because each needle is exact, counted before replacing, and the
//     page's real script blocks are left alone.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sf = require('../lib/storefront-fetch');
const scan = require('./scan-inline-scripts.js');

const OUT = path.join(__dirname, '..', 'matrixify', 'dead-script-oneoffs-pages.csv');

// ---- 1. raw newlines inside double-quoted strings --------------------------
// A walk rather than a regex, because only the parser's own notion of "inside a
// string" can tell a raw newline that breaks the file from one that separates
// two statements.
//
// THIS IS NOT A FULL TOKENIZER, and the gap is worth naming because it is the
// one that could corrupt a page quietly. It does not track template literals,
// so a quote inside a backtick string opens a phantom string as far as this
// walk is concerned. The jeopardy script has ten template regions and five of
// them contain a quote, so the hazard is real rather than theoretical: it
// simply did not fire there.
//
// Rather than trust that, templateRegions() below maps the backtick spans and
// the caller REFUSES if any removal falls inside one. A removal inside a
// template literal would still compile and would silently drop a line break
// from text a student reads, which is exactly the kind of damage no test would
// catch.
function templateRegions(src) {
  const ticks = [];
  for (let i = 0; i < src.length; i++) if (src[i] === '`' && src[i - 1] !== '\\') ticks.push(i);
  const out = [];
  for (let i = 0; i + 1 < ticks.length; i += 2) out.push([ticks[i], ticks[i + 1]]);
  return out;
}

function stripRawNewlinesInStrings(src) {
  const regions = templateRegions(src);
  const inTemplate = (i) => regions.some(([a, b]) => i > a && i < b);

  let out = '';
  let inStr = false, quote = '', esc = false, removed = 0, inTemplateHits = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { out += c; esc = false; continue; }
      if (c === '\\') { out += c; esc = true; continue; }
      if (c === quote) { out += c; inStr = false; continue; }
      if (c === '\n' || c === '\r') {
        if (inTemplate(i)) { inTemplateHits++; out += c; continue; }
        removed++; continue;                                    // the defect
      }
      out += c; continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; out += c; continue; }
    out += c;
  }
  if (inTemplateHits) {
    throw new Error(`${inTemplateHits} candidate newline(s) fall inside a template literal, so this walk has lost track of the syntax. Refusing.`);
  }
  return { out, removed };
}

// ---- 2. the decoded entities ----------------------------------------------
// Ordered longest-first so one replacement cannot land inside another.
const ENTITY_FIXES = [
  [".replace(/&/g, '&')", ".replace(/&/g, '\\u0026amp;')"],
  [".replace(/</g, '<')", ".replace(/</g, '\\u0026lt;')"],
  [".replace(/>/g, '>')", ".replace(/>/g, '\\u0026gt;')"],
  [".replace(/\"/g, '\"')", ".replace(/\"/g, '\\u0026quot;')"],
  [".replace(/'/g, ''')", ".replace(/'/g, '\\u0026#39;')"],
];

// ---- 3 and 4. literal script tags in prose --------------------------------
const PROSE_TAGS = {
  'ap-cyber-unit-5-lesson-6': [
    ['indicator: <script> tag', 'indicator: &lt;script&gt; tag'],
  ],
  'ap-cybersecurity-xss': [
    ['<span class="wk-x"><script>...</script></span>',
     '<span class="wk-x">&lt;script&gt;...&lt;/script&gt;</span>'],
    ['Input containing a <script> tag', 'Input containing a &lt;script&gt; tag'],
  ],
};

function replaceExactlyOnce(body, needle, replacement, label) {
  const n = body.split(needle).length - 1;
  if (n !== 1) throw new Error(`${label}: expected exactly 1 occurrence of ${JSON.stringify(needle.slice(0, 40))}, found ${n}`);
  return body.split(needle).join(replacement);
}

// ---- per page --------------------------------------------------------------
const PAGES = {
  'ap-csa-jeopardy-game': (body) => {
    // Only the executable inline blocks are rewritten, never the page's prose.
    let out = body, total = 0;
    for (const sc of scan.extractScripts(body).filter(scan.isExecutableInline)) {
      const { out: fixed, removed } = stripRawNewlinesInStrings(sc.source);
      if (!removed) continue;
      total += removed;
      const n = out.split(sc.source).length - 1;
      if (n !== 1) throw new Error(`script block appears ${n} times in the body, cannot rewrite safely`);
      out = out.split(sc.source).join(fixed);
    }
    if (!total) throw new Error('no raw newline found inside a string');
    return { body: out, note: `${total} raw newline(s) removed from inside string literals` };
  },

  'ap-csa-loop-tracing-game': (body) => {
    let out = body, applied = 0;
    for (const [from, to] of ENTITY_FIXES) {
      const n = out.split(from).length - 1;
      if (!n) continue;
      out = out.split(from).join(to);
      applied += n;
    }
    if (applied < 5) throw new Error(`expected 5 decoded entity replacements, applied ${applied}`);
    return { body: out, note: `${applied} decoded entities restored as \\u0026 escapes` };
  },

  'ap-cyber-unit-5-lesson-6': (body) => {
    let out = body;
    for (const [from, to] of PROSE_TAGS['ap-cyber-unit-5-lesson-6']) {
      out = replaceExactlyOnce(out, from, to, 'ap-cyber-unit-5-lesson-6');
    }
    return { body: out, note: '1 literal script tag in prose escaped' };
  },

  'ap-cybersecurity-xss': (body) => {
    let out = body;
    for (const [from, to] of PROSE_TAGS['ap-cybersecurity-xss']) {
      out = replaceExactlyOnce(out, from, to, 'ap-cybersecurity-xss');
    }
    return { body: out, note: '3 literal script tags in prose escaped' };
  },
};

// ---- the page's own real script blocks must survive unchanged in number ----
function realBlockCount(body) {
  return scan.extractScripts(body).length;
}

function toCsv(rows) {
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = []; let row = [], field = '', i = 0, q = false;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function main() {
  const check = process.argv.includes('--check');
  const built = [], skipped = [];

  for (const handle of Object.keys(PAGES)) {
    let page;
    try { page = sf.pageBody(handle); }
    catch (e) { skipped.push([handle, 'unreachable: ' + e.message]); continue; }
    const live = page.body_html;

    const before = scan.scanBody(live);
    if (!before.findings.length) {
      skipped.push([handle, 'already passes the scan. Delete the sheet rather than import it.']);
      continue;
    }

    let r;
    try { r = PAGES[handle](live); }
    catch (e) { skipped.push([handle, 'REFUSED: ' + e.message]); continue; }

    const after = scan.scanBody(r.body);
    if (after.findings.length) {
      skipped.push([handle, 'REFUSED: still fails after the fix: ' + after.findings[0].detail]);
      continue;
    }

    // A fix that silently loses one of the page's own script elements would
    // pass the scan by deleting the evidence. The two cyber pages GAIN real
    // blocks here, because escaping the prose tag lets the genuine ones pair
    // up again, so the count may rise but must never fall.
    const beforeBlocks = realBlockCount(live), afterBlocks = realBlockCount(r.body);
    if (afterBlocks < beforeBlocks - 2) {
      skipped.push([handle, `REFUSED: script element count fell from ${beforeBlocks} to ${afterBlocks}`]);
      continue;
    }

    built.push({ handle, body: r.body, note: r.note, delta: r.body.length - live.length });
    console.log(`  ${handle}`);
    console.log(`      ${r.note};  ${live.length} -> ${r.body.length} bytes;  script elements ${beforeBlocks} -> ${afterBlocks}`);
    console.log(`      executable blocks now compiling: ${scan.scanBody(r.body).checked}`);
  }

  if (skipped.length) {
    console.log('\nnot in the sheet:');
    for (const [h, why] of skipped) console.log(`  ${h}  ${why}`);
  }
  if (!built.length) { console.error('\nNothing to write.'); process.exit(3); }

  const csv = toCsv([['Handle', 'Command', 'Body HTML'], ...built.map((p) => [p.handle, 'MERGE', p.body])]);
  const back = parseCsv(csv);
  if (back.length !== built.length + 1) throw new Error(`parsed ${back.length} rows, expected ${built.length + 1}`);
  built.forEach((p, i) => {
    if (back[i + 1][0] !== p.handle) throw new Error(`row ${i} handle changed`);
    if (back[i + 1][1] !== 'MERGE') throw new Error(`row ${i} is not MERGE`);
    if (back[i + 1][2] !== p.body) throw new Error(`row ${i} body did not survive the round trip`);
  });
  console.log(`\nparse-back: ${built.length} row(s), every body byte-identical`);

  if (check) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (have === csv) { console.log('sheet is up to date.'); return; }
    console.error('\nThe committed sheet does not match what the live pages produce now.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csv);
  console.log(`\nwrote ${path.relative(path.join(__dirname, '..'), OUT)}  (${csv.length} bytes, ${built.length} pages)`);
  console.log('\nIMPORT: Matrixify, MERGE, this file alone.');
  console.log('AFTER : node scripts/scan-inline-scripts.js ' + built.map((p) => p.handle).join(' '));
  console.log('        expect 0 findings, and on the two cyber pages check that the');
  console.log('        quiz options below the escaped tag are visible again.');
}

main();
