#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  Board 171: the practice exam page claims a shape the real exam does not have.
//
//  The live page calls itself a FULL LENGTH practice EXAM and carries 40 MCQ and
//  3 free-response questions. The real AP Cybersecurity exam is 60 MCQ and ONE
//  free-response question, Device Security Analysis. A teacher pacing a class
//  against this page is preparing students for an exam shape that does not exist.
//
//  WHAT THIS DOES NOT DO. It does not rebuild the item set to 60 + 1. That is
//  board 176 and belongs to another session. This is a RELABEL: the same 40 + 3
//  questions, honestly described as a study set. Every question, answer,
//  explanation and score threshold is carried through untouched.
//
//  WHY IT IS SMALLER THAN IT LOOKS. Somebody already fixed the meta description
//  and added an in-body format note that states the real 60 + 1 shape and says
//  the set is "deliberately shaped for study rather than as a replica". Those are
//  correct and are left alone. What was never corrected is the LABELLING: the
//  page title, the SEO title, the H1, the schema headline, the breadcrumb, and a
//  source comment reading FULL LENGTH. That is the whole of this change.
//
//  Every edit is an exact string match asserted to apply a known number of times.
//  A replace that silently matches nothing is how drift enters, so this refuses
//  to write rather than emit a sheet that quietly did less than it claimed.
//
//  usage: node scripts/cyber-practice-exam-format-csv.js <admin.json> <out.csv>
//    admin.json is the Admin API response ({data:{pages:{edges:[{node:{body}}]}}})
//    so this runs offline and is reproducible.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mojibake = require('../lib/mojibake');

const HANDLE = 'ap-cybersecurity-practice-exam';

// The live values, asserted before anything is changed, so this refuses to run
// against a page that has moved under it.
const LIVE_TITLE = 'AP Cybersecurity Practice Exam | Full Practice Test | APCSExamPrep.com';
const LIVE_TITLE_TAG = 'AP Cybersecurity Practice Exam | 40 MCQ + 3 Free Response';

const NEW_TITLE = 'AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ | APCSExamPrep.com';
const NEW_TITLE_TAG = 'AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ';

// [what, with, expected occurrences]
const EDITS = [
  // The source comment that names the page. "FULL LENGTH" is the plainest false
  // claim on the page and the one a future editor would copy.
  ['AP CYBERSECURITY PRACTICE EXAM - FULL LENGTH',
   'AP CYBERSECURITY PRACTICE SET - 40 MCQ + 3 FRQ, NOT EXAM SHAPED', 1],

  // Structured data. Google reads these, so a false shape here outlives the page
  // copy in search results.
  ['"name": "How many questions are on the AP Cybersecurity Practice Exam?"',
   '"name": "How many questions are in the AP Cybersecurity practice set?"', 1],
  ['"name": "Is this AP Cybersecurity Practice Exam free?"',
   '"name": "Is this AP Cybersecurity practice set free?"', 1],
  ['"name": "What units does the AP Cybersecurity Practice Exam cover?"',
   '"name": "What units does the AP Cybersecurity practice set cover?"', 1],
  ['"text": "The exam covers all 5 units:',
   '"text": "The set covers all 5 units:', 1],
  ['"headline": "AP Cybersecurity Practice Exam: 40 MCQ + 3 Free Response with Answers (2026-2027)"',
   '"headline": "AP Cybersecurity Practice Set: 40 MCQ + 3 Free Response with Answers (2026-2027)"', 1],
  ['"position": 3, "name": "Practice Exam"',
   '"position": 3, "name": "Practice Set"', 1],

  // The visible heading and the footer signature.
  ['<h1>AP Cybersecurity Practice Exam</h1>',
   '<h1>AP Cybersecurity Practice Set</h1>', 1],
  ['AP Cybersecurity Practice Exam | APCSExamPrep.com | Built by Tanner Crow',
   'AP Cybersecurity Practice Set | APCSExamPrep.com | Built by Tanner Crow', 1],

  // The page already explains the real shape, but 1200 pixels down. A teacher
  // deciding how to use this page reads the first paragraph and stops, so the
  // correction has to be where the claim is.
  ['with interactive scoring and an explanation for every question.</p>',
   'with interactive scoring and an explanation for every question. '
   + 'This is a study set rather than a replica: the real exam is 60 multiple '
   + 'choice questions and one free-response question.</p>', 1],
];

function transform(body) {
  let out = body;
  const applied = [];
  for (const [from, to, expect] of EDITS) {
    const n = out.split(from).length - 1;
    if (n !== expect) {
      throw new Error(`edit matched ${n} times, expected ${expect}:\n  ${from.slice(0, 110)}`);
    }
    out = out.split(from).join(to);
    applied.push({ from: from.slice(0, 60), n });
  }
  return { out, applied };
}

