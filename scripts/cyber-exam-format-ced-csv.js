#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  Board 195: the page named "AP Cybersecurity Exam Format" says the format has
//  not been released, and contains none of it.
//
//  Measured on the stored body, 2026-09-03: zero occurrences of "60 multiple",
//  "one free-response", "80 minutes", "50 minutes", "Device Security Analysis"
//  or the 25 to 40% band. Its only two "70%" strings are CSS gradient stops. So
//  the page whose whole job is stating the format states none of it, in two
//  places, and was last touched 2026-06-05.
//
//  The numbers written here are the ones CLAUDE.md carries, each checked against
//  a first-party source IN this repo so they can be re-derived without a network
//  call: docs/ced-snapshot/cyber-exam.txt for the section table and
//  docs/cyber-exam-format.md for what only the CED states.
//
//      Section I    60 multiple choice   70% of the score   80 minutes
//      Section II   1 free response      30% of the score   50 minutes
//      total        2 hours 10 minutes, fully digital in Bluebook
//      FRQ          Device Security Analysis, skill categories 2 and 3 only
//      MCQ          25 to 40% per skill category, CED verbatim, printable as fact
//
//  WHAT IS DELIBERATELY NOT WRITTEN. There are no published per-unit weightings.
//  Every per-unit percentage circulating online is fabricated, so this adds none
//  and the guard below refuses the write if one appears.
//
//  usage: node scripts/cyber-exam-format-ced-csv.js [admin.json] [out.csv]
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mojibake = require('../lib/mojibake');

const HANDLE = 'ap-cybersecurity-exam-format';
const SNAP = 'shopify/page-snapshots/ap-cybersecurity-exam-format.before-ced-format.json';
const OUT = 'imports/2026-09-03/cyber-exam-format-ced-pages.csv';
const LIVE_TITLE = 'AP Cybersecurity Exam Format';

const STALE_NOTE = '<p class="ef-highlight-title" style="color:var(--amber)!important;-webkit-text-fill-color:var(--amber)!important;">⚠️ Note on Specific Question Counts</p>\n      <p style="margin-bottom:0!important;">The College Board has not yet released the exact number of questions, time limits, or section weightings for the AP Cybersecurity Exam. This page will be updated as soon as those details are officially announced. The course framework confirms the exam is <strong>weighted based on the skills students demonstrate</strong>, which means expect heavier weighting on the three core skill categories: Analyze Risk, Mitigate Risk, and Detect Attacks.</p>';

const FRESH_NOTE = '<p class="ef-highlight-title" style="color:var(--amber)!important;-webkit-text-fill-color:var(--amber)!important;">The published exam format</p>\n      <p style="margin-bottom:0!important;">Section I is <strong>60 multiple choice questions</strong> in 80 minutes, worth 70% of the score. Section II is <strong>one free-response question</strong> in 50 minutes, worth 30%. That is two hours and ten minutes of testing, taken digitally in Bluebook. The free-response question is <strong>Device Security Analysis</strong>, and it assesses skill categories 2 and 3 only. Multiple choice weighting is published by skill category rather than by unit, as a band of <strong>25 to 40% each</strong> for Analyze Risk, Mitigate Risk and Detect Attacks. No per-unit weightings have been published, so a percentage broken out by unit is a guess rather than a published figure.</p>';

const STALE_FAQ = '<p>The College Board has not yet released the exact number of questions or time limits for the AP Cybersecurity Exam. We know the exam has two sections (MCQ and FRQ) and that it is weighted based on the skills demonstrated. This page will be updated as soon as specific question counts are officially announced.</p>';

const FRESH_FAQ = '<p>Sixty. Section I is 60 multiple choice questions in 80 minutes and counts for 70% of the score. Section II is a single free-response question, Device Security Analysis, in 50 minutes, counting for 30%. Two hours and ten minutes in total, taken digitally in Bluebook. Weighting is published per skill category, 25 to 40% each for Analyze Risk, Mitigate Risk and Detect Attacks, and not per unit.</p>';

