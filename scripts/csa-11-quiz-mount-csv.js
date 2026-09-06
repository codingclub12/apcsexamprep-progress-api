'use strict';
// -----------------------------------------------------------------------------
//  STEP 2 FOR CSA 1.1: THE PAGE STOPS OWNING THE QUIZ.
//
//  Step 1 (seed/csa-unit-1-web-quizzes.js) put Parts A and B into quiz_bank, and
//  on its own it changed nothing: the page still carried its own copy, so the
//  answers still shipped and the lock was still decoration. This is the half
//  that makes both of those false.
//
//  WHAT IT DOES
//  Replaces the two MCQ blocks, 3,602 bytes carrying `data-answer="B"` and
//  `data-answer="A"`, with the mount container the cyber quizzes already use,
//  and adds the script that drives it. After this the questions arrive from
//  GET /api/quiz/ap-csa/unit-1/1.1/quiz, which sends prompts and options and
//  nothing else, and a locked class gets `questions: null`.
//
//  WHAT IT LEAVES ALONE, AND WHY EACH ONE
//  The scenario paragraph stays: Part C asks the student to explain Jordan's
//  remaining bug, so removing the setup would orphan it.
//  Part C stays: its textarea is submitted nowhere, so it is not a graded column
//  and must not become one under the no-free-text rule.
//  `data-item-id="1.1-quiz"` stays on the section. apcs-reporter.js returns early
//  on `if (!exs.length)`, so with no `.apcs-ex` children left it will not fire,
//  and removing the attribute would be an unforced change to markup other things
//  may read.
//
//  THE DOUBLE-REPORT QUESTION, ANSWERED BEFORE WRITING THIS
//  apcs-reporter.js posts CSA Unit 1 to /api/progress/attempt, which writes the
//  `attempts` table keyed by item_id. The mount posts to /api/quiz/submit, which
//  writes `progress` keyed by course/unit/lesson/activity. Different tables, so
//  the worry was that the 1.1 quiz column would go dark for teachers.
//
//  It does not. lib/gradebook-contract.js keys columns by `unit-1/1.1/quiz` and
//  normalises both sources onto it. Measured on a scratch database, three
//  students, one scored each way:
//
//      attempts 2/2   -> earned 2, possible 2, pct 100, source "attempts"
//      progress 100%  -> earned 2, possible 2, pct 100, source "progress"
//      progress 50%   -> earned 1, possible 2, pct  50, source "progress"
//
//  Same column, same manifest denominator, percent converted to points. That is
//  what the canonical contract is for, and it is why this step is safe to take.
//
//    node scripts/csa-11-quiz-mount-csv.js            write the sheet
//    node scripts/csa-11-quiz-mount-csv.js --check    verify what is on disk
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ins = require('../lib/page-section-insert');

const HANDLE = 'ap-csa-lesson-1-1-intro-algorithms';
const OUT = path.join(__dirname, '..', 'matrixify', 'csa-11-quiz-mount-pages.csv');
const SNAP = path.join(__dirname, '..', 'imports', '2026-09-06', 'csa-11-live-body.json');

//  The two MCQ blocks, verbatim from the live body, bounded by Part A's heading
//  and Part C's. Held as a file rather than a pattern: a regex over 103KB of
//  hand-authored markup is how the wrong thing gets deleted.
const REMOVED_FILE = path.join(__dirname, '..', 'imports', '2026-09-06', 'csa-11-removed-span.html');

const MOUNT = [
  '<div data-apcs-quiz data-course="ap-csa" data-unit="unit-1" data-lesson="1.1" data-activity="quiz"></div>',
  '',
  '  ',
].join('\n');

