'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE APPLIED CHALLENGE CARD THAT TELLS A STUDENT IT HAS "undefined questions".
//
//  On every Big Idea 3 lesson page the exercise row ends with the one activity
//  whose answers reach the gradebook, and the card states its length:
//
//      Applied Challenge<span>undefined questions, and every answer is
//      recorded for your teacher</span>
//
//  A template variable went in unsubstituted. Four of the 18 pages were repaired
//  on 2026-09-21; this sheet is the other 14, which were never fetched.
//
//  ── THE NUMBER IS MEASURED, NOT ASSUMED ────────────────────────────────────
//  The tempting repair is to write 6 everywhere, because the four pages fixed by
//  hand all linked six-question exercises. This script instead opens each card's
//  own href and counts the graded items there, and refuses the row if that page
//  does not serve. A wrong number is worse than "undefined": "undefined" is
//  visibly broken and gets reported, while a confident 6 on a 5-question
//  exercise is never looked at again.
//
//  The count comes from the exercise-2 renderer's own markup. id="csp-x2" is the
//  marker only that renderer emits and is asserted first, because counting items
//  on a themed 404 returns zero and reads like a finding.
//
//  Run: node scripts/build-bi3-undefined-sheet.js [--out <dir>]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { LESSONS, WRAPPER } = require('./verify-csp-bi3-undefined-live');
const { parseCsv } = require('./build-leaderboard-xss-sheets');

const BROKEN = 'Applied Challenge<span>undefined questions, and every answer is recorded for your teacher</span>';
const fixed = (n) => 'Applied Challenge<span>' + n + ' questions, and every answer is recorded for your teacher</span>';

class NoSuchPage extends Error {}

//  Same rule as the leaderboard builder: 404 means absent, a bad 200 means the
//  fetch failed and is retried rather than quietly filed as "nothing to do".
function body(h, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const r = sf.raw('/pages/' + h + '.json');
    if (String(r.code) === '404') throw new NoSuchPage(h + ': 404');
    if (String(r.code) === '200') {
      try {
        const p = JSON.parse(r.body).page;
        if (p && typeof p.body_html === 'string') return p;
        last = 'a 200 with no body_html';
      } catch (e) { last = 'a 200 that is not JSON'; }
    } else last = 'HTTP ' + r.code;
  }
  throw new Error(h + ': ' + attempts + ' attempts, last was ' + last);
}

function main(argv) {
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1] : path.join(__dirname, '..', 'imports', '2026-09-21');
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  const problems = [];
  const already = [];

  for (const handle of LESSONS) {
    let page;
    try { page = body(handle); } catch (e) {
      if (e instanceof NoSuchPage) { problems.push(handle + ': has no live page'); continue; }
      problems.push(handle + ': ' + e.message); continue;
    }
    const src = page.body_html;
    const hits = src.split(BROKEN).length - 1;
    if (hits === 0) { already.push(handle); continue; }
    if (hits !== 1) { problems.push(`${handle}: the card appears ${hits} times, expected 1`); continue; }

    //  The card's own target decides the number.
    const m = src.match(/<a class="ex wide"\s+href="([^"]+)"\s*>\s*Applied Challenge/);
    if (!m) { problems.push(handle + ': found the span but not its anchor'); continue; }
    let ex;
    try { ex = sf.page(m[1]).body; } catch (e) { problems.push(`${handle}: target ${m[1]} did not serve (${e.message.slice(0, 50)})`); continue; }
    if (!ex.includes(WRAPPER)) { problems.push(`${handle}: target ${m[1]} is not the exercise renderer`); continue; }
    const n = (ex.match(/class="mcq-item"/g) || []).length;
    if (!n) { problems.push(`${handle}: target ${m[1]} serves zero graded items`); continue; }

    const out = src.split(BROKEN).join(fixed(n));
    const checks = [
      [!out.includes('undefined questions'), 'the page still says "undefined questions"'],
      [out.includes(fixed(n)), 'the repaired card is not present'],
      [out.length !== src.length, 'the body did not change'],
      [added(src, out).length === 0, 'the patch introduces non-ASCII'],
      [src.length - BROKEN.length + fixed(n).length === out.length, 'more than the card changed'],
    ];
    const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
    if (failed.length) { problems.push(`${handle}: ${failed.join('; ')}`); continue; }

    rows.push({ handle, target: m[1], questions: n, published_at: page.published_at, after: out });
  }

  if (problems.length) {
    console.error(`  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.after, r.published_at].map(cell).join(','));
  const out = path.join(outDir, 'csp-bi3-applied-challenge-undefined-fix-remaining.csv');
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  //  Parse back and diff, because generation is not evidence that it worked.
  const parsed = parseCsv(fs.readFileSync(out, 'utf8').replace(/^﻿/, ''));
  const head = parsed.shift();
  if (head.join(',') !== header.join(',')) throw new Error('header did not survive the round trip');
  if (parsed.length !== rows.length) throw new Error(`${parsed.length} rows read back, ${rows.length} written`);
  for (const rec of parsed) {
    const spec = rows.find((r) => r.handle === rec[0]);
    if (!spec) throw new Error('unknown handle read back: ' + rec[0]);
    if (rec[2] !== spec.after) throw new Error(rec[0] + ': body differs after the round trip');
  }

  console.log('  ' + rows.length + ' page(s) patched and verified, ' + already.length + ' already correct.\n');
  for (const r of rows) console.log('    ' + r.handle.padEnd(46) + r.questions + ' questions  (' + r.target + ')');
  if (already.length) {
    console.log('\n  Already stating a count, left alone:');
    already.forEach((h) => console.log('    ' + h));
  }
  console.log('\n  wrote ' + out + '  ' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig.');
  console.log('  After the import: node scripts/verify-csp-bi3-undefined-live.js\n');
}

function added(before, after) {
  const tally = (s) => { const m = new Map(); for (const ch of s) if (ch.codePointAt(0) > 127) m.set(ch, (m.get(ch) || 0) + 1); return m; };
  const b = tally(before); const a = tally(after); const out = [];
  for (const [ch, n] of a) if (n > (b.get(ch) || 0)) out.push(ch);
  return out;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { BROKEN, fixed };