// Matrixify wants CRLF, QUOTE_ALL and a BOM. Without the BOM the consuming tool
// guesses Latin-1 and a bullet lands on the live page as three characters.
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const csv = (rows) => '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';

function main(argv) {
  const src = argv[0] || path.join(__dirname, '..', 'shopify/page-snapshots/ap-cybersecurity-practice-exam.before-format-relabel.json');
  const out = argv[1] || path.join(__dirname, '..', 'imports/2026-09-03/cyber-practice-exam-format-pages.csv');
  if (!src || !out) {
    console.error('usage: node scripts/cyber-practice-exam-format-csv.js <admin.json> <out.csv>');
    process.exit(2);
  }
  const node = JSON.parse(fs.readFileSync(src, 'utf8')).data.pages.edges[0].node;
  if (node.handle !== HANDLE) throw new Error(`expected ${HANDLE}, got ${node.handle}`);
  if (node.title !== LIVE_TITLE) {
    throw new Error(`live title moved. expected:\n  ${LIVE_TITLE}\ngot:\n  ${node.title}`);
  }

  const { out: body, applied } = transform(node.body);

  // Guards over the RESULT, not over the live page.
  //  These are BEFORE AND AFTER comparisons, not absolute checks on the page.
  //  A body MERGE re-imports the whole body, so an absolute check makes this
  //  script responsible for every defect already on the page: the live body
  //  carries 59 em-dashes inside question text that this relabel does not touch
  //  and must not rewrite, since board 176 rebuilds that item set. What this
  //  edit may not do is ADD one. The first draft checked absolutely and refused
  //  to write, which is the same confusion the model script warns about.
  const problems = [];
  const count = (s, re) => (s.match(re) || []).length;
  if (/full[ -]?length/i.test(body)) problems.push('a full-length claim survives the transform');
  if (/<h1>[^<]*Practice Exam/i.test(body)) problems.push('the H1 still calls this an exam');
  const emBefore = count(node.body, /\u2014/g), emAfter = count(body, /\u2014/g);
  if (emAfter > emBefore) problems.push(`this edit ADDS ${emAfter - emBefore} em-dash(es)`);
  const mojiBefore = mojibake.analyze(node.body).length, mojiAfter = mojibake.analyze(body).length;
  if (mojiAfter > mojiBefore) problems.push(`this edit ADDS ${mojiAfter - mojiBefore} mojibake sequence(s)`);
  //  The question set must be carried through untouched: this is a relabel, and
  //  board 176 owns the rebuild. The first draft counted class="pq-q", which this
  //  page does not use, so it compared 0 against 0 and would have passed had the
  //  transform deleted every question. The real containers are pq-card (43, being
  //  40 MCQ plus 3 FRQ) and pq-opt (160, being 40 times 4). Both are asserted,
  //  and the expected values are written down so a change has to be deliberate.
  const countQ = (s) => (s.match(/class="pq-card"/g) || []).length;
  const countOpt = (s) => (s.match(/class="pq-opt"/g) || []).length;
  if (countQ(node.body) !== 43) problems.push(`live page has ${countQ(node.body)} question cards, expected 43`);
  if (countOpt(node.body) !== 160) problems.push(`live page has ${countOpt(node.body)} options, expected 160`);
  if (countQ(body) !== countQ(node.body)) problems.push('the question count changed');
  if (countOpt(body) !== countOpt(node.body)) problems.push('the option count changed');
  if (!body.includes('60 multiple choice questions')) problems.push('the real format is no longer stated');
  if (problems.length) {
    console.error('REFUSED, nothing written:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv([
    ['Handle', 'Command', 'Title', 'Body HTML', 'Metafield: global.title_tag [string]'],
    [HANDLE, 'MERGE', NEW_TITLE, body, NEW_TITLE_TAG],
  ]), 'utf8');

  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log(`  ${applied.length} edits, each matched exactly as expected`);
  console.log(`  body ${node.body.length} -> ${body.length} chars`);
  console.log(`  carried through untouched: ${countQ(body)} questions, `
    + `${(body.match(/\u2014/g) || []).length} pre-existing em-dashes (board 176 rebuilds this set)`);
  console.log(`  title     ${LIVE_TITLE}\n         -> ${NEW_TITLE}`);
  console.log(`  title_tag ${LIVE_TITLE_TAG}\n         -> ${NEW_TITLE_TAG}`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { transform, EDITS, NEW_TITLE, NEW_TITLE_TAG, HANDLE };
