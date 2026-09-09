#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A QUIZ PAGE THAT CONTRADICTS ITSELF ONE LINE APART.
//
//  ── THE DEFECT ──────────────────────────────────────────────────────────────
//  /pages/ap-cyber-unit-1-lesson-2-quiz says, in its blurb:
//
//      5 questions, about 10 minutes. Your teacher opens this quiz when the
//      class is ready.
//
//  and then, in the badge row directly beneath it:
//
//      [12 Questions] [Skills 1.A, 1.B, 2.A] [~25 min] [Instant Feedback]
//
//  The badges are left over from the 12 item bank transcribed from the teacher
//  bundle on 2026-08-26 and retired the next day, when the rule landed that
//  bundle instruments stay offline. The page was migrated onto the server render
//  path later and the badge row was not revisited.
//
//  A student reads 12 and is served 5. A teacher planning a period reads 25
//  minutes for a quiz that takes 10.
//
//  Swept all 26 cyber quiz pages: this is the only mounted one advertising a
//  count that is not 5.
//
//  ── THE COUNT IS MEASURED, NOT ASSUMED ──────────────────────────────────────
//  The replacement number is read from the live quiz API's own pool size for
//  this lesson, not typed in from the blurb. Hardcoding 5 here would make this
//  script a second opinion about how many questions the bank holds, and the
//  whole reason the badge is wrong is that somebody once held a second opinion.
//
//  Run:
//    node scripts/cyber-12-quiz-badge-csv.js <out.csv> [--live page.json]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pageBody } = require('../lib/storefront-fetch');
const { analyze, acceptRuns } = require('../lib/mojibake');

const HANDLE = 'ap-cyber-unit-1-lesson-2-quiz';
const OLD_COUNT = '>12 Questions<';
const OLD_TIME = '>~25 min<';

function livePoolSize() {
  const out = execSync(
    'curl -s --max-time 20 "https://progress.apcsexamprep.com/api/quiz/ap-cybersecurity/unit-1/1.2/quiz"',
    { encoding: 'utf8' });
  const j = JSON.parse(out);
  if (!j.pool || !Number.isInteger(j.pool)) throw new Error('the quiz API did not report a pool size');
  return j.pool;
}

function fix(body, pool) {
  const fail = [];
  for (const s of [OLD_COUNT, OLD_TIME]) {
    const n = body.split(s).length - 1;
    if (n !== 1) fail.push(`${s} appears ${n} time(s), expected exactly 1`);
  }
  if (fail.length) return { fail };

  const newCount = `>${pool} Questions<`;
  const newTime = '>~10 min<';
  const out = body.replace(OLD_COUNT, newCount).replace(OLD_TIME, newTime);

  //  Reversible, so the only change is the two strings.
  if (out.replace(newCount, OLD_COUNT).replace(newTime, OLD_TIME) !== body) {
    fail.push('the change is not reversible');
  }
  //  The page must now agree with itself, and with the server.
  if (!out.includes(newCount)) fail.push('the corrected count is not present');
  if (out.includes(OLD_COUNT) || out.includes(OLD_TIME)) fail.push('a stale badge survived');
  if (!/5 questions, about 10 minutes/.test(out)) fail.push('the blurb this is being reconciled to is gone');
  if (pool !== 5) fail.push(`the bank holds ${pool}, so the blurb saying 5 is now the wrong one; stop and read the page`);
  //  The mount is what makes the lock real. It must not move.
  if (!/data-apcs-quiz[^>]*data-lesson="1\.2"/.test(out.replace(/\s+/g, ' '))) {
    fail.push('the quiz mount for lesson 1.2 is missing or changed');
  }
  for (const m of out.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`a script block does not compile: ${e.message}`); }
  }
  const mo = acceptRuns(analyze(out, { cap: 10 }));
  if (mo && mo.length) fail.push('mojibake in the result');

  return { out, fail, newCount, newTime };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/cyber-12-quiz-badge-csv.js <out.csv> [--live page.json]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = liveIdx > 0
    ? JSON.parse(fs.readFileSync(process.argv[liveIdx + 1], 'utf8'))
    : pageBody(HANDLE);
  if (page.handle !== HANDLE) throw new Error(`fetched ${page.handle}, expected ${HANDLE}`);

  const pool = livePoolSize();
  console.log(`note  the live quiz API reports a pool of ${pool} for 1.2`);

  const r = fix(page.body_html, pool);
  for (const f of r.fail) console.log(`FAIL  ${f}`);
  if (r.fail.length) { console.error(`\n${r.fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  console.log(`note  ${OLD_COUNT} -> ${r.newCount},  ${OLD_TIME} -> ${r.newTime}`);
  console.log('note  reversible: putting both back reproduces the live body byte for byte');

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const lines = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].map(csvCell).join(','),
    [page.id, page.handle, page.title, r.out, 'MERGE'].map(csvCell).join(','),
  ];
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
