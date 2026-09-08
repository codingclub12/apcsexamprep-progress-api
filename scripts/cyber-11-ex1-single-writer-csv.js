#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ONE PAGE, ONE WRITER: remove the inline reporter from AP Cyber 1.1 Exercise 1.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  This page reports its score TWICE. Its body carries an apcseReportScore()
//  that posts item 'redflags', and assets/apcs-score-reporter.js separately
//  scrapes #finalScore and posts item 'score' through APCS_saveLessonScore.
//  Both land on the same (student, unit, lesson, activity).
//
//  A teacher found that on 2026-09-07 as a gradebook cell reading 14 out of 14
//  for a 7 point exercise, because every reader of score_events summed per item.
//  The arithmetic was fixed at read time the same day, so this is no longer a
//  wrong grade. What is left is two HTTP requests and two ledger rows for one
//  submission, on the ONLY page of the twenty in Unit 1 that has two writers.
//  All nineteen others report through the shared reporter alone.
//
//  ── WHICH WRITER GOES, AND THE COST OF THAT CHOICE ──────────────────────────
//  The inline one. That is the page matching its siblings, and it is the
//  smaller diff: the shared reporter needs no page to cooperate.
//
//  It is not free. The inline reporter computed the pair from the page's own
//  state (found.filter(Boolean).length out of FLAGS.length), and the shared one
//  reads text out of the results panel. Board #83 is about that fragility in
//  general. The panel here is a good case for it, since the denominator sits in
//  static markup ("out of 7 red flags found") and only the numerator is
//  scripted, but it is a text read where there used to be arithmetic, and that
//  is a real trade rather than a pure win.
//
//  ── WHAT THIS REFUSES TO SHIP ───────────────────────────────────────────────
//  Removing the function without removing its call would throw a ReferenceError
//  inside showResults, which is the routine that reveals the results panel. The
//  student would click the last red flag and see nothing happen. So the gate
//  compiles every script block, checks the remaining writer still has something
//  to read, and proves the ONLY change is the two removed strings by putting
//  them back and requiring the result to be byte identical to the live page.
//
//  Run:
//    node scripts/cyber-11-ex1-single-writer-csv.js <out.csv> [--live page.json]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { pageBody } = require('../lib/storefront-fetch');
const { analyze, acceptRuns } = require('../lib/mojibake');

const HANDLE = 'ap-cyber-unit-1-lesson-1-exercise-1';

//  The call site, with its leading space, so the statement before it keeps its
//  semicolon and nothing is left dangling.
const CALL = ' apcseReportScore(total, FLAGS.length);';

//  The block runs from its own banner comment to the line that follows it. Both
//  ends are anchored on text that exists once, and the generator asserts that
//  rather than trusting it.
const BLOCK_START = '    // ── SCORE REPORTING ';
const BLOCK_END = '    function showResults(){';