//  Same asset and the same defer the cyber quiz pages load. Appended once at the
//  end of the body so it cannot land inside a section it does not belong to.
const SCRIPT = '\n<script src="https://cdn.shopify.com/s/files/1/0778/8403/1191/files/apcs-quiz-mount.js?v=1787764736" defer></script>\n';

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function sheet(bodyHtml) {
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', bodyHtml].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  `removed` defaults to the recorded span and is a parameter so smoke/csa-quiz-
//  mount.js can hand over a deliberately broken one. Every rule below has to be
//  provable independently, and three of them are rules ABOUT the span.
function build(live, removed) {
  if (removed == null) removed = fs.readFileSync(REMOVED_FILE, 'utf8');
  const problems = [];

  //  Refuse if the page no longer carries the answers this exists to remove.
  const answersBefore = (live.match(/data-answer=/g) || []).length;
  if (!/data-answer="B"/.test(removed) || !/data-answer="A"/.test(removed)) {
    problems.push('the recorded span no longer contains both answer attributes');
  }

  const swap = ins.replaceSpan({ live, removed, added: MOUNT });
  if (swap.problems.length) return { problems: problems.concat(swap.problems) };

  const out = swap.out + SCRIPT;

  //  Proof, in the order a failure would matter. Length first, then the exact
  //  round trip, then the two facts that are the point of the change at all.
  if (out.length !== live.length - removed.length + MOUNT.length + SCRIPT.length) {
    problems.push(`length is ${out.length}, not the intended swap plus the script tag`);
  }
  if (out.slice(0, out.length - SCRIPT.length).replace(MOUNT, () => removed) !== live) {
    problems.push('undoing the swap and the script tag does not return the live body byte for byte');
  }
  //  DEFENCE IN DEPTH, and it earned its place. Every other rule here passes a
  //  body where the span appears TWICE: replace() takes the first, so the length
  //  is right, the round trip returns the original byte for byte, and the answer
  //  count still drops by 2 because the duplicate contributed 2 of its own. The
  //  result would ship the questions and their keys exactly as before. Only
  //  replaceSpan's occurrence count stood between that and an import, and a
  //  single guard on the one thing this file exists to remove is one too few.
  if (out.includes(removed)) {
    problems.push('a copy of the removed span is STILL in the result, so the answers would ship anyway');
  }

  const answersAfter = (out.match(/data-answer=/g) || []).length;
  if (answersAfter !== answersBefore - 2) {
    problems.push(`data-answer count went ${answersBefore} to ${answersAfter}, expected a drop of exactly 2`);
  }
  if (!out.includes('data-apcs-quiz')) problems.push('the mount container is not in the result');
  if ((out.match(/apcs-quiz-mount\.js/g) || []).length !== 1) {
    problems.push('the mount script is missing or duplicated');
  }
  if (!out.includes('Part C: Structured response')) problems.push('Part C was lost');
  if (!out.includes('Mr. Ramirez asks')) problems.push('the scenario Part C depends on was lost');

  return { problems, out, removed, answersBefore, answersAfter };
}

function main() {
  const page = sf.pageBody(HANDLE);
  const live = page.body_html;
  console.log(`live body: ${live.length} bytes, updated ${page.updated_at}`);

  if (!process.argv.includes('--check')) {
    fs.mkdirSync(path.dirname(SNAP), { recursive: true });
    fs.writeFileSync(SNAP, JSON.stringify({ [HANDLE]: live }));
    const r = build(live);
    if (r.problems.length) {
      console.error(`\nREFUSED, ${r.problems.length} problem(s):`);
      for (const p of r.problems) console.error(`  ${p}`);
      process.exit(1);
    }
    fs.writeFileSync(OUT, sheet(r.out));
    console.log(`wrote matrixify/${path.basename(OUT)}  1 row, body ${r.out.length} bytes`);
    console.log(`  data-answer attributes ${r.answersBefore} -> ${r.answersAfter}`);
  }

  const r2 = build(live);
  if (r2.problems.length) {
    console.error(`\nCHECK FAILED:\n  ${r2.problems.join('\n  ')}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(OUT, 'utf8');
  if (!raw.startsWith(BOM)) { console.error('missing BOM'); process.exit(1); }
  if (!raw.includes('data-apcs-quiz')) { console.error('sheet body has no mount'); process.exit(1); }
  console.log(`check clean: sheet carries the mount, the script once, Part C and the scenario`);
}

if (require.main === module) main();
module.exports = { HANDLE, MOUNT, SCRIPT, REMOVED_FILE, SNAP, OUT, build, sheet };
