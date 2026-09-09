#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A DENOMINATOR THAT SHRINKS WHILE THE STUDENT WORKS.
//
//  ── THE DEFECT ──────────────────────────────────────────────────────────────
//  Nine AP Cyber exercise-1 pages write their running score like this:
//
//      document.getElementById('score-display').textContent
//        = score + ' / ' + Object.keys(answered).length;
//
//  The denominator is how many questions have been ANSWERED, not how many the
//  page has. So a student three questions in sees "2 / 3", which reads as a
//  score out of three, and the number climbs toward six only if they finish.
//
//  Two things go wrong and the second one is the expensive one:
//
//    the student is misled  "2 / 3" after three questions looks like 67 percent
//    the grade is wrong     assets/apcs-score-reporter.js tries score-display
//                           FIRST in its RESULT_IDS, so it never reaches the
//                           r-score element beside it that correctly renders
//                           score + '/' + total. A student who answers three of
//                           six and stops is recorded 2 out of 3, not 2 out of
//                           6, and their percentage doubles.
//
//  Only an ABANDONED run is affected. Finish all six and the running
//  denominator arrives at six by itself, which is why this survived: every
//  complete attempt looks right.
//
//  ── HOW IT WAS FOUND ────────────────────────────────────────────────────────
//  Not by a person. /api/health prices flagged ap-cybersecurity 3.2 exercise-1
//  as authored 6, observed 5, one student, on 2026-09-08. The first read of
//  that row was that it must be a false positive, one student who stopped early
//  on a correctly priced column. It was not. The page really did report a five
//  point denominator for a six question exercise.
//
//  ── THE CHANGE ──────────────────────────────────────────────────────────────
//  One substitution per page, to the variable the page already computes:
//
//      score + ' / ' + Object.keys(answered).length   ->   score + ' / ' + total
//
//  `var total = Object.keys(ANSWERS).length` is declared earlier in the same
//  script block, which the gate checks rather than assumes.
//
//  What must NOT change is the line right after it, which uses the same
//  expression for a different and correct purpose:
//
//      if (Object.keys(answered).length === total) { showResults(); }
//
//  That is the completion test. Replacing it would fire the results panel on
//  the first answer. The gate requires it to survive intact.
//
//  Run:
//    node scripts/cyber-running-denominator-csv.js <out.csv> [--live dir/]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { pageBody } = require('../lib/storefront-fetch');
const { analyze, acceptRuns } = require('../lib/mojibake');

const BAD = "score+' / '+Object.keys(answered).length";
const GOOD = "score+' / '+total";
const KEEP = 'if(Object.keys(answered).length===total)';

const HANDLES = [];
for (let l = 1; l <= 4; l++) HANDLES.push(`ap-cyber-unit-2-lesson-${l}-exercise-1`);
for (let l = 1; l <= 5; l++) HANDLES.push(`ap-cyber-unit-3-lesson-${l}-exercise-1`);

function fix(handle, body) {
  const fail = [];
  const n = body.split(BAD).length - 1;
  if (n !== 1) fail.push(`${handle}: the running denominator appears ${n} time(s), expected exactly 1`);
  if (!body.includes(KEEP)) fail.push(`${handle}: the completion test is not in the shape this was written for`);
  if (!/var\s+total\s*=\s*Object\.keys\(ANSWERS\)\.length/.test(body)) {
    fail.push(`${handle}: total is not declared as the ANSWERS key count`);
  }
  //  total must be DECLARED BEFORE the line that will use it, in the same
  //  script block, or the fix throws a ReferenceError at runtime.
  const decl = body.search(/var\s+total\s*=\s*Object\.keys\(ANSWERS\)\.length/);
  const use = body.indexOf(BAD);
  if (decl > use) fail.push(`${handle}: total is declared after the line being fixed`);
  const blocks = [...body.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => [m.index, m.index + m[0].length]);
  const blockOf = (p) => blocks.findIndex(([s, e]) => p >= s && p < e);
  if (blockOf(decl) !== blockOf(use) || blockOf(decl) === -1) {
    fail.push(`${handle}: total and the fixed line are in different script blocks`);
  }
  if (fail.length) return { fail };

  const out = body.replace(BAD, GOOD);

  //  Reversible: swap it back and the live body must return byte for byte.
  if (out.replace(GOOD, BAD) !== body) fail.push(`${handle}: the change is not reversible`);
  if ((out.split(KEEP).length - 1) !== (body.split(KEEP).length - 1)) {
    fail.push(`${handle}: the completion test count changed`);
  }
  if (!/getElementById\('r-score'\)\.textContent=score\+'\/'\+total/.test(out)) {
    fail.push(`${handle}: r-score no longer renders the real total`);
  }
  for (const m of out.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`${handle}: JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`${handle}: a script block does not compile: ${e.message}`); }
  }
  const mo = acceptRuns(analyze(out, { cap: 10 }));
  if (mo && mo.length) fail.push(`${handle}: mojibake in the result`);

  return { out, fail };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/cyber-running-denominator-csv.js <out.csv> [--live dir/]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const liveDir = liveIdx > 0 ? process.argv[liveIdx + 1] : null;

  const rows = [];
  const allFail = [];
  for (const h of HANDLES) {
    const page = liveDir
      ? JSON.parse(fs.readFileSync(path.join(liveDir, h + '.json'), 'utf8'))
      : pageBody(h);
    if (page.handle !== h) { allFail.push(`fetched ${page.handle}, expected ${h}`); continue; }
    const r = fix(h, page.body_html);
    if (r.fail.length) { allFail.push(...r.fail); continue; }
    rows.push([page.id, page.handle, page.title, r.out, 'MERGE']);
    console.log(`note  ${h.padEnd(36)} one substitution, reversible, compiles`);
  }

  for (const f of allFail) console.log(`FAIL  ${f}`);
  if (allFail.length) { console.error(`\n${allFail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (rows.length !== HANDLES.length) { console.error('\nrow count does not match the handle list'); process.exit(1); }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const lines = [['ID', 'Handle', 'Title', 'Body HTML', 'Command'].map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, ${rows.length} rows, Command MERGE)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