function cut(body) {
  const removed = [];

  const s = body.indexOf(BLOCK_START);
  if (s === -1) throw new Error('the SCORE REPORTING banner is not on this page');
  if (body.indexOf(BLOCK_START, s + 1) !== -1) throw new Error('the SCORE REPORTING banner appears more than once');
  const e = body.indexOf(BLOCK_END, s);
  if (e === -1) throw new Error('showResults does not follow the reporting block');
  const block = body.slice(s, e);
  if (!/function apcseReportScore\(/.test(block)) {
    throw new Error('the block between the banner and showResults does not define apcseReportScore');
  }
  removed.push(block);
  let out = body.slice(0, s) + body.slice(e);

  const c = out.indexOf(CALL);
  if (c === -1) throw new Error('the apcseReportScore call site is not where it was');
  if (out.indexOf(CALL, c + 1) !== -1) throw new Error('the call site appears more than once');
  removed.push(CALL);
  out = out.slice(0, c) + out.slice(c + CALL.length);

  return { out, removed, blockAt: s, callAt: c };
}

function gate(before, after, cutInfo) {
  const fail = [];
  const note = [];

  note.push(`live body ${Buffer.byteLength(before, 'utf8')} bytes -> ${Buffer.byteLength(after, 'utf8')} bytes`);
  note.push(`removed ${cutInfo.removed[0].length} chars of reporter and its ${cutInfo.removed[1].length} char call site`);

  //  1. The writer is gone, completely. A leftover call is a ReferenceError in
  //     the routine that reveals the results panel.
  const left = (after.match(/apcseReportScore/g) || []).length;
  if (left !== 0) fail.push(`apcseReportScore still appears ${left} time(s)`);
  if ((before.match(/apcseReportScore/g) || []).length !== 2) {
    fail.push('the live page did not have exactly the two occurrences this was written for');
  }
  if (/api\/student\/score/.test(after)) fail.push('the page still posts to /api/student/score');

  //  2. The remaining writer still has something to read. This is the whole
  //     point of the change: one writer, not none.
  if (!/id="finalScore"/.test(after)) fail.push('#finalScore is gone, so the shared reporter has nothing to scrape');
  if (!/getElementById\('finalScore'\)\.textContent=total/.test(after)) {
    fail.push('nothing writes the score into #finalScore any more');
  }
  if (!/out of 7 red flags found/.test(after)) fail.push('the static denominator beside #finalScore is gone');
  if (!/function showResults\(\)\{/.test(after)) fail.push('showResults is gone');

  //  3. Every script block still compiles. Cutting a function out of the middle
  //     of one is exactly how that breaks.
  for (const m of after.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (err) { fail.push(`JSON-LD does not parse: ${err.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (err) { fail.push(`a script block does not compile: ${err.message}`); }
  }

  //  4. Structure is untouched.
  const nc = after.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'style', 'script']) {
    const o = (nc.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const c = (nc.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (o !== c) fail.push(`<${tag}> unbalanced: ${o} open, ${c} close`);
  }

  //  5. THE PROOF THAT NOTHING ELSE MOVED. Put both removed strings back at the
  //     offsets they came from; the result must be the live body byte for byte.
  //     A repair that cannot be undone exactly is not a repair.
  let undone = after.slice(0, cutInfo.callAt) + CALL + after.slice(cutInfo.callAt);
  undone = undone.slice(0, cutInfo.blockAt) + cutInfo.removed[0] + undone.slice(cutInfo.blockAt);
  if (undone !== before) {
    let i = 0;
    while (i < Math.min(undone.length, before.length) && undone[i] === before[i]) i++;
    fail.push(`putting the cut back does not reproduce the live body, first difference at ${i}\n`
      + `        live: ${JSON.stringify(before.slice(i - 60, i + 120))}\n`
      + `        back: ${JSON.stringify(undone.slice(i - 60, i + 120))}`);
  } else {
    note.push('reversible: re-inserting both cuts reproduces the live body byte for byte');
  }

  //  6. No mojibake, through the module rather than a pasted pattern.
  const mo = acceptRuns(analyze(after, { cap: 20 }));
  if (mo && mo.length) {
    fail.push(`mojibake in the result: ${JSON.stringify(mo.slice(0, 3).map((h) => h.text || h))}`);
  }

  return { fail, note };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/cyber-11-ex1-single-writer-csv.js <out.csv> [--live page.json]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = liveIdx > 0
    ? JSON.parse(fs.readFileSync(process.argv[liveIdx + 1], 'utf8'))
    : pageBody(HANDLE);
  const body = page.body_html;
  if (page.handle !== HANDLE) throw new Error(`fetched ${page.handle}, expected ${HANDLE}`);

  const cutInfo = cut(body);
  const { fail, note } = gate(body, cutInfo.out, cutInfo);
  for (const n of note) console.log(`note  ${n}`);
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) {
    console.error(`\n${fail.length} check(s) failed. Nothing written.`);
    process.exit(1);
  }

  //  BOM, QUOTE_ALL and CRLF are not style. scripts/matrixify-preflight.js
  //  refuses a sheet without them, and its reasons are each a live incident:
  //  without the BOM the consuming tool guesses Latin-1 and the 49 bullets and
  //  arrows carried out of this body arrive on the page as three characters
  //  apiece, which is the mojibake the encoding guard exists to catch AFTER it
  //  has already shipped.
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const rows = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].map(csvCell).join(','),
    [page.id, page.handle, page.title, cutInfo.out, 'MERGE'].map(csvCell).join(','),
  ];
  fs.writeFileSync(out, '\ufeff' + rows.join('\r\n') + '\r\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