const EDITS = [
  [STALE_NOTE, FRESH_NOTE, 1],
  [STALE_FAQ, FRESH_FAQ, 1],
];

function transform(body) {
  let out = body;
  for (const [from, to, expect] of EDITS) {
    const n = out.split(from).length - 1;
    if (n !== expect) throw new Error(`edit matched ${n} times, expected ${expect}: ${from.slice(0, 90)}`);
    out = out.split(from).join(to);
  }
  return { out };
}

const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const csv = (rows) => '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';

function main(argv) {
  const root = path.join(__dirname, '..');
  const src = argv[0] || path.join(root, SNAP);
  const out = argv[1] || path.join(root, OUT);
  const node = JSON.parse(fs.readFileSync(src, 'utf8')).data.pages.edges[0].node;
  if (node.handle !== HANDLE) throw new Error(`expected ${HANDLE}, got ${node.handle}`);
  if (node.title !== LIVE_TITLE) throw new Error(`live title moved: ${node.title}`);

  const { out: body } = transform(node.body);

  //  Before and after, never absolute: a body MERGE re-imports the whole body,
  //  so an absolute check would make this script answer for the page's history.
  const problems = [];
  const has = (s, re) => re.test(s);
  const count = (s, re) => (s.match(re) || []).length;
  if (has(body, /has not yet released/i)) problems.push('a "not yet released" claim survives');
  for (const [label, re] of [['60 multiple choice', /60 multiple choice questions/],
                             ['80 minutes', /80 minutes/], ['50 minutes', /50 minutes/],
                             ['Device Security Analysis', /Device Security Analysis/],
                             ['the 25 to 40% band', /25 to 40% each/]]) {
    if (!has(body, re)) problems.push(`the new text is missing ${label}`);
  }
  //  The one number nobody may print. CLAUDE.md: every per-unit percentage
  //  circulating online is fabricated, and one appearing in a generated sheet is
  //  a validator failure rather than a copy edit.
  if (/Unit\s*[1-5][^<]{0,40}?\d{1,2}\s*%/i.test(body)) problems.push('a per-unit exam weighting appears');
  if (count(body, /—/g) > count(node.body, /—/g)) problems.push('this edit adds an em-dash');
  //  Authored text stays ASCII. The first draft slipped in two curly
  //  apostrophes, which the preflight reports only in aggregate with the 177
  //  characters legitimately carried through, so it would not have stood out.
  const nonAscii = (s) => (s.match(/[^\x00-\x7F]/g) || []).length;
  const addedChars = [...body].filter((c) => c.charCodeAt(0) > 127);
  const beforeSet = new Map();
  for (const c of node.body) if (c.charCodeAt(0) > 127) beforeSet.set(c, (beforeSet.get(c) || 0) + 1);
  const afterSet = new Map();
  for (const c of addedChars) afterSet.set(c, (afterSet.get(c) || 0) + 1);
  for (const [c, n] of afterSet) {
    if (n > (beforeSet.get(c) || 0)) {
      problems.push('this edit adds non-ASCII U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
    }
  }
  void nonAscii;
  if (mojibake.analyze(body).length > mojibake.analyze(node.body).length) problems.push('this edit adds mojibake');
  //  This is a text correction, not a redesign: the page structure must survive.
  for (const cls of ['ef-faq-item', 'ef-highlight', 'ef-faq-q']) {
    if (count(body, new RegExp(cls, 'g')) !== count(node.body, new RegExp(cls, 'g'))) {
      problems.push(`${cls} count changed, so this is no longer only a text edit`);
    }
  }
  if (problems.length) {
    console.error('REFUSED, nothing written:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv([['Handle', 'Command', 'Body HTML'], [HANDLE, 'MERGE', body]]), 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log(`  ${EDITS.length} edits, each matched exactly once`);
  console.log(`  body ${node.body.length} -> ${body.length} chars`);
  console.log('  page now states: 60 MCQ / 80 min / 70%, 1 FRQ Device Security Analysis / 50 min / 30%, 25 to 40% per skill category');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { transform, EDITS, HANDLE, OUT, SNAP, LIVE_TITLE };
