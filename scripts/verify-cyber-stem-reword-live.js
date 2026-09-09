'use strict';
// -----------------------------------------------------------------------------
//  DID THE STEM REWORD SHEET LAND, AND DID IT ACHIEVE THE THING IT WAS FOR?
//
//  scripts/cyber-quiz-stem-reword.js edits five stems on two live pages so that
//  scripts/extract-cyber-quizzes.js stops refusing those two quizzes. This asks
//  the extractor itself, against the LIVE bodies, whether it does.
//
//  WHY THIS EXISTS SEPARATELY FROM THE SUITE. The suite, the rederive and the
//  four mutations behind that sheet are all excellent and all run against
//  fixtures and a local transform. Every one of them stays green if the sheet is
//  never imported, or imported over only one of the two pages. None of them
//  observes the deployed system, which is what the third kind of check is for.
//
//  It asserts the OUTCOME, not the edit. "The page no longer contains the string
//  CED" would pass on a page whose stems were fixed and which still refuses for
//  some other reason, and would read like proof. What matters is whether the
//  extractor will now lift these questions into the bank, so that is what is
//  asked, and the count is pinned too: five from 2.3 and six from 4.1.
//
//  Read only, no credential, fetched through lib/storefront-fetch.js and
//  therefore with NO User-Agent. The bot management has flipped twice in a week
//  and the module's looksReal() is a positive marker a challenge cannot fake,
//  which is what keeps a negative assertion from passing on an interstitial.
//
//  Run: node scripts/verify-cyber-stem-reword-live.js
// -----------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');
const sf = require('../lib/storefront-fetch');

const HANDLES = ['ap-cyber-unit-2-lesson-3-quiz', 'ap-cyber-unit-4-lesson-1-quiz'];
const EXPECTED_QUESTIONS = 11;   // 5 from 2.3, 6 from 4.1

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stem-reword-live-'));
  for (const h of HANDLES) {
    fs.writeFileSync(path.join(dir, h + '.html'), sf.pageBody(h).body_html);
  }

  const ex = require('./extract-cyber-quizzes.js');
  const before = ex.problems.length;
  const quizzes = ex.extract(dir);
  const problems = ex.problems.slice(before);
  const questions = quizzes.reduce((n, q) => n + q.questions.length, 0);

  console.log(`accepted=${quizzes.length}/${HANDLES.length} problems=${problems.length} questions=${questions}`);
  for (const q of quizzes) console.log(`  ${q.location.lesson}  ${q.questions.length} questions`);
  for (const p of problems) console.log(`  REFUSED  ${p}`);

  const ok = quizzes.length === HANDLES.length
    && problems.length === 0
    && questions === EXPECTED_QUESTIONS;
  if (!ok) process.exitCode = 1;
}

if (require.main === module) main();
